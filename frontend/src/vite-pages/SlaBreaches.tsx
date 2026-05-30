import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppSidebar } from '../layout/AppSidebar'
import { api } from '../api/client'
import type { Complaint, DashboardKpis, TrendPoint } from '../types/complaint'
import { useAuth } from '../auth/AuthContext'

const severityColors: Record<string, { bg: string; text: string; dot: string }> = {
  Critical: { bg: '#FEE2E2', text: '#DC2626', dot: '#DC2626' },
  High: { bg: '#FFF7ED', text: '#EA580C', dot: '#EA580C' },
  Medium: { bg: '#FEF9C3', text: '#CA8A04', dot: '#CA8A04' },
  Low: { bg: '#DCFCE7', text: '#16A34A', dot: '#16A34A' },
}

function getSlaSeverityColor(pct: number) {
  if (pct >= 90) return '#DC2626'
  if (pct >= 70) return '#EA580C'
  if (pct >= 50) return '#F59E0B'
  return '#22C55E'
}

function computeSlaInfo(c: Complaint) {
  const now = Date.now()
  const created = new Date(c.created_at).getTime()
  const deadline = c.sla_deadline ? new Date(c.sla_deadline).getTime() : null
  const totalWindow = deadline ? deadline - created : 0
  const elapsed = now - created
  const slaPercent = totalWindow > 0 ? Math.min(100, Math.round((elapsed / totalWindow) * 100)) : 0
  const slaColor = getSlaSeverityColor(slaPercent)
  const timeLeftMs = deadline ? deadline - now : 0
  const timeLeftMin = Math.max(0, Math.ceil(timeLeftMs / 60000))
  const hoursLeft = Math.ceil(timeLeftMin / 60)
  const timeLabel = c.sla_breached
    ? 'Breached'
    : timeLeftMin < 60
      ? `${timeLeftMin}m left`
      : `${hoursLeft}h left`

  let slaStatus = 'ON TRACK'
  if (c.sla_breached) slaStatus = 'BREACHED'
  else if (slaPercent >= 95) slaStatus = 'BREACH IMMINENT'
  else if (slaPercent >= 75) slaStatus = 'AT RISK'
  else if (slaPercent >= 50) slaStatus = 'WATCHING'

  return { slaPercent, slaColor, timeLabel, slaStatus, timeLeftMin }
}

function getInitials(assigned: string | null | undefined) {
  if (!assigned) return '??'
  const parts = assigned.split(/[@.]/)
  const name = parts[0] || assigned
  return name.slice(0, 2).toUpperCase()
}

interface BreachRow {
  id: string
  complaint: Complaint
  priority: string
  customer: string
  issue: string
  slaPercent: number
  slaColor: string
  timeLabel: string
  timeLeftMin: number
  assigned: string
  escalation: string
  slaStatus: string
}

function makeBreachRow(c: Complaint): BreachRow {
  const info = computeSlaInfo(c)
  const priority = c.sla_tier || (c.priority_tier !== undefined ? `T${c.priority_tier}` : 'Medium')
  return {
    id: String(c.id).slice(0, 8),
    complaint: c,
    priority,
    customer: c.customer_id,
    issue: (c.raw_text || '').length > 55 ? c.raw_text!.slice(0, 55) + '…' : (c.raw_text || ''),
    slaPercent: info.slaPercent,
    slaColor: info.slaColor,
    timeLabel: info.timeLabel,
    timeLeftMin: info.timeLeftMin,
    assigned: getInitials(c.assigned_to),
    escalation: c.status === 'escalated' ? 'Auto Escalated' : 'Manual Review',
    slaStatus: info.slaStatus,
  }
}

