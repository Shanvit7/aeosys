import { cn } from "cn"
import type { ComponentProps } from "react"

const FieldGroup = ({ className, ...props }: ComponentProps<"div">) => (
  <div data-slot="field-group" className={cn("flex flex-col gap-5", className)} {...props} />
)

const Field = ({ className, ...props }: ComponentProps<"div">) => (
  <div
    data-slot="field"
    className={cn("flex flex-col gap-2 data-[invalid=true]:text-destructive", className)}
    {...props}
  />
)

const FieldLabel = ({ className, ...props }: ComponentProps<"label">) => (
  // biome-ignore lint/a11y/noLabelWithoutControl: Consumers provide htmlFor or a nested input.
  <label
    data-slot="field-label"
    className={cn("text-sm leading-snug font-medium", className)}
    {...props}
  />
)

export { Field, FieldGroup, FieldLabel }
