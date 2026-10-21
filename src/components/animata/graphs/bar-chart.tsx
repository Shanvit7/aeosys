"use client"

import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"

// Adapted from Animata's Bar Chart by harimanok_: https://animata.design/docs/graphs/bar-chart
// CSS handles entrance motion; no measurement observer or animation timer needed.
const BarChart = ({
  items,
  selectedId,
  onSelect,
}: {
  items: { id: string; label: string; value: number; className: string }[]
  selectedId?: string
  onSelect: (id: string) => void
}) => {
  const maximum = Math.max(1, ...items.map((item) => item.value))

  return (
    <ul className="flex gap-2">
      {items.map((item) => (
        <li key={item.id} className="min-w-0 flex-1">
          <button
            type="button"
            disabled={item.value === 0}
            aria-pressed={selectedId === item.id}
            aria-controls="audit-findings"
            aria-label={`${item.label}: ${item.value} ${item.value === 1 ? "finding" : "findings"}`}
            onClick={() => onSelect(item.id)}
            className="group/bar flex w-full flex-col gap-3 rounded-lg px-1 py-2 transition-colors hover:bg-accent/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-default disabled:hover:bg-transparent aria-pressed:bg-accent motion-reduce:transition-none"
          >
            <span
              aria-hidden="true"
              className="flex h-36 w-full items-end justify-center border-b border-border/60 pt-7"
            >
              <span
                className="relative flex h-(--bar-height) w-full max-w-12 justify-center"
                style={{ "--bar-height": `${(item.value / maximum) * 100}%` } as CSSProperties}
              >
                <span
                  className={cn(
                    "absolute -top-6 text-sm font-semibold tabular-nums",
                    item.value === 0 && "text-muted-foreground",
                  )}
                >
                  {item.value}
                </span>
                <span
                  className={cn(
                    "block size-full origin-bottom rounded-t-md motion-safe:animate-audit-bar-in group-hover/bar:brightness-110",
                    item.className,
                    selectedId && selectedId !== item.id && "opacity-35",
                  )}
                />
              </span>
            </span>
            <span
              className={cn(
                "min-h-8 text-xs leading-4 text-balance",
                item.value === 0 && "text-muted-foreground",
              )}
            >
              {item.label}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export default BarChart
