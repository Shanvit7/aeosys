import { responseError } from "@/lib/server/api"
import { getProposal } from "@/lib/server/audits/service"
import { auditIdSchema } from "@/schemas/audit.schema"

export const POST = async (
  _request: Request,
  context: { params: Promise<{ id: string; findingId: string }> },
) => {
  try {
    const { id, findingId } = await context.params
    const parsed = auditIdSchema.safeParse(id)
    if (!parsed.success || !findingId)
      return Response.json(
        { error: { message: "Audit or finding ID is invalid" } },
        { status: 400 },
      )
    return Response.json(await getProposal(parsed.data, findingId), {
      headers: { "cache-control": "no-store" },
    })
  } catch (error) {
    return responseError(error)
  }
}
