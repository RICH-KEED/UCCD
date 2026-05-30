'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/lib/api-client'

const WS_URL = process.env.NEXT_PUBLIC_WS_BASE_URL || 'ws://localhost:8000/api/v1'

const PIPELINE_STAGES = [
  { id: 'translation', label: 'Translation', icon: '🌐', x: 280, y: 30 },
  { id: 'nlp', label: 'NLP Classify', icon: '🧠', x: 500, y: 30 },
  { id: 'emotion', label: 'Emotion', icon: '🎭', x: 500, y: 150 },
  { id: 'severity', label: 'Severity', icon: '⚡', x: 500, y: -90 },
  { id: 'dna', label: 'DNA Match', icon: '🔬', x: 720, y: -50 },
  { id: 'escalation', label: 'Escalation', icon: '🚨', x: 720, y: -170 },
  { id: 'root_cause', label: 'Root Cause', icon: '🔍', x: 920, y: 30 },
  { id: 'merge_and_save', label: 'Merge & Save', icon: '💾', x: 1120, y: 30 },
]

const EDGES = [
  { from: 'translation', to: 'nlp' },
  { from: 'nlp', to: 'emotion' },
  { from: 'nlp', to: 'severity' },
  { from: 'severity', to: 'dna' },
  { from: 'severity', to: 'escalation' },
  { from: 'dna', to: 'root_cause' },
  { from: 'emotion', to: 'merge_and_save' },
  { from: 'escalation', to: 'merge_and_save' },
  { from: 'root_cause', to: 'merge_and_save' },
]

interface StageStatus {
  status: 'pending' | 'running' | 'completed' | 'failed'
  data?: Record<string, unknown>
  elapsedMs?: number
}

interface PipelineRun {
  runId: string
  complaintId: string
  rawText: string
  channel: string
  stages: Record<string, StageStatus>
  assignedTo?: string
  completed: boolean
  startedAt: string
}

function TestComplaintForm({ onSubmit, disabled }: { onSubmit: (text: string, channel: string) => void; disabled: boolean }) {
  const [text, setText] = useState('')
  const [channel, setChannel] = useState('web')
  const channels = ['web', 'email', 'telegram', 'whatsapp', 'twitter', 'instagram']

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; onSubmit(text.trim(), channel); setText('') }} className="flex gap-2 items-end mb-4">
      <div className="flex-1">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter a complaint to test the pipeline..."
          disabled={disabled}
          className="w-full h-10 rounded-lg border border-input px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <select value={channel} onChange={(e) => setChannel(e.target.value)} disabled={disabled} className="h-10 rounded-lg border border-input px-2 text-sm bg-background">
        {channels.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
      </select>
      <button type="submit" disabled={disabled || !text.trim()} className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 whitespace-nowrap">
        Run Pipeline
      </button>
    </form>
  )
}

function StageNode({ stage, status, isActive }: { stage: typeof PIPELINE_STAGES[0]; status: StageStatus; isActive: boolean }) {
  const colors = {
    pending: { bg: '#F5F5F5', border: '#E0E0E0', text: '#999' },
    running: { bg: '#EEF2FF', border: '#2846FF', text: '#2846FF' },
    completed: { bg: '#ECFDF5', border: '#22C55E', text: '#16A34A' },
    failed: { bg: '#FEF2F2', border: '#EF4444', text: '#DC2626' },
  }[status.status]

  return (
    <motion.div
      animate={{ scale: isActive ? 1.05 : 1 }}
      style={{
        position: 'absolute', left: stage.x, top: stage.y + 250,
        width: 160, padding: '10px 12px', borderRadius: 10,
        background: colors.bg, border: `2px solid ${colors.border}`,
        fontSize: 12, textAlign: 'center', transform: 'translate(-50%, -50%)', zIndex: 2,
      }}
    >
      <div className="text-lg mb-0.5">{stage.icon}</div>
      <div className="font-semibold" style={{ color: colors.text }}>{stage.label}</div>
      {status.status === 'completed' && status.elapsedMs && (
        <div className="text-[10px] text-muted-foreground mt-0.5">{status.elapsedMs.toFixed(0)}ms</div>
      )}
      {status.status === 'running' && <div className="text-[10px] text-primary mt-0.5">processing...</div>}
    </motion.div>
  )
}

