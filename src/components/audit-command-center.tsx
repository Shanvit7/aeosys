"use client"

import { ArrowRight, ArrowUpRight, CircleAlert, LoaderCircle } from "lucide-react"
import dynamic from "next/dynamic"
import { type SubmitEvent, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import type { FindingFilter } from "@/components/audit-command-center/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAudit, useCreateAudit } from "@/hooks/use-audits"
import { auditedPageUrls } from "@/lib/audits/coverage"
import { cn } from "@/lib/utils"
import type { AuditFinding, AuditResult } from "@/schemas/audit.schema"
import Spinner from "./animata/progress/spinner"
import TextFlip from "./animata/text/text-flip"
import { AuditHeader } from "./audit-command-center/audit-header"
import { AuditEmptyState } from "./audit-command-center/empty-state"
import { FindingDetails } from "./audit-command-center/finding-details"
import { Findings } from "./audit-command-center/findings"
import { SeveritySummary } from "./audit-command-center/severity-summary"

const AuditMetrics = dynamic(
  () => import("./audit-command-center/audit-metrics").then((module) => module.AuditMetrics),
  {
    loading: () => (
      <p role="status" className="py-8 text-sm text-muted-foreground">
        Loading audit charts…
      </p>
    ),
  },
)

const ReviewForm = ({
  url,
  isBusy,
  isLoading,
  isError,
  onUrlChange,
  onSubmit,
}: {
  url: string
  isBusy: boolean
  isLoading: boolean
  isError: boolean
  onUrlChange: (value: string) => void
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void
}) => (
  <div className="min-w-0">
    <form
      onSubmit={onSubmit}
      className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
    >
      <label
        htmlFor="audit-url"
        className="text-sm font-medium text-muted-foreground sm:col-span-2"
      >
        Enter a page URL
      </label>
      <Input
        id="audit-url"
        type="url"
        inputMode="url"
        autoComplete="url"
        placeholder="https://example.com"
        required
        maxLength={2048}
        value={url}
        onChange={(event) => onUrlChange(event.target.value)}
        className="min-w-0"
        disabled={isBusy}
      />
      <Button
        type="submit"
        disabled={isBusy}
        className={cn(
          "group/cta h-12 gap-3 rounded-xl px-4 transition-colors duration-200",
          isBusy && "cursor-wait",
        )}
      >
        <span>Review page</span>
        <span className="relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-foreground/15 transition-colors duration-200 group-hover/cta:bg-primary-foreground">
          {isLoading ? (
            <LoaderCircle
              aria-hidden="true"
              className="size-4 animate-spin text-primary-foreground"
            />
          ) : (
            <span className="absolute left-0 flex h-7 w-14 -translate-x-1/2 items-center justify-center transition-transform duration-200 ease-in-out group-hover/cta:translate-x-0">
              <ArrowRight
                aria-hidden="true"
                className="size-7 p-1 text-primary opacity-0 transition-opacity duration-200 group-hover/cta:opacity-100"
              />
              <ArrowRight
                aria-hidden="true"
                className="size-7 p-1 text-primary-foreground opacity-100 transition-opacity duration-300 group-hover/cta:opacity-0"
              />
            </span>
          )}
        </span>
      </Button>
    </form>
    {isError && (
      <Alert variant="destructive" className="mt-4 animate-in fade-in duration-300">
        <CircleAlert aria-hidden="true" />
        <AlertTitle>We couldn’t fetch this page</AlertTitle>
        <AlertDescription>
          We couldn’t reach that page. Check the URL and try again.
        </AlertDescription>
      </Alert>
    )}
  </div>
)

const AuditRunning = ({ url }: { url: string }) => (
  <div
    role="status"
    aria-live="polite"
    aria-busy="true"
    className="flex w-full max-w-md animate-in fade-in slide-in-from-bottom-1 flex-col items-center gap-4 px-4 py-8 text-center duration-300"
  >
    <span
      aria-hidden="true"
      className="grid size-24 shrink-0 place-items-center rounded-full bg-primary/10"
    >
      <Spinner className="m-0" outerSize="size-10" childSize="size-7" />
    </span>
    <div className="min-w-0">
      <p className="text-sm font-medium">Reviewing this page…</p>
      <p className="break-all text-sm text-muted-foreground">{url}</p>
    </div>
  </div>
)

const AuditReport = ({
  audit,
  filter,
  onFilterChange,
  onSelect,
}: {
  audit: AuditResult
  filter: FindingFilter | null
  onFilterChange: (filter: FindingFilter | null) => void
  onSelect: (finding: AuditFinding) => void
}) => {
  if (audit.status === "failed") return null

  return (
    <>
      <SeveritySummary audit={audit} />
      <AuditMetrics audit={audit} filter={filter} onFilterChange={onFilterChange} />
      {audit.mode === "demo" && (
        <Alert role="status">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>Preview report</AlertTitle>
          <AlertDescription>This is an example, not a check of your live page.</AlertDescription>
        </Alert>
      )}
      <Findings audit={audit} filter={filter} onSelect={onSelect} />
    </>
  )
}

const AuditCommandCenter = () => {
  const [url, setUrl] = useState("")
  const [activeAuditId, setActiveAuditId] = useState("")
  const [selectedFinding, setSelectedFinding] = useState<AuditFinding | null>(null)
  const [findingFilter, setFindingFilter] = useState<FindingFilter | null>(null)
  const createAudit = useCreateAudit()
  const auditQuery = useAudit(activeAuditId)
  const audit = auditQuery.data
  const notifiedAuditId = useRef<string | null>(null)
  useEffect(() => {
    if (
      !audit ||
      audit.status === "queued" ||
      audit.status === "running" ||
      notifiedAuditId.current === audit.auditId
    ) {
      return
    }
    notifiedAuditId.current = audit.auditId
    const pages = auditedPageUrls(audit.coverage?.inspectedUrls ?? [])
    const title =
      audit.status === "failed"
        ? "Page review failed"
        : audit.status === "partial"
          ? "Page review is incomplete"
          : "Page review complete"
    const description = (
      <div className="grid min-w-0 gap-2">
        {pages.map((pageUrl) => {
          const parsedUrl = new URL(pageUrl)
          const pageLabel = `${parsedUrl.host}${parsedUrl.pathname === "/" ? "" : parsedUrl.pathname}`

          return (
            <a
              key={pageUrl}
              href={pageUrl}
              target="_blank"
              rel="noreferrer"
              title={pageUrl}
              aria-label={`Open reviewed page: ${pageUrl}`}
              className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-md border border-border/70 bg-muted/40 px-2 py-1 text-xs text-muted-foreground no-underline transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="truncate">{pageLabel}</span>
              <ArrowUpRight aria-hidden="true" className="size-3 shrink-0" />
            </a>
          )
        })}
        {audit.error && <span className="text-xs">{audit.error.message}</span>}
      </div>
    )
    const options = { description, duration: 5_000 }
    if (audit.status === "failed") toast.error(title, options)
    else if (audit.status === "partial") toast.warning(title, options)
    else toast.success(title, options)
  }, [audit])
  const isActive = audit?.status === "queued" || audit?.status === "running"
  const isLoading = createAudit.isPending || (Boolean(activeAuditId) && auditQuery.isPending)
  const isBusy = isLoading || isActive
  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    createAudit.mutate(
      { url },
      {
        onSuccess: (result) => {
          setActiveAuditId(result.auditId)
          setFindingFilter(null)
        },
      },
    )
  }

  return (
    <div className="relative isolate flex min-h-dvh w-full min-w-0 flex-col bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,oklch(72%_0.165_48/0.12),transparent_55%)]"
      />
      <AuditHeader />
      <main className="mx-auto flex w-full min-w-0 max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:gap-7 sm:px-8 sm:py-9">
        <section className="grid shrink-0 animate-in fade-in slide-in-from-bottom-2 gap-5 border-b border-border/50 pb-6 duration-500 sm:gap-6 sm:pb-7 lg:grid-cols-[minmax(0,0.95fr)_minmax(25rem,1.05fr)] lg:items-end">
          <div className="max-w-xl">
            <h1 className="text-[1.75rem] leading-tight font-semibold tracking-[-0.035em] text-balance sm:text-4xl">
              <span className="block">Improve this page’s</span>
              <TextFlip />
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
              Get a focused SEO and answer-readiness review of one submitted page.
            </p>
          </div>
          <ReviewForm
            url={url}
            isBusy={isBusy}
            isLoading={isLoading}
            isError={createAudit.isError}
            onUrlChange={setUrl}
            onSubmit={onSubmit}
          />
        </section>

        {(!audit || isBusy) && (
          <div className="grid min-h-[clamp(30rem,62dvh,44rem)] flex-1 place-items-center overflow-hidden">
            {isBusy ? (
              <AuditRunning url={createAudit.isPending ? url : (audit?.url ?? url)} />
            ) : (
              <AuditEmptyState />
            )}
          </div>
        )}

        {auditQuery.isError && (
          <Alert variant="destructive">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>We couldn’t open your results</AlertTitle>
            <AlertDescription>Try again with another page URL.</AlertDescription>
          </Alert>
        )}

        {audit && !isBusy && (
          <AuditReport
            audit={audit}
            filter={findingFilter}
            onFilterChange={setFindingFilter}
            onSelect={setSelectedFinding}
          />
        )}
      </main>
      <FindingDetails
        finding={selectedFinding}
        auditId={audit?.auditId ?? ""}
        onClose={() => setSelectedFinding(null)}
      />
    </div>
  )
}

export { AuditCommandCenter }
