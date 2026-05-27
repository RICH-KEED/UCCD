'use client'

import { useEffect, useState } from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import { GlobalSearch } from '@/components/global-search'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  applyAppearancePreferences,
  readAppearancePreferences,
  storeAppearancePreferences,
  type AppearanceTheme,
} from '@/lib/appearance'
import type { RoutePath } from '@/hooks/use-router'

const SIDEBAR_COOKIE_NAME = 'sidebar_state'

export interface ShellTab {
  label: string
  route: RoutePath
}

interface DashboardShellProps {
  activeItem: string
  tabs?: ShellTab[]
  activeTab?: string
  searchPlaceholder?: string
  breadcrumb?: React.ReactNode
  children: React.ReactNode
  headerRight?: React.ReactNode
}

export function DashboardShell({
  activeItem,
  breadcrumb,
  children,
  headerRight,
}: DashboardShellProps) {
  const [theme, setTheme] = useState<AppearanceTheme>('light')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    const preferences = readAppearancePreferences()
    setTheme(preferences.theme)
    applyAppearancePreferences(preferences.theme, preferences.font)

    const sidebarState = document.cookie
      .split('; ')
      .find((cookie) => cookie.startsWith(`${SIDEBAR_COOKIE_NAME}=`))
      ?.split('=')[1]

    if (sidebarState === 'false') setSidebarOpen(false)
  }, [])

  const setThemePreference = (nextTheme: AppearanceTheme) => {
    const preferences = readAppearancePreferences()
    setTheme(nextTheme)
    storeAppearancePreferences(nextTheme, preferences.font)
  }

  return (
    <SidebarProvider className="h-dvh overflow-hidden" open={sidebarOpen} onOpenChange={setSidebarOpen}>
      {/* Sidebar: flush to top-left, full height, border-right */}
      <AppSidebar activeItem={activeItem} />

      {/* Main content area: topbar only spans here (right of sidebar) */}
      <SidebarInset className="min-w-0 overflow-hidden">
        {/* Topbar / Header */}
        <header className="flex h-14 min-w-0 shrink-0 items-center gap-2 border-b bg-background px-4">
          {/* Sidebar toggle (mobile / collapse) */}
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />

          <div className="min-w-0 flex-1 overflow-hidden">{breadcrumb}</div>

          <div className="ml-auto flex min-w-0 items-center gap-2">
            <div className="hidden h-9 shrink-0 items-center gap-2 rounded-lg border bg-background px-3 text-sm shadow-xs md:flex">
              <span className={theme === 'light' ? 'font-medium text-foreground' : 'text-muted-foreground'}>Day</span>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setThemePreference(checked ? 'dark' : 'light')}
                aria-label="Toggle day or dark mode"
              />
              <span className={theme === 'dark' ? 'font-medium text-foreground' : 'text-muted-foreground'}>Dark</span>
            </div>
            <GlobalSearch triggerClassName="flex h-9 w-[clamp(12rem,28vw,20rem)] max-w-full min-w-0 items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 text-[13px] outline-none transition-[color,box-shadow] hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50" />
          </div>

          {/* Extra header right content */}
          {headerRight}
        </header>

        {/* Content - scrollable */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
