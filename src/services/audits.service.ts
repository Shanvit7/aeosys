import { mutationOptions, queryOptions } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import {
  type AdvisorMessage,
  type AuditResult,
  advisorChatResponseSchema,
  auditResultSchema,
  type CreateAudit,
} from "@/schemas/audit.schema"
import { TAGS } from "@/services/tags"

const isInProgress = (audit: AuditResult | undefined) =>
  audit?.status === "queued" || audit?.status === "running"

const readAudit = async (auditId: string, signal?: AbortSignal) =>
  auditResultSchema.parse(await apiClient.get(`/api/audits/${auditId}`, signal))

export const auditsService = {
  detailQueryOptions: (auditId: string) =>
    queryOptions({
      queryKey: TAGS.audits.detail(auditId),
      queryFn: ({ signal }) => readAudit(auditId, signal),
      enabled: Boolean(auditId),
      refetchInterval: (query) => (isInProgress(query.state.data) ? 1_000 : false),
    }),

  createMutationOptions: () =>
    mutationOptions({
      mutationKey: [...TAGS.audits.all, "create"],
      mutationFn: async (payload: CreateAudit) =>
        auditResultSchema.parse(await apiClient.post("/api/audits", payload)),
    }),

  advisorQueryOptions: (auditId: string, findingId: string) =>
    queryOptions({
      queryKey: TAGS.audits.advisor(auditId, findingId),
      queryFn: async ({ signal }) =>
        advisorChatResponseSchema.parse(
          await apiClient.get(`/api/audits/${auditId}/findings/${findingId}/advisor`, signal),
        ),
      enabled: Boolean(auditId && findingId),
    }),

  advisorMutationOptions: (onDelta: (text: string) => void) =>
    mutationOptions({
      mutationKey: [...TAGS.audits.all, "advisor"],
      mutationFn: ({ auditId, findingId }: AdvisorChatRequest) =>
        streamAdvisorReply({ auditId, findingId }, onDelta),
    }),
}

const streamAdvisorReply = async (
  { auditId, findingId }: AdvisorChatRequest,
  onDelta: (text: string) => void,
) => {
  const response = await fetch(`/api/audits/${auditId}/findings/${findingId}/advisor`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  })
  if (!response.ok || !response.body) throw new Error("Advisor could not reply. Please try again.")

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ""
  let chat: AdvisorChat | undefined
  for (;;) {
    const chunk = await reader.read()
    if (chunk.done) break
    buffer += chunk.value
    const frames = buffer.split("\n\n")
    buffer = frames.pop() ?? ""
    for (const frame of frames) {
      const event = frame.match(/^event: (.+)$/m)?.[1]
      const data = JSON.parse(frame.match(/^data: (.+)$/m)?.[1] ?? "null")
      if (event === "delta") onDelta(data.text)
      else if (event === "done") chat = advisorChatResponseSchema.parse(data)
      else if (event === "error") throw new Error(data.message)
    }
  }
  if (!chat) throw new Error("Advisor could not reply. Please try again.")
  return chat
}

export type AdvisorChatRequest = {
  auditId: string
  findingId: string
}

type AdvisorChat = { messages: AdvisorMessage[] }
