"use client"

import * as React from "react"

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Check, Copy } from "lucide-react"

export type HoverTextAction = {
  label: string
  icon: React.ReactNode
  onClick: () => void
}

type HoverTextProps = {
  text: React.ReactNode
  fullText?: React.ReactNode
  copyText?: string
  actions?: HoverTextAction[]
  className?: string
  contentClassName?: string
  onClick?: React.MouseEventHandler<HTMLSpanElement>
  triggerAsChild?: boolean
}

export function HoverText({
  text,
  fullText = text,
  copyText,
  actions = [],
  className,
  contentClassName,
  onClick,
  triggerAsChild = false,
}: HoverTextProps) {
  const [copied, setCopied] = React.useState(false)
  const resolvedCopyText =
    copyText ?? (typeof fullText === "string" ? fullText : typeof text === "string" ? text : "")

  const handleCopy = async () => {
    if (!resolvedCopyText) return
    await navigator.clipboard.writeText(resolvedCopyText)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  const trigger =
    triggerAsChild && React.isValidElement(text)
      ? text
      : (
        <span
          className={cn("block truncate", className)}
          onClick={onClick}
        >
          {text}
        </span>
      )

  return (
    <HoverCard openDelay={250} closeDelay={100}>
      <HoverCardTrigger asChild>
        {trigger}
      </HoverCardTrigger>
      <HoverCardContent
        align="start"
        className={cn("w-80 max-w-[calc(100vw-2rem)] p-3 text-xs leading-5", contentClassName)}
      >
        <div className="max-h-56 overflow-y-auto whitespace-pre-wrap break-words pr-1 text-popover-foreground">
          {fullText}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-end gap-1.5 border-t border-border pt-2">
          {actions.map((action) => (
            <Button
              key={action.label}
              aria-label={action.label}
              className="h-7 gap-1.5 px-2 text-[11px]"
              type="button"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation()
                action.onClick()
              }}
            >
              {action.icon}
              <span>{action.label}</span>
            </Button>
          ))}
          <Button
            aria-label={copied ? "Copied" : "Copy text"}
            className="h-7 gap-1.5 px-2 text-[11px]"
            disabled={!resolvedCopyText}
            type="button"
            variant="ghost"
            onClick={(event) => {
              event.stopPropagation()
              handleCopy()
            }}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </Button>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
