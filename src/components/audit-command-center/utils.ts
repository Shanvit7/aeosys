import type { AuditFinding } from "@/schemas/audit.schema"

export type FindingFilter =
  | { field: "severity"; value: AuditFinding["severity"] }
  | { field: "category"; value: AuditFinding["category"] }

const categoryLabels: Record<AuditFinding["category"], string> = {
  metadata: "Page details",
  crawlability: "Page access",
  "structured-data": "Extra page details",
  "content-structure": "Page layout",
  "answer-readiness": "Clear answers",
  other: "Other",
}

const severityLabels: Record<AuditFinding["severity"], string> = {
  critical: "Urgent",
  high: "Important",
  medium: "Worth a look",
  low: "Optional",
  info: "Note",
}

const severityColors: Record<AuditFinding["severity"], string> = {
  critical: "border-destructive/30 bg-destructive/10 text-destructive",
  high: "border-primary/30 bg-primary/10 text-primary",
  medium: "border-warning/30 bg-warning/10 text-warning",
  low: "border-success/30 bg-success/10 text-success",
  info: "border-border bg-muted text-muted-foreground",
}

export const categoryLabel = (category: AuditFinding["category"]) => categoryLabels[category]
export const severityLabel = (severity: AuditFinding["severity"]) => severityLabels[severity]

export const severityColor = (severity: AuditFinding["severity"]) => severityColors[severity]
