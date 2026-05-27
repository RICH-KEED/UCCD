'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from '@/hooks/use-router'
import { api } from '@/lib/api-client'
import type { Complaint } from '@/types/complaint'
import { DashboardShell } from '@/components/dashboard-shell'
import type { ShellTab } from '@/components/dashboard-shell'
import { AppBreadcrumb } from '@/components/app-breadcrumb'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { HoverText } from '@/components/ui/hover-text'
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from '@/components/ui/timeline'
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, Search, UserRound } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const AGENT_TABS: ShellTab[] = [
  { label: 'Dashboard', route: 'dashboard' },
  { label: 'My Queue', route: 'complaints' },
  { label: 'AI Drafts', route: 'ai-drafts' },
  { label: '360 View', route: '360-view' },
]

function getCustomerLabel(complaint?: Complaint | null) {
  return complaint?.customer_name || complaint?.customer_id || 'Unknown Customer'
}

function getInitials(name: string) {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'CU'
}

function formatDate(value?: string | null) {
  if (!value) return 'N/A'
  return new Date(value).toLocaleString()
}

function complaintTimestamp(complaint: Complaint) {
  const timestamp = complaint.created_at ? new Date(complaint.created_at).getTime() : 0
  return Number.isFinite(timestamp) ? timestamp : 0
}

function sortComplaintsChronologically(complaints: Complaint[]) {
  return [...complaints].sort((a, b) => complaintTimestamp(a) - complaintTimestamp(b))
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ')
}

function issueLabel(complaint: Complaint) {
  return complaint.complaint_type || complaint.intent || complaint.product_code || 'Customer complaint'
}

