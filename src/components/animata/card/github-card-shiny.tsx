import { type ReactNode, useCallback, useRef } from "react"
import { useMousePosition } from "@/hooks/use-mouse-position"
import { cn } from "@/lib/utils"

type GithubCardShinyProps = {
  children: ReactNode
  className?: string
}

const GithubCardShiny = ({ children, className }: GithubCardShinyProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const update = useCallback(({ x, y }: { x: number; y: number }) => {
    const overlay = overlayRef.current
    if (!overlay) return

    const { width, height } = overlay.getBoundingClientRect()
    overlay.style.setProperty("--x", `${x - width / 2}px`)
    overlay.style.setProperty("--y", `${y - height / 2}px`)
  }, [])

  useMousePosition(containerRef, update)

  return (
    <div
      ref={containerRef}
      className={cn(
        "group/shiny relative w-full overflow-hidden rounded-3xl border border-border/50 bg-card p-5 text-card-foreground transition-colors duration-300 hover:border-primary/35 sm:p-6",
        className,
      )}
    >
      <div
        ref={overlayRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-0 size-64 rounded-full bg-primary/20 opacity-0 blur-3xl transition-opacity duration-300 group-hover/shiny:opacity-70"
        style={{ transform: "translate(var(--x, 0px), var(--y, 0px))" }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

export default GithubCardShiny
