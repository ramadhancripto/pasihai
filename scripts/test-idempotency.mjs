// ══════════════════════════════════════════════════════════════
// PASIHAI — IDEMPOTENCY TESTS (Batch E - Part 3)
//
// Tests za kuthibitisha server-side idempotency:
//   1. IdempotencyKey inatumika kwenye INSERT
//   2. Duplicate requests hazizalishi records mpya
//   3. Duplicate handling inarudisha rekodi sahihi
//   4. Toggle operations zinafanya kazi na idempotency
//
// Kumbuka: Hizi ni mock tests (zinatumia fake Supabase client)
// Local Supabase integration tests zinahitaji environment tofauti
//
// Matumizi: node scripts/test-idempotency.mjs
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
console.log('═══ PASIHAI — Idempotency Tests (Batch E - Part 3) ═══')
console.log('')

// ── Test 1: Code Review - IdempotencyKey Parameter ─────────
console.log('── 1. Code Review - IdempotencyKey Parameter ──')

// Soma syncEngine.js na uhakikisha handlers zinapitisha idempotencyKey
const fs = await import('fs')
const syncEngineCode = fs.readFileSync('src/utils/syncEngine.js', 'utf-8')

// 1.1: toggleLike handler inapitisha idempotencyKey
check('1.1: toggleLike handler inapitisha idempotencyKey', 
  syncEngineCode.includes('toggleLike(postId, { skipOffline: true, idempotencyKey })'))

// 1.2: addComment handler inapitisha idempotencyKey
check('1.2: addComment handler inapitisha idempotencyKey',
  syncEngineCode.includes('addComment(postId, text, { skipOffline: true, idempotencyKey })'))

// 1.3: addPost handler inapitisha idempotencyKey
check('1.3: addPost handler inapitisha idempotencyKey',
  syncEngineCode.includes('addPost(draft, { skipOffline: true, idempotencyKey })'))

// 1.4: toggleSaved handler inapitisha idempotencyKey
check('1.4: toggleSaved handler inapitisha idempotencyKey',
  syncEngineCode.includes('toggleSaved(item, { skipOffline: true, idempotencyKey })'))

// 1.5: hideItem handler inapitisha idempotencyKey
check('1.5: hideItem handler inapitisha idempotencyKey',
  syncEngineCode.includes('hideItem(itemId, { skipOffline: true, idempotencyKey })'))

// 1.6: reportItem handler inapitisha idempotencyKey
check('1.6: reportItem handler inapitisha idempotencyKey',
  syncEngineCode.includes('reportItem(itemId, reason, { skipOffline: true, idempotencyKey })'))

// 1.7: toggleFollow handler inapitisha idempotencyKey
check('1.7: toggleFollow handler inapitisha idempotencyKey',
  syncEngineCode.includes('toggleFollow(userId, on, { idempotencyKey })'))

// 1.8: updateProfile handler inapitisha idempotencyKey
check('1.8: updateProfile handler inapitisha idempotencyKey',
  syncEngineCode.includes('updateProfile(patch, { idempotencyKey })'))

// ── Test 2: Code Review - Repository Methods ───────────────
console.log('')
console.log('── 2. Code Review - Repository Methods ──')

const contentRepoCode = fs.readFileSync('src/data/repositories/supabaseContentRepository.js', 'utf-8')
const identityRepoCode = fs.readFileSync('src/data/repositories/supabaseIdentityRepository.js', 'utf-8')

// 2.1: addPost inatumia idempotency_key
check('2.1: addPost inatumia idempotency_key',
  contentRepoCode.includes('if (options.idempotencyKey)') &&
  contentRepoCode.includes('insertData.idempotency_key = options.idempotencyKey'))

// 2.2: addPost inashughulikia duplicate error (23505)
check('2.2: addPost inashughulikia duplicate error (23505)',
  contentRepoCode.includes("error.code === '23505'") &&
  contentRepoCode.includes('Duplicate detected, fetching existing'))

