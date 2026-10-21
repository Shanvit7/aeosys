import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context"
import {
  AssistantEntry,
  type ConversationId,
  configure,
  type Harness,
  UserEntry,
} from "@earendil-works/pi-durable"
import { AuditNotFoundError, ProposalNotFoundError } from "@/lib/server/audits/errors"
import { AuditsDoc, auditAgentExtension, getAudit } from "@/lib/server/audits/service"
import type { AdvisorMessage, AuditFinding } from "@/schemas/audit.schema"
import { buildAdvisorInstructions } from "./prompt"

export const advisorThreadKey = (auditId: string, findingId: string) => `${auditId}:${findingId}`

export const getAdvisorFinding = async (auditId: string, findingId: string) => {
  const audit = await getAudit(auditId)
  const finding = audit.findings.find((item) => item.id === findingId)
  if (!finding) throw new AuditNotFoundError("Finding not found")
  const proposal = finding.proposedFix
  if (!proposal) throw new ProposalNotFoundError("Finding has no suggested fix")
  return { audit, finding, proposal }
}

export const readAdvisorMessages = async (harness: Harness, conversationId: ConversationId) => {
  const conversation = await harness.conversation(conversationId, BACKGROUND_CONTEXT)
  if (!conversation) return []
  const transcript = await conversation.context(BACKGROUND_CONTEXT)
  return transcript.entries.flatMap((entry): AdvisorMessage[] => {
    const role = UserEntry.is(entry) ? "user" : AssistantEntry.is(entry) ? "assistant" : undefined
    if (!role) return []
    const content =
      entry.model
        ?.flatMap((message) => {
          if (message.role !== role) return []
          return typeof message.content === "string"
            ? [message.content]
            : message.content.flatMap((block) => (block.type === "text" ? [block.text] : []))
        })
        .join("") ?? ""
    return content ? [{ role, content: content.slice(0, 8_000) }] : []
  })
}

export const ensureAdvisorConversation = async (
  harness: Harness,
  rootId: Awaited<ReturnType<typeof import("@/lib/server/audits/service").runtime>>["rootId"],
  {
    key,
    audit,
    finding,
    proposal,
  }: {
    key: string
    audit: Awaited<ReturnType<typeof getAudit>>
    finding: AuditFinding
    proposal: NonNullable<AuditFinding["proposedFix"]>
  },
) => {
  const claim = await harness.commit(async (tx) => {
    const store = await tx.doc(AuditsDoc, rootId)
    const existing = store.advisorThreads[key]
    if (existing) return { conversationId: existing }

    const conversation = await tx.createConversation({ ownership: { kind: "ownerless" } })
    await configure(tx, conversation.id, {
      model: {
        provider: "google",
        modelId: process.env.AEOSYS_GEMINI_MODEL || "gemini-flash-lite-latest",
      },
      thinkingLevel: "low",
      extensions: { remove: [auditAgentExtension] },
      instructions: buildAdvisorInstructions({ audit, finding, proposal }),
    })
    store.advisorThreads[key] = conversation.id
    return { conversationId: conversation.id }
  }, BACKGROUND_CONTEXT)

  return claim.conversationId
}
