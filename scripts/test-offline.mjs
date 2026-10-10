// ══════════════════════════════════════════════════════════════
// PASIHAI — OFFLINE & PERSISTENCE TESTS
//
// Matumizi: node scripts/test-offline.mjs
//
// Tests:
//   1. storage.js utility (set, get, remove, clearAll)
//   2. User preferences persistence (systemRepository)
//   3. Online/offline detection (useOnlineStatus hook — structure only)
//   4. Repository mode selection (mock vs live)
//   5. SSR safety (storage works without window)
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
console.log('═══ PASIHAI — Offline & Persistence Tests ═══')
console.log('')

// ── Test 1: storage.js utility ──────────────────────────────
console.log('── 1. storage.js utility ──')

const { storage } = await import('../src/utils/storage.js')

// 1.1: storage.set returns boolean
const setResult = storage.set('test_key', { foo: 'bar' })
check('1.1: storage.set returns boolean', typeof setResult === 'boolean')

// 1.2: storage.get returns saved value
const getValue = storage.get('test_key')
check('1.2: storage.get returns saved value', getValue && getValue.foo === 'bar')

// 1.3: storage.get returns default for missing key
const defaultValue = storage.get('nonexistent_key', 'default')
check('1.3: storage.get returns default', defaultValue === 'default')

// 1.4: storage.remove works
storage.set('remove_test', { x: 1 })
storage.remove('remove_test')
const removedValue = storage.get('remove_test', null)
check('1.4: storage.remove deletes key', removedValue === null)

// 1.5: storage.set handles complex objects
const complexObj = {
  array: [1, 2, 3],
  nested: { a: { b: 'c' } },
  bool: true,
  num: 42,
  str: 'hello',
}
storage.set('complex', complexObj)
const retrieved = storage.get('complex')
check('1.5: storage handles complex objects', 
  retrieved && 
  Array.isArray(retrieved.array) && 
  retrieved.nested.a.b === 'c' &&
  retrieved.bool === true &&
  retrieved.num === 42
)

// 1.6: storage.getInfo returns object
const info = storage.getInfo()
check('1.6: storage.getInfo returns info object',
  typeof info === 'object' && 
  typeof info.keys === 'number' &&
  typeof info.bytes === 'number' &&
  typeof info.available === 'boolean'
)

// 1.7: storage.clearAll removes PASIHAI data
storage.set('clear_test_1', 'a')
storage.set('clear_test_2', 'b')
const cleared = storage.clearAll()
check('1.7: storage.clearAll removes data', 
  typeof cleared === 'number' && cleared >= 2,
  `removed ${cleared} items`
)

// 1.8: After clearAll, previously stored test data is gone
const afterClear = storage.get('test_key', null)
check('1.8: clearAll removes all PASIHAI data', afterClear === null)

// ── Test 2: User preferences persistence ───────────────────
console.log('')
console.log('── 2. User preferences persistence ──')

const { mockSystemRepository } = await import('../src/data/repositories/systemRepository.js')

// 2.1: getPrefs returns object
const prefs = await mockSystemRepository.getPrefs()
check('2.1: getPrefs returns object', typeof prefs === 'object' && prefs !== null)

// 2.2: getPrefs has expected fields
check('2.2: getPrefs has contentInterests', 
  Array.isArray(prefs.contentInterests))

// 2.3: savePrefs persists changes
const saved = await mockSystemRepository.savePrefs({ feedSort: 'newest' })
check('2.3: savePrefs returns updated prefs', saved.feedSort === 'newest')

// 2.4: getPrefs after savePrefs returns updated value
const reloaded = await mockSystemRepository.getPrefs()
check('2.4: getPrefs reflects saved changes', reloaded.feedSort === 'newest')

// 2.5: savePrefs merges (not replaces)
await mockSystemRepository.savePrefs({ feedShow: { reels: true } })
const merged = await mockSystemRepository.getPrefs()
check('2.5: savePrefs merges patches',
  merged.feedSort === 'newest' && merged.feedShow.reels === true
)

// 2.6: Preferences survive "restart" (re-import)
// Clean up
storage.remove('userPrefs')

// Set fresh prefs
await mockSystemRepository.savePrefs({ contentInterests: ['Muziki'], feedSort: 'popular' })

// Re-import (simulates app restart)
const { mockSystemRepository: repo2 } = await import('../src/data/repositories/systemRepository.js?v=' + Date.now())
const restarted = await repo2.getPrefs()
check('2.6: Preferences persist across imports',
  restarted.contentInterests && restarted.contentInterests[0] === 'Muziki' &&
  restarted.feedSort === 'popular'
)

// ── Test 3: Online/offline detection ───────────────────────
console.log('')
console.log('── 3. Online/offline detection (structure) ──')

// 3.1: useOnlineStatus module exists
const onlineModule = await import('../src/hooks/useOnlineStatus.js')
check('3.1: useOnlineStatus module exists', typeof onlineModule.useOnlineStatus === 'function')

// 3.2: useOnlineStatusWithHistory module exists
check('3.2: useOnlineStatusWithHistory exists', typeof onlineModule.useOnlineStatusWithHistory === 'function')

// 3.3: default export exists
check('3.3: default export exists', typeof onlineModule.default === 'function')

