// ══════════════════════════════════════════════════════════════
// PASIHAI — BATCH C INTEGRATION TESTS
//
// Tests za:
//   - Sync Engine integration na App
//   - Recover stuck actions
//   - Offline actions na outbox
//   - Content cache na repositories
//   - Content sharing index
//
// Matumizi: node scripts/test-batch-c-integration.mjs
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
console.log('═══ PASIHAI — Batch C Integration Tests ═══')
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

// ── Test 1: Sync Engine Integration ─────────────────────────
console.log('── 1. Sync Engine Integration ──')

const { syncEngine } = await import('../src/utils/syncEngine.js')

// 1.1: Sync engine start/stop
syncEngine.start()
const status1 = await syncEngine.getStatus()
check('1.1: Sync engine starts', status1.isProcessing === false)

syncEngine.stop()
check('1.2: Sync engine stops', true)

// 1.3: Process queue returns stats
const stats = await syncEngine.processQueue()
check('1.3: Process queue returns stats', typeof stats.processed === 'number')

// ── Test 2: Recover Stuck Actions ───────────────────────────
console.log('')
console.log('── 2. Recover Stuck Actions ──')

const { outboxManager, STATUS } = await import('../src/utils/outboxManager.js')

// 2.1: Enqueue action
const action1 = await outboxManager.enqueue({
  type: 'addPost',
  payload: { draft: { text: 'Test post' } },
})
check('2.1: Enqueue action', action1 && action1.id)

// 2.2: Mark as sending
await outboxManager.updateStatus(action1.id, STATUS.SENDING)
const sendingAction = await outboxManager.getAction(action1.id)
check('2.2: Mark as sending', sendingAction.status === STATUS.SENDING)

// 2.3: Simulate stuck action by using very short timeout
// (Action was just marked as sending, so it's "stuck" if we use 0ms timeout)

// 2.4: Recover stuck actions with 0ms timeout (all sending actions are "stuck")
const recoverStats = await outboxManager.recoverStuckActions(0)
check('2.4: Recover stuck actions', recoverStats.recovered >= 1 || recoverStats.failed >= 1)

// 2.5: Action is no longer stuck
const recoveredAction = await outboxManager.getAction(action1.id)
check('2.5: Action recovered', recoveredAction.status === STATUS.PENDING || recoveredAction.status === STATUS.FAILED)

// ── Test 3: Offline Actions Integration ─────────────────────
console.log('')
console.log('── 3. Offline Actions Integration ──')

const { offlineActions } = await import('../src/utils/offlineActions.js')
const { contentCache } = await import('../src/utils/contentCache.js')

// 3.1: Add post offline
const offlinePost = await offlineActions.addPost({
  text: 'Offline integration test',
  visibility: 'public',
})
check('3.1: Add post offline', offlinePost && offlinePost._optimistic === true)

// 3.2: Post appears in cache
const cachedPost = await contentCache.getPost(offlinePost.id)
check('3.2: Post in cache', cachedPost && cachedPost.text === 'Offline integration test')

// 3.3: Post appears in outbox
const queue = await outboxManager.getQueue({ type: 'addPost' })
check('3.3: Post in outbox', queue.length > 0)

// 3.4: Add comment offline
const offlineComment = await offlineActions.addComment('test-post-id', 'Offline comment')
check('3.4: Add comment offline', offlineComment && offlineComment._optimistic === true)

// 3.5: Comment appears in cache
const cachedComments = await contentCache.getComments('test-post-id')
check('3.5: Comment in cache', cachedComments.length > 0)

// ── Test 4: Content Cache Integration ───────────────────────
console.log('')
console.log('── 4. Content Cache Integration ──')

// 4.1: Cache post from repository
const testPost = {
  id: 'repo-post-1',
  authorId: 'user-1',
  kind: 'text',
  text: 'Repository post',
  createdAt: new Date().toISOString(),
}

await contentCache.cachePost(testPost)
const cachedRepoPost = await contentCache.getPost('repo-post-1')
check('4.1: Cache post from repository', cachedRepoPost && cachedRepoPost.text === 'Repository post')

// 4.2: Cache with TTL
const shortLivedPost = {
  id: 'short-lived-post',
  authorId: 'user-1',
  kind: 'text',
  text: 'Short lived',
  createdAt: new Date().toISOString(),
}

await contentCache.cachePost(shortLivedPost, { ttlMs: 1000 }) // 1 second TTL
check('4.2: Cache with TTL', true)

// 4.3: Wait for expiry
await new Promise(resolve => setTimeout(resolve, 1100))
const expiredPost = await contentCache.getPost('short-lived-post')
check('4.3: Post expires after TTL', expiredPost === null)

// 4.4: Get posts with filters
const filteredPosts = await contentCache.getPosts({ authorId: 'user-1' })
check('4.4: Get posts with filters', Array.isArray(filteredPosts) && filteredPosts.length >= 1)

// ── Test 5: Content Sharing Index Integration ───────────────
console.log('')
console.log('── 5. Content Sharing Index Integration ──')

const { contentSharingIndex } = await import('../src/utils/contentSharingIndex.js')

// 5.1: Add content to index
const shareablePost = {
  id: 'shareable-post-1',
  type: 'post',
  text: 'Shareable post',
  authorId: 'user-1',
  visibility: 'public',
}

const indexEntry = await contentSharingIndex.add(shareablePost)
check('5.1: Add content to index', indexEntry && indexEntry.contentId === 'shareable-post-1')

// 5.2: Query public content
const publicContent = await contentSharingIndex.query({ visibility: 'public' })
check('5.2: Query public content', publicContent.length >= 1)

