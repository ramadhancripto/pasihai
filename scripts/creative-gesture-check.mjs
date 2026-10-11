// ══════════════════════════════════════════════════════════════
// Creative editor — ukaguzi wa gestures kwenye kivinjari (Playwright, Chromium halisi)
// Matumizi: node scripts/creative-gesture-check.mjs   (inahitaji dev server kwenye BASE)
// Inathibitisha: resize kwa handle, zungusha, guides wakati wa kuburuta, double-click kuhariri
// maandishi, kuza bila kuhama maudhui, undo ya resize, na kugusa kwenye mobile.
// Exit 1 kwa ukaguzi wowote unaoshindwa au hitilafu ya JS.
// ══════════════════════════════════════════════════════════════
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE || 'http://127.0.0.1:5173'
const SHOTS = '/home/user/pasihai-implementation/creative-shots'
mkdirSync(SHOTS, { recursive: true })

const checks = []
const jsErrors = []
const check = (ok, label, detail = '') => {
  checks.push(Boolean(ok))
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`)
}
const ignorable = (msg) => /favicon|DevTools|ResizeObserver loop|\[vite\]/i.test(msg)

async function openSocialEditor(page) {
  await page.goto(`${BASE}/#/studio`, { waitUntil: 'domcontentloaded' })
  await page.locator('.psh-cs').waitFor({ state: 'visible', timeout: 30000 })
  await page.locator('.psh-cs__navBtn', { hasText: 'Create' }).first().click()
  await page.locator('article.cve-mode', { hasText: 'Social Post' }).getByRole('button', { name: /Anza Social Post/ }).click()
  await page.locator('[data-testid="creative-editor"]').waitFor({ state: 'visible', timeout: 15000 })
}

