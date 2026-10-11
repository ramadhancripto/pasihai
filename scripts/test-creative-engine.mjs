// Tests za Creative engine: modeli ya hati, sanitize, uhariri, historia, renderer (ctx ya kuigwa), na store ya miradi.
import assert from 'node:assert/strict'
import {
  MODES, MAX_LAYERS, createDocument, sanitizeDocument, addLayer, updateLayer, removeLayer,
  duplicateLayer, moveLayer, moveLayerTo, alignLayer, setBackground, makeText, makeShape, makeImage,
  snapPosition, createHistory, commitHistory, undoHistory, redoHistory, canUndo, canRedo,
  applyTemplate, STARTER_TEMPLATES, CreativeValidationError, normalizeLayer, FONTS, SCHEMA_VERSION,
  resizeGeometry, rotationFor, angleDeg, MIN_LAYER_SIZE,
} from '../src/creative/creativeModel.js'
import {
  wrapLines, shapePrimitives, gradientEndpoints, renderDocument, ExportError,
} from '../src/creative/creativeRender.js'
import {
  saveProject, listProjects, getProject, removeProject, writeRecovery, readRecovery, clearRecovery,
  CreativeConflictError, CreativeQuotaError,
} from '../src/creative/creativeProjects.js'

let pass = 0, fail = 0
function t(name, fn) {
  return Promise.resolve().then(fn).then(
    () => { pass++; console.log(`  ✓ ${name}`) },
    (e) => { fail++; console.log(`  ✗ ${name}\n    ${e.message}`) },
  )
}
const memStore = (opts = {}) => {
  const m = new Map()
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => {
      if (opts.fail) { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e }
      m.set(k, String(v))
    },
    removeItem: (k) => m.delete(k),
    _m: m,
  }
}
// Canvas 2D ctx ya kuigwa: inarekodi wito wote, measureText = herufi 10px.
function fakeCtx() {
  const calls = []
  const ctx = {
    calls, fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, font: '', textAlign: '',
    textBaseline: '', filter: 'none', letterSpacing: '0px', shadowColor: '', shadowBlur: 0, shadowOffsetX: 0,
    shadowOffsetY: 0, lineJoin: '', lineCap: '',
    save() { calls.push(['save']) }, restore() { calls.push(['restore']) },
    translate() {}, rotate() {}, clip() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {},
    arc() {}, rect() {}, ellipse() {}, stroke() { calls.push(['stroke']) },
    fill() { calls.push(['fill', ctx.fillStyle]) },
    fillRect(...a) { calls.push(['fillRect', ...a, ctx.fillStyle]) },
    drawImage(...a) { calls.push(['drawImage', ...a]) },
    fillText(text, x, y) { calls.push(['fillText', text, x, y, ctx.fillStyle]) },
    strokeText(text) { calls.push(['strokeText', text]) },
    measureText: (s) => ({ width: s.length * 10 }),
    createLinearGradient() { return { addColorStop() {} } },
  }
  return ctx
}
const okImg = async () => ({ naturalWidth: 100, naturalHeight: 50 })
const PNG = 'data:image/png;base64,iVBORw0KGgo='

console.log('Creative engine — modeli ya hati')

await t('modes zote zina ukubwa chanya na status halali', () => {
  for (const m of Object.values(MODES)) {
    assert.ok(m.width > 0 && m.height > 0, m.id)
    assert.ok(['available', 'partial', 'planned'].includes(m.status), m.id)
  }
})

await t('createDocument inatumia ukubwa wa mode; custom inabana kwenye 200..4000', () => {
  const d = createDocument('story')
  assert.equal(d.width, 1080); assert.equal(d.height, 1920)
  const c = createDocument('custom', { width: 50, height: 99999 })
  assert.equal(c.width, 200); assert.equal(c.height, 4000)
})

await t('mode yenye layers za kuanzia zinajengwa na ni halali', () => {
  const d = createDocument('poster')
  assert.equal(d.layers.length, 2)
  const { doc, warnings } = sanitizeDocument(d)
  assert.equal(doc.layers.length, 2)
  assert.deepEqual(warnings, [])
})

await t('mode isiyojulikana inaanguka kwa blank', () => {
  assert.equal(createDocument('nope').mode, 'blank')
})

await t('sanitize: schema batili inakataliwa', () => {
  assert.throws(() => sanitizeDocument({ ...createDocument('blank'), schema: 2 }), CreativeValidationError)
})

