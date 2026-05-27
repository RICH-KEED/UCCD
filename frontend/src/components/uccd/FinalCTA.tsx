import Link from 'next/link'
import { useRouter } from '@/hooks/use-router'
import { Container, PrimaryButton } from './ui'

export function FinalCTA() {
  const { navigate } = useRouter()

  return (
    <section className="border-t border-border py-20">
      <Container>
        <div className="relative overflow-hidden rounded-none border border-border py-16 text-center">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
          <h2 className="font-display text-3xl tracking-[-0.02em] text-text sm:text-4xl">
            Ready to run the UCCD resolution flow?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-muted">
            Start with one complaint and watch intake, AI triage, routing, SLA
            risk, and response drafting come together in a single dashboard.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <PrimaryButton onClick={() => navigate('login')}>Request demo</PrimaryButton>
            <Link href="/login" className="inline-flex h-10 cursor-pointer items-center justify-center rounded-full border border-border px-4 text-sm font-medium text-text transition hover:border-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              Login
            </Link>
          </div>
        </div>
      </Container>
    </section>
  )
}
