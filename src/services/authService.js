// ══════════════════════════════════════════════════════════════
// PASIHAI — AUTH SERVICE
//
// Huduma za authentication kwa kutumia Supabase Auth.
// Inashughulikia: signup, login, logout, session management.
//
// MUHIMU:
// - Inatumia anon key PEKEE (RLS ndio ulinzi)
// - Hairuhusu fake login au mock user
// - Inarudisha errors halisi kutoka Supabase
// ══════════════════════════════════════════════════════════════

import { supabase, isSupabaseLive } from '../lib/supabaseClient.js'

/* ── Error handling helper ────────────────────────────────── */
function formatAuthError(error) {
  if (!error) return 'Hitilafu isiyojulikana'
  
  // Supabase error messages (English → Swahili mapping)
  const errorMap = {
    'Invalid login credentials': 'Barua pepe au nenosiri si sahihi',
    'Email not confirmed': 'Tafadhali thibitisha barua pepe yako kwanza',
    'User already registered': 'Barua pepe hii imesajiliwa tayari',
    'Password should be at least 6 characters': 'Nenosiri lazima liwe na herufi 6 au zaidi',
    'Invalid email format': 'Muundo wa barua pepe si sahihi',
    'Too many requests': 'Majaribio mengi sana. Tafadhali jaribu tena baadaye',
  }
  
  return errorMap[error.message] || error.message || 'Hitilafu isiyojulikana'
}

/* ── Auth Service ─────────────────────────────────────────── */
export const authService = {
  /**
   * Sajili mtumiaji mpya kwa email na password.
   * @param {string} email - Barua pepe ya mtumiaji
   * @param {string} password - Nenosiri (angalau herufi 6)
   * @param {object} metadata - Taarifa za ziada (display_name, username)
   * @returns {Promise<{user: object|null, error: string|null}>}
   */
  async signUp(email, password, metadata = {}) {
    if (!isSupabaseLive || !supabase) {
      return { 
        user: null, 
        error: 'Supabase haijasanidiwa. Tafadhali weka credentials kwenye .env.local' 
      }
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            display_name: metadata.displayName || email.split('@')[0],
            username: metadata.username || email.split('@')[0],
            ...metadata,
          },
        },
      })

      if (error) {
        return { user: null, error: formatAuthError(error) }
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        return {
          user: data.user,
          error: null,
          needsEmailConfirmation: true,
        }
      }

      return { user: data.user, error: null, needsEmailConfirmation: false }
    } catch (err) {
      return { user: null, error: formatAuthError(err) }
    }
  },

  /**
   * Ingia kwa email na password.
   * @param {string} email - Barua pepe
   * @param {string} password - Nenosiri
   * @returns {Promise<{user: object|null, error: string|null}>}
   */
  async signIn(email, password) {
    if (!isSupabaseLive || !supabase) {
      return { 
        user: null, 
        error: 'Supabase haijasanidiwa. Tafadhali weka credentials kwenye .env.local' 
      }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (error) {
        return { user: null, error: formatAuthError(error) }
      }

      return { user: data.user, error: null }
    } catch (err) {
      return { user: null, error: formatAuthError(err) }
    }
  },

  /**
   * Toka (logout) na kufuta session.
   * @returns {Promise<{error: string|null}>}
   */
  async signOut() {
    if (!isSupabaseLive || !supabase) {
      return { error: null } // Mock mode - hakuna session ya kufuta
    }

    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        return { error: formatAuthError(error) }
      }
      return { error: null }
    } catch (err) {
      return { error: formatAuthError(err) }
    }
  },

  /**
   * Pata mtumiaji wa sasa (au null ikiwa hakuna session).
   * @returns {Promise<object|null>}
   */
  async getCurrentUser() {
    if (!isSupabaseLive || !supabase) {
      return null // Mock mode
    }

    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) return null
      return user
    } catch (err) {
      return null
    }
  },

  /**
   * Pata session ya sasa (au null).
   * @returns {Promise<object|null>}
   */
  async getSession() {
    if (!isSupabaseLive || !supabase) {
      return null // Mock mode
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) return null
      return session
    } catch (err) {
      return null
    }
  },

  /**
   * Sikiliza mabadiliko ya Auth state.
   * @param {function} callback - (event, session) => void
   * @returns {function} unsubscribe function
   */
  onAuthStateChange(callback) {
    if (!isSupabaseLive || !supabase) {
      return () => {} // Mock mode - hakuna mabadiliko
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        callback(event, session)
      }
    )

    return () => subscription.unsubscribe()
  },

  /**
   * Tuma email ya kurejesha password.
   * @param {string} email - Barua pepe
   * @returns {Promise<{error: string|null}>}
   */
  async resetPassword(email) {
    if (!isSupabaseLive || !supabase) {
      return { 
        error: 'Supabase haijasanidiwa. Tafadhali weka credentials kwenye .env.local' 
      }
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase()
      )
      if (error) {
        return { error: formatAuthError(error) }
      }
      return { error: null }
    } catch (err) {
      return { error: formatAuthError(err) }
    }
  },
}
