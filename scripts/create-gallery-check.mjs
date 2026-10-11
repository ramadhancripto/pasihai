// ══════════════════════════════════════════════════════════════
// Create — ukaguzi wa gallery ya aina (Playwright, Chromium halisi)
// Matumizi: node scripts/create-gallery-check.mjs   (inahitaji dev server kwenye BASE)
// Inathibitisha: aina 12 kwenye gallery; Video Editor imezimwa (Mpango); utafutaji unachuja;
// kubofya aina kunafungua mhariri wa mode husika; Templates/Recent zinasogeza ukurasa.
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

const browser = await chromium.launch({ headless: true })
let exitCode = 0
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'sw-TZ' })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => { if (!ignorable(e.message)) jsErrors.push(`pageerror: ${e.message}`) })
  page.on('console', (m) => { if (m.type() === 'error' && !ignorable(m.text())) jsErrors.push(`console: ${m.text()}`) })

  await page.goto(`${BASE}/#/studio`, { waitUntil: 'domcontentloaded' })
  await page.locator('.psh-cs').waitFor({ state: 'visible', timeout: 30000 })
  await page.locator('.psh-cs__navBtn--top[aria-label="Create"]').click()
  const hub = page.locator('[data-testid="creative-hub"]')
  await hub.waitFor({ state: 'visible', timeout: 15000 })

  const tiles = page.locator('.cve-gallery__tile')
  check(await tiles.count() === 12, 'Gallery ina aina 12', `${await tiles.count()}`)
  const video = page.locator('.cve-gallery__tile', { hasText: 'Video Editor' })
  check(await video.isDisabled(), 'Video Editor imezimwa (Mpango)')

  const search = page.locator('input[placeholder^="Tafuta aina"]')
  await search.fill('poster')
  check(await tiles.count() === 1, 'Utafutaji "poster" unabaki na aina moja')
  await search.fill('zzzz')
  check(await tiles.count() === 0 && await page.getByText('Hakuna aina inayolingana').isVisible(), 'Utafutaji usio na matokeo unaonyesha ujumbe')
  await search.fill('')
  check(await tiles.count() === 12, 'Kufuta utafutaji kunarudisha aina zote')

  await page.locator('.cve-gallery__tile', { hasText: 'Poster / Flyer' }).click()
  const editor = page.locator('[data-testid="creative-editor"]')
  await editor.waitFor({ state: 'visible', timeout: 15000 })
  check(await editor.getByText('1240 × 1754').first().isVisible().catch(() => false), 'Poster / Flyer inafungua mhariri wa 1240 × 1754')

  await page.getByRole('button', { name: 'Rudi kwenye Studio' }).click()
  await hub.waitFor({ state: 'visible', timeout: 15000 })
  await page.locator('.cve-gallery__tile', { hasText: 'Templates' }).click()
  await page.waitForTimeout(900)
  const tplTop = await page.locator('#cv-templates').evaluate((el) => el.getBoundingClientRect().top)
  check(tplTop >= -10 && tplTop < 200, 'Templates inasogeza ukurasa hadi sehemu ya template', `top=${Math.round(tplTop)}`)

  await page.locator('.cve-gallery__tile', { hasText: 'Open Recent Project' }).click()
  await page.waitForTimeout(900)
  const projTop = await page.locator('#cv-projects').evaluate((el) => el.getBoundingClientRect().top)
  check(projTop >= -10 && projTop < 200, 'Open Recent Project inasogeza ukurasa hadi miradi', `top=${Math.round(projTop)}`)
  await page.screenshot({ path: '/home/user/pasihai-implementation/creative-shots/15-create-gallery.png' })
} catch (err) {
  console.log(`✗ Mtiririko umesimama: ${err.message.split('\n')[0]}`)
  exitCode = 1
} finally {
  await browser.close()
}

const failed = checks.filter((c) => !c.ok).length
for (const e of jsErrors) console.log(`JS: ${e}`)
console.log(`\nUkaguzi wa gallery: ${checks.length - failed} PASS, ${failed} FAIL, makosa ya JS: ${jsErrors.length}`)
if (failed || jsErrors.length) exitCode = 1
process.exit(exitCode)
