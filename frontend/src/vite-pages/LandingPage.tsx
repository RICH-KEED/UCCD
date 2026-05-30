import { Nav } from '../components/uccd/Nav'
import { Hero } from '../components/uccd/Hero'
import { Intro } from '../components/uccd/Intro'
import { AgentTriage } from '../components/uccd/AgentTriage'
import { Channels } from '../components/uccd/Channels'
import { ResolutionFlow } from '../components/uccd/ResolutionFlow'
import { Steps } from '../components/uccd/Steps'
import { DashboardStories } from '../components/uccd/DashboardStories'
import { PlatformSurfaces } from '../components/uccd/PlatformSurfaces'
import { ApiDocs } from '../components/uccd/ApiDocs'
import { Questions } from '../components/uccd/Questions'
import { FinalCTA } from '../components/uccd/FinalCTA'

export function LandingPage() {
  const footerLogos = [
    ['GQ', 'Powered by Groq'],
    ['SA', 'Sarvam AI'],
    ['RD', 'Redis'],
    ['DK', 'Docker'],
    ['FA', 'FastAPI'],
    ['RX', 'React'],
    ['PG', 'Neon PostgreSQL'],
    ['UC', 'UCCD OmniResol'],
  ]

  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Intro />
        <AgentTriage />
        <Channels />
        <ResolutionFlow />
        <Steps />
        <DashboardStories />
        <PlatformSurfaces />
        <ApiDocs />
        <Questions />
        <FinalCTA />
      </main>
      <footer className="overflow-hidden border-t border-border py-8 text-sm text-muted">
        <div className="powered-footer-track flex w-max gap-5 whitespace-nowrap">
          {[...Array(2)].map((_, set) => (
            <div key={set} className="flex items-center gap-5 px-5">
              {footerLogos.map(([mark, item]) => (
                <span key={`${set}-${item}`} className="flex items-center gap-3 rounded-full border border-border bg-surface px-4 py-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-[10px] font-semibold text-accent">
                    {mark}
                  </span>
                  <span className="font-display text-xs font-medium uppercase tracking-wide">
                    {item}
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </footer>
    </>
  )
}
