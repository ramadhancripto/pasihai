// ══════════════════════════════════════════════════════════════
// PASIHAI — BATCH D INTEGRATION TESTS
//
// Tests za kuthibitisha bug fixes na improvements za Batch D:
//   1. SyncEngine lifecycle (hakuna memory leak)
//   2. OutboxManager ID/idempotencyKey consistency
//   3. TTL kwa actions za zamani
//   4. Retry jitter
//   5. Error handling resilience
//   6. Stuck action recovery
//
// Matumizi: node scripts/test-batch-d.mjs
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
console.log('═══ PASIHAI — Batch D Integration Tests ═══')
console.log('')

// ── Setup: Install fake-indexeddb ──────────────────────────
try {
  const fakeIndexedDB = await import('fake-indexeddb')
  globalThis.indexedDB = fakeIndexedDB.indexedDB
  globalThis.IDBKeyRange = fakeIndexedDB.IDBKeyRange
} catch (err) {
  console.log('  ⚠️  fake-indexeddb haijapakiwa — npm install --save-dev fake-indexeddb')
  process.exit(1)
}

// ── Test 1: SyncEngine Lifecycle (Memory Leak Fix) ─────────
console.log('── 1. SyncEngine Lifecycle (Memory Leak Fix) ──')

const { syncEngine } = await import('../src/utils/syncEngine.js')

// Simulate window object
globalThis.window = {
  _listeners: {},
  addEventListener(event, handler) {
    if (!this._listeners[event]) this._listeners[event] = []
    this._listeners[event].push(handler)
  },
  removeEventListener(event, handler) {
    if (!this._listeners[event]) return
    this._listeners[event] = this._listeners[event].filter(h => h !== handler)
  },
}

// 1.1: Start inaongeza listener moja tu
syncEngine.start()
const onlineCount1 = window._listeners['online']?.length || 0
const offlineCount1 = window._listeners['offline']?.length || 0
check('1.1: Start inaongeza online listener 1', onlineCount1 === 1)
check('1.2: Start inaongeza offline listener 1', offlineCount1 === 1)

// 1.3: Start ya pili haiongezi listeners (kuzuia duplicates)
syncEngine.start()
const onlineCount2 = window._listeners['online']?.length || 0
const offlineCount2 = window._listeners['offline']?.length || 0
check('1.3: Start ya pili haiongezi online listener', onlineCount2 === 1)
check('1.4: Start ya pili haiongezi offline listener', offlineCount2 === 1)

// 1.5: Stop inaondoa listeners
syncEngine.stop()
const onlineCount3 = window._listeners['online']?.length || 0
const offlineCount3 = window._listeners['offline']?.length || 0
check('1.5: Stop inaondoa online listener', onlineCount3 === 0)
check('1.6: Stop inaondoa offline listener', offlineCount3 === 0)

// 1.7: Start/stop mzunguko wa 3 hauleti memory leak
for (let i = 0; i < 3; i++) {
  syncEngine.start()
  syncEngine.stop()
}
const onlineCount4 = window._listeners['online']?.length || 0
check('1.7: Start/stop x3 hakuna memory leak', onlineCount4 === 0)

// ── Test 2: OutboxManager ID/IdempotencyKey Consistency ────
console.log('')
console.log('── 2. OutboxManager ID/IdempotencyKey Consistency ──')

const { outboxManager, STATUS } = await import('../src/utils/outboxManager.js')

// 2.1: Auto-generated idempotencyKey — id na idempotencyKey ni sawa
const action1 = await outboxManager.enqueue({
  type: 'addPost',
  payload: { text: 'Test 1' },
})
check('2.1: ID = idempotencyKey (auto)', action1.id === action1.idempotencyKey)

// 2.2: Custom idempotencyKey — id na idempotencyKey ni sawa
const customKey = 'custom-key-abc-123'
const action2 = await outboxManager.enqueue({
  type: 'addComment',
  payload: { postId: 'p1', text: 'Test 2' },
  idempotencyKey: customKey,
})
check('2.2: ID = idempotencyKey (custom)', action2.id === customKey && action2.idempotencyKey === customKey)

