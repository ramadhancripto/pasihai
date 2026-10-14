#!/usr/bin/env node

// PASIHAI - SUPABASE CONFIG TESTS
// These tests check configuration only.
// They do not connect to Supabase or verify a real database connection.

import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const configModuleUrl = pathToFileURL(
  join(ROOT, 'src', 'lib', 'supabaseConfig.js')
).href

const {
  resolveSupabaseConfig,
  isSecretKey,
  isValidSupabaseUrl
} = await import(configModuleUrl)

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log('  PASS: ' + name)
    passed++
  } catch (err) {
    console.log('  FAIL: ' + name + ': ' + err.message)
    failed++
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url')
}

function jwt(role) {
  return b64url({ alg: 'HS256', typ: 'JWT' }) + '.' +
    b64url({ role: role, iss: 'supabase' }) + '.sig'
}

const GOOD_URL = 'https://abcdwxyz.supabase.co'
const GOOD_KEY = 'sb_publishable_TESTKEY_not_real'

console.log('')
console.log('--- Supabase config tests ---')

test('Empty environment uses mock mode without problems', function () {
  const c = resolveSupabaseConfig({})

  assert(c.mode === 'mock', 'mode=' + c.mode)
  assert(c.problems.length === 0, JSON.stringify(c.problems))
  assert(
    c.isLive === false && c.liveRequested === false,
    'Should not be live'
  )
})

test('Mock mode without URL or key has no problems', function () {
  const c = resolveSupabaseConfig({
    VITE_SUPABASE_MODE: 'mock'
  })

  assert(
    c.problems.length === 0 && !c.isLive,
    JSON.stringify(c.problems)
  )
})

test('URL and key without mode produce an explicit problem', function () {
  const c = resolveSupabaseConfig({
    VITE_SUPABASE_URL: GOOD_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: GOOD_KEY
  })

  assert(c.problems.length === 1, 'problems=' + c.problems.length)
  assert(
    c.problems[0].includes('VITE_SUPABASE_MODE'),
    c.problems[0]
  )
  assert(c.isLive === false, 'Must not be live')
})

test('Mock mode with URL and key produces an explicit problem', function () {
  const c = resolveSupabaseConfig({
    VITE_SUPABASE_MODE: 'mock',
    VITE_SUPABASE_URL: GOOD_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: GOOD_KEY
  })

  assert(
    c.problems.length === 1 &&
      c.problems[0].includes('si "live"'),
    JSON.stringify(c.problems)
  )
})

test('Live mode without URL and key reports both problems', function () {
  const c = resolveSupabaseConfig({
    VITE_SUPABASE_MODE: 'live'
  })

  assert(c.liveRequested === true, 'liveRequested should be true')
  assert(c.isLive === false, 'Must not be live')

  assert(
    c.problems.some(function (p) {
      return p.includes('VITE_SUPABASE_URL')
    }),
    'Missing URL problem'
  )

  assert(
    c.problems.some(function (p) {
      return p.includes('VITE_SUPABASE_PUBLISHABLE_KEY')
    }),
    'Missing publishable key problem'
  )
})

test('ANON_KEY alone is not accepted as the configured key name', function () {
  const c = resolveSupabaseConfig({
    VITE_SUPABASE_MODE: 'live',
    VITE_SUPABASE_URL: GOOD_URL,
    VITE_SUPABASE_ANON_KEY: GOOD_KEY
  })

  assert(c.isLive === false, 'Must not be live')

  assert(
    c.problems.some(function (p) {
      return p.includes('VITE_SUPABASE_PUBLISHABLE_KEY haijawekwa')
    }),
    JSON.stringify(c.problems)
  )
})

test('Valid URL and publishable key allow live mode', function () {
  const c = resolveSupabaseConfig({
    VITE_SUPABASE_MODE: 'live',
    VITE_SUPABASE_URL: GOOD_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: GOOD_KEY
  })

  assert(c.problems.length === 0, JSON.stringify(c.problems))
  assert(
    c.isLive === true && c.isConfigured === true,
    'Should be live and configured'
  )
})

