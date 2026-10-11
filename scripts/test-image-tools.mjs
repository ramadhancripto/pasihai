// Tests za kundi C (Picha): uwiano (aspect crop), joto/tint, kivuli, na mpangilio wa kuchora.
// Hazihitaji browser: ctx bandia inarekodi amri za kuchora.
import assert from 'node:assert/strict'
import { makeImage, normalizeLayer, aspectCrop } from '../src/creative/creativeModel.js'
import { drawImage, tintColor, imageFilterString } from '../src/creative/creativeRender.js'
import { ACTION_IDS, findTool } from '../src/creative/toolRegistry.js'

let pass = 0
function ok(label, fn) {
  return Promise.resolve().then(fn).then(() => {
    pass += 1
    console.log(`✓ ${label}`)
  })
}

const doc = { width: 1000, height: 1000 }
const img = (over = {}) => normalizeLayer({ ...makeImage('https://example.com/a.png', { width: 1000, height: 500 }, doc), w: 400, h: 200, ...over })

function fakeCtx() {
  const calls = []
  const ctx = {
    calls,
    globalCompositeOperation: 'source-over',
    fillStyle: '',
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    lineWidth: 1,
    strokeStyle: '',
    save() {},
    restore() {},
    beginPath() {},
    rect() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    closePath() {},
    clip() {},
    stroke() {},
    drawImage() { calls.push(['drawImage', ctx.globalCompositeOperation, ctx.shadowBlur]) },
    fillRect() { calls.push(['fillRect', ctx.globalCompositeOperation, ctx.fillStyle]) },
  }
  return ctx
}

const fakeImg = { naturalWidth: 1000, naturalHeight: 500 }

await ok('picha mpya ina temperature, tint na kivuli kwa chaguo-msingi', () => {
  const l = img()
  assert.equal(l.temperature, 0)
  assert.equal(l.tint, 0)
  assert.equal(l.shadow, null)
})

await ok('temperature na tint zinabanwa ndani ya -100..100', () => {
  const l = normalizeLayer({ ...img(), temperature: 500, tint: -500 })
  assert.equal(l.temperature, 100)
  assert.equal(l.tint, -100)
})

await ok('kivuli cha picha kinasafishwa (blur hadi 80)', () => {
  const l = normalizeLayer({ ...img(), shadow: { color: '#112233', blur: 999, offsetX: 3, offsetY: 4 } })
  assert.equal(l.shadow.color, '#112233')
  assert.equal(l.shadow.blur, 80)
  assert.equal(l.shadow.offsetX, 3)
  assert.equal(l.shadow.offsetY, 4)
})

await ok('uwiano 1:1 kwenye picha pana: kata katikati, upana unabaki sawa na urefu', () => {
  const r = aspectCrop(img(), 1)
  assert.equal(r.crop.w, 0.5)
  assert.equal(r.crop.h, 1)
  assert.equal(r.crop.x, 0.25)
  assert.equal(r.crop.y, 0)
  assert.equal(r.h, img().w)
})

await ok('uwiano 9:16 kwenye picha pana: kata kwa upana', () => {
  const l = img()
  const r = aspectCrop(l, 9 / 16)
  assert.ok(Math.abs(r.crop.w - (9 / 16) / 2) < 1e-9)
  assert.equal(r.crop.h, 1)
  assert.ok(Math.abs(r.crop.x - (1 - r.crop.w) / 2) < 1e-9)
  assert.equal(r.h, Math.round(l.w / (9 / 16)))
})

await ok('uwiano kwenye picha ndefu: kata kwa urefu', () => {
  const l = img({ naturalW: 500, naturalH: 1000 })
  const r = aspectCrop(l, 1)
  assert.equal(r.crop.w, 1)
  assert.equal(r.crop.h, 0.5)
  assert.equal(r.crop.y, 0.25)
})

