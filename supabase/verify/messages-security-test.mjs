// ══════════════════════════════════════════════════════════════
// PASIHAI — M2 SECURITY REVIEW: soft-delete + direct-chat message RLS
//
// Local Postgres 17 + Supabase shim pekee. Hali inayodhaniwa: migrations
// 001–035 zime-apply (bila 035 checks za §2 (14–16) zinashindwa — ushahidi
// wa tatizo, kama ilivyokusudiwa).
//
// Inathibitisha (kama `authenticated`, si superuser):
//   §1  soft-delete: mwandishi · moderator mwenye ruhusa · asiye na ruhusa ·
//       mgeni · anon; SELECT haifichi/inaficha kwa usahihi; UPDATE + WITH CHECK
//       kwa pamoja; hariri ya mwandishi inaendelea (regression)
//   §1b id/sender_id/conversation_id/created_at + upande mmoja (035/036)
//   §2  direct: kutuma kwa wasio-washirika · kughushi sender_id · SELECT ya
//       ujumbe uliofutwa · contact_message_gate · gap ya awali (Contacts) kwa
//       uwazi — HAIJABADILISHWA na M2
//
// Usage: node supabase/verify/messages-security-test.mjs <dbName>
import pg from 'pg'

const dbName = process.argv[2] || 'pasihai_verify'
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

const db = new pg.Client({ host: HOST, port: PORT, user: 'postgres', database: dbName })
await db.connect()

