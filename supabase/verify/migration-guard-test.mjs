// ══════════════════════════════════════════════════════════════
// PASIHAI — M2.1 FINAL SECURITY GATE: migration guard / anti-downgrade test
//
// Local Postgres 17 pekee (127.0.0.1:54329). Hujenga scratch DB zake na:
//   §A  mpangilio: numbered files kwa lexical sort; 034 < 035 < 036; runner
//       hukataa host isiyo local (ledger ya deployment iko kwenye Supabase CLI;
//       harness ya lab hujenga DB mpya kila run — tazama migration-strategy.md)
//   §B  fresh install (001→036 kwa mpangilio) → guard imeimarishwa + sentinel ipo
//   §C  upgrade ya DB yenye schema+data: 001–033 + data → 034 → 035 → 036;
//       data haiguzwi; guard imeimarishwa
//   §D  HOSTILE REPLAY (A3): 034 inarudiwa baada ya 035/036 → I1/I2
//       (kufufua/kubadilisha identity) ZINABAKI kuzuiwa na sentinel ya 036;
//       kisha 036 ikirejeshwa → function inakuwa imeimarishwa tena
//   §E  fresh == upgrade: functions (md5), triggers, policies, columns zinalingana
//   §F  rerun ya runner (rebuild kamili) → guard imeimarishwa (haiwezi kurudi nyuma)
//   §G  messages-security-test (SQL/RLS moja kwa moja) inapita hata kwenye DB
//       iliyorudiwa 034 (usiokuwa na function ya 035)
// ── M2.1.1 SENTINEL INDEPENDENCE AUDIT (nyongeza, 2026-10-14) ──
//   §A2 static: 036 = function huru + trigger yake; hai-dropi kitu cha 034
//   §H1/H2/H3/H4: definitions (functions + triggers zote za chat_messages)
//       kabla na baada ya hostile replay; kila SQL op inaonyesha verdict +
//       HALI YA REKODI baada ya jaribio (si rowCount pekee)
//
// Usage: node supabase/verify/migration-guard-test.mjs
import pg from 'pg'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { execFileSync } from 'node:child_process'

const PORT = Number(process.env.PG_PORT || 54329)
const HOST = process.env.PG_HOST || '127.0.0.1'
if (!['127.0.0.1', 'localhost'].includes(HOST)) {
  throw new Error(`Refusing to run destructive DB tests against non-local host "${HOST}"`)
}

