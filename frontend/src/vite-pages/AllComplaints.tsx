import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { AppSidebar } from '../layout/AppSidebar'
import { api } from '../api/client'
import type { Complaint } from '../types/complaint'
import { useAuth } from '../auth/AuthContext'

const severityColors: Record<string, { bg: string; text: string }> = {
  Critical: { bg: '#FEE2E2', text: '#DC2626' },
  High: { bg: '#FFF7ED', text: '#EA580C' },
  Medium: { bg: '#FEF9C3', text: '#CA8A04' },
  Low: { bg: '#DCFCE7', text: '#16A34A' },
}


const statusColors: Record<string, { bg: string; text: string }> = {
  Open: { bg: '#EFF6FF', text: '#3B82F6' },
  'In Progress': { bg: '#FFF7ED', text: '#EA580C' },
  Escalated: { bg: '#FEE2E2', text: '#DC2626' },
  Resolved: { bg: '#DCFCE7', text: '#16A34A' },
}

const channelIcons: Record<string, string> = {
  WhatsApp: '💬',
  whatsapp: '💬',
  Email: '📧',
  email: '📧',
  App: '📱',
  'IVR Call': '📞',
  Branch: '🏦',
  Web: '🌐',
  Telegram: '💬',
  telegram: '💬',
  Phone: '📞',
  phone: '📞',
  Chat: '💬',
  chat: '💬',
  Sms: '📱',
  sms: '📱',
}

interface MappedComplaint {
  id: string
  fullId: string
  severity: string
  customer: string
  accountType: string
  summary: string
  product: string
  channel: string
  sentiment: string
  assignedTo: string
  assignedAvatar: string
  slaPercent: number
  slaColor: string
  slaLabel: string
  status: string
  rawIssue: string
  lastMessage: string
  duplicates: number
  ticketId: string
}

function mapComplaint(c: Complaint): MappedComplaint {
  const slaDeadline = c.sla_deadline ? new Date(c.sla_deadline).getTime() : Date.now() + 28800000
  const slaTotalSeconds = c.sla_tier === 'HIGH' || c.sla_tier === 'REGULATORY' ? 14400 : 28800
  const slaRemaining = c.sla_breached ? 0 : Math.max(0, Math.round((slaDeadline - Date.now()) / 1000))
  const slaConsumedPercent = Math.min(100, Math.max(0, Math.round(((slaTotalSeconds - slaRemaining) / slaTotalSeconds) * 100)))

  let slaColor: string
  if (c.sla_breached || slaConsumedPercent > 90) slaColor = '#DC2626'
  else if (slaConsumedPercent > 60) slaColor = '#EA580C'
  else if (slaConsumedPercent > 30) slaColor = '#CA8A04'
  else slaColor = '#22C55E'

  let slaLabel: string
  if (c.sla_breached) slaLabel = 'Overdue'
  else if (slaRemaining < 3600) slaLabel = `${Math.round(slaRemaining / 60)}m left`
  else slaLabel = `${Math.round(slaRemaining / 3600)}h left`

  const priority = c.priority_tier ?? 99
  const severity: string = c.sla_breached && priority <= 2 ? 'Critical'
    : priority <= 2 ? 'High'
    : priority === 3 ? 'Medium'
    : 'Low'

  const statusDisplay: string =
    c.status === 'queued' || c.status === 'new' ? 'Open'
    : c.status === 'in_progress' ? 'In Progress'
    : c.status === 'escalated' ? 'Escalated'
    : c.status === 'resolved' ? 'Resolved'
    : 'Open'

  let sentiment = 'Neutral'
  if (c.emotion_arc && typeof c.emotion_arc === 'object' && !Array.isArray(c.emotion_arc)) {
    const arc = c.emotion_arc as Record<string, unknown>
    sentiment = typeof arc.current === 'string' ? arc.current
      : typeof arc.initial === 'string' ? arc.initial
      : 'Neutral'
  }

  const channelFormatted = c.channel.charAt(0).toUpperCase() + c.channel.slice(1)
  const summary = (c.raw_text ?? '')
  const truncatedSummary = summary.length > 60 ? summary.slice(0, 60) + '...' : summary

  const assigned = c.assigned_to ?? 'Unassigned'
  const avatar = assigned
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join('')

  return {
    id: String(c.id).slice(0, 8),
    fullId: String(c.id),
    severity,
    customer: c.customer_name ?? c.customer_id,
    accountType: c.account_number ?? '',
    summary: truncatedSummary,
    product: c.product_code ?? c.complaint_type ?? 'Unknown',
    channel: channelFormatted,
    sentiment,
    assignedTo: assigned,
    assignedAvatar: avatar,
    slaPercent: slaConsumedPercent,
    slaColor,
    slaLabel,
    status: statusDisplay,
    rawIssue: summary,
    lastMessage: c.ai_draft ?? '',
    duplicates: c.cluster_id ? 1 : 0,
    ticketId: c.source_ref ?? `TXN-${String(c.id).slice(0, 6)}`,
  }
}

