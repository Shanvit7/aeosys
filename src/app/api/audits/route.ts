import { parseJson, responseError } from "@/lib/server/api"
import { createAudit } from "@/lib/server/audits/service"
import { getSession, unauthorizedResponse } from "@/lib/server/auth"
import { createAuditSchema } from "@/schemas/audit.schema"

export const POST = async (request: Request) => {
  if (!(await getSession(request.headers))) return unauthorizedResponse()
  try {
    const { url } = await parseJson(request, createAuditSchema)
    const audit = await createAudit(url)
    return Response.json(audit, { status: 202, headers: { "cache-control": "no-store" } })
  } catch (error) {
    return responseError(error)
  }
}
