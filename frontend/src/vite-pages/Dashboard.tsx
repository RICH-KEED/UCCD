import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { api } from '../api/client'
import type { Complaint, DashboardKpis, CategoryBreakdown, ChannelDistribution } from '../types/complaint'
import { AppSidebar } from '../layout/AppSidebar'

const severityColors: Record<string, { bg: string; text: string }> = {
  HIGH: { bg: '#FEE2E2', text: '#DC2626' },
  MEDIUM: { bg: '#FFF7ED', text: '#EA580C' },
  LOW: { bg: '#DCFCE7', text: '#16A34A' },
}

const statusColors: Record<string, { bg: string; text: string }> = {
  escalated: { bg: '#FEE2E2', text: '#DC2626' },
  in_progress: { bg: '#EEF2FF', text: '#4F46E5' },
  queued: { bg: '#FEF3C7', text: '#92400E' },
  new: { bg: '#E0F2FE', text: '#0369A1' },
  resolved: { bg: '#DCFCE7', text: '#16A34A' },
}

const channelIcons: Record<string, string> = {
  whatsapp: '💬', email: '📧', telegram: '✈', twitter: '🐦', instagram: '📷', app: '📱', web: '🌐',
}

function KpiCard({ label, value, color, subtitle }: { label: string; value: string | number; color: string; subtitle?: string }) {
  return (
    <div style={{ background: 'white', borderRadius: 10, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,.06)', border: '1px solid #F0F0F0' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.3px' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#111827', lineHeight: 1.1, marginBottom: 4 }}>{value}</div>
      <div style={{ height: 3, borderRadius: 2, background: '#F3F4F6' }}>
        <div style={{ height: '100%', width: '100%', borderRadius: 2, background: color }} />
      </div>
      {subtitle && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>{subtitle}</div>}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#3B82F6', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
      </div>
      Loading dashboard data...
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function getTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function AgentDashboard({ kpis, recent, navigate }: { kpis: DashboardKpis; recent: Complaint[]; navigate: any }) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
        <KpiCard label="My Open" value={kpis.open} color="#3B82F6" />
        <KpiCard label="Resolved Today" value={kpis.resolved_today} color="#16A34A" />
        <KpiCard label="SLA at Risk" value={kpis.sla_at_risk} color="#F59E0B" />
        <KpiCard label="Avg Resolution" value={`${kpis.avg_resolution_hours}h`} color="#8B5CF6" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 16, alignItems: 'start' }}>
        <div style={{ background: 'white', borderRadius: 10, border: '1px solid #F0F0F0', boxShadow: '0 1px 3px rgba(0,0,0,.04)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>My Queue</h3>
            <a href="/app/complaints?assigned_to=me" style={{ fontSize: 11, fontWeight: 600, color: '#3B82F6', textDecoration: 'none' }}>View All →</a>
          </div>
          {recent.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>No complaints yet.</div>
          ) : (
            recent.slice(0, 8).map((comp) => {
              const sev = severityColors[comp.priority_tier && comp.priority_tier <= 2 ? 'HIGH' : comp.priority_tier === 3 ? 'MEDIUM' : 'LOW'] ?? severityColors.LOW
              return (
                <div key={comp.id} onClick={() => navigate(`/app/complaints/${comp.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid #F3F4F6', cursor: 'pointer', transition: 'background .1s' }} onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#3B82F6', fontFamily: 'monospace', minWidth: 90 }}>{String(comp.id).slice(0, 8)}</span>
                  <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, color: sev.text, background: sev.bg, whiteSpace: 'nowrap' }}>{comp.sla_tier ?? 'NORMAL'}</span>
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{comp.raw_text.slice(0, 80)}</span>
                  <span style={{ fontSize: 10, color: '#9CA3AF' }}>{getTimeAgo(comp.created_at)}</span>
                  <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, color: statusColors[comp.status]?.text ?? '#6B7280', background: statusColors[comp.status]?.bg ?? '#F3F4F6' }}>{comp.status.replace('_', ' ')}</span>
                  {!comp.assigned_to && (
                    <span style={{
                      padding: '2px 8px', borderRadius: 10, fontSize: 10,
                      fontWeight: 600, color: '#9CA3AF', background: '#F3F4F6',
                      whiteSpace: 'nowrap'
                    }}>
                      Auto-assigning...
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>

        <div style={{ background: 'white', borderRadius: 10, border: '1px solid #F0F0F0', boxShadow: '0 1px 3px rgba(0,0,0,.04)', padding: 20, position: 'sticky', top: 20 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 700, color: '#111827' }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a href="/app/complaints?assigned_to=me" style={{ display: 'block', padding: 12, borderRadius: 8, background: '#EEF2FF', border: '1px solid #DBEAFE', textDecoration: 'none', transition: 'all .15s' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#3B82F6', marginBottom: 2 }}>View My Queue</div>
              <div style={{ fontSize: 11, color: '#6B7280' }}>See all {kpis.open} open complaints assigned to you</div>
            </a>
            <a href="/app/escalations" style={{ display: 'block', padding: 12, borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', textDecoration: 'none' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#DC2626', marginBottom: 2 }}>View Escalated</div>
              <div style={{ fontSize: 11, color: '#6B7280' }}>{kpis.escalated} complaints need attention</div>
            </a>
            <a href="/app/sla-breaches" style={{ display: 'block', padding: 12, borderRadius: 8, background: '#FFFBEB', border: '1px solid #FDE68A', textDecoration: 'none' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E', marginBottom: 2 }}>Check SLA Breaches</div>
              <div style={{ fontSize: 11, color: '#6B7280' }}>{kpis.sla_at_risk} at risk, {kpis.breached} breached</div>
            </a>
            <a href="/app/360-view" style={{ display: 'block', padding: 12, borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', textDecoration: 'none' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#16A34A', marginBottom: 2 }}>Customer 360° View</div>
              <div style={{ fontSize: 11, color: '#6B7280' }}>Look up customer complaint history</div>
            </a>
          </div>
        </div>
      </div>
    </>
  )
}

function SupervisorDashboard({ kpis, categories, channels, recent, navigate }: { kpis: DashboardKpis; categories: CategoryBreakdown; channels: ChannelDistribution; recent: Complaint[]; navigate: any }) {
  const handleQuickResolve = async (id: string) => {
    try {
      await api.updateStatus(id, 'resolved')
      window.location.reload()
    } catch {
      alert('Failed to resolve')
    }
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 16 }}>
        <KpiCard label="Total Open" value={kpis.open} color="#3B82F6" />
        <KpiCard label="Escalated" value={kpis.escalated} color="#DC2626" />
        <KpiCard label="SLA Breached" value={kpis.breached} color="#F59E0B" />
        <KpiCard label="Resolved Today" value={kpis.resolved_today} color="#16A34A" />
        <KpiCard label="Resolution Rate" value={`${kpis.resolution_rate}%`} color="#8B5CF6" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
        <div style={{ background: 'white', borderRadius: 10, border: '1px solid #F0F0F0', boxShadow: '0 1px 3px rgba(0,0,0,.04)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>Top Complaint Categories</h3>
            <a href="/app/trends" style={{ fontSize: 11, fontWeight: 600, color: '#3B82F6', textDecoration: 'none' }}>View Trends →</a>
          </div>
          <div style={{ padding: '12px 20px' }}>
            {categories.categories.slice(0, 7).map((cat, i) => {
              const maxCount = categories.categories[0]?.count ?? 1
              const pct = Math.round((cat.count / maxCount) * 100)
              return (
                <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 6 ? '1px solid #F9FAFB' : 'none' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', width: 16, textAlign: 'center' }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#1F2937' }}>{cat.name}</span>
                  <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#F3F4F6', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 4, background: '#3B82F6' }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', width: 28, textAlign: 'right' }}>{cat.count}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 10, border: '1px solid #F0F0F0', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>Channel Distribution</h3>
            <a href="/app/trends" style={{ fontSize: 11, fontWeight: 600, color: '#3B82F6', textDecoration: 'none' }}>Full Report →</a>
          </div>
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {channels.channels.map((ch) => (
              <div key={ch.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>{channelIcons[ch.name.toLowerCase()] ?? ''} {ch.name}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{ch.percentage}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: '#F3F4F6', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${ch.percentage}%`, borderRadius: 4, background: '#3B82F6' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: 10, border: '1px solid #F0F0F0', boxShadow: '0 1px 3px rgba(0,0,0,.04)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>Recent Complaints</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href="/app/complaints" style={{ fontSize: 11, fontWeight: 600, color: '#3B82F6', textDecoration: 'none' }}>View All</a>
          </div>
        </div>
        {recent.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>No complaints yet.</div>
        ) : (
          recent.slice(0, 10).map((comp) => {
            const sev = severityColors[comp.priority_tier && comp.priority_tier <= 2 ? 'HIGH' : comp.priority_tier === 3 ? 'MEDIUM' : 'LOW'] ?? severityColors.LOW
            return (
              <div key={comp.id} onClick={() => navigate(`/app/complaints/${comp.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px', borderBottom: '1px solid #F3F4F6', cursor: 'pointer', transition: 'background .1s' }} onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#3B82F6', fontFamily: 'monospace', minWidth: 90 }}>{String(comp.id).slice(0, 8)}</span>
                <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, color: sev.text, background: sev.bg }}>{comp.sla_tier ?? 'NORMAL'}</span>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{comp.raw_text.slice(0, 80)}</span>
                <span style={{ fontSize: 10, color: '#9CA3AF' }}>{channelIcons[comp.channel.toLowerCase()] ?? ''} {comp.channel}</span>
                <span style={{ fontSize: 10, color: '#9CA3AF' }}>{getTimeAgo(comp.created_at)}</span>
                <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, color: statusColors[comp.status]?.text ?? '#6B7280', background: statusColors[comp.status]?.bg ?? '#F3F4F6' }}>{comp.status.replace('_', ' ')}</span>
                {(comp.status === 'escalated' || comp.status === 'in_progress') && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleQuickResolve(String(comp.id)) }}
                    style={{ padding: '3px 10px', borderRadius: 6, background: '#16A34A', color: 'white', border: 'none', fontSize: 10, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    Resolve
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </>
  )
}

function ComplianceDashboard({ kpis, recent }: { kpis: DashboardKpis; recent: Complaint[] }) {
  const regulatoryComplaints = recent.filter(c => c.regulatory_flag)
  const breachedComplaints = recent.filter(c => c.sla_breached)

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
        <KpiCard label="Regulatory Flagged" value={kpis.regulatory_flagged} color="#DC2626" subtitle="RBI/FEMA/Agency" />
        <KpiCard label="SLA Breached" value={kpis.breached} color="#F59E0B" subtitle="Missed deadlines" />
        <KpiCard label="Total Escalated" value={kpis.escalated} color="#8B5CF6" subtitle="Needs review" />
        <KpiCard label="Avg Resolution" value={`${kpis.avg_resolution_hours}h`} color="#3B82F6" subtitle="Time to close" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 16, alignItems: 'start' }}>
        <div style={{ background: 'white', borderRadius: 10, border: '1px solid #F0F0F0', boxShadow: '0 1px 3px rgba(0,0,0,.04)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>Regulatory Complaints</h3>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#DC2626', background: '#FEE2E2', padding: '2px 10px', borderRadius: 10 }}>{kpis.regulatory_flagged} active</span>
          </div>
          {regulatoryComplaints.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>No regulatory-flagged complaints.</div>
          ) : (
            regulatoryComplaints.map((comp) => (
              <div key={comp.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid #F3F4F6' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', fontFamily: 'monospace', minWidth: 90 }}>{String(comp.id).slice(0, 8)}</span>
                <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, color: '#DC2626', background: '#FEE2E2' }}>{comp.regulatory_obligation ?? 'REGULATORY'}</span>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{comp.raw_text.slice(0, 80)}</span>
                <span style={{ fontSize: 10, color: '#9CA3AF' }}>{getTimeAgo(comp.created_at)}</span>
                <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, color: statusColors[comp.status]?.text ?? '#6B7280', background: statusColors[comp.status]?.bg ?? '#F3F4F6' }}>{comp.status.replace('_', ' ')}</span>
              </div>
            ))
          )}
        </div>

        <div style={{ background: 'white', borderRadius: 10, border: '1px solid #F0F0F0', boxShadow: '0 1px 3px rgba(0,0,0,.04)', padding: 20, position: 'sticky', top: 20 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 700, color: '#111827' }}>Compliance Overview</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Total Breached SLA', value: kpis.breached, color: '#F59E0B' },
              { label: 'SLA at Risk', value: kpis.sla_at_risk, color: '#EA580C' },
              { label: 'Escalated Cases', value: kpis.escalated, color: '#DC2626' },
              { label: 'Resolution Rate', value: `${kpis.resolution_rate}%`, color: '#16A34A' },
            ].map((stat) => (
              <div key={stat.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderRadius: 8, background: '#F9FAFB' }}>
                <span style={{ fontSize: 12, color: '#6B7280' }}>{stat.label}</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: stat.color }}>{stat.value}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a href="/app/regulatory" style={{ display: 'block', padding: '10px 14px', borderRadius: 8, background: '#EEF2FF', border: '1px solid #C7D2FE', textDecoration: 'none', fontSize: 12, fontWeight: 600, color: '#4F46E5', textAlign: 'center' }}>View Regulatory Reports</a>
            <a href="/app/sla-breaches" style={{ display: 'block', padding: '10px 14px', borderRadius: 8, background: '#FEF3C7', border: '1px solid #FDE68A', textDecoration: 'none', fontSize: 12, fontWeight: 600, color: '#92400E', textAlign: 'center' }}>View SLA Breaches</a>
            <a href="/app/root-cause" style={{ display: 'block', padding: '10px 14px', borderRadius: 8, background: '#F3F4F6', border: '1px solid #E5E7EB', textDecoration: 'none', fontSize: 12, fontWeight: 600, color: '#374151', textAlign: 'center' }}>Root Cause Analysis</a>
          </div>

          {breachedComplaints.length > 0 && (
            <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', marginBottom: 6 }}>⚠ {breachedComplaints.length} SLA-Breached Complaints</div>
              <div style={{ fontSize: 11, color: '#991B1B', lineHeight: 1.4 }}>
                These complaints have breached their regulatory SLA deadlines. Immediate action required.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const role = user?.role ?? 'AGENT'
  const [kpis, setKpis] = useState<DashboardKpis | null>(null)
  const [categories, setCategories] = useState<CategoryBreakdown | null>(null)
  const [channels, setChannels] = useState<ChannelDistribution | null>(null)
  const [recent, setRecent] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const isAgent = role === 'AGENT'
        const [kpiData, catData, chData, queueData] = await Promise.all([
          api.getKpis(),
          api.getCategories(),
          api.getChannels(),
          isAgent ? api.getMyQueue(20) : api.getRecentComplaints(20),
        ])
        setKpis(kpiData)
        setCategories(catData)
        setChannels(chData)
        setRecent(queueData.complaints)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [role])

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <AppSidebar activeItem="Dashboard" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F6FA' }}>
          <LoadingSkeleton />
        </div>
      </div>
    )
  }
  if (error) {
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <AppSidebar activeItem="Dashboard" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F6FA', color: '#DC2626', fontSize: 14 }}>
          {error}
        </div>
      </div>
    )
  }
  if (!kpis) {
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <AppSidebar activeItem="Dashboard" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F6FA', color: '#9CA3AF' }}>
          No data available.
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <AppSidebar activeItem="Dashboard" />
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', background: '#F5F6FA' }}>
        <header style={{ height: 56, background: 'white', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16 }}>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
            {role === 'AGENT' ? 'Agent Dashboard' : role === 'SUPERVISOR' ? 'Supervisor Command Center' : 'Compliance Control Center'}
          </h1>
          <span style={{ borderRadius: 10, padding: '2px 12px', fontSize: 10, fontWeight: 700, background: role === 'SUPERVISOR' ? '#EEF2FF' : role === 'COMPLIANCE' ? '#FEE2E2' : '#DCFCE7', color: role === 'SUPERVISOR' ? '#4F46E5' : role === 'COMPLIANCE' ? '#DC2626' : '#16A34A', textTransform: 'uppercase' }}>
            {role}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {role === 'SUPERVISOR' && (
              <>
                <a href="/app/trends"
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  style={{ padding: '6px 14px', borderRadius: 6, background: '#EEF2FF', color: '#4F46E5', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>Trends</a>
                <a href="/app/escalations"
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  style={{ padding: '6px 14px', borderRadius: 6, background: '#FEF2F2', color: '#DC2626', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>Escalations</a>
                <a href="/app/dashboard"
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  style={{ padding: '6px 14px', borderRadius: 6, background: '#3B82F6', color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>Command Center</a>
              </>
            )}
            {role === 'COMPLIANCE' && (
              <>
                <a href="/app/regulatory"
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  style={{ padding: '6px 14px', borderRadius: 6, background: '#FEF2F2', color: '#DC2626', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>Regulatory</a>
                <a href="/app/root-cause"
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  style={{ padding: '6px 14px', borderRadius: 6, background: '#EEF2FF', color: '#4F46E5', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>Root Cause</a>
              </>
            )}
            {role === 'AGENT' && (
              <>
                <a href="/app/complaints?assigned_to=me"
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  style={{ padding: '6px 14px', borderRadius: 6, background: '#3B82F6', color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>Open Queue</a>
                <a href="/app/drafts"
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  style={{ padding: '6px 14px', borderRadius: 6, background: '#EEF2FF', color: '#4F46E5', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>AI Drafts</a>
              </>
            )}
            <a href="/app/complaints"
              onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              style={{ padding: '6px 14px', borderRadius: 6, background: '#F3F4F6', color: '#374151', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>All Complaints</a>
          </div>
        </header>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {role === 'AGENT' && <AgentDashboard kpis={kpis} recent={recent} navigate={navigate} />}
          {role === 'SUPERVISOR' && categories && channels && <SupervisorDashboard kpis={kpis} categories={categories} channels={channels} recent={recent} navigate={navigate} />}
          {role === 'COMPLIANCE' && <ComplianceDashboard kpis={kpis} recent={recent} />}
        </div>
      </div>
    </div>
  )
}