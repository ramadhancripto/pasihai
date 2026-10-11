// ══════════════════════════════════════════════════════════════
// PASIHAI — useStudioData: data yenye hali halisi
//   loading → ready | error, na retry.
//   Refresh (retry) haifuti data iliyopo: `refreshing` ni true wakati
//   data mpya inakuja, ili UI isiruke na tabs/uchaguzi usipotee.
//   Hakuna data ya kubuni.
// ══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react'

export default function useStudioData(loader, deps = []) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null, refreshing: false })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    setState((s) => ({
      status: s.data ? 'ready' : 'loading',
      data: s.data,
      error: null,
      refreshing: Boolean(s.data),
    }))
    Promise.resolve()
      .then(loader)
      .then((data) => {
        if (alive) setState({ status: 'ready', data, error: null, refreshing: false })
      })
      .catch((error) => {
        if (alive) setState({ status: 'error', data: null, error, refreshing: false })
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { ...state, retry }
}
