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
const FeedItem = (await import('../src/components/feed/FeedItem.jsx')).default
const FeedList = (await import('../src/components/feed/FeedList.jsx')).default
const { formatAge } = await import('../src/utils/time.js')

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

check('Placeholder — soga/gundua/spaces/business', () =>
  ['soga', 'gundua', 'spaces', 'business']
    .map((k) => renderToString(<PlaceholderPage pageKey={k} />))
    .join(''),
)

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
assert(directory.length === 13, 'identity.listUsers', `entities ${directory.length}`)

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

assert((await catalogRepository.getProductInfo('soga'))?.title === 'Soga', 'catalog.getProductInfo(soga)')
assert((await catalogRepository.getProductInfo('hakuna')) === null, 'catalog.getProductInfo → null kwa key isiyopo')

/* ── Home service (composition) ──────────────────────────── */
const nav = await homeService.getNavigation()
assert(nav.tabs.length === 5 && nav.filters.length === 9, 'homeService.getNavigation', `${nav.tabs.length} tabs, ${nav.filters.length} filters`)

const strip = await homeService.getStatusStrip()
assert(
  strip.length === 13 && strip.every((s) => s.user && s.user.name),
  'homeService.getStatusStrip — kila status ina entity yake',
  `${strip.length}/${strip.length} zimeunganishwa`,
)
assert(strip[0].user.id === 'me' && strip[1].user.name === 'Amina Said', 'getStatusStrip — mpangilio umehifadhiwa', `${strip[0].user.name} → ${strip[1].user.name}`)

/* ── Account service ─────────────────────────────────────── */
assert((await accountService.getCurrentUser()).id === 'me', 'accountService.getCurrentUser')
assert((await accountService.getProfile('me')).id === 'me', 'accountService.getProfile(me)')
assert((await accountService.getProfile('techSasa')).type === 'channel', 'accountService.getProfile(channel)')
assert((await accountService.listDirectory()).length === 13, 'accountService.listDirectory')

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

assert(perTab.mchanganyiko.items.length === 20, 'Mchanganyiko = posts 12 + reels 8', `${perTab.mchanganyiko.items.length}`)
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
   Mchanganyiko = 32 − 12 (vikao vya Live vina tab yao) = 20
   Friends 10 = posts 6 + live activity 1 + reels 4 · Channels 4 = posts 3 + reel 1 */
for (const [tab, expected] of [
  ['mchanganyiko', 20], ['reels', 8], ['friends', 10], ['channels', 4], ['live', 12],
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
  ['all', 20], ['posts', 10], ['picha', 4], ['video', 9],
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
   RIPOTI
   ══════════════════════════════════════════════════════════ */

let failed = 0
for (const [state, name, info] of results) {
  if (state === 'FAIL') failed++
  console.log(`${state === 'OK' ? '✓' : '✗'} ${name}${info ? ` — ${info}` : ''}`)
}
console.log(`\n${results.length - failed}/${results.length} zimepita.`)
if (failed) process.exitCode = 1
