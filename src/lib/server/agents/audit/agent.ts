import { type Context, withAbortSignal, withoutAbortSignal } from "@earendil-works/chord/context"
import { AssistantEntry, type ConversationId, type TaskRuntime } from "@earendil-works/pi-durable"
import type { AuditPage } from "@/lib/server/agents/audit/tools"
import { logger } from "@/lib/server/logger"
import { auditAgentReportSchema } from "@/schemas/audit-agent.schema"

const AUDIT_AGENT_TIMEOUT_MS = 55_000

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

export const parseAgentReport = (text: string, auditId: string, sourceUrl: string) => {
  const output = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim())
  if (output && typeof output === "object" && !Array.isArray(output)) delete output.$schema
  const report = auditAgentReportSchema.parse(output)
  const submittedPage = new URL(sourceUrl)
  const isSubmittedPage = (value: string) => {
    const url = new URL(value)
    return (
      url.origin === submittedPage.origin &&
      !url.username &&
      !url.password &&
      pageKey(url.href) === pageKey(sourceUrl)
    )
  }
  for (const finding of report.findings) {
    if (!isSubmittedPage(finding.evidence.sourceUrl)) {
      throw new Error("Finding source URL is not the submitted page")
    }
  }
  return {
    summary: report.summary,
    coverage: {
      inspectedUrls: [sourceUrl],
      remainingUrls: [],
      discoveryComplete: true,
      limitations: [
        "Only the submitted page was audited; other site pages were not reviewed.",
        "The AI review uses fetched static HTML, not a rendered browser DOM.",
        ...report.coverage.limitations.filter(
          (limitation) => !/five pages|sitemap|site-wide|whole website/i.test(limitation),
        ),
      ].slice(0, 50),
    },
    findings: report.findings.map(({ proposedFix, ...finding }, index) => ({
      ...finding,
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
  page: AuditPage,
  attempt: number,
  context: Context,
) => {
  const child = await runtime.conversation(conversationId, context)
  if (!child) throw new Error("Audit agent conversation unavailable")
  const submission = await child.submit(
    {
      type: "input",
      requestId: `audit:${auditId}:attempt:${attempt}`,
      content: `Audit only the submitted page at ${page.url}. Read the SEO, AI SEO, and Core Web Vitals skills; inspect the supplied HTML and return the required JSON. Do not discover or claim to inspect other pages.`,
    },
    context,
  )
  const timeout = AbortSignal.timeout(AUDIT_AGENT_TIMEOUT_MS)
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
    const detail = typeof settled.detail === "string" ? settled.detail : undefined
    const apiKey = process.env.GEMINI_API_KEY
    logger.error("Audit agent submission failed", {
      auditId,
      attempt,
      reason: settled.reason,
      detail: (apiKey ? detail?.replaceAll(apiKey, "[REDACTED]") : detail)?.slice(0, 2_000),
    })
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
    return parseAgentReport(text, auditId, page.url)
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
}
