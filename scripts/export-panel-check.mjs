// ══════════════════════════════════════════════════════════════
// Export & Publish (P) na mobile Back — ukaguzi wa kivinjari (Playwright, Chromium halisi)
// Desktop 1440×900: paneli ya P, ukubwa 1×/2×, ubora (JPEG), kipimo halisi, hakiki, hamisha (faili halisi).
// Simu 390×844: Back ya lebo kwenye Sifa, lengo ≥44px, hakuna overflow, zana iliyopangwa inafungua paneli ya kundi.
// Matumizi: node scripts/export-panel-check.mjs   (inahitaji dev server kwenye BASE)
// ══════════════════════════════════════════════════════════════
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE || 'http://127.0.0.1:5173'
const SHOTS = process.env.SHOTS || '/home/user/pasihai-implementation/creative-shots'
mkdirSync(SHOTS, { recursive: true })
const DL = '/tmp/pasihai-export-check'
mkdirSync(DL, { recursive: true })

const checks = []
const jsErrors = []
function check(ok, label, detail = '') {
  checks.push({ ok: Boolean(ok), label })
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`)
}
const ignorable = (msg) => /favicon|Download the React DevTools|ResizeObserver loop|\[vite\]/i.test(msg)
const trackErrors = (page) => {
  page.on('pageerror', (e) => { if (!ignorable(e.message)) jsErrors.push(e.message) })
  page.on('console', (m) => { if (m.type() === 'error' && !ignorable(m.text())) jsErrors.push(m.text()) })
}
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)

async function openEditor(page, mobile) {
  await page.goto(`${BASE}/#/studio`, { waitUntil: 'domcontentloaded' })
  await page.locator('.psh-cs').waitFor({ state: 'visible', timeout: 30000 })
  const nav = page.locator('.psh-cs__navBtn', { hasText: 'Create' }).first()
  if (mobile) await nav.evaluate((el) => el.click())
  else await nav.click()
  await page.locator('[data-testid="creative-hub"]').waitFor({ state: 'visible', timeout: 15000 })
  await page.locator('article.cve-mode', { hasText: 'Social Post' }).getByRole('button', { name: /Anza Social Post/ }).click()
  await page.locator('[data-testid="creative-editor"]').waitFor({ state: 'visible', timeout: 15000 })
}

