import { z } from "zod"

export const jsonSchema = (schema: z.ZodType) => z.toJSONSchema(schema, { target: "draft-2020-12" })

export const jsonResponseSchema = (description: string, schema: z.ZodType) => ({
  description,
  content: { "application/json": { schema: jsonSchema(schema) } },
})
