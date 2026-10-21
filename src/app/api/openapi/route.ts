import { openapi } from "@/lib/server/openapi"

export const GET = async () => {
  return Response.json(openapi, { headers: { "cache-control": "no-store" } })
}
