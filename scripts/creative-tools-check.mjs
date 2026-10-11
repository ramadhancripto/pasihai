// ══════════════════════════════════════════════════════════════
// Creative editor — ukaguzi wa zana mpya (Playwright, Chromium halisi)
// Matumizi: node scripts/creative-tools-check.mjs   (inahitaji dev server kwenye BASE)
// Inathibitisha: uteuzi wa vingi (Shift-click), Rudufu, Funga/Fungua na ulinzi wa Futa,
// Geuza mlalo, zana iliyozimwa inaonyesha sababu, na export ya PNG bila mandhari.
// Inashindwa (exit 1) kwa hitilafu yoyote ya ukaguzi au ya JavaScript isiyotarajiwa.
// ══════════════════════════════════════════════════════════════
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://127.0.0.1:5173'

const checks = []
const jsErrors = []
function check(ok, label, detail = '') {
  checks.push({ ok: Boolean(ok), label, detail })
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`)
}
const ignorable = (msg) => /favicon|Download the React DevTools|ResizeObserver loop|\[vite\]/i.test(msg)

// Fungua kategoria kwenye rail ya mhariri (desktop). Haibofyi ikiwa tayari imefunguka.
async function openRail(p, title) {
  const b = p.locator(`.cve-rail__btn[aria-label="${title}"]`)
  if ((await b.getAttribute('aria-pressed')) !== 'true') await b.click()
}

const browser = await chromium.launch({ headless: true })
let exitCode = 0
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'sw-TZ', acceptDownloads: true })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => { if (!ignorable(e.message)) jsErrors.push(`pageerror: ${e.message}`) })
  page.on('console', (m) => { if (m.type() === 'error' && !ignorable(m.text())) jsErrors.push(`console: ${m.text()}`) })

  await page.goto(`${BASE}/#/studio`, { waitUntil: 'domcontentloaded' })
  await page.locator('.psh-cs').waitFor({ state: 'visible', timeout: 30000 })
  await page.locator('.psh-cs__navBtn', { hasText: 'Create' }).first().click()
  await page.locator('[data-testid="creative-hub"]').waitFor({ state: 'visible', timeout: 15000 })
  await page.locator('article.cve-mode', { hasText: 'Social Post' }).getByRole('button', { name: /Anza Social Post/ }).click()
  await page.locator('[data-testid="creative-editor"]').waitFor({ state: 'visible', timeout: 15000 })

  // Zana za kina hazionekani kwenye hali ya Rahisi: badili kwenda Kina
  await page.locator('.cve-lib__mode .cve-seg__btn', { hasText: 'Kina' }).click()
  check((await page.locator('.cve-lib__mode .cve-seg__btn', { hasText: 'Kina' }).getAttribute('aria-pressed')) === 'true', 'Hali ya Kina inawashwa kwenye maktaba')

  const layers = page.locator('.cve-layer')
  const selected = page.locator('.cve-layer.is-sel')
  // Tabaka mpya zinaingiliana kwenye turubai, kwa hiyo uteuzi unafanywa kupitia orodha ya tabaka.
  const rows = page.locator('.cve-layer-row__pick')
  if (!(await rows.first().isVisible().catch(() => false))) {
    await page.locator('.cve-bottom__head button', { hasText: 'Tabaka' }).first().click()
  }
  await rows.first().waitFor({ state: 'visible', timeout: 5000 })
  // Mode ya Social inaanza na tabaka moja; ongeza maandishi mawili zaidi kupitia maktaba
  await openRail(page, 'Text')
  await page.locator('.cve-lib__group[data-group="B"] .cve-lib__item[data-tool="text.add"]').click()
  await page.locator('.cve-lib__group[data-group="B"] .cve-lib__item[data-tool="text.add"]').click()
  const baseCount = await layers.count()
  check(baseCount >= 3, 'Tabaka zipo za kutosha kwa jaribio la uteuzi', `${baseCount}`)

  // Uteuzi wa vingi: klik kisha Shift-klik
  await rows.nth(0).click()
  await rows.nth(1).click({ modifiers: ['Shift'] })
  check((await selected.count()) === 2, 'Shift-klik inaongeza kipengele kwenye uteuzi', `${await selected.count()} vimechaguliwa`)
  await rows.nth(1).click({ modifiers: ['Shift'] })
  check((await selected.count()) === 1, 'Shift-klik tena inaondoa kipengele kwenye uteuzi')
  await page.keyboard.press('Escape')

  // Zana iliyozimwa: Gawanya sawasawa inahitaji vitatu → sababu inaonekana, hakuna kitendo
  await rows.nth(0).click()
  await openRail(page, 'Select & Arrange')
  const distribute = page.locator('.cve-lib__group[data-group="A"] .cve-lib__item[data-tool="distribute.x"]')
  check((await distribute.getAttribute('aria-disabled')) === 'true', 'Gawanya sawasawa imezimwa kwa kipengele kimoja')
  await distribute.click({ force: true }) // aria-disabled: kubofya kunaruhusiwa, lakini kitendo hakiendeshwi
  check((await page.locator('.cve-toast').innerText()).includes('vitatu'), 'Zana iliyozimwa inaonyesha sababu kwenye toast')

  // Rudufu: Ctrl+D (kwenye uteuzi wa vipengele viwili)
  await rows.nth(1).click({ modifiers: ['Shift'] })
  await page.keyboard.press('Control+d')
  check((await layers.count()) === baseCount + 2, 'Ctrl+D inarudufu vipengele viwili', `${baseCount} → ${await layers.count()}`)
  await page.keyboard.press('Control+z')
  check((await layers.count()) === baseCount, 'Undo inaondoa nakala zilizorudufiwa')
  await page.keyboard.press('Escape')

  // Funga: Ctrl+L kisha Futa hakuondoi kipengele kilichofungwa
  await rows.nth(0).click()
  await page.keyboard.press('Control+l')
  check((await selected.first().getAttribute('class')).includes('is-locked'), 'Ctrl+L inafunga kipengele')
  await page.keyboard.press('Delete')
  check((await layers.count()) === baseCount, 'Futa haifuti kipengele kilichofungwa')
  check((await page.locator('.cve-toast').innerText()).includes('Vifungue'), 'Ujumbe unaeleza kwa nini kipengele hakikufutwa')
  await page.keyboard.press('Control+l')
  check(!(await selected.first().getAttribute('class')).includes('is-locked'), 'Ctrl+L tena inafungua kipengele')
  await page.keyboard.press('Escape')

  // Geuza mlalo kupitia maktaba
  await rows.nth(0).click()
  const before = await selected.first().evaluate((el) => el.style.transform)
  await openRail(page, 'Select & Arrange')
  await page.locator('.cve-lib__group[data-group="A"] .cve-lib__item[data-tool="obj.flipX"]').click()
  const after = await selected.first().evaluate((el) => el.style.transform)
  check(after.includes('scale(-1') && after !== before, 'Geuza mlalo inabadilisha mwelekeo wa kipengele', `${before || 'none'} → ${after}`)
  await page.keyboard.press('Escape')

  // Hamisha: PNG bila mandhari
  await page.locator('header').getByRole('button', { name: 'Hamisha', exact: true }).click()
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 20000 }),
    page.getByRole('menu').getByRole('menuitem', { name: 'PNG bila mandhari (uwazi)' }).click(),
  ])
  check(/bila-mandhari\.png$/.test(dl.suggestedFilename()), 'PNG bila mandhari inapakua faili ya PNG', dl.suggestedFilename())
} catch (err) {
  exitCode = 1
  console.log(`✗ Mtiririko umesimama: ${err.message.slice(0, 900)}`)
} finally {
  await browser.close()
}

for (const e of jsErrors) console.log(`✗ JS: ${e}`)
const failed = checks.filter((c) => !c.ok).length
if (failed || jsErrors.length) exitCode = 1
console.log(`\nUkaguzi wa zana: ${checks.length - failed} PASS, ${failed} FAIL, makosa ya JS: ${jsErrors.length}`)
process.exit(exitCode)
