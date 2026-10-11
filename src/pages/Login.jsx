// ══════════════════════════════════════════════════════════════
// PASIHAI — LOGIN PAGE
//
// Ukurasa wa kuingia na kujiandikisha (Login/Signup).
// Ina tab mbili: "Ingia" na "Jiandikishe".
//
// Inatumia: useAuth() hook kutoka AuthContext
// ══════════════════════════════════════════════════════════════

import { useState } from 'react'
import { useAuth } from '../lib/AuthContext.jsx'
import Wordmark from '../components/Wordmark.jsx'

export default function Login() {
  const { signIn, signUp, resetPassword, updatePassword, authEvent } = useAuth()
  // 'login' | 'signup' | 'reset' | 'recovery'
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Auto-detect PASSWORD_RECOVERY event from Supabase
  // When user arrives via password reset link, authEvent is 'PASSWORD_RECOVERY'
  const isRecovery = authEvent === 'PASSWORD_RECOVERY'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (mode === 'recovery' || isRecovery) {
        // Validate passwords match
        if (password !== confirmPassword) {
          setError('Nenosiri hazifanani. Tafadhali jaribu tena.')
          setLoading(false)
          return
        }
        if (password.length < 6) {
          setError('Nenosiri lazima liwe na herufi angalau 6.')
          setLoading(false)
          return
        }
        const result = await updatePassword(password)
        if (!result.success) {
          setError(result.error)
        } else {
          setSuccess('Nenosiri limebadilishwa! Sasa unaweza kuingia.')
          // Clear recovery state after success
          setTimeout(() => {
            setMode('login')
            setPassword('')
            setConfirmPassword('')
          }, 2000)
        }
      } else if (mode === 'login') {
        const result = await signIn(email, password)
        if (!result.success) {
          setError(result.error)
        }
        // On success, AuthContext will update user state and App will redirect
      } else if (mode === 'signup') {
        const result = await signUp(email, password, { displayName })
        if (!result.success) {
          setError(result.error)
        } else if (result.needsEmailConfirmation) {
          setSuccess('Tumekutumia barua pepe ya kuthibitisha. Tafadhali angalia inbox yako.')
        }
      } else if (mode === 'reset') {
        const result = await resetPassword(email)
        if (!result.success) {
          setError(result.error)
        } else {
          setSuccess('Tumekutumia barua pepe ya kurejesha nenosiri. Angalia inbox yako.')
        }
      }
    } catch (err) {
      setError('Hitilafu isiyojulikana. Tafadhali jaribu tena.')
    } finally {
      setLoading(false)
    }
  }

  // Determine effective mode: override to recovery if PASSWORD_RECOVERY event fired
  const effectiveMode = isRecovery ? 'recovery' : mode

  return (
    <div className="psh-login">
      <div className="psh-login__card">
        {/* Logo */}
        <div className="psh-login__brand">
          <Wordmark size={120} />
        </div>

        {/* Tabs — hidden during recovery mode */}
        {effectiveMode !== 'recovery' && (
          <div className="psh-login__tabs">
            <button
              className={`psh-login__tab ${mode === 'login' ? 'is-active' : ''}`}
              onClick={() => { setMode('login'); setError(''); setSuccess('') }}
              disabled={loading}
            >
              Ingia
            </button>
            <button
              className={`psh-login__tab ${mode === 'signup' ? 'is-active' : ''}`}
              onClick={() => { setMode('signup'); setError(''); setSuccess('') }}
              disabled={loading}
            >
              Jiandikishe
            </button>
          </div>
        )}

        {/* Recovery heading */}
        {effectiveMode === 'recovery' && (
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <h2 style={{ fontSize: 18, margin: '0 0 4px' }}>Weka nenosiri jipya</h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--psh-text-muted, #888)' }}>
              Weka nenosiri jipya la akaunti yako.
            </p>
          </div>
        )}

        {/* Form */}
        <form className="psh-login__form" onSubmit={handleSubmit}>
          {error && (
            <div className="psh-login__error" role="alert">
              {error}
            </div>
          )}
          {success && (
            <div className="psh-login__success" role="status">
              {success}
            </div>
          )}

          {/* Email — not shown in recovery mode */}
          {effectiveMode !== 'recovery' && (
            <label className="psh-login__label">
              Barua pepe
              <input
                className="psh-login__input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="wewe@mfano.com"
                required
                autoComplete="email"
                disabled={loading}
              />
            </label>
          )}

          {/* Display Name (signup only) */}
          {effectiveMode === 'signup' && (
            <label className="psh-login__label">
              Jina la kuonyesha
              <input
                className="psh-login__input"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Jina lako"
                disabled={loading}
              />
            </label>
          )}

          {/* Password — shown for login, signup, and recovery */}
          {(effectiveMode === 'login' || effectiveMode === 'signup' || effectiveMode === 'recovery') && (
            <label className="psh-login__label">
              {effectiveMode === 'recovery' ? 'Nenosiri jipya' : 'Nenosiri'}
              <input
                className="psh-login__input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete={effectiveMode === 'login' ? 'current-password' : 'new-password'}
                disabled={loading}
              />
            </label>
          )}

          {/* Confirm Password — recovery only */}
          {effectiveMode === 'recovery' && (
            <label className="psh-login__label">
              Thibitisha nenosiri
              <input
                className="psh-login__input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                disabled={loading}
              />
            </label>
          )}

          {/* Submit Button */}
          <button
            className="psh-login__submit"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Inashughulikia...' : (
              effectiveMode === 'login' ? 'Ingia' :
              effectiveMode === 'signup' ? 'Jiandikishe' :
              effectiveMode === 'recovery' ? 'Weka nenosiri jipya' :
              'Tuma barua pepe ya kurejesha'
            )}
          </button>
        </form>

        {/* Forgot Password Link */}
        {effectiveMode === 'login' && (
          <button
            className="psh-login__link"
            onClick={() => { setMode('reset'); setError(''); setSuccess('') }}
            disabled={loading}
          >
            Umesahau nenosiri?
          </button>
        )}

        {/* Back to Login */}
        {(effectiveMode === 'reset' || effectiveMode === 'recovery') && (
          <button
            className="psh-login__link"
            onClick={() => { setMode('login'); setError(''); setSuccess('') }}
            disabled={loading}
          >
            ← Rudi kuingia
          </button>
        )}
      </div>
    </div>
  )
}
