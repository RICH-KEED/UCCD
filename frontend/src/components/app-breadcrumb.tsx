'use client'

import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { useRouter, type RoutePath } from '@/hooks/use-router'
import { cn } from '@/lib/utils'

interface AppBreadcrumbProps {
  current: ReactNode
  items?: Array<{
    label: ReactNode
    route?: RoutePath
    onClick?: () => void
  }>
  homeRoute?: RoutePath
  meta?: ReactNode
  actions?: ReactNode
  className?: string
}

export function AppBreadcrumb({
  current,
  items = [],
  homeRoute = 'dashboard',
  meta,
  actions,
  className,
}: AppBreadcrumbProps) {
  const { navigate } = useRouter()

  return (
    <div className={cn('flex min-w-0 items-center gap-1.5 text-[12px]', className)}>
      <button
        type="button"
        onClick={() => navigate(homeRoute)}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        Home
      </button>
      <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
      {items.map((item, index) => (
        <span key={index} className="flex min-w-0 items-center gap-1.5">
          {item.route || item.onClick ? (
            <button
              type="button"
              onClick={() => item.onClick ? item.onClick() : item.route && navigate(item.route)}
              className="truncate text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </button>
          ) : (
            <span className="truncate text-muted-foreground">{item.label}</span>
          )}
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
        </span>
      ))}
      <span className="truncate font-medium text-foreground">{current}</span>
      {typeof meta === 'string' ? <span className="text-muted-foreground ml-2">{meta}</span> : meta}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  )
}
