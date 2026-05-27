'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from '@/hooks/use-router'
import { api } from '@/lib/api-client'
import {
  FONT_OPTIONS,
  applyAppearancePreferences,
  readAppearancePreferences,
  storeAppearancePreferences,
  type AppearanceFont,
  type AppearanceTheme,
} from '@/lib/appearance'
import type { CategoryBreakdown, ChannelDistribution, Complaint, DashboardKpis } from '@/types/complaint'
import { DashboardShell } from '@/components/dashboard-shell'
import { AppBreadcrumb } from '@/components/app-breadcrumb'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/hooks/use-toast'

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-background px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold text-foreground">{value}</div>
    </div>
  )
}

function InfoLine({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex items-center justify-between gap-4 border-b py-3 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

function formatDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export function SettingsPage() {
  const { user, logout } = useAuth()
  const { navigate } = useRouter()
  const [theme, setTheme] = useState<AppearanceTheme>('light')
  const [font, setFont] = useState<AppearanceFont>('system')
  const [kpis, setKpis] = useState<DashboardKpis | null>(null)
  const [categories, setCategories] = useState<CategoryBreakdown['categories']>([])
  const [channels, setChannels] = useState<ChannelDistribution['channels']>([])
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const prefs = readAppearancePreferences()
    setTheme(prefs.theme)
    setFont(prefs.font)
    applyAppearancePreferences(prefs.theme, prefs.font)
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([
      api.getKpis(),
      api.getCategories(),
      api.getChannels(),
      api.listComplaints({ limit: 100 }),
    ]).then(([kpiRes, categoryRes, channelRes, complaintsRes]) => {
      if (cancelled) return
      if (kpiRes.status === 'fulfilled') setKpis(kpiRes.value)
      if (categoryRes.status === 'fulfilled') setCategories(categoryRes.value.categories || [])
      if (channelRes.status === 'fulfilled') setChannels(channelRes.value.channels || [])
      if (complaintsRes.status === 'fulfilled') setComplaints(complaintsRes.value.complaints || [])
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const accountStats = useMemo(() => {
    const assigned = complaints.filter((complaint) => complaint.assigned_to === user?.user_id).length
    const drafts = complaints.filter((complaint) => complaint.ai_draft).length
    const regulatory = complaints.filter((complaint) => complaint.regulatory_flag).length
    const breached = complaints.filter((complaint) => complaint.sla_breached).length
    return { assigned, drafts, regulatory, breached }
  }, [complaints, user?.user_id])

  const setThemePreference = (nextTheme: AppearanceTheme) => {
    setTheme(nextTheme)
    storeAppearancePreferences(nextTheme, font)
    toast({ title: 'Theme updated', description: `${nextTheme === 'dark' ? 'Dark' : 'Day'} mode is active.` })
  }

  const setFontPreference = (nextFont: AppearanceFont) => {
    setFont(nextFont)
    storeAppearancePreferences(theme, nextFont)
    const label = FONT_OPTIONS.find((option) => option.value === nextFont)?.label ?? 'Selected'
    toast({ title: 'Font updated', description: `${label} font is active.` })
  }

  const handleLogout = () => {
    logout()
    navigate('landing')
  }

  return (
    <DashboardShell
      activeItem="Settings"
      breadcrumb={<AppBreadcrumb current="Settings" meta="Preferences and account controls" />}
    >
      <div className="p-5">
        <Tabs defaultValue="overview" orientation="vertical" className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
          <TabsList variant="line" className="h-fit w-full items-stretch rounded-lg border bg-card p-1">
            <TabsTrigger value="overview" className="justify-start px-3 py-2">Overview</TabsTrigger>
            <TabsTrigger value="personalization" className="justify-start px-3 py-2">Personalization</TabsTrigger>
            <TabsTrigger value="account" className="justify-start px-3 py-2">Account</TabsTrigger>
          </TabsList>

          <div className="min-w-0">
            <TabsContent value="overview" className="m-0 space-y-5">
              {loading && (
                <div className="grid gap-4 md:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-lg" />)}
                </div>
              )}

              {kpis && (
                <div className="grid gap-4 md:grid-cols-4">
                  <StatTile label="Total complaints" value={kpis.total} />
                  <StatTile label="Open" value={kpis.open} />
                  <StatTile label="SLA at risk" value={kpis.sla_at_risk} />
                  <StatTile label="Resolved today" value={kpis.resolved_today} />
                  <StatTile label="Escalated" value={kpis.escalated} />
                  <StatTile label="Breached" value={kpis.breached} />
                  <StatTile label="Resolution rate" value={`${kpis.resolution_rate}%`} />
                  <StatTile label="Avg resolution" value={`${kpis.avg_resolution_hours}h`} />
                </div>
              )}

              <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
                <Card className="gap-4">
                  <CardHeader>
                    <CardTitle>User overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <InfoLine label="Name" value={user?.name} />
                    <InfoLine label="Email" value={user?.email} />
                    <InfoLine label="Role" value={user?.role} />
                    <InfoLine label="User ID" value={user?.user_id} />
                    <InfoLine label="Session expires" value={formatDate(user?.expires_at)} />
                  </CardContent>
                </Card>

                {(complaints.length > 0 || kpis) && (
                  <Card className="gap-4">
                    <CardHeader>
                      <CardTitle>Accessible data</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2">
                      <StatTile label="Loaded records" value={complaints.length} />
                      <StatTile label="Assigned to you" value={accountStats.assigned} />
                      <StatTile label="AI drafts" value={accountStats.drafts} />
                      <StatTile label="Regulatory flags" value={accountStats.regulatory} />
                    </CardContent>
                  </Card>
                )}
              </div>

              {(categories.length > 0 || channels.length > 0) && (
                <div className="grid gap-5 xl:grid-cols-2">
                  {categories.length > 0 && (
                    <Card className="gap-4">
                      <CardHeader><CardTitle>Complaint categories</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        {categories.slice(0, 8).map((category) => (
                          <div key={category.name} className="flex items-center justify-between gap-3">
                            <span className="truncate text-sm text-muted-foreground">{category.name}</span>
                            <Badge variant="outline">{category.count}</Badge>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {channels.length > 0 && (
                    <Card className="gap-4">
                      <CardHeader><CardTitle>Channel access</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        {channels.map((channel) => (
                          <div key={channel.name} className="flex items-center justify-between gap-3">
                            <span className="truncate text-sm text-muted-foreground">{channel.name}</span>
                            <span className="text-sm font-medium">{channel.count} - {channel.percentage}%</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="personalization" className="m-0 space-y-5">
              <Card className="gap-4">
                <CardHeader>
                  <CardTitle>Display</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <Label className="text-sm font-semibold">Day / dark mode</Label>
                      <p className="mt-1 text-sm text-muted-foreground">Switch the interface theme instantly.</p>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
                      <span className="text-sm text-muted-foreground">Day</span>
                      <Switch checked={theme === 'dark'} onCheckedChange={(checked) => setThemePreference(checked ? 'dark' : 'light')} />
                      <span className="text-sm font-medium">Dark</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-3 md:grid-cols-[1fr_260px] md:items-center">
                    <div>
                      <Label className="text-sm font-semibold">Font</Label>
                      <p className="mt-1 text-sm text-muted-foreground">Choose the reading style used across the app.</p>
                    </div>
                    <Select value={font} onValueChange={(value) => setFontPreference(value as AppearanceFont)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select font" />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="account" className="m-0 space-y-5">
              <Card className="gap-4">
                <CardHeader>
                  <CardTitle>Account information</CardTitle>
                </CardHeader>
                <CardContent>
                  <InfoLine label="Name" value={user?.name} />
                  <InfoLine label="Email" value={user?.email} />
                  <InfoLine label="Role" value={user?.role} />
                  <InfoLine label="User ID" value={user?.user_id} />
                  <InfoLine label="Session expires" value={formatDate(user?.expires_at)} />
                </CardContent>
              </Card>

              <Card className="gap-4">
                <CardHeader>
                  <CardTitle>Account actions</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Button onClick={handleLogout}>Logout</Button>
                  <Button
                    variant="outline"
                    className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => toast({ variant: 'destructive', title: 'Delete account is disabled', description: 'This demo action is not connected to account deletion.' })}
                  >
                    Delete account
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </DashboardShell>
  )
}
