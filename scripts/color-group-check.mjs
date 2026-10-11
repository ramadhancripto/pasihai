// ══════════════════════════════════════════════════════════════
// Kundi G (Rangi na mitindo) — ukaguzi wa kivinjari (Playwright, Chromium halisi)
// Inathibitisha: paneli ya kundi G inafunguka kutoka kwenye rail; HEX, RGB, HSL zinabadilisha umbo
// na maandishi; rangi iliyohifadhiwa inaonekana; Back inarudi kwenye turubai.
// Matumizi: node scripts/color-group-check.mjs   (inahitaji dev server kwenye BASE)
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

// Kichwa lazima kilingane kabisa, kwa sababu "Kivuli" ni sehemu ya "Mpaka na kivuli".
async function openGroup(p, title) {
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

  // Umbo: Maumbo → Duara
  await openRail(page, 'Shapes & Drawing')
  await page.locator('.cve-lib__group[data-group="E"] .cve-lib__item[data-tool="shapes.open"]').click()
  await page.getByRole('list', { name: 'Aina za maumbo' }).getByRole('button', { name: 'Duara', exact: true }).click()
  const shapeLayer = page.locator('.cve-layer[data-type="shape"]').last()
  await shapeLayer.waitFor({ state: 'visible', timeout: 10000 })

  // Kundi G kutoka kwenye rail
  await openRail(page, 'Colors & Styles')
  check(await page.locator('.cve-rail__btn[aria-label="Colors & Styles"]').getAttribute('aria-pressed') === 'true', 'Rail: kundi la Rangi limechaguliwa')
  check(await page.locator('.cve-lib__back').count() === 1, 'Drawer ina Back moja')
  check(await page.locator('[data-testid="props-panel"]').getAttribute('data-focus') === 'G', 'Sifa zinaonyesha paneli ya kundi G')

  // HEX: fill
  const fillHex = page.getByLabel('Ndani (fill): msimbo wa HEX', { exact: true })
  await fillHex.fill('#123456')
  await fillHex.press('Enter')
  // Duara ni ellipse: chukua kipengele cha kwanza cha SVG bila kujali aina yake.
  const primitive = () => shapeLayer.locator('svg[aria-hidden="true"] > *').first()
  const fillAttr = () => primitive().getAttribute('fill')
  check((await fillAttr()) === '#123456', 'HEX inabadilisha ndani ya umbo', String(await fillAttr()))

  // RGB: R = 255 → #ff3456
  await page.getByLabel('Ndani (fill) R (nambari)', { exact: true }).fill('255')
  await page.getByLabel('Ndani (fill) R (nambari)', { exact: true }).press('Enter')
  check((await fillAttr()) === '#ff3456', 'RGB (R) inabadilisha ndani ya umbo', String(await fillAttr()))

  // HSL: S = 0 → kijivu (R=G=B)
  await page.getByLabel('Ndani (fill) S (nambari)', { exact: true }).fill('0')
  await page.getByLabel('Ndani (fill) S (nambari)', { exact: true }).press('Enter')
  const grey = await fillAttr()
  const isGrey = /^#([0-9a-f]{2})\1\1$/.test(grey ?? '')
  check(isGrey, 'HSL (S=0) inatoa kijivu', String(grey))

  // Hifadhi rangi ya sasa → inaonekana kwenye zilizohifadhiwa
  await page.locator('[data-testid="props-panel"] .cve-group', { hasText: 'Ndani (fill)' }).getByRole('button', { name: 'Hifadhi rangi', exact: true }).click()
  const saved = page.getByRole('group', { name: 'Rangi zilizohifadhiwa' })
  check(await saved.count() === 1 && (await saved.locator('button.cve-swatch').count()) >= 1, 'Rangi iliyohifadhiwa inaonekana kwenye orodha')

  // Mpaka (stroke)
  await openGroup(page, 'Mpaka \\(stroke\\)')
  await page.getByLabel('Mpaka (stroke): msimbo wa HEX', { exact: true }).fill('#ff0000')
  await page.getByLabel('Mpaka (stroke): msimbo wa HEX', { exact: true }).press('Enter')
  const strokeHex = await page.getByLabel('Mpaka (stroke): msimbo wa HEX', { exact: true }).inputValue()
  check(strokeHex === '#ff0000', 'Mpaka (stroke) unahifadhi rangi ya mpaka', strokeHex)
  check(await page.getByText('Upana uko kwenye kundi E', { exact: false }).count() === 1, 'Mpaka unaonyesha kidokezo cha upana (kundi E) wakati upana ni 0')
  // Mitindo ya rangi: hifadhi rangi za umbo (fill #999999, stroke #ff0000) → badilisha → tumia → ondoa
  await page.getByLabel('Jina la mtindo', { exact: true }).fill('Kijivu')
  await page.locator('[data-testid="props-panel"] .cve-group', { hasText: 'Mitindo ya rangi' }).getByRole('button', { name: 'Hifadhi mtindo kutoka kitu hiki', exact: true }).click()
  const styleList = page.getByRole('list', { name: 'Mitindo iliyohifadhiwa' })
  check(await styleList.getByRole('button', { name: 'Tumia mtindo Kijivu', exact: true }).count() === 1, 'Mtindo uliohifadhiwa unaonekana kwenye orodha')
  await fillHex.fill('#ffffff')
  await fillHex.press('Enter')
  check((await fillAttr()) === '#ffffff', 'Rangi imebadilishwa kabla ya kutumia mtindo')
  await styleList.getByRole('button', { name: 'Tumia mtindo Kijivu', exact: true }).click()
  check((await fillAttr()) === '#999999', 'Tumia mtindo kunarudisha fill ya mtindo', String(await fillAttr()))
  await styleList.getByRole('button', { name: 'Ondoa mtindo Kijivu', exact: true }).click()
  check((await fillAttr()) === 'none', 'Ondoa mtindo kunarudisha fill kwenye chaguo-msingi (hakuna)', String(await fillAttr()))
  check(await page.getByLabel('Ndani (fill): msimbo wa HEX', { exact: true }).inputValue() === '', 'Fill inaonyesha hakuna baada ya Ondoa')

  await page.screenshot({ path: `${SHOTS}/21-colour-group.png` })

  // Maandishi: rangi ya maandishi kupitia RGB
  await openRail(page, 'Text')
  await page.locator('.cve-lib__group[data-group="B"] .cve-lib__item[data-tool="text.add"]').click()
  const textLayer = page.locator('.cve-layer[data-type="text"]').last()
  await textLayer.waitFor({ state: 'visible', timeout: 10000 })
  await openRail(page, 'Colors & Styles')
  check(await page.getByLabel('Rangi ya maandishi: msimbo wa HEX', { exact: true }).count() === 1, 'Maandishi yaliyochaguliwa yanaonyesha rangi yake kwenye kundi G')
  await page.getByLabel('Rangi ya maandishi: msimbo wa HEX', { exact: true }).fill('#00aa00')
  await page.getByLabel('Rangi ya maandishi: msimbo wa HEX', { exact: true }).press('Enter')
  // Mtindo wa umbo haufai maandishi: kitufe cha Tumia kimezimwa
  check(await page.getByRole('list', { name: 'Mitindo iliyohifadhiwa' }).getByRole('button', { name: 'Tumia mtindo Kijivu', exact: true }).isDisabled(), 'Mtindo wa umbo umezimwa kwenye maandishi')

  const r = await page.getByLabel('Rangi ya maandishi R (nambari)', { exact: true }).inputValue()
  const g = await page.getByLabel('Rangi ya maandishi G (nambari)', { exact: true }).inputValue()
  check(r === '0' && g === '170', 'Rangi ya maandishi inabadilika kupitia HEX na RGB', `R=${r} G=${g}`)

  // Back: inafunga drawer, inarudi kwenye turubai
  await page.locator('.cve-lib__back').click()
  check(await page.locator('.cve-lib__back').count() === 0, 'Back inafunga drawer ya rangi')
  check(await page.locator('[data-testid="props-panel"]').getAttribute('data-focus') === null, 'Sifa zinarudi kwenye hali ya kawaida')
} catch (e) {
  check(false, 'Mtiririko umesimama', e.message.split('\n')[0])
} finally {
  await browser.close()
}

const failed = checks.filter((c) => !c.ok).length
if (jsErrors.length) console.log('Makosa ya JS:', jsErrors.slice(0, 5))
const pass = checks.length - failed
console.log(`\nUkaguzi wa kundi G: ${pass} PASS, ${failed} FAIL, makosa ya JS: ${jsErrors.length}`)
if (failed || jsErrors.length) exitCode = 1
process.exit(exitCode)