function KpiCard({ title, value, badge, badgeBg, badgeColor }: {
  title: string; value: string; badge: string; badgeBg: string; badgeColor: string
}) {
  return (
    <div style={{
      background: 'white', borderRadius: 16, padding: 28,
      boxShadow: '0 2px 10px rgba(0,0,0,.03)',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      height: 150, boxSizing: 'border-box',
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.4px' }}>
        {title}
      </div>
      <div style={{ fontSize: 36, fontWeight: 700, color: '#111827', lineHeight: 1 }}>
        {value}
      </div>
      <span style={{
        fontSize: 11, fontWeight: 600, background: badgeBg, color: badgeColor,
        padding: '3px 10px', borderRadius: 8, display: 'inline-block', width: 'fit-content',
      }}>
        {badge}
      </span>
    </div>
  )
}

function TrendChart({ trends }: { trends: TrendPoint[] }) {
  const h = 100
  const w = 600
  const pad = 24
  const maxVal = Math.max(...trends.map((t) => t.count), 10)
  const chartW = w - pad * 2
  const step = trends.length > 1 ? chartW / (trends.length - 1) : chartW

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const points = trends.map((t, i) => {
    const d = new Date(t.date)
    return {
      x: pad + (trends.length === 1 ? chartW / 2 : i * step),
      y: pad + (h - pad * 2) * (1 - t.count / maxVal),
      val: t.count,
      day: dayLabels[d.getDay()],
    }
  })

  const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = lineD + ` L ${points[points.length - 1].x} ${h - pad} L ${points[0].x} ${h - pad} Z`

  const yTicks = [0, Math.round(maxVal * 0.25), Math.round(maxVal * 0.5), Math.round(maxVal * 0.75), maxVal]

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 'auto' }}>
      {yTicks.map((v) => {
        const y = pad + (h - pad * 2) * (1 - v / maxVal)
        return (
          <g key={v}>
            <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="#F3F4F6" strokeWidth="1" />
            <text x={pad - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#9CA3AF">{v}</text>
          </g>
        )
      })}
      {points.map((p) => (
        <text key={p.day + p.x} x={p.x} y={h - 4} textAnchor="middle" fontSize="9" fill="#9CA3AF">{p.day}</text>
      ))}
      <path d={lineD} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={areaD} fill="url(#blueGrad)" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p.val >= (maxVal * 0.6) ? 4 : 2.5}
          fill={p.val >= (maxVal * 0.6) ? '#DC2626' : '#3B82F6'} stroke="white" strokeWidth="1.5" />
      ))}
      <defs>
        <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function LoadingSpinner() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', flexDirection: 'column', gap: 16,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: '3px solid #E5E7EB', borderTopColor: '#3B82F6',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ fontSize: 14, color: '#6B7280', fontWeight: 500 }}>Loading SLA data…</span>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', flexDirection: 'column', gap: 16,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: '50%', background: '#FEE2E2',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>Failed to load data</span>
      <span style={{ fontSize: 13, color: '#6B7280', maxWidth: 360, textAlign: 'center' }}>{message}</span>
      <button type="button" onClick={onRetry}
        style={{
          padding: '8px 24px', borderRadius: 8, background: '#3B82F6', color: 'white',
          border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}
      >Retry</button>
    </div>
  )
}

