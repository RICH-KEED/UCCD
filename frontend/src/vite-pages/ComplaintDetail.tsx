import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { AppSidebar } from '../layout/AppSidebar'
import { useWebSocket } from '../hooks/useWebSocket'
import type { Complaint, HistoryEvent } from '../types/complaint'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const getEmotionValue = (emotion: string): number => {
  const normalized = (emotion || '').toLowerCase()
  if (['hopeful', 'positive', 'happy', 'satisfied', 'relieved'].includes(normalized)) return 1.0
  if (['neutral', 'steady', 'calm'].includes(normalized)) return 0.0
  if (['frustrated', 'anxious', 'concerned', 'worried', 'stressed', 'disappointed'].includes(normalized)) return -0.5
  if (['angry', 'hostile', 'irate', 'furious'].includes(normalized)) return -1.0
  return 0.0
}


const severityLevels = (score: number | null | undefined) => {
  if (score === null || score === undefined) return { label: 'Low', color: '#10B981', bg: 'rgba(16,185,129,0.1)' }
  if (score >= 0.8) return { label: 'Critical', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' }
  if (score >= 0.5) return { label: 'Medium', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' }
  return { label: 'Low', color: '#10B981', bg: 'rgba(16,185,129,0.1)' }
}

const channelIcons: Record<string, string> = {
  whatsapp: '💬',
  email: '📧',
  telegram: '✈',
  twitter: '🐦',
  instagram: '📷',
  app: '📱',
  web: '🌐',
}

// Mock Transactions for high-fidelity ledger context
const MOCK_TRANSACTIONS = [
  { id: 'TXN-90210', date: '2026-05-25', desc: 'UPI Transfer Outbound', amount: '₹12,500.00', status: 'Failed' },
  { id: 'TXN-88219', date: '2026-05-24', desc: 'ATM Cash Withdrawal', amount: '₹5,000.00', status: 'Success' },
  { id: 'TXN-87421', date: '2026-05-22', desc: 'HDFC CC Bill Payment', amount: '₹4,320.00', status: 'Success' },
  { id: 'TXN-85102', date: '2026-05-20', desc: 'POS DEBIT - DMART', amount: '₹2,150.00', status: 'Success' },
]

export function ComplaintDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [complaint, setComplaint] = useState<Complaint | null>(null)
  const [timeline, setTimeline] = useState<HistoryEvent[]>([])
  const [draft, setDraft] = useState('')
  const [tone, setTone] = useState('apologetic')
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Editable customer details form
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [accountNumber, setAccountNumber] = useState('')

  // State statuses
  const [savingDetails, setSavingDetails] = useState(false)
  const [requestingDetails, setRequestingDetails] = useState(false)
  const [sendingResponse, setSendingResponse] = useState(false)
  const [infoMsg, setInfoMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // SLA countdown timer state
  const [timeLeftSec, setTimeLeftSec] = useState<number | null>(null)

  // WebSockets hook for real-time updates
  const { isConnected } = useWebSocket('/ws/supervisor', {
    onEvent: (event) => {
      if (event.complaint_id === id) {
        if (event.type === 'complaint_status_changed' || event.type === 'complaint_details_updated') {
          // Re-fetch data on updates
          loadComplaintData()
        }
      }
    }
  })

  const loadComplaintData = async () => {
    if (!id) return
    try {
      const data = await api.getComplaint(id)
      setComplaint(data)
      setCustomerName(data.customer_name || '')
      setCustomerEmail(data.customer_email || '')
      setCustomerPhone(data.customer_phone || '')
      setAccountNumber(data.account_number || '')
      
      if (data.ai_draft) {
        setDraft(data.ai_draft)
      } else {
        // Fetch AI Draft response if not already present
        try {
          const draftRes = await api.getDraft(id, tone)
          setDraft(draftRes.draft)
        } catch {
          setDraft('')
        }
      }

      // Fetch complaint timeline
      try {
        const historyRes = await api.getComplaintHistory(id)
        setTimeline(historyRes.timeline || [])
      } catch {
        setTimeline([])
      }

      // Handle SLA countdown computation
      if (data.sla_deadline && !data.sla_breached && data.status !== 'resolved') {
        const remaining = Math.max(0, Math.round((new Date(data.sla_deadline).getTime() - Date.now()) / 1000))
        setTimeLeftSec(remaining)
      } else {
        setTimeLeftSec(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch complaint details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadComplaintData()
  }, [id])

  // Periodic decrement of SLA timer
  useEffect(() => {
    if (timeLeftSec === null || timeLeftSec <= 0) return
    const timer = setInterval(() => {
      setTimeLeftSec((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [timeLeftSec])

  // Fetch updated AI draft on tone change
  const handleToneChange = async (newTone: string) => {
    if (!id) return
    setTone(newTone)
    try {
      const draftRes = await api.getDraft(id, newTone)
      setDraft(draftRes.draft)
    } catch {
      // Keep old draft or clear
    }
  }

  // Update customer details handler
  const handleSaveDetails = async () => {
    if (!id) return
    setSavingDetails(true)
    setInfoMsg(null)
    try {
      const updated = await api.updateUserDetails(id, {
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        account_number: accountNumber,
      })
      setComplaint(updated)
      setSuccessMsg('Customer details updated successfully.')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      setInfoMsg(err instanceof Error ? err.message : 'Failed to update details.')
    } finally {
      setSavingDetails(false)
    }
  }

  // Request extra details handler
  const handleRequestDetails = async () => {
    if (!id) return
    setRequestingDetails(true)
    setInfoMsg(null)
    try {
      const res = await api.requestDetails(id)
      setSuccessMsg('Details requested from customer via active channel.')
      setTimeout(() => setSuccessMsg(null), 3000)
      if (res.translated_message) {
        setDraft(res.translated_message)
      }
      loadComplaintData()
    } catch (err) {
      setInfoMsg(err instanceof Error ? err.message : 'Failed to send details request.')
    } finally {
      setRequestingDetails(false)
    }
  }

  // Send draft & resolve complaint
  const handleSendResponse = async () => {
    if (!id) return
    setSendingResponse(true)
    setInfoMsg(null)
    try {
      await api.respond(id, draft)
      setSuccessMsg('Response sent successfully! Ticket resolved.')
      setTimeout(() => {
        setSuccessMsg(null)
        navigate('/app/complaints')
      }, 1500)
    } catch (err) {
      setInfoMsg(err instanceof Error ? err.message : 'Failed to send response.')
    } finally {
      setSendingResponse(false)
    }
  }

  // Render SLA timer visual text
  const renderSlaCountdown = () => {
    if (complaint?.sla_breached || (timeLeftSec !== null && timeLeftSec <= 0)) {
      return <span style={{ color: '#EF4444', fontWeight: 700 }}>BREACHED / OVERDUE</span>
    }
    if (timeLeftSec === null) return <span style={{ color: '#9CA3AF' }}>No SLA set</span>
    const h = Math.floor(timeLeftSec / 3600)
    const m = Math.floor((timeLeftSec % 3600) / 60)
    const s = timeLeftSec % 60
    return (
      <span style={{ color: timeLeftSec < 1800 ? '#EF4444' : timeLeftSec < 3600 ? '#F59E0B' : '#10B981', fontFamily: 'monospace', fontWeight: 700 }}>
        {h.toString().padStart(2, '0')}:{m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}
      </span>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <AppSidebar activeItem="All Complaints" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0d16' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #1e293b', borderTopColor: '#3b82f6', animation: 'spin .8s linear infinite' }} />
            <span style={{ color: '#94a3b8', fontSize: 14 }}>Fetching workspace profile...</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    )
  }

  if (error || !complaint) {
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <AppSidebar activeItem="All Complaints" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0d16' }}>
          <div style={{ background: '#1e1b1b', border: '1px solid #7f1d1d', padding: 24, borderRadius: 12, textAlign: 'center', maxWidth: 400 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🚨</div>
            <div style={{ color: '#f87171', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Workspace Error</div>
            <p style={{ color: '#ef4444', fontSize: 13, margin: '0 0 16px' }}>{error || 'Complaint not found.'}</p>
            <button onClick={() => navigate('/app/complaints')} style={{ padding: '8px 18px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Back to Queue</button>
          </div>
        </div>
      </div>
    )
  }

  const triage = severityLevels(complaint.severity_score)
  const isAwaitingDetails = complaint.awaiting_details

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#0a0d16', color: '#e2e8f0' }}>
      <AppSidebar activeItem={complaint.assigned_to ? 'My Queue' : 'All Complaints'} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* HEADER BAR */}
        <header style={{
          height: 64, background: '#0f172a', borderBottom: '1px solid #1e293b',
          display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 18, display: 'flex', alignItems: 'center' }}>
              &larr;
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Ticket Details</h1>
                <span style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>{complaint.id}</span>
              </div>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                Ingested from {channelIcons[complaint.channel.toLowerCase()] || ''} {complaint.channel}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: isConnected ? '#10b981' : '#ef4444' }} />
              <span style={{ color: '#94a3b8' }}>{isConnected ? 'Live WebSocket Connected' : 'Syncing...'}</span>
            </div>
            {complaint.vip_customer && (
              <span style={{ background: '#f59e0b', color: '#0f172a', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700 }}>VIP PROFILE</span>
            )}
          </div>
        </header>

        {/* 3-COLUMN WORKSPACE */}
        <main style={{ flex: 1, display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr) 340px', gap: 16, padding: 16, overflow: 'hidden' }}>
          
          {/* COLUMN 1: CUSTOMER CONTEXT */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
            {/* Customer Details Card */}
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16 }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '.5px' }}>
                Customer Profile
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: '#64748b', marginBottom: 3, textTransform: 'uppercase' }}>Customer ID</label>
                  <input type="text" readOnly value={complaint.customer_id} style={{ width: '100%', padding: '6px 10px', background: '#1e293b', border: '1px solid #334155', borderRadius: 6, color: '#94a3b8', outline: 'none', fontSize: 12 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: '#64748b', marginBottom: 3, textTransform: 'uppercase' }}>Name</label>
                  <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ width: '100%', padding: '6px 10px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: 'white', outline: 'none', fontSize: 12 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: '#64748b', marginBottom: 3, textTransform: 'uppercase' }}>Email</label>
                  <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} style={{ width: '100%', padding: '6px 10px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: 'white', outline: 'none', fontSize: 12 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: '#64748b', marginBottom: 3, textTransform: 'uppercase' }}>Phone</label>
                  <input type="text" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} style={{ width: '100%', padding: '6px 10px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: 'white', outline: 'none', fontSize: 12 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, color: '#64748b', marginBottom: 3, textTransform: 'uppercase' }}>Account Number</label>
                  <input type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} style={{ width: '100%', padding: '6px 10px', background: '#0f172a', border: '1px solid #334155', borderRadius: 6, color: 'white', outline: 'none', fontSize: 12 }} />
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={handleSaveDetails} disabled={savingDetails} style={{ flex: 1, padding: '7px 10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', opacity: savingDetails ? 0.6 : 1 }}>
                    {savingDetails ? 'Saving...' : 'Save Profile'}
                  </button>
                  <button onClick={handleRequestDetails} disabled={requestingDetails} style={{ flex: 1, padding: '7px 10px', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', opacity: requestingDetails ? 0.6 : 1 }}>
                    {requestingDetails ? 'Requesting...' : 'Request Details'}
                  </button>
                </div>

                {isAwaitingDetails && (
                  <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', padding: '8px 10px', borderRadius: 6, fontSize: 11, color: '#f59e0b', marginTop: 4 }}>
                    ⏳ Awaiting details from customer
                  </div>
                )}
              </div>
            </div>

            {/* Audit History Timeline */}
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16, flex: 1 }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '.5px' }}>
                Audit Timeline
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', paddingLeft: 12, borderLeft: '1px solid #1e293b' }}>
                {timeline.map((evt, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: -16.5, top: 4, width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', border: '2px solid #0a0d16' }} />
                    <div style={{ fontSize: 9, color: '#64748b' }}>{new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#f8fafc' }}>{evt.action}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.3, marginTop: 2 }}>{evt.description}</div>
                  </div>
                ))}
                {timeline.length === 0 && (
                  <div style={{ color: '#64748b', fontSize: 12, fontStyle: 'italic', paddingLeft: 4 }}>No timeline logs.</div>
                )}
              </div>
            </div>

            {/* Transactions Context Ledger */}
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16 }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '.5px' }}>
                Recent Transactions
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {MOCK_TRANSACTIONS.map((txn) => (
                  <div key={txn.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1e293b', fontSize: 11 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>{txn.desc}</div>
                      <div style={{ fontSize: 9, color: '#64748b' }}>{txn.id} · {txn.date}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: txn.status === 'Failed' ? '#ef4444' : '#f8fafc' }}>{txn.amount}</div>
                      <span style={{ fontSize: 9, color: txn.status === 'Failed' ? '#ef4444' : '#10b981' }}>{txn.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* COLUMN 2: COMMUNICATION & AI DRAFT */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', minWidth: 0 }}>
            {/* Conversation Area */}
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 20, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <h3 style={{ margin: '0 0 14px 0', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '.5px' }}>
                Customer Thread
              </h3>
              
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, paddingRight: 4 }}>
                {/* Incoming customer message bubble */}
                <div style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
                  <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span>{customerName || 'Customer'}</span>
                    <span>·</span>
                    <span>{new Date(complaint.created_at).toLocaleTimeString()}</span>
                  </div>
                  <div style={{ background: '#1e293b', padding: '12px 16px', borderRadius: '4px 12px 12px 12px', border: '1px solid #334155', fontSize: 13, lineHeight: 1.5, color: '#f8fafc' }}>
                    {complaint.raw_text}
                  </div>
                </div>

                {/* If translated language exists, show translated issue box */}
                {complaint.detected_language && complaint.detected_language.split('-')[0].toLowerCase() !== 'en' && complaint.translated_text && (
                  <div style={{ alignSelf: 'flex-start', maxWidth: '85%', background: 'rgba(59,130,246,0.05)', border: '1px dashed #3b82f6', borderRadius: 10, padding: 12, fontSize: 12, color: '#93c5fd' }}>
                    <div style={{ fontWeight: 600, fontSize: 10, textTransform: 'uppercase', color: '#3b82f6', marginBottom: 4 }}>
                      Sarvam Translation ({complaint.detected_language.toUpperCase()})
                    </div>
                    "{complaint.translated_text}"
                  </div>
                )}

                {/* Resolved / response messages */}
                {complaint.status === 'resolved' && complaint.resolution_notes && (
                  <div style={{ alignSelf: 'flex-end', maxWidth: '85%' }}>
                    <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3, textAlign: 'right' }}>
                      <span>Agent ({complaint.assigned_to})</span>
                      <span>·</span>
                      <span>{complaint.resolved_at ? new Date(complaint.resolved_at).toLocaleTimeString() : ''}</span>
                    </div>
                    <div style={{ background: 'rgba(16,185,129,0.08)', padding: '12px 16px', borderRadius: '12px 4px 12px 12px', border: '1px solid #065f46', fontSize: 13, lineHeight: 1.5, color: '#a7f3d0' }}>
                      {complaint.resolution_notes}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Glowing AI Draft & Response Composer */}
            <div style={{ 
              background: 'linear-gradient(135deg, #0f172a, #0b0f19)', 
              border: '1px solid #1e293b', 
              borderRadius: 12, 
              padding: 20,
              boxShadow: '0 0 15px rgba(59,130,246,0.1)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>✨</span>
                  <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                    Gen-AI Response Agent
                  </h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: 11, color: '#64748b' }}>Tone</label>
                  <select 
                    value={tone} 
                    onChange={(e) => handleToneChange(e.target.value)}
                    style={{
                      background: '#1e293b', border: '1px solid #334155', 
                      borderRadius: 6, padding: '3px 8px', fontSize: 11,
                      color: 'white', outline: 'none', cursor: 'pointer'
                    }}
                  >
                    <option value="apologetic">Apologetic</option>
                    <option value="formal">Formal</option>
                    <option value="empathetic">Empathetic</option>
                    <option value="structured">Structured</option>
                  </select>
                </div>
              </div>

              <textarea 
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Gen-AI is preparing response draft..."
                rows={4}
                style={{
                  width: '100%', background: '#0a0d16', border: '1px solid #334155',
                  borderRadius: 8, padding: 12, fontSize: 12.5, color: '#f1f5f9',
                  lineHeight: 1.5, outline: 'none', resize: 'none', marginBottom: 12,
                  fontFamily: 'inherit'
                }}
              />

              {infoMsg && (
                <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 10 }}>
                  ⚠️ {infoMsg}
                </div>
              )}

              {successMsg && (
                <div style={{ fontSize: 12, color: '#10b981', marginBottom: 10 }}>
                  ✅ {successMsg}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => handleToneChange(tone)} 
                  style={{
                    padding: '8px 16px', background: '#1e293b', border: '1px solid #334155',
                    borderRadius: 6, color: '#94a3b8', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#334155'}
                  onMouseLeave={e => e.currentTarget.style.background = '#1e293b'}
                >
                  Regenerate
                </button>
                <button 
                  onClick={handleSendResponse} 
                  disabled={sendingResponse || !draft.trim() || complaint.status === 'resolved'} 
                  style={{
                    padding: '8px 20px', background: '#3b82f6', border: 'none',
                    borderRadius: 6, color: 'white', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', opacity: (sendingResponse || !draft.trim() || complaint.status === 'resolved') ? 0.5 : 1,
                    boxShadow: '0 4px 10px rgba(59,130,246,0.2)'
                  }}
                >
                  {sendingResponse ? 'Resolving...' : 'Send Response & Resolve'}
                </button>
              </div>
            </div>
          </section>

          {/* COLUMN 3: AI TRIAGE PANEL */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
            
            {/* SLA Indicators */}
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16 }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '.5px' }}>
                SLA Compliance
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#64748b' }}>SLA Tier</span>
                  <span style={{ fontWeight: 600, color: complaint.sla_tier === 'HIGH' || complaint.sla_tier === 'REGULATORY' ? '#ef4444' : '#3b82f6' }}>
                    {complaint.sla_tier || 'NORMAL'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#64748b' }}>Countdown</span>
                  {renderSlaCountdown()}
                </div>

                {complaint.sla_deadline && (
                  <div style={{ fontSize: 10, color: '#64748b', textAlign: 'right', marginTop: 2 }}>
                    Deadline: {new Date(complaint.sla_deadline).toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            {/* Severity Dial Card */}
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16 }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '.5px' }}>
                Severity Grading
              </h3>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {/* Visual Dial (represented as progress bar) */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: '#64748b' }}>Model Score</span>
                    <span style={{ fontWeight: 700, color: triage.color }}>{(complaint.severity_score !== null && complaint.severity_score !== undefined) ? complaint.severity_score.toFixed(2) : '0.00'}</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: '#1e293b', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(complaint.severity_score || 0) * 100}%`, background: triage.color }} />
                  </div>
                </div>

                <div style={{ background: triage.bg, color: triage.color, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, textAlign: 'center', minWidth: 70 }}>
                  {triage.label}
                </div>
              </div>
            </div>

            {/* AI Classification & Intent */}
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16 }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '.5px' }}>
                Classification DNA
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Complaint Type</span>
                  <span style={{ fontWeight: 600, color: '#f8fafc' }}>{complaint.complaint_type || 'Unclassified'}</span>
                </div>
                {complaint.type_confidence !== null && complaint.type_confidence !== undefined && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ color: '#64748b' }}>Confidence Score</span>
                    <span style={{ color: '#10b981', fontWeight: 600 }}>{(complaint.type_confidence * 100).toFixed(0)}%</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Product Code</span>
                  <span style={{ fontWeight: 600, color: '#f8fafc' }}>{complaint.product_code || 'General'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Customer Intent</span>
                  <span style={{ fontWeight: 600, color: '#f8fafc', textTransform: 'capitalize' }}>{complaint.intent || 'Unknown'}</span>
                </div>
                {complaint.regulatory_obligation && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #1e293b', paddingTop: 8, marginTop: 4 }}>
                    <span style={{ color: '#ef4444', fontWeight: 600 }}>Regulatory Trigger</span>
                    <span style={{ fontWeight: 700, color: '#ef4444' }}>{complaint.regulatory_obligation}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Sentiment / Emotion Arc Progression */}
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16 }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '.5px' }}>
                Customer Emotion Arc
              </h3>

              {complaint.emotion_arc && typeof complaint.emotion_arc === 'object' ? (() => {
                const arc = complaint.emotion_arc as any;
                const initialEmotion = String(arc.initial || 'Neutral');
                const currentEmotion = String(arc.current || 'Neutral');
                const initialVal = getEmotionValue(initialEmotion);
                const currentVal = getEmotionValue(currentEmotion);
                const emotionData = [
                  { name: 'Initial', score: initialVal, label: initialEmotion },
                  { name: 'Current', score: currentVal, label: currentEmotion }
                ];
                const isPositiveSlope = currentVal >= initialVal;
                const lineColor = isPositiveSlope ? '#10b981' : '#ef4444';

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                      <div>
                        <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase' }}>Initial</div>
                        <div style={{ fontWeight: 600, color: '#ef4444' }}>
                          {initialEmotion.toUpperCase()}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', color: '#64748b', fontSize: 14 }}>
                        ➔
                      </div>

                      <div>
                        <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Current</div>
                        <div style={{ fontWeight: 600, color: isPositiveSlope ? '#10b981' : '#ef4444', textAlign: 'right' }}>
                          {currentEmotion.toUpperCase()}
                        </div>
                      </div>
                    </div>

                    <div style={{ height: 80, width: '100%', background: '#1e293b', borderRadius: 8, padding: 6, border: '1px solid #334155' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={emotionData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                          <XAxis dataKey="name" hide />
                          <YAxis domain={[-1.2, 1.2]} hide />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const item = payload[0].payload;
                                return (
                                  <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '4px 8px', fontSize: 11, color: '#f8fafc' }}>
                                    <span style={{ fontWeight: 700 }}>{item.name}:</span> {item.label} ({item.score.toFixed(1)})
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="score"
                            stroke={lineColor}
                            strokeWidth={3}
                            dot={{ r: 5, fill: lineColor, stroke: '#0f172a', strokeWidth: 2 }}
                            activeDot={{ r: 7 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div style={{ background: '#1e293b', padding: '6px 10px', borderRadius: 6, fontSize: 11, textAlign: 'center', border: '1px solid #334155' }}>
                      Trajectory: <strong style={{ color: '#3b82f6' }}>{String(arc.trajectory || 'Steady').toUpperCase()}</strong>
                    </div>
                  </div>
                );
              })() : (
                <div style={{ color: '#64748b', fontSize: 12, fontStyle: 'italic' }}>Emotion arc analysis pending.</div>
              )}
            </div>

            {/* Related Cluster Detection */}
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16 }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '.5px' }}>
                Semantic Duplicate DNA
              </h3>
              
              {complaint.cluster_id ? (
                <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>Related Cluster Alert</span>
                    <span style={{ background: '#ef4444', color: 'white', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>SPIKE</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace', marginBottom: 6 }}>
                    ID: {complaint.cluster_id}
                  </div>
                  <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>
                    Other complaints sharing identical transaction intent detect potential system outage. Recommended cluster mitigation.
                  </p>
                </div>
              ) : (
                <div style={{ color: '#64748b', fontSize: 12, fontStyle: 'italic' }}>No similar complaints detected.</div>
              )}
            </div>

            {/* Next Best Actions (NBAs) */}
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: 16 }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '.5px' }}>
                Recommended Actions
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ background: 'rgba(59,130,246,0.08)', padding: 10, borderRadius: 6, borderLeft: '3px solid #3b82f6', fontSize: 11.5 }}>
                  <div style={{ fontWeight: 600, color: '#f8fafc', marginBottom: 2 }}>Route to Specialists</div>
                  <div style={{ color: '#94a3b8' }}>Assign this case to Cards Disputes Escalation L2 team immediately.</div>
                </div>
                
                <div style={{ background: 'rgba(16,185,129,0.08)', padding: 10, borderRadius: 6, borderLeft: '3px solid #10b981', fontSize: 11.5 }}>
                  <div style={{ fontWeight: 600, color: '#f8fafc', marginBottom: 2 }}>Hold Transaction Charge</div>
                  <div style={{ color: '#94a3b8' }}>Place temporary hold on disputed txn fee to calm customer.</div>
                </div>
              </div>
            </div>

          </section>

        </main>
      </div>
    </div>
  )
}
