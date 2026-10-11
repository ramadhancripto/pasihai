// ══════════════════════════════════════════════════════════════
// PASIHAI — CLOUDINARY REPOSITORY TESTS (bundle ya SSR)
//
// Haitumii Supabase halisi wala Cloudinary halisi. Supabase client ya kweli
// inabadilishwa kwa stub (auth, from, storage) na fetch inabadilishwa kwa
// jibu bandia la Cloudinary. Matokeo haya ni ya MTIRIRIKO WA CODE, si ushahidi
// wa production.
//
// Inaendeshwa na scripts/test-cloudinary.mjs, ambayo inajenga bundle mara mbili:
//   - cloud 'on'  (VITE_CLOUDINARY_* zimewekwa)
//   - cloud 'off' (hazipo; njia ya zamani ya Supabase Storage)
// ══════════════════════════════════════════════════════════════

import './test-websocket-shim.js'
import { getSupabaseClient } from '../src/lib/supabaseClient.js'
import { supabaseContentRepository as repo } from '../src/data/repositories/supabaseContentRepository.js'
import { cloudinaryConfig } from '../src/utils/cloudinary.js'

const EXPECT_MODE = process.env.EXPECT_CLOUDINARY_MODE || 'on'
const CLOUD = 'noropw5y'
const results = []
const record = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok })
  console.log(`RESULT ${ok ? 'PASS' : 'FAIL'} ${name}${detail && !ok ? ` :: ${detail}` : ''}`)
}

const state = {
  user: { id: '11111111-1111-4111-8111-111111111111' },
  db: { statuses: [], posts: [] },
  storageCalls: [],
  dbInserts: [],
  fetchCalls: [],
  fetchMode: 'ok',
  hold: null,
  dbFail: false,
  nextSecureUrl: null,
}

/* ── Supabase stub: instance halisi, lakini methods zimebadilishwa ── */
const client = getSupabaseClient()
if (!client) {
  console.log('RESULT FAIL client :: Supabase client haijaundwa (live mode haijawashwa wakati wa build)')
  process.exit(1)
}
const define = (name, value) => Object.defineProperty(client, name, { value, configurable: true, writable: true })

function query(table) {
  const filters = []
  let mode = 'select'
  let payload = null
  const api = {
    select() { return api },
    insert(p) { mode = 'insert'; payload = p; return api },
    gt(col, val) { filters.push(['gt', col, val]); return api },
    eq(col, val) { filters.push(['eq', col, val]); return api },
    order() { return api },
    limit() { return api },
    single: async () => {
      const r = await run()
      return { data: Array.isArray(r.data) ? r.data[0] ?? null : r.data, error: r.error }
    },
    then(resolve, reject) { return run().then(resolve, reject) },
  }
  async function run() {
    if (mode === 'insert') {
      state.dbInserts.push({ table, payload })
      if (state.dbFail) return { data: null, error: { message: 'simulated insert failure', code: 'XX000' } }
      const row = {
        id: `row-${state.db[table].length + 1}`,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        user_id: payload.user_id || payload.author_id || state.user.id,
        ...payload,
      }
      state.db[table].push(row)
      return { data: row, error: null }
    }
    let rows = state.db[table].slice()
    for (const [op, col, val] of filters) {
      if (op === 'gt') rows = rows.filter((r) => String(r[col]) > String(val))
      if (op === 'eq') rows = rows.filter((r) => r[col] === val)
    }
    return { data: rows, error: null }
  }
  return api
}

define('auth', {
  getUser: async () => ({ data: { user: state.user }, error: null }),
  getSession: async () => ({ data: { session: null }, error: null }),
})
define('from', (table) => query(table))
define('storage', {
  from: (bucket) => ({
    upload: async (path) => {
      state.storageCalls.push({ op: 'upload', bucket, path })
      return { data: { path }, error: null }
    },
    remove: async (paths) => {
      state.storageCalls.push({ op: 'remove', bucket, paths })
      return { data: [], error: null }
    },
    createSignedUrl: async (path) => {
      state.storageCalls.push({ op: 'sign', bucket, path })
      return { data: { signedUrl: `https://storage.test/${bucket}/${path}?token=t` }, error: null }
    },
  }),
})

/* ── fetch bandia kwa Cloudinary ───────────────────────────── */
let seq = 0
globalThis.fetch = async (url, init = {}) => {
  const body = init.body
  state.fetchCalls.push({
    url: String(url),
    preset: body?.get?.('upload_preset') ?? null,
    folder: body?.get?.('folder') ?? null,
  })
  if (state.fetchMode === 'hold') {
    return new Promise((resolve) => {
      state.hold = () => resolve(jsonResponse(okBody(String(url))))
    })
  }
  if (state.fetchMode === 'network') throw new TypeError('network down')
  if (state.fetchMode === 'reject') {
    return jsonResponse({ error: { message: 'Upload preset not found' } }, 400)
  }
  if (state.fetchMode === 'foreign') {
    return jsonResponse({ ...okBody(String(url)), secure_url: 'https://evil.example.com/x.jpg' })
  }
  return jsonResponse(okBody(String(url)))
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } })
}

