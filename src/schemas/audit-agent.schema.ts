import { z } from "zod"
import { auditCoverageSchema, auditFindingSchema, fixProposalSchema } from "@/schemas/audit.schema"

export const auditAgentReportSchema = z.strictObject({
  summary: z.string().min(1).max(2000),
  coverage: auditCoverageSchema,
  findings: z
    .array(
      auditFindingSchema.omit({ id: true, proposedFix: true }).extend({
        proposedFix: fixProposalSchema
          .omit({ id: true, status: true, publicationStatus: true })
          .optional(),
      }),
    )
    .max(20),
})

const reportJsonSchema = z.toJSONSchema(auditAgentReportSchema)
delete reportJsonSchema.$schema

export const auditAgentReportJsonSchema = JSON.stringify(reportJsonSchema)
