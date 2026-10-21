import { ApiReference } from "@scalar/nextjs-api-reference"
import { getSession, unauthorizedResponse } from "@/lib/server/auth"

const apiReference = ApiReference({ url: "/api/openapi" })

export const GET = async (request: Request) => {
  if (!(await getSession(request.headers))) return unauthorizedResponse()
  return apiReference()
}
