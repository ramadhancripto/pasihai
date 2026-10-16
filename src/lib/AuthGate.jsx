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

function isRelayLabHash() {
  if (typeof window === 'undefined') return false
  return String(window.location.hash).replace(/^#\/?/, '').split(/[/?#]/, 1)[0] === 'relay-lab'
}
import { useAuth } from './AuthContext.jsx'
import { isSupabaseLive, isSupabaseMock, supabaseConfigProblems } from './supabaseClient.js'
import { waitForSupabaseRepos } from '../data/repositories/index.js'
import { Button } from '../components/ui.jsx'
import Login from '../pages/Login.jsx'

function ConfigError({ problems }) {
  return (
    <div
      className="psh-app"
      role="alert"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 12, padding: 24, textAlign: 'left', maxWidth: 640, margin: '0 auto' }}
    >
      <h1 style={{ fontSize: 20, margin: 0 }}>Usanidi wa Supabase una tatizo</h1>
      <p style={{ margin: 0 }}>
        App haipakii data ya mock kimya kimya. Rekebisha mambo haya kwenye <code>.env.local</code>
        {' '}(kwenye folder yenye <code>package.json</code>), kisha zima <code>npm run dev</code> na uwashe tena:
      </p>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        {problems.map((p) => (
          <li key={p} style={{ marginBottom: 6 }}>{p}</li>
        ))}
      </ul>
      <p style={{ margin: 0, fontSize: 13 }}>
        Mfano sahihi: <code>VITE_SUPABASE_MODE=live</code>, <code>VITE_SUPABASE_URL=https://&lt;project-ref&gt;.supabase.co</code>,
        {' '}<code>VITE_SUPABASE_PUBLISHABLE_KEY=&lt;publishable-key&gt;</code>. Mock ni kwa majaribio pekee.
      </p>
      <p style={{ margin: 0 }}>
        Bila backend, unaweza kufungua{' '}
        <a href="#/relay-lab">Local Relay Lab</a> (majaribio ya offline — si login, si simu halisi).
      </p>
    </div>
  )
}

export function AuthGate({ children }) {
  const { loading: authLoading, isAuthenticated, authEvent } = useAuth()
  const [repo, setRepo] = useState({ status: 'idle', error: null })
  const [attempt, setAttempt] = useState(0)
  const [relayLab, setRelayLab] = useState(isRelayLabHash)

  useEffect(() => {
    const sync = () => setRelayLab(isRelayLabHash())
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  // PASSWORD_RECOVERY: mtumiaji amefika kupitia link ya kurejesha nenosiri.
  // Lazima tuonyeshe Login (yenye fomu ya nenosiri jipya) badala ya App,
  // hata kama tayari yuko "authenticated" kupitia recovery session.
  const isPasswordRecovery = isSupabaseLive && authEvent === 'PASSWORD_RECOVERY'

  const needsRepos = isSupabaseLive && !authLoading && isAuthenticated && !isPasswordRecovery

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

  // Lab ya local relay: hakuna Supabase, hakuna mock ya watumiaji.
  if (relayLab) {
    return <>{children}</>
  }

  // Tatizo lolote la usanidi: onyesha kosa wazi, usipakie App wala mock.
  if (supabaseConfigProblems.length > 0) {
    return <ConfigError problems={supabaseConfigProblems} />
  }

  // Mock ni wazi (majaribio). Hali nyingine isiyo live haipaswi kufungua App.
  if (!isSupabaseLive) {
    if (!isSupabaseMock) {
      return <ConfigError problems={['Usanidi si live wala mock ya majaribio.']} />
    }
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

  // Katika live mode, onyesha Login ikiwa hajaingia AU ikiwa ni password recovery
  // (mtumiaji amefika kupitia link ya kurejesha — lazima aone fomu ya nenosiri jipya)
  if (!isAuthenticated || isPasswordRecovery) {
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
