'use client'

import { useState, useEffect, useMemo } from 'react'
import { DashboardShell } from '@/components/dashboard-shell'
import type { ShellTab } from '@/components/dashboard-shell'
import { AppBreadcrumb } from '@/components/app-breadcrumb'
import { api } from '@/lib/api-client'
import type { Complaint } from '@/types/complaint'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { DataTable, multiColumnFilterFn, valueInArrayFilterFn } from '@/components/ui/data-table'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ChevronDown, ShieldAlert, Loader2, MoreHorizontal, Eye } from 'lucide-react'
import { HoverText } from '@/components/ui/hover-text'

const COMPLIANCE_TABS: ShellTab[] = [
  { label: 'Dashboard', route: 'dashboard' },
  { label: 'Regulatory', route: 'regulatory' },
  { label: 'SLA', route: 'sla-breaches' },
  { label: 'Trends', route: 'trends' },
]

interface DisplayReport { id: string; type: string; regulator: string; period: string; count: number; risk: string; status: string; deadline: string; deadlineHours: number; complaints: Complaint[]; categories: Record<string, number>; summary: string }

function DeadlineBar({ hours, label }: { hours: number; label: string }) {
  const color = hours <= 24 ? 'hsl(var(--destructive))' : hours <= 72 ? 'hsl(var(--warning))' : 'hsl(var(--success))'
  const pct = hours <= 0 ? 100 : Math.max(100 - (hours / 168) * 100, 10)
  return <div><div className="text-[11px] font-semibold mb-1" style={{ color }}>{label}</div><div className="h-[5px] rounded bg-muted overflow-hidden"><div className="h-full rounded" style={{ width: `${pct}%`, background: color }} /></div></div>
}