test('Whitespace around configuration values is trimmed', function () {
  const c = resolveSupabaseConfig({
    VITE_SUPABASE_MODE: '  live ',
    VITE_SUPABASE_URL: '  ' + GOOD_URL + '\n',
    VITE_SUPABASE_PUBLISHABLE_KEY: ' ' + GOOD_KEY + ' '
  })

  assert(c.isLive === true, JSON.stringify(c.problems))
  assert(
    c.url === GOOD_URL && c.key === GOOD_KEY,
    'Values should be trimmed'
  )
})

test('Mode Live with mixed case is normalised', function () {
  const c = resolveSupabaseConfig({
    VITE_SUPABASE_MODE: 'Live',
    VITE_SUPABASE_URL: GOOD_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: GOOD_KEY
  })

  assert(c.problems.length === 0, JSON.stringify(c.problems))
  assert(c.isLive === true, 'Must be live')
})

test('URL without a scheme is rejected', function () {
  const c = resolveSupabaseConfig({
    VITE_SUPABASE_MODE: 'live',
    VITE_SUPABASE_URL: 'abcdwxyz.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: GOOD_KEY
  })

  assert(
    c.problems.some(function (p) {
      return p.includes('si URL sahihi')
    }),
    JSON.stringify(c.problems)
  )
})

test('HTTP external URLs are rejected but local HTTP URLs are accepted', function () {
  assert(
    !isValidSupabaseUrl('http://example.com'),
    'External HTTP URL must be rejected'
  )

  assert(
    isValidSupabaseUrl('http://127.0.0.1:54321'),
    'Local IP must be accepted'
  )

  assert(
    isValidSupabaseUrl('http://localhost:54321'),
    'Localhost must be accepted'
  )

  assert(
    isValidSupabaseUrl(GOOD_URL),
    'HTTPS URL must be accepted'
  )

  assert(
    !isValidSupabaseUrl('ftp://x.supabase.co'),
    'FTP URL must be rejected'
  )
})

test('sb_secret_ keys are refused', function () {
  const c = resolveSupabaseConfig({
    VITE_SUPABASE_MODE: 'live',
    VITE_SUPABASE_URL: GOOD_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_TESTONLY'
  })

  assert(c.isLive === false, 'Must not be live')

  assert(
    c.problems.some(function (p) {
      return p.includes('secret/service_role')
    }),
    JSON.stringify(c.problems)
  )
})

test('Legacy service_role JWT is refused and anon JWT is allowed', function () {
  assert(
    isSecretKey(jwt('service_role')) === true,
    'service_role JWT must be detected'
  )

  assert(
    isSecretKey(jwt('anon')) === false,
    'anon JWT must be allowed'
  )

  assert(
    isSecretKey('not-a-jwt') === false,
    'Plain string is not a secret'
  )

  assert(
    isSecretKey('') === false,
    'Empty string is not a secret'
  )
})

test('Configured service_role JWT is blocked even in mock mode', function () {
  const c = resolveSupabaseConfig({
    VITE_SUPABASE_PUBLISHABLE_KEY: jwt('service_role')
  })

  assert(
    c.problems.length > 0 && c.isLive === false,
    'Secret key must produce a problem'
  )
})

test('Mode is case-insensitive for LIVE, Live and surrounding whitespace', function () {
  const key = jwt('anon')
  const modes = ['LIVE', 'Live', ' live ']

  for (const mode of modes) {
    const c = resolveSupabaseConfig({
      VITE_SUPABASE_MODE: mode,
      VITE_SUPABASE_URL: 'https://lbcpacijbiukqcpkfktp.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: key
    })

    assert(
      c.isLive === true,
      'Mode ' + JSON.stringify(mode) +
      ' must be live; problems=' + JSON.stringify(c.problems)
    )

    assert(
      c.problems.length === 0,
      'Mode ' + JSON.stringify(mode) +
      ' must not produce problems'
    )
  }
})

test('Unknown mode produces a visible problem', function () {
  const c = resolveSupabaseConfig({
    VITE_SUPABASE_MODE: 'prod',
    VITE_SUPABASE_URL: 'https://x.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: jwt('anon')
  })

  assert(
    c.isLive === false && c.problems.length > 0,
    'Unknown mode must be reported'
  )
})

console.log('')
console.log('RESULTS: ' + passed + ' passed, ' + failed + ' failed')

process.exitCode = failed > 0 ? 1 : 0
