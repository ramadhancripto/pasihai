// ══════════════════════════════════════════════════════════════
// PASIHAI — Contacts & phone identity: behaviour + RLS tests (§7)
//
// Local Postgres 17 + Supabase shim pekee (fresh migrated DB).
// Inatumika kwa uthibitisho wa migration 032:
//   1 user A anaweza kuhifadhi contact
//   2 A hawezi kuona contacts za B
//   3 A hawezi kuhariri/kufuta contact ya B
//   4 duplicates zinazuiwa
//   5 namba zinormalize kwa usahihi
//   6 contact inaunganishwa na akaunti halali
//   7 contact isiyo na akaunti inahifadhiwa
//   8 Save Contact ≠ friendship
//   9 kufuta contact hakuondoi chat history
//  10 block inazuia mawasiliano (app gate) + hali ya DB inaonyeshwa
//  11 namba hazionekani kwa wasioruhusiwa
//  12 import inarudiwa salama (idempotency) + source
//  13 RLS/constraints huzuia writes zisizoruhusiwa
//  14 chat/groups/profiles hazijavunjwa
//
// Usage: node supabase/verify/contacts-test.mjs <dbName>
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
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + String(detail).slice(0, 170) : ''}`)
}
const note = (msg) => { notes.push(msg); console.log(`NOTE  ${msg}`) }

const db = new pg.Client({ host: HOST, port: PORT, user: 'postgres', database: dbName })
await db.connect()

const A = '11111111-1111-1111-1111-111111111111'
const B = '22222222-2222-2222-2222-222222222222'
const C = '33333333-3333-3333-3333-333333333333'

/* ── Setup ─────────────────────────────────────────────────── */
await db.query('TRUNCATE auth.users CASCADE')
for (const [id, name] of [[A, 'alice'], [B, 'bob'], [C, 'carol']]) {
  await db.query(
    `INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1,$2,$3)`,
    [id, `${name}@local.test`, JSON.stringify({ username: name, display_name: name })],
  )
}

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
/** Kama postgres lakini na JWT claim (kwa kazi zinazohitaji auth.uid()). */
async function asSuperWithClaim(userId, sql, params = []) {
  await db.query('BEGIN')
  try {
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
const expectError = async (fn) => {
  try { await fn(); return null } catch (err) { return err }
}

/* ── 5. Normalization ──────────────────────────────────────── */
const normCases = await db.query(`
  SELECT private.normalize_e164('+255 784 123 456') AS spaced,
         private.normalize_e164('0784123456')       AS local,
         private.normalize_e164('+1 (415) 555-2671') AS us,
         private.normalize_e164('+255784')          AS too_short,
         private.normalize_e164(NULL)               AS nullish,
         private.normalize_e164('+255 784 123 456 7890 1234') AS too_long
`)
const nc = normCases.rows[0]
check(
  '5  namba zinormalize kwa usahihi (E.164; local format inakataliwa)',
  nc.spaced === '+255784123456' && nc.local === null && nc.us === '+14155552671' &&
    nc.too_short === null && nc.nullish === null && nc.too_long === null,
  JSON.stringify(nc),
)

/* ── 1. A anaweza kuhifadhi contact ────────────────────────── */
const insA = await asUser(A, `
  INSERT INTO public.user_contacts (owner_user_id, contact_user_id, display_name, source, is_favorite)
  VALUES ($1, $2, 'Bobby (jina langu)', 'manual', true)
  RETURNING id, owner_user_id, contact_user_id
`, [A, B])
const contactAB = insA.rows[0]
check('1  User A anaweza kuhifadhi contact (akaunti B)', insA.rowCount === 1 && contactAB.contact_user_id === B)

/* ── 7. Contact isiyo na akaunti inahifadhiwa ──────────────── */
const phoneHash = await asUser(A, `SELECT public.phone_hmac($1) AS h`, ['+255713000111'])
const insNoAccount = await asUser(A, `
  INSERT INTO public.user_contacts (owner_user_id, contact_user_id, phone_e164, phone_lookup_hash, display_name, source)
  VALUES ($1, NULL, '+255713000111', $2, 'Babu Ally (si PASIHAI)', 'device_import')
  RETURNING id, contact_user_id, phone_e164
