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
import { Textarea } from '@/components/ui/textarea'
import { DataTable, multiColumnFilterFn, valueInArrayFilterFn } from '@/components/ui/data-table'
import type { ColumnDef } from '@tanstack/react-table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { HoverText } from '@/components/ui/hover-text'
import { Loader2, MoreHorizontal, Copy, Send, RefreshCw } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const AGENT_TABS: ShellTab[] = [
  { label: 'Dashboard', route: 'dashboard' },
  { label: 'My Queue', route: 'complaints' },
  { label: 'AI Drafts', route: 'ai-drafts' },
  { label: '360° View', route: '360-view' },
]

interface DisplayDraft { id: string; complaintId: string; customer: string; summary: string; channel: string; tone: string; confidence: number; status: string; preview: string }



export function AiDraftsPage() {
  const [drafts, setDrafts] = useState<DisplayDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDraft, setSelectedDraft] = useState<DisplayDraft | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await api.listComplaints({ limit: 100 })
        if (cancelled) return
        const mapped: DisplayDraft[] = res.complaints.filter((c: Complaint) => c.ai_draft).map((c: Complaint, i: number) => ({
          id: `DFT-${1000 + i}`, complaintId: c.id, customer: c.customer_name ?? c.customer_id, summary: c.complaint_type || c.raw_text.slice(0, 60), channel: c.channel || 'Email',
          tone: c.intent === 'complaint' ? 'Apologetic' : c.intent === 'urgent' ? 'Urgent' : 'Formal', confidence: c.type_confidence ?? 80, status: c.status,
          preview: c.ai_draft || '',
        }))
        const sorted = [...mapped].sort((a, b) => b.confidence - a.confidence)
        setDrafts(sorted); if (sorted.length > 0) setSelectedDraft(sorted[0])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load drafts')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({ title: 'Draft copied', description: 'The response draft is now on your clipboard.' })
    } catch {
      toast({ variant: 'destructive', title: 'Copy failed', description: 'The draft could not be copied to the clipboard.' })
    }
  }
  const handleMarkSent = async (complaintId: string) => {
    try {
      await api.updateStatus(complaintId, 'resolved')
      setDrafts(prev => prev.filter(d => d.complaintId !== complaintId))
      if (selectedDraft?.complaintId === complaintId) setSelectedDraft(null)
      toast({ title: 'Response sent', description: 'The complaint was marked as resolved.' })
    } catch {
      toast({ variant: 'destructive', title: 'Status update failed', description: 'The complaint could not be marked as resolved.' })
    }
  }
  const handleRegenerate = async (complaintId: string) => {
    try {
      const res = await api.getDraft(complaintId)
      setDrafts(prev => prev.map(d => d.complaintId === complaintId ? { ...d, preview: res.draft } : d))
      if (selectedDraft?.complaintId === complaintId) setSelectedDraft(prev => prev ? { ...prev, preview: res.draft } : null)
      toast({ title: 'Draft regenerated', description: 'The latest AI response is ready for review.' })
    } catch {
      toast({ variant: 'destructive', title: 'Regeneration failed', description: 'The AI draft could not be regenerated.' })
    }
  }



  const columns: ColumnDef<DisplayDraft>[] = [
    {
      accessorKey: 'complaintId',
      header: 'Complaint ID',
      size: 100,
      cell: ({ getValue, row }) => (
        <HoverText
          text={(getValue() as string).slice(0, 8)}
          fullText={getValue() as string}
          className="cursor-pointer font-mono text-xs font-semibold text-muted-foreground hover:text-primary"
          onClick={() => setSelectedDraft(row.original)}
          actions={[
            { label: 'Send and resolve', icon: <Send className="h-3.5 w-3.5" />, onClick: () => handleMarkSent(row.original.complaintId) },
            { label: 'Regenerate draft', icon: <RefreshCw className="h-3.5 w-3.5" />, onClick: () => handleRegenerate(row.original.complaintId) },
          ]}
        />
      ),
      filterFn: multiColumnFilterFn,
    },
    {
      accessorKey: 'customer',
      header: 'Customer',
      size: 130,
      cell: ({ getValue, row }) => (
        <HoverText
          text={getValue() as string}
          className="max-w-[120px] cursor-pointer text-xs font-semibold text-foreground"
          onClick={() => setSelectedDraft(row.original)}
          actions={[
            { label: 'Send and resolve', icon: <Send className="h-3.5 w-3.5" />, onClick: () => handleMarkSent(row.original.complaintId) },
            { label: 'Regenerate draft', icon: <RefreshCw className="h-3.5 w-3.5" />, onClick: () => handleRegenerate(row.original.complaintId) },
          ]}
        />
      ),
    },
    {
      accessorKey: 'summary',
      header: 'Summary',
      size: 200,
      cell: ({ getValue, row }) => (
        <HoverText
          text={getValue() as string}
          className="max-w-[180px] text-[11px] text-foreground/80"
          actions={[
            { label: 'Send and resolve', icon: <Send className="h-3.5 w-3.5" />, onClick: () => handleMarkSent(row.original.complaintId) },
            { label: 'Regenerate draft', icon: <RefreshCw className="h-3.5 w-3.5" />, onClick: () => handleRegenerate(row.original.complaintId) },
          ]}
        />
      ),
    },
    {
      accessorKey: 'preview',
      header: 'Preview',
      size: 200,
      cell: ({ getValue, row }) => (
        <HoverText
          text={getValue() as string}
          className="max-w-[180px] text-[11px] text-muted-foreground"
          actions={[
            { label: 'Send and resolve', icon: <Send className="h-3.5 w-3.5" />, onClick: () => handleMarkSent(row.original.complaintId) },
            { label: 'Regenerate draft', icon: <RefreshCw className="h-3.5 w-3.5" />, onClick: () => handleRegenerate(row.original.complaintId) },
          ]}
        />
      ),
    },
    {
      accessorKey: 'channel',
      header: 'Channel',
      size: 80,
      cell: ({ getValue }) => <span className="text-[11px] text-muted-foreground whitespace-nowrap">{getValue() as string}</span>,
      filterFn: valueInArrayFilterFn,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 90,
      cell: ({ getValue }) => {
        const statusColor: Record<string, { bg: string; text: string }> = {
          queued: { bg: 'hsl(var(--warning) / 0.15)', text: 'hsl(var(--warning))' },
          new: { bg: 'hsl(var(--primary) / 0.1)', text: 'hsl(var(--primary))' },
          in_progress: { bg: 'hsl(var(--primary) / 0.1)', text: 'hsl(var(--primary))' },
          escalated: { bg: 'hsl(var(--destructive) / 0.1)', text: 'hsl(var(--destructive))' },
          resolved: { bg: 'hsl(var(--success) / 0.1)', text: 'hsl(var(--success))' },
        }
        const st = statusColor[getValue() as string] ?? statusColor.queued
        return <Badge variant="outline" className="text-[10px] font-semibold px-2 py-0" style={{ color: st.text, backgroundColor: st.bg, borderColor: 'transparent' }}>{getValue() as string}</Badge>
      },
      filterFn: valueInArrayFilterFn,
    },
    {
      accessorKey: 'tone',
      header: 'Tone',
      size: 80,
      cell: ({ getValue }) => <span className="text-[11px] text-muted-foreground whitespace-nowrap">{getValue() as string}</span>,
      filterFn: valueInArrayFilterFn,
    },
    {
      id: 'actions',
      header: 'Actions',
      size: 60,
      cell: ({ row }) => {
        const d = row.original
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
              <DropdownMenuItem onClick={() => handleCopy(d.preview)}>
                <Copy className="h-4 w-4 mr-2" /> Copy Draft
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleMarkSent(d.complaintId)}>
                <Send className="h-4 w-4 mr-2" /> Mark Sent
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleRegenerate(d.complaintId)}>
                <RefreshCw className="h-4 w-4 mr-2" /> Regenerate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  if (loading) return <DashboardShell activeItem="AI Drafts" tabs={AGENT_TABS} activeTab="AI Drafts"><div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></DashboardShell>
  if (error) return <DashboardShell activeItem="AI Drafts" tabs={AGENT_TABS} activeTab="AI Drafts"><div className="flex flex-col items-center justify-center min-h-[400px] gap-4"><div className="text-sm text-destructive">{error}</div><Button onClick={() => window.location.reload()}>Retry</Button></div></DashboardShell>

  return (
    <DashboardShell
      activeItem="AI Drafts"
      tabs={AGENT_TABS}
      activeTab="AI Drafts"
      searchPlaceholder="Search complaint ID, customer, draft content..."
      breadcrumb={<AppBreadcrumb current="AI Response Drafts" meta={`${drafts.length} drafts`} />}
    >
      <div className="p-5">
        <div className="grid grid-cols-[1.7fr_1fr] gap-6 items-start">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="p-5 pb-0"><CardTitle className="text-[15px] font-bold text-foreground">Draft Queue</CardTitle><div className="text-[11px] text-muted-foreground mt-1">AI-generated response drafts ready for review.</div></CardHeader>
            <CardContent className="p-5 pt-4">
              <DataTable
                columns={columns}
                data={drafts}
                enableRowSelection={true}
                enablePagination={true}
                defaultPageSize={10}
                searchColumn="complaintId"
                searchPlaceholder="Search drafts..."
                filterColumns={['channel', 'status', 'tone']}
                onSelectionChange={(rows) => {
                  if (rows.length > 0) setSelectedDraft(rows[0].original)
                }}
                defaultColumnVisibility={{ channel: false, status: false, tone: false }}
                className="[&_table]:text-[11px]"
              />
            </CardContent>
          </Card>

          {selectedDraft && (
            <Card className="bg-card border-border shadow-sm max-h-[calc(100vh-140px)] overflow-hidden">
              <div className="border-b border-border bg-card px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-bold text-foreground leading-tight">Draft Preview</h3>
                    <p className="mt-1 truncate text-[11px] text-muted-foreground">
                      {selectedDraft.customer} - {selectedDraft.complaintId.slice(0, 8)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" className="h-8 px-3 text-[12px]" onClick={() => handleMarkSent(selectedDraft.complaintId)}>
                      Mark Sent
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 px-3 text-[12px]" onClick={() => handleRegenerate(selectedDraft.complaintId)}>
                      Regenerate
                    </Button>
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-3 gap-x-4 gap-y-2 border-t border-border pt-3 text-[12px]">
                  <div className="min-w-0">
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Type</dt>
                    <dd className="mt-0.5 truncate font-medium text-foreground">{selectedDraft.summary}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Channel</dt>
                    <dd className="mt-0.5 truncate font-medium text-foreground">{selectedDraft.channel}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tone</dt>
                    <dd className="mt-0.5 truncate font-medium text-foreground">{selectedDraft.tone}</dd>
                  </div>
                </dl>
              </div>

              <div className="px-4 pb-4 pt-2">
                <div className="max-h-[calc(100vh-330px)] min-h-[360px] overflow-y-auto rounded-lg border border-border bg-background px-4 py-3">
                  <div className="text-[13px] leading-7 text-foreground/90 whitespace-pre-wrap">
                    {selectedDraft.preview}
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button size="sm" variant="ghost" className="h-8 px-3 text-[12px]" onClick={() => handleCopy(selectedDraft.preview)}>
                    Copy Draft
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}
