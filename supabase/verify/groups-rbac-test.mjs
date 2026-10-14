// ══════════════════════════════════════════════════════════════
// PASIHAI — ChatHai Groups M2: RBAC test suite (§1–§5 za directive ya M2)
//
// Local Postgres 17 + Supabase shim pekee (fresh migrated DB, migration 034).
// Inathibitisha (kama `authenticated`, si superuser):
//   1   schema: role/status/permissions · NO FORCE (F1/F2) · policy sets
//   2   roles: chat_group_role / ranks
//   3   matrix ya ruhusa kwa kila kitendo (Owner/Admin/Moderator/Member/outside)
//   4   kutuma: ujumbe · media · announcement · slow mode · banned · pending
//   5   kuongeza: who_can_add · banned-guard · kikomo · self-join (join_method)
//   6   kuhariri: jina (edit_info) · created_by immutable · settings (edit_settings)
//   7   roles/umiliki: self-escalation · rank rules · owner immunity · transfer
//   8   leave/rejoin · recursion · anon · direct regression
//   9   concurrency: kikomo cha wanachama (race)
//  10   parity: JS (groupPermissions.js) ↔ DB (chat_group_can)
//
// Usage: node supabase/verify/groups-rbac-test.mjs <dbName>
import pg from 'pg'
import { groupCan, GROUP_ROLE_RANK } from '../../src/config/groupPermissions.js'

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

const O = '11111111-1111-1111-1111-111111111111'
const A = '22222222-2222-2222-2222-222222222222'
const M = '33333333-3333-3333-3333-333333333333'
const X = '44444444-4444-4444-4444-444444444444'
const Z = '55555555-5555-5555-5555-555555555555'
const W = '66666666-6666-6666-6666-666666666666'
const V = '77777777-7777-7777-7777-777777777777' // outsider kamili

/* ── Harness ────────────────────────────────────────────────── */
async function asSuperWithClaim(userId, sql, params = []) {
  await db.query('BEGIN')
  try {
    await db.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [userId || ''])
    const res = await db.query(sql, params)
    await db.query('COMMIT')
    return res
  } catch (err) { await db.query('ROLLBACK'); throw err }
}
async function asUser(userId, sql, params = []) {
  await db.query('BEGIN')
  try {
    await db.query(`SET LOCAL role authenticated`)
    await db.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [userId || ''])
    const res = await db.query(sql, params)
    await db.query('COMMIT')
    return res
  } catch (err) { await db.query('ROLLBACK'); throw err }
}
const tryAsUser = async (uid, sql, params = []) => {
  try { const r = await asUser(uid, sql, params); return { ok: true, rows: r.rows } }
  catch (e) { return { ok: false, err: e } }
}
const tryAsAnon = async (sql, params = []) => {
  try {
    await db.query('BEGIN')
    await db.query('SET LOCAL role anon')
    const r = await db.query(sql, params)
    await db.query('COMMIT')
    return { ok: true, rows: r.rows }
  } catch (e) { await db.query('ROLLBACK'); return { ok: false, err: e } }
}
const msg = (e) => String(e?.message || '')
const rlsDenied = (e) => e?.code === '42501' || /row-level security|permission denied/i.test(msg(e))

/* ── Setup ──────────────────────────────────────────────────── */
await db.query('TRUNCATE auth.users CASCADE')
await db.query('TRUNCATE public.chat_messages, public.chat_participants, public.chat_group_settings, public.chat_conversations CASCADE')
for (const [id, name] of [[O, 'owner'], [A, 'admin'], [M, 'moderator'], [X, 'member'], [Z, 'ziel'], [W, 'wema'], [V, 'visitor']]) {
  await db.query(
    `INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1,$2,$3)`,
    [id, `${name}@local.test`, JSON.stringify({ username: name, display_name: name })],
  )
}

