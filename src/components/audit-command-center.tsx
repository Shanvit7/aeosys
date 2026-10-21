"use client"

import { ArrowRight, CircleAlert, LoaderCircle } from "lucide-react"
import dynamic from "next/dynamic"
import { type FormEvent, useState } from "react"
import type { FindingFilter } from "@/components/audit-command-center/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAudit, useCreateAudit } from "@/hooks/use-audits"
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
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) => (
  <div className="min-w-0">
    <form
      onSubmit={onSubmit}
      className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
    >
      <label
        htmlFor="audit-url"
        className="text-xs font-medium text-muted-foreground sm:col-span-2"
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
    className="flex animate-in fade-in slide-in-from-bottom-1 items-center gap-3 py-2 duration-300"
  >
    <span aria-hidden="true">
      <Spinner className="m-0" outerSize="size-6" childSize="size-4" />
    </span>
    <div className="min-w-0">
      <p className="text-sm font-medium">AI is reviewing this page…</p>
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
  if (audit.status === "failed") {
    return (
      <Alert variant="destructive">
        <CircleAlert aria-hidden="true" />
        <AlertTitle>We couldn’t finish reviewing this page</AlertTitle>
        <AlertDescription>
          Check that the page opens in your browser, then try again.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      {audit.status === "partial" && (
        <Alert
          role="status"
          className="border-warning/50 bg-warning/10 text-foreground [&>svg]:text-warning"
        >
          <CircleAlert aria-hidden="true" />
          <AlertTitle>Page review is incomplete</AlertTitle>
          <AlertDescription>
            {audit.coverage?.limitations[0] ??
              "AI review failed; findings come from automated checks of the page’s HTML only."}
          </AlertDescription>
        </Alert>
      )}
      <SeveritySummary audit={audit} />
      <AuditMetrics audit={audit} filter={filter} onFilterChange={onFilterChange} />
      {audit.mode === "demo" && (
        <Alert role="status">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>Preview report</AlertTitle>
          <AlertDescription>This is an example, not a check of your live website.</AlertDescription>
        </Alert>
      )}
      <Findings
        audit={audit}
        filter={filter}
        onClearFilter={() => onFilterChange(null)}
        onSelect={onSelect}
      />
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
  const isActive = audit?.status === "queued" || audit?.status === "running"
  const isLoading = createAudit.isPending || (Boolean(activeAuditId) && auditQuery.isPending)
  const isBusy = isLoading || isActive
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
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
    <div className="min-h-dvh bg-background">
      <AuditHeader />
      <main className="mx-auto grid w-full max-w-6xl gap-7 px-4 py-8 sm:px-8 sm:py-10">
        <section className="grid animate-in fade-in slide-in-from-bottom-2 gap-6 border-b border-border/50 pb-7 duration-500 lg:grid-cols-[minmax(0,0.95fr)_minmax(25rem,1.05fr)] lg:items-end">
          <div className="max-w-xl">
            <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              <span className="block">Improve this page’s</span>
              <TextFlip />
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
              Get a focused SEO and answer-readiness review of a single page.
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

        {!audit && !createAudit.isPending && <AuditEmptyState />}

        {isActive && audit && <AuditRunning url={audit.url} />}

        {auditQuery.isError && (
          <Alert variant="destructive">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>We couldn’t open your results</AlertTitle>
            <AlertDescription>Try again with another page URL.</AlertDescription>
          </Alert>
        )}

        {audit && !isActive && (
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
