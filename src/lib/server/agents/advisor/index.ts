import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context"
import { ConversationBusy, watchEvents } from "@earendil-works/pi-durable"
import { ApiError } from "@/lib/server/api"
import { readStore, runtime } from "@/lib/server/audits/service"
import { advisorPromptFor } from "@/schemas/audit.schema"
import { advisorEventStream } from "./stream"
import {
  advisorThreadKey,
  ensureAdvisorConversation,
  getAdvisorFinding,
  readAdvisorMessages,
} from "./thread"

export const getAdvisorChat = async (auditId: string, findingId: string) => {
  await getAdvisorFinding(auditId, findingId)
  const { harness, store } = await readStore()
  const conversationId = store?.advisorThreads?.[advisorThreadKey(auditId, findingId)]
  const messages = conversationId ? await readAdvisorMessages(harness, conversationId) : []
  return { messages, promptUsed: messages.length > 0 }
}

export const streamAdvisorMessage = async (
  auditId: string,
  findingId: string,
  signal?: AbortSignal,
) => {
  const [{ audit, finding, proposal }, { harness, rootId }] = await Promise.all([
    getAdvisorFinding(auditId, findingId),
    runtime(),
  ])

  const conversationId = await ensureAdvisorConversation(harness, rootId, {
    key: advisorThreadKey(auditId, findingId),
    audit,
    finding,
    proposal,
  })
  if (!conversationId) throw new ApiError(503, "Advisor conversation is unavailable")

  const conversation = await harness.conversation(conversationId, BACKGROUND_CONTEXT)
  if (!conversation) throw new ApiError(503, "Advisor conversation is unavailable")

  let submission: Awaited<ReturnType<typeof conversation.submit>>
  try {
    submission = await conversation.submit(
      {
        type: "input",
        requestId: `advisor:${auditId}:${findingId}:${crypto.randomUUID()}`,
        content: advisorPromptFor(finding),
        whenBusy: "reject",
      },
      BACKGROUND_CONTEXT,
    )
  } catch (error) {
    if (error instanceof ConversationBusy)
      throw new ApiError(409, "Advisor is replying to another message")
    throw error
  }

  const events = await watchEvents(harness, conversationId, BACKGROUND_CONTEXT)

  return advisorEventStream({
    events,
    signal,
    waitForSubmission: () => submission.wait(BACKGROUND_CONTEXT),
    readMessages: () => readAdvisorMessages(harness, conversationId),
  })
}
