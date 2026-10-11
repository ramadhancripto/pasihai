// ══════════════════════════════════════════════════════════════
// PASIHAI — SUPABASE CONFIG (chanzo kimoja cha ukweli)
//
// Moduli hii inasoma VITE_* env na kuamua hali ya mfumo. Ndiyo sehemu
// PEKEE inayoamua mode; supabaseClient.js na repositories/index.js
// zinaitumia hapa.
//
// Kanuni:
//   - Hakuna fallback kimya. Ikiwa usanidi una tatizo, `problems` si tupu
//     na AuthGate inaonyesha ujumbe wa kosa badala ya kupakia mock data.
//   - Live inahitaji VITE_SUPABASE_MODE=live, VITE_SUPABASE_URL na
//     VITE_SUPABASE_PUBLISHABLE_KEY, zote tatu.
//   - URL/key zikiwekwa lakini mode si 'live', ni kosa (ni hali ya kawaida
//     ya usanidi usio sahihi).
//   - Secret / service_role key HAIRUHUSIWI kwenye browser.
//
// Moduli hii ni safi (pure): haitegemei Vite, kwa hiyo inaweza kujaribiwa
// na Node moja kwa moja.
// ══════════════════════════════════════════════════════════════

export const SUPABASE_MODES = ['mock', 'live']

/** Inatambua secret/service_role key (hairuhusiwi kwenye browser). */
export function isSecretKey(key) {
  if (!key) return false
  if (key.startsWith('sb_secret_')) return true
  // Legacy JWT keys: payload yenye "role":"service_role" (haithibitishwi hapa,
  // tunasoma tu muundo ili kuzuia kosa la usanidi).
  const parts = key.split('.')
  if (parts.length !== 3) return false
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    const payload = JSON.parse(
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf8'),
    )
    return payload?.role === 'service_role'
  } catch {
    return false
  }
}

/** URL lazima iwe https (au http kwa localhost/127.0.0.1 pekee, kwa Supabase ya ndani). */
export function isValidSupabaseUrl(url) {
  if (!url) return false
  try {
    const u = new URL(url)
    if (u.protocol === 'https:') return true
    if (u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')) return true
    return false
  } catch {
    return false
  }
}

/**
 * Inasoma env na kurudisha hali kamili ya usanidi.
 * @param {Record<string, string|undefined>} env - kawaida import.meta.env
 */
export function resolveSupabaseConfig(env = {}) {
  const rawMode = String(env.VITE_SUPABASE_MODE ?? '').trim()
  // Herufi kubwa/ndogo hazijalishi: 'LIVE', ' Live ' na 'live' zote ni 'live'.
  const mode = rawMode === '' ? 'mock' : rawMode.toLowerCase()
  const url = String(env.VITE_SUPABASE_URL ?? '').trim()
  const key = String(env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim()

  const problems = []

  if (!SUPABASE_MODES.includes(mode)) {
    problems.push(`VITE_SUPABASE_MODE lazima iwe "mock" au "live" (sasa: "${rawMode}").`)
  }

  if (isSecretKey(key)) {
    problems.push(
      'VITE_SUPABASE_PUBLISHABLE_KEY ina secret/service_role key. Tumia publishable (anon) key tu. ' +
        'Badilisha key mara moja kwenye Supabase Dashboard.',
    )
  }

  const hasUrlOrKey = Boolean(url || key)
  if (mode !== 'live' && hasUrlOrKey) {
    problems.push(
      'VITE_SUPABASE_URL au VITE_SUPABASE_PUBLISHABLE_KEY zimewekwa, lakini VITE_SUPABASE_MODE si "live". ' +
        'Weka VITE_SUPABASE_MODE=live, au ondoa URL na key kama unataka mock.',
    )
  }

  if (mode === 'live') {
    if (!url) {
      problems.push('VITE_SUPABASE_URL haijawekwa.')
    } else if (!isValidSupabaseUrl(url)) {
      problems.push('VITE_SUPABASE_URL si URL sahihi. Mfano: https://<project-ref>.supabase.co')
    }
    if (!key) {
      problems.push(
        'VITE_SUPABASE_PUBLISHABLE_KEY haijawekwa. (Jina "VITE_SUPABASE_ANON_KEY" halitambuliwi; ' +
          'tumia VITE_SUPABASE_PUBLISHABLE_KEY.)',
      )
    }
  }

  const liveRequested = mode === 'live'
  const isLive = liveRequested && problems.length === 0

  return {
    mode,
    liveRequested,
    url,
    key,
    isConfigured: Boolean(url && key),
    isLive,
    problems,
  }
}

/** Usanidi halisi wa wakati wa run (kutoka Vite env). Node tests hutumia resolveSupabaseConfig moja kwa moja. */
export const supabaseConfig = resolveSupabaseConfig(
  (typeof import.meta !== 'undefined' && import.meta.env) || {},
)
