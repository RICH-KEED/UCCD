'use client'

import { useState, useEffect, useMemo, useCallback, type ReactNode } from 'react'
import { useRouter } from '@/hooks/use-router'
import { api } from '@/lib/api-client'
import { useAuth } from '@/hooks/use-auth'
import type { Complaint } from '@/types/complaint'
import { DashboardShell } from '@/components/dashboard-shell'
import type { ShellTab } from '@/components/dashboard-shell'
import { AppBreadcrumb } from '@/components/app-breadcrumb'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DataTable, multiColumnFilterFn, valueInArrayFilterFn } from '@/components/ui/data-table'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { toast } from '@/hooks/use-toast'
import { LayoutGrid, Plus, MoreHorizontal, Eye, MessageSquare, Sparkles, Send, RotateCcw, AlertTriangle, Mail, Smartphone, Globe2, Phone, Building2 } from 'lucide-react'
import { Label } from '@/components/ui/label'

const severityColors: Record<string, { bg: string; text: string }> = {
  Critical: { bg: 'color-mix(in oklch, var(--destructive) 12%, transparent)', text: 'var(--destructive)' },
  High: { bg: 'color-mix(in oklch, var(--warning) 16%, transparent)', text: 'var(--warning)' },
  Medium: { bg: 'color-mix(in oklch, var(--caution) 16%, transparent)', text: 'var(--caution)' },
  Low: { bg: 'color-mix(in oklch, var(--success) 12%, transparent)', text: 'var(--success)' },
}

const statusColors: Record<string, { bg: string; text: string }> = {
  Open: { bg: 'color-mix(in oklch, var(--primary) 12%, transparent)', text: 'var(--primary)' },
  'In Progress': { bg: 'color-mix(in oklch, var(--warning) 16%, transparent)', text: 'var(--warning)' },
  Escalated: { bg: 'color-mix(in oklch, var(--destructive) 12%, transparent)', text: 'var(--destructive)' },
  Resolved: { bg: 'color-mix(in oklch, var(--success) 12%, transparent)', text: 'var(--success)' },
}