function issueDescription(complaint: Complaint) {
  const parts = [
    complaint.complaint_type && `Category: ${complaint.complaint_type}`,
    complaint.intent && `Need: ${complaint.intent}`,
    complaint.product_code && `Product/service: ${complaint.product_code}`,
  ].filter(Boolean)

  return parts.length ? parts.join(' · ') : 'Customer complaint'
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === 'resolved' ? 'bg-success-muted text-success'
    : status === 'escalated' ? 'bg-destructive/10 text-destructive'
    : 'bg-primary/10 text-primary'

  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${className}`}>{statusLabel(status)}</span>
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2 last:border-b-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">{value || 'N/A'}</span>
    </div>
  )
}

export function ThreeSixtyViewPage() {
  const { navigate } = useRouter()
  const [customerId, setCustomerId] = useState('')
  const [recentComplaints, setRecentComplaints] = useState<Complaint[]>([])
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadRecentCustomers() {
      setInitialLoading(true)
      try {
        const response = await api.listComplaints({ limit: 100 })
        if (!cancelled) setRecentComplaints(response.complaints || [])
      } catch {
        if (!cancelled) setRecentComplaints([])
      } finally {
        if (!cancelled) setInitialLoading(false)
      }
    }

    loadRecentCustomers()
    return () => { cancelled = true }
  }, [])

  const customerSuggestions = useMemo(() => {
    const byCustomer = new Map<string, Complaint>()
    recentComplaints.forEach((complaint) => {
      if (!byCustomer.has(complaint.customer_id)) byCustomer.set(complaint.customer_id, complaint)
    })
    return Array.from(byCustomer.values()).slice(0, 5)
  }, [recentComplaints])

  const customerSummary = useMemo(() => ({
    open: complaints.filter((complaint) => complaint.status !== 'resolved').length,
    escalated: complaints.filter((complaint) => complaint.status === 'escalated').length,
    risk: complaints.filter((complaint) => complaint.sla_breached || complaint.regulatory_flag).length,
  }), [complaints])

  const chronologicalComplaints = useMemo(() => sortComplaintsChronologically(complaints), [complaints])
  const timelineComplaints = useMemo(() => [...chronologicalComplaints].reverse(), [chronologicalComplaints])
  const selectedStep = Math.max(1, chronologicalComplaints.findIndex((complaint) => complaint.id === selectedComplaint?.id) + 1)

  const searchCustomer = async (value = customerId) => {
    const term = value.trim()
    if (!term) return

    setCustomerId(term)
    setLoading(true)
    setError(null)
    setSearched(true)

    try {
      const exactResponse = await api.listComplaints({ customer_id: term, limit: 100 })
      const matchingComplaints = exactResponse.complaints?.length
        ? exactResponse.complaints
        : (await api.listComplaints({ search: term, limit: 100 })).complaints || []
      const chronologicalMatches = sortComplaintsChronologically(matchingComplaints)

      setComplaints(chronologicalMatches)
      setSelectedComplaint(chronologicalMatches[chronologicalMatches.length - 1] ?? null)
      if (matchingComplaints.length === 0) setError(`No customer history found for "${term}".`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load customer history')
      setComplaints([])
      setSelectedComplaint(null)
    } finally {
      setLoading(false)
    }
  }

  const handleEscalate = async () => {
    if (!selectedComplaint) {
      toast({ variant: 'destructive', title: 'No complaint selected', description: 'Select a complaint before escalating.' })
      return
    }

    try {
      await api.updateStatus(selectedComplaint.id, 'escalated')
      const updatedComplaint = { ...selectedComplaint, status: 'escalated' }
      setSelectedComplaint(updatedComplaint)
      setComplaints((prev) => prev.map((complaint) => complaint.id === selectedComplaint.id ? updatedComplaint : complaint))
      toast({ title: 'Case escalated', description: 'The selected complaint is now marked as escalated.' })
    } catch (err) {
      toast({ variant: 'destructive', title: 'Escalation failed', description: err instanceof Error ? err.message : 'Unknown error' })
    }
  }

  const escalateComplaint = async (complaint: Complaint) => {
    try {
      await api.updateStatus(complaint.id, 'escalated')
      const updatedComplaint = { ...complaint, status: 'escalated' }
      setSelectedComplaint((current) => current?.id === complaint.id ? updatedComplaint : current)
      setComplaints((prev) => prev.map((item) => item.id === complaint.id ? updatedComplaint : item))
      toast({ title: 'Case escalated', description: 'The timeline item is now marked as escalated.' })
    } catch (err) {
      toast({ variant: 'destructive', title: 'Escalation failed', description: err instanceof Error ? err.message : 'Unknown error' })
    }
  }

  const firstComplaint = complaints[0]
  const customerName = getCustomerLabel(firstComplaint)

  return (
    <DashboardShell
      activeItem="360° View"
      tabs={AGENT_TABS}
      activeTab="360° View"
      breadcrumb={<AppBreadcrumb current="360° View" />}
    >
      <div className="space-y-5 p-5">
        <Card>
          <CardContent className="p-4">
            <form
              className="flex flex-col gap-3 lg:flex-row lg:items-end"
              onSubmit={(event) => {
                event.preventDefault()
                searchCustomer()
              }}
            >
              <div className="flex-1">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground" htmlFor="customer-search">
                  Customer lookup
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="customer-search"
                    value={customerId}
                    onChange={(event) => setCustomerId(event.target.value)}
                    placeholder="Customer ID, name, email, phone, or account"
                    className="pl-9"
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading || !customerId.trim()} className="min-w-32">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
              </Button>
            </form>

            {customerSuggestions.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {customerSuggestions.map((complaint) => (
                  <button
                    key={complaint.customer_id}
                    type="button"
                    onClick={() => searchCustomer(complaint.customer_id)}
                    className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    {getCustomerLabel(complaint)}
                    <span className="ml-2 font-mono text-[10px]">{complaint.customer_id}</span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {!searched && !error && (
          <div className="flex min-h-[320px] items-center justify-center rounded-lg border bg-card">
            <div className="flex flex-col items-center text-center text-muted-foreground">
              {initialLoading ? <Loader2 aria-hidden="true" className="mb-4 h-10 w-10 animate-spin" /> : <UserRound aria-hidden="true" className="mb-4 h-10 w-10" />}
              <div className="mb-2 text-base font-semibold text-foreground">Search a customer to open their 360 view</div>
              <div className="max-w-sm text-sm">Pick a recent customer chip or search by ID, contact, or account details.</div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-5 text-sm text-destructive">
            <div className="mb-3 font-semibold">{error}</div>
            <Button variant="outline" onClick={() => searchCustomer()} disabled={!customerId.trim() || loading}>Retry</Button>
          </div>
        )}

        {searched && complaints.length > 0 && !error && (
          <>
            <div className="flex flex-col gap-4 rounded-lg border bg-card px-5 py-4 lg:flex-row lg:items-center">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="bg-primary/15 text-xl font-bold text-primary">{getInitials(customerName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="m-0 text-xl font-bold text-foreground">{customerName}</h2>
                  <span className="font-mono text-xs text-muted-foreground">{firstComplaint?.customer_id}</span>
                  {firstComplaint?.vip_customer && <Badge className="text-[10px] font-bold">VIP</Badge>}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {firstComplaint?.customer_email && <Badge variant="secondary">{firstComplaint.customer_email}</Badge>}
                  {firstComplaint?.customer_phone && <Badge variant="secondary">{firstComplaint.customer_phone}</Badge>}
                  {firstComplaint?.account_number && <Badge variant="secondary">{firstComplaint.account_number}</Badge>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border bg-background px-4 py-2"><div className="text-lg font-bold">{complaints.length}</div><div className="text-[10px] uppercase text-muted-foreground">Total</div></div>
                <div className="rounded-lg border bg-background px-4 py-2"><div className="text-lg font-bold">{customerSummary.open}</div><div className="text-[10px] uppercase text-muted-foreground">Open</div></div>
                <div className="rounded-lg border bg-background px-4 py-2"><div className="text-lg font-bold">{customerSummary.risk}</div><div className="text-[10px] uppercase text-muted-foreground">Risk</div></div>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
              <Card>
                <CardHeader>
                  <CardTitle>Complaint Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <Timeline defaultValue={selectedStep}>
                    {timelineComplaints.map((complaint, index) => {
                      const isSelected = selectedComplaint?.id === complaint.id
                      const chronologicalStep = timelineComplaints.length - index

                      return (
                        <HoverText
                          key={complaint.id}
                          text={(
                            <TimelineItem
                              step={chronologicalStep}
                              className={`cursor-pointer rounded-lg pr-3 transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'}`}
                              onClick={() => setSelectedComplaint(complaint)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault()
                                  setSelectedComplaint(complaint)
                                }
                              }}
                              role="button"
                              tabIndex={0}
                            >
                              <TimelineHeader className="pt-2">
                                <TimelineSeparator />
                                <div className="flex flex-wrap items-center gap-2">
                                  <TimelineDate>{formatDate(complaint.created_at)}</TimelineDate>
                                  <StatusBadge status={complaint.status} />
                                  {complaint.sla_breached && <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">SLA breached</span>}
                                  {complaint.regulatory_flag && <span className="rounded-full bg-warning-muted px-2 py-0.5 text-[10px] font-semibold text-warning">Regulatory</span>}
                                </div>
                                <TimelineTitle className={isSelected ? 'text-primary' : undefined}>
                                  {issueLabel(complaint)}
                                </TimelineTitle>
                                <div className="text-xs text-muted-foreground">{issueDescription(complaint)}</div>
                                <TimelineIndicator />
                              </TimelineHeader>
                              <TimelineContent className="pb-2">
                                <p className="line-clamp-2 text-left hover:text-foreground">{complaint.raw_text}</p>
                              </TimelineContent>
                            </TimelineItem>
                          )}
                          fullText={complaint.raw_text}
                          copyText={complaint.raw_text}
                          contentClassName="w-96"
                          triggerAsChild
                          actions={[
                            {
                              label: 'Select',
                              icon: <CheckCircle2 className="h-3.5 w-3.5" />,
                              onClick: () => setSelectedComplaint(complaint),
                            },
                            {
                              label: 'View details',
                              icon: <ExternalLink className="h-3.5 w-3.5" />,
                              onClick: () => navigate('complaint-detail', { id: complaint.id }),
                            },
                            {
                              label: 'Escalate',
                              icon: <AlertTriangle className="h-3.5 w-3.5" />,
                              onClick: () => escalateComplaint(complaint),
                            },
                          ]}
                        />
                      )
                    })}
                  </Timeline>
                </CardContent>
              </Card>

              <Card className="xl:sticky xl:top-20 xl:self-start">
                <CardHeader>
                  <CardTitle>Selected Case</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedComplaint ? (
                    <>
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{selectedComplaint.id}</span>
                          <StatusBadge status={selectedComplaint.status} />
                        </div>
                        <p className="text-sm leading-relaxed text-foreground/85">{selectedComplaint.raw_text}</p>
                      </div>

                      <div className="rounded-lg border bg-muted/30 px-3">
                        <InfoRow label="Channel" value={selectedComplaint.channel || 'N/A'} />
                        <InfoRow label="Issue category" value={issueLabel(selectedComplaint)} />
                        <InfoRow label="Customer need" value={selectedComplaint.intent || 'N/A'} />
                        <InfoRow label="Assigned" value={selectedComplaint.assigned_to || 'Unassigned'} />
                        <InfoRow label="SLA tier" value={selectedComplaint.sla_tier || 'N/A'} />
                      </div>

                      {(selectedComplaint.ai_draft || selectedComplaint.root_cause) && (
                        <div className="rounded-lg border bg-card p-3">
                          {selectedComplaint.root_cause && (
                            <>
                              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Root cause</div>
                              <p className="mb-3 text-sm text-foreground/85">{selectedComplaint.root_cause}</p>
                            </>
                          )}
                          {selectedComplaint.ai_draft && (
                            <>
                              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Latest draft</div>
                              <p className="line-clamp-5 text-sm leading-relaxed text-muted-foreground">{selectedComplaint.ai_draft}</p>
                            </>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => setSelectedComplaint(null)}>Clear</Button>
                        <Button className="flex-1" variant="destructive" onClick={handleEscalate}>Escalate</Button>
                      </div>
                    </>
                  ) : (
                    <div className="py-8 text-center text-sm text-muted-foreground">Select a timeline item.</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  )
}
