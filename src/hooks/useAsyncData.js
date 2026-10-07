// ══════════════════════════════════════════════════════════════
// PASIHAI — useAsyncData (Application State)
//
// Hook ndogo inayosoma data kutoka Application Service.
//
// KWA NINI ASYNC: services zinarudisha Promise ili mabadiliko ya baadaye
// (Firebase / Local DB / Sync Engine) yasiwe yanahitaji kubadilisha UI.
// Kama services zingekuwa sync leo, UI ingelazimika kubadilika baadaye —
// seam isingekuwa na maana.
//
// Hadi data inafika, component ina-render `null`. Mock inajibu mara moja
// (microtask), kwa hivyo hakuna mabadiliko ya kuona kwa mtumiaji.
// Hakuna skeleton/loading UI — hiyo ni uamuzi wa muonekano, si wa Phase 1.
//
// Matumizi:
//   const nav = useAsyncData(() => homeService.getNavigation(), [])
//   if (!nav) return null            // bado haijafika
//
// `deps` inadhibiti wakati data inasomwa upya (k.m. [scope]).
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'

export default function useAsyncData(load, deps = []) {
  const [data, setData] = useState(null)

  useEffect(() => {
    let alive = true

    Promise.resolve()
      .then(load)
      .then((result) => {
        if (alive) setData(result)
      })
      .catch((error) => {
        if (alive) setData(null)
        // Seam hii haitoi UI ya hitilafu bado. Inarekodiwa kwa maendeleo.
        console.error('[useAsyncData] imeshindwa kupata data:', error)
      })

    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return data
}