const results = []
const notes = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail: String(detail).slice(0, 300) })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + String(detail).slice(0, 180) : ''}`)
}
const note = (m) => { notes.push(m); console.log(`NOTE  ${m}`) }

const MIG = 'supabase/migrations'
const files = fs.readdirSync(MIG).filter((f) => f.endsWith('.sql')).sort()
const FULL = 'PASIHAI_FULL_MIGRATION.sql'
const numbered = files.filter((f) => f !== FULL)

/* ── §A Mpangilio ───────────────────────────────────────────── */
{
  const i34 = files.indexOf('034_group_roles_permissions.sql')
  const i35 = files.indexOf('035_message_update_guard.sql')
  const i36 = files.indexOf('036_message_guard_sentinel.sql')
  check('§A mpangilio: 034 < 035 < 036 kwenye sort ya runner', i34 >= 0 && i34 < i35 && i35 < i36, `i34=${i34} i35=${i35} i36=${i36}`)
  const runner = fs.readFileSync('supabase/verify/run-migrations.mjs', 'utf8')
  check('§A runner: hupanga kwa lexical `.sort()` + hujenga DB mpya (drop+create)', /\.sort\(\)/.test(runner) && /DROP DATABASE IF EXISTS/.test(runner))
  check('§A runner: hukataa host isiyo local (production/hosted)', /Refusing to run destructive/.test(runner))
  let refused = false
  try {
    execFileSync('node', ['supabase/verify/run-migrations.mjs', '.', 'pasihai_should_not_run'], { env: { ...process.env, PG_HOST: 'example.com' }, stdio: 'pipe' })
  } catch (e) {
    refused = /Refusing to run destructive/.test(String(e.stderr || e.message))
  }
  check('§A runner: PG_HOST=example.com inakataliwa kabla ya kuunganisha', refused)
  check('§A mig 031 quirk (pre-existing): `COMMIT();` ni syntax error — harness patcha nakala pekee, historia ya 031 haiguzwi',
    true, 'COMMIT(); → syntax error at or near "("')
}

/* ── §A2 Uchambuzi tuli wa 034/035/036 (chanzo cha ukweli: SQL) ─────────── */
{
  const strip = (x) => x.replace(/--[^\n]*/g, '')
  const raw036 = fs.readFileSync(path.join(MIG, '036_message_guard_sentinel.sql'), 'utf8')
  const m034 = strip(fs.readFileSync(path.join(MIG, '034_group_roles_permissions.sql'), 'utf8'))
  const m035 = strip(fs.readFileSync(path.join(MIG, '035_message_update_guard.sql'), 'utf8'))
  const m036 = strip(raw036)
  check('§A2 036: function huru ya sentinel + trigger yake mwenyewe (BEFORE UPDATE, FOR EACH ROW)',
    /CREATE OR REPLACE FUNCTION public\.chat_group_message_immutable_guard\(\)/.test(m036)
    && /CREATE TRIGGER trg_chat_messages_immutable_guard\s+BEFORE UPDATE ON public\.chat_messages\s+FOR EACH ROW EXECUTE FUNCTION public\.chat_group_message_immutable_guard\(\)/.test(m036))
  check('§A2 036: haidropi function wala trigger yoyote ya 034 (DROP ni ya sentinel yake pekee kwa idempotency)',
    !/DROP FUNCTION/.test(m036) && !/DROP TRIGGER[^;]*trg_chat_messages_guard_upd/.test(m036)
    && !/DROP TRIGGER IF EXISTS (?!trg_chat_messages_immutable_guard)/.test(m036))
  check('§A2 035/036: trigger ya 034 (trg_chat_messages_guard_upd) haiguswi — function moja tu inabadilishwa',
    !/trg_chat_messages_guard_upd/.test(m035) && !/trg_chat_messages_guard_upd/.test(m036))
  check('§A2 034: trigger yake ni BEFORE UPDATE bila `UPDATE OF` — hukagua column yoyote',
    /CREATE TRIGGER trg_chat_messages_guard_upd\s+BEFORE UPDATE ON public\.chat_messages\s+FOR EACH ROW EXECUTE FUNCTION public\.chat_group_guard_message_update\(\)/.test(m034))
  check('§A2 035: ina (a) identity guard + (b) undelete ya upande mmoja',
    /NEW\.id IS DISTINCT FROM OLD\.id/.test(m035) && /chat_group_message_undelete_forbidden/.test(m035))
  check('§A2 036: rollback imeandikwa kwa komenti (hakuna kufuta data)',
    /ROLLBACK \(kwa komenti/.test(raw036))
}

/* ── Nakala ya harness (031 BEGIN/COMMIT(); huratibiwa kwa replay pekee) ── */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pasihai-guard-'))
const patchedDir = path.join(tmp, 'verifyrepo', 'supabase', 'migrations')
fs.mkdirSync(patchedDir, { recursive: true })
for (const f of files) {
  let s = fs.readFileSync(path.join(MIG, f), 'utf8')
  if (f.startsWith('031_')) s = s.replace('BEGIN;\n', '').replace('COMMIT();', '')
  fs.writeFileSync(path.join(patchedDir, f), s)
}
const patchedPath = (f) => path.join(patchedDir, f)

/* ── Zana ───────────────────────────────────────────────────── */
const admin = new pg.Client({ host: HOST, port: PORT, user: 'postgres', database: 'postgres' })
await admin.connect()
const conn = (db) => new pg.Client({ host: HOST, port: PORT, user: 'postgres', database: db })
const shim = fs.readFileSync('supabase/verify/supabase-shim.sql', 'utf8')
async function freshDb(name) {
  await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`)
  await admin.query(`CREATE DATABASE ${name}`)
  const db = conn(name); await db.connect()
  await db.query(shim)
  return db
}
async function applyAll(db, list, log = null) {
  for (const f of list) {
    await db.query(fs.readFileSync(patchedPath(f), 'utf8'))
    if (log) log.push(f)
  }
}
const guardProbe = async (db) => {
  /* Hujaribu mashambulizi ya I1/I2 kama `authenticated` kwenye DB husika. */
  const Ua = '6c000000-0000-4000-8000-0000000000a1'
  const Ub = '6c000000-0000-4000-8000-0000000000a2'
  for (const [id, name] of [[Ua, 'probe-a'], [Ub, 'probe-b']]) {
    await db.query(`INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING`,
      [id, `${name}@local.test`, JSON.stringify({ username: name, display_name: name })])
  }
  const g = (await db.query(`INSERT INTO public.chat_conversations (type, title, created_by) VALUES ('group','Guard Probe',$1) RETURNING id`, [Ua])).rows[0].id
  await db.query(`INSERT INTO public.chat_participants (conversation_id, user_id, role, status) VALUES ($1,$2,'owner','active'),($1,$3,'member','active')`, [g, Ua, Ub])
  const gt = (await db.query(`INSERT INTO public.chat_conversations (type, title, created_by) VALUES ('group','Probe Target',$1) RETURNING id`, [Ua])).rows[0].id
  await db.query(`INSERT INTO public.chat_participants (conversation_id, user_id, role, status) VALUES ($1,$2,'owner','active')`, [gt, Ua])
  const asUser = async (uid, sql, params) => {
    await db.query('BEGIN')
    try {
      await db.query('SET LOCAL role authenticated')
      await db.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [uid])
      const r = await db.query(sql, params); await db.query('COMMIT'); return { ok: true, rowCount: r.rowCount }
    } catch (e) { await db.query('ROLLBACK'); return { ok: false, err: e } }
  }
  const ins = await db.query(`INSERT INTO public.chat_messages (conversation_id, sender_id, text) VALUES ($1,$2,'probe') RETURNING id`, [g, Ua])
  const mid = ins.rows[0].id
  const idChange = await asUser(Ua, `UPDATE public.chat_messages SET created_at = now() - interval '1 day' WHERE id=$1`, [mid])
  const senderSpoof = await asUser(Ua, `UPDATE public.chat_messages SET sender_id = $2 WHERE id=$1`, [mid, Ub])
  const move = await asUser(Ua, `UPDATE public.chat_messages SET conversation_id = $2 WHERE id=$1`, [mid, gt])
  await asUser(Ua, `UPDATE public.chat_messages SET deleted_at = now() WHERE id=$1`, [mid])
  const undelete = await asUser(Ua, `UPDATE public.chat_messages SET deleted_at = NULL WHERE id=$1`, [mid])
  const e = (r) => String(r.err?.message || '')
  return {
    identityBlocked: !idChange.ok && !senderSpoof.ok && !move.ok,
    undeleteBlocked: !undelete.ok,
    codes: { id: e(idChange).slice(0, 40), move: e(move).slice(0, 40), undelete: e(undelete).slice(0, 40) },
  }
}
const inventory = async (db) => {
  const q = async (s) => (await db.query(s)).rows
  return JSON.stringify({
    funcs: (await q(`SELECT p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS n, md5(pg_get_functiondef(p.oid)) AS m
      FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace WHERE ns.nspname='public' ORDER BY 1`)),
    triggers: (await q(`SELECT c.relname||':'||t.tgname AS n FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
      JOIN pg_namespace ns ON ns.oid=c.relnamespace WHERE NOT t.tgisinternal AND ns.nspname='public' ORDER BY 1`)),
    policies: (await q(`SELECT tablename||':'||policyname||':'||cmd AS n FROM pg_policies WHERE schemaname='public' ORDER BY 1`)),
    columns: (await q(`SELECT table_name||':'||column_name||':'||data_type AS n FROM information_schema.columns WHERE table_schema='public' ORDER BY 1`)),
  })
}

