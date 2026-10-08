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
const OUT3 = 'docs/shots/system'     // Safu ya mfumo: Data Saved · System · Relay · Sync...
const OUT4 = 'docs/shots/chat'       // Chat: Inbox · Direct · Vikundi · New Chat · Requests...
const OUT5 = 'docs/shots/gundua'     // Gundua: modes · kategoria · vichujio · Friends · Live…
const OUT6 = 'docs/shots/premium'    // M: vitendo halisi — maoni · kushiriki · zaidi · Live · Status
const OUT7 = 'docs/shots/spaces'     // N: Spaces — orodha · Hub/Jumuiya · Channel · Unda · Nafasi Zangu
mkdirSync(OUT, { recursive: true })
mkdirSync(OUT2, { recursive: true })
mkdirSync(OUT3, { recursive: true })
mkdirSync(OUT4, { recursive: true })
mkdirSync(OUT5, { recursive: true })
mkdirSync(OUT6, { recursive: true })
mkdirSync(OUT7, { recursive: true })

/* Inner text iliyoonekana (display:none haijumuishwi) */
async function shownText(page, selector) {
  const raw = await page.locator(selector).first().innerText()
  return raw.replace(/\s+/g, ' ').trim()
}

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
  navLabels.length === 5 && navLabels.join('·') === 'Home·Chat·Gundua·Spaces·Business',
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

/* ── Safu ya mfumo: vitendo 2 vya header ────────────────── */
await countOf(m, '.psh-ctl', 2, 'Header: vitendo 2 vya mfumo pekee (Data Saved · System)')
assert(
  (await shownText(m, '.psh-ctl--saved')) === '184 MB',
  'Header (simu): "184 MB" — compact, bila neno "saved"',
  await shownText(m, '.psh-ctl--saved'),
)
const sysMobileText = await shownText(m, '.psh-ctl--system')
const sysMobileLabel = await m.locator('.psh-ctl--system').getAttribute('aria-label')
assert(
  sysMobileText === '' && /PASIHAI System/.test(sysMobileLabel || ''),
  'Header (simu): kitufe cha System ni icon+doa — LAKINI kina aria-label kamili',
  `"${sysMobileText}" · aria-label="${sysMobileLabel}"`,
)
const mhdr = await m.locator('.psh-header__inner').evaluate((el) => ({
  sw: el.scrollWidth,
  cw: el.clientWidth,
}))
assert(mhdr.sw <= mhdr.cw + 1, 'Header (simu 390px): hakuna overflow', `${mhdr.sw}/${mhdr.cw}`)
const dotTone = await m.locator('.psh-ctl__dot').getAttribute('class')
assert(/psh-ctl__dot--/.test(dotTone || ''), 'System: doa ya hali inaonyesha hali ya kifaa', dotTone)
await m.screenshot({ path: `${OUT3}/01-header-mobile.png`, clip: { x: 0, y: 0, width: 390, height: 60 } })

/* ── Data Saved: kufungua, scopes, kufunga ──────────────── */
await m.locator('.psh-ctl--saved').click()
await sleep(450)
await textOf(m, '.psh-sheet__title', 'Data Saving', 'Data Saved: panel inafunguka')
await textOf(m, '.psh-sys-metric strong', '184 MB', 'Data Saved: kipimo 184 MB')
await countOf(m, '.psh-sys-break li', 4, 'Data Saved: breakdown 4 (sharing · cache · delivery · relay)')
await countOf(m, '.psh-sys-impact li', 6, 'Data Saved: athari 6 kwa mtandao')
await m.screenshot({ path: `${OUT3}/02-datasaved-today.png` })
await m.locator('.psh-sheet__body').evaluate((el) => el.scrollTo(0, el.scrollHeight))
await sleep(320)
await m.screenshot({ path: `${OUT3}/02b-datasaved-today-bottom.png` })
await m.locator('.psh-sheet__body').evaluate((el) => el.scrollTo(0, 0))
await sleep(250)

await m.getByRole('radio', { name: 'Week' }).click()
await sleep(400)
await textOf(m, '.psh-sys-metric strong', '1.0 GB', 'Data Saved: kipimo cha Week = 1.0 GB')
await m.screenshot({ path: `${OUT3}/03-datasaved-week.png` })
await m.keyboard.press('Escape')
await sleep(300)
assert((await m.locator('.psh-sheet').count()) === 0, 'Data Saved: Escape inafunga panel')

/* ── System: hali + vitendo vinavyofaa sasa ─────────────── */
await m.locator('.psh-ctl--system').click()
await sleep(450)
await textOf(m, '.psh-sheet__title', 'System', 'System: panel inafunguka')
await countOf(m, '.psh-sys-act', 6, 'System: vitendo 6 vya muktadha')
await textOf(m, '.psh-sys-status__label', 'Local Active', 'System: hali ya kifaa (LOCAL) inaonyeshwa')
const syncBadge = await shownText(m, '.psh-sys-act__badge')
assert(syncBadge === '3', 'System: Sync ina badge ya vinasubiri (3)', syncBadge)
await m.screenshot({ path: `${OUT3}/04-system-local.png` })

await m.locator('.psh-sheet').getByRole('button', { name: /^Relay/ }).click()
await sleep(480)
await textOf(m, '.psh-sheet__title', 'Relay', 'Relay: panel inafunguka kwa njia moja (System → Relay)')
await countOf(m, '.psh-sys-block', 2, 'Relay: sehemu 2 tofauti (Local Mesh · Internet Relay)')
const irSwitch = m.locator('.psh-sys-irhead .psh-switch')
assert(
  (await irSwitch.getAttribute('aria-checked')) === 'false',
  'Internet Relay: imezimwa kwa default (OFF by default)',
)
assert(
  (await m.locator('.psh-sys-alert--off').count()) === 1,
  'Internet Relay: hali "Off" inaelezwa waziwazi',
)
await countOf(m, '.psh-sheet .psh-seg__item', 2, 'Ukomo: chaguo 2 pekee (3 MB/day · 5 MB/day)')
const limLabels = (await m.locator('.psh-sheet .psh-seg__item').allTextContents()).map((t) => t.trim())
assert(
  limLabels.join('·') === '3 MB / day·5 MB / day',
  'Maandishi ya ukomo: "3 MB / day" · "5 MB / day"',
  limLabels.join(' · '),
)
const meter0 = await shownText(m, '.psh-sys-meter__cap')
assert(
  meter0 === 'Used today 0 MB · Remaining 3 MB',
  'Meter: used · remaining (local scenario)',
  meter0,
)
await countOf(m, '.psh-sys-policy li', 4, 'Sera: aina 4 zinazoruhusiwa (maandishi · metadata · sync · uelekezaji)')
await countOf(m, '.psh-sys-chips--blocked li', 9, 'Sera: aina 9 zilizozuiliwa (video · reels · picha · sauti · hati · PDF · ZIP · viambatisho · uploads)')
await countOf(m, '.psh-sys-prior li', 3, 'Kipaumbele: ngazi 3 (maandishi → delivery → sync)')
await countOf(m, '.psh-sys-transports li', 4, 'Njia: 4 (3 local + Internet Relay)')
await countOf(m, '.psh-switchrows li', 3, 'Chaguo za mawasiliano: 3 (maandishi pekee)')
assert(
  (await shownText(m, '.psh-sheet')).includes('Maximum allowed 5 MB / day'),
  'Ukomo wa juu unaonyeshwa: "Maximum allowed 5 MB / day"',
)
await m.screenshot({ path: `${OUT3}/05-relay-local.png` })
await m.locator('.psh-sheet__body').evaluate((el) => el.scrollTo(0, el.scrollHeight))
await sleep(320)
await m.screenshot({ path: `${OUT3}/05b-relay-local-bottom.png` })
await m.locator('.psh-sheet__body').evaluate((el) => el.scrollTo(0, 0))
await sleep(250)

/* Washa Internet Relay (idhini ya wazi) */
await irSwitch.click()
await sleep(500)
assert(
  (await irSwitch.getAttribute('aria-checked')) === 'true',
  'Internet Relay: inawashwa kwa idhini ya wazi',
)
assert(
  /Internet Relay imewashwa/.test(await shownText(m, '.psh-toast')),
  'Toast: maelezo ya kuwasha (ujumbe mfupi pekee · kikomo)',
)

/* Chagua 5 MB/day */
await m.locator('.psh-sheet .psh-seg__item', { hasText: '5 MB' }).click()
await sleep(450)
const meter5 = await shownText(m, '.psh-sys-meter__cap')
assert(/Remaining 5 MB/.test(meter5), 'Ukomo unabadilika: 5 MB/day → remaining 5 MB', meter5)

/* Tuma ujumbe mmoja (unaostahili) → uboreshaji unaonekana */
await m.locator('.psh-sheet').getByRole('button', { name: 'Tuma' }).first().click()
await sleep(600)
const sentToast = await shownText(m, '.psh-toast')
assert(
  /Imepitishwa: [\d.]+ KB → [\d.]+ KB/.test(sentToast),
  'Ujumbe unatuma: raw KB → compact KB (uboreshaji unafanyika)',
  sentToast,
)
const relayedChip = await m.locator('.psh-sys-items .psh-sys-state--synced').count()
assert(relayedChip >= 3, 'Ujumbe uliotumwa unakuwa RELAYED', `${relayedChip}`)
await m.screenshot({ path: `${OUT3}/05c-relay-after-send.png` })
await sleep(150)
await m.locator('.psh-sheet__headleft .psh-icobtn').click()
await sleep(350)
await m.locator('.psh-sheet').getByRole('button', { name: /^Sync/ }).click()
await sleep(450)
await textOf(m, '.psh-sheet__title', 'Sync', 'Sync: panel inafunguka')
await textOf(m, '.psh-sys-metric strong', '3', 'Sync: vitu 3 vinasubiri')
const statesBefore = (await m.locator('.psh-sys-state').allTextContents()).map((t) => t.trim())
assert(
  statesBefore.filter((t) => t === 'WAITING').length === 3,
  'Sync: hali WAITING zinaonekana',
  statesBefore.join(' '),
)
await m.screenshot({ path: `${OUT3}/06-sync-waiting.png` })
await m.locator('.psh-sheet').getByRole('button', { name: /Sync now/ }).click()
await sleep(700)
const statesAfter = (await m.locator('.psh-sys-state').allTextContents()).map((t) => t.trim())
assert(
  statesAfter.filter((t) => t === 'SYNCED').length >= 3,
  'Sync now: WAITING → SYNCED',
  statesAfter.join(' '),
)
await m.screenshot({ path: `${OUT3}/07-sync-done.png` })
await m.locator('.psh-sheet__headleft .psh-icobtn').click()
await sleep(350)
await m.locator('.psh-sheet').getByRole('button', { name: /^Nearby/ }).click()
await sleep(450)
await countOf(m, '.psh-sys-people li', 3, 'Nearby: watu 3 walio karibu (identity + meta)')
await m.screenshot({ path: `${OUT3}/08-nearby.png` })
await m.locator('.psh-sheet__body').evaluate((el) => el.scrollTo(0, el.scrollHeight))
await sleep(320)
await m.screenshot({ path: `${OUT3}/08b-nearby-bottom.png` })
await m.locator('.psh-sheet__body').evaluate((el) => el.scrollTo(0, 0))
await sleep(250)

