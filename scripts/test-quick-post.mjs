// Tests za Quick Post helpers (src/utils/quickPost.js).
// Hakuna backend: zinathibitisha tafsiri ya jibu la createPost kuwa hali ya UI.
import assert from 'node:assert/strict'
import {
  formatMediaSize,
  insertAtRange,
  normalizeHandle,
  normalizeTag,
  publishMessage,
  publishOutcome,
} from '../src/utils/quickPost.js'

let pass = 0
let fail = 0
function t(name, fn) {
  try {
    fn()
    pass++
    console.log(`  ✓ ${name}`)
  } catch (error) {
    fail++
    console.log(`  ✗ ${name}\n    ${error.message}`)
  }
}

console.log('Quick Post — tags/mentions')
t('tag inaondoa # ya mwanzo na nafasi', () => assert.equal(normalizeTag('  #pasihai '), 'pasihai'))
t('tag yenye nafasi inakataliwa', () => assert.equal(normalizeTag('a b'), null))
t('tag tupu inakataliwa', () => assert.equal(normalizeTag('  '), null))
t('tag yenye herufi 31 inakataliwa', () => assert.equal(normalizeTag('a'.repeat(31)), null))
t('tag yenye alama za HTML inakataliwa', () => assert.equal(normalizeTag('<script>'), null))
t('handle inaongeza @', () => assert.equal(normalizeHandle('amina.said'), '@amina.said'))
t('handle yenye @ tayari inabaki', () => assert.equal(normalizeHandle('@juma.m'), '@juma.m'))
t('handle yenye nafasi inakataliwa', () => assert.equal(normalizeHandle('@a b'), null))

console.log('Quick Post — insertAtRange')
t('inaingiza mwishoni', () => {
  assert.deepEqual(insertAtRange('habari', 6, 6, '#x '), { text: 'habari#x ', caret: 9 })
})
t('inabadilisha selection', () => {
  assert.deepEqual(insertAtRange('abc def', 4, 7, '@z '), { text: 'abc @z ', caret: 7 })
})
t('selection nje ya mpaka inabanwa', () => {
  assert.deepEqual(insertAtRange('ab', 99, 120, 'X'), { text: 'abX', caret: 3 })
})

console.log('Quick Post — publishOutcome (hakuna "imehifadhiwa" bila id)')
t('post bila id → failed', () => assert.equal(publishOutcome({}).status, 'failed'))
t('null → failed', () => assert.equal(publishOutcome(null).status, 'failed'))
t('id tupu ya string → failed', () => assert.equal(publishOutcome({ id: '' }).status, 'failed'))
t('temp- id → pending (si published)', () => assert.equal(publishOutcome({ id: 'temp-abc' }, { live: true }).status, 'pending'))
t('id halisi katika live → published', () => {
  assert.deepEqual(publishOutcome({ id: 'b3f1c0de-0000-4000-8000-000000000001' }, { live: true }), {
    status: 'published',
    id: 'b3f1c0de-0000-4000-8000-000000000001',
  })
})
t('id ya demo (si live) → local, si published', () => {
  assert.equal(publishOutcome({ id: 'my-3' }, { live: false }).status, 'local')
})
t('id ya demo katika live mode bado ni published tu kama backend ilirudisha', () => {
  assert.equal(publishOutcome({ id: 'my-3' }, { live: true }).status, 'published')
})

console.log('Quick Post — ujumbe wa hali')
t('published inasema "Imechapishwa."', () => assert.equal(publishMessage({ status: 'published' }), 'Imechapishwa.'))
t('pending haisemi imechapishwa', () => assert.match(publishMessage({ status: 'pending' }), /bado haijachapishwa/))
t('local inaonyesha demo', () => assert.match(publishMessage({ status: 'local' }), /demo/))
t('failed haisemi imehifadhiwa', () => assert.doesNotMatch(publishMessage({ status: 'failed' }), /^Imehifadhiwa/))

console.log('Quick Post — formatMediaSize')
t('bytes', () => assert.equal(formatMediaSize(512), '512 B'))
t('KB', () => assert.equal(formatMediaSize(2048), '2.0 KB'))
t('MB', () => assert.equal(formatMediaSize(5 * 1024 * 1024), '5.0 MB'))
t('batili → tupu', () => assert.equal(formatMediaSize(-1), ''))

console.log(`\nQuick Post tests: ${pass} PASS, ${fail} FAIL`)
if (fail > 0) process.exit(1)