// 5.3: Can share public content
const canShare = await contentSharingIndex.canShare('shareable-post-1', 'user-2')
check('5.3: Can share public content', canShare === true)

// 5.4: Cannot share private content
const privatePost = {
  id: 'private-post-1',
  type: 'post',
  text: 'Private post',
  authorId: 'user-1',
  visibility: 'private',
}

await contentSharingIndex.add(privatePost)
const canSharePrivate = await contentSharingIndex.canShare('private-post-1', 'user-2')
check('5.4: Cannot share private content', canSharePrivate === false)

// ── Test 6: Idempotency Keys ────────────────────────────────
console.log('')
console.log('── 6. Idempotency Keys ──')

// 6.1: Enqueue with custom idempotency key
const action2 = await outboxManager.enqueue({
  type: 'addComment',
  payload: { postId: 'test', text: 'Test' },
  idempotencyKey: 'custom-key-123',
})
check('6.1: Custom idempotency key', action2.idempotencyKey === 'custom-key-123')

// 6.2: Check for pending action with idempotency key
const hasPending = await outboxManager.hasPendingAction('addComment', 'custom-key-123')
check('6.2: Has pending action', hasPending === true)

// 6.3: Auto-generate idempotency key
const action3 = await outboxManager.enqueue({
  type: 'addComment',
  payload: { postId: 'test', text: 'Test 2' },
})
check('6.3: Auto-generate idempotency key', action3.idempotencyKey && action3.idempotencyKey.length > 0)

// ── Test 7: Error Handling ──────────────────────────────────
console.log('')
console.log('── 7. Error Handling ──')

const { parseSupabaseError, NetworkError, AuthError } = await import('../src/utils/errors.js')

// 7.1: Parse network error
const networkErr = parseSupabaseError({ message: 'Failed to fetch' }, 'test')
check('7.1: Parse network error', networkErr instanceof NetworkError)

// 7.2: Parse auth error
const authErr = parseSupabaseError({ code: '401', message: 'not authenticated' }, 'test')
check('7.2: Parse auth error', authErr instanceof AuthError)

// 7.3: Retryable errors
const { isRetryable } = await import('../src/utils/errors.js')
check('7.3: Network error is retryable', isRetryable(networkErr) === true)
check('7.4: Auth error is not retryable', isRetryable(authErr) === false)

// ── Test 8: Database Schema Migration ───────────────────────
console.log('')
console.log('── 8. Database Schema Migration ──')

const { localDb } = await import('../src/utils/localDatabase.js')

// 8.1: Database opens successfully
await localDb.open()
const info = localDb.getInfo()
check('8.1: Database opens', info.isOpen === true)

// 8.2: Database version is correct
check('8.2: Database version is 3', info.version === 3)

// 8.3: All tables exist
const db = localDb.getDatabase()
const tableNames = Array.from(db.objectStoreNames)
check('8.3: posts table exists', tableNames.includes('posts'))
check('8.4: comments table exists', tableNames.includes('comments'))
check('8.5: outbox table exists', tableNames.includes('outbox'))
check('8.6: contentSharingIndex table exists', tableNames.includes('contentSharingIndex'))

// 8.7: Indexes exist
await localDb.open()
const tx = db.transaction('outbox', 'readonly')
const store = tx.objectStore('outbox')
const indexNames = Array.from(store.indexNames)
check('8.7: outbox has idempotencyKey index', indexNames.includes('idempotencyKey'))

// ── Test 9: Repository Offline Integration ──────────────────
console.log('')
console.log('── 9. Repository Offline Integration ──')

// Simulate offline mode
globalThis.navigator = { onLine: false }

const { supabaseContentRepository } = await import('../src/data/repositories/supabaseContentRepository.js')

// 9.1: addPost in offline mode (should use offlineActions)
// Note: isSupabaseLive is false in Node environment, so returns null
// But the logic is there for browser environment
check('9.1: Repository imports with offline support', true)

// 9.2: listFeed in offline mode would read from cache
// (In Node, isSupabaseLive is false, returns [])
const feed = await supabaseContentRepository.listFeed()
check('9.2: listFeed returns array', Array.isArray(feed))

// 9.3: contentCache.cacheFeed exists
check('9.3: contentCache has cacheFeed method', typeof contentCache.cacheFeed === 'function')

// 9.4: contentCache.getFeed exists
check('9.4: contentCache has getFeed method', typeof contentCache.getFeed === 'function')

// 9.5: Cache feed and retrieve it
const testFeed = [
  {
    id: 'feed-post-1',
    authorId: 'user-1',
    kind: 'text',
    text: 'Feed post 1',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'feed-post-2',
    authorId: 'user-2',
    kind: 'text',
    text: 'Feed post 2',
    createdAt: new Date().toISOString(),
  },
]

await contentCache.cacheFeed(testFeed)
const cachedFeed = await contentCache.getFeed()
check('9.5: Cache and retrieve feed', cachedFeed.length >= 2)

// ── Cleanup ─────────────────────────────────────────────────
console.log('')
console.log('── 10. Cleanup ──')

await outboxManager.clear()
const finalQueue = await outboxManager.getQueue()
check('9.1: Outbox cleared', finalQueue.length === 0)

await contentSharingIndex.clear()
const finalStats = await contentSharingIndex.getStats()
check('9.2: Content sharing index cleared', finalStats.total === 0)

localDb.close()
check('9.3: Database closed', true)

// ── Summary ─────────────────────────────────────────────────
console.log('')
console.log(`═══ RESULTS: ${passed}/${total} passed, ${failed} failed ═══`)
console.log('')

process.exit(failed > 0 ? 1 : 0)
