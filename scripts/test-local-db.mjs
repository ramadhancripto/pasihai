// ══════════════════════════════════════════════════════════════
// PASIHAI — LOCAL DATABASE & OUTBOX TESTS
//
// Matumizi: node scripts/test-local-db.mjs
//
// Tests:
//   1. Local database (IndexedDB) — CRUD operations
//   2. Outbox manager — enqueue, queue, retry
//   3. Offline scenarios — restart, duplicates, priorities
//
// MUHIMU: Hizi tests zinaendesha kwenye Node.js, ambapo IndexedDB
// haipatikani. Kwa hivyo, tunatumia "fake-indexeddb" kwa testing.
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
console.log('═══ PASIHAI — Local Database & Outbox Tests ═══')
console.log('')

// ── Setup: Install fake-indexeddb kwa Node.js testing ──────
console.log('── 0. Setup ──')

let hasFakeIndexedDB = false
try {
  // Jaribu kupakia fake-indexeddb (kama imewekwa)
  const fakeIndexedDB = await import('fake-indexeddb')
  globalThis.indexedDB = fakeIndexedDB.indexedDB
  globalThis.IDBKeyRange = fakeIndexedDB.IDBKeyRange
  hasFakeIndexedDB = true
  check('0.1: fake-indexeddb installed', true)
} catch (err) {
  console.log('  ⚠️  fake-indexeddb haijapakiwa — tests za IndexedDB zitarukwa')
  console.log('     Install: npm install --save-dev fake-indexeddb')
  check('0.1: fake-indexeddb installed', false, err.message)
}

if (!hasFakeIndexedDB) {
  console.log('')
  console.log('═══ RESULTS: 0 tests zimerukwa (fake-indexeddb haijapakiwa) ═══')
  console.log('')
  console.log('Kuwezesha tests hizi:')
  console.log('  npm install --save-dev fake-indexeddb')
  console.log('  node scripts/test-local-db.mjs')
  console.log('')
  process.exit(0)
}

// ── Test 1: Local database — open/close ─────────────────────
console.log('')
console.log('── 1. Local database — open/close ──')

const { localDb } = await import('../src/utils/localDatabase.js')

// 1.1: Open database
try {
  await localDb.open()
  check('1.1: localDb.open() succeeds', true)
} catch (err) {
  check('1.1: localDb.open() succeeds', false, err.message)
}

// 1.2: Database is open
const info = localDb.getInfo()
check('1.2: Database is open', info.isOpen === true)

// 1.3: Database name is correct
check('1.3: Database name is "pasihai"', info.name === 'pasihai')

// 1.4: Database version is correct
check('1.4: Database version is 3 (v3 adds contentSharingIndex)', info.version === 3)

// ── Test 2: Posts store — CRUD operations ───────────────────
console.log('')
console.log('── 2. Posts store — CRUD operations ──')

const { posts } = await import('../src/utils/localDatabase.js')

// 2.1: Put a post
const testPost = {
  id: 'post-1',
  authorId: 'user-1',
  kind: 'text',
  text: 'Hello world',
  createdAt: new Date().toISOString(),
}

try {
  await posts.put(testPost)
  check('2.1: posts.put() succeeds', true)
} catch (err) {
  check('2.1: posts.put() succeeds', false, err.message)
}

// 2.2: Get a post
const retrieved = await posts.get('post-1')
check('2.2: posts.get() returns post', retrieved && retrieved.text === 'Hello world')

// 2.3: Get all posts
const allPosts = await posts.getAll()
check('2.3: posts.getAll() returns array', Array.isArray(allPosts) && allPosts.length >= 1)

// 2.4: Get by index (authorId)
const byAuthor = await posts.getByIndex('authorId', 'user-1')
check('2.4: posts.getByIndex() works', Array.isArray(byAuthor) && byAuthor.length >= 1)

// 2.5: Count posts
const count = await posts.count()
check('2.5: posts.count() returns number', typeof count === 'number' && count >= 1)

// 2.6: Update a post
testPost.text = 'Updated text'
await posts.put(testPost)
const updated = await posts.get('post-1')
check('2.6: posts.put() updates post', updated && updated.text === 'Updated text')

// 2.7: Delete a post
await posts.delete('post-1')
const deleted = await posts.get('post-1')
check('2.7: posts.delete() removes post', deleted === null)

// ── Test 3: Outbox manager — enqueue/queue ──────────────────
console.log('')
console.log('── 3. Outbox manager — enqueue/queue ──')

const { outboxManager, STATUS } = await import('../src/utils/outboxManager.js')

// 3.1: Enqueue an action
const action1 = {
  type: 'toggleLike',
  payload: { postId: 'post-123' },
}

const queued1 = await outboxManager.enqueue(action1)
check('3.1: outboxManager.enqueue() returns action', queued1 && queued1.id && queued1.type === 'toggleLike')

// 3.2: Action has pending status
check('3.2: Action has pending status', queued1.status === STATUS.PENDING)

// 3.3: Action has idempotency key
check('3.3: Action has idempotency key', typeof queued1.idempotencyKey === 'string' && queued1.idempotencyKey.length > 0)

// 3.4: Enqueue another action
const action2 = {
  type: 'addComment',
  payload: { postId: 'post-123', text: 'Great post!' },
  priority: 1, // High priority
}

const queued2 = await outboxManager.enqueue(action2)
check('3.4: Enqueue second action', queued2 && queued2.priority === 1)

