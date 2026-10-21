import type { ConversationId } from "@earendil-works/pi-durable"
import { z } from "zod"
import { auditResultSchema, verificationResultSchema } from "@/schemas/audit.schema"

export const auditStoreSchema = z.object({
  audits: z.record(z.string(), auditResultSchema),
  verifications: z.record(z.string(), verificationResultSchema).default({}),
  advisorThreads: z
    .record(z.string(), z.number())
    .default({})
    .transform((ids) => ids as Record<string, ConversationId>),
  advisorPromptUsed: z.record(z.string(), z.boolean()).default({}),
})

export type AuditStore = z.infer<typeof auditStoreSchema>
