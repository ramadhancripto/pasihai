// ══════════════════════════════════════════════════════════════
// PASIHAI — UI VERIFICATION (zana ya maendeleo)
// Matumizi:  node scripts/shots.mjs      (inahitaji dev server)
//            npm run dev                  kwenye terminal nyingine
//
// Hufanya mambo mawili:
//   1. DOM ASSERTIONS — inathibitisha UI inaonyesha data halisi
//      baada ya seam (status, tabs, panels, kurasa).
//   2. SCREENSHOTS — picha za QA → docs/shots/phase-1/
//
// Inashindwa (exit 1) kama assertion inashindwa au kuna console error.
// ══════════════════════════════════════════════════════════════

import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE || 'http://localhost:5173'
const OUT = 'docs/shots/phase-1'
const OUT2 = 'docs/shots/phase-2a'   // Phase 2A: mkondo wa Home
mkdirSync(OUT, { recursive: true })
mkdirSync(OUT2, { recursive: true })

const results = []
const consoleErrors = []
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function assert(ok, label, info = '') {
  results.push([ok ? 'OK' : 'FAIL', label, info])
}

async function countOf(page, selector, expected, label) {
  try {
    await page.waitForSelector(selector, { timeout: 4000 })
  } catch {
    /* itashindwa kwenye hesabu chini */
  }
  const n = await page.locator(selector).count()
  assert(n === expected, label, `${n} (ilitarajiwa ${expected})`)
}

async function kindCount(page, kind) {
  return page.locator(`.psh-feeditem[data-kind="${kind}"]`).count()
}
async function feedCount(page) {
  return page.locator('.psh-feeditem').count()
}

async function textOf(page, selector, expected, label) {
  try {
    await page.waitForSelector(selector, { timeout: 4000 })
  } catch {
    /* itashindwa chini */
  }
  const t = (await page.locator(selector).first().textContent())?.trim() ?? ''
  assert(t.includes(expected), label, `"${t}"`)
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ deviceScaleFactor: 2, locale: 'sw-TZ' })

async function newPage(viewport) {
  const page = await ctx.newPage()
  await page.setViewportSize(viewport)
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(`[console] ${m.text()}`)
  })
  page.on('pageerror', (e) => consoleErrors.push(`[pageerror] ${e.message}`))
  return page
}

/* ══════════════════════════════════════════════════════════════
   SIMU (390×844)
   ══════════════════════════════════════════════════════════════ */
const m = await newPage({ width: 390, height: 844 })
await m.goto(BASE, { waitUntil: 'networkidle' })
await sleep(400)

/* ── Bottom navigation (5 pekee) ─────────────────────────── */
const navLabels = await m.locator('.psh-nav__label').allTextContents()
assert(
  navLabels.length === 5 && navLabels.join('·') === 'Home·Soga·Gundua·Spaces·Business',
  'Bottom nav: destinations 5 kwa mpangilio sahihi',
  navLabels.join(' · '),
)

/* ── Header ──────────────────────────────────────────────── */
await textOf(m, '.psh-header__brand', 'Pasihai', 'Header inaonyesha wordmark "Pasihai"')
await countOf(m, '.psh-header__right .psh-icobtn', 3, 'Header: icons tatu (taarifa · akaunti · zaidi)')

/* ── Status / Stories ────────────────────────────────────── */
await countOf(m, '.psh-status__item:not(.psh-status__item--more)', 13, 'Status/Stories: status 13 zinaonekana')
await textOf(m, '.psh-status__name', 'Status Yako', 'Status: "Status Yako" ni ya kwanza')
await textOf(m, '.psh-status__item:nth-child(2)', 'Amina', 'Status: Amina ni wa pili')