function EdgeLine({ edge, stagesStatus }: { edge: typeof EDGES[0]; stagesStatus: Record<string, StageStatus> }) {
  const from = PIPELINE_STAGES.find((s) => s.id === edge.from)
  const to = PIPELINE_STAGES.find((s) => s.id === edge.to)
  if (!from || !to) return null
  const fromDone = stagesStatus[edge.from]?.status === 'completed'
  const color = fromDone ? '#22C55E' : '#E0E0E0'
  const x1 = from.x; const y1 = from.y + 250
  const x2 = to.x; const y2 = to.y + 250
  const midX = (x1 + x2) / 2

  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
      <line x1={x1} y1={y1} x2={midX} y2={y1} stroke={color} strokeWidth={2} opacity={fromDone ? 1 : 0.3} />
      <line x1={midX} y1={y1} x2={midX} y2={y2} stroke={color} strokeWidth={2} opacity={fromDone ? 1 : 0.3} />
      <line x1={midX} y1={y2} x2={x2} y2={y2} stroke={color} strokeWidth={2} opacity={fromDone ? 1 : 0.3} />
    </svg>
  )
}

function RunDetail({ run, onClose }: { run: PipelineRun; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-background rounded-2xl p-6 w-[700px] max-h-[80vh] overflow-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Pipeline Run Detail</h3>
          <button onClick={onClose} className="text-xl cursor-pointer">✕</button>
        </div>
        <div className="mb-4 text-sm text-muted-foreground">
          <strong>Complaint:</strong> {run.rawText.slice(0, 100)}...<br />
          <strong>Channel:</strong> {run.channel} &nbsp; | &nbsp; <strong>Run ID:</strong> {run.runId.slice(0, 8)}
        </div>
        {PIPELINE_STAGES.map((stage) => {
          const s = run.stages[stage.id]
          if (!s || s.status === 'pending') return null
          return (
            <div key={stage.id} className={`mb-3 p-3 rounded-lg border ${s.status === 'failed' ? 'bg-destructive/8 border-destructive/15' : 'bg-muted/30 border-border'}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-base">{stage.icon}</span>
                <span className="font-semibold text-sm">{stage.label}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${s.status === 'completed' ? 'bg-success/10 text-success' : s.status === 'failed' ? 'bg-destructive/10 text-destructive' : ''}`}>
                  {s.status}{s.elapsedMs ? ` · ${s.elapsedMs.toFixed(0)}ms` : ''}
                </span>
              </div>
              {s.data && Object.keys(s.data).length > 0 && (
                <div className="text-[11px] text-muted-foreground ml-7 font-mono">
                  {Object.entries(s.data).map(([key, val]) => (
                    <div key={key} className="mb-0.5">
                      <span className="text-muted-foreground/60">{key}:</span> <span className="text-foreground">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {run.assignedTo && (
          <div className="mt-3 p-2.5 rounded-lg bg-accent text-sm">✅ Assigned to <strong>{run.assignedTo}</strong></div>
        )}
      </motion.div>
    </motion.div>
  )
}

function PipelineDAG({ run }: { run: PipelineRun | null }) {
  const stagesStatus = run?.stages ?? {}
  return (
    <div className="w-full h-[520px] overflow-auto">
      <div className="relative w-[1320px] h-[500px]">
        {EDGES.map((edge) => <EdgeLine key={`${edge.from}-${edge.to}`} edge={edge} stagesStatus={stagesStatus} />)}
        {PIPELINE_STAGES.map((stage) => (
          <StageNode key={stage.id} stage={stage}
            status={stagesStatus[stage.id] ?? { status: 'pending' }}
            isActive={stagesStatus[stage.id]?.status === 'running' || stagesStatus[stage.id]?.status === 'completed'} />
        ))}
      </div>
    </div>
  )
}

export function PipelineShowcasePage() {
  const { user } = useAuth()
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [selectedRun, setSelectedRun] = useState<PipelineRun | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    api.getPipelineRuns().then((data) => {
      setRuns((data.runs ?? []).map((r: Record<string, unknown>) => ({
        runId: '',
        complaintId: r.complaint_id as string,
        rawText: r.raw_text as string,
        channel: r.channel as string,
        stages: buildCompletedStages(r),
        assignedTo: r.assigned_to as string | undefined,
        completed: true,
        startedAt: r.created_at as string,
      })))
    }).catch(() => {})
  }, [])

  const buildCompletedStages = (r: Record<string, unknown>): Record<string, StageStatus> => {
    const stages: Record<string, StageStatus> = {}
    if (r.translation_status) stages.translation = { status: 'completed', data: { detected_language: r.detected_language, translation_status: r.translation_status } }
    if (r.complaint_type) stages.nlp = { status: 'completed', data: { complaint_type: r.complaint_type, type_confidence: r.type_confidence } }
    if (r.emotion_arc) stages.emotion = { status: 'completed', data: r.emotion_arc as Record<string, unknown> }
    if (r.severity_score != null) stages.severity = { status: 'completed', data: { severity_score: r.severity_score, sla_tier: r.sla_tier } }
    if (r.cluster_id) stages.dna = { status: 'completed', data: { cluster_id: r.cluster_id } }
    if (r.breach_probability != null) stages.escalation = { status: 'completed', data: { breach_probability: r.breach_probability } }
    if (r.root_cause) stages.root_cause = { status: 'completed', data: { root_cause: r.root_cause } }
    stages.merge_and_save = { status: 'completed', data: { assigned_to: r.assigned_to } }
    return stages
  }

  const connectWS = useCallback(() => {
    const ws = new WebSocket(`${WS_URL}/ws/supervisor`)
    wsRef.current = ws
    ws.onopen = () => setIsConnected(true)
    ws.onclose = () => setIsConnected(false)
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'pipeline_stage_completed') {
          setRuns((prev) => {
            const next = [...prev]
            let run = next.find((r) => r.runId === data.pipeline_run_id)
            if (!run) {
              run = { runId: data.pipeline_run_id, complaintId: data.complaint_id, rawText: '', channel: '', stages: {}, completed: false, startedAt: new Date().toISOString() }
              next.unshift(run)
            }
            run.stages[data.stage] = { status: data.status, data: data.data, elapsedMs: data.elapsed_ms }
            run.complaintId = data.complaint_id
            if (!activeRunId) setActiveRunId(run.runId)
            return [...next]
          })
        } else if (data.type === 'pipeline_completed') {
          setRuns((prev) => {
            const next = [...prev]
            const run = next.find((r) => r.runId === data.pipeline_run_id)
            if (run) { run.completed = true; run.assignedTo = data.assigned_to }
            return [...next]
          })
        }
      } catch { /* ignore */ }
    }
  }, [])

  useEffect(() => { connectWS(); return () => { wsRef.current?.close() } }, [connectWS])

  const handleSubmit = async (text: string, channel: string) => {
    setSubmitting(true); setError('')
    try {
      const token = localStorage.getItem('uccd.access_token')
      const res = await fetch(`http://localhost:8888/api/v1/complaints`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ customer_id: `test-${Date.now()}`, raw_text: text, channel }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail ?? 'Failed') }
    } catch (err) { setError(err instanceof Error ? err.message : 'Submission failed') }
    finally { setSubmitting(false) }
  }

  const activeRun = runs.find((r) => r.runId === activeRunId)

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <h1 className="text-2xl font-bold mb-1">
        AI Pipeline Showcase
        <span className={`ml-3 text-[11px] px-2.5 py-0.5 rounded-full font-semibold ${isConnected ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
          {isConnected ? '● LIVE' : '○ RECONNECTING'}
        </span>
      </h1>
      <p className="text-sm text-muted-foreground mb-5">Watch real complaints flow through the AI pipeline. Each stage shows the actual LLM output.</p>

      <TestComplaintForm onSubmit={handleSubmit} disabled={submitting} />
      {error && <div className="text-sm text-destructive mb-3 p-2 bg-destructive/8 rounded-md">{error}</div>}

      <div className="bg-background rounded-2xl border p-5 overflow-auto mb-6">
        <div className="text-sm font-semibold text-muted-foreground mb-2">
          {activeRun ? `▶ Processing: ${activeRun.complaintId.slice(0, 8)}...` : '⏸ Waiting for complaint...'}
        </div>
        <PipelineDAG run={activeRun ?? null} />
      </div>

      <h2 className="text-lg font-semibold mb-3">Recent Pipeline Runs</h2>
      <div className="flex flex-col gap-2">
        {runs.slice(0, 15).map((run) => (
          <div key={run.runId || run.complaintId} onClick={() => setSelectedRun(run)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl bg-background cursor-pointer transition-shadow hover:shadow-sm ${run.runId === activeRunId ? 'border-2 border-primary' : 'border border-border'}`}>
            <div className={`w-2 h-2 rounded-full ${run.completed ? 'bg-success' : 'bg-primary animate-pulse'}`} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{run.rawText || `Complaint ${run.complaintId.slice(0, 8)}`}</div>
              <div className="text-[11px] text-muted-foreground">{run.channel && `${run.channel} · `}{run.complaintId.slice(0, 8)}{run.assignedTo && ` · → ${run.assignedTo.split('@')[0]}`}</div>
            </div>
            <div className="flex gap-1">
              {PIPELINE_STAGES.slice(0, 6).map((s) => {
                const status = run.stages[s.id]?.status
                return <div key={s.id} className={`w-[22px] h-[22px] rounded-md flex items-center justify-center text-[10px] ${status === 'completed' ? 'bg-success/10 border border-success/30' : status === 'failed' ? 'bg-destructive/10 border border-destructive/30' : 'bg-muted border'}`} title={s.label}>{s.icon}</div>
              })}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>{selectedRun && <RunDetail run={selectedRun} onClose={() => setSelectedRun(null)} />}</AnimatePresence>
    </div>
  )
}