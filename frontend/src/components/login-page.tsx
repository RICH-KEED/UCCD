'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from '@/hooks/use-router'
import type { UserRole } from '@/types/complaint'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, LayoutDashboard, Shield, Eye, EyeOff, Loader2, Layers, Clock } from 'lucide-react'

const rolesConfig: { role: UserRole; label: string; email: string; icon: React.ReactNode }[] = [
  { role: 'AGENT', label: 'Agent', email: 'agent@example.com', icon: <User className="h-4 w-4" /> },
  { role: 'SUPERVISOR', label: 'Supervisor', email: 'supervisor@example.com', icon: <LayoutDashboard className="h-4 w-4" /> },
  { role: 'COMPLIANCE', label: 'Compliance', email: 'compliance@example.com', icon: <Shield className="h-4 w-4" /> },
]

export function LoginPage() {
  const { login, isAuthenticated, user } = useAuth()
  const { navigate } = useRouter()

  const [selectedRole, setSelectedRole] = useState<UserRole>('AGENT')
  const [email, setEmail] = useState('agent@example.com')
  const [password, setPassword] = useState('Test@123')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Use useEffect to avoid setState during render
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate('dashboard')
    }
  }, [isAuthenticated, user, navigate])

  if (isAuthenticated && user) {
    return null
  }

  const handleRoleSelect = (role: UserRole, presetEmail: string) => {
    setSelectedRole(role)
    setEmail(presetEmail)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      await login({ email, password })
      navigate('dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in')
    } finally {
      setIsSubmitting(false)
    }
  }

  const activeTab = rolesConfig.find((r) => r.role === selectedRole)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* LEFT PANEL */}
      <div className="w-1/2 h-full relative overflow-hidden pt-12 pl-[90px] pr-[70px] flex flex-col bg-secondary">
        {/* Decorative shapes */}
        <div className="absolute top-20 -left-20 w-[350px] h-[280px] rounded-[40%_60%_50%_50%] bg-primary/12 -rotate-15" />
        <div className="absolute -top-24 -right-20 w-[400px] h-[400px] rounded-full bg-primary/12" />
        <div className="absolute top-[400px] -right-10 w-[180px] h-[180px] rounded-full border border-secondary-foreground/10" />
        <div className="absolute bottom-[120px] left-[30px] w-[220px] h-[220px] rounded-full border border-secondary-foreground/8" />
        <div className="absolute -bottom-16 right-[120px] w-[350px] h-[350px] rounded-full border border-secondary-foreground/7" />

        <div className="relative z-1 flex flex-col flex-1">
          {/* TOP BLOCK */}
          <div className="flex items-center justify-between mt-6 gap-12">
            <div className="flex flex-col">
              <h1 className="text-[27px] font-bold leading-tight text-secondary-foreground">
                Your Complaints <span className="text-primary">Resolved</span> Faster
              </h1>
              <p className="text-[15px] leading-relaxed text-muted-foreground mt-3.5 max-w-[290px]">
                UCCD OmniResol processes every complaint through 7 AI agents for instant triage and routing.
              </p>
            </div>
            {/* Phone illustration */}
            <div className="relative w-[140px] h-[200px] flex-shrink-0">
              <div className="absolute -top-6 -left-9 w-[210px] h-[250px] rounded-full bg-primary/6" />
              <div className="w-[140px] h-[200px] border-[5px] border-primary rounded-xl bg-secondary flex flex-col items-center pt-7 gap-[18px]">
                <div className="w-10 h-1 rounded bg-primary" />
                <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex gap-3.5 mt-1">
                  <div className="w-[18px] h-[18px] rounded-full bg-success" />
                  <div className="w-[18px] h-[18px] rounded-full bg-destructive" />
                </div>
              </div>
            </div>
          </div>

          {/* MIDDLE BLOCK */}
          <div className="flex items-center mt-14 gap-11">
            {/* Monitor illustration */}
            <div className="relative w-[180px] h-[160px] flex-shrink-0">
              <div className="w-[180px] h-[130px] border-[6px] border-primary rounded-lg bg-secondary flex items-center justify-center">
                <div className="w-[85px] h-[75px] bg-destructive rounded-md flex items-center justify-center">
                  <Clock className="h-9 w-9 text-destructive-foreground" />
                </div>
              </div>
              <div className="w-[55px] h-[30px] bg-primary mx-auto rounded-b" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-[29px] font-semibold leading-tight text-secondary-foreground">
                SLA Breach <span className="text-destructive">Alert</span>
              </h2>
              <p className="text-[15px] leading-relaxed text-muted-foreground max-w-[400px] mt-3">
                Real-time breach prediction notifies your team before deadlines are missed.
                No complaint goes unresolved — automatic escalation keeps every case on track.
              </p>
            </div>
          </div>

          {/* DIVIDER */}
          <div className="mt-10 h-px w-[540px] bg-secondary-foreground/15 self-center" />

          {/* FOOTER MESSAGE */}
          <p className="mt-6 text-base leading-relaxed text-muted-foreground max-w-[480px] text-center self-center">
            Your data is secured with enterprise-grade encryption. All complaint records are fully audit-trailed and compliant with regulatory standards.
          </p>

          <Button
            variant="outline"
            className="mt-5 w-[300px] h-[42px] rounded-lg border-secondary-foreground/80 text-secondary-foreground font-semibold self-center bg-transparent hover:bg-secondary-foreground/8"
            onClick={() => window.open('https://omniresol.tech', '_blank')}
          >
            Learn About OmniResol Platform
          </Button>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-1/2 h-full bg-background overflow-hidden flex items-center justify-center">
        <div className="w-full max-w-[514px] px-[30px]">
          <AnimatePresence mode="wait">
            <motion.div
              key="login-form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <h2 className="text-[28px] font-bold text-foreground mb-2 leading-tight">
                Welcome to UCCD
              </h2>

              <div className="mb-4">
                <span className="text-[11px] font-bold tracking-[.8px] text-primary block mb-2.5">
                  POWERED BY OMNIRESOL
                </span>
                <div className="flex items-center gap-3">
                  <div className="h-7 px-3 rounded-md bg-accent flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <Layers className="h-3.5 w-3.5" />
                    UCCD
                  </div>
                  <div className="h-7 px-3 rounded-md bg-accent flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <Clock className="h-3.5 w-3.5" />
                    OmniResol
                  </div>
                </div>
              </div>

              {/* ROLE TABS */}
              <Tabs
                value={selectedRole}
                onValueChange={(value) => {
                  const cfg = rolesConfig.find((r) => r.role === value)
                  if (cfg) handleRoleSelect(cfg.role, cfg.email)
                }}
                className="mt-5"
              >
                <TabsList className="relative h-auto w-full gap-0.5 bg-transparent p-0 before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-border">
                  {rolesConfig.map(({ role, label, icon }) => (
                    <TabsTrigger
                      key={role}
                      value={role}
                      className="overflow-hidden rounded-b-none border-x border-t bg-muted py-2 transition-all duration-300 ease-out data-[state=active]:z-10 data-[state=active]:-translate-y-0.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                    >
                      {icon}
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              {/* FORM */}
              <form onSubmit={handleSubmit} className="mt-7">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={selectedRole}
                    initial={{ opacity: 0, y: 10, scale: 0.985, filter: 'blur(5px)' }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -8, scale: 0.985, filter: 'blur(5px)' }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="mb-3.5">
                      <Label className="text-[15px] font-semibold text-foreground mb-2 block">Email Address</Label>
                      <div className="relative">
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                          className="h-12 rounded-lg pr-11 transition-shadow duration-300 focus-visible:shadow-[0_0_0_4px_color-mix(in_oklch,var(--primary)_14%,transparent)]"
                          required
                        />
                        <User className="absolute right-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground pointer-events-none" />
                      </div>
                    </div>

                    <div className="mb-3">
                      <Label className="text-[15px] font-semibold text-foreground mb-2 block">Password</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="h-12 rounded-lg pr-11 transition-shadow duration-300 focus-visible:shadow-[0_0_0_4px_color-mix(in_oklch,var(--primary)_14%,transparent)]"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 bg-none border-none cursor-pointer p-1 flex items-center transition-transform duration-200 hover:scale-105"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            <EyeOff className="h-[18px] w-[18px] text-muted-foreground" />
                          ) : (
                            <Eye className="h-[18px] w-[18px] text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border border-destructive/15 bg-destructive/8 px-3.5 py-2.5 text-[13px] text-destructive mt-3"
                      >
                        {error}
                      </motion.div>
                    )}

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="mt-2 w-full h-12 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[15px] font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                    >
                      {isSubmitting ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Signing in...
                        </span>
                      ) : (
                        `Sign in as ${activeTab?.label ?? 'Agent'}`
                      )}
                    </Button>
                  </motion.div>
                </AnimatePresence>
              </form>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
