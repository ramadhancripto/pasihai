// ══════════════════════════════════════════════════════════════
// PASIHAI — AUTH GATE
//
// Inazunguka <App /> na kuonyesha Login page ikiwa:
//   - isSupabaseLive = true (live mode)
//   - mtumiaji hajaingia
//
// Katika live mode, baada ya kuingia, inasubiri Supabase repositories
// zipakie kabla ya kuonyesha App. Kama zimeshindwa, inaonyesha error
// yenye kitufe cha kujaribu tena badala ya kuruhusu App ifanye kazi
// na repository isiyopakiwa.
//
// Hii inatenganisha Auth logic na App logic, kuepuka React
// hooks order issue ambayo ingetokea kama Auth check ingekuwa
// ndani ya App component yenyewe.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import { isSupabaseLive } from './supabaseClient.js'
import { waitForSupabaseRepos } from '../data/repositories/index.js'
import { Button } from '../components/ui.jsx'
import Login from '../pages/Login.jsx'

export function AuthGate({ children }) {
  const { loading: authLoading, isAuthenticated } = useAuth()
  const [repo, setRepo] = useState({ status: 'idle', error: null })
  const [attempt, setAttempt] = useState(0)

  const needsRepos = isSupabaseLive && !authLoading && isAuthenticated

  // Hooks zote ziko juu ya returns zenye masharti.
  useEffect(() => {
    if (!needsRepos) return undefined
    let cancelled = false
    setRepo({ status: 'loading', error: null })
    waitForSupabaseRepos()
      .then(() => {
        if (!cancelled) setRepo({ status: 'ready', error: null })
      })
      .catch((err) => {
        if (!cancelled) setRepo({ status: 'error', error: err?.message || 'Imeshindikana kupakia data.' })
      })
    return () => {
      cancelled = true
    }
  }, [needsRepos, attempt])

  // Katika mock mode, rudi moja kwa moja kwa children
  if (!isSupabaseLive) {
    return <>{children}</>
  }

  // Katika live mode, subiri auth loading
  if (authLoading) {
    return (
      <div className="psh-app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p>Inapakia...</p>
      </div>
    )
  }

  // Katika live mode, onyesha Login ikiwa hajaingia
  if (!isAuthenticated) {
    return <Login />
  }

  if (repo.status === 'error') {
    return (
      <div className="psh-app" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 12, padding: 24, textAlign: 'center' }}>
        <p role="alert">Data haijapakia: {repo.error}</p>
        <Button variant="primary" onClick={() => setAttempt((n) => n + 1)}>
          Jaribu tena
        </Button>
      </div>
    )
  }

  if (repo.status !== 'ready') {
    return (
      <div className="psh-app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p>Inapakia data...</p>
      </div>
    )
  }

  // Mtumiaji amejiandikisha na repositories ziko tayari
  return <>{children}</>
}
