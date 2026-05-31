'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/use-auth'
import { api, API_BASE_URL } from '@/lib/api-client'
import { Play, Pause, SkipForward, Square, Globe, Activity, ShieldAlert, Cpu } from 'lucide-react'

const WS_URL = process.env.NEXT_PUBLIC_WS_BASE_URL || ''

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
      className="flex flex-col md:flex-row gap-3 items-stretch md:items-end mb-6 bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 shadow-lg backdrop-blur-md"
    >
      <div className="flex-1">
        <label className="text-xs font-bold tracking-wider text-slate-400 mb-1.5 block uppercase">Test Complaint Input</label>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a complaint (English, Hindi, or any language) to test the pipeline..."
          disabled={disabled}
          className="w-full h-11 rounded-lg border border-slate-700 bg-slate-950 px-4 text-sm text-slate-100 outline-none transition focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20"
        />
      </div>
      <div className="w-full md:w-36">
        <label className="text-xs font-bold tracking-wider text-slate-400 mb-1.5 block uppercase">Channel</label>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          disabled={disabled}
          className="w-full h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200 capitalize outline-none cursor-pointer focus-visible:border-blue-500"
        >
          {channels.map((ch) => <option key={ch} value={ch} className="bg-slate-950">{ch}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="h-11 px-5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/55 disabled:cursor-not-allowed text-white text-sm font-semibold cursor-pointer transition-colors shadow-md shadow-blue-950/20"
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
          className="h-11 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/55 disabled:cursor-not-allowed text-white text-sm font-semibold cursor-pointer transition-colors shadow-md shadow-emerald-950/20"
        >
          Simulate Flow
        </button>
      </div>
    </form>
  )
}

function StageNode({ stage, status, isActive }: { stage: typeof PIPELINE_STAGES[0]; status: StageStatus; isActive: boolean }) {
  const configs = {
    pending: { bg: 'bg-slate-900/40 border-slate-800 text-slate-500 shadow-none' },
    running: { bg: 'bg-blue-950/40 border-blue-500 text-blue-100 shadow-[0_0_20px_rgba(59,130,246,0.25)] ring-2 ring-blue-500/20' },
    completed: { bg: 'bg-emerald-950/40 border-emerald-500/70 text-emerald-100 shadow-[0_0_15px_rgba(16,185,129,0.15)]' },
    failed: { bg: 'bg-rose-950/40 border-rose-500/70 text-rose-100 shadow-[0_0_15px_rgba(244,63,94,0.15)]' },
  }[status.status]

  return (
    <motion.div
      animate={{ scale: isActive ? 1.05 : 1 }}
      className={`absolute flex flex-col items-center justify-center p-3 rounded-xl border backdrop-blur-md text-center z-10 w-40 ${configs.bg}`}
      style={{
        left: stage.x,
        top: stage.y + 250,
        transform: 'translate(-50%, -50%)',
        transition: 'border-color 0.3s, background-color 0.3s, color 0.3s, box-shadow 0.3s',
      }}
    >
      {/* Pulsing ring for running nodes */}
      {status.status === 'running' && (
        <span className="absolute -inset-1 rounded-xl bg-blue-500/10 border border-blue-500/45 animate-ping pointer-events-none" />
      )}
      
      <div className="text-xl mb-1">{stage.icon}</div>
      <div className="font-bold text-xs tracking-wide">{stage.label}</div>
      
      {status.status === 'completed' && status.elapsedMs && (
        <div className="text-[10px] text-emerald-400/80 font-mono mt-1 font-semibold">{status.elapsedMs.toFixed(0)}ms</div>
      )}
      {status.status === 'running' && (
        <div className="text-[10px] text-blue-400 font-mono mt-1 animate-pulse font-semibold">processing...</div>
      )}
      {status.status === 'pending' && (
        <div className="text-[10px] text-slate-600 mt-1 font-semibold">waiting</div>
      )}
    </motion.div>
  )
}

function EdgeLine({ edge, stagesStatus }: { edge: typeof EDGES[0]; stagesStatus: Record<string, StageStatus> }) {
  const from = PIPELINE_STAGES.find((s) => s.id === edge.from)
  const to = PIPELINE_STAGES.find((s) => s.id === edge.to)
  if (!from || !to) return null
  
  const fromDone = stagesStatus[edge.from]?.status === 'completed'
  const isRunning = stagesStatus[edge.to]?.status === 'running'

  // Beautiful active/glow lines vs pending lines
  const strokeColor = fromDone ? '#10B981' : isRunning ? '#3B82F6' : '#334155'
  const opacity = fromDone ? 1 : isRunning ? 0.8 : 0.25
  const strokeWidth = fromDone ? 3 : isRunning ? 2.5 : 2
  const dashArray = fromDone ? 'none' : '4,4'

  const x1 = from.x
  const y1 = from.y + 250
  const x2 = to.x
  const y2 = to.y + 250

  let pathD = ''
  
  if (Math.abs(x1 - x2) < 5) {
    // Vertical connection
    const startY = y1 < y2 ? y1 + 45 : y1 - 45
    const endY = y1 < y2 ? y2 - 45 : y2 + 45
    pathD = `M ${x1} ${startY} L ${x2} ${endY}`
  } else {
    // Stepped horizontal connection
    const startX = x1 + 80
    const endX = x2 - 82 // stop right at the arrowhead boundary
    const midX = (startX + endX) / 2
    pathD = `M ${startX} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${endX} ${y2}`
  }

  const markerId = `arrow-${edge.from}-${edge.to}`

  return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={strokeColor} opacity={opacity} />
        </marker>
      </defs>
      {/* Outer Glow Path */}
      {fromDone && (
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth + 4}
          opacity={0.15}
          className="transition-all duration-300"
          style={{ filter: 'blur(3px)' }}
        />
      )}
      {/* Core Path */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={dashArray}
        opacity={opacity}
        markerEnd={`url(#${markerId})`}
        className="transition-all duration-300"
      />
    </svg>
  )
}