await t('sanitize: hati si object inakataliwa', () => {
  assert.throws(() => sanitizeDocument(null), CreativeValidationError)
  assert.throws(() => sanitizeDocument([]), CreativeValidationError)
})

await t('sanitize: javascript: na http kwenye picha vinakataliwa', () => {
  const base = createDocument('blank')
  const bad = (src) => ({ ...base, layers: [{ type: 'image', src, naturalW: 10, naturalH: 10, w: 10, h: 10 }] })
  assert.throws(() => sanitizeDocument(bad('javascript:alert(1)')), CreativeValidationError)
  assert.throws(() => sanitizeDocument(bad('http://example.com/a.png')), CreativeValidationError)
  assert.throws(() => sanitizeDocument(bad('data:text/html;base64,PGgxPg==')), CreativeValidationError)
  assert.equal(sanitizeDocument(bad(PNG)).doc.layers[0].src, PNG)
  assert.equal(sanitizeDocument(bad('https://cdn.example.com/x.jpg')).doc.layers[0].src, 'https://cdn.example.com/x.jpg')
})

await t('sanitize: rangi, font, na thamani za nambari zinabanwa', () => {
  const d = createDocument('blank')
  d.layers = [{ type: 'text', text: 'hi', color: 'red', fontKey: 'comic-sans', fontSize: 99999, rotation: 370, opacity: 9, w: 300, h: 80, x: 0, y: 0 }]
  const l = sanitizeDocument(d).doc.layers[0]
  assert.equal(l.color, '#1b1f1d')
  assert.equal(l.fontKey, 'inter')
  assert.equal(l.fontSize, 600)
  assert.equal(l.rotation, 10)
  assert.equal(l.opacity, 1)
})

await t('sanitize: aina ya kipengele isiyojulikana inakataliwa', () => {
  const d = createDocument('blank')
  d.layers = [{ type: 'script', x: 0, y: 0, w: 10, h: 10 }]
  assert.throws(() => sanitizeDocument(d), CreativeValidationError)
})

await t('sanitize: kitambulisho kilichorudiwa kinabadilishwa na onyo linatolewa', () => {
  const a = makeText({ id: 'dupA' })
  const d = { ...createDocument('blank'), layers: [a, { ...a }] }
  const { doc, warnings } = sanitizeDocument(d)
  assert.equal(warnings.length, 1)
  assert.notEqual(doc.layers[0].id, doc.layers[1].id)
})

await t('sanitize: maandishi yanabaki maandishi (HTML haitekelezwi, herufi za udhibiti zinaondolewa)', () => {
  const d = createDocument('blank')
  d.layers = [makeText({ text: '<img src=x onerror=alert(1)>\u0007ok' })]
  const l = sanitizeDocument(d).doc.layers[0]
  assert.equal(l.text, '<img src=x onerror=alert(1)>ok')
})

await t('sanitize: tabaka zaidi ya 200 zinakataliwa', () => {
  const d = createDocument('blank')
  d.layers = Array.from({ length: MAX_LAYERS + 1 }, () => makeText())
  assert.throws(() => sanitizeDocument(d), CreativeValidationError)
})

await t('normalizeLayer: aina haibadiliki kwa updateLayer, id inabaki', () => {
  let d = { ...createDocument('blank'), layers: [makeText({ id: 'keep1' })] }
  d = updateLayer(d, 'keep1', { type: 'shape', id: 'other' })
  assert.equal(d.layers[0].type, 'text')
  assert.equal(d.layers[0].id, 'keep1')
})

await t('updateLayer: hakuna mabadiliko inarudisha hati ile ile', () => {
  const d = { ...createDocument('blank'), layers: [makeText({ id: 'same1' })] }
  assert.equal(updateLayer(d, 'same1', { fontSize: 64 }), d)
})

await t('updateLayer: thamani mpya inatumika na hati ya zamani haibadiliki', () => {
  const d = { ...createDocument('blank'), layers: [makeText({ id: 'ed1', fontSize: 40 })] }
  const d2 = updateLayer(d, 'ed1', { fontSize: 88 })
  assert.equal(d2.layers[0].fontSize, 88)
  assert.equal(d.layers[0].fontSize, 40)
})

await t('addLayer: kikomo cha 200 kinafanya kazi', () => {
  let d = { ...createDocument('blank'), layers: Array.from({ length: MAX_LAYERS }, () => makeText()) }
  assert.throws(() => addLayer(d, makeText()), CreativeValidationError)
})

