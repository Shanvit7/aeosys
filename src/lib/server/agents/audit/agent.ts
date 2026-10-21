import { type Context, withAbortSignal, withoutAbortSignal } from "@earendil-works/chord/context"
import { AssistantEntry, type ConversationId, type TaskRuntime } from "@earendil-works/pi-durable"
import { AUDIT_BROWSER_TIMEOUT_MS } from "@/lib/server/agents/audit/browser"
import { type AuditPage, closeAuditBrowser } from "@/lib/server/agents/audit/tools"
import { logger } from "@/lib/server/logger"
import { auditAgentReportSchema } from "@/schemas/audit-agent.schema"

export class AuditAgentError extends Error {
  constructor(
    readonly code: "model_error" | "timeout" | "invalid_output" | "agent_failed",
    readonly retryable: boolean,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = "AuditAgentError"
  }
}

const pageKey = (value: string) => {
  const url = new URL(value)
  return `${url.origin}${url.pathname.replace(/\/+$/, "")}`
}

export const parseAgentReport = (
  text: string,
  auditId: string,
  sourceUrl: string,
  submittedUrl = sourceUrl,
) => {
  const output = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim())
  if (output && typeof output === "object" && !Array.isArray(output)) delete output.$schema
  const report = auditAgentReportSchema.parse(output)
  const inScope = new Set([pageKey(sourceUrl), pageKey(submittedUrl)])
  const inspected = new Set(report.coverage.inspectedUrls.map(pageKey))
  if (
    report.coverage.inspectedUrls.length > 1 ||
    report.coverage.inspectedUrls.some((value) => !inScope.has(pageKey(value))) ||
    report.coverage.remainingUrls.length > 0
  ) {
    throw new Error("Audit report exceeds single-page scope")
  }
  for (const value of [
    ...report.coverage.inspectedUrls,
    ...report.findings.map((f) => f.evidence.sourceUrl),
  ]) {
    const url = new URL(value)
    if (!inScope.has(pageKey(value)) || url.username || url.password) {
      throw new Error("Audit report contains an out-of-scope source URL")
    }
  }
  for (const finding of report.findings) {
    if (!inspected.has(pageKey(finding.evidence.sourceUrl))) {
      throw new Error("Finding source URL is absent from inspected coverage")
    }
  }
  if (report.coverage.remainingUrls.some((url) => inspected.has(pageKey(url)))) {
    throw new Error("Coverage lists the same URL as inspected and remaining")
  }
  return {
    summary: report.summary,
    coverage: {
      ...report.coverage,
      inspectedUrls: report.coverage.inspectedUrls.length ? [sourceUrl] : [],
    },
    findings: report.findings.map(({ proposedFix, ...finding }, index) => ({
      ...finding,
      evidence: { ...finding.evidence, sourceUrl },
      id: `${auditId}:agent-${index + 1}`,
      ...(proposedFix
        ? {
            proposedFix: {
              ...proposedFix,
              id: `${auditId}:agent-${index + 1}-proposal`,
              status: "proposed" as const,
              publicationStatus: "not-published" as const,
            },
          }
        : {}),
    })),
  }
}

export const runAuditAgent = async <I, S, R, H extends object>(
  runtime: TaskRuntime<I, S, R, H>,
  conversationId: ConversationId,
  auditId: string,
  submittedUrl: string,
  page: AuditPage,
  attempt: number,
  context: Context,
) => {
  try {
    const child = await runtime.conversation(conversationId, context)
    if (!child) throw new Error("Audit agent conversation unavailable")
    const submission = await child.submit(
      {
        type: "input",
        requestId: `audit:${auditId}:attempt:${attempt}`,
        content: `Audit only this page: ${page.url}. Do not open or inspect other URLs. Read seo-audit and ai-seo skills, inspect supplied HTML, and return required JSON with honest page-level coverage.`,
      },
      context,
    )
    const timeout = AbortSignal.timeout(AUDIT_BROWSER_TIMEOUT_MS)
    let settled: Awaited<ReturnType<typeof submission.wait>>
    try {
      settled = await submission.wait(withAbortSignal(timeout, context))
    } catch (error) {
      if (context.abortSignal?.aborted) throw error
      if (!timeout.aborted) throw error
      try {
        await child.abort(withoutAbortSignal(context))
      } catch (abortError) {
        runtime.report(abortError)
      }
      throw new AuditAgentError("timeout", true, "Audit agent timed out", { cause: error })
    }
    if (settled.status !== "done") {
      const retryable = settled.reason === "model_error"
      throw new AuditAgentError(
        retryable ? "model_error" : "agent_failed",
        retryable,
        retryable ? "Audit agent model request failed" : "Audit agent did not finish",
      )
    }
    if (settled.type !== "input")
      throw new AuditAgentError("agent_failed", false, "Audit agent returned an unexpected result")
    const transcript = await runtime.context(conversationId, context)
    const answerEntry = transcript.entries.find((entry) => entry.id === settled.answer)
    const answer = AssistantEntry.is(answerEntry) ? answerEntry : undefined
    const text =
      answer?.model
        ?.flatMap((message) =>
          message.role === "assistant"
            ? message.content.flatMap((block) => (block.type === "text" ? [block.text] : []))
            : [],
        )
        .join("") ?? ""
    try {
      return parseAgentReport(text, auditId, page.url, submittedUrl)
    } catch (error) {
      const issues =
        error && typeof error === "object" && "issues" in error && Array.isArray(error.issues)
          ? error.issues.map((issue) => {
              const detail = issue as { code?: string; path?: (string | number)[] }
              return { code: detail.code, path: detail.path }
            })
          : undefined
      logger.warn("Audit agent output rejected", {
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage: error instanceof Error ? error.message : undefined,
        reason: issues?.length
          ? issues
              .slice(0, 3)
              .map((issue) => `${issue.code ?? ""}@${issue.path?.join(".") ?? ""}`)
              .join(",")
          : error instanceof Error
            ? error.message
            : "unknown",
        textLength: text.length,
        startsWithJson: text.trimStart().startsWith("{"),
        startsWithFence: text.trimStart().startsWith("```"),
        issues,
      })
      throw new AuditAgentError("invalid_output", true, "Audit agent returned invalid JSON", {
        cause: error,
      })
    }
  } finally {
    await closeAuditBrowser(runtime, conversationId, withoutAbortSignal(context))
  }
}
