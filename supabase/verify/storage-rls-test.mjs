// ══════════════════════════════════════════════════════════════
// PASIHAI — STORAGE + STATUS/POST MEDIA RLS (local Postgres 17 + shim)
//
// Inaiga roles za API kwa SET LOCAL ROLE authenticated/anon + JWT claim.
// Inathibitisha sheria za storage.objects (017, 018) na statuses/posts zinazorejelea media.
// Ni local tu: inafuta data ya majaribio. HAIGUSI remote.
//
// Usage: PG_PORT=5432 PGPASSWORD=... node supabase/verify/storage-rls-test.mjs <dbName>
// ══════════════════════════════════════════════════════════════

import pg from 'pg'

const dbName = process.argv[2] || 'pasihai_fresh'
const PORT = Number(process.env.PG_PORT || 54329)
const HOST = process.env.PG_HOST || '127.0.0.1'
if (!['127.0.0.1', 'localhost'].includes(HOST)) {
  throw new Error(`Refusing to run destructive tests against non-local host "${HOST}"`)
}

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + String(detail).slice(0, 160) : ''}`)
}

const db = new pg.Client({ host: HOST, port: PORT, user: 'postgres', password: process.env.PGPASSWORD, database: dbName })
await db.connect()

const A = '44444444-4444-4444-4444-444444444444'
const B = '55555555-5555-5555-5555-555555555555'
const C = '66666666-6666-6666-6666-666666666666'

await db.query('TRUNCATE auth.users CASCADE')
await db.query('TRUNCATE storage.objects, statuses, posts CASCADE')
for (const [id, name] of [[A, 'alice2'], [B, 'bob2'], [C, 'carol2']]) {
  await db.query('INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1,$2,$3)',
    [id, `${name}@local.test`, JSON.stringify({ username: name, display_name: name })])
}
// B anamfuata A (B anaona status/media ya A)
await db.query('INSERT INTO follows (follower_id, followee_id) VALUES ($1, $2)', [B, A])

async function asUser(uid, fn) {
  await db.query('BEGIN')
  try {
    await db.query(uid ? 'SET LOCAL ROLE authenticated' : 'SET LOCAL ROLE anon')
    if (uid) await db.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [uid])
    const r = await fn()
    await db.query('COMMIT')
    return r
  } catch (e) {
    await db.query('ROLLBACK')
    throw e
  }
}
const tryAs = async (uid, sql, params) => {
  try {
    const r = await asUser(uid, () => db.query(sql, params))
    return { ok: true, rows: r.rowCount, data: r.rows }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

// ── Buckets ─────────────────────────────────────────────────
const b = await db.query(`SELECT id, public FROM storage.buckets WHERE id IN ('pasihai-status-media','pasihai-post-media')`)
check('buckets: both media buckets exist and are private',
  b.rowCount === 2 && b.rows.every((r) => r.public === false), JSON.stringify(b.rows))

// ── Upload ownership ────────────────────────────────────────
const aUp = await tryAs(A, `INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('pasihai-status-media', $1, $2)`, [`${A}/s1.jpg`, A])
check('upload: A can write into own folder (status bucket)', aUp.ok, aUp.error)
const aOther = await tryAs(A, `INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('pasihai-status-media', $1, $2)`, [`${B}/hack.jpg`, A])
check('upload: A cannot write into B folder (status bucket)', !aOther.ok, `rows=${aOther.rows}`)
const anonUp = await tryAs(null, `INSERT INTO storage.objects (bucket_id, name) VALUES ('pasihai-status-media', $1)`, [`${A}/anon.jpg`])
check('upload: anon cannot write', !anonUp.ok, `rows=${anonUp.rows}`)
const postUp = await tryAs(A, `INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('pasihai-post-media', $1, $2)`, [`${A}/p1.jpg`, A])
check('upload: A can write post media into own folder', postUp.ok, postUp.error)
const postOther = await tryAs(B, `INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('pasihai-post-media', $1, $2)`, [`${A}/p-hack.jpg`, B])
check('upload: B cannot write post media into A folder', !postOther.ok, `rows=${postOther.rows}`)

// ── Status media: read follows status visibility ────────────
const stIns = await tryAs(A, `INSERT INTO statuses (user_id, media_path, media_type, expires_at)
  VALUES ($1, $2, 'image', now() + interval '2 hours')`, [A, `${A}/s1.jpg`])
check('status: A creates status referencing own media_path', stIns.ok, stIns.error)

const readB = await tryAs(B, `SELECT name FROM storage.objects WHERE name = $1`, [`${A}/s1.jpg`])
check('read: follower B can read A active status media', readB.ok && readB.rows === 1, readB.error || `rows=${readB.rows}`)
const readC = await tryAs(C, `SELECT name FROM storage.objects WHERE name = $1`, [`${A}/s1.jpg`])
check('read: non-follower C cannot read A status media', readC.ok && readC.rows === 0, readC.error || `rows=${readC.rows}`)
const readAnon = await tryAs(null, `SELECT name FROM storage.objects WHERE name = $1`, [`${A}/s1.jpg`])
check('read: anon cannot read status media', readAnon.ok && readAnon.rows === 0, readAnon.error || `rows=${readAnon.rows}`)

// Status iliyoisha muda: media haisomeki tena
await db.query(`UPDATE statuses SET expires_at = now() - interval '1 minute' WHERE media_path = $1`, [`${A}/s1.jpg`])
const readExpired = await tryAs(B, `SELECT name FROM storage.objects WHERE name = $1`, [`${A}/s1.jpg`])
check('expiry: expired status media is not readable', readExpired.ok && readExpired.rows === 0, readExpired.error || `rows=${readExpired.rows}`)

// Kufuta media inayorejelewa na status hai: lazima izuiwe
await db.query(`UPDATE statuses SET expires_at = now() + interval '2 hours' WHERE media_path = $1`, [`${A}/s1.jpg`])
const delRef = await tryAs(A, `DELETE FROM storage.objects WHERE name = $1`, [`${A}/s1.jpg`])
check('delete: owner cannot delete media still referenced by active status',
  delRef.ok && delRef.rows === 0, delRef.error || `deleted=${delRef.rows}`)

// Futa status kisha media isiyorejelewa: lazima iruhusiwe
await tryAs(A, `DELETE FROM statuses WHERE media_path = $1`, [`${A}/s1.jpg`])
const delUnref = await tryAs(A, `DELETE FROM storage.objects WHERE name = $1`, [`${A}/s1.jpg`])
check('delete: owner can delete unreferenced status media', delUnref.ok && delUnref.rows === 1, delUnref.error || `deleted=${delUnref.rows}`)

// ── Post media: visibility via posts ────────────────────────
const pubPost = await tryAs(A, `INSERT INTO posts (author_id, kind, text, visibility, media_path, media_url)
  VALUES ($1, 'image', 'pic', 'public', $2, NULL)`, [A, `${A}/p1.jpg`])
check('post: A creates public post with media_path', pubPost.ok, pubPost.error)
const postReadC = await tryAs(C, `SELECT name FROM storage.objects WHERE name = $1`, [`${A}/p1.jpg`])
check('read: C can read media of a public post', postReadC.ok && postReadC.rows === 1, postReadC.error || `rows=${postReadC.rows}`)
await db.query(`UPDATE posts SET visibility = 'private' WHERE media_path = $1`, [`${A}/p1.jpg`])
const postReadPriv = await tryAs(C, `SELECT name FROM storage.objects WHERE name = $1`, [`${A}/p1.jpg`])
check('read: C cannot read media of a private post', postReadPriv.ok && postReadPriv.rows === 0, postReadPriv.error || `rows=${postReadPriv.rows}`)

// KNOWN GAP (imeandikwa, haijarekebishwa): post_media_delete_own haizuii kufuta media inayorejelewa na post.
// Test hii inaonyesha tabia ya SASA. Tabia inayotakiwa ni 0 rows.
const postDelRef = await tryAs(A, `DELETE FROM storage.objects WHERE name = $1`, [`${A}/p1.jpg`])
check('KNOWN GAP: owner CAN delete media still referenced by a post (desired: 0 rows)',
  postDelRef.ok && postDelRef.rows === 1, postDelRef.error || `deleted=${postDelRef.rows}`)

await db.end()
const failed = results.filter((r) => !r.ok).length
console.log(`\nSTORAGE RLS: ${results.length - failed}/${results.length} passed`)
process.exit(failed ? 1 : 0)
