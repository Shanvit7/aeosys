import { ArrowUp, Check, Copy, ExternalLink, X } from "lucide-react"
import { type SubmitEvent, useState } from "react"
import ReactMarkdown from "react-markdown"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { InputGroup, InputGroupAddon, InputGroupButton } from "@/components/ui/input-group"
import { Message, MessageContent, MessageHeader } from "@/components/ui/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"
import { Trace, TraceLine, TraceTitle } from "@/components/ui/trace"
import { useAdvisorChat } from "@/hooks/use-audits"
import { type AdvisorMessage, type AuditFinding, advisorPromptFor } from "@/schemas/audit.schema"
import { categoryLabel, severityColor, severityLabel } from "./utils"

const AdvisorConversation = ({
  messages,
  streamed,
  isPending,
}: {
  messages: AdvisorMessage[]
  streamed: string
  isPending: boolean
}) => (
  <MessageScrollerProvider autoScroll defaultScrollPosition="start">
    <MessageScroller className="h-[min(24rem,50dvh)] w-full">
      <MessageScrollerViewport aria-label="Advisor conversation">
        <MessageScrollerContent className="gap-5 px-1 pb-12" aria-live="polite">
          {messages.map((item) => (
            <MessageScrollerItem
              key={`${item.role}:${item.content}`}
              scrollAnchor={item.role === "user"}
            >
              <Message align={item.role === "user" ? "end" : "start"}>
                <MessageContent>
                  <MessageHeader>{item.role === "user" ? "You" : "Advisor"}</MessageHeader>
                  <Bubble
                    variant={item.role === "user" ? "secondary" : "ghost"}
                    align={item.role === "user" ? "end" : "start"}
                    className={item.role === "assistant" ? "w-full" : undefined}
                  >
                    <BubbleContent className={item.role === "assistant" ? "w-full" : undefined}>
                      {item.role === "assistant" ? (
                        <div className="typeset min-w-0 wrap-break-word [&_pre]:max-w-full">
                          <ReactMarkdown>{item.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{item.content}</p>
                      )}
                    </BubbleContent>
                  </Bubble>
                </MessageContent>
              </Message>
            </MessageScrollerItem>
          ))}
          {isPending && !streamed && (
            <MessageScrollerItem>
              <Trace role="status">
                <TraceLine status="running">
                  <TraceTitle>Reviewing the suggested fix…</TraceTitle>
                </TraceLine>
              </Trace>
            </MessageScrollerItem>
          )}
          {isPending && streamed && (
            <MessageScrollerItem scrollAnchor>
              <Message align="start">
                <MessageContent>
                  <MessageHeader>Advisor</MessageHeader>
                  <Bubble variant="ghost" align="start" className="w-full">
                    <BubbleContent className="w-full">
                      <div className="typeset min-w-0 wrap-break-word [&_pre]:max-w-full">
                        <ReactMarkdown>{streamed}</ReactMarkdown>
                      </div>
                    </BubbleContent>
                  </Bubble>
                </MessageContent>
              </Message>
            </MessageScrollerItem>
          )}
        </MessageScrollerContent>
      </MessageScrollerViewport>
      <MessageScrollerButton aria-label="Jump to latest reply" />
    </MessageScroller>
  </MessageScrollerProvider>
)

const AdvisorPromptForm = ({
  prompt,
  disabled,
  onSubmit,
}: {
  prompt: string
  disabled: boolean
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void
}) => (
  <form onSubmit={onSubmit}>
    <InputGroup aria-label="Prepared question">
      <p id="advisor-message" className="w-full px-4 pt-4 pb-1 text-sm leading-6">
        {prompt}
      </p>
      <InputGroupAddon align="block-end">
        <InputGroupButton
          type="submit"
          variant="outline"
          size="icon-sm"
          className="ml-auto size-11 rounded-full"
          aria-label="Send question"
          disabled={disabled}
        >
          <ArrowUp aria-hidden="true" />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  </form>
)

export const AdvisorChat = ({ auditId, finding }: { auditId: string; finding: AuditFinding }) => {
  const { query, send, streamed } = useAdvisorChat(auditId, finding.id)
  const prompt = advisorPromptFor(finding)
  const messages = query.data?.messages ?? []
  const promptUsed = query.data?.promptUsed ?? false
  const visibleMessages =
    send.isPending && !messages.length ? [{ role: "user" as const, content: prompt }] : messages
  const hasConversation = promptUsed || send.isPending || messages.length > 0
  const error = send.error ?? query.error
  const submitMessage = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!query.isSuccess || promptUsed || send.isPending) return
    send.mutate({ auditId, findingId: finding.id })
  }

  return (
    <section
      aria-label="Finding advisor chat"
      aria-busy={send.isPending}
      className="flex w-full min-h-0 min-w-0 flex-col gap-4"
    >
      {hasConversation && (
        <AdvisorConversation
          messages={visibleMessages}
          streamed={streamed}
          isPending={send.isPending}
        />
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}
      {!promptUsed && !send.isPending && (
        <AdvisorPromptForm prompt={prompt} disabled={!query.isSuccess} onSubmit={submitMessage} />
      )}
      {query.isPending && (
        <p role="status" className="text-xs text-muted-foreground">
          Loading conversation…
        </p>
      )}
    </section>
  )
}

