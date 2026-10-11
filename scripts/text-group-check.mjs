// ══════════════════════════════════════════════════════════════
// Kundi B (Maandishi) — ukaguzi wa kivinjari (Playwright, Chromium halisi)
// Inathibitisha: paneli ya kundi inaonyesha vidhibiti vya maandishi tu, Back inarudi kwenye turubai,
// mstari chini/katikati na orodha zinaonekana kwenye turubai, na zinafanya kazi kwa aina zote.
// Matumizi: node scripts/text-group-check.mjs   (inahitaji dev server kwenye BASE)
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

  // Fungua kundi B na ongeza maandishi
  await openRail(page, 'Text')
  check(await page.locator('.cve-rail__btn[aria-label="Text"]').getAttribute('aria-pressed') === 'true', 'Rail: kundi la Text limechaguliwa')
  check(await page.locator('.cve-lib__back').count() === 1, 'Drawer ina kitufe kimoja cha Back')
  const backName = await page.locator('.cve-lib__back').getAttribute('aria-label')
  check(backName === 'Rudi kwenye uwanja', 'Back ina jina la wazi', backName ?? '')
  await page.getByRole('button', { name: 'Ongeza maandishi', exact: true }).click()
  const textLayer = page.locator('.cve-layer[data-type="text"]').last()
  await textLayer.waitFor({ state: 'visible' })
  const textBox = textLayer.locator('.cve-text')

  // Paneli ya kundi B: vidhibiti vya maandishi tu
  const propsFocus = await page.locator('[data-testid="props-panel"]').getAttribute('data-focus')
  check(propsFocus === 'B', 'Sifa zinaonyesha paneli ya kundi B', String(propsFocus))
  check(await page.getByLabel('X', { exact: true }).count() === 0, 'Kundi B halionyeshi nafasi ya X/Y (ni kundi A)')

  // Mstari chini
  await page.getByRole('button', { name: 'Mstari chini', exact: true }).click()
  check(await page.getByRole('button', { name: 'Mstari chini', exact: true }).getAttribute('aria-pressed') === 'true', 'Mstari chini umewashwa kwenye Sifa')
  const deco1 = await textBox.evaluate((el) => getComputedStyle(el).textDecorationLine)
  check(/underline/.test(deco1), 'Mstari chini unaonekana kwenye turubai', deco1)

  // Mstari wa katikati
  await page.getByRole('button', { name: 'Mstari wa katikati', exact: true }).click()
  const deco2 = await textBox.evaluate((el) => getComputedStyle(el).textDecorationLine)
  check(/line-through/.test(deco2) && /underline/.test(deco2), 'Mstari wa katikati unaongezwa pamoja na chini', deco2)
  await page.getByRole('button', { name: 'Mstari wa katikati', exact: true }).click()
  const deco3 = await textBox.evaluate((el) => getComputedStyle(el).textDecorationLine)
  check(!/line-through/.test(deco3), 'Mstari wa katikati unazimika ukibonyeza tena', deco3)

  // Orodha kupitia kundi la Sifa (Orodha → Vitone)
  const orodhaGroup = page.locator('.cve-group', { hasText: 'Orodha' }).first()
  if (!(await orodhaGroup.getByRole('button', { name: 'Vitone', exact: true }).isVisible().catch(() => false))) {
    await orodhaGroup.locator('button').first().click()
  }
  await orodhaGroup.getByRole('button', { name: 'Vitone', exact: true }).click()
  const bulletText = (await textBox.innerText()).trim()
  check(bulletText.startsWith('•'), 'Orodha ya vitone inaonekana kwenye turubai', bulletText.slice(0, 30))

  // Orodha ya namba kupitia zana za kundi B
  await page.locator('.cve-lib__group[data-group="B"] .cve-lib__item[data-tool="text.listNumber"]').click()
  const numberText = (await textBox.innerText()).trim()
  check(numberText.startsWith('1. '), 'Zana ya orodha ya namba inafanya kazi', numberText.slice(0, 30))

  // Kubonyeza tena aina ile ile kunaondoa orodha
  await page.locator('.cve-lib__group[data-group="B"] .cve-lib__item[data-tool="text.listNumber"]').click()
  const plain = (await textBox.innerText()).trim()
  check(!/^(•|1\. )/.test(plain), 'Kubonyeza tena kunaondoa orodha', plain.slice(0, 30))

  // Orodha tena (kwa picha) kisha Back
  await page.locator('.cve-lib__group[data-group="B"] .cve-lib__item[data-tool="text.listBullet"]').click()
  await page.screenshot({ path: `${SHOTS}/16-text-group.png` })

  // Back: inarudi kwenye turubai bila kupoteza maandishi
  const layersBefore = await page.locator('.cve-layer').count()
  await page.locator('.cve-lib__back').click()
  await page.locator('.cve-lib__back').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
  check(await page.locator('.cve-lib__back').count() === 0, 'Back inafunga drawer na kurudi kwenye turubai')
  check(await page.locator('[data-testid="props-panel"]').getAttribute('data-focus') === null, 'Sifa zinarudi kwenye hali ya kawaida')
  check(await page.locator('.cve-layer').count() === layersBefore, 'Back haipotezi tabaka zilizopo', `${layersBefore}`)
  check((await textBox.innerText()).trim().startsWith('•'), 'Orodha inabaki baada ya Back')

  // Kundi la kwanza la Sifa halihitaji kundi B tena: mstari unabaki kwenye data
  await openRail(page, 'Text')
  check(await page.locator('[data-testid="props-panel"]').getAttribute('data-focus') === 'B', 'Kufungua Text tena kunaonyesha paneli ya B')
} catch (e) {
  check(false, 'Mtiririko umesimama', e.message.split('\n')[0])
} finally {
  await browser.close()
}

const failed = checks.filter((c) => !c.ok).length
if (jsErrors.length) console.log('Makosa ya JS:', jsErrors.slice(0, 5))
const pass = checks.length - failed
console.log(`\nUkaguzi wa kundi B: ${pass} PASS, ${failed} FAIL, makosa ya JS: ${jsErrors.length}`)
if (failed || jsErrors.length) exitCode = 1
process.exit(exitCode)
