// ══════════════════════════════════════════════════════════════
// Creative editor — ukaguzi wa kivinjari (Playwright, Chromium halisi)
// Matumizi: node scripts/creative-browser-check.mjs   (inahitaji dev server kwenye BASE)
// Inathibitisha mtiririko wa kukubalika: Create → maandishi → font/rangi/ukubwa → kuhamisha →
// picha → tabaka → mandhari → undo → hifadhi → fungua upya → PNG export; kisha mobile.
// Inashindwa (exit 1) kwa hitilafu yoyote ya ukaguzi au ya JavaScript isiyotarajiwa.
// Screenshots: ../pasihai-implementation/creative-shots/
// ══════════════════════════════════════════════════════════════
import { chromium } from 'playwright'
import { mkdirSync, readFileSync, statSync } from 'node:fs'

const BASE = process.env.BASE || 'http://127.0.0.1:5173'
const SHOTS = process.env.SHOTS || '/home/user/pasihai-implementation/creative-shots'
const IMAGE = '/tmp/pasihai-test-image.png'
const PROJECT_TITLE = `Ukaguzi ${Date.now().toString(36)}`
mkdirSync(SHOTS, { recursive: true })

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
  // ── Desktop ───────────────────────────────────────────────
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'sw-TZ', acceptDownloads: true })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => { if (!ignorable(e.message)) jsErrors.push(`pageerror: ${e.message}`) })
  page.on('console', (m) => { if (m.type() === 'error' && !ignorable(m.text())) jsErrors.push(`console: ${m.text()}`) })

  await page.goto(`${BASE}/#/studio`, { waitUntil: 'domcontentloaded' })
  await page.locator('.psh-cs').waitFor({ state: 'visible', timeout: 30000 })
  await page.locator('.psh-cs__navBtn', { hasText: 'Create' }).first().click()
  const hub = page.locator('[data-testid="creative-hub"]')
  await hub.waitFor({ state: 'visible', timeout: 15000 })
  check(await hub.count(), 'Create inafungua hub mpya (si gallery ya zamani)')
  await page.screenshot({ path: `${SHOTS}/01-hub.png`, fullPage: false })

  await page.locator('article.cve-mode', { hasText: 'Social Post' }).getByRole('button', { name: /Anza Social Post/ }).click()
  const editor = page.locator('[data-testid="creative-editor"]')
  await editor.waitFor({ state: 'visible', timeout: 15000 })
  check(await page.locator('.psh-cs.is-editor').count(), 'Mhariri unaficha topbar na nav ya Studio')
  check(await page.locator('.cve-layer').count() >= 1, 'Mode ya Social ina tabaka za kuanzia')

  // Ongeza maandishi
  await openRail(page, 'Text')
  await page.getByRole('button', { name: 'Ongeza maandishi', exact: true }).click()
  const textLayer = page.locator('.cve-layer[data-type="text"]').last()
  await textLayer.waitFor({ state: 'visible' })
  check(await textLayer.getAttribute('class').then((c) => /is-sel/.test(c)), 'Maandishi mapya yamechaguliwa')
  check(await page.locator('[data-testid="props-panel"] .cve-props__title', { hasText: 'Maandishi' }).count(), 'Sifa zinaonyesha sehemu ya maandishi')

  // Font
  await page.locator('.cve-font__btn').click()
  await page.locator('.cve-font__opt', { hasText: 'Georgia' }).click()
  const fontFamily = await textLayer.locator('.cve-text').evaluate((el) => getComputedStyle(el).fontFamily)
  check(/Georgia/.test(fontFamily), 'Font imebadilika kuwa Georgia', fontFamily)

  // Ukubwa
  await page.getByLabel('Ukubwa (nambari)').fill('96')
  await page.getByLabel('Ukubwa (nambari)').press('Enter')
  const fontSize = await textLayer.locator('.cve-text').evaluate((el) => getComputedStyle(el).fontSize)
  check(fontSize === '96px', 'Ukubwa wa font ni 96px', fontSize)

  // Rangi (HEX)
  await page.getByLabel('Rangi ya maandishi: msimbo wa HEX').fill('#d1245a')
  await page.getByLabel('Rangi ya maandishi: msimbo wa HEX').press('Enter')
  const color = await textLayer.locator('.cve-text').evaluate((el) => getComputedStyle(el).color)
  check(color === 'rgb(209, 36, 90)', 'Rangi ya maandishi imebadilika', color)

  // Kuhamisha kwa kuburuta
  await openRail(page, 'Select & Arrange') // nafasi ni ya kundi A, si ya Maandishi
  const beforeX = Number(await page.getByLabel('X', { exact: true }).inputValue())
  const box = await textLayer.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2 + 20, { steps: 6 })
  await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2 + 40, { steps: 6 })
  await page.mouse.up()
  await page.waitForTimeout(150)
  const afterX = Number(await page.getByLabel('X', { exact: true }).inputValue())
  check(afterX > beforeX, 'Kuburuta kunasogeza maandishi kwenye turubai', `X ${beforeX} → ${afterX}`)
  await page.screenshot({ path: `${SHOTS}/02-text-selected.png` })

  // Picha (kifaa)
  await openRail(page, 'Images & Photos')
  await page.getByRole('button', { name: 'Ingiza picha kutoka kifaa', exact: true }).click()
  await page.locator('input[type="file"][aria-label="Chagua picha"]').setInputFiles(IMAGE)
  const imageLayer = page.locator('.cve-layer[data-type="image"]').last()
  await imageLayer.waitFor({ state: 'visible', timeout: 10000 })
  check(await imageLayer.count(), 'Picha imeongezwa kwenye turubai')

  // Mpangilio wa tabaka: picha iende chini ya maandishi
  const rowsBefore = await page.locator('.cve-layer-row__name').allInnerTexts()
  const imgRow = page.locator('.cve-layer-row', { has: page.locator('.cve-thumb img') }).first()
  await imgRow.getByRole('button', { name: 'Sogeza chini' }).click()
  const rowsAfter = await page.locator('.cve-layer-row__name').allInnerTexts()
  check(JSON.stringify(rowsBefore) !== JSON.stringify(rowsAfter), 'Tabaka zimepangwa upya', `${rowsBefore.join(' | ')} → ${rowsAfter.join(' | ')}`)

  // Mandhari (kundi A la sifa kamili; kundi D lina vidhibiti vyake)
  await openRail(page, 'Select & Arrange')
  await page.locator('.cve-doc').click({ position: { x: 5, y: 5 } })
  await page.locator('[data-testid="props-panel"] .cve-props__title', { hasText: 'Mandhari' }).waitFor({ timeout: 5000 }).catch(() => {})
  const propsText = (await page.locator('[data-testid="props-panel"]').first().innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 160)
  check(await page.getByText('Aina ya mandhari').count(), 'Bila kipengele, sifa zinaonyesha mandhari', propsText)
  await page.getByLabel('Rangi: msimbo wa HEX').fill('#fbf4e0')
  await page.getByLabel('Rangi: msimbo wa HEX').press('Enter')
  const bg = await page.locator('.cve-doc').evaluate((el) => getComputedStyle(el).backgroundColor)
  check(bg === 'rgb(251, 244, 224)', 'Mandhari ya turubai imebadilika', bg)
  await page.screenshot({ path: `${SHOTS}/03-background.png` })

  // Undo: mandhari irudi kwenye rangi ya awali
  await page.getByRole('button', { name: /Rudisha \(Undo\)/ }).click()
  const bgAfterUndo = await page.locator('.cve-doc').evaluate((el) => getComputedStyle(el).backgroundColor)
  check(bgAfterUndo !== bg, 'Undo inarudisha mandhari', bgAfterUndo)

  // Hifadhi
  await page.getByRole('button', { name: 'Hifadhi', exact: true }).click()
  await page.locator('.cve-status', { hasText: 'Imehifadhiwa' }).waitFor({ timeout: 10000 })
  check(true, 'Hifadhi inaonyesha "Imehifadhiwa"')

  // Jina la mradi
  const title = page.getByLabel('Jina la mradi', { exact: true })
  await title.fill(PROJECT_TITLE)
  await title.press('Enter')
  await page.getByRole('button', { name: 'Hifadhi', exact: true }).click()
  await page.locator('.cve-status', { hasText: 'Imehifadhiwa' }).waitFor({ timeout: 10000 })

  // Export PNG
  // Hamisha → menyu → PNG (menyu ya export ina PNG, PNG bila mandhari, JPEG, WebP)
  await page.getByRole('button', { name: 'Hamisha', exact: true }).click()
  const exportMenu = page.getByRole('menu')
  check(await exportMenu.getByRole('menuitem', { name: 'Hamisha PNG' }).count() === 1, 'Menyu ya Hamisha ina PNG')
  check(await exportMenu.getByRole('menuitem', { name: 'Hamisha JPEG' }).count() === 1, 'Menyu ya Hamisha ina JPEG')
  check(await exportMenu.getByRole('menuitem', { name: 'Hamisha WebP' }).count() === 1, 'Menyu ya Hamisha ina WebP')
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 20000 }),
    exportMenu.getByRole('menuitem', { name: 'Hamisha PNG' }).click(),
  ])
  const pngPath = `${SHOTS}/04-export.png`
  await download.saveAs(pngPath)
  const head = readFileSync(pngPath).subarray(0, 8)

  // Hamisha JPEG kutoka kwenye menyu
  await page.getByRole('button', { name: 'Hamisha', exact: true }).click()
  const [jpgDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 20000 }),
    page.getByRole('menu').getByRole('menuitem', { name: 'Hamisha JPEG' }).click(),
  ])
  check(/\.jpe?g$/i.test(jpgDownload.suggestedFilename()), 'Hamisha JPEG inapakua faili ya JPEG', jpgDownload.suggestedFilename())

  // Maktaba ya zana: utafutaji unachuja matokeo
  const libSearch = page.getByRole('searchbox', { name: 'Tafuta zana' })
  await libSearch.fill('maandishi')
  check((await page.locator('.cve-lib__item', { hasText: 'Ongeza maandishi' }).count()) === 1 && (await page.locator('.cve-lib__item').count()) < 20, 'Utafutaji wa zana unachuja matokeo')
  await libSearch.fill('')

  // Ctrl+A chagua vipengele vyote; Esc inaondoa uteuzi; ? inafungua njia za mkato
  await page.locator('.cve-main').click({ position: { x: 4, y: 4 } })
  await page.keyboard.press('Control+a')
  const layerTotal = await page.locator('.cve-layer').count()
  check(layerTotal >= 2 && (await page.locator('.cve-layer.is-sel').count()) === layerTotal, 'Ctrl+A inachagua vipengele vyote', `${layerTotal}`)
  await page.keyboard.press('Escape')
  check((await page.locator('.cve-layer.is-sel').count()) === 0, 'Esc inaondoa uteuzi')
  await page.keyboard.press('?')
  const shortcutsDialog = page.getByRole('dialog')
  check(await shortcutsDialog.getByText('Njia za mkato', { exact: false }).count() >= 1, 'Kitufe cha ? kinafungua njia za mkato')
  await page.keyboard.press('Escape')
  check(head.toString('hex') === '89504e470d0a1a0a', 'Export ni PNG halisi', `${statSync(pngPath).size} bytes`)

  // Rudi Studio, fungua upya
  await page.getByRole('button', { name: 'Rudi kwenye Studio' }).click()
  await hub.waitFor({ state: 'visible', timeout: 10000 })
  const project = page.locator('.cve-project', { hasText: PROJECT_TITLE })
  check(await project.count(), 'Mradi unaonekana kwenye "Miradi yangu"')
  await project.getByRole('button', { name: 'Fungua' }).click()
  await editor.waitFor({ state: 'visible' })
  await page.locator('.cve-layer[data-type="text"]').first().waitFor({ state: 'visible' })
  const reopenedTitle = await page.getByLabel('Jina la mradi', { exact: true }).inputValue()
  check(reopenedTitle === PROJECT_TITLE, 'Mradi unafunguka upya kwa jina lake', reopenedTitle)
  const reopenedLayers = await page.locator('.cve-layer').count()
  check(reopenedLayers >= 3, 'Tabaka zote zimerudi baada ya kufungua upya', `${reopenedLayers}`)
  const reopenedFont = await page.locator('.cve-layer[data-type="text"]').last().locator('.cve-text').evaluate((el) => getComputedStyle(el).fontFamily)
  check(/Georgia/.test(reopenedFont), 'Font ya maandishi imehifadhiwa', reopenedFont)
  await page.screenshot({ path: `${SHOTS}/05-reopened.png` })

  // Preview
  await page.locator('header').getByRole('button', { name: 'Hakiki', exact: true }).click()
  await page.getByRole('dialog').locator('img').waitFor({ state: 'visible', timeout: 15000 })
  check(true, 'Hakiki inaonyesha PNG')
  await page.locator('.cve-dialog__head .cve-iconbtn').click()

  // Chapisha: lazima ionyeshe ujumbe wa usanidi, si "imechapishwa" ya uongo
  await page.getByRole('button', { name: 'Chapisha' }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Chapisha', exact: true }).click()
  const outcome = page.getByRole('dialog').locator('.cve-error, .cve-note, [role="status"], [role="alert"]').first()
  await outcome.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {})
  await page.getByRole('dialog').getByText('Inatengeneza picha', { exact: false }).or(page.getByRole('dialog').getByText('Inachapisha', { exact: false }))
    .first().waitFor({ state: 'detached', timeout: 60000 }).catch(() => {})
  await page.waitForTimeout(500)
  const publishText = (await page.getByRole('dialog').innerText().catch(() => '')).replace(/\s+/g, ' ').trim()
  check(publishText.length > 0, 'Chapisho linamaliza na kuonyesha matokeo', publishText.slice(0, 220))
  check(!/Imechapishwa/.test(publishText), 'Chapisho halisemi "Imechapishwa" bila post halisi')
  await page.screenshot({ path: `${SHOTS}/06-publish-state.png` })
  await page.getByRole('dialog').getByRole('button', { name: 'Ghairi' }).click().catch(() => {})
  await page.keyboard.press('Escape')

  await ctx.close()

  // ── Mobile ────────────────────────────────────────────────
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'sw-TZ' })
  const m = await mctx.newPage()
  m.on('pageerror', (e) => { if (!ignorable(e.message)) jsErrors.push(`m pageerror: ${e.message}`) })
  m.on('console', (msg) => { if (msg.type() === 'error' && !ignorable(msg.text())) jsErrors.push(`m console: ${msg.text()}`) })
  await m.goto(`${BASE}/#/studio`, { waitUntil: 'domcontentloaded' })
  await m.locator('.psh-cs').waitFor({ state: 'visible', timeout: 30000 })
  // Kwenye mobile, nav ya Studio inaweza kuwa kwenye menyu; tunatumia hash moja kwa moja.
  const navCreate = m.locator('.psh-cs__navBtn', { hasText: 'Create' }).first()
  await navCreate.evaluate((el) => el.click())
  await m.locator('[data-testid="creative-hub"]').waitFor({ state: 'visible', timeout: 15000 })
  await m.locator('article.cve-mode', { hasText: 'Blank Canvas' }).getByRole('button', { name: /Anza Blank Canvas/ }).click()
  await m.locator('[data-testid="creative-editor"]').waitFor({ state: 'visible' })

  check(await m.locator('.cve-mnav').isVisible(), 'Mobile: bottom nav inaonekana')
  const noPageScroll = await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
  check(noPageScroll, 'Mobile: hakuna kuteleza kwa ukurasa kwa mlalo')
  // Bottom nav mpya (MASTER §4): Select · Text · Image · Background · Shapes · More
  check(JSON.stringify(await m.locator('.cve-mnav__btn').allInnerTexts()) === JSON.stringify(['Select', 'Text', 'Image', 'Background', 'Shapes', 'More']), 'Mobile: bottom nav ya mhariri ina Select, Text, Image, Background, Shapes, More')
  await m.locator('.cve-mnav__btn', { hasText: 'Text' }).click()
  check(await m.locator('.cve-lib').isVisible(), 'Mobile: Text inaonyesha kundi la Text')
  check(await m.locator('.cve-lib__group[data-group="B"]').isVisible() && await m.locator('.cve-lib__group').count() === 1, 'Mobile: Text inaonyesha kundi moja tu')
  const textBefore = await m.locator('.cve-layer[data-type="text"]').count()
  await m.getByRole('button', { name: 'Ongeza maandishi', exact: true }).click()
  await m.locator('.cve-layer[data-type="text"]').nth(textBefore).waitFor({ state: 'attached', timeout: 5000 })
  check((await m.locator('.cve-layer[data-type="text"]').count()) === textBefore + 1, 'Mobile: kuongeza maandishi kutoka Zana kunafanya kazi', `${textBefore} → ${textBefore + 1}`)
  await m.locator('.cve-mnav__btn', { hasText: 'Shapes' }).click()
  await m.locator('.cve-lib__item', { hasText: 'Maumbo na mistari' }).click()
  check(await m.locator('.cve-flyout').isVisible(), 'Mobile: sheet ya maumbo inafunguka')
  await m.locator('.cve-flyout__tile', { hasText: 'Duara' }).click()
  await m.locator('.cve-mnav__btn', { hasText: 'Select' }).click()
  check(await m.locator('.cve-main').isVisible(), 'Mobile: Select inaonyesha turubai')
  check(await m.locator('.cve-props').isHidden(), 'Mobile: sifa zimefichwa kwenye Select')
  await m.getByRole('button', { name: 'Sifa', exact: true }).click()
  check(await m.locator('.cve-props').isVisible(), 'Mobile: Sifa ya kipengele kilichochaguliwa inaonekana')
  await m.locator('.cve-mnav__btn', { hasText: 'More' }).click()
  await m.locator('.cve-lib__item', { hasText: 'Orodha ya tabaka' }).click()
  check(await m.locator('.cve-layers').isVisible(), 'Mobile: More → Orodha ya tabaka inaonyesha tabaka kamili')
  await m.locator('.cve-mnav__btn', { hasText: 'Select' }).click()
  check(await m.locator('.cve-main').isVisible(), 'Mobile: kurudi kwenye Select')
  const saveBtn = m.getByRole('button', { name: 'Hifadhi', exact: true })
  check(await saveBtn.isVisible(), 'Mobile: Hifadhi inapatikana kila wakati')
  check(await m.getByRole('button', { name: 'Hakiki', exact: true }).isVisible(), 'Mobile: Hakiki inapatikana kila wakati')
  await m.screenshot({ path: `${SHOTS}/07-mobile-canvas.png` })
  await m.locator('.cve-mnav__btn', { hasText: 'More' }).click()
  await m.screenshot({ path: `${SHOTS}/08-mobile-tools.png` })
  await mctx.close()
} catch (err) {
  exitCode = 1
  console.log(`✗ Mtiririko umesimama: ${err.message}`)
} finally {
  await browser.close()
}

const failed = checks.filter((c) => !c.ok)
if (jsErrors.length) {
  console.log('\nMakosa ya JavaScript kwenye kurasa:')
  for (const e of jsErrors.slice(0, 20)) console.log(`  - ${e.slice(0, 300)}`)
}
console.log(`\nUkaguzi wa kivinjari: ${checks.length - failed.length} PASS, ${failed.length} FAIL, makosa ya JS: ${jsErrors.length}`)
if (failed.length || jsErrors.length) exitCode = 1
process.exit(exitCode)
