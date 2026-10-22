import assert from "node:assert/strict"
import { test } from "node:test"
import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context"
import type { ConversationId, TaskRuntime } from "@earendil-works/pi-durable"
import { AuditAgentError, parseAgentReport, runAuditAgent } from "@/lib/server/agents/audit/agent"
import { logger } from "@/lib/server/logger"

const home = "https://example.com/"
const report = {
  summary: "Page title needs work.",
  coverage: {
    inspectedUrls: [home],
    remainingUrls: [] as string[],
    discoveryComplete: true,
    limitations: ["Public pages only; third-party resources blocked."],
  },
  findings: [
    {
      title: "Pricing page title is unclear",
      category: "metadata",
      severity: "low",
      evidence: { description: "Title is unclear", sourceUrl: home, checkId: "title" },
      recommendation: "Name the product in the title.",
    },
  ],
}

test("page audit reports stay within submitted URL", () => {
  const parsed = parseAgentReport(JSON.stringify(report), "audit", home)
  assert.equal(parsed.findings[0]?.evidence.sourceUrl, home)
  assert.deepEqual(parsed.coverage.inspectedUrls, [home])

  for (const sourceUrl of [
    "https://other.example/",
    "https://example.com/about",
    "https://user@example.com/",
  ]) {
    const invalid = structuredClone(report)
    invalid.findings[0].evidence.sourceUrl = sourceUrl
    assert.throws(() => parseAgentReport(JSON.stringify(invalid), "audit", home))
  }

  const extraPage = structuredClone(report)
  extraPage.coverage.inspectedUrls.push("https://example.com/about")
  assert.throws(() => parseAgentReport(JSON.stringify(extraPage), "audit", home))
})

test("logs bounded provider failure details without leaking the Gemini API key", async (t) => {
  const log = t.mock.method(logger, "error", () => {})
  const previousKey = process.env.GEMINI_API_KEY
  process.env.GEMINI_API_KEY = "test-secret-key"
  try {
    for (const detail of [
      "429 RESOURCE_EXHAUSTED key=test-secret-key test-secret-key",
      "x".repeat(3_000),
      undefined,
    ]) {
      const runtime = {
        conversation: async () => ({
          submit: async () => ({
            wait: async () => ({ status: "unanswered", reason: "model_error", detail }),
          }),
        }),
        snapshot: async () => undefined,
      } as unknown as TaskRuntime<unknown, unknown, unknown, object>
      await assert.rejects(
        runAuditAgent(
          runtime,
          1 as ConversationId,
          "audit",
          home,
          { url: home, status: 200 },
          1,
          BACKGROUND_CONTEXT,
        ),
        (error) => error instanceof AuditAgentError && error.code === "model_error",
      )
      const call = log.mock.calls.at(-1)
      assert.equal(call?.arguments[0], "Audit agent submission failed")
      const context = call?.arguments[1] as Record<string, unknown>
      assert.equal(context.auditId, "audit")
      assert.equal(context.reason, "model_error")
      assert.equal(
        context.detail,
        detail?.replaceAll("test-secret-key", "[REDACTED]").slice(0, 2_000),
      )
      assert.doesNotMatch(JSON.stringify(context), /test-secret-key/)
    }
  } finally {
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY
    else process.env.GEMINI_API_KEY = previousKey
  }
})
