// ══════════════════════════════════════════════════════════════
// PASIHAI — CLOUDINARY TESTS
//   A. Unit: src/utils/cloudinary.js (fetch bandia, hakuna mtandao)
//   B. Repo: scripts/test-cloudinary-repo.jsx, imejengwa mara mbili
//      (cloud on / cloud off) kwa Supabase stub
//   C. Usalama: hakuna secret kwenye src/, .env.example, .env.local
//
// Matokeo ya B ni ya mtiririko wa code, si ushahidi wa Supabase au Cloudinary halisi.
// Run: node scripts/test-cloudinary.mjs
// ══════════════════════════════════════════════════════════════

import { execSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0
let fail = 0
const check = (name, ok, detail = '') => {
  if (ok) pass += 1
  else fail += 1
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${!ok && detail ? ` :: ${detail}` : ''}`)
}

// ── A. Unit ─────────────────────────────────────────────────
const cl = await import('../src/utils/cloudinary.js')
const errs = await import('../src/utils/errors.js')
const { readCloudinaryConfig, isOwnCloudinaryUrl, uploadMediaToCloudinary } = cl
const CLOUD = 'noropw5y'
const good = { VITE_CLOUDINARY_CLOUD_NAME: CLOUD, VITE_CLOUDINARY_UPLOAD_PRESET: 'pasihai_preset' }

check('config: both set → mode on', readCloudinaryConfig(good).mode === 'on')
check('config: none set → mode off', readCloudinaryConfig({}).mode === 'off')
check('config: only cloud name → broken', readCloudinaryConfig({ VITE_CLOUDINARY_CLOUD_NAME: CLOUD }).mode === 'broken')
check('config: only preset → broken', readCloudinaryConfig({ VITE_CLOUDINARY_UPLOAD_PRESET: 'p' }).mode === 'broken')
check('config: invalid cloud name → broken', readCloudinaryConfig({ ...good, VITE_CLOUDINARY_CLOUD_NAME: 'no/rw' }).mode === 'broken')
check('config: folder fixed to pasihai', readCloudinaryConfig(good).folder === 'pasihai')

check('url: own secure URL accepted', isOwnCloudinaryUrl(`https://res.cloudinary.com/${CLOUD}/image/upload/v1/pasihai/a.jpg`, CLOUD))
check('url: video accepted', isOwnCloudinaryUrl(`https://res.cloudinary.com/${CLOUD}/video/upload/pasihai/a.mp4`, CLOUD))
check('url: other cloud rejected', !isOwnCloudinaryUrl(`https://res.cloudinary.com/other/image/upload/a.jpg`, CLOUD))
check('url: http rejected', !isOwnCloudinaryUrl(`http://res.cloudinary.com/${CLOUD}/image/upload/a.jpg`, CLOUD))
check('url: lookalike host rejected', !isOwnCloudinaryUrl(`https://res.cloudinary.com.evil.com/${CLOUD}/image/upload/a.jpg`, CLOUD))
check('url: query string rejected', !isOwnCloudinaryUrl(`https://res.cloudinary.com/${CLOUD}/image/upload/a.jpg?x=1`, CLOUD))
check('url: non-upload path rejected', !isOwnCloudinaryUrl(`https://res.cloudinary.com/${CLOUD}/raw/a.txt`, CLOUD))
check('url: javascript: rejected', !isOwnCloudinaryUrl('javascript:alert(1)', CLOUD))
check('url: non-string rejected', !isOwnCloudinaryUrl(null, CLOUD) && !isOwnCloudinaryUrl(42, CLOUD))

const mkFile = (type = 'image/jpeg', size = 1024) => ({ type, size, name: 'f' })
const okJson = (over = {}) => ({
  public_id: 'pasihai/abc',
  resource_type: 'image',
  format: 'jpg',
  bytes: 1024,
  secure_url: `https://res.cloudinary.com/${CLOUD}/image/upload/v1/pasihai/abc.jpg`,
  ...over,
})
const respond = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const cfg = { mode: 'on', cloudName: CLOUD, uploadPreset: 'pasihai_preset', folder: 'pasihai' }

async function rejects(promise, ErrClass) {
  try {
    await promise
    return { ok: false, err: 'resolved' }
  } catch (err) {
    return { ok: err instanceof ErrClass, err }
  }
}

{
  let calls = 0
  let seenUrl = ''
  const r = await uploadMediaToCloudinary(mkFile(), {
    mediaType: 'image',
    config: cfg,
    fetchImpl: async (url) => { calls += 1; seenUrl = url; return respond(okJson()) },
  })
  check('upload success: endpoint is unsigned image upload', seenUrl === `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload` && calls === 1)
  check('upload success: returns secure_url and publicId', r.url.startsWith('https://res.cloudinary.com/') && r.publicId === 'pasihai/abc')
  check('upload success: metadata fields present', r.resourceType === 'image' && r.format === 'jpg' && r.bytes === 1024)
}

{
  const x = await rejects(uploadMediaToCloudinary(mkFile(), { mediaType: 'image', config: { mode: 'broken', problem: 'x' }, fetchImpl: async () => respond(okJson()) }), errs.ValidationError)
  check('config broken → ValidationError (no silent fallback)', x.ok, String(x.err))
  const y = await rejects(uploadMediaToCloudinary(mkFile(), { mediaType: 'image', config: { mode: 'off' }, fetchImpl: async () => respond(okJson()) }), errs.ValidationError)
  check('config off → ValidationError when called directly', y.ok)
}

{
  let calls = 0
  const f = () => { calls += 1; return respond(okJson()) }
  const a = await rejects(uploadMediaToCloudinary(mkFile('application/pdf'), { mediaType: 'image', config: cfg, fetchImpl: f }), errs.ValidationError)
  check('wrong mime rejected before network', a.ok && calls === 0)
  const b = await rejects(uploadMediaToCloudinary(mkFile('image/jpeg', 0), { mediaType: 'image', config: cfg, fetchImpl: f }), errs.ValidationError)
  check('empty file rejected before network', b.ok && calls === 0)
  const c = await rejects(uploadMediaToCloudinary(mkFile('image/jpeg', 100), { mediaType: 'image', config: cfg, maxBytes: 10, fetchImpl: f }), errs.ValidationError)
  check('oversize file rejected before network', c.ok && calls === 0)
  const d = await rejects(uploadMediaToCloudinary(mkFile('video/mp4'), { mediaType: 'image', config: cfg, fetchImpl: f }), errs.ValidationError)
  check('video mime with image mediaType rejected', d.ok && calls === 0)
  const e = await rejects(uploadMediaToCloudinary(mkFile('image/jpeg'), { mediaType: 'raw', config: cfg, fetchImpl: f }), errs.ValidationError)
  check('unknown mediaType rejected', e.ok && calls === 0)
}

{
  const http = await rejects(uploadMediaToCloudinary(mkFile(), {
    mediaType: 'image', config: cfg,
    fetchImpl: async () => respond({ error: { message: 'Upload preset not found https://api.cloudinary.com/x secret' } }, 400),
  }), errs.NetworkError)
  check('HTTP 400 → NetworkError', http.ok, String(http.err))
  check('HTTP 400: message contains Cloudinary reason but no URL',
    /Upload preset not found/.test(http.err?.message || '') && !/https?:\/\//.test(http.err?.message || ''), http.err?.message)

  const rl = await rejects(uploadMediaToCloudinary(mkFile(), { mediaType: 'image', config: cfg, fetchImpl: async () => respond({ error: { message: 'Rate limit' } }, 429) }), errs.RateLimitError)
  check('HTTP 429 → RateLimitError', rl.ok, String(rl.err))

  const net = await rejects(uploadMediaToCloudinary(mkFile(), { mediaType: 'image', config: cfg, fetchImpl: async () => { throw new TypeError('offline') } }), errs.NetworkError)
  check('fetch failure → NetworkError', net.ok, String(net.err))

  const to = await rejects(uploadMediaToCloudinary(mkFile(), {
    mediaType: 'image', config: cfg, timeoutMs: 30,
    fetchImpl: (url, init) => new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' })))),
  }), errs.NetworkError)
  check('timeout → NetworkError with timeout message', to.ok && /muda mrefu/.test(to.err?.message || ''), String(to.err))

  const nonJson = await rejects(uploadMediaToCloudinary(mkFile(), { mediaType: 'image', config: cfg, fetchImpl: async () => new Response('<html>', { status: 502 }) }), errs.NetworkError)
  check('non-JSON 502 → NetworkError', nonJson.ok)
}

{
  const foreign = await rejects(uploadMediaToCloudinary(mkFile(), {
    mediaType: 'image', config: cfg,
    fetchImpl: async () => respond(okJson({ secure_url: 'https://evil.example.com/a.jpg' })),
  }), errs.NetworkError)
  check('response with foreign secure_url rejected', foreign.ok)

  const folder = await rejects(uploadMediaToCloudinary(mkFile(), {
    mediaType: 'image', config: cfg,
    fetchImpl: async () => respond(okJson({ public_id: 'other/abc' })),
  }), errs.NetworkError)
  check('response outside pasihai folder rejected', folder.ok)

  const rtype = await rejects(uploadMediaToCloudinary(mkFile(), {
    mediaType: 'image', config: cfg,
    fetchImpl: async () => respond(okJson({ resource_type: 'video' })),
  }), errs.NetworkError)
  check('resource_type mismatch rejected', rtype.ok)
}

{
  // Upload moja kwa wakati mmoja
  let release
  const slow = uploadMediaToCloudinary(mkFile(), {
    mediaType: 'image', config: cfg,
    fetchImpl: () => new Promise((res) => { release = () => res(respond(okJson())) }),
  })
  await new Promise((r) => setTimeout(r, 10))
  const second = await rejects(uploadMediaToCloudinary(mkFile(), { mediaType: 'image', config: cfg, fetchImpl: async () => respond(okJson()) }), errs.RateLimitError)
  check('concurrent upload in same tab → RateLimitError', second.ok)
  release()
  await slow
  const third = await uploadMediaToCloudinary(mkFile(), { mediaType: 'image', config: cfg, fetchImpl: async () => respond(okJson()) })
  check('lock released after completion', !!third.url)
}

// ── C. Usalama: hakuna secret kwenye frontend, env, wala docs za GitHub ──
const SECRET_PATTERNS = [/cloudinary:\/\/\d{6,}:[^\s'"`@<>]{8,}@/i, /CLOUDINARY_API_SECRET\s*=\s*\S+/, /api_secret\s*[:=]\s*['"][^'"]{8,}/i]
const scanDir = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    if (['node_modules', 'dist', '.git', 'logs'].includes(name)) continue
    const p = join(dir, name)
    if (statSync(p).isDirectory()) scanDir(p, out)
    else if (/\.(jsx?|mjs|ts|tsx|html|md|json|example|env\S*)$/.test(name) || name.startsWith('.env')) out.push(p)
  }
  return out
}
const files = [...scanDir(join(ROOT, 'src')), ...scanDir(join(ROOT, 'scripts')).filter((p) => !p.endsWith('test-cloudinary.mjs'))]
  .concat(['.env.example', '.env.local', 'README.md'].map((f) => join(ROOT, f)).filter((f) => existsSync(f)))
const leaks = files.filter((f) => SECRET_PATTERNS.some((re) => re.test(readFileSync(f, 'utf8'))))
check('no API secret pattern in src/, scripts/, env files, README', leaks.length === 0, leaks.join(', '))
const srcSecrets = scanDir(join(ROOT, 'src')).filter((f) => /CLOUDINARY_API_SECRET|VITE_CLOUDINARY_API|CLOUDINARY_URL/.test(readFileSync(f, 'utf8')))
check('src/ never references backend-only Cloudinary secret vars', srcSecrets.length === 0, srcSecrets.join(', '))

const envExample = existsSync(join(ROOT, '.env.example')) ? readFileSync(join(ROOT, '.env.example'), 'utf8') : ''
check('.env.example lists VITE_CLOUDINARY_CLOUD_NAME (name only)', /^VITE_CLOUDINARY_CLOUD_NAME=\s*$/m.test(envExample))
check('.env.example lists VITE_CLOUDINARY_UPLOAD_PRESET (name only)', /^VITE_CLOUDINARY_UPLOAD_PRESET=\s*$/m.test(envExample))
check('.env.example has no CLOUDINARY_URL / API secret value', !/CLOUDINARY_URL=\S+|API_SECRET=\S+/.test(envExample))

// ── B. Repo tests (bundle mbili) ─────────────────────────────
const runBundle = (label, extraEnv, expectMode) => {
  const outDir = join(ROOT, 'node_modules', `.cloud-${label}`)
  const env = { ...process.env }
  for (const k of Object.keys(env)) if (k.startsWith('VITE_CLOUDINARY_')) delete env[k]
  Object.assign(env, {
    VITE_SUPABASE_MODE: 'live',
    VITE_SUPABASE_URL: 'https://cloudinary-test-project.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_only_not_real',
    ...extraEnv,
  })
  try {
    execSync(`npx vite build --ssr scripts/test-cloudinary-repo.jsx --outDir ${outDir} --emptyOutDir --logLevel error`, {
      cwd: ROOT, env, stdio: 'pipe', timeout: 240_000,
    })
  } catch (err) {
    check(`build bundle ${label}`, false, String(err.stderr || err.message).slice(0, 600))
    return
  }
  const run = spawnSync(process.execPath, [join(outDir, 'test-cloudinary-repo.js')], {
    cwd: ROOT,
    env: { ...process.env, EXPECT_CLOUDINARY_MODE: expectMode },
    encoding: 'utf8',
    timeout: 120_000,
  })
  const lines = (run.stdout || '').split('\n')
  for (const line of lines) {
    const m = /^RESULT (PASS|FAIL) (.*)$/.exec(line)
    if (m) check(`[repo ${label}] ${m[2].split(' :: ')[0]}`, m[1] === 'PASS', line)
  }
  if (run.status !== 0 && !lines.some((l) => l.startsWith('RESULT'))) {
    check(`[repo ${label}] bundle ran`, false, (run.stderr || run.stdout || '').slice(0, 600))
  }
}

runBundle('on', { VITE_CLOUDINARY_CLOUD_NAME: CLOUD, VITE_CLOUDINARY_UPLOAD_PRESET: 'pasihai_preset' }, 'on')
// .env.local inaweza kuwa na VITE_CLOUDINARY_*; bundle ya 'off' lazima iwe bila cloud,
// kwa hiyo tunaweka thamani tupu (env ya process ina nguvu kuliko faili za .env).
runBundle('off', { VITE_CLOUDINARY_CLOUD_NAME: '', VITE_CLOUDINARY_UPLOAD_PRESET: '' }, 'off')

console.log(`\nCLOUDINARY TESTS: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
