// Tests za kundi B (Maandishi): mstari chini/katikati, orodha ya vitone/namba, na rejista.
// Hazihitaji browser: renderer inaitwa na ctx bandia inayorekodi amri za kuchora.
import assert from 'node:assert/strict'
import { makeText, normalizeLayer } from '../src/creative/creativeModel.js'
import { drawText, displayText } from '../src/creative/creativeRender.js'
import { TOOLS, ACTION_IDS, findTool } from '../src/creative/toolRegistry.js'

let pass = 0
function ok(label, fn) {
  fn()
  pass += 1
  console.log(`✓ ${label}`)
}

// Ctx bandia: measureText = herufi × 0.5 × fontSize (ya kutosha kwa majaribio ya nafasi).
function fakeCtx() {
  const calls = []
  let fontPx = 16
  const ctx = {
    calls,
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'round',
    lineJoin: 'miter',
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    measureText(s) {
      const m = /(\d+(?:\.\d+)?)px/.exec(this.font)
      if (m) fontPx = Number(m[1])
      return { width: String(s).length * fontPx * 0.5 }
    },
    fillText(t, x, y) { calls.push(['fillText', t, x, y]) },
    strokeText(t, x, y) { calls.push(['strokeText', t, x, y]) },
    fillRect() {},
    beginPath() { calls.push(['beginPath']) },
    moveTo(x, y) { calls.push(['moveTo', x, y]) },
    lineTo(x, y) { calls.push(['lineTo', x, y]) },
    stroke() { calls.push(['stroke']) },
  }
  return ctx
}

const base = (over = {}) => normalizeLayer({
  ...makeText({ text: 'Habari', fontSize: 20, w: 400, h: 100, x: 0, y: 0, align: 'left' }),
  ...over,
})

ok('tabaka mpya za maandishi zina thamani za chaguo-msingi (data ya zamani inaendelea)', () => {
  const l = base()
  assert.equal(l.underline, false)
  assert.equal(l.strike, false)
  assert.equal(l.list, 'none')
  const old = normalizeLayer({ ...l, underline: undefined, strike: undefined, list: undefined })
  assert.equal(old.list, 'none')
})

ok('orodha isiyo sahihi inarudi kwa none', () => {
  assert.equal(base({ list: 'roman' }).list, 'none')
  assert.equal(base({ list: 'bullet' }).list, 'bullet')
  assert.equal(base({ list: 'number' }).list, 'number')
})

ok('displayText: bila orodha ni maandishi yale yale', () => {
  const l = base({ text: 'A\nB' })
  assert.equal(displayText(l), 'A\nB')
})

ok('displayText: vitone na namba kwa kila aya', () => {
  assert.equal(displayText(base({ text: 'Kwanza\nPili', list: 'bullet' })), '• Kwanza\n• Pili')
  assert.equal(displayText(base({ text: 'Kwanza\nPili', list: 'number' })), '1. Kwanza\n2. Pili')
})

ok('drawText bila mstari haichori mistari ya ziada', () => {
  const ctx = fakeCtx()
  drawText(ctx, base({ text: 'Habari' }))
  assert.equal(ctx.calls.filter((c) => c[0] === 'moveTo').length, 0)
  assert.equal(ctx.calls.filter((c) => c[0] === 'fillText').length, 1)
})

ok('mstari chini unachora mstari mmoja chini ya kila mstari wa maandishi', () => {
  const ctx = fakeCtx()
  drawText(ctx, base({ text: 'Habari', underline: true }))
  const moves = ctx.calls.filter((c) => c[0] === 'moveTo')
  const lines = ctx.calls.filter((c) => c[0] === 'lineTo')
  assert.equal(moves.length, 1)
  assert.equal(lines.length, 1)
  // Mstari unaanza na kuishia kwenye upana wa maandishi (herufi 6 × 10px = 60px) kuanzia x=0
  assert.equal(moves[0][1], 0)
  assert.equal(lines[0][1], 60)
  // Uko chini ya katikati ya mstari wa maandishi (y=lh/2 = 12)
  assert.ok(moves[0][2] > 12)
})

ok('mstari wa katikati uko juu ya chini ya maandishi, na chini ya mstari wa juu', () => {
  const ctx = fakeCtx()
  drawText(ctx, base({ text: 'Habari', strike: true }))
  const y = ctx.calls.find((c) => c[0] === 'moveTo')[2]
  assert.ok(Math.abs(y - 12) < 2, `strike y=${y}`)
})

ok('mstari unafuata mpangilio: katikati na kulia vinaanza kwenye x sahihi', () => {
  const center = fakeCtx()
  drawText(center, base({ text: 'Habari', underline: true, align: 'center' }))
  const cx = center.calls.find((c) => c[0] === 'moveTo')[1]
  assert.equal(cx, 200 - 30) // w/2 - upana/2

  const right = fakeCtx()
  drawText(right, base({ text: 'Habari', underline: true, align: 'right' }))
  const rx = right.calls.find((c) => c[0] === 'moveTo')[1]
  assert.equal(rx, 400 - 60)
})

ok('mistari yote miwili kwa mistari mingi ya orodha', () => {
  const ctx = fakeCtx()
  drawText(ctx, base({ text: 'Moja\nMbili', list: 'bullet', underline: true, strike: true }))
  assert.equal(ctx.calls.filter((c) => c[0] === 'moveTo').length, 4)
  assert.equal(ctx.calls.filter((c) => c[0] === 'fillText').length, 2)
})

ok('rejista: mstari na orodha ni ready na vina vitendo vilivyosajiliwa', () => {
  for (const id of ['text.underline', 'text.strike', 'text.listBullet', 'text.listNumber']) {
    const t = findTool(id)
    assert.ok(t, id)
    assert.equal(t.group, 'B', id)
    assert.ok(t.action, id)
    assert.ok(ACTION_IDS.includes(t.action), `${id} action ${t.action} in ACTION_IDS`)
  }
})

ok('rejista: gradient, glow na curve bado ni planned', () => {
  for (const id of ['text.gradient', 'text.glow', 'text.curve']) {
    const t = findTool(id)
    if (!t) continue
    assert.notEqual(t.status, 'ready', id)
  }
  assert.ok(TOOLS.length > 0)
})

console.log(`\nMajaribio ya maandishi: ${pass} PASS`)
