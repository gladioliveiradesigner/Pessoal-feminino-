import { useEffect } from 'react'
import type { Accent, ThemePref } from '@/data/types'

export function applyTheme(theme: ThemePref, accent: Accent) {
  const root = document.documentElement
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  root.classList.toggle('dark', dark)
  root.dataset.accent = accent
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1d1c21' : '#FAF7F2')
  try {
    localStorage.setItem('lume-theme', theme)
    localStorage.setItem('lume-accent', accent)
  } catch { /* armazenamento indisponível */ }
}

export function useApplyTheme(theme?: ThemePref, accent?: Accent) {
  useEffect(() => {
    if (!theme || !accent) return
    applyTheme(theme, accent)
    if (theme !== 'system') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = () => applyTheme(theme, accent)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [theme, accent])
}
