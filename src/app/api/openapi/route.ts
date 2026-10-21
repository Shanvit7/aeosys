import { getSession, unauthorizedResponse } from "@/lib/server/auth"
import { openapi } from "@/lib/server/openapi"

export const GET = async (request: Request) => {
  if (!(await getSession(request.headers))) return unauthorizedResponse()
  return Response.json(openapi, { headers: { "cache-control": "no-store" } })
}
