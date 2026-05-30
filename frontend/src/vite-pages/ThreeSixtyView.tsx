import { useState } from 'react'
import { AppSidebar } from '../layout/AppSidebar'
import { api } from '../api/client'
import type { Complaint } from '../types/complaint'

type Tab = 'Complaints' | 'Transactions' | 'Communication' | 'Documents' | 'Notes'
const tabs: Tab[] = ['Complaints', 'Transactions', 'Communication', 'Documents', 'Notes']

export function ThreeSixtyView() {
  const [customerId, setCustomerId] = useState('')
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('Complaints')
  const [escalateMsg, setEscalateMsg] = useState('')

  const handleSearch = async () => {
    if (!customerId.trim()) return
    const id = customerId.trim()
    setLoading(true)
    setError(null)
    setSearched(true)

    try {
      const response = await api.listComplaints({ 
        customer_id: id,
        limit: 50 
      })
      setComplaints(response.complaints)
      if (response.complaints.length > 0) {
        setSelectedComplaint(response.complaints[0])
      } else {
        setSelectedComplaint(null)
      }
    } catch (err) {
      setError('Customer not found')
      setComplaints([])
      setSelectedComplaint(null)
    } finally {
      setLoading(false)
    }
  }

  const handleEscalate = async () => {
    if (!selectedComplaint) return
    try {
      await api.updateStatus(selectedComplaint.id, 'escalated')
      setSelectedComplaint({ ...selectedComplaint, status: 'escalated' })
      setComplaints(prev => prev.map(c => c.id === selectedComplaint.id ? { ...c, status: 'escalated' } : c))
      setEscalateMsg('Case escalated successfully!')
      setTimeout(() => setEscalateMsg(''), 3000)
    } catch (err) {
      alert('Failed to escalate: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const firstComplaint = complaints[0]
  const customerName = firstComplaint?.customer_name || 'Unknown Customer'
  const customerInitials = customerName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  const customerIdVal = firstComplaint?.customer_id || customerId

  const timelineEvents = complaints.map((c) => ({
    time: new Date(c.created_at).toLocaleString(),
    type: 'complaint' as const,
    icon: c.status === 'resolved' ? '✅' : c.status === 'escalated' ? '🚨' : '📄',
    text: `${c.complaint_type || 'General'} Complaint - ${c.status}`,
    status: c.status,
    detail: c.raw_text,
    complaint: c,
  }))

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <AppSidebar activeItem="360° View" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F6FA' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #E5E7EB', borderTopColor: '#3B82F6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <AppSidebar activeItem="360° View" />
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', background: '#F5F6FA' }}>
        <header style={{
          height: 56, background: 'white', borderBottom: '1px solid #E5E7EB',
          display: 'flex', alignItems: 'center', padding: '0 28px', gap: 16,
        }}>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>
            360° View
          </h1>
          <div style={{ flex: 1, minWidth: 0, maxWidth: 480, height: 36, borderRadius: 20, background: '#F3F4F6', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" />
            </svg>
            <input type="text" value={customerId} onChange={(e) => setCustomerId(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Enter customer ID to search..."
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151' }} />
            <button onClick={handleSearch}
              style={{ padding: '4px 14px', borderRadius: 12, background: '#3B82F6', color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Search
            </button>
          </div>
        </header>

        {!searched && !error && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F6FA', minHeight: 400 }}>
            <div style={{ textAlign: 'center', color: '#9CA3AF' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Enter a customer ID to view complaint history</div>
              <div style={{ fontSize: 13 }}>Search by customer ID in the search bar above</div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F6FA', minHeight: 400 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: '#DC2626', marginBottom: 16 }}>{error}</div>
              <button onClick={handleSearch} style={{ padding: '8px 20px', borderRadius: 8, background: '#3B82F6', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Retry</button>
            </div>
          </div>
        )}

        {searched && complaints.length > 0 && !error && (
          <>
            <div style={{
              background: 'white', borderBottom: '1px solid #E5E7EB',
              padding: '16px 28px', display: 'flex', alignItems: 'center', gap: 20,
              position: 'sticky', top: 0, zIndex: 15,
            }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', color: 'white', fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{customerInitials}</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>{customerName}</h2>
                  <span style={{ fontSize: 12, color: '#9CA3AF', fontFamily: 'monospace' }}>{customerIdVal}</span>
                  {firstComplaint?.vip_customer && (
                    <span style={{ padding: '2px 10px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: '#FEF3C7', color: '#92400E' }}>VIP</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  {firstComplaint?.complaint_type && (
                    <span style={{ padding: '2px 10px', borderRadius: 8, background: '#F3F4F6', color: '#6B7280', fontSize: 11, fontWeight: 600 }}>{firstComplaint.complaint_type}</span>
                  )}
                  {firstComplaint?.channel && (
                    <span style={{ padding: '2px 10px', borderRadius: 8, background: '#F3F4F6', color: '#6B7280', fontSize: 11, fontWeight: 600 }}>{firstComplaint.channel}</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button type="button" onClick={handleEscalate} disabled={!selectedComplaint}
                  style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: '#DC2626', color: 'white', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', opacity: selectedComplaint ? 1 : 0.5 }}>
                  ⬆ Escalate Case
                </button>
              </div>
            </div>

            {escalateMsg && (
              <div style={{ margin: '12px 28px 0', padding: '10px 16px', borderRadius: 8, background: '#DCFCE7', border: '1px solid #BBF7D0', fontSize: 13, fontWeight: 600, color: '#166534' }}>
                {escalateMsg}
              </div>
            )}

            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.5fr 1fr', gap: 20, alignItems: 'start' }}>
                
                {/* Timeline Column */}
                <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,.03)', overflow: 'hidden' }}>
                  <div style={{ padding: '18px 24px', borderBottom: '1px solid #F0F0F0' }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>Complaints Timeline</h3>
                  </div>
                  <div style={{ padding: '12px 0', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 35, top: 0, bottom: 0, width: 2, background: '#E5E7EB' }} />
                    {timelineEvents.length > 0 ? timelineEvents.map((evt) => {
                      const isSelected = selectedComplaint?.id === evt.complaint.id
                      return (
                        <div key={evt.complaint.id} onClick={() => setSelectedComplaint(evt.complaint)}
                          style={{ position: 'relative', padding: '12px 24px 12px 52px', cursor: 'pointer', borderLeft: isSelected ? '3px solid #3B82F6' : '3px solid transparent', background: isSelected ? '#F0F9FF' : 'transparent', transition: 'all 0.15s' }}>
                          <div style={{ position: 'absolute', left: 26, top: 14, width: 20, height: 20, borderRadius: '50%', background: 'white', border: isSelected ? '2px solid #3B82F6' : '2px solid #D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>{evt.icon}</div>
                          <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>{evt.time}</div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: isSelected ? '#1D4ED8' : '#1F2937', lineHeight: 1.4 }}>{evt.text}</div>
                          <div style={{ fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{evt.complaint.raw_text}</div>
                        </div>
                      )
                    }) : (
                      <div style={{ padding: '16px 24px', fontSize: 12, color: '#9CA3AF' }}>No complaints available</div>
                    )}
                  </div>
                </div>

                {/* Selected Complaint Detail Column */}
                <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,.03)', overflow: 'hidden' }}>
                  <div style={{ padding: '18px 24px', borderBottom: '1px solid #F0F0F0' }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>Complaint Detail</h3>
                  </div>
                  {selectedComplaint ? (
                    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 4 }}>Complaint ID</div>
                        <div style={{ fontSize: 12, color: '#1F2937', fontFamily: 'monospace' }}>{selectedComplaint.id}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 4 }}>Complaint Text</div>
                        <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5, background: '#F9FAFB', padding: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}>{selectedComplaint.raw_text}</div>
                      </div>
                      {selectedComplaint.ai_draft && (
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#4F46E5', textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 4 }}>AI Draft Response</div>
                          <div style={{ fontSize: 12, color: '#1E40AF', lineHeight: 1.5, background: '#EEF2FF', padding: 12, borderRadius: 8, border: '1px solid #DBEAFE' }}>{selectedComplaint.ai_draft}</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: '40px 24px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                      Select a complaint from the timeline to view details.
                    </div>
                  )}
                </div>

                {/* Right Metadata/Insights Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,.03)', overflow: 'hidden' }}>
                    <div style={{ padding: '18px 24px', borderBottom: '1px solid #F0F0F0' }}>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>Selected Metadata</h3>
                    </div>
                    {selectedComplaint ? (
                      <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {[
                          { label: 'Type', value: selectedComplaint.complaint_type || 'N/A' },
                          { label: 'Channel', value: selectedComplaint.channel || 'N/A' },
                          { label: 'Status', value: selectedComplaint.status },
                          { label: 'Severity', value: selectedComplaint.severity_score?.toString() || 'N/A' },
                          { label: 'SLA Tier', value: selectedComplaint.sla_tier || 'N/A' },
                          { label: 'Created', value: new Date(selectedComplaint.created_at).toLocaleDateString() },
                          { label: 'Assigned To', value: selectedComplaint.assigned_to || 'Unassigned' },
                        ].map((row) => (
                          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                            <span style={{ color: '#9CA3AF' }}>{row.label}</span>
                            <span style={{ fontWeight: 600, color: '#374151' }}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '24px', fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>No complaint selected</div>
                    )}
                  </div>

                  <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,.03)', padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                      <div style={{ width: 26, height: 26, borderRadius: 8, background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2a4 4 0 014 4c0 2-2 3-2 5h-4c0-2-2-3-2-5a4 4 0 014-4zM9 18h6M10 22h4" />
                        </svg>
                      </div>
                      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>Selected Insights</h3>
                    </div>

                    {selectedComplaint ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>Issue Analysis</div>
                          <p style={{ margin: 0, fontSize: 12, color: '#4B5563', lineHeight: 1.5 }}>
                            Complaint type: <strong style={{ color: '#DC2626' }}>{selectedComplaint.complaint_type || 'Unknown'}</strong>
                          </p>
                        </div>

                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>Risk Factors</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#6B7280' }}>SLA Breached</span>
                              <span style={{ fontWeight: 600, color: selectedComplaint.sla_breached ? '#DC2626' : '#16A34A' }}>{selectedComplaint.sla_breached ? 'Yes' : 'No'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: '#6B7280' }}>Regulatory Flag</span>
                              <span style={{ fontWeight: 600, color: selectedComplaint.regulatory_flag ? '#DC2626' : '#16A34A' }}>{selectedComplaint.regulatory_flag ? 'Yes' : 'No'}</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: 16 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>Actions</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <button type="button" onClick={handleEscalate}
                              style={{ padding: '8px 14px', borderRadius: 6, background: '#DC2626', color: 'white', border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
                              ⬆ Escalate Case
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>No complaint selected</div>
                    )}
                  </div>
                </div>

              </div>

              <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,.03)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #F0F0F0' }}>
                  {tabs.map((t) => (
                    <button key={t} type="button" onClick={() => setActiveTab(t)}
                      style={{ padding: '14px 22px', border: 'none', background: 'none', fontSize: 13, fontWeight: activeTab === t ? 600 : 500, color: activeTab === t ? '#111827' : '#9CA3AF', borderBottom: activeTab === t ? '2px solid #3B82F6' : '2px solid transparent', cursor: 'pointer' }}>
                      {t}
                    </button>
                  ))}
                </div>
                <div style={{ padding: '16px 24px' }}>
                  {selectedComplaint ? (
                    <>
                      {activeTab === 'Complaints' && (
                        <div style={{ fontSize: 12, color: '#374151' }}>
                          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#6B7280' }}>{selectedComplaint.id}</span>
                            <span>{selectedComplaint.complaint_type || 'N/A'}</span>
                            <span style={{ color: '#3B82F6', fontWeight: 600 }}>{selectedComplaint.status}</span>
                          </div>
                          <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.5 }}>{selectedComplaint.raw_text}</div>
                        </div>
                      )}
                      {activeTab === 'Notes' && (
                        <div style={{ padding: 4 }}>
                          <p style={{ margin: 0, fontSize: 12, color: '#6B7280', lineHeight: 1.6, fontStyle: 'italic' }}>
                            • Complaint ID: {selectedComplaint.id}<br />
                            • Status: {selectedComplaint.status}<br />
                            • SLA Deadline: {selectedComplaint.sla_deadline || 'N/A'}<br />
                            • Type: {selectedComplaint.complaint_type || 'N/A'}<br />
                            • Regulatory: {selectedComplaint.regulatory_flag ? 'Flagged' : 'Not flagged'}<br />
                            • Root Cause: {selectedComplaint.root_cause || 'Not identified'}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ padding: '16px 24px', fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>No complaint selected</div>
                  )}
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  )
}