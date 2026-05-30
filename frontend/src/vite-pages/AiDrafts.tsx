import { useState, useEffect } from 'react'
import { AppSidebar } from '../layout/AppSidebar'
import { api } from '../api/client'
import type { Complaint } from '../types/complaint'

interface DisplayDraft {
  id: string
  complaintId: string
  customer: string
  summary: string
  channel: string
  tone: string
  confidence: number
  status: string
  lastEdited: string
  preview: string
  variables: string[]
  checks: { noSensitiveInfo: boolean; toneAppropriate: boolean; policyCompliant: boolean }
}

const filterOptions = ['All', 'Email', 'WhatsApp', 'SMS', 'Formal', 'Apologetic', 'Draft', 'Reviewed', 'Sent', 'High Confidence']

export function AiDrafts() {
  const [drafts, setDrafts] = useState<DisplayDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState('All')
  const [sort, setSort] = useState('Newest')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedDraft, setSelectedDraft] = useState<DisplayDraft | null>(null)

  const fetchDrafts = () => {
    setLoading(true)
    setError(null)
    api.listComplaints({ limit: 100 })
      .then((res) => {
        const mapped: DisplayDraft[] = res.complaints
          .filter((c: Complaint) => c.ai_draft)
          .map((c: Complaint, i: number) => ({
            id: `DFT-${1000 + i}`,
            complaintId: c.id,
            customer: c.customer_name ?? c.customer_id,
            summary: c.complaint_type || c.raw_text.slice(0, 60),
            channel: c.channel || 'Email',
            tone: c.intent === 'complaint' ? 'Apologetic' : c.intent === 'urgent' ? 'Urgent' : 'Formal',
            confidence: c.type_confidence ?? 80,
            status: c.status,
            lastEdited: c.updated_at ? new Date(c.updated_at).toLocaleDateString() : 'N/A',
            preview: c.ai_draft || '',
            variables: [c.customer_name || 'Customer', c.id, c.complaint_type || 'Issue'].filter(Boolean),
            checks: {
              noSensitiveInfo: true,
              toneAppropriate: true,
              policyCompliant: c.regulatory_flag ? false : true,
            },
          }))
        const sorted = [...mapped].sort((a, b) => b.confidence - a.confidence)
        setDrafts(sorted)
        if (sorted.length > 0) setSelectedDraft(sorted[0])
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load drafts'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchDrafts()
  }, [])

  const toggle = (id: string) => setSelectedIds((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Draft copied to clipboard!')
  }

  const handleMarkSent = async (complaintId: string) => {
    try {
      await api.updateStatus(complaintId, 'resolved')
      setDrafts(prev => prev.filter(d => d.complaintId !== complaintId))
      if (selectedDraft?.complaintId === complaintId) {
        setSelectedDraft(null)
      }
      alert('Complaint marked as resolved/sent')
    } catch {
      alert('Failed to update status')
    }
  }

  const handleRegenerate = async (complaintId: string) => {
    try {
      const res = await api.getDraft(complaintId)
      setDrafts(prev => prev.map(d => d.complaintId === complaintId ? { ...d, preview: res.draft } : d))
      if (selectedDraft?.complaintId === complaintId) {
        setSelectedDraft(prev => prev ? { ...prev, preview: res.draft } : null)
      }
      alert('Draft regenerated!')
    } catch {
      alert('Failed to regenerate draft')
    }
  }

  const filteredDrafts = drafts.filter((d) => {
    if (activeFilter === 'All') return true
    if (activeFilter === 'High Confidence') return d.confidence >= 90
    if (['Email', 'WhatsApp', 'SMS'].includes(activeFilter)) return d.channel === activeFilter
    if (['Formal', 'Apologetic', 'Urgent'].includes(activeFilter)) return d.tone === activeFilter
    if (['Draft', 'Reviewed', 'Sent'].includes(activeFilter)) return d.status === activeFilter
    return true
  })

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <AppSidebar activeItem="AI Drafts" />
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
        <AppSidebar activeItem="AI Drafts" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F5F6FA', gap: 16 }}>
          <div style={{ fontSize: 14, color: '#DC2626' }}>{error}</div>
          <button onClick={() => window.location.reload()} style={{ padding: '8px 20px', borderRadius: 8, background: '#3B82F6', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <AppSidebar activeItem="AI Drafts" />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100vh', background: '#F5F6FA' }}>
        <header style={{
          height: 56, background: 'white', borderBottom: '1px solid #E5E7EB',
          display: 'flex', alignItems: 'center', padding: '0 28px', gap: 16,
          flexShrink: 0,
        }}>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>AI Response Drafts</h1>
          <div style={{ flex: 1, minWidth: 0, maxWidth: 460, height: 36, borderRadius: 20, background: '#F3F4F6', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" />
            </svg>
            <input type="text" placeholder="Search complaint ID, customer, draft content..."
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151' }} />
          </div>
        </header>

        <div style={{
          background: 'white', borderBottom: '1px solid #E5E7EB',
          padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.3px' }}>Filter</span>
          {filterOptions.map((f) => (
            <button key={f} type="button" onClick={() => setActiveFilter(f)}
              style={{
                padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                border: `1px solid ${activeFilter === f ? '#4F46E5' : '#E5E7EB'}`,
                background: activeFilter === f ? '#EEF2FF' : 'white',
                color: activeFilter === f ? '#4F46E5' : '#6B7280',
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .15s',
              }}>{f}</button>
          ))}
          <div style={{ width: 1, height: 24, background: '#E5E7EB', margin: '0 4px' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.3px' }}>Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}
            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #E5E7EB', fontSize: 12, fontWeight: 500, color: '#374151', background: '#F9FAFB', cursor: 'pointer', outline: 'none' }}>
            {['Newest', 'Confidence', 'Priority'].map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: '#6B7280' }}>{filteredDrafts.length} drafts</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 24, alignItems: 'start' }}>
            <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,.03)', overflow: 'hidden', minWidth: 0 }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #F0F0F0' }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>Draft Queue</h3>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                  AI-generated response drafts ready for review. Created automatically when complaints enter the pipeline.
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '40px 90px 120px minmax(0, 1fr) 180px 240px',
                  gap: 8, alignItems: 'center', padding: '10px 24px', background: '#FAFBFC', borderBottom: '1px solid #F0F0F0',
                  fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.4px',
                  minWidth: 800,
                }}>
                  <div></div>
                  <div>Complaint ID</div>
                  <div>Customer</div>
                  <div>Summary</div>
                  <div>Draft Text</div>
                  <div>Actions</div>
                </div>

                {filteredDrafts.map((d) => {
                  return (
                    <div key={d.id}>
                      <div onClick={() => setSelectedDraft(d)}
                        style={{
                          display: 'grid', gridTemplateColumns: '40px 90px 120px minmax(0, 1fr) 180px 240px',
                          gap: 8, alignItems: 'center', padding: '12px 24px', borderBottom: '1px solid #F5F6FA',
                          background: selectedDraft?.id === d.id ? '#EFF6FF' : 'white',
                          cursor: 'pointer', transition: 'background .1s',
                          minWidth: 800,
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input type="checkbox" checked={selectedIds.has(d.id)} onChange={() => toggle(d.id)}
                            style={{ width: 14, height: 14, cursor: 'pointer' }} onClick={(ev) => ev.stopPropagation()} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', fontFamily: 'monospace' }}>{d.complaintId.slice(0, 8)}</span>
                        <span style={{
                          fontSize: 12, color: '#1F2937', fontWeight: 600,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          display: 'block'
                        }} title={d.customer}>{d.customer}</span>
                        <span style={{ fontSize: 11, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.summary}</span>
                        <span style={{ fontSize: 11, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.preview}</span>
                        <div style={{ display: 'flex', gap: 4 }} onClick={(ev) => ev.stopPropagation()}>
                          <button type="button" onClick={() => handleCopy(d.preview)}
                            style={{ padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, color: '#3B82F6', background: '#EFF6FF', border: 'none', cursor: 'pointer' }}>Copy Draft</button>
                          <button type="button" onClick={() => handleMarkSent(d.complaintId)}
                            style={{ padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, color: '#16A34A', background: '#DCFCE7', border: 'none', cursor: 'pointer' }}>Mark Sent</button>
                          <button type="button" onClick={() => handleRegenerate(d.complaintId)}
                            style={{ padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, color: '#EA580C', background: '#FFF7ED', border: 'none', cursor: 'pointer' }}>Regenerate</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {selectedDraft && (
              <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,.03)', padding: 24, maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 014 4c0 2-2 3-2 5h-4c0-2-2-3-2-5a4 4 0 014-4zM9 18h6M10 22h4" /></svg>
                  </div>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>Draft Preview</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={{ padding: 14, borderRadius: 8, background: '#F9FAFB', border: '1px solid #E5E7EB', fontSize: 12, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {selectedDraft.preview}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                    <div>Type: <strong style={{ color: '#4F46E5' }}>{selectedDraft.summary}</strong></div>
                    <div>Channel: <strong style={{ color: '#6B7280' }}>{selectedDraft.channel}</strong></div>
                    <div>Tone: <strong style={{ color: '#EA580C' }}>{selectedDraft.tone}</strong></div>
                  </div>

                  <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>Actions</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => handleMarkSent(selectedDraft.complaintId)}
                        style={{ padding: '6px 16px', borderRadius: 6, background: '#3B82F6', color: 'white', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Mark Sent</button>
                      <button type="button" onClick={() => handleRegenerate(selectedDraft.complaintId)}
                        style={{ padding: '6px 16px', borderRadius: 6, background: '#F3F4F6', color: '#6B7280', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Regenerate</button>
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