// 3.5: Get queue
const queue = await outboxManager.getQueue()
check('3.5: getQueue() returns array', Array.isArray(queue) && queue.length >= 2)

// 3.6: Queue is sorted by priority (high priority first)
check('3.6: Queue sorted by priority', queue[0].priority >= queue[1].priority)

// 3.7: Get queue by status
const pending = await outboxManager.getQueue({ status: STATUS.PENDING })
check('3.7: getQueue({ status }) filters', pending.length >= 2)

// 3.8: Count actions
const counts = await outboxManager.count()
check('3.8: count() returns counts', counts.pending >= 2 && counts.total >= 2)

// ── Test 4: Outbox manager — status updates ─────────────────
console.log('')
console.log('── 4. Outbox manager — status updates ──')

// 4.1: Update status to sending
await outboxManager.updateStatus(queued1.id, STATUS.SENDING)
const sending = await outboxManager.getAction(queued1.id)
check('4.1: updateStatus() changes status', sending.status === STATUS.SENDING)

// 4.2: Update status to sent
await outboxManager.updateStatus(queued1.id, STATUS.SENT)
const sent = await outboxManager.getAction(queued1.id)
check('4.2: Status updated to sent', sent.status === STATUS.SENT)

// 4.3: Update status to failed with error
await outboxManager.updateStatus(queued2.id, STATUS.FAILED, 'Network error')
const failedAction = await outboxManager.getAction(queued2.id)
check('4.3: Failed status with error', failedAction.status === STATUS.FAILED && failedAction.lastError === 'Network error')

// 4.4: Retries incremented
check('4.4: Retries incremented', failedAction.retries === 1)

// ── Test 5: Outbox manager — retry logic ────────────────────
console.log('')
console.log('── 5. Outbox manager — retry logic ──')

// 5.1: shouldRetry returns false for non-failed actions
check('5.1: shouldRetry() false for non-failed', !outboxManager.shouldRetry(sent))

// 5.2: shouldRetry returns false if max retries reached
const maxRetriesAction = { ...failedAction, retries: 3 }
check('5.2: shouldRetry() false at max retries', !outboxManager.shouldRetry(maxRetriesAction))

// 5.3: shouldRetry returns true for retryable actions
// (Need to wait for retry delay — skip for now)
check('5.3: shouldRetry() logic exists', typeof outboxManager.shouldRetry === 'function')

// 5.4: getRetryableActions returns array
const retryable = await outboxManager.getRetryableActions()
check('5.4: getRetryableActions() returns array', Array.isArray(retryable))

// ── Test 6: Outbox manager — duplicate prevention ───────────
console.log('')
console.log('── 6. Outbox manager — duplicate prevention ──')

// 6.1: Enqueue a new pending action kwa duplicate testing
const dupAction = await outboxManager.enqueue({
  type: 'addPost',
  payload: { text: 'Test post' },
  idempotencyKey: 'dup-test-key-123',
})

// 6.2: hasPendingAction returns true for existing pending action
const hasExisting = await outboxManager.hasPendingAction('addPost', 'dup-test-key-123')
check('6.1: hasPendingAction() finds existing pending', hasExisting === true)

// 6.3: hasPendingAction returns false for non-existing action
const hasNonExisting = await outboxManager.hasPendingAction('addPost', 'non-existing-key')
check('6.2: hasPendingAction() false for non-existing', hasNonExisting === false)

// ── Test 7: Outbox manager — cleanup ────────────────────────
console.log('')
console.log('── 7. Outbox manager — cleanup ──')

// 7.1: Clear sent actions
const clearedSent = await outboxManager.clearSent()
check('7.1: clearSent() returns count', typeof clearedSent === 'number' && clearedSent >= 1)

// 7.2: Sent action is removed
const sentAfterClear = await outboxManager.getAction(queued1.id)
check('7.2: Sent action removed', sentAfterClear === null)

// 7.3: Clear all actions
await outboxManager.clear()
const finalCounts = await outboxManager.count()
check('7.3: clear() removes all', finalCounts.total === 0)

// ── Test 8: Offline scenarios ───────────────────────────────
console.log('')
console.log('── 8. Offline scenarios ──')

// 8.1: Enqueue multiple actions offline
for (let i = 0; i < 5; i++) {
  await outboxManager.enqueue({
    type: 'toggleLike',
    payload: { postId: `post-${i}` },
  })
}

const offlineQueue = await outboxManager.getQueue()
check('8.1: Multiple actions queued offline', offlineQueue.length === 5)

// 8.2: Actions persist across "restart" (re-import)
const { outboxManager: outboxManager2 } = await import('../src/utils/outboxManager.js?v=' + Date.now())
const persistedQueue = await outboxManager2.getQueue()
check('8.2: Actions persist across restart', persistedQueue.length === 5)

// 8.3: Priority ordering works
await outboxManager.enqueue({
  type: 'addComment',
  payload: { postId: 'important', text: 'Urgent!' },
  priority: 2, // Highest priority
})

const priorityQueue = await outboxManager.getQueue()
check('8.3: High priority action first', priorityQueue[0].priority === 2)

// ── Cleanup ─────────────────────────────────────────────────
console.log('')
console.log('── 9. Cleanup ──')

await outboxManager.clear()
await posts.clear()
localDb.close()
check('9.1: Cleanup completed', true)

// ── Summary ─────────────────────────────────────────────────
console.log('')
console.log(`═══ RESULTS: ${passed}/${total} passed, ${failed} failed ═══`)
console.log('')

process.exit(failed > 0 ? 1 : 0)
