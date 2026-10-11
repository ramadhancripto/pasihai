// ══════════════════════════════════════════════════════════════
// Kundi E (Maumbo) — ukaguzi wa kivinjari (Playwright, Chromium halisi)
// Inathibitisha: umbo linaongezwa kutoka kwenye flyout, aina ya umbo inabadilika, pembe za mstatili,
// maumbo tayari (Kidonge), kivuli chenye uwazi, na Back.
// Matumizi: node scripts/shape-group-check.mjs   (inahitaji dev server kwenye BASE)
// ══════════════════════════════════════════════════════════════
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE || 'http://127.0.0.1:5173'
const SHOTS = process.env.SHOTS || '/home/user/pasihai-implementation/creative-shots'
mkdirSync(SHOTS, { recursive: true })

const checks = []
const jsErrors = []
function check(ok, label, detail = '') {
  checks.push({ ok: Boolean(ok), label })
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`)
}
const ignorable = (msg) => /favicon|Download the React DevTools|ResizeObserver loop|\[vite\]/i.test(msg)

async function openRail(p, title) {
  const b = p.locator(`.cve-rail__btn[aria-label="${title}"]`)
  if ((await b.getAttribute('aria-pressed')) !== 'true') await b.click()
}

async function openGroup(p, title) {
  // Kichwa lazima kilingane kabisa: "Kivuli" isiingiliane na "Mpaka na kivuli".
  const head = p.locator('[data-testid="props-panel"] .cve-group__head', { hasText: new RegExp(`^${title}$`) }).first()
  if ((await head.getAttribute('aria-expanded')) === 'false') await head.click()
}

const browser = await chromium.launch({ headless: true })
let exitCode = 0
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'sw-TZ' })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => { if (!ignorable(e.message)) jsErrors.push(e.message) })
  page.on('console', (m) => { if (m.type() === 'error' && !ignorable(m.text())) jsErrors.push(m.text()) })

  await page.goto(`${BASE}/#/studio`, { waitUntil: 'domcontentloaded' })
  await page.locator('.psh-cs').waitFor({ state: 'visible', timeout: 30000 })
  await page.locator('.psh-cs__navBtn', { hasText: 'Create' }).first().click()
  await page.locator('[data-testid="creative-hub"]').waitFor({ state: 'visible', timeout: 15000 })
  await page.locator('article.cve-mode', { hasText: 'Social Post' }).getByRole('button', { name: /Anza Social Post/ }).click()
  await page.locator('[data-testid="creative-editor"]').waitFor({ state: 'visible', timeout: 15000 })

  // Ongeza umbo: Maumbo na mistari → Duara
  await openRail(page, 'Shapes & Drawing')
  check(await page.locator('.cve-rail__btn[aria-label="Shapes & Drawing"]').getAttribute('aria-pressed') === 'true', 'Rail: kundi la Maumbo limechaguliwa')
  check(await page.locator('.cve-lib__back').count() === 1, 'Drawer ina Back moja')
  await page.locator('.cve-lib__group[data-group="E"] .cve-lib__item[data-tool="shapes.open"]').click()
  await page.getByRole('list', { name: 'Aina za maumbo' }).getByRole('button', { name: 'Duara', exact: true }).click()
  const shapeLayer = page.locator('.cve-layer[data-type="shape"]').last()
  await shapeLayer.waitFor({ state: 'visible', timeout: 10000 })
  check(await shapeLayer.getAttribute('class').then((c) => /is-sel/.test(c)), 'Umbo jipya limeongezwa na kuchaguliwa')
  check(await page.locator('[data-testid="props-panel"]').getAttribute('data-focus') === 'E', 'Sifa zinaonyesha paneli ya kundi E')

  // Aina ya umbo: Mstatili
  await page.locator('[role="group"][aria-label="Umbo"] button', { hasText: /^Mstatili$/ }).click()
  check(await shapeLayer.locator('svg rect').count() === 1, 'Aina "Mstatili" inachora mstatili')

  // Pembe za mstatili
  await openGroup(page, 'Pembe')
  await page.getByLabel('Pembe (nambari)', { exact: true }).fill('30')
  await page.getByLabel('Pembe (nambari)', { exact: true }).press('Enter')
  const rx = await shapeLayer.locator('svg rect').getAttribute('rx')
  check(rx === '30', 'Pembe 30px zinaonekana kwenye mstatili', `rx=${rx}`)

  // Maumbo tayari: Kidonge → mviringo wenye radius ya nusu ya urefu mfupi
  await openGroup(page, 'Maumbo tayari')
  await page.getByRole('group', { name: 'Maumbo tayari' }).getByRole('button', { name: 'Kidonge', exact: true }).click()
  check(await page.locator('[role="group"][aria-label="Umbo"] button[aria-pressed="true"]', { hasText: /^Mviringo$/ }).count() === 1, 'Preset Kidonge inabadilisha aina kuwa Mviringo')
  const rx2 = await shapeLayer.locator('svg rect').getAttribute('rx')
  check(rx2 && Number(rx2) > 30, 'Preset Kidonge inaongeza pembe', `rx=${rx2}`)

  // Kivuli chenye uwazi
  await openGroup(page, 'Kivuli')
  const kivuliToggle = page.locator('[data-testid="props-panel"] button[aria-pressed]', { hasText: /^Kivuli$/ })
  await kivuliToggle.click()
  const filter = await shapeLayer.locator('svg[aria-hidden="true"]').evaluate((el) => el.style.filter)
  check(/drop-shadow/.test(filter) && /rgba\(0, 0, 0, 0\.35\)/.test(filter), 'Kivuli cha umbo kinaonekana kwa uwazi 35%', filter)
  await page.screenshot({ path: `${SHOTS}/20-shape-group.png` })

  // Back
  await page.locator('.cve-lib__back').click()
  await page.locator('.cve-lib__back').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
  check(await page.locator('.cve-lib__back').count() === 0, 'Back inafunga drawer ya maumbo')
  check(await page.locator('[data-testid="props-panel"]').getAttribute('data-focus') === null, 'Sifa zinarudi kwenye hali ya kawaida')
} catch (e) {
  check(false, 'Mtiririko umesimama', e.message.split('\n')[0])
} finally {
  await browser.close()
}

const failed = checks.filter((c) => !c.ok).length
if (jsErrors.length) console.log('Makosa ya JS:', jsErrors.slice(0, 5))
const pass = checks.length - failed
console.log(`\nUkaguzi wa kundi E: ${pass} PASS, ${failed} FAIL, makosa ya JS: ${jsErrors.length}`)
if (failed || jsErrors.length) exitCode = 1
process.exit(exitCode)
