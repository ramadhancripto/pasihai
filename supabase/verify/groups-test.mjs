// ══════════════════════════════════════════════════════════════
// PASIHAI — ChatHai Groups M1: settings · roles/status · kikomo (§5–§7, §53–§54)
//
// Local Postgres 17 + Supabase shim pekee (fresh migrated DB, migration 033).
// Inathibitisha:
//   1  config ya JS (groupLimits.js) inalingana na jedwali la DB
//   2  schema: chat_group_settings + chat_participants.role/status
//   3  constraints: aina · faragha · kikomo (CHECK za DB)
//   4  muundaji anaweza kuunda (settings INSERT kwa RLS)
//   5  non-member haoni settings · anon haoni (RLS)
//   6  non-owner hawezi kuhariri (RLS)
//   7  kikomo cha wanachama kinazuia kwenye DB (trigger ya backend)
//   8  banned/left hawahesabiki; reactivation inahakikiwa
//   9  Direct conversations haziguswi na trigger
//  10  storage bucket 'group-media' (private) + policies 4
//  11  helpers: chat_safe_uuid · is_chat_group_owner
//  12  regression: RLS ya chat ya awali haijabadilika
//
// Usage: node supabase/verify/groups-test.mjs <dbName>
import pg from 'pg'
import { GROUP_MEMBER_LIMITS } from '../../src/config/groupLimits.js'

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
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + String(detail).slice(0, 170) : ''}`)
}
const note = (msg) => { notes.push(msg); console.log(`NOTE  ${msg}`) }

const db = new pg.Client({ host: HOST, port: PORT, user: 'postgres', database: dbName })
await db.connect()

const A = 'a1111111-1111-1111-1111-111111111111' // Owner
const B = 'b2222222-2222-2222-2222-222222222222' // Member
const C = 'c3333333-3333-3333-3333-333333333333' // Aliyebanwa / member wa tatu
const D = 'd4444444-4444-4444-4444-444444444444' // Mwingine (test ya kikomo)

/* ── Setup ─────────────────────────────────────────────────── */
await db.query('TRUNCATE auth.users CASCADE')
for (const [id, name] of [[A, 'anna'], [B, 'bora'], [C, 'chidi'], [D, 'doto']]) {
  await db.query(
    `INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1,$2,$3)`,
    [id, `${name}@local.test`, JSON.stringify({ username: name, display_name: name })],
  )
}
const g1 = (await db.query(
  `INSERT INTO public.chat_conversations (type, title, created_by) VALUES ('group','Kikundi cha M1',$1) RETURNING id`,
  [A],
)).rows[0].id
const dm = (await db.query(
  `INSERT INTO public.chat_conversations (type, created_by) VALUES ('direct',$1) RETURNING id`,
  [A],
)).rows[0].id

/** Fanya query kama mtumiaji aliyeingia (role authenticated + JWT sub). */
async function asUser(userId, sql, params = []) {
  await db.query('BEGIN')
  try {
    await db.query(`SET LOCAL role authenticated`)
    await db.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [userId || ''])
    const res = await db.query(sql, params)
    await db.query('COMMIT')
    return res
  } catch (err) {
    await db.query('ROLLBACK')
    throw err
  }
}
async function asAnon(sql, params = []) {
  await db.query('BEGIN')
  try {
    await db.query(`SET LOCAL role anon`)
    const res = await db.query(sql, params)
    await db.query('COMMIT')
    return res
  } catch (err) {
    await db.query('ROLLBACK')
    throw err
  }
}
async function asSuper(sql, params = []) {
  return db.query(sql, params)
}
const expectError = async (fn) => {
  try { await fn(); return null } catch (err) { return err }
}

/* ── 1. Config ya JS ↔ DB ──────────────────────────────────── */
const tiers = await asSuper(`SELECT type, max_members FROM public.chat_group_type_limits ORDER BY type`)
const tierMap = Object.fromEntries(tiers.rows.map((r) => [r.type, r.max_members]))
const parityOk =
  tiers.rows.length === 3 &&
  Object.entries(GROUP_MEMBER_LIMITS).every(([t, n]) => tierMap[t] === n)
check(
  '1  config JS ↔ DB inalingana (normal/announcement/managed)',
  parityOk,
  JSON.stringify(tierMap),
)
check(
  '1b kikomo kilichoidhinishwa = 1,024 kwa kila tier',
  tierMap.normal === 1024 && tierMap.announcement === 1024 && tierMap.managed === 1024,
  `normal=${tierMap.normal}`,
)

/* ── 2. Schema ─────────────────────────────────────────────── */
const cols = await asSuper(`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema='public' AND table_name='chat_group_settings'`)
const colNames = new Set(cols.rows.map((r) => r.column_name))
const requiredCols = [
  'conversation_id', 'group_type', 'privacy', 'description', 'purpose', 'goals', 'procedures',
  'rules', 'warnings', 'consequences', 'language', 'founding_location', 'location_visibility',
  'join_method', 'who_can_add', 'who_can_reply', 'who_can_react', 'announcement_senders',
  'slow_mode_seconds', 'member_limit', 'tone', 'dp_path', 'cover_path', 'created_at', 'updated_at',
]
const missing = requiredCols.filter((c) => !colNames.has(c))
check('2  chat_group_settings ina safu zote zinazohitajika', missing.length === 0, `missing=${missing.join(',')}`)

const pcols = await asSuper(`
  SELECT column_name, column_default, is_nullable FROM information_schema.columns
  WHERE table_schema='public' AND table_name='chat_participants' AND column_name IN ('role','status')`)
const roleCol = pcols.rows.find((r) => r.column_name === 'role')
const statusCol = pcols.rows.find((r) => r.column_name === 'status')
check(
  '2b chat_participants.role/status zipo na defaults ni salama',
  roleCol?.column_default?.includes('member') && statusCol?.column_default?.includes('active') &&
    roleCol.is_nullable === 'NO' && statusCol.is_nullable === 'NO',
  `role=${roleCol?.column_default} status=${statusCol?.column_default}`,
)

/* ── 3. Constraints ────────────────────────────────────────── */
const badPrivacy = await expectError(() => asSuper(
  `INSERT INTO public.chat_group_settings (conversation_id, privacy) VALUES ($1,'umma')`, [g1]))
const badType = await expectError(() => asSuper(
  `INSERT INTO public.chat_group_settings (conversation_id, group_type) VALUES ($1,'kingine')`, [g1]))
const badSlow = await expectError(() => asSuper(
  `INSERT INTO public.chat_group_settings (conversation_id, slow_mode_seconds) VALUES ($1,-5)`, [g1]))
check(
  '3  CHECKs za DB zinakataa faragha/aina/slow mode batili (23514)',
  badPrivacy?.code === '23514' && badType?.code === '23514' && badSlow?.code === '23514',
  `${badPrivacy?.code} · ${badType?.code} · ${badSlow?.code}`,
)

/* ── 4. Muundaji anaweza kuunda settings (RLS) ─────────────── */
const settingsIns = await expectError(() => asUser(A, `
  INSERT INTO public.chat_group_settings
    (conversation_id, group_type, privacy, join_method, member_limit, tone)
  VALUES ($1,'normal','private','invite_link',3,'blue')`, [g1]))
const peopleIns = await expectError(() => asUser(A, `
  INSERT INTO public.chat_participants (conversation_id, user_id, role, status)
  VALUES ($1,$2,'owner','active'), ($1,$3,'member','active')`, [g1, A, B]))
check(
  '4  muundaji (created_by) anaweza kuweka settings + owner/member (RLS insert)',
  settingsIns === null && peopleIns === null,
  settingsIns?.message || peopleIns?.message || 'ok',
)

/* ── 5. Kusoma: member anaona · non-member/anon hawaoni ────── */
const asMember = await asUser(B, `SELECT privacy, member_limit, tone FROM public.chat_group_settings WHERE conversation_id=$1`, [g1])
const asOutsider = await asUser(C, `SELECT privacy FROM public.chat_group_settings WHERE conversation_id=$1`, [g1])
let anonRows = null
let anonErr = null
try {
  anonRows = await asAnon(`SELECT privacy FROM public.chat_group_settings WHERE conversation_id=$1`, [g1])
} catch (e) { anonErr = e }
check(
  '5  member anaona settings; non-member na anon hawaoni (RLS)',
  asMember.rows.length === 1 && asMember.rows[0].member_limit === 3 && asMember.rows[0].tone === 'blue' &&
    asOutsider.rows.length === 0 && (anonErr !== null || anonRows.rows.length === 0),
  `member=${asMember.rows.length} outsider=${asOutsider.rows.length} anon=${anonErr ? anonErr.code : anonRows.rows.length}`,
)

/* ── 6. Non-owner hawezi kuhariri ──────────────────────────── */
const memberUpdate = await asUser(B, `UPDATE public.chat_group_settings SET privacy='public' WHERE conversation_id=$1`, [g1])
const afterMember = await asSuper(`SELECT privacy FROM public.chat_group_settings WHERE conversation_id=$1`, [g1])
const ownerUpdate = await asUser(A, `UPDATE public.chat_group_settings SET privacy='public' WHERE conversation_id=$1 RETURNING updated_at, created_at`, [g1])
const triggerFired = ownerUpdate.rows.length === 1 &&
  new Date(ownerUpdate.rows[0].updated_at) >= new Date(ownerUpdate.rows[0].created_at)
check(
  '6  non-owner hawezi kuhariri; owner anaweza (updated_at trigger)',
  memberUpdate.rowCount === 0 && afterMember.rows[0].privacy === 'private' &&
    ownerUpdate.rowCount === 1 && triggerFired,
  `memberUpd=${memberUpdate.rowCount} ownerUpd=${ownerUpdate.rowCount}`,
)

/* ── 7. Kikomo cha wanachama — backend trigger ─────────────── */
const cAdd = await expectError(() => asUser(A, `
  INSERT INTO public.chat_participants (conversation_id, user_id, role, status)
  VALUES ($1,$2,'member','active')`, [g1, C]))
const dAdd = await expectError(() => asUser(A, `
  INSERT INTO public.chat_participants (conversation_id, user_id, role, status)
  VALUES ($1,$2,'member','active')`, [g1, D]))
check(
  '7  kikomo=3: mtu wa tatu anaingia, wa nne anakataliwa na DB (chat_group_member_limit)',
  cAdd === null && !!dAdd && String(dAdd.message).includes('chat_group_member_limit'),
  dAdd ? `blocked: ${String(dAdd.message).slice(0, 60)}` : 'HAKUKATALIWA ⚠️',
)

/* ── 8. banned/left hawahesabiki; reactivation inahakikiwa ───
   KUMBUKA: RLS ya sasa ya chat_participants inaruhusu mtumiaji kubadilisha
   safu YAKE pekee; ban/remove ya mwanachama mwingine ni module ya ruhusa
   (M2, inahitaji idhini ya Owner — audit §6). Hapa tunathibitisha TRIGGER
   inaheshimu status kwa njia ya admin (superuser = njia ya baadaye). */
await asSuper(`UPDATE public.chat_participants SET status='banned' WHERE conversation_id=$1 AND user_id=$2`, [g1, C])
const dAddAfterBan = await expectError(() => asUser(A, `
  INSERT INTO public.chat_participants (conversation_id, user_id, role, status)
  VALUES ($1,$2,'member','active')`, [g1, D]))
const reactivateFull = await expectError(() => asSuper(`
  UPDATE public.chat_participants SET status='active' WHERE conversation_id=$1 AND user_id=$2`, [g1, C]))
await asSuper(`UPDATE public.chat_participants SET status='left' WHERE conversation_id=$1 AND user_id=$2`, [g1, D])
const reactivate = await expectError(() => asSuper(`
  UPDATE public.chat_participants SET status='active' WHERE conversation_id=$1 AND user_id=$2`, [g1, C]))
check(
  '8  banned hahesabiki (nafasi inafunguka) · reactivation ya kuzidi inakataliwa',
  dAddAfterBan === null && reactivateFull !== null &&
    String(reactivateFull.message).includes('chat_group_member_limit') && reactivate === null,
  `afterBan=${dAddAfterBan === null} full=${reactivateFull?.code} later=${reactivate === null}`,
)
note('Ban/remove ya mwanachama sasa inaendeshwa kwa RPC `chat_group_set_member` (M2/034) + trigger ya kikomo inaheshimu status. Ushahidi: groups-rbac-test §4 (moderator ban / admin unban / banned hasomi-hatuma).')

/* ── 9. Direct conversation haziguswi ──────────────────────── */
const directAdds = await expectError(() => asUser(A, `
  INSERT INTO public.chat_participants (conversation_id, user_id, status)
  VALUES ($1,$2,'active'), ($1,$3,'active'), ($1,$4,'active')`, [dm, A, B, C]))
check(
  '9  Direct conversation haiko chini ya kikomo cha kikundi (trigger ina-waacha)',
  directAdds === null,
  directAdds?.message || 'ok',
)

/* ── 10. Storage bucket + policies ─────────────────────────── */
const bucket = await asSuper(`SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets WHERE id='group-media'`)
const pol = await asSuper(`
  SELECT policyname FROM pg_policies
  WHERE schemaname='storage' AND tablename='objects' AND policyname LIKE 'group_media_%'`)
const polNames = pol.rows.map((r) => r.policyname).sort().join(',')
check(
  '10 bucket group-media (private, 5MB, images) + policies 4',
  bucket.rows.length === 1 && bucket.rows[0].public === false && Number(bucket.rows[0].file_size_limit) === 5242880 &&
    pol.rows.length === 4,
  `${bucket.rows[0]?.public} · ${Number(bucket.rows[0]?.file_size_limit)} · ${polNames}`,
)

/* ── 11. Helpers ───────────────────────────────────────────── */
const helpers = await asSuper(`
  SELECT public.chat_safe_uuid('si-uuid') AS bad,
         public.chat_safe_uuid($1::text) AS good,
         public.is_chat_group_owner($2, $3) AS owner_ok,
         public.is_chat_group_owner($2, $4) AS member_no,
         public.is_chat_group_owner($2, $5) AS outsider_no`,
  [g1, g1, A, B, C])
const h = helpers.rows[0]
check(
  '11 chat_safe_uuid inashughulikia path batili; is_chat_group_owner ni sahihi',
  h.bad === null && h.good === g1 && h.owner_ok === true && h.member_no === false && h.outsider_no === false,
  `bad=${h.bad} owner=${h.owner_ok} member=${h.member_no}`,
)

/* ── 12. Regression: policies za awali za chat ─────────────── */
const rlsFlags = await asSuper(`
  SELECT relname, relforcerowsecurity FROM pg_class
  WHERE relname IN ('chat_participants','chat_conversations','chat_group_settings')`)
const flag = Object.fromEntries(rlsFlags.rows.map((r) => [r.relname, r.relforcerowsecurity]))
const partNames = (await asSuper(`SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='chat_participants' ORDER BY policyname`)).rows.map((r) => r.policyname).join(',')
const convNames = (await asSuper(`SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='chat_conversations' ORDER BY policyname`)).rows.map((r) => r.policyname).join(',')
const memberStill = await asSuper(`SELECT public.is_chat_member($1, $2) AS ok`, [g1, B])
/* M2/034 (F1+F2 ya audit): FORCE RLS imeondolewa KWA DHAMIRA kwenye
   chat_participants + chat_conversations (+ chat_messages) — uamuzi wa 023
   ulirudishwa kwa 033 kimakosa; bila hii, helpers za SECURITY DEFINER
   (owner ≠ superuser kwenye hosted) zinasoma 0 rows → chat inavunjika /
   kikomo cha wanachama kinaskip kimya (fail-open). Ushahidi: audit F1/F2
   + groups-rbac-test §1 (relforcerowsecurity=false). Majina ya policies
   hayajabadilika. */
check(
  '12 regression: majina ya policies za awali hayajabadilika; FORCE RLS imeondolewa kwa dhamira (M2/034, F1+F2)',
  /* M2/034: `participants_insert_permitted` + `participants_update_manage` zimeongezwa
   (ruhusa za kuongeza/kusimamia kwa roles — F8/F3/F7). Ushahidi: rbac §1. */
  partNames === 'participants_delete_own,participants_insert_creator,participants_insert_permitted,participants_select_participant,participants_update_manage,participants_update_own' &&
    convNames === 'conversations_delete_creator,conversations_insert_auth,conversations_select_participant,conversations_update_participant' &&
    flag.chat_participants === false && flag.chat_conversations === false && flag.chat_group_settings === false &&
    memberStill.rows[0].ok === true,
  `part=${partNames.split(',').length} conv=${convNames.split(',').length} force(part/conv/settings)=${flag.chat_participants}/${flag.chat_conversations}/${flag.chat_group_settings}`,
)

/* ── Muhtasari ─────────────────────────────────────────────── */
const passed = results.filter((r) => r.ok).length
console.log(`\nRESULTS: ${passed}/${results.length} passed`)
if (notes.length) {
  console.log('\nMADOKEZO:')
  for (const n of notes) console.log(` - ${n}`)
}
const failed = results.filter((r) => !r.ok)
if (failed.length) {
  console.log('\nZILIZOSHINDWA:')
  for (const f of failed) console.log(` - ${f.name} :: ${f.detail}`)
}
await db.end()
process.exit(failed.length === 0 ? 0 : 1)