function RunDetail({ run, onClose }: { run: PipelineRun; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] overflow-auto shadow-2xl text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Cpu className="text-blue-500 h-5 w-5" />
            Pipeline Run Execution
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 text-lg cursor-pointer p-1">✕</button>
        </div>
        <div className="mb-5 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs flex flex-col gap-2">
          <div><strong className="text-slate-400">Raw Input Text:</strong> <span className="text-slate-200">{run.rawText}</span></div>
          <div className="flex gap-6 mt-1 border-t border-slate-900 pt-2 text-slate-400">
            <div><strong className="text-slate-500">Channel:</strong> <span className="text-slate-300 capitalize">{run.channel}</span></div>
            <div><strong className="text-slate-500">Run ID:</strong> <span className="text-slate-300 font-mono">{run.runId.slice(0, 12)}</span></div>
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
                    ? 'bg-rose-950/15 border-rose-500/20'
                    : s.status === 'running'
                    ? 'bg-blue-950/15 border-blue-500/20 animate-pulse'
                    : 'bg-slate-950/50 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{stage.icon}</span>
                  <span className="font-semibold text-sm">{stage.label}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ml-auto ${
                    s.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : s.status === 'running'
                      ? 'bg-blue-500/10 text-blue-400'
                      : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    {s.status} {s.elapsedMs ? ` · ${s.elapsedMs.toFixed(0)}ms` : ''}
                  </span>
                </div>
                {s.data && Object.keys(s.data).length > 0 && (
                  <div className="text-[11px] text-slate-400 ml-6 bg-slate-950 p-2.5 rounded-lg border border-slate-900/60 font-mono flex flex-col gap-1">
                    {Object.entries(s.data).map(([key, val]) => (
                      <div key={key} className="flex gap-2">
                        <span className="text-slate-500 font-medium shrink-0">{key}:</span>
                        <span className="text-slate-300 break-all">
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
          <div className="mt-4 p-3 rounded-xl bg-blue-950/20 border border-blue-500/15 text-sm text-blue-300">
            ✅ Resolution flow complete. Ticket routed to agent: <strong>{run.assignedTo}</strong>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

function PipelineDAG({ run }: { run: PipelineRun | null }) {
  const stagesStatus = run?.stages ?? {}
  return (
    <div className="w-full h-[520px] overflow-auto rounded-xl bg-slate-950 border border-slate-900 relative">
      {/* Subtle grid background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1.5px,transparent_1.5px),linear-gradient(to_bottom,#0f172a_1.5px,transparent_1.5px)] bg-[size:3.5rem_3.5rem] opacity-45 pointer-events-none" />
      <div className="relative w-[1320px] h-[500px]">
        {EDGES.map((edge) => <EdgeLine key={`${edge.from}-${edge.to}`} edge={edge} stagesStatus={stagesStatus} />)}
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
        if (data.type === 'pipeline_stage_completed') {
          // If we are currently simulating, ignore live events to prevent visual conflicts
          if (simState) return

          setRuns((prev) => {
            const next = [...prev]
            let run = next.find((r) => r.runId === data.pipeline_run_id)
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
            }
            run.stages[data.stage] = { status: data.status, data: data.data, elapsedMs: data.elapsed_ms }
            run.complaintId = data.complaint_id
            if (!activeRunId) setActiveRunId(run.runId)
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
    // If a simulation is running, stop it
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  // --- SIMULATION LOGIC ---
  const getSimulationSteps = (rawText: string) => {
    const isHindi = rawText.match(/[\u0900-\u097F]/)
    const isCard = rawText.toLowerCase().includes('card') || rawText.toLowerCase().includes('क्रेडिट कार्ड')
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
              detected_language: isHindi ? 'hi' : 'en',
              language_name: isHindi ? 'Hindi' : 'English',
              translation_status: isHindi ? 'success' : 'skipped',
              translated_text: isHindi
                ? 'Hello, 18,500 rupees were debited from my credit card (last four digits 4321) last night without any OTP. I called customer care to block it, but your representative took too much time...'
                : rawText
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
              primary_cause: 'Unauthorized debit / OTP bypass',
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
      // Completed last step
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
        // Complete current stages
        nextStep.completed.forEach((c: any) => {
          r.stages[c.id] = { status: 'completed', data: c.data, elapsedMs: 1100 + Math.random() * 600 }
        })
        // Set next running stages
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

  // Simulation timer hook
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
    <div className="p-6 max-w-[1400px] mx-auto text-slate-100 min-h-screen">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          AI Pipeline Showcase
          <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold tracking-wider ${isConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
            {isConnected ? '● LIVE' : '○ DISCONNECTED'}
          </span>
        </h1>
      </div>
      <p className="text-sm text-slate-400 mb-6">Watch incoming complaints flow through the 7-agent AI pipeline in real time, or trigger a simulation to inspect step-by-step.</p>

      <TestComplaintForm onSubmit={handleSubmit} onSimulate={handleSimulate} disabled={submitting || (simState !== null && simState.isPlaying)} />
      {error && <div className="text-sm text-rose-400 mb-4 p-3 bg-rose-950/20 border border-rose-500/15 rounded-lg">{error}</div>}

      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden mb-8 shadow-inner backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {activeRun && !activeRun.completed && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${activeRun ? 'bg-blue-500' : 'bg-slate-700'}`}></span>
            </span>
            {activeRun ? `Processing ID: ${activeRun.complaintId.slice(0, 10)}` : 'Waiting for input'}
          </div>
          {simState && (
            <div className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/30 border border-emerald-500/25 px-2 py-0.5 rounded-full">
              Demo Simulation Mode
            </div>
          )}
        </div>
        
        <PipelineDAG run={activeRun ?? null} />

        {/* Simulation Control Panel Overlay */}
        {simState && (
          <div className="absolute bottom-6 left-6 right-6 bg-slate-950/90 border border-slate-800/80 backdrop-blur-md rounded-2xl p-3.5 shadow-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-l-4 border-l-emerald-500 transition-all duration-300">
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Simulation Stage</span>
              <span className="text-sm font-semibold text-slate-200 truncate mt-0.5">
                {simState.steps[simState.currentStepIndex]?.label}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSimState(prev => prev ? { ...prev, isPlaying: !prev.isPlaying } : null)}
                  className="h-9 px-3.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors bg-slate-800 hover:bg-slate-700"
                >
                  {simState.isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  {simState.isPlaying ? 'Pause' : 'Resume'}
                </button>
                <button
                  type="button"
                  onClick={advanceOneStep}
                  disabled={simState.currentStepIndex >= simState.steps.length - 1}
                  className="h-9 px-3 rounded-lg text-slate-300 hover:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Step Forward"
                >
                  <SkipForward size={14} />
                </button>
                <button
                  type="button"
                  onClick={stopSimulation}
                  className="h-9 px-3 rounded-lg text-rose-400 hover:text-rose-300 cursor-pointer transition-colors"
                  title="Stop simulation"
                >
                  <Square size={14} />
                </button>
              </div>
              
              <div className="h-6 w-px bg-slate-800 hidden md:block" />
              
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                {[1, 1.5, 2].map((sp) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => setSimState(prev => prev ? { ...prev, speed: sp } : null)}
                    className={`px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                      simState.speed === sp
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
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

      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Activity className="text-blue-500 h-5 w-5" />
        Execution History
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {runs.slice(0, 15).map((run) => (
          <div
            key={run.runId || run.complaintId}
            onClick={() => setSelectedRun(run)}
            className={`p-4 rounded-2xl bg-slate-900/30 border cursor-pointer transition hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between h-44 ${
              run.runId === activeRunId ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)] bg-blue-950/5' : 'border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${run.completed ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'}`} />
                <span className="text-[10px] font-bold text-slate-500 tracking-wider font-mono">ID: {run.complaintId.slice(0, 10)}</span>
                {run.channel && (
                  <span className="text-[9px] px-2 py-0.5 bg-slate-800 text-slate-300 font-semibold rounded-full border border-slate-700 uppercase ml-auto">
                    {run.channel}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed mb-3">
                {run.rawText || `Test Complaint ID: ${run.complaintId.slice(0, 8)}`}
              </p>
            </div>
            
            <div className="flex items-center justify-between border-t border-slate-900/60 pt-3">
              <div className="flex gap-1">
                {PIPELINE_STAGES.slice(0, 8).map((s) => {
                  const status = run.stages[s.id]?.status
                  return (
                    <div
                      key={s.id}
                      className={`w-[22px] h-[22px] rounded-md flex items-center justify-center text-[10px] border ${
                        status === 'completed'
                          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
                          : status === 'failed'
                          ? 'bg-rose-950/20 border-rose-500/30 text-rose-400'
                          : status === 'running'
                          ? 'bg-blue-950/20 border-blue-500/30 text-blue-400 animate-pulse'
                          : 'bg-slate-950 border-slate-800/60 text-slate-600'
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