/* ── Mchanganyiko: mkondo wa Home (Phase 2A) ─────────────── */
assert((await feedCount(m)) === 20, 'Mkondo: Mchanganyiko una vipengele 20', `${await feedCount(m)}`)
assert((await kindCount(m, 'text')) >= 1, 'Mkondo: kind "text" inaonekana', `${await kindCount(m, 'text')}`)
for (const [kind, min] of [['image', 1], ['video', 1], ['audio', 1], ['poll', 1], ['announcement', 1], ['liveActivity', 1], ['reel', 1]]) {
  const n = await kindCount(m, kind)
  assert(n >= min, `Mkondo: kind "${kind}" inaonekana`, `${n}`)
}
const relSet = await m.locator('.psh-feeditem .psh-chip--ent').allTextContents()
const relUniq = [...new Set(relSet.map((t) => t.trim()))].sort()
assert(
  relUniq.join("·") === "Biashara·Channel·Hub·Mbunifu·Mtu",
  'Mkondo: ROLE aina 5 zinaonekana (Mtu · Channel · Hub · Biashara · Mbunifu)',
  relUniq.join(' · '),
)
const relStates = [
  ...new Set(
    (await m.locator('.psh-feeditem .psh-ident__rel').allTextContents()).map((t) => t.trim()),
  ),
].sort()
assert(
  relStates.includes('Rafiki') && relStates.includes('Unafuatilia') && relStates.includes('Umejiunga'),
  'Mkondo: RELATIONSHIP states zinaonekana (Rafiki · Unafuatilia · Umejiunga)',
  relStates.join(' · '),
)
assert(
  (await m.locator('.psh-feeditem[data-kind="liveActivity"] .psh-live').count()) === 1 &&
    (await m.locator('.psh-feeditem[data-kind="liveActivity"] .psh-live__state, .psh-live__mode').count()) >= 1,
  'Mkondo: Live Activity ina shell yake (si post ya kawaida)',
  'psh-live',
)
assert((await m.locator('.psh-feedghost').count()) === 0, 'Mkondo: hakuna mabaki ya "feed ghost" ya zamani')
assert(
  (await m.locator('.psh-feeditem[data-kind="announcement"] .psh-announce__list li').count()) === 3,
  'Mkondo: Tangazo lina highlights 3',
  `${await m.locator('.psh-feeditem[data-kind="announcement"] .psh-announce__list li').count()}`,
)
assert(
  (await m.locator('.psh-ctarow__btn').count()) >= 2,
  'Mkondo: CTA za body (bidhaa/tukio/tangazo) zinaonekana',
  `${await m.locator('.psh-ctarow__btn').count()}`,
)
assert(
  (await m.locator('.psh-feeditem .psh-pollopt__lead').count()) === 1,
  'Mkondo: kura ina alama "(Inaongoza)"',
)
const firstRel = (await m.locator('.psh-feeditem .psh-ident__rel').first().textContent())?.trim()
assert(firstRel === 'Rafiki', 'Mkondo: kipengele cha kwanza ni cha rafiki (deterministic)', firstRel)

await m.screenshot({ path: `${OUT}/01-home-mobile.png` })

/* Scroll ya mlalo ya status (huru) */
await m.locator('.psh-status__row').evaluate((el) => (el.scrollLeft = 260))
await sleep(300)
await m.screenshot({ path: `${OUT}/02-status-scroll.png` })
await m.locator('.psh-status__row').evaluate((el) => (el.scrollLeft = 0))

/* ── Home tabs + kichujio ────────────────────────────────── */
await countOf(m, '.psh-htab', 5, 'Home tabs: 5 zinaonekana')
await textOf(m, '.psh-htab.is-active', 'Mchanganyiko', 'Home tab ya default ni Mchanganyiko')

/* ── Create area ─────────────────────────────────────────── */
await textOf(m, '.psh-createbar__prompt', 'Nini kinaendelea?', 'Create: prompt inaonekana')
await countOf(m, '.psh-createbar__act', 5, 'Create: vitendo 5 vya haraka')

/* ── Mstari wa hali (data kutoka services) ───────────────── */
await textOf(m, '.psh-strip', 'Automatic', 'Mstari wa hali unaonyesha muonekano "Automatic"')
await textOf(m, '.psh-strip', 'Zote', 'Mstari wa hali unaonyesha kichujio "Zote"')

