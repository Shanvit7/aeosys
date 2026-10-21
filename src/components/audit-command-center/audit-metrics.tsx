"use client"

import BarChart from "@/components/animata/graphs/bar-chart"
import GaugeChart from "@/components/animata/progress/gauge-chart"
import { type FindingFilter, severityLabel } from "@/components/audit-command-center/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { AuditFinding, AuditResult } from "@/schemas/audit.schema"
import type { CoreWebVitals } from "@/schemas/core-web-vitals.schema"

const severityOrder: AuditFinding["severity"][] = ["critical", "high", "medium", "low", "info"]
const severityFills = {
  critical: "bg-destructive",
  high: "bg-primary",
  medium: "bg-warning",
  low: "bg-success",
  info: "bg-muted-foreground",
}
const fieldDataSpecs = [
  { key: "lcp", label: "LCP", description: "Largest contentful paint" },
  { key: "inp", label: "INP", description: "Interaction to Next Paint" },
  { key: "cls", label: "CLS", description: "Cumulative layout shift" },
] as const
// INP needs real interactions, so the lab measurement shows FCP instead.
const labDataSpecs = [
  { key: "lcp", label: "LCP", description: "Largest contentful paint" },
  { key: "fcp", label: "FCP", description: "First contentful paint" },
  { key: "cls", label: "CLS", description: "Cumulative layout shift" },
] as const

const formatMetricValue = (value: number, unit: "ms" | "score") =>
  unit === "score"
    ? value.toFixed(3)
    : value < 1_000
      ? `${Math.round(value)} ms`
      : `${(value / 1_000).toFixed(1)} s`

const PerformanceMetrics = ({ metrics, url }: { metrics?: CoreWebVitals; url: string }) => {
  const fieldData = metrics?.status === "available" ? metrics.fieldData : undefined
  const data = fieldData ?? metrics?.labData
  const metricSpecs = metrics?.labData ? labDataSpecs : fieldDataSpecs
  const unavailableReason =
    metrics?.status === "unavailable"
      ? metrics.unavailableReason?.toLowerCase().includes("pagespeed")
        ? "Core Web Vitals data was unavailable for this audit."
        : metrics.unavailableReason
      : undefined

  return (
    <Card>
      <CardHeader className="mt-2">
        <CardTitle>
          <h2>Core Web Vitals</h2>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {fieldData
            ? `Real-user data · mobile · ${new URL(url).host} · 75th percentile`
            : `Lab measurement · mobile · ${new URL(url).host}`}
        </p>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {metricSpecs.map(({ key, label, description }) => {
            const metric = data?.[key]
            const statusClass = metric
              ? metric.status === "good"
                ? "text-success"
                : metric.status === "poor"
                  ? "text-destructive"
                  : "text-warning"
              : "text-muted-foreground"
            const progress = metric ? Math.min(100, (metric.value / metric.threshold) * 100) : 0
            const status = metric
              ? metric.status === "good"
                ? "Good"
                : metric.status === "poor"
                  ? "Poor"
                  : "Needs improvement"
              : "No data"
            const value = metric ? formatMetricValue(metric.value, metric.unit) : "—"

            return (
              <li
                key={key}
                className="grid justify-items-center gap-2 rounded-xl border border-border/50 p-3 text-center"
              >
                <abbr
                  title={description}
                  className="text-xs font-medium text-muted-foreground no-underline"
                >
                  {label}
                </abbr>
                <div
                  role="img"
                  aria-label={`${description}: ${value}; ${status}${metric ? `; target ≤ ${formatMetricValue(metric.threshold, metric.unit)}` : ""}`}
                >
                  <GaugeChart
                    size={108}
                    gap={48}
                    progress={progress}
                    circleWidth={9}
                    progressWidth={9}
                    trackClassName="text-muted"
                    progressClassName={statusClass}
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-0 grid place-items-center text-xs font-semibold tabular-nums text-foreground"
                    >
                      {value}
                    </span>
                  </GaugeChart>
                </div>
                <p className={cn("text-xs font-medium", statusClass)}>{status}</p>
                {metric && (
                  <p className="text-xs text-muted-foreground">
                    Target ≤ {formatMetricValue(metric.threshold, metric.unit)}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
        {unavailableReason && (
          <p className="text-xs leading-5  pt-2 text-muted-foreground">{unavailableReason}</p>
        )}
        {!metrics && (
          <p className="text-xs leading-5 text-muted-foreground">
            Core Web Vitals were not collected for this audit.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export const AuditMetrics = ({
  audit,
  filter,
  onFilterChange,
}: {
  audit: AuditResult
  filter: FindingFilter | null
  onFilterChange: (filter: FindingFilter | null) => void
}) => {
  const severityRows = severityOrder.map((severity) => ({
    id: severity,
    label: severityLabel(severity),
    value: audit.findings.filter((finding) => finding.severity === severity).length,
    className: severityFills[severity],
  }))
  return (
    <section aria-label="Audit overview" className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="mt-2">
          <CardTitle>
            <h2>Where to start</h2>
          </CardTitle>
          <p className="text-xs leading-5 text-muted-foreground">
            {filter?.field === "severity" ? (
              <a
                href="#audit-findings"
                className="text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
              >
                View {severityLabel(filter.value).toLowerCase()} findings →
              </a>
            ) : (
              "Choose a priority to focus your findings."
            )}
          </p>
        </CardHeader>
        <CardContent className="mt-4 mb-2">
          {audit.findings.length ? (
            <BarChart
              items={severityRows}
              selectedId={filter?.field === "severity" ? filter.value : undefined}
              onSelect={(id) => {
                const severity = severityOrder.find((value) => value === id)
                if (severity)
                  onFilterChange(
                    filter?.field === "severity" && filter.value === severity
                      ? null
                      : { field: "severity", value: severity },
                  )
              }}
            />
          ) : (
            <p className="py-8 text-sm text-muted-foreground">No findings to compare.</p>
          )}
        </CardContent>
      </Card>

      <PerformanceMetrics metrics={audit.performance} url={audit.url} />
    </section>
  )
}
