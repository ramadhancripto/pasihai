// ══════════════════════════════════════════════════════════════
// PASIHAI — SYNC ENGINE TESTS
//
// Matumizi: node scripts/test-sync.mjs
//
// Tests:
//   1. Error handling — parseSupabaseError
//   2. Sync engine — processQueue, retry logic
//   3. Offline/online transitions
//   4. Conflict handling na duplicates
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
console.log('═══ PASIHAI — Sync Engine Tests ═══')
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

// ── Test 1: Error handling ──────────────────────────────────
console.log('── 1. Error handling — parseSupabaseError ──')

const { 
  parseSupabaseError, 
  NetworkError, 
  AuthError, 
  RLSError, 
  SchemaError,
  isRetryable 
} = await import('../src/utils/errors.js')

// 1.1: Network error
const networkErr = parseSupabaseError({ message: 'Failed to fetch' }, 'test')
check('1.1: Network error detected', networkErr instanceof NetworkError)

// 1.2: Network error is retryable
check('1.2: Network error is retryable', isRetryable(networkErr))

// 1.3: Auth error
const authErr = parseSupabaseError({ code: '401', message: 'not authenticated' }, 'test')
check('1.3: Auth error detected', authErr instanceof AuthError)

// 1.4: Auth error is not retryable
check('1.4: Auth error not retryable', !isRetryable(authErr))

// 1.5: RLS error
const rlsErr = parseSupabaseError({ code: '42501', message: 'permission denied' }, 'test')
check('1.5: RLS error detected', rlsErr instanceof RLSError)

// 1.6: RLS error is not retryable
check('1.6: RLS error not retryable', !isRetryable(rlsErr))

// 1.7: Schema error
const schemaErr = parseSupabaseError({ code: '42P01', message: 'relation does not exist' }, 'test')
check('1.7: Schema error detected', schemaErr instanceof SchemaError)

// 1.8: Schema error is not retryable
check('1.8: Schema error not retryable', !isRetryable(schemaErr))

// 1.9: Error has timestamp
check('1.9: Error has timestamp', networkErr.timestamp && networkErr.timestamp.length > 0)

// 1.10: Error toJSON works
const json = networkErr.toJSON()
check('1.10: Error toJSON works', json.name === 'NetworkError' && json.code === 'NETWORK_ERROR')

// ── Test 2: Sync engine — structure ─────────────────────────
console.log('')
console.log('── 2. Sync engine — structure ──')

const { syncEngine } = await import('../src/utils/syncEngine.js')

// 2.1: syncEngine exists
check('2.1: syncEngine exists', typeof syncEngine === 'object')

// 2.2: syncEngine.start exists
check('2.2: syncEngine.start exists', typeof syncEngine.start === 'function')

// 2.3: syncEngine.stop exists
check('2.3: syncEngine.stop exists', typeof syncEngine.stop === 'function')

// 2.4: syncEngine.processQueue exists
check('2.4: syncEngine.processQueue exists', typeof syncEngine.processQueue === 'function')

// 2.5: syncEngine.getStatus exists
check('2.5: syncEngine.getStatus exists', typeof syncEngine.getStatus === 'function')

// 2.6: syncEngine.retryAction exists
check('2.6: syncEngine.retryAction exists', typeof syncEngine.retryAction === 'function')

// ── Test 3: Sync engine — getStatus ─────────────────────────
console.log('')
console.log('── 3. Sync engine — getStatus ──')

// 3.1: getStatus returns object
const status = await syncEngine.getStatus()
check('3.1: getStatus returns object', typeof status === 'object')

// 3.2: Status has isProcessing
check('3.2: Status has isProcessing', typeof status.isProcessing === 'boolean')

// 3.3: Status has isOnline
check('3.3: Status has isOnline', typeof status.isOnline === 'boolean')

// 3.4: Status has queue stats
check('3.4: Status has queue stats', status.queue && typeof status.queue.total === 'number')

// 3.5: Status has isLiveMode
check('3.5: Status has isLiveMode', typeof status.isLiveMode === 'boolean')

