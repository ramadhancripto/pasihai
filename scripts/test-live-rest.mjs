// ══════════════════════════════════════════════════════════════
// PASIHAI — LIVE REST TEST RUNNER (local Postgres 17 + PostgREST 12 + shim)
//
// Inahitaji (ndani ya sandbox ya majaribio, si repo):
//   PASIHAI_TEST_JWT_SECRET_FILE  (default: ~/pasihai-verify/.jwtsecret)
//   PASIHAI_TEST_PG_PASSWORD_FILE (default: ~/pasihai-verify/.localpg)
//   PostgREST inayosikiliza 127.0.0.1:3100 na DB 'pasihai_rest' (migrations 001–022 zimetumika)
//
// HAIGUSI remote Supabase. Inafanya TRUNCATE kwenye DB ya ndani ya majaribio tu.
// Secret na password hazichapishwi.
// Run: node scripts/test-live-rest.mjs
// ══════════════════════════════════════════════════════════════

import { createHmac, randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync, spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import pg from 'pg'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const secretFile = process.env.PASIHAI_TEST_JWT_SECRET_FILE || join(homedir(), 'pasihai-verify', '.jwtsecret')
const pgFile = process.env.PASIHAI_TEST_PG_PASSWORD_FILE || join(homedir(), 'pasihai-verify', '.localpg')
const SECRET = process.env.PASIHAI_TEST_JWT_SECRET || (existsSync(secretFile) ? readFileSync(secretFile, 'utf8').trim() : '')
const PG_PASSWORD = process.env.PASIHAI_TEST_PG_PASSWORD || (existsSync(pgFile) ? readFileSync(pgFile, 'utf8').trim() : '')
const REST = 'http://127.0.0.1:3100'

if (!SECRET || !PG_PASSWORD) {
  console.log('SKIP: secret ya majaribio au password ya Postgres ya ndani haipo. Hakuna matokeo ya live REST.')
  process.exit(2)
}

const b64u = (buf) => Buffer.from(buf).toString('base64url')
const sign = (payload) => {
  const head = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = b64u(JSON.stringify(payload))
  return `${head}.${body}.${createHmac('sha256', SECRET).update(`${head}.${body}`).digest('base64url')}`
}
const exp = Math.floor(Date.now() / 1000) + 24 * 3600
const ANON = sign({ role: 'anon', aud: 'authenticated', iss: 'local-test', exp })

// ── Seed: watumiaji watatu + B anamfuata A ──────────────────
const db = new pg.Client({ host: '127.0.0.1', port: 5432, user: 'postgres', password: PG_PASSWORD, database: 'pasihai_rest' })
await db.connect()
const IDS = { A: randomUUID(), B: randomUUID(), C: randomUUID() }
await db.query('TRUNCATE auth.users CASCADE')
await db.query('TRUNCATE storage.objects, chat_messages, chat_participants, chat_conversations, statuses, posts CASCADE')
for (const [k, name] of [['A', 'alice'], ['B', 'bob'], ['C', 'carol']]) {
  await db.query(
    'INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, $3)',
    [IDS[k], `${name}.${IDS[k].slice(0, 8)}@local.test`, JSON.stringify({ username: `${name}${IDS[k].slice(0, 4)}`, display_name: name })],
  )
}
await db.query('INSERT INTO follows (follower_id, followee_id) VALUES ($1, $2)', [IDS.B, IDS.A])
// Status ya A iliyoisha muda (superuser huweka tarehe ya zamani): haipaswi kuonekana kwa mtu yeyote.
const expired = await db.query(
  `INSERT INTO statuses (user_id, text, tone, expires_at) VALUES ($1, 'imeisha', 'green', now() - interval '1 hour') RETURNING id`,
  [IDS.A],
)
const EXPIRED_ID = expired.rows[0].id
await db.end()

// ── Jenga bundle na env ya local ─────────────────────────────
const outDir = join(ROOT, 'node_modules', '.live-rest')
const buildEnv = {
  ...process.env,
  VITE_SUPABASE_MODE: 'live',
  VITE_SUPABASE_URL: REST,
  VITE_SUPABASE_PUBLISHABLE_KEY: ANON,
  VITE_CLOUDINARY_CLOUD_NAME: 'noropw5y',
  VITE_CLOUDINARY_UPLOAD_PRESET: 'pasihai_preset',
}
try {
  execSync(`npx vite build --ssr scripts/test-live-rest.jsx --outDir ${outDir} --emptyOutDir --logLevel error`, {
    cwd: ROOT, env: buildEnv, stdio: 'pipe', timeout: 240_000,
  })
} catch (err) {
  console.log(`FAIL build :: ${String(err.stderr || err.message).slice(0, 500)}`)
  process.exit(1)
}

const run = spawnSync(process.execPath, [join(outDir, 'test-live-rest.js')], {
  cwd: ROOT,
  env: {
    ...process.env,
    PASIHAI_TEST_JWT_SECRET: SECRET,
    TEST_USER_A: IDS.A,
    TEST_USER_B: IDS.B,
    TEST_USER_C: IDS.C,
    TEST_EXPIRED_STATUS_ID: EXPIRED_ID,
  },
  encoding: 'utf8',
  timeout: 180_000,
})
const out = run.stdout || ''
writeFileSync('/home/user/pasihai-verify/logs/live-rest-last.log', out + '\n--- STDERR ---\n' + (run.stderr || '') + '\nSTATUS ' + run.status + ' SIGNAL ' + run.signal + ' ERR ' + (run.error || ''))
process.stdout.write(out.split('\n').filter((l) => l.startsWith('RESULT') || l.startsWith('SUMMARY')).join('\n') + '\n')
if (run.status !== 0 && !out.includes('SUMMARY')) {
  console.log(`FAIL runtime :: ${(run.stderr || '').slice(0, 500)} ${out.slice(-1200)}`)
}
const pass = (out.match(/^RESULT PASS/gm) || []).length
const fail = (out.match(/^RESULT FAIL/gm) || []).length
console.log(`LIVE-REST TESTS: ${pass} passed, ${fail} failed`)
process.exit(fail || run.status ? 1 : 0)