export function RegulatoryReportsPage() {
  const [reports, setReports] = useState<DisplayReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('Monthly')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<DisplayReport | null>(null)
  const [selectedRows, setSelectedRows] = useState<Row<DisplayReport>[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await api.listComplaints({ regulatory_flag: true, limit: 50 })
        if (cancelled) return
        const grouped: Record<string, Complaint[]> = {}
        res.complaints.forEach((c: Complaint) => { const key = c.regulatory_obligation || 'Uncategorized'; if (!grouped[key]) grouped[key] = []; grouped[key].push(c) })
        const mapped: DisplayReport[] = Object.entries(grouped).map(([obligation, comps], i) => {
          const categories: Record<string, number> = {}; comps.forEach((c: Complaint) => { const ct = c.complaint_type || 'Other'; categories[ct] = (categories[ct] || 0) + 1 })
          const riskLevels = comps.filter((c) => c.severity_score != null && c.severity_score >= 8).length
          const risk = riskLevels > 5 ? 'Critical' : riskLevels > 2 ? 'High' : riskLevels > 0 ? 'Medium' : 'Low'
          const statuses = new Set(comps.map((c) => c.status))
          const status = statuses.has('Escalated') ? 'Pending Review' : statuses.has('Open') ? 'Draft' : 'Submitted'
          return { id: `REG-${2000 + i}`, type: obligation, regulator: 'RBI', period: 'Current', count: comps.length, risk, status, deadline: status === 'Pending Review' ? 'Due in 2 days' : status === 'Draft' ? 'Due in 5 days' : 'Submitted', deadlineHours: status === 'Pending Review' ? 48 : status === 'Draft' ? 120 : 0, complaints: comps, categories, summary: `${comps.length} complaints flagged for regulatory reporting under "${obligation}".` }
        })
        setReports(mapped); if (mapped.length > 0) setSelectedReport(mapped[0])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load regulatory reports')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const riskColors: Record<string, { bg: string; text: string }> = {
    Critical: { bg: 'hsl(var(--destructive) / 0.1)', text: 'hsl(var(--destructive))' },
    High: { bg: 'hsl(var(--warning) / 0.15)', text: 'hsl(var(--warning))' },
    Medium: { bg: 'hsl(var(--caution) / 0.15)', text: 'hsl(var(--caution))' },
    Low: { bg: 'hsl(var(--success) / 0.1)', text: 'hsl(var(--success))' }
  }
  const statusColors: Record<string, { bg: string; text: string }> = {
    'Pending Review': { bg: 'hsl(var(--warning) / 0.15)', text: 'hsl(var(--warning))' },
    Draft: { bg: 'hsl(var(--primary) / 0.1)', text: 'hsl(var(--primary))' },
    Submitted: { bg: 'hsl(var(--success) / 0.1)', text: 'hsl(var(--success))' }
  }

  const expandedRow = expandedId ? reports.find((r) => r.id === expandedId) : null

  const columns: ColumnDef<DisplayReport>[] = useMemo(() => [
    {
      id: 'expand',
      size: 40,
      enableSorting: false,
      enableHiding: false,
      header: () => null,
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(ev) => { ev.stopPropagation(); setExpandedId(prev => prev === row.original.id ? null : row.original.id) }}
          className="bg-none border-none cursor-pointer p-0 flex items-center"
        >
          <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${expandedId === row.original.id ? '' : '-rotate-90'}`} />
        </button>
      ),
    },
    {
      accessorKey: 'id',
      header: 'Report ID',
      size: 100,
      cell: ({ getValue, row }) => (
        <HoverText
          text={getValue() as string}
          className="cursor-pointer font-mono text-xs font-semibold text-muted-foreground hover:text-primary"
          onClick={() => setSelectedReport(row.original)}
        />
      ),
      filterFn: multiColumnFilterFn,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      size: 200,
      cell: ({ getValue, row }) => (
        <HoverText
          text={getValue() as string}
          className="max-w-[180px] cursor-pointer text-[11px] text-foreground/80"
          onClick={() => setSelectedReport(row.original)}
        />
      ),
    },
    {
      accessorKey: 'regulator',
      header: 'Regulator',
      size: 70,
      cell: ({ getValue }) => <span className="text-xs font-semibold text-muted-foreground">{getValue() as string}</span>,
    },
    {
      accessorKey: 'period',
      header: 'Period',
      size: 80,
      cell: ({ getValue }) => <span className="text-[11px] text-muted-foreground">{getValue() as string}</span>,
    },
    {
      accessorKey: 'count',
      header: 'Count',
      size: 60,
      cell: ({ getValue }) => <span className="text-[13px] font-bold text-foreground">{getValue() as number}</span>,
    },
    {
      accessorKey: 'risk',
      header: 'Risk',
      size: 80,
      cell: ({ getValue, row }) => {
        const rk = riskColors[row.original.risk] ?? riskColors.Low
        return <Badge variant="outline" className="text-[10px] font-semibold w-fit" style={{ color: rk.text, backgroundColor: rk.bg, borderColor: 'transparent' }}>{getValue() as string}</Badge>
      },
      filterFn: valueInArrayFilterFn,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 100,
      cell: ({ getValue, row }) => {
        const st = statusColors[row.original.status] ?? statusColors.Draft
        return <Badge variant="outline" className="text-[10px] font-semibold w-fit" style={{ color: st.text, backgroundColor: st.bg, borderColor: 'transparent' }}>{getValue() as string}</Badge>
      },
      filterFn: valueInArrayFilterFn,
    },
    {
      id: 'deadline',
      header: 'Deadline',
      size: 110,
      accessorFn: (row) => row.deadlineHours,
      cell: ({ row }) => <DeadlineBar hours={row.original.deadlineHours} label={row.original.deadline} />,
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
            <DropdownMenuItem onClick={() => setSelectedReport(row.original)}>
              <Eye className="h-4 w-4 mr-2" /> View Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [expandedId])

  if (loading) return <DashboardShell activeItem="Regulatory Reports" tabs={COMPLIANCE_TABS} activeTab="Regulatory"><div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardShell>
  if (error) return <DashboardShell activeItem="Regulatory Reports" tabs={COMPLIANCE_TABS} activeTab="Regulatory"><div className="flex flex-col items-center justify-center min-h-[400px] gap-4"><div className="text-sm text-destructive">{error}</div><Button onClick={() => window.location.reload()}>Retry</Button></div></DashboardShell>

  return (
    <DashboardShell
      activeItem="Regulatory Reports"
      tabs={COMPLIANCE_TABS}
      activeTab="Regulatory"
      searchPlaceholder="Search report ID, complaint category, RBI code..."
      breadcrumb={
        <AppBreadcrumb
          current="Regulatory Reports"
          actions={
            <>
            <Button size="sm">+ Generate Report</Button>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground/80 bg-background cursor-pointer outline-none">{['Today', 'Weekly', 'Monthly', 'Quarterly', 'Custom'].map((o) => <option key={o} value={o}>{o}</option>)}</select>
            </>
          }
        />
      }
    >
      <div className="p-5">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-[2fr_1fr] gap-6 items-start">
            <div className="flex flex-col gap-3">
              <DataTable
                columns={columns}
                data={reports}
                enableRowSelection={true}
                enablePagination={true}
                defaultPageSize={10}
                searchColumn="id"
                searchPlaceholder="Search reports..."
                filterColumns={['risk', 'status']}
                onSelectionChange={(rows) => {
                  if (rows.length > 0) setSelectedReport(rows[0].original)
                }}
                className="[&_table]:text-[11px]"
              />

              {/* Expanded Row Content */}
              {expandedRow && (
                <Card className="bg-muted/50 border-border">
                  <CardContent className="p-4 flex flex-col gap-2.5">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[.3px]">Complaint Categories</div>
                    <div className="flex gap-3">{Object.entries(expandedRow.categories).slice(0, 6).map(([k, v]) => <div key={k} className="text-center"><div className="text-base font-bold text-foreground">{v}</div><div className="text-[10px] text-muted-foreground">{k}</div></div>)}</div>
                    <div className="p-2.5 rounded-lg bg-muted border border-border text-[11px] text-muted-foreground leading-relaxed">{expandedRow.summary}</div>
                  </CardContent>
                </Card>
              )}
            </div>

            {selectedReport && (
              <Card className="p-6 sticky top-6 bg-card border-border shadow-sm">
                <div className="flex items-center gap-2 mb-5"><div className="w-[26px] h-[26px] rounded-lg bg-primary flex items-center justify-center"><ShieldAlert className="h-3.5 w-3.5 text-primary-foreground" /></div><h3 className="text-sm font-bold text-foreground m-0">Compliance Intelligence</h3><span className="text-[10px] text-muted-foreground font-mono ml-auto">{selectedReport.id}</span></div>
                <div className="flex flex-col gap-4">
                  <div><div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[.4px] mb-1.5">Risk Analysis</div><p className="text-xs text-muted-foreground leading-relaxed m-0">{selectedReport.risk === 'Critical' ? 'Immediate regulator notification required.' : selectedReport.risk === 'High' ? 'Elevated complaint volume. Review recommended.' : 'Report within expected compliance thresholds.'}</p></div>
                  <div><div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[.4px] mb-1.5">Obligation</div><div className="flex flex-col gap-0.5 text-xs"><div className="flex justify-between"><span className="text-muted-foreground">Type</span><strong>{selectedReport.type}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Flagged complaints</span><strong className="text-destructive">{selectedReport.count}</strong></div></div></div>
                  <div className="bg-muted border border-border rounded-xl p-4">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[.4px] mb-2">AI Recommendation</div>
                    <ul className="list-disc pl-4 text-xs text-foreground/80 leading-relaxed mb-3"><li>Flag for senior review</li><li>Create escalation cluster</li><li>Add incident summary</li></ul>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <div className="grid grid-cols-3 gap-5 items-start">
            <Card className="p-5 bg-card border-border shadow-sm"><CardTitle className="text-sm font-bold text-foreground mb-3">Report Obligations</CardTitle>
              <div className="flex flex-col gap-2.5">{reports.slice(0, 4).map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border" style={{ borderLeft: r.status === 'Submitted' ? '3px solid hsl(var(--success))' : r.status === 'Pending Review' ? '3px solid hsl(var(--warning))' : '3px solid hsl(var(--border))' }}>
                  <div className="text-center min-w-[44px]"><div className="text-[13px] font-bold text-foreground">{r.count}</div><div className="text-[10px] font-semibold text-muted-foreground">complaints</div></div>
                  <div><div className="text-xs font-semibold text-foreground">{r.type}</div><div className="text-[10px]" style={{ color: r.status === 'Submitted' ? 'hsl(var(--success))' : r.status === 'Pending Review' ? 'hsl(var(--warning))' : 'hsl(var(--muted-foreground))' }}>{r.status}</div></div>
                </div>
              ))}</div>
            </Card>
            <Card className="p-5 bg-card border-border shadow-sm"><CardTitle className="text-sm font-bold text-foreground mb-3">Flagged Complaints</CardTitle>
              <div className="max-h-[200px] overflow-y-auto relative"><div className="absolute left-[7px] top-0 bottom-0 w-0.5 bg-muted" /><div className="flex flex-col gap-3 pl-6">{selectedReport?.complaints.slice(0, 6).map((c) => <div key={c.id} className="relative"><div className="absolute -left-[19px] top-1 w-2 h-2 rounded-full bg-destructive" /><div className="text-[10px] font-bold text-muted-foreground mb-0.5">{c.id}</div><div className="text-[11px] text-foreground/80 leading-relaxed">{c.complaint_type || c.raw_text.slice(0, 80)}</div></div>)}</div></div>
            </Card>
            <Card className="p-5 bg-card border-border shadow-sm"><CardTitle className="text-sm font-bold text-foreground mb-3">Summary</CardTitle>
              <div className="flex flex-col gap-2">{reports.slice(0, 4).map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div><div className="text-[13px] font-semibold text-foreground">{r.type}</div><div className="text-[10px] text-muted-foreground">{r.count} complaints · {r.status}</div></div>
                  <Badge variant="outline" className="text-[10px] font-semibold" style={{ color: riskColors[r.risk]?.text ?? 'hsl(var(--success))', backgroundColor: riskColors[r.risk]?.bg ?? 'hsl(var(--success) / 0.1)', borderColor: 'transparent' }}>{r.risk}</Badge>
                </div>
              ))}</div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
