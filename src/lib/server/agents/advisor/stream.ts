import type { AdvisorMessage } from "@/schemas/audit.schema"

const encoder = new TextEncoder()

/** Serializes advisor conversation updates as server-sent events. */
export const advisorEventStream = ({
  events,
  signal,
  waitForSubmission,
  readMessages,
}: {
  events: Awaited<ReturnType<typeof import("@earendil-works/pi-durable").watchEvents>>
  signal?: AbortSignal
  waitForSubmission: () => Promise<{ status: string; type?: string } | undefined>
  readMessages: () => Promise<AdvisorMessage[]>
}) => {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true
      const emit = (event: string, data: unknown) => {
        if (!open) return
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }
      const close = async () => {
        if (!open) return
        open = false
        await events.stop().catch(() => undefined)
        try {
          controller.close()
        } catch {
          // stream already closed by the client
        }
      }
      signal?.addEventListener("abort", () => void close(), { once: true })

      events.start(async (batch) => {
        for (const event of batch) {
          if (event.type !== "message_update") continue
          for (const change of event.changes) {
            if (change.type === "text_delta") emit("delta", { text: change.delta })
          }
        }
      })

      const settled = await waitForSubmission().catch(() => undefined)
      if (settled?.status === "done" && settled.type === "input") {
        emit("done", {
          messages: await readMessages(),
          promptUsed: true,
        })
      } else {
        emit("error", { message: "Advisor could not reply. Please try again." })
      }
      await close()
    },
    cancel: () => events.stop().then(() => undefined),
  })
}
