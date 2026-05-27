import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import {
  Container,
  ChevronRight,
  IconInbox,
  IconTransform,
  IconBrain,
  IconTarget,
  IconCheck,
  IconMessage,
  IconClock,
  IconChip,
  IconUser,
  IconShield,
} from './ui'

function CharReveal({
  text,
  baseDelay = 0,
  charDelay = 0.05,
}: {
  text: string
  baseDelay?: number
  charDelay?: number
}) {
  const chars = useMemo(() => text.split(''), [text])

  return (
    <>
      {chars.map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.12, delay: baseDelay + i * charDelay, ease: 'easeOut' }}
          style={{ display: char === ' ' ? 'inline' : 'inline' }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </>
  )
}

const speeds = [
  ['Slow', 1500],
  ['Normal', 1000],
  ['Fast', 750],
] as const

const seeds = [
  {
    id: 'SIM-001',
    subject: 'UPI debit failed',
    channel: 'WhatsApp',
    priority: 'High',
    customer: 'Aarav S.',
    raw: 'Paid Rs 4,800 by UPI. Money debited, merchant says payment failed. No refund after 36 hours.',
    envelope: {
      channel: 'whatsapp',
      product: 'UPI transfer',
      issue: 'failed debit reversal',
      evidence: 'message + bank ref',
    },
    route: 'Fraud Ops',
    sla: '42m left',
    final: 'Refund draft ready',
    response: 'Apology + reversal reference + 24h confirmation window.',
    agents: [
      ['NLP Classifier', 'intent: refund_dispute / product: UPI'],
      ['Emotion Agent', 'tone: angry -> response tone: calm'],
      ['Severity Scorer', 'severity: HIGH / regulatory flag: yes'],
      ['Complaint DNA', 'cluster: UPI_FAIL / similar cases: 18'],
      ['Escalation Agent', 'breach probability: 72%'],
      ['Root Cause Agent', 'likely cause: switch timeout'],
    ],
  },
  {
    id: 'SIM-002',
    subject: 'Card dispute duplicate',
    channel: 'Email',
    priority: 'Critical',
    customer: 'Meera K.',
    raw: 'I raised a card dispute twice. Both tickets show pending and no one has called back.',
    envelope: {
      channel: 'email',
      product: 'credit card',
      issue: 'duplicate dispute',
      evidence: 'two ticket IDs',
    },
    route: 'Cards Desk',
    sla: '18m left',
    final: 'Dispute response ready',
    response: 'Merge duplicate cases + assign chargeback owner + update customer.',
    agents: [
      ['NLP Classifier', 'intent: dispute_status / product: card'],
      ['Emotion Agent', 'tone: worried -> response tone: assured'],
      ['Severity Scorer', 'severity: CRITICAL / repeat contact'],
      ['Complaint DNA', 'duplicate found: ticket CD-2219'],
      ['Escalation Agent', 'breach probability: 86%'],
      ['Root Cause Agent', 'likely cause: chargeback queue delay'],
    ],
  },
  {
    id: 'SIM-003',
    subject: 'Loan closure delay',
    channel: 'Portal',
    priority: 'Medium',
    customer: 'Rohan P.',
    raw: 'Loan was closed last week but NOC is not visible in the portal. Need closure certificate urgently.',
    envelope: {
      channel: 'portal',
      product: 'personal loan',
      issue: 'closure certificate delay',
      evidence: 'closure request ID',
    },
    route: 'Loans Team',
    sla: '3h left',
    final: 'Closure note drafted',
    response: 'Confirm closure status + request NOC generation + notify document SLA.',
    agents: [
      ['NLP Classifier', 'intent: document_request / product: loan'],
      ['Emotion Agent', 'tone: frustrated -> response tone: neutral'],
      ['Severity Scorer', 'severity: MEDIUM / no formal regulator flag'],
      ['Complaint DNA', 'cluster: LOAN_CLOSE / similar cases: 7'],
      ['Escalation Agent', 'breach probability: 31%'],
      ['Root Cause Agent', 'likely cause: document batch pending'],
    ],
  },
] as const

const stageNames = ['Channel intake', 'Normalize', 'Agent orchestrator', 'Route + resolve'] as const
const stageLeft = ['8%', '36%', '64%', '92%'] as const
const stageIcons = [IconInbox, IconTransform, IconBrain, IconTarget]

