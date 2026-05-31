'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/use-auth'
import { api, API_BASE_URL } from '@/lib/api-client'
import { Play, Pause, SkipForward, Square, Cpu, Activity } from 'lucide-react'

const WS_URL = process.env.NEXT_PUBLIC_WS_BASE_URL || ''

// cx/cy are the CENTER coordinates of each node in the SVG/container space
const NODE_W = 160
const NODE_H = 80
const PIPELINE_STAGES = [
  { id: 'translation', label: 'Translation', icon: '🌐', cx: 120, cy: 250 },
  { id: 'nlp', label: 'NLP Classify', icon: '🧠', cx: 340, cy: 250 },
  { id: 'emotion', label: 'Emotion', icon: '🎭', cx: 560, cy: 370 },
  { id: 'severity', label: 'Severity', icon: '⚡', cx: 560, cy: 130 },
  { id: 'dna', label: 'DNA Match', icon: '🔬', cx: 780, cy: 130 },
  { id: 'escalation', label: 'Escalation', icon: '🚨', cx: 780, cy: 20 },
  { id: 'root_cause', label: 'Root Cause', icon: '🔍', cx: 1000, cy: 250 },
  { id: 'merge_and_save', label: 'Merge & Save', icon: '💾', cx: 1220, cy: 250 },
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

function TestComplaintForm({
  onSubmit,
  onSimulate,
  disabled,
}: {
  onSubmit: (text: string, channel: string) => void
  onSimulate: (text: string, channel: string) => void
  disabled: boolean
}) {
  const [text, setText] = useState('')
  const [channel, setChannel] = useState('web')
  const channels = ['web', 'email', 'telegram', 'whatsapp', 'twitter', 'instagram']

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!text.trim()) return
        onSubmit(text.trim(), channel)
        setText('')
      }}
      className="flex flex-col md:flex-row gap-3 items-slate md:items-end mb-6 bg-white/80 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-lg backdrop-blur-md"
    >
      <div className="flex-1">
        <label className="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block uppercase">Test Complaint Input</label>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a complaint (English, Hindi, or any language) to test the pipeline..."
          disabled={disabled}
          className="w-full h-11 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 px-4 text-sm text-slate-800 dark:text-slate-100 outline-none transition focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20"
        />
      </div>
      <div className="w-full md:w-36">
        <label className="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block uppercase">Channel</label>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          disabled={disabled}
          className="w-full h-11 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 px-3 text-sm text-slate-700 dark:text-slate-200 capitalize outline-none cursor-pointer focus-visible:border-blue-500"
        >
          {channels.map((ch) => <option key={ch} value={ch} className="bg-white dark:bg-slate-950">{ch}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="h-11 px-5 rounded-lg bg-blue-650 hover:bg-blue-600 disabled:opacity-55 disabled:cursor-not-allowed text-white text-sm font-semibold cursor-pointer transition-all hover:shadow-lg hover:shadow-blue-500/10 active:scale-98"
        >
          Run Live Pipeline
        </button>
        <button
          type="button"
          onClick={() => {
            if (!text.trim()) return
            onSimulate(text.trim(), channel)
            setText('')
          }}
          disabled={disabled || !text.trim()}
          className="h-11 px-5 rounded-lg bg-emerald-650 hover:bg-emerald-600 disabled:opacity-55 disabled:cursor-not-allowed text-white text-sm font-semibold cursor-pointer transition-all hover:shadow-lg hover:shadow-emerald-500/10 active:scale-98"
        >
          Simulate Flow
        </button>
      </div>
    </form>
  )
}