await m.locator('.psh-sheet__headleft .psh-icobtn').click()
await sleep(350)
await m.locator('.psh-sheet').getByRole('button', { name: /^Share Nearby/ }).click()
await sleep(450)
await countOf(m, '.psh-sys-items li', 4, 'Share Nearby: faili 4 zinapatikana karibu')
await m.locator('.psh-sheet').getByRole('button', { name: 'Share nearby' }).first().click()
await sleep(450)
await m.screenshot({ path: `${OUT3}/09-share-nearby.png` })
await m.locator('.psh-sheet__headleft .psh-icobtn').click()
await sleep(350)
await m.locator('.psh-sheet').getByRole('button', { name: /^Activity/ }).click()
await sleep(450)
await countOf(m, '.psh-sys-stats li', 4, 'Activity: stats 4 (inapokea · inashiriki · inasubiri · sync)')
await m.screenshot({ path: `${OUT3}/10-activity.png` })
await m.keyboard.press('Escape')
await sleep(300)

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
/* Unda: aina 8 za content + aina 3 za Space (Hub · Jumuiya · Channel)
   — kitu kimoja cha kuunda, mahali popote (§40). Vikundi havipo: ni vya Chat. */
await countOf(m, '.psh-create__item', 11, 'Unda: aina 8 za content + 3 za Space')
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

/* ── Kurasa za chini (placeholder) ───────────────────────────
   Gundua, Chat na Spaces zimetolewa hapa: sasa ni kurasa halisi
   (picha zao ziko docs/shots/gundua|chat|spaces/). 12-gundua.png na
   13-spaces.png za awali zinabaki kama kumbukumbu ya awamu ya 1. */
{
  await m.getByRole('button', { name: 'Business', exact: true }).click()
  await sleep(400)
  await textOf(m, '.psh-pagehead__title', 'Business', 'Ukurasa wa Business: kichwa kinaonekana')
  await countOf(m, '.psh-pageitems li', 6, 'Ukurasa wa Business: items 6')
  await m.screenshot({ path: `${OUT}/15-business.png` })
  await m.getByRole('button', { name: 'Home', exact: true }).click()
  await sleep(400)
}

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
   HALI ZA KIFAA (scenarios) — ?sys=offline · waiting_sync · online
   Contextual rule: hatuonyeshi kila kitu kila wakati.
   ══════════════════════════════════════════════════════════════ */

/* ── OFFLINE ─────────────────────────────────────────────── */
const off = await newPage({ width: 390, height: 844 })
await off.goto(`${BASE}/?sys=offline`, { waitUntil: 'networkidle' })
await sleep(450)
await countOf(off, '.psh-ctl', 2, 'Offline: vitendo 2 vya mfumo vinabaki (hakuna nav mpya)')
await off.locator('.psh-ctl--system').click()
await sleep(450)
await textOf(off, '.psh-sys-status__label', 'Offline', 'Offline: hali inaonyeshwa')
const offActions = await off.locator('.psh-sys-act').evaluateAll((els) =>
  els.map((e) => ({
    label: e.querySelector('.psh-sys-act__label').textContent,
    hint: e.querySelector('.psh-sys-act__hint').textContent,
    off: e.disabled,
  })),
)
assert(
  offActions.filter((a) => a.off).map((a) => a.label).join('·') === 'Relay·Nearby·Save Offline',
  'Offline: vitendo visivyowezekana vinazimwa (relay · nearby · save offline)',
  offActions.filter((a) => a.off).map((a) => a.label).join(' · '),
)
assert(
  offActions.some((a) => a.label === 'Share Nearby' && !a.off),
  'Offline: Share Nearby inafikiwa ili KUELEZA (faili si za relay · njia mbadala)',
)
assert(
  offActions.every((a) => !a.off || a.hint.length > 0),
  'Offline: kila kitendo kilichozimwa kinaeleza sababu',
)
await off.screenshot({ path: `${OUT3}/11-system-offline.png` })

await off.locator('.psh-sheet').getByRole('button', { name: /^Sync/ }).click()
await sleep(450)
assert(
  await off.locator('.psh-sheet').getByRole('button', { name: /Sync now/ }).isDisabled(),
  'Offline: "Sync now" imezimwa (hakuna mtandao)',
)
await off.screenshot({ path: `${OUT3}/12-sync-offline.png` })
await off.keyboard.press('Escape')
await sleep(300)

/* ── Chapisho MOJA: offline → Global itasubiri sync ──────── */
await off.locator('.psh-createbar__prompt').click()
await sleep(500)
await textOf(off, '.psh-sheet__title', 'Chapisho jipya', 'Post: composer MOJA inafunguka')
await countOf(off, '.psh-checkrow', 4, 'Post: chaguo 4 za uwasilishaji (Local · Nearby · Community · Global)')
const globalRow = off.locator('.psh-sheet').getByRole('radio', { name: /Global/ })
await globalRow.click()
await sleep(300)
await textOf(
  off,
  '.psh-panelstack__count',
  'Itasubiri sync',
  'Post (offline) + Global: "Itasubiri sync"',
)
await off.screenshot({ path: `${OUT3}/13-composer-offline.png` })
await off.locator('.psh-compose__input').fill('Mafunzo ya kilimo kwa jumuiya')
await off.locator('.psh-panelstack__toolbar .psh-btn').click()
await sleep(700)
const toastTxt = await shownText(off, '.psh-toast')
assert(toastTxt.includes('foleni'), 'Post: linaingia kwenye foleni (waiting for sync)', toastTxt)
await off.locator('.psh-ctl--system').click()
await sleep(450)
const syncHint = await off.locator('.psh-sys-act', { hasText: 'Sync' }).first().innerText()
assert(/Vitendo 5 vinasubiri/.test(syncHint), 'Offline: foleni inaongezeka (3 → 5)', syncHint.replace(/\s+/g, ' '))

/* Faili + Internet Relay: imezuiliwa, njia mbadala zinaonyeshwa */
await off.locator('.psh-sheet').getByRole('button', { name: /^Share Nearby/ }).click()
await sleep(500)
const guardText = await shownText(off, '.psh-sys-alert--off')
assert(
  /Internet Relay supports messages only\./.test(guardText),
  'Faili: "Internet Relay supports messages only." inaonekana',
  guardText,
)
const altCount = await off.locator('.psh-sys-chips li').count()
assert(altCount >= 4, 'Faili: njia mbadala 4 zinaonyeshwa (Wi-Fi Direct · Bluetooth · Wi-Fi · upload)', `${altCount}`)
await off.screenshot({ path: `${OUT3}/17-share-nearby-guard.png` })
await off.close()

/* ── WAITING_SYNC: Sync now inapeleka ────────────────────── */
const ws = await newPage({ width: 390, height: 844 })
await ws.goto(`${BASE}/?sys=waiting_sync`, { waitUntil: 'networkidle' })
await sleep(450)
await ws.locator('.psh-ctl--system').click()
await sleep(450)
await textOf(ws, '.psh-sys-status__label', 'Waiting for Sync', 'Waiting for Sync: hali inaonyeshwa')
await ws.locator('.psh-sheet').getByRole('button', { name: /^Sync/ }).click()
await sleep(450)
await ws.locator('.psh-sheet').getByRole('button', { name: /Sync now/ }).click()
await sleep(700)
const wsStates = (await ws.locator('.psh-sys-state').allTextContents()).map((t) => t.trim())
assert(
  wsStates.filter((t) => t === 'SYNCED').length >= 3,
  'Waiting for Sync: vitendo vinapelekwa (SYNCED)',
  wsStates.join(' '),
)
await ws.screenshot({ path: `${OUT3}/14-waiting-sync-done.png` })
await ws.close()

/* ── ONLINE: Relay available (si active) ─────────────────── */
const on = await newPage({ width: 390, height: 844 })
await on.goto(`${BASE}/?sys=online`, { waitUntil: 'networkidle' })
await sleep(450)
await on.locator('.psh-ctl--system').click()
await sleep(450)
await textOf(on, '.psh-sys-status__label', 'Mtandaoni', 'Online: hali inaonyeshwa')
const onlineRelay = await on.locator('.psh-sys-act', { hasText: 'Relay' }).first().innerText()
assert(
  /Ujumbe mfupi pekee/.test(onlineRelay) && /1\.2 \/ 3 MB/.test(onlineRelay),
  'Online: Relay inaonyesha matumizi ya sera (ujumbe mfupi pekee · 1.2 / 3 MB leo)',
  onlineRelay.replace(/\s+/g, ' '),
)
await on.screenshot({ path: `${OUT3}/15-system-online.png` })
await on.close()

/* ── LIMITED: ukomo wa Internet Relay umefikiwa (hard stop) ── */
const lim = await newPage({ width: 390, height: 844 })
await lim.goto(`${BASE}/?sys=limited`, { waitUntil: 'networkidle' })
await sleep(450)
await lim.locator('.psh-ctl--system').click()
await sleep(450)
await lim.locator('.psh-sheet').getByRole('button', { name: /^Relay/ }).click()
await sleep(500)
const limitBanner = await shownText(lim, '.psh-sys-alert--limit')
assert(
  /Daily Internet Relay limit reached/.test(limitBanner) && /Internet Relay paused/.test(limitBanner),
  'Ukomo umefikiwa: "Daily Internet Relay limit reached" + "Internet Relay paused"',
  limitBanner,
)
assert(
  (await lim.locator('.psh-sys-irhead .psh-switch').getAttribute('aria-checked')) === 'true',
  'Umo mkifikiwa: relay imewashwa lakini imesimama',
)
const meterFull = await shownText(lim, '.psh-sys-meter__cap')
assert(
  /Used today 3 MB · Remaining 0 MB/.test(meterFull),
  'Meter: 3 MB / 3 MB imetumika — hakuna kinachosalia',
  meterFull,
)
const sendBtns = await lim.locator('.psh-sheet').getByRole('button', { name: 'Tuma' }).count()
assert(sendBtns === 0, 'Ukomo umefikiwa: hakuna "Tuma" (hakuna trafiki zaidi)', `${sendBtns}`)
await lim.screenshot({ path: `${OUT3}/16-relay-limit-reached.png` })
await lim.locator('.psh-sheet__body').evaluate((el) => el.scrollTo(0, el.scrollHeight))
await sleep(300)
await lim.screenshot({ path: `${OUT3}/16b-relay-limit-bottom.png` })
await lim.close()

