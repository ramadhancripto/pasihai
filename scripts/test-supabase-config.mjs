#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════
// PASIHAI — SUPABASE CONFIG TESTS
//
// Inajaribu resolveSupabaseConfig() (pure, bila Vite, bila mtandao).
// Inathibitisha kwamba:
//   - live bila URL/key inatoa kosa, si mock kimya
//   - URL/key bila mode=live inatoa kosa (kesi ya mtumiaji)
//   - secret/service_role key inakataliwa
//   - jina batili la key (VITE_SUPABASE_ANON_KEY) halikubaliwi kimya
// Matokeo haya ni ya usanidi tu. Hayathibitishi muunganisho wa Supabase halisi.
// ══════════════════════════════════════════════════════════════

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const { resolveSupabaseConfig, isSecretKey, isValidSupabaseUrl } = await import(
  join(ROOT, 'src/lib/supabaseConfig.js')
)

let passed = 0
let failed = 0
function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`)
    failed++
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url')
const jwt = (role) => `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ role, iss: 'supabase' })}.sig`
const GOOD_URL = 'https://abcdwxyz.supabase.co'
const GOOD_KEY = 'sb_publishable_TESTKEY_not_real'

console.log('\n── Supabase config ──')

test('empty env → mock, no problems, not live', () => {
  const c = resolveSupabaseConfig({})
  assert(c.mode === 'mock', `mode=${c.mode}`)
  assert(c.problems.length === 0, JSON.stringify(c.problems))
  assert(c.isLive === false && c.liveRequested === false, 'should not be live')
})

test('mode=mock with no URL/key → mock, no problems', () => {
  const c = resolveSupabaseConfig({ VITE_SUPABASE_MODE: 'mock' })
  assert(c.problems.length === 0 && !c.isLive, JSON.stringify(c.problems))
})

test('URL+key set but mode unset → explicit problem (user case, no silent mock)', () => {
  const c = resolveSupabaseConfig({ VITE_SUPABASE_URL: GOOD_URL, VITE_SUPABASE_PUBLISHABLE_KEY: GOOD_KEY })
  assert(c.problems.length === 1, `problems=${c.problems.length}`)
  assert(c.problems[0].includes('VITE_SUPABASE_MODE'), c.problems[0])
  assert(c.isLive === false, 'must not be live')
})

test('URL+key set, mode=mock → explicit problem', () => {
  const c = resolveSupabaseConfig({ VITE_SUPABASE_MODE: 'mock', VITE_SUPABASE_URL: GOOD_URL, VITE_SUPABASE_PUBLISHABLE_KEY: GOOD_KEY })
  assert(c.problems.length === 1 && c.problems[0].includes('si "live"'), JSON.stringify(c.problems))
})

test('live with no URL and no key → two problems, not live', () => {
  const c = resolveSupabaseConfig({ VITE_SUPABASE_MODE: 'live' })
  assert(c.liveRequested === true, 'liveRequested')
  assert(c.isLive === false, 'must not be live')
  assert(c.problems.some((p) => p.includes('VITE_SUPABASE_URL')), 'missing URL problem')
  assert(c.problems.some((p) => p.includes('VITE_SUPABASE_PUBLISHABLE_KEY')), 'missing key problem')
})

test('live with ANON_KEY name only → key reported missing (wrong name not accepted)', () => {
  const c = resolveSupabaseConfig({ VITE_SUPABASE_MODE: 'live', VITE_SUPABASE_URL: GOOD_URL, VITE_SUPABASE_ANON_KEY: GOOD_KEY })
  assert(c.isLive === false, 'must not be live')
  assert(c.problems.some((p) => p.includes('VITE_SUPABASE_PUBLISHABLE_KEY haijawekwa')), JSON.stringify(c.problems))
})

test('live with valid URL and key → live, no problems', () => {
  const c = resolveSupabaseConfig({ VITE_SUPABASE_MODE: 'live', VITE_SUPABASE_URL: GOOD_URL, VITE_SUPABASE_PUBLISHABLE_KEY: GOOD_KEY })
  assert(c.problems.length === 0, JSON.stringify(c.problems))
  assert(c.isLive === true && c.isConfigured === true, 'should be live')
})

test('whitespace around values is trimmed', () => {
  const c = resolveSupabaseConfig({ VITE_SUPABASE_MODE: '  live ', VITE_SUPABASE_URL: `  ${GOOD_URL}\n`, VITE_SUPABASE_PUBLISHABLE_KEY: ` ${GOOD_KEY} ` })
  assert(c.isLive === true, JSON.stringify(c.problems))
  assert(c.url === GOOD_URL && c.key === GOOD_KEY, 'trimmed values')
})

// Imebadilishwa kwa makusudi: herufi kubwa/ndogo sasa hazijalishi (ombi la mtumiaji: LIVE
// lazima ifanye kazi). Kosa la zamani lilikuwa: 'LIVE' ilikataliwa na app ikaanguka kwenye mock.
test('mode with wrong case ("Live") is normalised to live (no silent mock)', () => {
  const c = resolveSupabaseConfig({ VITE_SUPABASE_MODE: 'Live', VITE_SUPABASE_URL: GOOD_URL, VITE_SUPABASE_PUBLISHABLE_KEY: GOOD_KEY })
  assert(c.problems.length === 0, JSON.stringify(c.problems))
  assert(c.isLive === true, 'must be live')
})

test('invalid URL (no scheme) → problem', () => {
  const c = resolveSupabaseConfig({ VITE_SUPABASE_MODE: 'live', VITE_SUPABASE_URL: 'abcdwxyz.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: GOOD_KEY })
  assert(c.problems.some((p) => p.includes('si URL sahihi')), JSON.stringify(c.problems))
})

test('http non-local URL rejected; http localhost accepted', () => {
  assert(!isValidSupabaseUrl('http://example.com'), 'http example.com must be rejected')
  assert(isValidSupabaseUrl('http://127.0.0.1:54321'), 'local supabase must be accepted')
  assert(isValidSupabaseUrl('http://localhost:54321'), 'localhost must be accepted')
  assert(isValidSupabaseUrl(GOOD_URL), 'https must be accepted')
  assert(!isValidSupabaseUrl('ftp://x.supabase.co'), 'ftp rejected')
})

test('sb_secret_ key is refused', () => {
  const c = resolveSupabaseConfig({ VITE_SUPABASE_MODE: 'live', VITE_SUPABASE_URL: GOOD_URL, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_TESTONLY' })
  assert(c.isLive === false, 'must not be live')
  assert(c.problems.some((p) => p.includes('secret/service_role')), JSON.stringify(c.problems))
})

test('legacy JWT with role=service_role is refused; role=anon is accepted', () => {
  assert(isSecretKey(jwt('service_role')) === true, 'service_role JWT must be detected')
  assert(isSecretKey(jwt('anon')) === false, 'anon JWT must be allowed')
  assert(isSecretKey('not-a-jwt') === false, 'plain string is not a secret')
  assert(isSecretKey('') === false, 'empty is not secret')
})

test('configured service_role JWT blocks even in mock mode', () => {
  const c = resolveSupabaseConfig({ VITE_SUPABASE_PUBLISHABLE_KEY: jwt('service_role') })
  assert(c.problems.length > 0 && c.isLive === false, 'secret key must produce a problem')
})

test('mode is case-insensitive: LIVE, Live and " live " resolve to live (no silent mock)', () => {
  const key = jwt('anon')
  for (const mode of ['LIVE', 'Live', ' live ']) {
    const c = resolveSupabaseConfig({ VITE_SUPABASE_MODE: mode, VITE_SUPABASE_URL: 'https://lbcpacijbiukqcpkfktp.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: key })
    assert(c.isLive === true, `mode ${JSON.stringify(mode)} must be live, problems=${JSON.stringify(c.problems)}`)
    assert(c.problems.length === 0, `mode ${JSON.stringify(mode)} must not produce problems`)
  }
})

test('unknown mode still produces a visible problem (not silent mock)', () => {
  const c = resolveSupabaseConfig({ VITE_SUPABASE_MODE: 'prod', VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: jwt('anon') })
  assert(c.isLive === false && c.problems.length > 0, 'unknown mode must be reported')
})

console.log(`\nRESULTS: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
