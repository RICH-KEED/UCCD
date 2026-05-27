import { motion } from 'framer-motion'
import { Container, SectionTitle } from './ui'

const features = [
  {
    icon: 'NLP',
    title: 'NLP Classifier',
    description:
      'Detects product, issue type, intent, and complaint category as soon as a case enters.',
    output: 'refund dispute',
  },
  {
    icon: 'EMO',
    title: 'Emotion Agent',
    description: 'Detects customer tone and adjusts response temperament for de-escalation.',
    output: 'angry → calm',
  },
  {
    icon: 'SLA',
    title: 'Severity Scorer',
    description: 'Ranks urgency, regulatory exposure, and breach risk before the queue gets noisy.',
    output: 'high risk',
  },
  {
    icon: 'DNA',
    title: 'Complaint DNA',
    description: 'Links duplicates, semantic clusters, and recurring failures across channels.',
    output: 'UPI_FAIL',
  },
  {
    icon: 'ESC',
    title: 'Escalation Agent',
    description: 'Predicts breach probability and flags cases requiring immediate human attention.',
    output: '72% breach risk',
  },
  {
    icon: 'RCA',
    title: 'Root Cause Agent',
    description: 'Finds probable operational causes and turns repeat patterns into action signals.',
    output: 'switch timeout',
  },
]

const sideSignals = [
  ['Severity', 'HIGH / watchlist'],
  ['Root Cause', 'switch timeout'],
  ['Routing', 'Fraud Ops'],
  ['Draft', 'response ready'],
]

export function AgentTriage() {
  return (
    <section id="features" className="relative overflow-hidden py-20">
      <Container className="flex flex-col items-center gap-12">
        <SectionTitle
          title="Multi-agent triage for real complaint work"
          subtitle="Each case is analyzed in parallel so agents start with context, risk, and recommended action instead of a blank screen."
        />

        <div className="grid w-full gap-6 lg:grid-cols-[1fr_320px]">
          <div className="grid border border-border sm:grid-cols-2 lg:grid-cols-3 bg-border gap-px">
            {features.map((f, i) => (
              <motion.article
                key={f.title}
                className="flex min-h-[260px] flex-col gap-6 bg-bg p-5"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ delay: i * 0.08, duration: 0.35 }}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-surface p-3">
                  <span className="text-sm font-semibold text-accent">{f.icon}</span>
                </div>
                <div>
                  <h3 className="text-base font-medium text-text">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {f.description}
                  </p>
                </div>
                <div className="mt-auto rounded-lg border border-accent/20 bg-accent/10 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-accent">Output</p>
                  <p className="mt-1 text-sm text-text">{f.output}</p>
                </div>
              </motion.article>
            ))}
          </div>

          <aside className="rounded-2xl border border-border bg-surface/50 p-5">
            <p className="text-xs font-medium tracking-wide text-accent uppercase">
              Parallel result bus
            </p>
            <div className="mt-5 space-y-3">
              {sideSignals.map(([label, value], index) => (
                <motion.div
                  key={label}
                  className="rounded-lg border border-border bg-bg p-3"
                  animate={{ opacity: [0.72, 1, 0.72] }}
                  transition={{ duration: 2.4, repeat: Infinity, delay: index * 0.2 }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-text">{label}</span>
                    <span className="uccd-accent-dot h-2 w-2 rounded-full bg-accent" />
                  </div>
                  <p className="mt-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs text-accent">
                    {value}
                  </p>
                </motion.div>
              ))}
            </div>
          </aside>
        </div>
      </Container>
    </section>
  )
}