const rowIconsByStage: Record<number, (label: string) => React.ComponentType<{ className?: string }> | null> = {
  0: (label: string) => {
    if (label === 'Customer') return IconUser
    if (label === 'Priority') return IconShield
    if (label === 'Raw text') return IconMessage
    return null
  },
  1: () => IconChip,
  2: () => IconBrain,
  3: (label: string) => {
    if (label === 'Assigned team') return IconUser
    if (label === 'SLA state') return IconClock
    if (label === 'Draft response') return IconMessage
    return null
  },
}

const cardGradients = [
  'from-accent/5 via-transparent to-transparent',
  'from-blue-600/5 via-transparent to-transparent',
  'from-purple-600/5 via-transparent to-transparent',
  'from-emerald-600/5 via-transparent to-transparent',
]

export function ResolutionFlow() {
  const [activeSeed, setActiveSeed] = useState(0)
  const [activeStep, setActiveStep] = useState(0)
  const [speedIndex, setSpeedIndex] = useState(1)
  const seed = seeds[activeSeed]
  const speed = speeds[speedIndex]

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveStep((currentStep) => {
        if (currentStep < stageNames.length - 1) {
          return currentStep + 1
        }
        setActiveSeed((currentSeed) => (currentSeed + 1) % seeds.length)
        return 0
      })
    }, speed[1])

    return () => window.clearInterval(timer)
  }, [speed])

  const activePayload = useMemo(() => {
    if (activeStep === 0) {
      return {
        eyebrow: `${seed.channel} message`,
        title: seed.subject,
        rows: [
          ['Customer', seed.customer],
          ['Priority', seed.priority],
          ['Raw text', seed.raw],
        ],
      }
    }

    if (activeStep === 1) {
      return {
        eyebrow: 'Unified complaint envelope',
        title: 'Normalize channel data',
        rows: Object.entries(seed.envelope),
      }
    }

    if (activeStep === 2) {
      return {
        eyebrow: 'Agent orchestrator',
        title: 'Parallel agent outputs',
        rows: seed.agents,
      }
    }

    return {
      eyebrow: `${seed.route} / ${seed.sla}`,
      title: seed.final,
      rows: [
        ['Assigned team', seed.route],
        ['SLA state', seed.sla],
        ['Draft response', seed.response],
      ],
    }
  }, [activeStep, seed])

  return (
    <section id="workflow" className="relative overflow-hidden border-t border-border py-24">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="flow-float absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-accent/8 blur-3xl" />
        <div className="flow-float-delayed absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
        <div className="flow-float absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-accent/6 blur-3xl" />
      </div>

      <Container>
        <div className="relative mb-10 grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
          <div>
            <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              Live simulation
            </span>
            <h2 className="mt-5 font-display text-[2.35rem] leading-tight tracking-[-0.02em] text-text">
              How UCCD resolves a complaint
            </h2>
            <div className="mt-6 h-px w-16 bg-gradient-to-r from-accent/40 to-transparent" />
          </div>
          <div className="lg:text-right">
            <p className="text-base leading-relaxed text-muted">
              The active block opens in the center, shows its data, then hands
              the case to the next system block.
            </p>
            <a
              href="#platform"
              className="mt-5 inline-flex items-center gap-2 text-base font-medium text-accent transition hover:gap-3"
            >
              View platform surfaces
              <ChevronRight />
            </a>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-surface/40 to-bg/60 p-5 glow-border">
          <div className="relative z-10 mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-bg/80 p-4">
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-accent/15 px-2 py-0.5 font-mono text-[11px] font-medium text-accent">
                    {seed.id}
                  </span>
                  <span className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] text-muted">
                    {seed.channel}
                  </span>
                </div>
                <h3 className="mt-2 text-xl font-medium text-text">{seed.subject}</h3>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-full border border-border bg-surface p-1">
                {speeds.map(([label], index) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setSpeedIndex(index)}
                    className={`cursor-pointer rounded-full px-3 py-1 text-xs transition ${
                      speedIndex === index ? 'bg-accent text-accent-foreground' : 'text-muted hover:text-text'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {seeds.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveSeed(index)
                      setActiveStep(0)
                    }}
                    className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition ${
                      activeSeed === index
                        ? 'border-accent bg-accent text-accent-foreground'
                        : 'border-border bg-surface text-muted hover:text-text'
                    }`}
                  >
                    {item.id}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="relative z-10 rounded-xl border border-border bg-bg/60 p-5">
            <div className="relative mx-auto h-[112px] max-w-[980px]">
              {[0, 1, 2].map((i) => {
                const fromLeft = parseFloat(stageLeft[i])
                const toLeft = parseFloat(stageLeft[i + 1])
                const isActive = activeStep > i
                return (
                  <motion.div
                    key={i}
                    className={`absolute top-5 h-0.5 ${
                      isActive
                        ? 'uccd-accent-line bg-accent'
                        : 'bg-border'
                    }`}
                    style={{
                      left: `calc(${fromLeft}% + 20px)`,
                      width: `calc(${toLeft - fromLeft}% - 40px)`,
                    }}
                    initial={false}
                    animate={isActive ? { opacity: 1 } : { opacity: 0.4 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  />
                )
              })}

              {stageNames.map((name, index) => {
                const Icon = stageIcons[index]
                const completed = activeStep > index
                const isActive = activeStep === index
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setActiveStep(index)}
                    className="absolute top-0 z-10 flex -translate-x-1/2 cursor-pointer flex-col items-center gap-2"
                    style={{ left: stageLeft[index] }}
                  >
                    <span className="relative flex h-10 w-10 items-center justify-center">
                      {isActive && (
                        <span className="flow-pulse absolute inset-0 rounded-full border border-accent/20" />
                      )}
                      <span
                        className={`relative flex h-10 w-10 items-center justify-center rounded-full border text-xs transition ${
                          completed
                            ? 'border-accent/40 bg-accent/10 text-accent'
                            : isActive
                              ? 'border-accent bg-accent/10 text-accent uccd-accent-dot'
                              : 'border-border bg-bg text-muted'
                        }`}
                      >
                        {completed ? <IconCheck /> : <Icon className="h-4 w-4" />}
                      </span>
                    </span>
                    <span className={`w-28 text-center text-xs transition ${isActive ? 'text-accent font-medium' : 'text-muted'}`}>
                      {name}
                    </span>
                  </button>
                )
              })}

              <motion.div
                className="uccd-accent-panel absolute top-[4.25rem] z-20 w-[180px] -translate-x-1/2 rounded-full border border-accent/40 bg-bg px-4 py-2"
                initial={false}
                animate={{ left: stageLeft[activeStep] }}
                transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="truncate text-center text-xs text-text">{activePayload.eyebrow}</p>
              </motion.div>
            </div>

            <motion.div
              key={`${seed.id}-${activeStep}`}
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className={`relative mx-auto mt-4 max-w-4xl rounded-2xl border border-accent/20 bg-gradient-to-br ${cardGradients[activeStep]} p-5`}
            >
              <div className="mb-1 flex items-center gap-2">
                {(() => {
                  const ActiveIcon = stageIcons[activeStep]
                  return <ActiveIcon className="h-3.5 w-3.5 text-accent" />
                })()}
                <p className="text-xs font-medium tracking-wide text-accent uppercase">
                  {activePayload.eyebrow}
                </p>
              </div>
              <h3 className="mt-2 text-2xl font-medium text-text">{activePayload.title}</h3>

              <div className={activeStep === 2 ? 'mt-5 grid gap-3 md:grid-cols-2' : 'mt-5 grid gap-3'}>
                {(activePayload.rows as readonly (readonly [string, string])[]).map(([label, value], rowIdx) => {
                  const RowIcon = rowIconsByStage[activeStep](label)
                  return (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.3,
                        delay: 0.06 + rowIdx * 0.08,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className={`rounded-lg border border-border bg-bg p-4 ${
                        activeStep === 2 ? 'hover:border-accent/30 transition-colors' : ''
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        {RowIcon && <RowIcon className="h-3 w-3 text-muted" />}
                        <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-text">
                        {activeStep === 2 ? (
                          value
                        ) : (
                          <CharReveal text={value} baseDelay={0.08 + rowIdx * 0.08} charDelay={0.01} />
                        )}
                      </p>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          </div>
        </div>
      </Container>
    </section>
  )
}