/* ── M2.1.1 zana za ushahidi: definitions + hali ya rekodi (si rowCount) ── */
const defsSnapshot = async (db) => {
  const f = (await db.query(`SELECT
      md5(pg_get_functiondef('public.chat_group_guard_message_update()'::regprocedure)) AS guard_md5,
      md5(pg_get_functiondef('public.chat_group_message_immutable_guard()'::regprocedure)) AS sentinel_md5`)).rows[0]
  const trg = (await db.query(`SELECT t.tgname AS name, t.tgenabled AS enabled, pg_get_triggerdef(t.oid) AS def
      FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace ns ON ns.oid = c.relnamespace
      WHERE c.relname = 'chat_messages' AND NOT t.tgisinternal ORDER BY t.tgname`)).rows
  return { guard_md5: f.guard_md5, sentinel_md5: f.sentinel_md5, trg }
}
const dumpDefs = async (db, tag, full) => {
  const f = (await db.query(`SELECT pg_get_functiondef('public.chat_group_guard_message_update()'::regprocedure) AS guard,
      pg_get_functiondef('public.chat_group_message_immutable_guard()'::regprocedure) AS sentinel`)).rows[0]
  const snap = await defsSnapshot(db)
  console.log(`\n═══ DEFINITIONS [${tag}] ═══`)
  console.log(`guard    chat_group_guard_message_update      md5=${snap.guard_md5}`)
  if (full) console.log(f.guard.trim())
  console.log(`sentinel chat_group_message_immutable_guard  md5=${snap.sentinel_md5}`)
  if (full) console.log(f.sentinel.trim())
  console.log('triggers za chat_messages (mpangilio wa kuwaka = alphabetical kwa jina):')
  for (const t of snap.trg) console.log(`  • ${t.name}  enabled=${t.enabled}  ${t.def.trim()}`)
  return snap
}
const attackEvidence = async (db, u, tag) => {
  const P = (n) => `${u}-0000-4000-8000-${String(n).padStart(12, '0')}`
  const Ua = P(1), Ub = P(2), Um = P(3)
  for (const [id, name] of [[Ua, `ev-${tag}-a`], [Ub, `ev-${tag}-b`], [Um, `ev-${tag}-m`]]) {
    await db.query(`INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1,$2,$3) ON CONFLICT (id) DO NOTHING`,
      [id, `${name}@local.test`, JSON.stringify({ username: name, display_name: name })])
  }
  const g = (await db.query(`INSERT INTO public.chat_conversations (type, title, created_by) VALUES ('group','Ev ${tag}',$1) RETURNING id`, [Ua])).rows[0].id
  await db.query(`INSERT INTO public.chat_participants (conversation_id, user_id, role, status, permissions) VALUES
    ($1,$2,'owner','active',NULL),($1,$3,'member','active',NULL),($1,$4,'moderator','active','["moderate_messages"]'::jsonb)`, [g, Ua, Ub, Um])
  const gt = (await db.query(`INSERT INTO public.chat_conversations (type, title, created_by) VALUES ('group','EvTarget ${tag}',$1) RETURNING id`, [Ua])).rows[0].id
  await db.query(`INSERT INTO public.chat_participants (conversation_id, user_id, role) VALUES ($1,$2,'member')`, [gt, Ua])
  const mk = async (uid, text) => (await db.query(`INSERT INTO public.chat_messages (conversation_id, sender_id, text) VALUES ($1,$2,$3) RETURNING id`, [g, uid, text])).rows[0].id
  const mid = await mk(Ua, 'ev-identity')
  const mdel = await mk(Ub, 'ev-moderated')
  const mauth = await mk(Ua, 'ev-self-delete')
  const asUser = async (uid, sql, params) => {
    await db.query('BEGIN')
    try {
      await db.query('SET LOCAL role authenticated')
      await db.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [uid])
      const r = await db.query(sql, params); await db.query('COMMIT'); return { ok: true, rowCount: r.rowCount }
    } catch (e) { await db.query('ROLLBACK'); return { ok: false, err: e } }
  }
  const st = async (id) => (await db.query(`SELECT id::text AS id, sender_id::text AS sender, conversation_id::text AS conv,
      created_at::text AS created, deleted_at::text AS deleted, text FROM public.chat_messages WHERE id=$1`, [id])).rows[0]
  console.log(`\n═══ SQL OPERATIONS + HALI YA REKODI [${tag}] — op zote zinaendeshwa kama role authenticated + JWT claim ═══`)
  console.log('  (hali ya rekodi huchunguzwa kwa usomaji pekee kama superuser; hakuna op ya jaribio inayoendeshwa kama superuser)')
  const tryOp = async (label, uid, sql, params, id) => {
    const b = await st(id)
    const r = await asUser(uid, sql, params)
    const a = await st(id)
    const changed = JSON.stringify(b) !== JSON.stringify(a)
    const verdict = !r.ok
      ? `IMEKATALIWA [${r.err.code || ''} ${String(r.err.message).slice(0, 70)}]`
      : (r.rowCount === 0
        ? 'IMEZUILIWA na RLS (rowCount=0 — safu hairuhusiwi kuonekana/kuupdate; hakuna iliyobadilika)'
        : `IMEKUBALIWA (rowCount=${r.rowCount})`)
    const blocked = !r.ok || r.rowCount === 0
    console.log(`  • ${label}`)
    console.log(`      SQL: ${sql.replace(/\s+/g, ' ')}`)
    console.log(`      → ${verdict} · rekodi: ${changed ? 'ILIBADILIKA' : 'HAIJABADILIKA'}`)
    return { label, ok: r.ok, rowCount: r.rowCount, blocked, changed }
  }
  const V = []
  V.push(await tryOp('mwandishi: kubadilisha id', Ua, `UPDATE public.chat_messages SET id = gen_random_uuid() WHERE id=$1`, [mid], mid))
  V.push(await tryOp('mwandishi: kughushi sender_id', Ua, `UPDATE public.chat_messages SET sender_id=$2 WHERE id=$1`, [mid, Ub], mid))
  V.push(await tryOp('mwandishi: kuhamisha conversation_id kwenda group nyingine', Ua, `UPDATE public.chat_messages SET conversation_id=$2 WHERE id=$1`, [mid, gt], mid))
  V.push(await tryOp('mwandishi: kubadilisha created_at', Ua, `UPDATE public.chat_messages SET created_at = created_at - interval '1 day' WHERE id=$1`, [mid], mid))
  const A = []
  A.push(await tryOp('mwandishi: kuhariri text yake (inaruhusiwa)', Ua, `UPDATE public.chat_messages SET text='ev-edited-ok' WHERE id=$1`, [mid], mid))
  A.push(await tryOp('moderator mwenye ruhusa: soft-delete ya ujumbe wa mwingine (inaruhusiwa)', Um, `UPDATE public.chat_messages SET deleted_at = now() WHERE id=$1`, [mdel], mdel))
  A.push(await tryOp('mwandishi: kufuta ujumbe wake (inaruhusiwa)', Ua, `UPDATE public.chat_messages SET deleted_at = now() WHERE id=$1`, [mauth], mauth))
  V.push(await tryOp('mwandishi: kufufua ujumbe wake uliofutwa (deleted_at = NULL)', Ua, `UPDATE public.chat_messages SET deleted_at = NULL WHERE id=$1`, [mauth], mauth))
  V.push(await tryOp('moderator: kufufua ujumbe uliofutwa na mwandishi', Um, `UPDATE public.chat_messages SET deleted_at = NULL WHERE id=$1`, [mauth], mauth))
  V.push(await tryOp('moderator: kuhariri text ya ujumbe wa mwingine', Um, `UPDATE public.chat_messages SET text='mod-hacked' WHERE id=$1`, [mdel], mdel))
  V.push(await tryOp('member bila ruhusa: soft-delete ya ujumbe wa mwingine', Ub, `UPDATE public.chat_messages SET deleted_at = now() WHERE id=$1`, [mid], mid))
  V.push(await tryOp('member: kuhamisha ujumbe wa mwingine kwenda group nyingine', Ub, `UPDATE public.chat_messages SET conversation_id=$2 WHERE id=$1`, [mid, gt], mid))
  const violBlocked = V.every((r) => r.blocked && !r.changed)
  const allowedOk = A.every((r) => r.ok && r.rowCount === 1 && r.changed)
  const fin = (await st(mid)) ?? {}
  const fin2 = (await st(mdel)) ?? {}
  const fin3 = (await st(mauth)) ?? {}
  const integrity = fin.text === 'ev-edited-ok' && fin.deleted === null
    && fin2.deleted !== null && fin2.text === 'ev-moderated' && fin3.deleted !== null
  check(`§H [${tag}] shambulizi ${V.length} zote zimezuiwa NA rekodi hazijabadilika`, violBlocked,
    V.filter((r) => !r.blocked || r.changed).map((r) => r.label).join(' | '))
  check(`§H [${tag}] op ${A.length} zinazoruhusiwa zinafanya kazi (hakuna kuvunja tabia halali)`, allowedOk,
    A.filter((r) => !r.ok || r.rowCount !== 1 || !r.changed).map((r) => r.label).join(' | '))
  check(`§H [${tag}] hali ya mwisho ya rekodi: hakuna shambulizi lililofanikiwa`, integrity)
  return { violBlocked, allowedOk, integrity }
}

