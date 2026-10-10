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
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (mode === 'login') {
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

  return (
    <div className="psh-login">
      <div className="psh-login__card">
        {/* Logo */}
        <div className="psh-login__brand">
          <Wordmark size={120} />
        </div>

        {/* Tabs */}
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

          {/* Email */}
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

          {/* Display Name (signup only) */}
          {mode === 'signup' && (
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

          {/* Password */}
          {mode !== 'reset' && (
            <label className="psh-login__label">
              Nenosiri
              <input
                className="psh-login__input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required={mode === 'login' || mode === 'signup'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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
              mode === 'login' ? 'Ingia' :
              mode === 'signup' ? 'Jiandikishe' :
              'Tuma barua pepe ya kurejesha'
            )}
          </button>
        </form>

        {/* Forgot Password Link */}
        {mode === 'login' && (
          <button
            className="psh-login__link"
            onClick={() => { setMode('reset'); setError(''); setSuccess('') }}
            disabled={loading}
          >
            Umesahau nenosiri?
          </button>
        )}

        {/* Back to Login */}
        {mode === 'reset' && (
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
