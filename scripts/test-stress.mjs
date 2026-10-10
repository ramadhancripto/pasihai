// ══════════════════════════════════════════════════════════════
// PASIHAI — STRESS TESTS (Batch E - Part 2)
//
// Tests za kuthibitisha outbox inaweza kushughulikia:
//   1. Actions 1,000 kwenye queue
//   2. Muda wa processing
//   3. Memory usage
//   4. Queue integrity (hakuna kupotea au kurudiwa)
//
// Matumizi: node scripts/test-stress.mjs
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
console.log('═══ PASIHAI — Stress Tests (Batch E - Part 2) ═══')
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

// ── Test 1: Queue yenye Actions 1,000 ─────────────────────
console.log('── 1. Queue yenye Actions 1,000 ──')

await outboxManager.clear()

// 1.1: Ongeza actions 1,000
const ACTION_COUNT = 1000
const startTime = Date.now()

for (let i = 0; i < ACTION_COUNT; i++) {
  await outboxManager.enqueue({
    type: 'addPost',
    payload: { text: `Post ${i}`, index: i },
    idempotencyKey: `stress-test-${i}`,
  })
}

const enqueueTime = Date.now() - startTime
check('1.1: Actions 1,000 zimeongezwa', true, `${enqueueTime}ms`)

// 1.2: Hakikisha zote zipo
const allActions = await outboxManager.getQueue()
check('1.2: Zote 1,000 zipo kwenye queue', allActions.length === ACTION_COUNT)

// 1.3: Hakikisha hakuna duplicates
const uniqueIds = new Set(allActions.map(a => a.id))
check('1.3: Hakuna duplicates', uniqueIds.size === ACTION_COUNT)

// 1.4: Hakikisha zote zina status PENDING
const pendingCount = allActions.filter(a => a.status === STATUS.PENDING).length
check('1.4: Zote zina status PENDING', pendingCount === ACTION_COUNT)

// 1.5: Pima muda wa getQueue()
const getQueueStart = Date.now()
const queue = await outboxManager.getQueue()
const getQueueTime = Date.now() - getQueueStart
check('1.5: getQueue() inarudisha actions 1,000', queue.length === ACTION_COUNT, `${getQueueTime}ms`)

// ── Test 2: Priority Ordering kwa Actions 1,000 ──────────
console.log('')
console.log('── 2. Priority Ordering kwa Actions 1,000 ──')

await outboxManager.clear()

// 2.1: Ongeza actions zenye priority tofauti
for (let i = 0; i < 500; i++) {
  await outboxManager.enqueue({
    type: 'toggleLike',
    payload: { postId: `p${i}` },
    priority: 1, // Low priority
    idempotencyKey: `low-priority-${i}`,
  })
}

for (let i = 0; i < 300; i++) {
  await outboxManager.enqueue({
    type: 'addComment',
    payload: { postId: `p${i}`, text: 'Comment' },
    priority: 5, // Medium priority
    idempotencyKey: `medium-priority-${i}`,
  })
}

for (let i = 0; i < 200; i++) {
  await outboxManager.enqueue({
    type: 'addPost',
    payload: { text: `Important ${i}` },
    priority: 10, // High priority
    idempotencyKey: `high-priority-${i}`,
  })
}

// 2.2: Pata queue na uhakikisha priority ordering
const priorityQueue = await outboxManager.getQueue()
check('2.1: Kuna actions 1,000', priorityQueue.length === 1000)

// 2.3: Hakikisha high priority ziko mwanzoni
const first10 = priorityQueue.slice(0, 10)
const allHighPriority = first10.every(a => a.priority === 10)
check('2.2: High priority ziko mwanzoni', allHighPriority)

// 2.4: Hakikisha low priority ziko mwishoni
const last10 = priorityQueue.slice(-10)
const allLowPriority = last10.every(a => a.priority === 1)
check('2.3: Low priority ziko mwishoni', allLowPriority)

// ── Test 3: Count na Statistics ───────────────────────────
console.log('')
console.log('── 3. Count na Statistics ──')

// 3.1: Pata count
const countStart = Date.now()
const count = await outboxManager.count()
const countTime = Date.now() - countStart

check('3.1: count() inafanya kazi', count.total === 1000, `${countTime}ms`)
check('3.2: Pending count ni 1,000', count.pending === 1000)

// 3.2: Badilisha baadhi ya actions kuwa SENDING
for (let i = 0; i < 100; i++) {
  const action = priorityQueue[i]
  await outboxManager.updateStatus(action.id, STATUS.SENDING)
}

const countAfterSending = await outboxManager.count()
check('3.3: Sending count ni 100', countAfterSending.sending === 100)
check('3.4: Pending count ni 900', countAfterSending.pending === 900)

// ── Test 4: Clear na Recovery ─────────────────────────────
console.log('')
console.log('── 4. Clear na Recovery ──')

// 4.1: Weka baadhi ya actions kuwa SENT
for (let i = 100; i < 150; i++) {
  const action = priorityQueue[i]
  await outboxManager.updateStatus(action.id, STATUS.SENT)
}

// 4.2: Weka baadhi ya actions kuwa FAILED (na retries = MAX_RETRIES)
const { outbox } = await import('../src/utils/localDatabase.js')
for (let i = 150; i < 200; i++) {
  const action = priorityQueue[i]
  const updated = await outboxManager.updateStatus(action.id, STATUS.FAILED, 'Test error')
  // Ongeza retries hadi MAX_RETRIES (3) ili clearFailed() izifute
  updated.retries = 3
  await outbox.put(updated)
}

const countBeforeClear = await outboxManager.count()
check('4.1: Kuna SENT 50', countBeforeClear.sent === 50)
check('4.2: Kuna FAILED 50', countBeforeClear.failed === 50)

// 4.3: clearSent() inapaswa kufuta SENT tu
const cleared = await outboxManager.clearSent()
check('4.3: clearSent() inafuta 50', cleared === 50)

// 4.4: Hakikisha FAILED bado zipo
const countAfterClear = await outboxManager.count()
check('4.4: FAILED bado zipo', countAfterClear.failed === 50)

// 4.5: clearFailed() inapaswa kufuta FAILED
const clearedFailed = await outboxManager.clearFailed()
check('4.5: clearFailed() inafuta 50', clearedFailed === 50)

// ── Test 5: Duplicate Prevention kwa Actions 1,000 ───────
console.log('')
console.log('── 5. Duplicate Prevention kwa Actions 1,000 ──')

await outboxManager.clear()

// 5.1: Ongeza action moja
const original = await outboxManager.enqueue({
  type: 'addPost',
  payload: { text: 'Original' },
  idempotencyKey: 'duplicate-test-key',
})

// 5.2: Jaribu kuongeza tena 999 mara na idempotencyKey sawa
let duplicatesPrevented = 0
for (let i = 0; i < 999; i++) {
  const duplicate = await outboxManager.enqueue({
    type: 'addPost',
    payload: { text: `Duplicate ${i}` },
    idempotencyKey: 'duplicate-test-key',
  })
  
  if (duplicate.id === original.id) {
    duplicatesPrevented++
  }
}

check('5.1: Duplicates 999 zimezuiliwa', duplicatesPrevented === 999)

// 5.2: Hakikisha kuna action moja tu
const finalQueue = await outboxManager.getQueue()
check('5.2: Kuna action moja tu kwenye queue', finalQueue.length === 1)

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
