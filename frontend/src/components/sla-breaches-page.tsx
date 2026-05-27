'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from '@/hooks/use-router'
import { api } from '@/lib/api-client'
import { useAuth } from '@/hooks/use-auth'
import type { Complaint, DashboardKpis, TrendPoint } from '@/types/complaint'
import { DashboardShell } from '@/components/dashboard-shell'
import type { ShellTab } from '@/components/dashboard-shell'
import { AppBreadcrumb } from '@/components/app-breadcrumb'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DataTable, multiColumnFilterFn, valueInArrayFilterFn } from '@/components/ui/data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ExternalLink, Loader2, ShieldAlert, MoreHorizontal, Eye, AlertTriangle } from 'lucide-react'
import { HoverText } from '@/components/ui/hover-text'
import { toast } from '@/hooks/use-toast'

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

function computeSlaInfo(c: Complaint) {
  const now = Date.now()
  const created = new Date(c.created_at).getTime()
  const deadline = c.sla_deadline ? new Date(c.sla_deadline).getTime() : null
  const totalWindow = deadline ? deadline - created : 0
  const elapsed = now - created
  const slaPercent = totalWindow > 0 ? Math.min(100, Math.round((elapsed / totalWindow) * 100)) : 0
  const slaColor = slaPercent >= 90 ? 'hsl(var(--destructive))' : slaPercent >= 70 ? 'hsl(var(--warning))' : slaPercent >= 50 ? 'hsl(var(--caution))' : 'hsl(var(--success))'
  const timeLeftMs = deadline ? deadline - now : 0
  const timeLeftMin = Math.max(0, Math.ceil(timeLeftMs / 60000))
  const hoursLeft = Math.ceil(timeLeftMin / 60)
  const timeLabel = c.sla_breached ? 'Breached' : timeLeftMin < 60 ? `${timeLeftMin}m left` : `${hoursLeft}h left`
  let slaStatus = 'ON TRACK'
  if (c.sla_breached) slaStatus = 'BREACHED'
  else if (slaPercent >= 95) slaStatus = 'BREACH IMMINENT'
  else if (slaPercent >= 75) slaStatus = 'AT RISK'
  else if (slaPercent >= 50) slaStatus = 'WATCHING'
  return { slaPercent, slaColor, timeLabel, slaStatus, timeLeftMin }
}

function getInitials(assigned: string | null | undefined) {
  if (!assigned) return '??'
  return (assigned.split(/[@.]/)[0] || assigned).slice(0, 2).toUpperCase()
}

interface BreachRow { id: string; complaint: Complaint; priority: string; customer: string; issue: string; slaPercent: number; slaColor: string; timeLabel: string; assigned: string; escalation: string; slaStatus: string; timeLeftMin: number }

function makeBreachRow(c: Complaint): BreachRow {
  const info = computeSlaInfo(c)
  return { id: String(c.id).slice(0, 8), complaint: c, priority: c.sla_tier || (c.priority_tier !== undefined ? `T${c.priority_tier}` : 'Medium'), customer: c.customer_id, issue: c.raw_text || '', slaPercent: info.slaPercent, slaColor: info.slaColor, timeLabel: info.timeLabel, timeLeftMin: info.timeLeftMin, assigned: getInitials(c.assigned_to), escalation: c.status === 'escalated' ? 'Auto Escalated' : 'Manual Review', slaStatus: info.slaStatus }
}

function KpiCard({ title, value, badge, badgeBg, badgeColor }: { title: string; value: string; badge: string; badgeBg: string; badgeColor: string }) {
  return (
    <Card className="h-[150px] flex flex-col justify-between box-border bg-card border-border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-7">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-[.4px]">{title}</div>
        <div className="text-[36px] font-bold text-foreground leading-none">{value}</div>
        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg inline-block w-fit" style={{ background: badgeBg, color: badgeColor }}>{badge}</span>
      </CardContent>
    </Card>
  )
}

