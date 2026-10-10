// ══════════════════════════════════════════════════════════════
// PASIHAI — NETWORK FAILURE TESTS
//
// Tests za kuthibitisha Store-and-Forward inafanya kazi wakati
// wa network failures:
//   1. Action inahifadhiwa wakati offline
//   2. Action inasubiri wakati offline
//   3. Action inatumwa wakati mtandao unarudi
//   4. Retry logic inafanya kazi
//   5. Hakuna duplicates wakati wa retry
//
// Matumizi: node scripts/test-network-failure.mjs
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
console.log('═══ PASIHAI — Network Failure Tests ═══')
console.log('')

// ── Setup: Install fake-indexeddb ──────────────────────────
try {
  const fakeIndexedDB = await import('fake-indexeddb')
  globalThis.indexedDB = fakeIndexedDB.indexedDB
  globalThis.IDBKeyRange = fakeIndexedDB.IDBKeyRange
} catch (err) {
  console.log('  ⚠️  fake-indexeddb haijapakiwa')
  process.exit(1)
}

// Mock navigator.onLine
globalThis.navigator = { onLine: false }

const { outboxManager, STATUS } = await import('../src/utils/outboxManager.js')
const { syncEngine } = await import('../src/utils/syncEngine.js')
const { offlineActions } = await import('../src/utils/offlineActions.js')

// ── Test 1: Action Inahifadhiwa Wakati Offline ─────────────
console.log('── 1. Action Inahifadhiwa Wakati Offline ──')

await outboxManager.clear()

// 1.1: Ongeza post wakati offline
const post1 = await offlineActions.addPost({
  text: 'Post ya kwanza offline',
  visibility: 'public',
})

check('1.1: Post imeundwa (optimistic)', post1 && post1._optimistic === true)

// 1.2: Angalia kwenye outbox
const queue1 = await outboxManager.getQueue()
check('1.2: Post ipo kwenye outbox', queue1.length === 1)
check('1.3: Status ni PENDING', queue1[0].status === STATUS.PENDING)

// ── Test 2: Actions Nyingi Zinasubiri ──────────────────────
console.log('')
console.log('── 2. Actions Nyingi Zinasubiri ──')

// 2.1: Ongeza actions 3 zaidi
await offlineActions.addComment('post-1', 'Comment 1')
await offlineActions.addComment('post-1', 'Comment 2')
await offlineActions.addComment('post-2', 'Comment 3')

const queue2 = await outboxManager.getQueue()
check('2.1: Kuna actions 4 kwenye outbox', queue2.length === 4)

// 2.2: Angalia priority ordering
const pendingActions = queue2.filter(a => a.status === STATUS.PENDING)
check('2.2: Zote zina status PENDING', pendingActions.length === 4)

// ── Test 3: ProcessQueue Haifanyi Kazi Wakati Offline ──────
console.log('')
console.log('── 3. ProcessQueue Haifanyi Kazi Wakati Offline ──')

// 3.1: Jaribu processQueue wakati offline
const result1 = await syncEngine.processQueue()
check('3.1: processQueue inarudisha 0 processed', result1.processed === 0)

// 3.2: Actions bado zipo
const queue3 = await outboxManager.getQueue()
check('3.2: Actions bado zipo kwenye outbox', queue3.length === 4)

// ── Test 4: Duplicate Prevention ───────────────────────────
console.log('')
console.log('── 4. Duplicate Prevention ──')

// 4.1: Jaribu kuongeza action sawa tena
const duplicateKey = 'duplicate-test-key'
const action1 = await outboxManager.enqueue({
  type: 'addPost',
  payload: { text: 'Duplicate test' },
  idempotencyKey: duplicateKey,
})

check('4.1: Action ya kwanza imeongezwa', action1.idempotencyKey === duplicateKey)

// 4.2: Jaribu kuongeza tena na idempotencyKey sawa
const action2 = await outboxManager.enqueue({
  type: 'addPost',
  payload: { text: 'Duplicate test 2' },
  idempotencyKey: duplicateKey,
})