await t('duplicateLayer: nakala iko juu ya asili, id mpya, imesogezwa', () => {
  const d = { ...createDocument('blank'), layers: [makeText({ id: 'a1', x: 10 }), makeText({ id: 'b1' })] }
  const { doc, id } = duplicateLayer(d, 'a1')
  assert.equal(doc.layers[1].id, id)
  assert.notEqual(id, 'a1')
  assert.equal(doc.layers[1].x, 34)
  assert.equal(doc.layers.length, 3)
})

await t('moveLayer: front/back/forward/backward zinafanya kazi na zinabana mipaka', () => {
  const base = { ...createDocument('blank'), layers: [makeText({ id: 'p' }), makeText({ id: 'q' }), makeText({ id: 'r' })] }
  const order = (d) => d.layers.map((l) => l.id).join('')
  assert.equal(order(moveLayer(base, 'p', 'front')), 'qrp')
  assert.equal(order(moveLayer(base, 'r', 'back')), 'rpq')
  assert.equal(order(moveLayer(base, 'p', 'forward')), 'qpr')
  assert.equal(order(moveLayer(base, 'r', 'forward')), 'pqr')
  assert.equal(order(moveLayer(base, 'p', 'backward')), 'pqr')
  assert.equal(moveLayerTo(base, 'p', 99).layers[2].id, 'p')
})

await t('removeLayer: inaondoa kipengele kimoja tu', () => {
  const d = { ...createDocument('blank'), layers: [makeText({ id: 'x1' }), makeText({ id: 'x2' })] }
  assert.deepEqual(removeLayer(d, 'x1').layers.map((l) => l.id), ['x2'])
})

await t('alignLayer: centerX inaweka kipengele katikati ya turubai', () => {
  const d = { ...createDocument('blank'), width: 1000, height: 500, layers: [makeText({ id: 'c1', w: 200, h: 100 })] }
  const d2 = alignLayer(d, 'c1', 'centerX')
  assert.equal(d2.layers[0].x, 400)
  assert.equal(alignLayer(d2, 'c1', 'bottom').layers[0].y, 400)
})

await t('snapPosition: karibu na katikati inavutwa na mwongozo unaonyeshwa', () => {
  const d = { ...createDocument('blank'), width: 1000, height: 1000 }
  const layer = makeText({ w: 200, h: 100 })
  const s = snapPosition(d, layer, 398, 100)
  assert.equal(s.x, 400)
  assert.deepEqual(s.guides.v, [500])
  const far = snapPosition(d, layer, 100, 100)
  assert.equal(far.x, 100)
  assert.deepEqual(far.guides.v, [])
})

await t('setBackground: gradient na picha vinabanwa; picha isiyo salama inakataliwa', () => {
  const d = createDocument('blank')
  assert.equal(setBackground(d, { type: 'gradient', from: '#abcdef', to: 'nope', angle: 900 }).background.to, '#3b82f6')
  assert.throws(() => setBackground(d, { type: 'image', src: 'javascript:1' }), CreativeValidationError)
})

await t('makeImage: inahifadhi uwiano na inakaa ndani ya 80% ya turubai', () => {
  const d = createDocument('blank')
  const img = makeImage(PNG, { width: 4000, height: 2000 }, d)
  assert.ok(img.w <= d.width * 0.8 + 1)
  assert.equal(Math.round(img.w / img.h), 2)
})

await t('makeShape: mistari haina fill, ina stroke', () => {
  const s = makeShape('line')
  assert.equal(s.fill, null)
  assert.ok(s.strokeWidth > 0)
})

console.log('Creative engine — historia (undo/redo)')

await t('undo na redo zinarudisha hali sahihi', () => {
  let h = createHistory({ v: 1 })
  h = commitHistory(h, { v: 2 })
  h = commitHistory(h, { v: 3 })
  assert.equal(undoHistory(h).present.v, 2)
  assert.equal(redoHistory(undoHistory(h)).present.v, 3)
  assert.equal(canUndo(createHistory({})), false)
  assert.equal(canRedo(h), false)
})

await t('commit mpya baada ya undo inafuta future', () => {
  let h = createHistory({ v: 1 })
  h = commitHistory(h, { v: 2 })
  h = undoHistory(h)
  h = commitHistory(h, { v: 9 })
  assert.equal(canRedo(h), false)
})