/* ── §B Fresh install ───────────────────────────────────────── */
let dbFresh
{
  dbFresh = await freshDb('pasihai_m21_fresh')
  const order = []
  await applyAll(dbFresh, numbered, order)
  const i = (f) => order.indexOf(f)
  check('§B fresh install 001→036 kwa mpangilio (034 kabla ya 035 kabla ya 036)',
    i('034_group_roles_permissions.sql') < i('035_message_update_guard.sql') && i('035_message_update_guard.sql') < i('036_message_guard_sentinel.sql'),
    `files=${order.length}`)
  const hardened = (await dbFresh.query(`SELECT position('undelete' in pg_get_functiondef('public.chat_group_guard_message_update()'::regprocedure))>0 AS h`)).rows[0].h
  const sentinel = (await dbFresh.query(`SELECT count(*)::int n FROM pg_trigger WHERE tgname='trg_chat_messages_immutable_guard' AND NOT tgisinternal`)).rows[0].n
  check('§B guard imeimarishwa (function ya 035/036)', hardened === true)
  check('§B sentinel trigger ya 036 ipo', sentinel === 1, `n=${sentinel}`)
  const probe = await guardProbe(dbFresh)
  check('§B attacks za I1/I2 zinazuiwa kwenye fresh install', probe.identityBlocked && probe.undeleteBlocked, JSON.stringify(probe.codes))

  /* M2.1.1: definitions kamili + battery yenye ushahidi wa hali ya rekodi */
  const snapFresh = await dumpDefs(dbFresh, 'H1 fresh install 001→036 (definitions kamili)', true)
  await attackEvidence(dbFresh, '6d000001', 'H1')
  const namesF = snapFresh.trg.map((t) => t.name)
  check('§H1 fresh: sentinel trigger inaita function YAKE huru (si ya guard) na imewashwa',
    snapFresh.trg.some((t) => t.name === 'trg_chat_messages_immutable_guard'
      && /BEFORE UPDATE ON public\.chat_messages/.test(t.def)
      && /EXECUTE FUNCTION (public\.)?chat_group_message_immutable_guard\(\)/.test(t.def) && t.enabled === 'O'),
    namesF.join(','))
  check('§H1 independence: kila function inatumiwa na trigger yake MOJA (hakuna kuchanganya — guard anaweza kurudi nyuma bila kuathiri sentinel)',
    snapFresh.trg.filter((t) => /chat_group_message_immutable_guard\(\)/.test(t.def)).length === 1
    && snapFresh.trg.filter((t) => /chat_group_guard_message_update\(\)/.test(t.def)).length === 1)
  check('§H1 fresh: hakuna `UPDATE OF` — guard + sentinel huwaka kwa UPDATE yoyote ya column',
    snapFresh.trg.filter((t) => /guard/.test(t.name)).every((t) => !/UPDATE OF/.test(t.def)))
  check('§H1 fresh: mpangilio wa kuwaka (alphabetical): guard_upd kabla ya immutable_guard',
    namesF.indexOf('trg_chat_messages_guard_upd') >= 0
    && namesF.indexOf('trg_chat_messages_guard_upd') < namesF.indexOf('trg_chat_messages_immutable_guard'),
    namesF.join(','))
}

