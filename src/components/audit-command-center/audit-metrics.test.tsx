import assert from "node:assert/strict"
import { test } from "node:test"
import { renderToStaticMarkup } from "react-dom/server"
import { AuditMetrics } from "@/components/audit-command-center/audit-metrics"
import { Findings } from "@/components/audit-command-center/findings"
import type { AuditResult } from "@/schemas/audit.schema"

const audit: AuditResult = {
  auditId: "1b1acdf2-f70e-4240-9a30-05ffef2eb186",
  url: "https://example.com",
  status: "completed",
  mode: "live",
  createdAt: "2026-10-21T12:00:00Z",
  summary: "This verbose summary should not appear.",
  findings: (
    [
      { id: "metadata", title: "Missing description", category: "metadata", severity: "high" },
      { id: "layout", title: "Heading order", category: "content-structure", severity: "low" },
    ] as const
  ).map((finding) => ({
    ...finding,
    evidence: {
      description: "Observed issue",
      sourceUrl: "https://example.com",
      checkId: finding.id,
    },
    recommendation: "Review this issue",
  })),
  coverage: { inspectedUrls: [], remainingUrls: [], discoveryComplete: false, limitations: [] },
  performance: {
    source: "Chrome UX Report",
    status: "unavailable",
    strategy: "mobile",
    checkedAt: "2026-10-21T12:00:00Z",
    unavailableReason: "No field data available.",
  },
}
const noop = () => {}

test("overview shows Core Web Vitals in place of category card", () => {
  const html = renderToStaticMarkup(
    <AuditMetrics
      audit={audit}
      filter={{ field: "severity", value: "high" }}
      onFilterChange={noop}
    />,
  )
  assert.doesNotMatch(html, /This verbose summary|NaN|Infinity/)
  assert.match(
    html,
    /aria-pressed="true" aria-controls="audit-findings" aria-label="Important: 1 finding"/,
  )
  assert.doesNotMatch(html, /Page reviewed|submitted page|content could not be reviewed/)
  assert.match(html, /Core Web Vitals/)
  assert.match(html, /Largest contentful paint: —; No data/)
  assert.match(html, /No field data available/)
  assert.doesNotMatch(html, /Areas to improve|<details/)
})

test("legacy PageSpeed quota errors do not leak into Core Web Vitals UI", () => {
  const html = renderToStaticMarkup(
    <AuditMetrics
      audit={{
        ...audit,
        performance: {
          source: "PageSpeed Insights",
          status: "unavailable",
          strategy: "mobile",
          checkedAt: "2026-10-21T12:00:00Z",
          unavailableReason: "PageSpeed Insights quota reached; try again later.",
        },
      }}
      filter={null}
      onFilterChange={noop}
    />,
  )

  assert.match(html, /Core Web Vitals data was unavailable for this audit/)
  assert.doesNotMatch(html, /PageSpeed Insights|quota reached/)
})

test("renders lab measurements when no field data exists", () => {
  const html = renderToStaticMarkup(
    <AuditMetrics
      audit={{
        ...audit,
        performance: {
          source: "Chrome",
          status: "available",
          strategy: "mobile",
          checkedAt: "2026-10-21T12:00:00Z",
          labData: {
            lcp: { value: 964, unit: "ms", threshold: 2_500, status: "good" },
            fcp: { value: 108, unit: "ms", threshold: 1_800, status: "good" },
            cls: { value: 0, unit: "score", threshold: 0.1, status: "good" },
          },
        },
      }}
      filter={null}
      onFilterChange={noop}
    />,
  )

  assert.match(html, /Lab measurement · mobile · example\.com/)
  assert.match(html, /Largest contentful paint: 964 ms; Good/)
  assert.match(html, /Cumulative layout shift: 0\.000; Good/)
  assert.match(html, /First contentful paint: 108 ms; Good/)
  assert.doesNotMatch(html, /Interaction to Next Paint/)
})

test("priority and area filters narrow findings without losing total counts", () => {
  for (const filter of [
    { field: "severity", value: "high" },
    { field: "category", value: "metadata" },
  ] as const) {
    const html = renderToStaticMarkup(
      <Findings audit={audit} filter={filter} onClearFilter={noop} onSelect={noop} />,
    )
    assert.match(html, /Missing description/)
    assert.doesNotMatch(html, /Heading order/)
    assert.match(html, /Clear filter/)
    assert.match(html, /1 of 2/)
  }
  const all = renderToStaticMarkup(
    <Findings audit={audit} filter={null} onClearFilter={noop} onSelect={noop} />,
  )
  assert.match(all, /Missing description/)
  assert.match(all, /Heading order/)
  const empty = renderToStaticMarkup(
    <AuditMetrics audit={{ ...audit, findings: [] }} filter={null} onFilterChange={noop} />,
  )
  assert.match(empty, /No findings to compare/)
  assert.doesNotMatch(empty, /NaN|Infinity/)
})

test("Core Web Vitals shows real-user values and thresholds without lab metrics", () => {
  const html = renderToStaticMarkup(
    <AuditMetrics
      audit={{
        ...audit,
        coverage: {
          inspectedUrls: [audit.url],
          remainingUrls: [],
          discoveryComplete: true,
          limitations: [],
        },
        performance: {
          source: "Chrome UX Report",
          strategy: "mobile",
          checkedAt: "2026-10-21T12:00:00Z",
          status: "available",
          fieldData: {
            scope: "page",
            lcp: { value: 3500, unit: "ms", threshold: 2500, status: "needs-improvement" },
            inp: { value: 180, unit: "ms", threshold: 200, status: "good" },
            cls: { value: 0, unit: "score", threshold: 0.1, status: "good" },
          },
        },
      }}
      filter={null}
      onFilterChange={noop}
    />,
  )
  for (const text of ["180 ms", "3.5 s", "0.000", "Target ≤", "Core Web Vitals", "Good"]) {
    assert.ok(html.includes(text), `Missing ${text}`)
  }
  assert.doesNotMatch(html, /<details|PageSpeed|Discovery is incomplete/)
})