function okBody(url) {
  const type = url.includes('/video/') ? 'video' : 'image'
  seq += 1
  const id = `pasihai/test-${seq}`
  const ext = type === 'video' ? 'mp4' : 'jpg'
  return {
    public_id: id,
    resource_type: type,
    format: ext,
    bytes: 1234,
    width: 800,
    height: 600,
    secure_url: `https://res.cloudinary.com/${CLOUD}/${type}/upload/v1/${id}.${ext}`,
  }
}

function resetState() {
  state.db = { statuses: [], posts: [] }
  state.storageCalls = []
  state.dbInserts = []
  state.fetchCalls = []
  state.fetchMode = 'ok'
  state.hold = null
  state.dbFail = false
  state.user = { id: '11111111-1111-4111-8111-111111111111' }
}

const imageFile = () => new File([new Uint8Array(2048)], 'pic.jpg', { type: 'image/jpeg' })
const videoFile = () => new File([new Uint8Array(4096)], 'clip.mp4', { type: 'video/mp4' })

async function expectReject(promise) {
  try {
    await promise
    return null
  } catch (err) {
    return err
  }
}

const cloudOn = EXPECT_MODE === 'on'
record(`bundle mode is ${EXPECT_MODE}`, cloudinaryConfig.mode === EXPECT_MODE, `mode=${cloudinaryConfig.mode}`)