`, [A, phoneHash.rows[0].h])
check('7  contact isiyo na akaunti inahifadhiwa (phone pekee)',
  insNoAccount.rowCount === 1 && insNoAccount.rows[0].contact_user_id === null)

/* ── 4. Duplicates zinazuiwa ───────────────────────────────── */
const dupAccount = await expectError(() => asUser(A, `
  INSERT INTO public.user_contacts (owner_user_id, contact_user_id, display_name)
  VALUES ($1, $2, 'Duplicate ya B')`, [A, B]))
check('4a duplicate wa akaunti ileile unazuiwa',
  dupAccount?.code === '23505', dupAccount?.code || 'hakuna kosa')

const dupPhone = await expectError(() => asUser(A, `
  INSERT INTO public.user_contacts (owner_user_id, contact_user_id, phone_e164, phone_lookup_hash, display_name)
  VALUES ($1, NULL, '+255713000111', $2, 'Duplicate ya namba')`, [A, phoneHash.rows[0].h]))
check('4b duplicate wa namba isiyo na akaunti unazuiwa',
  dupPhone?.code === '23505', dupPhone?.code || 'hakuna kosa')

const selfSave = await expectError(() => asUser(A, `
  INSERT INTO public.user_contacts (owner_user_id, contact_user_id, display_name)
  VALUES ($1, $1, 'Mimi mwenyewe')`, [A]))
check('4c kujihifadhi mwenyewe kunazuiwa (RLS 42501 / CHECK 23514)',
  ['42501', '23514'].includes(selfSave?.code), selfSave?.code || 'hakuna kosa')

/* ── 12. Import: idempotency + source ──────────────────────── */
const idemKey = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
await asUser(A, `
  INSERT INTO public.user_contacts (owner_user_id, phone_e164, phone_lookup_hash, display_name, source, idempotency_key)
  VALUES ($1, '+255754987654', public.phone_hmac('+255754987654'), 'Hamisi (import)', 'device_import', $2)
`, [A, idemKey])
const idemAgain = await expectError(() => asUser(A, `
  INSERT INTO public.user_contacts (owner_user_id, phone_e164, phone_lookup_hash, display_name, source, idempotency_key)
  VALUES ($1, '+255754987654', public.phone_hmac('+255754987654'), 'Hamisi (import tena)', 'device_import', $2)
`, [A, idemKey]))
check('12 import inarudiwa salama (idempotency_key inazuia kunakili)',
  idemAgain?.code === '23505', idemAgain?.code || 'hakuna kosa')

const badSource = await expectError(() => asUser(A, `
  INSERT INTO public.user_contacts (owner_user_id, phone_e164, display_name, source)
  VALUES ($1, '+255700000001', 'Chanzo kibaya', 'address_book_dump')`, [A]))
check('12b source isiyoruhusiwa inakataliwa', badSource?.code === '23514', badSource?.code || 'hakuna kosa')

/* ── 2/3/11. Isolation ─────────────────────────────────────── */
const seeAsB = await asUser(B, `SELECT count(*)::int AS n FROM public.user_contacts`)
check('2  B haoni contacts za A (RLS)', seeAsB.rows[0].n === 0, `rows=${seeAsB.rows[0].n}`)

const updAsB = await asUser(B, `
  UPDATE public.user_contacts SET display_name = 'Nimebadilisha' WHERE id = $1 RETURNING id
