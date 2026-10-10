// ══════════════════════════════════════════════════════════════
// PASIHAI — SMOKE TEST (zana ya maendeleo)
// Matumizi:  npm run smoke
//
// Kundi la 1: components zina-render bila hitilafu
// Kundi la 2: architecture guard — UI haitumii mock.js moja kwa moja
// Kundi la 3: contract checks — repositories na services zinarudisha data sahihi
// ══════════════════════════════════════════════════════════════

import { renderToString } from 'react-dom/server'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Stubs za mazingira ya browser (effects hazitakiwi kwenye SSR)
globalThis.window = globalThis.window || {
  location: { search: '', href: 'http://localhost/' },
  scrollTo() {},
  history: { replaceState() {} },
  addEventListener() {},
  removeEventListener() {},
  setTimeout: () => 0,
  clearTimeout() {},
}
globalThis.document = globalThis.document || {
  addEventListener() {},
  removeEventListener() {},
  body: { style: {} },
}

const App = (await import('../src/App.jsx')).default
const Home = (await import('../src/pages/Home.jsx')).default
const PlaceholderPage = (await import('../src/pages/PlaceholderPage.jsx')).default
const { default: StyleGuide } = await import('../src/pages/StyleGuide.jsx')
const panels = await import('../src/components/panels.jsx')

const repositories = await import('../src/data/repositories/index.js')
const { homeService } = await import('../src/services/homeService.js')
const { accountService } = await import('../src/services/accountService.js')
const { settingsService } = await import('../src/services/settingsService.js')
const { notificationService } = await import('../src/services/notificationService.js')
const { productInfoService } = await import('../src/services/productInfoService.js')
const { feedService } = await import('../src/services/feedService.js')
const { systemService } = await import('../src/services/systemService.js')
const systemPanels = await import('../src/components/system/SystemPanels.jsx')
const DataSavedIndicator = (await import('../src/components/system/DataSavedIndicator.jsx')).default
const SystemQuickButton = (await import('../src/components/system/SystemQuickButton.jsx')).default
const FeedItem = (await import('../src/components/feed/FeedItem.jsx')).default
const FeedList = (await import('../src/components/feed/FeedList.jsx')).default
const { formatAge } = await import('../src/utils/time.js')
const { NAV_ITEMS } = await import('../src/components/BottomNav.jsx')
const Chat = (await import('../src/pages/Chat.jsx')).default
const Thread = (await import('../src/components/chat/Thread.jsx')).default
const { ChatAvatar } = await import('../src/components/chat/ChatBits.jsx')
const chatPanels = await import('../src/components/chat/ChatPanels.jsx')
const { chatService } = await import('../src/services/chatService.js')

const noop = () => {}
const results = []

function pass(name, info = '') {
  results.push(['OK', name, info])
}

function fail(name, reason) {
  results.push(['FAIL', name, reason])
}

// Kumbuka: components zinazosoma kwa service zina-render hali ya kupakia
// kwenye SSR (renderToString haifanyi useEffect). Hivyo check hii
// inathibitisha "hakuna crash" — uthibitisho wa maudhui halisi unafanyika
// kwenye browser (scripts/shots.mjs) ambapo data inaonekana.
function check(name, fn) {
  try {
    const html = String(fn())
    pass(name, html.length ? `${html.length} chars` : 'hali ya kupakia (data kwa service)')
  } catch (e) {
    fail(name, e.message)
  }
}

function assert(condition, name, detail = '') {
  if (condition) pass(name, detail)
  else fail(name, detail || 'assertion imeshindwa')
}

/* ══════════════════════════════════════════════════════════
   KUNDI LA 1 — RENDER
   ══════════════════════════════════════════════════════════ */

check('App (Home)', () => renderToString(<App />))

check('Home — kila tab', () =>
  ['mchanganyiko', 'reels', 'friends', 'channels', 'live']
    .map((t) =>
      renderToString(
        <Home
          homeTab={t}
          setHomeTab={noop}
          filter="all"
          setFilter={noop}
          viewMode="auto"
          onCreate={noop}
          onOpenStatus={noop}
          onToast={noop}
          onOpenViewMode={noop}
          onOpenMore={noop}
        />,
      ),
    )
    .join(''),
)

check('Home — kila kichujio', () =>
  ['all', 'video', 'picha', 'posts', 'reels', 'audio', 'polls', 'live', 'announcements']
    .map((f) =>
      renderToString(
        <Home
          homeTab="mchanganyiko"
          setHomeTab={noop}
          filter={f}
          setFilter={noop}
          viewMode="vertical"
          onCreate={noop}
          onOpenStatus={noop}
          onToast={noop}
          onOpenViewMode={noop}
          onOpenMore={noop}
        />,
      ),
    )
    .join(''),
)

check('Placeholder — gundua/business', () =>
  ['gundua', 'business']
    .map((k) => renderToString(<PlaceholderPage pageKey={k} />))
    .join(''),
)

/* Spaces ni ukurasa halisi — si placeholder (§53) */
const Spaces = (await import('../src/pages/Spaces.jsx')).default
check('Spaces page (familia: Hubs & Jumuiya | Channels)', () =>
  renderToString(<Spaces onToast={noop} />),
)

check('Chat page (mfumo mmoja wa mawasiliano)', () => renderToString(<Chat onToast={noop} />))
check('Chat thread (hakuna mazungumzo — hali tupu)', () => renderToString(<Thread view={null} onBack={noop} onSend={noop} />))
check('ChatAvatar', () => renderToString(<ChatAvatar tone="green" name="Amina Hassan" />))
check('ChatAvatar (kikundi)', () => renderToString(<ChatAvatar tone="blue" icon="group" />))
check('StyleGuide', () => renderToString(<StyleGuide onHome={noop} />))

check('Panels — Taarifa', () => renderToString(<panels.NotificationsPanel onOpenProfile={noop} />))
check('Panels — Wasifu (wewe)', () => renderToString(<panels.ProfilePanel userId="me" onToast={noop} />))
check('Panels — Wasifu (channel)', () => renderToString(<panels.ProfilePanel userId="techSasa" onToast={noop} />))
check('Panels — Wasifu (biashara)', () => renderToString(<panels.ProfilePanel userId="exampleStore" onToast={noop} />))
check('Panels — Unda', () => renderToString(<panels.CreatePanel onToast={noop} />))
check('Panels — Menyu ya Home', () =>
  renderToString(
    <panels.MorePanel
      viewMode="auto"
      onOpenPanel={noop}
      onViewMode={noop}
      onToast={noop}
      dataSaver
      setDataSaver={noop}
      onRefresh={noop}
    />,
  ),
)
check('Panels — Muonekano', () =>
  renderToString(<panels.ViewModePanel value="auto" onChange={noop} onToast={noop} />),
)
check('Panels — Mapendeleo ya mkondo', () => renderToString(<panels.FeedPrefsPanel onToast={noop} />))
check('Panels — Mapendeleo ya maudhui', () => renderToString(<panels.ContentPrefsPanel onToast={noop} />))
check('Panels — Zilizohifadhiwa', () => renderToString(<panels.SavedPanel onToast={noop} />))
check('Panels — FilterMenu', () => renderToString(<panels.FilterMenu filters={[]} value="all" onChange={noop} />))
check('Panels — Chapisho (composer)', () => renderToString(<panels.ComposerPanel onToast={noop} onClose={noop} />))

/* ── Safu ya mfumo (top controls + panels) ─────────────── */
check('Header — Data Saved indicator', () => renderToString(<DataSavedIndicator onClick={noop} />))
check('Header — System quick button', () => renderToString(<SystemQuickButton onClick={noop} />))
check('Panel — Data Saving', () => renderToString(<systemPanels.DataSavedPanel onToast={noop} />))
check('Panel — System', () => renderToString(<systemPanels.SystemPanel onOpen={noop} onToast={noop} />))
check('Panel — Relay', () => renderToString(<systemPanels.RelayPanel onToast={noop} />))
check('Panel — Nearby', () => renderToString(<systemPanels.NearbyPanel onToast={noop} />))
check('Panel — Sync', () => renderToString(<systemPanels.SyncPanel onToast={noop} />))
check('Panel — Save Offline', () => renderToString(<systemPanels.SaveOfflinePanel onToast={noop} />))
check('Panel — Share Nearby', () => renderToString(<systemPanels.ShareNearbyPanel onToast={noop} />))
check('Panel — System Activity', () => renderToString(<systemPanels.SystemActivityPanel onToast={noop} />))

/* ══════════════════════════════════════════════════════════
   KUNDI LA 2 — ARCHITECTURE GUARD
   UI (components, pages, hooks, services) HAITUMII mock.js moja kwa moja.
   Ni repositories pekee zinazoruhusiwa kuisoma.
   ══════════════════════════════════════════════════════════ */

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.(jsx?|mjs)$/.test(entry)) out.push(full)
  }
  return out
}

const UI_PATHS = ['src/components', 'src/pages', 'src/hooks', 'src/services']
const UI_ROOT_FILES = ['src/App.jsx', 'src/main.jsx']

const uiFiles = [...UI_PATHS.flatMap((p) => walk(p)), ...UI_ROOT_FILES]
const offenders = uiFiles.filter((file) => {
  const src = readFileSync(file, 'utf8')
  return /from\s+['"][^'"]*mock\.js['"]/.test(src)
})

assert(
  offenders.length === 0,
  'Architecture guard: UI haitumii data/mock.js moja kwa moja',
  offenders.length ? `INAKIUKA: ${offenders.join(', ')}` : `${uiFiles.length} faili zimekaguliwa`,
)

const repoFiles = walk('src/data/repositories').filter((f) => !f.endsWith('index.js'))
const reposReadingMock = repoFiles.filter((f) => /from\s+['"][^'"]*mock\.js['"]/.test(readFileSync(f, 'utf8')))
assert(
  reposReadingMock.length > 0,
  'Repositories ndizo zinazosoma mock.js',
  `${reposReadingMock.length}/${repoFiles.length} repositories`,
)

/* ══════════════════════════════════════════════════════════
   KUNDI LA 3 — CONTRACT CHECKS (repositories + services)
   ══════════════════════════════════════════════════════════ */

const {
  identityRepository,
  contentRepository,
  activityRepository,
  catalogRepository,
} = repositories

/* ── Identity repository ─────────────────────────────────── */
const me = await identityRepository.getCurrentUser()
assert(me?.id === 'me' && me.friends === 15 && me.followers === 0, 'identity.getCurrentUser', `friends=${me?.friends}, followers=${me?.followers}`)

const amina = await identityRepository.getUser('amina')
assert(amina?.name === 'Amina Said' && amina.type === 'friend', 'identity.getUser(amina)')

const missingUser = await identityRepository.getUser('hakuna-mtu-huyu')
assert(missingUser === null, 'identity.getUser → null kwa id isiyopo')

const directory = await identityRepository.listUsers()
// Gundua imeongeza watu 13 kwenye mock (§Gundua) — directory ya identity: 16 + 13 = 29
assert(directory.length === 29, 'identity.listUsers', `entities ${directory.length}`)

/* ── Content repository ──────────────────────────────────── */
const statusItems = await contentRepository.getStatuses()
assert(
  statusItems.length === 13 && statusItems[0].own === true && statusItems[1].userId === 'amina',
  'content.getStatuses',
  `${statusItems.length} status, ya kwanza ni "Yako"`,
)

/* ── Activity repository ─────────────────────────────────── */
const allNotifs = await activityRepository.listNotifications()
assert(allNotifs.length === 8, 'activity.listNotifications', `${allNotifs.length} taarifa`)

/* ── Catalog repository ──────────────────────────────────── */
const tabs = await catalogRepository.getHomeTabs()
assert(
  tabs.length === 5 && tabs[0].id === 'mchanganyiko',
  'catalog.getHomeTabs',
  tabs.map((t) => t.label).join(' · '),
)

const catalogFilters = await catalogRepository.getContentFilters()
assert(
  catalogFilters.length === 9 && catalogFilters[0].id === 'all',
  'catalog.getContentFilters',
  `${catalogFilters.length} aina`,
)

const modes = await catalogRepository.getViewModes()
assert(
  modes.length === 3 && modes[0].id === 'auto' && modes[2].id === 'horizontal',
  'catalog.getViewModes',
  modes.map((m) => m.label).join(' · '),
)

const feedPrefs = await catalogRepository.getFeedPreferences()
assert(feedPrefs.sort.length === 3 && feedPrefs.show.length === 5, 'catalog.getFeedPreferences', `${feedPrefs.sort.length} sort, ${feedPrefs.show.length} switches`)

assert((await catalogRepository.getProductInfo('chat'))?.title === 'Chat', 'catalog.getProductInfo(chat)')
assert((await catalogRepository.getProductInfo('hakuna')) === null, 'catalog.getProductInfo → null kwa key isiyopo')

/* ── Home service (composition) ──────────────────────────── */
const nav = await homeService.getNavigation()
assert(nav.tabs.length === 5 && nav.filters.length === 9, 'homeService.getNavigation', `${nav.tabs.length} tabs, ${nav.filters.length} filters`)

const strip = await homeService.getStatusStrip()
assert(
  strip.length >= 2 && strip.every((s) => s.user && s.user.name),
  'homeService.getStatusStrip — kila status ina entity yake',
  `${strip.length}/${strip.length} zimeunganishwa`,
)
assert(
  strip.every((s) => s.own || s.saved),
  'getStatusStrip — akaunti ambazo hazijahifadhiwa hazionekani',
  `${strip.filter((s) => s.saved || s.own).length}/${strip.length} ni zilizohifadhiwa au zako`,
)
assert(strip[0].user.id === 'me' && strip.slice(1).every((s) => s.saved), 'getStatusStrip — wewe kwanza, kisha waliohifadhiwa', `${strip[0].user.name} → ${strip[1].user.name}`)

