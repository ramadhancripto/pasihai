#!/usr/bin/env node
// Live staging integration. Does not invent credentials.
// Exit 2 = staging not configured (cannot claim pass or fail of live flows).
// Exit 1 = staging configured but a check failed.
// Exit 0 = configured checks passed.

import { createClient } from '@supabase/supabase-js'

const url = String(process.env.PASIHAI_STAGING_URL || process.env.VITE_SUPABASE_URL || '').trim()
const key = String(process.env.PASIHAI_STAGING_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim()
const emailA = String(process.env.PASIHAI_TEST_EMAIL_A || '').trim()
const passA = String(process.env.PASIHAI_TEST_PASSWORD_A || '').trim()
const emailB = String(process.env.PASIHAI_TEST_EMAIL_B || '').trim()
const passB = String(process.env.PASIHAI_TEST_PASSWORD_B || '').trim()

console.log('\n═══ PASIHAI live staging ═══\n')

if (!url || !key || !emailA || !passA) {
  console.log('SKIPPED: hakuna staging credentials kwenye mazingira hii.')
  console.log('Hii SI pass. Live feed/chat/media/Realtime HAVIJATHIBITISHWA.')
  console.log('')
  console.log('Mmiliki aweke (staging, si production) kwenye shell, BILA kuzibandika kwenye chat:')
  console.log('  PASIHAI_STAGING_URL')
  console.log('  PASIHAI_STAGING_ANON_KEY     (anon/publishable tu)')
  console.log('  PASIHAI_TEST_EMAIL_A / PASIHAI_TEST_PASSWORD_A')
  console.log('  PASIHAI_TEST_EMAIL_B / PASIHAI_TEST_PASSWORD_B  (Realtime + DM)')
  console.log('  VITE_SUPABASE_MODE=live')
  console.log('')
  console.log('Kisha: node scripts/test-live-staging.mjs')
  process.exit(2)
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
let failed = 0
let passed = 0

async function check(name, fn) {
  try {
    await fn()
    passed++
    console.log('  PASS ' + name)
  } catch (e) {
    failed++
    console.log('  FAIL ' + name + ': ' + (e?.message || e))
  }
}

const { data: sessionA, error: loginErr } = await supabase.auth.signInWithPassword({ email: emailA, password: passA })
await check('A inaweza kuingia', () => {
  if (loginErr) throw loginErr
  if (!sessionA?.user) throw new Error('hakuna user')
})

await check('profiles row kwa A', async () => {
  const { data, error } = await supabase.from('profiles').select('user_id').eq('user_id', sessionA.user.id).maybeSingle()
  if (error) throw error
  if (!data) throw new Error('profile haipo — ensure_profile/trigger')
})

await check('feed posts select (RLS)', async () => {
  const { error } = await supabase.from('posts').select('id, kind, created_at').limit(5)
  if (error) throw error
})

await check('chat_messages select (RLS)', async () => {
  const { error } = await supabase.from('chat_messages').select('id').limit(5)
  if (error) throw error
})

if (emailB && passB) {
  const b = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: sessionB, error: bErr } = await b.auth.signInWithPassword({ email: emailB, password: passB })
  await check('B inaweza kuingia', () => {
    if (bErr) throw bErr
    if (!sessionB?.user) throw new Error('hakuna B')
  })
} else {
  console.log('  SKIP two-user Realtime/DM — PASIHAI_TEST_EMAIL_B haijawekwa')
}

console.log('\nRESULTS: ' + passed + ' passed, ' + failed + ' failed')
await supabase.auth.signOut()
process.exit(failed ? 1 : 0)