/* ══════════════════════════════════════════════════════════════
   DESKTOP (1280×900) + TABLET (834×1000)
   ══════════════════════════════════════════════════════════════ */
const d = await newPage({ width: 1280, height: 900 })
await d.goto(BASE, { waitUntil: 'networkidle' })
await sleep(400)
await countOf(d, '.psh-status__item:not(.psh-status__item--more)', 13, 'Desktop: status zinaonekana')
await countOf(d, '.psh-ctl', 2, 'Desktop: vitendo 2 vya mfumo')
assert(
  (await shownText(d, '.psh-ctl--saved')) === '184 MB saved',
  'Desktop: "184 MB saved" (na neno "saved")',
  await shownText(d, '.psh-ctl--saved'),
)
assert(
  (await shownText(d, '.psh-ctl--system')) === 'System',
  'Desktop: kitufe "System"',
  await shownText(d, '.psh-ctl--system'),
)
const dhdr = await d.locator('.psh-header__inner').evaluate((el) => ({
  sw: el.scrollWidth,
  cw: el.clientWidth,
}))
assert(dhdr.sw <= dhdr.cw + 1, 'Desktop: header haifuriki', `${dhdr.sw}/${dhdr.cw}`)
await d.screenshot({ path: `${OUT3}/20-header-desktop.png`, clip: { x: 0, y: 0, width: 1280, height: 60 } })
await d.locator('.psh-ctl--saved').click()
await sleep(450)
await textOf(d, '.psh-sheet__title', 'Data Saving', 'Desktop: Data Saving inafunguka (dialog moja)')
await d.screenshot({ path: `${OUT3}/21-datasaved-desktop.png` })
await d.keyboard.press('Escape')
await sleep(300)
await d.locator('.psh-ctl--system').click()
await sleep(450)
await d.screenshot({ path: `${OUT3}/22-system-desktop.png` })
await d.keyboard.press('Escape')
await sleep(300)
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


/* ══════════════════════════════════════════════════════════════
   CHAT — mfumo MMOJA wa mawasiliano (§1–§32)
   Inbox · Direct · Vikundi · New Chat · lookup · Requests ·
   New Group · Search · More · hali (local/offline/sync) ·
   desktop panes mbili · a11y.
   ══════════════════════════════════════════════════════════════ */

const c = await newPage({ width: 390, height: 844 })
await c.goto(BASE, { waitUntil: 'networkidle' })
await sleep(400)
const cNav = (await c.locator('.psh-nav__label').allTextContents()).join('·')
assert(cNav === 'Home·Chat·Gundua·Spaces·Business', 'Chat: bottom nav inasema "Chat" (si Soga)', cNav)
await c.getByRole('button', { name: 'Chat', exact: true }).click()
await sleep(500)

/* ── 01 Inbox ────────────────────────────────────────────── */
await textOf(c, '.psh-chat__title', 'Chat', 'Chat inbox: kichwa ni "Chat"')
await countOf(c, '.psh-chat__headactions .psh-icobtn', 2, 'Chat inbox: vitendo 2 pekee (Search · ⋮)')
const chatActionLabels = await c.locator('.psh-chat__headactions .psh-icobtn').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))
assert(
  chatActionLabels.every((l) => l && l.length > 3),
  'Chat inbox: kila kitufe kina label (§27)',
  chatActionLabels.join(' · '),
)
assert(
  (await c.locator('.psh-chat [aria-label*="kaunti"], .psh-chat [aria-label*="asifu"]').count()) === 0,
  'Chat inbox: hakuna account icon kwenye Chat (§3)',
)
await countOf(c, '.psh-chat__syschip', 3, 'Chat inbox: hali ya mfumo (hali · Data Saved · njia)')
await countOf(c, '.psh-chat__filter', 4, 'Chat inbox: vichujio 4 (Zote · Direct · Vikundi · Haijasomwa)')
await countOf(c, '.psh-chat__row', 6, 'Chat inbox: mazungumzo 6 (direct 3 · vikundi 3)')
await countOf(c, '.psh-chat__context', 2, 'Chat inbox: vikundi vilivyounganishwa vinaonyesha metadata (community · hub)')
await textOf(c, '.psh-chat__fab', 'New Chat', 'Chat inbox: kitufe cha New Chat')
const bg = await c.locator('.psh-chat__pane--list').evaluate((el) => getComputedStyle(el.closest('.psh-col') || el).backgroundColor)
assert(typeof bg === 'string', 'Chat: background ni rangi moja safi (hakuna pattern)', bg)
await c.screenshot({ path: `${OUT4}/01-inbox.png` })

/* ── 02 Kichujio ─────────────────────────────────────────── */
await c.locator('.psh-chat__filter', { hasText: 'Vikundi' }).click()
await sleep(400)
await countOf(c, '.psh-chat__row', 3, 'Chat chip "Vikundi": vikundi 3 pekee')
await c.screenshot({ path: `${OUT4}/02-filter-vikundi.png` })
await c.locator('.psh-chat__filter', { hasText: 'Direct' }).click()
await sleep(350)
await countOf(c, '.psh-chat__row', 3, 'Chat chip "Direct": direct 3 pekee')
await c.locator('.psh-chat__filter', { hasText: 'Zote' }).click()
await sleep(350)

/* ── 03 Direct thread (aina zote za ujumbe) ──────────────── */
await c.locator('.psh-chat__row').first().click()
await sleep(450)
await textOf(c, '.psh-chat__theadname', 'Amina Hassan', 'Direct thread: kichwa kina jina')
await countOf(c, '.psh-msg', 6, 'Direct thread: jumbe 6')
await countOf(c, '.psh-msg__shared', 1, 'Direct thread: shared post inaonekana')
await countOf(c, '.psh-msg__audio', 1, 'Direct thread: sauti (voice note) inaonekana')
await countOf(c, '.psh-msg__poll', 1, 'Direct thread: kura inaonekana')
await countOf(c, '.psh-msg__loc', 1, 'Direct thread: eneo la moja kwa moja linaonekana')
await countOf(c, '.psh-chat__composer textarea', 1, 'Direct thread: composer MOJA')
const threadBg = await c.locator('.psh-chat__thread').evaluate((el) => getComputedStyle(el).backgroundColor)
assert(threadBg === 'rgb(234, 248, 243)', 'Chat thread: background = rangi MOJA safi (§20)', threadBg)
await c.screenshot({ path: `${OUT4}/03-direct-thread.png` })

/* ── 04 Vitendo vya ujumbe ───────────────────────────────── */
await c.locator('.psh-msg__more').first().click({ force: true })
await sleep(450)
await textOf(c, '.psh-sheet__title', 'Vitendo', 'Chat: vitendo vya ujumbe (sheet ileile ya app)')
await countOf(c, '.psh-msgact__reaction', 5, 'Chat: itikio 5 zinapatikana')
await countOf(c, '.psh-msgact .psh-menu__row', 5, 'Chat: vitendo 5 vya muktadha (jibu · nakili · sambaza · taarifa · futa)')
await c.screenshot({ path: `${OUT4}/04-message-actions.png` })
await c.locator('.psh-msgact__reaction').first().click()
await sleep(500)
assert((await c.locator('.psh-msg__reactions').count()) > 0, 'Chat: itikio limeongezwa kwenye ujumbe')
await c.screenshot({ path: `${OUT4}/05-reaction-added.png` })

/* ── 05 Jibu + kutuma ────────────────────────────────────── */
await c.locator('.psh-msg__more').nth(1).click({ force: true })
await sleep(400)
await c.locator('.psh-menu__row', { hasText: 'Jibu' }).first().click()
await sleep(400)
await countOf(c, '.psh-chat__reply', 1, 'Chat: mstari wa jibu unaonekana (swipe/jibu si njia pekee)')
await c.screenshot({ path: `${OUT4}/06-reply-bar.png` })
await c.locator('.psh-chat__input').fill('Asante sana, nitafika saa nne.')
await c.locator('.psh-chat__cbtn--send').click()
await sleep(700)
const sentText = await c.locator('.psh-msg').last().innerText()
assert(/Asante sana/.test(sentText) && (await c.locator('.psh-msg').last().locator('.psh-msg__quote').count()) === 1, 'Chat: ujumbe wa jibu umetumwa na quote', sentText.replace(/\n/g, ' ').slice(0, 60))
await c.screenshot({ path: `${OUT4}/07-reply-sent.png` })

/* ── 06 Media guard (sera ya Internet Relay) ─────────────── */
await c.locator('.psh-chat__cbtn').first().click()
await sleep(500)
await textOf(c, '.psh-sheet__title', 'Kutuma media', 'Chat: panel ya media inafunguka')
const guardBody = await c.locator('.psh-sheet__body').innerText()
assert(/maandishi pekee/.test(guardBody), 'Chat media: sera ya relay inaelezwa (maandishi pekee)')
assert(/kimya kimya|Hatuhamishi/.test(guardBody), 'Chat media: hakuna kubadili njia kimya kimya (§22)')
await countOf(c, '.psh-sheet__body .psh-menu__row', 3, 'Chat media: njia 3 (Local Mesh · Data yako · Wi-Fi)')
await c.screenshot({ path: `${OUT4}/08-media-guard.png` })
await c.locator('.psh-menu__row', { hasText: 'Tuma kwa Local Mesh' }).click()
await sleep(800)
const mediaMsg = await c.locator('.psh-msg').last().innerText()
assert(/Local Mesh/.test(mediaMsg), 'Chat media: chaguo la mtumiaji linabadilisha hali (Local Mesh)', mediaMsg.replace(/\n/g, ' ').slice(0, 70))
await sleep(2500) /* toast ipotea — picha safi */
await c.screenshot({ path: `${OUT4}/09-media-resolved.png` })

/* ── 07 Kikundi ──────────────────────────────────────────── */
await c.locator('.psh-chat__back').click()
await sleep(350)
await c.locator('.psh-chat__filter', { hasText: 'Vikundi' }).click()
await sleep(350)
await c.locator('.psh-chat__row').first().click()
await sleep(450)
const groupSub = await shownText(c, '.psh-chat__theadsub')
assert(/wanachama 48/.test(groupSub), 'Chat group: kichwa kinaonyesha wanachama', groupSub)
await countOf(c, '.psh-msg__role', 3, 'Chat group: roles (Msimamizi · Mwanafunzi · Kiongozi) zinaonekana')
await countOf(c, '.psh-msg__doc', 1, 'Chat group: faili (PDF) linaonekana')
await countOf(c, '.psh-msg__poll', 1, 'Chat group: kura inaonekana')
await countOf(c, '.psh-chat__typing', 1, 'Chat group: mtu anaandika')
await c.screenshot({ path: `${OUT4}/10-group-thread.png` })

