import { motion } from 'framer-motion'
import { useRouter } from '@/hooks/use-router'
import { Container, PrimaryButton, StarRating } from './ui'

function DashboardPreview() {
  const queue = [
    ['UPI refund stuck', 'High', '42m left'],
    ['Card fraud dispute', 'Critical', '12m left'],
    ['Loan closure delay', 'Medium', '3h left'],
  ]

  return (
    <div className="grid gap-px bg-border lg:grid-cols-[0.9fr_1.4fr_0.9fr]">
      <div className="bg-bg p-5">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">Live intake</p>
        <div className="mt-5 space-y-3">
          {['Email', 'WhatsApp', 'Voice', 'Regulator'].map((channel) => (
            <motion.div
              key={channel}
              className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2"
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: channel.length * 0.04 }}
            >
              <span className="text-sm text-text">{channel}</span>
              <span className="uccd-accent-dot h-2 w-2 rounded-full bg-accent" />
            </motion.div>
          ))}
        </div>
      </div>
      <div className="relative overflow-hidden bg-surface p-5">
        <div className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
        <p className="text-xs font-medium tracking-wide text-muted uppercase">Agent workspace</p>
        <div className="mt-5 rounded-lg border border-border bg-bg p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-accent/15 px-3 py-1 text-xs text-accent">Severity: High</span>
            <span className="rounded-full border border-border px-3 py-1 text-xs text-muted">Emotion: Angry</span>
            <span className="rounded-full border border-border px-3 py-1 text-xs text-muted">Cluster: UPI_FAIL</span>
          </div>
          <p className="mt-5 text-lg font-medium text-text">Customer reports failed UPI debit with no reversal.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {queue.map(([title, risk, sla]) => (
              <div key={title} className="rounded-lg border border-border bg-surface p-3">
                <p className="text-sm text-text">{title}</p>
                <p className="mt-2 text-xs text-muted">{risk} · {sla}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-bg p-5">
        <p className="text-xs font-medium tracking-wide text-muted uppercase">AI output</p>
        <div className="mt-5 space-y-3">
          {['Draft response ready', 'SLA breach risk 72%', 'Route to Fraud Ops'].map((item) => (
            <div key={item} className="rounded-lg border border-accent/20 bg-accent/10 px-3 py-2 text-sm text-text">
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function Hero() {
  const { navigate } = useRouter()

  return (
    <section className="uccd-hero-glow relative overflow-hidden pt-32 pb-12">
      <Container className="flex flex-col items-center gap-12">
        <div className="flex max-w-[712px] flex-col items-center gap-8 text-center">
          <motion.h1
            className="font-display text-5xl leading-[1.05] font-normal tracking-[-0.03em] text-text sm:text-6xl"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          >
            Unified Complaint
            <br />
            Command Center
          </motion.h1>
          <p className="max-w-[500px] text-base leading-relaxed text-muted">
            UCCD brings email, social, voice, chat, portal, and regulator
            complaints into one AI-assisted resolution workflow.
          </p>
          <PrimaryButton onClick={() => navigate('login')}>See the workflow</PrimaryButton>
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-muted">Built for regulated service teams</p>
            <StarRating />
          </div>
        </div>

        <div className="relative w-full max-w-[1184px]">
          <div className="pointer-events-none absolute -top-24 left-1/2 h-[398px] w-[90%] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
          <div className="uccd-preview-shadow relative overflow-hidden rounded-2xl border border-border">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
            <DashboardPreview />
          </div>
        </div>
      </Container>
    </section>
  )
}
