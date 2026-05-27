'use client'

import { useState, useEffect } from 'react'
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
import type { ColumnDef } from '@tanstack/react-table'
import { Loader2 } from 'lucide-react'
import { HoverText } from '@/components/ui/hover-text'

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

interface DisplayEntry { id: string; rootCause: string; rawText: string; complaintType: string; status: string; severity: number }

const rootCauseColumns: ColumnDef<DisplayEntry>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
    size: 80,
    cell: ({ getValue }) => <HoverText text={getValue() as string} className="font-mono text-[11px] font-semibold text-muted-foreground" />,
  },
  {
    accessorKey: 'rootCause',
    header: 'Root Cause',
    size: 220,
    cell: ({ getValue }) => <HoverText text={getValue() as string} className="max-w-[200px] text-[11px] text-foreground/80" />,
    filterFn: multiColumnFilterFn,
  },
  {
    accessorKey: 'complaintType',
    header: 'Type',
    size: 80,
    cell: ({ getValue }) => <span className="text-muted-foreground text-[11px]">{getValue() as string}</span>,
    filterFn: valueInArrayFilterFn,
  },
  {
    accessorKey: 'severity',
    header: 'Severity',
    size: 70,
    cell: ({ getValue }) => <span className="text-destructive font-semibold text-[11px]">Sev {getValue() as number}</span>,
  },
]