function StageNode({ stage, status, isActive }: { stage: typeof PIPELINE_STAGES[0]; status: StageStatus; isActive: boolean }) {
  const configs = {
    pending: {
      bg: 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 shadow-sm dark:shadow-none'
    },
    running: {
      bg: 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-500 text-blue-800 dark:text-blue-200 shadow-[0_0_20px_rgba(59,130,246,0.15)] ring-2 ring-blue-500/20'
    },
    completed: {
      bg: 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
    },
    failed: {
      bg: 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-500 text-rose-800 dark:text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
    },
  }[status.status]

  return (
    <motion.div
      animate={{ scale: isActive ? 1.04 : 1 }}
      className={`absolute flex flex-col items-center justify-center py-2 px-3 rounded-xl border backdrop-blur-md text-center z-10 w-40 h-[80px] ${configs.bg}`}
      style={{
        left: stage.cx,
        top: stage.cy,
        marginLeft: -NODE_W / 2,
        marginTop: -NODE_H / 2,
        transition: 'border-color 0.3s, background-color 0.3s, color 0.3s, box-shadow 0.3s',
      }}
    >
      {/* Pulsing ring for running nodes */}
      {status.status === 'running' && (
        <span className="absolute -inset-1 rounded-xl bg-blue-500/10 border border-blue-500/40 animate-ping pointer-events-none" />
      )}
      
      <div className="text-lg mb-0.5">{stage.icon}</div>
      <div className="font-bold text-xs tracking-wide leading-tight">{stage.label}</div>
      
      {status.status === 'completed' && status.elapsedMs && (
        <div className="text-[9px] text-emerald-600 dark:text-emerald-400/80 font-mono mt-0.5 font-semibold">{status.elapsedMs.toFixed(0)}ms</div>
      )}
      {status.status === 'running' && (
        <div className="text-[9px] text-blue-600 dark:text-blue-400 font-mono mt-0.5 animate-pulse font-semibold">processing...</div>
      )}
      {status.status === 'pending' && (
        <div className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 font-semibold">waiting</div>
      )}
    </motion.div>
  )
}

