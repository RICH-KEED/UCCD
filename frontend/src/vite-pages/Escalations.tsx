import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppSidebar } from '../layout/AppSidebar'
import { api } from '../api/client'
import type { Complaint } from '../types/complaint'

function mapToRow(c: Complaint) {
  const hours = Math.max(0, Math.round((Date.now() - new Date(c.created_at).getTime()) / 3600000))
  return {
    escId: `ESC-${String(c.id).slice(0, 4)}`,
    complaintId: String(c.id),
    summary: (c.raw_text ?? '').slice(0, 50),
    customer: c.customer_name ?? c.customer_id,
    segment: c.vip_customer ? 'VIP' : 'Standard',
    escalatedTo: c.complaint_type ?? 'General',
    level: 'L1 → L2' as const,
    riskScore: Math.round((c.breach_probability ?? 0) * 100),
    timeWaiting: `${hours}h waiting`,
    timeHours: hours,
    status: (c.status === 'escalated' ? 'Pending' : c.status === 'in_progress' ? 'Assigned' : 'Resolved') as 'Pending' | 'Assigned' | 'Resolved',
    reason: c.escalation_reason ?? 'Repeated customer follow-ups',
    linkedIds: [String(c.id)],
    rootCause: c.root_cause ?? 'Under investigation',
    internalNotes: c.resolution_notes ?? '',
    followUps: 1,
    sentiment: (c.emotion_arc && typeof c.emotion_arc.current === 'string') ? c.emotion_arc.current : 'Neutral',
    route: 'General → L2 Support',
  }
}

type Esc = ReturnType<typeof mapToRow>

const filterOptions = ['All', 'Critical', 'L1→L2', 'L2→L3', 'Payments', 'Cards', 'Deposits', 'Loans', 'Pending', 'Assigned']
const sortOptions = ['Risk Score', 'Escalation Age', 'Severity', 'SLA Deadline']
const viewModes = ['Queue', 'Kanban', 'Timeline']

function RiskBar({ score }: { score: number }) {
  const color = score >= 80 ? '#DC2626' : score >= 60 ? '#F59E0B' : '#22C55E'
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, fontSize: 12 }}>
        <span style={{ fontWeight: 700, color }}>{score}</span>
        <span style={{ fontSize: 10, color: '#9CA3AF' }}>/100</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: '#F3F4F6', overflow: 'hidden', width: '100%', marginTop: 2 }}>
        <div style={{ height: '100%', width: `${score}%`, borderRadius: 2, background: color }} />
      </div>
    </div>
  )
}

function TimeBar({ hours }: { hours: number }) {
  const pct = Math.min((hours / 12) * 100, 100)
  const color = hours >= 8 ? '#DC2626' : hours >= 4 ? '#F59E0B' : '#22C55E'
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 2 }}>{hours}h</div>
      <div style={{ height: 5, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden', width: '100%' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: color }} />
      </div>
    </div>
  )
}

