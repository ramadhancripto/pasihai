// ══════════════════════════════════════════════════════════════
// PASIHAI — SUPABASE REPOSITORY & MAPPING TESTS
//
// Matumizi: node scripts/test-supabase-repos.mjs
// (au vite build --ssr scripts/test-supabase-repos.mjs)
//
// Tests:
//   1. supabaseFeedMapper — mapping correctness
//   2. supabaseContentRepository — mock mode (no network)
//   3. supabaseIdentityRepository — mock mode (no network)
//   4. Fallback behavior — empty arrays on error
//   5. Contract compliance — same shape as mock repos
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
console.log('═══ PASIHAI — Supabase Repository Tests ═══')
console.log('')

// ── Test 1: supabaseFeedMapper ─────────────────────────────
console.log('── 1. supabaseFeedMapper ──')

const { mapSupabasePost, mapSupabaseLiveSession, mapSupabaseFeed } = await import('../src/data/mappers/supabaseFeedMapper.js')

// 1.1: mapSupabasePost — text post
const textRow = {
  id: 'test-post-1',
  author_id: 'user-1',
  kind: 'text',
  text: 'Habari dunia',
  media_url: null,
  media_meta: {},
  poll_question: null,
  highlights: null,
  cta: null,
  label: null,
  live_session_id: null,
  visibility: 'public',
  reactions_count: 5,
  comments_count: 2,
  shares_count: 1,
  created_at: new Date(Date.now() - 30 * 60000).toISOString(), // 30 min ago
  updated_at: new Date().toISOString(),
  deleted_at: null,
}

const mapped = mapSupabasePost(textRow)
check('1.1: text post mapped', mapped !== null)
check('1.1: id preserved', mapped.id === 'test-post-1')
check('1.1: kind = text', mapped.kind === 'text')
check('1.1: userId = author_id', mapped.userId === 'user-1')
check('1.1: text preserved', mapped.text === 'Habari dunia')
check('1.1: visibility preserved', mapped.visibility === 'public')
check('1.1: stats.reactions', mapped.stats.reactions === 5)
check('1.1: stats.comments', mapped.stats.comments === 2)
check('1.1: stats.shares', mapped.stats.shares === 1)
check('1.1: ageMinutes ≈ 30', mapped.ageMinutes >= 29 && mapped.ageMinutes <= 31, `got ${mapped.ageMinutes}`)
check('1.1: source = post', mapped.source === 'post')
check('1.1: filters includes posts', mapped.filters.includes('posts'))

// 1.2: mapSupabasePost — image post
const imageRow = { ...textRow, id: 'test-post-2', kind: 'image', media_url: 'https://example.com/img.jpg', media_meta: { tone: 'blue', ratio: '4 / 3' } }
const mappedImg = mapSupabasePost(imageRow)
check('1.2: image kind', mappedImg.kind === 'image')
check('1.2: media.url', mappedImg.media?.url === 'https://example.com/img.jpg')
check('1.2: media.tone', mappedImg.media?.tone === 'blue')
check('1.2: filters includes picha', mappedImg.filters.includes('picha'))

// 1.3: mapSupabasePost — reel
const reelRow = { ...textRow, id: 'test-reel-1', kind: 'reel', media_url: 'https://example.com/reel.mp4', media_meta: { duration: '0:18', views: 100 } }
const mappedReel = mapSupabasePost(reelRow)
check('1.3: reel kind', mappedReel.kind === 'reel')
check('1.3: reel source', mappedReel.source === 'reel')
check('1.3: reel filters', mappedReel.filters.includes('reels'))

// 1.4: mapSupabasePost — poll
const pollRow = { ...textRow, id: 'test-poll-1', kind: 'poll', poll_question: 'Unapenda nini?', media_meta: { pollOptions: ['Chai', 'Kahawa'] } }
const mappedPoll = mapSupabasePost(pollRow)
check('1.4: poll kind', mappedPoll.kind === 'poll')
check('1.4: poll.question', mappedPoll.poll?.question === 'Unapenda nini?')
check('1.4: poll.options', mappedPoll.poll?.options?.length === 2)

// 1.5: mapSupabasePost — product (maps to image + label)
const productRow = { ...textRow, id: 'test-product-1', kind: 'product', label: 'Bidhaa' }
const mappedProduct = mapSupabasePost(productRow)
check('1.5: product → image kind', mappedProduct.kind === 'image')
check('1.5: product label', mappedProduct.label === 'Bidhaa')

// 1.6: mapSupabasePost — null input
check('1.6: null input → null', mapSupabasePost(null) === null)

// 1.7: mapSupabaseLiveSession
const liveRow = {
  id: 'live-1',
  host_id: 'user-1',
  host_name: 'Alice',
  title: 'Mazungumzo ya Tech',
  state: 'live',
  mode: 'Video',
  viewers_count: 42,
  started_at: new Date().toISOString(),
  category: 'Technology',
  speaker_ids: ['user-2', 'user-3'],
  visibility: 'public',
}
const mappedLive = mapSupabaseLiveSession(liveRow)
check('1.7: live mapped', mappedLive !== null)
check('1.7: live kind', mappedLive.kind === 'liveActivity')
check('1.7: live source', mappedLive.source === 'liveSession')
check('1.7: live state', mappedLive.live?.state === 'live')
check('1.7: live viewers', mappedLive.live?.viewers === 42)
check('1.7: live speakers', mappedLive.live?.speakers?.length === 2)