if (cloudOn) {
  // 1. Status picha → Cloudinary (si Supabase Storage), DB inapata media_url, media_path NULL
  resetState()
  const st = await repo.addStatus({ text: 'hali', file: imageFile(), tone: 'green' })
  const ins = state.dbInserts.find((i) => i.table === 'statuses')
  record('status image: exactly one Cloudinary upload call',
    state.fetchCalls.length === 1 && state.fetchCalls[0].url.endsWith(`/${CLOUD}/image/upload`),
    JSON.stringify(state.fetchCalls))
  record('status image: upload preset and folder sent',
    state.fetchCalls[0]?.preset === 'pasihai_preset' && state.fetchCalls[0]?.folder === 'pasihai')
  record('status image: no Supabase Storage upload', !state.storageCalls.some((c) => c.op === 'upload'))
  record('status image: DB stores media_url, media_path NULL',
    ins?.payload.media_url?.startsWith(`https://res.cloudinary.com/${CLOUD}/image/upload/`) && ins?.payload.media_path === null,
    JSON.stringify(ins?.payload))
  record('status image: returned mediaUrl is Cloudinary URL', st?.mediaUrl === ins?.payload.media_url)

  // 2. Refresh: getStatuses inarudisha status moja tu, yenye URL ya Cloudinary, bila kusainiwa upya
  const list = await repo.getStatuses()
  record('refresh: status still listed after reload', list.length === 1, `count=${list.length}`)
  record('refresh: mediaUrl is the saved Cloudinary URL', list[0]?.mediaUrl === ins?.payload.media_url)
  record('refresh: no duplicate status created', state.db.statuses.length === 1)
  record('refresh: no storage signing for Cloudinary status', !state.storageCalls.some((c) => c.op === 'sign'))

  // 3. Status video
  resetState()
  const sv = await repo.addStatus({ text: '', file: videoFile(), tone: 'blue' })
  record('status video: uses /video/upload endpoint',
    state.fetchCalls.length === 1 && state.fetchCalls[0].url.endsWith(`/${CLOUD}/video/upload`), JSON.stringify(state.fetchCalls))
  record('status video: mediaUrl stored', sv?.mediaUrl?.includes('/video/upload/') === true)

  // 4. Status maandishi pekee: hakuna upload
  resetState()
  await repo.addStatus({ text: 'maandishi tu', tone: 'gold' })
  record('status text-only: no Cloudinary call', state.fetchCalls.length === 0)
  record('status text-only: no media fields', state.dbInserts[0]?.payload.media_url === null && state.dbInserts[0]?.payload.media_path === null)

  // 5. Post picha → Cloudinary; media_meta ina provider na public_id
  resetState()
  const post = await repo.addPost({ kind: 'photo', text: 'post yangu', file: imageFile() })
  const pins = state.dbInserts.find((i) => i.table === 'posts')
  record('post image: Cloudinary upload once', state.fetchCalls.length === 1)
  record('post image: media_url + media_path NULL',
    pins?.payload.media_url?.includes(`/${CLOUD}/image/upload/`) && pins?.payload.media_path === null)
  record('post image: media_meta has provider/publicId',
    pins?.payload.media_meta?.provider === 'cloudinary' && String(pins?.payload.media_meta?.publicId).startsWith('pasihai/'))
  record('post image: returned mediaUrl is saved URL', post?.mediaUrl === pins?.payload.media_url)

  // 6. Upload imeshindwa (preset haipo): hakuna safu ya DB, kosa wazi
  resetState()
  state.fetchMode = 'reject'
  const e1 = await expectReject(repo.addStatus({ text: 'x', file: imageFile() }))
  record('upload rejected: addStatus throws', e1 instanceof Error, String(e1))
  record('upload rejected: no DB row written', state.dbInserts.length === 0)
  record('upload rejected: message shows Cloudinary reason', /Upload preset not found/.test(e1?.message || ''), e1?.message)

  resetState()
  state.fetchMode = 'network'
  const e2 = await expectReject(repo.addPost({ kind: 'photo', text: 'x', file: imageFile() }))
  record('network failure: addPost throws', e2 instanceof Error)
  record('network failure: no post row written', state.dbInserts.length === 0)

  // 7. Mtumiaji asiyeingia: hakuna upload wala row
  resetState()
  state.user = null
  const e3 = await expectReject(repo.addPost({ kind: 'photo', text: 'x', file: imageFile() }))
  record('unauthenticated: addPost rejected', e3 instanceof Error, String(e3))
  record('unauthenticated: no Cloudinary call', state.fetchCalls.length === 0)
  const e4 = await expectReject(repo.addStatus({ text: 'x', file: imageFile() }))
  record('unauthenticated: addStatus rejected', e4 instanceof Error)
  record('unauthenticated: no status row / no upload', state.fetchCalls.length === 0 && state.dbInserts.length === 0)

  // 8. URL ya mteja: ya kigeni inakataliwa; ya cloud yetu inakubaliwa
  resetState()
  const e5 = await expectReject(repo.addPost({ kind: 'text', text: 'x', mediaUrl: 'https://evil.example.com/a.jpg' }))
  record('client URL: foreign URL rejected', e5 instanceof Error)
  record('client URL: foreign URL never inserted', state.dbInserts.length === 0)
  resetState()
  const own = `https://res.cloudinary.com/${CLOUD}/image/upload/v1/pasihai/abc.jpg`
  await repo.addPost({ kind: 'text', text: 'x', mediaUrl: own })
  record('client URL: own Cloudinary URL accepted', state.dbInserts[0]?.payload.media_url === own)

  // 9. Jibu la Cloudinary lenye URL ya kigeni: halikubaliwi
  resetState()
  state.fetchMode = 'foreign'
  const e6 = await expectReject(repo.addStatus({ text: 'x', file: imageFile() }))
  record('foreign secure_url from Cloudinary rejected', e6 instanceof Error)
  record('foreign secure_url: no row written', state.dbInserts.length === 0)

  // 10. Hakuna duplicate: upload mbili kwa wakati mmoja → ya pili inakataliwa, fetch moja tu
  resetState()
  state.fetchMode = 'hold'
  const first = repo.addStatus({ text: 'a', file: imageFile() })
  await new Promise((r) => setTimeout(r, 30))
  const second = await expectReject(repo.addStatus({ text: 'b', file: imageFile() }))
  record('concurrent upload: second rejected', second instanceof Error, String(second))
  record('concurrent upload: only one Cloudinary request', state.fetchCalls.length === 1, `calls=${state.fetchCalls.length}`)
  state.hold?.()
  await first
  record('concurrent upload: first completes once', state.dbInserts.filter((i) => i.table === 'statuses').length === 1)

  // 11. Status iliyopita muda: haionekani kwenye getStatuses
  resetState()
  state.db.statuses.push({
    id: 'old-1', user_id: state.user.id, media_url: null, media_path: null, media_type: null,
    text: 'imeisha', tone: 'green', created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() - 1000).toISOString(),
  })
  const after = await repo.getStatuses()
  record('expired status: not returned by getStatuses', after.every((s) => s.id !== 'old-1'), `count=${after.length}`)
} else {
  // Mzunguko wa zamani: Cloudinary haijawekwa → Supabase Storage inatumika, hakuna Cloudinary call
  resetState()
  await repo.addStatus({ text: 'x', file: imageFile() })
  record('fallback (cloud off): uses Supabase Storage upload', state.storageCalls.some((c) => c.op === 'upload'))
  record('fallback (cloud off): no Cloudinary call', state.fetchCalls.length === 0)
  record('fallback (cloud off): DB media_path set', state.dbInserts[0]?.payload.media_path?.startsWith(`${state.user.id}/`) === true)
}

const failed = results.filter((r) => !r.ok).length
console.log(`SUMMARY ${results.length - failed}/${results.length} passed`)
process.exit(failed ? 1 : 0)
