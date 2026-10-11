// Tests za kundi H (Athari na vichujio): hesabu ya nguvu, vichujio, kuondoa, na rejista. Hazihitaji browser.
import assert from 'node:assert/strict'
import { FILTER_PRESETS, NEUTRAL_ADJUST, presetById, presetPatch, clearFilterPatch, hasFilter } from '../src/creative/imageFilters.js'
import { findTool, ACTION_IDS } from '../src/creative/toolRegistry.js'

let pass = 0
function ok(label, fn) {
  fn()
  pass += 1
  console.log(`✓ ${label}`)
}

const RANGES = { brightness: [0, 200], contrast: [0, 200], saturation: [0, 200], temperature: [-100, 100], tint: [-100, 100] }

ok('vichujio vitano vyenye ids za kipekee na lebo', () => {
  assert.equal(FILTER_PRESETS.length, 5)
  assert.equal(new Set(FILTER_PRESETS.map((p) => p.id)).size, 5)
  for (const p of FILTER_PRESETS) assert.ok(p.label)
})

ok('kila lengo liko ndani ya mipaka ya marekebisho ya picha', () => {
  for (const p of FILTER_PRESETS) {
    for (const [key, [min, max]] of Object.entries(RANGES)) {
      const v = p.target[key]
      assert.ok(v >= min && v <= max, `${p.id}.${key}=${v}`)
    }
  }
})

ok('nguvu 0 inarudisha hali ya kawaida kwa kila kichujio', () => {
  for (const p of FILTER_PRESETS) assert.deepEqual(presetPatch(p.id, 0), NEUTRAL_ADJUST, p.id)
})

ok('nguvu 100 inarudisha lengo kamili la kichujio', () => {
  for (const p of FILTER_PRESETS) assert.deepEqual(presetPatch(p.id, 100), p.target, p.id)
})

ok('nguvu 50 inachanganya katikati, na joto 17.5 linazungushwa hadi 18', () => {
  assert.deepEqual(presetPatch('warm', 50), { brightness: 102, contrast: 101, saturation: 105, temperature: 18, tint: 0 })
})

ok('nguvu nje ya 0–100 inabanwa', () => {
  assert.deepEqual(presetPatch('vivid', 500), presetPatch('vivid', 100))
  assert.deepEqual(presetPatch('vivid', -20), presetPatch('vivid', 0))
})

ok('kichujio kisichojulikana kinarudisha null', () => {
  assert.equal(presetPatch('nope', 100), null)
  assert.equal(presetById('nope'), null)
})

ok('vichujio havigusi ukungu (blur) wala uwazi', () => {
  for (const p of FILTER_PRESETS) {
    const patch = presetPatch(p.id, 80)
    assert.equal('blur' in patch, false, p.id)
    assert.equal('opacity' in patch, false, p.id)
  }
  assert.equal('blur' in clearFilterPatch(), false)
})

ok('clearFilterPatch inarudisha sehemu tano kwenye hali ya kawaida', () => {
  assert.deepEqual(clearFilterPatch(), NEUTRAL_ADJUST)
})

ok('hasFilter: picha ya kawaida haina kichujio, na blur pekee haihesabiwi', () => {
  assert.equal(hasFilter({ brightness: 100, contrast: 100, saturation: 100, temperature: 0, tint: 0, blur: 0 }), false)
  assert.equal(hasFilter({ blur: 8 }), false, 'blur ni ya kundi C')
  assert.equal(hasFilter({ saturation: 0 }), true)
  assert.equal(hasFilter({ tint: -4 }), true)
  assert.equal(hasFilter(null), false)
})

ok('rejista: img.presets na fx.clear ni ready kwenye kundi H na zina action', () => {
  const a = findTool('img.presets')
  assert.equal(a.group, 'H')
  assert.equal(a.status, 'ready')
  assert.equal(a.action, 'fx.presets')
  const b = findTool('fx.clear')
  assert.equal(b.group, 'H')
  assert.equal(b.status, 'ready')
  assert.equal(b.action, 'fx.clear')
})

ok('rejista: fx.blur imeondolewa kwa sababu ukungu uko kundi C (hakuna marudio)', () => {
  assert.equal(findTool('fx.blur'), null)
})

ok('rejista: athari zingine za kundi H bado ni planned', () => {
  for (const id of ['img.sharpen', 'fx.vignette', 'fx.duotone', 'fx.blend', 'fx.compare']) {
    assert.equal(findTool(id).status, 'planned', id)
  }
})

ok('ACTION_IDS inajumuisha vitendo vipya vya kundi H', () => {
  assert.ok(ACTION_IDS.includes('fx.presets'))
  assert.ok(ACTION_IDS.includes('fx.clear'))
})

console.log(`\nMajaribio ya vichujio: ${pass} PASS`)
