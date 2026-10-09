// ══════════════════════════════════════════════════════════════
// PASIHAI — kuficha/kuonyesha navigation wakati wa kusogeza
// Kusogeza chini → header na bottom nav vinateleza nje.
// Kusogeza juu kidogo → vinarudi. Juu kabisa → hali ya kawaida.
// Vinatumia data-chrome kwenye <html>; CSS inashughulikia mwonekano.
// ══════════════════════════════════════════════════════════════

import { useEffect } from 'react'

const HIDE_AFTER = 24 // px za kusogeza chini kabla ya kuficha
const SHOW_AFTER = 12 // px za kusogeza juu kabla ya kurudisha

export default function useChromeHide(enabled) {
  useEffect(() => {
    const root = document.documentElement
    if (!enabled) {
      root.dataset.chrome = 'shown'
      return undefined
    }
    let lastY = Math.max(0, window.scrollY)
    let acc = 0
    let hidden = false

    const set = (next) => {
      if (next === hidden) return
      hidden = next
      root.dataset.chrome = next ? 'hidden' : 'shown'
    }

    const onScroll = () => {
      const y = Math.max(0, window.scrollY)
      const dy = y - lastY
      lastY = y
      if (y <= 8) {
        acc = 0
        set(false)
        return
      }
      // Hesabu upya mwelekeo ukibadilika — kuzuia kuficha kwa mguso mdogo
      if (Math.sign(dy) !== Math.sign(acc)) acc = 0
      acc += dy
      if (acc > HIDE_AFTER) {
        set(true)
        acc = 0
      } else if (acc < -SHOW_AFTER) {
        set(false)
        acc = 0
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      root.dataset.chrome = 'shown'
    }
  }, [enabled])
}
