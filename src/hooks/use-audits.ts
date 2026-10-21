"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { type AdvisorChatRequest, auditsService } from "@/services/audits.service"
import { TAGS } from "@/services/tags"

export const useAudit = (auditId: string) => useQuery(auditsService.detailQueryOptions(auditId))

export const useCreateAudit = () => {
  const queryClient = useQueryClient()
  return useMutation({
    ...auditsService.createMutationOptions(),
    onSuccess: (audit) => queryClient.setQueryData(TAGS.audits.detail(audit.auditId), audit),
  })
}

export const useAdvisorChat = (auditId: string, findingId: string) => {
  const queryClient = useQueryClient()
  const query = useQuery(auditsService.advisorQueryOptions(auditId, findingId))
  const [streamed, setStreamed] = useState("")
  const send = useMutation({
    ...auditsService.advisorMutationOptions((text) => setStreamed((current) => current + text)),
    onMutate: () => setStreamed(""),
    onSuccess: (chat, variables: AdvisorChatRequest) => {
      setStreamed("")
      queryClient.setQueryData(TAGS.audits.advisor(variables.auditId, variables.findingId), chat)
    },
    onError: (_error, variables: AdvisorChatRequest) => {
      setStreamed("")
      queryClient.invalidateQueries({
        queryKey: TAGS.audits.advisor(variables.auditId, variables.findingId),
      })
    },
  })
  return { query, send, streamed }
}
