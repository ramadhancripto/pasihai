// ══════════════════════════════════════════════════════════════
// PASIHAI — SUPABASE CONFIG (chanzo kimoja cha ukweli)
//
// Moduli hii inasoma VITE_* env na kuamua hali ya mfumo. Ndiyo sehemu
// PEKEE inayoamua mode; supabaseClient.js na repositories/index.js
// zinaitumia hapa.
//
// Kanuni:
//   - Hakuna fallback kimya kwenda mock. Mode tupu = tatizo, si bidhaa ya demo.
//   - Live inahitaji VITE_SUPABASE_MODE=live, VITE_SUPABASE_URL na
//     VITE_SUPABASE_PUBLISHABLE_KEY, zote tatu.
//   - Mock inaruhusiwa tu ikiwa VITE_SUPABASE_MODE=mock (majaribio/SSR smoke).
//     Haifichwi kama success ya production.
//   - URL/key zikiwekwa lakini mode si 'live', ni kosa.
//   - Secret / service_role key HAIRUHUSIWI kwenye browser.
//
// Moduli hii ni safi (pure): haitegemei Vite, kwa hiyo inaweza kujaribiwa
// na Node moja kwa moja.
// ══════════════════════════════════════════════════════════════

export const SUPABASE_MODES = ['live']

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
  const mode = rawMode === '' ? '' : rawMode.toLowerCase()
  const url = String(env.VITE_SUPABASE_URL ?? '').trim()
  const key = String(env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim()

  const problems = []

  if (mode === '') {
    problems.push(
      'VITE_SUPABASE_MODE haijawekwa. Weka VITE_SUPABASE_MODE=live pamoja na URL na publishable key. Mock si sehemu ya bidhaa.',
    )
  } else if (mode === 'mock') {
    problems.push(
      'VITE_SUPABASE_MODE=mock haikubaliwi. Pasihai haina mock runtime; weka live na credentials.',
    )
  } else if (!SUPABASE_MODES.includes(mode)) {
    problems.push(`VITE_SUPABASE_MODE lazima iwe "live" (sasa: "${rawMode}").`)
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
        'Weka VITE_SUPABASE_MODE=live.',
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
  const isMock = mode === 'mock' && problems.length === 0

  return {
    mode: mode || 'unconfigured',
    liveRequested,
    url,
    key,
    isConfigured: Boolean(url && key),
    isLive,
    isMock,
    problems,
  }
}

/** Usanidi halisi wa wakati wa run (kutoka Vite env). Node tests hutumia resolveSupabaseConfig moja kwa moja. */
export const supabaseConfig = resolveSupabaseConfig(
  (typeof import.meta !== 'undefined' && import.meta.env) || {},
)
