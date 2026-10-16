#!/usr/bin/env node
// Runtime honesty: empty env is not mock; live send path has no demoDelivery timers.

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const { resolveSupabaseConfig } = await import(
  pathToFileURL(join(ROOT, 'src/lib/supabaseConfig.js')).href
)

let passed = 0
let failed = 0
function test(name, fn) {
  try {
    fn()
    console.log('  PASS: ' + name)
    passed++
  } catch (e) {
    console.log('  FAIL: ' + name + ': ' + e.message)
    failed++
  }
}
function assert(c, m) {
  if (!c) throw new Error(m || 'assert')
}

console.log('\n--- Runtime honesty ---\n')

test('Empty env cannot be live or mock', () => {
  const c = resolveSupabaseConfig({})
  assert(!c.isLive && !c.isMock && c.problems.length > 0)
})

test('Explicit mock is rejected', () => {
  const c = resolveSupabaseConfig({ VITE_SUPABASE_MODE: 'mock' })
  assert(!c.isLive && !c.isMock && c.problems.length > 0)
})

test('chatService.js no longer schedules demoDelivery', () => {
  const src = readFileSync(join(ROOT, 'src/services/chatService.js'), 'utf8')
  assert(!src.includes('demoDelivery'), 'demoDelivery still referenced in chatService')
  assert(!src.includes('afterMs: 1400'), 'fake delivery timer still present')
})

test('live relayMessage requires recipient (source)', () => {
  const src = readFileSync(join(ROOT, 'src/data/repositories/supabaseSystemRepository.js'), 'utf8')
  assert(src.includes("reason: 'no_recipient'"))
  assert(!src.includes('p_recipient_id: null'))
})

test('shareNearby does not mark local_shares completed', () => {
  const src = readFileSync(join(ROOT, 'src/data/repositories/supabaseSystemRepository.js'), 'utf8')
  const fn = src.slice(src.indexOf('async shareNearby'))
  const body = fn.slice(0, fn.indexOf('async getDeliveryOptions'))
  assert(!body.includes("status: 'completed'"), 'shareNearby still writes completed')
})

test('smoke script does not enable mock product runtime', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  assert(!String(pkg.scripts.smoke).includes('VITE_SUPABASE_MODE=mock'))
})

test('live setMessageState does not pretend to persist receipts', () => {
  const src = readFileSync(join(ROOT, 'src/data/repositories/supabaseChatRepository.js'), 'utf8')
  const i = src.indexOf('async setMessageState')
  const body = src.slice(i, i + 450)
  assert(body.includes('NOT_IMPLEMENTED') || body.includes('throw'), body.slice(0, 200))
  assert(!body.includes('...patch'), 'must not echo patch as saved')
})

test('live getNearby does not invent BLE peers', () => {
  const src = readFileSync(join(ROOT, 'src/data/repositories/supabaseSystemRepository.js'), 'utf8')
  assert(!src.includes('ble-available'))
  assert(src.includes('available: false'))
})

test('composition root has no mock repositories', () => {
  const src = readFileSync(join(ROOT, 'src/data/repositories/index.js'), 'utf8')
  assert(!src.includes('mockIdentityRepository'))
  assert(src.includes("REPOSITORY_MODE = checkIsLive() ? 'supabase' : 'unconfigured'"))
})

console.log('\nRESULTS: ' + passed + ' passed, ' + failed + ' failed')
process.exit(failed ? 1 : 0)