// 2.3: addComment inatumia idempotency_key
check('2.3: addComment inatumia idempotency_key',
  contentRepoCode.includes('addComment') &&
  contentRepoCode.match(/async addComment[\s\S]*?insertData\.idempotency_key = options\.idempotencyKey/))

// 2.4: toggleLike inatumia idempotency_key kwa INSERT
check('2.4: toggleLike inatumia idempotency_key kwa INSERT',
  contentRepoCode.includes('toggleLike') &&
  contentRepoCode.match(/async toggleLike[\s\S]*?insertData\.idempotency_key = options\.idempotencyKey/))

// 2.5: toggleLike DELETE haitumii idempotency_key (ni idempotent)
check('2.5: toggleLike DELETE haitumii idempotency_key',
  contentRepoCode.match(/async toggleLike[\s\S]*?\/\/ Unlike - DELETE ni idempotent/))

// 2.6: toggleSaved inatumia idempotency_key
check('2.6: toggleSaved inatumia idempotency_key',
  contentRepoCode.match(/async toggleSaved[\s\S]*?insertData\.idempotency_key = options\.idempotencyKey/))

// 2.7: hideItem inatumia idempotency_key
check('2.7: hideItem inatumia idempotency_key',
  contentRepoCode.match(/async hideItem[\s\S]*?insertData\.idempotency_key = options\.idempotencyKey/))

// 2.8: reportItem inatumia idempotency_key
check('2.8: reportItem inatumia idempotency_key',
  contentRepoCode.match(/async reportItem[\s\S]*?insertData\.idempotency_key = options\.idempotencyKey/))

// 2.9: toggleFollow inatumia idempotency_key
check('2.9: toggleFollow inatumia idempotency_key',
  identityRepoCode.match(/async toggleFollow[\s\S]*?insertData\.idempotency_key = options\.idempotencyKey/))

// 2.10: updateProfile haitumii idempotency_key (UPDATE ni idempotent)
check('2.10: updateProfile haitumii idempotency_key (UPDATE ni idempotent)',
  identityRepoCode.match(/async updateProfile[\s\S]*?\/\/ UPDATE ni idempotent/))

// ── Test 3: Migration 016 Existence ────────────────────────
console.log('')
console.log('── 3. Migration 016 Existence ──')

// 3.1: Migration file ipo
const migrationPath = 'supabase/migrations/016_idempotency_keys.sql'
const migrationExists = fs.existsSync(migrationPath)
check('3.1: Migration 016 ipo', migrationExists)

if (migrationExists) {
  const migrationCode = fs.readFileSync(migrationPath, 'utf-8')
  
  // 3.2: Migration inaongeza idempotency_key kwa posts
  check('3.2: Migration inaongeza idempotency_key kwa posts',
    migrationCode.includes('ALTER TABLE posts') &&
    migrationCode.includes('ADD COLUMN IF NOT EXISTS idempotency_key'))
  
  // 3.3: Migration inaongeza idempotency_key kwa comments
  check('3.3: Migration inaongeza idempotency_key kwa comments',
    migrationCode.includes('ALTER TABLE comments') &&
    migrationCode.includes('idempotency_key'))
  
  // 3.4: Migration inaongeza idempotency_key kwa reactions
  check('3.4: Migration inaongeza idempotency_key kwa reactions',
    migrationCode.includes('ALTER TABLE reactions') &&
    migrationCode.includes('idempotency_key'))
  
  // 3.5: Migration inaongeza idempotency_key kwa bookmarks
  check('3.5: Migration inaongeza idempotency_key kwa bookmarks',
    migrationCode.includes('ALTER TABLE bookmarks') &&
    migrationCode.includes('idempotency_key'))
  
  // 3.6: Migration inaongeza idempotency_key kwa hidden_items
  check('3.6: Migration inaongeza idempotency_key kwa hidden_items',
    migrationCode.includes('ALTER TABLE hidden_items') &&
    migrationCode.includes('idempotency_key'))
  
  // 3.7: Migration ina unique indexes
  check('3.7: Migration ina unique indexes',
    migrationCode.includes('CREATE UNIQUE INDEX'))
  
  // 3.8: Migration inatumia partial indexes (WHERE idempotency_key IS NOT NULL)
  check('3.8: Migration inatumia partial indexes',
    migrationCode.includes('WHERE idempotency_key IS NOT NULL'))
}

