import { z } from "zod"
import { coreWebVitalsSchema } from "@/schemas/core-web-vitals.schema"

const auditStatusSchema = z.enum(["queued", "running", "completed", "partial", "failed"])
const severitySchema = z.enum(["critical", "high", "medium", "low", "info"])
const findingCategorySchema = z.enum([
  "metadata",
  "crawlability",
  "structured-data",
  "content-structure",
  "answer-readiness",
  "other",
])
const proposalKindSchema = z.enum(["metadata", "json-ld", "content-snippet"])
const proposalStatusSchema = z.enum(["proposed", "approved", "rejected"])
const verificationStatusSchema = z.enum(["passed", "still-failing", "not-verified"])

const auditUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol
    return protocol === "http:" || protocol === "https:"
  }, "URL must use HTTP or HTTPS")

export const createAuditSchema = z.strictObject({ url: auditUrlSchema })
export const auditIdSchema = z.uuid()

export const fixProposalSchema = z.object({
  id: z.string().min(1),
  kind: proposalKindSchema,
  rationale: z.string().min(1),
  before: z.string().optional(),
  after: z.string().min(1),
  status: proposalStatusSchema,
  publicationStatus: z.literal("not-published"),
})

export const auditFindingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: findingCategorySchema,
  severity: severitySchema,
  evidence: z.object({
    description: z.string().min(1),
    observedValue: z.string().optional(),
    expectedValue: z.string().optional(),
    sourceUrl: z.url(),
    checkId: z.string().min(1),
  }),
  recommendation: z.string().min(1),
  proposedFix: fixProposalSchema.optional(),
})

export const auditErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  attempts: z.number().int().positive().optional(),
})

export const verificationResultSchema = z.object({
  proposalId: z.string().min(1),
  status: verificationStatusSchema,
  message: z.string().min(1),
  checkedAt: z.iso.datetime(),
})

export const auditCoverageSchema = z.object({
  inspectedUrls: z.array(auditUrlSchema).max(2000),
  remainingUrls: z.array(auditUrlSchema).max(2000),
  discoveryComplete: z.boolean(),
  limitations: z.array(z.string().min(1).max(2000)).max(50),
})

export const auditResultSchema = z.object({
  auditId: auditIdSchema,
  url: auditUrlSchema,
  status: auditStatusSchema,
  mode: z.enum(["live", "demo"]),
  createdAt: z.iso.datetime(),
  completedAt: z.iso.datetime().optional(),
  summary: z.string().optional(),
  findings: z.array(auditFindingSchema),
  performance: coreWebVitalsSchema.optional(),
  coverage: auditCoverageSchema.optional(),
  error: auditErrorSchema.optional(),
})

export const advisorPromptFor = (finding: Pick<AuditFinding, "title" | "proposedFix">) =>
  finding.proposedFix
    ? `How should I fix “${finding.title.slice(0, 300)}” on this page?`
    : `Does “${finding.title.slice(0, 300)}” need action, and what should I do?`

export const advisorChatRequestSchema = z.strictObject({})
const advisorMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(8_000),
})
export const advisorChatResponseSchema = z.object({
  messages: z.array(advisorMessageSchema).max(40),
  promptUsed: z.boolean(),
})
export type CreateAudit = z.infer<typeof createAuditSchema>
export type AuditResult = z.infer<typeof auditResultSchema>
export type AuditFinding = z.infer<typeof auditFindingSchema>
export type FixProposal = z.infer<typeof fixProposalSchema>
export type AdvisorMessage = z.infer<typeof advisorMessageSchema>