export function RootCausePage() {
  const [entries, setEntries] = useState<DisplayEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeWindow, setTimeWindow] = useState('Last 24h')

  const tabs = SUPERVISOR_TABS

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await api.listComplaints({ has_root_cause: true, limit: 20 })
        if (!cancelled) {
          setEntries(res.complaints.filter((c: Complaint) => c.root_cause).map((c: Complaint) => ({ id: c.id, rootCause: c.root_cause!, rawText: c.raw_text, complaintType: c.complaint_type || 'Unknown', status: c.status, severity: c.severity_score ?? 5 })))
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load root cause data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const primaryEntry = entries[0] || null
  const causeChainSteps = primaryEntry ? [
    { name: primaryEntry.complaintType, bg: 'hsl(var(--destructive) / 0.08)', text: 'hsl(var(--destructive))', border: 'hsl(var(--destructive) / 0.15)' },
    { name: 'Root Cause Identified', bg: 'hsl(var(--warning) / 0.08)', text: 'hsl(var(--warning))', border: 'hsl(var(--warning) / 0.15)' },
    { name: primaryEntry.rootCause.slice(0, 40), bg: 'hsl(var(--caution) / 0.08)', text: 'hsl(var(--caution))', border: 'hsl(var(--caution) / 0.15)' },
    { name: 'Resolution Action', bg: 'hsl(var(--success) / 0.08)', text: 'hsl(var(--success))', border: 'hsl(var(--success) / 0.15)' },
  ] : []
  const uniqueTypes = Array.from(new Set(entries.map((e) => e.complaintType))).slice(0, 6)

  if (loading) return <DashboardShell activeItem="Root Cause" tabs={tabs} activeTab="Trends"><div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardShell>
  if (error) return <DashboardShell activeItem="Root Cause" tabs={tabs} activeTab="Trends"><div className="flex flex-col items-center justify-center min-h-[400px] gap-4"><div className="text-sm text-destructive">{error}</div><Button onClick={() => window.location.reload()}>Retry</Button></div></DashboardShell>

  return (
    <DashboardShell
      activeItem="Root Cause"
      tabs={tabs}
      activeTab="Trends"
      searchPlaceholder="Search complaint ID, issue, product, error code..."
      breadcrumb={
        <AppBreadcrumb
          current="Root Cause Analysis"
          actions={
            <>
            <Button size="sm">Create Investigation</Button>
            <select value={timeWindow} onChange={(e) => setTimeWindow(e.target.value)} className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground/80 bg-background cursor-pointer outline-none">{['Last 1h', 'Last 6h', 'Last 24h', 'Custom'].map((o) => <option key={o} value={o}>{o}</option>)}</select>
            </>
          }
        />
      }
    >
      <div className="p-5">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-[1.8fr_1fr] gap-6 items-start">
            <div className="flex flex-col gap-6">
              {primaryEntry && (
                <Card className="p-6 bg-card border-border shadow-sm">
                  <h3 className="text-[15px] font-bold text-foreground mb-2">{primaryEntry.complaintType}</h3>
                  <div className="flex gap-5 mb-4 text-xs"><span>Complaint: <strong>{primaryEntry.id}</strong></span><span>Severity: <strong className="text-destructive">{primaryEntry.severity}/10</strong></span><span>Status: <strong className="text-success">{primaryEntry.status}</strong></span></div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[.3px] mb-3">Cause Chain</div>
                  <div className="flex items-center flex-wrap gap-0">
                    {causeChainSteps.map((step, i) => (
                      <div key={step.name} className="flex items-center">
                        <div className="px-4 py-3 rounded-lg text-xs font-semibold whitespace-nowrap" style={{ background: step.bg, border: `1px solid ${step.border}`, color: step.text }}>{step.name}</div>
                        {i < causeChainSteps.length - 1 && <span className="text-lg text-muted-foreground mx-1.5">→</span>}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3.5 flex items-center gap-2"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[.3px]">Confidence</span><div className="flex-1 h-1.5 rounded bg-muted overflow-hidden"><div className="h-full rounded bg-success" style={{ width: '85%' }} /></div><span className="text-xs font-bold text-success">High</span></div>
                </Card>
              )}

              <Card className="p-6 bg-card border-border shadow-sm">
                <CardTitle className="text-[15px] font-bold text-foreground mb-4">Root Cause Details</CardTitle>
                <div className="flex flex-col gap-3">
                  {entries.slice(0, 6).map((e) => (
                    <div key={e.id} className="p-3.5 rounded-lg bg-muted/60 border border-border">
                      <div className="flex items-center gap-2 mb-1.5"><span className="text-[11px] font-semibold text-muted-foreground font-mono">{e.id}</span><Badge variant="outline" className="text-[10px] font-semibold bg-primary/10 text-primary border-transparent">{e.complaintType}</Badge><Badge variant="outline" className="text-[10px] font-semibold bg-success-muted text-success border-transparent">{e.status}</Badge></div>
                      <div className="text-[11px] font-bold text-destructive mb-1">Root Cause: {e.rootCause}</div>
                      <div className="text-[11px] text-muted-foreground leading-relaxed">{e.rawText.slice(0, 200)}{e.rawText.length > 200 ? '...' : ''}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card className="p-6 sticky top-6 bg-card border-border shadow-sm">
              <div className="flex items-center gap-2 mb-5"><div className="w-[26px] h-[26px] rounded-lg bg-primary flex items-center justify-center"><Loader2 className="h-3.5 w-3.5 text-primary-foreground" /></div><h3 className="text-sm font-bold text-foreground m-0">Root Cause Intelligence</h3><span className="text-[10px] text-muted-foreground font-mono ml-auto">{entries.length} items</span></div>
              <div className="flex flex-col gap-4">
                <div><div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[.4px] mb-1.5">Top Root Causes</div><div className="flex flex-col gap-1">{entries.slice(0, 4).map((e) => <div key={e.id} className="flex justify-between text-[11px]"><span className="text-muted-foreground truncate max-w-[180px]">{e.rootCause}</span><span className="font-semibold text-destructive">{e.id}</span></div>)}</div></div>
                <div><div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[.4px] mb-1.5">Impact Analysis</div><div className="flex flex-col gap-0.5 text-xs"><div className="flex justify-between"><span className="text-muted-foreground">Total entries</span><strong className="text-destructive">{entries.length}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Unique types</span><strong className="text-foreground/80">{uniqueTypes.length}</strong></div></div></div>
                <div className="bg-muted border border-border rounded-xl p-4">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[.4px] mb-2">AI Recommended Action</div>
                  <ul className="list-disc pl-4 text-xs text-foreground/80 leading-relaxed mb-3"><li>Investigate top root causes</li><li>Create cluster escalation</li><li>Send customer advisory</li></ul>
                </div>
              </div>
            </Card>
          </div>

          {/* Dependency Map */}
          <Card className="p-6 bg-card border-border shadow-sm">
            <CardTitle className="text-[15px] font-bold text-foreground mb-4">Dependency Map</CardTitle>
            <div className="flex justify-center flex-wrap gap-3 p-3">
              {uniqueTypes.length > 0 ? (
                <>{uniqueTypes.map((t, i) => <div key={t} className="flex items-center gap-2">{i > 0 && <span className="text-lg text-muted-foreground">→</span>}<div className="px-5 py-3 rounded-lg text-[13px] font-semibold" style={{ background: i === 0 ? 'hsl(var(--primary) / 0.08)' : i % 2 === 1 ? 'hsl(var(--destructive) / 0.08)' : 'hsl(var(--success) / 0.08)', border: i === 0 ? '1px solid hsl(var(--primary) / 0.15)' : i % 2 === 1 ? '1px solid hsl(var(--destructive) / 0.15)' : '1px solid hsl(var(--success) / 0.15)', color: i === 0 ? 'hsl(var(--primary))' : i % 2 === 1 ? 'hsl(var(--destructive))' : 'hsl(var(--success))' }}>{t}</div></div>)}</>
              ) : <span className="text-xs text-muted-foreground">No dependency data available</span>}
            </div>
          </Card>

          {/* Bottom 3 columns */}
          <div className="grid grid-cols-3 gap-5 items-start">
            <Card className="p-5 bg-card border-border shadow-sm"><CardTitle className="text-sm font-bold text-foreground mb-3">Root Cause Entries</CardTitle>
              <DataTable
                columns={rootCauseColumns}
                data={entries.slice(0, 5)}
                enablePagination={false}
                searchColumn="rootCause"
                searchPlaceholder="Search root causes..."
                filterColumns={['complaintType']}
                className="[&_table]:text-[11px]"
              />
            </Card>
            <Card className="p-5 bg-card border-border shadow-sm"><CardTitle className="text-sm font-bold text-foreground mb-3">Similar Patterns</CardTitle>
              <div className="flex flex-col gap-2.5">{entries.slice(0, 3).map((e, _i) => <div key={e.id} className="p-2.5 rounded-lg border border-border"><div className="flex justify-between mb-1"><span className="text-[11px] font-semibold text-foreground">{e.complaintType}</span><Badge variant="outline" className="text-[10px] font-bold bg-success-muted text-success border-transparent">{80 + _i * 5}% match</Badge></div><div className="text-[11px] text-muted-foreground leading-relaxed">{e.rootCause.slice(0, 80)}</div></div>)}</div>
            </Card>
            <Card className="p-5 bg-card border-border shadow-sm"><CardTitle className="text-sm font-bold text-foreground mb-3">Status Summary</CardTitle>
              <div className="flex flex-col">{Array.from(new Set(entries.map((e) => e.status))).map((status) => <div key={status} className="flex gap-2.5 py-2 text-[11px]"><span className="font-bold text-muted-foreground whitespace-nowrap min-w-[80px]">{status}</span><span className="text-foreground/80">{entries.filter(e => e.status === status).length} complaints</span></div>)}</div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
