// Ukaguzi wa usanidi wa sehemu ya chini kwa mode (MASTER §5): picha/graphic → Tabaka+Kurasa;
// story → Scenes; carousel/slideshow → Slaidi; video → Ratiba ya video. Tabo zisizo tayari ni planned.
import assert from 'node:assert/strict'
import { bottomTabsFor } from '../src/creative/panelConfig.js'
import { MODES } from '../src/creative/creativeModel.js'

let pass = 0
function t(name, fn) { fn(); pass++; console.log(`✓ ${name}`) }
const labels = (mode) => bottomTabsFor(mode).map((x) => x.label)

t('picha na graphic: Tabaka + Kurasa', () => {
  for (const m of ['blank', 'image', 'social', 'poster', 'ad', 'thumbnail', 'custom']) {
    assert.deepEqual(labels(m), ['Tabaka', 'Kurasa'], m)
  }
})
t('story: Tabaka + Scenes', () => assert.deepEqual(labels('story'), ['Tabaka', 'Scenes']))
t('carousel na slideshow: Tabaka + Slaidi', () => {
  assert.deepEqual(labels('carousel'), ['Tabaka', 'Slaidi'])
  assert.deepEqual(labels('slideshow'), ['Tabaka', 'Slaidi'])
})
t('video: Tabaka + Ratiba ya video', () => {
  assert.deepEqual(labels('videopost'), ['Tabaka', 'Ratiba ya video'])
  assert.deepEqual(labels('shortvideo'), ['Tabaka', 'Ratiba ya video'])
})
t('tabo ni "ready" moja tu (Tabaka); zingine zina lebo ya mpango', () => {
  for (const m of Object.keys(MODES)) {
    const tabs = bottomTabsFor(m)
    assert.equal(tabs[0].status, 'ready', m)
    for (const x of tabs.slice(1)) assert.equal(x.status, 'planned', `${m}:${x.id}`)
    for (const x of tabs.slice(1)) assert.ok(x.note, `${m}:${x.id} bila note`)
  }
})
console.log(`\n${pass} PASS, 0 FAIL`)