await t('mabadiliko yenye key sawa yanaunganishwa kuwa hatua moja ya undo', () => {
  let h = createHistory({ s: 10 })
  h = commitHistory(h, { s: 20 }, 'size:a')
  h = commitHistory(h, { s: 30 }, 'size:a')
  h = commitHistory(h, { s: 40 }, 'size:a')
  assert.equal(h.past.length, 1)
  assert.equal(undoHistory(h).present.s, 10)
})

await t('historia inabana kwa limit', () => {
  let h = createHistory({ n: 0 }, 3)
  for (let i = 1; i <= 10; i++) h = commitHistory(h, { n: i })
  assert.equal(h.past.length, 3)
})

console.log('Creative engine — jiometri ya kuhariri')

// Kona ya umbo katika turubai, kwa umbo lililozungushwa.
const corner = (g, sx, sy) => {
  const r = (g.rotation || 0) * Math.PI / 180
  const cx = g.x + g.w / 2
  const cy = g.y + g.h / 2
  const lx = (sx * g.w) / 2
  const ly = (sy * g.h) / 2
  return { x: cx + lx * Math.cos(r) - ly * Math.sin(r), y: cy + lx * Math.sin(r) + ly * Math.cos(r) }
}

await t('resizeGeometry: kona ya kusini-mashariki bila mzunguko', () => {
  const g = resizeGeometry({ x: 100, y: 100, w: 200, h: 100, rotation: 0 }, 1, 1, 50, 20)
  assert.deepEqual(g, { x: 100, y: 100, w: 250, h: 120 })
})

await t('resizeGeometry: kona ya kaskazini-magharibi inasogeza x,y', () => {
  const g = resizeGeometry({ x: 100, y: 100, w: 200, h: 100, rotation: 0 }, -1, -1, -30, -10)
  assert.deepEqual(g, { x: 70, y: 90, w: 230, h: 110 })
})

await t('resizeGeometry: kona iliyo kinyume inabaki mahali pake, hata umbo likiwa limezungushwa', () => {
  const orig = { x: 300, y: 220, w: 240, h: 120, rotation: 37 }
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]]
  for (const [sx, sy] of corners) {
    const before = corner(orig, -sx, -sy) // kona ya kinyume kabla
    const r = (orig.rotation * Math.PI) / 180
    // Mwendo wa kielekezi kwenye mihimili yote miwili ya umbo (30px mlalo, 20px wima).
    const lx = 30 * sx
    const ly = 20 * sy
    const dx = lx * Math.cos(r) - ly * Math.sin(r)
    const dy = lx * Math.sin(r) + ly * Math.cos(r)
    const geo = resizeGeometry(orig, sx, sy, dx, dy)
    const after = corner({ ...geo, rotation: orig.rotation }, -sx, -sy)
    assert.ok(Math.hypot(after.x - before.x, after.y - before.y) < 1.5, `kona ${sx},${sy}: ${JSON.stringify([before, after])}`)
  }
})

await t('resizeGeometry: picha inahifadhi uwiano wake', () => {
  const g = resizeGeometry({ x: 0, y: 0, w: 200, h: 100, rotation: 0 }, 1, 1, 50, 0, true)
  assert.equal(g.w, 250)
  assert.equal(g.h, 125)
})

await t('resizeGeometry: haishuki chini ya ukubwa wa chini', () => {
  const g = resizeGeometry({ x: 0, y: 0, w: 200, h: 100, rotation: 0 }, 1, 1, -1000, -1000)
  assert.equal(g.w, MIN_LAYER_SIZE)
  assert.equal(g.h, MIN_LAYER_SIZE)
})

await t('rotationFor: mzunguko unaongezeka na unazunguka 360', () => {
  assert.equal(rotationFor(0, 0, 20), 20)
  assert.equal(rotationFor(350, 0, 20), 10)
  assert.equal(rotationFor(10, 0, -20), 350)
})

await t('rotationFor: karibu na 15° inarekebishwa; mbali haijarekebishwa', () => {
  assert.equal(rotationFor(0, 0, 17), 15)
  assert.equal(rotationFor(0, 0, 10), 10)
})

await t('angleDeg: kielekezi juu ya kituo ni -90°, kulia ni 0°', () => {
  assert.equal(Math.round(angleDeg({ x: 0, y: 0 }, { x: 0, y: -5 })), -90)
  assert.equal(Math.round(angleDeg({ x: 0, y: 0 }, { x: 5, y: 0 })), 0)
})

