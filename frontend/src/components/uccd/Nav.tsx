import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Container, PrimaryButton } from './ui'
import { Switch } from '@/components/ui/switch'
import {
  applyAppearancePreferences,
  readAppearancePreferences,
  storeAppearancePreferences,
  type AppearanceTheme,
} from '@/lib/appearance'
import { useRouter } from '@/hooks/use-router'

const links = [
  { href: '#features', label: 'Agents' },
  { href: '#channels', label: 'Channels' },
  { href: '#workflow', label: 'Workflow' },
  { href: '#platform', label: 'Platform' },
  { href: '#api-docs', label: 'API Docs' },
  { href: '#faq', label: 'FAQ' },
]

export function Nav() {
  const { navigate } = useRouter()
  const [theme, setTheme] = useState<AppearanceTheme>('light')

  useEffect(() => {
    const preferences = readAppearancePreferences()
    setTheme(preferences.theme)
    applyAppearancePreferences(preferences.theme, preferences.font)
  }, [])

  const setThemePreference = (nextTheme: AppearanceTheme) => {
    const preferences = readAppearancePreferences()
    setTheme(nextTheme)
    storeAppearancePreferences(nextTheme, preferences.font)
  }

  return (
    <header className="fixed top-0 z-50 w-full border-b border-border/80 bg-bg/80 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between">
        <a href="#" className="flex items-center gap-2 font-display text-lg font-medium text-text">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2.5 20.5 7v10L12 21.5 3.5 17V7L12 2.5Zm0 2.3L5.5 8.2v7.6l6.5 3.4 6.5-3.4V8.2L12 4.8Zm0 3.2 3.2 1.7v3.8L12 15.2l-3.2-1.7V9.7L12 8Z" />
            </svg>
          </span>
          OmniResol
        </a>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-muted transition-colors hover:text-text"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-xs text-muted">
            <span className={theme === 'light' ? 'text-text' : undefined}>Day</span>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setThemePreference(checked ? 'dark' : 'light')}
            />
            <span className={theme === 'dark' ? 'text-text' : undefined}>Dark</span>
          </div>
          <PrimaryButton className="hidden sm:inline-flex" onClick={() => navigate('login')}>Request demo</PrimaryButton>
          <Link href="/login" className="hidden sm:inline-flex h-10 cursor-pointer items-center justify-center rounded-full border border-border px-4 text-sm font-medium text-text transition hover:border-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
            Login
          </Link>
        </div>
      </Container>
    </header>
  )
}
