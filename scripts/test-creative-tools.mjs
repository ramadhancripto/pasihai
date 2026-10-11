// Tests za zana za Create: rejista ya zana (A–P), safu ya uwezo, vitendo vya vipengele vingi,
// clipboard, flip, na uwazi/export kwenye renderer. Hazihitaji browser.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  createDocument, addLayer, makeText, makeShape, makeImage, removeLayers, duplicateLayers, setLayersFlag,
  alignLayers, distributeLayers, copyLayers, pasteLayers, normalizeLayer, updateLayer, findLayer, MAX_LAYERS,
} from '../src/creative/creativeModel.js'
import { renderDocument, EXPORT_FORMATS } from '../src/creative/creativeRender.js'
import { GROUPS, TOOLS, ACTION_IDS, findTool, matchesQuery, STATUS_LABEL } from '../src/creative/toolRegistry.js'
import { toolState, SERVICES, hasEntitlement, countByStatus } from '../src/creative/capabilities.js'

let pass = 0, fail = 0
function t(name, fn) {
  return Promise.resolve().then(fn).then(
    () => { pass++; console.log(`  ✓ ${name}`) },
    (e) => { fail++; console.log(`  ✗ ${name}\n    ${e.message}`) },
  )
}

// Hati yenye vipengele vitatu vya maumbo.
function docWithShapes() {
  let doc = createDocument('custom', { width: 1000, height: 800 })
  const ids = []
  for (const [x, y, w, h] of [[100, 100, 100, 100], [400, 150, 200, 100], [700, 300, 80, 120]]) {
    const r = addLayer(doc, makeShape('rect', { x, y, w, h }))
    doc = r.doc
    ids.push(r.id)
  }
  return { doc, ids }
}

// Canvas 2D ctx ya kuigwa (kama creative engine test).
function fakeCtx() {
  const calls = []
  const ctx = {
    calls, fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, font: '', textAlign: '',
    textBaseline: '', filter: 'none', letterSpacing: '0px', shadowColor: '', shadowBlur: 0, shadowOffsetX: 0,
    shadowOffsetY: 0, lineJoin: '', lineCap: '',
    save() { calls.push(['save']) }, restore() { calls.push(['restore']) },
    translate(...a) { calls.push(['translate', ...a]) }, rotate() {}, scale(...a) { calls.push(['scale', ...a]) },
    clip() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, rect() {}, ellipse() {},
    stroke() {}, fill() {},
    fillRect(...a) { calls.push(['fillRect', ...a, ctx.fillStyle]) },
    drawImage(...a) { calls.push(['drawImage', ...a]) },
    fillText() {}, strokeText() {},
    measureText: (s) => ({ width: s.length * 10 }),
    createLinearGradient() { return { addColorStop() {} } },
  }
  return ctx
}
const okImg = async () => ({ naturalWidth: 100, naturalHeight: 50 })

console.log('Zana — rejista')

await t('rejista: kila kundi A–P lina angalau zana moja', () => {
  for (const g of GROUPS) assert.ok(TOOLS.some((x) => x.group === g.id), `kundi ${g.id} tupu`)
  assert.equal(GROUPS.length, 16)
  // §D: makundi 16 kwa mpangilio wa spec
  assert.deepEqual(GROUPS.map((g) => g.title), [
    'Select & Arrange', 'Text', 'Images & Photos', 'Background', 'Shapes & Drawing', 'Stickers & Elements',
    'Colors & Styles', 'Effects & Filters', 'Templates & Layout', 'Layers', 'Pages & Scenes', 'Video Editor',
    'Animation & Motion', 'Audio & Captions', 'AI Tools', 'Export & Publish',
  ])
  const gids = new Set(GROUPS.map((g) => g.id))
  for (const x of TOOLS) assert.ok(gids.has(x.group), `kundi batili: ${x.id}`)
  assert.equal(new Set(TOOLS.map((x) => x.id)).size, TOOLS.length, 'id zinazojirudia')
  // Zana ya "ready" bila kitendo lazima iwe na `where` (kidokezo cha mahali pa kuipata)
  for (const x of TOOLS.filter((y) => y.status === 'ready' && !y.action)) assert.ok(x.where, `ready bila kitendo wala where: ${x.id}`)
  // Hakuna zana ya pili yenye lebo ya kitendo kimoja (hakuna nakala ya kitendo)
  const actions = TOOLS.filter((x) => x.action).map((x) => x.action)
  assert.equal(new Set(actions).size, actions.length, 'kitendo kinarudiwa kwenye zana mbili')
})

