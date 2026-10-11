// Tests za Export & Publish (P): ukubwa wa export (1×/2×), kikomo cha turubai, na usajili wa paneli.
// Hesabu hizi ni safi (bila DOM), kwa hiyo zinaendeshwa kwa node. Ukaguzi wa kivinjari uko kwenye export-panel-check.mjs.
import assert from 'node:assert/strict'
import { exportSize, EXPORT_SCALES } from '../src/creative/creativeRender.js'
import { TOOLS, findTool } from '../src/creative/toolRegistry.js'

let pass = 0
function ok(label, fn) {
  fn()
  pass += 1
  console.log(`✓ ${label}`)
}

ok('scales zinazoruhusiwa ni 1× na 2× tu', () => {
  assert.deepEqual([...EXPORT_SCALES], [1, 2])
})

ok('1× inaacha ukubwa wa muundo kama ulivyo', () => {
  assert.deepEqual(exportSize({ width: 1080, height: 1080 }, 1), { width: 1080, height: 1080, scale: 1, clamped: false })
})

ok('2× inazidisha ukubwa mara mbili', () => {
  assert.deepEqual(exportSize({ width: 1080, height: 1350 }, 2), { width: 2160, height: 2700, scale: 2, clamped: false })
})

ok('scale isiyo halali inatumia 1×', () => {
  assert.equal(exportSize({ width: 800, height: 600 }, 3).scale, 1)
  assert.equal(exportSize({ width: 800, height: 600 }).scale, 1)
})

ok('turubai kubwa kuliko kikomo inapunguzwa, uwiano unabaki', () => {
  const r = exportSize({ width: 5000, height: 2000 }, 2)
  assert.equal(r.clamped, true)
  assert.ok(r.width <= 4000 && r.height <= 4000, `${r.width}×${r.height}`)
  assert.equal(r.width, 4000)
  assert.equal(r.height, 1600)
})

ok('hakuna ukubwa unaozidi kikomo kwa mchanganyiko wowote', () => {
  for (const d of [[10, 10], [1080, 1920], [4000, 4000], [4001, 100], [9000, 9000]]) {
    for (const sc of EXPORT_SCALES) {
      const r = exportSize({ width: d[0], height: d[1] }, sc)
      assert.ok(r.width <= 4000 && r.height <= 4000, `${d} ${sc} -> ${r.width}×${r.height}`)
      assert.ok(r.width >= 1 && r.height >= 1)
    }
  }
})

ok('export.resolution ni ready na inafungua paneli ya P (export.panel)', () => {
  const t = findTool('export.resolution')
  assert.ok(t, 'zana ipo')
  assert.equal(t.status ?? 'ready', 'ready')
  assert.equal(t.action, 'export.panel')
  assert.equal(t.group, 'P')
})

ok('zana za P zenye action zinaelekeza kwenye vitendo vilivyounganishwa, si planned', () => {
  for (const t of TOOLS.filter((x) => x.group === 'P' && x.action)) {
    assert.notEqual(t.status, 'planned', t.id)
  }
})

console.log(`\nMajaribio ya Export & Publish: ${pass} PASS`)
