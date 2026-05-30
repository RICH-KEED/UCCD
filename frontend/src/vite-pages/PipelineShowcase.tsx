import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../auth/AuthContext'
import { api, API_BASE_URL } from '../api/client'
import type { WebSocketEvent, AgentListItem } from '../types/complaint'

const WS_URL = import.meta.env.VITE_WS_BASE_URL ?? 'ws://localhost:8000/api/v1'

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    onSubmit(text.trim(), channel)
    setText('')
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 16 }}>
      <div style={{ flex: 1 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter a complaint to test the pipeline..."
          disabled={disabled}
          style={{
            width: '100%',
            height: 40,
            borderRadius: 8,
            border: '1px solid #DADADA',
            padding: '0 12px',
            fontSize: 13,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>
      <select
        value={channel}
        onChange={(e) => setChannel(e.target.value)}
        disabled={disabled}
        style={{ height: 40, borderRadius: 8, border: '1px solid #DADADA', padding: '0 8px', fontSize: 13, background: 'white' }}
      >
        {channels.map((ch) => (
          <option key={ch} value={ch}>{ch}</option>
        ))}
      </select>
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        style={{
          height: 40, padding: '0 20px', borderRadius: 8, border: 'none', background: disabled ? '#CCC' : '#2846FF',
          color: 'white', fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
        }}
      >
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
      animate={{ scale: isActive ? 1.05 : 1, borderColor: colors.border }}
      style={{
        position: 'absolute',
        left: stage.x,
        top: stage.y + 250,
        width: 160,
        padding: '10px 12px',
        borderRadius: 10,
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        fontSize: 12,
        textAlign: 'center',
        transform: 'translate(-50%, -50%)',
        zIndex: 2,
      }}
    >
      <div style={{ fontSize: 18, marginBottom: 2 }}>{stage.icon}</div>
      <div style={{ fontWeight: 600, color: colors.text }}>{stage.label}</div>
      {status.status === 'completed' && status.elapsedMs && (
        <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{status.elapsedMs.toFixed(0)}ms</div>
      )}
      {status.status === 'running' && (
        <div style={{ fontSize: 10, color: '#2846FF', marginTop: 2 }}>processing...</div>
      )}
    </motion.div>
  )
}

function EdgeLine({ edge, stagesStatus, activeRunId }: { edge: typeof EDGES[0]; stagesStatus: Record<string, StageStatus>; activeRunId: string | null }) {
  const from = PIPELINE_STAGES.find((s) => s.id === edge.from)
  const to = PIPELINE_STAGES.find((s) => s.id === edge.to)
  if (!from || !to) return null

  const fromDone = stagesStatus[edge.from]?.status === 'completed'
  const isActive = activeRunId && (fromDone || stagesStatus[edge.from]?.status === 'running')
  const color = fromDone ? '#22C55E' : isActive ? '#2846FF' : '#E0E0E0'

  const x1 = from.x
  const y1 = from.y + 250
  const x2 = to.x
  const y2 = to.y + 250
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{
          background: 'white', borderRadius: 14, padding: 24, width: 700, maxHeight: '80vh', overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Pipeline Run Detail</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ marginBottom: 16, fontSize: 13, color: '#666' }}>
          <strong>Complaint:</strong> {run.rawText.slice(0, 100)}...<br />
          <strong>Channel:</strong> {run.channel} &nbsp; | &nbsp; <strong>Run ID:</strong> {run.runId.slice(0, 8)}
        </div>
        {PIPELINE_STAGES.map((stage) => {
          const s = run.stages[stage.id]
          if (!s || s.status === 'pending') return null
          return (
            <div key={stage.id} style={{
              marginBottom: 12, padding: 12, borderRadius: 8, border: '1px solid #EEE',
              background: s.status === 'failed' ? '#FEF2F2' : '#FAFAFA',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>{stage.icon}</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{stage.label}</span>
                <span style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 10,
                  background: s.status === 'completed' ? '#ECFDF5' : s.status === 'failed' ? '#FEF2F2' : '#EEE',
                  color: s.status === 'completed' ? '#16A34A' : s.status === 'failed' ? '#DC2626' : '#999',
                }}>
                  {s.status}{s.elapsedMs ? ` · ${s.elapsedMs.toFixed(0)}ms` : ''}
                </span>
              </div>
              {s.data && Object.keys(s.data).length > 0 && (
                <div style={{ fontSize: 11, color: '#555', marginLeft: 28, fontFamily: 'monospace' }}>
                  {Object.entries(s.data).map(([key, val]) => (
                    <div key={key} style={{ marginBottom: 2 }}>
                      <span style={{ color: '#999' }}>{key}:</span>{' '}
                      <span style={{ color: '#333' }}>
                        {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {run.assignedTo && (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: '#EEF2FF', fontSize: 13 }}>
            ✅ Assigned to <strong>{run.assignedTo}</strong>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

function PipelineDAG({ run, activeRunId }: { run: PipelineRun | null; activeRunId: string | null }) {
  const stagesStatus = run?.stages ?? {}
  return (
    <div style={{ position: 'relative', width: '100%', height: 520, overflow: 'auto' }}>
      <div style={{ position: 'relative', width: 1320, height: 500 }}>
        {EDGES.map((edge) => (
          <EdgeLine key={`${edge.from}-${edge.to}`} edge={edge} stagesStatus={stagesStatus} activeRunId={activeRunId} />
        ))}
        {PIPELINE_STAGES.map((stage) => (
          <StageNode
            key={stage.id}
            stage={stage}
            status={stagesStatus[stage.id] ?? { status: 'pending' }}
            isActive={activeRunId === run?.runId && (stagesStatus[stage.id]?.status === 'running' || stagesStatus[stage.id]?.status === 'completed')}
          />
        ))}
      </div>
    </div>
  )
}

export function PipelineShowcase() {
  const { user } = useAuth()
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [selectedRun, setSelectedRun] = useState<PipelineRun | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const wsRef = useRef<WebSocket | null>(null)
  const runsRef = useRef<PipelineRun[]>([])

  useEffect(() => {
    api.getPipelineRuns().then((data) => {
      const initial = (data.runs ?? []).map((r: Record<string, unknown>) => ({
        runId: '',
        complaintId: r.complaint_id as string,
        rawText: r.raw_text as string,
        channel: r.channel as string,
        stages: buildCompletedStages(r),
        assignedTo: r.assigned_to as string | undefined,
        completed: true,
        startedAt: r.created_at as string,
      }))
      setRuns(initial)
      runsRef.current = initial
    }).catch(() => {})
  }, [])

  const buildCompletedStages = (r: Record<string, unknown>): Record<string, StageStatus> => {
    const stages: Record<string, StageStatus> = {}
    if (r.translation_status) {
      stages.translation = { status: r.translation_status === 'failed' ? 'failed' : 'completed', data: { detected_language: r.detected_language, translation_status: r.translation_status } }
    }
    if (r.complaint_type) {
      stages.nlp = { status: 'completed', data: { complaint_type: r.complaint_type, type_confidence: r.type_confidence, product_code: r.product_code, intent: r.intent } }
    }
    if (r.emotion_arc) {
      stages.emotion = { status: 'completed', data: r.emotion_arc as Record<string, unknown> }
    }
    if (r.severity_score != null) {
      stages.severity = { status: 'completed', data: { severity_score: r.severity_score, sla_tier: r.sla_tier, priority_tier: r.priority_tier } }
    }
    if (r.cluster_id) {
      stages.dna = { status: 'completed', data: { cluster_id: r.cluster_id } }
    }
    if (r.breach_probability != null) {
      stages.escalation = { status: 'completed', data: { breach_probability: r.breach_probability, escalation_reason: r.escalation_reason } }
    }
    if (r.root_cause) {
      stages.root_cause = { status: 'completed', data: { root_cause: r.root_cause } }
    }
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
        const data = JSON.parse(event.data) as WebSocketEvent
        if (data.type === 'pipeline_stage_completed') {
          setRuns((prev) => {
            const next = [...prev]
            let run = next.find((r) => r.runId === data.pipeline_run_id)
            if (!run) {
              run = {
                runId: data.pipeline_run_id as string,
                complaintId: data.complaint_id as string,
                rawText: '',
                channel: '',
                stages: {},
                completed: false,
                startedAt: new Date().toISOString(),
              }
              next.unshift(run)
            }
            run.stages[data.stage as string] = {
              status: data.status as StageStatus['status'],
              data: data.data as Record<string, unknown>,
              elapsedMs: data.elapsed_ms as number | undefined,
            }
            run.complaintId = data.complaint_id as string
            if (!activeRunId) setActiveRunId(run.runId)
            return [...next]
          })
        } else if (data.type === 'pipeline_completed') {
          setRuns((prev) => {
            const next = [...prev]
            const run = next.find((r) => r.runId === data.pipeline_run_id)
            if (run) {
              run.completed = true
              run.assignedTo = data.assigned_to as string | undefined
            }
            return [...next]
          })
          if (data.pipeline_run_id === activeRunId) {
            setTimeout(() => setActiveRunId(null), 3000)
          }
        } else if (data.type === 'complaint_created') {
          setRuns((prev) => {
            api.getPipelineRuns().then((d) => {
              const fresh = (d.runs ?? []).map((r: Record<string, unknown>) => ({
                runId: '',
                complaintId: r.complaint_id as string,
                rawText: r.raw_text as string,
                channel: r.channel as string,
                stages: buildCompletedStages(r),
                assignedTo: r.assigned_to as string | undefined,
                completed: true,
                startedAt: r.created_at as string,
              }))
              setRuns(fresh)
            }).catch(() => {})
            return prev
          })
        }
      } catch { /* ignore */ }
    }
  }, [activeRunId])

  useEffect(() => {
    connectWS()
    return () => { wsRef.current?.close() }
  }, [connectWS])

  const handleSubmit = async (text: string, channel: string) => {
    setSubmitting(true)
    setError('')
    try {
      const token = localStorage.getItem('uccd.access_token')
      const res = await fetch(`${API_BASE_URL}/api/v1/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          customer_id: `test-${Date.now()}`,
          raw_text: text,
          channel,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail ?? 'Failed to create complaint')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const activeRun = runs.find((r) => r.runId === activeRunId)

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px 0' }}>
        AI Pipeline Showcase
        <span style={{
          marginLeft: 12, fontSize: 11, padding: '2px 10px', borderRadius: 10, fontWeight: 600,
          background: isConnected ? '#ECFDF5' : '#FEF2F2',
          color: isConnected ? '#16A34A' : '#DC2626',
        }}>
          {isConnected ? '● LIVE' : '○ RECONNECTING'}
        </span>
      </h1>
      <p style={{ fontSize: 13, color: '#666', margin: '0 0 20px 0' }}>
        Watch real complaints flow through the AI pipeline. Each stage shows the actual LLM output.
      </p>

      <TestComplaintForm onSubmit={handleSubmit} disabled={submitting} />
      {error && (
        <div style={{ color: '#DC2626', fontSize: 13, marginBottom: 12, padding: 8, background: '#FEF2F2', borderRadius: 6 }}>
          {error}
        </div>
      )}

      <div style={{
        background: 'white', borderRadius: 14, border: '1px solid #EEE', padding: 20,
        overflow: 'auto', marginBottom: 24,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#666', marginBottom: 8 }}>
          {activeRun ? `▶ Processing: ${activeRun.complaintId.slice(0, 8)}...` : '⏸ Waiting for complaint...'}
        </div>
        <PipelineDAG run={activeRun ?? null} activeRunId={activeRunId} />
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Recent Pipeline Runs</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {runs.slice(0, 15).map((run) => (
          <div
            key={run.runId || run.complaintId}
            onClick={() => setSelectedRun(run)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 10,
              background: 'white', border: run.runId === activeRunId ? '2px solid #2846FF' : '1px solid #EEE',
              cursor: 'pointer', transition: 'box-shadow .15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.06)' }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none' }}
          >
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: run.completed ? '#22C55E' : '#2846FF',
              animation: run.completed ? 'none' : 'pulse 1s infinite',
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {run.rawText || `Complaint ${run.complaintId.slice(0, 8)}`}
              </div>
              <div style={{ fontSize: 11, color: '#999' }}>
                {run.channel && `${run.channel} · `}{run.complaintId.slice(0, 8)}
                {run.assignedTo && ` · → ${run.assignedTo.split('@')[0]}`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {PIPELINE_STAGES.slice(0, 6).map((s) => {
                const status = run.stages[s.id]?.status
                return (
                  <div key={s.id} style={{
                    width: 22, height: 22, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: status === 'completed' ? '#ECFDF5' : status === 'failed' ? '#FEF2F2' : '#F5F5F5',
                    border: status === 'completed' ? '1px solid #BBF7D0' : status === 'failed' ? '1px solid #FECACA' : '1px solid #EEE',
                    fontSize: 10,
                  }} title={s.label}>
                    {s.icon}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedRun && <RunDetail run={selectedRun} onClose={() => setSelectedRun(null)} />}
      </AnimatePresence>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}