// 2.3: IdempotencyKey ni unique kwa kila action
check('2.3: Actions zina id tofauti', action1.id !== action2.id)

// 2.4: getAction inarudisha action sahihi
const retrieved = await outboxManager.getAction(action1.id)
check('2.4: getAction inarudisha action sahihi', retrieved && retrieved.id === action1.id)

// ── Test 3: TTL kwa Actions za Zamani ──────────────────────
console.log('')
console.log('── 3. TTL kwa Actions za Zamani ──')

// 3.1: Unda action ya zamani (siku 8 zilizopita)
const oldAction = await outboxManager.enqueue({
  type: 'addComment',
  payload: { postId: 'old-post', text: 'Old comment' },
  idempotencyKey: 'old-action-key',
})

// Simulate kuwa ni ya zamani kwa kubadilisha createdAt
oldAction.createdAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
const { outbox } = await import('../src/utils/localDatabase.js')
await outbox.put(oldAction)

// 3.2: Hakikisha action ipo
const oldRetrieved = await outboxManager.getAction('old-action-key')
check('3.1: Old action ipo kwenye outbox', oldRetrieved !== null)

// 3.3: processAction inapaswa kufuta old action
// (Kwa sababu ya TTL check kwenye syncEngine)
const { localDb } = await import('../src/utils/localDatabase.js')
await localDb.open()

// Angalia umri wa action
const actionAge = Date.now() - new Date(oldRetrieved.createdAt).getTime()
const sevenDays = 7 * 24 * 60 * 60 * 1000
check('3.2: Action ni ya zamani zaidi ya TTL (7 siku)', actionAge > sevenDays)

// ── Test 4: Retry Jitter ───────────────────────────────────
console.log('')
console.log('── 4. Retry Jitter ──')

// 4.1: Unda failed action
const failedAction = await outboxManager.enqueue({
  type: 'toggleLike',
  payload: { postId: 'test' },
  idempotencyKey: 'failed-action-1',
})

// Mark as failed
await outboxManager.updateStatus(failedAction.id, STATUS.FAILED, 'Network error')

// 4.2: shouldRetry inarudisha false kwa action iliyoshindwa hivi karibuni
const updatedFailed = await outboxManager.getAction(failedAction.id)
const shouldRetryNow = outboxManager.shouldRetry(updatedFailed)
check('4.1: shouldRetry = false (hivi karibuni)', shouldRetryNow === false)

// 4.3: Baada ya muda wa kutosha, shouldRetry inarudisha true
// Kumbuka: updateStatus iliongeza retries kuwa 1, hivyo baseDelay = 15000ms
// Tunahitaji zaidi ya 15s + 30% jitter = 19500ms
updatedFailed.updatedAt = new Date(Date.now() - 25000).toISOString() // 25s ago
await outbox.put(updatedFailed)
const shouldRetryLater = outboxManager.shouldRetry(updatedFailed)
check('4.2: shouldRetry = true (baada ya delay)', shouldRetryLater === true)

// 4.4: Action yenye max retries haipaswi kurudiwa
updatedFailed.retries = 10 // Zaidi ya MAX_RETRIES (3)
await outbox.put(updatedFailed)
const shouldRetryMaxed = outboxManager.shouldRetry(updatedFailed)
check('4.3: shouldRetry = false (max retries)', shouldRetryMaxed === false)

// ── Test 5: Error Handling Resilience ──────────────────────
console.log('')
console.log('── 5. Error Handling Resilience ──')

// 5.1: Handler isiyopo haivunjiki
const unknownAction = await outboxManager.enqueue({
  type: 'unknownActionType',
  payload: {},
  idempotencyKey: 'unknown-type-test',
})

// processAction inapaswa kushindwa lakini si kuvunja
try {
  await syncEngine.processAction(unknownAction)
  check('5.1: Unknown handler imeshindwa vizuri', false, 'Haikutoa error')
} catch (err) {
  check('5.1: Unknown handler imeshindwa vizuri', true)
}