console.log('Creative engine — maandishi, maumbo, gradient')

await t('wrapLines: inavunja kwa upana na kuhifadhi mistari mipya', () => {
  const lines = wrapLines('habari ya leo\nkaribu', 70, (s) => s.length * 10)
  assert.deepEqual(lines, ['habari', 'ya leo', 'karibu'])
})

await t('wrapLines: neno refu kuliko turubai linakatwa bila kupotea herufi', () => {
  const lines = wrapLines('abcdefghijkl', 30, (s) => s.length * 10)
  assert.equal(lines.join(''), 'abcdefghijkl')
  assert.ok(lines.length > 1)
})

await t('shapePrimitives: kila umbo lina primitive halali', () => {
  for (const shape of ['rect', 'rounded', 'ellipse', 'triangle', 'line', 'arrow']) {
    const p = shapePrimitives(makeShape(shape, { shape }))
    assert.ok(p.length >= 1, shape)
  }
  assert.equal(shapePrimitives(makeShape('triangle'))[0].kind, 'polygon')
  assert.equal(shapePrimitives(makeShape('arrow')).length, 2)
})

await t('gradientEndpoints: 135° inaenda chini-kulia (x1>x0, y1>y0)', () => {
  const e = gradientEndpoints(100, 100, 135)
  assert.ok(e.x1 > e.x0 && e.y1 > e.y0)
  const up = gradientEndpoints(100, 100, 0)
  assert.ok(up.y1 < up.y0)
})

console.log('Creative engine — renderer (ctx ya kuigwa)')

await t('renderDocument: mandhari ya rangi imejazwa kwanza', async () => {
  const ctx = fakeCtx()
  const d = { ...createDocument('custom', { width: 400, height: 300 }), background: { type: 'solid', color: '#abcdef' } }
  await renderDocument(d, ctx, { loadImage: okImg })
  assert.deepEqual(ctx.calls[0], ['fillRect', 0, 0, 400, 300, '#abcdef'])
})

await t('renderDocument: maandishi yanachorwa mstari kwa mstari', async () => {
  const ctx = fakeCtx()
  const d = { ...createDocument('custom', { width: 400, height: 300 }), layers: [makeText({ text: 'ab\ncd', w: 300, h: 100, color: '#000000' })] }
  await renderDocument(d, ctx, { loadImage: okImg })
  const texts = ctx.calls.filter((c) => c[0] === 'fillText').map((c) => c[1])
  assert.deepEqual(texts, ['ab', 'cd'])
})

await t('renderDocument: tabaka iliyofichwa haichorwi', async () => {
  const ctx = fakeCtx()
  const d = { ...createDocument('custom', { width: 400, height: 300 }), layers: [makeText({ text: 'siri', hidden: true })] }
  await renderDocument(d, ctx, { loadImage: okImg })
  assert.equal(ctx.calls.filter((c) => c[0] === 'fillText').length, 0)
})

await t('renderDocument: picha inapakiwa na kuchorwa kwa crop', async () => {
  const ctx = fakeCtx()
  const d = { ...createDocument('custom', { width: 400, height: 300 }), layers: [makeImage(PNG, { width: 100, height: 50 }, createDocument('custom', { width: 400, height: 300 }), { crop: { x: 0.5, y: 0, w: 0.5, h: 1 } })] }
  let loads = 0
  await renderDocument(d, ctx, { loadImage: async (s) => { loads++; return okImg() } })
  assert.equal(loads, 1) // picha moja, inapakiwa mara moja (cache)
  const draw = ctx.calls.find((c) => c[0] === 'drawImage')
  assert.equal(draw[2], 50) // sx = 0.5 * 100 (index 1 ni img)
})

await t('renderDocument: picha inayoshindwa kupakiwa inatupa ExportError yenye jina la tabaka', async () => {
  const ctx = fakeCtx()
  const d = { ...createDocument('custom', { width: 400, height: 300 }), layers: [makeImage(PNG, { width: 100, height: 50 }, createDocument('custom', { width: 400, height: 300 }), { name: 'Logo' })] }
  await assert.rejects(renderDocument(d, ctx, { loadImage: async () => { throw new Error('404') } }), (e) => e instanceof ExportError && /Logo/.test(e.message))
})

