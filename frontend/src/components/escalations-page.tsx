'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from '@/hooks/use-router'
import { DashboardShell } from '@/components/dashboard-shell'
import type { ShellTab } from '@/components/dashboard-shell'
import { AppBreadcrumb } from '@/components/app-breadcrumb'
import { api } from '@/lib/api-client'
import type { Complaint } from '@/types/complaint'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable, multiColumnFilterFn, valueInArrayFilterFn } from '@/components/ui/data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ShieldAlert, ChevronDown, MoreHorizontal, Eye, AlertTriangle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { HoverText } from '@/components/ui/hover-text'

const SUPERVISOR_TABS: ShellTab[] = [
  { label: 'Dashboard', route: 'dashboard' },
  { label: 'Complaints', route: 'complaints' },
  { label: 'Escalations', route: 'escalations' },
  { label: 'SLA', route: 'sla-breaches' },
  { label: 'Trends', route: 'trends' },
]

function mapToRow(c: Complaint) {
  const hours = Math.max(0, Math.round((Date.now() - new Date(c.created_at).getTime()) / 3600000))
  return {
    escId: `ESC-${String(c.id).slice(0, 4)}`,
    complaintId: String(c.id),
    summary: c.raw_text ?? '',
    customer: c.customer_name ?? c.customer_id,
    segment: c.vip_customer ? 'VIP' : 'Standard',
    escalatedTo: c.complaint_type ?? 'General',
    level: 'L1 → L2' as const,
    riskScore: Math.round((c.breach_probability ?? 0) * 100),
    timeWaiting: `${hours}h waiting`,
    timeHours: hours,
    status: (c.status === 'escalated' ? 'Pending' : c.status === 'in_progress' ? 'Assigned' : 'Resolved') as 'Pending' | 'Assigned' | 'Resolved',
    reason: c.escalation_reason ?? 'Repeated customer follow-ups',
    rootCause: c.root_cause ?? 'Under investigation',
    sentiment: (c.emotion_arc && typeof (c.emotion_arc as Record<string, unknown>).current === 'string') ? (c.emotion_arc as Record<string, unknown>).current as string : 'Neutral',
    route: 'General → L2 Support',
  }
}

type Esc = ReturnType<typeof mapToRow>

function RiskBar({ score }: { score: number }) {
  const color = score >= 80 ? 'hsl(var(--destructive))' : score >= 60 ? 'hsl(var(--warning))' : 'hsl(var(--success))'
  return (
    <div>
      <div className="flex items-center-baseline gap-0.5 text-xs"><span className="font-bold" style={{ color }}>{score}</span><span className="text-[10px] text-muted-foreground">/100</span></div>
      <div className="h-1 rounded bg-muted overflow-hidden w-full mt-0.5"><div className="h-full rounded" style={{ width: `${score}%`, background: color }} /></div>
    </div>
  )
}

function TimeBar({ hours }: { hours: number }) {
  const pct = Math.min((hours / 12) * 100, 100)
  const color = hours >= 8 ? 'hsl(var(--destructive))' : hours >= 4 ? 'hsl(var(--warning))' : 'hsl(var(--success))'
  return (
    <div>
      <div className="text-[11px] font-semibold text-foreground/80 mb-0.5">{hours}h</div>
      <div className="h-[5px] rounded bg-muted overflow-hidden w-full"><div className="h-full rounded" style={{ width: `${pct}%`, background: color }} /></div>
    </div>
  )
}