async function makeGroup(title, settings = {}, members = []) {
  const conv = await asSuperWithClaim(O, `INSERT INTO public.chat_conversations (type, title, created_by)
    VALUES ('group', $1, $2) RETURNING id`, [title, O])
  const id = conv.rows[0].id
  await asSuperWithClaim(O, `INSERT INTO public.chat_group_settings
    (conversation_id, group_type, privacy, join_method, who_can_add, who_can_reply, who_can_react, announcement_senders, slow_mode_seconds, member_limit)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [
    id, settings.type || 'normal', settings.privacy || 'private', settings.join || 'request',
    settings.whoAdd || 'owner_admins', settings.whoReply || 'all', settings.whoReact || 'all',
    settings.ann || 'owner_admins', settings.slow ?? 0, settings.limit ?? 1024,
  ])
  for (const [uid, role] of members) {
    await asSuperWithClaim(O, `INSERT INTO public.chat_participants (conversation_id, user_id, role, status)
      VALUES ($1,$2,$3,'active')`, [id, uid, role])
  }
  return id
}

const G1 = await makeGroup('Kikundi G1', {}, [[O, 'owner'], [A, 'admin'], [M, 'moderator'], [X, 'member']])
const G2 = await makeGroup('Tangazo G2', { type: 'announcement', whoReply: 'admins', ann: 'owner_admins' }, [[O, 'owner'], [A, 'admin'], [X, 'member']])
const G3 = await makeGroup('Polepole G3', { slow: 300 }, [[O, 'owner'], [X, 'member']])
const G4 = await makeGroup('Wote Waongeze G4', { whoAdd: 'members' }, [[O, 'owner'], [X, 'member']])
const G5 = await makeGroup('Kikomo G5', { limit: 2 }, [[O, 'owner']])
const G6 = await makeGroup('Race G6', { limit: 2 }, [[O, 'owner']])
const G7 = await makeGroup('Wazi G7', { join: 'direct', privacy: 'public' }, [[O, 'owner']])
const G8 = await makeGroup('Reacts G8', { whoReact: 'admins', whoAdd: 'owner' }, [[O, 'owner'], [M, 'moderator'], [X, 'member']])
const G9 = await makeGroup('Tangazo la Owner G9', { type: 'announcement', ann: 'owner', whoReply: 'all' }, [[O, 'owner'], [A, 'admin'], [X, 'member']])
const G11 = await makeGroup('Mwaliko G11', { join: 'invite' }, [[O, 'owner']])
const G12 = await makeGroup('Direct-Private G12', { join: 'direct', privacy: 'private' }, [[O, 'owner']])
const D1 = (await asSuperWithClaim(O, `INSERT INTO public.chat_conversations (type, title, created_by)
  VALUES ('direct', NULL, $1) RETURNING id`, [O])).rows[0].id
await asSuperWithClaim(O, `INSERT INTO public.chat_participants (conversation_id, user_id, role) VALUES ($1,$2,'member'),($1,$3,'member')`, [D1, O, X])

/* ── 1. Schema & F1/F2 ─────────────────────────────────────── */
{
  const cols = await db.query(`SELECT column_name FROM information_schema.columns
    WHERE table_name='chat_participants' AND column_name IN ('role','status','permissions')`)
  check('schema: chat_participants ina role/status/permissions', cols.rows.length === 3, cols.rows.map(r => r.column_name).join(','))
  const force = await db.query(`SELECT relname, relforcerowsecurity FROM pg_class
    WHERE relname IN ('chat_conversations','chat_participants','chat_messages','chat_group_settings') ORDER BY 1`)
  const anyForce = force.rows.filter(r => r.relforcerowsecurity)
  check('F1/F2: NO FORCE kwenye chat_conversations/participants/messages (definer helpers zinafanya kazi)',
    anyForce.length === 0, JSON.stringify(force.rows))
  const pol = await db.query(`SELECT tablename, string_agg(policyname, ',' ORDER BY policyname) names
    FROM pg_policies WHERE schemaname='public' AND tablename LIKE 'chat%' GROUP BY tablename ORDER BY tablename`)
  const sets = Object.fromEntries(pol.rows.map(r => [r.tablename, r.names]))
  check('policies: conversations = majina 4 ya awali (hayajabadilika)',
    sets.chat_conversations === 'conversations_delete_creator,conversations_insert_auth,conversations_select_participant,conversations_update_participant',
    sets.chat_conversations)
  check('policies: participants = 6 (4 za awali + insert_permitted + update_manage)',
    sets.chat_participants === 'participants_delete_own,participants_insert_creator,participants_insert_permitted,participants_select_participant,participants_update_manage,participants_update_own',
    sets.chat_participants)
  check('policies: messages = 5 (+ messages_update_moderate)',
    sets.chat_messages === 'messages_delete_sender,messages_insert_participant,messages_select_participant,messages_update_moderate,messages_update_sender',
    sets.chat_messages)
  const grantsOk = await db.query(`SELECT bool_and(has_function_privilege('authenticated', p.oid, 'EXECUTE')) ok
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('chat_group_can','chat_group_role','chat_group_slow_mode_ok','chat_group_add_member','chat_group_join','chat_group_transfer_ownership','chat_group_leave','chat_group_set_member')`)
  const anonNo = await db.query(`SELECT has_function_privilege('anon', 'public.chat_group_can(uuid,uuid,text)', 'EXECUTE') ok`)
  check('grants: helpers/RPC kwa authenticated pekee (anon hana EXECUTE)',
    grantsOk.rows[0].ok === true && anonNo.rows[0].ok === false)
}

/* ── 2. Roles ──────────────────────────────────────────────── */
{
  const r = await db.query(`SELECT public.chat_group_role($1, u) role, u FROM unnest(ARRAY[$2,$3,$4,$5,$6]::uuid[]) u`, [G1, O, A, M, X, Z])
  const map = Object.fromEntries(r.rows.map(x => [x.u, x.role]))
  check('roles: G1 inatambua owner/admin/moderator/member (Z = si mwanachama)',
    map[O] === 'owner' && map[A] === 'admin' && map[M] === 'moderator' && map[X] === 'member' && map[Z] === null,
    JSON.stringify({ o: map[O], a: map[A], m: map[M], x: map[X], z: map[Z] }))
  const ranks = await db.query(`SELECT public.chat_group_role_rank('owner') o, public.chat_group_role_rank('admin') a,
    public.chat_group_role_rank('moderator') m, public.chat_group_role_rank('member') mm, public.chat_group_role_rank(NULL) n`)
  check('ranks: owner>admin>moderator>member>0',
    ranks.rows[0].o === 4 && ranks.rows[0].a === 3 && ranks.rows[0].m === 2 && ranks.rows[0].mm === 1 && ranks.rows[0].n === 0)
}

/* ── 3. can() spot matrix ──────────────────────────────────── */
{
  const can = async (conv, uid, action) =>
    (await db.query(`SELECT public.chat_group_can($1,$2,$3) c`, [conv, uid, action])).rows[0].c
  const cases = [
    [G1, X, 'read_messages', true], [G1, Z, 'read_messages', false],
    [G2, X, 'send_message', false], [G2, A, 'send_message', true], [G9, A, 'send_message', false],
    [G1, X, 'manage_roles', false], [G1, A, 'manage_roles', true],
    [G1, M, 'restrict_members', true], [G1, X, 'restrict_members', false],
    [G8, X, 'react_to_message', false], [G8, M, 'react_to_message', false],
    [G8, X, 'add_member', false], [G4, X, 'add_member', true],
  ]
  let okAll = true; const bad = []
  for (const [c, u, a, exp] of cases) {
    const got = await can(c, u, a)
    if (got !== exp) { okAll = false; bad.push(`${a}:${got}`) }
  }
  check('can(): matrix ya vitendo inalingana (13 spot cases)', okAll, bad.join(' '))
}

/* ── 4. Kutuma ─────────────────────────────────────────────── */
{
  const m1 = await tryAsUser(X, `INSERT INTO chat_messages (conversation_id, sender_id, text) VALUES ($1,$2,'habari')`, [G1, X])
  check('send: member anaweza kutuma G1', m1.ok, msg(m1.err))
  const z1 = await tryAsUser(Z, `INSERT INTO chat_messages (conversation_id, sender_id, text) VALUES ($1,$2,'nje')`, [G1, Z])
  check('send: asiye mwanachama (Z) anakataliwa G1', !z1.ok && rlsDenied(z1.err), z1.err?.code)
  const x2 = await tryAsUser(X, `INSERT INTO chat_messages (conversation_id, sender_id, text) VALUES ($1,$2,'t')`, [G2, X])
  check('send: member HAWEZI kutuma kwenye matangazo (G2)', !x2.ok && rlsDenied(x2.err), x2.err?.code)
  const a2 = await tryAsUser(A, `INSERT INTO chat_messages (conversation_id, sender_id, text) VALUES ($1,$2,'tangazo')`, [G2, A])
  check('send: admin anaweza kutuma matangazo (G2)', a2.ok, msg(a2.err))
  const a9 = await tryAsUser(A, `INSERT INTO chat_messages (conversation_id, sender_id, text) VALUES ($1,$2,'t')`, [G9, A])
  check('send: announcement_senders=owner → admin hana ruhusa (G9)', !a9.ok && rlsDenied(a9.err), a9.err?.code)
  const o9 = await tryAsUser(O, `INSERT INTO chat_messages (conversation_id, sender_id, text) VALUES ($1,$2,'tangazo la mmiliki')`, [G9, O])
  check('send: owner anatuma matangazo ya G9', o9.ok, msg(o9.err))

  const med1 = await tryAsUser(X, `INSERT INTO chat_messages (conversation_id, sender_id, media_url, media_type) VALUES ($1,$2,'https://example.test/x.png','image')`, [G1, X])
  check('media: member anatuma media G1', med1.ok, msg(med1.err))
  const med2 = await tryAsUser(X, `INSERT INTO chat_messages (conversation_id, sender_id, media_url, media_type) VALUES ($1,$2,'https://example.test/x.png','image')`, [G2, X])
  check('media: member hakuna media kwenye matangazo (G2)', !med2.ok && rlsDenied(med2.err), med2.err?.code)

  const ban = await tryAsUser(M, `UPDATE chat_participants SET status='banned' WHERE conversation_id=$1 AND user_id=$2`, [G1, X])
  check('ban: moderator anaweza kumzuia member (G1)', ban.ok, msg(ban.err))
  const banSend = await tryAsUser(X, `INSERT INTO chat_messages (conversation_id, sender_id, text) VALUES ($1,$2,'banned')`, [G1, X])
  const banRead = await tryAsUser(X, `SELECT count(*)::int n FROM chat_messages WHERE conversation_id=$1`, [G1])
  check('ban: banned HAWEZI kutuma wala kusoma (G1)', !banSend.ok && banRead.rows[0].n === 0,
    `${banSend.err?.code} · read=${banRead.rows?.[0]?.n}`)
  const unban = await tryAsUser(A, `SELECT public.chat_group_set_member($1,$2,NULL,'active')`, [G1, X])
  check('ban: unban kwa manage_members (A) inafanikiwa', unban.ok, msg(unban.err))

  const slow1 = await tryAsUser(X, `INSERT INTO chat_messages (conversation_id, sender_id, text) VALUES ($1,$2,'1')`, [G3, X])
  const slow2 = await tryAsUser(X, `INSERT INTO chat_messages (conversation_id, sender_id, text) VALUES ($1,$2,'2')`, [G3, X])
  check('slow mode: ujumbe wa pili papo hapo unakataliwa (G3: 300s)', slow1.ok && !slow2.ok && rlsDenied(slow2.err),
    `1:${slow1.ok} 2:${slow2.err?.code}`)
  await db.query(`UPDATE chat_messages SET created_at = now() - interval '400 seconds' WHERE conversation_id=$1 AND sender_id=$2`, [G3, X])
  const slow3 = await tryAsUser(X, `INSERT INTO chat_messages (conversation_id, sender_id, text) VALUES ($1,$2,'3')`, [G3, X])
  check('slow mode: baada ya muda kupita, inaruhusiwa', slow3.ok, msg(slow3.err))
  const oSlow = await tryAsUser(O, `INSERT INTO chat_messages (conversation_id, sender_id, text) VALUES ($1,$2,'owner')`, [G3, O])
  check('slow mode: owner/haikubaniwi (leadership exempt)', oSlow.ok, msg(oSlow.err))

  const wJoin = await tryAsUser(W, `SELECT public.chat_group_join($1) j`, [G2])
  const wSend = await tryAsUser(W, `INSERT INTO chat_messages (conversation_id, sender_id, text) VALUES ($1,$2,'pending')`, [G2, W])
  const wRead = await tryAsUser(W, `SELECT count(*)::int n FROM chat_messages WHERE conversation_id=$1`, [G2])
  check('pending: aliyeomba kujiunga HAWEZI kutuma wala kusoma', wJoin.ok && wJoin.rows[0].j.status === 'pending' && !wSend.ok && wRead.rows[0].n === 0,
    `${wJoin.rows?.[0]?.j?.status} · send=${wSend.err?.code} · read=${wRead.rows?.[0]?.n}`)

  const rec = await tryAsUser(X, `SELECT count(*)::int n FROM chat_conversations WHERE id=$1`, [G1])
  check('recursion: X anasoma conversation yake bila recursion error', rec.ok && rec.rows[0].n === 1, msg(rec.err))
}

/* ── 5. Kuongeza wanachama ─────────────────────────────────── */
{
  const xAdd = await tryAsUser(X, `SELECT public.chat_group_add_member($1,$2)`, [G1, Z])
  check('add: member HAWEZI kuongeza (who_can_add=owner_admins)', !xAdd.ok && msg(xAdd.err).includes('chat_group_no_permission_add'), msg(xAdd.err))
  const aAdd = await tryAsUser(A, `SELECT public.chat_group_add_member($1,$2)`, [G1, Z])
  const zRead = await tryAsUser(Z, `SELECT count(*)::int n FROM chat_conversations WHERE id=$1`, [G1])
  check('add: admin anaongeza Z; Z anaona kikundi (active)', aAdd.ok && zRead.rows[0].n === 1, msg(aAdd.err))
  const aAdd2 = await tryAsUser(A, `SELECT public.chat_group_add_member($1,$2)`, [G1, Z])
  check('add: kurudia → already_member', !aAdd2.ok && msg(aAdd2.err).includes('chat_group_already_member'), msg(aAdd2.err))
  const bannedSet = await tryAsUser(A, `SELECT public.chat_group_set_member($1,$2,NULL,'banned')`, [G1, Z])
  const addBanned = await tryAsUser(A, `SELECT public.chat_group_add_member($1,$2)`, [G1, Z])
  check('add: banned hawezi kuongezwa (unban kwanza)', bannedSet.ok && !addBanned.ok && msg(addBanned.err).includes('chat_group_banned'), msg(addBanned.err))
  const unb = await tryAsUser(A, `SELECT public.chat_group_set_member($1,$2,NULL,'active')`, [G1, Z])
  check('add: unban (manage_members) → active', unb.ok, msg(unb.err))
  const xAdd4 = await tryAsUser(X, `SELECT public.chat_group_add_member($1,$2)`, [G4, Z])
  check('add: who_can_add=members → member anaongeza (G4)', xAdd4.ok, msg(xAdd4.err))
  const o5 = await tryAsUser(O, `SELECT public.chat_group_add_member($1,$2)`, [G5, Z])
  const o5b = await tryAsUser(O, `SELECT public.chat_group_add_member($1,$2)`, [G5, W])
  check('limit: add #2 inafanikiwa; #3 (kikomo 2) inakataliwa', o5.ok && !o5b.ok && msg(o5b.err).includes('chat_group_member_limit'),
    `${o5.ok} · ${msg(o5b.err).slice(0, 60)}`)
  const zJoin = await tryAsUser(Z, `SELECT public.chat_group_join($1) j`, [G7])
  const zJoin2 = await tryAsUser(Z, `SELECT public.chat_group_join($1)`, [G7])
  check('self-join: direct+public → active; kurudia → already_member',
    zJoin.ok && zJoin.rows[0].j.status === 'active' && !zJoin2.ok && msg(zJoin2.err).includes('chat_group_already_member'), msg(zJoin.err))
  const zBan7 = await tryAsUser(O, `SELECT public.chat_group_set_member($1,$2,NULL,'banned')`, [G7, Z])
  const zJoin3 = await tryAsUser(Z, `SELECT public.chat_group_join($1)`, [G7])
  check('self-join: banned hawezi kujiunga tena', zBan7.ok && !zJoin3.ok && msg(zJoin3.err).includes('chat_group_banned'), msg(zJoin3.err))
  const zJoin11 = await tryAsUser(Z, `SELECT public.chat_group_join($1)`, [G11])
  check('self-join: invite → invite_required (M3 itaongeza tokens)', !zJoin11.ok && msg(zJoin11.err).includes('chat_group_invite_required'), msg(zJoin11.err))
  const zJoin12 = await tryAsUser(Z, `SELECT public.chat_group_join($1)`, [G12])
  check('self-join: direct+private → join_restricted', !zJoin12.ok && msg(zJoin12.err).includes('chat_group_join_restricted'), msg(zJoin12.err))
}

/* ── 6. Kuhariri (jina · created_by · settings · storage) ──── */
{
  const xTitle = await tryAsUser(X, `UPDATE chat_conversations SET title='Jina la X' WHERE id=$1`, [G1])
  check('edit_info: member HAWEZI kubadilisha jina', !xTitle.ok && msg(xTitle.err).includes('chat_group_no_permission_edit_info'), msg(xTitle.err))
  const aTitle = await tryAsUser(A, `UPDATE chat_conversations SET title='Jina jipya' WHERE id=$1`, [G1])
  check('edit_info: admin anaweza kubadilisha jina', aTitle.ok, msg(aTitle.err))
  const steal = await tryAsUser(A, `UPDATE chat_conversations SET created_by=$2 WHERE id=$1`, [G1, A])
  check('immutable: created_by haiwezi kuibiwa', !steal.ok && msg(steal.err).includes('chat_group_conversation_immutable'), msg(steal.err))
  // RLS ya UPDATE: rows zisizoonekana zinaskipwa kimya (rowcount 0) — si error.
  const xSet = await tryAsUser(X, `UPDATE chat_group_settings SET who_can_reply='admins' WHERE conversation_id=$1 RETURNING conversation_id`, [G1])
  const aSet = await tryAsUser(A, `UPDATE chat_group_settings SET who_can_reply='admins' WHERE conversation_id=$1 RETURNING conversation_id`, [G1])
  const mSet = await tryAsUser(M, `UPDATE chat_group_settings SET who_can_reply='all' WHERE conversation_id=$1 RETURNING conversation_id`, [G1])
  check('settings: member na moderator hawabadilishi (rowcount 0); admin anabadilisha (edit_settings)',
    xSet.ok && xSet.rows.length === 0 && aSet.ok && aSet.rows.length === 1 && mSet.ok && mSet.rows.length === 0,
    `x=${xSet.rows?.length} a=${aSet.rows?.length} m=${mSet.rows?.length}`)
  await tryAsUser(A, `UPDATE chat_group_settings SET who_can_reply='all' WHERE conversation_id=$1`, [G1])

  const narrow = await tryAsUser(O, `SELECT public.chat_group_set_member($1,$2,NULL,NULL,$3::jsonb)`, [G1, A, JSON.stringify(['moderate_messages'])])
  const aTitle2 = await tryAsUser(A, `UPDATE chat_conversations SET title='Jina la A' WHERE id=$1`, [G1])
  const aMod = await tryAsUser(X, `INSERT INTO chat_messages (conversation_id, sender_id, text) VALUES ($1,$2,'futa')`, [G1, X])
  const aModRow = aMod.ok ? (await db.query(`SELECT id FROM chat_messages WHERE conversation_id=$1 AND sender_id=$2 ORDER BY created_at DESC LIMIT 1`, [G1, X])).rows[0] : null
  const aModDel = aModRow ? await tryAsUser(A, `UPDATE chat_messages SET deleted_at=now() WHERE id=$1`, [aModRow.id]) : { ok: false }
  check('grants: A akiwa na [moderate_messages] pekee — hahariri jina, LAKINI anafuta ujumbe',
    narrow.ok && !aTitle2.ok && aModDel.ok, `narrow=${narrow.ok} title=${aTitle2.err?.code} modOk=${aModDel.ok}`)
  const restore = await tryAsUser(O, `SELECT public.chat_group_set_member($1,$2,NULL,NULL,'null'::jsonb)`, [G1, A])
  const aTitle3 = await tryAsUser(A, `UPDATE chat_conversations SET title='Jina la A' WHERE id=$1`, [G1])
  check('grants: kurudisha defaults (jsonb null) → A anarudi na ruhusa', restore.ok && aTitle3.ok, msg(restore.err))

  const stOwn = await db.query(`INSERT INTO storage.objects (bucket_id, name) VALUES ('group-media', $1||'/dp-1.png')`, [G1])
  const stX = await tryAsUser(X, `SELECT count(*)::int n FROM storage.objects WHERE bucket_id='group-media' AND name LIKE $1`, [G1 + '/%'])
  const stW = await tryAsUser(W, `SELECT count(*)::int n FROM storage.objects WHERE bucket_id='group-media' AND name LIKE $1`, [G2 + '/%'])
  const stInsA = await tryAsUser(A, `INSERT INTO storage.objects (bucket_id, name) VALUES ('group-media', $1||'/dp-2.png')`, [G1])
  const stInsX = await tryAsUser(X, `INSERT INTO storage.objects (bucket_id, name) VALUES ('group-media', $1||'/dp-3.png')`, [G1])
  check('storage: member active anaona; pending haoni; admin anaandika; member haandiki',
    stOwn && stX.rows[0].n === 1 && stW.rows[0].n === 0 && stInsA.ok && !stInsX.ok,
    `x=${stX.rows?.[0]?.n} w=${stW.rows?.[0]?.n} insA=${stInsA.ok} insX=${stInsX.err?.code}`)
}

/* ── 7. Roles & umiliki ────────────────────────────────────── */
{
  const selfRole = await tryAsUser(X, `UPDATE chat_participants SET role='owner' WHERE conversation_id=$1 AND user_id=$2`, [G1, X])
  check('escalation: member HAWEZI kujipa owner (direct UPDATE)', !selfRole.ok && msg(selfRole.err).includes('chat_group_owner_immutable'), msg(selfRole.err))
  const selfRole2 = await tryAsUser(X, `UPDATE chat_participants SET role='moderator' WHERE conversation_id=$1 AND user_id=$2`, [G1, X])
  check('escalation: member HAWEZI kujipa moderator', !selfRole2.ok && msg(selfRole2.err).includes('chat_group_self_role_change_forbidden'), msg(selfRole2.err))
  const move = await tryAsUser(X, `UPDATE chat_participants SET conversation_id=$3 WHERE conversation_id=$1 AND user_id=$2`, [G1, X, G2])
  check('escalation: member HAWEZI kuhamisha row yake kwenye kikundi kingine', !move.ok && msg(move.err).includes('chat_group_participant_keys_immutable'), msg(move.err))
  const selfRpc = await tryAsUser(X, `SELECT public.chat_group_set_member($1,$2,'admin')`, [G1, X])
  check('escalation: RPC ya set_member juu ya nafsi inakataliwa', !selfRpc.ok && msg(selfRpc.err).includes('chat_group_self_edit_forbidden'), msg(selfRpc.err))

  const oPromote = await tryAsUser(O, `SELECT public.chat_group_set_member($1,$2,'moderator')`, [G1, X])
  const aPromote = await tryAsUser(A, `SELECT public.chat_group_set_member($1,$2,'admin')`, [G1, X])
  const mDemote = await tryAsUser(M, `SELECT public.chat_group_set_member($1,$2,'member')`, [G1, X])
  check('rank: owner anapandisha X→moderator; admin hawezi kumpa admin; moderator hana rank ya kutosha',
    oPromote.ok && !aPromote.ok && msg(aPromote.err).includes('chat_group_cannot_grant_equal_or_higher') && !mDemote.ok && msg(mDemote.err).includes('chat_group_insufficient_rank'),
    `${oPromote.ok} · ${msg(aPromote.err).slice(0, 40)} · ${msg(mDemote.err).slice(0, 40)}`)
  const demote = await tryAsUser(O, `SELECT public.chat_group_set_member($1,$2,'member')`, [G1, X])
  const mBanX = await tryAsUser(M, `SELECT public.chat_group_set_member($1,$2,NULL,'banned')`, [G1, X])
  const unbanX = await tryAsUser(A, `SELECT public.chat_group_set_member($1,$2,NULL,'active')`, [G1, X])
  check('moderator: anaweza ban member; admin anarudisha (unban)', demote.ok && mBanX.ok && unbanX.ok, `${mBanX.ok}/${unbanX.ok}`)
  const aBanO = await tryAsUser(A, `SELECT public.chat_group_set_member($1,$2,NULL,'banned')`, [G1, O])
  check('owner immunity: admin HAWEZI kumzuia owner', !aBanO.ok && msg(aBanO.err).includes('chat_group_owner_immutable'), msg(aBanO.err))
  const oDemoteSelf = await tryAsUser(O, `SELECT public.chat_group_set_member($1,$2,'admin')`, [G1, O])
  check('owner immunity: owner hawezi kujishusha mwenyewe', !oDemoteSelf.ok && msg(oDemoteSelf.err).includes('chat_group_self_edit_forbidden'), msg(oDemoteSelf.err))

  const tr1 = await tryAsUser(O, `SELECT public.chat_group_transfer_ownership($1,$2) t`, [G1, A])
  const roles1 = await db.query(`SELECT user_id, role FROM chat_participants WHERE conversation_id=$1 AND user_id IN ($2,$3)`, [G1, O, A])
  const rmap = Object.fromEntries(roles1.rows.map(r => [r.user_id, r.role]))
  check('transfer: O→A ni atomic (A=owner, O=admin)', tr1.ok && rmap[A] === 'owner' && rmap[O] === 'admin', JSON.stringify(rmap))
  const trOld = await tryAsUser(O, `SELECT public.chat_group_transfer_ownership($1,$2)`, [G1, M])
  check('transfer: asiye owner hawezi kuhamisha (owner_only)', !trOld.ok && msg(trOld.err).includes('chat_group_owner_only'), msg(trOld.err))
  const trBack = await tryAsUser(A, `SELECT public.chat_group_transfer_ownership($1,$2)`, [G1, O])
  const trSelf = await tryAsUser(O, `SELECT public.chat_group_transfer_ownership($1,$2)`, [G1, O])
  const trOut = await tryAsUser(O, `SELECT public.chat_group_transfer_ownership($1,$2)`, [G1, V])
  check('transfer: A→O inarudi; self na asiye mwanachama wanakataliwa',
    trBack.ok && !trSelf.ok && msg(trSelf.err).includes('chat_group_transfer_self') && !trOut.ok && msg(trOut.err).includes('chat_group_transfer_invalid_target'),
    `${trBack.ok} · ${msg(trSelf.err).slice(0, 30)} · ${msg(trOut.err).slice(0, 30)}`)
}

/* ── 8. Leave & rejoin ─────────────────────────────────────── */
{
  const leave = await tryAsUser(X, `SELECT public.chat_group_leave($1)`, [G1])
  const after = await tryAsUser(X, `SELECT count(*)::int n FROM chat_messages WHERE conversation_id=$1`, [G1])
  const rejoin = await tryAsUser(X, `SELECT public.chat_group_join($1) j`, [G1])
  const approve = await tryAsUser(A, `SELECT public.chat_group_set_member($1,$2,NULL,'active')`, [G1, X])
  const send = await tryAsUser(X, `INSERT INTO chat_messages (conversation_id, sender_id, text) VALUES ($1,$2,'nimerudi')`, [G1, X])
  check('leave: X anaondoka (left) → haoni; rejoin (request=pending) → approve → anatuma',
    leave.ok && after.rows[0].n === 0 && rejoin.ok && rejoin.rows[0].j.status === 'pending' && approve.ok && send.ok,
    `left=${after.rows?.[0]?.n} rejoin=${rejoin.rows?.[0]?.j?.status} send=${send.ok}`)
  const oLeave = await tryAsUser(O, `SELECT public.chat_group_leave($1)`, [G1])
  check('leave: owner HAWEZI kuondoka bila transfer (M11 itaongeza flow)', !oLeave.ok && msg(oLeave.err).includes('chat_group_owner_must_transfer'), msg(oLeave.err))
}

/* ── 9. Direct · anon · concurrency ────────────────────────── */
{
  const dSend = await tryAsUser(X, `INSERT INTO chat_messages (conversation_id, sender_id, text) VALUES ($1,$2,'direct')`, [D1, X])
  const dOut = await tryAsUser(Z, `INSERT INTO chat_messages (conversation_id, sender_id, text) VALUES ($1,$2,'nje')`, [D1, Z])
  const dRead = await tryAsUser(X, `UPDATE chat_participants SET last_read_at=now() WHERE conversation_id=$1 AND user_id=$2`, [D1, X])
  check('direct: mshiriki anatuma & anasoma (last_read_at) — hakuna mgogoro na roles',
    dSend.ok && !dOut.ok && dRead.ok, `send=${dSend.ok} out=${dOut.err?.code} lastread=${dRead.ok}`)
  const anon = await tryAsAnon(`SELECT count(*)::int n FROM chat_conversations`)
  check('anon: haoni conversations (RLS)', anon.ok && anon.rows[0].n === 0, `${anon.rows?.[0]?.n}`)
}

/* ── 10. Concurrency (kikomo) ──────────────────────────────── */
{
  const c1 = new pg.Client({ host: HOST, port: PORT, user: 'postgres', database: dbName })
  const c2 = new pg.Client({ host: HOST, port: PORT, user: 'postgres', database: dbName })
  await c1.connect(); await c2.connect()
  let err1 = null; let err2 = null
  await c1.query('BEGIN')
  await c1.query(`INSERT INTO chat_participants (conversation_id, user_id, role, status) VALUES ($1,$2,'member','active')`, [G6, Z])
  const p2 = (async () => {
    await c2.query('BEGIN')
    await c2.query(`INSERT INTO chat_participants (conversation_id, user_id, role, status) VALUES ($1,$2,'member','active')`, [G6, W])
  })()
  await new Promise((r) => setTimeout(r, 400)) // c2 inasubiri lock ya conversation
  await c1.query('COMMIT')
  try { await p2; await c2.query('COMMIT') } catch (e) { err2 = e; await c2.query('ROLLBACK') }
  const count = await db.query(`SELECT count(*)::int n FROM chat_participants WHERE conversation_id=$1 AND status='active'`, [G6])
  check('concurrency: mbio za add mbili → mmoja anafaulu, kikomo hakivukwi (FOR UPDATE)',
    count.rows[0].n === 2 && !!err2 && msg(err2).includes('chat_group_member_limit'),
    `active=${count.rows[0].n} · err2=${msg(err2).slice(0, 60)} err1=${err1}`)
  await c1.end(); await c2.end()
}

/* ── 11. Parity: JS ↔ DB ───────────────────────────────────── */
{
  const ACTIONS = [
    'read_messages', 'send_message', 'send_media', 'react_to_message', 'add_member',
    'edit_info', 'edit_settings', 'manage_photo', 'moderate_messages', 'restrict_members',
    'manage_members', 'manage_roles', 'transfer_ownership', 'delete_group',
  ]
  const groups = [
    { id: G1, kind: 'group', groupType: 'normal', settings: { whoCanAdd: 'owner_admins', whoCanReply: 'all', whoCanReact: 'all', announcementSenders: 'owner_admins' } },
    { id: G2, kind: 'group', groupType: 'announcement', settings: { whoCanAdd: 'owner_admins', whoCanReply: 'admins', whoCanReact: 'all', announcementSenders: 'owner_admins' } },
    { id: G8, kind: 'group', groupType: 'normal', settings: { whoCanAdd: 'owner', whoCanReply: 'all', whoCanReact: 'admins', announcementSenders: 'owner_admins' } },
    { id: G9, kind: 'group', groupType: 'announcement', settings: { whoCanAdd: 'owner_admins', whoCanReply: 'all', whoCanReact: 'all', announcementSenders: 'owner' } },
  ]
  const users = [O, A, M, X, Z]
  let total = 0; let mismatch = 0; const samples = []
  const compare = async (g, uid, row) => {
    for (const action of ACTIONS) {
      total += 1
      const dbr = (await db.query(`SELECT public.chat_group_can($1,$2,$3) c`, [g.id, uid, action])).rows[0].c
      const js = groupCan({
        role: row?.role ?? null,
        status: row?.status ?? 'active',
        kind: g.kind,
        groupType: g.groupType,
        settings: g.settings,
        permissions: row?.permissions ?? null,
        action,
      })
      if (dbr !== js) { mismatch += 1; if (samples.length < 5) samples.push(`${action}/${row?.role}=${dbr}vs${js}`) }
    }
  }
  for (const g of groups) {
    for (const uid of users) {
      const row = (await db.query(`SELECT role, status, permissions FROM chat_participants WHERE conversation_id=$1 AND user_id=$2`, [g.id, uid])).rows[0] || null
      await compare(g, uid, row)
    }
  }
  // Grants halisi zilizohifadhiwa (si simulation): A = ['moderate_messages'] kwenye G1.
  await tryAsUser(O, `SELECT public.chat_group_set_member($1,$2,NULL,NULL,$3::jsonb)`, [G1, A, JSON.stringify(['moderate_messages'])])
  {
    const row = (await db.query(`SELECT role, status, permissions FROM chat_participants WHERE conversation_id=$1 AND user_id=$2`, [G1, A])).rows[0]
    await compare(groups[0], A, row)
  }
  await tryAsUser(O, `SELECT public.chat_group_set_member($1,$2,NULL,NULL,'null'::jsonb)`, [G1, A])
  // Direct conversation parity
  const dRow = (await db.query(`SELECT role, status FROM chat_participants WHERE conversation_id=$1 AND user_id=$2`, [D1, X])).rows[0]
  for (const action of ACTIONS) {
    total += 1
    const dbr = (await db.query(`SELECT public.chat_group_can($1,$2,$3) c`, [D1, X, action])).rows[0].c
    const js = groupCan({ role: dRow.role, status: dRow.status, kind: 'direct', groupType: 'normal', settings: null, action })
    if (dbr !== js) { mismatch += 1; if (samples.length < 5) samples.push(`direct/${action}=${dbr}vs${js}`) }
  }
  check(`parity: JS groupPermissions ↔ DB chat_group_can (${total} comparisons)`, mismatch === 0, `mismatches=${mismatch} ${samples.join(' ')}`)
  check('parity: ranks JS = DB', JSON.stringify(GROUP_ROLE_RANK) === JSON.stringify({ owner: 4, admin: 3, moderator: 2, member: 1 }))
}

/* ── Matokeo ───────────────────────────────────────────────── */
const failed = results.filter((r) => !r.ok)
console.log(`\nRESULTS: ${results.length - failed.length}/${results.length} passed`)
if (notes.length) { console.log('\nMADOKEZO:'); for (const n of notes) console.log(' -', n) }
if (failed.length) {
  console.log('\nZILIZOFELI:')
  for (const f of failed) console.log(' ✗', f.name, '—', f.detail)
}
await db.end()
process.exit(failed.length ? 1 : 0)