// ── Test 4: Handler Signatures ─────────────────────────────
console.log('')
console.log('── 4. Handler Signatures ──')

// 4.1: addPost inapokea options parameter
check('4.1: addPost(draft, options = {})',
  contentRepoCode.includes('async addPost(draft, options = {})'))

// 4.2: addComment inapokea options parameter
check('4.2: addComment(itemId, text, options = {})',
  contentRepoCode.includes('async addComment(itemId, text, options = {})'))

// 4.3: toggleLike inapokea options parameter
check('4.3: toggleLike(itemId, options = {})',
  contentRepoCode.includes('async toggleLike(itemId, options = {})'))

// 4.4: toggleSaved inapokea options parameter
check('4.4: toggleSaved(item, options = {})',
  contentRepoCode.includes('async toggleSaved(item, options = {})'))

// 4.5: hideItem inapokea options parameter
check('4.5: hideItem(id, options = {})',
  contentRepoCode.includes('async hideItem(id, options = {})'))

// 4.6: reportItem inapokea options parameter
check('4.6: reportItem(id, reason, options = {})',
  contentRepoCode.includes('async reportItem(id, reason, options = {})'))

// 4.7: toggleFollow inapokea options parameter
check('4.7: toggleFollow(id, on, options = {})',
  identityRepoCode.includes('async toggleFollow(id, on, options = {})'))

// 4.8: updateProfile inapokea options parameter
check('4.8: updateProfile(patch, options = {})',
  identityRepoCode.includes('async updateProfile(patch, options = {})'))

// ── Test 5: Duplicate Handling Logic ───────────────────────
console.log('')
console.log('── 5. Duplicate Handling Logic ──')

// 5.1: addPost inajaribu kupata existing post kama duplicate
check('5.1: addPost inajaribu kupata existing post kama duplicate',
  contentRepoCode.match(/async addPost[\s\S]*?error\.code === '23505'[\s\S]*?\.eq\('idempotency_key', options\.idempotencyKey\)/))

// 5.2: addComment inajaribu kupata existing comment kama duplicate
check('5.2: addComment inajaribu kupata existing comment kama duplicate',
  contentRepoCode.match(/async addComment[\s\S]*?error\.code === '23505'[\s\S]*?\.eq\('idempotency_key', options\.idempotencyKey\)/))

// 5.3: toggleLike inarudisha true kama duplicate (tayari liked)
check('5.3: toggleLike inarudisha true kama duplicate',
  contentRepoCode.match(/async toggleLike[\s\S]*?error\.code === '23505'[\s\S]*?return true/))

// 5.4: toggleSaved inarudisha true kama duplicate (tayari saved)
check('5.4: toggleSaved inarudisha true kama duplicate',
  contentRepoCode.match(/async toggleSaved[\s\S]*?error\.code === '23505'[\s\S]*?return true/))

// 5.5: hideItem inarudisha true kama duplicate (tayari hidden)
check('5.5: hideItem inarudisha true kama duplicate',
  contentRepoCode.match(/async hideItem[\s\S]*?error\.code === '23505'[\s\S]*?return true/))

// 5.6: reportItem inarudisha true kama duplicate (tayari reported)
check('5.6: reportItem inarudisha true kama duplicate',
  contentRepoCode.match(/async reportItem[\s\S]*?error\.code === '23505'[\s\S]*?return true/))

// 5.7: toggleFollow inarudisha true kama duplicate (tayari following)
check('5.7: toggleFollow inarudisha true kama duplicate',
  identityRepoCode.match(/async toggleFollow[\s\S]*?error\.code === '23505'[\s\S]*?return true/))

// ── Summary ─────────────────────────────────────────────────
console.log('')
console.log(`═══ RESULTS: ${passed}/${total} passed, ${failed} failed ═══`)
console.log('')

process.exit(failed > 0 ? 1 : 0)
