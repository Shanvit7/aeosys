import assert from "node:assert/strict"
import test from "node:test"
import { parseBrowserVitals, parseCruxResponse } from "@/lib/server/audits/core-web-vitals"

test("parses real-user Core Web Vitals from Chrome UX Report", () => {
  const metrics = parseCruxResponse(
    {
      record: {
        metrics: {
          largest_contentful_paint: { percentiles: { p75: 2_700 } },
          interaction_to_next_paint: { percentiles: { p75: 180 } },
          cumulative_layout_shift: { percentiles: { p75: 0.04 } },
        },
      },
    },
    "2026-01-01T00:00:00.000Z",
  )

  assert.equal(metrics?.status, "available")
  assert.equal(metrics?.source, "Chrome UX Report")
  assert.equal(metrics?.fieldData?.lcp?.status, "needs-improvement")
  assert.equal(metrics?.fieldData?.inp?.status, "good")
  assert.equal(metrics?.fieldData?.cls?.value, 0.04)
  assert.equal(metrics?.labData, undefined)
})

test("returns no result when CrUX has no metrics", () => {
  assert.equal(parseCruxResponse({ record: { metrics: {} } }), undefined)
})

// Shape captured from `agent-browser vitals https://www.zosma.ai --json`.
test("parses lab Core Web Vitals from agent-browser vitals", () => {
  const metrics = parseBrowserVitals(
    {
      success: true,
      data: {
        cls: { entries: [], score: 0 },
        fcp: 108,
        inp: null,
        lcp: { startTime: 108 },
        ttfb: 0.4,
      },
    },
    "2026-01-01T00:00:00.000Z",
  )

  assert.equal(metrics?.status, "available")
  assert.equal(metrics?.labData?.lcp?.value, 108)
  assert.equal(metrics?.labData?.lcp?.status, "good")
  assert.equal(metrics?.labData?.cls?.value, 0)
  assert.equal(metrics?.labData?.fcp?.value, 108)
  assert.equal(metrics?.labData?.fcp?.status, "good")
  assert.equal(metrics?.labData?.inp, undefined)
  assert.equal(metrics?.fieldData, undefined)
})

test("returns no result when browser vitals report no timings", () => {
  assert.equal(parseBrowserVitals({ success: false, error: "boom" }), undefined)
})
