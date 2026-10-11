// ══════════════════════════════════════════════════════════════
// Creator Studio — ukaguzi wa urambazaji (Playwright, Chromium halisi)
// Matumizi: node scripts/studio-nav-check.mjs   (inahitaji dev server kwenye BASE)
// Inathibitisha: sehemu 10 kwa mpangilio; sidebar inayokunjwa; sub-item ya Create inafungua
// mode sahihi; sub-item zilizopangwa haziwezi kubofya; bottom nav ya mobile (Home, Create,
// Content, Media, More) yenye targets ≥44px; sheet ya More; hakuna kuteleza kwa mlalo;
// bottom nav imefichwa kwenye mhariri.
// Inashindwa (exit 1) kwa hitilafu yoyote ya ukaguzi au ya JavaScript isiyotarajiwa.
// ══════════════════════════════════════════════════════════════
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://127.0.0.1:5173'
const checks = []
const jsErrors = []
function check(ok, label, detail = '') {
  checks.push({ ok: Boolean(ok), label })
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`)
}
const ignorable = (msg) => /favicon|Download the React DevTools|ResizeObserver loop|\[vite\]/i.test(msg)
const TOP_ORDER = ['Studio Home', 'Create', 'My Content', 'Media Library', 'Projects', 'Templates', 'Advertisements', 'Analytics', 'Creator Business', 'Settings']

const browser = await chromium.launch({ headless: true })
let exitCode = 0
try {
  // ── Desktop ───────────────────────────────────────────────
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'sw-TZ' })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => { if (!ignorable(e.message)) jsErrors.push(`pageerror: ${e.message}`) })
  page.on('console', (m) => { if (m.type() === 'error' && !ignorable(m.text())) jsErrors.push(`console: ${m.text()}`) })

  await page.goto(`${BASE}/#/studio`, { waitUntil: 'domcontentloaded' })
  await page.locator('.psh-cs').waitFor({ state: 'visible', timeout: 30000 })

  const tops = page.locator('.psh-cs__nav .psh-cs__navBtn--top')
  const labels = await tops.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))
  check(JSON.stringify(labels) === JSON.stringify(TOP_ORDER), 'Sidebar ina sehemu 10 kwa mpangilio wa MASTER', labels.join(' · '))

  const nav = page.locator('.psh-cs__nav')
  const wideBox = await nav.boundingBox()
  await page.locator('.psh-cs__navToggle').click()
  await page.waitForTimeout(300)
  const narrowBox = await nav.boundingBox()
  check((await nav.getAttribute('class')).includes('is-collapsed'), 'Kitufe cha kukunja kinafanya sidebar ikunjwe')
  check(narrowBox && wideBox && narrowBox.width < 90 && narrowBox.width < wideBox.width - 100, 'Sidebar iliyokunjwa ni nyembamba', `${Math.round(wideBox.width)}→${Math.round(narrowBox.width)}px`)
  check(await page.locator('.psh-cs__nav.is-collapsed .psh-cs__navBtn--top[aria-label="Create"]').count() === 1, 'Aikoni zinabaki zinapatikana kwa jina (aria-label) kwenye hali iliyokunjwa')
  check(await page.locator('.psh-cs__nav.is-collapsed .psh-cs__subList').count() === 0 || !(await page.locator('.psh-cs__nav.is-collapsed .psh-cs__subList').first().isVisible()), 'Sub-items zimefichwa kwenye sidebar iliyokunjwa')
  await page.locator('.psh-cs__navToggle').click()
  await page.waitForTimeout(300)
  check(!(await nav.getAttribute('class')).includes('is-collapsed'), 'Kitufe cha pili kinapanua sidebar tena')

  // Create → sub-items → Story / Status inafungua mode ya 1080×1920
  await page.locator('.psh-cs__navBtn--top[aria-label="Create"]').click()
  await page.locator('[data-testid="creative-hub"]').waitFor({ state: 'visible', timeout: 15000 })
  const sub = page.locator('.psh-cs__subList').first()
  check(await sub.isVisible(), 'Sub-items za Create zinaonekana chini ya Create')
  const planned = page.locator('.psh-cs__navBtn--sub', { hasText: 'Video Editor' })
  check(await planned.isDisabled(), 'Video Editor (mpango) imezimwa kwenye sidebar')
  await page.locator('.psh-cs__navBtn--sub', { hasText: 'Story / Status' }).click()
  const editor = page.locator('[data-testid="creative-editor"]')
  await editor.waitFor({ state: 'visible', timeout: 15000 })
  check(await page.locator('.psh-cs.is-editor').count() === 1, 'Sub-item ya Create inafungua mhariri (nav imefichwa)')
  check(await editor.getByText('1080 × 1920').first().isVisible().catch(() => false), 'Mhariri umefunguliwa kwa mode ya Story (1080 × 1920)')
  await page.screenshot({ path: '/home/user/pasihai-implementation/creative-shots/13-studio-nav-story.png' })

  // Rudi Studio kupitia Projects (bila intent), mode ya awali isifunguke tena
  await page.getByRole('button', { name: 'Rudi kwenye Studio' }).click()
  await page.locator('.psh-cs__nav').waitFor({ state: 'visible', timeout: 10000 })
  check(await page.locator('[data-testid="creative-editor"]').count() === 0, 'Kurudi Studio kunafunga mhariri')
  await page.locator('.psh-cs__navBtn--top[aria-label="Analytics"]').click()
  await page.waitForTimeout(300)
  check(await page.locator('[data-testid="creative-hub"]').count() === 0, 'Analytics inafungua sehemu yake, si Create')
  check(await page.locator('.psh-cs__navBtn--sub', { hasText: 'Hadhira' }).isVisible(), 'Sub-items za Analytics zinaonekana')

  check(await page.locator('.psh-cs__mnav').isVisible() === false, 'Bottom nav imefichwa kwenye desktop')

  // ── Mobile ────────────────────────────────────────────────
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'sw-TZ' })
  const m = await mctx.newPage()
  m.on('pageerror', (e) => { if (!ignorable(e.message)) jsErrors.push(`m pageerror: ${e.message}`) })
  m.on('console', (msg) => { if (msg.type() === 'error' && !ignorable(msg.text())) jsErrors.push(`m console: ${msg.text()}`) })
  await m.goto(`${BASE}/#/studio`, { waitUntil: 'domcontentloaded' })
  await m.locator('.psh-cs').waitFor({ state: 'visible', timeout: 30000 })

  const mtabs = m.locator('.psh-cs__mnav .psh-cs__mtab')
  const mlabels = await mtabs.evaluateAll((els) => els.map((e) => e.textContent.trim()))
  check(JSON.stringify(mlabels) === JSON.stringify(['Home', 'Create', 'Content', 'Media', 'More']), 'Bottom nav ya Studio: Home · Create · Content · Media · More', mlabels.join(' · '))
  const boxes = await mtabs.evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height } }))
  check(boxes.every((b) => b.w >= 44 && b.h >= 44), 'Bottom nav: kila lengo ≥44×44 CSS px', boxes.map((b) => `${Math.round(b.w)}×${Math.round(b.h)}`).join(' '))
  check(!(await m.locator('.psh-cs__nav').isVisible()), 'Sidebar imefichwa kwenye mobile')
  const noOverflow = await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
  check(noOverflow, 'Mobile Studio: hakuna kuteleza kwa mlalo')

  await m.locator('.psh-cs__mtab', { hasText: 'More' }).tap()
  const sheet = m.locator('#psh-cs-more')
  await sheet.waitFor({ state: 'visible', timeout: 5000 })
  const sheetLabels = await sheet.locator('.psh-cs__sheetBtn').evaluateAll((els) => els.map((e) => e.textContent.trim()))
  check(JSON.stringify(sheetLabels) === JSON.stringify(['Projects', 'Templates', 'Advertisements', 'Analytics', 'Creator Business', 'Settings']), 'Menyu ya More ina Projects, Templates, Advertisements, Analytics, Creator Business, Settings')
  const sheetBoxes = await sheet.locator('.psh-cs__sheetBtn').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))
  check(sheetBoxes.every((h) => h >= 44), 'Menyu ya More: kila kitufe ≥44 px kwa urefu')
  await sheet.locator('.psh-cs__sheetBtn', { hasText: 'Analytics' }).tap()
  await m.waitForTimeout(300)
  check(await m.locator('#psh-cs-more').count() === 0, 'Kuchagua kipengele kwenye More kinafunga sheet')
  check(await m.locator('.psh-cs__mtab.is-on', { hasText: 'More' }).count() === 1, 'More inaonyesha hali ya kutumika kwa Analytics')

  await m.locator('.psh-cs__mtab', { hasText: 'Create' }).tap()
  await m.locator('[data-testid="creative-hub"]').waitFor({ state: 'visible', timeout: 15000 })
  await m.locator('article.cve-mode', { hasText: 'Story' }).getByRole('button', { name: /Anza Status/ }).tap()
  await m.locator('[data-testid="creative-editor"]').waitFor({ state: 'visible', timeout: 15000 })
  check(!(await m.locator('.psh-cs__mnav').isVisible()), 'Kwenye mhariri wa mobile, bottom nya ya Studio imefichwa')
  check(await m.locator('.cve-mnav').isVisible(), 'Kwenye mhariri wa mobile, bottom nav ya mhariri inaonekana')
  await m.screenshot({ path: '/home/user/pasihai-implementation/creative-shots/14-studio-mobile-editor.png' })
} catch (err) {
  console.log(`✗ Mtiririko umesimama: ${err.message.split('\n')[0]}`)
  exitCode = 1
} finally {
  await browser.close()
}

const failed = checks.filter((c) => !c.ok).length
for (const e of jsErrors) console.log(`JS: ${e}`)
console.log(`\nUkaguzi wa urambazaji: ${checks.length - failed} PASS, ${failed} FAIL, makosa ya JS: ${jsErrors.length}`)
if (failed || jsErrors.length) exitCode = 1
process.exit(exitCode)
