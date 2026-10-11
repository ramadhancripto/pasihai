// ══════════════════════════════════════════════════════════════
// PASIHAI — LIVE REST TESTS (bundle ya SSR)
//
// Inatumia repo code HALISI + @supabase/supabase-js HALISI, ikielekezwa kwenye
// PostgREST 12 ya ndani + Postgres 17 ya ndani (migrations zote 001–022 + shim).
// Pekee `supabase.auth.getUser` imewekwa stub, kwa sababu GoTrue haipo ndani.
// Kila ombi la REST linapewa JWT ya user anayehusika (HS256, sahihi kwa secret ya majaribio).
//
// Hii ni ushahidi wa RLS + mtiririko wa repo kwenye local Postgres + PostgREST.
// SI ushahidi wa Supabase halisi (project ya remote haijaguswa).
//
// Inaendeshwa na scripts/test-live-rest.mjs.
// ══════════════════════════════════════════════════════════════

import './test-websocket-shim.js'
import 'fake-indexeddb/auto'
import { createHmac } from 'node:crypto'
import { getSupabaseClient } from '../src/lib/supabaseClient.js'
import { supabaseChatRepository as chat } from '../src/data/repositories/supabaseChatRepository.js'
import { supabaseContentRepository as content } from '../src/data/repositories/supabaseContentRepository.js'
import { supabaseIdentityRepository as identity } from '../src/data/repositories/supabaseIdentityRepository.js'
import { cloudinaryConfig } from '../src/utils/cloudinary.js'
import * as repos from '../src/data/repositories/index.js'

const REST_BASE = 'http://127.0.0.1:3100'
const CLOUD_API = 'https://api.cloudinary.com/'
const SECRET = process.env.PASIHAI_TEST_JWT_SECRET || ''
const IDS = {
  A: process.env.TEST_USER_A,
  B: process.env.TEST_USER_B,
  C: process.env.TEST_USER_C,
}
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

const results = []
const record = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok })
  console.log(`RESULT ${ok ? 'PASS' : 'FAIL'} ${name}${detail && !ok ? ` :: ${detail}` : ''}`)
}

if (!SECRET || !IDS.A || !IDS.B || !IDS.C) {
  console.log('RESULT FAIL setup :: TEST_USER_A/B/C au PASIHAI_TEST_JWT_SECRET hazipo')
  process.exit(1)
}

/* ── Kunasa console.error ili kuonyesha sababu halisi ─────── */
let lastError = ''
const origError = console.error
console.error = (...args) => {
  lastError = args.map((a) => (a?.message || (typeof a === 'string' ? a : JSON.stringify(a)))).join(' ').slice(0, 300)
}

/* ── JWT ya HS256 ─────────────────────────────────────────── */
const b64u = (buf) => Buffer.from(buf).toString('base64url')
function sign(payload) {
  const head = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = b64u(JSON.stringify(payload))
  const sig = createHmac('sha256', SECRET).update(`${head}.${body}`).digest('base64url')
  return `${head}.${body}.${sig}`
}
const now = Math.floor(Date.now() / 1000)
const userToken = (uid) => sign({ sub: uid, role: 'authenticated', aud: 'authenticated', exp: now + 3600 })

/* ── Muktadha wa mtumiaji wa sasa ─────────────────────────── */
const ctx = { uid: null, token: ANON_KEY }
function as(who) {
  ctx.uid = who ? IDS[who] : null
  ctx.token = ctx.uid ? userToken(ctx.uid) : ANON_KEY
}

