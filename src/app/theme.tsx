import { useEffect } from 'react'
import type { ThemePreference } from '@/domain/types'
import { useData } from './useData'

const STORAGE_KEY = 'nexora:theme'
const CANVAS = { light: '#f6f6f4', dark: '#0b0b0c' }

function syncThemeColor(dark: boolean) {
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove())
  const meta = document.createElement('meta')
  meta.name = 'theme-color'
  meta.content = dark ? CANVAS.dark : CANVAS.light
  document.head.appendChild(meta)
}

function applyTheme(pref: ThemePreference) {
  const dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const root = document.documentElement
  syncThemeColor(dark)
  if (root.classList.contains('dark') === dark) return
  // Troca instantânea, sem transições de cor escalonadas entre componentes.
  const style = document.createElement('style')
  style.textContent = '*,*::before,*::after{transition:none!important}'
  document.head.appendChild(style)
  root.classList.toggle('dark', dark)
  void window.getComputedStyle(root).opacity
  requestAnimationFrame(() => style.remove())
}

/** Aplica o tema salvo nas configurações e acompanha o tema do sistema. */
export function ThemeController() {
  const { ds } = useData()
  const pref = ds.settings.theme
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, pref)
    } catch {
      // Armazenamento indisponível: o tema continua salvo no IndexedDB.
    }
    applyTheme(pref)
    if (pref !== 'system') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [pref])
  return null
}
