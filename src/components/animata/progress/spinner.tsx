import { cn } from "@/lib/utils"

interface SpinnerProps {
  className?: string
  outerSize?: string
  childSize?: string
}

const Spinner = ({ className, outerSize, childSize }: SpinnerProps) => (
  <div
    className={cn(
      "grid size-8 shrink-0 animate-spin place-items-center rounded-full bg-linear-to-bl from-primary to-primary/35 p-0.5",
      className,
      outerSize,
    )}
  >
    <div className={cn("size-6 rounded-full bg-background", childSize)} />
  </div>
)

export default Spinner
