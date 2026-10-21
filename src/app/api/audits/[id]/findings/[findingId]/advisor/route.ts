import { getAdvisorChat, streamAdvisorMessage } from "@/lib/server/agents/advisor"
import { parseJson, responseError } from "@/lib/server/api"
import { advisorChatRequestSchema, auditIdSchema } from "@/schemas/audit.schema"

export const GET = async (
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
    return Response.json(await getAdvisorChat(parsed.data, findingId), {
      headers: { "cache-control": "no-store" },
    })
  } catch (error) {
    return responseError(error)
  }
}

export const POST = async (
  request: Request,
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
    await parseJson(request, advisorChatRequestSchema)
    return new Response(await streamAdvisorMessage(parsed.data, findingId, request.signal), {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-store",
        "x-accel-buffering": "no",
      },
    })
  } catch (error) {
    return responseError(error)
  }
}