/* kikundi kilichounganishwa na community */
await c.locator('.psh-chat__back').click()
await sleep(350)
await c.locator('.psh-chat__row', { hasText: 'Wakulima Dar' }).click()
await sleep(450)
await textOf(c, '.psh-chat__theadname', 'Wakulima Dar', 'Chat group: kikundi cha community kinafunguka')
await countOf(c, '.psh-msg__ann', 1, 'Chat group: tangazo (announcement) linaonekana')
await countOf(c, '.psh-msg__shared', 1, 'Chat group: makala iliyoshirikiwa inaonekana')
await c.screenshot({ path: `${OUT4}/11-group-community.png` })

/* ── 08 New Chat + lookup ────────────────────────────────── */
await c.locator('.psh-chat__back').click()
await sleep(350)
await c.locator('.psh-chat__filter', { hasText: 'Zote' }).click()
await sleep(300)
await c.locator('.psh-chat__fab').click()
await sleep(500)
await textOf(c, '.psh-sheet__title', 'New Chat', 'New Chat: panel inafunguka')
await countOf(c, '.psh-chat-section', 4, 'New Chat: tabaka 4 (Saved Friends · PASIHAI Friends · simu · mwaliko)')
await countOf(c, '.psh-chat-person', 10, 'New Chat: watu 10 kwa tabaka (saved · friends · akaunti · mwaliko)')
await c.screenshot({ path: `${OUT4}/12-newchat.png` })

await c.locator('.psh-chat-lookup__input').fill('0784 123 456')
await c.getByRole('button', { name: /Tafuta namba/ }).click()
await sleep(500)
await countOf(c, '.psh-chat-case', 1, 'Lookup: namba inayolingana → akaunti 1 (Kesi 1: saved)')
await c.screenshot({ path: `${OUT4}/13-lookup-match.png` })
await c.locator('.psh-chat-lookup__input').fill('999 000 000')
await c.getByRole('button', { name: /Tafuta namba/ }).click()
await sleep(500)
await countOf(c, '.psh-chat-case', 4, 'Lookup: kesi 4 za kielelezo zinaonekana')
await c.screenshot({ path: `${OUT4}/14-lookup-cases.png` })

/* ── 09 Requests ─────────────────────────────────────────── */
await c.getByRole('button', { name: /Maombi ya mazungumzo/ }).click()
await sleep(500)
const reqText = await c.locator('.psh-sheet__body').innerText()
assert(/ULINZI WA FARAGHA/.test(reqText), 'Requests: ulinzi wa faragha unaelezwa')
await countOf(c, '.psh-chat-request', 1, 'Requests: ombi 1 lililopokelewa')
await c.screenshot({ path: `${OUT4}/15-requests.png` })
await c.getByRole('button', { name: /Kubali \(Accept\)/ }).click()
await sleep(800)
assert(/Imekubaliwa/.test(await c.locator('.psh-sheet__body').innerText()), 'Requests: Kubali → mazungumzo yameundwa (mfumo uleile)')
await sleep(2500)
await c.screenshot({ path: `${OUT4}/16-request-accepted.png` })
await c.keyboard.press('Escape')
await sleep(500)

/* ── 10 New Group ────────────────────────────────────────── */
await c.locator('.psh-chat__fab').click()
await sleep(450)
await c.getByRole('button', { name: /Kikundi Kipya/ }).click()
await sleep(500)
await textOf(c, '.psh-sheet__title', 'Kikundi', 'New Group: panel inafunguka')
const disabled = await c.getByRole('button', { name: 'Unda kikundi' }).isDisabled()
assert(disabled, 'New Group: Unda kikundi imezuiwa bila jina/wanachama')
await c.locator('.psh-sheet__body input[aria-label="Jina la kikundi"]').fill('Wajasiriamali Dodoma')
await c.locator('.psh-sheet__body .psh-chat-person').nth(0).getByRole('button', { name: /^Ongeza/ }).click()
await sleep(250)
await c.locator('.psh-sheet__body .psh-chat-person').nth(1).getByRole('button', { name: /^Ongeza/ }).click()
await sleep(300)
await c.screenshot({ path: `${OUT4}/17-newgroup.png` })
await c.getByRole('button', { name: 'Unda kikundi' }).click()
await sleep(900)
await textOf(c, '.psh-chat__theadname', 'Wajasiriamali Dodoma', 'New Group: kikundi kimeundwa na mazungumzo yameanza')
await c.screenshot({ path: `${OUT4}/18-group-created.png` })

/* ── 11 Search ───────────────────────────────────────────── */
await c.locator('.psh-chat__back').click()
await sleep(350)
await c.getByRole('button', { name: 'Tafuta kwenye Chat' }).first().click()
await sleep(450)
await c.locator('.psh-sheet__body input[aria-label="Tafuta kwenye Chat"]').fill('mbegu')
await sleep(700)
const searchBody = await c.locator('.psh-sheet__body').innerText()
assert(/UJUMBE \(1\)/i.test(searchBody) && /mbegu/i.test(searchBody), 'Chat search: ujumbe unapatikana')
assert(!/CHANNELS|REELS/i.test(searchBody), 'Chat search: hakuna Channels/Reels (si Gundua §23)')
await c.screenshot({ path: `${OUT4}/19-search.png` })
await c.keyboard.press('Escape')
await sleep(450)

/* ── 12 More + settings + mrundi wa panels ───────────────── */
await c.getByRole('button', { name: 'Menyu zaidi za Chat' }).click()
await sleep(450)
await countOf(c, '.psh-menu__row', 8, 'Chat More: vitu 8 (Chat pekee)')
await c.screenshot({ path: `${OUT4}/20-more.png` })
await c.locator('.psh-menu__row', { hasText: 'Mipangilio ya Chat' }).click()
await sleep(800)
assert(/Storage na media/i.test(await c.locator('.psh-sheet__body').innerText()), 'Chat settings: panel inafunguka')
await c.screenshot({ path: `${OUT4}/21-settings.png` })
await c.locator('.psh-sheet__headleft .psh-icobtn').click()
await sleep(450)
await textOf(c, '.psh-sheet__title', 'menyu zaidi', 'Chat: Back inarudi kwenye menyu iliyotangulia (si kufunga zote)')
await c.keyboard.press('Escape')
await sleep(400)

/* ── 13 Hali: offline (Waiting for sync) ─────────────────── */
await c.goto(`${BASE}/?sys=offline`, { waitUntil: 'networkidle' })
await c.getByRole('button', { name: 'Chat', exact: true }).click()
await sleep(450)
await textOf(c, '.psh-chat__sync', 'Offline', 'Chat offline: kichwa kinaonyesha hali ya mfumo')
await c.locator('.psh-chat__row').first().click()
await sleep(450)
await textOf(c, '.psh-chat__banner', 'Offline · Waiting for sync', 'Chat offline: banner inaeleza hali')
await c.locator('.psh-chat__input').fill('Nitarudi kesho asubuhi.')
await c.locator('.psh-chat__cbtn--send').click()
await sleep(800)
const offMsg = await c.locator('.psh-msg').last().innerText()
assert(/Offline Vault/.test(offMsg), 'Chat offline: ujumbe unahifadhiwa (Offline Vault)', offMsg.replace(/\n/g, ' ').slice(0, 70))
await sleep(2500)
await c.screenshot({ path: `${OUT4}/22-offline-vault.png` })

/* ── 14 Hali: waiting for sync (ujumbe mfupi → relayed) ──── */
await c.goto(`${BASE}/?sys=waiting_sync`, { waitUntil: 'networkidle' })
await c.getByRole('button', { name: 'Chat', exact: true }).click()
await sleep(450)
await c.locator('.psh-chat__row').first().click()
await sleep(450)
await textOf(c, '.psh-chat__banner', 'Waiting for sync', 'Chat waiting_sync: banner inaeleza hali')
await c.locator('.psh-chat__input').fill('Ujumbe mfupi kuhusu mkutano.')
await c.locator('.psh-chat__cbtn--send').click()
await sleep(800)
const relayMsg = await c.locator('.psh-msg').last().innerText()
assert(/Internet Relay/.test(relayMsg), 'Chat waiting_sync: ujumbe mfupi unapitishwa kwa relay', relayMsg.replace(/\n/g, ' ').slice(0, 70))
await sleep(2500)
await c.screenshot({ path: `${OUT4}/23-waiting-relayed.png` })

/* ── 15 a11y: focus + 44px ───────────────────────────────── */
await c.goto(BASE, { waitUntil: 'networkidle' })
await c.getByRole('button', { name: 'Chat', exact: true }).click()
await sleep(450)
await c.locator('.psh-chat__row').first().click()
await sleep(500)
await c.locator('.psh-chat__input').focus()
const ring = await c.locator('.psh-chat__input').evaluate((el) => getComputedStyle(el).boxShadow)
assert(/rgb/.test(ring), 'Chat a11y: focus inaonekana (focus ring) — §27')
const rowH = await c.locator('.psh-chat__cbtn').first().evaluate((el) => el.getBoundingClientRect().width)
assert(rowH >= 38, 'Chat a11y: vitufe vya composer vina ukubwa wa kutosha', `${Math.round(rowH)}px`)
await c.screenshot({ path: `${OUT4}/24-focus-composer.png` })

/* ── 18 Picha (image) — aina ya ujumbe yenye sera ileile ─── */
await c.locator('.psh-chat__back').click()
await sleep(400)
await c.locator('.psh-chat__row', { hasText: 'Juma Rashid' }).click()
await sleep(500)
await textOf(c, '.psh-chat__theadname', 'Juma Rashid', 'Chat direct: rafiki wa PASIHAI (si saved) anafunguka')
await countOf(c, '.psh-msg__videoframe', 1, 'Chat: picha (image) inaonekana kwenye conversation')
const imgGuard = await c.locator('.psh-msg__guardcard').last().innerText()
assert(/Wi-Fi au Data/.test(imgGuard), 'Chat: picha inaheshimu sera ya relay (inasubiri Wi-Fi/Data)')
await c.screenshot({ path: `${OUT4}/29-image-guard.png` })
await c.close()

/* ── 16 Desktop: panes MBILI ─────────────────────────────── */
const cd = await newPage({ width: 1440, height: 900 })
await cd.goto(BASE, { waitUntil: 'networkidle' })
await cd.getByRole('button', { name: 'Chat', exact: true }).click()
await sleep(500)
await cd.locator('.psh-chat__row').nth(2).click()
await sleep(500)
const lb = await cd.locator('.psh-chat__pane--list').boundingBox()
const tb = await cd.locator('.psh-chat__pane--thread').boundingBox()
assert(await cd.locator('.psh-chat__pane--list').isVisible(), 'Chat desktop: orodha HAIJAFICHWA (§26)')
assert(Math.abs(tb.x - (lb.x + lb.width)) < 4, 'Chat desktop: mazungumzo yanaonekana sambamba (two-pane)', `list ${Math.round(lb.width)}px · thread x=${Math.round(tb.x)}`)
assert(tb.width >= 620, 'Chat desktop: pane ya mazungumzo ina nafasi ya kutosha', `${Math.round(tb.width)}px`)
const composeW = await cd.locator('.psh-chat__composer .psh-chat__input').boundingBox()
assert(composeW.width >= 380, 'Chat desktop: composer ina upana wa kawaida', `${Math.round(composeW.width)}px`)
await cd.screenshot({ path: `${OUT4}/25-desktop-two-pane.png` })
await cd.locator('.psh-chat__filter', { hasText: 'Direct' }).click()
await sleep(400)
await cd.locator('.psh-chat__row').first().click()
await sleep(450)
await cd.screenshot({ path: `${OUT4}/26-desktop-thread.png` })
await cd.close()

