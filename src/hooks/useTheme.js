// ══════════════════════════════════════════════════════════════
// PASIHAI — THEME HOOK
//
// Inasimamia dark/light mode kwa:
// 1. System preference (prefers-color-scheme)
// 2. User override (data-theme attribute on <html>)
//
// Matumizi:
//   const { theme, toggle, isDark } = useTheme()
//   <button onClick={toggle}>{isDark ? 'Light' : 'Dark'}</button>
// ══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'pasihai-theme'

function getSystemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getSavedTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'dark'
  } catch {
    return 'dark'
  }
}

export function useTheme() {
  const [preference, setPreference] = useState(getSavedTheme)
  const [system, setSystem] = useState(getSystemTheme)

  // Listen for system theme changes
  useEffect(() => {
    if (!window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => setSystem(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const resolved = preference === 'system' ? system : preference

  // Apply to document
  useEffect(() => {
    const root = document.documentElement
    if (preference === 'system') {
      root.removeAttribute('data-theme')
    } else {
      root.setAttribute('data-theme', preference)
    }
  }, [preference])

  const toggle = useCallback(() => {
    const next = resolved === 'dark' ? 'light' : 'dark'
    setPreference(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {}
  }, [resolved])

  const setTheme = useCallback((t) => {
    setPreference(t)
    try {
      localStorage.setItem(STORAGE_KEY, t)
    } catch {}
  }, [])

  return {
    theme: preference,
    resolved,
    isDark: resolved === 'dark',
    toggle,
    setTheme,
  }
}

export default useTheme