/* ── §C Upgrade ya DB yenye schema + data ───────────────────── */
let dbUp
let legacyGId
let snapUpBefore
{
  dbUp = await freshDb('pasihai_m21_upgrade')
  await applyAll(dbUp, numbered.filter((f) => f < '034_'))
  /* data ya awali (kama production ya zamani) */
  const U1 = '6c000000-0000-4000-8000-0000000000b1'
  const U2 = '6c000000-0000-4000-8000-0000000000b2'
  for (const [id, name] of [[U1, 'legacy-a'], [U2, 'legacy-b']]) {
    await dbUp.query(`INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1,$2,$3)`,
      [id, `${name}@local.test`, JSON.stringify({ username: name, display_name: name })])
  }
  legacyGId = (await dbUp.query(`INSERT INTO public.chat_conversations (type, title, created_by) VALUES ('group','Legacy Data',$1) RETURNING id`, [U1])).rows[0].id
  await dbUp.query(`INSERT INTO public.chat_participants (conversation_id, user_id, role) VALUES ($1,$2,'member'),($1,$3,'member')`, [legacyGId, U1, U2])
  await dbUp.query(`INSERT INTO public.chat_messages (conversation_id, sender_id, text) VALUES ($1,$2,'Ujumbe wa kabla ya 034')`, [legacyGId, U1])
  await applyAll(dbUp, ['034_group_roles_permissions.sql', '035_message_update_guard.sql', '036_message_guard_sentinel.sql'])
  const counts = (await dbUp.query(`SELECT
    (SELECT count(*)::int FROM public.chat_conversations) c,
    (SELECT count(*)::int FROM public.chat_participants) p,
    (SELECT count(*)::int FROM public.chat_messages) m`)).rows[0]
  check('§C upgrade: data ya awali haiguzwi (convs 1, participants 2, msg 1)',
    counts.c === 1 && counts.p === 2 && counts.m === 1, JSON.stringify(counts))
  const probe = await guardProbe(dbUp)
  check('§C upgrade: guard imeimarishwa (I1/I2 zinazuiwa)', probe.identityBlocked && probe.undeleteBlocked, JSON.stringify(probe.codes))
}

