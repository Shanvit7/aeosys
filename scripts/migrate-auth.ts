import { spawnSync } from "node:child_process"
import { resolve } from "node:path"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const databaseUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL
if (!databaseUrl) throw new Error("DATABASE_URL is required to migrate Better Auth.")

const result = spawnSync(
  "pnpm",
  ["dlx", "auth@1.7.12", "migrate", "--config", resolve("src/lib/server/auth.ts"), "--yes"],
  {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit",
  },
)
if (result.error) throw result.error
process.exitCode = result.status ?? 1