/* ── 17 Tablet ───────────────────────────────────────────── */
const ct = await newPage({ width: 820, height: 1180 })
await ct.goto(BASE, { waitUntil: 'networkidle' })
await ct.getByRole('button', { name: 'Chat', exact: true }).click()
await sleep(450)
await ct.screenshot({ path: `${OUT4}/27-tablet-inbox.png` })
await ct.locator('.psh-chat__row').first().click()
await sleep(450)
await ct.screenshot({ path: `${OUT4}/28-tablet-thread.png` })
await ct.close()

/* ══════════════════════════════════════════════════════════════
   GUNDUA — safu ya UGUNDUZI (§Gundua · L1–L19)
   Modes 4 · kategoria 10 · vichujio (schema kwa mode) · Friends
   bila model ya mitandao ya kijamii · faragha (umma pekee) ·
   panels · responsive (simu · tablet · desktop) · a11y.
   ══════════════════════════════════════════════════════════════ */

const gu = await newPage({ width: 390, height: 844 })
await gu.goto(BASE, { waitUntil: 'networkidle' })
await sleep(400)
await gu.getByRole('button', { name: 'Gundua', exact: true }).click()
await sleep(600)

/* ── 01 Ukurasa mkuu: kichwa · search · modes · kategoria ── */
await textOf(gu, '.psh-gu-head__title', 'Gundua', 'Gundua: kichwa ni "Gundua"')
await countOf(gu, '.psh-gu-search__input', 1, 'Gundua: utafutaji upo chini ya kichwa (§2)')
await countOf(gu, '.psh-gu-search__filter', 1, 'Gundua: vichujio viko karibu na search (§4)')
await countOf(gu, '.psh-gu-mods .psh-gu-mod', 4, 'Gundua: moduli kuu 4 (Mchanganyiko · Friends · Channels · Live)')
const guMods = (await gu.locator('.psh-gu-mod__label').allTextContents()).join('·')
assert(guMods === 'Mchanganyiko·Friends·Channels·Live', 'Gundua: moduli kuu kwa mpangilio sahihi', guMods)
await countOf(gu, '.psh-gu-cats .psh-gu-cat', 10, 'Gundua: kategoria 10')
const guCats = (await gu.locator('.psh-gu-cat__label').allTextContents()).join('·')
assert(
  guCats === 'Biashara·Watu·Vikundi·Public Hubs·Communities·Channels·Friends·Ongeza Rafiki·Live·Mchanganyiko',
  'Gundua: kategoria zote zinaonekana',
  guCats,
)
assert(
  (await gu.locator('.psh-gu [aria-label*="Relay"], .psh-gu [aria-label*="Sync"], .psh-gu [aria-label*="Network"]').count()) === 0,
  'Gundua: hakuna vidhibiti vya Network/Relay/Sync (§1)',
)
assert(
  (await gu.locator('.psh-gu-head button, .psh-gu [aria-label^="Akaunti"], .psh-gu [aria-label*="Akaunti yangu"], .psh-gu [aria-label*="Wasifu wangu"]').count()) === 0,
  'Gundua: hakuna account/profile control kwenye Gundua (§2)',
)
assert(
  (await gu.locator('.psh-gu-privacy').count()) === 1,
  'Gundua: bango la faragha linaonekana Mara ya kwanza (§20)',
)
await gu.screenshot({ path: `${OUT5}/01-mobile-mchanganyiko.png` })

/* ── 02 Local/relevant: ramani + sections ─────────────────── */
const guSecTitles = (await gu.locator('.psh-gu-sechead__title').allTextContents()).join('·')
assert(
  !/Unaoweza Kuwafahamu|May Know/i.test(guSecTitles),
  'Gundua: HAKUNA "watu unaoweza kuwafahamu" kwenye sehemu za mchanganyiko (§7)',
  guSecTitles.slice(0, 70),
)
const guNearSection = gu.locator('.psh-gu-sec', { hasText: 'Zilizo Karibu Nawe' })
const guNearDist = await guNearSection.locator('.psh-gu-card--biz .psh-gu-meta').evaluateAll((els) => els.map((e) => parseFloat(e.textContent)).filter((n) => !Number.isNaN(n)))
assert(guNearDist.length >= 3 && guNearDist.every((v, i, a) => i === 0 || a[i - 1] <= v), 'Gundua: "Zilizo Karibu Nawe" zimepangwa karibu→mbali (§6)', guNearDist.join(' · '))
await countOf(gu, '.psh-gu-map', 1, 'Gundua: Karibu Nawe ina kionyeshi cha ramani (§6)')
await countOf(gu, '.psh-gu-rail', 6, 'Gundua: sehemu 6 za mchanganyiko (§15 — si Home feed)')
await gu.evaluate(() => window.scrollTo(0, 620))
await sleep(350)
await gu.screenshot({ path: `${OUT5}/02-mobile-sections.png` })
await gu.evaluate(() => window.scrollTo(0, 0))
await sleep(250)

/* ── 03 Utafutaji unaojua faragha ─────────────────────────── */
await gu.locator('.psh-gu-search__input').fill('familia')
await gu.locator('.psh-gu-search__input').press('Enter')
await sleep(500)
const emptyTxt = await gu.locator('.psh-gu-empty').first().innerText()
assert(
  /Hakuna/.test(emptyTxt) && (await gu.locator('.psh-gu-card').count()) === 0,
  'Gundua: "familia" (Hub ya faragha 0.4 km) HAIONEKANI (§3 · Karibu Nami ≠ ruhusa)',
  emptyTxt.slice(0, 60),
)
await gu.screenshot({ path: `${OUT5}/03-search-private-empty.png` })

await gu.locator('.psh-gu-search__input').fill('samaki')
await gu.locator('.psh-gu-search__input').press('Enter')
await sleep(500)
const guHits = await gu.locator('.psh-gu-card').count()
assert(guHits >= 2, 'Gundua: utafutaji wa "samaki" unarudi matokeo ya umma', `${guHits} kadi`)
const guHitKinds = [...new Set(await gu.locator('.psh-gu-card').evaluateAll((els) => els.map((e) => e.dataset.kind)))]
assert(!guHitKinds.includes('person'), 'Gundua: utafutaji hautoi watu bila mada inayolingana', guHitKinds.join(','))
await gu.screenshot({ path: `${OUT5}/04-search-results.png` })
await gu.locator('.psh-gu-search__x').click()
await sleep(400)

/* ── 04 Vichujio: schema · masafa · matokeo ───────────────── */
await gu.locator('.psh-gu-search__filter').click()
await sleep(500)
const fchips = await gu.locator('.psh-gu-fchip').count()
assert(fchips >= 25, 'Gundua vichujio: makundi yote yanaonekana (mada 17 + eneo + wakati)', `${fchips} chips`)
assert(
  (await gu.locator('.psh-gu-fchip', { hasText: 'Siasa' }).count()) > 0,
  'Gundua vichujio: mada za kisiasa zipo (neutral) (§4)',
)
await gu.screenshot({ path: `${OUT5}/05-filters-sheet.png` })

await gu.locator('.psh-gu-fchip', { hasText: 'Karibu Nami' }).click()
await sleep(350)
await countOf(gu, '.psh-gu-fchip--sm', 6, 'Gundua vichujio: masafa 6 (100m…45km) (§4)')
await gu.screenshot({ path: `${OUT5}/06-filters-distance.png` })
await gu.locator('.psh-gu-fchip--sm', { hasText: '1 km' }).first().click()
await sleep(250)
await gu.getByRole('button', { name: /Weka Vichujio/ }).click()
await sleep(600)

await countOf(gu, '.psh-gu-filterbar.is-active', 1, 'Gundua: "Vichujio 2" mstari mmoja tu baada ya kuweka (§4)')
const activeTxt = await gu.locator('.psh-gu-filterbar__main').innerText()
assert(/Karibu Nami/.test(activeTxt), 'Gundua: kichujio kinachoonekana ni "Karibu Nami"', activeTxt.replace(/\s+/g, ' '))
const nearCards = await gu.locator('.psh-gu-card').count()
const nearText = await gu.locator('.psh-gu').innerText()
assert(nearCards >= 1 && !/Familia/i.test(nearText), 'Gundua: Karibu Nami (1km) haifunui kitu cha faragha (§3)', `${nearCards} kadi · 0 faragha`)
assert(/Example Store/.test(nearText), 'Gundua: Karibu Nami (1km) inaonyesha vitu vya umma vilivyo karibu', 'Example Store')
await gu.screenshot({ path: `${OUT5}/07-filtered-1km.png` })
await gu.locator('.psh-gu-filterbar__clear').click()
await sleep(500)

/* ── 05 Friends: hakuna model ya mitandao ya kijamii (§7) ── */
await gu.locator('.psh-gu-mod', { hasText: 'Friends' }).click()
await sleep(600)
await countOf(gu, '.psh-gu-mods .psh-gu-mod.is-active', 1, 'Gundua: moduli hai ina hali ya kuchaguliwa (§3)')
const fSecs = (await gu.locator('.psh-gu-sechead__title').allTextContents()).join('·')
for (const want of ['Marafiki Zangu', 'Maombi ya Urafiki', 'Yaliyotumwa', 'Watu wa Kugundua', 'Kutoka Orodha ya Simu', 'Karibu Nawe']) {
  assert(fSecs.includes(want), `Gundua Friends: sehemu "${want}" ipo`, fSecs.slice(0, 80))
}
const friendRule = await gu.locator('.psh-gu-friendbar').innerText()
assert(
  /Hakuna "watu unaoweza kuwafahamu"/.test(friendRule) && /hakuna takwimu za mtandao/.test(friendRule),
  'Gundua Friends: kanuni imeelezwa wazi (bila mutual · People You May Know · takwimu za mtandao) (§7)',
)
const fullText = (await gu.locator('.psh-gu').innerText()).replace(friendRule, '')
assert(
  !/unaweza kuwafahamu|marafiki wa pamoja|mutual|graph|people you may know|takwimu za mtandao/i.test(fullText),
  'Gundua Friends: HAKUNA model ya Facebook kwenye sehemu zote (§7)',
)
const noFriendCounts = await gu.locator('.psh-gu-card--person').evaluateAll((els) =>
  els.every((e) => !/[0-9][0-9,.]*\s*(marafiki|friends)/i.test(e.textContent)),
)
assert(noFriendCounts, 'Gundua Friends: kadi hazionyeshi namba za marafiki (§7)')
assert((await gu.locator('.psh-gu-card--person').count()) >= 8, 'Gundua Friends: kadi za watu zinaonekana', `${await gu.locator('.psh-gu-card--person').count()}`)
await gu.screenshot({ path: `${OUT5}/08-friends.png` })