/* ── §E fresh == upgrade ────────────────────────────────────── */
{
  const a = await inventory(dbFresh)
  const b = await inventory(dbUp)
  check('§E fresh == upgrade: functions(md5)+triggers+policies+columns zinalingana', a === b, a === b ? '' : 'tofauti zimegundulika')
}

/* ── §D Hostile replay ya 034 (A3) ──────────────────────────── */
{
  snapUpBefore = await dumpDefs(dbUp, 'H2 KABLA ya replay ya 034 (DB yenye data + 036) — rejea H1 kwa bodies kamili', false)
  await dbUp.query(fs.readFileSync(patchedPath('034_group_roles_permissions.sql'), 'utf8'))
  note('§D 034 imerudiwa kwa mkono (mfano: replay ya bahati mbaya) — function ya guard imerudi nyuma; sentinel 036 ndiyo inayobeba ulinzi')
  const hardened = (await dbUp.query(`SELECT position('undelete' in pg_get_functiondef('public.chat_group_guard_message_update()'::regprocedure))>0 AS h`)).rows[0].h
  check('§D (hali) function ya guard imerudi nyuma kama inavyotarajiwa', hardened === false)
  const probe = await guardProbe(dbUp)
  check('§D SENTINEL: I1/I2 ZINABAKI kuzuiwa baada ya replay ya 034', probe.identityBlocked && probe.undeleteBlocked, JSON.stringify(probe.codes))

  /* M2.1.1: definitions + hali ya rekodi BAADA ya replay */
  const snapUpAfter = await dumpDefs(dbUp, 'H3 BAADA ya replay ya 034 (function imerudi nyuma; sentinel haiguswi)', true)
  check('§H3 sentinel function + trigger hazijabadilika hata kidogo baada ya replay ya 034',
    snapUpAfter.sentinel_md5 === snapUpBefore.sentinel_md5
    && JSON.stringify(snapUpAfter.trg) === JSON.stringify(snapUpBefore.trg))
  check('§H3 guard function ILIBADILIKA (replay imetokea kweli — sio mtihani tupu)',
    snapUpAfter.guard_md5 !== snapUpBefore.guard_md5)
  const who = await (async () => {
    await dbUp.query('BEGIN')
    try {
      await dbUp.query('SET LOCAL role authenticated')
      await dbUp.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, ['6d000003-0000-4000-8000-000000000001'])
      return (await dbUp.query(`SELECT current_user AS cu, auth.uid()::text AS uid`)).rows[0]
    } finally { await dbUp.query('ROLLBACK') }
  })()
  check('§H3 harness: op za usalama zinaendeshwa kama role authenticated + JWT claim (si superuser)',
    who.cu === 'authenticated' && who.uid === '6d000003-0000-4000-8000-000000000001', `current_user=${who.cu}`)
  await attackEvidence(dbUp, '6d000003', 'H3')
  const leg = (await dbUp.query(`SELECT count(*)::int n FROM public.chat_messages WHERE conversation_id=$1 AND text='Ujumbe wa kabla ya 034' AND deleted_at IS NULL`, [legacyGId])).rows[0].n
  check('§H3 data ya kihistoria (Legacy Data) haijaguswa na replay wala na battery', leg === 1, `n=${leg}`)
}

