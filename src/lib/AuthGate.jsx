// ══════════════════════════════════════════════════════════════
// PASIHAI — AUTH GATE
//
// Inazunguka <App /> na kuonyesha Login page ikiwa:
//   - isSupabaseLive = true (live mode)
//   - mtumiaji hajaingia
//
// Hii inatenganisha Auth logic na App logic, kuepuka React
// hooks order issue ambayo ingetokea kama Auth check ingekuwa
// ndani ya App component yenyewe.
// ══════════════════════════════════════════════════════════════

import { useAuth } from './AuthContext.jsx'
import { isSupabaseLive } from './supabaseClient.js'
import Login from '../pages/Login.jsx'

export function AuthGate({ children }) {
  const { loading: authLoading, isAuthenticated } = useAuth()

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

  // Mtumiaji amejiandikisha, rudisha app
  return <>{children}</>
}