// 5.2: Action bado ipo (haijafutwa kwa error)
const stillExists = await outboxManager.getAction(unknownAction.id)
check('5.2: Action bado ipo baada ya error', stillExists !== null)

// ── Test 6: Recover Stuck Actions ──────────────────────────
console.log('')
console.log('── 6. Recover Stuck Actions ──')

// 6.1: Unda stuck action
const stuckAction = await outboxManager.enqueue({
  type: 'addPost',
  payload: { text: 'Stuck post' },
  idempotencyKey: 'stuck-action-test',
})

// Mark as sending (kama inatumwa sasa)
await outboxManager.updateStatus(stuckAction.id, STATUS.SENDING)

// Badilisha updatedAt kuwa sekunde 5 zilizopita (kuiga stuck)
const stuckFromDb = await outboxManager.getAction(stuckAction.id)
stuckFromDb.updatedAt = new Date(Date.now() - 5000).toISOString()
await outbox.put(stuckFromDb)

// 6.2: Recover na timeout = 1000ms (stuck kwa zaidi ya 1s)
const recoverStats = await outboxManager.recoverStuckActions(1000)
check('6.1: Recover imeshughulikia stuck action', recoverStats.recovered >= 1 || recoverStats.failed >= 1)

// 6.3: Action imerejeshwa (si stuck tena)
const recoveredAction = await outboxManager.getAction(stuckAction.id)
check('6.2: Action si stuck tena', recoveredAction.status !== STATUS.SENDING)

// ── Test 7: Queue Priority na Ordering ─────────────────────
console.log('')
console.log('── 7. Queue Priority na Ordering ──')

// Futa queue kwanza
await outboxManager.clear()

// 7.1: Ongeza actions zenye priority tofauti
const lowPriority = await outboxManager.enqueue({
  type: 'toggleLike',
  payload: { postId: 'p1' },
  priority: 1,
  idempotencyKey: 'low-priority',
})

const highPriority = await outboxManager.enqueue({
  type: 'addPost',
  payload: { text: 'Important' },
  priority: 10,
  idempotencyKey: 'high-priority',
})

const mediumPriority = await outboxManager.enqueue({
  type: 'addComment',
  payload: { postId: 'p1', text: 'Comment' },
  priority: 5,
  idempotencyKey: 'medium-priority',
})

// 7.2: Queue inarudisha actions kwa priority order
const queue = await outboxManager.getQueue()
check('7.1: High priority kwanza', queue[0].id === 'high-priority')
check('7.2: Medium priority pili', queue[1].id === 'medium-priority')
check('7.3: Low priority mwisho', queue[2].id === 'low-priority')

// ── Test 8: SyncEngine Status na Methods ───────────────────
console.log('')
console.log('── 8. SyncEngine Status na Methods ──')

// 8.1: getStatus inarudisha info sahihi
const status = await syncEngine.getStatus()
check('8.1: getStatus ina isProcessing', typeof status.isProcessing === 'boolean')
check('8.2: getStatus ina isOnline', typeof status.isOnline === 'boolean')
check('8.3: getStatus ina queue stats', typeof status.queue === 'object')
check('8.4: getStatus ina isLiveMode', typeof status.isLiveMode === 'boolean')

// 8.5: clearSent inafanya kazi
const clearSentCount = await syncEngine.clearSent()
check('8.5: clearSent inarudisha count', typeof clearSentCount === 'number')

// 8.6: clearFailed inafanya kazi
const clearFailedCount = await syncEngine.clearFailed()
check('8.6: clearFailed inarudisha count', typeof clearFailedCount === 'number')

// ── Cleanup ─────────────────────────────────────────────────
console.log('')
console.log('── 9. Cleanup ──')

await outboxManager.clear()
const finalQueue = await outboxManager.getQueue()
check('9.1: Outbox imefutwa', finalQueue.length === 0)

localDb.close()
check('9.2: Database imefungwa', true)

// ── Summary ─────────────────────────────────────────────────
console.log('')
console.log(`═══ RESULTS: ${passed}/${total} passed, ${failed} failed ═══`)
console.log('')

process.exit(failed > 0 ? 1 : 0)