await t('rejista: kitambulisho hakirudiwi', () => {
  const ids = TOOLS.map((x) => x.id)
  assert.equal(new Set(ids).size, ids.length, 'kuna id zinazorudiwa')
})

await t('rejista: kila zana ina hali halali', () => {
  const valid = Object.keys(STATUS_LABEL)
  for (const x of TOOLS) assert.ok(valid.includes(x.status), `${x.id}: hali ${x.status}`)
})

await t('rejista: zana ready/partial ina action (kwenye ACTION_IDS) au where', () => {
  for (const x of TOOLS.filter((y) => y.status === 'ready' || y.status === 'partial')) {
    if (x.action) assert.ok(ACTION_IDS.includes(x.action), `${x.id}: action ${x.action} haipo kwenye ACTION_IDS`)
    else assert.ok(x.where, `${x.id}: haina action wala where`)
  }
})

await t('rejista: kila action kwenye ACTION_IDS inatumiwa na zana moja angalau', () => {
  const used = new Set(TOOLS.map((x) => x.action).filter(Boolean))
  for (const a of ACTION_IDS) assert.ok(used.has(a), `action ${a} haitumiki na zana yoyote`)
})

await t('rejista: planned/service/premium zote zina maelezo (note)', () => {
  for (const x of TOOLS.filter((y) => ['planned', 'service', 'premium'].includes(y.status))) {
    assert.ok(x.note && x.note.length > 5, `${x.id} haina note`)
  }
})

await t('rejista: zana ya huduma ina service, ya premium ina entitlement', () => {
  for (const x of TOOLS.filter((y) => y.status === 'service')) assert.ok(x.service in SERVICES, `${x.id}: service ${x.service}`)
  for (const x of TOOLS.filter((y) => y.status === 'premium')) assert.ok(x.entitlement, `${x.id}: haina entitlement`)
})

await t('rejista: njia za mkato hazirudiwi', () => {
  const sc = TOOLS.filter((x) => x.shortcut && x.status !== 'planned').map((x) => x.shortcut)
  assert.equal(new Set(sc).size, sc.length, `njia za mkato zinazorudiwa: ${sc.join(',')}`)
})

await t('rejista: utafutaji unapata kwa lebo, maneno muhimu, na njia ya mkato', () => {
  assert.ok(matchesQuery(findTool('text.add'), 'maandishi'))
  assert.ok(matchesQuery(findTool('obj.duplicate'), 'nakala'))
  assert.ok(matchesQuery(findTool('edit.undo'), 'ctrl+z'))
  assert.ok(!matchesQuery(findTool('text.add'), 'video'))
  assert.ok(matchesQuery(findTool('text.add'), ''))
})

await t('rejista: ACTION_IDS zote zinaonekana kwenye msimbo wa mhariri (CreativeEditor.jsx)', () => {
  const src = readFileSync(new URL('../src/components/creative/CreativeEditor.jsx', import.meta.url), 'utf8')
  for (const a of ACTION_IDS) assert.ok(src.includes(`'${a}'`), `CreativeEditor.jsx haitekelezi '${a}'`)
})

console.log('\nZana — safu ya uwezo')

await t('uwezo: planned imezimwa na lebo "Mpango"', () => {
  const s = toolState(findTool('video.add'))
  assert.equal(s.enabled, false)
  assert.equal(s.badge, 'Mpango')
})

await t('uwezo: service imezimwa wakati huduma haijaunganishwa', () => {
  const s = toolState(findTool('ai.caption'), { services: { ai: false } })
  assert.equal(s.enabled, false)
  assert.equal(s.badge, 'Huduma')
})

await t('uwezo: service inawaka tu huduma ikiwa imeunganishwa', () => {
  assert.equal(toolState(findTool('ai.caption'), { services: { ...SERVICES, ai: true } }).enabled, true)
})

await t('uwezo: premium imefungwa kwenye mpango wa free', () => {
  assert.equal(toolState(findTool('biz.premiumAssets'), { plan: 'free' }).enabled, false)
  assert.equal(toolState(findTool('biz.premiumAssets'), { plan: 'premium' }).enabled, true)
  assert.equal(hasEntitlement('free', 'ai_credits'), false)
})

await t('uwezo: zana inayohitaji uteuzi imezimwa bila uteuzi, na inaeleza kwa nini', () => {
  const s = toolState(findTool('obj.delete'), { selectionCount: 0 })
  assert.equal(s.enabled, false)
  assert.ok(s.reason.includes('Chagua'))
  assert.equal(toolState(findTool('obj.delete'), { selectionCount: 1 }).enabled, true)
})

