// Tests za kundi D (Mandhari): uwazi, ukungu, mandhari ya awali, na uchoraji wa export.
// Hazihitaji browser: ctx bandia inarekodi amri za kuchora.
import assert from 'node:assert/strict'
import { createDocument, normalizeBackground, setBackground } from '../src/creative/creativeModel.js'
import { renderDocument } from '../src/creative/creativeRender.js'
import { findTool, ACTION_IDS } from '../src/creative/toolRegistry.js'

let pass = 0
function ok(label, fn) {
  pass += 1
  fn()
  console.log(`✓ ${label}`)
}

const SOLID = { type: 'solid', color: '#ff0000' }
const GRAD = { type: 'gradient', from: '#18a982', to: '#3b82f6', angle: 135 }
const IMG = { type: 'image', src: 'https://example.com/bg.png' }

function fakeCtx() {
  const calls = []
  const ctx = {
    calls,
    fillStyle: '',
    globalAlpha: 1,
    filter: 'none',
    canvas: { width: 0, height: 0 },
    save() {},
    restore() {},
    beginPath() {},
    rect() {},
    clip() {},
    createLinearGradient() { return { addColorStop() {} } },
    fillRect(x, y, w, h) { calls.push(['fillRect', ctx.fillStyle, ctx.globalAlpha, x, y, w, h]) },
    drawImage(img, x, y, w, h) { calls.push(['drawImage', ctx.globalAlpha, ctx.filter, x, y, w, h]) },
  }
  return ctx
}

const loadImage = async () => ({ naturalWidth: 1000, naturalHeight: 500 })

ok('mandhari mpya ina uwazi 1 kwa chaguo-msingi, na hakuna ukungu kwenye rangi', () => {
  const bg = normalizeBackground(SOLID)
  assert.equal(bg.opacity, 1)
  assert.equal('blur' in bg, false)
})

ok('uwazi unabanwa ndani ya 0..1 na ukungu wa picha ndani ya 0..40', () => {
  assert.equal(normalizeBackground({ ...SOLID, opacity: 9 }).opacity, 1)
  assert.equal(normalizeBackground({ ...SOLID, opacity: -3 }).opacity, 0)
  assert.equal(normalizeBackground({ ...IMG, blur: 500 }).blur, 40)
  assert.equal(normalizeBackground({ ...IMG, blur: -2 }).blur, 0)
})

ok('mandhari ya awali si sahihi inapuuzwa bila kuvunja mandhari kuu', () => {
  const bg = normalizeBackground({ ...SOLID, prev: { type: 'image', src: 'javascript:alert(1)' } })
  assert.equal(bg.type, 'solid')
  assert.equal(bg.prev, undefined)
})

ok('setBackground: kubadilisha aina kunahifadhi mandhari ya awali', () => {
  const doc = { ...createDocument('blank'), background: normalizeBackground(SOLID) }
  const next = setBackground(doc, GRAD)
  assert.equal(next.background.type, 'gradient')
  assert.equal(next.background.prev.type, 'solid')
  assert.equal(next.background.prev.color, '#ff0000')
})

ok('setBackground: kubadilisha rangi kunabaki na mandhari ya awali ile ile', () => {
  let doc = { ...createDocument('blank'), background: normalizeBackground(SOLID) }
  doc = setBackground(doc, GRAD) // prev = solid nyekundu
  doc = setBackground(doc, { ...doc.background, from: '#000000' }) // gradient, rangi ya kwanza
  assert.equal(doc.background.prev.color, '#ff0000')
})

ok('setBackground: uwazi haubadilishi mandhari ya awali', () => {
  let doc = { ...createDocument('blank'), background: normalizeBackground(SOLID) }
  doc = setBackground(doc, GRAD)
  const { prev, ...current } = doc.background
  doc = setBackground(doc, { ...current, opacity: 0.4 })
  assert.equal(doc.background.opacity, 0.4)
  assert.equal(doc.background.prev.type, 'solid')
})