const browser = await chromium.launch({ headless: true })
let exitCode = 0
try {
  // ── Desktop ─────────────────────────────────────────────
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'sw-TZ', acceptDownloads: true })
    const page = await ctx.newPage()
    trackErrors(page)
    await openEditor(page, false)

    await page.locator('.cve-rail__btn[aria-label="Export & Publish"]').click()
    await page.locator('.cve-lib__item[data-tool="export.resolution"]').click()
    const panel = page.locator('[data-testid="props-panel"]')
    check((await panel.getAttribute('data-focus')) === 'P', 'Desktop: export.resolution inafungua paneli ya P')
    check(await panel.locator('.cve-props__title', { hasText: 'Export & Publish' }).count() === 1, 'Desktop: kichwa cha paneli ya P')
    check(await page.locator('.cve-lib__back').count() === 1, 'Desktop: Back ya drawer ipo')

    const sizeText = async () => (await panel.locator('[data-testid="export-size"]').innerText()).trim()
    const s1 = await sizeText()
    const m1 = s1.match(/(\d+)×(\d+) px/)
    check(m1 !== null, '1×: vipimo vinaonekana', s1)
    await panel.locator('.cve-seg__btn', { hasText: /^2×$/ }).click()
    const s2 = await sizeText()
    const m2 = s2.match(/(\d+)×(\d+) px/)
    check(m1 && m2 && Number(m2[1]) === Number(m1[1]) * 2 && Number(m2[2]) === Number(m1[2]) * 2, '2×: vipimo vinazidishwa mara mbili', `${s1} → ${s2}`)
    check(await panel.locator('.cve-slider').count() === 0, 'PNG: kidhibiti cha ubora hakipo')

    await panel.locator('.cve-seg__btn', { hasText: /^JPEG$/ }).click()
    check(await panel.locator('.cve-slider', { hasText: 'Ubora' }).count() === 1, 'JPEG: kidhibiti cha ubora kinaonekana')
    check(await panel.locator('.cve-toggle', { hasText: 'Bila mandhari' }).isDisabled(), 'JPEG: bila mandhari imezimwa')
    await panel.locator('.cve-seg__btn', { hasText: /^PNG$/ }).click()

    await panel.locator('.cve-btn', { hasText: 'Pima ukubwa' }).click()
    const measured = panel.locator('[data-testid="export-measured"]')
    await measured.waitFor({ state: 'visible', timeout: 20000 })
    const mt = await measured.innerText()
    check(/Ukubwa halisi: \d/.test(mt) && /image\/png/.test(mt), 'Kipimo halisi kinaonyesha ukubwa wa faili', mt)

    // Kubadilisha mipangilio kunafuta kipimo cha zamani
    await panel.locator('.cve-seg__btn', { hasText: /^1×$/ }).click()
    check(await panel.locator('[data-testid="export-measured"]').count() === 0, 'Kipimo kinafutwa mipangilio ikibadilika')

    await panel.locator('.cve-btn', { hasText: 'Hakiki' }).click()
    const previewImg = page.locator('img[alt="Hakiki ya muundo"]')
    await previewImg.waitFor({ state: 'visible', timeout: 20000 })
    check(await previewImg.count() === 1, 'Hakiki inafungua picha ya muundo')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    if (await previewImg.count()) {
      const close = page.locator('.cve-dialog .cve-btn', { hasText: /Funga|Sawa|Close/ }).first()
      if (await close.count()) await close.click()
    }
    await page.waitForTimeout(200)

    await panel.locator('.cve-seg__btn', { hasText: /^2×$/ }).click()
    const [dl] = await Promise.all([
      page.waitForEvent('download', { timeout: 30000 }),
      panel.locator('.cve-btn--primary', { hasText: 'Hamisha PNG' }).click(),
    ])
    const name = dl.suggestedFilename()
    const path = `${DL}/${name}`
    await dl.saveAs(path)
    check(/-2x\.png$/.test(name), 'Hamisha 2× inapata jina lenye -2x.png', name)
    const { statSync } = await import('node:fs')
    check(statSync(path).size > 1000, 'Faili iliyohamishwa ina ukubwa halisi', `${statSync(path).size} B`)

    await page.screenshot({ path: `${SHOTS}/24-export-panel-desktop.png` })
    await ctx.close()
  }

  // ── Simu ─────────────────────────────────────────────────
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, locale: 'sw-TZ' })
    const page = await ctx.newPage()
    trackErrors(page)
    await openEditor(page, true)

    // Zana iliyopangwa kwenye simu: kwanza badili kwenye Kina ili ioneshe zana zote, kisha ugusa
    await page.locator('.cve-mnav__btn', { hasText: 'More' }).click()
    await page.locator('.cve-lib button', { hasText: /^Kina$/ }).click()
    await page.locator('.cve-lib__item[data-tool="elem.icons"]').click({ force: true })
    await page.waitForTimeout(300)
    const panelF = page.locator('[data-testid="props-panel"]')
    check((await panelF.getAttribute('data-focus')) === 'F', 'Simu: zana iliyopangwa (Icons) inafungua paneli ya kundi F')
    const backF = page.locator('.cve-mback .cve-btn', { hasText: 'Rudi kwenye uwanja' })
    check(await backF.isVisible(), 'Simu: Back ya lebo inaonekana juu ya paneli ya F')
    const boxF = await backF.boundingBox()
    check(boxF && boxF.height >= 44, 'Simu: lengo la Back ≥44px', boxF ? `${Math.round(boxF.height)}px` : 'n/a')
    check(!(await overflow(page)), 'Simu: paneli ya F haina overflow ya mlalo')
    await page.screenshot({ path: `${SHOTS}/25-mobile-planned-group.png` })
    await backF.click()
    await page.waitForTimeout(200)
    check((await page.locator('.cve-root').getAttribute('data-view')) === 'canvas', 'Simu: Back inarudi kwenye uwanja')

    // Paneli ya P kwenye simu
    await page.locator('.cve-mnav__btn', { hasText: 'More' }).click()
    await page.locator('.cve-lib__item[data-tool="export.resolution"]').click()
    const panelP = page.locator('[data-testid="props-panel"]')
    check((await panelP.getAttribute('data-focus')) === 'P', 'Simu: export.resolution inafungua paneli ya P')
    check(await page.locator('.cve-mback .cve-btn', { hasText: 'Rudi kwenye uwanja' }).isVisible(), 'Simu: Back ipo kwenye paneli ya P')
    check(!(await overflow(page)), 'Simu: paneli ya P haina overflow ya mlalo')
    const geo = await page.evaluate(() => {
      const inner = document.querySelector('.cve-props__inner').getBoundingClientRect()
      return { left: Math.round(inner.left), right: Math.round(inner.right), vw: document.documentElement.clientWidth }
    })
    check(geo.left >= 0 && geo.right <= geo.vw, 'Simu: maudhui ya paneli ya P yako ndani ya skrini (sio kukatwa)', JSON.stringify(geo))
    const small = await page.evaluate(() => {
      const out = []
      for (const el of document.querySelectorAll('.cve-props .cve-btn, .cve-props .cve-toggle, .cve-props .cve-seg__btn, .cve-mback .cve-btn')) {
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) continue
        if (r.height < 44 || r.width < 44) out.push(`${el.textContent.trim().slice(0, 20)}:${Math.round(r.width)}x${Math.round(r.height)}`)
      }
      return out
    })
    check(small.length === 0, 'Simu: vitufe vya paneli ya P vina lengo ≥44px', small.join(', ') || 'zote ≥44')
    await page.screenshot({ path: `${SHOTS}/26-mobile-export-panel.png` })

    // Hakiki na kipimo kwenye simu
    await panelP.locator('.cve-btn', { hasText: 'Pima ukubwa' }).click()
    await panelP.locator('[data-testid="export-measured"]').waitFor({ state: 'visible', timeout: 20000 })
    check(true, 'Simu: kipimo halisi kinafanya kazi')
    await page.locator('.cve-mback .cve-btn', { hasText: 'Rudi kwenye uwanja' }).click()
    check((await page.locator('.cve-root').getAttribute('data-view')) === 'canvas', 'Simu: Back ya P inarudi kwenye uwanja')
    await ctx.close()
  }
} catch (e) {
  check(false, 'Mtiririko umesimama', e.message.split('\n')[0])
} finally {
  await browser.close()
}

check(jsErrors.length === 0, 'Hakuna JS error', jsErrors.slice(0, 2).join(' | ') || 'safi')
const fail = checks.filter((c) => !c.ok).length
console.log(`\nExport & Publish + mobile Back: ${checks.length - fail} PASS, ${fail} FAIL`)
if (fail) exitCode = 1
process.exit(exitCode)