/* ── More menu + view mode ───────────────────────────────── */
await m.getByLabel('Menyu zaidi za Home').click()
await sleep(350)
await textOf(m, '.psh-menu__hint', 'Automatic', 'More menu: hint ya muonekano inasoma "Automatic"')
await m.screenshot({ path: `${OUT}/03-more-menu.png` })

await m.getByRole('button', { name: /Muonekano \(View mode\)/ }).click()
await sleep(400)
await countOf(m, '.psh-vmode', 3, 'View mode: chaguo 3 zinaonekana')
await textOf(m, '.psh-vmode.is-active', 'Automatic', 'View mode: Automatic imechaguliwa')
await m.screenshot({ path: `${OUT}/04-view-mode.png` })
await m.getByRole('button', { name: 'Funga' }).click()
await sleep(250)

/* ── Unda (Create) ───────────────────────────────────────── */
await m.getByLabel('Fungua menyu ya kuunda').click()
await sleep(350)
await countOf(m, '.psh-create__item', 8, 'Unda: aina 8 za kuunda')
await m.screenshot({ path: `${OUT}/05-create.png` })
await m.getByRole('button', { name: 'Funga' }).click()
await sleep(250)

/* ── Taarifa (notifications) ─────────────────────────────── */
await m.getByLabel('Taarifa (notifications)').click()
await sleep(400)
await countOf(m, '.psh-notif', 8, 'Taarifa: taarifa 8 zinaonekana')
await textOf(m, '.psh-panelstack__count', '3 mpya', 'Taarifa: hesabu "3 mpya"')
await m.screenshot({ path: `${OUT}/06-notifications.png` })

/* Kichujio cha "Mpya" */
await m.getByRole('radio', { name: 'Mpya' }).click()
await sleep(400)
await countOf(m, '.psh-notif', 3, 'Taarifa: kichujio "Mpya" → 3')
await m.getByRole('radio', { name: 'Zote' }).click()
await sleep(300)

/* ── Wasifu kutoka taarifa (join na entity) ──────────────── */
await m.locator('.psh-notif__open').first().click()
await sleep(400)
await textOf(m, '.psh-profile__name', 'Amina Said', 'Wasifu kutoka taarifa: Amina Said')
await m.screenshot({ path: `${OUT}/07-profile-from-notif.png` })
await m.getByRole('button', { name: 'Funga' }).click()
await sleep(250)

/* ── Akaunti yangu (mtumiaji mwenye followers 0) ─────────── */
await m.getByLabel('Akaunti yangu').click()
await sleep(400)
await textOf(m, '.psh-profile__name', 'Neema Joseph', 'Akaunti yangu: Neema Joseph')
await countOf(m, '.psh-profile__stats li', 3, 'Akaunti yangu: stats 3')
await textOf(m, '.psh-profile__note', 'followers', 'Akaunti yangu: maelezo ya followers = 0')
await m.screenshot({ path: `${OUT}/08-profile-me.png` })
await m.getByRole('button', { name: 'Funga' }).click()
await sleep(250)

/* ── Tab ya Friends ──────────────────────────────────────── */
await m.getByRole('tab', { name: 'Friends' }).click()
await sleep(300)
await textOf(m, '.psh-htab.is-active', 'Friends', 'Tab inabadilika: Friends')

/* ── Kichujio cha maudhui ────────────────────────────────── */
await m.getByRole('button', { name: /Kichujio cha maudhui/ }).click()
await sleep(350)
await countOf(m, '.psh-dd__panel .psh-checkrow', 9, 'Kichujio cha maudhui: aina 9')
await m.screenshot({ path: `${OUT}/09-filter.png` })
await m.keyboard.press('Escape')
await sleep(250)

/* ── Mapendeleo ya mkondo ────────────────────────────────── */
await m.getByLabel('Menyu zaidi za Home').click()
await sleep(300)
await m.getByRole('button', { name: /Mapendeleo ya mkondo/ }).click()
await sleep(400)
await countOf(m, '.psh-checkrows .psh-checkrow', 3, 'Mapendeleo ya mkondo: mpangilio 3')
await countOf(m, '.psh-switchrows li', 5, 'Mapendeleo ya mkondo: switches 5')
await m.screenshot({ path: `${OUT}/10-feed-prefs.png` })
await m.getByRole('button', { name: 'Funga' }).click()
await sleep(250)