export const FindingDetails = ({
  finding,
  auditId,
  onClose,
}: {
  finding: AuditFinding | null
  auditId: string
  onClose: () => void
}) => {
  const [copiedProposalId, setCopiedProposalId] = useState<string | null>(null)
  const proposal = finding?.proposedFix
  const observedValue = finding?.evidence.observedValue?.trim()
  const copied = copiedProposalId === proposal?.id
  const copyDraft = async () => {
    if (!proposal) return
    try {
      await navigator.clipboard.writeText(proposal.after)
      setCopiedProposalId(proposal.id)
      window.setTimeout(() => {
        setCopiedProposalId((current) => (current === proposal.id ? null : current))
      }, 1800)
    } catch {
      setCopiedProposalId(null)
    }
  }

  return (
    <Drawer
      open={Boolean(finding)}
      onOpenChange={(open) => !open && onClose()}
      swipeDirection="right"
    >
      <DrawerContent className="overflow-x-hidden *:min-w-0 data-[swipe-axis=x]:w-[calc(100%-var(--drawer-inset,0px)*2)] data-[swipe-axis=x]:sm:w-[min(36rem,calc(100vw-1rem))]">
        <DrawerClose
          render={
            <Button
              variant="ghost"
              className="absolute top-3 right-3"
              size="icon-lg"
              aria-label="Close details"
            />
          }
        >
          <X aria-hidden="true" />
          <span className="sr-only">Close</span>
        </DrawerClose>
        {finding && (
          <>
            <DrawerHeader className="min-w-0 gap-2 p-5 pr-14 sm:p-6 sm:pr-14">
              <Badge variant="outline" className={`mb-2 w-fit ${severityColor(finding.severity)}`}>
                {categoryLabel(finding.category)} · {severityLabel(finding.severity)}
              </Badge>
              <DrawerTitle className="text-lg font-semibold tracking-tight wrap-break-word">
                {finding.title}
              </DrawerTitle>
              <DrawerDescription className="leading-6 wrap-break-word">
                {finding.recommendation}
              </DrawerDescription>
            </DrawerHeader>
            <div className="min-h-0 w-full min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 pb-6 sm:px-6 sm:pb-8">
              <div className="mb-6">
                <AdvisorChat key={`${auditId}:${finding.id}`} auditId={auditId} finding={finding} />
              </div>
              <div className="grid min-w-0 gap-6">
                <section className="grid gap-2.5">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    What we saw
                  </h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {finding.evidence.description}
                  </p>
                  {observedValue && observedValue !== "null" && observedValue !== "undefined" && (
                    <pre className="max-w-full overflow-x-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-3 font-mono text-xs leading-5 wrap-break-word">
                      {observedValue}
                    </pre>
                  )}
                  <a
                    className="inline-flex min-h-11 items-center gap-2 break-all text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                    href={finding.evidence.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {finding.evidence.sourceUrl}
                    <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
                  </a>
                </section>
                {proposal ? (
                  <section className="grid gap-4 border-t border-border/60 pt-5">
                    <h3 className="text-sm font-medium">Suggested fix</h3>
                    {proposal.before && (
                      <div className="grid gap-2">
                        <span className="text-xs text-muted-foreground">On your page</span>
                        <pre className="max-h-40 max-w-full overflow-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-3 font-mono text-xs leading-5 wrap-break-word">
                          {proposal.before}
                        </pre>
                      </div>
                    )}
                    <div className="grid gap-2">
                      <span className="text-xs text-muted-foreground">Suggested version</span>
                      <pre className="max-h-64 max-w-full overflow-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-3 font-mono text-xs leading-5 wrap-break-word">
                        {proposal.after}
                      </pre>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={copyDraft}>
                        {copied ? (
                          <Check data-icon="inline-start" />
                        ) : (
                          <Copy data-icon="inline-start" />
                        )}
                        {copied ? "Copied" : "Copy suggestion"}
                      </Button>
                    </div>
                  </section>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No suggested change for this item yet.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  )
}