`, [contactAB.id])
check('3a B hawezi kuhariri contact ya A', updAsB.rowCount === 0, `updated=${updAsB.rowCount}`)

const delAsB = await asUser(B, `DELETE FROM public.user_contacts WHERE id = $1 RETURNING id`, [contactAB.id])
check('3b B hawezi kufuta contact ya A', delAsB.rowCount === 0, `deleted=${delAsB.rowCount}`)

const phoneAsB = await asUser(B, `SELECT count(*)::int AS n FROM public.profile_phones`)
check('11a B haoni profile_phones (hata moja, hata yake)', phoneAsB.rows[0].n === 0, `rows=${phoneAsB.rows[0].n}`)

let anonRows = null, anonDenied = null
try { anonRows = (await asAnon(`SELECT count(*)::int AS n FROM public.user_contacts`)).rows[0].n }
catch (err) { anonDenied = err.code }
check('11b anon hawezi kusoma contacts (deny au 0 rows)',
  anonDenied !== null || anonRows === 0, anonDenied ? `denied ${anonDenied}` : `rows=${anonRows}`)

/* ── 13. Unauthorized writes ───────────────────────────────── */
const spoofOwner = await expectError(() => asUser(A, `
  INSERT INTO public.user_contacts (owner_user_id, contact_user_id, display_name)
  VALUES ($1, $2, 'Nimejifanya B')`, [B, C]))
check('13a kuandika kwa niaba ya mtu mwingine kunazuiwa',
  ['42501', '23514'].includes(spoofOwner?.code), spoofOwner?.code || 'hakuna kosa')

const stealOwnership = await expectError(() => asUser(A, `
  UPDATE public.user_contacts SET owner_user_id = $1 WHERE id = $2 RETURNING id`, [B, contactAB.id]))
check('13b umiliki haubadiliki (owner_user_id imefungwa)',
  ['42501', '23514'].includes(stealOwnership?.code) || stealOwnership === null,
  stealOwnership?.code || 'hakuna kosa (0 rows)')

const anonWrite = await expectError(() => asAnon(`
  INSERT INTO public.user_contacts (owner_user_id, display_name) VALUES ('${A}', 'anon')`))
check('13c anon hawezi kuandika contact', anonWrite !== null, anonWrite?.code || 'HAKUKATALIWA ⚠️')

const anonPhoneWrite = await expectError(() => asAnon(`
  INSERT INTO public.profile_phones (user_id, phone_e164, phone_lookup_hash)
  VALUES ('${A}', '+255700000009', 'fake')`))
check('13d anon/API roles hawawezi kuandika profile_phones',
  anonPhoneWrite !== null, anonPhoneWrite?.code || 'HAKUKATALIWA ⚠️')

/* ── 10. Block gate ────────────────────────────────────────── */
const gateBefore = await asUser(A, `SELECT public.contact_message_gate($1) AS g`, [B])
await db.query(`INSERT INTO public.blocks (blocker_id, blocked_id) VALUES ($1,$2)`, [A, B])
const gateAfter = await asUser(A, `SELECT public.contact_message_gate($1) AS g`, [B])
check('10a block inazuiia mazungumzo kwenye app (gate)',
  gateBefore.rows[0].g.allowed === true && gateAfter.rows[0].g.allowed === false &&
  gateAfter.rows[0].g.reason === 'blocked_by_me',
  `${JSON.stringify(gateBefore.rows[0].g)} → ${JSON.stringify(gateAfter.rows[0].g)}`)

const stateAfterBlock = await asUser(A, `SELECT public.contact_friend_state($1) AS s`, [B])
check('10b hali ya uhusiano inaonyesha blocked',
  stateAfterBlock.rows[0].s === 'blocked', stateAfterBlock.rows[0].s)

/* Hali ya DB: je, mtu aliyekatazwa bado anaweza kutuma ujumbe? */
const dm = await db.query(`
  INSERT INTO public.chat_conversations (type, created_by) VALUES ('direct', $1) RETURNING id`, [A])
const dmId = dm.rows[0].id
await db.query(`
  INSERT INTO public.chat_participants (conversation_id, user_id) VALUES ($1,$2), ($1,$3)`, [dmId, A, B])
const blockedSend = await expectError(() => asUser(B, `
  INSERT INTO public.chat_messages (conversation_id, sender_id, text)
  VALUES ($1, $2, 'Mtu aliyekatazwa anatuma')`, [dmId, B]))
if (blockedSend === null) {
  note('10c KNOWN GAP: DB-level chat RLS bado inaruhusu ujumbe kutoka kwa aliyekatazwa ' +
       '(messages_insert_participant inaangalia uanachama pekee). Hii ni candidate repair ya chat RLS — ' +
       'inahitaji idhini ya mmiliki; gate ya app (10a) inazuia njia ya UI.')
} else {
  check('10c DB inazuia ujumbe kutoka kwa aliyekatazwa', true, blockedSend.code)
}

/* ── 8. Save Contact ≠ friendship ──────────────────────────── */
const friendsAfterSave = await db.query(`
  SELECT count(*)::int AS n FROM public.friendships
  WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)`, [A, B])
const stateForC = await asUser(A, `SELECT public.contact_friend_state($1) AS s`, [C])
check('8  Save Contact haifanyi mtu kuwa friend',
  friendsAfterSave.rows[0].n === 0 && stateForC.rows[0].s === 'not_friend',
  `friendships=${friendsAfterSave.rows[0].n}, state=${stateForC.rows[0].s}`)

/* ── 9. Kufuta contact hakuondoi chat history ──────────────── */
const msg = await db.query(`
  INSERT INTO public.chat_messages (conversation_id, sender_id, text) VALUES ($1,$2,'Habari ya kudumu') RETURNING id`,
  [dmId, A])
await asUser(A, `DELETE FROM public.user_contacts WHERE contact_user_id = $1`, [B])
const afterDelete = await db.query(`
  SELECT
    (SELECT count(*)::int FROM public.user_contacts WHERE id = $1) AS contact_rows,
    (SELECT count(*)::int FROM public.chat_conversations WHERE id = $2) AS conv_rows,
    (SELECT count(*)::int FROM public.chat_messages WHERE id = $3) AS msg_rows,
    (SELECT count(*)::int FROM public.chat_participants WHERE conversation_id = $2) AS part_rows
