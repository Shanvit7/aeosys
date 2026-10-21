import type { Pool } from "pg"

const runIdPattern = /^wrun_[0-7][0-9A-HJKMNP-TV-Z]{25}$/

export const getAuditSessionId = async (
  pool: Pool,
  scope: string,
  createSession: () => Promise<string>,
) => {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    // ponytail: one bootstrap lock per database; use per-scope locks if cold-start volume warrants.
    await client.query("SELECT pg_advisory_xact_lock(hashtext('aeosys_workflow_sessions'))")
    await client.query(`CREATE TABLE IF NOT EXISTS aeosys_workflow_sessions (
      scope TEXT PRIMARY KEY,
      session_id TEXT NOT NULL
    )`)
    const { rows } = await client.query<{ session_id: string }>(
      "SELECT session_id FROM aeosys_workflow_sessions WHERE scope = $1",
      [scope],
    )
    const sessionId = rows[0]?.session_id ?? (await createSession())
    if (!runIdPattern.test(sessionId)) throw new Error("Invalid audit Workflow session ID")
    if (!rows.length) {
      await client.query(
        "INSERT INTO aeosys_workflow_sessions (scope, session_id) VALUES ($1, $2)",
        [scope, sessionId],
      )
    }
    await client.query("COMMIT")
    return sessionId
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}