await t('uwezo: zana ya maandishi haiwaki kwa picha iliyochaguliwa', () => {
  assert.equal(toolState(findTool('text.bold'), { selectionCount: 1, selectionType: 'image' }).enabled, false)
  assert.equal(toolState(findTool('text.bold'), { selectionCount: 1, selectionType: 'text' }).enabled, true)
})

await t('uwezo: multi3 inahitaji vipengele vitatu', () => {
  assert.equal(toolState(findTool('distribute.x'), { selectionCount: 2 }).enabled, false)
  assert.equal(toolState(findTool('distribute.x'), { selectionCount: 3 }).enabled, true)
})

await t('uwezo: paste inahitaji clipboard', () => {
  assert.equal(toolState(findTool('obj.paste'), { hasClipboard: false }).enabled, false)
  assert.equal(toolState(findTool('obj.paste'), { hasClipboard: true }).enabled, true)
})

await t('uwezo: partial inaonyesha lebo "Sehemu" lakini inawaka', () => {
  const s = toolState(findTool('post.publish'), {})
  assert.equal(s.enabled, true)
  assert.equal(s.badge, 'Sehemu')
})

await t('uwezo: hakuna zana ya AI inayodai kufanya kazi bila huduma', () => {
  for (const x of TOOLS.filter((y) => y.group === 'O' && y.status === 'service')) {
    assert.equal(x.status, 'service', `${x.id} si service`)
    assert.equal(toolState(x, { services: SERVICES }).enabled, false, `${x.id} inawaka bila huduma`)
  }
})

await t('uwezo: hesabu kwa hali inalingana na rejista', () => {
  const c = countByStatus(TOOLS)
  assert.equal(Object.values(c).reduce((a, b) => a + b, 0), TOOLS.length)
})

console.log('\nVipengele vingi — shughuli za modeli')

await t('vingi: duplicateLayers inaweka nakala kila moja juu ya asili', () => {
  const { doc, ids } = docWithShapes()
  const r = duplicateLayers(doc, [ids[0], ids[2]])
  assert.equal(r.ids.length, 2)
  assert.equal(r.doc.layers.length, 5)
  assert.equal(r.doc.layers[1].id, r.ids[0])
  assert.equal(r.doc.layers[4].id, r.ids[1])
})

await t('vingi: duplicateLayers haifanyi kitu kwa orodha tupu', () => {
  const { doc } = docWithShapes()
  const r = duplicateLayers(doc, ['nope'])
  assert.equal(r.doc, doc)
  assert.deepEqual(r.ids, [])
})

await t('vingi: removeLayers inafuta vyote kwa mpigo mmoja', () => {
  const { doc, ids } = docWithShapes()
  const next = removeLayers(doc, [ids[0], ids[1]])
  assert.equal(next.layers.length, 1)
  assert.equal(next.layers[0].id, ids[2])
})

await t('vingi: setLayersFlag inafunga/inaficha vyote', () => {
  const { doc, ids } = docWithShapes()
  const locked = setLayersFlag(doc, ids.slice(0, 2), 'locked', true)
  assert.equal(findLayer(locked, ids[0]).locked, true)
  assert.equal(findLayer(locked, ids[1]).locked, true)
  assert.equal(findLayer(locked, ids[2]).locked, false)
  const hidden = setLayersFlag(locked, ids, 'hidden', true)
  assert.ok(hidden.layers.every((l) => l.hidden))
  assert.equal(setLayersFlag(doc, ids, 'bogus', true), doc)
})

await t('vingi: alignLayers centerX inapanga kwa mpaka wa kikundi', () => {
  const { doc, ids } = docWithShapes()
  const next = alignLayers(doc, ids, 'left')
  for (const id of ids) assert.equal(findLayer(next, id).x, 100)
})

await t('vingi: alignLayers haigusi vilivyofungwa', () => {
  const { doc, ids } = docWithShapes()
  const locked = updateLayer(doc, ids[1], { locked: true })
  const next = alignLayers(locked, ids, 'top')
  assert.equal(findLayer(next, ids[1]).y, 150)
  assert.equal(findLayer(next, ids[0]).y, 100)
})

await t('vingi: alignLayers inahitaji vipengele viwili', () => {
  const { doc, ids } = docWithShapes()
  assert.equal(alignLayers(doc, [ids[0]], 'left'), doc)
})