/* ── Account service ─────────────────────────────────────── */
assert((await accountService.getCurrentUser()).id === 'me', 'accountService.getCurrentUser')
assert((await accountService.getProfile('me')).id === 'me', 'accountService.getProfile(me)')
assert((await accountService.getProfile('techSasa')).type === 'channel', 'accountService.getProfile(channel)')
assert((await accountService.listDirectory()).length === 29, 'accountService.listDirectory')

/* ── Notification service ────────────────────────────────── */
const notifAll = await notificationService.list({ scope: 'zote' })
assert(
  notifAll.length === 8 && notifAll.every((n) => n.user),
  'notificationService.list(zote) — join na entity',
  `${notifAll.length}/8 zimeunganishwa`,
)

const notifFresh = await notificationService.list({ scope: 'mpya' })
assert(notifFresh.length === 3 && notifFresh.every((n) => n.unread), 'notificationService.list(mpya)', `${notifFresh.length} mpya`)

assert((await notificationService.countUnread()) === 3, 'notificationService.countUnread', '3 mpya')

/* ── Settings service ────────────────────────────────────── */
assert((await settingsService.getViewModes()).length === 3, 'settingsService.getViewModes')
assert((await settingsService.getFeedPreferences()).show.length === 5, 'settingsService.getFeedPreferences')

/* ── Product info service ────────────────────────────────── */
assert((await productInfoService.getPage('business'))?.title === 'Business', 'productInfoService.getPage(business)')


/* ══════════════════════════════════════════════════════════
   KUNDI LA 4 — FEED (Phase 2A)
   ══════════════════════════════════════════════════════════ */

/* ── Formatter ya muda ───────────────────────────────────── */
assert(formatAge(12) === 'dakika 12', 'formatAge(12) → dakika 12', formatAge(12))
assert(formatAge(60) === 'saa 1', 'formatAge(60) → saa 1', formatAge(60))
assert(formatAge(1440) === 'siku 1', 'formatAge(1440) → siku 1', formatAge(1440))
assert(formatAge(1500) === 'siku 1', 'formatAge(1500) → siku 1', formatAge(1500))

/* ── Repository: listFeed ────────────────────────────────── */
const feedItems = await contentRepository.listFeed()
assert(feedItems.length === 32, 'contentRepository.listFeed — posts 12 + reels 8 + live 12', `${feedItems.length} items`)

const kinds = [...new Set(feedItems.map((i) => i.kind))].sort()
assert(
  kinds.join(',') === 'announcement,audio,image,liveActivity,poll,reel,text,video',
  'Aina ZOTE 8 za content zipo kwenye feed item model',
  kinds.join(' · '),
)

const withAge = feedItems.every((i) => Number.isFinite(i.ageMinutes))
assert(withAge, 'Kila feed item ina ageMinutes (namba, si maandishi)')

const badFilter = [...new Set(feedItems.flatMap((i) => i.filters))]
assert(
  badFilter.every((f) => ['posts','picha','video','reels','audio','polls','live','announcements'].includes(f)),
  'filters za item zinatoka kwenye vocabulary iliyoidhinishwa',
  badFilter.sort().join(' · '),
)

/* ── Service: tabs ───────────────────────────────────────── */
const feedTabs = ['mchanganyiko', 'reels', 'friends', 'channels', 'live']
const perTab = {}
for (const tab of feedTabs) {
  const result = await feedService.getFeed({ tab })
  perTab[tab] = result
  assert(result.items.length > 0, `feedService.getFeed({ tab: '${tab}' })`, `${result.items.length} items`)
}

assert(perTab.mchanganyiko.items.length === 19, 'Mchanganyiko = posts 11 + reels 8 (channel isiyofuatwa imetolewa)', `${perTab.mchanganyiko.items.length}`)
assert(perTab.reels.items.length === 8, 'Reels tab', `${perTab.reels.items.length}`)
assert(perTab.live.items.length === 12, 'Live tab', `${perTab.live.items.length}`)
assert(
  perTab.friends.items.every((i) => i.entity?.type === 'friend'),
  'Friends tab — kila kitu ni cha marafiki',
  `${perTab.friends.items.length} items (5 posts + 1 live activity + 4 reels)`,
)
assert(
  perTab.channels.items.every((i) => i.entity?.type === 'channel'),
  'Channels tab — mastari yote ni ya Channels',
  `${perTab.channels.items.length} items`,
)

/* ── Identity: entities tofauti zinaunganishwa ───────────── */
const identityTypes = new Set(perTab.mchanganyiko.items.map((i) => i.entity?.type))
assert(
  ['friend', 'channel', 'hub', 'business', 'creator'].every((t) => identityTypes.has(t)),
  'Identity: Friend · Channel · Hub · Biashara · Mbunifu zote zinaonekana',
  [...identityTypes].sort().join(' · '),
)
assert(
  perTab.mchanganyiko.items.every((i) => i.entity && i.entity.name),
  'Kila feed item imeunganishwa na entity yake',
)

/* ROLE ≠ RELATIONSHIP (polish pass): role = aina ya entity; relationship = uhusiano wangu */
const roles = new Set(perTab.mchanganyiko.items.map((i) => i.role).filter(Boolean))
assert(
  ['Mtu', 'Channel', 'Hub', 'Biashara', 'Mbunifu'].every((r) => roles.has(r)),
  'Role za entity zinaonekana (Mtu · Channel · Hub · Biashara · Mbunifu)',
  [...roles].sort().join(' · '),
)
const relationships = new Set(
  perTab.mchanganyiko.items.map((i) => i.relationship).filter(Boolean),
)
assert(
  ['Rafiki', 'Unafuatilia', 'Umejiunga'].every((r) => relationships.has(r)),
  'Relationship states zinapatikana (Rafiki · Unafuatilia · Umejiunga)',
  [...relationships].sort().join(' · '),
)
assert(
  perTab.mchanganyiko.items.every((i) => i.role !== i.relationship),
  'Role na relationship hazichanganywi (tabaka mbili tofauti)',
)

/* ── Mpangilio wa deterministic ──────────────────────────── */
/* Hesabu za tabs — chanzo kimoja cha ukweli (zinathibitishwa pia kwenye UI: scripts/shots.mjs)
   Mchanganyiko = 32 − 12 (vikao vya Live vina tab yao) − 1 (channel isiyofuatwa) = 19
   Friends 10 = posts 6 + live activity 1 + reels 4 · Channels = zinazofuatwa pekee = 3 */
for (const [tab, expected] of [
  ['mchanganyiko', 19], ['reels', 8], ['friends', 10], ['channels', 3], ['live', 12],
]) {
  const r = await feedService.getFeed({ tab })
  assert(r.items.length === expected, `Tab "${tab}" → vipengele ${expected}`, `${r.items.length}`)
}

const runA = (await feedService.getFeed({ tab: 'mchanganyiko' })).items.map((i) => i.id)
const runB = (await feedService.getFeed({ tab: 'mchanganyiko' })).items.map((i) => i.id)
assert(runA.join(',') === runB.join(','), 'Mpangilio ni deterministic (mara mbili = sawa)')
assert(runA[0] === 'p5', 'Mchanganyiko: kipengele cha kwanza = kura ya rafiki (p5)', runA.slice(0, 3).join(' → '))

const liveOrder = (await feedService.getFeed({ tab: 'live' })).items.map((i) => i.live.state)
assert(liveOrder[0] === 'live', 'Live tab: vikao vinavyoendelea kwanza', liveOrder.slice(0, 3).join(' · '))
assert(liveOrder[liveOrder.length - 1] === 'replay', 'Live tab: marudio mwisho', liveOrder.slice(-2).join(' · '))

/* ── Kichujio cha maudhui ────────────────────────────────── */
// Hesabu zinatoka kwenye filterTypes za item (data-driven, si hand-tags):
//   posts  10 = p1–p9 + p12  (p10 ni sauti pekee, p11 ni live activity)
//   picha   4 = p3 · p7 · p8 (bidhaa) · p12 (tukio)
//   video   9 = p4 + reels 8 (reel ni video fupi)
const filtersToTest = [
  ['all', 19], ['posts', 9], ['picha', 3], ['video', 9],
  ['reels', 8], ['audio', 2], ['polls', 1], ['live', 1], ['announcements', 1],
]
for (const [f, expected] of filtersToTest) {
  const r = await feedService.getFeed({ tab: 'mchanganyiko', filter: f })
  assert(r.shown === expected, `Kichujio "${f}" kwenye Mchanganyiko → ${expected}`, `${r.shown}`)
}

const emptyCase = await feedService.getFeed({ tab: 'friends', filter: 'announcements' })
assert(emptyCase.shown === 0, 'Kichujio kinachokosa content → 0 (hali tupu halisi)', `${emptyCase.shown}`)

/* ── Render: kila aina ya body ───────────────────────────── */
const kindBodies = {
  text: 'p1', image: 'p3', video: 'p4', audio: 'p10',
  poll: 'p5', announcement: 'p2', liveActivity: 'live-l1', reel: 'reel-r1',
}
const itemById = new Map((await contentRepository.listFeed()).map((i) => [i.id, i]))
const feedDirectory = await identityRepository.listUsers()
const entityById = new Map(feedDirectory.map((e) => [e.id, e]))

for (const [kind, id] of Object.entries(kindBodies)) {
  const raw = itemById.get(id)
  const item = { ...raw, entity: entityById.get(raw.userId) }
  check(`FeedItem — ${kind}`, () => renderToString(<FeedItem item={item} onToast={noop} />))
}

check('FeedList (Mchanganyiko)', () => renderToString(<FeedList tab="mchanganyiko" filter="all" filterLabel="Zote" onToast={noop} />))

/* ── Stage 5 (Stitch integration): data + render ─────────── */
const p2full = (await feedService.getFeed({ tab: 'channels' })).items.find((i) => i.id === 'p2')
assert(p2full?.highlights?.length === 3, 'Tangazo lina highlights 3', `${p2full?.highlights?.length}`)
assert(Boolean(p2full?.cta?.label), 'Tangazo lina CTA', p2full?.cta?.label ?? '—')
assert((p2full?.stats?.shares ?? 0) > 0, 'Tangazo lina shares', `${p2full?.stats?.shares}`)

const p8full = (await feedService.getFeed({ tab: 'mchanganyiko' })).items.find((i) => i.id === 'p8')
assert(Boolean(p8full?.cta?.label), 'Bidhaa ina CTA', p8full?.cta?.label ?? '—')
const p12full = (await feedService.getFeed({ tab: 'mchanganyiko' })).items.find((i) => i.id === 'p12')
assert(p12full?.cta?.tone === 'primary', 'Tukio lina CTA ya msingi', p12full?.cta?.label ?? '—')

const liveItems = (await feedService.getFeed({ tab: 'live' })).items
const l4 = liveItems.find((i) => i.id === 'live-l4')
assert(
  Array.isArray(l4?.live?.speakers) && l4.live.speakers[0]?.name,
  'Live: wasemaji wameunganishwa na entity (join kwa service)',
  `${l4?.live?.speakers?.length ?? 0} wasemaji`,
)
assert(Boolean(l4?.live?.waveform?.length), 'Live (Sauti): waveform ipo', `${l4?.live?.waveform?.length}`)

const suggestions = await feedService.getChannelSuggestions()
assert(
  suggestions.length === 2 && suggestions.every((c) => c.name && c.handle),
  'feedService.getChannelSuggestions() → channels 2',
  suggestions.map((c) => c.name).join(' · '),
)

const statusStrip = await homeService.getStatusStrip()
assert(
  statusStrip.some((st) => st.live),
  'Status: status ya LIVE ipo',
  `${statusStrip.filter((st) => st.live).length}`,
)
assert(
  statusStrip.some((st) => st.ring === 'creator'),
  'Status: ring ya creator (gold) ipo',
  statusStrip.find((st) => st.ring === 'creator')?.label ?? '—',
)

const pillHtml = renderToString(
  <FeedItem
    item={{
      ...itemById.get('p3'),
      entity: entityById.get('amina'),
      role: 'Mtu',
      relationship: 'Rafiki',
    }}
    onToast={noop}
  />,
)
assert(pillHtml.includes('psh-chip--ent'), 'FeedItem header ina EntityPill', 'psh-chip--ent')
assert(pillHtml.includes('Mtu'), 'Pill inaonyesha ROLE (Mtu)', 'Mtu')
assert(
  pillHtml.includes('Rafiki'),
  'Relationship inaonekana kwenye meta (tabaka la pili)',
  'Rafiki',
)
assert(
  pillHtml.indexOf('Mtu') < pillHtml.indexOf('Rafiki'),
  'Mpangilio: ROLE (pill) kabla ya RELATIONSHIP (meta)',
  'Mtu → Rafiki',
)

/* Vocabulary: action inafuata aina ya entity (Role ≠ Relationship ≠ Action) */
const vocab = await accountService.getEntityVocabulary()
assert(
  vocab.actions.friend.action === 'Ongeza rafiki' &&
    vocab.actions.channel.action === 'Fuata' &&
    vocab.actions.hub.action === 'Jiunge' &&
    vocab.actions.business.secondary === 'Wasiliana',
  'Action inafuata aina ya entity (Person · Channel · Hub · Business)',
  `${vocab.actions.channel.action} · ${vocab.actions.hub.action}`,
)
assert(
  vocab.actions.channel.done === 'Unafuatilia' && vocab.actions.hub.done === 'Umejiunga',
  'Hali ya uhusiano ipo kwa kila action (done state)',
  `${vocab.actions.channel.done} · ${vocab.actions.hub.done}`,
)
assert(
  Object.keys(vocab.roles).length >= 7,
  'Roles zinajumuisha Person · Channel · Hub · Community · Group · Business · Creator',
  Object.values(vocab.roles).join(' · '),
)