export function Escalations() {
  const navigate = useNavigate()
  const [escalations, setEscalations] = useState<Esc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('All')
  const [sort, setSort] = useState('Risk Score')
  const [viewMode, setViewMode] = useState('Queue')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedEsc, setSelectedEsc] = useState<Esc | null>(null)
  const [showRiskDetail, setShowRiskDetail] = useState<string | null>(null)

  const fetchEscalations = () => {
    setLoading(true)
    setError(null)
    api.getEscalations({ limit: 50 })
      .then((res) => {
        const mapped = res.complaints.map(mapToRow)
        setEscalations(mapped)
        if (mapped.length > 0) setSelectedEsc(mapped[0])
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load escalations')
      })
      .finally(() => {
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchEscalations()
  }, [])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const filtered = filter === 'All' ? escalations
    : filter === 'Pending' || filter === 'Assigned'
      ? escalations.filter((e) => e.status === filter)
      : filter === 'Critical'
        ? escalations.filter((e) => e.riskScore >= 80)
        : filter === 'L1→L2'
          ? escalations.filter((e) => e.level.replace(/\s+/g, '') === 'L1→L2')
          : filter === 'L2→L3'
            ? escalations.filter((e) => e.level.replace(/\s+/g, '') === 'L2→L3')
            : escalations.filter((e) => e.escalatedTo.toLowerCase().includes(filter.toLowerCase()))

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'Risk Score') return b.riskScore - a.riskScore
    if (sort === 'Escalation Age') return b.timeHours - a.timeHours
    return 0
  })

  const handleEscalate = async (id: string) => {
    try {
      await api.updateStatus(id, 'escalated')
      alert('Case escalated successfully')
      fetchEscalations()
    } catch {
      alert('Failed to escalate complaint')
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <AppSidebar activeItem="Escalations" />
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', background: '#F5F6FA' }}>
        <header style={{
          height: 56, background: 'white', borderBottom: '1px solid #E5E7EB',
          display: 'flex', alignItems: 'center', padding: '0 28px', gap: 16,
        }}>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>
            Escalations
          </h1>
          <div style={{ flex: 1, minWidth: 0, maxWidth: 480, height: 36, borderRadius: 20, background: '#F3F4F6', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" />
            </svg>
            <input type="text" placeholder="Search complaint ID, customer, escalation..."
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151' }} />
          </div>
          <button
            type="button"
            onClick={async () => {
              const id = prompt('Enter Complaint UUID or partial ID to escalate:')
              if (id) {
                try {
                  await api.updateStatus(id.trim(), 'escalated')
                  alert('Case escalated successfully')
                  window.location.reload()
                } catch (err) {
                  alert('Failed to escalate case: ' + (err instanceof Error ? err.message : String(err)))
                }
              }
            }}
            style={{ height: 34, padding: '0 16px', borderRadius: 8, background: '#DC2626', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            + Escalate Case
          </button>
        </header>

        <div style={{
          background: 'white', borderBottom: '1px solid #E5E7EB',
          padding: '10px 28px', display: 'flex', flexDirection: 'column', gap: 10,
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.3px' }}>Filter</span>
            {filterOptions.map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)}
                style={{
                  padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                  border: `1px solid ${filter === f ? '#2563EB' : '#E5E7EB'}`,
                  background: filter === f ? '#EFF6FF' : 'white',
                  color: filter === f ? '#1D4ED8' : '#6B7280',
                  cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .15s',
                }}>{f}</button>
            ))}
            <div style={{ width: 1, height: 24, background: '#E5E7EB', margin: '0 4px' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.3px' }}>Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #E5E7EB', fontSize: 12, fontWeight: 500, color: '#374151', background: '#F9FAFB', cursor: 'pointer', outline: 'none' }}>
              {sortOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <div style={{ display: 'flex', border: '1px solid #E5E7EB', borderRadius: 6, overflow: 'hidden' }}>
              {viewModes.map((m) => (
                <button key={m} type="button" onClick={() => setViewMode(m)}
                  style={{
                    padding: '4px 10px', fontSize: 11, fontWeight: 500,
                    background: viewMode === m ? '#3B82F6' : 'white',
                    color: viewMode === m ? 'white' : '#6B7280',
                    border: 'none', cursor: 'pointer',
                    borderRight: m !== 'Timeline' ? '1px solid #E5E7EB' : 'none',
                  }}>{m}</button>
              ))}
            </div>
            <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: '#6B7280' }}>
              {filtered.length} escalations
            </span>
          </div>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
            <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,.03)', overflow: 'hidden', minWidth: 0 }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #F0F0F0' }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>Escalation Queue</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '40px 100px minmax(0, 1fr) 120px 80px 100px 120px',
                  gap: 12, alignItems: 'center', padding: '10px 24px', background: '#FAFBFC', borderBottom: '1px solid #F0F0F0',
                  fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.4px',
                  minWidth: 800,
                }}>
                  <div></div>
                  <div>ID</div>
                  <div>Complaint / Customer</div>
                  <div>Type</div>
                  <div>Risk</div>
                  <div>Waiting</div>
                  <div>Actions</div>
                </div>

              {loading && (
                <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                  Loading escalations...
                </div>
              )}
              {error && (
                <div style={{ padding: 40, textAlign: 'center', color: '#DC2626', fontSize: 13 }}>
                  {error}
                </div>
              )}
              {!loading && !error && sorted.length === 0 && (
                <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                  No escalations found
                </div>
              )}

              {!loading && !error && sorted.map((e) => {
                const isExpanded = expandedId === e.escId
                const statusColors: Record<string, { bg: string; text: string }> = {
                  Pending: { bg: '#FEF3C7', text: '#92400E' },
                  Assigned: { bg: '#EFF6FF', text: '#1E40AF' },
                  Resolved: { bg: '#DCFCE7', text: '#16A34A' },
                }
                const st = statusColors[e.status]

                return (
                  <div key={e.escId}>
                    <div
                      onClick={() => setSelectedEsc(e)}
                      style={{
                        display: 'grid', gridTemplateColumns: '40px 100px minmax(0, 1fr) 120px 80px 100px 120px',
                        gap: 12, alignItems: 'center', padding: '14px 24px', borderBottom: '1px solid #F5F6FA',
                        background: selectedIds.has(e.escId) ? '#EFF6FF' : 'white',
                        cursor: 'pointer', transition: 'background .1s',
                        minWidth: 800,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="checkbox" checked={selectedIds.has(e.escId)} onChange={() => toggleSelect(e.escId)}
                          style={{ width: 14, height: 14, cursor: 'pointer' }} onClick={(ev) => ev.stopPropagation()} />
                        <button type="button" onClick={(ev) => { ev.stopPropagation(); setExpandedId(isExpanded ? null : e.escId) }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"
                            style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: '.15s' }}>
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', fontFamily: 'monospace' }}>{e.escId}</div>
                        <div style={{ fontSize: 10, color: '#9CA3AF' }} title={e.complaintId}>{String(e.complaintId).slice(0, 8)}...</div>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.customer}</div>
                        <div style={{ fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.summary}</div>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.escalatedTo}>{e.escalatedTo}</div>
                        <span style={{ padding: '1px 6px', borderRadius: 8, fontSize: 9, fontWeight: 600, color: st.text, background: st.bg }}>{e.status}</span>
                      </div>
                      <div onClick={(ev) => { ev.stopPropagation(); setShowRiskDetail(showRiskDetail === e.escId ? null : e.escId) }}>
                        <RiskBar score={e.riskScore} />
                      </div>
                      <TimeBar hours={e.timeHours} />
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[
                          { label: 'View', color: '#3B82F6', bg: '#EFF6FF', onClick: () => navigate(`/app/complaints/${e.complaintId}`) },
                          { label: 'Escalate', color: '#DC2626', bg: '#FEE2E2', onClick: () => handleEscalate(e.complaintId) },
                        ].map((btn) => (
                          <button key={btn.label} type="button" onClick={(ev) => { ev.stopPropagation(); btn.onClick?.() }}
                            style={{
                              padding: '4px 10px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                              color: btn.color, background: btn.bg ?? 'transparent',
                              border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                            }}>{btn.label}</button>
                        ))}
                      </div>
                    </div>

                    {showRiskDetail === e.escId && (
                      <div style={{
                        margin: '0 24px 0 60px', padding: 10, borderRadius: 8,
                        background: '#FFF7ED', border: '1px solid #FDE68A', fontSize: 11, color: '#92400E', lineHeight: 1.6,
                        minWidth: 800,
                      }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>Risk Score: {e.riskScore} — Contributors:</div>
                        {['Repeated follow-ups (+20)', 'Negative sentiment (+25)', `${e.segment} customer (+15)`, `SLA risk (+${e.riskScore - 60})`].map((c) => <div key={c} style={{ paddingLeft: 8 }}>• {c}</div>)}
                      </div>
                    )}

                    {isExpanded && (
                      <div style={{
                        padding: '14px 24px 14px 60px', display: 'flex', flexDirection: 'column', gap: 10,
                        borderBottom: '1px solid #F5F6FA', background: '#FAFBFC',
                        minWidth: 800,
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.3px' }}>Escalation Reason</div>
                        <p style={{ margin: 0, fontSize: 12, color: '#4B5563', lineHeight: 1.4 }}>{e.reason}</p>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.3px', marginTop: 4 }}>Root Cause</div>
                        <p style={{ margin: 0, fontSize: 12, color: '#4B5563', lineHeight: 1.4 }}>{e.rootCause}</p>
                        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                          <button type="button" onClick={() => handleEscalate(e.complaintId)}
                            style={{ padding: '5px 14px', borderRadius: 6, background: '#DC2626', color: 'white', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                            Escalate Now
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              </div>
            </div>

            {selectedEsc && (
              <div style={{
                background: 'white', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,.03)',
                position: 'sticky', top: 24, padding: 24,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a4 4 0 014 4c0 2-2 3-2 5h-4c0-2-2-3-2-5a4 4 0 014-4zM9 18h6M10 22h4" />
                    </svg>
                  </div>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>Escalation Intelligence</h3>
                  <span style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'monospace', marginLeft: 'auto' }}>{selectedEsc.escId}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>Classification</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {[selectedEsc.escalatedTo, 'Escalated', selectedEsc.level].map((t) => {
                        const isEsc = t.toLowerCase().includes('escalated');
                        const isLevel = t.toLowerCase().includes('l1') || t.toLowerCase().includes('l2') || t.toLowerCase().includes('l3') || t.includes('→');
                        const bg = isEsc ? '#FEF2F2' : isLevel ? '#F5F3FF' : '#EFF6FF';
                        const color = isEsc ? '#991B1B' : isLevel ? '#5B21B6' : '#1E40AF';
                        const border = isEsc ? '1px solid #FEE2E2' : isLevel ? '1px solid #E9D5FF' : '1px solid #DBEAFE';
                        return (
                          <span key={t} style={{ padding: '4px 12px', borderRadius: 12, background: bg, color: color, border: border, fontSize: 11, fontWeight: 600 }}>{t}</span>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>Analysis</div>
                    <p style={{ margin: 0, fontSize: 12, color: '#4B5563', lineHeight: 1.5 }}>
                      Contacted {selectedEsc.followUps} times. Sentiment: <strong style={{ color: '#DC2626' }}>{selectedEsc.sentiment}</strong>
                    </p>
                    <div style={{ marginTop: 8, fontSize: 12 }}>
                      <span style={{ color: '#6B7280' }}>Probability: </span>
                      <span style={{ fontWeight: 700, color: '#DC2626' }}>Very High</span>
                    </div>
                  </div>

                  <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>AI Suggested Routing</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{selectedEsc.route}</div>
                    <div style={{ fontSize: 11, color: '#16A34A', fontWeight: 600 }}>Confidence: 94%</div>
                  </div>

                  <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#0369A1', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>AI Draft Communication</div>
                    <p style={{ margin: '0 0 12px 0', fontSize: 12, color: '#0C4A6E', lineHeight: 1.5 }}>
                      Dear Customer, we are actively investigating and have escalated your issue. Ref: {selectedEsc.escId}. We will update you within 2 hours.
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" style={{ padding: '5px 14px', borderRadius: 6, background: '#3B82F6', color: 'white', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Send</button>
                      <button type="button" onClick={() => handleEscalate(selectedEsc.complaintId)}
                        style={{ padding: '5px 14px', borderRadius: 6, background: '#DC2626', color: 'white', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        Escalate
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}