await t('renderDocument: progress inaripoti picha zinazopakiwa', async () => {
  const ctx = fakeCtx()
  const base = createDocument('custom', { width: 400, height: 300 })
  const d = { ...base, layers: [makeImage(PNG, { width: 100, height: 50 }, base), makeImage(PNG, { width: 100, height: 50 }, base)] }
  const seen = []
  await renderDocument(d, ctx, { loadImage: okImg, onProgress: (p) => seen.push(p.done) })
  assert.deepEqual(seen, [0, 1, 2])
})

await t('renderDocument: bila loadImage inatupa kosa wazi', async () => {
  await assert.rejects(renderDocument(createDocument('blank'), fakeCtx(), {}), ExportError)
})

await t('applyTemplate: template zote zinaundwa na ni halali', () => {
  for (const tpl of STARTER_TEMPLATES) {
    const d = applyTemplate(createDocument('blank'), tpl.id)
    assert.ok(d.layers.length >= 1, tpl.id)
    assert.doesNotThrow(() => sanitizeDocument(d))
  }
})

await t('FONTS: fonti mbili tu ndizo zimefungwa kwenye app', () => {
  assert.equal(FONTS.filter((f) => f.bundled).length, 2)
})

await t('schema version ni 1', () => {
  assert.equal(SCHEMA_VERSION, 1)
})

console.log('Creative engine — store ya miradi (kifaa)')

await t('saveProject: inahifadhi, revision inapanda, na listProjects inarudisha mradi', () => {
  const s = memStore()
  const { record } = saveProject('u1', { doc: createDocument('social') }, s)
  assert.equal(record.revision, 1)
  const again = saveProject('u1', { id: record.id, revision: 1, doc: createDocument('social', { title: 'Mpya' }) }, s).record
  assert.equal(again.revision, 2)
  assert.equal(listProjects('u1', s).length, 1)
  assert.equal(getProject('u1', record.id, s).doc.title, 'Mpya')
})

await t('saveProject: revision ya zamani inazuia overwrite (CreativeConflictError)', () => {
  const s = memStore()
  const { record } = saveProject('u1', { doc: createDocument('blank') }, s)
  saveProject('u1', { id: record.id, revision: 1, doc: createDocument('blank') }, s)
  assert.throws(() => saveProject('u1', { id: record.id, revision: 1, doc: createDocument('blank') }, s), CreativeConflictError)
})

await t('saveProject: mradi usiokuwepo unakataliwa', () => {
  assert.throws(() => saveProject('u1', { id: 'nope', doc: createDocument('blank') }, memStore()), /haupo/)
})

await t('miradi imetengwa kwa mtumiaji', () => {
  const s = memStore()
  saveProject('u1', { doc: createDocument('blank') }, s)
  assert.equal(listProjects('u2', s).length, 0)
})

await t('saveProject: hati batili haihifadhiwi', () => {
  assert.throws(() => saveProject('u1', { doc: { schema: 9 } }, memStore()), CreativeValidationError)
})

await t('saveProject: quota ya localStorage inageuzwa kuwa CreativeQuotaError', () => {
  assert.throws(() => saveProject('u1', { doc: createDocument('blank') }, memStore({ fail: true })), CreativeQuotaError)
})

await t('saveProject: mradi mkubwa kuliko kikomo unakataliwa (picha kubwa)', () => {
  const big = { ...createDocument('blank'), layers: [makeImage(`data:image/png;base64,${'A'.repeat(3_600_000)}`, { width: 10, height: 10 }, createDocument('blank'))] }
  assert.throws(() => saveProject('u1', { doc: big }, memStore()), CreativeQuotaError)
})

await t('removeProject: inaondoa na inarudisha false kwa id isiyopo', () => {
  const s = memStore()
  const { record } = saveProject('u1', { doc: createDocument('blank') }, s)
  assert.equal(removeProject('u1', record.id, s), true)
  assert.equal(removeProject('u1', record.id, s), false)
})

await t('recovery: inaandika, inasoma, na inafuta', () => {
  const s = memStore()
  assert.equal(writeRecovery('u1', { projectId: null, doc: createDocument('blank') }, s), true)
  assert.equal(readRecovery('u1', s).doc.mode, 'blank')
  clearRecovery('u1', s)
  assert.equal(readRecovery('u1', s), null)
})

await t('recovery: data iliyoharibika inapuuzwa bila kuvunja app', () => {
  const s = memStore()
  s.setItem('pasihai.creative.recovery.v1:u1', '{broken')
  assert.equal(readRecovery('u1', s), null)
})

console.log(`\n${pass} PASS, ${fail} FAIL`)
if (fail) process.exit(1)
