'use client'

import { useEffect, useState } from 'react'
import { useRouter } from '@/hooks/use-router'
import { api } from '@/lib/api-client'
import { AppSidebar } from '@/components/app-sidebar'
import { AppBreadcrumb } from '@/components/app-breadcrumb'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { useWebSocket } from '@/hooks/use-websocket'
import type { Complaint, HistoryEvent } from '@/types/complaint'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Clock,
  Copy,
  GitBranch,
  MessageSquare,
  RotateCcw,
  Send,
  Shield,
  Sparkles,
  User,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react'

function severityLevels(score: number | null | undefined) {
  if (score === null || score === undefined) return { label: 'Low', color: 'var(--success)', bg: 'color-mix(in oklch, var(--success) 12%, transparent)' }
  if (score >= 0.8) return { label: 'Critical', color: 'var(--destructive)', bg: 'color-mix(in oklch, var(--destructive) 12%, transparent)' }
  if (score >= 0.5) return { label: 'Medium', color: 'var(--warning)', bg: 'color-mix(in oklch, var(--warning) 15%, transparent)' }
  return { label: 'Low', color: 'var(--success)', bg: 'color-mix(in oklch, var(--success) 12%, transparent)' }
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-2.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  )
}

export function ComplaintDetailPage() {
  const { router, navigate } = useRouter()
  const id = router.params?.id

  const [complaint, setComplaint] = useState<Complaint | null>(null)
  const [timeline, setTimeline] = useState<HistoryEvent[]>([])
  const [draft, setDraft] = useState('')
  const [tone, setTone] = useState('apologetic')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [savingDetails, setSavingDetails] = useState(false)
  const [requestingDetails, setRequestingDetails] = useState(false)
  const [sendingResponse, setSendingResponse] = useState(false)
  const [timeLeftSec, setTimeLeftSec] = useState<number | null>(null)

  const { isConnected } = useWebSocket('/ws/supervisor', {
    onEvent: (event) => {
      if (event.complaint_id === id) {
        if (event.type === 'complaint_status_changed' || event.type === 'complaint_details_updated') {
          loadComplaintData()
        }
      }
    },
  })

  const loadComplaintData = async () => {
    if (!id) return
    try {
      const data = await api.getComplaint(id)
      setComplaint(data)
      setCustomerName(data.customer_name || '')
      setCustomerEmail(data.customer_email || '')
      setCustomerPhone(data.customer_phone || '')
      setAccountNumber(data.account_number || '')
      if (data.ai_draft) {
        setDraft(data.ai_draft)
      } else {
        try {
          const draftRes = await api.getDraft(id, tone)
          setDraft(draftRes.draft)
        } catch {
          setDraft('')
        }
      }
      try {
        const historyRes = await api.getComplaintHistory(id)
        setTimeline(historyRes.timeline || [])
      } catch {
        setTimeline([])
      }
      if (data.sla_deadline && !data.sla_breached && data.status !== 'resolved') {
        setTimeLeftSec(Math.max(0, Math.round((new Date(data.sla_deadline).getTime() - Date.now()) / 1000)))
      } else {
        setTimeLeftSec(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch complaint details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadComplaintData() }, [id])

  useEffect(() => {
    if (timeLeftSec === null || timeLeftSec <= 0) return
    const timer = setInterval(() => {
      setTimeLeftSec((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [timeLeftSec])

  const handleToneChange = async (newTone: string) => {
    if (!id) return
    setTone(newTone)
    try {
      const draftRes = await api.getDraft(id, newTone)
      setDraft(draftRes.draft)
    } catch {
      // Keep the current draft if regeneration fails.
    }
  }

  const handleSaveDetails = async () => {
    if (!id) return
    setSavingDetails(true)
    try {
      const updated = await api.updateUserDetails(id, {
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        account_number: accountNumber,
      })
      setComplaint(updated)
      toast({ title: 'Customer details saved', description: 'The profile fields were updated for this complaint.' })
    } catch (err) {
      toast({ variant: 'destructive', title: 'Save failed', description: err instanceof Error ? err.message : 'Failed to update details.' })
    } finally {
      setSavingDetails(false)
    }
  }

  const handleRequestDetails = async () => {
    if (!id) return
    setRequestingDetails(true)
    try {
      const res = await api.requestDetails(id)
      toast({ title: 'Details requested', description: 'The customer was contacted through the active channel.' })
      if (res.translated_message) setDraft(res.translated_message)
      loadComplaintData()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Request failed', description: err instanceof Error ? err.message : 'Failed to send details request.' })
    } finally {
      setRequestingDetails(false)
    }
  }

  const handleSendResponse = async () => {
    if (!id) return
    setSendingResponse(true)
    try {
      await api.respond(id, draft)
      toast({ title: 'Response sent', description: 'The ticket was resolved successfully.' })
      window.setTimeout(() => {
        navigate('complaints')
      }, 1500)
    } catch (err) {
      toast({ variant: 'destructive', title: 'Send failed', description: err instanceof Error ? err.message : 'Failed to send response.' })
    } finally {
      setSendingResponse(false)
    }
  }

  const renderSlaCountdown = () => {
    if (complaint?.sla_breached || (timeLeftSec !== null && timeLeftSec <= 0)) return <span className="font-bold text-destructive">BREACHED</span>
    if (timeLeftSec === null) return <span className="text-muted-foreground">No SLA</span>
    const h = Math.floor(timeLeftSec / 3600)
    const m = Math.floor((timeLeftSec % 3600) / 60)
    const s = timeLeftSec % 60
    return <span className={`font-mono font-bold ${timeLeftSec < 1800 ? 'text-destructive' : timeLeftSec < 3600 ? 'text-primary' : 'text-success'}`}>{h.toString().padStart(2, '0')}:{m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}</span>
  }

  if (loading) {
    return (
      <SidebarProvider className="h-dvh">
        <AppSidebar activeItem="All Complaints" />
        <SidebarInset>
          <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm text-muted-foreground">Loading complaint...</span>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  if (error || !complaint) {
    return (
      <SidebarProvider className="h-dvh">
        <AppSidebar activeItem="All Complaints" />
        <SidebarInset>
          <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="max-w-sm rounded-xl border border-destructive/30 p-8 text-center">
              <AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" />
              <div className="mb-2 text-base font-bold text-destructive">Error</div>
              <p className="mb-4 text-sm text-muted-foreground">{error || 'Complaint not found.'}</p>
              <Button onClick={() => navigate('complaints')}>Back to Queue</Button>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  const triage = severityLevels(complaint.severity_score)
  const statusLabel = complaint.status.replace('_', ' ')
  const emotionArc = complaint.emotion_arc && typeof complaint.emotion_arc === 'object'
    ? complaint.emotion_arc as Record<string, unknown>
    : null
  const latestEvents = timeline.slice(0, 4)

  return (
    <SidebarProvider className="h-dvh">
      <AppSidebar activeItem={complaint.assigned_to ? 'My Queue' : 'All Complaints'} />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur-sm">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 h-4" />
          <AppBreadcrumb
            className="flex-1"
            items={[{ label: complaint.assigned_to ? 'My Queue' : 'All Complaints', route: 'complaints' }]}
            current={complaint.customer_name || complaint.customer_id}
            meta={
              <>
                <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{complaint.id}</span>
                <Badge variant="outline" className="h-5 shrink-0 px-1.5 py-0 text-[10px]">{complaint.channel}</Badge>
              </>
            }
          />
          <div className="flex shrink-0 items-center gap-3 text-[11px]">
            <span className="text-muted-foreground">SLA:</span>
            {renderSlaCountdown()}
            <div className="flex items-center gap-1.5 rounded-full bg-muted/60 px-2 py-1">
              {isConnected ? <Wifi className="h-3 w-3 text-success" /> : <WifiOff className="h-3 w-3 text-destructive" />}
              <span className="text-muted-foreground">{isConnected ? 'Live' : 'Syncing'}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-background p-5">
          <div className="mx-auto grid max-w-[1220px] gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex flex-col gap-5">
              <section className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Case summary</div>
                    <h2 className="mt-1 text-lg font-bold text-foreground">{complaint.complaint_type || 'Customer complaint'}</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="capitalize">{statusLabel}</Badge>
                    <Badge variant="outline">{complaint.sla_tier || 'NORMAL'}</Badge>
                    <Badge style={{ background: triage.bg, color: triage.color, borderColor: 'transparent' }}>{triage.label}</Badge>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/40 p-4 text-[14px] leading-7 text-foreground">
                  {complaint.raw_text}
                </div>

                {complaint.detected_language && complaint.detected_language.split('-')[0].toLowerCase() !== 'en' && complaint.translated_text && (
                  <div className="mt-3 rounded-lg border border-dashed border-primary/30 bg-primary/8 p-3 text-xs leading-6 text-primary">
                    <div className="mb-1 font-bold uppercase tracking-wide">Translation ({complaint.detected_language.toUpperCase()})</div>
                    {complaint.translated_text}
                  </div>
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border bg-background p-3">
                    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      <Activity className="h-3.5 w-3.5" /> Severity
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${(complaint.severity_score || 0) * 100}%`, background: triage.color }} />
                    </div>
                    <div className="mt-2 text-[11px] text-muted-foreground">Score {complaint.severity_score?.toFixed(2) ?? '0.00'}</div>
                  </div>
                  <div className="rounded-lg border bg-background p-3">
                    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      <Shield className="h-3.5 w-3.5" /> SLA
                    </div>
                    <div className="text-sm font-bold">{renderSlaCountdown()}</div>
                    <div className="mt-2 truncate text-[11px] text-muted-foreground">{complaint.sla_deadline ? `Due ${new Date(complaint.sla_deadline).toLocaleDateString()}` : 'No deadline'}</div>
                  </div>
                  <div className="rounded-lg border bg-background p-3">
                    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      <GitBranch className="h-3.5 w-3.5" /> Classification
                    </div>
                    <div className="truncate text-sm font-semibold capitalize">{complaint.product_code || 'General'}</div>
                    <div className="mt-2 text-[11px] text-muted-foreground">{complaint.type_confidence !== null && complaint.type_confidence !== undefined ? `${(complaint.type_confidence * 100).toFixed(0)}% confidence` : 'Confidence pending'}</div>
                  </div>
                  <div className="rounded-lg border bg-background p-3">
                    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      <Zap className="h-3.5 w-3.5" /> Intent
                    </div>
                    <div className="truncate text-sm font-semibold capitalize">{complaint.intent || 'Unknown'}</div>
                    <div className="mt-2 text-[11px] text-muted-foreground">{complaint.assigned_to || 'Unassigned'}</div>
                  </div>
                </div>

                {(complaint.regulatory_obligation || complaint.cluster_id) && (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {complaint.regulatory_obligation && (
                      <div className="rounded-lg border border-destructive/20 bg-destructive/8 p-3 text-xs text-destructive">
                        <div className="mb-1 flex items-center gap-1.5 font-bold"><AlertTriangle className="h-3.5 w-3.5" /> Regulatory trigger</div>
                        {complaint.regulatory_obligation}
                      </div>
                    )}
                    {complaint.cluster_id && (
                      <div className="rounded-lg border border-warning/25 bg-warning/8 p-3 text-xs text-warning">
                        <div className="mb-1 flex items-center gap-1.5 font-bold"><Copy className="h-3.5 w-3.5" /> Similar complaints detected</div>
                        <span className="font-mono">{complaint.cluster_id}</span>
                      </div>
                    )}
                  </div>
                )}
              </section>

              <section className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-foreground">AI response draft</h2>
                      <span className="text-[11px] text-muted-foreground">Review, edit, then resolve</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Label className="text-[11px] font-medium text-muted-foreground">Tone</Label>
                    <select
                      value={tone}
                      onChange={(e) => handleToneChange(e.target.value)}
                      className="rounded-md border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="apologetic">Apologetic</option>
                      <option value="formal">Formal</option>
                      <option value="empathetic">Empathetic</option>
                      <option value="structured">Structured</option>
                    </select>
                  </div>
                </div>
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Gen-AI is preparing response draft..."
                  rows={12}
                  className="min-h-[300px] resize-y rounded-lg border-border bg-background text-[13px] leading-7 text-foreground focus:ring-1 focus:ring-ring"
                />
                <div className="mt-4 flex justify-end gap-2">
                  <Button onClick={() => handleToneChange(tone)} variant="outline" className="h-8 text-[12px]">
                    <RotateCcw className="mr-1 h-3.5 w-3.5" /> Regenerate
                  </Button>
                  <Button onClick={handleSendResponse} disabled={sendingResponse || !draft.trim() || complaint.status === 'resolved'} className="h-8 text-[12px]">
                    <Send className="mr-1 h-3.5 w-3.5" /> {sendingResponse ? 'Resolving...' : 'Send & Resolve'}
                  </Button>
                </div>
              </section>

              {latestEvents.length > 0 && (
                <section className="rounded-xl border bg-card p-5 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-sm font-bold text-foreground">Recent activity</h2>
                  </div>
                  <div className="space-y-3">
                    {latestEvents.map((evt, idx) => (
                      <div key={idx} className="rounded-lg border bg-background p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[12px] font-semibold text-foreground">{evt.action}</div>
                          <div className="shrink-0 text-[10px] text-muted-foreground">
                            {new Date(evt.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <div className="mt-1 text-[11px] leading-5 text-muted-foreground">{evt.description}</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <aside className="flex flex-col gap-5 xl:sticky xl:top-[76px] xl:self-start">
              <section className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-foreground">Customer details</h2>
                    <span className="text-[11px] text-muted-foreground">{complaint.customer_id}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Name</Label>
                    <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter name" className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Email</Label>
                    <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="Enter email" className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Phone</Label>
                    <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Enter phone" className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">Account number</Label>
                    <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Enter account number" className="h-8 text-xs" />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button onClick={handleSaveDetails} disabled={savingDetails} size="sm" className="h-8 text-[12px]">
                    {savingDetails ? 'Saving...' : 'Save'}
                  </Button>
                  <Button onClick={handleRequestDetails} disabled={requestingDetails} size="sm" variant="outline" className="h-8 text-[12px]">
                    {requestingDetails ? 'Requesting...' : 'Request Details'}
                  </Button>
                </div>
                {complaint.awaiting_details && (
                  <div className="mt-3 rounded-md border border-primary/20 bg-primary/10 p-2.5 text-[11px] font-medium text-primary">
                    Awaiting details from customer
                  </div>
                )}
              </section>

              <section className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-bold text-foreground">Operational context</h2>
                </div>
                <div className="divide-y divide-border text-xs">
                  <InfoRow label="Channel" value={complaint.channel} />
                  <InfoRow label="Created" value={new Date(complaint.created_at).toLocaleString()} />
                  <InfoRow label="Assigned" value={complaint.assigned_to || 'Unassigned'} />
                  <InfoRow label="Emotion" value={emotionArc ? `${String(emotionArc.initial || 'Neutral')} to ${String(emotionArc.current || 'Neutral')}` : 'Pending'} />
                  <InfoRow label="Duplicate cluster" value={complaint.cluster_id || 'None'} />
                </div>
              </section>

              <section className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <h2 className="text-sm font-bold text-foreground">Next steps</h2>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="rounded-lg border-l-[3px] border-primary bg-muted/60 p-3">
                    <div className="font-semibold text-foreground">Review the generated response</div>
                    <div className="mt-1 leading-5 text-muted-foreground">Edit tone or wording, then send and resolve when ready.</div>
                  </div>
                  <div className="rounded-lg border-l-[3px] border-success bg-muted/60 p-3">
                    <div className="font-semibold text-foreground">Capture missing customer details</div>
                    <div className="mt-1 leading-5 text-muted-foreground">Use Request Details only if account context is required.</div>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
