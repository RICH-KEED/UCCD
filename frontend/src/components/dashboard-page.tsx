'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRouter, type RoutePath } from '@/hooks/use-router'
import { api } from '@/lib/api-client'
import type { Complaint, DashboardKpis, CategoryBreakdown, ChannelDistribution } from '@/types/complaint'
import { DashboardShell } from '@/components/dashboard-shell'
import type { ShellTab } from '@/components/dashboard-shell'
import { AppBreadcrumb } from '@/components/app-breadcrumb'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTable, multiColumnFilterFn, valueInArrayFilterFn } from '@/components/ui/data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { toast } from '@/hooks/use-toast'
import { HoverText } from '@/components/ui/hover-text'
import {
  Inbox, CheckCircle2, AlertTriangle, Clock, ArrowRight,
  ShieldAlert, TrendingUp, Sparkles,
  MoreHorizontal, Eye, CheckCircle,
  ExternalLink, MessageSquare, Mail, Send, AtSign, Camera, Smartphone, Globe2
} from 'lucide-react'

const severityColors: Record<string, { bg: string; text: string }> = {
  HIGH: { bg: 'hsl(var(--destructive) / 0.1)', text: 'hsl(var(--destructive))' },
  MEDIUM: { bg: 'hsl(var(--warning) / 0.15)', text: 'hsl(var(--warning))' },
  LOW: { bg: 'hsl(var(--success) / 0.1)', text: 'hsl(var(--success))' },
}

const statusColors: Record<string, { bg: string; text: string }> = {
  escalated: { bg: 'hsl(var(--destructive) / 0.1)', text: 'hsl(var(--destructive))' },
  in_progress: { bg: 'hsl(var(--primary) / 0.1)', text: 'hsl(var(--primary))' },
  queued: { bg: 'hsl(var(--warning) / 0.15)', text: 'hsl(var(--warning))' },
  new: { bg: 'hsl(var(--primary) / 0.08)', text: 'hsl(var(--primary))' },
  resolved: { bg: 'hsl(var(--success) / 0.1)', text: 'hsl(var(--success))' },
}

function ChannelIcon({ channel, className = 'h-3.5 w-3.5' }: { channel: string; className?: string }) {
  const key = channel.toLowerCase()
  const Icon =
    key.includes('email') ? Mail :
      key.includes('telegram') ? Send :
        key.includes('twitter') ? AtSign :
          key.includes('instagram') ? Camera :
            key.includes('app') ? Smartphone :
              key.includes('web') ? Globe2 :
                MessageSquare

  return <Icon aria-hidden="true" className={`${className} shrink-0 text-muted-foreground`} />
}

function ChannelLabel({ channel }: { channel: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <ChannelIcon channel={channel} />
      <span>{channel}</span>
    </span>
  )
}

const AGENT_TABS: ShellTab[] = [
  { label: 'Dashboard', route: 'dashboard' },
  { label: 'My Queue', route: 'complaints' },
  { label: 'AI Drafts', route: 'ai-drafts' },
  { label: '360° View', route: '360-view' },
]

const SUPERVISOR_TABS: ShellTab[] = [
  { label: 'Dashboard', route: 'dashboard' },
  { label: 'Complaints', route: 'complaints' },
  { label: 'Escalations', route: 'escalations' },
  { label: 'SLA', route: 'sla-breaches' },
  { label: 'Trends', route: 'trends' },
]

const COMPLIANCE_TABS: ShellTab[] = [
  { label: 'Dashboard', route: 'dashboard' },
  { label: 'Regulatory', route: 'regulatory' },
  { label: 'SLA', route: 'sla-breaches' },
  { label: 'Trends', route: 'trends' },
]

