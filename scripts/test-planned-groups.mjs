// Tests za makundi ya display tu (F, K, L, M, N, O): hali sahihi, hakuna kitendo, huduma zinaonyeshwa.
import assert from 'node:assert/strict'
import { DISPLAY_ONLY_GROUPS, plannedGroupSummary } from '../src/creative/plannedGroups.js'
import { TOOLS, GROUPS } from '../src/creative/toolRegistry.js'

let pass = 0
function ok(label, fn) {
  fn()
  pass += 1
  console.log(`✓ ${label}`)
}

ok('makundi sita ya display tu: F, K, L, M, N, O', () => {
  assert.deepEqual([...DISPLAY_ONLY_GROUPS], ['F', 'K', 'L', 'M', 'N', 'O'])
})

ok('muhtasari upo kwa makundi haya, na haupo kwa makundi mengine', () => {
  for (const g of DISPLAY_ONLY_GROUPS) assert.ok(plannedGroupSummary(g), g)
  for (const g of ['A', 'B', 'C', 'D', 'E', 'G', 'H', 'I', 'J', 'P']) {
    assert.equal(plannedGroupSummary(g), null, g)
  }
})

ok('jina la kundi linatoka kwenye rejista (lebo za spec)', () => {
  for (const g of DISPLAY_ONLY_GROUPS) {
    const def = GROUPS.find((x) => x.id === g)
    assert.equal(plannedGroupSummary(g).title, def.title)
  }
})

ok('hesabu zinalingana na ukaguzi: F 10, K 9, L 11, M 6, N 7 planned + 2 service', () => {
  const expect = { F: [10, 0], K: [9, 0], L: [11, 0], M: [6, 0], N: [7, 2] }
  for (const [g, [planned, service]] of Object.entries(expect)) {
    const s = plannedGroupSummary(g)
    assert.equal(s.counts.planned, planned, `${g} planned`)
    assert.equal(s.counts.service, service, `${g} service`)
    assert.equal(s.items.length, planned + service, `${g} jumla`)
  }
})

ok('hakuna zana ya display tu iliyo ready/partial (premium inaruhusiwa kwa O tu)', () => {
  for (const g of DISPLAY_ONLY_GROUPS) {
    for (const item of plannedGroupSummary(g).items) {
      assert.ok(['planned', 'service', 'premium'].includes(item.status), `${item.id}: ${item.status}`)
    }
  }
})

ok('O: huduma 12 na premium 1 (jumla 13), zote zikiwa hazijaunganishwa', () => {
  const s = plannedGroupSummary('O')
  assert.deepEqual(s.counts, { planned: 0, service: 12, premium: 1 })
  assert.equal(s.items.length, 13)
  assert.equal(s.items.find((i) => i.id === 'biz.aiCredits').statusLabel, 'Premium')
  assert.deepEqual(s.services.map((x) => x.name).sort(), ['ai', 'backgroundRemoval'])
  assert.ok(s.services.every((x) => x.connected === false))
})

ok('hakuna zana ya display tu yenye action (hakuna kitendo cha kuigiza)', () => {
  for (const t of TOOLS.filter((x) => DISPLAY_ONLY_GROUPS.includes(x.group))) {
    assert.equal(t.action, undefined, `${t.id} ina action`)
  }
  // Kumbuka: uhamisho wa kiwango cha O hauwezi kutumia vitendo; P ina paneli yake (export.panel) na imetengwa.
})

ok('kila kipengele kina lebo ya hali inayoeleweka', () => {
  for (const g of DISPLAY_ONLY_GROUPS) {
    for (const item of plannedGroupSummary(g).items) {
      assert.ok(item.statusLabel && item.label, item.id)
    }
  }
})

ok('N inaonyesha huduma mbili (transcription, voice) zikiwa hazijaunganishwa', () => {
  const s = plannedGroupSummary('N')
  const names = s.services.map((x) => x.name).sort()
  assert.deepEqual(names, ['transcription', 'voice'])
  assert.ok(s.services.every((x) => x.connected === false))
})

ok('vidokezo vya planned vinabaki kwenye muhtasari', () => {
  const s = plannedGroupSummary('L')
  assert.ok(s.items.some((i) => i.note && i.note.length > 0))
})

console.log(`\nMajaribio ya makundi ya display tu: ${pass} PASS`)