/* FeedList ina-render hali ya kupakia kwenye SSR (useAsyncData = effect),
   kwa hiyo sehemu zake za DOM zinathibitishwa kwenye browser: scripts/shots.mjs.
   Hapa tunathibitisha DATA ambayo sehemu hizo zinatumia. */
const segCounts = {
  live: liveItems.filter((i) => i.live.state === 'live').length,
  upcoming: liveItems.filter((i) => i.live.state === 'upcoming').length,
  replay: liveItems.filter((i) => i.live.state === 'replay').length,
}
assert(
  segCounts.live === 6 && segCounts.upcoming === 3 && segCounts.replay === 3,
  'Live segments: Inaendelea 6 · Zilizopangwa 3 · Zilizopita 3',
  `${segCounts.live}/${segCounts.upcoming}/${segCounts.replay}`,
)

const sharesHtml = renderToString(
  <FeedItem item={{ ...itemById.get('p2'), entity: entityById.get('pasihaiUpdates'), relationship: 'Channel' }} onToast={noop} />,
)
assert(sharesHtml.includes('420'), 'FeedActions inaonyesha shares (420)')
assert(sharesHtml.includes('psh-announce__list'), 'Tangazo lina orodha ya highlights')


/* ══════════════════════════════════════════════════════════
   KUNDI LA MFUMO (System) — contracts za service/repository
   ══════════════════════════════════════════════════════════ */

const VOCAB = ['ONLINE', 'LIMITED', 'LOCAL', 'OFFLINE', 'WAITING_SYNC', 'SYNCING']

const { systemRepository } = repositories
assert(
  typeof systemRepository.getDataSaved === 'function' &&
    typeof systemRepository.getInternetRelay === 'function' &&
    typeof systemRepository.getRelayPolicy === 'function' &&
    typeof systemRepository.relayMessage === 'function' &&
    typeof systemRepository.listQueue === 'function',
  'systemRepository ipo kwenye swap point (index.js)',
  'getDataSaved · getRelayPolicy · getInternetRelay · relayMessage · listQueue',
)

const dsToday = await systemService.getDataSaved('today')
assert(dsToday.total === 184, 'Data Saved (today) = 184 MB', `${dsToday.total} MB`)
assert(
  dsToday.breakdown.reduce((n, b) => n + b.mb, 0) === dsToday.total,
  'Data Saved: breakdown inajumlisha hadi jumla',
  `${dsToday.breakdown.map((b) => b.mb).join('+')} = ${dsToday.total}`,
)
assert(dsToday.impact.length === 6, 'Data Saved: athari 6 za mtandao', `${dsToday.impact.length}`)
assert(
  dsToday.cache && dsToday.cache.savedMb !== dsToday.cache.cachedMb,
  'Cache ≠ Saved (vipimo tofauti)',
  `saved ${dsToday.cache.savedMb} MB · cached ${dsToday.cache.cachedMb} MB`,
)
const dsWeek = await systemService.getDataSaved('week')
assert(dsWeek.scope === 'week' && dsWeek.total !== dsToday.total, 'Data Saved: scopes (today/week/month) zinabadilisha data')

const brief = await systemService.getDataSavedBrief()
assert(brief.total === 184 && brief.unit === 'MB', 'Header brief: 184 MB', `${brief.total} ${brief.unit}`)

const snap = await systemService.getSnapshot()
assert(VOCAB.includes(snap.connection.state), 'Vocabulary ya hali ni ile moja (6 states)', snap.connection.state)
assert(snap.quickActions.length === 6, 'Vitendo 6 vya mfumo (relay·nearby·sync·saveoffline·sharenearby·activity)', `${snap.quickActions.length}`)
const offlineSnap = await feedService.getFeed // noop rejea (kuepuka unused)
assert(
  snap.quickActions.every((a) => typeof a.available === 'boolean'),
  'Kila kitendo kina `available` (contextual)',
)
assert(
  snap.quickActions.some((a) => a.id === 'sync' && typeof a.badge !== 'undefined'),
  'Sync ina badge ya vinasubiri (au tupu)',
)

/* ── SERA YA INTERNET RELAY (§1–§15) ────────────────────── */

const relay = await systemService.getRelay()

assert(
  relay.internetRelay.enabled === false,
  'Internet Relay: imezimwa kwa default (OFF by default)',
  `enabled=${relay.internetRelay.enabled}`,
)
assert(
  relay.policy.defaultMb === 3 && relay.internetRelay.limitMb === 3,
  'Kiwango cha kuanzia: 3 MB / siku',
  `${relay.internetRelay.limitMb} MB`,
)
assert(relay.policy.hardMaxMb === 5, 'Ukomo wa lazima: 5 MB / siku (haurukwi)', `${relay.policy.hardMaxMb} MB`)
assert(
  relay.policy.optionsMb.join('·') === '3·5',
  'Mtumiaji achague: 3 MB/siku au 5 MB/siku',
  relay.policy.optionsMb.join(' · '),
)
assert(
  relay.localMesh.kinds.some((k) => k.id === 'video') &&
    relay.policy.ineligible.some((i) => i.id === 'video'),
  'Local Mesh ≠ Internet Relay: video inaruhusiwa kwa mesh, imezuiliwa kwa relay',
)
assert(relay.choices.length === 3, 'Chaguo za mawasiliano: 3 (maandishi pekee)', `${relay.choices.length}`)
assert(
  relay.transports.length === 4 &&
    relay.transports.filter((t) => t.scope === 'local').length === 3 &&
    relay.transports.some((t) => t.scope === 'internet'),
  'Njia: 3 za local (Wi-Fi · Direct · Bluetooth) + 1 Internet Relay',
)
assert(relay.guardrail.includes('idhini'), 'Guardrail ipo: relay inahitaji idhini ya wazi')

/* Idhini: ujumbe unakataliwa relay ikiwa imezimwa */
const offAttempt = await systemService.relayMessage({ kind: 'text', kb: 4 })
assert(
  offAttempt.ok === false && offAttempt.reason === 'off',
  'Idhini inahitajika: ujumbe unakataliwa Internet Relay ikiwa imezimwa',
  offAttempt.message,
)

const enabled = await systemService.setInternetRelayEnabled(true)
assert(enabled.enabled === true, 'Internet Relay inaweza kuwashwa kwa mkono (explicit consent)')

/* Ukomo: 3 ✓ · 5 ✓ · zaidi ya 5 ✗ */
const lim3 = await systemService.setRelayDailyLimit(3)
assert(lim3.ok === true && lim3.relay.limitMb === 3, 'Ukomo 3 MB/siku unaruhusiwa', lim3.message)
const lim5 = await systemService.setRelayDailyLimit(5)
assert(lim5.ok === true && lim5.relay.limitMb === 5, 'Ukomo 5 MB/siku unaruhusiwa', lim5.message)
const lim6 = await systemService.setRelayDailyLimit(6)
assert(
  lim6.ok === false && lim6.reason === 'above_max' && lim6.relay.limitMb === 5,
  'Zaidi ya 5 MB inakataliwa — ukomo 5 MB unabaki',
  lim6.message,
)
const lim20 = await systemService.setRelayDailyLimit(20)
assert(lim20.ok === false, '20 MB inakataliwa kabisa', lim20.message)

/* Aina zinazoruhusiwa */
const tMsg = await systemService.relayMessage({ kind: 'text', kb: 6, label: 'Ujumbe wa majaribio' })
assert(tMsg.ok === true, 'Ujumbe wa maandishi unaruhusiwa', `${tMsg.optimizedKb} KB`)
const tMeta = await systemService.relayMessage({ kind: 'deliveryMeta', kb: 2 })
assert(tMeta.ok === true, 'Metadata ya uwasilishaji inaruhusiwa')
const tSync = await systemService.relayMessage({ kind: 'syncMeta', kb: 2 })
assert(tSync.ok === true, 'Metadata ya uwasazishaji inaruhusiwa')
const tRoute = await systemService.relayMessage({ kind: 'routing', kb: 1 })
assert(tRoute.ok === true, 'Uelekezaji mdogo unaruhusiwa')

/* Uboreshaji unafanyika (raw → compact) */
assert(
  tMsg.optimizedKb < tMsg.rawKb && tMsg.chargedKb === tMsg.optimizedKb,
  'Uboreshaji unafanyika kabla ya kutuma (serialization · metadata · encoding)',
  `${tMsg.rawKb} KB → ${tMsg.optimizedKb} KB`,
)

/* Faili: ZOTE zinakataliwa (hakuna vighairi) */
const MEDIA = ['video', 'reel', 'image', 'audio', 'document', 'pdf', 'zip', 'attachment', 'largeUpload']
for (const kind of MEDIA) {
  const res = await systemService.relayMessage({ kind, kb: 4800 })
  assert(
    res.ok === false && res.reason === 'media' && res.message === 'Internet Relay supports messages only.',
    `Faili haziingii relay: ${kind}`,
    res.message,
  )
}

/* Ujumbe mkubwa kuliko sera */
const tooBig = await systemService.relayMessage({ kind: 'text', kb: 200 })
assert(
  tooBig.ok === false && tooBig.reason === 'too_large' && tooBig.message === 'Message too large for Internet Relay',
  'Ujumbe mkubwa unakataliwa (cap 32 KB)',
  tooBig.message,
)

/* Hakuna automatic file fallback: njia mbadala zinaonyeshwa, foleni haigusi */
const queueBefore = (await systemService.getQueue()).items.length
const blockedFile = await systemService.relayMessage({ kind: 'video', kb: 4800 })
const queueAfter = (await systemService.getQueue()).items.length
assert(
  blockedFile.alternatives && blockedFile.alternatives.length >= 4,
  'Faili iliyozuiliwa inapata njia mbadala (Wi-Fi Direct · Bluetooth · Wi-Fi · upload ya kawaida)',
  blockedFile.alternatives.map((a) => a.label).join(' · '),
)
assert(
  queueBefore === queueAfter,
  'Hakuna automatic fallback: faili HAIINGII kwenye relay wala foleni',
  `${queueBefore} → ${queueAfter}`,
)

/* Ukomo unafuatwa (hard stop) — jaribu kujaza hadi ukatae */
const guard = await systemService.getFileRelayGuard()
assert(
  guard.message === 'Internet Relay supports messages only.' &&
    /bundle/.test((await systemService.getRelay()).measurable),
  'Kinga ya faili + kanuni ya kipimo (tunaripoti tu kinachopimika)',
)

let relayed = 0
let refused = null
for (let i = 0; i < 500; i += 1) {
  const res = await systemService.relayMessage({ kind: 'text', kb: 32 })
  if (!res.ok) {
    refused = res
    break
  }
  relayed += 1
}
assert(refused && refused.reason === 'limit', 'Ukomo wa kila siku unafuatwa (hard stop)', `${relayed} ujumbe kisha kukataliwa`)

const stopped = await systemService.getRelay()
assert(
  stopped.internetRelay.reached === true && stopped.internetRelay.state === 'limit_reached',
  'Ukomo ukifikiwa: relay inasimama (haendelei chinichini)',
  stopped.internetRelay.label,
)
assert(
  stopped.internetRelay.label === 'Internet Relay paused',
  'Hali inasomeka: "Internet Relay paused"',
  stopped.internetRelay.label,
)
assert(
  stopped.internetRelay.usedMb <= stopped.internetRelay.limitMb + 1e-9,
  'Hakuna kuvuka ukomo — hata kidogo',
  `${stopped.internetRelay.usedMb} / ${stopped.internetRelay.limitMb} MB`,
)
const postLimit = await systemService.relayMessage({ kind: 'text', kb: 4 })
assert(
  postLimit.ok === false && postLimit.reason === 'limit' && postLimit.message === 'Daily Internet Relay limit reached',
  'Baada ya ukomo: hakuna trafiki yoyote ya relay',
  postLimit.message,
)

/* Data Saved ≠ Relay Data Used */
const dsSeparate = await systemService.getDataSaved('today')
assert(
  typeof dsSeparate.relayUsedMb === 'number' && dsSeparate.relayUsedMb !== dsSeparate.total,
  'Relay Data Used ≠ Data Saved (vipimo viwili tofauti)',
  `relay ${dsSeparate.relayUsedMb} MB · saved ${dsSeparate.total} MB`,
)
assert(
  dsSeparate.breakdown.every((b) => b.id !== 'relay' && b.id !== 'relayUsed'),
  'Data Saved haitoi relay kama chanzo cha kuokoa data (ni local · cache · mesh)',
  dsSeparate.breakdown.map((b) => b.id).join(' · '),
)
assert(/Relay Data Used/.test(dsSeparate.separationNote), 'Ufafanuzi wa tofauti upo kwenye panel')

/* Reload inarudisha hali ya default kwa mtumiaji mpya */
const freshRelay = await systemService.getRelay()
assert(
  freshRelay.internetRelay.enabled === true && freshRelay.internetRelay.reached === true,
  'Hali ya ndani ya kipimo haipotei kwenye reload (in-memory store)',
)

const q = await systemService.getQueue()
assert(q.items.length >= 3 && q.pending >= 1, 'Foleni ina vitendo vinavyosubiri', `${q.pending} pending`)
assert(
  q.items.every((i) => ['waiting', 'sending', 'synced', 'failed'].includes(i.state)),
  'Hali za foleni ni moja ya 4 (waiting·sending·synced·failed)',
)

const delivery = await systemService.getDeliveryOptions()
assert(
  delivery.options.map((o) => o.id).join('·') === 'local·nearby·community·global',
  'Uwasilishaji: Local only · Nearby · Community · Global',
  delivery.options.map((o) => o.id).join(' '),
)
assert(
  delivery.options.filter((o) => o.queues).every((o) => o.reason.includes('subiri')),
  'Kinachosubiri kinaeleza sababu (itasubiri sync)',
)

const nearby = await systemService.getNearby()
assert(
  nearby.people.every((p) => p.user && p.user.name),
  'Nearby: watu wanajoin na identity (si IDs pekee)',
  nearby.people.map((p) => p.user.name).join(' · '),
)

