import { readFile } from "node:fs/promises"
import { join } from "node:path"
import type { Context } from "@earendil-works/chord/context"
import { StringEnum, Type } from "@earendil-works/pi-ai"
import {
  type ConversationId,
  defineDoc,
  defineExtension,
  defineTool,
  section,
  type TaskRuntime,
  type Tx,
} from "@earendil-works/pi-durable"

import {
  AUDIT_BROWSER_TIMEOUT_MS,
  runAuditCommand,
  stopAuditBrowser,
} from "@/lib/server/agents/audit/browser"

export type AuditPage = { url: string; status: number }
export type AuditPageSnapshot = AuditPage & { html: string; truncated: boolean }
const skillsDirectory = join(process.cwd(), ".agents", "skills")
const skillNames = ["seo-audit", "ai-seo", "core-web-vitals", "agent-browser"] as const
const browserDoc = defineDoc<{ calls: number; startedAt: number }>({
  kind: "aeosys.audit-browser",
  version: 1,
  scope: "conversation",
  history: "latest",
  fork: "initial",
  initial: () => ({ calls: 0, startedAt: 0 }),
})
const pageDoc = defineDoc<{ url: string; status: number; html: string; truncated: boolean }>({
  kind: "aeosys.audit-page",
  version: 1,
  scope: "conversation",
  history: "latest",
  fork: "initial",
  initial: () => ({ url: "", status: 0, html: "", truncated: false }),
})

export const createAuditAgentExtension = () =>
  defineExtension({
    name: "aeosys-seo-agent",
    sections: [
      section(
        "audit-skills",
        () =>
          "Read installed skills `seo-audit`, `ai-seo`, and `core-web-vitals` with `read_audit_skill`. Review only the submitted page. Use `inspect_page` for supplied HTML; use bash/browser only to inspect the same URL when needed. Never crawl the site or open other pages.",
      ),
    ],
    tools: [
      defineTool({
        name: "bash",
        description:
          "Run shell commands in an isolated VM with agent-browser and Chromium installed. Read the browser skill first. Only the audited hostname is reachable, GET/HEAD only; private networks and third-party resources are blocked. No app files or credentials. Usually one `agent-browser read <url>` is enough; if you need more, use `agent-browser snapshot` or `agent-browser eval '<single-line js>'`. There is no `evaluate` command, and nested quotes or multi-line JS break `eval`. Never use Python or HTTP-library fallback; if browser access fails, report incomplete coverage. Each call lasts at most 15 seconds; budget is 8 calls and 55 seconds. Output may be truncated. Do not publish, submit forms, log in, or trigger site actions.",
        parameters: Type.Object({ command: Type.String({ minLength: 1, maxLength: 20_000 }) }),
        replay: "unsafe",
        executionMode: "sequential",
        execute: async ({ command }, api, context) => {
          if (/(^|[;&|]\s*)python(?:3)?\b/i.test(command)) {
            throw new Error(
              "Python fallback is disabled; use agent-browser or report incomplete coverage",
            )
          }
          const page = await api.snapshot(pageDoc, api.conversationId, context)
          if (!page?.url) throw new Error("Page snapshot unavailable")
          await api.commit(async (tx) => {
            const budget = await tx.doc(browserDoc, api.conversationId)
            const now = Date.now()
            if (
              budget.calls >= 8 ||
              (budget.startedAt && now - budget.startedAt >= AUDIT_BROWSER_TIMEOUT_MS)
            ) {
              throw new Error(
                "Browser budget exhausted; stop now and report remaining URLs and incomplete coverage",
              )
            }
            if (!budget.startedAt) budget.startedAt = now
            budget.calls++
          }, context)
          const result = await runAuditCommand(
            api.conversationId,
            page.url,
            command,
            context.abortSignal,
          )
          return { output: [{ type: "text", text: JSON.stringify(result) }] }
        },
      }),
      defineTool({
        name: "inspect_page",
        description:
          "Read fetched static HTML, final URL, HTTP status and truncation flag. This is not a rendered browser DOM.",
        parameters: Type.Object({}),
        replay: "safe",
        execute: async (_args, api, context) => {
          const page = await api.snapshot(pageDoc, api.conversationId, context)
          if (!page?.url) throw new Error("Page snapshot unavailable")
          return { output: [{ type: "text", text: JSON.stringify(page) }] }
        },
      }),
      defineTool({
        name: "read_audit_skill",
        description:
          "Read an installed SEO, AI SEO, Core Web Vitals, or agent-browser skill or local reference. Allowed paths: SKILL.md or references/<name>.md.",
        parameters: Type.Object({
          skill: StringEnum(skillNames),
          path: Type.String({ pattern: "^(SKILL\\.md|references/[a-z0-9-]+\\.md)$" }),
        }),
        replay: "safe",
        execute: async ({ skill, path }) => {
          if (
            !skillNames.includes(skill) ||
            !/^(SKILL\.md|references\/[a-z0-9-]+\.md)$/.test(path)
          ) {
            throw new Error("Skill path not allowed")
          }
          return {
            output: [
              { type: "text", text: await readFile(join(skillsDirectory, skill, path), "utf8") },
            ],
          }
        },
      }),
    ],
  })

export const readAuditPage = async <I, S, R, H extends object>(
  runtime: TaskRuntime<I, S, R, H>,
  conversationId: ConversationId,
  context: Context,
) => await runtime.snapshot(pageDoc, conversationId, context)

export const closeAuditBrowser = async <I, S, R, H extends object>(
  runtime: TaskRuntime<I, S, R, H>,
  conversationId: ConversationId,
  context: Context,
) => {
  const budget = await runtime.snapshot(browserDoc, conversationId, context)
  if (!budget?.calls || !process.env.AGENT_BROWSER_SNAPSHOT_ID) return
  try {
    await stopAuditBrowser(conversationId)
  } catch (error) {
    // The VM also auto-expires; cleanup failure must not discard the audit report.
    runtime.report(error)
  }
}

export const setAuditPage = async (
  tx: Tx,
  conversationId: ConversationId,
  page: { url: string; status: number; body: string; truncated?: boolean },
) => {
  Object.assign(await tx.doc(pageDoc, conversationId), {
    url: page.url,
    status: page.status,
    html: page.body.slice(0, 60_000),
    truncated: page.truncated ?? page.body.length > 60_000,
  })
}