/* ── Home iliyosogezwa chini (create + kadi ya hatua) ────── */
await m.evaluate(() => window.scrollTo(0, 380))
await sleep(300)
await m.screenshot({ path: `${OUT}/14-home-scrolled.png` })
await m.evaluate(() => window.scrollTo(0, 0))

/* ── Kurasa za chini (placeholder) ───────────────────────── */
for (const [name, file, title, items] of [
  ['Soga', '11-soga.png', 'Soga', 5],
  ['Gundua', '12-gundua.png', 'Gundua', 6],
  ['Spaces', '13-spaces.png', 'Spaces', 5],
  ['Business', '15-business.png', 'Business', 6],
]) {
  await m.getByRole('button', { name, exact: true }).click()
  await sleep(400)
  await textOf(m, '.psh-pagehead__title', title, `Ukurasa wa ${title}: kichwa kinaonekana`)
  await countOf(m, '.psh-pageitems li', items, `Ukurasa wa ${title}: items ${items}`)
  await m.screenshot({ path: `${OUT}/${file}` })
}
await m.getByRole('button', { name: 'Home', exact: true }).click()
await sleep(400)

/* ── Picha za mkondo (Phase 2A) ──────────────────────────── */
await m.evaluate(() => window.scrollTo(0, 800))
await sleep(350)
await m.screenshot({ path: `${OUT2}/01-feed-top.png` })
for (const [i, y] of [[2, 1900], [3, 3000], [4, 4100]]) {
  await m.evaluate((v) => window.scrollTo(0, v), y)
  await sleep(300)
  await m.screenshot({ path: `${OUT2}/0${i}-feed-scroll.png` })
}
await m.evaluate(() => window.scrollTo(0, 0))
await sleep(250)

/* ── Tab za mkondo (Phase 2A) ────────────────────────────── */
for (const [tab, expected, file, note] of [
  ['Reels', 8, '10-tab-reels.png', 'reel'],
  ['Friends', 10, '11-tab-friends.png', 'Rafiki'],
  ['Channels', 4, '12-tab-channels.png', 'Unafuatilia·Hujafuatilia'],
]) {
  await m.getByRole('tab', { name: tab }).click()
  await sleep(400)
  const n = await feedCount(m)
  assert(n === expected, `Mkondo: tab "${tab}" → vipengele ${expected}`, `${n}`)
  if (tab === 'Reels') {
    assert((await kindCount(m, 'reel')) === 8, 'Mkondo: tab Reels ina reels 8 pekee', `${await kindCount(m, 'reel')}`)
  } else {
    const rels = [
      ...new Set(
        (await m.locator('.psh-feeditem .psh-ident__rel').allTextContents()).map((t) => t.trim()),
      ),
    ]
    assert(
      rels.join('·') === note,
      `Mkondo: tab ${tab} — relationship: ${note}`,
      rels.join(' · '),
    )
  }
  await m.evaluate(() => window.scrollTo(0, 420))
  await sleep(300)
  await m.screenshot({ path: `${OUT2}/${file}` })
  await m.evaluate(() => window.scrollTo(0, 0))
  await sleep(200)
}

await m.getByRole('tab', { name: 'Live' }).click()
await sleep(400)
assert(
  (await kindCount(m, 'liveActivity')) === 6,
  'Mkondo: tab Live — kipimo cha kwanza "Inaendelea" → vikao 6',
  `${await kindCount(m, 'liveActivity')}`,
)
await countOf(m, '.psh-liveseg__pill', 3, 'Mkondo: tab Live ina pills 3 za hali')
await textOf(m, '.psh-liveseg__pill.is-active', 'Inaendelea', 'Mkondo: Live — pill ya default ni "Inaendelea"')
assert(
  (await m.locator('.psh-feeditem[data-kind="liveActivity"] .psh-live__speakers').count()) >= 1,
  'Mkondo: Live ina jukwaa la wasemaji (speakers)',
  `${await m.locator('.psh-feeditem .psh-live__speakers').count()}`,
)
await m.screenshot({ path: `${OUT2}/13-tab-live.png` })

