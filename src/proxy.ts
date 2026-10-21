import { checkRateLimit } from "@vercel/firewall"

const RATE_LIMIT_ID = "aeosys-api-v1"

export const proxy = async (request: Request) => {
  try {
    const { rateLimited, error } = await checkRateLimit(RATE_LIMIT_ID, {
      request,
      timeout: 1_000,
    })

    if (rateLimited) {
      return Response.json(
        { error: { message: "Too many requests. Try again later." } },
        { status: 429, headers: { "retry-after": "60" } },
      )
    }

    if (error) throw new Error(`Vercel Firewall rate-limit check failed: ${error}`)
  } catch (error) {
    console.error("API rate-limit check failed", error)
    return Response.json(
      { error: { message: "API protection is temporarily unavailable." } },
      { status: 503, headers: { "retry-after": "60" } },
    )
  }
}

export const config = { matcher: "/api/:path*" }