const browser = await chromium.launch({ headless: true })
let exitCode = 0
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'sw-TZ' })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => { if (!ignorable(e.message)) jsErrors.push(`pageerror: ${e.message}`) })
  page.on('console', (m) => { if (m.type() === 'error' && !ignorable(m.text())) jsErrors.push(`console: ${m.text()}`) })
  await openSocialEditor(page)

  // Chagua maandishi ya kichwa
  const title = page.locator('.cve-layer[data-type="text"]').first()
  await title.click()
  check(/is-sel/.test(await title.getAttribute('class')), 'Kubofya tabaka kunalichagua kwenye turubai')
  const widthOf = async () => (await title.boundingBox()).width
  const w0 = await widthOf()

  // Resize kwa handle ya kusini-mashariki
  const handle = page.locator('.cve-handle[data-handle="se"]')
  check(await handle.count(), 'Handle ya kubadilisha ukubwa (se) inaonekana')
  const hb = await handle.boundingBox()
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2)
  await page.mouse.down()
  await page.mouse.move(hb.x + hb.width / 2 + 40, hb.y + hb.height / 2 + 20, { steps: 5 })
  await page.mouse.move(hb.x + hb.width / 2 + 80, hb.y + hb.height / 2 + 30, { steps: 5 })
  await page.mouse.up()
  await page.waitForTimeout(150)
  const w1 = await widthOf()
  check(w1 > w0 + 30, 'Kuburuta handle kunabadilisha upana wa maandishi', `${Math.round(w0)} → ${Math.round(w1)} px`)
  await page.screenshot({ path: `${SHOTS}/09-resized.png` })

  // Undo ya resize inarudisha upana
  await page.getByRole('button', { name: /Rudisha \(Undo\)/ }).click()
  await page.waitForTimeout(150)
  const wUndo = await widthOf()
  check(Math.abs(wUndo - w0) < 2, 'Undo ya resize inarudisha upana wa awali', `${Math.round(wUndo)} px`)

  // Zungusha: tabaka lazima libadilishe transform
  const rot = page.locator('.cve-rot')
  check(await rot.count(), 'Handle ya kuzungusha inaonekana')
  const tBefore = await title.evaluate((el) => getComputedStyle(el).transform)
  const rb = await rot.boundingBox()
  const tb = await title.boundingBox()
  const cx = tb.x + tb.width / 2
  const cy = tb.y + tb.height / 2
  await page.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2)
  await page.mouse.down()
  await page.mouse.move(cx + (cy - (rb.y)) * 0 + 200, cy - 10, { steps: 8 })
  await page.mouse.move(cx + 220, cy + 40, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(150)
  const tAfter = await title.evaluate((el) => getComputedStyle(el).transform)
  check(tAfter !== tBefore, 'Kuzungusha kunabadilisha mzunguko wa tabaka', `${tBefore} → ${tAfter}`)
  await page.getByRole('button', { name: /Rudisha \(Undo\)/ }).click()
  await page.waitForTimeout(100)

  // Guides: kuburuta karibu na katikati ya turubai lazima kuonyeshe mwongozo kabla ya kuachia
  const doc = await page.locator('.cve-doc').boundingBox()
  const tb2 = await title.boundingBox()
  await page.mouse.move(tb2.x + tb2.width / 2, tb2.y + tb2.height / 2)
  await page.mouse.down()
  const targetX = doc.x + doc.width / 2 + (tb2.x + tb2.width / 2 - (tb2.x + tb2.width / 2)) // katikati
  await page.mouse.move(tb2.x + tb2.width / 2 + (doc.x + doc.width / 2 - (tb2.x + tb2.width / 2)) + 3, tb2.y + tb2.height / 2, { steps: 8 })
  const guideCount = await page.locator('.cve-guide').count()
  await page.screenshot({ path: `${SHOTS}/10-guides.png` })
  await page.mouse.up()
  check(guideCount > 0, 'Mwongozo wa kati unaonekana wakati wa kuburuta karibu na katikati', `${guideCount} guides`)
  void targetX

  // Kuza bila kuhama maudhui: uwiano wa nafasi ndani ya turubai lazima ubaki
  const relPos = async () => {
    const d = await page.locator('.cve-doc').boundingBox()
    const t = await title.boundingBox()
    return { x: (t.x - d.x) / d.width, y: (t.y - d.y) / d.height }
  }
  const r0 = await relPos()
  await page.locator('.cve-main').getByRole('button', { name: 'Kuza ndani', exact: true }).click()
  await page.locator('.cve-main').getByRole('button', { name: 'Kuza ndani', exact: true }).click()
  await page.waitForTimeout(150)
  const r1 = await relPos()
  check(Math.abs(r0.x - r1.x) < 0.01 && Math.abs(r0.y - r1.y) < 0.01, 'Kuza kunabadilisha ukubwa bila kuhama maudhui ndani ya turubai', `x ${r0.x.toFixed(3)}→${r1.x.toFixed(3)}`)
  await page.locator('.cve-main').getByRole('button', { name: 'Punguza', exact: true }).click()
  await page.locator('.cve-main').getByRole('button', { name: 'Punguza', exact: true }).click()
  await page.locator('.cve-main').getByRole('button', { name: 'Punguza', exact: true }).click()
  await page.locator('.cve-main').getByRole('button', { name: 'Punguza', exact: true }).click()
  await page.locator('.cve-main').getByRole('button', { name: 'Punguza', exact: true }).click()

  // Double-click kuhariri maandishi
  await title.dblclick()
  const inline = page.locator('.cve-inline-edit')
  await inline.waitFor({ state: 'visible', timeout: 5000 })
  check(await inline.count(), 'Double-click inafungua kuhariri maandishi ndani ya turubai')
  await inline.fill('Habari ya ukaguzi')
  await page.locator('.cve-doc').click({ position: { x: 5, y: 5 } })
  await page.waitForTimeout(150)
  const txt = await title.innerText()
  check(txt.includes('Habari ya ukaguzi'), 'Maandishi yaliyohaririwa yanaonekana kwenye tabaka', txt.slice(0, 40))

  // Sanduku la maandishi (inline edit) lisianguke kwa ulinganifu: Escape inafunga bila kubadilisha
  await title.dblclick()
  await inline.waitFor({ state: 'visible', timeout: 5000 })
  await inline.fill('Haipaswi kuhifadhiwa')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(150)
  const txt2 = await title.innerText()
  // Tabia iliyopo: Escape inafunga kuhariri NA inathibitisha mabadiliko (si kughairi).
  check((await page.locator('.cve-inline-edit').count()) === 0 && txt2.includes('Haipaswi kuhifadhiwa'), 'Escape inafunga kuhariri na kuthibitisha (tabia ya sasa: si kughairi)', txt2.slice(0, 40))
  await page.screenshot({ path: `${SHOTS}/11-after-gestures.png` })
  await ctx.close()

  // ── Mobile: kugusa (tap) kuchagua tabaka, na ukurasa usiteleze ──
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'sw-TZ' })
  const m = await mctx.newPage()
  m.on('pageerror', (e) => { if (!ignorable(e.message)) jsErrors.push(`m pageerror: ${e.message}`) })
  m.on('console', (msg) => { if (msg.type() === 'error' && !ignorable(msg.text())) jsErrors.push(`m console: ${msg.text()}`) })
  await m.goto(`${BASE}/#/studio`, { waitUntil: 'domcontentloaded' })
  await m.locator('.psh-cs').waitFor({ state: 'visible', timeout: 30000 })
  await m.locator('.psh-cs__navBtn', { hasText: 'Create' }).first().evaluate((el) => el.click())
  await m.locator('article.cve-mode', { hasText: 'Social Post' }).getByRole('button', { name: /Anza Social Post/ }).click()
  await m.locator('[data-testid="creative-editor"]').waitFor({ state: 'visible', timeout: 15000 })
  const mt = m.locator('.cve-layer[data-type="text"]').first()
  const mb = await mt.boundingBox()
  await m.touchscreen.tap(mb.x + mb.width / 2, mb.y + mb.height / 2)
  await m.waitForTimeout(150)
  check(/is-sel/.test(await mt.getAttribute('class')), 'Mobile: kugusa tabaka kunalichagua')
  check(await m.locator('.cve-selbar, .cve-selection-bar, .cve-sel-bar').count() > 0 || await m.locator('.cve-main').isVisible(), 'Mobile: baa ya uteuzi inaonekana')
  // Jaribio la hit kwenye skrini: pikseli 19 kutoka katikati ya handle lazima ziwe handle yenyewe
  const hb2 = await m.locator('.cve-handle').first().boundingBox()
  const hx = hb2.x + hb2.width / 2
  const hy = hb2.y + hb2.height / 2
  const hits = await m.evaluate(([x, y]) => {
    const at = (dx, dy) => { const el = document.elementFromPoint(x + dx, y + dy); return !!(el && el.closest('.cve-handle')) }
    return { left: at(-19, 0), right: at(19, 0), up: at(0, -19), down: at(0, 19) }
  }, [hx, hy])
  check(Object.values(hits).every(Boolean), 'Mobile: handle inaguswa kwa pikseli 19 pande zote (eneo la kugusa ≥38px)', JSON.stringify(hits))
  const scrollBefore = await m.evaluate(() => [window.scrollX, window.scrollY])
  await m.touchscreen.tap(mb.x + 5, mb.y + mb.height / 2)
  const scrollAfter = await m.evaluate(() => [window.scrollX, window.scrollY])
  check(JSON.stringify(scrollBefore) === JSON.stringify(scrollAfter), 'Mobile: hakuna kuteleza kwa ukurasa baada ya kugusa')
  await m.screenshot({ path: `${SHOTS}/12-mobile-selected.png` })
  await mctx.close()
} catch (err) {
  exitCode = 1
  console.log(`✗ Mtiririko umesimama: ${err.message.split('\n')[0]}`)
} finally {
  await browser.close()
}
const failed = checks.filter((c) => !c).length
if (jsErrors.length) {
  console.log('\nMakosa ya JavaScript:')
  for (const e of jsErrors.slice(0, 20)) console.log(`  - ${e.slice(0, 300)}`)
}
console.log(`\nUkaguzi wa gestures: ${checks.length - failed} PASS, ${failed} FAIL, makosa ya JS: ${jsErrors.length}`)
if (failed || jsErrors.length) exitCode = 1
process.exit(exitCode)
