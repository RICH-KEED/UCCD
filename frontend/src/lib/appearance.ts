export type AppearanceTheme = 'light' | 'dark'
export type AppearanceFont = 'system' | 'serif' | 'mono' | 'compact'

export const APPEARANCE_THEME_KEY = 'uccd.appearance.theme'
export const APPEARANCE_FONT_KEY = 'uccd.appearance.font'

export const FONT_OPTIONS: Array<{ value: AppearanceFont; label: string; stack: string }> = [
  {
    value: 'system',
    label: 'System',
    stack: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  {
    value: 'serif',
    label: 'Serif',
    stack: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
  },
  {
    value: 'mono',
    label: 'Mono',
    stack: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
  {
    value: 'compact',
    label: 'Compact',
    stack: "'Arial Narrow', 'Segoe UI', Arial, sans-serif",
  },
]

export function applyAppearancePreferences(theme: AppearanceTheme, font: AppearanceFont) {
  if (typeof document === 'undefined') return

  const fontOption = FONT_OPTIONS.find((option) => option.value === font) ?? FONT_OPTIONS[0]
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.style.setProperty('--font-sans', fontOption.stack)
  document.body.style.fontFamily = 'var(--font-sans)'
}

export function readAppearancePreferences(): { theme: AppearanceTheme; font: AppearanceFont } {
  if (typeof window === 'undefined') return { theme: 'light' as AppearanceTheme, font: 'system' as AppearanceFont }

  const storedTheme = window.localStorage.getItem(APPEARANCE_THEME_KEY)
  const storedFont = window.localStorage.getItem(APPEARANCE_FONT_KEY)

  return {
    theme: storedTheme === 'dark' ? 'dark' : 'light',
    font: FONT_OPTIONS.some((option) => option.value === storedFont) ? storedFont as AppearanceFont : 'system',
  }
}

export function storeAppearancePreferences(theme: AppearanceTheme, font: AppearanceFont) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(APPEARANCE_THEME_KEY, theme)
  window.localStorage.setItem(APPEARANCE_FONT_KEY, font)
  applyAppearancePreferences(theme, font)
}
