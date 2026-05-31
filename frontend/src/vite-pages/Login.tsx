import { useState, useEffect, type ReactNode } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../auth/AuthContext'
import type { UserRole, AgentListItem } from '../types/complaint'
import { API_BASE_URL } from '../api/client'

function redirectFor(_role: string) {
  return '/app/dashboard'
}

const rolesConfig: { role: UserRole; label: string; icon: ReactNode }[] = [
  {
    role: 'AGENT',
    label: 'Agent',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
      </svg>
    ),
  },
  {
    role: 'SUPERVISOR',
    label: 'Supervisor',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    role: 'COMPLIANCE',
    label: 'Compliance',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
]

const DEMO_PASSWORDS: Record<UserRole, string> = {
  AGENT: 'union@123',
  SUPERVISOR: 'Test@123',
  COMPLIANCE: 'Test@123',
}
const DEMO_EMAILS: Partial<Record<UserRole, string>> = {
  SUPERVISOR: 'supervisor@example.com',
  COMPLIANCE: 'compliance@example.com',
}

function LeftPanelPhone() {
  return (
    <div style={{ position: 'relative', width: 140, height: 200, flexShrink: 0 }}>
      <div
        style={{
          position: 'absolute',
          top: -25,
          left: -35,
          width: 210,
          height: 250,
          borderRadius: '50%',
          background: 'rgba(100,150,255,.06)',
        }}
      />
      <div
        style={{
          width: 140,
          height: 200,
          border: '5px solid #2591FF',
          borderRadius: 18,
          background: '#041A47',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 28,
          gap: 18,
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#2591FF' }} />
        <div style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#2591FF" stroke="none">
            <circle cx="12" cy="8" r="4" />
            <path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
          </svg>
        </div>
        {[
          {
            color: '#22C55E', icon: (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
              </svg>
            )
          },
          {
            color: '#22C55E', icon: (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
              </svg>
            )
          },
        ].map((bar, i) => (
          <div
            key={i}
            style={{
              width: 85,
              height: 18,
              borderRadius: 9,
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 10,
              gap: 8,
            }}
          >
            <div style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: bar.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {bar.icon}
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 14, marginTop: 4 }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#22C55E' }} />
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#EF4444' }} />
        </div>
      </div>
    </div>
  )
}

function LeftPanelMonitor() {
  return (
    <div style={{ position: 'relative', width: 180, height: 160, flexShrink: 0 }}>
      <div
        style={{
          width: 180,
          height: 130,
          border: '6px solid #2A89F8',
          borderRadius: 8,
          background: '#072D6A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <div style={{
          width: 85,
          height: 75,
          background: '#FF5B4A',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
            <path d="M12 2v2M12 16v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            <line x1="12" y1="5" x2="12" y2="14" stroke="white" strokeWidth="3" strokeLinecap="round" />
            <circle cx="12" cy="17" r="0.8" fill="white" stroke="none" />
          </svg>
        </div>
      </div>
      <div style={{
        width: 55,
        height: 30,
        background: '#2A89F8',
        margin: '0 auto',
        borderRadius: '0 0 4px 4px',
      }} />
    </div>
  )
}

function SecurityCard() {
  return (
    <div
      style={{
        width: '100%',
        height: 175,
        borderRadius: 12,
        background: '#EEF3FF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#3B5998' }}>
          Enterprise Security
        </span>
        <span style={{ fontSize: 20, fontWeight: 700, color: '#0E4C91', lineHeight: 1.2 }}>
          AES-256 Encrypted
        </span>
        <span style={{ fontSize: 13, color: '#5B7EB5', lineHeight: 1.4, maxWidth: 180 }}>
          All data encrypted at rest and in transit. SOC 2 compliant infrastructure.
        </span>
      </div>
      <div style={{ position: 'relative', width: 90, height: 100, flexShrink: 0 }}>
        <div style={{
          position: 'absolute',
          top: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: '3px solid #8B5CF6',
          background: 'white',
        }} />
        <div style={{
          position: 'absolute',
          top: 4,
          left: 12,
          width: 22,
          height: 10,
          background: '#8B5CF6',
          borderRadius: '50% 50% 0 0',
        }} />
        <div style={{
          position: 'absolute',
          top: 4,
          right: 16,
          width: 14,
          height: 14,
          borderRadius: '50%',
          border: '3px solid #8B5CF6',
          background: 'white',
        }} />
        <div style={{
          position: 'absolute',
          top: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>
        <div style={{
          position: 'absolute',
          bottom: 12,
          right: 0,
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #22C55E, #16A34A)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
      </div>
    </div>
  )
}

export function Login() {
  const { login, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [selectedRole, setSelectedRole] = useState<UserRole>('AGENT')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState(DEMO_PASSWORDS.AGENT)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [agents, setAgents] = useState<AgentListItem[]>([])
  const [loadingAgents, setLoadingAgents] = useState(false)

  useEffect(() => {
    let active = true

    if (selectedRole === 'AGENT') {
      if (agents.length > 0) {
        setEmail(agents[0].email)
        setPassword(DEMO_PASSWORDS.AGENT)
      } else {
        setLoadingAgents(true)
        fetch(`${API_BASE_URL}/api/v1/agents/list`)
          .then((r) => r.json())
          .then((data) => {
            if (!active) return
            const list = data.agents ?? []
            setAgents(list)
            if (list.length > 0) {
              setEmail(list[0].email)
            } else {
              setEmail('')
            }
            setPassword(DEMO_PASSWORDS.AGENT)
          })
          .catch(() => {
            if (!active) return
            setAgents([])
            setPassword(DEMO_PASSWORDS.AGENT)
          })
          .finally(() => {
            if (active) setLoadingAgents(false)
          })
      }
    } else {
      setEmail(DEMO_EMAILS[selectedRole] ?? '')
      setPassword(DEMO_PASSWORDS[selectedRole])
    }

    return () => {
      active = false
    }
  }, [selectedRole, agents])

  if (isAuthenticated && user) {
    return <Navigate to={redirectFor(user.role)} replace />
  }

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      const loggedIn = await login({ email, password })
      const target = (location.state as { from?: string } | null)?.from ?? redirectFor(loggedIn.role)
      navigate(target, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in')
    } finally {
      setIsSubmitting(false)
    }
  }

  const activeTab = rolesConfig.find((r) => r.role === selectedRole)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* LEFT PANEL */}
      <div
        style={{
          width: '50%',
          height: '100%',
          background: 'linear-gradient(135deg, #12326F 0%, #062258 50%, #03184B 100%)',
          position: 'relative',
          overflow: 'hidden',
          paddingTop: 75,
          paddingLeft: 90,
          paddingRight: 70,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{
          position: 'absolute',
          top: 80,
          left: -80,
          width: 350,
          height: 280,
          borderRadius: '40% 60% 50% 50%',
          background: 'rgba(90,120,255,.12)',
          transform: 'rotate(-15deg)',
        }} />
        <div style={{
          position: 'absolute',
          top: -100,
          right: -80,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'rgba(70,100,220,.12)',
        }} />
        <div style={{
          position: 'absolute',
          top: 400,
          right: -40,
          width: 180,
          height: 180,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,.08)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: 120,
          left: 30,
          width: 220,
          height: 220,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,.06)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: -60,
          right: 120,
          width: 350,
          height: 350,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,.05)',
        }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 30,
            gap: 50,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <h1 style={{
                fontFamily: 'sans-serif',
                fontSize: 27,
                fontWeight: 700,
                lineHeight: 1.3,
                color: 'white',
                width: 300,
                margin: 0,
              }}>
                Your Complaints
                <span style={{ color: '#69C9FF' }}> Resolved</span>
                {' '}Faster
              </h1>
              <p style={{
                fontSize: 15,
                lineHeight: 1.5,
                fontWeight: 400,
                color: '#C5D3EF',
                marginTop: 14,
                width: 290,
                margin: '14px 0 0 0',
              }}>
                UCCD OmniResol processes every complaint through 7 AI agents for instant triage and routing.
              </p>
            </div>
            <LeftPanelPhone />
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: 80,
            gap: 45,
          }}>
            <LeftPanelMonitor />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h2 style={{
                fontSize: 29,
                fontWeight: 600,
                lineHeight: 1.2,
                color: 'white',
                margin: 0,
              }}>
                SLA Breach
                <span style={{ color: '#FF5B4A' }}> Alert</span>
              </h2>
              <p style={{
                fontSize: 15,
                fontWeight: 400,
                lineHeight: 1.65,
                color: '#C4D1ED',
                width: 400,
                margin: '12px 0 0 0',
              }}>
                Real-time breach prediction notifies your team before deadlines are missed.
                No complaint goes unresolved — automatic escalation keeps every case on track.
              </p>
            </div>
          </div>

          <div style={{
            marginTop: 50,
            height: 1,
            width: 540,
            background: 'rgba(255,255,255,.18)',
            alignSelf: 'center',
          }} />

          <p style={{
            marginTop: 30,
            fontSize: 16,
            lineHeight: 1.6,
            color: '#B5C6EA',
            width: 480,
            textAlign: 'center',
            alignSelf: 'center',
          }}>
            Your data is secured with enterprise-grade encryption. All complaint records are fully audit-trailed and compliant with regulatory standards.
          </p>

          <button
            type="button"
            onClick={() => window.open('https://omniresol.me/', '_blank')}
            style={{
              marginTop: 22,
              width: 300,
              height: 42,
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,.6)',
              background: 'transparent',
              color: 'white',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              alignSelf: 'center',
              transition: 'all .2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,.08)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            Learn About OmniResol Platform
          </button>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div
        style={{
          width: '50%',
          height: '100%',
          background: 'white',
          overflowY: 'auto',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div style={{
          width: '100%',
          maxWidth: 470,
          paddingTop: 45,
          paddingLeft: 30,
          paddingRight: 30,
        }}>
          <AnimatePresence mode="wait">
            <motion.div
              key="login-form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <h2 style={{
                fontSize: 26,
                fontWeight: 700,
                color: '#1E1E1E',
                margin: '0 0 8px 0',
                lineHeight: 1.2,
              }}>
                Welcome to UCCD
              </h2>

              <div style={{ marginBottom: 10 }}>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '.8px',
                  color: '#2F5BAA',
                  display: 'block',
                  marginBottom: 10,
                }}>
                  POWERED BY OMNIRESOL
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    height: 28,
                    padding: '0 12px',
                    borderRadius: 6,
                    background: '#EEF2FA',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#2F5BAA',
                  }}>
                    <div style={{ display: 'flex', gap: 2 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#2A89F8', display: 'inline-block' }} />
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#2A89F8', display: 'inline-block' }} />
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#2A89F8', display: 'inline-block' }} />
                    </div>
                    UCCD
                  </div>
                  <div style={{
                    height: 28,
                    padding: '0 12px',
                    borderRadius: 6,
                    background: '#EEF2FA',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#2F5BAA',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2F5BAA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                    OmniResol
                  </div>
                </div>
              </div>

              {/* ROLE TABS */}
              <div style={{ marginTop: 30 }}>
                <div style={{ display: 'flex', gap: 50 }}>
                  {rolesConfig.map(({ role, label }) => {
                    const isActive = selectedRole === role
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => handleRoleSelect(role)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0 0 10px 0',
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span style={{
                          fontSize: 14,
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? '#2443FF' : '#222',
                          whiteSpace: 'nowrap',
                          transition: 'color .2s',
                        }}>
                          {label}
                        </span>
                        {isActive && (
                          <motion.div
                            layoutId="activeRoleTab"
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              height: 3,
                              borderRadius: 3,
                              background: '#2846FF',
                            }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
                <div style={{ borderBottom: '1px solid #E5E5E5', marginTop: -1 }} />
              </div>

              {/* FORM */}
              <form onSubmit={handleSubmit} style={{ marginTop: 28 }}>
                {selectedRole === 'AGENT' ? (
                  <div style={{ marginBottom: 18 }}>
                    <label style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: '#222',
                      display: 'block',
                      marginBottom: 8,
                    }}>
                      Select Agent
                    </label>
                    {loadingAgents ? (
                      <div style={{
                        width: '100%',
                        height: 48,
                        borderRadius: 10,
                        border: '1px solid #DADADA',
                        background: '#F5F5F5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        color: '#999',
                      }}>
                        Loading agents...
                      </div>
                    ) : (
                      <select
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          setPassword(DEMO_PASSWORDS.AGENT)
                          setError('')
                        }}
                        required
                        style={{
                          width: '100%',
                          height: 48,
                          borderRadius: 10,
                          border: '1px solid #DADADA',
                          background: 'white',
                          paddingLeft: 15,
                          paddingRight: 40,
                          fontSize: 14,
                          color: '#1E1E1E',
                          outline: 'none',
                          boxSizing: 'border-box',
                          transition: 'border-color .2s',
                          appearance: 'none',
                          WebkitAppearance: 'none',
                          cursor: 'pointer',
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = '#2443FF' }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = '#DADADA' }}
                      >
                        <option value="" disabled>Choose an agent...</option>
                        {agents.map((a) => (
                          <option key={a.user_id} value={a.email}>
                            {a.full_name} ({a.email})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ) : (
                  <div style={{ marginBottom: 18 }}>
                    <label style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: '#222',
                      display: 'block',
                      marginBottom: 8,
                    }}>
                      Email Address
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        style={{
                          width: '100%',
                          height: 48,
                          borderRadius: 10,
                          border: '1px solid #DADADA',
                          background: 'white',
                          paddingLeft: 15,
                          paddingRight: 45,
                          fontSize: 14,
                          color: '#1E1E1E',
                          outline: 'none',
                          boxSizing: 'border-box',
                          transition: 'border-color .2s',
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = '#2443FF' }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = '#DADADA' }}
                        required
                      />
                      <div style={{
                        position: 'absolute',
                        right: 15,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none',
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="8" r="4" />
                          <path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}

                {/* PASSWORD FIELD */}
                <div style={{ marginBottom: 6 }}>
                  <label style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#222',
                    display: 'block',
                    marginBottom: 8,
                  }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      style={{
                        width: '100%',
                        height: 48,
                        borderRadius: 10,
                        border: '1px solid #DADADA',
                        background: 'white',
                        paddingLeft: 15,
                        paddingRight: 45,
                        fontSize: 14,
                        color: '#1E1E1E',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color .2s',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#2443FF' }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#DADADA' }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* ERROR */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      borderRadius: 8,
                      border: '1px solid rgba(239,68,68,.25)',
                      background: '#FEF2F2',
                      padding: '10px 14px',
                      fontSize: 13,
                      color: '#DC2626',
                      marginTop: 12,
                    }}
                  >
                    {error}
                  </motion.div>
                )}

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    height: 48,
                    borderRadius: 10,
                    background: '#2846FF',
                    border: 'none',
                    color: 'white',
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.7 : 1,
                    transition: 'background .2s',
                    marginTop: 22,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) e.currentTarget.style.background = '#1D36D8'
                  }}
                  onMouseLeave={(e) => {
                    if (!isSubmitting) e.currentTarget.style.background = '#2846FF'
                  }}
                >
                  {isSubmitting ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                        <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,.3)" strokeWidth="3" />
                        <path d="M4 12a8 8 0 018-8" stroke="white" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    `Sign in as ${activeTab?.label ?? 'Agent'}`
                  )}
                </button>
              </form>

              <div style={{ marginTop: 30 }}>
                <SecurityCard />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
