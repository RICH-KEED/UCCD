import { useState, useEffect } from 'react'
import { AppSidebar } from '../layout/AppSidebar'
import { api } from '../api/client'
import type { Complaint } from '../types/complaint'

interface DisplayEntry {
  id: string
  rootCause: string
  rawText: string
  complaintType: string
  status: string
  severity: number
}

export function RootCause() {
  const [entries, setEntries] = useState<DisplayEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeWindow, setTimeWindow] = useState('Last 24h')

  useEffect(() => {
    setLoading(true)
    setError(null)
    api.listComplaints({ has_root_cause: true, limit: 20 })
      .then((res) => {
        const mapped: DisplayEntry[] = res.complaints
          .filter((c: Complaint) => c.root_cause)
          .map((c: Complaint) => ({
            id: c.id,
            rootCause: c.root_cause!,
            rawText: c.raw_text,
            complaintType: c.complaint_type || 'Unknown',
            status: c.status,
            severity: c.severity_score ?? 5,
          }))
        setEntries(mapped)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load root cause data'))
      .finally(() => setLoading(false))
  }, [])

  const primaryEntry = entries[0] || null
  const causeChainSteps = primaryEntry
    ? [
        { name: primaryEntry.complaintType, bg: '#FEE2E2', text: '#DC2626', border: '#FECACA' },
        { name: 'Root Cause Identified', bg: '#FFF7ED', text: '#EA580C', border: '#FED7AA' },
        { name: primaryEntry.rootCause.slice(0, 40), bg: '#FEF9C3', text: '#CA8A04', border: '#FDE68A' },
        { name: 'Resolution Action', bg: '#DCFCE7', text: '#16A34A', border: '#BBF7D0' },
      ]
    : []

  const uniqueTypes = Array.from(new Set(entries.map((e) => e.complaintType))).slice(0, 6)

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <AppSidebar activeItem="Root Cause" />
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
        <AppSidebar activeItem="Root Cause" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F5F6FA', gap: 16 }}>
          <div style={{ fontSize: 14, color: '#DC2626' }}>{error}</div>
          <button onClick={() => window.location.reload()} style={{ padding: '8px 20px', borderRadius: 8, background: '#3B82F6', color: 'white', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <AppSidebar activeItem="Root Cause" />
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', background: '#F5F6FA' }}>
        <header style={{
          height: 56, background: 'white', borderBottom: '1px solid #E5E7EB',
          display: 'flex', alignItems: 'center', padding: '0 28px', gap: 16,
        }}>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0, whiteSpace: 'nowrap', flexShrink: 0 }}>Root Cause</h1>
          <div style={{ flex: 1, minWidth: 0, maxWidth: 480, height: 36, borderRadius: 20, background: '#F3F4F6', display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" />
            </svg>
            <input type="text" placeholder="Search complaint ID, issue, product, error code, cluster ID..."
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#374151' }} />
          </div>
          <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, position: 'relative', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            <span style={{ position: 'absolute', top: 3, right: 3, width: 7, height: 7, borderRadius: '50%', background: '#DC2626' }} />
          </button>
          <button type="button" style={{ padding: '6px 14px', borderRadius: 8, background: '#3B82F6', color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>Create Investigation</button>
          <select value={timeWindow} onChange={(e) => setTimeWindow(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E5E7EB', fontSize: 12, fontWeight: 600, color: '#374151', background: 'white', cursor: 'pointer', flexShrink: 0, outline: 'none' }}>
            {['Last 1h', 'Last 6h', 'Last 24h', 'Custom'].map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </header>

        <div style={{
          background: 'white', borderBottom: '1px solid #E5E7EB',
          padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.3px' }}>Filter</span>
          {['All', 'UPI', 'Cards', 'NetBanking', 'Gateway', 'Critical', 'Negative'].map((f) => (
            <button key={f} type="button" style={{ padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600, border: '1px solid #E5E7EB', background: 'white', color: '#6B7280', cursor: 'pointer', whiteSpace: 'nowrap' }}>{f}</button>
          ))}
          <div style={{ width: 1, height: 24, background: '#E5E7EB', margin: '0 4px' }} />
          <div style={{ display: 'flex', border: '1px solid #E5E7EB', borderRadius: 6, overflow: 'hidden' }}>
            {['Cause Tree', 'Dependency Graph', 'Timeline', 'Cluster View'].map((m) => (
              <button key={m} type="button" style={{ padding: '4px 10px', fontSize: 11, fontWeight: 500, background: 'white', color: '#6B7280', border: 'none', cursor: 'pointer', borderRight: m !== 'Cluster View' ? '1px solid #E5E7EB' : 'none' }}>{m}</button>
            ))}
          </div>
          <div style={{ display: 'flex', border: '1px solid #E5E7EB', borderRadius: 6, overflow: 'hidden', marginLeft: 4 }}>
            {['System Failures', 'Behavior Patterns', 'Escalation Drivers', 'Customer Signals'].map((m) => (
              <button key={m} type="button" style={{ padding: '4px 10px', fontSize: 11, fontWeight: 500, background: 'white', color: '#6B7280', border: 'none', cursor: 'pointer', borderRight: m !== 'Customer Signals' ? '1px solid #E5E7EB' : 'none' }}>{m}</button>
            ))}
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: '#6B7280' }}>{entries.length} root-cause candidates</span>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: 24, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {primaryEntry && (
                <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,.03)' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 700, color: '#111827' }}>{primaryEntry.complaintType}</h3>
                  <div style={{ display: 'flex', gap: 20, marginBottom: 16, fontSize: 12 }}>
                    <span>Complaint: <strong>{primaryEntry.id}</strong></span>
                    <span>Severity: <strong style={{ color: '#DC2626' }}>{primaryEntry.severity}/10</strong></span>
                    <span>Status: <strong style={{ color: '#16A34A' }}>{primaryEntry.status}</strong></span>
                  </div>

                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 12 }}>Cause Chain</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
                    {causeChainSteps.map((step, i) => (
                      <div key={step.name} style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{
                          padding: '12px 16px', borderRadius: 10,
                          background: step.bg, border: `1px solid ${step.border}`,
                          fontSize: 12, fontWeight: 600, color: step.text,
                          whiteSpace: 'nowrap',
                        }}>{step.name}</div>
                        {i < causeChainSteps.length - 1 && (
                          <span style={{ fontSize: 18, color: '#CBD5E1', margin: '0 6px' }}>→</span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.3px' }}>Confidence</span>
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#F3F4F6', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: '85%', borderRadius: 3, background: '#16A34A' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#16A34A' }}>High</span>
                  </div>
                </div>
              )}

              <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,.03)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 700, color: '#111827' }}>Root Cause Details</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {entries.slice(0, 6).map((e, _i) => (
                    <div key={e.id} style={{
                      padding: '14px', borderRadius: 10, background: '#FAFBFC', border: '1px solid #F0F0F0',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', fontFamily: 'monospace' }}>{e.id}</span>
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: '#EEF2FF', color: '#4F46E5' }}>{e.complaintType}</span>
                        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, background: '#DCFCE7', color: '#16A34A' }}>{e.status}</span>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', marginBottom: 4 }}>Root Cause: {e.rootCause}</div>
                      <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.4 }}>{e.rawText.slice(0, 200)}{e.rawText.length > 200 ? '...' : ''}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{
              background: 'white', borderRadius: 16, padding: 24,
              boxShadow: '0 2px 10px rgba(0,0,0,.03)',
              position: 'sticky', top: 24,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <div style={{ width: 26, height: 26, borderRadius: 8, background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 014 4c0 2-2 3-2 5h-4c0-2-2-3-2-5a4 4 0 014-4zM9 18h6M10 22h4" /></svg>
                </div>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>Root Cause Intelligence</h3>
                <span style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'monospace', marginLeft: 'auto' }}>{entries.length} items</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>Top Root Causes</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {entries.slice(0, 4).map((e) => (
                      <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                        <span style={{ color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{e.rootCause}</span>
                        <span style={{ fontWeight: 600, color: '#DC2626' }}>{e.id}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>Impact Analysis</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6B7280' }}>Total entries</span>
                      <strong style={{ color: '#DC2626' }}>{entries.length}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6B7280' }}>Unique types</span>
                      <strong style={{ color: '#374151' }}>{uniqueTypes.length}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>AI Recommended Action</div>
                  <ul style={{ margin: '0 0 12px 0', paddingLeft: 16, fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
                    <li>Investigate top root causes</li>
                    <li>Create cluster escalation</li>
                    <li>Send customer advisory</li>
                  </ul>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['Apply', 'Escalate', 'Create Incident'].map((b) => (
                      <button key={b} type="button" style={{
                        padding: '5px 14px', borderRadius: 6, border: 'none',
                        background: b === 'Create Incident' ? '#DC2626' : b === 'Apply' ? '#3B82F6' : '#EEF2FF',
                        color: b === 'Create Incident' || b === 'Apply' ? 'white' : '#4F46E5',
                        fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      }}>{b}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,.03)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 700, color: '#111827' }}>Dependency Map</h3>
            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 12, padding: 12 }}>
              {uniqueTypes.length > 0 ? (
                <>
                  <div style={{ padding: '12px 20px', borderRadius: 10, background: '#DBEAFE', fontSize: 13, fontWeight: 600, color: '#1E40AF' }}>{uniqueTypes[0] || 'N/A'}</div>
                  {uniqueTypes.slice(1).map((t, i) => (
                    <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18, color: '#CBD5E1' }}>→</span>
                      <div style={{ padding: '12px 20px', borderRadius: 10, background: i % 2 === 0 ? '#FEE2E2' : '#DCFCE7', fontSize: 13, fontWeight: 600, color: i % 2 === 0 ? '#DC2626' : '#166534' }}>{t}</div>
                    </div>
                  ))}
                </>
              ) : (
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>No dependency data available</span>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
            <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 10px rgba(0,0,0,.03)' }}>
              <h3 style={{ margin: '0 0 14px 0', fontSize: 14, fontWeight: 700, color: '#111827' }}>Root Cause Entries</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {entries.slice(0, 5).map((e) => (
                  <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '80px minmax(0, 1fr) 70px 70px', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F5F6FA', fontSize: 11 }}>
                    <span style={{ fontWeight: 600, color: '#6B7280', fontFamily: 'monospace' }}>{e.id}</span>
                    <span style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.rootCause}</span>
                    <span style={{ color: '#6B7280' }}>{e.complaintType}</span>
                    <span style={{ color: '#DC2626', fontWeight: 600 }}>Sev {e.severity}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 10px rgba(0,0,0,.03)' }}>
              <h3 style={{ margin: '0 0 14px 0', fontSize: 14, fontWeight: 700, color: '#111827' }}>Similar Patterns</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {entries.slice(0, 3).map((e, _i) => (
                  <div key={e.id} style={{ padding: 10, borderRadius: 8, border: '1px solid #F0F0F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#1F2937' }}>{e.complaintType}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#16A34A', background: '#DCFCE7', padding: '1px 6px', borderRadius: 4 }}>{(80 + _i * 5)}% match</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#4B5563', lineHeight: 1.4, marginBottom: 4 }}>{e.rootCause.slice(0, 80)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 10px rgba(0,0,0,.03)' }}>
              <h3 style={{ margin: '0 0 14px 0', fontSize: 14, fontWeight: 700, color: '#111827' }}>Status Summary</h3>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {Array.from(new Set(entries.map((e) => e.status))).map((status, i) => {
                  const count = entries.filter((e) => e.status === status).length
                  return (
                    <div key={status} style={{
                      display: 'flex', gap: 10, padding: '8px 0',
                      borderBottom: i < entries.length - 1 ? '1px solid #F5F6FA' : 'none',
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', whiteSpace: 'nowrap', minWidth: 80 }}>{status}</span>
                      <span style={{ fontSize: 11, color: '#374151', lineHeight: 1.4 }}>{count} complaints</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}