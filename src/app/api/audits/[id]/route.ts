import { responseError } from "@/lib/server/api"
import { getAudit } from "@/lib/server/audits/service"
import { auditIdSchema } from "@/schemas/audit.schema"

export const GET = async (_request: Request, context: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await context.params
    const parsed = auditIdSchema.safeParse(id)
    if (!parsed.success)
      return Response.json({ error: { message: "Audit ID is invalid" } }, { status: 400 })
    return Response.json(await getAudit(parsed.data), { headers: { "cache-control": "no-store" } })
  } catch (error) {
    return responseError(error)
  }
}
