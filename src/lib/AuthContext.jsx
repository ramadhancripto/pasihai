// ══════════════════════════════════════════════════════════════
// PASIHAI — AUTH CONTEXT
//
// React Context kwa authentication state.
// Inatoa: user, session, loading, login, signup, logout.
//
// Matumizi:
//   import { useAuth } from './lib/AuthContext.jsx'
//   const { user, loading, signIn } = useAuth()
// ══════════════════════════════════════════════════════════════

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authService } from '../services/authService.js'
import { isSupabaseLive } from './supabaseClient.js'

/* ── Create Context ───────────────────────────────────────── */
const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  isAuthenticated: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
})

/* ── Auth Provider ────────────────────────────────────────── */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  // Initialize: check for existing session
  useEffect(() => {
    let mounted = true

    async function initAuth() {
      try {
        // Get current session
        const currentSession = await authService.getSession()
        if (!mounted) return

        if (currentSession) {
          setSession(currentSession)
          setUser(currentSession.user)
        }
      } catch (err) {
        console.error('[AuthContext] Init error:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    initAuth()

    // Listen for auth state changes
    const unsubscribe = authService.onAuthStateChange((event, newSession) => {
      if (!mounted) return

      console.log('[AuthContext] Auth event:', event)
      setSession(newSession)
      setUser(newSession?.user || null)
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  // Sign in
  const signIn = useCallback(async (email, password) => {
    const result = await authService.signIn(email, password)
    if (result.error) {
      return { success: false, error: result.error }
    }
    return { success: true, user: result.user }
  }, [])

  // Sign up
  const signUp = useCallback(async (email, password, metadata) => {
    const result = await authService.signUp(email, password, metadata)
    if (result.error) {
      return { success: false, error: result.error }
    }
    return { 
      success: true, 
      user: result.user,
      needsEmailConfirmation: result.needsEmailConfirmation 
    }
  }, [])

  // Sign out
  const signOut = useCallback(async () => {
    const result = await authService.signOut()
    if (result.error) {
      return { success: false, error: result.error }
    }
    // Clear local state
    setUser(null)
    setSession(null)
    return { success: true }
  }, [])

  // Reset password
  const resetPassword = useCallback(async (email) => {
    const result = await authService.resetPassword(email)
    if (result.error) {
      return { success: false, error: result.error }
    }
    return { success: true }
  }, [])

  const value = {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    resetPassword,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/* ── useAuth Hook ─────────────────────────────────────────── */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
