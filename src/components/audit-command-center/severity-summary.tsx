import { ArrowDownToLine, CircleAlert, ScanSearch } from "lucide-react"
import GithubCardShiny from "@/components/animata/card/github-card-shiny"
import Counter from "@/components/animata/text/counter"
import type { AuditResult } from "@/schemas/audit.schema"

export const SeveritySummary = ({ audit }: { audit: AuditResult }) => {
  const highPriority = audit.findings.filter(
    (finding) => finding.severity === "critical" || finding.severity === "high",
  ).length
  const proposals = audit.findings.filter((finding) => finding.proposedFix).length
  const metrics = [
    {
      label: "What we found",
      value: audit.findings.length,
      icon: ScanSearch,
    },
    { label: "High priority", value: highPriority, detail: "start here", icon: CircleAlert },
    {
      label: "Suggested changes",
      value: proposals,
      detail: "review each before using",
      icon: ArrowDownToLine,
    },
  ]

  return (
    <section
      aria-label="Page audit results"
      className="grid animate-in fade-in slide-in-from-bottom-1 gap-3 duration-500 sm:grid-cols-3"
    >
      {metrics.map(({ label, value, detail, icon: Icon }) => (
        <GithubCardShiny key={label}>
          <div className="flex min-h-28 items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{label}</p>
              <Counter
                targetValue={value}
                className="mt-1 text-3xl font-semibold tabular-nums tracking-tight"
              />
              {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
            </div>
            <Icon aria-hidden="true" className="size-5 shrink-0 text-primary" />
          </div>
        </GithubCardShiny>
      ))}
    </section>
  )
}
