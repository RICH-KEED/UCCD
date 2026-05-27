"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

const TimelineContext = React.createContext<{ defaultValue?: number }>({})
const TimelineItemContext = React.createContext<{ step: number }>({ step: 0 })

function Timeline({
  className,
  defaultValue,
  ...props
}: React.ComponentProps<"ol"> & { defaultValue?: number }) {
  return (
    <TimelineContext.Provider value={{ defaultValue }}>
      <ol className={cn("space-y-0", className)} {...props} />
    </TimelineContext.Provider>
  )
}

function TimelineItem({
  className,
  step,
  ...props
}: React.ComponentProps<"li"> & { step: number }) {
  return (
    <TimelineItemContext.Provider value={{ step }}>
      <li className={cn("group relative pb-3 pl-9 last:pb-0", className)} {...props} />
    </TimelineItemContext.Provider>
  )
}

function TimelineHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("grid gap-0.5", className)} {...props} />
}

function TimelineSeparator({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden="true"
      className={cn("absolute left-3 top-7 h-[calc(100%-1.75rem)] w-px bg-border group-last:hidden", className)}
      {...props}
    />
  )
}

function TimelineIndicator({ className, ...props }: React.ComponentProps<"span">) {
  const { defaultValue } = React.useContext(TimelineContext)
  const { step } = React.useContext(TimelineItemContext)
  const active = defaultValue === step

  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute left-0 top-1 flex size-6 items-center justify-center rounded-full border bg-background text-[10px] font-semibold text-muted-foreground",
        active && "border-primary bg-primary text-primary-foreground shadow-sm",
        className,
      )}
      {...props}
    >
      {step}
    </span>
  )
}

function TimelineDate({ className, ...props }: React.ComponentProps<"time">) {
  return <time className={cn("text-xs text-muted-foreground", className)} {...props} />
}

function TimelineTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 className={cn("text-sm font-semibold text-foreground", className)} {...props} />
}

function TimelineContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mt-1 text-sm leading-relaxed text-muted-foreground", className)} {...props} />
}

export {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
}
