// Tests za kundi E (Maumbo): pembe za mstatili, kivuli chenye alpha, maumbo tayari, na mpangilio wa kuchora.
// Hazihitaji browser: ctx bandia inarekodi amri za kuchora.
import assert from 'node:assert/strict'
import {
  makeShape, normalizeLayer, normalizeShadowFx, shadowCss, DEFAULT_SHADOW, SHAPE_PRESETS, applyShapePreset, DEFAULT_INK,
} from '../src/creative/creativeModel.js'
import { shapePrimitives, drawShape } from '../src/creative/creativeRender.js'
import { findTool } from '../src/creative/toolRegistry.js'

let pass = 0
function ok(label, fn) {
  fn()
  pass += 1
  console.log(`✓ ${label}`)
}

function fakeCtx() {
  const calls = []
  const ctx = {
    calls,
    fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: 'butt', shadowColor: 'rgba(0,0,0,0)',
    shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
    save() { calls.push(['save']) },
    restore() { calls.push(['restore']) },
    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {}, clip() {}, rect() {},
    ellipse() {},
    fill() { calls.push(['fill', ctx.shadowBlur, ctx.shadowColor]) },
    stroke() { calls.push(['stroke', ctx.shadowBlur]) },
  }
  return ctx
}

const rect = (over = {}) => normalizeLayer({ ...makeShape('rect'), w: 200, h: 100, fill: '#112233', ...over })

ok('mstatili wenye radius: rx inafuata radius, ikibanwa na nusu ya upana/urefu', () => {
  const p = shapePrimitives(rect({ radius: 30 }))[0]
  assert.equal(p.kind, 'rect')
  assert.equal(p.rx, 30)
  const big = shapePrimitives(rect({ radius: 999 }))[0]
  assert.equal(big.rx, 50, 'urefu 100 / 2')
})

ok('mstatili bila radius: rx ni 0 (hakuna mabadiliko kwa data ya zamani)', () => {
  assert.equal(shapePrimitives(rect())[0].rx, 0)
})

ok('umbo la zamani la "rounded" bado linatoa rx', () => {
  const p = shapePrimitives(normalizeLayer({ ...makeShape('rounded'), w: 200, h: 100 }))[0]
  assert.ok(p.rx > 0)
})

ok('kivuli cha umbo kinasafishwa na alpha isiyokuwepo ni 1 (data ya zamani)', () => {
  assert.equal(normalizeShadowFx({ color: '#112233', blur: 5 }).alpha, 1)
  assert.equal(normalizeShadowFx({ color: '#112233', alpha: 7 }).alpha, 1)
  assert.equal(normalizeShadowFx({ color: '#112233', alpha: -1 }).alpha, 0)
  assert.equal(normalizeShadowFx(null), null)
  assert.equal(normalizeLayer({ ...makeShape('rect') }).shadow, null)
})

ok('shadowCss: hex + alpha inakuwa rgba; alpha 1 inabaki sawa', () => {
  assert.equal(shadowCss({ color: '#000000', alpha: 0.35 }), 'rgba(0, 0, 0, 0.35)')
  assert.equal(shadowCss({ color: '#ff8000', alpha: 1 }), 'rgba(255, 128, 0, 1)')
  assert.equal(shadowCss({ color: 'rgba(0,0,0,0.5)' }), 'rgba(0,0,0,0.5)', 'thamani isiyo hex inarudishwa kama ilivyo')
})

ok('kivuli chenye uwazi 35% hakigeuki kuwa nyeusi kamili (kasoro iliyorekebishwa)', () => {
  const l = normalizeLayer({ ...makeShape('rect'), shadow: DEFAULT_SHADOW })
  assert.equal(l.shadow.alpha, 0.35)
  assert.equal(shadowCss(l.shadow), 'rgba(0, 0, 0, 0.35)')
})

ok('drawShape bila kivuli: kujaza kunachorwa bila shadowBlur', () => {
  const ctx = fakeCtx()
  drawShape(ctx, rect())
  const fill = ctx.calls.find((c) => c[0] === 'fill')
  assert.equal(fill[1], 0)
})

ok('drawShape na kivuli: kujaza kunachorwa na kivuli, na save/restore zimeoanishwa', () => {
  const ctx = fakeCtx()
  drawShape(ctx, rect({ shadow: { color: '#000000', alpha: 0.5, blur: 9, offsetX: 1, offsetY: 2 } }))
  const fill = ctx.calls.find((c) => c[0] === 'fill')
  assert.equal(fill[1], 9)
  assert.equal(fill[2], 'rgba(0, 0, 0, 0.5)')
  assert.equal(ctx.calls[0][0], 'save')
  assert.equal(ctx.calls[ctx.calls.length - 1][0], 'restore')
})

ok('presets: ni nne, ids za kipekee, na kila moja ina lebo', () => {
  assert.equal(SHAPE_PRESETS.length, 4)
  const ids = new Set(SHAPE_PRESETS.map((p) => p.id))
  assert.equal(ids.size, 4)
  for (const p of SHAPE_PRESETS) assert.ok(p.label && p.label.length > 0)
})

ok('preset "Kidonge": umbo la mviringo lenye radius ya nusu ya urefu mfupi', () => {
  const patch = applyShapePreset(rect({ w: 300, h: 80 }), 'pill')
  assert.equal(patch.shape, 'rounded')
  assert.equal(patch.radius, 40)
})

ok('preset "Mpaka tu": hakuna kujaza, mpaka mweusi wa 8px, bila kivuli', () => {
  const patch = applyShapePreset(rect(), 'outline')
  assert.equal(patch.fill, null)
  assert.equal(patch.stroke, DEFAULT_INK)
  assert.equal(patch.strokeWidth, 8)
  assert.equal(patch.shadow, null)
})

ok('preset inaweza kutumika na kubanwa na normalizeLayer bila hitilafu', () => {
  for (const p of SHAPE_PRESETS) {
    const base = rect()
    const l = normalizeLayer({ ...base, ...applyShapePreset(base, p.id) })
    assert.equal(l.type, 'shape', p.id)
  }
})

ok('preset isiyojulikana inarudisha null', () => {
  assert.equal(applyShapePreset(rect(), 'nope'), null)
})

ok('rejista: maumbo ni ready na ni kundi E; kuchora bure bado ni planned', () => {
  for (const id of ['shape.kind', 'shape.preset', 'shape.radius', 'shape.shadow', 'shape.fill']) {
    const t = findTool(id)
    assert.ok(t, id)
    assert.equal(t.group, 'E', id)
    assert.equal(t.status, 'ready', id)
  }
  for (const id of ['draw.free', 'draw.pencil', 'draw.eraser']) {
    assert.equal(findTool(id).status, 'planned', id)
  }
})

console.log(`\nMajaribio ya maumbo: ${pass} PASS`)