/* UUID za kipekee (hazigusii fixtures za suites nyingine) */
const U = (n) => `9a000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const O = U(1)   // owner        (mwandishi wa m1)
const A = U(2)   // admin  + grants ['moderate_messages','restrict_members']
const M = U(3)   // moderator + grants ['moderate_messages']
const M2 = U(4)  // moderator + grants ['restrict_members']  (bila moderate)
const X = U(5)   // member (mwandishi wa m2, D2 participant)
const B = U(6)   // member (hanna ruhusa)
const V = U(7)   // outsider (hapo kwenye kikundi wala direct)

/* ── Harness ────────────────────────────────────────────────── */
async function asSuper(sql, params = []) {
  await db.query('BEGIN')
  try { const r = await db.query(sql, params); await db.query('COMMIT'); return r }
  catch (e) { await db.query('ROLLBACK'); throw e }
}
async function asUser(uid, sql, params = []) {
  await db.query('BEGIN')
  try {
    await db.query('SET LOCAL role authenticated')
    await db.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [uid])
    const r = await db.query(sql, params)
    await db.query('COMMIT')
    return r
  } catch (e) { await db.query('ROLLBACK'); throw e }
}
const tryAsUser = async (uid, sql, params = []) => {
  try { const r = await asUser(uid, sql, params); return { ok: true, rows: r.rows, rowCount: r.rowCount } }
  catch (e) { return { ok: false, err: e } }
}
const tryAsAnon = async (sql, params = []) => {
  try {
    await db.query('BEGIN'); await db.query('SET LOCAL role anon')
    const r = await db.query(sql, params); await db.query('COMMIT')
    return { ok: true, rows: r.rows }
  } catch (e) { await db.query('ROLLBACK'); return { ok: false, err: e } }
}
const msg = (e) => String(e?.message || '')
const denied = (e) => e?.code === '42501' || /row-level security|permission denied/i.test(msg(e))
const isErr = (res, code) => !res.ok && (res.err?.code === '42501' || msg(res.err).includes(code))

/* ── Fixtures ───────────────────────────────────────────────── */
for (const [id, name] of [[O, 'sd-owner'], [A, 'sd-admin'], [M, 'sd-mod'], [M2, 'sd-mod2'], [X, 'sd-member'], [B, 'sd-member2'], [V, 'sd-outsider']]) {
  await asSuper(
    `INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1,$2,$3)
     ON CONFLICT (id) DO NOTHING`,
    [id, `${name}@local.test`, JSON.stringify({ username: name, display_name: name })],
  )
}
const gid = (await asSuper(
  `INSERT INTO public.chat_conversations (type, title, created_by) VALUES ('group','SD Security',$1) RETURNING id`, [O],
)).rows[0].id
for (const [uid, role, perms] of [
  [O, 'owner', null], [A, 'admin', '["moderate_messages","restrict_members"]'],
  [M, 'moderator', '["moderate_messages"]'], [M2, 'moderator', '["restrict_members"]'],
  [X, 'member', null], [B, 'member', null],
]) {
  await asSuper(
    `INSERT INTO public.chat_participants (conversation_id, user_id, role, status, permissions)
     VALUES ($1,$2,$3,'active',$4::jsonb)`,
    [gid, uid, role, perms],
  )
}
const did = (await asSuper(
  `INSERT INTO public.chat_conversations (type, title, created_by) VALUES ('direct', NULL, $1) RETURNING id`, [O],
)).rows[0].id
await asSuper(
  `INSERT INTO public.chat_participants (conversation_id, user_id, role) VALUES ($1,$2,'member'),($1,$3,'member')`,
  [did, O, X],
)
/* Direct ya tatu: X na B — kwa jaribio la "aliyekatazwa" (gap ya awali) */
const did2 = (await asSuper(
  `INSERT INTO public.chat_conversations (type, title, created_by) VALUES ('direct', NULL, $1) RETURNING id`, [X],
)).rows[0].id
await asSuper(
  `INSERT INTO public.chat_participants (conversation_id, user_id, role) VALUES ($1,$2,'member'),($1,$3,'member')`,
  [did2, X, B],
)

const send = async (uid, conv, text) => {
  const r = await asUser(uid,
    `INSERT INTO public.chat_messages (conversation_id, sender_id, text) VALUES ($1,$2,$3) RETURNING id`,
    [conv, uid, text])
  return r.rows[0].id
}
const softDelete = (uid, mid) => tryAsUser(uid,
  `UPDATE public.chat_messages SET deleted_at = now() WHERE id = $1`, [mid])
const seenBy = async (uid, mid) => {
  const r = await asUser(uid, `SELECT id FROM public.chat_messages WHERE id = $1`, [mid])
  return r.rows.length
}
const rawRow = async (mid) => (await asSuper(
  `SELECT deleted_at, text, conversation_id, created_at FROM public.chat_messages WHERE id = $1`, [mid],
)).rows[0]

/* ══════════════════════════════════════════════════════════════
   §1 — SOFT-DELETE: mwandishi · moderator · ruhusa · SELECT matrix
   ══════════════════════════════════════════════════════════════ */
const m1 = await send(O, gid, 'Ujumbe wa m1 (owner)')
const m2 = await send(X, gid, 'Ujumbe wa m2 (member X)')
const m3 = await send(O, gid, 'Ujumbe wa m3 (owner)')
const m4 = await send(X, gid, 'Ujumbe wa m4 (member X)')

{
  const r = await softDelete(X, m2)
  check('§1 mwandishi anaweza soft-delete ujumbe wake', r.ok && r.rowCount === 1, `rowCount=${r.rowCount ?? msg(r.err)}`)
  check('§1 mwandishi anaona ujumbe wake uliofutwa (SELECT)', (await seenBy(X, m2)) === 1)
}
{
  const r = await softDelete(A, m1)
  check('§1 admin mwenye moderate_messages anaweza soft-delete wa mwingine', r.ok && r.rowCount === 1, `rowCount=${r.rowCount ?? msg(r.err)}`)
  check('§1 admin-moderator anaona ujumbe uliofutwa (SELECT)', (await seenBy(A, m1)) === 1)
  check('§1 mwandishi (owner) anaona ujumbe wake uliofutwa na moderator', (await seenBy(O, m1)) === 1)
  check('§1 member wa kawaida HANAONI ujumbe uliofutwa', (await seenBy(B, m1)) === 0 && (await seenBy(B, m2)) === 0)
}
{
  const r = await softDelete(M, m4)
  check('§1 moderator mwenye moderate_messages anaweza soft-delete', r.ok && r.rowCount === 1, `rowCount=${r.rowCount ?? msg(r.err)}`)
}
{
  const r = await softDelete(M2, m3)
  const row = await rawRow(m3)
  check('§1 moderator BILA moderate_messages hakubaliwi kufuta', (r.rowCount === 0 || isErr(r, 'no_permission')), `ok=${r.ok} rc=${r.rowCount} err=${msg(r.err).slice(0, 60)}`)
  check('§1 ...na ujumbe wake haubadiliki (hakuna mabadiliko ya kimya)', row?.deleted_at === null)
}
{
  const r = await softDelete(B, m3)
  const row = await rawRow(m3)
  check('§1 member asiye na ruhusa hawezi kufuta ujumbe wa mwingine', (r.rowCount === 0 || isErr(r, 'forbidden')), `ok=${r.ok} rc=${r.rowCount}`)
  check('§1 ...na ujumbe umebaki kama ulivyo', row?.deleted_at === null)
}
{
  const r = await softDelete(V, m3)
  check('§1 mgeni (si mwanachama) hawezi kufuta', r.rowCount === 0 || isErr(r, 'forbidden'), `ok=${r.ok} rc=${r.rowCount}`)
  const anon = await tryAsAnon(`SELECT id FROM public.chat_messages WHERE id = $1`, [m3])
  check('§1 anon hawezi kuona ujumbe (SELECT)', !anon.ok || anon.rows.length === 0)
}
{
  const r = await tryAsUser(A, `UPDATE public.chat_messages SET text = 'imehaririwa kinyume' WHERE id = $1`, [m3])
  const row = await rawRow(m3)
  check('§1 wasio-mwandishi hawawezi kubadilisha text (UPDATE+guard)', isErr(r, 'chat_group_message_update_forbidden'), `err=${msg(r.err).slice(0, 70)}`)
  check('§1 ...text haijabadilika', row?.text === 'Ujumbe wa m3 (owner)')
}
{
  const r = await tryAsUser(A, `UPDATE public.chat_messages SET deleted_at = NULL WHERE id = $1`, [m1])
  check("§1 wasio-mwandishi hawawezi kufufua ujumbe uliofutwa ('undelete')", isErr(r, 'chat_group_message_update_forbidden'), `err=${msg(r.err).slice(0, 70)}`)
}
{
  const r = await tryAsUser(X, `UPDATE public.chat_messages SET deleted_at = NULL WHERE id = $1`, [m2])
  check('§1 hata MWANDISHI hawezi kufufua ujumbe uliofutwa (035: upande mmoja)', isErr(r, 'chat_group_message_undelete_forbidden'), `err=${msg(r.err).slice(0, 70)}`)
}
{
  const conv2 = (await asSuper(
    `INSERT INTO public.chat_conversations (type, title, created_by) VALUES ('group','SD Target',$1) RETURNING id`, [X],
  )).rows[0].id
  await asSuper(`INSERT INTO public.chat_participants (conversation_id, user_id, role, status) VALUES ($1,$2,'owner','active'),($1,$3,'member','active')`, [conv2, X, B])
  const mid = await send(X, gid, 'Ujumbe wa kuhamisha')
  const r = await tryAsUser(X, `UPDATE public.chat_messages SET conversation_id = $2 WHERE id = $1`, [mid, conv2])
  const row = await rawRow(mid)
  check('§1 mwandishi hawezi kuhamisha ujumbe kwenda mazungumzo mengine (035)', isErr(r, 'chat_group_message_update_forbidden'), `err=${msg(r.err).slice(0, 70)}`)
  check('§1 ...conversation_id haijabadilika', row?.conversation_id === gid)
  const r2 = await tryAsUser(X, `UPDATE public.chat_messages SET created_at = now() - interval '1 day' WHERE id = $1`, [mid])
  check('§1 mwandishi hawezi kughushi created_at (035)', isErr(r2, 'chat_group_message_update_forbidden'), `err=${msg(r2.err).slice(0, 70)}`)
  const r3 = await tryAsUser(X, `UPDATE public.chat_messages SET text = 'hariri halali' WHERE id = $1`, [mid])
  check('§1 regression: mwandishi anaendelea kuhariri text yake (rowCount 1)', r3.ok && r3.rowCount === 1)
}

/* ══════════════════════════════════════════════════════════════
   §1b — 035/036: invariants za ujumbe (B ya M2.1)
   ══════════════════════════════════════════════════════════════ */
{
  const mid = await send(X, gid, 'Ujumbe wa invariants')

  const rId = await tryAsUser(X, `UPDATE public.chat_messages SET id = gen_random_uuid() WHERE id = $1`, [mid])
  check('§1b mwandishi hawezi kubadilisha id ya ujumbe', isErr(rId, 'chat_group_message_update_forbidden'), `err=${msg(rId.err).slice(0, 60)}`)

  const rSender = await tryAsUser(X, `UPDATE public.chat_messages SET sender_id = $2 WHERE id = $1`, [mid, O])
  check('§1b mwandishi hawezi kubadilisha sender_id (kughushi)', isErr(rSender, 'update_forbidden') || isErr(rSender, 'row-level security'), `err=${msg(rSender.err).slice(0, 60)}`)

  /* Kikundi lengwa: announcement + slow mode 300 — jaribio la kukwepa gates kwa "move" */
  const target = (await asSuper(
    `INSERT INTO public.chat_conversations (type, title, created_by) VALUES ('group','Target ya Kukwepa',$1) RETURNING id`, [X],
  )).rows[0].id
  await asSuper(`INSERT INTO public.chat_participants (conversation_id, user_id, role, status) VALUES ($1,$2,'owner','active')`, [target, X])
  await asSuper(`INSERT INTO public.chat_group_settings (conversation_id, group_type, slow_mode_seconds, who_can_reply) VALUES ($1,'announcement',300,'admins')`, [target])
  const rMove = await tryAsUser(X, `UPDATE public.chat_messages SET conversation_id = $2 WHERE id = $1`, [mid, target])
  const inTarget = (await asSuper(`SELECT count(*)::int n FROM public.chat_messages WHERE conversation_id = $1`, [target])).rows[0].n
  check('§1b ujumbe hauwezi kuhamishwa kwenye kikundi cha announcement/slow-mode (kukwepa gates)', isErr(rMove, 'update_forbidden'), `err=${msg(rMove.err).slice(0, 60)}`)
  check('§1b ...na kikundi lengwa hakikupokea ujumbe wowote', inTarget === 0, `n=${inTarget}`)

  /* Media: ujumbe wenye media hauwezi kuhamishwa kukwepa media gate (B) */
  const mediaMsg = (await asSuper(
    `INSERT INTO public.chat_messages (conversation_id, sender_id, text, media_url, media_type)
     VALUES ($1,$2,'media','https://example.com/guard.jpg','image') RETURNING id`, [gid, X],
  )).rows[0].id
  const rMedia = await tryAsUser(X, `UPDATE public.chat_messages SET conversation_id = $2 WHERE id = $1`, [mediaMsg, target])
  check('§1b ujumbe wenye media hauwezi kuhamishwa kwenye kikundi kingine (media gate)',
    isErr(rMedia, 'update_forbidden'), `err=${msg(rMedia.err).slice(0, 60)}`)

  /* Upande mmoja kwa wote: moderator hawezi kufufua hata ujumbe uliofutwa na mwandishi */
  const authorDeleted = await softDelete(X, mid)
  check('§1b (setup) mwandishi amefuta ujumbe wake', authorDeleted.ok && authorDeleted.rowCount === 1)
  const rUn = await tryAsUser(A, `UPDATE public.chat_messages SET deleted_at = NULL WHERE id = $1`, [mid])
  check('§1b moderator hawezi kufufua ujumbe uliofutwa (upande mmoja kwa wote)',
    isErr(rUn, 'chat_group_message_undelete_forbidden') || isErr(rUn, 'update_forbidden'), `err=${msg(rUn.err).slice(0, 60)}`)
}

/* ══════════════════════════════════════════════════════════════
   §2 — DIRECT CHATS: mipaka ya washiriki + gate
   ══════════════════════════════════════════════════════════════ */
{
  const r = await tryAsUser(V,
    `INSERT INTO public.chat_messages (conversation_id, sender_id, text) VALUES ($1,$2,'mgeni anatuma')`, [did, V])
  check('§2 asiye mshiriki hawezi kutuma kwenye direct (RLS)', isErr(r, 'row-level security'), `err=${msg(r.err).slice(0, 80)}`)

  const dm = await send(O, did, 'Habari kutoka O')
  check('§2 mshiriki anaweza kutuma kwenye direct', !!dm)
  check('§2 mshiriki mwenzake anaona ujumbe', (await seenBy(X, dm)) === 1)
  check('§2 asiye mshiriki haoni ujumbe wa direct', (await seenBy(V, dm)) === 0)

  const r2 = await tryAsUser(X,
    `INSERT INTO public.chat_messages (conversation_id, sender_id, text) VALUES ($1,$2,'najifanya O')`, [did, O])
  check('§2 mtu hawezi kutuma kwa jina la mwingine (sender_id ghushi)', isErr(r2, 'row-level security'), `err=${msg(r2.err).slice(0, 80)}`)

  const rDeny = await softDelete(X, dm)
  check('§2 kwenye direct, mshiriki asiye MWANDISHI hawezi kufuta ujumbe wa mwenzake', rDeny.rowCount === 0 || isErr(rDeny, 'forbidden'), `ok=${rDeny.ok} rc=${rDeny.rowCount}`)

  const r3 = await softDelete(O, dm)
  check('§2 mshiriki anaweza soft-delete ujumbe wake kwenye direct', r3.ok && r3.rowCount === 1)
  check('§2 mshiriki mwenzake (X) HANAONI ujumbe uliofutwa kwenye direct', (await seenBy(X, dm)) === 0)
  check('§2 mwandishi (O) anaona ujumbe wake uliofutwa kwenye direct', (await seenBy(O, dm)) === 1)
}
{
  const gateSelf = await asUser(O, `SELECT public.contact_message_gate($1) AS g`, [O])
  const gateOk = await asUser(O, `SELECT public.contact_message_gate($1) AS g`, [X])
  await asSuper(`INSERT INTO public.blocks (blocker_id, blocked_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [O, V])
  const gateBlocked = await asUser(O, `SELECT public.contact_message_gate($1) AS g`, [V])
  const gateBlockedMe = await asUser(V, `SELECT public.contact_message_gate($1) AS g`, [O])
  check('§2 contact_message_gate: self → allowed=false', gateSelf.rows[0].g.allowed === false && gateSelf.rows[0].g.reason === 'self')
  check('§2 contact_message_gate: kawaida → allowed=true', gateOk.rows[0].g.allowed === true)
  check('§2 contact_message_gate: nimezuia → blocked_by_me', gateBlocked.rows[0].g.allowed === false && gateBlocked.rows[0].g.reason === 'blocked_by_me')
  check('§2 contact_message_gate: blocked-me haionyeshwi (faragha) → allowed=true', gateBlockedMe.rows[0].g.allowed === true)
}
{
  /* GAP YA AWALI (Contacts scope) — haijabadilishwa na M2; imeandikwa kwa uwazi.
     B amemzuia X; X anatuma kwenye direct iliyopo (did2) → DB inaruhusu
     (gate ni ya client; chat RLS haiangalii blocks). Ushahidi wa 10c. */
  await asSuper(`INSERT INTO public.blocks (blocker_id, blocked_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [B, X])
  const r = await tryAsUser(X,
    `INSERT INTO public.chat_messages (conversation_id, sender_id, text) VALUES ($1,$2,'natuma kwa aliyenizuia')`, [did2, X])
  check('§2 KNOWN GAP (ya awali, Contacts scope — M2 haijabadilisha): aliyekatazwa anaruhusiwa DB', r.ok, `ok=${r.ok}`)
  note('Gap ya §2 (blocked-by-counterparty kutuma DB) ni ya awali, imeorodheshwa madokezo; ' +
       'kubadilisha sheria za Contacts kunahitaji tests + maelezo maalum (uamuzi wa mmiliki).')
  const docNote = await asSuper(`SELECT true AS t`) // hakuna mabadiliko ya schema hapa
  void docNote
}

/* ── Muhtasari ──────────────────────────────────────────────── */
const failed = results.filter((r) => !r.ok)
console.log('\nMADOKEZO:')
for (const n of notes) console.log(' -', n)
console.log(`\nRESULTS: ${results.length - failed.length}/${results.length} passed`)
if (failed.length) {
  console.log('FAILED:')
  for (const f of failed) console.log(' ✗', f.name, '—', f.detail)
  process.exitCode = 1
}
await db.end()
