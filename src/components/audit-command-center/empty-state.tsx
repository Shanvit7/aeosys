"use client"

import { ArrowRight, Copy, ListChecks, ScanSearch } from "lucide-react"
import { useState } from "react"
import CardStack from "@/components/animata/card/card-stack"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"

const auditStages = [
  {
    id: "inspect",
    title: "Start with one page.",
    description: "We review the submitted page for SEO and answer readiness.",
    Icon: ScanSearch,
  },
  {
    id: "explain",
    title: "See what stands out.",
    description: "Each finding links to the specific page checked and explains why it may matter.",
    Icon: ListChecks,
  },
  {
    id: "review",
    title: "You choose what changes.",
    description: "Review and copy suggested edits. Aeosys never publishes changes to your site.",
    Icon: Copy,
  },
]

export const AuditEmptyState = () => {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)

  return (
    <section aria-label="How Aeosys reviews a page" className="grid w-full place-items-center">
      <div className="w-full max-w-md px-4">
        <CardStack
          items={auditStages}
          depth={3}
          autoplay={!prefersReducedMotion && !hovered && !focused}
          autoplayInterval={5600}
        >
          <CardStack.Viewport
            swipeable
            className="h-116"
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse") setHovered(true)
            }}
            onPointerLeave={(event) => {
              if (event.pointerType === "mouse") setHovered(false)
            }}
            onFocusCapture={() => setFocused(true)}
            onBlurCapture={(event) => {
              if (
                !(event.relatedTarget instanceof Node) ||
                !event.currentTarget.contains(event.relatedTarget)
              ) {
                setFocused(false)
              }
            }}
          >
            <CardStack.List<(typeof auditStages)[number]>>
              {(stage, index, layer) => (
                <CardStack.Card
                  key={stage.id}
                  layer={layer}
                  stackIndex={index}
                  aria-hidden={index > 0}
                  inert={index > 0}
                  className="flex h-108 flex-col justify-between overflow-hidden rounded-[1.75rem] border border-border/70 bg-card p-5 shadow-2xl sm:p-7"
                >
                  <div className="flex shrink-0 items-center justify-between text-xs font-medium tracking-[0.14em] uppercase">
                    <span className="text-foreground">Aeosys</span>
                    <div className="flex gap-1.5" aria-hidden="true">
                      {auditStages.map((item) => (
                        <span
                          key={item.id}
                          className={`h-1 rounded-full transition-all ${item.id === stage.id ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/35"}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="grid justify-items-center gap-5 text-center">
                    <div className="relative grid size-32 place-items-center rounded-full bg-primary/10 sm:size-40">
                      <div
                        aria-hidden="true"
                        className="absolute inset-3 rounded-full border border-primary/15"
                      />
                      <div
                        aria-hidden="true"
                        className="absolute inset-7 rounded-full border border-primary/10"
                      />
                      <stage.Icon
                        aria-hidden="true"
                        className="size-14 text-primary sm:size-16"
                        strokeWidth={1.25}
                      />
                    </div>
                    <div className="grid max-w-sm gap-2">
                      <h2 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">
                        {stage.title}
                      </h2>
                      <p className="text-sm leading-5 text-muted-foreground">{stage.description}</p>
                    </div>
                  </div>

                  <div className="flex h-11 shrink-0 items-center justify-between">
                    <span className="text-xs text-muted-foreground sm:hidden">
                      Swipe or tap to continue
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                      <CardStack.Trigger
                        aria-label="Show next story card"
                        className="size-11 rounded-full border border-border/70 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                      >
                        <ArrowRight aria-hidden="true" className="size-4" />
                      </CardStack.Trigger>
                    </div>
                  </div>
                </CardStack.Card>
              )}
            </CardStack.List>
          </CardStack.Viewport>
        </CardStack>
      </div>
    </section>
  )
}
