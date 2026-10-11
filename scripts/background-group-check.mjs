// ══════════════════════════════════════════════════════════════
// Kundi D (Mandhari) — ukaguzi wa kivinjari (Playwright, Chromium halisi)
// Inathibitisha: paneli ya kundi D, rangi + uwazi kwenye turubai, gradient na "Rudisha mandhari ya awali",
// picha ya mandhari yenye ukungu, "Rudisha mandhari (asili)", na Back.
// Matumizi: node scripts/background-group-check.mjs   (inahitaji dev server kwenye BASE)
// ══════════════════════════════════════════════════════════════
import { chromium } from 'playwright'
import { mkdirSync, existsSync } from 'node:fs'

const BASE = process.env.BASE || 'http://127.0.0.1:5173'
const SHOTS = process.env.SHOTS || '/home/user/pasihai-implementation/creative-shots'
const IMAGE = '/tmp/pasihai-test-image.png'
// Picha ya mandhari yenye rangi (ile ya kwanza ni nyeupe karibu yote, haionyeshi ukungu).
const BG_IMAGE = process.env.BG_IMAGE || '/tmp/pasihai-colour.png'
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

const browser = await chromium.launch({ headless: true })
let exitCode = 0
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'sw-TZ' })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => { if (!ignorable(e.message)) jsErrors.push(e.message) })
  page.on('console', (m) => { if (m.type() === 'error' && !ignorable(m.text())) jsErrors.push(m.text()) })
  if (!existsSync(IMAGE)) throw new Error(`faili ya jaribio haipo: ${IMAGE}`)

  await page.goto(`${BASE}/#/studio`, { waitUntil: 'domcontentloaded' })
  await page.locator('.psh-cs').waitFor({ state: 'visible', timeout: 30000 })
  await page.locator('.psh-cs__navBtn', { hasText: 'Create' }).first().click()
  await page.locator('[data-testid="creative-hub"]').waitFor({ state: 'visible', timeout: 15000 })
  await page.locator('article.cve-mode', { hasText: 'Social Post' }).getByRole('button', { name: /Anza Social Post/ }).click()
  await page.locator('[data-testid="creative-editor"]').waitFor({ state: 'visible', timeout: 15000 })

  const docStyle = (prop) => page.locator('.cve-doc').evaluate((el, p) => getComputedStyle(el)[p], prop)

  // Kundi D
  await openRail(page, 'Background')
  check(await page.locator('.cve-rail__btn[aria-label="Background"]').getAttribute('aria-pressed') === 'true', 'Rail: kundi la Mandhari limechaguliwa')
  check(await page.locator('.cve-lib__back').count() === 1, 'Drawer ina Back moja')
  check(await page.locator('[data-testid="props-panel"]').getAttribute('data-focus') === 'D', 'Sifa zinaonyesha paneli ya kundi D')

  // Rangi: nyekundu
  await page.getByLabel('Rangi: msimbo wa HEX', { exact: true }).first().fill('#ff0000')
  await page.getByLabel('Rangi: msimbo wa HEX', { exact: true }).first().press('Enter')
  check(await docStyle('backgroundColor') === 'rgb(255, 0, 0)', 'Rangi ya mandhari imebadilika kuwa nyekundu')

  // Uwazi 50%
  await page.getByLabel('Uwazi (nambari)', { exact: true }).fill('50')
  await page.getByLabel('Uwazi (nambari)', { exact: true }).press('Enter')
  const bgImg1 = await docStyle('backgroundImage')
  check(/rgba\(255, 0, 0, 0\.5\)/.test(bgImg1), 'Uwazi 50% unaonekana kwenye turubai (nyekundu juu ya nyeupe)', bgImg1.slice(0, 80))
  check(await docStyle('backgroundColor') === 'rgb(255, 255, 255)', 'Msingi wa uwazi ni nyeupe')
  await page.screenshot({ path: `${SHOTS}/18-background-group.png` })

  // Gradient, kisha Rudisha mandhari ya awali
  await page.locator('[data-testid="props-panel"] [role="group"][aria-label="Aina"] button', { hasText: /^Gradient$/ }).click()
  check(/linear-gradient/.test(await docStyle('backgroundImage')), 'Gradient inachukua nafasi ya rangi')
  const restore = page.getByRole('button', { name: 'Rudisha mandhari ya awali', exact: true })
  check(await restore.isEnabled(), 'Rudisha mandhari ya awali kinawezeshwa baada ya kubadilisha aina')
  await restore.click()
  check(/rgba\(255, 0, 0, 0\.5\)/.test(await docStyle('backgroundImage')), 'Rudisha mandhari ya awali inarudisha rangi na uwazi wake')
  check(await page.locator('[data-testid="props-panel"] [role="group"][aria-label="Aina"] button[aria-pressed="true"]', { hasText: /^Rangi$/ }).count() === 1, 'Aina inarudi kuwa Rangi')

  // Picha yenye ukungu
  await page.locator('[data-testid="props-panel"] [role="group"][aria-label="Aina"] button', { hasText: /^Picha$/ }).click()
  if (!existsSync(BG_IMAGE)) throw new Error(`faili ya mandhari haipo: ${BG_IMAGE}`)
  await page.locator('input[type="file"][aria-label="Chagua picha"]').setInputFiles(BG_IMAGE)
  await page.locator('[data-testid="doc-bg-image"]').waitFor({ state: 'attached', timeout: 15000 })
  check(await page.locator('[data-testid="doc-bg-image"]').count() === 1, 'Picha ya mandhari imewekwa (safu ya picha)')
  await page.getByLabel('Ukungu (blur) (nambari)', { exact: true }).fill('8')
  await page.getByLabel('Ukungu (blur) (nambari)', { exact: true }).press('Enter')
  const blurFilter = await page.locator('[data-testid="doc-bg-image"] > div').evaluate((el) => getComputedStyle(el).filter)
  check(/blur\(8px\)/.test(blurFilter), 'Ukungu wa 8px unatumika kwenye picha ya mandhari', blurFilter)
  const opacityOnImage = await page.locator('[data-testid="doc-bg-image"]').evaluate((el) => getComputedStyle(el).opacity)
  check(opacityOnImage === '0.5', 'Uwazi 50% unabaki kwenye picha', opacityOnImage)
  await page.screenshot({ path: `${SHOTS}/19-background-image-blur.png` })

  // Rudisha mandhari (asili): nyeupe, bila picha, uwazi 100%
  await page.getByRole('button', { name: 'Rudisha mandhari (asili)', exact: true }).click()
  check(await docStyle('backgroundColor') === 'rgb(255, 255, 255)' && await page.locator('[data-testid="doc-bg-image"]').count() === 0, 'Rudisha mandhari (asili) linarudisha turubai nyeupe')
  check(await page.getByLabel('Uwazi (nambari)', { exact: true }).inputValue() === '100', 'Rudisha mandhari (asili) linarudisha uwazi 100%')

  // Rudisha mandhari ya awali: picha yenye ukungu inarudi
  await page.getByRole('button', { name: 'Rudisha mandhari ya awali', exact: true }).click()
  check(await page.locator('[data-testid="doc-bg-image"]').count() === 1, 'Mandhari ya awali (picha yenye ukungu) inarudi')
  check(await page.getByLabel('Ukungu (blur) (nambari)', { exact: true }).inputValue() === '8', 'Ukungu wa 8px umerudi na picha')

  // Back: kurudi kwenye turubai
  await page.locator('.cve-lib__back').click()
  await page.locator('.cve-lib__back').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
  check(await page.locator('.cve-lib__back').count() === 0, 'Back inafunga drawer ya mandhari')
  check(await page.locator('[data-testid="props-panel"]').getAttribute('data-focus') === null, 'Sifa zinarudi kwenye hali ya kawaida')
} catch (e) {
  check(false, 'Mtiririko umesimama', e.message.split('\n')[0])
} finally {
  await browser.close()
}

const failed = checks.filter((c) => !c.ok).length
if (jsErrors.length) console.log('Makosa ya JS:', jsErrors.slice(0, 5))
const pass = checks.length - failed
console.log(`\nUkaguzi wa kundi D: ${pass} PASS, ${failed} FAIL, makosa ya JS: ${jsErrors.length}`)
if (failed || jsErrors.length) exitCode = 1
process.exit(exitCode)
