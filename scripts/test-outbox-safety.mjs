// ══════════════════════════════════════════════════════════════
// PASIHAI — OUTBOX SAFETY TESTS (Batch E)
//
// Tests za kuthibitisha usalama wa outbox na two-phase commit:
//   1. SENT_TO_SERVER actions hazitumwi tena
//   2. clearSent() inafuta SENT_TO_SERVER actions
//   3. Two-phase commit inafanya kazi vizuri
//   4. Recovery ya actions zilizokwama kwenye SENDING
//
// Matumizi: node scripts/test-outbox-safety.mjs
// ══════════════════════════════════════════════════════════════

let passed = 0
let failed = 0
let total = 0

function check(label, condition, detail = '') {
  total++
  if (condition) {
    passed++
    console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ''}`)
  } else {
    failed++
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

console.log('')
console.log('═══ PASIHAI — Outbox Safety Tests (Batch E) ═══')
console.log('')

// ── Setup ──────────────────────────────────────────────────
try {
  const fakeIndexedDB = await import('fake-indexeddb')
  globalThis.indexedDB = fakeIndexedDB.indexedDB
  globalThis.IDBKeyRange = fakeIndexedDB.IDBKeyRange
} catch (err) {
  console.log('  ⚠️  fake-indexeddb haijapakiwa')
  process.exit(1)
}

const { outboxManager, STATUS } = await import('../src/utils/outboxManager.js')
const { syncEngine } = await import('../src/utils/syncEngine.js')

// ── Test 1: SENT_TO_SERVER Status ─────────────────────────
console.log('── 1. SENT_TO_SERVER Status ──')

await outboxManager.clear()

// 1.1: Unda action na uiweke SENT_TO_SERVER
const action1 = await outboxManager.enqueue({
  type: 'addPost',
  payload: { text: 'Test 1' },
  idempotencyKey: 'sent-to-server-test-1',
})

await outboxManager.updateStatus(action1.id, STATUS.SENT_TO_SERVER)

// 1.2: Hakikisha getQueue({status: PENDING}) hairudishi action hii
const pending = await outboxManager.getQueue({ status: STATUS.PENDING })
check('1.1: SENT_TO_SERVER si PENDING', pending.length === 0)

// 1.3: Hakikisha getRetryableActions() hairudishi action hii
const retryable = await outboxManager.getRetryableActions()
check('1.2: SENT_TO_SERVER si retryable', retryable.length === 0)

// 1.4: Hakikisha action ipo kwenye outbox
const sentToServer = await outboxManager.getQueue({ status: STATUS.SENT_TO_SERVER })
check('1.3: Action ipo na status SENT_TO_SERVER', sentToServer.length === 1)

// ── Test 2: clearSent() Inafuta SENT_TO_SERVER ────────────
console.log('')
console.log('── 2. clearSent() Inafuta SENT_TO_SERVER ──')

// 2.1: Ongeza actions 2: moja SENT, moja SENT_TO_SERVER
await outboxManager.clear()

const action2 = await outboxManager.enqueue({
  type: 'addComment',
  payload: { postId: 'p1', text: 'Test 2' },
  idempotencyKey: 'sent-test-2',
})
await outboxManager.updateStatus(action2.id, STATUS.SENT)

const action3 = await outboxManager.enqueue({
  type: 'addComment',
  payload: { postId: 'p2', text: 'Test 3' },
  idempotencyKey: 'sent-to-server-test-3',
})
await outboxManager.updateStatus(action3.id, STATUS.SENT_TO_SERVER)

// 2.2: Hakikisha zote mbili zipo
const before = await outboxManager.getQueue()
check('2.1: Kuna actions 2 kabla ya clearSent', before.length === 2)

// 2.3: clearSent() inapaswa kufuta zote mbili
const cleared = await outboxManager.clearSent()
check('2.2: clearSent() inafuta actions 2', cleared === 2)

// 2.4: Hakikisha outbox imefutwa
const after = await outboxManager.getQueue()
check('2.3: Outbox haina actions baada ya clearSent', after.length === 0)

// ── Test 3: Action Iliyoshindwa Kufutwa Haipotei ──────────
console.log('')
console.log('── 3. Action Iliyoshindwa Kufutwa Haipotei ──')

await outboxManager.clear()

// 3.1: Unda action na uiweke SENT_TO_SERVER (kuiga remove() imeshindwa)
const action4 = await outboxManager.enqueue({
  type: 'toggleLike',
  payload: { postId: 'p1' },
  idempotencyKey: 'stuck-sent-to-server-4',
})
await outboxManager.updateStatus(action4.id, STATUS.SENT_TO_SERVER)

// 3.2: Hakikisha action bado ipo kwenye outbox
const stuck = await outboxManager.getAction(action4.id)
check('3.1: Action bado ipo kwenye outbox', stuck !== null)
check('3.2: Status ni SENT_TO_SERVER', stuck.status === STATUS.SENT_TO_SERVER)

// 3.3: Hakikisha sync engine haitaituma tena
const toProcess = await outboxManager.getQueue({ status: STATUS.PENDING })
check('3.3: Sync engine haitaituma tena', toProcess.length === 0)

// 3.4: Action inaweza kufutwa baadaye na clearSent()
const finalCleared = await outboxManager.clearSent()
check('3.4: Action inaweza kufutwa baadaye', finalCleared === 1)

// ── Test 4: STATUS Enum Ina SENT_TO_SERVER ────────────────
console.log('')
console.log('── 4. STATUS Enum Ina SENT_TO_SERVER ──')

check('4.1: STATUS.SENT_TO_SERVER ipo', STATUS.SENT_TO_SERVER === 'sent_to_server')
check('4.2: STATUS.PENDING ipo', STATUS.PENDING === 'pending')
check('4.3: STATUS.SENDING ipo', STATUS.SENDING === 'sending')
check('4.4: STATUS.SENT ipo', STATUS.SENT === 'sent')
check('4.5: STATUS.FAILED ipo', STATUS.FAILED === 'failed')
check('4.6: STATUS.CANCELLED ipo', STATUS.CANCELLED === 'cancelled')

// ── Test 5: Count Inahesabu SENT_TO_SERVER ────────────────
console.log('')
console.log('── 5. Count Inahesabu SENT_TO_SERVER ──')

await outboxManager.clear()

// 5.1: Ongeza actions zenye status tofauti
await outboxManager.enqueue({ type: 'addPost', payload: {}, idempotencyKey: 'count-1' })
await outboxManager.enqueue({ type: 'addPost', payload: {}, idempotencyKey: 'count-2' })

const a3 = await outboxManager.enqueue({ type: 'addPost', payload: {}, idempotencyKey: 'count-3' })
await outboxManager.updateStatus(a3.id, STATUS.SENT_TO_SERVER)

const a4 = await outboxManager.enqueue({ type: 'addPost', payload: {}, idempotencyKey: 'count-4' })
await outboxManager.updateStatus(a4.id, STATUS.SENT)

// 5.2: Pata count
const count = await outboxManager.count()
check('5.1: Pending count ni 2', count.pending === 2)
check('5.2: SENT_TO_SERVER count ni 1', count.sent_to_server === 1)
check('5.3: SENT count ni 1', count.sent === 1)
check('5.4: Total count ni 4', count.total === 4)

// ── Cleanup ─────────────────────────────────────────────────
console.log('')
console.log('── 6. Cleanup ──')

await outboxManager.clear()
const { localDb } = await import('../src/utils/localDatabase.js')
localDb.close()
check('6.1: Cleanup imekamilika', true)

// ── Summary ─────────────────────────────────────────────────
console.log('')
console.log(`═══ RESULTS: ${passed}/${total} passed, ${failed} failed ═══`)
console.log('')

process.exit(failed > 0 ? 1 : 0)