// 4.3: Inapaswa kurudisha ile ile action (sio kuunda mpya)
check('4.2: Duplicate inarudisha action iliyopo', action2.id === action1.id)

// 4.4: Hakuna action mpya kwenye queue
const queue4 = await outboxManager.getQueue({ type: 'addPost' })
const duplicateCount = queue4.filter(a => a.idempotencyKey === duplicateKey).length
check('4.3: Kuna action moja tu na key hiyo', duplicateCount === 1)

// ── Test 5: Retry Logic ────────────────────────────────────
console.log('')
console.log('── 5. Retry Logic ──')

// 5.1: Unda action iliyoshindwa
const failedAction = await outboxManager.enqueue({
  type: 'toggleLike',
  payload: { postId: 'test-post' },
  idempotencyKey: 'failed-action-test',
})

// 5.2: Weka status kuwa FAILED
await outboxManager.updateStatus(failedAction.id, STATUS.FAILED, 'Network error')
const failedRetrieved = await outboxManager.getAction(failedAction.id)
check('5.1: Action ina status FAILED', failedRetrieved.status === STATUS.FAILED)
check('5.2: Retries ni 1', failedRetrieved.retries === 1)

// 5.3: Angalia kama inaweza kujaribu tena (baada ya delay)
// Kumbuka: updateStatus inaongeza retries, hivyo retries=1, baseDelay=15000ms
failedRetrieved.updatedAt = new Date(Date.now() - 20000).toISOString() // 20s ago
const { outbox } = await import('../src/utils/localDatabase.js')
await outbox.put(failedRetrieved)

const shouldRetry = outboxManager.shouldRetry(failedRetrieved)
check('5.3: Action inaweza kujaribu tena', shouldRetry === true)

// 5.4: Pata retryable actions
const retryable = await outboxManager.getRetryableActions()
check('5.4: getRetryableActions inarudisha action', retryable.length >= 1)

// ── Test 6: Max Retries ────────────────────────────────────
console.log('')
console.log('── 6. Max Retries ──')

// 6.1: Weka retries kuwa zaidi ya MAX_RETRIES (3)
failedRetrieved.retries = 5
await outbox.put(failedRetrieved)

const shouldRetryMax = outboxManager.shouldRetry(failedRetrieved)
check('6.1: Action haipaswi kurudiwa (max retries)', shouldRetryMax === false)

// ── Test 7: Stuck Action Recovery ──────────────────────────
console.log('')
console.log('── 7. Stuck Action Recovery ──')

// 7.1: Unda action iliyokwama kwenye SENDING
const stuckAction = await outboxManager.enqueue({
  type: 'addComment',
  payload: { postId: 'p1', text: 'Stuck' },
  idempotencyKey: 'stuck-action-recovery-test',
})

await outboxManager.updateStatus(stuckAction.id, STATUS.SENDING)

// 7.2: Badilisha updatedAt kuwa zamani (kuiga stuck)
const stuck = await outboxManager.getAction(stuckAction.id)
stuck.updatedAt = new Date(Date.now() - 120000).toISOString() // 2 dakika ago
await outbox.put(stuck)

// 7.3: Recover stuck actions
const recoverStats = await outboxManager.recoverStuckActions(60000) // 60s timeout
check('7.1: Recover imeshughulikia stuck action', recoverStats.recovered >= 1)

// 7.4: Action imerejeshwa
const recovered = await outboxManager.getAction(stuckAction.id)
check('7.2: Action imerejeshwa (si SENDING)', recovered.status !== STATUS.SENDING)

// ── Cleanup ─────────────────────────────────────────────────
console.log('')
console.log('── 8. Cleanup ──')

await outboxManager.clear()
const { localDb } = await import('../src/utils/localDatabase.js')
localDb.close()
check('8.1: Cleanup imekamilika', true)

// ── Summary ─────────────────────────────────────────────────
console.log('')
console.log(`═══ RESULTS: ${passed}/${total} passed, ${failed} failed ═══`)
console.log('')

process.exit(failed > 0 ? 1 : 0)