function QuickAccessCard({ title, subtitle, icon, color, onClick }: {
  title: string; subtitle: string; icon: React.ReactNode; color: string; onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-card border border-border rounded-lg p-4 text-left hover:shadow-md hover:border-primary/20 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in oklch, ${color} 12%, transparent)` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <MoreHorizontal className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
      </div>
      <div className="text-[13px] font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{title}</div>
      <div className="text-[11px] text-muted-foreground">{subtitle}</div>
    </button>
  )
}

function KpiCard({ label, value, icon, color, subtitle }: {
  label: string; value: string | number; icon: React.ReactNode; color: string; subtitle?: string
}) {
  return (
    <Card className="bg-card border-border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{label}</div>
            <div className="text-[28px] font-bold text-foreground leading-none mb-1">{value}</div>
            {subtitle && <div className="text-[11px] text-muted-foreground mt-1">{subtitle}</div>}
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `color-mix(in oklch, ${color} 12%, transparent)` }}>
            <span style={{ color }}>{icon}</span>
          </div>
        </div>
        <Progress value={100} className="h-[3px] mt-3" style={{ '--progress-color': color } as React.CSSProperties} />
      </CardContent>
    </Card>
  )
}

function LoadingSkeleton() {
  return (
    <div className="grid w-full max-w-5xl gap-4 py-10">
      <div className="grid grid-cols-4 gap-4">
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
      </div>
      <Skeleton className="h-72 rounded-lg" />
    </div>
  )
}

function getTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ── Row type for the dashboard complaint tables ──────────────────────
interface ComplaintRow {
  id: string
  fullId: string
  sla: string
  slaBg: string
  slaText: string
  issue: string
  channel: string
  age: string
  status: string
  statusBg: string
  statusText: string
  actionLabel: string
  actionVariant: 'view' | 'resolve'
}

function toComplaintRow(c: Complaint): ComplaintRow {
  const sev = severityColors[c.priority_tier && c.priority_tier <= 2 ? 'HIGH' : c.priority_tier === 3 ? 'MEDIUM' : 'LOW'] ?? severityColors.LOW
  return {
    id: String(c.id).slice(0, 8),
    fullId: String(c.id),
    sla: c.sla_tier ?? 'NORMAL',
    slaBg: sev.bg,
    slaText: sev.text,
    issue: c.raw_text,
    channel: c.channel,
    age: getTimeAgo(c.created_at),
    status: c.status.replace('_', ' '),
    statusBg: statusColors[c.status]?.bg ?? 'hsl(var(--muted))',
    statusText: statusColors[c.status]?.text ?? 'hsl(var(--muted-foreground))',
    actionLabel: (c.status === 'escalated' || c.status === 'in_progress') ? 'Resolve' : 'View',
    actionVariant: (c.status === 'escalated' || c.status === 'in_progress') ? 'resolve' : 'view',
  }
}

// ── Column definitions for the complaint DataTable ───────────────────
function useComplaintColumns(navigate: (route: RoutePath, params?: Record<string, string>) => void, onResolve?: (id: string) => void): ColumnDef<ComplaintRow>[] {
  return useMemo(() => [
    {
      accessorKey: 'id',
      header: 'ID',
      size: 100,
      cell: ({ getValue, row }) => (
        <HoverText
          text={getValue() as string}
          fullText={row.original.fullId}
          className="cursor-pointer font-mono text-[11px] font-semibold text-primary"
          onClick={() => navigate('complaint-detail', { id: row.original.fullId })}
          actions={[
            { label: 'View details', icon: <ExternalLink className="h-3.5 w-3.5" />, onClick: () => navigate('complaint-detail', { id: row.original.fullId }) },
            ...(row.original.actionVariant === 'resolve' && onResolve
              ? [{ label: 'Resolve', icon: <CheckCircle className="h-3.5 w-3.5" />, onClick: () => onResolve(row.original.fullId) }]
              : []),
          ]}
        />
      ),
      filterFn: multiColumnFilterFn,
    },
    {
      accessorKey: 'sla',
      header: 'SLA',
      size: 80,
      cell: ({ getValue, row }) => (
        <Badge variant="outline" className="text-[10px] font-bold" style={{ color: row.original.slaText, backgroundColor: row.original.slaBg, borderColor: 'transparent' }}>
          {getValue() as string}
        </Badge>
      ),
      filterFn: valueInArrayFilterFn,
    },
    {
      accessorKey: 'issue',
      header: 'Issue',
      size: 280,
      cell: ({ getValue, row }) => (
        <HoverText
          text={getValue() as string}
          className="max-w-[260px] text-xs text-foreground/80"
          actions={[
            { label: 'View details', icon: <Eye className="h-3.5 w-3.5" />, onClick: () => navigate('complaint-detail', { id: row.original.fullId }) },
            ...(row.original.actionVariant === 'resolve' && onResolve
              ? [{ label: 'Resolve', icon: <CheckCircle className="h-3.5 w-3.5" />, onClick: () => onResolve(row.original.fullId) }]
              : []),
          ]}
        />
      ),
    },
    {
      accessorKey: 'channel',
      header: 'Channel',
      size: 90,
      cell: ({ getValue }) => <span className="text-[11px] text-muted-foreground"><ChannelLabel channel={getValue() as string} /></span>,
      filterFn: valueInArrayFilterFn,
    },
    {
      accessorKey: 'age',
      header: 'Age',
      size: 80,
      cell: ({ getValue }) => <span className="text-[11px] text-muted-foreground">{getValue() as string}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 90,
      cell: ({ getValue, row }) => (
        <Badge variant="outline" className="text-[10px] font-semibold" style={{ color: row.original.statusText, backgroundColor: row.original.statusBg, borderColor: 'transparent' }}>
          {getValue() as string}
        </Badge>
      ),
      filterFn: valueInArrayFilterFn,
    },
    {
      id: 'action',
      header: 'Actions',
      size: 60,
      cell: ({ row }) => {
        const r = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('complaint-detail', { id: r.fullId })}>
                <Eye className="h-4 w-4 mr-2" /> View Details
              </DropdownMenuItem>
              {r.actionVariant === 'resolve' && (
                <DropdownMenuItem onClick={() => onResolve?.(r.fullId)}>
                  <CheckCircle className="h-4 w-4 mr-2" /> Resolve
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ], [navigate, onResolve])
}

// ── Column definitions for the compliance regulatory table ───────────
interface RegulatoryRow {
  id: string
  fullId: string
  obligation: string
  issue: string
  age: string
  status: string
  statusBg: string
  statusText: string
}

function useRegulatoryColumns(navigate: (route: RoutePath, params?: Record<string, string>) => void): ColumnDef<RegulatoryRow>[] {
  return useMemo(() => [
    {
      accessorKey: 'id',
      header: 'ID',
      size: 100,
      cell: ({ getValue, row }) => (
        <HoverText
          text={getValue() as string}
          fullText={row.original.fullId}
          className="cursor-pointer font-mono text-[11px] font-bold text-destructive"
          onClick={() => navigate('complaint-detail', { id: row.original.fullId })}
          actions={[
            { label: 'View details', icon: <ExternalLink className="h-3.5 w-3.5" />, onClick: () => navigate('complaint-detail', { id: row.original.fullId }) },
          ]}
        />
      ),
    },
    {
      accessorKey: 'obligation',
      header: 'Obligation',
      size: 130,
      cell: ({ getValue }) => <Badge variant="destructive" className="text-[10px] font-bold">{getValue() as string}</Badge>,
    },
    {
      accessorKey: 'issue',
      header: 'Issue',
      size: 280,
      cell: ({ getValue, row }) => (
        <HoverText
          text={getValue() as string}
          className="max-w-[260px] text-xs font-medium text-foreground"
          actions={[
            { label: 'View details', icon: <Eye className="h-3.5 w-3.5" />, onClick: () => navigate('complaint-detail', { id: row.original.fullId }) },
          ]}
        />
      ),
    },
    {
      accessorKey: 'age',
      header: 'Age',
      size: 80,
      cell: ({ getValue }) => <span className="text-[10px] text-muted-foreground">{getValue() as string}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 100,
      cell: ({ getValue, row }) => (
        <Badge variant="outline" className="text-[10px] font-semibold" style={{ color: row.original.statusText, backgroundColor: row.original.statusBg, borderColor: 'transparent' }}>
          {getValue() as string}
        </Badge>
      ),
      filterFn: valueInArrayFilterFn,
    },
  ], [navigate])
}

function AgentDashboard({ kpis, recent, navigate }: { kpis: DashboardKpis; recent: Complaint[]; navigate: (route: RoutePath, params?: Record<string, string>) => void }) {
  const columns = useComplaintColumns(navigate)
  const tableData = useMemo(() => recent.slice(0, 10).map(toComplaintRow), [recent])

  return (
    <div className="flex flex-col gap-5">
      {/* Quick Access */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-foreground">Quick Access</h2>
          <button type="button" className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <QuickAccessCard
            title="My Open Queue"
            subtitle={`${kpis.open} complaints · ${kpis.sla_at_risk} at risk`}
            icon={<Inbox className="h-5 w-5" />}
            color="hsl(var(--primary))"
            onClick={() => navigate('complaints')}
          />
          <QuickAccessCard
            title="Resolved Today"
            subtitle={`${kpis.resolved_today} complaints closed`}
            icon={<CheckCircle2 className="h-5 w-5" />}
            color="hsl(var(--success))"
            onClick={() => navigate('complaints')}
          />
          <QuickAccessCard
            title="Escalations"
            subtitle={`${kpis.escalated} need attention`}
            icon={<ShieldAlert className="h-5 w-5" />}
            color="hsl(var(--destructive))"
            onClick={() => navigate('escalations')}
          />
          <QuickAccessCard
            title="AI Drafts Ready"
            subtitle="Review & send responses"
            icon={<Sparkles className="h-5 w-5" />}
            color="hsl(var(--primary))"
            onClick={() => navigate('ai-drafts')}
          />
        </div>
      </div>

      {/* Recent Complaints Table */}
      <Card className="bg-card border-border shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-[14px] font-bold text-foreground">Recent Complaints</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('complaints')} className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1">View All <ArrowRight className="h-3 w-3" /></button>
          </div>
        </div>
        <div className="p-4">
          <DataTable
            columns={columns}
            data={tableData}
            enablePagination={false}
            searchColumn="id"
            searchPlaceholder="Search complaints..."
            filterColumns={['status', 'channel']}
            className="[&_table]:text-[11px]"
          />
        </div>
      </Card>
    </div>
  )
}

function SupervisorDashboard({ kpis, categories, channels, recent, navigate }: { kpis: DashboardKpis; categories: CategoryBreakdown; channels: ChannelDistribution; recent: Complaint[]; navigate: (route: RoutePath, params?: Record<string, string>) => void }) {
  const handleQuickResolve = async (id: string) => {
    try {
      await api.updateStatus(id, 'resolved')
      toast({ title: 'Complaint resolved', description: 'The queue will refresh with the updated status.' })
      window.setTimeout(() => window.location.reload(), 700)
    } catch {
      toast({ variant: 'destructive', title: 'Resolve failed', description: 'The complaint status could not be updated.' })
    }
  }

  const columns = useComplaintColumns(navigate, handleQuickResolve)
  const tableData = useMemo(() => recent.slice(0, 10).map(toComplaintRow), [recent])

  return (
    <div className="flex flex-col gap-5">
      {/* Quick Access */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-foreground">Quick Access</h2>
          <button type="button" className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-5 gap-3">
          <QuickAccessCard
            title="Open Complaints"
            subtitle={`${kpis.open} active`}
            icon={<Inbox className="h-5 w-5" />}
            color="hsl(var(--primary))"
            onClick={() => navigate('complaints')}
          />
          <QuickAccessCard
            title="Escalated"
            subtitle={`${kpis.escalated} need review`}
            icon={<ShieldAlert className="h-5 w-5" />}
            color="hsl(var(--destructive))"
            onClick={() => navigate('escalations')}
          />
          <QuickAccessCard
            title="SLA Breached"
            subtitle={`${kpis.breached} breached`}
            icon={<AlertTriangle className="h-5 w-5" />}
            color="hsl(var(--warning))"
            onClick={() => navigate('sla-breaches')}
          />
          <QuickAccessCard
            title="Resolved Today"
            subtitle={`${kpis.resolved_today} closed`}
            icon={<CheckCircle2 className="h-5 w-5" />}
            color="hsl(var(--success))"
            onClick={() => navigate('complaints')}
          />
          <QuickAccessCard
            title="Trends"
            subtitle="Analytics & insights"
            icon={<TrendingUp className="h-5 w-5" />}
            color="hsl(var(--primary))"
            onClick={() => navigate('trends')}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4">
        <KpiCard label="Total Open" value={kpis.open} icon={<Inbox className="h-5 w-5" />} color="hsl(var(--primary))" />
        <KpiCard label="Escalated" value={kpis.escalated} icon={<ShieldAlert className="h-5 w-5" />} color="hsl(var(--destructive))" />
        <KpiCard label="SLA Breached" value={kpis.breached} icon={<AlertTriangle className="h-5 w-5" />} color="hsl(var(--warning))" />
        <KpiCard label="Resolved Today" value={kpis.resolved_today} icon={<CheckCircle2 className="h-5 w-5" />} color="hsl(var(--success))" />
        <KpiCard label="Resolution Rate" value={`${kpis.resolution_rate}%`} icon={<TrendingUp className="h-5 w-5" />} color="hsl(var(--primary))" />
      </div>

      {/* Categories & Channels */}
      <div className="grid grid-cols-2 gap-5 items-start">
        <Card className="bg-card border-border shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-[14px] font-bold text-foreground">Top Complaint Categories</h2>
            <button onClick={() => navigate('trends')} className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1">View Trends <ArrowRight className="h-3 w-3" /></button>
          </div>
          <div className="p-5 pt-3">
            {categories.categories.slice(0, 7).map((cat, i) => {
              const maxCount = categories.categories[0]?.count ?? 1
              const pct = Math.round((cat.count / maxCount) * 100)
              return (
                <div key={cat.name} className={`flex items-center gap-3 py-2.5 ${i < 6 ? 'border-b border-border' : ''}`}>
                  <span className="text-[11px] font-bold text-muted-foreground w-4 text-center">{i + 1}</span>
                  <span className="flex-1 text-[13px] font-medium text-foreground">{cat.name}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[13px] font-bold text-foreground w-7 text-right">{cat.count}</span>
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-[14px] font-bold text-foreground">Channel Distribution</h2>
            <button onClick={() => navigate('trends')} className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1">Full Report <ArrowRight className="h-3 w-3" /></button>
          </div>
          <div className="p-5 pt-4 flex flex-col gap-3.5">
            {channels.channels.map((ch) => (
              <div key={ch.name}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs font-medium text-foreground/80"><ChannelLabel channel={ch.name} /></span>
                  <span className="text-xs font-bold text-foreground">{ch.percentage}%</span>
                </div>
                <Progress value={ch.percentage} className="h-2" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Complaints Table */}
      <Card className="bg-card border-border shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-[14px] font-bold text-foreground">Recent Complaints</h2>
          <button onClick={() => navigate('complaints')} className="text-[11px] font-semibold text-primary hover:underline">View All</button>
        </div>
        <div className="p-4">
          <DataTable
            columns={columns}
            data={tableData}
            enablePagination={false}
            searchColumn="id"
            searchPlaceholder="Search complaints..."
            filterColumns={['status', 'sla']}
            className="[&_table]:text-[11px]"
          />
        </div>
      </Card>
    </div>
  )
}

function ComplianceDashboard({ kpis, recent, navigate }: { kpis: DashboardKpis; recent: Complaint[]; navigate: (route: RoutePath, params?: Record<string, string>) => void }) {
  const regulatoryComplaints = recent.filter(c => c.regulatory_flag)
  const breachedComplaints = recent.filter(c => c.sla_breached)

  const regColumns = useRegulatoryColumns(navigate)
  const regTableData = useMemo(() => regulatoryComplaints.map((c) => ({
    id: String(c.id).slice(0, 8),
    fullId: String(c.id),
    obligation: c.regulatory_obligation ?? 'REGULATORY',
    issue: c.raw_text,
    age: getTimeAgo(c.created_at),
    status: c.status.replace('_', ' '),
    statusBg: statusColors[c.status]?.bg ?? 'hsl(var(--muted))',
    statusText: statusColors[c.status]?.text ?? 'hsl(var(--muted-foreground))',
  })), [regulatoryComplaints, navigate])

  return (
    <div className="flex flex-col gap-5">
      {/* Quick Access */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-foreground">Quick Access</h2>
          <button type="button" className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <QuickAccessCard
            title="Regulatory Flagged"
            subtitle={`${kpis.regulatory_flagged} active`}
            icon={<ShieldAlert className="h-5 w-5" />}
            color="hsl(var(--destructive))"
            onClick={() => navigate('regulatory')}
          />
          <QuickAccessCard
            title="SLA Breached"
            subtitle={`${kpis.breached} breached`}
            icon={<AlertTriangle className="h-5 w-5" />}
            color="hsl(var(--warning))"
            onClick={() => navigate('sla-breaches')}
          />
          <QuickAccessCard
            title="Escalated Cases"
            subtitle={`${kpis.escalated} need review`}
            icon={<ArrowRight className="h-5 w-5" />}
            color="hsl(var(--primary))"
            onClick={() => navigate('regulatory')}
          />
          <QuickAccessCard
            title="Root Cause"
            subtitle="Investigate patterns"
            icon={<TrendingUp className="h-5 w-5" />}
            color="hsl(var(--primary))"
            onClick={() => navigate('root-cause')}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Regulatory Flagged" value={kpis.regulatory_flagged} icon={<ShieldAlert className="h-5 w-5" />} color="hsl(var(--destructive))" subtitle="RBI/FEMA/Agency" />
        <KpiCard label="SLA Breached" value={kpis.breached} icon={<AlertTriangle className="h-5 w-5" />} color="hsl(var(--warning))" subtitle="Missed deadlines" />
        <KpiCard label="Total Escalated" value={kpis.escalated} icon={<ArrowRight className="h-5 w-5" />} color="hsl(var(--primary))" subtitle="Needs review" />
        <KpiCard label="Avg Resolution" value={`${kpis.avg_resolution_hours}h`} icon={<Clock className="h-5 w-5" />} color="hsl(var(--primary))" subtitle="Time to close" />
      </div>

      {/* Regulatory Complaints + Compliance Overview */}
      <div className="grid grid-cols-[1fr_360px] gap-5 items-start">
        <Card className="bg-card border-border shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-[14px] font-bold text-foreground">Regulatory Complaints</h2>
            <Badge variant="destructive" className="text-[11px] font-semibold">{kpis.regulatory_flagged} active</Badge>
          </div>
          <div className="p-4">
            {regulatoryComplaints.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-[13px]">No regulatory-flagged complaints.</div>
            ) : (
              <DataTable
                columns={regColumns}
                data={regTableData}
                enablePagination={false}
                searchColumn="id"
                searchPlaceholder="Search regulatory complaints..."
                filterColumns={['status']}
                className="[&_table]:text-[11px]"
              />
            )}
          </div>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-[14px] font-bold text-foreground">Compliance Overview</h2>
          </div>
          <div className="p-5 pt-4 flex flex-col gap-3">
            {[
              { label: 'Total Breached SLA', value: kpis.breached, color: 'hsl(var(--warning))' },
              { label: 'SLA at Risk', value: kpis.sla_at_risk, color: 'hsl(var(--warning))' },
              { label: 'Escalated Cases', value: kpis.escalated, color: 'hsl(var(--destructive))' },
              { label: 'Resolution Rate', value: `${kpis.resolution_rate}%`, color: 'hsl(var(--success))' },
            ].map((stat) => (
              <div key={stat.label} className="flex justify-between items-center p-3 rounded-xl bg-muted/60">
                <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
                <span className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</span>
              </div>
            ))}
            <div className="mt-3 flex flex-col gap-2">
              <button onClick={() => navigate('regulatory')} className="py-2.5 px-3.5 rounded-xl bg-primary/8 border border-primary/15 text-xs font-semibold text-primary text-center hover:bg-primary/12 transition-colors">View Regulatory Reports</button>
              <button onClick={() => navigate('sla-breaches')} className="py-2.5 px-3.5 rounded-xl bg-warning/8 border border-warning/15 text-xs font-semibold text-warning text-center hover:bg-warning/12 transition-colors">View SLA Breaches</button>
              <button onClick={() => navigate('root-cause')} className="py-2.5 px-3.5 rounded-xl bg-muted/60 border border-border text-xs font-semibold text-foreground/80 text-center hover:bg-muted transition-colors">Root Cause Analysis</button>
            </div>
            {breachedComplaints.length > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-destructive/8 border border-destructive/15">
                <div className="text-[11px] font-bold text-destructive mb-1.5 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {breachedComplaints.length} SLA-Breached Complaints</div>
                <div className="text-[11px] text-muted-foreground leading-relaxed">
                  These complaints have breached their regulatory SLA deadlines. Immediate action required.
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const { navigate } = useRouter()
  const role = user?.role ?? 'AGENT'
  const [kpis, setKpis] = useState<DashboardKpis | null>(null)
  const [categories, setCategories] = useState<CategoryBreakdown | null>(null)
  const [channels, setChannels] = useState<ChannelDistribution | null>(null)
  const [recent, setRecent] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const tabs = role === 'AGENT' ? AGENT_TABS : role === 'SUPERVISOR' ? SUPERVISOR_TABS : COMPLIANCE_TABS

  useEffect(() => {
    async function load() {
      try {
        const isAgent = role === 'AGENT'
        const [kpiData, catData, chData, queueData] = await Promise.all([
          api.getKpis(),
          api.getCategories(),
          api.getChannels(),
          isAgent ? api.getMyQueue(20) : api.getRecentComplaints(20),
        ])
        setKpis(kpiData)
        setCategories(catData)
        setChannels(chData)
        setRecent(queueData.complaints)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [role])

  if (loading) {
    return (
      <DashboardShell activeItem="Dashboard" tabs={tabs} activeTab="Dashboard">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSkeleton />
        </div>
      </DashboardShell>
    )
  }

  if (error || !kpis) {
    return (
      <DashboardShell activeItem="Dashboard" tabs={tabs} activeTab="Dashboard">
        <div className="flex items-center justify-center min-h-[400px] text-destructive text-sm">
          {error || 'No data available.'}
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell
      activeItem="Dashboard"
      tabs={tabs}
      activeTab="Dashboard"
      breadcrumb={
        <AppBreadcrumb
          current={role === 'AGENT' ? 'Agent Dashboard' : role === 'SUPERVISOR' ? 'Supervisor Command Center' : 'Compliance Control Center'}
          meta={
            <Badge variant="outline" className="text-[10px] font-bold uppercase px-2 py-0 ml-2" style={{
              backgroundColor: role === 'SUPERVISOR' ? 'hsl(var(--primary) / 0.1)' : role === 'COMPLIANCE' ? 'hsl(var(--destructive) / 0.1)' : 'hsl(var(--success) / 0.1)',
              color: role === 'SUPERVISOR' ? 'hsl(var(--primary))' : role === 'COMPLIANCE' ? 'hsl(var(--destructive))' : 'hsl(var(--success))',
              borderColor: 'transparent'
            }}>
              {role}
            </Badge>
          }
        />
      }
    >
      <div className="p-5">
        {role === 'AGENT' && <AgentDashboard kpis={kpis} recent={recent} navigate={navigate} />}
        {role === 'SUPERVISOR' && categories && channels && <SupervisorDashboard kpis={kpis} categories={categories} channels={channels} recent={recent} navigate={navigate} />}
        {role === 'COMPLIANCE' && <ComplianceDashboard kpis={kpis} recent={recent} navigate={navigate} />}
      </div>
    </DashboardShell>
  )
}
