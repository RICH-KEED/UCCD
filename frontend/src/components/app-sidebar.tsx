'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from '@/hooks/use-router'
import { api } from '@/lib/api-client'
import type { RoutePath } from '@/hooks/use-router'
import { openGlobalSearch } from '@/components/global-search'
import {
  LayoutDashboard, ListTodo, Sparkles, ShieldAlert,
  FileWarning, LogOut, Layers, Settings, HelpCircle,
  ChevronRight, Search, TrendingUp, Activity, Eye
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar'

interface BadgeCounts {
  complaints?: number
  slaBreaches?: number
  escalations?: number
}

interface NavItem {
  name: string
  icon: React.ElementType
  badgeKey?: 'complaints' | 'slaBreaches' | 'escalations'
  route: RoutePath
}

const ITEMS_BY_ROLE: Record<string, NavItem[]> = {
  AGENT: [
    { name: 'Dashboard', icon: LayoutDashboard, route: 'dashboard' },
    { name: 'My Queue', icon: ListTodo, badgeKey: 'complaints', route: 'complaints' },
    { name: 'AI Drafts', icon: Sparkles, route: 'ai-drafts' },
    { name: '360° View', icon: Eye, route: '360-view' },
    { name: 'Search', icon: Search, route: 'search' },
  ],
  SUPERVISOR: [
    { name: 'Dashboard', icon: LayoutDashboard, route: 'dashboard' },
    { name: 'All Complaints', icon: ListTodo, badgeKey: 'complaints', route: 'complaints' },
    { name: 'Escalations', icon: ShieldAlert, badgeKey: 'escalations', route: 'escalations' },
    { name: 'SLA Breaches', icon: Activity, badgeKey: 'slaBreaches', route: 'sla-breaches' },
    { name: 'Trends', icon: TrendingUp, route: 'trends' },
    { name: 'Root Cause', icon: FileWarning, route: 'root-cause' },
    { name: 'Search', icon: Search, route: 'search' },
  ],
  COMPLIANCE: [
    { name: 'Dashboard', icon: LayoutDashboard, route: 'dashboard' },
    { name: 'Regulatory Reports', icon: FileWarning, route: 'regulatory' },
    { name: 'SLA Breaches', icon: Activity, badgeKey: 'slaBreaches', route: 'sla-breaches' },
    { name: 'Root Cause', icon: FileWarning, route: 'root-cause' },
    { name: 'Trends', icon: TrendingUp, route: 'trends' },
    { name: 'Search', icon: Search, route: 'search' },
  ],
}

export function AppSidebar({ activeItem, ...props }: { activeItem: string } & React.ComponentProps<typeof Sidebar>) {
  const { user, logout } = useAuth()
  const { navigate } = useRouter()
  const { isMobile, setOpen, setOpenMobile } = useSidebar()
  const [badges, setBadges] = useState<BadgeCounts>({})

  const role = user?.role ?? 'AGENT'
  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('') : '??'

  useEffect(() => {
    api.getKpis().then(kpis => {
      setBadges({
        complaints: kpis.open,
        slaBreaches: kpis.breached,
        escalations: kpis.escalated,
      })
    }).catch(() => {})
  }, [])

  const items = ITEMS_BY_ROLE[role] || []
  const navigateAndCollapse = (route: RoutePath) => {
    navigate(route)
    if (isMobile) {
      setOpenMobile(false)
      return
    }
    setOpen(false)
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* Header: Logo & brand */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div className="cursor-default">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Layers className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">ComplaintIQ</span>
                  <span className="truncate text-xs text-muted-foreground">HDFC Bank &middot; Gen-AI</span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      {/* Main navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = item.name === activeItem
                const badgeValue = item.badgeKey ? badges[item.badgeKey] : undefined
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.name}
                      onClick={() => {
                        if (item.name === 'Search') {
                          openGlobalSearch()
                          return
                        }
                        if (item.route) navigateAndCollapse(item.route)
                      }}
                    >
                      <Icon />
                      <span className="truncate">{item.name}</span>
                    </SidebarMenuButton>
                    {badgeValue !== undefined && badgeValue > 0 && (
                      <SidebarMenuBadge>{badgeValue}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Settings" isActive={activeItem === 'Settings'} onClick={() => navigateAndCollapse('settings')}>
                  <Settings />
                  <span className="truncate">Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Help & Support">
                  <HelpCircle />
                  <span className="truncate">Help & Support</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer: user profile */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="cursor-pointer">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user?.name ?? 'User'}</span>
                    <span className="truncate text-xs text-muted-foreground">{user?.role ?? 'Agent'}</span>
                  </div>
                  <ChevronRight className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="right"
                align="end"
                className="w-56"
              >
                <DropdownMenuItem onClick={() => navigate('settings')}>
                  <Settings className="mr-2 size-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <HelpCircle className="mr-2 size-4" />
                  <span>Help & Support</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => { logout(); navigate('landing') }}
                >
                  <LogOut className="mr-2 size-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
