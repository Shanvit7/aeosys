import assert from "node:assert/strict"
import { test } from "node:test"
import { parseAgentReport } from "@/lib/server/agents/audit/agent"

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
