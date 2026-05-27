import { Container } from './ui'

const timeline = [
  ['10:04', 'WhatsApp complaint received'],
  ['10:05', 'NLP tagged refund dispute'],
  ['10:06', 'SLA risk calculated'],
  ['10:07', 'Draft response prepared'],
]

const caseFacts = [
  ['Customer', 'Aarav S.'],
  ['Product', 'UPI transfer'],
  ['Severity', 'High'],
  ['Regulatory', 'Watchlist'],
]

export function Intro() {
  return (
    <section className="relative overflow-hidden py-24">
      <Container className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            360 case record
          </span>
          <p className="mt-6 font-display text-[2rem] leading-[1.35] font-normal tracking-[-0.03em] text-text sm:text-[2.35rem]">
            Every complaint becomes a single 360 degree case record, enriched by
            AI agents, SLA intelligence, regulatory context, and next-best-action
            guidance.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-surface/50 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
            <div>
              <p className="text-xs font-medium tracking-wide text-accent uppercase">
                Case UCCD-4821
              </p>
              <h3 className="mt-2 text-xl font-medium text-text">
                Refund failed after successful debit
              </h3>
            </div>
            <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent">
              SLA 42m left
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[0.85fr_1.15fr]">
            <div className="grid gap-3">
              {caseFacts.map(([label, value]) => (
                <div key={label} className="rounded-lg border border-border bg-bg px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
                  <p className="mt-1 text-sm text-text">{value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-border bg-bg p-4">
              <p className="text-xs font-medium tracking-wide text-muted uppercase">
                Unified timeline
              </p>
              <div className="mt-4 space-y-3">
                {timeline.map(([time, event]) => (
                  <div key={time} className="flex gap-3">
                    <span className="w-10 shrink-0 font-mono text-xs text-accent">{time}</span>
                    <span className="uccd-accent-dot h-2 w-2 shrink-0 rounded-full bg-accent mt-1.5" />
                    <p className="text-sm text-muted">{event}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
