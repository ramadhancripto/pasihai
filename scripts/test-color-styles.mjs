// Tests za mitindo ya rangi (kundi G): kuunda, kutumia, kuondoa, kufuta, na hifadhi ya kifaa.
import assert from 'node:assert/strict'
import {
  STYLE_KEY, STYLE_MAX, loadStyles, saveStyles, createStyle, styleApplies,
  stylePatch, removePatch, addStyle, deleteStyle,
} from '../src/creative/colorStyles.js'
import { DEFAULT_INK } from '../src/creative/creativeModel.js'
import { findTool } from '../src/creative/toolRegistry.js'

let pass = 0
function ok(label, fn) {
  fn()
  pass += 1
  console.log(`✓ ${label}`)
}

const memStorage = (init = null) => {
  const data = new Map(init ? [[STYLE_KEY, init]] : [])
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    raw: data,
  }
}
let n = 0
const id = () => `st-${++n}`

const text = { id: 't1', type: 'text', color: '#112233', bgColor: null }
const shape = { id: 's1', type: 'shape', fill: '#18a982', stroke: '#ff0000', strokeWidth: 4 }
const image = { id: 'i1', type: 'image' }

ok('createStyle: maandishi yanahifadhi rangi ya maandishi na mandhari yake', () => {
  const st = createStyle('Chapa', text, id)
  assert.equal(st.name, 'Chapa')
  assert.deepEqual(st.colors, { color: '#112233', bgColor: null })
})

ok('createStyle: umbo linahifadhi fill na stroke tu (si upana)', () => {
  const st = createStyle('Bluu', shape, id)
  assert.deepEqual(st.colors, { fill: '#18a982', stroke: '#ff0000' })
  assert.equal('strokeWidth' in st.colors, false)
})

ok('createStyle: picha haina mtindo wa rangi (null)', () => {
  assert.equal(createStyle('X', image, id), null)
})

ok('createStyle: jina tupu linapata "Mtindo", na jina refu linakatwa', () => {
  assert.equal(createStyle('   ', text, id).name, 'Mtindo')
  assert.equal(createStyle('a'.repeat(80), text, id).name.length, 40)
})

ok('styleApplies: mtindo wa umbo haufai kwa maandishi, na kinyume chake', () => {
  const sh = createStyle('Bluu', shape, id)
  const tx = createStyle('Chapa', text, id)
  assert.equal(styleApplies(sh, text), false)
  assert.equal(styleApplies(tx, shape), false)
  assert.equal(styleApplies(sh, shape), true)
  assert.equal(styleApplies(tx, text), true)
})

ok('stylePatch: inatumia sehemu zinazofaa tu', () => {
  const sh = { id: 'a', name: 'A', colors: { fill: '#000000', stroke: null } }
  assert.deepEqual(stylePatch(sh, shape), { fill: '#000000', stroke: null })
  assert.equal(stylePatch(sh, text), null, 'hakuna sehemu inayofaa kwa maandishi')
  assert.equal(stylePatch(sh, image), null)
})

ok('removePatch: inarudisha sehemu alizogusa mtindo kwa thamani ya chaguo-msingi', () => {
  const tx = { id: 'a', name: 'A', colors: { color: '#abcdef' } }
  assert.deepEqual(removePatch(tx, text), { color: DEFAULT_INK })
  const sh = { id: 'b', name: 'B', colors: { fill: '#ffffff' } }
  assert.deepEqual(removePatch(sh, shape), { fill: null }, 'stroke haijaguswa, haiondolewi')
  assert.equal(removePatch(sh, text), null)
})

ok('loadStyles: hifadhi tupu/ibovu/si array inarudisha orodha tupu', () => {
  assert.deepEqual(loadStyles(memStorage()), [])
  assert.deepEqual(loadStyles(memStorage('{not json')), [])
  assert.deepEqual(loadStyles(memStorage('{"a":1}')), [])
  assert.deepEqual(loadStyles(null), [])
})

ok('loadStyles: inakataa mitindo yenye HEX batili au bila jina, na inaweka ya kwanza tu kwa id', () => {
  const raw = JSON.stringify([
    { id: 'ok', name: 'Nzuri', colors: { color: '#ABCDEF' } },
    { id: 'bad', name: 'Mbaya', colors: { color: 'nope' } },
    { id: 'noname', name: '', colors: { color: '#000000' } },
    { id: 'ok', name: 'Dup', colors: { color: '#111111' } },
  ])
  const list = loadStyles(memStorage(raw))
  assert.equal(list.length, 1)
  assert.equal(list[0].colors.color, '#abcdef')
})

ok('saveStyles → loadStyles inarudi mitindo ile ile (safari ya kifaa)', () => {
  const st = memStorage()
  const styles = [createStyle('Bluu', shape, id), createStyle('Chapa', text, id)]
  assert.equal(saveStyles(styles, st), true)
  assert.deepEqual(loadStyles(st), styles)
})

ok('saveStyles: kifaa kimejaa (setItem inatupa) inarudisha false bila kuanguka', () => {
  const full = { getItem: () => null, setItem: () => { throw new Error('QuotaExceeded') } }
  assert.equal(saveStyles([{ id: 'a', name: 'A', colors: { color: '#000000' } }], full), false)
})

ok('kikomo: mitindo haizidi STYLE_MAX, na addStyle inaweka mpya mbele', () => {
  let list = []
  for (let i = 0; i < STYLE_MAX + 5; i += 1) list = addStyle(list, { id: `x${i}`, name: `N${i}`, colors: { color: '#000000' } })
  assert.equal(list.length, STYLE_MAX)
  assert.equal(list[0].id, `x${STYLE_MAX + 4}`)
})

ok('deleteStyle: inaondoa id moja tu', () => {
  const list = [{ id: 'a' }, { id: 'b' }]
  assert.deepEqual(deleteStyle(list, 'a'), [{ id: 'b' }])
})

ok('rejista: style.reuse ni ready kwenye kundi G na ina action', () => {
  const t = findTool('style.reuse')
  assert.equal(t.group, 'G')
  assert.equal(t.status, 'ready')
  assert.equal(t.action, 'style.reuse')
})

console.log(`\nMajaribio ya mitindo ya rangi: ${pass} PASS`)