export function SlaBreachesPage() {
  const { user } = useAuth()
  const { navigate } = useRouter()
  const [breaches, setBreaches] = useState<BreachRow[]>([])
  const [kpis, setKpis] = useState<DashboardKpis | null>(null)
  const [trends, setTrends] = useState<TrendPoint[]>([])
  const [riskCategories, setRiskCategories] = useState<{ name: string; pct: number; color: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState('')

  const tabs = user?.role === 'COMPLIANCE' ? COMPLIANCE_TABS : SUPERVISOR_TABS
  const catColors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--destructive))']

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [complaintsRes, kpisRes, trendsRes] = await Promise.all([api.listComplaints({ sla_breached: true, limit: 50 }), api.getKpis(), api.getTrends(7)])
      const rows = (complaintsRes.complaints || []).map(makeBreachRow)
      setBreaches(rows); if (rows.length > 0) setSelectedId(rows[0].id)
      setKpis(kpisRes)
      setTrends([...(trendsRes.daily_volume || [])].sort((a, b) => a.date.localeCompare(b.date)))
      const typeCounts: Record<string, number> = {}
      rows.forEach((r) => { const key = r.priority || 'Other'; typeCounts[key] = (typeCounts[key] || 0) + 1 })
      const total = rows.length || 1
      setRiskCategories(Object.entries(typeCounts).sort(([, a], [, b]) => b - a).slice(0, 8).map(([name, count], i) => ({ name, pct: Math.round((count / total) * 100), color: catColors[i % catColors.length] })))
    } catch (err) { setError(err instanceof Error ? err.message : 'An unknown error occurred') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const selectedRow = breaches.find((b) => b.id === selectedId) ?? breaches[0]
  const kv = (v: number | undefined) => String(v ?? 0)
  const handleEscalate = useCallback(async (complaintId: string) => {
    try {
      await api.updateStatus(complaintId, 'escalated')
      toast({ title: 'Complaint escalated', description: 'The complaint status was updated to escalated.' })
      fetchData()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Escalation failed', description: err instanceof Error ? err.message : 'The complaint could not be escalated.' })
    }
  }, [fetchData])

  const columns: ColumnDef<BreachRow>[] = useMemo(() => [
    {
      accessorKey: 'id',
      header: 'ID',
      size: 100,
      cell: ({ getValue, row }) => (
        <HoverText
          text={getValue() as string}
          fullText={row.original.complaint.id}
          className={`cursor-pointer font-mono text-xs font-semibold hover:text-primary ${selectedId === row.original.id ? 'text-primary' : 'text-muted-foreground'}`}
          onClick={() => setSelectedId(row.original.id)}
          actions={[
            { label: 'View details', icon: <ExternalLink className="h-3.5 w-3.5" />, onClick: () => navigate('complaint-detail', { id: row.original.complaint.id }) },
            { label: 'Escalate complaint', icon: <AlertTriangle className="h-3.5 w-3.5" />, onClick: () => { handleEscalate(row.original.complaint.id) } },
          ]}
        />
      ),
      filterFn: multiColumnFilterFn,
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      size: 80,
      cell: ({ getValue, row }) => {
        const sevColors: Record<string, { bg: string; text: string }> = { Critical: { bg: 'hsl(var(--destructive) / 0.1)', text: 'hsl(var(--destructive))' }, High: { bg: 'hsl(var(--warning) / 0.15)', text: 'hsl(var(--warning))' }, Medium: { bg: 'hsl(var(--caution) / 0.15)', text: 'hsl(var(--caution))' }, Low: { bg: 'hsl(var(--success) / 0.1)', text: 'hsl(var(--success))' } }
        const sev = sevColors[row.original.priority] ?? sevColors.Medium
        return <Badge variant="outline" className="text-[10px] font-bold w-fit" style={{ color: sev.text, backgroundColor: sev.bg, borderColor: 'transparent' }}>{getValue() as string}</Badge>
      },
      filterFn: valueInArrayFilterFn,
    },
    {
      accessorKey: 'customer',
      header: 'Customer',
      size: 120,
      cell: ({ getValue, row }) => (
        <HoverText
          text={getValue() as string}
          className="max-w-[110px] cursor-pointer text-xs font-medium text-foreground/80"
          onClick={() => setSelectedId(row.original.id)}
          actions={[
            { label: 'View details', icon: <Eye className="h-3.5 w-3.5" />, onClick: () => navigate('complaint-detail', { id: row.original.complaint.id }) },
            { label: 'Escalate complaint', icon: <AlertTriangle className="h-3.5 w-3.5" />, onClick: () => { handleEscalate(row.original.complaint.id) } },
          ]}
        />
      ),
    },
    {
      accessorKey: 'issue',
      header: 'Issue',
      size: 200,
      cell: ({ getValue, row }) => (
        <HoverText
          text={getValue() as string}
          className="max-w-[180px] text-xs text-foreground/80"
          actions={[
            { label: 'View details', icon: <Eye className="h-3.5 w-3.5" />, onClick: () => navigate('complaint-detail', { id: row.original.complaint.id }) },
            { label: 'Escalate complaint', icon: <AlertTriangle className="h-3.5 w-3.5" />, onClick: () => { handleEscalate(row.original.complaint.id) } },
          ]}
        />
      ),
    },
    {
      id: 'slaProgress',
      header: 'SLA Progress + Time',
      size: 100,
      accessorFn: (row) => row.slaPercent,
      cell: ({ row }) => (
        <div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden w-20">
            <div className="h-full rounded-full" style={{ width: `${row.original.slaPercent}%`, background: row.original.slaColor }} />
          </div>
          <div className="text-[10px] font-bold mt-0.5" style={{ color: row.original.slaColor }}>{row.original.timeLabel}</div>
        </div>
      ),
    },
    {
      accessorKey: 'assigned',
      header: 'Assigned',
      size: 60,
      cell: ({ getValue }) => (
        <span className="w-[26px] h-[26px] rounded-full bg-primary/8 border border-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">
          {getValue() as string}
        </span>
      ),
    },
    {
      accessorKey: 'escalation',
      header: 'Escalation',
      size: 130,
      cell: ({ getValue, row }) => (
        <HoverText
          text={getValue() as string}
          className="text-[11px] font-medium text-muted-foreground"
          actions={[
            { label: 'View details', icon: <Eye className="h-3.5 w-3.5" />, onClick: () => navigate('complaint-detail', { id: row.original.complaint.id }) },
            { label: 'Escalate complaint', icon: <AlertTriangle className="h-3.5 w-3.5" />, onClick: () => { handleEscalate(row.original.complaint.id) } },
          ]}
        />
      ),
      filterFn: valueInArrayFilterFn,
    },
    {
      accessorKey: 'slaStatus',
      header: 'SLA Status',
      size: 90,
      cell: ({ getValue, row }) => (
        <span className="text-[10px] font-bold" style={{ color: row.original.escalation === 'Auto Escalated' ? 'hsl(var(--success))' : 'hsl(var(--warning))' }}>
          {getValue() as string}
        </span>
      ),
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
            <DropdownMenuItem onClick={() => navigate('complaint-detail', { id: row.original.complaint.id })}>
              <Eye className="h-4 w-4 mr-2" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { handleEscalate(row.original.complaint.id) }}>
              <AlertTriangle className="h-4 w-4 mr-2" /> Escalate Complaint
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [navigate, selectedId, handleEscalate])

  if (loading) return <DashboardShell activeItem="SLA Breaches" tabs={tabs} activeTab="SLA"><div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardShell>
  if (error) return <DashboardShell activeItem="SLA Breaches" tabs={tabs} activeTab="SLA"><div className="flex flex-col items-center justify-center min-h-[400px] gap-4"><span className="text-destructive">{error}</span><Button onClick={fetchData}>Retry</Button></div></DashboardShell>

  return (
    <DashboardShell
      activeItem="SLA Breaches"
      tabs={tabs}
      activeTab="SLA"
      searchPlaceholder="Search complaint ID, customer, issue..."
      breadcrumb={<AppBreadcrumb current="SLA Breaches" meta={<span className="text-[13px] text-muted-foreground ml-1">Monitor critical complaints approaching SLA violation</span>} />}
    >
      <div className="p-5">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-4 gap-5">
            <KpiCard title="Critical Breaches" value={kv(kpis?.breached)} badge={`${kv(kpis?.breached)} total`} badgeBg="hsl(var(--destructive) / 0.1)" badgeColor="hsl(var(--destructive))" />
            <KpiCard title="At Risk" value={kv(kpis?.sla_at_risk)} badge={`${kv(kpis?.open)} open`} badgeBg="hsl(var(--warning) / 0.15)" badgeColor="hsl(var(--warning))" />
            <KpiCard title="Auto Escalated" value={kv(kpis?.escalated)} badge={`${kv(kpis?.resolution_rate)}% resolved`} badgeBg="hsl(var(--success) / 0.1)" badgeColor="hsl(var(--success))" />
            <KpiCard title="Avg Breach Delay" value={`${kv(kpis?.avg_resolution_hours)}h`} badge="Target: <1h" badgeBg="hsl(var(--primary) / 0.1)" badgeColor="hsl(var(--primary))" />
          </div>

          <div className="grid grid-cols-[2fr_1fr] gap-6 items-start">
            <DataTable
              columns={columns}
              data={breaches}
              enablePagination={true}
              defaultPageSize={10}
              searchColumn="id"
              searchPlaceholder="Search breaches..."
              filterColumns={['priority', 'escalation', 'slaStatus']}
              className="[&_table]:text-[11px]"
            />

            {selectedRow && (
              <Card className="sticky top-6 p-6 bg-card border-border shadow-sm">
                <div className="flex items-center gap-2 mb-5"><div className="w-[26px] h-[26px] rounded-lg bg-primary flex items-center justify-center"><Loader2 className="h-3.5 w-3.5 text-primary-foreground" /></div><h3 className="text-sm font-bold text-foreground m-0">Escalation Intelligence</h3><span className="text-[10px] text-muted-foreground font-mono ml-auto">{selectedRow.id}</span></div>
                <div className="flex flex-col gap-4">
                  <div><div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[.4px] mb-1.5">Risk Analysis</div><p className="text-xs text-muted-foreground leading-relaxed m-0">Customer contacted support <strong className="text-destructive">4 times in 90 minutes.</strong></p></div>
                  <div className="bg-muted/30 border border-border rounded-xl p-4">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[.4px] mb-2">AI Recommended Action</div>
                    <ul className="list-disc pl-4 text-xs text-foreground/80 leading-relaxed mb-3"><li>Immediately route to L2 Payments.</li><li>Send proactive SMS update.</li><li>Mark as high-priority queue.</li></ul>
                    <div className="flex gap-2">{['Edit', 'Apply', 'Regenerate'].map((l) => <Button key={l} size="sm" variant={l === 'Apply' ? 'default' : l === 'Edit' ? 'outline' : 'secondary'}>{l}</Button>)}</div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6 items-start">
            <Card className="p-6 bg-card border-border shadow-sm">
              <CardTitle className="text-[15px] font-bold text-foreground mb-5">SLA Breach Trend</CardTitle>
              {trends.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={trends}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" /><XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} /><YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} /><Tooltip /><Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} /></AreaChart>
                </ResponsiveContainer>
              ) : <div className="h-[100px] flex items-center justify-center text-muted-foreground text-[13px]">No trend data available</div>}
            </Card>
            <Card className="p-6 bg-card border-border shadow-sm">
              <CardTitle className="text-[15px] font-bold text-foreground mb-5">Risk Categories</CardTitle>
              <div className="flex flex-col gap-4">
                {riskCategories.map((cat) => (
                  <div key={cat.name}><div className="flex justify-between mb-1.5"><span className="text-[13px] font-medium text-foreground/80">{cat.name}</span><span className="text-[13px] font-bold text-foreground">{cat.pct}%</span></div><Progress value={cat.pct} className="h-2" style={{ '--progress-color': cat.color } as React.CSSProperties} /></div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