export function EscalationsPage() {
  const { navigate } = useRouter()
  const [escalations, setEscalations] = useState<Esc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedEsc, setSelectedEsc] = useState<Esc | null>(null)

  const fetchEscalations = useCallback(async () => {
    try {
      const res = await api.getEscalations({ limit: 50 })
      const mapped = res.complaints.map(mapToRow)
      setEscalations(mapped); if (mapped.length > 0) setSelectedEsc(mapped[0])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load escalations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await api.getEscalations({ limit: 50 })
        if (cancelled) return
        const mapped = res.complaints.map(mapToRow)
        setEscalations(mapped); if (mapped.length > 0) setSelectedEsc(mapped[0])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load escalations')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleEscalate = useCallback(async (id: string) => {
    try {
      await api.updateStatus(id, 'escalated')
      toast({ title: 'Case escalated', description: 'The complaint is now routed for escalation review.' })
      fetchEscalations()
    } catch {
      toast({ variant: 'destructive', title: 'Escalation failed', description: 'The complaint could not be escalated.' })
    }
  }, [fetchEscalations])

  const statusColorsMap: Record<string, { bg: string; text: string }> = {
    Pending: { bg: 'hsl(var(--warning) / 0.15)', text: 'hsl(var(--warning))' },
    Assigned: { bg: 'hsl(var(--primary) / 0.1)', text: 'hsl(var(--primary))' },
    Resolved: { bg: 'hsl(var(--success) / 0.1)', text: 'hsl(var(--success))' },
  }

  const expandedRow = expandedId ? escalations.find((e) => e.escId === expandedId) : null

  const columns: ColumnDef<Esc>[] = useMemo(() => [
    {
      id: 'expand',
      size: 40,
      enableSorting: false,
      enableHiding: false,
      header: () => null,
      cell: ({ row }) => (
        <button
          type="button"
          onClick={(ev) => { ev.stopPropagation(); setExpandedId(prev => prev === row.original.escId ? null : row.original.escId) }}
          className="bg-none border-none cursor-pointer p-0 flex items-center"
        >
          <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${expandedId === row.original.escId ? '' : '-rotate-90'}`} />
        </button>
      ),
    },
    {
      accessorKey: 'escId',
      header: 'Esc ID',
      size: 100,
      cell: ({ getValue, row }) => (
        <div>
          <div className="text-[11px] font-semibold text-muted-foreground font-mono">{getValue() as string}</div>
          <HoverText
            text={`${String(row.original.complaintId).slice(0, 8)}...`}
            fullText={row.original.complaintId}
            className="text-[10px] text-muted-foreground"
            actions={[
              { label: 'View details', icon: <Eye className="h-3.5 w-3.5" />, onClick: () => navigate('complaint-detail', { id: row.original.complaintId }) },
              { label: 'Escalate complaint', icon: <AlertTriangle className="h-3.5 w-3.5" />, onClick: () => handleEscalate(row.original.complaintId) },
            ]}
          />
        </div>
      ),
      filterFn: multiColumnFilterFn,
    },
    {
      id: 'customerSummary',
      header: 'Customer / Summary',
      size: 220,
      accessorFn: (row) => `${row.customer} ${row.summary}`,
      cell: ({ row }) => (
        <div className="min-w-0">
          <HoverText
            text={row.original.customer}
            className="text-xs font-semibold text-foreground"
            actions={[
              { label: 'View details', icon: <Eye className="h-3.5 w-3.5" />, onClick: () => navigate('complaint-detail', { id: row.original.complaintId }) },
              { label: 'Escalate complaint', icon: <AlertTriangle className="h-3.5 w-3.5" />, onClick: () => handleEscalate(row.original.complaintId) },
            ]}
          />
          <HoverText
            text={row.original.summary}
            className="text-[11px] text-muted-foreground"
            actions={[
              { label: 'View details', icon: <Eye className="h-3.5 w-3.5" />, onClick: () => navigate('complaint-detail', { id: row.original.complaintId }) },
              { label: 'Escalate complaint', icon: <AlertTriangle className="h-3.5 w-3.5" />, onClick: () => handleEscalate(row.original.complaintId) },
            ]}
          />
        </div>
      ),
    },
    {
      id: 'escalatedToStatus',
      header: 'Escalated To / Status',
      size: 130,
      accessorFn: (row) => `${row.escalatedTo} ${row.status}`,
      cell: ({ row }) => {
        const st = statusColorsMap[row.original.status]
        return (
          <div className="min-w-0">
            <HoverText
              text={row.original.escalatedTo}
              className="text-[11px] text-foreground/80"
              actions={[
                { label: 'View details', icon: <Eye className="h-3.5 w-3.5" />, onClick: () => navigate('complaint-detail', { id: row.original.complaintId }) },
                { label: 'Escalate complaint', icon: <AlertTriangle className="h-3.5 w-3.5" />, onClick: () => handleEscalate(row.original.complaintId) },
              ]}
            />
            <Badge variant="outline" className="text-[9px] font-semibold" style={{ color: st.text, backgroundColor: st.bg, borderColor: 'transparent' }}>{row.original.status}</Badge>
          </div>
        )
      },
      filterFn: valueInArrayFilterFn,
    },
    {
      accessorKey: 'riskScore',
      header: 'Risk Score',
      size: 90,
      cell: ({ getValue }) => <RiskBar score={getValue() as number} />,
    },
    {
      accessorKey: 'timeHours',
      header: 'Time Waiting',
      size: 100,
      cell: ({ getValue }) => <TimeBar hours={getValue() as number} />,
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
            <DropdownMenuItem onClick={() => navigate('complaint-detail', { id: row.original.complaintId })}>
              <Eye className="h-4 w-4 mr-2" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEscalate(row.original.complaintId)}>
              <AlertTriangle className="h-4 w-4 mr-2" /> Escalate Complaint
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [navigate, expandedId, handleEscalate])

  return (
    <DashboardShell
      activeItem="Escalations"
      tabs={SUPERVISOR_TABS}
      activeTab="Escalations"
      searchPlaceholder="Search complaint ID, customer, escalation..."
      breadcrumb={
        <AppBreadcrumb
          current="Escalations"
          meta={`${escalations.length} escalations`}
          actions={
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (!selectedEsc) {
                  toast({ variant: 'destructive', title: 'No case selected', description: 'Select an escalation row before escalating.' })
                  return
                }
                handleEscalate(selectedEsc.complaintId)
              }}
            >
              Escalate Selected
            </Button>
          }
        />
      }
    >
      <div className="p-5">
        {loading && <div className="p-10 text-center text-muted-foreground text-[13px]">Loading escalations...</div>}
        {error && <div className="p-10 text-center text-destructive text-[13px]">{error}</div>}

        {!loading && !error && (
          <div className="grid grid-cols-[2fr_1fr] gap-6 items-start">
            <div className="flex flex-col gap-3">
              <DataTable
                columns={columns}
                data={escalations}
                enableRowSelection={true}
                enablePagination={true}
                defaultPageSize={10}
                defaultSorting={[{ id: 'riskScore', desc: true }]}
                searchColumn="escId"
                searchPlaceholder="Search escalations..."
                filterColumns={['escalatedToStatus']}
                onSelectionChange={(rows) => {
                  if (rows.length > 0) setSelectedEsc(rows[0].original)
                }}
                className="[&_table]:text-[11px]"
              />

              {/* Expanded Row Content */}
              {expandedRow && (
                <Card className="bg-muted/50 border-border">
                  <CardContent className="p-4 flex flex-col gap-2.5">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[.3px]">Escalation Reason</div>
                    <p className="text-xs text-muted-foreground leading-relaxed m-0">{expandedRow.reason}</p>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[.3px] mt-1">Root Cause</div>
                    <p className="text-xs text-muted-foreground leading-relaxed m-0">{expandedRow.rootCause}</p>
                    <div className="flex gap-1 mt-1"><Button size="sm" variant="destructive" onClick={() => handleEscalate(expandedRow.complaintId)}>Escalate Now</Button></div>
                  </CardContent>
                </Card>
              )}
            </div>

            {selectedEsc && (
              <Card className="sticky top-6 p-6 bg-card border-border shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-[26px] h-[26px] rounded-lg bg-primary flex items-center justify-center"><ShieldAlert className="h-3.5 w-3.5 text-primary-foreground" /></div>
                  <h3 className="text-sm font-bold text-foreground m-0">Escalation Intelligence</h3>
                  <span className="text-[10px] text-muted-foreground font-mono ml-auto">{selectedEsc.escId}</span>
                </div>
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[.4px] mb-1.5">Classification</div>
                    <div className="flex flex-wrap gap-1.5">
                      {[selectedEsc.escalatedTo, 'Escalated', selectedEsc.level].map((t) => {
                        const isEsc = t.toLowerCase().includes('escalated')
                        return <Badge key={t} variant="outline" className="text-[11px] font-semibold" style={{ color: isEsc ? 'hsl(var(--destructive))' : 'hsl(var(--primary))', backgroundColor: isEsc ? 'hsl(var(--destructive) / 0.1)' : 'hsl(var(--primary) / 0.1)', borderColor: isEsc ? 'hsl(var(--destructive) / 0.2)' : 'hsl(var(--primary) / 0.2)' }}>{t}</Badge>
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[.4px] mb-1.5">Analysis</div>
                    <p className="text-xs text-muted-foreground leading-relaxed m-0">Contacted {1} times. Sentiment: <strong className="text-destructive">{selectedEsc.sentiment}</strong></p>
                  </div>
                  <div className="bg-muted border border-border rounded-lg p-3.5">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-[.4px] mb-1.5">AI Suggested Routing</div>
                    <div className="text-xs font-semibold text-foreground/80 mb-1.5">{selectedEsc.route}</div>
                    <div className="text-[11px] text-success font-semibold">Confidence: 94%</div>
                  </div>
                  <div className="bg-primary/8 border border-primary/15 rounded-xl p-4">
                    <div className="text-[10px] font-bold text-primary uppercase tracking-[.4px] mb-1.5">AI Draft Communication</div>
                    <p className="text-xs text-primary leading-relaxed mb-3">Dear Customer, we are actively investigating and have escalated your issue. Ref: {selectedEsc.escId}. We will update you within 2 hours.</p>
                    <div className="flex gap-2">
                      <Button size="sm">Send</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleEscalate(selectedEsc.complaintId)}>Escalate</Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