// 1.8: mapSupabaseFeed — combined
const feed = mapSupabaseFeed({ posts: [textRow, imageRow], liveSessions: [liveRow] })
check('1.8: feed has 3 items', feed.length === 3)
check('1.8: feed has post + image + live', feed.some(i => i.kind === 'text') && feed.some(i => i.kind === 'image') && feed.some(i => i.kind === 'liveActivity'))

// ── Test 2: Repository contracts (mock mode) ───────────────
console.log('')
console.log('── 2. Repository contracts (mock mode) ──')

const { supabaseContentRepository } = await import('../src/data/repositories/supabaseContentRepository.js')
const { supabaseIdentityRepository } = await import('../src/data/repositories/supabaseIdentityRepository.js')

// In mock mode (no Supabase configured), all reads should return empty
const feedResult2 = await supabaseContentRepository.listFeed()
check('2.1: listFeed → []', Array.isArray(feedResult2) && feedResult2.length === 0)

const myPosts = await supabaseContentRepository.listMyPosts()
check('2.2: listMyPosts → []', Array.isArray(myPosts) && myPosts.length === 0)

const hidden = await supabaseContentRepository.listHidden()
check('2.3: listHidden → []', Array.isArray(hidden) && hidden.length === 0)

const likes = await supabaseContentRepository.listLikes()
check('2.4: listLikes → []', Array.isArray(likes) && likes.length === 0)

const saved = await supabaseContentRepository.listSaved()
check('2.5: listSaved → []', Array.isArray(saved) && saved.length === 0)

const votes = await supabaseContentRepository.listVotes()
check('2.6: listVotes → {}', typeof votes === 'object' && Object.keys(votes).length === 0)

const statuses = await supabaseContentRepository.getStatuses()
check('2.7: getStatuses → []', Array.isArray(statuses) && statuses.length === 0)

const currentUser = await supabaseIdentityRepository.getCurrentUser()
check('2.8: getCurrentUser → null', currentUser === null)

const users = await supabaseIdentityRepository.listUsers()
check('2.9: listUsers → []', Array.isArray(users) && users.length === 0)

const followed = await supabaseIdentityRepository.listFollowed()
check('2.10: listFollowed → []', Array.isArray(followed) && followed.length === 0)

const vocab = await supabaseIdentityRepository.getEntityVocabulary()
check('2.11: getEntityVocabulary → has roles', vocab?.roles?.person === 'Mtu')
check('2.11: vocabulary has actions', vocab?.actions?.channel === 'Fuata')

// ── Test 3: Write operations return safe defaults ──────────
console.log('')
console.log('── 3. Write operations (Phase 1B stubs) ──')

check('3.1: toggleLike → false', await supabaseContentRepository.toggleLike('x') === false)
check('3.2: toggleSaved → false', await supabaseContentRepository.toggleSaved({}) === false)
check('3.3: addComment → null', await supabaseContentRepository.addComment('x', 'hi') === null)
check('3.4: addPost → null', await supabaseContentRepository.addPost({}) === null)
check('3.5: hideItem → false', await supabaseContentRepository.hideItem('x') === false)
check('3.6: reportItem → false', await supabaseContentRepository.reportItem('x', 'spam') === false)
check('3.7: toggleFollow → false', await supabaseIdentityRepository.toggleFollow('x', true) === false)
check('3.8: updateProfile → null', await supabaseIdentityRepository.updateProfile({}) === null)

// ── Test 4: Composition root ───────────────────────────────
console.log('')
console.log('── 4. Composition root (index.js) ──')

const repos = await import('../src/data/repositories/index.js')
check('4.1: contentRepository exported', repos.contentRepository !== undefined)
check('4.2: identityRepository exported', repos.identityRepository !== undefined)
check('4.3: activityRepository exported', repos.activityRepository !== undefined)
check('4.4: catalogRepository exported', repos.catalogRepository !== undefined)
check('4.5: chatRepository exported', repos.chatRepository !== undefined)
check('4.6: gunduaRepository exported', repos.gunduaRepository !== undefined)
check('4.7: spacesRepository exported', repos.spacesRepository !== undefined)

// In mock mode, contentRepository should be mockContentRepository
const mockContent = await import('../src/data/repositories/contentRepository.js')
check('4.8: contentRepository = mock (mode=mock)', repos.contentRepository === mockContent.mockContentRepository)

// ── Test 5: Feed service integration ───────────────────────
console.log('')
console.log('── 5. Feed service integration (mock mode) ──')

const { feedService } = await import('../src/services/feedService.js')
const feedResult = await feedService.getFeed({ tab: 'mchanganyiko' })
check('5.1: getFeed returns items', feedResult.items?.length > 0, `${feedResult.items?.length} items`)
check('5.2: getFeed returns tab', feedResult.tab === 'mchanganyiko')
check('5.3: getFeed returns total', typeof feedResult.total === 'number')

// ── Results ────────────────────────────────────────────────
console.log('')
console.log(`═══ RESULTS: ${passed}/${total} passed, ${failed} failed ═══`)

if (failed > 0) {
  process.exit(1)
}
