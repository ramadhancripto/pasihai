// ══════════════════════════════════════════════════════════════
// Kundi H (Athari na vichujio) — ukaguzi wa kivinjari (Playwright, Chromium halisi)
// Inathibitisha: paneli ya kundi H kutoka rail; nguvu inabadilisha kichujio; kila kichujio kinaonekana
// kwenye turubai (filter ya CSS na overlay ya joto); Ondoa vichujio vinarudisha hali ya kawaida; Back.
// Matumizi: node scripts/effects-group-check.mjs   (inahitaji dev server kwenye BASE)
// ══════════════════════════════════════════════════════════════
import { chromium } from 'playwright'
import { mkdirSync, existsSync } from 'node:fs'

const BASE = process.env.BASE || 'http://127.0.0.1:5173'
const SHOTS = process.env.SHOTS || '/home/user/pasihai-implementation/creative-shots'
const IMAGE = process.env.IMAGE || '/tmp/pasihai-test-image.png'
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
  if (!existsSync(IMAGE)) throw new Error(`faili ya jaribio haipo: ${IMAGE}`)
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

  // Ingiza picha
  await openRail(page, 'Images & Photos')
  await page.locator('input[type="file"][aria-label="Chagua picha"]').setInputFiles(IMAGE)
  const imgLayer = page.locator('.cve-layer[data-type="image"]').last()
  await imgLayer.waitFor({ state: 'visible', timeout: 15000 })

  // Kundi H kutoka kwenye rail
  await openRail(page, 'Effects & Filters')
  check(await page.locator('.cve-rail__btn[aria-label="Effects & Filters"]').getAttribute('aria-pressed') === 'true', 'Rail: kundi la Athari limechaguliwa')
  check(await page.locator('.cve-lib__back').count() === 1, 'Drawer ina Back moja')
  check(await page.locator('[data-testid="props-panel"]').getAttribute('data-focus') === 'H', 'Sifa zinaonyesha paneli ya kundi H')
  check(await page.getByRole('group', { name: 'Vichujio vya picha' }).count() === 1, 'Vichujio vya picha vinaonekana kwenye paneli')

  // Filter ya CSS iko kwenye <img> ndani ya .cve-img (si kwenye kontena yenyewe).
  const filterOf = () => page.evaluate(() => [...document.querySelectorAll('.cve-img *')].map((e) => e.style.filter).filter(Boolean).join('|'))
  const tintCount = () => page.locator('[data-testid="img-tint"]').count()

  // Nguvu 50% + Joto → saturate(105%) na overlay ya joto
  await page.getByLabel('Nguvu ya kichujio (nambari)', { exact: true }).fill('50')
  await page.getByLabel('Nguvu ya kichujio (nambari)', { exact: true }).press('Enter')
  await page.getByRole('group', { name: 'Vichujio vya picha' }).getByRole('button', { name: 'Joto', exact: true }).click()
  const f1 = await filterOf()
  check(/saturate\(105%\)/.test(f1), 'Joto kwa nguvu 50% kinabadilisha rangi kwenye turubai', f1)
  check(await tintCount() === 1, 'Joto linaongeza overlay ya joto kwenye turubai')

  // Nguvu 100% + Nyeusi na nyeupe → saturate(0%), contrast(115%), bila overlay
  await page.getByLabel('Nguvu ya kichujio (nambari)', { exact: true }).fill('100')
  await page.getByLabel('Nguvu ya kichujio (nambari)', { exact: true }).press('Enter')
  await page.getByRole('group', { name: 'Vichujio vya picha' }).getByRole('button', { name: 'Nyeusi na nyeupe', exact: true }).click()
  const f2 = await filterOf()
  check(/saturate\(0%\)/.test(f2) && /contrast\(115%\)/.test(f2), 'Nyeusi na nyeupe kwa nguvu 100% inaonekana kwenye turubai', f2)
  check(await tintCount() === 0, 'Nyeusi na nyeupe haiachi overlay ya joto')
  await page.screenshot({ path: `${SHOTS}/22-effects-group.png` })

  // Ondoa vichujio → hali ya kawaida, kitufe kimezimwa
  const clear = page.locator('[data-testid="props-panel"] .cve-group').getByRole('button', { name: 'Ondoa vichujio', exact: true })
  await clear.click()
  const f3 = await filterOf()
  check(!/saturate|contrast|brightness/.test(f3), 'Ondoa vichujio kunarudisha rangi kwenye hali ya kawaida', f3)
  check(await clear.isDisabled(), 'Ondoa vichujio imezimwa baada ya kuondoa')

  // Back: inafunga drawer
  await page.locator('.cve-lib__back').click()
  check(await page.locator('.cve-lib__back').count() === 0, 'Back inafunga drawer ya athari')
  check(await page.locator('[data-testid="props-panel"]').getAttribute('data-focus') === null, 'Sifa zinarudi kwenye hali ya kawaida')
} catch (e) {
  check(false, 'Mtiririko umesimama', e.message.split('\n')[0])
} finally {
  await browser.close()
}

const failed = checks.filter((c) => !c.ok).length
if (jsErrors.length) console.log('Makosa ya JS:', jsErrors.slice(0, 5))
const pass = checks.length - failed
console.log(`\nUkaguzi wa kundi H: ${pass} PASS, ${failed} FAIL, makosa ya JS: ${jsErrors.length}`)
if (failed || jsErrors.length) exitCode = 1
process.exit(exitCode)
