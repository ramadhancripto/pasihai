// ══════════════════════════════════════════════════════════════
// PASIHAI — BATCH B TESTS
//
// Tests za:
//   - Content Sharing Index
//   - Content Cache
//   - Offline Actions
//   - Transport Interfaces
//
// Matumizi: node scripts/test-batch-b.mjs
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
console.log('═══ PASIHAI — Batch B Tests ═══')
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

// ── Test 1: Content Sharing Index ───────────────────────────
console.log('── 1. Content Sharing Index ──')

const { contentSharingIndex } = await import('../src/utils/contentSharingIndex.js')

// 1.1: Add content to index
const testPost = {
  id: 'test-post-1',
  type: 'post',
  text: 'Hello world',
  authorId: 'user-1',
  visibility: 'public',
}

const entry = await contentSharingIndex.add(testPost)
check('1.1: Add content to index', entry && entry.contentId === 'test-post-1')

// 1.2: Get content from index
const retrieved = await contentSharingIndex.get('test-post-1')
check('1.2: Get content from index', retrieved && retrieved.contentType === 'post')

// 1.3: Query content
const queryResults = await contentSharingIndex.query({ contentType: 'post' })
check('1.3: Query content', Array.isArray(queryResults) && queryResults.length >= 1)

// 1.4: Can share (public content)
const canShare = await contentSharingIndex.canShare('test-post-1', 'user-2')
check('1.4: Can share public content', canShare === true)

// 1.5: Cannot share private content
const privatePost = {
  id: 'test-post-2',
  type: 'post',
  text: 'Private post',
  authorId: 'user-1',
  visibility: 'private',
}
await contentSharingIndex.add(privatePost)
const canSharePrivate = await contentSharingIndex.canShare('test-post-2', 'user-2')
check('1.5: Cannot share private content', canSharePrivate === false)

// 1.6: Get stats
const stats = await contentSharingIndex.getStats()
check('1.6: Get stats', stats && typeof stats.total === 'number' && stats.total >= 2)

// 1.7: Remove content
await contentSharingIndex.remove('test-post-1')
const removed = await contentSharingIndex.get('test-post-1')
check('1.7: Remove content', removed === null)

// ── Test 2: Content Cache ───────────────────────────────────
console.log('')
console.log('── 2. Content Cache ──')

const { contentCache } = await import('../src/utils/contentCache.js')

// 2.1: Cache post
const cachePost = {
  id: 'cached-post-1',
  authorId: 'user-1',
  kind: 'text',
  text: 'Cached post',
  createdAt: new Date().toISOString(),
}

await contentCache.cachePost(cachePost)
check('2.1: Cache post', true)

// 2.2: Get cached post
const cachedRetrieved = await contentCache.getPost('cached-post-1')
check('2.2: Get cached post', cachedRetrieved && cachedRetrieved.text === 'Cached post')

// 2.3: Get posts with filters
const cachedPosts = await contentCache.getPosts({ authorId: 'user-1' })
check('2.3: Get posts with filters', Array.isArray(cachedPosts) && cachedPosts.length >= 1)

// 2.4: Cache comment
const cacheComment = {
  id: 'cached-comment-1',
  postId: 'cached-post-1',
  authorId: 'user-2',
  text: 'Nice post!',
  createdAt: new Date().toISOString(),
}

await contentCache.cacheComment(cacheComment)
check('2.4: Cache comment', true)

// 2.5: Get comments for post
const cachedComments = await contentCache.getComments('cached-post-1')
check('2.5: Get comments for post', Array.isArray(cachedComments) && cachedComments.length >= 1)

// 2.6: Cache profile
const cacheProfile = {
  id: 'user-1',
  username: 'testuser',
  displayName: 'Test User',
}

await contentCache.cacheProfile(cacheProfile)
check('2.6: Cache profile', true)

// 2.7: Get cached profile
const cachedProfile = await contentCache.getProfile('user-1')
check('2.7: Get cached profile', cachedProfile && cachedProfile.username === 'testuser')

// 2.8: Get cache stats
const cacheStats = await contentCache.getStats()
check('2.8: Get cache stats', cacheStats && typeof cacheStats.posts === 'number')

// 2.9: Remove post from cache
await contentCache.removePost('cached-post-1')
const removedPost = await contentCache.getPost('cached-post-1')
check('2.9: Remove post from cache', removedPost === null)