await m.locator('.psh-liveseg__pill').filter({ hasText: 'Zilizopangwa' }).click()
await sleep(350)
assert((await feedCount(m)) === 3, 'Mkondo: Live → "Zilizopangwa" 3', `${await feedCount(m)}`)
await m.evaluate(() => window.scrollTo(0, 320))
await sleep(250)
await m.screenshot({ path: `${OUT2}/16-live-zilizopangwa.png` })
await m.locator('.psh-liveseg__pill').filter({ hasText: 'Zilizopita' }).click()
await sleep(350)
assert((await feedCount(m)) === 3, 'Mkondo: Live → "Zilizopita" 3', `${await feedCount(m)}`)
await m.locator('.psh-liveseg__pill').filter({ hasText: 'Inaendelea' }).click()
await sleep(300)
await m.evaluate(() => window.scrollTo(0, 0))
await sleep(200)

/* Kichujio cha maudhui kwenye mkondo */
await m.getByRole('tab', { name: 'Mchanganyiko' }).click()
await sleep(350)
await m.getByRole('button', { name: /Kichujio cha maudhui/ }).click()
await sleep(300)
await m.locator('.psh-dd__panel .psh-checkrow').filter({ hasText: 'Picha' }).click()
await sleep(300)
await m.keyboard.press('Escape')
await sleep(300)
assert((await feedCount(m)) === 4, 'Mkondo: kichujio "Picha" → 4', `${await feedCount(m)}`)
await m.evaluate(() => window.scrollTo(0, 300))
await sleep(250)
await m.screenshot({ path: `${OUT2}/14-filter-picha.png` })

/* Hali tupu: Friends + Matangazo (hakuna tangazo kwa marafiki) */
await m.getByRole('tab', { name: 'Friends' }).click()
await sleep(300)
await m.getByRole('button', { name: /Kichujio cha maudhui/ }).click()
await sleep(300)
await m.locator('.psh-dd__panel .psh-checkrow').filter({ hasText: 'Matangazo' }).click()
await sleep(350)
assert((await feedCount(m)) === 0, 'Mkondo: Friends + Matangazo → hali tupu', `${await feedCount(m)}`)
await textOf(m, '.psh-feed__emptyTitle', 'Hakuna content', 'Mkondo: hali tupu inaonekana')
await m.evaluate(() => window.scrollTo(0, 260))
await sleep(250)
await m.screenshot({ path: `${OUT2}/15-hali-tupu.png` })

/* Rudisha hali ya awali: tab Mchanganyiko + kichujio Zote */
await m.getByRole('tab', { name: 'Mchanganyiko' }).click()
await sleep(300)
await m.getByRole('button', { name: /Kichujio cha maudhui/ }).click()
await sleep(300)
await m.locator('.psh-dd__panel .psh-checkrow').filter({ hasText: 'Zote' }).first().click()
await sleep(350)
assert((await feedCount(m)) === 20, 'Mkondo: kurudi "Zote" → 20', `${await feedCount(m)}`)

/* Discovery ya Channels + mwisho wa mkondo */
await m.getByRole('tab', { name: 'Channels' }).click()
await sleep(400)
await countOf(m, '.psh-discover__item', 2, 'Mkondo: Channels — discovery ya channels 2')
await m.evaluate(() => window.scrollTo(0, 99999))
await sleep(450)
await textOf(m, '.psh-feed__endTitle', 'Umesoma yote kwa leo!', 'Mkondo: hali ya mwisho wa mkondo')
await m.screenshot({ path: `${OUT2}/17-channels-mwisho.png` })
await m.evaluate(() => window.scrollTo(0, 0))
await sleep(250)

/* Kadi-lite: border + radius kwenye kadi za feed */
const cardStyle = await m.locator('.psh-feeditem').first().evaluate((el) => {
  const cs = getComputedStyle(el)
  return `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopLeftRadius} ${cs.backgroundColor}`
})
assert(
  cardStyle.startsWith('1px solid 16px') && cardStyle.includes('rgb(255, 255, 255)'),
  'Mkondo: kadi ni "card-lite" (border 1px · radius 16 · white)',
  cardStyle,
)
await m.getByRole('tab', { name: 'Mchanganyiko' }).click()
await sleep(300)
await m.close()

