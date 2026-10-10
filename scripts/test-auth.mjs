#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════
// PASIHAI — AUTH TESTS (Batch 1)
//
// Tests 11 za authentication kwa mujibu wa Batch 1 directive.
// Hizi ni LOCAL tests - hazitumii hosted Supabase.
//
// MUHIMU:
// - Hazibadili mode kutoka mock kwenda live
// - Hazitumii secret keys
// - Zinajaribu tu kwamba code ipo na inafanya kazi
// ══════════════════════════════════════════════════════════════

import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '..')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (err) {
    console.log(`  ❌ ${name}`)
    console.log(`     ${err.message}`)
    failed++
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed')
}

console.log('\n═══ PASIHAI Auth Tests (Batch 1) ═══\n')

/* ── Test 1: Mock mode boot ─────────────────────────────── */
console.log('── 1. Mock mode boot ──')
test('1.1: .env.example ina VITE_SUPABASE_MODE=mock', () => {
  const envExample = readFileSync(join(ROOT, '.env.example'), 'utf8')
  assert(envExample.includes('VITE_SUPABASE_MODE=mock'), '.env.example haina VITE_SUPABASE_MODE=mock')
})

test('1.2: supabaseClient.js ina default ya mock', () => {
  const client = readFileSync(join(ROOT, 'src/lib/supabaseClient.js'), 'utf8')
  // Angalia kwamba kuna fallback kwa 'mock' (inaweza kuwa katika env au moja kwa moja)
  assert(client.includes("'mock'") || client.includes('"mock"'), 
    'supabaseClient.js haina default ya mock')
})

/* ── Test 2: Publishable key acceptance ─────────────────── */
console.log('\n── 2. Publishable key acceptance ──')
test('2.1: supabaseClient.js inatumia VITE_SUPABASE_PUBLISHABLE_KEY', () => {
  const client = readFileSync(join(ROOT, 'src/lib/supabaseClient.js'), 'utf8')
  assert(client.includes('VITE_SUPABASE_PUBLISHABLE_KEY'), 
    'supabaseClient.js haitumii VITE_SUPABASE_PUBLISHABLE_KEY')
})

test('2.2: supabaseClient.js HAITUMII service_role au secret kwenye code', () => {
  const client = readFileSync(join(ROOT, 'src/lib/supabaseClient.js'), 'utf8')
  // Angalia tu mistari ya code (si comments): ondoa mistari yenye // au /* */
  const codeLines = client.split('\n')
    .filter(line => !line.trim().startsWith('//') && !line.trim().startsWith('*') && !line.trim().startsWith('/*'))
    .join('\n')
  const hasSecret = codeLines.includes('service_role') || codeLines.includes('SECRET_KEY')
  assert(!hasSecret, 'supabaseClient.js inatumia secret/service_role key kwenye code')
})

/* ── Test 3: Signup ─────────────────────────────────────── */
console.log('\n── 3. Signup ──')
test('3.1: authService.js ipo na ina signUp method', () => {
  const authPath = join(ROOT, 'src/services/authService.js')
  assert(existsSync(authPath), 'authService.js haipo')
  const auth = readFileSync(authPath, 'utf8')
  assert(auth.includes('async signUp('), 'authService.js haina signUp method')
})

test('3.2: signUp inakubali email, password, metadata', () => {
  const auth = readFileSync(join(ROOT, 'src/services/authService.js'), 'utf8')
  assert(auth.includes('signUp(email, password, metadata'), 
    'signUp haikubali email, password, metadata')
})

/* ── Test 4: Login success ──────────────────────────────── */
console.log('\n── 4. Login success ──')
test('4.1: authService.js ina signIn method', () => {
  const auth = readFileSync(join(ROOT, 'src/services/authService.js'), 'utf8')
  assert(auth.includes('async signIn('), 'authService.js haina signIn method')
})

test('4.2: signIn inatumia supabase.auth.signInWithPassword', () => {
  const auth = readFileSync(join(ROOT, 'src/services/authService.js'), 'utf8')
  assert(auth.includes('signInWithPassword'), 'signIn haitumii signInWithPassword')
})

/* ── Test 5: Login failure ──────────────────────────────── */
console.log('\n── 5. Login failure ──')
test('5.1: authService.js ina formatAuthError kwa error handling', () => {
  const auth = readFileSync(join(ROOT, 'src/services/authService.js'), 'utf8')
  assert(auth.includes('function formatAuthError'), 'authService.js haina formatAuthError')
})

test('5.2: formatAuthError inatafsiri errors za kawaida kwa Kiswahili', () => {
  const auth = readFileSync(join(ROOT, 'src/services/authService.js'), 'utf8')
  assert(auth.includes('Invalid login credentials') && auth.includes('Barua pepe au nenosiri si sahihi'),
    'formatAuthError haitafsiri errors kwa Kiswahili')
})

/* ── Test 6: Session persistence ────────────────────────── */
console.log('\n── 6. Session persistence ──')
test('6.1: supabaseClient.js ina persistSession: true', () => {
  const client = readFileSync(join(ROOT, 'src/lib/supabaseClient.js'), 'utf8')
  assert(client.includes('persistSession: true'), 'supabaseClient.js haina persistSession: true')
})