/* ── fetch: elekeza REST kwa token ya user; Cloudinary stub ── */
let cloudSeq = 0
const realFetch = globalThis.fetch
globalThis.fetch = async (url, init = {}) => {
  const u = String(url)
  if (u.startsWith(REST_BASE)) {
    // supabase-js inaongeza /rest/v1; PostgREST tupu inasikiliza kwenye / (njia hii ni ya ndani tu).
    const target = u.replace(`${REST_BASE}/rest/v1`, REST_BASE)
    const headers = new Headers(init.headers || {})
    headers.set('Authorization', `Bearer ${ctx.token}`)
    return realFetch(target, { ...init, headers })
  }
  if (u.startsWith(CLOUD_API)) {
    const type = u.includes('/video/') ? 'video' : 'image'
    cloudSeq += 1
    const id = `pasihai/rest-${cloudSeq}`
    const ext = type === 'video' ? 'mp4' : 'jpg'
    return new Response(JSON.stringify({
      public_id: id,
      resource_type: type,
      format: ext,
      bytes: 1234,
      secure_url: `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/${type}/upload/v1/${id}.${ext}`,
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  throw new Error(`Ombi lisilotarajiwa nje ya majaribio: ${u.slice(0, 80)}`)
}

/* ── auth.getUser: stub pekee (GoTrue haipo ndani) ─────────── */
const liveClient = getSupabaseClient()
if (!liveClient) {
  console.log('RESULT FAIL client :: Supabase client haijaundwa')
  process.exit(1)
}
const realAuth = liveClient.auth
const authProxy = new Proxy(realAuth, {
  get(target, prop) {
    if (prop === 'getUser') return async () => ({ data: { user: ctx.uid ? { id: ctx.uid } : null }, error: null })
    const v = target[prop]
    return typeof v === 'function' ? v.bind(target) : v
  },
})
Object.defineProperty(liveClient, 'auth', { value: authProxy, configurable: true, writable: true })

const imageFile = () => new File([new Uint8Array(2048)], 'pic.jpg', { type: 'image/jpeg' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ══════════════════════════════════════════════════════════════
   CHAT
   ══════════════════════════════════════════════════════════════ */
as('A')
lastError = ''
const dm = await chat.startDirect(IDS.B)
record('chat: A starts direct conversation with B', !!dm?.conversationId, `startDirect returned ${JSON.stringify(dm)} err=${lastError}`)
const convId = dm?.conversationId || null

// Helper: sendMessage sasa inatupa kosa; hapa tunakusanya kosa kama matokeo.
async function trySend(convId, text) {
  try { return { ok: true, msg: await chat.sendMessage(convId, { text }) } }
  catch (e) { return { ok: false, err: e?.message || String(e) } }
}

if (convId) {
  const sent = await trySend(convId, 'habari B kutoka A')
  record('chat: A sends message in conversation', sent.ok && sent.msg?.state === 'synced' && sent.msg?.from === 'me', sent.err || JSON.stringify(sent.msg))

  as('B')
  const convs = await chat.listConversations()
  record('chat: B sees conversation in own list', convs.some((c) => c.id === convId), `count=${convs.length}`)
  const bConv = await chat.getConversation(convId)
  record('chat: B reads message after send', (bConv?.messages || []).some((m) => m.text === 'habari B kutoka A'), `messages=${bConv?.messages?.length ?? 'null'}`)
  const bList = await chat.listMessages(convId)
  record('chat: B listMessages shows A message as from=them', bList.some((m) => m.text === 'habari B kutoka A' && m.from === 'them'), JSON.stringify(bList).slice(0, 160))
  const reply = await trySend(convId, 'habari A kutoka B')
  record('chat: B replies; listMessages shows own reply as from=me', reply.ok && (await chat.listMessages(convId)).some((m) => m.text === 'habari A kutoka B' && m.from === 'me'), reply.err || '')

  as('C')
  const cConv = await chat.getConversation(convId)
  record('chat: C cannot read A-B conversation', cConv === null, JSON.stringify(cConv)?.slice(0, 120))
  let cList = null
  try { cList = await chat.listMessages(convId) } catch (e) { cList = { err: e.message } }
  record('chat: C listMessages returns no A-B messages', Array.isArray(cList) && cList.length === 0, JSON.stringify(cList)?.slice(0, 120))
  const cSend = await trySend(convId, 'intruder')
  record('chat: C cannot send into A-B conversation (failure is visible)', !cSend.ok && /ruhusa|haijahifadhiwa/i.test(cSend.err || ''), cSend.ok ? 'send succeeded' : cSend.err)
  as('B')
  const bConv2 = await chat.getConversation(convId)
  record('chat: intruder message not stored', !(bConv2?.messages || []).some((m) => m.text === 'intruder'))
}

/* Repo za mock hazipaswi kurudisha data kwenye live: method isiyounganishwa lazima ikatae wazi. */
try {
  await repos.catalogRepository.getEntityVocabulary()
  record('live guard: catalogRepository rejects instead of mock data', false, 'resolved')
} catch (e) {
  record('live guard: catalogRepository rejects instead of mock data', e.code === 'LIVE_NOT_IMPLEMENTED', e.message)
}
try {
  await repos.systemRepository.getTransports()
  record('live guard: systemRepository.getTransports rejects (no mock relay state)', false, 'resolved')
} catch (e) {
  record('live guard: systemRepository.getTransports rejects (no mock relay state)', e.code === 'LIVE_NOT_IMPLEMENTED', e.message)
}
const conn = await repos.systemRepository.getConnection()
record('live: systemRepository.getConnection is browser-derived, not scenario', conn?.source === 'navigator.onLine', JSON.stringify(conn))

/* ══════════════════════════════════════════════════════════════
   STATUS
   ══════════════════════════════════════════════════════════════ */
as('A')
lastError = ''
let st1 = null
try {
  st1 = await content.addStatus({ text: 'hali ya A' })
} catch (e) {
  lastError = e?.message || String(e)
}
record('status: A creates text status', !!st1?.id, lastError)

as('B') // B anamfuata A
const bStatuses = await content.getStatuses()
record('status: follower B sees A text status', bStatuses.some((s) => s.id === st1?.id), `count=${bStatuses.length}`)

as('B')
const bAfter = await content.getStatuses()
record('status: expired status is hidden from follower B', !bAfter.some((s) => s.id === process.env.TEST_EXPIRED_STATUS_ID))
as('A')
const aOwn = await content.getStatuses()
record('status: expired status is hidden from its owner A too', !aOwn.some((s) => s.id === process.env.TEST_EXPIRED_STATUS_ID))

as('C')
const cStatuses = await content.getStatuses()
record('status: non-follower C does not see A status', !cStatuses.some((s) => s.id === st1?.id), `count=${cStatuses.length}`)

as('A')
lastError = ''
let stCloud = null
try {
  stCloud = await content.addStatus({ text: '', file: imageFile() })
} catch (e) {
  lastError = e?.message || String(e)
}
record('status: A creates Cloudinary image status', !!stCloud?.id, lastError)
if (stCloud?.id) {
  as('B')
  const after = await content.getStatuses()
  const hit = after.find((s) => s.id === stCloud.id)
  record('status: Cloudinary status visible to follower after refresh', !!hit, `count=${after.length}`)
  record('status: Cloudinary status has mediaUrl from Cloudinary', !!hit?.mediaUrl?.includes('res.cloudinary.com'))
  record('status: no duplicate of Cloudinary status', after.filter((s) => s.id === stCloud.id).length === 1)
}

/* ══════════════════════════════════════════════════════════════
   POSTS + COMMENTS
   ══════════════════════════════════════════════════════════════ */
as('A')
lastError = ''
let post1 = null
try { post1 = await content.addPost({ kind: 'text', text: 'chapisho la A' }) } catch (e) { lastError = e?.message || String(e) }
record('post: A creates text post', !!post1?.id, lastError)

as('C')
const feedC = await content.listFeed()
record('post: public post visible to other user C', feedC.some((p) => p.id === post1?.id), `count=${feedC.length}`)

as('A')
lastError = ''
let postPic = null
try { postPic = await content.addPost({ kind: 'photo', text: 'picha', file: imageFile() }) } catch (e) { lastError = e?.message || String(e) }
record('post: A creates Cloudinary photo post', !!postPic?.id, lastError)
if (postPic?.id) {
  as('C')
  const feed2 = await content.listFeed()
  const hit = feed2.find((p) => p.id === postPic.id)
  record('post: photo post readable after refresh with mediaUrl', !!hit?.media?.url?.includes('res.cloudinary.com'), `found=${!!hit} media=${JSON.stringify(hit?.media)?.slice(0,80)}`)
}

if (post1?.id) {
  as('B')
  lastError = ''
  const c = await content.addComment(post1.id, 'nzuri sana')
  record('comment: B comments on A post', !!c?.id, lastError)
  as('C')
  const comments = await content.listComments(post1.id)
  record('comment: C reads comments on public post', comments.some((x) => x.id === c?.id), `count=${comments.length}`)
  as('B')
  const like = await content.toggleLike(post1.id)
  record('reaction: B toggles like on A post', like === true, `returned ${like}`)
}

/* ══════════════════════════════════════════════════════════════
   PROFILE / FOLLOW (ulinzi wa counts)
   ══════════════════════════════════════════════════════════════ */
as('C')
{
  // PATCH moja kwa moja kwa PostgREST kwa token ya C: jaribu kuandika counts za profile ya C mwenyewe.
  const r = await realFetch(`${REST_BASE}/profiles?user_id=eq.${IDS.C}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', Prefer: 'return=representation', Authorization: `Bearer ${ctx.token}`, apikey: ANON_KEY },
    body: JSON.stringify({ followers_count: 999999 }),
  })
  const body = await r.text()
  const forged = r.ok && body.includes('999999')
  record('profile: C cannot forge own followers_count via REST', !forged, `status=${r.status} body=${body.slice(0, 120)}`)
}

console.error = origError
const failed = results.filter((r) => !r.ok).length
console.log(`SUMMARY ${results.length - failed}/${results.length} passed`)
process.exit(failed ? 1 : 0)