/* ══════════════════════════════════════════════════════════════
   DESKTOP (1280×900) + TABLET (834×1000)
   ══════════════════════════════════════════════════════════════ */
const d = await newPage({ width: 1280, height: 900 })
await d.goto(BASE, { waitUntil: 'networkidle' })
await sleep(400)
await countOf(d, '.psh-status__item:not(.psh-status__item--more)', 13, 'Desktop: status zinaonekana')
await countOf(d, '.psh-nav__list .psh-nav__item', 5, 'Desktop: bottom nav inabaki destinations 5')
assert((await feedCount(d)) === 20, 'Desktop: mkondo una vipengele 20', `${await feedCount(d)}`)
await d.screenshot({ path: `${OUT}/20-home-desktop.png` })
await d.evaluate(() => window.scrollTo(0, 700))
await sleep(350)
await d.screenshot({ path: `${OUT2}/20-desktop-feed.png` })
await d.evaluate(() => window.scrollTo(0, 0))
await sleep(250)

await d.getByLabel('Menyu zaidi za Home').click()
await sleep(400)
await textOf(d, '.psh-menu__hint', 'Automatic', 'Desktop: menyu ya Home inafunguka')
await d.screenshot({ path: `${OUT}/21-more-desktop.png` })
await d.keyboard.press('Escape')
await sleep(250)

await d.getByLabel('Akaunti yangu').click()
await sleep(400)
await textOf(d, '.psh-profile__name', 'Neema Joseph', 'Desktop: wasifu unafunguka')
await d.screenshot({ path: `${OUT}/22-profile-desktop.png` })
await d.keyboard.press('Escape')
await sleep(250)

await d.setViewportSize({ width: 834, height: 1000 })
await d.goto(BASE, { waitUntil: 'networkidle' })
await sleep(400)
await countOf(d, '.psh-status__item:not(.psh-status__item--more)', 13, 'Tablet: status zinaonekana')
await d.screenshot({ path: `${OUT}/30-home-tablet.png` })
await d.close()

/* ── Design system (?guide=1) ────────────────────────────── */
const g = await newPage({ width: 1280, height: 900 })
await g.goto(`${BASE}/?guide=1`, { waitUntil: 'networkidle' })
await sleep(500)
await countOf(g, '.psh-swatches li', 9, 'Msingi wa muonekano: rangi 9')
const iconCount = await g.locator('.psh-gicons li').count()
assert(iconCount > 35, 'Msingi wa muonekano: icons zinaonekana', `${iconCount} icons`)
const identCount = await g.locator('.psh-gident li').count()
assert(identCount === 6, 'Msingi wa muonekano: identity samples 6', `${identCount}`)
await g.screenshot({ path: `${OUT}/40-guide-desktop.png` })
await g.evaluate(() => window.scrollTo(0, 900))
await sleep(300)
await g.screenshot({ path: `${OUT}/41-guide-components.png` })
await g.close()

await browser.close()

/* ══════════════════════════════════════════════════════════════
   RIPOTI
   ══════════════════════════════════════════════════════════════ */
let failed = 0
for (const [state, label, info] of results) {
  if (state === 'FAIL') failed++
  console.log(`${state === 'OK' ? '✓' : '✗'} ${label}${info ? ` — ${info}` : ''}`)
}
console.log(`\n${results.length - failed}/${results.length} assertions zimepita.`)
console.log(`Screenshots: ${OUT}`)

if (consoleErrors.length) {
  const uniq = [...new Set(consoleErrors)]
  console.log(`\nHITILAFU ZA CONSOLE (${uniq.length}):`)
  for (const e of uniq) console.log('  ✗ ' + e)
  process.exitCode = 1
} else {
  console.log('✓ Hakuna hitilafu kwenye console.')
}
if (failed) process.exitCode = 1
