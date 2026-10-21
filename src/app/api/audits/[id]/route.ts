import { responseError } from "@/lib/server/api"
import { getAudit } from "@/lib/server/audits/service"
import { getSession, unauthorizedResponse } from "@/lib/server/auth"
import { auditIdSchema } from "@/schemas/audit.schema"

export const GET = async (request: Request, context: { params: Promise<{ id: string }> }) => {
  if (!(await getSession(request.headers))) return unauthorizedResponse()
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
