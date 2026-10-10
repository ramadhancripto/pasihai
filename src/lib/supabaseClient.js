// ══════════════════════════════════════════════════════════════
// PASIHAI — SUPABASE CLIENT
//
// Client moja ya Supabase inayotumika kwenye browser.
// Inatumia VITE_* env vars (Vite inazi-expose kwa client-side code).
//
// MUHIMU: Hii inatumia PUBLISHABLE (anon) key PEKEE.
//         USITUMIE service_role au secret key kwenye browser.
//         RLS (Row Level Security) ndio ulinzi wa kweli — hata kama
//         mtu anapata anon key, hawezi kufikia data asiyostahili.
//
// Hali ya sasa: SUPABASE_MODE = 'mock' (default)
//   - Repositories bado zinarudisha mock data.
//   - Client hii ipo tayari lakini haitumiki hadi mode ibadilishwe.
//   - Kubadilisha: weka VITE_SUPABASE_MODE='live' kwenye .env.local
//     (baada ya schema na RLS kuwepo).
// ══════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js'

// Safe access kwa import.meta.env (SSR-compatible)
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {}
const supabaseUrl = env.VITE_SUPABASE_URL
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY

/**
 * Hali ya mfumo: 'mock' | 'live'
 * - 'mock': repositories zinarudisha mock data (default, salama)
 * - 'live': repositories zinatuma queries kwa Supabase (inahitaji schema + RLS)
 */
export const SUPABASE_MODE = env.VITE_SUPABASE_MODE || 'mock'

/**
 * Je, Supabase client imesanidiwa na tayari kutumika?
 * Inarudisha true tu ikiwa URL na key zipo na mode ni 'live'.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

/**
 * Je, Supabase ipo katika hali ya 'live' (si mock)?
 */
export const isSupabaseLive = isSupabaseConfigured && SUPABASE_MODE === 'live'

/**
 * Supabase client instance (lazy initialization).
 * - Haikumiliki hadi wakati wa kwanza kutumika (kuepuka SSR issues).
 * - Ikiwa URL/key hazipo, inarudisha null (hakuna error).
 * - Hii ni salama kwa mock mode — hakuna mtandao unaoguswa.
 */
let _supabaseClient = null
let _clientInitialized = false

export function getSupabaseClient() {
  if (_clientInitialized) return _supabaseClient
  
  _clientInitialized = true
  
  if (!isSupabaseConfigured) {
    _supabaseClient = null
    return null
  }
  
  try {
    _supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      global: {
        headers: {
          'x-application': 'pasihai',
        },
      },
    })
  } catch (err) {
    console.error('[SupabaseClient] Imeshindwa kuunda client:', err)
    _supabaseClient = null
  }
  
  return _supabaseClient
}

// Backward compatibility: export supabase kama getter
export const supabase = new Proxy({}, {
  get(target, prop) {
    const client = getSupabaseClient()
    if (!client) return undefined
    return client[prop]
  }
})

/**
 * Helper ya kupata current user (au null).
 * Salama kuita hata kwenye mock mode (inarudisha null).
 * Katika live mode, ikiwa client haipo, itatoa error.
 */
export async function getCurrentUser() {
  const client = getSupabaseClient()
  if (!client) {
    if (isSupabaseLive) {
      console.warn('[SupabaseClient] Live mode imewashwa lakini client haipo — angalia credentials')
    }
    return null
  }
  const { data: { user }, error } = await client.auth.getUser()
  if (error) {
    if (isSupabaseLive) {
      console.error('[SupabaseClient] getCurrentUser imeshindwa:', error.message)
    }
    return null
  }
  return user
}

/**
 * Helper ya kupata current session (au null).
 * Salama kuita hata kwenye mock mode.
 */
export async function getCurrentSession() {
  const client = getSupabaseClient()
  if (!client) {
    if (isSupabaseLive) {
      console.warn('[SupabaseClient] Live mode imewashwa lakini client haipo — angalia credentials')
    }
    return null
  }
  const { data: { session } } = await client.auth.getSession()
  return session
}