function ChannelIcon({ channel, className = 'h-3.5 w-3.5' }: { channel: string; className?: string }) {
  const key = channel.toLowerCase()
  const Icon =
    key.includes('email') ? Mail :
      key.includes('app') || key.includes('sms') ? Smartphone :
        key.includes('web') ? Globe2 :
          key.includes('phone') || key.includes('ivr') ? Phone :
            key.includes('branch') ? Building2 :
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

function DrawerHeaderBlock({ row, title }: { row: MappedComplaint; title: string }) {
  return (
    <SheetHeader className="border-b bg-card/80 p-5 pr-12">
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-mono">{row.ticketId}</span>
        <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
        <ChannelLabel channel={row.channel} />
      </div>
      <SheetTitle className="flex flex-wrap items-center gap-2 text-lg">
        <span>{title}</span>
        <span className="font-mono text-sm text-muted-foreground">{row.id}</span>
        <Badge
          variant="outline"
          className="rounded-full px-2 py-0 text-[10px]"
          style={{
            color: severityColors[row.severity].text,
            backgroundColor: severityColors[row.severity].bg,
            borderColor: 'transparent',
          }}
        >
          {row.severity}
        </Badge>
      </SheetTitle>
    </SheetHeader>
  )
}

function InfoTile({ label, value, className = '' }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border bg-card px-3 py-2.5 ${className}`}>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="min-w-0 break-words text-sm font-medium text-foreground">{value}</div>
    </div>
  )
}

function DrawerSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border bg-card p-4">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}

function DuplicateNotice({ count, detailed = false }: { count: number; detailed?: boolean }) {
  if (count <= 0) return null

  return (
    <div className="flex items-start gap-3 rounded-lg border border-warning/25 bg-warning-muted p-3 text-warning">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <div className="text-sm font-semibold">{count} similar complaints detected</div>
        <p className="mt-1 text-xs leading-relaxed text-warning/80">
          {detailed
            ? 'Same product, channel, and issue pattern. Consider escalating as a cluster.'
            : 'Consider cluster escalation for related issues.'}
        </p>
      </div>
    </div>
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

interface MappedComplaint {
  id: string
  fullId: string
  severity: string
  customer: string
  accountType: string
  summary: string
  product: string
  channel: string
  sentiment: string
  assignedTo: string
  assignedAvatar: string
  slaPercent: number
  slaColor: string
  slaLabel: string
  status: string
  rawIssue: string
  lastMessage: string
  duplicates: number
  ticketId: string
}

function mapComplaint(c: Complaint): MappedComplaint {
  const slaDeadline = c.sla_deadline ? new Date(c.sla_deadline).getTime() : Date.now() + 28800000
  const slaTotalSeconds = c.sla_tier === 'HIGH' || c.sla_tier === 'REGULATORY' ? 14400 : 28800
  const slaRemaining = c.sla_breached ? 0 : Math.max(0, Math.round((slaDeadline - Date.now()) / 1000))
  const slaConsumedPercent = Math.min(100, Math.max(0, Math.round(((slaTotalSeconds - slaRemaining) / slaTotalSeconds) * 100)))

  let slaColor: string
  if (c.sla_breached || slaConsumedPercent > 90) slaColor = 'var(--destructive)'
  else if (slaConsumedPercent > 60) slaColor = 'var(--warning)'
  else if (slaConsumedPercent > 30) slaColor = 'var(--caution)'
  else slaColor = 'var(--success)'

  let slaLabel: string
  if (c.sla_breached) slaLabel = 'Overdue'
  else if (slaRemaining < 3600) slaLabel = `${Math.round(slaRemaining / 60)}m left`
  else slaLabel = `${Math.round(slaRemaining / 3600)}h left`

  const priority = c.priority_tier ?? 99
  const severity: string = c.sla_breached && priority <= 2 ? 'Critical'
    : priority <= 2 ? 'High'
    : priority === 3 ? 'Medium'
    : 'Low'

  const statusDisplay: string =
    c.status === 'queued' || c.status === 'new' ? 'Open'
    : c.status === 'in_progress' ? 'In Progress'
    : c.status === 'escalated' ? 'Escalated'
    : c.status === 'resolved' ? 'Resolved'
    : 'Open'

  let sentiment = 'Neutral'
  if (c.emotion_arc && typeof c.emotion_arc === 'object' && !Array.isArray(c.emotion_arc)) {
    const arc = c.emotion_arc as Record<string, unknown>
    sentiment = typeof arc.current === 'string' ? arc.current
      : typeof arc.initial === 'string' ? arc.initial
      : 'Neutral'
  }

  const channelFormatted = c.channel.charAt(0).toUpperCase() + c.channel.slice(1)
  const summary = (c.raw_text ?? '')
  const assigned = c.assigned_to ?? 'Unassigned'
  const avatar = assigned.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((s) => s.charAt(0).toUpperCase()).join('')

  return {
    id: String(c.id).slice(0, 8),
    fullId: String(c.id),
    severity,
    customer: c.customer_name ?? c.customer_id,
    accountType: c.account_number ?? '',
    summary,
    product: c.product_code ?? c.complaint_type ?? 'Unknown',
    channel: channelFormatted,
    sentiment,
    assignedTo: assigned,
    assignedAvatar: avatar,
    slaPercent: slaConsumedPercent,
    slaColor,
    slaLabel,
    status: statusDisplay,
    rawIssue: summary,
    lastMessage: c.ai_draft ?? '',
    duplicates: c.cluster_id ? 1 : 0,
    ticketId: c.source_ref ?? `TXN-${String(c.id).slice(0, 6)}`,
  }
}

export function ComplaintsPage({ defaultSearch = '', sidebarActiveItem }: { defaultSearch?: string; sidebarActiveItem?: string }) {
  const { navigate } = useRouter()
  const { user } = useAuth()

  const [quickViewRow, setQuickViewRow] = useState<MappedComplaint | null>(null)
  const [drawerRow, setDrawerRow] = useState<MappedComplaint | null>(null)
  const [complaints, setComplaints] = useState<MappedComplaint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [replyDraft, setReplyDraft] = useState('')
  const [selectedRows, setSelectedRows] = useState<Row<MappedComplaint>[]>([])
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [assignDepartment, setAssignDepartment] = useState('auto_detect')
  const [assigning, setAssigning] = useState(false)
  const [departments, setDepartments] = useState<string[]>([])

  const role = user?.role ?? 'AGENT'
  const tabs = role === 'AGENT' ? AGENT_TABS : SUPERVISOR_TABS
  const activeItem = sidebarActiveItem ?? (role === 'AGENT' ? 'My Queue' : 'All Complaints')
  const activeTab = sidebarActiveItem === 'Search' ? 'Search' : (role === 'AGENT' ? 'My Queue' : 'Complaints')

  useEffect(() => {
    let cancelled = false
    async function fetchComplaints() {
      setLoading(true)
      setError(null)
      try {
        const filters: Record<string, unknown> = { limit: 100 }
        if (activeItem === 'My Queue' && user?.email) {
          filters.assigned_to = user.email
        }
        const response = await api.listComplaints(filters)
        if (cancelled) return
        setComplaints(response.complaints.map(mapComplaint))
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load complaints')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchComplaints()
    return () => { cancelled = true }
  }, [activeItem, user?.email])

  useEffect(() => {
    api.listDepartments().then((res) => setDepartments(res.departments || [])).catch(() => setDepartments([]))
  }, [])

  const handleAssign = async () => {
    const ids = selectedRows.map((r) => r.original.fullId)
    if (ids.length === 0) return
    setAssigning(true)
    try {
      const dept = assignDepartment === 'auto_detect' || !assignDepartment ? undefined : assignDepartment
      const result = await api.autoAssign(ids, dept)
      toast({
        title: 'Assignment complete',
        description: `${result.assigned} assigned, ${result.failed} failed.`,
      })
      setSelectedRows([])
      setAssignDialogOpen(false)
      if (result.assigned > 0) {
        const response = await api.listComplaints(
          activeItem === 'My Queue' && user?.email ? { limit: 100, assigned_to: user.email } : { limit: 100 }
        )
        setComplaints(response.complaints.map(mapComplaint))
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Assign failed', description: err instanceof Error ? err.message : 'Unknown error' })
    } finally {
      setAssigning(false)
    }
  }

  const openQuickView = useCallback((row: MappedComplaint) => {
    setQuickViewRow(row)
    setReplyDraft('')
  }, [])

  const columns: ColumnDef<MappedComplaint>[] = useMemo(() => [
    {
      accessorKey: 'id',
      header: 'ID · Severity',
      size: 160,
      cell: ({ getValue, row }) => {
        const sev = severityColors[row.original.severity]
        return (
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => navigate('complaint-detail', { id: row.original.fullId })}
              className="cursor-pointer whitespace-nowrap font-mono text-[11px] font-semibold text-primary hover:underline text-left"
            >
              {getValue() as string}
            </button>
            <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0" style={{ color: sev.text, backgroundColor: sev.bg, borderColor: 'transparent' }}>
              {row.original.severity}
            </Badge>
          </div>
        )
      },
      filterFn: multiColumnFilterFn,
    },
    {
      accessorKey: 'customer',
      header: 'Customer',
      size: 140,
      cell: ({ getValue, row }) => (
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => navigate('complaint-detail', { id: row.original.fullId })}
            className="cursor-pointer text-xs font-semibold text-foreground hover:text-primary text-left"
          >
            {getValue() as string}
          </button>
          <div className="text-[10px] text-muted-foreground">{row.original.accountType}</div>
        </div>
      ),
    },
    {
      accessorKey: 'summary',
      header: 'Issue Summary',
      size: 200,
      cell: ({ getValue, row }) => (
        <button
          type="button"
          onClick={() => navigate('complaint-detail', { id: row.original.fullId })}
          className="max-w-[180px] cursor-pointer truncate text-xs text-foreground/80 hover:text-primary text-left"
        >
          {getValue() as string}
        </button>
      ),
    },
    {
      accessorKey: 'product',
      header: 'Product',
      size: 100,
      cell: ({ getValue }) => <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">{getValue() as string}</span>,
      filterFn: valueInArrayFilterFn,
    },
    {
      accessorKey: 'channel',
      header: 'Channel',
      size: 80,
      cell: ({ getValue, row }) => (
        <span className="text-[11px] text-muted-foreground">
          <ChannelLabel channel={row.original.channel || getValue() as string} />
        </span>
      ),
      filterFn: valueInArrayFilterFn,
    },
    {
      accessorKey: 'assignedTo',
      header: 'Assigned',
      size: 120,
      cell: ({ getValue, row }) => (
        <span className="flex items-center gap-1.5">
          <span className="w-[22px] h-[22px] rounded-full bg-primary/8 border border-primary/15 text-primary flex items-center justify-center text-[9px] font-bold flex-shrink-0">
            {row.original.assignedAvatar}
          </span>
          <span className="text-[11px] text-muted-foreground">{getValue() as string}</span>
        </span>
      ),
    },
    {
      accessorKey: 'slaPercent',
      header: 'SLA',
      size: 100,
      cell: ({ row }) => (
        <div>
          <div className="h-[5px] rounded bg-muted/30 overflow-hidden">
            <div className="h-full rounded" style={{ width: `${row.original.slaPercent}%`, background: row.original.slaColor }} />
          </div>
          <div className="text-[9px] font-bold mt-0.5" style={{ color: row.original.slaColor }}>{row.original.slaLabel}</div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 100,
      cell: ({ getValue, row }) => {
        const st = statusColors[row.original.status]
        return (
          <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0" style={{ color: st.text, backgroundColor: st.bg, borderColor: 'transparent' }}>
            {getValue() as string}
          </Badge>
        )
      },
      filterFn: valueInArrayFilterFn,
    },
    {
      accessorKey: 'severity',
      header: 'Severity',
      size: 80,
      cell: ({ getValue }) => {
        const sev = severityColors[getValue() as string]
        return (
          <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0" style={{ color: sev?.text, backgroundColor: sev?.bg, borderColor: 'transparent' }}>
            {getValue() as string}
          </Badge>
        )
      },
      filterFn: valueInArrayFilterFn,
    },
    {
      id: 'actions',
      header: 'Actions',
      size: 60,
      cell: ({ row }) => (
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
            <DropdownMenuItem onClick={() => navigate('complaint-detail', { id: row.original.fullId })}>
              <Eye className="h-4 w-4 mr-2" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openQuickView(row.original)}>
              <LayoutGrid className="h-4 w-4 mr-2" /> Quick View & Reply
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [navigate, openQuickView, statusColors])

  const handleSelectionChange = useCallback((rows: Row<MappedComplaint>[]) => {
    setSelectedRows(rows)
  }, [])

  const bulkActions = selectedRows.length > 0 ? (
    <div className="flex gap-1.5 items-center">
      <span className="text-[11px] font-semibold text-primary flex items-center pr-1.5">{selectedRows.length} selected</span>
      <Button
        variant="outline"
        size="sm"
        className="text-[11px] font-semibold h-7"
        onClick={() => setAssignDialogOpen(true)}
        disabled={assigning}
      >
        Assign
      </Button>
      <Button variant="outline" size="sm" className="text-[11px] font-semibold h-7" onClick={() => setSelectedRows([])}>Escalate</Button>
      <Button variant="outline" size="sm" className="text-[11px] font-semibold h-7" onClick={() => setSelectedRows([])}>Resolve</Button>
      <Button variant="outline" size="sm" className="text-[11px] font-semibold h-7" onClick={() => setSelectedRows([])}>Export</Button>
    </div>
  ) : null

  return (
    <DashboardShell
      activeItem={activeItem}
      tabs={tabs}
      activeTab={activeTab}
      searchPlaceholder="Search ID, customer, issue, product…"
      breadcrumb={
        <AppBreadcrumb
          current={sidebarActiveItem === 'Search' ? 'Search Complaints' : (role === 'AGENT' ? 'My Queue' : 'All Complaints')}
          meta={`${complaints.length} complaints`}
          actions={
            <Button size="sm" className="h-8 gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add New
            </Button>
          }
        />
      }
    >
      <div className="p-5">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16 gap-3">
            <div className="w-5 h-5 rounded-full border-[3px] border-muted/60 border-t-primary animate-spin" />
            <span className="text-[13px] text-muted-foreground font-medium">Loading complaints...</span>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="p-4 bg-destructive/8 border border-destructive/15 rounded-lg flex items-center gap-2.5">
            <div>
              <div className="text-[13px] font-semibold text-destructive mb-0.5">Failed to load complaints</div>
              <div className="text-xs text-destructive">{error}</div>
            </div>
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => window.location.reload()}>Retry</Button>
          </div>
        )}

        {/* Table */}
        {!loading && !error && (
          <DataTable
            columns={columns}
            data={complaints}
            enableRowSelection={true}
            enablePagination={true}
            defaultPageSize={10}
            defaultSorting={[{ id: 'slaPercent', desc: false }]}
            searchColumn="id"
            searchPlaceholder="Search complaints..."
            filterColumns={['status', 'severity', 'channel', 'product']}
            onSelectionChange={handleSelectionChange}
            toolbarRight={bulkActions}
            defaultColumnVisibility={{ severity: false }}
            className="[&_table]:text-[11px]"
          />
        )}
      </div>

      {/* Quick View & Reply Sheet */}
      <Sheet open={!!quickViewRow} onOpenChange={() => { setQuickViewRow(null); setReplyDraft('') }}>
        <SheetContent className="w-[min(100vw,540px)] gap-0 overflow-hidden border-l bg-background p-0 sm:max-w-[540px]">
          {quickViewRow && (
            <>
              <DrawerHeaderBlock row={quickViewRow} title="Quick View & Reply" />
              <div className="dashboard-scrollbar flex-1 space-y-4 overflow-y-auto px-5 py-5">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Customer', value: quickViewRow.customer },
                    { label: 'Account', value: quickViewRow.accountType || '—' },
                    { label: 'Product', value: quickViewRow.product },
                    { label: 'Channel', value: <ChannelLabel channel={quickViewRow.channel} /> },
                    { label: 'Assigned To', value: quickViewRow.assignedTo },
                    { label: 'Status', value: quickViewRow.status },
                  ].map(({ label, value }) => (
                    <InfoTile key={label} label={label} value={value} />
                  ))}
                </div>

                <DrawerSection title="AI Key Issue Extraction">
                  <p className="text-sm leading-relaxed text-foreground/85">{quickViewRow.rawIssue}</p>
                </DrawerSection>

                {quickViewRow.lastMessage && (
                  <DrawerSection title="Last Message">
                    <p className="text-sm leading-relaxed text-muted-foreground">{quickViewRow.lastMessage}</p>
                  </DrawerSection>
                )}

                {/* Similar Complaints Warning */}
                {quickViewRow.duplicates > 0 && (
                  <div className="flex items-start gap-3 rounded-lg border border-warning/25 bg-warning-muted p-3 text-warning">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-warning mb-0.5">{quickViewRow.duplicates} similar complaints detected</div>
                      <div className="text-[11px] text-warning/80 leading-relaxed">Consider cluster escalation for related issues.</div>
                    </div>
                  </div>
                )}

                <section className="overflow-hidden rounded-lg border bg-card">
                  <div className="flex items-center gap-2 border-b bg-primary/5 px-4 py-3">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-primary">AI-Drafted Reply</span>
                  </div>
                  <div className="p-4">
                    <Textarea
                      value={replyDraft || `Dear Customer, we understand your concern regarding ${quickViewRow.summary.toLowerCase()}. Our team is actively working on resolving this. Your complaint has been prioritized and the reference number is ${quickViewRow.id}. We will update you within the next 4 hours via ${quickViewRow.channel}.`}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      rows={5}
                      className="mb-3 min-h-36 w-full resize-none rounded-lg border-border bg-background text-sm leading-relaxed text-foreground"
                    />
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button size="sm" variant="outline">
                        Edit
                      </Button>
                      <Button size="sm" variant="secondary" className="gap-1.5">
                        <RotateCcw className="h-3.5 w-3.5" /> Regenerate
                      </Button>
                      <Button size="sm" className="gap-1.5">
                        <Send className="h-3.5 w-3.5" /> Send
                      </Button>
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Reply Sheet (Redesigned) */}
      <Sheet open={!!drawerRow} onOpenChange={() => { setDrawerRow(null); setReplyDraft('') }}>
        <SheetContent className="w-[min(100vw,540px)] gap-0 overflow-hidden border-l bg-background p-0 sm:max-w-[540px]">
          {drawerRow && (
            <>
              <DrawerHeaderBlock row={drawerRow} title="Reply" />

              <div className="dashboard-scrollbar flex-1 space-y-4 overflow-y-auto px-5 py-5">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Customer', value: drawerRow.customer },
                    { label: 'Account', value: drawerRow.accountType || '—' },
                    { label: 'Product', value: drawerRow.product },
                    { label: 'Channel', value: <ChannelLabel channel={drawerRow.channel} /> },
                    { label: 'Assigned To', value: drawerRow.assignedTo },
                    { label: 'Status', value: drawerRow.status },
                  ].map(({ label, value }) => (
                    <InfoTile key={label} label={label} value={value} />
                  ))}
                </div>

                <DrawerSection title="Full Issue">
                  <p className="text-sm leading-relaxed text-foreground/85">{drawerRow.rawIssue}</p>
                </DrawerSection>

                <DuplicateNotice count={drawerRow.duplicates} detailed />

                {/* AI-Drafted Reply */}
                <section className="overflow-hidden rounded-lg border bg-card">
                  <div className="flex items-center gap-2 border-b bg-primary/5 px-4 py-3">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-primary">AI-Drafted Reply</span>
                  </div>
                  <div className="p-4">
                    <Textarea
                      value={replyDraft || `Dear Customer, we understand your concern regarding ${drawerRow.summary.toLowerCase()}. Our team is actively working on resolving this. Your complaint has been prioritized and the reference number is ${drawerRow.id}. We will update you within the next 4 hours via ${drawerRow.channel}.`}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      rows={5}
                      className="mb-3 min-h-36 w-full resize-none rounded-lg border-border bg-background text-sm leading-relaxed text-foreground"
                    />
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button size="sm" variant="outline">
                        Edit
                      </Button>
                      <Button size="sm" variant="secondary" className="gap-1.5">
                        <RotateCcw className="h-3.5 w-3.5" /> Regenerate
                      </Button>
                      <Button size="sm" className="gap-1.5">
                        <Send className="h-3.5 w-3.5" /> Send
                      </Button>
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign {selectedRows.length} complaint{selectedRows.length !== 1 ? 's' : ''}</DialogTitle>
            <DialogDescription className="sr-only">
              Assign the selected complaints to a department or let AI auto-assign them.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-medium">Department (optional)</Label>
              <Select value={assignDepartment} onValueChange={setAssignDepartment}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Auto-detect from complaint type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto_detect">Auto-detect</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                AI will find the least-loaded agent in the selected department.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={assigning}>
              {assigning ? 'Assigning...' : 'Auto Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardShell>
  )
}
