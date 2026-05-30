import { useState, useEffect } from 'react'
import { AppSidebar } from '../layout/AppSidebar'
import { api } from '../api/client'
import type { Complaint } from '../types/complaint'

interface DisplayReport {
  id: string
  type: string
  regulator: string
  period: string
  count: number
  risk: string
  status: string
  deadline: string
  deadlineHours: number
  complaints: Complaint[]
  categories: Record<string, number>
  summary: string
}

function DeadlineBar({ hours, label }: { hours: number; label: string }) {
  const color = hours <= 24 ? '#DC2626' : hours <= 72 ? '#F59E0B' : '#16A34A'
  const pct = hours <= 0 ? 100 : Math.max(100 - (hours / 168) * 100, 10)
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color, marginBottom: 3 }}>{label}</div>
      <div style={{ height: 5, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: color }} />
      </div>
    </div>
  )
}

export function RegulatoryReports() {
  const [reports, setReports] = useState<DisplayReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('Monthly')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<DisplayReport | null>(null)
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [channelFilter, setChannelFilter] = useState<string | null>(null)
  const [priorityFilter, setPriorityFilter] = useState<number | null>(null)
  const [riskFilter, setRiskFilter] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

   useEffect(() => {
     setLoading(true)
     setError(null)
     
     // Build filters object
     const filters: any = { regulatory_flag: true, limit: 50 }
     if (statusFilter) filters.status = statusFilter
     if (channelFilter) filters.channel = channelFilter
     if (priorityFilter !== null) filters.priority_tier = priorityFilter
     if (searchTerm) filters.search = searchTerm
     
     api.listComplaints(filters)
       .then((res) => {
         const grouped: Record<string, Complaint[]> = {}
         res.complaints.forEach((c: Complaint) => {
           const key = c.regulatory_obligation || 'Uncategorized'
           if (!grouped[key]) grouped[key] = []
           grouped[key].push(c)
         })

         const mapped: DisplayReport[] = Object.entries(grouped).map(([obligation, comps], i) => {
           const categories: Record<string, number> = {}
           comps.forEach((c: Complaint) => {
             const ct = c.complaint_type || 'Other'
             categories[ct] = (categories[ct] || 0) + 1
           })

           const riskLevels = comps.filter((c) => c.severity_score != null && c.severity_score >= 8).length
           const risk = riskLevels > 5 ? 'Critical' : riskLevels > 2 ? 'High' : riskLevels > 0 ? 'Medium' : 'Low'

           const statuses = new Set(comps.map((c) => c.status))
           const status = statuses.has('Escalated') ? 'Pending Review' : statuses.has('Open') ? 'Draft' : 'Submitted'

           return {
             id: `REG-${2000 + i}`,
             type: obligation,
             regulator: 'RBI',
             period: 'Current',
             count: comps.length,
             risk,
             status,
             deadline: status === 'Pending Review' ? 'Due in 2 days' : status === 'Draft' ? 'Due in 5 days' : 'Submitted',
             deadlineHours: status === 'Pending Review' ? 48 : status === 'Draft' ? 120 : 0,
             complaints: comps,
             categories,
             summary: `${comps.length} complaints flagged for regulatory reporting under "${obligation}".`,
           }
         })
         setReports(mapped)
         if (mapped.length > 0) setSelectedReport(mapped[0])
       })
       .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load regulatory reports'))
       .finally(() => setLoading(false))
   }, [period, statusFilter, channelFilter, priorityFilter, riskFilter, searchTerm])

  const toggle = (id: string) => setSelectedIds((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const riskColors: Record<string, { bg: string; text: string }> = {
    Critical: { bg: '#FEE2E2', text: '#DC2626' },
    High: { bg: '#FFF7ED', text: '#EA580C' },
    Medium: { bg: '#FEF3C7', text: '#92400E' },
    Low: { bg: '#DCFCE7', text: '#16A34A' },
  }

  const statusColors: Record<string, { bg: string; text: string }> = {
    'Pending Review': { bg: '#FEF3C7', text: '#92400E' },
    Draft: { bg: '#EEF2FF', text: '#4F46E5' },
    Submitted: { bg: '#DCFCE7', text: '#16A34A' },
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <AppSidebar activeItem="Regulatory Reports" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F6FA' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #E5E7EB', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <AppSidebar activeItem="Regulatory Reports" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F5F6FA', gap: 16 }}>
          <div style={{ fontSize: 14, color: '#DC2626' }}>{error}</div>
          <button onClick={() => window.location.reload()} style={{ padding: '8px 20px', borderRadius: 8, background: '#3B82F6', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <AppSidebar activeItem="Regulatory Reports" />
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', background: '#F5F6FA' }}>
        <header style={{
          height: 56, background: 'white', borderBottom: '1px solid #E5E7EB',
          display: 'flex', alignItems: 'center', padding: '0 28px', gap: 16,
        }}>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>Regulatory Reports</h1>
          <div style={{ flex: 1, minWidth: 0, maxWidth: 480, height: 36, borderRadius: 20, background: '#F3F4F6', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" />
            </svg>
            <input type="text" placeholder="Search report ID, complaint category, RBI code, product..."
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151' }} />
          </div>
          <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, position: 'relative', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            <span style={{ position: 'absolute', top: 3, right: 3, width: 7, height: 7, borderRadius: '50%', background: '#DC2626' }} />
          </button>
          <button type="button" style={{ padding: '6px 14px', borderRadius: 8, background: '#3B82F6', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>+ Generate Report</button>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12, fontWeight: 600, color: '#374151', background: 'white', cursor: 'pointer', flexShrink: 0, outline: 'none' }}>
            {['Today', 'Weekly', 'Monthly', 'Quarterly', 'Custom'].map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </header>

         <div style={{
           background: 'white', borderBottom: '1px solid #E5E7EB',
           padding: '10px 28px', display: 'flex', flexDirection: 'column', gap: 10,
           position: 'sticky', top: 0, zIndex: 10,
         }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
             <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.3px' }}>Filter</span>
             <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
               {/* Status Filter */}
               <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                 <span style={{ fontSize: 10, color: '#6B7280' }}>Status:</span>
                 <select 
                   value={statusFilter ?? ''}
                   onChange={(e) => setStatusFilter(e.target.value || null)}
                   style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #E5E7EB', fontSize: 11, background: 'white' }}
                 >
                   <option value="">All Status</option>
                   <option value="queued">Queued</option>
                   <option value="new">New</option>
                   <option value="in_progress">In Progress</option>
                   <option value="resolved">Resolved</option>
                   <option value="escalated">Escalated</option>
                 </select>
               </div>
               
               {/* Channel Filter */}
               <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                 <span style={{ fontSize: 10, color: '#6B7280' }}>Channel:</span>
                 <select 
                   value={channelFilter ?? ''}
                   onChange={(e) => setChannelFilter(e.target.value || null)}
                   style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #E5E7EB', fontSize: 11, background: 'white' }}
                 >
                   <option value="">All Channels</option>
                   <option value="whatsapp">WhatsApp</option>
                   <option value="app">App</option>
                   <option value="email">Email</option>
                   <option value="ivr">IVR</option>
                   <option value="phone">Phone</option>
                   <option value="web">Web</option>
                 </select>
               </div>
               
               {/* Priority Filter */}
               <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                 <span style={{ fontSize: 10, color: '#6B7280' }}>Priority:</span>
                 <select 
                   value={priorityFilter !== null ? priorityFilter.toString() : ''}
                   onChange={(e) => {
                     const val = e.target.value;
                     setPriorityFilter(val === '' ? null : parseInt(val));
                   }}
                   style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #E5E7EB', fontSize: 11, background: 'white' }}
                 >
                   <option value="">All Priorities</option>
                   <option value="1">1 - Low</option>
                   <option value="2">2</option>
                   <option value="3">3</option>
                   <option value="4">4</option>
                   <option value="5">5 - High</option>
                 </select>
               </div>
               
               {/* Risk Filter */}
               <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                 <span style={{ fontSize: 10, color: '#6B7280' }}>Risk:</span>
                 <select 
                   value={riskFilter ?? ''}
                   onChange={(e) => setRiskFilter(e.target.value || null)}
                   style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #E5E7EB', fontSize: 11, background: 'white' }}
                 >
                   <option value="">All Risk Levels</option>
                   <option value="critical">Critical</option>
                   <option value="high">High</option>
                   <option value="medium">Medium</option>
                   <option value="low">Low</option>
                 </select>
               </div>
             </div>
             
             <div style={{ width: 1, height: 24, background: '#E5E7EB', margin: '0 8px' }} />
             
             <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
               <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.3px' }}>Search</span>
               <input
                 type="text"
                 placeholder="Search report ID, complaint category, RBI code..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #E5E7EB', fontSize: 11, width: 200 }}
               />
             </div>
           </div>
           
           <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
             <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.3px' }}>Sort</span>
             <select style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #E5E7EB', fontSize: 12, fontWeight: 500, color: '#374151', background: '#F9FAFB', cursor: 'pointer', outline: 'none' }}>
               {['Deadline', 'Risk Level', 'Submission Date', 'Priority', 'Newest'].map((o) => <option key={o} value={o}>{o}</option>)}
             </select>
             <div style={{ display: 'flex', border: '1px solid #E5E7EB', borderRadius: 6, overflow: 'hidden', marginLeft: 'auto' }}>
               {['Report Queue', 'Calendar', 'Timeline', 'Audit View'].map((m) => (
                 <button key={m} type="button" style={{ padding: '4px 10px', fontSize: 11, fontWeight: 500, background: 'white', color: '#6B7280', border: 'none', cursor: 'pointer', borderRight: m !== 'Audit View' ? '1px solid #E5E7EB' : 'none' }}>{m}</button>
               ))}
             </div>
             <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>{reports.length} reports</span>
           </div>
         </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
            <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,.03)', overflow: 'hidden', minWidth: 0 }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #F0F0F0' }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>Regulatory Report Queue</h3>
              </div>
              <div style={{
                display: 'grid', gridTemplateColumns: '40px 100px minmax(0, 1fr) 70px 100px 70px 80px 90px 100px 120px',
                gap: 6, alignItems: 'center', padding: '10px 24px', background: '#FAFBFC', borderBottom: '1px solid #F0F0F0',
                fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.4px',
              }}>
                {['', 'Report ID', 'Report Type', 'Reg', 'Period', 'Count', 'Risk', 'Status', 'Deadline', 'Actions'].map((h) => <div key={h}>{h}</div>)}
              </div>

              {reports.map((r) => {
                const isExpanded = expandedId === r.id
                const rk = riskColors[r.risk] ?? riskColors.Low
                const st = statusColors[r.status] ?? statusColors.Draft
                return (
                  <div key={r.id}>
                    <div onClick={() => setSelectedReport(r)}
                      style={{
                        display: 'grid', gridTemplateColumns: '40px 100px minmax(0, 1fr) 70px 100px 70px 80px 90px 100px 120px',
                        gap: 6, alignItems: 'center', padding: '12px 24px', borderBottom: '1px solid #F5F6FA',
                        background: selectedIds.has(r.id) ? '#EFF6FF' : 'white',
                        borderLeft: selectedIds.has(r.id) ? '3px solid #3B82F6' : '3px solid transparent',
                        cursor: 'pointer', transition: 'background .1s',
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => toggle(r.id)}
                          style={{ width: 14, height: 14, cursor: 'pointer' }} onClick={(ev) => ev.stopPropagation()} />
                        <button type="button" onClick={(ev) => { ev.stopPropagation(); setExpandedId(isExpanded ? null : r.id) }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"
                            style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: '.15s' }}>
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', fontFamily: 'monospace' }}>{r.id}</span>
                      <span style={{ fontSize: 11, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{r.type}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280' }}>{r.regulator}</span>
                      <span style={{ fontSize: 11, color: '#6B7280' }}>{r.period}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{r.count}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, color: rk.text, background: rk.bg, whiteSpace: 'nowrap', width: 'fit-content' }}>{r.risk}</span>
                      <span style={{ padding: '2px 6px', borderRadius: 10, fontSize: 10, fontWeight: 600, color: st.text, background: st.bg, whiteSpace: 'nowrap', width: 'fit-content' }}>{r.status}</span>
                      <DeadlineBar hours={r.deadlineHours} label={r.deadline} />
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[{ label: 'View', color: '#3B82F6', bg: '#EFF6FF' }, { label: 'Generate', color: '#6B7280', bg: undefined }, { label: 'Submit', color: '#16A34A', bg: '#DCFCE7' }].map((btn) => (
                          <button key={btn.label} type="button" onClick={(ev) => ev.stopPropagation()}
                            style={{ padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, color: btn.color, background: btn.bg ?? 'transparent', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>{btn.label}</button>
                        ))}
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{
                        padding: '14px 24px 14px 60px', display: 'flex', flexDirection: 'column', gap: 10,
                        borderBottom: '1px solid #F5F6FA', background: '#FAFBFC',
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.3px' }}>Complaint Categories</div>
                        <div style={{ display: 'flex', gap: 12 }}>
                          {Object.entries(r.categories).slice(0, 6).map(([k, v]) => (
                            <div key={k} style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{v}</div>
                              <div style={{ fontSize: 10, color: '#9CA3AF' }}>{k}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
                          <span style={{ color: '#DC2626' }}>Flagged: {r.count}</span>
                          <span style={{ color: '#F59E0B' }}>Risk: {r.risk}</span>
                        </div>
                        <div style={{ padding: 10, borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB', fontSize: 11, color: '#4B5563', lineHeight: 1.4 }}>{r.summary}</div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: '#6B7280' }}>Reviewer:</span>
                          <select style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 11, color: '#374151' }}>
                            <option>Compliance Team</option>
                          </select>
                          <input placeholder="Comments..." style={{ flex: 1, padding: '4px 10px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 11, color: '#374151', outline: 'none' }} />
                          <button type="button" style={{ padding: '5px 14px', borderRadius: 6, background: '#16A34A', color: 'white', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Approve Report</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {selectedReport && (
              <div style={{
                background: 'white', borderRadius: 16, padding: 24,
                boxShadow: '0 2px 10px rgba(0,0,0,.03)', position: 'sticky', top: 24,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                  </div>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>Compliance Intelligence</h3>
                  <span style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'monospace', marginLeft: 'auto' }}>{selectedReport.id}</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>Risk Analysis</div>
                    <p style={{ margin: 0, fontSize: 12, color: '#4B5563', lineHeight: 1.5 }}>
                      {selectedReport.risk === 'Critical' ? 'Immediate regulator notification required.' :
                        selectedReport.risk === 'High' ? 'Elevated complaint volume. Review recommended.' :
                          'Report within expected compliance thresholds.'}
                    </p>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>Obligation</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6B7280' }}>Type</span>
                        <strong>{selectedReport.type}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6B7280' }}>Flagged complaints</span>
                        <strong style={{ color: '#DC2626' }}>{selectedReport.count}</strong>
                      </div>
                    </div>
                  </div>
                  <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>AI Recommendation</div>
                    <ul style={{ margin: '0 0 12px 0', paddingLeft: 16, fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
                      <li>Flag for senior review</li>
                      <li>Create escalation cluster</li>
                      <li>Add incident summary</li>
                    </ul>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {['Apply', 'Generate Draft', 'Export'].map((b) => (
                        <button key={b} type="button" style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: b === 'Apply' ? '#3B82F6' : b === 'Export' ? '#E5E7EB' : '#EEF2FF', color: b === 'Apply' ? 'white' : b === 'Export' ? '#6B7280' : '#4F46E5', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{b}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
            <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 10px rgba(0,0,0,.03)' }}>
              <h3 style={{ margin: '0 0 14px 0', fontSize: 14, fontWeight: 700, color: '#111827' }}>Report Obligations</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {reports.slice(0, 4).map((r) => (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 8,
                    border: '1px solid #F0F0F0', borderLeft: r.status === 'Submitted' ? '3px solid #16A34A' : r.status === 'Pending Review' ? '3px solid #F59E0B' : '3px solid #D1D5DB',
                  }}>
                    <div style={{ textAlign: 'center', minWidth: 44 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{r.count}</div>
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF' }}>complaints</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#1F2937' }}>{r.type}</div>
                      <div style={{ fontSize: 10, color: r.status === 'Submitted' ? '#16A34A' : r.status === 'Pending Review' ? '#F59E0B' : '#9CA3AF' }}>{r.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 10px rgba(0,0,0,.03)' }}>
              <h3 style={{ margin: '0 0 14px 0', fontSize: 14, fontWeight: 700, color: '#111827' }}>Flagged Complaints</h3>
              <div style={{ position: 'relative', maxHeight: 200, overflowY: 'auto' }}>
                <div style={{ position: 'absolute', left: 7, top: 0, bottom: 0, width: 2, background: '#E5E7EB' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 24 }}>
                  {selectedReport?.complaints.slice(0, 6).map((c, _i) => (
                    <div key={c.id} style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: -19, top: 4, width: 8, height: 8, borderRadius: '50%', background: '#DC2626' }} />
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', marginBottom: 2 }}>{c.id}</div>
                      <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.4 }}>{c.complaint_type || c.raw_text.slice(0, 80)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 10px rgba(0,0,0,.03)' }}>
              <h3 style={{ margin: '0 0 14px 0', fontSize: 14, fontWeight: 700, color: '#111827' }}>Summary</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {reports.slice(0, 4).map((r) => (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: 12, borderRadius: 10, border: '1px solid #F0F0F0',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{r.type}</div>
                      <div style={{ fontSize: 10, color: '#9CA3AF' }}>{r.count} complaints · {r.status}</div>
                    </div>
                    <span style={{ padding: '2px 10px', borderRadius: 8, fontSize: 10, fontWeight: 600, background: riskColors[r.risk]?.bg ?? '#DCFCE7', color: riskColors[r.risk]?.text ?? '#16A34A' }}>{r.risk}</span>
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