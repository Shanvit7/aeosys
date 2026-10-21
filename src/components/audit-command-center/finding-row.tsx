import { Badge } from "@/components/ui/badge"
import type { AuditFinding } from "@/schemas/audit.schema"
import { severityColor, severityLabel } from "./utils"

export const FindingRow = ({
  finding,
  onSelect,
}: {
  finding: AuditFinding
  onSelect: (finding: AuditFinding) => void
}) => (
  <button
    type="button"
    onClick={() => onSelect(finding)}
    className="flex min-h-14 w-full items-center justify-between gap-4 px-3 py-3 text-left transition-colors hover:bg-accent/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
  >
    <span className="min-w-0 truncate text-sm font-medium">{finding.title}</span>
    <Badge variant="outline" className={`shrink-0 ${severityColor(finding.severity)}`}>
      {severityLabel(finding.severity)}
    </Badge>
  </button>
)