function RunDetail({ run, onClose }: { run: PipelineRun; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 dark:bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-auto shadow-2xl text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Cpu className="text-blue-500 h-5 w-5" />
            Pipeline Run Execution
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-100 text-lg cursor-pointer p-1">✕</button>
        </div>
        <div className="mb-5 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-850 text-xs flex flex-col gap-2">
          <div><strong className="text-slate-500 dark:text-slate-400">Raw Input Text:</strong> <span className="text-slate-700 dark:text-slate-200">{run.rawText}</span></div>
          <div className="flex gap-6 mt-1 border-t border-slate-200 dark:border-slate-900 pt-2 text-slate-500 dark:text-slate-400">
            <div><strong className="text-slate-400 dark:text-slate-500">Channel:</strong> <span className="text-slate-600 dark:text-slate-300 capitalize">{run.channel}</span></div>
            <div><strong className="text-slate-400 dark:text-slate-500">Run ID:</strong> <span className="text-slate-600 dark:text-slate-300 font-mono">{run.runId.slice(0, 12)}</span></div>
          </div>
        </div>
        
        <div className="flex flex-col gap-3">
          {PIPELINE_STAGES.map((stage) => {
            const s = run.stages[stage.id]
            if (!s || s.status === 'pending') return null
            return (
              <div
                key={stage.id}
                className={`p-3.5 rounded-xl border ${
                  s.status === 'failed'
                    ? 'bg-rose-50/50 dark:bg-rose-950/15 border-rose-200 dark:border-rose-500/20'
                    : s.status === 'running'
                    ? 'bg-blue-50/50 dark:bg-blue-950/15 border-blue-200 dark:border-blue-500/20 animate-pulse'
                    : 'bg-slate-50/20 dark:bg-slate-950/50 border-slate-100 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{stage.icon}</span>
                  <span className="font-semibold text-sm">{stage.label}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ml-auto ${
                    s.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : s.status === 'running'
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  }`}>
                    {s.status} {s.elapsedMs ? ` · ${s.elapsedMs.toFixed(0)}ms` : ''}
                  </span>
                </div>
                {s.data && Object.keys(s.data).length > 0 && (
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 ml-6 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-900/60 font-mono flex flex-col gap-1">
                    {Object.entries(s.data).map(([key, val]) => (
                      <div key={key} className="flex gap-2">
                        <span className="text-slate-400 dark:text-slate-500 font-medium shrink-0">{key}:</span>
                        <span className="text-slate-700 dark:text-slate-300 break-all">
                          {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        
        {run.assignedTo && (
          <div className="mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-500/15 text-sm text-blue-700 dark:text-blue-300">
            ✅ Resolution flow complete. Ticket routed to agent: <strong>{run.assignedTo}</strong>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

function PipelineDAG({ run }: { run: PipelineRun | null }) {
  const stagesStatus = run?.stages ?? {}
  const halfW = NODE_W / 2
  const halfH = NODE_H / 2
  return (
    <div className="w-full h-[440px] overflow-auto rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 relative">
      {/* Subtle grid background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.04)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] opacity-75 pointer-events-none" />
      {/* Single container sized to fit all nodes: width=1320, height=430 */}
      <div className="relative" style={{ width: 1360, height: 430 }}>
        {/* SVG for edges - same dimensions as container */}
        <svg
          className="absolute top-0 left-0 pointer-events-none"
          style={{ width: 1360, height: 430, zIndex: 5 }}
        >
          <style>{`
            @keyframes active-flow {
              to { stroke-dashoffset: -20; }
            }
            .animate-flow-path {
              stroke-dasharray: 8, 4;
              animation: active-flow 1.2s linear infinite;
            }
          `}</style>
          {EDGES.map(edge => {
            const from = PIPELINE_STAGES.find((s) => s.id === edge.from)
            const to = PIPELINE_STAGES.find((s) => s.id === edge.to)
            if (!from || !to) return null

            const fromDone = stagesStatus[edge.from]?.status === 'completed'
            const isRunning = stagesStatus[edge.to]?.status === 'running'

            let strokeColor = '#94a3b8' // slate-400
            let strokeWidth = 1.5
            let animated = false

            if (fromDone) {
              strokeColor = '#10b981' // emerald-500
              strokeWidth = 2.5
            } else if (isRunning) {
              strokeColor = '#3b82f6' // blue-500
              strokeWidth = 2
              animated = true
            }

            // Node centers
            const cx1 = from.cx
            const cy1 = from.cy
            const cx2 = to.cx
            const cy2 = to.cy

            // Determine which edges of the nodes to connect from/to
            let startX: number, startY: number, endX: number, endY: number
            let pathD: string
            let arrowType: 'right' | 'up' | 'down' | 'left' = 'right'

            const dx = cx2 - cx1
            const dy = cy2 - cy1

            if (Math.abs(dx) >= Math.abs(dy)) {
              // Mostly horizontal: connect right-edge of from to left-edge of to
              startX = cx1 + halfW
              startY = cy1
              endX = cx2 - halfW
              endY = cy2
              arrowType = dx > 0 ? 'right' : 'left'

              if (Math.abs(dy) < 5) {
                // Straight horizontal
                pathD = `M ${startX} ${startY} L ${endX - 6} ${endY}`
              } else {
                // Elbow: go horizontal then vertical
                const midX = startX + (endX - startX) / 2
                pathD = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX - 6} ${endY}`
              }
            } else {
              // Mostly vertical: connect bottom/top edges
              startX = cx1
              startY = dy > 0 ? cy1 + halfH : cy1 - halfH
              endX = cx2
              endY = dy > 0 ? cy2 - halfH : cy2 + halfH
              arrowType = dy > 0 ? 'down' : 'up'
              const adjustedEnd = dy > 0 ? endY - 6 : endY + 6
              pathD = `M ${startX} ${startY} L ${endX} ${adjustedEnd}`
            }

            // Arrowhead tip at (endX, endY)
            let arrowPoints = ''
            const A = 7 // arrow half-length
            const B = 4.5 // arrow half-width
            if (arrowType === 'right') {
              const tx = endX - 6
              const ty = endY
              arrowPoints = `${tx + A},${ty} ${tx - 2},${ty - B} ${tx - 2},${ty + B}`
            } else if (arrowType === 'left') {
              const tx = endX + 6
              const ty = endY
              arrowPoints = `${tx - A},${ty} ${tx + 2},${ty - B} ${tx + 2},${ty + B}`
            } else if (arrowType === 'down') {
              const tx = endX
              const ty = endY - 6
              arrowPoints = `${tx},${ty + A} ${tx - B},${ty - 2} ${tx + B},${ty - 2}`
            } else {
              const tx = endX
              const ty = endY + 6
              arrowPoints = `${tx},${ty - A} ${tx - B},${ty + 2} ${tx + B},${ty + 2}`
            }

            return (
              <g key={`${edge.from}-${edge.to}`}>
                {/* Glow behind completed edges */}
                {fromDone && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth + 4}
                    opacity={0.15}
                  />
                )}
                {/* Main path */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  opacity={!fromDone && !isRunning ? 0.5 : 1}
                  className={animated ? 'animate-flow-path' : ''}
                />
                {/* Arrowhead */}
                <polygon
                  points={arrowPoints}
                  fill={strokeColor}
                  opacity={!fromDone && !isRunning ? 0.5 : 1}
                />
              </g>
            )
          })}
        </svg>

        {/* Render Stage Nodes */}
        {PIPELINE_STAGES.map((stage) => (
          <StageNode
            key={stage.id}
            stage={stage}
            status={stagesStatus[stage.id] ?? { status: 'pending' }}
            isActive={stagesStatus[stage.id]?.status === 'running' || stagesStatus[stage.id]?.status === 'completed'}
          />
        ))}
      </div>
    </div>
  )
}

interface SimState {
  runId: string
  steps: any[]
  currentStepIndex: number
  isPlaying: boolean
  speed: number
}

export function PipelineShowcasePage() {
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [selectedRun, setSelectedRun] = useState<PipelineRun | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const wsRef = useRef<WebSocket | null>(null)

  // Simulation State
  const [simState, setSimState] = useState<SimState | null>(null)
  const simTimeoutRef = useRef<any>(null)

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
    if (r.translation_status) stages.translation = { status: 'completed', data: { detected_language: r.detected_language, translation_status: r.translation_status, translated_text: r.translated_text } }
    if (r.complaint_type) stages.nlp = { status: 'completed', data: { complaint_type: r.complaint_type, type_confidence: r.type_confidence, product_code: r.product_code } }
    if (r.emotion_arc) stages.emotion = { status: 'completed', data: r.emotion_arc as Record<string, unknown> }
    if (r.severity_score != null) stages.severity = { status: 'completed', data: { severity_score: r.severity_score, sla_tier: r.sla_tier } }
    if (r.cluster_id) stages.dna = { status: 'completed', data: { cluster_id: r.cluster_id } }
    if (r.breach_probability != null) stages.escalation = { status: 'completed', data: { breach_probability: r.breach_probability } }
    if (r.root_cause) stages.root_cause = { status: 'completed', data: { root_cause: r.root_cause } }
    stages.merge_and_save = { status: 'completed', data: { assigned_to: r.assigned_to } }
    return stages
  }

  const connectWS = useCallback(() => {
    const wsBase = WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/v1`
    const ws = new WebSocket(`${wsBase}/ws/supervisor`)
    wsRef.current = ws
    ws.onopen = () => setIsConnected(true)
    ws.onclose = () => setIsConnected(false)
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'complaint_created') {
          if (simState) return
          setRuns((prev) => {
            const next = [...prev]
            let run = next.find((r) => r.complaintId === data.complaint_id)
            if (!run) {
              run = {
                runId: '',
                complaintId: data.complaint_id,
                rawText: data.raw_text || '',
                channel: data.channel || 'web',
                stages: {},
                completed: false,
                startedAt: new Date().toISOString()
              }
              next.unshift(run)
            } else {
              run.rawText = data.raw_text || run.rawText
              run.channel = data.channel || run.channel
            }
            return [...next]
          })
        } else if (data.type === 'pipeline_stage_completed') {
          if (simState) return

          setRuns((prev) => {
            const next = [...prev]
            let run = next.find((r) => r.runId === data.pipeline_run_id || (r.complaintId === data.complaint_id && r.runId === ''))
            if (!run) {
              run = {
                runId: data.pipeline_run_id,
                complaintId: data.complaint_id,
                rawText: '',
                channel: '',
                stages: {},
                completed: false,
                startedAt: new Date().toISOString()
              }
              next.unshift(run)
            } else {
              run.runId = data.pipeline_run_id
            }
            run.stages[data.stage] = { status: data.status, data: data.data, elapsedMs: data.elapsed_ms }
            run.complaintId = data.complaint_id
            if (!activeRunId || activeRunId === '') setActiveRunId(run.runId)
            return [...next]
          })
        } else if (data.type === 'pipeline_completed') {
          if (simState) return
          setRuns((prev) => {
            const next = [...prev]
            const run = next.find((r) => r.runId === data.pipeline_run_id)
            if (run) {
              run.completed = true
              run.assignedTo = data.assigned_to
            }
            return [...next]
          })
        }
      } catch { /* ignore */ }
    }
  }, [simState, activeRunId])

  useEffect(() => { connectWS(); return () => { wsRef.current?.close() } }, [connectWS])

  const handleSubmit = async (text: string, channel: string) => {
    stopSimulation()
    setSubmitting(true)
    setError('')
    try {
      const token = localStorage.getItem('uccd.access_token')
      const res = await fetch(`${API_BASE_URL}/api/v1/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ customer_id: `test-${Date.now()}`, raw_text: text, channel }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail ?? 'Failed to submit complaint')
      }
      const data = await res.json()
      if (data && data.id) {
        setRuns((prev) => {
          const next = [...prev]
          let run = next.find((r) => r.complaintId === data.id)
          if (!run) {
            run = {
              runId: '',
              complaintId: data.id,
              rawText: text,
              channel: channel,
              stages: {},
              completed: false,
              startedAt: new Date().toISOString()
            }
            next.unshift(run)
          } else {
            run.rawText = text
            run.channel = channel
          }
          return [...next]
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  // --- SIMULATION LOGIC ---
  const getSimulationSteps = (rawText: string) => {
    const isHindi = rawText.match(/[\u0900-\u097F]/)
    const isTamil = rawText.match(/[\u0B80-\u0BFF]/)
    const isMarathi = rawText.match(/[\u0900-\u097F]/) && (rawText.includes('अद्याप') || rawText.includes('केली होती') || rawText.includes('झालेली नाही'))
    const isIndianLang = isHindi || isTamil || isMarathi
    const isCard = rawText.toLowerCase().includes('card') || rawText.toLowerCase().includes('क्रेडिट') || rawText.toLowerCase().includes('கார்டு')
    
    let detectedLangCode = 'en'
    let detectedLangName = 'English'
    let translatedPreview = rawText
    
    if (isTamil) {
      detectedLangCode = 'ta'
      detectedLangName = 'Tamil'
      translatedPreview = 'Hello, Rs. 28,000 has been debited from my credit card (last four digits 5678) without my permission. I immediately contacted customer care...'
    } else if (isMarathi) {
      detectedLangCode = 'mr'
      detectedLangName = 'Marathi'
      translatedPreview = 'Hello, I submitted my home loan documents three weeks ago. Your loan manager promised me that the loan would be approved...'
    } else if (isHindi) {
      detectedLangCode = 'hi'
      detectedLangName = 'Hindi'
      translatedPreview = 'Hello, 18,500 rupees were debited from my credit card last night without any OTP...'
    }

    return [
      {
        label: 'Step 1: Translating input complaint...',
        running: ['translation'],
        completed: []
      },
      {
        label: 'Step 2: Classifying Category & Intent...',
        running: ['nlp'],
        completed: [
          {
            id: 'translation',
            data: {
              detected_language: detectedLangCode,
              language_name: detectedLangName,
              translation_status: isIndianLang ? 'success' : 'skipped',
              translated_text: translatedPreview
            }
          }
        ]
      },
      {
        label: 'Step 3: Analyzing emotions & severity score in parallel...',
        running: ['emotion', 'severity'],
        completed: [
          {
            id: 'nlp',
            data: {
              complaint_type: isCard ? 'Credit Cards' : 'Loans',
              type_confidence: 0.95,
              product_code: isCard ? 'CC_SECURE_PAY' : 'LN_HL_DISBURSE'
            }
          }
        ]
      },
      {
        label: 'Step 4: Performing DNA matching and SLA breach analysis...',
        running: ['dna', 'escalation'],
        completed: [
          {
            id: 'emotion',
            data: {
              primary_sentiment: 'Angry / Urgent',
              customer_satisfaction_score: 1.2,
              anger_intensity: 0.85
            }
          },
          {
            id: 'severity',
            data: {
              severity_score: 9.0,
              sla_tier: 'Critical (4h)',
              sla_deadline: new Date(Date.now() + 4 * 3600 * 1000).toLocaleString()
            }
          }
        ]
      },
      {
        label: 'Step 5: Inspecting Root Cause...',
        running: ['root_cause'],
        completed: [
          {
            id: 'dna',
            data: {
              duplicate_found: false,
              cluster_id: 'cluster_card_security_772',
              similar_cases: 0
            }
          },
          {
            id: 'escalation',
            data: {
              breach_probability: 0.91,
              auto_escalated: true,
              escalation_reason: 'High severity + Short SLA tier'
            }
          }
        ]
      },
      {
        label: 'Step 6: Saving pipeline data to DB...',
        running: ['merge_and_save'],
        completed: [
          {
            id: 'root_cause',
            data: {
              primary_cause: isCard ? 'Unauthorized debit / OTP bypass' : 'Disbursement lag / System timeout',
              confidence: 0.92
            }
          }
        ]
      },
      {
        label: 'Step 7: Routing ticket & drafting AI response complete!',
        running: [],
        completed: [
          {
            id: 'merge_and_save',
            data: {
              assigned_to: 'rahul.sharma@unionbank.com',
              status: 'success',
              response_drafted: true
            }
          }
        ]
      }
    ]
  }

  const handleSimulate = (text: string, channel: string) => {
    stopSimulation()
    const mockId = `mock-run-${Date.now()}`
    const mockComplaintId = `MOCK-${Math.random().toString(36).substr(2, 8).toUpperCase()}`
    
    const mockRun: PipelineRun = {
      runId: mockId,
      complaintId: mockComplaintId,
      rawText: text,
      channel: channel,
      stages: {},
      completed: false,
      startedAt: new Date().toISOString()
    }

    setRuns((prev) => [mockRun, ...prev])
    setActiveRunId(mockId)
    setSimState({
      runId: mockId,
      steps: getSimulationSteps(text),
      currentStepIndex: 0,
      isPlaying: true,
      speed: 1
    })
  }

  const advanceSimulation = useCallback(() => {
    if (!simState) return
    const { runId, steps, currentStepIndex } = simState
    
    if (currentStepIndex >= steps.length - 1) {
      setRuns((prev) => {
        const next = [...prev]
        const r = next.find((x) => x.runId === runId)
        if (r) {
          r.completed = true
          r.assignedTo = 'rahul.sharma@unionbank.com'
        }
        return next
      })
      setSimState(null)
      return
    }

    const nextIndex = currentStepIndex + 1
    const nextStep = steps[nextIndex]

    setRuns((prev) => {
      const next = [...prev]
      const r = next.find((x) => x.runId === runId)
      if (r) {
        nextStep.completed.forEach((c: any) => {
          r.stages[c.id] = { status: 'completed', data: c.data, elapsedMs: 1100 + Math.random() * 600 }
        })
        nextStep.running.forEach((runStage: string) => {
          r.stages[runStage] = { status: 'running' }
        })
      }
      return next
    })

    setSimState((prev) => prev ? { ...prev, currentStepIndex: nextIndex } : null)
  }, [simState])

  const stopSimulation = useCallback(() => {
    if (simTimeoutRef.current) clearTimeout(simTimeoutRef.current)
    setSimState(null)
  }, [])

  const advanceOneStep = () => {
    if (simState) {
      setSimState(prev => prev ? { ...prev, isPlaying: false } : null)
      advanceSimulation()
    }
  }

  useEffect(() => {
    if (!simState || !simState.isPlaying) return
    
    const delay = 1800 / simState.speed
    simTimeoutRef.current = setTimeout(() => {
      advanceSimulation()
    }, delay)

    return () => clearTimeout(simTimeoutRef.current)
  }, [simState, advanceSimulation])

  const activeRun = runs.find((r) => r.runId === activeRunId)

  return (
    <div className="p-6 max-w-[1400px] mx-auto text-slate-800 dark:text-slate-100 min-h-screen">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent flex items-center gap-3">
          AI Pipeline Showcase
          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold tracking-wider ${isConnected ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'}`}>
            {isConnected ? '● LIVE' : '○ DISCONNECTED'}
          </span>
        </h1>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Watch incoming complaints flow through the 7-agent AI pipeline in real time, or trigger a simulation to inspect step-by-step.</p>

      <TestComplaintForm onSubmit={handleSubmit} onSimulate={handleSimulate} disabled={submitting || (simState !== null && simState.isPlaying)} />
      {error && <div className="text-sm text-rose-500 dark:text-rose-400 mb-4 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/15 rounded-lg">{error}</div>}

      <div className="bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 relative overflow-hidden mb-8 shadow-lg dark:shadow-inner backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {activeRun && !activeRun.completed && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${activeRun ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'}`}></span>
            </span>
            {activeRun ? `Processing ID: ${activeRun.complaintId.slice(0, 10)}` : 'Waiting for input'}
          </div>
          {simState && (
            <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 dark:border-emerald-500/25 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Demo Simulation Mode
            </div>
          )}
        </div>
        
        <PipelineDAG run={activeRun ?? null} />

        {/* Simulation Control Panel Overlay */}
        {simState && (
          <div className="absolute bottom-6 left-6 right-6 bg-white/95 dark:bg-slate-950/90 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md rounded-2xl p-3.5 shadow-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-l-4 border-l-emerald-500 transition-all duration-300">
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">Simulation Stage</span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                {simState.steps[simState.currentStepIndex]?.label}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSimState(prev => prev ? { ...prev, isPlaying: !prev.isPlaying } : null)}
                  className="h-9 px-3.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-transparent"
                >
                  {simState.isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  {simState.isPlaying ? 'Pause' : 'Resume'}
                </button>
                <button
                  type="button"
                  onClick={advanceOneStep}
                  disabled={simState.currentStepIndex >= simState.steps.length - 1}
                  className="h-9 px-3 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Step Forward"
                >
                  <SkipForward size={14} />
                </button>
                <button
                  type="button"
                  onClick={stopSimulation}
                  className="h-9 px-3 rounded-lg text-rose-600 dark:text-rose-400 hover:text-rose-500 cursor-pointer transition-colors"
                  title="Stop simulation"
                >
                  <Square size={14} />
                </button>
              </div>
              
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden md:block" />
              
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                {[1, 1.5, 2].map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => setSimState(prev => prev ? { ...prev, speed: sp } : null)}
                    className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      simState.speed === sp
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/10'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800'
                    }`}
                  >
                    {sp}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-white">
        <Activity className="text-blue-500 h-5 w-5" />
        Execution History
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {runs.slice(0, 15).map((run) => (
          <div
            key={run.runId || run.complaintId}
            onClick={() => setSelectedRun(run)}
            className={`p-4 rounded-2xl border cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between h-44 ${
              run.runId === activeRunId
                ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)] dark:shadow-[0_0_15px_rgba(59,130,246,0.15)] bg-blue-50/10 dark:bg-blue-950/5'
                : 'bg-white dark:bg-slate-900/30 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${run.completed ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'}`} />
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-wider font-mono">ID: {run.complaintId.slice(0, 10)}</span>
                {run.channel && (
                  <span className="text-[9px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-full border border-slate-200 dark:border-slate-700 uppercase ml-auto">
                    {run.channel}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3 leading-relaxed mb-3">
                {run.rawText || `Test Complaint ID: ${run.complaintId.slice(0, 8)}`}
              </p>
            </div>
            
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-900/60 pt-3">
              <div className="flex gap-1">
                {PIPELINE_STAGES.slice(0, 8).map((s) => {
                  const status = run.stages[s.id]?.status
                  return (
                    <div
                      key={s.id}
                      className={`w-[22px] h-[22px] rounded-md flex items-center justify-center text-[10px] border ${
                        status === 'completed'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                          : status === 'failed'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                          : status === 'running'
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 animate-pulse'
                          : 'bg-slate-50 dark:bg-slate-955 border-slate-200 dark:border-slate-800/60 text-slate-400 dark:text-slate-600'
                      }`}
                      title={s.label}
                    >
                      {s.icon}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedRun && <RunDetail run={selectedRun} onClose={() => setSelectedRun(null)} />}
      </AnimatePresence>
    </div>
  )
}
