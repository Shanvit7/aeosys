import assert from "node:assert/strict"
import test from "node:test"
import type { Pool } from "pg"
import { getAuditSessionId } from "@/lib/server/audits/session"

const runId = "wrun_01K00000000000000000000000"

// In-memory SQL boundary: exercise bootstrap, cold-start reuse, and rollback without production writes.
const database = () => {
  const sessions = new Map<string, string>()
  const queries: string[] = []
  let releases = 0
  const pool = {
    connect: async () => ({
      query: async (sql: string, values: string[] = []) => {
        queries.push(sql)
        if (sql.startsWith("SELECT session_id")) {
          const sessionId = sessions.get(values[0])
          return { rows: sessionId ? [{ session_id: sessionId }] : [] }
        }
        if (sql.startsWith("INSERT INTO")) sessions.set(values[0], values[1])
        return { rows: [] }
      },
      release: () => releases++,
    }),
  } as unknown as Pool
  return { pool, sessions, queries, releases: () => releases }
}

test("creates a real run once and reuses its persisted ID across cold starts", async () => {
  const db = database()
  let creations = 0
  const create = async () => {
    assert.ok(db.queries.at(-3)?.includes("pg_advisory_xact_lock"))
    creations++
    return runId
  }
  assert.equal(await getAuditSessionId(db.pool, "project:production", create), runId)
  assert.equal(await getAuditSessionId(db.pool, "project:production", create), runId)
  assert.equal(creations, 1)
  assert.equal(db.releases(), 2)
  assert.equal(db.queries.at(-1), "COMMIT")
  await getAuditSessionId(db.pool, "project:preview", create)
  assert.equal(creations, 2)
  assert.equal(db.sessions.size, 2)
})

test("rejects the app label as a run ID and rolls back bootstrap failures", async () => {
  const db = database()
  await assert.rejects(
    getAuditSessionId(db.pool, "project:production", async () => "aeosys-audits"),
    /Invalid audit Workflow session ID/,
  )
  assert.equal(db.queries.at(-1), "ROLLBACK")
  assert.equal(db.sessions.size, 0)
  assert.equal(db.releases(), 1)
  await assert.rejects(
    getAuditSessionId(db.pool, "project:production", async () => {
      throw new Error("Workflow unavailable")
    }),
    /Workflow unavailable/,
  )
  assert.equal(db.queries.at(-1), "ROLLBACK")
  assert.equal(db.releases(), 2)
  assert.equal(await getAuditSessionId(db.pool, "project:production", async () => runId), runId)
})