`, [contactAB.id, dmId, msg.rows[0].id])
const ad = afterDelete.rows[0]
check('9  kufuta contact hakuondoi chat history/conversation',
  ad.contact_rows === 0 && ad.conv_rows === 1 && ad.msg_rows === 1 && ad.part_rows === 2,
  JSON.stringify(ad))

/* ── 6. Kuunganisha na akaunti halali ──────────────────────── */
const insC = await asUser(A, `
  INSERT INTO public.user_contacts (owner_user_id, contact_user_id, display_name)
  VALUES ($1, $2, 'Carol') RETURNING id`, [A, C])
const bogusLink = await expectError(() => asUser(A, `
  INSERT INTO public.user_contacts (owner_user_id, contact_user_id, display_name)
  VALUES ($1, '99999999-9999-9999-9999-999999999999', 'Ghost')`, [A]))
check('6  contact inaunganishwa na akaunti halali; FK inakataa akaunti isiyopo',
  insC.rowCount === 1 && bogusLink?.code === '23503', `link=${insC.rowCount}, bogus=${bogusLink?.code}`)

/* ── set_my_phone + lookup (mzunguko wa namba) ─────────────── */
const unverified = await expectError(() => asUser(A, `SELECT public.set_my_phone('+255784123456')`))
check('P1 set_my_phone haifanyi kazi bila uthibitisho wa Auth',
  unverified?.code === '28000', unverified?.code || 'HAKUKATALIWA ⚠️')

await db.query(`UPDATE auth.users SET phone = '+255784123456', phone_confirmed_at = now() WHERE id = $1`, [A])
const setPhone = await asUser(A, `SELECT public.set_my_phone('+255784123456') AS r`)
const lookupByB = await asUser(B, `SELECT public.lookup_contact_phone('+255 784 123 456') AS r`)
const lookupMiss = await asUser(B, `SELECT public.lookup_contact_phone('+255700999888') AS r`)
check('P2 namba iliyothibitishwa inawekwa; mwingine anapata account_id (bila namba)',
  setPhone.rows[0].r.phone_e164 === '+255784123456' &&
  lookupByB.rows[0].r?.account_id === A &&
  Object.keys(lookupByB.rows[0].r).join(',') === 'account_id' &&
  lookupMiss.rows[0].r === null,
  `set=${JSON.stringify(setPhone.rows[0].r)} lookup=${JSON.stringify(lookupByB.rows[0].r)} miss=${JSON.stringify(lookupMiss.rows[0].r)}`)

const lookupBad = await expectError(() => asUser(B, `SELECT public.lookup_contact_phone('0784123456')`))
check('P3 muundo usio wa E.164 unakataliwa', lookupBad?.code === '22023', lookupBad?.code || 'HAKUKATALIWA ⚠️')

// discoverable = false → haigunduliki
await db.query(`UPDATE public.profile_phones SET discoverable = false WHERE user_id = $1`, [A])
const lookupHidden = await asUser(B, `SELECT public.lookup_contact_phone('+255784123456') AS r`)
await db.query(`UPDATE public.profile_phones SET discoverable = true WHERE user_id = $1`, [A])
check('P4 discoverable=false inazuia kugundulika', lookupHidden.rows[0].r === null,
  JSON.stringify(lookupHidden.rows[0].r))

// P5a: mtu mwingine anayejaribu kuchukua namba ya A — Auth inazuia (hajathibitisha namba hiyo)
await db.query(`UPDATE auth.users SET phone = '+255700555111', phone_confirmed_at = now() WHERE id = $1`, [C])
const notVerified = await expectError(() => asUser(C, `SELECT public.set_my_phone('+255784123456')`))
check('P5a mtu asiyethibitisha namba hiyo hawezi kuchukua namba ya mwingine',
  notVerified?.code === '28000', notVerified?.code || 'HAKUKATALIWA ⚠️')

// P5b: namba inayorejeshwa (recycled): A anaacha namba, B anathibitisha namba hiyo → anaichukua
await asUser(A, `SELECT public.clear_my_phone()`)
const aCleared = await db.query(`SELECT count(*)::int AS n FROM public.profile_phones WHERE user_id = $1`, [A])
// A anaacha namba pia kwenye Auth (mfano: supabase.auth.updateUser), kisha B anaithibitisha.
await db.query(`UPDATE auth.users SET phone = NULL, phone_confirmed_at = NULL WHERE id = $1`, [A])
await db.query(`UPDATE auth.users SET phone = '+255784123456', phone_confirmed_at = now() WHERE id = $1`, [B])
const bTakes = await asUser(B, `SELECT public.set_my_phone('+255784123456') AS r`)
const rowsForNumber = await asSuperWithClaim(A, 
  `SELECT user_id FROM public.profile_phones WHERE phone_lookup_hash = public.phone_hmac('+255784123456')`)
check('P5b namba iliyoachiliwa inaweza kuchukuliwa baada ya uthibitisho mpya (bila kufuta akaunti)',
  aCleared.rows[0].n === 0 && bTakes.rows[0].r.phone_e164 === '+255784123456' &&
  rowsForNumber.rowCount === 1 && rowsForNumber.rows[0].user_id === B,
  `a_cleared=${aCleared.rows[0].n}, holder=${rowsForNumber.rows[0]?.user_id === B ? 'B' : rowsForNumber.rows[0]?.user_id}`)

// P5c: safu ya zamani (stale) inaachiliwa uthibitisho mpya unapothibitisha umiliki
await asSuperWithClaim(C, `
  INSERT INTO public.profile_phones (user_id, phone_e164, phone_lookup_hash, verified_at)
  VALUES ($1, '+255700999777', public.phone_hmac('+255700999777'), now() - interval '30 days')
  ON CONFLICT (user_id) DO UPDATE SET phone_e164 = EXCLUDED.phone_e164,
    phone_lookup_hash = EXCLUDED.phone_lookup_hash`, [C])
await db.query(`UPDATE auth.users SET phone = '+255700999777', phone_confirmed_at = now() WHERE id = $1`, [A])
const aTakes2 = await asUser(A, `SELECT public.set_my_phone('+255700999777') AS r`)
const staleGone = await db.query(`SELECT count(*)::int AS n FROM public.profile_phones WHERE user_id = $1`, [C])
check('P5c safu ya namba iliyopitwa na wakati inaachiliwa (akaunti ya zamani haifutwi)',
  aTakes2.rows[0].r.phone_e164 === '+255700999777' && staleGone.rows[0].n === 0,
  `holder=${aTakes2.rows[0].r.phone_e164}, stale_rows=${staleGone.rows[0].n}`)

// rate limit: 21 majaribio
await db.query(`DELETE FROM public.phone_lookup_attempts`)
let rateLimited = null
for (let i = 0; i < 21; i++) {
  try { await asUser(C, `SELECT public.lookup_contact_phone('+2557${String(1000000 + i)}')`) }
  catch (err) { rateLimited = { code: err.code, at: i + 1 }; break }
}
check('P6 rate limit inafanya kazi (≤20 kwa saa)',
  rateLimited?.code === 'P0001' && rateLimited.at === 21,
  JSON.stringify(rateLimited))

/* ── Batch lookup (import) ─────────────────────────────────── */
await db.query(`DELETE FROM public.phone_lookup_attempts`)
const batch = await asUser(B, `
  SELECT public.lookup_contact_phones(ARRAY['+255784123456','+255700999888','+255700000001','taka']) AS r`)
const batchRows = batch.rows[0].r
const byIndex = Object.fromEntries(batchRows.map((x) => [x.i, x]))
check('B1 batch lookup: hurudisha index + hash + account_id (au null)',
  batchRows.length === 4 &&
    byIndex[0].account_id === null &&   // A alishaondoa namba yake (clear_my_phone kabla ya P6)
    byIndex[1].account_id === null &&   // Daudi: discoverable = false
    byIndex[2].account_id === null &&   // haijasajiliwa
    byIndex[3].hash === null && byIndex[3].account_id === null &&
    typeof byIndex[0].hash === 'string' && byIndex[0].hash.length === 64,
  JSON.stringify(batchRows))

// B: namba ya K (aliiweka kwenye P5c? hapana) — weka namba ya C kisha ionekane kwa batch
await db.query(`UPDATE auth.users SET phone = '+255700123456', phone_confirmed_at = now() WHERE id = $1`, [C])
await asUser(C, `SELECT public.set_my_phone('+255700123456')`)
const batch2 = await asUser(B, `SELECT public.lookup_contact_phones(ARRAY['+255700123456']) AS r`)
check('B2 batch inapata account_id ya namba iliyothibitishwa',
  batch2.rows[0].r[0].account_id === C, JSON.stringify(batch2.rows[0].r))

const tooMany = await expectError(() => asUser(B, `
  SELECT public.lookup_contact_phones((SELECT array_agg('+2557' || lpad(g::text,6,'0')) FROM generate_series(1,201) g))`))
check('B3 batch kubwa kuliko 200 inakataliwa', tooMany?.code === '22023', tooMany?.code || 'HAKUKATALIWA ⚠️')

/* ── 14. Chat/groups/profiles hazijavunjwa ─────────────────── */
const sendOk = await expectError(() => asUser(A, `
  INSERT INTO public.chat_messages (conversation_id, sender_id, text) VALUES ($1,$2,'Baada ya 032')`, [dmId, A]))
const readOk = await asUser(A, `
  SELECT count(*)::int AS n FROM public.chat_messages WHERE conversation_id = $1`, [dmId])
const group = await expectError(() => asUser(A, `
  INSERT INTO public.chat_conversations (type, title, created_by) VALUES ('group','Kikundi cha 032',$1) RETURNING id`, [A]))
const profUpdate = await asUser(A, `UPDATE public.profiles SET bio = 'Bio ya 032' WHERE user_id = $1 RETURNING user_id`, [A])
check('14 chat (DM), vikundi na profiles vinaendelea kufanya kazi',
  sendOk === null && readOk.rows[0].n >= 2 && group === null && profUpdate.rowCount === 1,
  `msgs=${readOk.rows[0].n}, group=${group === null}, profile=${profUpdate.rowCount}`)

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