export function SlaBreaches() {
  useAuth()
  const navigate = useNavigate()

  const [breaches, setBreaches] = useState<BreachRow[]>([])
  const [kpis, setKpis] = useState<DashboardKpis | null>(null)
  const [trends, setTrends] = useState<TrendPoint[]>([])
  const [riskCategories, setRiskCategories] = useState<{ name: string; pct: number; color: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filter, setFilter] = useState('All')
  const [selectedId, setSelectedId] = useState('')

  const catColors = ['#DC2626', '#EA580C', '#3B82F6', '#16A34A', '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B']

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [complaintsRes, kpisRes, trendsRes] = await Promise.all([
        api.listComplaints({ sla_breached: true, limit: 50 }),
        api.getKpis(),
        api.getTrends(7),
      ])

      const rows = (complaintsRes.complaints || []).map(makeBreachRow)
      setBreaches(rows)
      if (rows.length > 0) setSelectedId(rows[0].id)

      setKpis(kpisRes)

      const trendData = trendsRes.daily_volume || []
      const sorted = [...trendData].sort((a, b) => a.date.localeCompare(b.date))
      setTrends(sorted)

      const typeCounts: Record<string, number> = {}
      rows.forEach((r) => {
        const key = r.priority || 'Other'
        typeCounts[key] = (typeCounts[key] || 0) + 1
      })
      const total = rows.length || 1
      const categories = Object.entries(typeCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([name, count], i) => ({
          name,
          pct: Math.round((count / total) * 100),
          color: catColors[i % catColors.length],
        }))
      setRiskCategories(categories)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <AppSidebar activeItem="SLA Breaches" />
        <div style={{ flex: 1, minWidth: 0, background: '#F5F6FA' }}>
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <AppSidebar activeItem="SLA Breaches" />
        <div style={{ flex: 1, minWidth: 0, background: '#F5F6FA' }}>
          <ErrorState message={error} onRetry={fetchData} />
        </div>
      </div>
    )
  }

  const priorityValues = [...new Set(breaches.map((b) => b.priority))]
  const pills = ['All', ...priorityValues, 'Auto Escalated', 'Manual Review']

  const filtered = filter === 'All'
    ? breaches
    : filter === 'Auto Escalated' || filter === 'Manual Review'
      ? breaches.filter((b) => b.escalation === filter)
      : breaches.filter((b) => b.priority === filter)

  const selectedRow = breaches.find((b) => b.id === selectedId) ?? breaches[0]

  const kpiValue = (val: number | undefined) => String(val ?? 0)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <AppSidebar activeItem="SLA Breaches" />

      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', background: '#F5F6FA' }}>
        {/* HEADER */}
        <header style={{
          height: 64, background: 'white', borderBottom: '1px solid #E5E7EB',
          display: 'flex', alignItems: 'center', padding: '0 28px', gap: 20,
        }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.1 }}>
              SLA Breaches
            </h1>
            <p style={{ fontSize: 13, color: '#8A94A6', margin: '2px 0 0 0' }}>
              Monitor critical complaints approaching SLA violation
            </p>
          </div>

          <div style={{ flex: 1, minWidth: 0, maxWidth: 420, height: 36, borderRadius: 20, background: '#F3F4F6', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8, marginLeft: 'auto' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" />
            </svg>
            <input type="text" placeholder="Search complaint ID, customer, issue..."
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151' }}
            />
          </div>

          <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, position: 'relative', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            <span style={{ position: 'absolute', top: 3, right: 3, width: 7, height: 7, borderRadius: '50%', background: '#DC2626' }} />
          </button>

          <button type="button" style={{ height: 34, padding: '0 16px', borderRadius: 8, background: '#3B82F6', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
            + New
          </button>
        </header>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* KPI CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 20 }}>
            <KpiCard title="Critical Breaches" value={kpiValue(kpis?.breached)} badge={`${kpiValue(kpis?.breached)} total`} badgeBg="#FEE2E2" badgeColor="#EF4444" />
            <KpiCard title="At Risk" value={kpiValue(kpis?.sla_at_risk)} badge={`${kpiValue(kpis?.open)} open`} badgeBg="#FEF3C7" badgeColor="#F59E0B" />
            <KpiCard title="Auto Escalated" value={kpiValue(kpis?.escalated)} badge={`${kpiValue(kpis?.resolution_rate)}% resolved`} badgeBg="#DCFCE7" badgeColor="#16A34A" />
            <KpiCard title="Avg Breach Delay" value={`${kpiValue(kpis?.avg_resolution_hours)}h`} badge="Target: <1h" badgeBg="#E0E7FF" badgeColor="#4F46E5" />
          </div>

          {/* MAIN CONTENT */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>

            {/* BREACH FEED TABLE */}
            <div style={{
              background: 'white', borderRadius: 16, overflow: 'hidden', minWidth: 0,
              boxShadow: '0 2px 10px rgba(0,0,0,.03)',
            }}>
              <div style={{
                padding: '20px 24px', borderBottom: '1px solid #F0F0F0',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>SLA Breach Feed</h3>
                <button type="button" style={{
                  fontSize: 12, fontWeight: 600, color: '#3B82F6', background: 'none',
                  border: 'none', cursor: 'pointer',
                }}>View All →</button>
              </div>

              {/* FILTER PILLS */}
              <div style={{ padding: '14px 24px', borderBottom: '1px solid #F0F0F0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {pills.map((p) => {
                  const isActive = filter === p
                  return (
                    <button key={p} type="button" onClick={() => setFilter(p)}
                      style={{
                        height: 36, padding: '0 18px', borderRadius: 999,
                        border: `1px solid ${isActive ? '#2563EB' : '#E5E7EB'}`,
                        background: isActive ? '#EFF6FF' : 'white',
                        color: isActive ? '#1D4ED8' : '#6B7280',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        whiteSpace: 'nowrap', transition: 'all .15s',
                      }}
                    >{p}</button>
                  )
                })}
              </div>

              <div style={{ overflowX: 'auto' }}>
                {/* TABLE HEADER */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '100px 80px 120px minmax(0, 1fr) 80px 60px 130px 90px 120px',
                  gap: 10, alignItems: 'center',
                  height: 50, padding: '0 24px',
                  background: '#FAFBFC', borderBottom: '1px solid #F0F0F0',
                  fontSize: 11, fontWeight: 600, letterSpacing: '.4px',
                  color: '#9CA3AF', textTransform: 'uppercase',
                  minWidth: 1000,
                }}>
                  {['ID', 'Priority', 'Customer', 'Issue', 'Time Left', 'Assigned', 'Escalation', 'SLA Status', 'Actions'].map((h) => (
                    <div key={h} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h}</div>
                  ))}
                </div>

                {/* TABLE ROWS */}
                {filtered.map((b) => {
                  const isSelected = b.id === selectedId
                  const sev = severityColors[b.priority] ?? severityColors.Medium

                  return (
                    <div key={b.id}
                      onClick={() => setSelectedId(b.id)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '100px 80px 120px minmax(0, 1fr) 80px 60px 130px 90px 120px',
                        gap: 10, alignItems: 'center',
                        padding: '13px 24px', borderBottom: '1px solid #F5F6FA',
                        background: isSelected ? '#EFF6FF' : 'white',
                        borderLeft: isSelected ? '3px solid #3B82F6' : '3px solid transparent',
                        cursor: 'pointer', transition: 'background .1s',
                        minWidth: 1000,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', fontFamily: 'monospace' }}>
                        {b.id}
                      </span>

                      <span style={{
                        padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                        color: sev.text, background: sev.bg, whiteSpace: 'nowrap',
                        width: 'fit-content',
                      }}>{b.priority}</span>

                      <span style={{ fontSize: 12, fontWeight: 500, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.customer}
                      </span>

                      <span style={{ fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                        {b.issue}
                      </span>

                      <div>
                        <div style={{ height: 6, borderRadius: 999, background: '#F3F4F6', overflow: 'hidden', width: 80 }}>
                          <div style={{
                            height: '100%', width: `${b.slaPercent}%`,
                            borderRadius: 999, background: b.slaColor,
                          }} />
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: b.slaColor, marginTop: 3 }}>{b.timeLabel}</div>
                      </div>

                      <span style={{
                        width: 26, height: 26, borderRadius: '50%', background: '#EEF2FF',
                        color: '#4F46E5', fontSize: 10, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{b.assigned}</span>

                      <span style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {b.escalation}
                      </span>

                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        color: b.escalation === 'Auto Escalated' ? '#16A34A' : '#F59E0B',
                      }}>{b.slaStatus}</span>

                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" style={{
                          padding: '4px 12px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                          background: '#FEE2E2', color: '#DC2626', border: 'none', cursor: 'pointer',
                        }}>Escalate</button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/app/complaints/${b.complaint.id}`) }} style={{
                          padding: '4px 12px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                          background: '#EFF6FF', color: '#3B82F6', border: 'none', cursor: 'pointer',
                        }}>View</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* GEN-AI ESCALATION INTELLIGENCE */}
            <div style={{
              background: 'white', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,.03)',
              position: 'sticky', top: 24, padding: 24,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 8,
                  background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a4 4 0 014 4c0 2-2 3-2 5h-4c0-2-2-3-2-5a4 4 0 014-4zM9 18h6M10 22h4" />
                  </svg>
                </div>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>Escalation Intelligence</h3>
                {selectedRow && (
                  <span style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'monospace', marginLeft: 'auto' }}>{selectedRow.id}</span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>
                    Breach Classification
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {selectedRow && selectedRow.complaint ? (
                      [
                        selectedRow.complaint.complaint_type,
                        selectedRow.priority,
                        selectedRow.complaint.vip_customer ? 'VIP' : '',
                        selectedRow.complaint.sla_tier
                      ]
                        .filter((t): t is string => typeof t === 'string' && t !== '')
                        .map((t) => {
                          const isVip = t.toLowerCase().includes('vip') || t.toLowerCase().includes('critical') || t.toLowerCase().includes('high');
                          const bg = isVip ? '#FEF2F2' : '#EFF6FF';
                          const color = isVip ? '#991B1B' : '#1E40AF';
                          const border = isVip ? '1px solid #FEE2E2' : '1px solid #DBEAFE';
                          return (
                            <span key={t} style={{
                              padding: '4px 12px', borderRadius: 12, background: bg,
                              color: color, border: border, fontSize: 11, fontWeight: 600,
                            }}>{t}</span>
                          );
                        })
                    ) : (
                      ['Payments', 'UPI', 'Critical', 'High Value'].map((t) => (
                        <span key={t} style={{
                          padding: '4px 12px', borderRadius: 12, background: '#EFF6FF',
                          color: '#1E40AF', border: '1px solid #DBEAFE', fontSize: 11, fontWeight: 600,
                        }}>{t}</span>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>
                    Risk Analysis
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: '#4B5563', lineHeight: 1.55 }}>
                    Customer contacted support <strong style={{ color: '#DC2626' }}>4 times in 90 minutes.</strong>
                  </p>
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <span style={{ color: '#6B7280' }}>Likelihood of escalation:</span>
                      {(() => {
                        const prob = selectedRow?.complaint?.breach_probability ?? 0;
                        const label = prob >= 0.8 ? 'Very High' : prob >= 0.5 ? 'High' : 'Medium';
                        const color = prob >= 0.8 ? '#DC2626' : prob >= 0.5 ? '#EA580C' : '#3B82F6';
                        return <span style={{ fontWeight: 700, color: color }}>{label}</span>;
                      })()}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <span style={{ color: '#6B7280' }}>Risk of social media escalation:</span>
                      <span style={{ fontWeight: 700, color: '#EA580C' }}>High</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>
                    Duplicate Pattern
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: '#4B5563', lineHeight: 1.5 }}>
                    7 similar UPI complaints detected in past 3 hours.<br />
                    Possible payment gateway degradation identified.
                  </p>
                </div>

                <div style={{
                  background: '#F9FAFB', border: '1px solid #E5E7EB',
                  borderRadius: 12, padding: 18,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>
                    AI Recommended Action
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
                    <li>Immediately route to L2 Payments.</li>
                    <li>Send proactive SMS update.</li>
                    <li>Mark as high-priority queue.</li>
                    <li>Notify customer within 15 minutes.</li>
                  </ul>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    {[
                      { label: 'Edit', bg: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB' },
                      { label: 'Apply', bg: '#3B82F6', color: 'white', border: 'none' },
                      { label: 'Regenerate', bg: '#E5E7EB', color: '#6B7280', border: 'none' },
                    ].map((btn) => (
                      <button key={btn.label} type="button"
                        style={{
                          padding: '5px 14px', borderRadius: 6, border: btn.border ?? 'none',
                          background: btn.bg, color: btn.color,
                          fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        }}
                      >{btn.label}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM ROW */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>

            {/* BREACH TREND */}
            <div style={{
              background: 'white', borderRadius: 16, padding: 24,
              boxShadow: '0 2px 10px rgba(0,0,0,.03)',
            }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: 15, fontWeight: 700, color: '#111827' }}>
                SLA Breach Trend
              </h3>
              {trends.length > 0 ? (
                <TrendChart trends={trends} />
              ) : (
                <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: 13 }}>
                  No trend data available
                </div>
              )}
            </div>

            {/* RISK CATEGORIES */}
            <div style={{
              background: 'white', borderRadius: 16, padding: 24,
              boxShadow: '0 2px 10px rgba(0,0,0,.03)',
            }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: 15, fontWeight: 700, color: '#111827' }}>
                Risk Categories
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {riskCategories.map((cat) => (
                  <div key={cat.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{cat.name}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{cat.pct}%</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, background: '#F3F4F6', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${cat.pct}%`,
                        borderRadius: 999, background: cat.color,
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}