/* ── §G messages-security kwenye DB ILIYORUDIWA 034 (bila function ya 035) ── */
{
  let out = ''
  let okExit = true
  try {
    out = execFileSync('node', ['supabase/verify/messages-security-test.mjs', 'pasihai_m21_upgrade'], { encoding: 'utf8' })
  } catch (e) { okExit = false; out = String(e.stdout || '') + String(e.stderr || '') }
  const m = out.match(/RESULTS: (\d+)\/(\d+) passed/)
  check('§G messages-security (SQL/RLS moja kwa moja) inapita hata kwenye DB iliyorudiwa 034',
    okExit && m && m[1] === m[2], m ? `${m[1]}/${m[2]}` : 'hakuna RESULTS')
}

/* ── §D2 036 ikirejeshwa (idempotent) ───────────────────────── */
{
  await dbUp.query(fs.readFileSync(patchedPath('036_message_guard_sentinel.sql'), 'utf8'))
  const re = (await dbUp.query(`SELECT position('undelete' in pg_get_functiondef('public.chat_group_guard_message_update()'::regprocedure))>0 AS h`)).rows[0].h
  check('§D2 036 ikirejeshwa: function inakuwa imeimarishwa tena (idempotent)', re === true)

  /* M2.1.1: definitions baada ya kurejesha + idempotency ya mara ya pili */
  const snapUpRestored = await dumpDefs(dbUp, 'H4 baada ya kurejesha 036 (guard = ile ya kabla ya replay; sentinel ipo)', false)
  check('§H4 036 ikirejeshwa: guard md5 == hali ya KABLA ya replay (bila kuharibu data)',
    snapUpRestored.guard_md5 === snapUpBefore.guard_md5 && snapUpRestored.sentinel_md5 === snapUpBefore.sentinel_md5)
  await attackEvidence(dbUp, '6d000004', 'H4')
  await dbUp.query(fs.readFileSync(patchedPath('036_message_guard_sentinel.sql'), 'utf8'))
  const snapTwice = await defsSnapshot(dbUp)
  check('§H4 kuendesha 036 mara ya pili: definitions hazibadiliki (idempotent kabisa)',
    snapTwice.guard_md5 === snapUpRestored.guard_md5 && snapTwice.sentinel_md5 === snapUpRestored.sentinel_md5)
}

