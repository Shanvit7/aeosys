import { z } from "zod"

const pageSpeedMetricSchema = z.object({
  value: z.number().nonnegative(),
  unit: z.enum(["ms", "score"]),
  threshold: z.number().positive(),
  status: z.enum(["good", "needs-improvement", "poor"]),
})

const pageSpeedDataSchema = z.object({
  lcp: pageSpeedMetricSchema.optional(),
  inp: pageSpeedMetricSchema.optional(),
  cls: pageSpeedMetricSchema.optional(),
  fcp: pageSpeedMetricSchema.optional(),
  tbt: pageSpeedMetricSchema.optional(),
})

export const coreWebVitalsSchema = z.object({
  // Legacy source retained so previously saved audits remain readable.
  source: z.string().min(1),
  status: z.enum(["available", "unavailable"]),
  strategy: z.literal("mobile"),
  checkedAt: z.iso.datetime(),
  fieldData: pageSpeedDataSchema.extend({ scope: z.enum(["page", "origin"]) }).optional(),
  labData: pageSpeedDataSchema.optional(),
  unavailableReason: z.string().min(1).optional(),
})

export type CoreWebVitals = z.infer<typeof coreWebVitalsSchema>
