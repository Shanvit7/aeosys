import { logger } from "@/lib/server/logger"

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

type Parser<T> = { safeParse(value: unknown): { success: true; data: T } | { success: false } }

export const parseJson = async <T>(request: Request, schema: Parser<T>) => {
  const contentLength = Number(request.headers.get("content-length") ?? 0)
  if (contentLength > 10_000) throw new ApiError(413, "Request body is too large")
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new ApiError(400, "Request body must be valid JSON")
  }
  const result = schema.safeParse(body)
  if (!result.success) throw new ApiError(400, "Request body is invalid")
  return result.data
}

export const responseError = (error: unknown) => {
  if (error instanceof ApiError)
    return Response.json({ error: { message: error.message } }, { status: error.status })
  logger.error("API request failed", {
    error:
      error instanceof Error
        ? `${error.name}: ${error.message}\n${error.stack ?? ""}`.slice(0, 2_000)
        : String(error),
  })
  return Response.json({ error: { message: "Internal server error" } }, { status: 500 })
}
