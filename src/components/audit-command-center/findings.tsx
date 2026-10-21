import {
  categoryLabel,
  type FindingFilter,
  severityLabel,
} from "@/components/audit-command-center/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { AuditFinding, AuditResult } from "@/schemas/audit.schema"
import { FindingRow } from "./finding-row"

const priority: Record<AuditFinding["severity"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
}

export const Findings = ({
  audit,
  filter,
  onClearFilter,
  onSelect,
}: {
  audit: AuditResult
  filter: FindingFilter | null
  onClearFilter: () => void
  onSelect: (finding: AuditFinding) => void
}) => {
  const findings = audit.findings
    .filter((finding) => !filter || finding[filter.field] === filter.value)
    .sort((a, b) => priority[a.severity] - priority[b.severity])
  const filterLabel =
    filter?.field === "severity"
      ? severityLabel(filter.value)
      : filter
        ? categoryLabel(filter.value)
        : null

  return (
    <Card id="audit-findings" className="scroll-mt-6">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between">
        <div className="grid gap-1">
          <CardTitle>
            <h2>Findings</h2>
          </CardTitle>
          <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
            {findings.length} of {audit.findings.length} findings
            {filterLabel ? ` · ${filterLabel}` : " · All areas"}
          </p>
        </div>
        {filter && (
          <Button variant="ghost" size="lg" onClick={onClearFilter}>
            Clear filter
          </Button>
        )}
      </CardHeader>
      <Separator />
      {findings.length ? (
        <CardContent>
          <ul className="divide-y divide-border">
            {findings.map((finding) => (
              <li key={finding.id}>
                <FindingRow finding={finding} onSelect={onSelect} />
              </li>
            ))}
          </ul>
        </CardContent>
      ) : (
        <CardContent>
          <p className="py-4 text-sm text-muted-foreground">
            {filter
              ? "No findings match this filter."
              : "Nothing needs attention in the checks we could run."}
          </p>
        </CardContent>
      )}
    </Card>
  )
}