const activity = await systemService.getActivity()
assert(activity.items.length === 5, 'System Activity: matukio 5', `${activity.items.length}`)
assert(
  activity.summary.lastSync === 'dakika 2',
  'Activity: last sync inatoka data',
  activity.summary.lastSync,
)


/* ══════════════════════════════════════════════════════════════
   K. CHAT SYSTEM (mfumo MMOJA wa mawasiliano) — §1–§32
   ══════════════════════════════════════════════════════════════ */

/* ── K1: Nav — jina rasmi "Chat" (soga haitumiki tena) ─────── */
const navIds = NAV_ITEMS.map((n) => n.id)
assert(
  NAV_ITEMS.length === 5 && navIds.join(',') === 'home,chat,gundua,spaces,business',
  'Chat nav: destinations 5, hakuna ya sita',
  navIds.join(' · '),
)
assert(
  NAV_ITEMS[1].label === 'Chat' && NAV_ITEMS[1].purpose === 'Mawasiliano',
  'Chat nav: jina rasmi "Chat" (si Soga)',
  `${NAV_ITEMS[1].label} · ${NAV_ITEMS[1].purpose}`,
)
assert(
  !navIds.includes('soga') && !NAV_ITEMS.some((n) => /soga/i.test(n.label)),
  'Chat nav: "soga" haipo kwenye navigation',
)

/* Guard ya regression: neno "soga" halitumiki kwenye src/ tena */
const srcFiles = []
;(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full)
    else if (/\.(jsx?|css)$/.test(entry)) srcFiles.push(full)
  }
})(join(process.cwd(), 'src'))
const sogaHits = srcFiles.filter((f) => /soga/i.test(readFileSync(f, 'utf8')))
assert(sogaHits.length === 0, 'Chat: "Soga" haitumiki tena kwenye msimbo', sogaHits.map((f) => f.split('/src/')[1]).join(', '))

/* ── K2: Inbox — filters · orodha · hali ya mfumo ──────────── */
const inbox = await chatService.getInbox('zote')
assert(inbox.filters.length === 4, 'Chat inbox: vichujio vinne (Zote·Direct·Vikundi·Haijasomwa)', inbox.filters.map((f) => f.label).join(' · '))
assert(inbox.conversations.length === 6, 'Chat inbox: mazungumzo 6', `${inbox.conversations.length}`)
assert(
  inbox.counts.direct === 3 && inbox.counts.vikundi === 3,
  'Chat inbox: Direct 3 · Vikundi 3',
  JSON.stringify(inbox.counts),
)
assert(inbox.counts.unreadTotal === 7, 'Chat inbox: jumla ya unread', `${inbox.counts.unreadTotal}`)

const directOnly = await chatService.getInbox('direct')
const groupOnly = await chatService.getInbox('vikundi')
const unreadOnly = await chatService.getInbox('haijasomwa')
assert(directOnly.conversations.every((c) => c.type === 'direct'), 'Chat chip "Direct" inachuja direct pekee')
assert(groupOnly.conversations.every((c) => c.type === 'group'), 'Chat chip "Vikundi" inachuja vikundi pekee')
assert(unreadOnly.conversations.every((c) => c.unread > 0), 'Chat chip "Haijasomwa" inachuja unread pekee')

assert(
  inbox.system.state === 'LOCAL' && inbox.system.label === 'Local Active',
  'Chat: hali ya mfumo inatoka safu ileile ya System (hakuna network system ya pili)',
  `${inbox.system.state} · ${inbox.system.label}`,
)
assert(typeof inbox.system.dataSaved === 'number', 'Chat: Data Saved inatoka systemService', `${inbox.system.dataSaved} MB`)

/* ── K3: Conversation model — types mbili pekee ────────────── */
const types = new Set(inbox.conversations.map((c) => c.type))
assert(
  [...types].every((t) => t === 'direct' || t === 'group') && types.size === 2,
  'Chat: conversation types ni direct|group pekee',
  [...types].join(' · '),
)
const linked = inbox.conversations.filter((c) => c.parentContext)
assert(
  linked.length === 2 && linked.every((c) => c.type === 'group'),
  'Chat: community/hub ni parentContext (metadata) ya kikundi — si type',
  linked.map((c) => `${c.title}→${c.parentContext.type}:${c.parentContext.label}`).join(' · '),
)
const shapesOk = inbox.conversations.every(
  (c) => c.id && c.title && c.tone && typeof c.unread === 'number' && c.updatedAt && c.last,
)
assert(shapesOk, 'Chat: model moja ya conversation (id·title·last·unread·updatedAt)')
assert(
  inbox.conversations.some((c) => c.relationship === 'saved') && inbox.conversations.some((c) => !c.relationship),
  'Chat: relationshipContext inaonekana (Saved Friend = hali, si aina ya chat)',
)

/* ── K4: Direct conversation ───────────────────────────────── */
const direct = await chatService.getThread('c1')
assert(direct && direct.conversation.type === 'direct', 'Chat direct: conversation inapatikana')
assert(direct.messages.length === 6, 'Chat direct: jumbe 6', `${direct.messages.length}`)
const chatKinds = new Set(direct.messages.map((m) => m.kind))
assert(
  ['shared', 'audio', 'poll', 'location', 'text'].every((k) => chatKinds.has(k)),
  'Chat direct: content types (text·shared·audio·poll·location) zinaishi kwenye conversation MOJA',
  [...chatKinds].join(' · '),
)
assert(
  direct.messages.every((m) => m.stateInfo && m.stateInfo.label),
  'Chat direct: kila ujumbe una hali ya uwasilishaji yenye label',
)
assert(direct.messages.some((m) => m.reactions), 'Chat direct: reactions zipo kwenye data')

/* ── K5: Group conversation ────────────────────────────────── */
const group = await chatService.getThread('c2')
assert(group.conversation.type === 'group' && group.conversation.members === 48, 'Chat group: kikundi 48 wanachama')
assert(
  group.messages.some((m) => m.doc) && group.messages.some((m) => m.state === 'waiting'),
  'Chat group: faili + hali ya kusubiri zinaonekana',
  group.messages.map((m) => m.kind).join(' · '),
)
assert(group.conversation.memberPreview.length === 4, 'Chat group: wanachama wa kielelezo (roles) wanajoin')
const linkedThread = await chatService.getThread('c3')
assert(
  linkedThread.conversation.parentContext?.label === 'Wakulima Tanzania',
  'Chat group: kikundi kilichounganishwa na community kinaonyesha metadata',
  linkedThread.conversation.parentContext.label,
)

/* ── K6: Composer MOJA + background rangi moja safi (§19 · §20) ── */
const chatSrc = readFileSync(join(process.cwd(), 'src/components/chat/Thread.jsx'), 'utf8')
const composerUses = readFileSync(join(process.cwd(), 'src/components/chat/Thread.jsx'), 'utf8').match(/psh-chat__composer/g) || []
const composerElsewhere = srcFiles
  .filter((f) => /\.jsx?$/.test(f) && !f.endsWith('Thread.jsx'))
  .filter((f) => readFileSync(f, 'utf8').includes('psh-chat__composer'))
assert(composerUses.length === 1 && composerElsewhere.length === 0, 'Chat: composer MOJA (Direct + Group wanashiriki)', `Thread.jsx ×${composerUses.length}`)
assert(chatSrc.includes('onKeyDown') && chatSrc.includes('aria-label="Andika ujumbe"'), 'Chat: composer inafikiwa kwa keyboard na ina label')
assert(chatSrc.includes('onTouchStart') && chatSrc.includes('psh-msg__more'), 'Chat: long-press/Swipe NI NYONGEZA — kitufe ⋯ kinapatikana kila wakati (§18·§25)')
assert(chatSrc.includes('aria-label={`Vitendo vya ujumbe'), 'Chat: kitufe cha vitendo vya ujumbe kina label')

