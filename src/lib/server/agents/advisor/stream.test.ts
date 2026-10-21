import assert from "node:assert/strict"
import test from "node:test"
import { advisorEventStream } from "@/lib/server/agents/advisor/stream"

type WatchEvents = Awaited<ReturnType<typeof import("@earendil-works/pi-durable").watchEvents>>
type EventBatch = Parameters<Parameters<WatchEvents["start"]>[0]>[0]

test("advisor stream sends text deltas and completed transcript", async () => {
  let onEvents: ((batch: EventBatch) => void) | undefined
  let stopped = false
  const stream = advisorEventStream({
    events: {
      start: (callback: (batch: EventBatch) => void) => {
        onEvents = callback
      },
      stop: async () => {
        stopped = true
      },
    } as never,
    waitForSubmission: async () => ({ status: "done", type: "input" }),
    readMessages: async () => [],
  })

  const reader = stream.getReader()
  onEvents?.([
    {
      type: "message_update",
      changes: [{ type: "text_delta", delta: "Suggested fix" }],
    } as unknown as EventBatch[number],
  ])
  const result = await reader.read()
  assert.equal(
    new TextDecoder().decode(result.value),
    'event: delta\ndata: {"text":"Suggested fix"}\n\n',
  )
  const done = await reader.read()
  assert.equal(
    new TextDecoder().decode(done.value),
    'event: done\ndata: {"messages":[],"promptUsed":true}\n\n',
  )
  assert.equal((await reader.read()).done, true)
  assert.equal(stopped, true)
})

test("advisor stream reports unsuccessful submissions", async () => {
  const stream = advisorEventStream({
    events: { start: () => {}, stop: async () => {} } as never,
    waitForSubmission: async () => ({ status: "failed", type: "input" }),
    readMessages: async () => [],
  })

  const response = await new Response(stream).text()
  assert.match(
    response,
    /event: error\ndata: \{"message":"Advisor could not reply\. Please try again\."\}/,
  )
})
