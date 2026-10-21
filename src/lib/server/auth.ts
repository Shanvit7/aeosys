import { betterAuth } from "better-auth"
import { Pool } from "pg"

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for authentication.")
if (process.env.NODE_ENV === "production") {
  if (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32)
    throw new Error("BETTER_AUTH_SECRET must be at least 32 characters in production.")
  if (!process.env.BETTER_AUTH_URL?.startsWith("https://"))
    throw new Error("BETTER_AUTH_URL must use HTTPS in production.")
}

const globalForAuth = globalThis as typeof globalThis & { authPool?: Pool }
const pool =
  globalForAuth.authPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: true } : undefined,
  })
globalForAuth.authPool = pool
export const authPool = pool

export const auth = betterAuth({
  appName: "Aeosys",
  baseURL: process.env.BETTER_AUTH_URL,
  database: pool,
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },
  rateLimit: {
    storage: "database",
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: {
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    },
  },
})

export const getSession = (headers: Headers) => auth.api.getSession({ headers })

export const unauthorizedResponse = () =>
  Response.json({ error: { message: "Authentication required" } }, { status: 401 })