// ── Test 4: Sync engine — processQueue (mock mode) ─────────
console.log('')
console.log('── 4. Sync engine — processQueue (mock mode) ──')

// 4.1: processQueue returns stats
const stats = await syncEngine.processQueue()
check('4.1: processQueue returns stats', typeof stats === 'object' && 'processed' in stats)

// 4.2: In mock mode, nothing is processed
check('4.2: Mock mode — nothing processed', stats.processed === 0)

// ── Test 5: Outbox + sync integration ───────────────────────
console.log('')
console.log('── 5. Outbox + sync integration ──')

const { outboxManager, STATUS } = await import('../src/utils/outboxManager.js')

// 5.1: Enqueue action
const action = await outboxManager.enqueue({
  type: 'toggleLike',
  payload: { postId: 'test-post-123' },
})
check('5.1: Enqueue action', action && action.id)

// 5.2: Action is pending
check('5.2: Action is pending', action.status === STATUS.PENDING)

// 5.3: Queue has action
const queue = await outboxManager.getQueue()
check('5.3: Queue has action', queue.length >= 1)

// 5.4: processQueue in mock mode does not process
const mockStats = await syncEngine.processQueue()
check('5.4: Mock mode — no processing', mockStats.processed === 0)

// 5.5: Action still pending
const stillPending = await outboxManager.getAction(action.id)
check('5.5: Action still pending', stillPending && stillPending.status === STATUS.PENDING)

// ── Test 6: Retry logic ─────────────────────────────────────
console.log('')
console.log('── 6. Retry logic ──')

// 6.1: Mark action as failed
await outboxManager.updateStatus(action.id, STATUS.FAILED, 'Network error')
const failedAction = await outboxManager.getAction(action.id)
check('6.1: Action marked as failed', failedAction.status === STATUS.FAILED)

// 6.2: Retries incremented
check('6.2: Retries incremented', failedAction.retries === 1)

// 6.3: shouldRetry logic
const shouldRetry = outboxManager.shouldRetry(failedAction)
check('6.3: shouldRetry returns boolean', typeof shouldRetry === 'boolean')

// 6.4: getRetryableActions
const retryable = await outboxManager.getRetryableActions()
check('6.4: getRetryableActions returns array', Array.isArray(retryable))

// ── Test 7: Conflict handling ───────────────────────────────
console.log('')
console.log('── 7. Conflict handling ──')

const { ConflictError } = await import('../src/utils/errors.js')

// 7.1: Conflict error
const conflictErr = parseSupabaseError({ code: '409', message: 'conflict' }, 'test')
check('7.1: Conflict error detected', conflictErr instanceof ConflictError)

// 7.2: Conflict error is retryable
check('7.2: Conflict error is retryable', isRetryable(conflictErr))

// ── Test 8: Duplicate prevention ────────────────────────────
console.log('')
console.log('── 8. Duplicate prevention ──')

// 8.1: Enqueue with specific idempotency key
const dupAction = await outboxManager.enqueue({
  type: 'addComment',
  payload: { postId: 'test', text: 'Hello' },
  idempotencyKey: 'unique-key-123',
})
check('8.1: Enqueue with idempotency key', dupAction.idempotencyKey === 'unique-key-123')

// 8.2: hasPendingAction detects duplicate
const hasDup = await outboxManager.hasPendingAction('addComment', 'unique-key-123')
check('8.2: hasPendingAction detects duplicate', hasDup === true)

// 8.3: hasPendingAction for non-existing
const hasNoDup = await outboxManager.hasPendingAction('addComment', 'non-existing-key')
check('8.3: hasPendingAction false for non-existing', hasNoDup === false)

// ── Test 9: Cleanup ─────────────────────────────────────────
console.log('')
console.log('── 9. Cleanup ──')

await outboxManager.clear()
const finalCount = await outboxManager.count()
check('9.1: Outbox cleared', finalCount.total === 0)

// ── Summary ─────────────────────────────────────────────────
console.log('')
console.log(`═══ RESULTS: ${passed}/${total} passed, ${failed} failed ═══`)
console.log('')

process.exit(failed > 0 ? 1 : 0)