function TopBar({ count, searchVal, onSearchChange, sidebarActiveItem, role }: { count: number; searchVal: string; onSearchChange: (v: string) => void; sidebarActiveItem?: string; role: string }) {
  return (
    <header style={{
      height: 56, background: 'white', borderBottom: '1px solid #E5E7EB',
      display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16,
    }}>
      <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>
        {sidebarActiveItem === 'Search' ? 'Search Complaints' : (role === 'AGENT' ? 'My Queue' : 'All Complaints')}
      </h1>
      <div style={{ flex: 1, minWidth: 0, maxWidth: 440, height: 36, borderRadius: 20, background: '#F3F4F6', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" />
        </svg>
        <input type="text" placeholder="Search ID, customer, issue, product…"
          value={searchVal}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151' }}
        />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', whiteSpace: 'nowrap', flexShrink: 0 }}>
        {count} complaints
      </span>
      <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, position: 'relative', flexShrink: 0 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        <span style={{ position: 'absolute', top: 3, right: 3, width: 7, height: 7, borderRadius: '50%', background: '#DC2626' }} />
      </button>
    </header>
  )
}

function FilterBar({
  filters, setFilter, sortBy, setSortBy, selectedCount, onBulkAssign, onBulkEscalate, onBulkResolve, onBulkExport,
}: {
  filters: Record<string, string>
  setFilter: (key: string, value: string) => void
  sortBy: string
  setSortBy: (s: string) => void
  selectedCount: number
  onBulkAssign: () => void
  onBulkEscalate: () => void
  onBulkResolve: () => void
  onBulkExport: () => void
}) {
  const filterGroups = [
    { key: 'status', label: 'Status', options: ['All', 'Open', 'In Progress', 'Escalated', 'Resolved'] },
    { key: 'severity', label: 'Severity', options: ['All', 'Critical', 'High', 'Medium', 'Low'] },
    { key: 'channel', label: 'Channel', options: ['All', 'WhatsApp', 'Email', 'App', 'IVR Call', 'Branch'] },
    { key: 'product', label: 'Type', options: ['All', 'fraud', 'billing', 'kyc', 'loans', 'cards', 'service', 'technical'] },
  ]

  const sortOptions = ['SLA Deadline', 'Newest', 'Severity', 'Customer Score']

  return (
    <div style={{
      background: 'white', borderBottom: '1px solid #E5E7EB',
      padding: '10px 24px', display: 'flex', flexDirection: 'column', gap: 10,
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {filterGroups.map((g) => (
          <div key={g.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.3px', whiteSpace: 'nowrap' }}>{g.label}</span>
            <select
              value={filters[g.key] ?? 'All'}
              onChange={(e) => setFilter(g.key, e.target.value)}
              style={{
                padding: '4px 8px', borderRadius: 6, border: '1px solid #E5E7EB',
                fontSize: 12, fontWeight: 500, color: '#374151', background: '#F9FAFB',
                cursor: 'pointer', outline: 'none',
              }}
            >
              {g.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        ))}

        <div style={{ width: 1, height: 24, background: '#E5E7EB', margin: '0 4px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.3px' }}>Sort</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #E5E7EB', fontSize: 12, fontWeight: 500, color: '#374151', background: '#F9FAFB', cursor: 'pointer', outline: 'none' }}>
            {sortOptions.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {selectedCount > 0 && (
            <>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#3B82F6', display: 'flex', alignItems: 'center', paddingRight: 6 }}>
                {selectedCount} selected
              </span>
              <BulkBtn label="Assign" onClick={onBulkAssign} />
              <BulkBtn label="Escalate" onClick={onBulkEscalate} color="#DC2626" />
              <BulkBtn label="Resolve" onClick={onBulkResolve} color="#16A34A" />
              <BulkBtn label="Export" onClick={onBulkExport} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function BulkBtn({ label, onClick, color }: { label: string; onClick: () => void; color?: string }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
        border: `1px solid ${color ?? '#D1D5DB'}`, color: color ?? '#374151',
        background: 'white', cursor: 'pointer', whiteSpace: 'nowrap',
        transition: 'all .12s',
      }}
    >{label}</button>
  )
}

function Drawer({ row, onClose }: { row: MappedComplaint; onClose: () => void }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.2)', zIndex: 40 }} />
      <div style={{
        position: 'fixed', top: 0, bottom: 0, right: 0, width: 540,
        background: 'white', boxShadow: '-4px 0 24px rgba(0,0,0,.08)',
        zIndex: 50, display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, color: '#9CA3AF', fontFamily: 'monospace', marginBottom: 2 }}>{row.ticketId}</div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
              {row.id} · {' '}
              <span style={{
                padding: '2px 10px', borderRadius: 10, fontSize: 12,
                color: severityColors[row.severity].text, background: severityColors[row.severity].bg,
              }}>{row.severity}</span>
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              ['Customer', row.customer],
              ['Account', row.accountType || '—'],
              ['Product', row.product],
              ['Channel', `${channelIcons[row.channel] ?? ''} ${row.channel}`],
              ['Assigned To', row.assignedTo],
              ['Status', row.status],
            ].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{val}</div>
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>Full Issue</div>
            <div style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.6, background: '#F9FAFB', padding: 14, borderRadius: 8 }}>{row.rawIssue}</div>
          </div>

          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>Communication Timeline</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderLeft: '2px solid #E5E7EB', paddingLeft: 14 }}>
              {[
                { time: 'Today 10:45 AM', text: row.lastMessage || 'AI draft pending', type: 'agent' },
                { time: 'Today 9:30 AM', text: row.rawIssue.slice(0, 100) + (row.rawIssue.length > 100 ? '...' : ''), type: 'customer' },
                { time: 'Today 9:15 AM', text: 'Complaint received via ' + row.channel, type: 'system' },
              ].map((msg, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>{msg.time}</div>
                  <div style={{
                    fontSize: 12, lineHeight: 1.5,
                    color: msg.type === 'system' ? '#9CA3AF' : '#374151',
                    fontStyle: msg.type === 'system' ? 'italic' : 'normal',
                  }}>{msg.text}</div>
                  <div style={{
                    position: 'absolute', left: -19, top: 6, width: 8, height: 8, borderRadius: '50%',
                    background: msg.type === 'agent' ? '#3B82F6' : msg.type === 'customer' ? '#9CA3AF' : '#D1D5DB',
                  }} />
                </div>
              ))}
            </div>
          </div>

          {row.duplicates > 0 && (
            <div style={{ background: '#FEF9C3', borderRadius: 8, padding: 12, border: '1px solid #FDE68A' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>
                ⚠ {row.duplicates} similar complaints detected
              </div>
              <div style={{ fontSize: 11, color: '#A16207', lineHeight: 1.4 }}>
                These complaints share the same product, channel, and issue pattern. Consider escalating as a cluster.
              </div>
            </div>
          )}

          <div style={{ background: '#F0F9FF', borderRadius: 8, padding: 12, border: '1px solid #BAE6FD' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0369A1', marginBottom: 8 }}>AI-Drafted Reply</div>
            <div style={{ fontSize: 12, color: '#0C4A6E', lineHeight: 1.5, marginBottom: 10 }}>
              Dear Customer, we understand your concern regarding {row.summary.toLowerCase()}. Our team is actively working on resolving this. Your complaint has been prioritized and the reference number is {row.id}. We will update you within the next 4 hours via {row.channel}.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['Edit', 'Send', 'Regenerate'].map((label) => (
                <button key={label} type="button"
                  style={{
                    padding: '5px 14px', borderRadius: 6, border: 'none',
                    background: label === 'Send' ? '#3B82F6' : label === 'Edit' ? '#E0F2FE' : '#E5E7EB',
                    color: label === 'Send' ? 'white' : label === 'Edit' ? '#0369A1' : '#6B7280',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  }}
                >{label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export function AllComplaints({ defaultSearch = '', sidebarActiveItem }: { defaultSearch?: string; sidebarActiveItem?: string }) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const filterAssignedToMe = searchParams.get('assigned_to') === 'me'

  const [filters, setFilters] = useState<Record<string, string>>({ status: 'All', severity: 'All', channel: 'All', product: 'All' })
  const [searchQuery, setSearchQuery] = useState(defaultSearch)
  const [sortBy, setSortBy] = useState('SLA Deadline')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [drawerRow, setDrawerRow] = useState<MappedComplaint | null>(null)
  const [complaints, setComplaints] = useState<MappedComplaint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchComplaints() {
      setLoading(true)
      setError(null)
      try {
        const response = await api.listComplaints({ limit: 100 })
        if (cancelled) return
        setComplaints(response.complaints.map(mapComplaint))
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load complaints')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchComplaints()
    return () => { cancelled = true }
  }, [])

  const setFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((r) => r.id)))
    }
  }

  const matchMyAssignment = (r: MappedComplaint) => {
    return r.assignedTo.toLowerCase() === user?.email?.toLowerCase() ||
           r.assignedTo.toLowerCase() === user?.name?.toLowerCase() ||
           (user?.email && r.assignedTo.toLowerCase().includes(user.email.split('@')[0].toLowerCase()))
  }

  const filtered = complaints.filter((r) => {
    if (filterAssignedToMe && !matchMyAssignment(r)) return false
    if (filters.status !== 'All' && r.status !== filters.status) return false
    if (filters.severity !== 'All' && r.severity !== filters.severity) return false
    if (filters.channel !== 'All' && r.channel.toLowerCase() !== filters.channel.toLowerCase()) return false
    if (filters.product !== 'All' && r.product !== filters.product) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const match = r.id.toLowerCase().includes(q) ||
                    r.customer.toLowerCase().includes(q) ||
                    r.rawIssue.toLowerCase().includes(q) ||
                    r.product.toLowerCase().includes(q) ||
                    r.ticketId.toLowerCase().includes(q)
      if (!match) return false
    }
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'SLA Deadline') return a.slaPercent - b.slaPercent
    if (sortBy === 'Severity') {
      const order = { Critical: 0, High: 1, Medium: 2, Low: 3 }
      return (order[a.severity as keyof typeof order] ?? 2) - (order[b.severity as keyof typeof order] ?? 2)
    }
    return 0
  })

  const activeItem = sidebarActiveItem ?? (user?.role === 'AGENT' ? 'My Queue' : 'All Complaints')

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <AppSidebar activeItem={activeItem} />

      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', background: '#F5F6FA' }}>
        <TopBar count={filtered.length} searchVal={searchQuery} onSearchChange={setSearchQuery} sidebarActiveItem={sidebarActiveItem} role={user?.role ?? 'AGENT'} />
        <FilterBar
          filters={filters} setFilter={setFilter}
          sortBy={sortBy} setSortBy={setSortBy}
          selectedCount={selectedIds.size}
          onBulkAssign={() => setSelectedIds(new Set())}
          onBulkEscalate={() => setSelectedIds(new Set())}
          onBulkResolve={() => setSelectedIds(new Set())}
          onBulkExport={() => setSelectedIds(new Set())}
        />

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', gap: 12 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', border: '3px solid #E5E7EB', borderTopColor: '#3B82F6', animation: 'spin .6s linear infinite' }} />
            <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 500 }}>Loading complaints...</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {error && !loading && (
          <div style={{ margin: '24px', padding: '16px 20px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#991B1B', marginBottom: 2 }}>Failed to load complaints</div>
              <div style={{ fontSize: 12, color: '#B91C1C' }}>{error}</div>
            </div>
            <button type="button" onClick={() => window.location.reload()} style={{ marginLeft: 'auto', padding: '5px 14px', borderRadius: 6, border: '1px solid #FECACA', background: 'white', color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <div style={{ padding: '0 24px 24px 24px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '36px 160px 140px minmax(0,1fr) 100px 70px 110px 90px 120px',
              gap: 12, alignItems: 'center',
              padding: '12px 16px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB',
              borderLeft: '1px solid #E5E7EB', borderRight: '1px solid #E5E7EB',
              position: 'sticky', top: 77, zIndex: 5,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll}
                  style={{ width: 15, height: 15, cursor: 'pointer' }} />
              </div>
              {['ID · Severity', 'Customer', 'Issue Summary', 'Product', 'Channel', 'Assigned', 'SLA', 'Status & Actions'].map((h) => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.4px', whiteSpace: 'nowrap' }}>{h}</div>
              ))}
            </div>

            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderTop: 'none', borderBottomLeftRadius: 8, borderBottomRightRadius: 8, overflow: 'hidden' }}>
              {sorted.map((row) => {
                const sev = severityColors[row.severity]
                const st = statusColors[row.status]
                const isExpanded = expandedId === row.id
                const isSelected = selectedIds.has(row.id)

                return (
                  <div key={row.id}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '36px 160px 140px minmax(0,1fr) 100px 70px 110px 90px 120px',
                        gap: 12, alignItems: 'center',
                        padding: '11px 16px', borderBottom: '1px solid #F3F4F6',
                        background: isSelected ? '#EFF6FF' : 'white',
                        transition: 'background .1s',
                        cursor: 'default',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <input type="checkbox" checked={isSelected}
                          onChange={() => toggleSelect(row.id)}
                          style={{ width: 15, height: 15, cursor: 'pointer' }} />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <button type="button" onClick={() => setExpandedId(isExpanded ? null : row.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"
                            style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform .15s' }}>
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                        <span onClick={() => navigate(`/app/complaints/${row.fullId}`)} style={{ fontSize: 11, fontWeight: 600, color: '#3B82F6', fontFamily: 'monospace', whiteSpace: 'nowrap', cursor: 'pointer' }}>{row.id}</span>
                        <span style={{ padding: '1px 6px', borderRadius: 8, fontSize: 9, fontWeight: 700, color: sev.text, background: sev.bg, whiteSpace: 'nowrap' }}>{row.severity}</span>
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.customer}</div>
                        <div style={{ fontSize: 10, color: '#9CA3AF' }}>{row.accountType}</div>
                      </div>

                      <div style={{ fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{row.summary}</div>

                      <span style={{ fontSize: 11, fontWeight: 500, color: '#6B7280', whiteSpace: 'nowrap' }}>{row.product}</span>

                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#6B7280', whiteSpace: 'nowrap' }}>
                        {channelIcons[row.channel] ?? ''} {row.channel}
                      </span>

                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          width: 22, height: 22, borderRadius: '50%', background: '#EFF6FF', color: '#3B82F6',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 700, flexShrink: 0,
                        }}>{row.assignedAvatar}</span>
                        <span style={{ fontSize: 11, color: '#4B5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.assignedTo}</span>
                      </span>

                      <div>
                        <div style={{ height: 5, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${row.slaPercent}%`, borderRadius: 3, background: row.slaColor }} />
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: row.slaColor, marginTop: 2 }}>{row.slaLabel}</div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                          color: st.text, background: st.bg, whiteSpace: 'nowrap',
                          display: 'inline-block', width: 'fit-content',
                        }}>{row.status}</span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {[
                            { label: 'View', onClick: () => navigate(`/app/complaints/${row.fullId}`) },
                            { label: 'Reply', onClick: () => navigate(`/app/complaints/${row.fullId}`) },
                          ].map((action) => (
                            <button key={action.label} type="button" onClick={action.onClick}
                              style={{
                                padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                                color: action.label === 'View' ? '#3B82F6' : '#6B7280',
                                background: action.label === 'View' ? '#EFF6FF' : 'transparent',
                                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                              }}
                            >{action.label}</button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{
                        padding: '14px 16px 14px 52px', borderBottom: '1px solid #F3F4F6',
                        background: '#FAFBFC', display: 'flex', flexDirection: 'column', gap: 10,
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.3px' }}>AI Key Issue Extraction</div>
                        <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{row.rawIssue}</div>

                        <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.3px', marginTop: 4 }}>Last Message</div>
                        <div style={{ fontSize: 12, color: '#4B5563', lineHeight: 1.4 }}>{row.lastMessage || 'No messages yet'}</div>

                        {row.duplicates > 0 && (
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#92400E', background: '#FEF9C3', padding: '6px 10px', borderRadius: 6 }}>
                            ⚠ {row.duplicates} similar complaints detected — consider cluster escalation
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                          <textarea
                            placeholder="Type a quick reply..."
                            rows={2}
                            style={{
                              flex: 1, borderRadius: 6, border: '1px solid #D1D5DB',
                              padding: '8px 10px', fontSize: 12, resize: 'none',
                              outline: 'none', color: '#374151',
                            }}
                          />
                          <button type="button" style={{
                            padding: '6px 16px', borderRadius: 6, background: '#3B82F6',
                            color: 'white', border: 'none', fontSize: 12, fontWeight: 600,
                            cursor: 'pointer', height: 'fit-content', alignSelf: 'flex-end',
                          }}>Send</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {drawerRow && <Drawer row={drawerRow} onClose={() => setDrawerRow(null)} />}
    </div>
  )
}