await ok('uwiano wa asili unarudisha picha nzima', () => {
  const l = img()
  const r = aspectCrop(l, l.naturalW / l.naturalH)
  assert.deepEqual(r.crop, { x: 0, y: 0, w: 1, h: 1 })
  assert.equal(r.h, Math.round(l.w * l.naturalH / l.naturalW))
})

await ok('tintColor: 0/0 ni null (hakuna athari)', () => {
  assert.equal(tintColor(img()), null)
})

await ok('tintColor: joto chanya linapunguza bluu na kijani, nyekundu inabaki 255', () => {
  const c = tintColor(img({ temperature: 100 }))
  assert.equal(c, 'rgb(255, 196, 115)') // 255·(1-0.23), 255·(1-0.55)
  const [r, g, b] = c.match(/\d+/g).map(Number)
  assert.equal(r, 255)
  assert.ok(b < g && g < r, c)
})

await ok('tintColor: joto hasi linapunguza nyekundu, bluu inabaki 255', () => {
  const [r, g, b] = tintColor(img({ temperature: -100 })).match(/\d+/g).map(Number)
  assert.equal(b, 255)
  assert.ok(r < g, 'nyekundu chini ya kijani')
})

await ok('tintColor: tint chanya (magenta) linapunguza kijani tu', () => {
  const [r, g, b] = tintColor(img({ tint: 100 })).match(/\d+/g).map(Number)
  assert.equal(r, 255)
  assert.equal(b, 255)
  assert.ok(g < 255)
})

await ok('tintColor: tint hasi (kijani) linapunguza nyekundu na bluu', () => {
  const [r, g, b] = tintColor(img({ tint: -100 })).match(/\d+/g).map(Number)
  assert.equal(g, 255)
  assert.ok(r < 255 && b < 255)
})

await ok('drawImage bila tint wala kivuli: drawImage moja, hakuna fillRect', async () => {
  const ctx = fakeCtx()
  await drawImage(ctx, img(), fakeImg, new Set())
  assert.equal(ctx.calls.filter((c) => c[0] === 'drawImage').length, 1)
  assert.equal(ctx.calls.filter((c) => c[0] === 'fillRect').length, 0)
})

await ok('drawImage na tint: multiply kisha destination-in (uwazi wa PNG unabaki)', async () => {
  const ctx = fakeCtx()
  await drawImage(ctx, img({ temperature: 50 }), fakeImg, new Set())
  const fill = ctx.calls.find((c) => c[0] === 'fillRect')
  assert.ok(fill, 'fillRect ipo')
  assert.equal(fill[1], 'multiply')
  const last = ctx.calls[ctx.calls.length - 1]
  assert.equal(last[0], 'drawImage')
  assert.equal(last[1], 'destination-in')
})

await ok('drawImage na kivuli: picha inachorwa mara mbili (kivuli kwanza)', async () => {
  const ctx = fakeCtx()
  await drawImage(ctx, img({ shadow: { color: '#000000', blur: 10, offsetX: 2, offsetY: 3 } }), fakeImg, new Set())
  const draws = ctx.calls.filter((c) => c[0] === 'drawImage')
  assert.equal(draws.length, 2)
  assert.equal(draws[0][2], 10, 'shadowBlur ya kwanza')
})

await ok('filter ya picha bado inafanya kazi bila mabadiliko ya kawaida', () => {
  assert.equal(imageFilterString(img()), 'none')
  assert.equal(imageFilterString(img({ brightness: 120 })), 'brightness(120%)')
})

await ok('rejista: uwiano, kivuli, rudisha na joto ni ready na vina vitendo au maelezo', () => {
  for (const id of ['img.aspect', 'img.shadow', 'img.restore', 'img.tone']) {
    const t = findTool(id)
    assert.ok(t, id)
    assert.equal(t.group, 'C', id)
    assert.equal(t.status, 'ready', id)
    assert.ok(t.where || t.action, `${id} ina where au action`)
  }
  assert.ok(!ACTION_IDS.includes('img.aspect'))
})

console.log(`\nMajaribio ya picha: ${pass} PASS`)