// ── Test 4: Repository mode selection ──────────────────────
console.log('')
console.log('── 4. Repository mode selection ──')

const repos = await import('../src/data/repositories/index.js')

// 4.1: REPOSITORY_MODE is 'mock' (no env vars set)
check('4.1: REPOSITORY_MODE is "mock"', repos.REPOSITORY_MODE === 'mock')

// 4.2: contentRepository is available
check('4.2: contentRepository exists', repos.contentRepository !== null && repos.contentRepository !== undefined)

// 4.3: identityRepository is available
check('4.3: identityRepository exists', repos.identityRepository !== null && repos.identityRepository !== undefined)

// 4.4: chatRepository is available
check('4.4: chatRepository exists', repos.chatRepository !== null && repos.chatRepository !== undefined)

// 4.5: activityRepository is available
check('4.5: activityRepository exists', repos.activityRepository !== null && repos.activityRepository !== undefined)

// 4.6: catalogRepository is available
check('4.6: catalogRepository exists', repos.catalogRepository !== null && repos.catalogRepository !== undefined)

// 4.7: systemRepository is available
check('4.7: systemRepository exists', repos.systemRepository !== null && repos.systemRepository !== undefined)

// 4.8: contentRepository has listFeed method
check('4.8: contentRepository.listFeed exists', typeof repos.contentRepository.listFeed === 'function')

// 4.9: contentRepository has toggleLike method
check('4.9: contentRepository.toggleLike exists', typeof repos.contentRepository.toggleLike === 'function')

// 4.10: waitForSupabaseRepos is available
check('4.10: waitForSupabaseRepos exists', typeof repos.waitForSupabaseRepos === 'function')

// ── Test 5: SSR safety ─────────────────────────────────────
console.log('')
console.log('── 5. SSR safety ──')

// 5.1: storage works in Node.js (no window)
check('5.1: storage works in Node.js', typeof storage.set === 'function')

// 5.2: storage.getInfo reports available=false in Node.js
const ssrInfo = storage.getInfo()
check('5.2: storage.getInfo.available is false in Node.js', ssrInfo.available === false)

// 5.3: storage.set in Node.js uses memory fallback
storage.set('ssr_test', { value: 42 })
const ssrValue = storage.get('ssr_test')
check('5.3: memory fallback works', ssrValue && ssrValue.value === 42)

// 5.4: storage.remove in Node.js works
storage.remove('ssr_test')
const ssrRemoved = storage.get('ssr_test', null)
check('5.4: memory fallback remove works', ssrRemoved === null)

// ── Test 6: Offline data contracts ─────────────────────────
console.log('')
console.log('── 6. Offline data contracts ──')

// 6.1: mockContentRepository works without network
const { mockContentRepository } = await import('../src/data/repositories/contentRepository.js')
const feed = await mockContentRepository.listFeed()
check('6.1: mockContentRepository.listFeed works offline', Array.isArray(feed) && feed.length > 0)

// 6.2: mockIdentityRepository works without network
const { mockIdentityRepository } = await import('../src/data/repositories/identityRepository.js')
const currentUser = await mockIdentityRepository.getCurrentUser()
check('6.2: mockIdentityRepository.getCurrentUser works offline', currentUser !== null)

// 6.3: mockActivityRepository works without network
const { mockActivityRepository } = await import('../src/data/repositories/activityRepository.js')
const notifs = await mockActivityRepository.listNotifications()
check('6.3: mockActivityRepository.listNotifications works offline', Array.isArray(notifs))

// 6.4: supabaseContentRepository returns [] in mock mode (no network)
const { supabaseContentRepository } = await import('../src/data/repositories/supabaseContentRepository.js')
const supaFeed = await supabaseContentRepository.listFeed()
check('6.4: supabaseContentRepository.listFeed returns [] in mock mode', Array.isArray(supaFeed) && supaFeed.length === 0)

// 6.5: supabaseIdentityRepository returns null in mock mode
const { supabaseIdentityRepository } = await import('../src/data/repositories/supabaseIdentityRepository.js')
const supaUser = await supabaseIdentityRepository.getCurrentUser()
check('6.5: supabaseIdentityRepository returns null in mock mode', supaUser === null || supaUser === undefined)

// ── Test 7: Pending queue contract (structure) ─────────────
console.log('')
console.log('── 7. Pending queue contract (structure only — implementation missing) ──')

// 7.1: systemRepository has queue methods
const sysRepo = repos.systemRepository
check('7.1: systemRepository.listQueue exists', typeof sysRepo.listQueue === 'function')
check('7.2: systemRepository.syncQueue exists', typeof sysRepo.syncQueue === 'function')
check('7.3: systemRepository.enqueue exists', typeof sysRepo.enqueue === 'function')

// 7.4: listQueue returns array
const queue = await sysRepo.listQueue()
check('7.4: listQueue returns array', Array.isArray(queue))

// 7.5: syncQueue returns object
const syncResult = await sysRepo.syncQueue()
check('7.5: syncQueue returns result', typeof syncResult === 'object')

// ── Summary ────────────────────────────────────────────────
console.log('')
console.log(`═══ RESULTS: ${passed}/${total} passed, ${failed} failed ═══`)
console.log('')

// Clean up test data
storage.clearAll()

process.exit(failed > 0 ? 1 : 0)