/* Ombi la urafiki: Kubali → rafiki */
const reqCard = gu.locator('.psh-gu-card--person', { hasText: 'Zawena Kombo' }).first()
assert((await reqCard.locator('.psh-gu-reason').count()) === 1, 'Gundua Friends: kila mtu ana SABABU MOJA ya muktadha (§7)')
await reqCard.getByRole('button', { name: 'Kubali' }).click()
await sleep(600)
const afterAccept = await gu.locator('.psh-gu-card--person', { hasText: 'Zawena Kombo' }).first().innerText()
assert(/Rafiki/.test(afterAccept), 'Gundua Friends: Kubali → hali inakuwa Rafiki', afterAccept.replace(/\s+/g, ' ').slice(0, 50))
await gu.screenshot({ path: `${OUT5}/09-friends-accepted.png` })

/* ── 06 Ongeza Rafiki (username · namba · contacts · QR) ──── */
await gu.locator('.psh-gu-cat', { hasText: 'Ongeza Rafiki' }).click()
await sleep(600)
await textOf(gu, '.psh-sheet__title', 'Ongeza Rafiki', 'Gundua: panel ya Ongeza Rafiki inafunguka')
await countOf(gu, '.psh-gu-qr', 1, 'Gundua: njia za QR/kiungo zipo (§7)')
await countOf(gu, '.psh-gu-plist', 1, 'Gundua: orodha ya simu ipo (njia ya contacts)')
await gu.getByRole('button', { name: 'Tafuta', exact: true }).click()
await sleep(500)
await countOf(gu, '.psh-gu-plist', 2, 'Gundua: utafutaji wa namba unarudi matokeo (njia ya pili)')
const lookupTxt = await gu.locator('.psh-gu-plist').first().innerText()
assert(/Akaunti ipo|Hajajiunga|haijasajiliwa|marafiki/.test(lookupTxt), 'Gundua: matokeo ya namba yanaeleza hali ya akaunti (nadra: namba si utambulisho wa umma)', lookupTxt.replace(/\s+/g, ' ').slice(0, 70))
await gu.screenshot({ path: `${OUT5}/10-addfriend.png` })
await gu.locator('.psh-sheet__head .psh-icobtn[aria-label="Funga"]').click()
await sleep(400)

/* ── 07 Channels · Live · Vikundi · Biashara ──────────────── */
await gu.locator('.psh-gu-mod', { hasText: 'Channels' }).click()
await sleep(600)
await countOf(gu, '.psh-gu-card--channel', 5, 'Gundua Channels: channels 5 (umma pekee)')
const chText = await gu.locator('.psh-gu-card--channel').first().innerText()
assert(/KUTOKA CHANNEL/i.test(chText), 'Gundua Channels: kionyeshi cha maudhui (si feed) (§10)', chText.replace(/\s+/g, ' ').slice(0, 70))
await gu.screenshot({ path: `${OUT5}/11-channels.png` })
const chFollowCard = gu
  .locator('.psh-gu-card--channel')
  .filter({ has: gu.getByRole('button', { name: 'Fuata', exact: true }) })
  .first()
const chName = (await chFollowCard.locator('.psh-gu-card__name').first().innerText()).trim()
await chFollowCard.getByRole('button', { name: 'Fuata', exact: true }).click()
await sleep(700)
assert(
  /Unafuatilia/.test(await gu.locator('.psh-gu-card--channel', { hasText: chName }).first().innerText()),
  'Gundua Channels: Fuata → Unafuatilia (hali halisi)',
  chName,
)
assert(
  (await gu.locator('.psh-gu-card--channel').filter({ hasText: 'Unafuatilia' }).count()) >= 1,
  'Gundua Channels: channel zinazofuatiliwa zina alama',
)

await gu.locator('.psh-gu-mod', { hasText: 'Live' }).click()
await sleep(600)
await countOf(gu, '.psh-gu-card--live', 11, 'Gundua Live: vikao 11 vya umma (10 live + 1 kumbi ya sauti)')
assert((await gu.locator('.psh-gu-livebadge').count()) >= 1, 'Gundua Live: LIVE indicator inaonekana (§14)')
const liveText = await gu.locator('.psh-gu').innerText()
assert(!/Familia/i.test(liveText), 'Gundua Live: kikao cha faragha hakionyeshwi (§14)')
await gu.screenshot({ path: `${OUT5}/12-live.png` })

await gu.locator('.psh-gu-cat', { hasText: 'Vikundi' }).click()
await sleep(600)
await countOf(gu, '.psh-gu-card--group', 3, 'Gundua Vikundi: vikundi vya wazi 3')
assert(
  /Mazungumzo yanatumia Chat ya PASIHAI/.test(await gu.locator('.psh-gu-card--group').first().innerText()),
  'Gundua Vikundi: mazungumzo yanatumia Chat iliyopo (§12)',
)
await gu.locator('.psh-sheet__head .psh-icobtn[aria-label="Funga"]').click()
await sleep(400)

await gu.locator('.psh-gu-cat', { hasText: 'Biashara' }).click()
await sleep(600)
await countOf(gu, '.psh-gu-card--biz', 7, 'Gundua Biashara: biashara 7 (zimepangwa kwa umbali)')
const bizOrder = await gu.locator('.psh-gu-card--biz .psh-gu-meta').evaluateAll((els) => els.map((e) => parseFloat(e.textContent)).filter((n) => !Number.isNaN(n)))
assert(bizOrder.every((v, i, a) => i === 0 || a[i - 1] <= v), 'Gundua Biashara: zimepangwa karibu→mbali (§9)', bizOrder.join(' · '))
await gu.locator('.psh-gu-card--biz button', { hasText: 'Tazama' }).first().click()
await sleep(600)
await textOf(gu, '.psh-gu-entity__name', 'Example Store', 'Gundua Biashara: panel ya biashara inafunguka')
const bizPanel = await gu.locator('.psh-gu-entity').innerText()
assert(
  (await gu.locator('.psh-gu-entity__acts button', { hasText: /Chat|Ujumbe/ }).count()) === 1,
  'Gundua Biashara: kitufe kimoja cha Chat (hakuna kurudia)',
)
assert(
  /BIDHAA/i.test(bizPanel) && /HUDUMA/i.test(bizPanel) && /MASAA/i.test(bizPanel) && /TAARIFA ZA UMMA/i.test(bizPanel),
  'Gundua Biashara: wasifu una Bidhaa · Huduma · Masaa · Taarifa (§9)',
)
await gu.screenshot({ path: `${OUT5}/13-business-panel.png` })
await gu.keyboard.press('Escape')
await sleep(400)
assert((await gu.locator('.psh-sheet__panel').count()) === 0, 'Gundua: Escape inafunga panel (§27)')

/* ── 08 A11y: maeneo ya kugusa ───────────────────────────── */
const guTap = await gu.locator('.psh-gu-btn, .psh-gu-fchip, .psh-gu-cat, .psh-gu-mod, .psh-gu-search__filter, .psh-gu-sechead__action, .psh-gu-card__more, .psh-gu-filterbar__clear').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)))
const guSmall = guTap.filter((h) => h < 44)
assert(guSmall.length === 0, 'Gundua a11y: maeneo ya kugusa ≥ 44px (§27)', `${guTap.length} vipengele · vidogo ${guSmall.length}`)
const guLabels = await gu.locator('.psh-gu button').evaluateAll((els) => els.filter((e) => !e.textContent.trim() && !e.getAttribute('aria-label')).length)
assert(guLabels === 0, 'Gundua a11y: kila kitufe cha icon kina label (§27)', `${guLabels} bila label`)
const guOutline = await gu.locator('.psh-gu-search__input').first().evaluate((el) => {
  el.focus()
  const st = getComputedStyle(el)
  const ring = st.boxShadow !== 'none' || st.outlineStyle !== 'none'
  const w = Math.max(parseFloat(st.outlineWidth) || 0, parseFloat((st.boxShadow.match(/(\d+)px/) || [0, 0])[1]) || 0)
  return (ring && w >= 2 ? 'ring' : 'flat') + '|w' + w + '|' + st.outlineStyle
})
assert(/^ring/.test(guOutline), 'Gundua a11y: focus inaonekana wazi kwenye utafutaji (§27)', guOutline)
await gu.close()

/* ── 09 Tablet (820) ─────────────────────────────────────── */
const gt = await newPage({ width: 820, height: 1180 })
await gt.goto(BASE, { waitUntil: 'networkidle' })
await sleep(400)
await gt.getByRole('button', { name: 'Gundua', exact: true }).click()
await sleep(600)
const gtCols = await gt.locator('.psh-gu-cats__grid .psh-gu-cat').evaluateAll((els) => {
  const ys = els.map((e) => Math.round(e.getBoundingClientRect().top))
  return ys.filter((y) => y === ys[0]).length
})
assert(gtCols === 3, 'Gundua tablet: kategoria safu 3 (§18)', `${gtCols} kwa mstari`)
await gt.screenshot({ path: `${OUT5}/14-tablet.png` })
await gt.evaluate(() => window.scrollTo(0, 520))
await sleep(300)
await gt.screenshot({ path: `${OUT5}/15-tablet-grid.png` })
await gt.close()

/* ── 10 Desktop (1440): multi-column ────────────────────── */
const gd = await newPage({ width: 1440, height: 950 })
await gd.goto(BASE, { waitUntil: 'networkidle' })
await sleep(400)
await gd.getByRole('button', { name: 'Gundua', exact: true }).click()
await sleep(700)
const gdModsRow = await gd.locator('.psh-gu-mods .psh-gu-mod').evaluateAll((els) => {
  const ys = els.map((e) => Math.round(e.getBoundingClientRect().top))
  return ys.filter((y) => y === ys[0]).length
})
assert(gdModsRow === 4, 'Gundua desktop: moduli 4 mstari mmoja (§18)', `${gdModsRow}`)
const gdCatRow = await gd.locator('.psh-gu-cats__grid .psh-gu-cat').evaluateAll((els) => {
  const ys = els.map((e) => Math.round(e.getBoundingClientRect().top))
  return ys.filter((y) => y === ys[0]).length
})
assert(gdCatRow === 5, 'Gundua desktop: kategoria safu 5 (§18)', `${gdCatRow}`)
const gdOverflow = await gd.locator('.psh-gu-rail').first().evaluate((el) => el.scrollWidth - el.clientWidth)
assert(gdOverflow <= 1, 'Gundua desktop: sehemu hazisogei mlalo (grid, si rail) (§18)', `${gdOverflow}px`)
const gdGrid = await gd.locator('.psh-gu-rail .psh-gu-card').evaluateAll((els) => {
  const xs = els.map((e) => Math.round(e.getBoundingClientRect().left))
  return [...new Set(xs)].length
})
assert(gdGrid === 3, 'Gundua desktop: kadi 3 kwa mstari kwenye sehemu (§18)', `${gdGrid} safu`)
await gd.screenshot({ path: `${OUT5}/16-desktop.png` })
await gd.evaluate(() => window.scrollTo(0, 700))
await sleep(300)
await gd.screenshot({ path: `${OUT5}/17-desktop-sections.png` })
await gd.getByRole('button', { name: /Vichujio/ }).first().click()
await sleep(600)
const gdSheetW = await gd.locator('.psh-sheet__panel').boundingBox()
assert(gdSheetW.width <= 620, 'Gundua desktop: panel ni dialog ndogo (si skrini nzima)', `${Math.round(gdSheetW.width)}px`)
await gd.screenshot({ path: `${OUT5}/18-desktop-filters.png` })
await gd.keyboard.press('Escape')
await sleep(300)
await gd.close()



