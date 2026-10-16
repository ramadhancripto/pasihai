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
// Mode tupu si mock: AuthGate inaonyesha kosa. MODE=mock inakataliwa.
// ══════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js'
import { resolveSupabaseConfig } from './supabaseConfig.js'

// Chanzo kimoja cha ukweli: supabaseConfig.js (inasoma VITE_* env).
// Safe access kwa import.meta.env (SSR-compatible)
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {}
const config = resolveSupabaseConfig(env)
const supabaseUrl = config.url
const supabaseKey = config.key

/**
 * Hali ya mfumo: 'mock' | 'live'
 * - 'live': queries kwa Supabase
 * - 'unconfigured': kosa; mock haikubaliwi
 */
export const SUPABASE_MODE = config.mode

/**
 * Je, Supabase client imesanidiwa (URL na key zipo)?
 */
export const isSupabaseConfigured = config.isConfigured

/**
 * Je, Supabase ipo katika hali ya 'live' bila matatizo ya usanidi?
 */
export const isSupabaseLive = config.isLive

/** Mock ya majaribio tu (si default ya production). */
export const isSupabaseMock = config.isMock === true

/**
 * Orodha ya matatizo ya usanidi (tupu = sawa). AuthGate inaitumia
 * kuonyesha ujumbe wa kosa badala ya kupakia App kimya kimya.
 */
export const supabaseConfigProblems = config.problems

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