await t('vingi: distributeLayers inaweka nafasi sawa kati ya vilivyokithiri', () => {
  const { doc, ids } = docWithShapes()
  const next = distributeLayers(doc, ids, 'x')
  const xs = ids.map((id) => findLayer(next, id))
  const gap1 = xs[1].x - (xs[0].x + xs[0].w)
  const gap2 = xs[2].x - (xs[1].x + xs[1].w)
  assert.ok(Math.abs(gap1 - gap2) <= 1, `mapengo ${gap1} na ${gap2}`)
  assert.equal(xs[0].x, 100)
  assert.equal(xs[2].x, 700)
})

await t('vingi: distributeLayers inahitaji vipengele vitatu', () => {
  const { doc, ids } = docWithShapes()
  assert.equal(distributeLayers(doc, ids.slice(0, 2), 'x'), doc)
})

await t('clipboard: copy kisha paste kunaunda vipengele vipya vyenye id mpya', () => {
  const { doc, ids } = docWithShapes()
  const clip = copyLayers(doc, [ids[0]])
  assert.equal(clip.length, 1)
  assert.equal(clip[0].id, undefined)
  const r = pasteLayers(doc, clip, 24)
  assert.equal(r.doc.layers.length, 4)
  const pasted = findLayer(r.doc, r.ids[0])
  assert.equal(pasted.x, 124)
  assert.notEqual(r.ids[0], ids[0])
})

await t('clipboard: pasteLayers inaheshimu kikomo cha tabaka', () => {
  const { doc } = docWithShapes()
  const big = Array.from({ length: MAX_LAYERS }, () => makeShape('rect'))
  const full = { ...doc, layers: Array.from({ length: MAX_LAYERS - 1 }, () => makeShape('rect')) }
  assert.throws(() => pasteLayers(full, copyLayers({ ...doc, layers: big }, big.map((l) => l.id)).slice(0, 2)), /kikomo/)
})

await t('clipboard: payload tupu haibadilishi hati', () => {
  const { doc } = docWithShapes()
  assert.equal(pasteLayers(doc, []).doc, doc)
})

console.log('\nFlip na uwazi wa renderer')

await t('flip: vipengele vya zamani havina flip (default = false)', () => {
  const l = normalizeLayer({ type: 'shape', shape: 'rect', x: 0, y: 0, w: 10, h: 10 })
  assert.equal(l.flipX, false)
  assert.equal(l.flipY, false)
})

await t('flip: updateLayer inaweka flipX kwenye maandishi', () => {
  const t1 = makeText({ text: 'x' })
  const doc = addLayer(createDocument('blank'), t1).doc
  const next = updateLayer(doc, t1.id, { flipX: true })
  assert.equal(findLayer(next, t1.id).flipX, true)
})

await t('flip: renderer inatumia scale(-1) kwa flipX', () => {
  const doc = addLayer(createDocument('blank'), makeShape('rect', { x: 0, y: 0, w: 50, h: 50, flipX: true })).doc
  const ctx = fakeCtx()
  return renderDocument(doc, ctx, { loadImage: okImg }).then(() => {
    const sc = ctx.calls.find((c) => c[0] === 'scale')
    assert.ok(sc, 'scale haikuitwa')
    assert.deepEqual(sc.slice(1), [-1, 1])
  })
})

await t('uwazi: transparent=true haichori mandhari', () => {
  const doc = createDocument('custom', { width: 300, height: 200 })
  const ctx = fakeCtx()
  return renderDocument(doc, ctx, { loadImage: okImg, transparent: true }).then(() => {
    assert.equal(ctx.calls.filter((c) => c[0] === 'fillRect').length, 0)
  })
})

await t('uwazi: transparent=false inachora mandhari kama kawaida', () => {
  const doc = createDocument('custom', { width: 300, height: 200 })
  const ctx = fakeCtx()
  return renderDocument(doc, ctx, { loadImage: okImg }).then(() => {
    assert.ok(ctx.calls.some((c) => c[0] === 'fillRect'))
  })
})

await t('export: miundo mitatu yenye MIME sahihi', () => {
  assert.equal(EXPORT_FORMATS.png.mime, 'image/png')
  assert.equal(EXPORT_FORMATS.jpeg.mime, 'image/jpeg')
  assert.equal(EXPORT_FORMATS.webp.mime, 'image/webp')
  assert.equal(EXPORT_FORMATS.jpeg.alpha, false, 'JPEG haina uwazi')
  assert.equal(EXPORT_FORMATS.webp.alpha, true)
})

console.log(`\n${pass} PASS, ${fail} FAIL`)
if (fail) process.exit(1)