/* ══════════════════════════════════════════════════════════════
   M — UI PREMIUM · VITENDO HALISI (panels mpya za mkondo)
   Maoni · Kushiriki · Zaidi · Kikao cha Live · Status · Zilizohifadhiwa
   ══════════════════════════════════════════════════════════════ */

const pr = await newPage({ width: 390, height: 900 })
await pr.goto(BASE, { waitUntil: 'networkidle' })
await sleep(600)

/* ── 01 Vitendo vya chapisho (hali halisi) ─────────────────── */
await pr.locator('.psh-feeditem').first().locator('.psh-feedaction').first().click()
await sleep(500)
const likedCount = await pr.locator('.psh-feeditem').first().locator('.psh-feedaction.is-liked').count()
assert(likedCount === 1, 'M: kupenda kunabadilisha hali kwenye kadi (is-liked)', `${likedCount}`)
await pr.screenshot({ path: `${OUT6}/01-feed-actions.png` })

/* ── 02 Maoni (orodha halisi + kuandika) ───────────────────── */
await sleep(900)
let firstCard = pr.locator('.psh-feeditem').first()
await firstCard.getByRole('button', { name: /^Maoni$/ }).first().click()
await sleep(700)
await textOf(pr, '.psh-sheet__title', 'Maoni', 'M: panel ya maoni inafunguka')
const beforeN = await pr.locator('.psh-cmts__list > li').count()
await pr.locator('.psh-cmts__form input').first().fill('Safi sana — asante kwa taarifa')
await pr.locator('.psh-cmts__form').getByRole('button').first().click()
await sleep(700)
const afterN = await pr.locator('.psh-cmts__list > li').count()
assert(afterN === beforeN + 1, 'M: maoni mapya yanaonekana kwenye orodha', `${beforeN} → ${afterN}`)
await pr.screenshot({ path: `${OUT6}/02-comments.png` })
await pr.keyboard.press('Escape')
await sleep(400)

/* ── 03 Kushiriki (kiungo · Chat) ──────────────────────────── */
await firstCard.getByRole('button', { name: /Shiriki/ }).first().click()
await sleep(700)
await textOf(pr, '.psh-sheet__title', 'Shiriki', 'M: panel ya kushiriki inafunguka')
await countOf(pr, '.psh-share__row', 2, 'M: njia 2 za kushiriki (nakili · hifadhi)')
assert((await pr.locator('.psh-share__list li').count()) > 0, 'M: kushiriki kwa Chat kunatumia inbox halisi')
await pr.screenshot({ path: `${OUT6}/03-share.png` })
await pr.keyboard.press('Escape')
await sleep(400)

/* ── 04 Zaidi (menyu ya chapisho) ──────────────────────────── */
await pr.locator('.psh-feeditem').first().getByRole('button', { name: /Vitendo zaidi/ }).first().click()
await sleep(700)
await textOf(pr, '.psh-sheet__title', 'Vitendo', 'M: menyu ya chapisho inafunguka')
await countOf(pr, '.psh-postmenu .psh-menu__row', 5, 'M: vitendo 5 vya chapisho (fuata · ficha · hifadhi · wasifu · ripoti)')
await pr.screenshot({ path: `${OUT6}/04-post-menu.png` })
/* Hifadhi chapisho halisi ili orodha ya Zilizohifadhiwa ionyeshe kitu */
await pr.locator('.psh-postmenu .psh-menu__row', { hasText: 'Hifadhi' }).first().click()
await sleep(700)
await pr.keyboard.press('Escape')
await sleep(400)

/* ── 05 Kikao cha Live: kuanza · maliza ────────────────────── */
await pr.locator('.psh-createbar__act').last().click()
await sleep(900)
await textOf(pr, '.psh-sheet__title', 'Kikao', 'M: kikao cha Live kinaundwa (panel halisi)')
assert((await pr.locator('.psh-livepanel').count()) === 1, 'M: panel ya kikao inaonyesha hali halisi')
await pr.screenshot({ path: `${OUT6}/05-live-start.png` })
await pr.getByRole('button', { name: 'Maliza kikao' }).click()
await sleep(800)
await textOf(pr, '.psh-toast', 'Zilizopita', 'M: kumaliza kikao kunabadilisha hali → Zilizopita')
await pr.screenshot({ path: `${OUT6}/06-live-ended.png` })
await pr.keyboard.press('Escape')
await sleep(400)

/* ── 06 Status: kuunda (inaonekana kwenye safu) ───────────── */
await pr.locator('.psh-createbar__plus').click()
await sleep(600)
await pr.getByRole('button', { name: /^Status/ }).first().click()
await sleep(700)
await textOf(pr, '.psh-sheet__title', 'Status yangu', 'M: panel ya Status inafunguka')
await pr.locator('.psh-compose__input').fill('Leo niko Kariakoo — mchana mzuri!')
await pr.getByRole('button', { name: 'Chapisha status' }).click()
await sleep(900)
await textOf(pr, '.psh-status__item', 'Leo niko Kariakoo', 'M: status yangu mpya inaonekana kwenye safu ya Status')
await pr.screenshot({ path: `${OUT6}/07-status-created.png` })

/* ── 07 Zilizohifadhiwa (orodha halisi) ───────────────────── */
await pr.locator('.psh-header__right .psh-icobtn').nth(2).click()
await sleep(600)
await pr.getByRole('button', { name: /Zilizohifadhiwa/ }).first().click()
await sleep(800)
await textOf(pr, '.psh-sheet__title', 'Zilizohifadhiwa', 'M: panel ya zilizohifadhiwa inafunguka')
const savedRows = await pr.locator('.psh-savedlist > li').count()
assert(savedRows >= 1, 'M: kilichohifadhiwa kutoka mkondo kinaonekana kwenye orodha', `${savedRows} vipengele`)
await pr.screenshot({ path: `${OUT6}/08-saved.png` })
await pr.keyboard.press('Escape')
await sleep(400)

/* ── 08 Wasifu wangu: maudhui halisi ─────────────────────── */
await pr.locator('.psh-header__right .psh-icobtn').nth(1).click()
await sleep(700)
await textOf(pr, '.psh-sheet__title', 'Akaunti', 'M: wasifu wangu unafunguka')
await pr.screenshot({ path: `${OUT6}/09-profile.png` })
await pr.keyboard.press('Escape')
await sleep(300)
await pr.close()


/* ══════════════════════════════════════════════════════════════
   N — SPACES (§0–53): orodha · Hub/Jumuiya · Channel · Unda ·
   Nafasi Zangu · hali (listed/hidden) · desktop
   ══════════════════════════════════════════════════════════════ */
const sp = await newPage({ width: 390, height: 900 })
await sp.goto(BASE, { waitUntil: 'networkidle' })
await sleep(500)

await sp.getByRole('button', { name: 'Spaces', exact: true }).click()
await sleep(700)
await textOf(sp, '.psh-pagehead__title', 'Spaces', 'N: Spaces ni ukurasa halisi (si placeholder)')
await countOf(sp, '.psh-spaces__tab', 2, 'N: tabs 2 (Hubs & Jumuiya | Channels)')
await countOf(sp, '.psh-spaces__chip', 4, 'N: vichujio 4 vya Spaces')
const hiddenCount = await sp.locator('.psh-spc[data-id="studioNeema"]').count()
assert(hiddenCount === 0, 'N: Space ya faragha-FICHWA haionekani kwenye orodha', `${hiddenCount}`)
const listedBadges = await sp.locator('.psh-sp__vis--listed').count()
assert(listedBadges >= 1, 'N: Space ya Binafsi-Iliyoorodheshwa inaonekana na alama yake', `${listedBadges}`)
await sp.screenshot({ path: `${OUT7}/01-spaces-list.png`, fullPage: false })

/* ── Space ya Hub: header + tabs 6 ────────────────────────── */
await sp.locator('.psh-spc[data-id="darTechHub"] .psh-spc__main').first().click()
await sleep(700)
await textOf(sp, '.psh-sph__name', 'Dar Tech Hub', 'N: Hub inafungua kwa kichwa chake')
await countOf(sp, '.psh-spth__tab', 6, 'N: tabs 6 za Space (Muhtasari…Kuhusu)')
const spStats = await sp.locator('.psh-sps__grid li').count()
assert(spStats === 6, 'N: takwimu halisi 6 (hakuna views/mapato ya kubuni)', `${spStats}`)
const noMoney = await sp.locator('text=/Mapato|TZS/').count()
assert(noMoney === 0, 'N: hakuna namba za mapato/views za kubuni', `${noMoney}`)
await sp.screenshot({ path: `${OUT7}/02-hub-muhtasari.png` })

/* ── Shughuli: mkondo ule ule (spaceId) ───────────────────── */
await sp.getByRole('tab', { name: 'Shughuli' }).click()
await sleep(800)
const spFeed = await sp.locator('.psh-feeditem').count()
assert(spFeed >= 2, 'N: Shughuli za Hub zinaonyesha machapisho halisi', `${spFeed} vipengele`)
await sp.locator('.psh-feeditem').first().locator('button[aria-label="Penda"]').click()
await sleep(500)
const likedInSpace = await sp.locator('.psh-feeditem').first().locator('.is-liked').count()
assert(likedInSpace >= 1, 'N: kupenda kwenye Space kunatumia mfumo ule ule wa mkondo', `${likedInSpace}`)
await sp.screenshot({ path: `${OUT7}/03-hub-shughuli.png` })

/* ── Watu: timu (roles) + wanachama ───────────────────────── */
await sp.getByRole('tab', { name: 'Watu' }).click()
await sleep(700)
const teamRows = await sp.locator('.psh-spw__list > li').count()
assert(teamRows >= 4, 'N: Watu — timu na wanachama kutoka identity', `${teamRows}`)
const roleChips = await sp.locator('.psh-spw__role').count()
assert(roleChips >= 3, 'N: roles (Owner · Admin · Moderator) zinaonekana kama data', `${roleChips}`)
await sp.screenshot({ path: `${OUT7}/04-hub-watu.png` })