await dbFresh.end()
await dbUp.end()

/* ── §F Rerun ya runner (rebuild kamili) ────────────────────── */
{
  let out = ''
  try {
    out = execFileSync('node', ['supabase/verify/run-migrations.mjs', path.join(tmp, 'verifyrepo'), 'pasihai_m21_fresh'], { encoding: 'utf8' })
  } catch (e) { out = String(e.stdout || '') }
  check('§F rerun ya runner: FULL ndiyo fail pekee (snapshot, do-not-replay)', /FAIL\s+PASIHAI_FULL_MIGRATION\.sql/.test(out) && /migrations applied: 38\/39/.test(out), (out.match(/migrations applied: \d+\/\d+/) || [''])[0])
  const db = conn('pasihai_m21_fresh'); await db.connect()
  const hardened = (await db.query(`SELECT position('undelete' in pg_get_functiondef('public.chat_group_guard_message_update()'::regprocedure))>0 AS h`)).rows[0].h
  const sentinel = (await db.query(`SELECT count(*)::int n FROM pg_trigger WHERE tgname='trg_chat_messages_immutable_guard' AND NOT tgisinternal`)).rows[0].n
  check('§F baada ya rerun: guard imeimarishwa + sentinel ipo (haiwezi kurudi nyuma kwa runner)', hardened === true && sentinel === 1)
  await db.end()
}

/* ── §C2 FULL snapshot: sababu ya do-not-replay ─────────────── */
{
  const dbFull = await freshDb('pasihai_m21_full')
  await dbFull.query(fs.readFileSync(patchedPath(FULL), 'utf8'))
  check('§C2 FULL kwenye DB tupu: inaapply OK (ni snapshot kamili, si broken)', true)
  await dbFull.end()
  const dbF = conn('pasihai_m21_fresh'); await dbF.connect()
  const before = (await dbF.query(`SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='public'`)).rows[0].n
  let failed = false
  let errMsg = ''
  try { await dbF.query(fs.readFileSync(patchedPath(FULL), 'utf8')) }
  catch (e) { failed = true; errMsg = String(e.message).slice(0, 60) }
  const after = (await dbF.query(`SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='public'`)).rows[0].n
  check('§C2 FULL kwenye DB iliyokwisha migrate: inashindwa salama (hakuna mabadiliko ya partial)',
    failed && before === after, `err="${errMsg}" tables ${before}→${after}`)
  await dbF.end()
}

/* ── Muhtasari ──────────────────────────────────────────────── */
console.log('\nMADOKEZO:')
for (const n of notes) console.log(' -', n)
const failed = results.filter((r) => !r.ok)
console.log(`\nRESULTS: ${results.length - failed.length}/${results.length} passed`)
if (failed.length) {
  console.log('FAILED:')
  for (const f of failed) console.log(' ✗', f.name, '—', f.detail)
  process.exitCode = 1
}
await admin.end()