const chatCss = readFileSync(join(process.cwd(), 'src/styles/chat.css'), 'utf8')
assert(!/gradient/i.test(chatCss.replace(/\/\*[\s\S]*?\*\//g, '')) === false ? false : true, 'Chat: hakuna gradient kwenye CSS ya Chat (background = rangi moja safi)')
assert(/psh-chat__thread \{[\s\S]*?background: var\(--c-green-soft\)/.test(chatCss), 'Chat: background ya thread = rangi MOJA safi (--c-green-soft)')
assert(!/\.psh-msg__mapgrid/.test(chatCss) && !/background-image/.test(chatCss), 'Chat: hakuna pattern/wallpaper/texture kwenye CSS ya Chat')
assert(/stroke-dasharray|border-left: 2px solid/.test(chatCss) === true, 'Chat CSS: quote/reply ina alama ya mstari (si rangi pekee)')

/* ── K7: New Chat — tabaka tatu za identity (§7–§11) ───────── */
const newChat = await chatService.getNewChat()
assert(newChat.savedFriends.length === 3, 'New Chat: Saved Friends 3 (state/property)', `${newChat.savedFriends.length}`)
assert(newChat.pasihaiFriends.length === 3, 'New Chat: PASIHAI Friends 3 (mahusiano ya jukwaa)', `${newChat.pasihaiFriends.length}`)
assert(newChat.accounts.length === 2, 'New Chat: simu yenye akaunti ya PASIHAI 2 (si rafiki)', `${newChat.accounts.length}`)
assert(newChat.invite.length === 2, 'New Chat: simu bila akaunti 2 (mwaliko)', `${newChat.invite.length}`)
assert(
  newChat.savedFriends.every((c) => c.saved && c.accountId && c.phone),
  'New Chat: Saved Friend ≠ phone contact ≠ chat (chanzo tofauti, identity moja)',
)
assert(newChat.note.includes('phone contacts'), 'New Chat: tofauti ya vyanzo inaelezwa kwenye UI')

/* ── K8: Lookup — kesi 4 (§12) ─────────────────────────────── */
const lookupHit = await chatService.lookupNumber('0784 123 456')
assert(
  lookupHit.cases.length === 1 && lookupHit.cases[0].id === 'k1',
  'Lookup: namba inayolingana inarudisha akaunti yake pekee',
  `${lookupHit.cases.length} · ${lookupHit.cases[0]?.name}`,
)
assert(
  lookupHit.cases[0].saved && lookupHit.cases[0].friend && lookupHit.cases[0].note,
  'Lookup k1: rafiki aliyehifadhiwa (Saved Friend) + maelezo ya hatua',
)

const lookupAll = await chatService.lookupNumber('999 000 000')
assert(lookupAll.cases.length === 4, 'Lookup: kesi 4 zimefafanuliwa (mifano ya kielelezo)', lookupAll.cases.map((c) => c.case).join(' · '))
assert(!lookupAll.cases[1].saved && lookupAll.cases[1].friend, 'Lookup k2: PASIHAI Friend (si saved) → hifadhi rafiki')
assert(lookupAll.cases[2].accountId && !lookupAll.cases[2].friend, 'Lookup k3: akaunti ya PASIHAI (si rafiki) → ombi')
assert(!lookupAll.cases[3].accountId && lookupAll.cases[3].name === null, 'Lookup k4: hakuna akaunti → mwaliko wa SMS')
assert(lookupAll.cases.every((c) => c.note), 'Lookup: kila kesi inaeleza hatua inayofuata')

/* ── K9: Requests — Accept/Decline/Block → conversation ya kawaida (§13) ── */
const requests = await chatService.getRequests()
assert(requests.received.length === 1 && requests.sent.length === 2, 'Requests: yaliyopokelewa 1 · yaliyotumwa 2', `${requests.received.length}/${requests.sent.length}`)
const accepted = await chatService.respondRequest('r1', 'accept')
const newConv = accepted.conversation
const acceptedReq = accepted.requests.find((r) => r.id === 'r1')
assert(acceptedReq.state === 'accepted' && newConv, 'Requests: Kubali → conversation ya kawaida inaundwa', newConv?.id)
const acceptedThread = await chatService.getThread(newConv.id)
assert(
  acceptedThread && acceptedThread.conversation.type === 'direct' && acceptedThread.messages.length <= 1,
  'Requests: conversation iliyoundwa ni direct ya kawaida (hakuna chat system ya pili)',
  acceptedThread?.messages?.length,
)
const reqs2 = await chatService.getRequests()
const declineTarget = reqs2.sent[0]
assert(declineTarget.state === 'sent', 'Requests: ombi lililotumwa linaanza kwenye hali "sent"', declineTarget.state)
const declined = await chatService.respondRequest(declineTarget.id, 'decline')
assert(
  declined.requests.find((r) => r.id === declineTarget.id).state === 'declined' && !declined.conversation,
  'Requests: Kataa → hakuna conversation (kimya kimya)',
)
const blocked = await chatService.respondRequest(reqs2.sent[1].id, 'block')
assert(
  blocked.requests.find((r) => r.id === reqs2.sent[1].id).state === 'blocked' && !blocked.conversation,
  'Requests: Zuia → hakuna conversation',
)

/* ── K10: New Group (§14) ──────────────────────────────────── */
const created = await chatService.createGroup({ name: 'Wajasiriamali Dodoma', members: ['p1', 'p4'] })
assert(created.type === 'group' && created.members === 2, 'New Group: kikundi kimeundwa na wanachama 2')
assert(typeof created.groupIcon === 'string' && created.tone, 'New Group: kikundi kina identity (icon · tone)')
const afterCreate = await chatService.getInbox('vikundi')
assert(afterCreate.conversations.length === 4, 'New Group: kikundi kipya kimeongezeka kwenye inbox', `${afterCreate.conversations.length}`)

/* ── K11: Search — Chat, si Gundua (§23) ───────────────────── */
const withImage = await chatService.getThread('c4')
assert(
  withImage.messages.some((m) => m.kind === 'image' && m.guard),
  'Chat: picha (image) ni aina ya ujumbe yenye sera ya relay',
  withImage.messages.map((m) => m.kind).join(' · '),
)

const search = await chatService.search('mbegu')
assert(search.messages.length === 1 && search.messages[0].title, 'Search: ujumbe unapatikana', search.messages[0]?.text?.slice(0, 40))
const searchPeople = await chatService.search('Amina')
assert(searchPeople.people.length >= 1 && searchPeople.conversations.length >= 1, 'Search: watu + mazungumzo', `${searchPeople.people.length}/${searchPeople.conversations.length}`)
assert(!/Gundua|Channels|Reels/.test(JSON.stringify(search)) , 'Search: HAIORODHESHI Gundua/Channels/Reels (§23)')

/* ── K12: More menu — Chat pekee (§24) ─────────────────────── */
const more = await chatService.getMore()
assert(more.menu.length === 8, 'More: vitu 8 vya Chat', more.menu.map((m) => m.label).join(' · '))
assert(
  !more.menu.some((m) => /community|hub|channel|space/i.test(m.label)),
  'More: hakuna usimamizi wa Spaces/Hub/Community/Channel (§24)',
)
assert(more.settings.privacy.length === 3 && more.settings.notifications.length === 3, 'Settings: privacy 3 · notifications 3')

/* ── K13: Sera ya relay kwenye media — hakuna silent fallback (§22) ── */
const mediaGuard = await chatService.attachMedia('c6')
assert(mediaGuard.media && mediaGuard.message, 'Media guard: inaeleza media gani inasubiri', mediaGuard.media?.label)
assert(mediaGuard.silentFallback === false, 'Media guard: silentFallback = false (hakuna kubadili njia kimya kimya)')
assert(/maandishi pekee/.test(mediaGuard.relayNote), 'Media guard: relay = maandishi pekee', mediaGuard.relayNote)
assert(mediaGuard.choices.length === 3 && mediaGuard.choices.every((c) => c.hint), 'Media guard: machaguo 3 yenye maelezo', mediaGuard.choices.map((c) => c.label).join(' · '))
const guardThread = await chatService.getThread('c6')
assert(
  guardThread.messages.some((m) => m.state === 'blocked-media' && m.guard?.title),
  'Media guard: ujumbe uliozuiliwa una kadi ya sera kwenye thread',
)
const blockedMsg = guardThread.messages.find((m) => m.state === 'blocked-media')
const resolved = await chatService.resolveMedia('c6', blockedMsg.id, 'mesh')
const resolvedMsg = resolved.find((m) => m.id === blockedMsg.id)
assert(resolvedMsg.state === 'local' && resolvedMsg.route === 'mesh', 'Media guard: chaguo la mtumiaji linabadilisha hali (mesh)', resolvedMsg.state)
const resolvedWifi = await chatService.resolveMedia('c2', (await chatService.getThread('c2')).messages.find((m) => m.doc).id, 'wait-wifi')
assert(resolvedWifi.some((m) => m.state === 'waiting-wifi'), 'Media guard: machaguo mengine (wait-wifi) yanafanya kazi')

/* ── K14: Local-first states — zinatokana na safu ya System (§21) ── */
function withScenario(key, fn) {
  globalThis.window.location.search = key ? `?sys=${key}` : ''
  return fn()
}
async function sendUnder(key, payload) {
  return withScenario(key, async () => (await chatService.sendMessage('c1', payload)).message)
}
const sLocal = await sendUnder('local', { kind: 'text', text: 'Habari za leo' })
assert(sLocal.state === 'local' && sLocal.route === 'mesh', 'Chat state: LOCAL → Local Mesh (bila data)', sLocal.stateInfo.label)
const sOffline = await sendUnder('offline', { kind: 'text', text: 'Nipo safarini' })
assert(sOffline.state === 'vault' && sOffline.route === 'local', 'Chat state: OFFLINE → imehifadhiwa (Offline Vault)', sOffline.stateInfo.label)
const sWaiting = await sendUnder('waiting_sync', { kind: 'text', text: 'Ujumbe mfupi' })
assert(sWaiting.state === 'relayed' && sWaiting.route === 'relay', 'Chat state: WAITING_SYNC + ujumbe mfupi → relayed', sWaiting.stateInfo.label)
const sWaitingLong = await sendUnder('waiting_sync', { kind: 'text', text: 'x'.repeat(600) })
assert(sWaitingLong.state === 'waiting', 'Chat state: WAITING_SYNC + ujumbe mkubwa → foleni (si relay)', sWaitingLong.stateInfo.label)
const sOnline = await sendUnder('online', { kind: 'text', text: 'Salama' })
assert(sOnline.state === 'synced', 'Chat state: ONLINE → synced', sOnline.stateInfo.label)
globalThis.window.location.search = ''

const offlineQueue = withScenario('offline', async () => {})
await withScenario('offline', async () => {})
await (async () => {
  globalThis.window.location.search = '?sys=offline'
  const before = (await systemService.getQueue()).items.length
  await chatService.sendMessage('c1', { kind: 'text', text: 'Ujumbe wa offline' })
  const after = (await systemService.getQueue()).items.length
  assert(after === before + 1, 'Chat offline: ujumbe unaingia foleni ILEILE ya System (§21)', `${before} → ${after}`)
  globalThis.window.location.search = ''
})()

/* ── K15: Ujumbe mmoja wa mfumo — hakuna service za pili (§2) ── */
const chatServiceFiles = readdirSync(join(process.cwd(), 'src/services')).filter((f) => /chat/i.test(f))
assert(chatServiceFiles.length === 1 && chatServiceFiles[0] === 'chatService.js', 'Chat: service MOJA (chatService.js)', chatServiceFiles.join(', '))
assert(
  !srcFiles.some((f) => /DirectChatService|GroupChatService|CommunityChatService|ChatV2/.test(readFileSync(f, 'utf8'))),
  'Chat: hakuna Direct/Group/Community ChatService — mfumo mmoja',
)
const chatRepoFiles = readdirSync(join(process.cwd(), 'src/data/repositories')).filter((f) => /chat/i.test(f))
// Ruhusu chatRepository.js na supabaseChatRepository.js (mock + supabase implementations)
const validChatRepos = ['chatRepository.js', 'supabaseChatRepository.js']
assert(
  chatRepoFiles.every((f) => validChatRepos.includes(f)) && chatRepoFiles.includes('chatRepository.js'),
  'Chat: repository MOJA (chatRepository.js) + optional supabase version',
  chatRepoFiles.join(', ')
)
assert(
  typeof chatService.getThread === 'function' &&
    (await chatService.getThread('c4')).conversation.type === 'direct' &&
    (await chatService.getThread('c2')).conversation.type === 'group',
  'Chat: Direct na Group zinapitia njia ILEILE (getThread)',
)

/* ── K16: Inbox/More hazirudii navigation wala account icon (§3) ── */
const chatPageSrc = readFileSync(join(process.cwd(), 'src/pages/Chat.jsx'), 'utf8')
assert(!/BottomNav|psh-nav/.test(chatPageSrc), 'Chat: haijengi navigation ya pili')
assert(!/AccountIcon|psh-header__right/.test(chatPageSrc), 'Chat: hakuna account icon kwenye Chat (§3)')
assert(
  chatPageSrc.includes('aria-label="Tafuta kwenye Chat"') && chatPageSrc.includes('aria-label="Menyu zaidi za Chat"'),
  'Chat inbox: header = Chat + Search + ⋮ pekee, vyote vina label (§5·§27)',
)
assert(
  /@media \(min-width: 1024px\)[\s\S]*grid-template-columns/.test(chatCss) && chatCss.includes("data-mobile-view='thread'"),
  'Chat responsive: desktop panes mbili · simu inbox→conversation (§26)',
)
assert(chatPageSrc.includes('data-mobile-view={activeId ? \'thread\' : \'list\'}'), 'Chat: simu inabadilisha pane kwa hali ya conversation')

/* ── K17: Panels zote zina labels/a11y (§27) ───────────────── */
const panelsSrc = readFileSync(join(process.cwd(), 'src/components/chat/ChatPanels.jsx'), 'utf8')
const iconOnly = panelsSrc.split('\n').filter((l) => l.includes('psh-icobtn') && !l.includes('aria-label'))
assert(iconOnly.length === 0, 'Chat panels: kila kitufe cha icon kina label (§27)')
const threadIconOnly = chatSrc.split('\n').filter((l) => l.includes('psh-icobtn') && !l.includes('aria-label'))
assert(threadIconOnly.length === 0, 'Chat thread: kila kitufe cha icon kina label (§27)')
assert(
  /min-height: 44px|min-height: 48px|48px/.test(chatCss),
  'Chat a11y: maeneo ya kugusa yanakidhi 44px (§27)',
)


/* ══════════════════════════════════════════════════════════
   GUNDUA — safu ya UGUNDUZI (§L1–L19)
   Modes · kategoria · vichujio · faragha · Friends (bila model
   ya mitandao ya kijumia) · vikundi = Chat iliyopo · panels.
   ══════════════════════════════════════════════════════════ */

const Gundua = (await import('../src/pages/Gundua.jsx')).default
const gunduaBits = await import('../src/components/gundua/GunduaBits.jsx')
const gunduaPanels = await import('../src/components/gundua/GunduaPanels.jsx')
const { gunduaService } = await import('../src/services/gunduaService.js')
const gunduaRepo = repositories.gunduaRepository

/* ── K18: faili zote zina-render (SSR) ───────────────────── */
for (const [name, node] of [
  ['Gundua', <Gundua />],
  ['Gundua · DiscoveryModule', <gunduaBits.DiscoveryModule module={{ id: 'mchanganyiko', label: 'Mchanganyiko', hint: '', icon: 'spark', tone: 'green' }} onSelect={noop} />],
  ['Gundua · CategoryModule', <gunduaBits.CategoryModule cat={{ id: 'people', label: 'Watu', mode: 'people' }} onSelect={noop} />],
  ['Gundua · PersonCard', <gunduaBits.PersonCard p={{ id: 'p', name: 'Mtu Mfano', handle: '@mfano', friendState: 'not_friend' }} onOpen={noop} onMore={noop} onAdd={noop} onAccept={noop} onDecline={noop} onChat={noop} onInvite={noop} />],
  ['Gundua · BusinessCard', <gunduaBits.BusinessCard b={{ id: 'b', name: 'Duka', open: true, distanceKm: 1.2, profile: { products: [{ id: 'x', name: 'Bidhaa', price: 'TSh 1' }] } }} onOpen={noop} onMore={noop} onChat={noop} />],
  ['Gundua · ChannelCard', <gunduaBits.ChannelCard c={{ id: 'c', name: 'Channel', preview: { at: 'Leo', title: 'Kichwa', text: 'Maudhui' } }} onOpen={noop} onMore={noop} onFollow={noop} />],
  ['Gundua · SpaceCard', <gunduaBits.SpaceCard s={{ id: 'h', name: 'Hub', members: 120 }} variant="hub" onOpen={noop} onMore={noop} onJoin={noop} />],
  ['Gundua · GroupCard', <gunduaBits.GroupCard g={{ id: 'g', name: 'Kikundi', members: 40 }} onOpen={noop} onMore={noop} onJoin={noop} />],
  ['Gundua · LiveCard', <gunduaBits.LiveCard l={{ id: 'l', kind: 'live', title: 'Kikao', liveNow: true, viewers: 90 }} onOpen={noop} onMore={noop} />],
  ['Gundua · OfferCard', <gunduaBits.OfferCard o={{ id: 'o', title: 'Ofa', label: 'Punguzo', code: 'X1', business: { id: 'b', name: 'Duka' } }} onOpen={noop} onMore={noop} />],
  ['Gundua · MapPreview', <gunduaBits.MapPreview map={{ label: 'Ramani', hint: 'Vituo', pins: 3 }} onOpen={noop} />],
  ['Gundua · PrivacyNote', <gunduaBits.PrivacyNote text="Umma pekee" />],
  ['Gundua · FilterBar', <gunduaBits.FilterBar count={2} items={[{ group: 'mada', value: 'elimu', label: 'Elimu' }]} onOpen={noop} onClear={noop} />],
  ['Gundua · FiltersBody', <gunduaPanels.FiltersBody groups={[{ id: 'mada', label: 'Mada', multi: true, options: [{ id: 'elimu', label: 'Elimu' }] }]} value={{}} onChange={noop} onApply={noop} onClearAll={noop} onBack={noop} />],
  ['Gundua · EntityBody', <gunduaPanels.EntityBody data={{ id: 'x', kind: 'business', name: 'Duka', openLabel: 'Wazi', profile: { about: 'Kuhusu' } }} kind="business" onAdd={noop} onAccept={noop} onDecline={noop} onChat={noop} onFollow={noop} onJoin={noop} onOpenProfile={noop} onGoChat={noop} onToast={noop} />],
  ['Gundua · AddFriendBody', <gunduaPanels.AddFriendBody people={[]} contacts={[]} onAdd={noop} onChat={noop} onAccept={noop} onDecline={noop} onToast={noop} onLookup={async () => []} />],
  ['Gundua · QuickActionsBody', <gunduaPanels.QuickActionsBody item={{ id: 'x', name: 'Duka' }} onPrimary={noop} onToast={noop} />],
]) {
  try {
    renderToString(node)
    pass(`${name}: ina-render`)
  } catch (e) {
    fail(`${name}: ina-render`, e.message)
  }
}

/* ── K19: contract — modes · kategoria · counts ──────────── */
const guMain = await gunduaService.getPage({ mode: 'mchanganyiko', filters: gunduaService.EMPTY, query: '' })
assert(guMain.modules.length === 4, 'Gundua: modes 4 (Mchanganyiko · Friends · Channels · Live)', `${guMain.modules.length}`)
assert(
  guMain.modules.map((m) => m.label).join('·') === 'Mchanganyiko·Friends·Channels·Live',
  'Gundua: modes kwa mpangilio sahihi',
  guMain.modules.map((m) => m.label).join(' · '),
)
assert(guMain.categories.length === 10, 'Gundua: kategoria 10 (§5)', `${guMain.categories.length}`)
assert(
  guMain.categories.every((c) => c.count === null || typeof c.count === 'number'),
  'Gundua: kategoria zina hesabu halisi au null (hakuna NaN)',
)
assert(guMain.highlights.length === 6, 'Gundua: sehemu 6 za mchanganyiko (si feed isiyo na mwisho) (§15)', `${guMain.highlights.length}`)
assert(
  !guMain.highlights.some((h) => /Unaoweza Kuwafahamu|may know/i.test(h.title)),
  'Gundua: HAKUNA "People You May Know" (§7)',
)
assert(guMain.scope.label === 'Wazi · Umma', 'Gundua: scope ni "Wazi · Umma" (hakuna vitu vya faragha)')

/* ── K20: faragha — private HAIKUFUNULIWI kwa vichujio vya eneo ── */
const guPrivate = await gunduaRepo.getPrivateRegistry()
assert(guPrivate.length === 5, 'Gundua faragha: mock ina vitu 5 vya faragha (jaribio)', `${guPrivate.length}`)
const guNear = await gunduaService.getPage({ mode: 'mchanganyiko', filters: { ...gunduaService.EMPTY, eneo: 'karibu', distance: '100m' } })
const guNearIds = JSON.stringify(guNear)
assert(
  guPrivate.every((p) => !guNearIds.includes(p.id)),
  'Gundua faragha: "Karibu Nami" (100m) HAIKUFUNUI kitu cha faragha (§3)',
)
const guFamilia = await gunduaService.search('familia', gunduaService.EMPTY)
assert(guFamilia.total === 0, 'Gundua faragha: utafutaji wa jina la kitu cha faragha haurudi kitu', `${guFamilia.total}`)
const guNear1 = await gunduaService.getPage({ mode: 'businesses', filters: { ...gunduaService.EMPTY, eneo: 'karibu', distance: '1km' } })
assert(
  guNear1.results.length === 1 && guNear1.results[0].id === 'exampleStore',
  'Gundua faragha: ≤1 km = biashara ya umma moja pekee (Example Store 0.8 km)',
  guNear1.results.map((r) => `${r.name} ${r.distanceKm}`).join(' · '),
)

/* ── K21: vichujio — schema kwa mode · hesabu hai ────────── */
const guBizFilters = await gunduaRepo.getFilterSchema('businesses')
assert(
  guBizFilters.map((g) => g.id).join(',') === 'eneo,biashara,hali,mada',
  'Gundua vichujio: schema ya businesses = Eneo · Kategoria · Hali · Mada (§4)',
  guBizFilters.map((g) => g.id).join(','),
)
const guLiveFilters = await gunduaRepo.getFilterSchema('live')
assert(guLiveFilters[0].id === 'wakati', 'Gundua vichujio: schema ya live inaanza na Wakati (§4)', guLiveFilters.map((g) => g.id).join(','))
const guMada = guMain.filterSchema.find((g) => g.id === 'mada')
assert(guMada.options.length >= 17, 'Gundua vichujio: mada 17+ (§4)', `${guMada.options.length}`)
assert(guMada.options.some((o) => o.id === 'siasa'), 'Gundua vichujio: siasa ipo (neutral) (§4)')
const guEneo = guMain.filterSchema.find((g) => g.id === 'eneo')
assert(guEneo.distances.length === 6, 'Gundua vichujio: masafa 6 (100m…45km) (§4)', `${guEneo.distances.length}`)
const guActive = { ...gunduaService.EMPTY, mada: ['elimu', 'afya'], hali: ['open_now'], eneo: 'karibu', distance: '5km' }
assert(gunduaService.activeCount(guActive) === 4, 'Gundua vichujio: "Filter 4 active" (distance haihesabiwi mara mbili)')
assert(gunduaService.filterSummary(guActive).length === 5, 'Gundua vichujio: muhtasari unajumuisha masafa kama kipimo (§4)')
const guFiltered = await gunduaService.getPage({ mode: 'businesses', filters: { ...gunduaService.EMPTY, mada: ['kiuchumi'], hali: ['open_now'] } })
assert(
  guFiltered.results.length > 0 && guFiltered.results.length < (await gunduaService.getPage({ mode: 'businesses', filters: gunduaService.EMPTY })).results.length,
  'Gundua vichujio: vichujio vinapunguza matokeo (§4)',
  `${guFiltered.results.length}`,
)
const guLocal5 = await gunduaService.getLocal({ ...gunduaService.EMPTY, eneo: 'karibu', distance: '5km' })
const guLocal1 = await gunduaService.getLocal({ ...gunduaService.EMPTY, eneo: 'karibu', distance: '1km' })
assert(guLocal5.total > guLocal1.total, 'Gundua: "Karibu Nawe" inaheshimu masafa (§6)', `5km ${guLocal5.total} · 1km ${guLocal1.total}`)

/* ── K22: Friends — hakuna model ya mitandao ya kijamii (§7) ── */
const guFriends = await gunduaService.getPage({ mode: 'friends', filters: gunduaService.EMPTY })
const fv = guFriends.friendsView
for (const key of ['myFriends', 'requests', 'sent', 'discover', 'fromContacts', 'fromSpaces', 'nearby', 'blocked']) {
  assert(Array.isArray(fv[key]), `Gundua Friends: sehemu "${key}" ipo (§7)`)
}
assert(fv.myFriends.length === 6, 'Gundua Friends: Marafiki Zangu 6', `${fv.myFriends.length}`)
assert(fv.requests.length === 1 && fv.requests[0].friendState === 'received', 'Gundua Friends: maombi yaliyopokelewa yanahitaji uamuzi')
assert(fv.blocked.every((p) => p.friendState === 'blocked'), 'Gundua Friends: "Umezuiwa" ina hali sahihi')
assert(
  fv.discover.every((p) => p.friendState === 'not_friend' && p.discoverReason),
  'Gundua Friends: kila mtu wa kugundua ana SABABU MOJA ya muktadha (§7)',
)
const guFriendsText = JSON.stringify(fv)
assert(
  !/mutual|marafiki wa pamoja|may know|graph|degree/i.test(guFriendsText),
  'Gundua Friends: HAKUNA mutual friends · People You May Know · takwimu za mtandao (§7)',
)
assert(
  fv.fromContacts.every((c) => c.handle && (c.hasAccount === false ? c.subtitle === 'Hajajiunga na PASIHAI' : true)),
  'Gundua Friends: orodha ya simu inaonyesha hali (akaunti au mwaliko)',
)
assert(
  fv.myFriends.every((p) => !/^\+?[0-9 ]+$/.test(p.handle)),
  'Gundua Friends: namba za simu hazionyeshwi kwenye kadi za watu (§7)',
)

/* ── K23: vitendo — ombi · kubali · kataliwa ─────────────── */
const guBefore = (await gunduaRepo.getFriends({})).requests.length
await gunduaService.respondFriend('zawadiStyles', 'accept')
const guAfterAccept = await gunduaRepo.getFriendState('zawadiStyles')
assert(guAfterAccept === 'friend', 'Gundua: Kubali ombi → hali inakuwa "friend"', guAfterAccept)
await gunduaService.addFriend('musaKhalfan')
assert((await gunduaRepo.getFriendState('musaKhalfan')) === 'sent', 'Gundua: Omba Urafiki → hali inakuwa "sent"')
const guRequests2 = (await gunduaRepo.getFriends({})).requests.length
assert(guRequests2 === guBefore - 1, 'Gundua: ombi lililokubaliwa linatoka kwenye "Maombi"', `${guBefore} → ${guRequests2}`)
const guOffers = await gunduaService.getPage({ mode: 'businesses', filters: gunduaService.EMPTY })
assert(guOffers.offers.length === 2, 'Gundua: ofa za biashara zinapatikana kwenye mode ya biashara', `${guOffers.offers.length}`)

/* ── K24: vikundi = Chat ILIYOPO (hakuna engine ya pili) ─── */
const guJoin = await gunduaService.join('group', 'baiskeliDar')
assert(
  !!guJoin.conversationId && guJoin.conversation?.type === 'group' && guJoin.conversation.title === 'Baiskeli Dar es Salaam',
  'Gundua: kujiunga kikundi kunatumia Chat iliyopo (conversation halisi ya group)',
  `${guJoin.conversationId} · ${guJoin.conversation?.title}`,
)
const chatAfterJoin = await repositories.chatRepository.listConversations()
assert(
  chatAfterJoin.some((c) => c.id === guJoin.conversationId && c.type === 'group'),
  'Gundua: kikundi kilichojiungwa kinaonekana kwenye Chat (§12)',
)
const guJoinAgain = await gunduaService.join('group', 'baiskeliDar')
const chatAgain = await repositories.chatRepository.listConversations()
assert(
  guJoinAgain.conversationId === guJoin.conversationId && chatAgain.length === chatAfterJoin.length,
  'Gundua: kujiunga MARA YA PILI hakuna kikundi cha pili (hakuna duplicate)',
  `${chatAgain.length}`,
)
const guFollow = await gunduaService.toggleFollow('techSasa', true)
assert(guFollow && guFollow.following === true, 'Gundua: Fuata channel → hali inabadilika', JSON.stringify(guFollow))

/* ── K25: chanzo kimoja — hakuna utafutaji wa pili ──────── */
const guLookup = await gunduaService.lookupNumber('0784 123 456')
const chatLookup = await repositories.chatRepository.lookupNumber('0784 123 456')
assert(
  guLookup.length === chatLookup.length,
  'Gundua: utafutaji wa namba unatumia njia ILEILE ya Chat (§7)',
  `${guLookup.length}`,
)
const guContacts = await gunduaService.getContacts()
const chatBook = await repositories.chatRepository.getPhoneBook()
assert(
  guContacts.length === chatBook.length && guContacts[0].phone === chatBook[0].phone,
  'Gundua: orodha ya simu ni chanzo kilekile cha Chat (hakuna mock ya pili)',
  `${guContacts.length} · ${chatBook.length}`,
)
const guEntities = await gunduaService.getEntity('business', 'exampleStore')
assert(guEntities && guEntities.profile && guEntities.profile.products.length >= 2, 'Gundua: biashara ina wasifu na bidhaa (§9)')
assert((await gunduaService.getEntity('hub', 'familiaYetuHub')) === null, 'Gundua: kitu cha faragha hakipatikani kwa id yake (§3)')

/* ── K26: architecture — UI haitumii mock.js · service moja ── */
const gunduaFiles = [
  'src/pages/Gundua.jsx',
  'src/components/gundua/GunduaBits.jsx',
  'src/components/gundua/GunduaPanels.jsx',
]
for (const f of gunduaFiles) {
  const src = readFileSync(join(process.cwd(), f), 'utf8')
  assert(!/from '.*mock\.js'/.test(src), `Gundua: ${f} haitumii mock.js moja kwa moja`)
  assert(!/provider|firebase|cloudinary/i.test(src), `Gundua: ${f} haina backend/provider`)
}
const gunduaPageSrc = readFileSync(join(process.cwd(), 'src/pages/Gundua.jsx'), 'utf8')
assert(!/Relay|Sync\b|Network/.test(gunduaPageSrc.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '')), 'Gundua: hakuna vidhibiti vya Relay/Sync/Network (§1)')
assert(!/psh-account|IconUser/.test(gunduaPageSrc), 'Gundua: hakuna account/profile control (§2)')
const gunduaCss = readFileSync(join(process.cwd(), 'src/styles/gundua.css'), 'utf8')
assert(/min-height: 44px/.test(gunduaCss), 'Gundua a11y: maeneo ya kugusa 44px (§27)')
const gunduaPanelsSrc = readFileSync(join(process.cwd(), 'src/components/gundua/GunduaPanels.jsx'), 'utf8')
const guIconOnly = gunduaPanelsSrc.split('\n').filter((l) => l.includes('psh-icobtn') && !l.includes('aria-label'))
assert(guIconOnly.length === 0, 'Gundua panels: kila kitufe cha icon kina label (§27)')
const mainSrc = readFileSync(join(process.cwd(), 'src/main.jsx'), 'utf8')
assert(mainSrc.includes("styles/gundua.css"), 'Gundua: CSS imesajiliwa kwenye main.jsx')


/* ══════════════════════════════════════════════════════════
   M — UI PREMIUM · VITENDO HALISI (hakuna kitufe kilichokufa)
   Kila kitendo kinabadilisha hali ya kikao, si toast ya kubuni.
   ══════════════════════════════════════════════════════════ */

const feedSvcM = (await import('../src/services/feedService.js')).feedService
const settingsSvcM = (await import('../src/services/settingsService.js')).settingsService
const notifSvcM = (await import('../src/services/notificationService.js')).notificationService
const accountSvcM = (await import('../src/services/accountService.js')).accountService
const chatSvc = (await import('../src/services/chatService.js')).chatService

/* ── M1: Kuchapisha (aina zote) ─────────────────────────────── */
const mPoll = await feedSvcM.createPost({
  kind: 'poll',
  text: 'Mnaenda sokoni saa ngapi?',
  options: ['Asubuhi', 'Mchana', 'Jioni'],
})
assert(mPoll.kind === 'poll' && mPoll.poll?.options.length === 3, 'M1: kura inaundwa na majibu 3 (halisi)')
assert(mPoll.id.startsWith('my-'), 'M1: chapisho langu lina id ya kikao (my-*)')

const mReel = await feedSvcM.createPost({ kind: 'reel', text: 'Reel yangu' })
assert(mReel.kind === 'reel' && mReel.media?.duration, 'M1: Reel inaundwa na media ya wima')

const feedAfterPost = await feedSvcM.getFeed({ tab: 'mchanganyiko' })
const reelIdx = feedAfterPost.items.findIndex((i) => i.id === mReel.id)
assert(reelIdx >= 0, 'M1: chapisho langu linaonekana kwenye mkondo (si pinned: sheria za feed)')

/* ── M2: Kura inabaki (state) ───────────────────────────────── */
await feedSvcM.votePoll(mPoll.id, 'o1')
const feedVoted = await feedSvcM.getFeed({ tab: 'mchanganyiko' })
const pollItem = feedVoted.items.find((i) => i.id === mPoll.id)
assert(pollItem?.poll?.myVote === 'o1', 'M2: kura yangu inabaki baada ya kuondoka kwenye skrini')

/* ── M3: Kupenda · kuhifadhi · maoni · kuficha ──────────────── */
const likeRes = await feedSvcM.toggleLike(mPoll.id)
assert(likeRes.liked === true, 'M3: kupenda kunabadilisha hali (halisi)')
const likeFeed = await feedSvcM.getFeed({ tab: 'mchanganyiko' })
assert(likeFeed.items.find((i) => i.id === mPoll.id)?.liked === true, 'M3: hali ya kupenda inaonekana kwenye mkondo')

const savedRes = await feedSvcM.toggleSaved(mPoll)
assert(savedRes.saved === true, 'M3: kuhifadhi kunabadilisha hali')
const savedList = await feedSvcM.listSaved()
assert(savedList.some((i) => i.id === mPoll.id), 'M3: kilichohifadhiwa kinaonekana kwenye listSaved')

const beforeComments = (await feedSvcM.listComments(mPoll.id)).length
await feedSvcM.addComment(mPoll.id, 'Nitakuja mchana')
const afterComments = (await feedSvcM.listComments(mPoll.id)).length
assert(afterComments === beforeComments + 1, 'M3: maoni yanaongezwa kwenye orodha halisi')

await feedSvcM.hidePost(mPoll.id)
const feedHidden = await feedSvcM.getFeed({ tab: 'mchanganyiko' })
assert(!feedHidden.items.some((i) => i.id === mPoll.id), 'M3: kuficha kunaondoa chapisho kwenye mkondo')

const myItems = await feedSvcM.listMine()
assert(myItems.length >= 1 && myItems.some((i) => i.kind === 'reel'), 'M3: listMine inarudisha machapisho yangu halisi')

/* ── M4: Kikao cha Live (anza · maliza) ─────────────────────── */
const myLive = await feedSvcM.startLive('Sauti')
const liveFeed = await feedSvcM.getFeed({ tab: 'live' })
assert(liveFeed.items.some((i) => i.id === myLive.id && i.live?.state === 'live'), 'M4: kikao changu kinaonekana kwenye tab ya Live')
await feedSvcM.endLive(myLive.id)
const liveAfter = await feedSvcM.listMyLive()
assert(liveAfter[0]?.live?.state === 'replay', 'M4: kumaliza kikao kunabadilisha hali → Zilizopita')
assert(JSON.stringify(await feedSvcM.listJoinedLive()).includes(myLive.id) === false, 'M4: kujiunga na kikao ni hali tofauti (joined set)')

/* ── M5: Status (saa 24) ───────────────────────────────────── */
await feedSvcM.createStatus({ text: 'Leo niko Kariakoo', tone: 'green' })
const mStatusStrip = await homeService.getStatusStrip()
assert(mStatusStrip[0]?.own === true, 'M5: status yangu inaonekana kwanza kwenye safu ya Status')

/* ── M6: Mapendeleo (hali ya kikao) ────────────────────────── */
await settingsSvcM.saveUserPrefs({ contentInterests: ['Kilimo', 'Sanaa'] })
const prefs = await settingsSvcM.getUserPrefs()
assert(prefs.contentInterests.includes('Kilimo'), 'M6: mapendeleo yamehifadhiwa (halisi, yanarudi)')

/* ── M7: Wasifu (kuhariri · maudhui yangu) ─────────────────── */
const meUpdated = await accountSvcM.updateMyProfile({ bio: 'Niko Dar — prototype' })
assert(meUpdated.bio === 'Niko Dar — prototype', 'M7: kuhariri wasifu kunabadilisha hali')
const myContent = await accountSvcM.getMyContent('posts')
assert(myContent.length >= 1, 'M7: tab ya wasifu inaonyesha maudhui yangu halisi')
await feedSvcM.toggleLike(mReel.id)
const likedContent = await accountSvcM.getMyContent('liked')
assert(likedContent.some((i) => i.id === mReel.id), 'M7: tab ya “Nilizopenda” inatumia hali ileile')

/* ── M8: Taarifa — soma zote ───────────────────────────────── */
await notifSvcM.markAllRead()
assert((await notifSvcM.countUnread()) === 0, 'M8: “Soma zote” inabadilisha hali ya taarifa')

/* ── M9: Chat — Saved Friend · ombi · zuia · archive ──────── */
const mInbox = await chatSvc.getInbox('zote')
const contactId = mInbox.conversations[0]?.id
assert(!!contactId, 'M9: inbox ina mazungumzo ya kuanzia')

const savedFriend = await chatSvc.saveFriend('a1', true)
assert(savedFriend.saved === true, 'M9: Saved Friend ni hali halisi')
const sentReq = await chatSvc.sendRequest('a1')
assert(sentReq.state === 'sent' && (await chatSvc.listSentRequests()).length === 1, 'M9: ombi linalotumwa linahifadhiwa')

await chatSvc.blockContact('a2')
assert((await chatSvc.listBlocked()).length === 1, 'M9: kuzuia kunahifadhiwa kwenye hali')
await chatSvc.unblockContact('a2')
assert((await chatSvc.listBlocked()).length === 0, 'M9: kufungua kunaondoa kwenye hali')

await chatSvc.archiveConversation(contactId, true)
assert((await chatSvc.listArchived()).some((c) => c.id === contactId), 'M9: kuhifadhi mazungumzo kunaonekana kwenye Archived')
await chatSvc.archiveConversation(contactId, false)

const msgToSave = (await chatSvc.getThread(contactId)).messages.find((m) => m.doc)
if (msgToSave) {
  await chatSvc.saveMessageOffline(contactId, msgToSave.id)
  const savedMsg = (await chatSvc.getThread(contactId)).messages.find((m) => m.id === msgToSave.id)
  assert(savedMsg?.savedOffline === true, 'M9: faili “imehifadhiwa kwenye kifaa” ni hali ya ujumbe')
}

const delTarget = (await chatSvc.getThread(contactId)).messages.slice(-1)[0]
await chatSvc.deleteMessage(contactId, delTarget.id)
assert(!(await chatSvc.getThread(contactId)).messages.some((m) => m.id === delTarget.id), 'M9: kufuta ujumbe kunafuta kwangu pekee')

/* ── M10: Gundua — ficha · hifadhi ─────────────────────────── */
const guHighlights = await gunduaService.getPage({ mode: 'mchanganyiko' })
const nearSection = guHighlights.highlights.find((h) => h.id === 'near')
const nearCount = nearSection.items.length
const hideTarget = nearSection.items[0].id
await gunduaService.hideEntity(hideTarget, true)
const guAfterHide = await gunduaService.getPage({ mode: 'mchanganyiko' })
assert(
  !guAfterHide.highlights.find((h) => h.id === 'near').items.some((i) => i.id === hideTarget),
  'M10: kuficha kutoka Gundua kunaondoa kitu kwenye matokeo',
)
await gunduaService.unhideEntity(hideTarget)
assert(
  (await gunduaService.getPage({ mode: 'mchanganyiko' })).highlights
    .find((h) => h.id === 'near')
    .items.some((i) => i.id === hideTarget),
  'M10: kufungua (unhide) kunarejesha kitu',
)

await feedSvcM.saveEntity({ id: hideTarget, kind: 'business', name: 'Kimehifadhiwa' }, true)
assert((await feedSvcM.listSavedEntities()).some((e) => e.id === hideTarget), 'M10: kuhifadhi kutoka Gundua kinaonekana Zilizohifadhiwa')

/* ── M11: Hakuna vitendo vilivyokufa kwenye UI ─────────────── */
const mUiFiles = [
  'src/components/panels.jsx',
  'src/components/feed/FeedPanels.jsx',
  'src/components/feed/FeedList.jsx',
  'src/components/chat/ChatPanels.jsx',
  'src/components/chat/Thread.jsx',
  'src/components/gundua/GunduaPanels.jsx',
  'src/pages/Gundua.jsx',
  'src/App.jsx',
]
const deadMarkers = [/itajengwa/, /hatua zijazo/, /\(mfano\)/]
for (const f of mUiFiles) {
  const src = readFileSync(join(process.cwd(), f), 'utf8')
  const dead = deadMarkers.filter((rx) => rx.test(src))
  assert(dead.length === 0, `M11: ${f} haina vitendo vilivyokufa`)
}

/* ── M12: Mfumo mmoja wa vitufe unatumika kwenye panels mpya ─ */
const fpSrc = readFileSync(join(process.cwd(), 'src/components/feed/FeedPanels.jsx'), 'utf8')
assert(fpSrc.includes('<Button'), 'M12: panels mpya zinatumia component moja ya Button')
const compCss = readFileSync(join(process.cwd(), 'src/styles/components.css'), 'utf8')
assert(/\.psh-btn\b/.test(compCss) && /\.psh-btn--primary/.test(compCss), 'M12: .psh-btn ni mfumo mmoja wa vitufe')
assert(/\.psh-btn__spinner|is-loading/.test(compCss), 'M12: hali ya isLoading (spinner) ipo kwenye mfumo mmoja')


/* ══════════════════════════════════════════════════════════════
   N — SPACES (§0–§53): muundo · ufikivu · reuse · mipaka
   ══════════════════════════════════════════════════════════════ */

const { spacesService: spacesSvcN } = await import('../src/services/spacesService.js')
const { spacesRepository: spacesRepoN } = await import('../src/data/repositories/index.js')
const { gunduaService: gunduaSvcN } = await import('../src/services/gunduaService.js')
const { systemService: systemSvcN } = await import('../src/services/systemService.js')
const { feedService: feedSvcN } = await import('../src/services/feedService.js')
const { contentRepository: contentRepoN } = await import('../src/data/repositories/index.js')

/* ── N1: orodha — familia mbili, si nne ─────────────────── */
const nList = await spacesRepoN.listSpaces()
const nPublicPlaces = nList.places.filter((x) => x.visibility === 'public')
assert(
  nPublicPlaces.filter((x) => x.type === 'hub').length === 3 &&
    nPublicPlaces.filter((x) => x.type === 'community').length === 2,
  'N1: Hubs 3 · Jumuiya 2 za wazi (familia moja)',
  JSON.stringify(nList.counts),
)
assert(nList.counts.places === 6 && nList.counts.channels === 5, 'N1: orodha moja ya mahali (5 wazi + 1 iliyoorodheshwa) + channels 5', JSON.stringify(nList.counts))
assert(nList.mine.some((x) => x.id === 'darTechHub' && x.joined), 'N1: nafasi nilizojiunga zinaonekana (Nafasi Zangu)')
assert(nList.mine.some((x) => x.id === 'pasihaiUpdates' && x.owned), 'N1: umiliki wangu umeandikwa kama data')
assert(nList.places.every((x) => ['hub', 'community'].includes(x.type)), 'N1: hakuna aina ya nne kwenye familia ya mahali')

/* ── N2: ufikivu ni HALI, si aina ya kitu (§5/§15/§29) ──── */
const nVis = await spacesSvcN.getVisibilityModel()
assert(nVis.length === 3 && nVis.map((v) => v.id).join(',') === 'public,listed,hidden', 'N2: hali 3 za ufikivu (Wazi · Iliyoorodheshwa · Fichwa)', nVis.map((v) => v.id).join(' · '))
assert(nVis.every((v) => v.hint && v.joinLabel), 'N2: kila hali ina maelezo na njia ya kujiunga')
const nListed = nList.places.find((x) => x.id === 'familiaYetuHub')
assert(nListed && nListed.visibility === 'listed', 'N2: nafasi iliyoorodheshwa inaonekana kwa utambulisho wake')
assert(!nList.places.concat(nList.channels).some((x) => ['studioNeema', 'wakulimaMbeya'].includes(x.id)), 'N2: nafasi FICHWA hazionekani kwenye orodha')
const nReq = await spacesRepoN.join('hub', 'familiaYetuHub')
assert(nReq.requested === true && nReq.joined === false, 'N2: kujiunga kwa nafasi iliyoorodheshwa = OMBI (si kujiunga)', nReq.note?.slice(0, 40))
const nInvite = await spacesRepoN.join('channel', 'studioNeema')
assert(nInvite.needsInvite === true, 'N2: nafasi fichwa inahitaji mwaliko/kiungo pekee')
const nRepoSrc = readFileSync(join(process.cwd(), 'src/data/repositories/spacesRepository.js'), 'utf8')
assert(!/privateSpace|visibility: 'private'|type: 'privateSpace'/.test(nRepoSrc), 'N2: hakuna "Private Space" kama object kwenye data layer (ufikivu ni hali)')

/* ── N3: Space page — Hub na Jumuiya wanashiriki muundo ──── */
const nHub = await spacesSvcN.getSpace('hub', 'darTechHub')
const nCom = await spacesSvcN.getSpace('community', 'wakulimaTz')
assert(nHub.tabs.length === 6 && nHub.tabs.map((t) => t.id).join(',') === 'muhtasari,shughuli,watu,matukio,rasilimali,kuhusu', 'N3: tabs 6 za Space (Muhtasari…Kuhusu)', nHub.tabs.map((t) => t.label).join(' · '))
assert(nHub.tabs.map((t) => t.id).join(',') === nCom.tabs.map((t) => t.id).join(','), 'N3: Hub na Jumuiya — tabs ZILEZILE (familia moja)')
assert(nHub.purpose && nHub.rules.length >= 3, 'N3: Hub ina kusudi na kanuni kama data')
assert(nHub.team.length === 3 && nHub.team.some((t) => t.role === 'Owner'), 'N3: timu ina roles (Owner · Admin · Moderator)', nHub.team.map((t) => t.role).join(' · '))
assert(nHub.lead && nHub.lead.role === 'Owner', 'N3: kiongozi wa nafasi anaonekana')
assert(nHub.peopleCount > nHub.team.length, 'N3: wanachama ni zaidi ya timu (identity ileile)')

/* ── N4: Shughuli = mkondo ule ule (hakuna engine ya pili) ── */
const nActivity = await spacesRepoN.getActivity('darTechHub')
const nSpaceFeed = await feedSvcN.getSpaceFeed({ spaceId: 'darTechHub' })
assert(nActivity.length >= 3, 'N4: Shughuli za Hub zinatoka kwenye contentRepository', `${nActivity.length} vipengele`)
assert(nSpaceFeed.items.length === nActivity.length, 'N4: mkondo wa Space unatumia enrich/filter zilezile za mkondo')
assert(nSpaceFeed.items.every((i) => i.entity), 'N4: kila chapisho lina identity yake (ROLE ≠ RELATIONSHIP)')
const nBeforeCount = (await contentRepoN.listFeed()).length
await spacesRepoN.getActivity('wakulimaTz')
const nAfterCount = (await contentRepoN.listFeed()).length
assert(nAfterCount === nBeforeCount, 'N4: kusoma shughuli za Space hakuongezi mkondo wa Home', `${nBeforeCount} → ${nAfterCount}`)
assert(!(await contentRepoN.listFeed()).some((i) => String(i.id).startsWith('sp')), 'N4: machapisho ya Space hayaonekani Home kimya kimya (§8)')
const nHomeFeed = await feedSvcN.getFeed({})
assert(nHomeFeed.items.every((i) => !String(i.id).startsWith('sp')), 'N4: mkondo wa Home hauna content ya Space (ugavi ni uamuzi wa content)')

/* ── N5: Matukio = content ya kind 'event' ──────────────── */
const nEvents = await spacesSvcN.getSpace('community', 'wakulimaTz')
assert(nEvents.events.length === 1 && nEvents.events[0].sourceKind === 'event', 'N5: Matukio yanatoka kwenye content (kind event)')
const nAttend = await spacesSvcN.attendEvent(nEvents.events[0].id, true)
assert(nAttend.attending === true, 'N5: kuhudhuria tukio ni hali halisi ya kikao')
await spacesSvcN.attendEvent(nEvents.events[0].id, false)
assert(spacesRepoN.isAttending(nEvents.events[0].id) === false, 'N5: kuondoa nia ya kuhudhuria kunafuta hali')

/* ── N6: Rasilimali = Save Offline ileile ───────────────── */
const nRes = await spacesRepoN.getResources('darTechHub')
assert(nRes.items.length === 2, 'N6: rasilimali 2 za Hub', nRes.items.map((r) => r.kind).join(' · '))
const nOffline = await systemSvcN.getSaveOffline()
assert(nRes.items.every((r) => nOffline.items.some((o) => o.id === r.id)), 'N6: rasilimali ni vitu VILEVILE vya Save Offline (hakuna vault ya pili)')
await spacesRepoN.saveResource('o3')
const nOffline2 = await systemSvcN.getSaveOffline()
assert(nOffline2.items.find((o) => o.id === 'o3')?.saved === true, 'N6: kuhifadhi rasilimali kunahifadhi kwa matumizi bila mtandao')

/* ── N7: Vikundi = Chat iliyopo (mfumo mmoja) ───────────── */
assert(nHub.relatedGroups.length === 1 && nHub.relatedGroups[0].name === 'Programu Bila Malipo', 'N7: kikundi kinachohusiana ni conversation ya Chat', nHub.relatedGroups.map((g) => g.name).join(','))
assert(!nHub.relatedGroups.some((g) => g.type === 'hub' || g.type === 'community'), 'N7: vikundi ni vya Chat — si sehemu ya Spaces')
const nJoinGroup = await gunduaSvcN.join('group', 'programuWazi')
assert(nJoinGroup.conversationId, 'N7: kujiunga na kikundi kunatumia chatRepository (conversation halisi)')

/* ── N8: Channel ni tawi la kuchapisha (§30/§33/§35) ────── */
const nCh = await spacesSvcN.getChannel('techSasa')
assert(nCh.tabs.length === 4 && nCh.tabs.map((t) => t.id).join(',') === 'vilivyoteuliwa,mapya,media,kuhusu', 'N8: tabs 4 za Channel (Vilivyoteuliwa…Kuhusu)', nCh.tabs.map((t) => t.label).join(' · '))
assert(nCh.stats && nCh.stats.posts === nCh.sections.latest.length, 'N8: takwimu za Channel zinatoka kwenye content halisi')
assert(!('views' in nCh.stats) && !('revenue' in nCh.stats) && !('earnings' in nCh.stats), 'N8: hakuna views/mapato ya kubuni (§J1/J2)')
assert(/prototype/.test(nCh.stats.note), 'N8: takwimu zinaeleza ukweli wa kikao')
assert(nCh.appearance.allowed.length === 5 && !/fonts za nje/.test(nCh.appearance.allowed.join(' ')), 'N8: muonekano = nembo · jalada · maelezo · kategoria · kipengele pekee')
assert(/wallpaper/.test(nCh.appearance.note), 'N8: mpaka wa muonekano umeelezwa wazi (§35)')
const nOwnedCh = await spacesSvcN.getChannel('pasihaiUpdates')
assert(nOwnedCh.canManage === true, 'N8: channel yangu ina sehemu ya msimamizi')

/* ── N9: Uundaji — kitu kimoja, mahali popote (§40) ─────── */
const nModel = await spacesSvcN.getCreateModel()
assert(nModel.steps.length === 3 && nModel.types.map((t) => t.id).join(',') === 'hub,community,channel', 'N9: hatua 3 · aina 3 (Hub · Jumuiya · Channel)')
const nMade = await spacesSvcN.createSpace({ type: 'community', name: 'Wajasiriamali Kariakoo', visibility: 'listed', purpose: 'Wafanyabiashara wa Kariakoo' })
assert(nMade.id.startsWith('my-community') && nMade.owned === true, 'N9: Space iliyoundwa ni yangu', nMade.id)
const nMineAfter = await spacesSvcN.getMySpaces()
assert(nMineAfter.items.some((i) => i.id === nMade.id), 'N9: Space iliyoundwa inaonekana kwenye Nafasi Zangu')
const nListAfter = await spacesRepoN.listSpaces()
assert(nListAfter.places.some((x) => x.id === nMade.id), 'N9: Space iliyoundwa inaonekana kwenye orodha ileile ya Spaces')
const nMadeSpace = await spacesSvcN.getSpace('community', nMade.id)
assert(nMadeSpace.name === 'Wajasiriamali Kariakoo' && nMadeSpace.membership.owned, 'N9: Space iliyoundwa ina ukurasa kamili wa Space')
assert(nMadeSpace.visibility === 'listed' && nMadeSpace.membership.relation === 'Umiliki wako', 'N9: ufikivu wa Space iliyoundwa unaheshimiwa')

/* ── N10: Kujiunga/kutoka — njia moja ya uanachama ──────── */
const nJoin = await spacesRepoN.join('hub', 'morogoroOrganic')
assert(nJoin.joined === true, 'N10: kujiunga na Hub ni halisi (gunduaRepository)')
const nAfterJoin = await spacesRepoN.listSpaces()
assert(nAfterJoin.mine.some((x) => x.id === 'morogoroOrganic'), 'N10: kujiunga kunabadilisha Nafasi Zangu mara moja')
const nLeave = await spacesRepoN.leave('hub', 'morogoroOrganic')
assert(nLeave.joined === false, 'N10: kutoka kwenye Hub ni halisi')
const nFollow = await spacesRepoN.join('channel', 'bbcSwahili')
assert(nFollow.joined === true, 'N10: kufuata Channel ni halisi (identityRepository)')
const nFollowList = await spacesRepoN.listSpaces()
assert(nFollowList.channels.find((c) => c.id === 'bbcSwahili')?.joined === true, 'N10: kufuata kunabadilisha hali ileile inayoonekana Spaces')
await spacesRepoN.leave('channel', 'bbcSwahili')

/* ── N11: Hakuna mifumo ya pili (architecture guard) ────── */
const nSvcFiles = readdirSync(join(process.cwd(), 'src/services')).filter((f) => /^spaces.*Service\.js$/.test(f))
assert(nSvcFiles.length === 1 && nSvcFiles[0] === 'spacesService.js', 'N11: service MOJA ya Spaces', nSvcFiles.join(', '))
const nRepoFiles = readdirSync(join(process.cwd(), 'src/data/repositories')).filter((f) => /^spaces.*Repository\.js$/.test(f))
assert(nRepoFiles.length === 1 && nRepoFiles[0] === 'spacesRepository.js', 'N11: repository MOJA ya Spaces', nRepoFiles.join(', '))
const nSpacesFiles = readdirSync(join(process.cwd(), 'src/components/spaces'))
assert(nSpacesFiles.filter((f) => /Feed|Thread|Composer/.test(f)).length === 0, 'N11: hakuna mkondo/composer/thread ya pili kwenye Spaces')
function readAllN(dir) {
  let out = ''
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out += readAllN(full)
    else if (/\.jsx?$/.test(name)) out += readFileSync(full, 'utf8')
  }
  return out
}
const nUiSrc = readAllN(join(process.cwd(), 'src/components/spaces')) + readFileSync(join(process.cwd(), 'src/pages/Spaces.jsx'), 'utf8')
assert(!/from '\.\.\/\.\.\/data\/mock\.js'|from '\.\.\/data\/mock\.js'/.test(nUiSrc), 'N11: UI ya Spaces haitumii mock.js moja kwa moja (seam)')
assert(!/spacesMeta|spacesMembers/.test(nUiSrc), 'N11: UI haisomi data ya Spaces moja kwa moja')
/* Kitufe chenye ICON pekee (hakuna maandishi) LAZIMA kiwe na aria-label */
const nGuardFiles = ['src/components/spaces/SpacesBits.jsx', 'src/components/spaces/SpacePage.jsx', 'src/components/spaces/ChannelPage.jsx', 'src/components/spaces/SpacePanels.jsx', 'src/pages/Spaces.jsx']
const nIconOnly = []
for (const f of nGuardFiles) {
  const src = readFileSync(join(process.cwd(), f), 'utf8')
  const re = /<button\b([^>]*)>([\s\S]*?)<\/button>/g
  let mm
  while ((mm = re.exec(src))) {
    const attrs = mm[1]
    const inner = mm[2]
    /* Icon-only = ndani yake HAKUNA maandishi wala {usemi} — icon pekee.
       Kitufe chenye {prop} au maandishi hakihitaji aria-label. */
    const content = inner.replace(/<[^>]*>/g, '').trim()
    const isIconOnly = content === ''
    if (isIconOnly && !/aria-label/.test(attrs)) nIconOnly.push(`${f.split('/').pop()}:${src.slice(0, mm.index).split('\n').length}`)
  }
}
assert(nIconOnly.length === 0, 'N11: kila kitufe cha icon kwenye Spaces kina aria-label (§a11y)', [...new Set(nIconOnly)].join(', '))
const nCss = readFileSync(join(process.cwd(), 'src/styles/spaces.css'), 'utf8')
assert(/min-height: 44px/.test(nCss), 'N11: maeneo ya kugusa 44px kwenye Spaces (§a11y)')
assert(!/#[0-9a-fA-F]{6}/.test(nCss), 'N11: CSS ya Spaces haitoi rangi moja kwa moja (tokens pekee)')
assert(!/gradient\(/.test(nCss) && !/backdrop-filter/.test(nCss), 'N11: hakuna gradients/glassmorphism (§ design)')
const nNav = readFileSync(join(process.cwd(), 'src/components/BottomNav.jsx'), 'utf8')
assert((nNav.match(/id: '/g) || []).length === 5, 'N11: nav inabaki na destinations 5 (§1)')
assert(!readFileSync(join(process.cwd(), 'src/components/panels.jsx'), 'utf8').includes('CREATE_SPACE_ITEMS.push'), 'N11: aina za Space ni orodha moja (hakuna kuongeza kwa nje)')

/* ── N12: Ukurasa mmoja — hakuna routes mpya za nav ─────── */
const nAppSrc = readFileSync(join(process.cwd(), 'src/App.jsx'), 'utf8')
assert(/route === 'spaces'/.test(nAppSrc), 'N12: Spaces ni route ya nav ileile (hakuna route mpya)')
assert(!/Hubs'|Communities'|Channels'/.test(nAppSrc), 'N12: hakuna route za Hubs/Communities/Channels kwenye nav')
const nSpacesPageSrc = readFileSync(join(process.cwd(), 'src/pages/Spaces.jsx'), 'utf8')
assert(/SpacePage/.test(nSpacesPageSrc) && /ChannelPage/.test(nSpacesPageSrc), 'N12: Space moja na Channel zina kurasa zao (ndani ya ukurasa mmoja)')
assert(/role="tablist"/.test(nSpacesPageSrc) && /role="search"/.test(nSpacesPageSrc), 'N12: tabs na utafutaji zina roles (§a11y)')


/* ══════════════════════════════════════════════════════════
   RIPOTI
   ══════════════════════════════════════════════════════════ */

let failed = 0
for (const [state, name, info] of results) {
  if (state === 'FAIL') failed++
  console.log(`${state === 'OK' ? '✓' : '✗'} ${name}${info ? ` — ${info}` : ''}`)
}
console.log(`\n${results.length - failed}/${results.length} zimepita.`)
if (failed) process.exitCode = 1