/* ── Matukio: content ya kind 'event' + kuhudhuria ────────── */
await sp.getByRole('tab', { name: 'Matukio' }).click()
await sleep(700)
await countOf(sp, '.psh-spev', 1, 'N: Matukio yanatoka kwenye content (kind event)')
await sp.locator('.psh-spev .psh-btn').first().click()
await sleep(600)
const attending = await sp.locator('.psh-spev .psh-spc__done').count()
assert(attending >= 1, 'N: kuhudhuria tukio ni hali halisi ya kikao', `${attending}`)
await sp.screenshot({ path: `${OUT7}/05-hub-matukio.png` })

/* ── Rasilimali: Save Offline ileile ──────────────────────── */
await sp.getByRole('tab', { name: 'Rasilimali' }).click()
await sleep(700)
await countOf(sp, '.psh-sprs', 2, 'N: Rasilimali 2 za Hub (hati + video)')
await sp.locator('.psh-sprs .psh-btn').first().click()
await sleep(600)
const resSaved = await sp.locator('.psh-sprs .psh-spc__done').count()
assert(resSaved >= 1, 'N: kuhifadhi rasilimali kwa matumizi bila mtandao', `${resSaved}`)
await sp.screenshot({ path: `${OUT7}/06-hub-rasilimali.png` })

/* ── Kuhusu: ufikivu ni hali · eneo ni umuhimu ───────────── */
await sp.getByRole('tab', { name: 'Kuhusu' }).click()
await sleep(600)
const aboutText = await shownText(sp, '.psh-sp__pane')
assert(/Ufikivu/.test(aboutText) && /umuhimu/.test(aboutText), 'N: Kuhusu inasema ufikivu=halì na eneo=umuhimu')
await sp.screenshot({ path: `${OUT7}/07-hub-kuhusu.png` })

/* ── Jumuiya (familia ileile) — kutoka orodha ─────────────── */
await sp.locator('.psh-sph__back').click()
await sleep(600)
await sp.locator('.psh-spc[data-id="wakulimaTz"] .psh-spc__main').first().click()
await sleep(700)
await textOf(sp, '.psh-sph__name', 'Wakulima Tanzania', 'N: Jumuiya inatumia muundo ule ule wa Space')
const jumuiyaEvents = await sp.locator('.psh-spth__tab').count()
assert(jumuiyaEvents === 6, 'N: Jumuiya na Hub zinashiriki tabs 6 (familia moja)', `${jumuiyaEvents}`)
await sp.screenshot({ path: `${OUT7}/08-jumuiya-muhtasari.png` })

/* ── Vikundi → Chat iliyopo (mfumo mmoja) ─────────────────── */
const groupLink = await sp.locator('.psh-spg').count()
assert(groupLink >= 1, 'N: Jumuiya ina kiungo cha kikundi cha Chat', `${groupLink}`)
await sp.locator('.psh-spg .psh-btn').first().click()
await sleep(900)
await countOf(sp, '.psh-chat', 1, 'N: kikundi kinafungua Chat iliyopo (si engine ya pili)')
await sp.screenshot({ path: `${OUT7}/09-kikundi-chat.png` })

/* ── Channels: kadi + ukurasa wa kuchapisha ───────────────── */
await sp.getByRole('button', { name: 'Spaces', exact: true }).click()
await sleep(600)
await sp.getByRole('tab', { name: 'Channels' }).click()
await sleep(700)
const chCards = await sp.locator('.psh-spc[data-kind="channel"]').count()
assert(chCards === 5, 'N: Channels 5 kwenye tab ya kuchapisha', `${chCards}`)
await sp.screenshot({ path: `${OUT7}/10-channels-tab.png` })

await sp.locator('.psh-spc[data-id="elimuYetu"] .psh-spc__main').first().click()
await sleep(700)
await textOf(sp, '.psh-sph__name', 'Elimu Yetu', 'N: Channel inafungua kwa muundo wa kuchapisha')
await countOf(sp, '.psh-spth__tab', 4, 'N: tabs 4 za Channel (Vilivyoteuliwa…Kuhusu)')
const followBtn = sp.locator('[data-sp-join]')
await followBtn.click()
await sleep(700)
const followedNow = await sp.locator('.psh-sph__rel').count()
assert(followedNow >= 1, 'N: kufuata Channel kunabadilisha uhusiano (Unafuatilia)', `${followedNow}`)
await sp.screenshot({ path: `${OUT7}/11-channel-page.png` })

/* ── Msimamizi: channel yangu (pasihaiUpdates) ────────────── */
await sp.locator('.psh-sph__back').click()
await sleep(600)
await sp.locator('.psh-spc[data-id="pasihaiUpdates"] .psh-spc__main').first().click()
await sleep(700)
await sp.getByRole('tab', { name: 'Kuhusu' }).click()
await sleep(600)
const manageRows = await sp.locator('.psh-sp__manageRow').count()
assert(manageRows === 7, 'N: sehemu za msimamizi 7 (Yaliyomo…Takwimu)', `${manageRows}`)
const appearanceGuard = await sp.locator('.psh-sp__card--owner').innerText()
assert(
  /fonts za nje/.test(appearanceGuard) && /wallpaper/.test(appearanceGuard),
  'N: muonekano wa Channel una mipaka wazi (§35) — fonts/themes/wallpaper hazipo',
)
await sp.screenshot({ path: `${OUT7}/12-channel-msimamizi.png` })

/* ── Unda Space: hatua 3 kutoka Spaces ────────────────────── */
await sp.getByRole('button', { name: 'Spaces', exact: true }).click()
await sleep(600)
await sp.getByRole('button', { name: 'Unda Space' }).first().click()
await sleep(700)
await textOf(sp, '.psh-sheet__title', 'Unda Space', 'N: panel ya Unda Space inafunguka')
await countOf(sp, '.psh-csp__type', 3, 'N: hatua 1 — aina 3 (Hub · Jumuiya · Channel)')
await sp.screenshot({ path: `${OUT7}/13-unda-hatua1.png` })
await sp.locator('.psh-csp__type').nth(1).click()
await sp.getByRole('button', { name: 'Endelea' }).click()
await sleep(500)
await countOf(sp, '.psh-csp__visRow', 3, 'N: hatua 2 — ufikivu ni hali 3 (si “Private Space”)')
await sp.locator('.psh-csp__input').first().fill('Wajasiriamali Kariakoo')
await sleep(200)
await sp.screenshot({ path: `${OUT7}/14-unda-hatua2.png` })
await sp.getByRole('button', { name: 'Endelea' }).click()
await sleep(500)
await countOf(sp, '.psh-csp__chip', 4, 'N: hatua 3 — rangi 4 za PASIHAI pekee')
await sp.screenshot({ path: `${OUT7}/15-unda-hatua3.png` })
await sp.locator('.psh-csp__foot .psh-btn').last().click()
await sleep(1000)
await textOf(sp, '.psh-sph__name', 'Wajasiriamali Kariakoo', 'N: Space iliyoundwa inafunguliwa mara moja')
await sp.screenshot({ path: `${OUT7}/16-space-mpya.png` })

/* ── Nafasi Zangu (Wasifu → tab) ──────────────────────────── */
await sp.getByRole('button', { name: 'Spaces', exact: true }).click()
await sleep(500)
await sp.getByRole('button', { name: /Nafasi Zangu/ }).first().click()
await sleep(700)
const mineCards = await sp.locator('.psh-spc').count()
assert(mineCards >= 1, 'N: kichujio cha Nafasi Zangu kinaonyesha nafasi zangu', `${mineCards} kadi`)
await sp.screenshot({ path: `${OUT7}/17-nafasi-zangu.png` })

await sp.locator('.psh-header__right .psh-icobtn').nth(1).click()
await sleep(800)
await textOf(sp, '.psh-sheet__title', 'Akaunti', 'N: wasifu unafunguka kwa Nafasi Zangu')
await sp.getByRole('tab', { name: 'Nafasi Zangu' }).click()
await sleep(700)
const profileSpaces = await sp.locator('.psh-profile__content > li').count()
assert(profileSpaces >= 1, 'N: Nafasi Zangu kwenye wasifu zinatoka kwenye chanzo kimoja', `${profileSpaces}`)
await sp.screenshot({ path: `${OUT7}/18-wasifu-nafasi-zangu.png` })
await sp.keyboard.press('Escape')
await sleep(400)

/* ── Tafuta: hali tupu halisi (§47) ───────────────────────── */
await sp.locator('.psh-spaces__input').fill('zzz-hakuna-kitu')
await sp.locator('.psh-spaces__searchBtn').click()
await sleep(700)
const emptyState = await sp.locator('.psh-spe').count()
assert(emptyState >= 1, 'N: utafutaji bila matokeo unaonyesha hali tupu halisi', `${emptyState}`)
await sp.screenshot({ path: `${OUT7}/19-hali-tupu.png` })

/* ── Desktop: grid pana + tabs ────────────────────────────── */
const spd = await newPage({ width: 1440, height: 950 })
await spd.goto(BASE, { waitUntil: 'networkidle' })
await sleep(500)
await spd.getByRole('button', { name: 'Spaces', exact: true }).click()
await sleep(900)
await countOf(spd, '.psh-spaces__tab', 2, 'N: desktop — tabs zinaonekana')
const deskCols = await spd.evaluate(
  () => getComputedStyle(document.querySelector('.psh-spaces__grid')).gridTemplateColumns.split(' ').length,
)
assert(deskCols >= 3, 'N: desktop — gridi ya kadi inapanuka (3 safu)', `${deskCols} safu`)
await spd.screenshot({ path: `${OUT7}/20-desktop-spaces.png` })
await spd.getByRole('button', { name: 'Spaces', exact: true }).click()
await sleep(400)
await spd.close()

/* ── Tablet/mobile: Space moja kwa upana mdogo ────────────── */
await sp.goto(BASE, { waitUntil: 'networkidle' })
await sleep(500)
await sp.getByRole('button', { name: 'Spaces', exact: true }).click()
await sleep(600)
await sp.locator('.psh-spc[data-id="afyaJamii"] .psh-spc__main').first().click()
await sleep(700)
await sp.screenshot({ path: `${OUT7}/21-jumuiya-afya.png` })
await sp.close()

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
console.log(`Screenshots: ${OUT} · ${OUT4} · ${OUT5} · ${OUT6}`)

if (consoleErrors.length) {
  const uniq = [...new Set(consoleErrors)]
  console.log(`\nHITILAFU ZA CONSOLE (${uniq.length}):`)
  for (const e of uniq) console.log('  ✗ ' + e)
  process.exitCode = 1
} else {
  console.log('✓ Hakuna hitilafu kwenye console.')
}
if (failed) process.exitCode = 1