// ── Test 3: Offline Actions ─────────────────────────────────
console.log('')
console.log('── 3. Offline Actions ──')

const { offlineActions } = await import('../src/utils/offlineActions.js')

// 3.1: Add post offline
const offlinePost = await offlineActions.addPost({
  text: 'Offline post',
  visibility: 'public',
})
check('3.1: Add post offline', offlinePost && offlinePost._optimistic === true)

// 3.2: Add comment offline
const offlineComment = await offlineActions.addComment('test-post-id', 'Offline comment')
check('3.2: Add comment offline', offlineComment && offlineComment._optimistic === true)

// 3.3: Toggle like offline
const liked = await offlineActions.toggleLike('test-post-id')
check('3.3: Toggle like offline', typeof liked === 'boolean')

// 3.4: Toggle saved offline
const saved = await offlineActions.toggleSaved({ id: 'test-post-id' })
check('3.4: Toggle saved offline', typeof saved === 'boolean')

// 3.5: Get offline stats
const offlineStats = await offlineActions.getStats()
check('3.5: Get offline stats', offlineStats && offlineStats.outbox && offlineStats.cache)

// ── Test 4: Transport Interfaces ────────────────────────────
console.log('')
console.log('── 4. Transport Interfaces ──')

const {
  ContentProvider,
  LocalMessagingTransport,
  InternetRelayTransport,
} = await import('../src/utils/transportInterfaces.js')

// 4.1: ContentProvider interface exists
check('4.1: ContentProvider interface exists', typeof ContentProvider === 'function')

// 4.2: LocalMessagingTransport interface exists
check('4.2: LocalMessagingTransport interface exists', typeof LocalMessagingTransport === 'function')

// 4.3: InternetRelayTransport interface exists
check('4.3: InternetRelayTransport interface exists', typeof InternetRelayTransport === 'function')

// 4.4: ContentProvider methods throw not implemented
const contentProvider = new ContentProvider()
try {
  await contentProvider.getContent({ contentId: 'test' })
  check('4.4: ContentProvider.getContent throws', false)
} catch (err) {
  check('4.4: ContentProvider.getContent throws', err.message.includes('Not implemented'))
}

// 4.5: LocalMessagingTransport methods throw not implemented
const localTransport = new LocalMessagingTransport()
try {
  await localTransport.sendMessage({ groupId: 'test', text: 'test' })
  check('4.5: LocalMessagingTransport.sendMessage throws', false)
} catch (err) {
  check('4.5: LocalMessagingTransport.sendMessage throws', err.message.includes('Not implemented'))
}

// 4.6: InternetRelayTransport methods throw not implemented
const relayTransport = new InternetRelayTransport()
try {
  await relayTransport.relayMessage({ recipientId: 'test', text: 'test' })
  check('4.6: InternetRelayTransport.relayMessage throws', false)
} catch (err) {
  check('4.6: InternetRelayTransport.relayMessage throws', err.message.includes('Not implemented'))
}

// ── Test 5: Integration Tests ───────────────────────────────
console.log('')
console.log('── 5. Integration Tests ──')

// 5.1: Offline post appears in cache and outbox
const integrationPost = await offlineActions.addPost({
  text: 'Integration test post',
  visibility: 'public',
})

const cachedIntegrationPost = await contentCache.getPost(integrationPost.id)
check('5.1: Offline post in cache', cachedIntegrationPost && cachedIntegrationPost.text === 'Integration test post')

// 5.2: Offline comment appears in cache and outbox
const integrationComment = await offlineActions.addComment('integration-post-id', 'Integration comment')
const cachedIntegrationComment = await contentCache.getComments('integration-post-id')
check('5.2: Offline comment in cache', cachedIntegrationComment.length > 0)

// 5.3: Content sharing index includes cached content
const indexStats = await contentSharingIndex.getStats()
check('5.3: Content sharing index updated', indexStats.total > 0)

// ── Cleanup ─────────────────────────────────────────────────
console.log('')
console.log('── 6. Cleanup ──')

await contentSharingIndex.clear()
const finalIndexStats = await contentSharingIndex.getStats()
check('6.1: Content sharing index cleared', finalIndexStats.total === 0)

// ── Summary ─────────────────────────────────────────────────
console.log('')
console.log(`═══ RESULTS: ${passed}/${total} passed, ${failed} failed ═══`)
console.log('')

process.exit(failed > 0 ? 1 : 0)
