"use client"

import { MessageScroller as MessageScrollerPrimitive } from "@shadcn/react/message-scroller"
import { cn } from "cn"
import { ArrowDown } from "lucide-react"
import type * as React from "react"
import { Button } from "@/components/ui/button"

export const MessageScrollerProvider = (
  props: React.ComponentProps<typeof MessageScrollerPrimitive.Provider>,
) => <MessageScrollerPrimitive.Provider {...props} />

export const MessageScroller = ({
  className,
  ...props
}: React.ComponentProps<typeof MessageScrollerPrimitive.Root>) => (
  <MessageScrollerPrimitive.Root
    data-slot="message-scroller"
    className={cn(
      "group/message-scroller relative flex size-full min-h-0 flex-col overflow-hidden",
      className,
    )}
    {...props}
  />
)

export const MessageScrollerViewport = ({
  className,
  ...props
}: React.ComponentProps<typeof MessageScrollerPrimitive.Viewport>) => (
  <MessageScrollerPrimitive.Viewport
    data-slot="message-scroller-viewport"
    className={cn("size-full min-h-0 min-w-0 overflow-y-auto overscroll-contain", className)}
    {...props}
  />
)

export const MessageScrollerContent = ({
  className,
  ...props
}: React.ComponentProps<typeof MessageScrollerPrimitive.Content>) => (
  <MessageScrollerPrimitive.Content
    data-slot="message-scroller-content"
    className={cn("flex h-max min-h-full flex-col gap-5", className)}
    {...props}
  />
)

export const MessageScrollerItem = ({
  className,
  scrollAnchor = false,
  ...props
}: React.ComponentProps<typeof MessageScrollerPrimitive.Item>) => (
  <MessageScrollerPrimitive.Item
    data-slot="message-scroller-item"
    scrollAnchor={scrollAnchor}
    className={cn("min-w-0 shrink-0", className)}
    {...props}
  />
)

export const MessageScrollerButton = ({
  className,
  children,
  render,
  ...props
}: React.ComponentProps<typeof MessageScrollerPrimitive.Button>) => (
  <MessageScrollerPrimitive.Button
    data-slot="message-scroller-button"
    className={cn("absolute bottom-3 left-1/2 -translate-x-1/2", className)}
    render={render ?? <Button variant="secondary" size="icon" />}
    {...props}
  >
    {children ?? <ArrowDown aria-hidden="true" />}
  </MessageScrollerPrimitive.Button>
)
