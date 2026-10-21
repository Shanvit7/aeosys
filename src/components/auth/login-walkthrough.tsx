"use client"

/* oxlint-disable shadcn/no-inline-styles -- Remotion needs frame-driven values for seekable animation. */

import { Player } from "@remotion/player"
import { ArrowRight, Check, CheckCheck, Globe, ScanSearch, Search, Sparkles } from "lucide-react"
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import { cn } from "@/lib/utils"

const steps = [
  { title: "Start with a URL", description: "Single page. A clearer picture." },
  { title: "Find what matters", description: "Source-linked findings, ranked by severity." },
  { title: "Make your next move", description: "Review suggested edits. You stay in control." },
]

const Walkthrough = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const step = Math.min(2, Math.floor(frame / (6 * fps)))
  const localFrame = frame - step * 6 * fps
  const progress = interpolate(localFrame, [fps, 4 * fps], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  return (
    <div className="relative flex size-full flex-col overflow-hidden bg-background p-7 text-foreground">
      <div className="flex items-center justify-between border-b border-border/70 pb-5">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="size-2 rounded-full bg-primary" />
          Aeosys <span className="ml-2 text-muted-foreground">/ How it works</span>
        </div>
        <span className="font-mono text-xs text-muted-foreground">DEMO · 0{step + 1} / 03</span>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-5">
        <div
          key={step}
          className="flex flex-col gap-5"
          style={{
            opacity: interpolate(localFrame, [0, 0.5 * fps], [0, 1], {
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            }),
            translate: `0 ${interpolate(localFrame, [0, 0.6 * fps], [12, 0], {
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            })}px`,
          }}
        >
          {step === 0 ? (
            <>
              <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-card p-4">
                <Globe className="size-5 text-primary" />
                <span className="flex-1 font-mono text-lg">
                  {"https://yourwebsite.com".slice(0, Math.floor(progress * 23))}
                  <span className="text-primary">│</span>
                </span>
                <div className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                  Audit page <ArrowRight className="size-4" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex h-40 flex-col justify-center gap-3 rounded-xl border border-border/60 bg-card p-5">
                  <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Globe className="size-4" /> Your page
                  </div>
                  <div className="h-3 w-3/4 rounded bg-foreground/20" />
                  <div className="h-2 w-full rounded bg-foreground/10" />
                  <div className="h-2 w-5/6 rounded bg-foreground/10" />
                  <div className="mt-1 h-6 w-20 rounded bg-primary/20" />
                </div>
                <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-primary/20 bg-primary/5">
                  <ScanSearch className="size-9 text-primary" strokeWidth={1.4} />
                  <span className="text-sm text-muted-foreground">SEO + AI readiness</span>
                  <div className="h-1 w-28 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full origin-left bg-primary"
                      style={{ scale: `${progress} 1` }}
                    />
                  </div>
                </div>
              </div>
            </>
          ) : step === 1 ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-lg font-medium">
                  <Search className="size-5 text-primary" /> Page review
                </div>
                <span className="flex items-center gap-1.5 text-sm text-success">
                  <CheckCheck className="size-4" /> Review complete
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { label: "Missing page description", tag: "High", color: "text-destructive" },
                  {
                    label: "Make your answer easier to find",
                    tag: "Medium",
                    color: "text-warning",
                  },
                  { label: "Add context with structured data", tag: "Low", color: "text-primary" },
                ].map((finding, index) => (
                  <div
                    key={finding.label}
                    className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3.5"
                    style={{
                      opacity: interpolate(
                        localFrame,
                        [(0.5 + index * 0.4) * fps, (1 + index * 0.4) * fps],
                        [0, 1],
                        {
                          extrapolateLeft: "clamp",
                          extrapolateRight: "clamp",
                        },
                      ),
                    }}
                  >
                    <span className={cn("w-16 text-xs font-medium", finding.color)}>
                      {finding.tag}
                    </span>
                    <span className="flex-1 text-base">{finding.label}</span>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-lg font-medium">
                <Sparkles className="size-5 text-primary" /> Suggested improvement
              </div>
              <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
                <div className="border-b border-border/60 px-5 py-3 text-sm text-muted-foreground">
                  Page description{" "}
                  <span className="float-right font-mono text-xs">PROPOSED EDIT</span>
                </div>
                <div className="flex flex-col gap-3 p-5">
                  <span className="font-mono text-sm text-destructive">− No description found</span>
                  <p className="font-mono text-sm leading-6 text-success">
                    + Discover what we do, who we help, and how to get started. Find the right
                    solution for your next step.
                  </p>
                </div>
              </div>
              <div
                className="flex items-center gap-2 text-sm text-primary"
                style={{ opacity: progress }}
              >
                <Check className="size-4" /> Review it. Copy it. Publish on your terms.
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mb-14 flex items-center justify-between gap-4 border-t border-border/70 pt-5">
        <div>
          <p className="text-xl font-medium tracking-tight">{steps[step].title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{steps[step].description}</p>
        </div>
        <div className="flex gap-1.5">
          {steps.map((item, index) => (
            <span
              key={item.title}
              className={cn(
                "h-1 rounded-full",
                index === step ? "w-7 bg-primary" : "w-2 bg-muted-foreground/30",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

const LoginWalkthrough = () => {
  const reducedMotion = usePrefersReducedMotion()

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 shadow-2xl">
      <Player
        key={String(reducedMotion)}
        component={Walkthrough}
        durationInFrames={540}
        compositionWidth={720}
        compositionHeight={480}
        fps={30}
        className="aspect-3/2 h-auto! w-full!"
        autoPlay={!reducedMotion}
        initialFrame={reducedMotion ? 150 : 0}
        loop
        initiallyMuted
        controls
        alwaysShowControls
        showVolumeControls={false}
        allowFullscreen={false}
        aria-label="How Aeosys works: enter a URL, inspect findings, and review suggested edits"
      />
    </div>
  )
}

export default LoginWalkthrough