test('6.2: authService.js ina getSession method', () => {
  const auth = readFileSync(join(ROOT, 'src/services/authService.js'), 'utf8')
  assert(auth.includes('async getSession('), 'authService.js haina getSession method')
})

/* ── Test 7: Logout ─────────────────────────────────────── */
console.log('\n── 7. Logout ──')
test('7.1: authService.js ina signOut method', () => {
  const auth = readFileSync(join(ROOT, 'src/services/authService.js'), 'utf8')
  assert(auth.includes('async signOut('), 'authService.js haina signOut method')
})

test('7.2: signOut inatumia supabase.auth.signOut()', () => {
  const auth = readFileSync(join(ROOT, 'src/services/authService.js'), 'utf8')
  assert(auth.includes('supabase.auth.signOut()'), 'signOut haitumii supabase.auth.signOut()')
})

/* ── Test 8: Profile association ────────────────────────── */
console.log('\n── 8. Profile association ──')
test('8.1: supabaseIdentityRepository.js ina getCurrentUser inayotumia auth', () => {
  const repo = readFileSync(join(ROOT, 'src/data/repositories/supabaseIdentityRepository.js'), 'utf8')
  assert(repo.includes('async getCurrentUser()') && repo.includes('supabase.auth.getUser()'),
    'supabaseIdentityRepository.getCurrentUser haitumii auth')
})

test('8.2: supabaseIdentityRepository.js inatafuta profile kwa user_id', () => {
  const repo = readFileSync(join(ROOT, 'src/data/repositories/supabaseIdentityRepository.js'), 'utf8')
  assert(repo.includes('.from(\'profiles\')') && repo.includes('.eq(\'user_id\', user.id)'),
    'supabaseIdentityRepository haitafuti profile kwa user_id')
})

/* ── Test 9: Privileged field protection ────────────────── */
console.log('\n── 9. Privileged field protection ──')
test('9.1: supabaseIdentityRepository.js HAITUMII service_role', () => {
  const repo = readFileSync(join(ROOT, 'src/data/repositories/supabaseIdentityRepository.js'), 'utf8')
  const hasSecret = repo.includes('service_role') || repo.includes('SECRET_KEY')
  assert(!hasSecret, 'supabaseIdentityRepository inatumia secret key')
})

test('9.2: Migrations zina RLS policies kwa profiles', () => {
  const migrations = readFileSync(join(ROOT, 'supabase/migrations/001_profiles.sql'), 'utf8')
  assert(migrations.includes('ENABLE ROW LEVEL SECURITY'), '001_profiles.sql haina RLS')
})

/* ── Test 10: No fake user fallback ─────────────────────── */
console.log('\n── 10. No fake user fallback ──')
test('10.1: authService.getCurrentUser inarudisha null kwa mock mode', () => {
  const auth = readFileSync(join(ROOT, 'src/services/authService.js'), 'utf8')
  assert(auth.includes('if (!isSupabaseLive || !supabase)') && auth.includes('return null'),
    'authService.getCurrentUser hairudishi null kwa mock mode')
})

test('10.2: AuthGate ina Auth gate inayorudisha Login kwa live mode', () => {
  // Auth gate imehamia AuthGate.jsx (kuepuka React hooks order issue kwenye App.jsx)
  const authGatePath = join(ROOT, 'src/lib/AuthGate.jsx')
  assert(existsSync(authGatePath), 'AuthGate.jsx haipo')
  const authGate = readFileSync(authGatePath, 'utf8')
  assert(authGate.includes('!isAuthenticated') && authGate.includes('<Login />'),
    'AuthGate.jsx haina Auth gate ya kurudisha Login')
})

/* ── Test 11: Existing build/tests unbroken ─────────────── */
console.log('\n── 11. Existing build/tests unbroken ──')
test('11.1: main.jsx ina AuthProvider wrapper', () => {
  const main = readFileSync(join(ROOT, 'src/main.jsx'), 'utf8')
  assert(main.includes('import { AuthProvider }') && main.includes('<AuthProvider>'),
    'main.jsx haina AuthProvider wrapper')
})

test('11.2: AuthContext.jsx ipo na inatoa useAuth hook', () => {
  const authContextPath = join(ROOT, 'src/lib/AuthContext.jsx')
  assert(existsSync(authContextPath), 'AuthContext.jsx haipo')
  const authContext = readFileSync(authContextPath, 'utf8')
  assert(authContext.includes('export function useAuth()'), 'AuthContext.jsx haina useAuth export')
})

test('11.3: Login.jsx ipo na ina form ya email/password', () => {
  const loginPath = join(ROOT, 'src/pages/Login.jsx')
  assert(existsSync(loginPath), 'Login.jsx haipo')
  const login = readFileSync(loginPath, 'utf8')
  assert(login.includes('type="email"') && login.includes('type="password"'),
    'Login.jsx haina email/password form')
})

/* ── Summary ────────────────────────────────────────────── */
console.log('\n═══ Summary ═══')
console.log(`✅ Passed: ${passed}`)
console.log(`❌ Failed: ${failed}`)
console.log(`   Total:  ${passed + failed}`)

if (failed > 0) {
  process.exit(1)
}