ok('Rudisha mandhari ya awali: inabadilishana kati ya ya sasa na ya awali', () => {
  let doc = { ...createDocument('blank'), background: normalizeBackground(SOLID) }
  doc = setBackground(doc, GRAD)
  const { prev, ...current } = doc.background
  doc = setBackground(doc, { ...prev, prev: current })
  assert.equal(doc.background.type, 'solid')
  assert.equal(doc.background.prev.type, 'gradient')
  doc = setBackground(doc, { ...doc.background.prev, prev: (({ prev: _p, ...c }) => c)(doc.background) })
  assert.equal(doc.background.type, 'gradient')
})

ok('Rudisha mandhari (asili): inarudisha nyeupe na uwazi 1, na inahifadhi ya zamani', () => {
  let doc = { ...createDocument('blank'), background: normalizeBackground({ ...GRAD, opacity: 0.5 }) }
  const { prev, ...current } = doc.background
  doc = setBackground(doc, { type: 'solid', color: '#ffffff', opacity: 1, prev: current })
  assert.equal(doc.background.color, '#ffffff')
  assert.equal(doc.background.opacity, 1)
  assert.equal(doc.background.prev.type, 'gradient')
  assert.equal(doc.background.prev.opacity, 0.5)
})

ok('export: uwazi wa rangi unachorwa juu ya msingi mweupe', async () => {
  const doc = { ...createDocument('blank'), background: normalizeBackground({ ...SOLID, opacity: 0.5 }) }
  const ctx = fakeCtx()
  await renderDocument(doc, ctx, { loadImage })
  const fills = ctx.calls.filter((c) => c[0] === 'fillRect')
  assert.equal(fills[0][1], '#ffffff', 'msingi mweupe kwanza')
  assert.equal(fills[1][1], '#ff0000')
  assert.equal(fills[1][2], 0.5, 'globalAlpha ya rangi')
})

ok('export: picha bila ukungu inachorwa kwa uwazi wake, bila filter', async () => {
  const doc = { ...createDocument('blank'), background: normalizeBackground({ ...IMG, opacity: 0.25 }) }
  const ctx = fakeCtx()
  await renderDocument(doc, ctx, { loadImage })
  const draw = ctx.calls.find((c) => c[0] === 'drawImage')
  assert.equal(draw[1], 0.25)
  assert.equal(draw[2], 'none')
})

ok('export: ukungu wa picha unaongeza ukingo na kuweka filter ya blur', async () => {
  const doc = { ...createDocument('blank'), background: normalizeBackground({ ...IMG, blur: 10 }) }
  const ctx = fakeCtx()
  await renderDocument(doc, ctx, { loadImage })
  const draw = ctx.calls.find((c) => c[0] === 'drawImage')
  assert.equal(draw[2], 'blur(10px)')
  // ukingo ni 2×ukungu kila upande: picha inaanza kabla ya x=0
  assert.ok(draw[3] < 0, `x=${draw[3]} lazima iwe hasi`)
  assert.ok(draw[5] >= doc.width + 40, 'upana unajumuisha ukingo')
})

ok('export: transparent haichori mandhari kabisa', async () => {
  const doc = { ...createDocument('blank'), background: normalizeBackground({ ...SOLID, opacity: 0.5 }) }
  const ctx = fakeCtx()
  await renderDocument(doc, ctx, { loadImage, transparent: true })
  assert.equal(ctx.calls.filter((c) => c[0] === 'fillRect').length, 0)
})

ok('rejista: uwazi, ukungu, rudisha ni ready; nafasi na kipimo ni planned', () => {
  for (const id of ['bg.opacity', 'bg.blur', 'bg.restore', 'bg.reset']) {
    const t = findTool(id)
    assert.ok(t, id)
    assert.equal(t.status, 'ready', id)
    assert.equal(t.group, 'D', id)
  }
  for (const id of ['bg.position', 'bg.scale']) {
    assert.equal(findTool(id).status, 'planned', id)
  }
  assert.ok(!ACTION_IDS.includes('bg.restore'), 'hakuna action isiyo na handler')
})

console.log(`\nMajaribio ya mandhari: ${pass} PASS`)
