// ══════════════════════════════════════════════════════════════
// Ukaguzi wa mabadiliko ya simu dhidi ya desktop: kila kichupo cha simu hakina overflow,
// Back ya lebo ipo kwenye sheet ya Sifa tu (simu), na desktop haina Back hiyo wala mpangilio wa simu.
// Matumizi: node scripts/mobile-sweep-check.mjs   (inahitaji dev server kwenye BASE)
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
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)

async function openEditor(page, mobile) {
  await page.goto(`${BASE}/#/studio`, { waitUntil: 'domcontentloaded' })
  await page.locator('.psh-cs').waitFor({ state: 'visible', timeout: 30000 })
  const nav = page.locator('.psh-cs__navBtn', { hasText: 'Create' }).first()
  if (mobile) await nav.evaluate((el) => el.click()); else await nav.click()
  await page.locator('article.cve-mode', { hasText: 'Social Post' }).getByRole('button', { name: /Anza Social Post/ }).click()
  await page.locator('[data-testid="creative-editor"]').waitFor({ state: 'visible', timeout: 15000 })
}

const browser = await chromium.launch({ headless: true })
try {
  // ── Simu ──
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, locale: 'sw-TZ' })
    const page = await ctx.newPage()
    page.on('pageerror', (e) => { if (!ignorable(e.message)) jsErrors.push(e.message) })
    await openEditor(page, true)
    for (const tab of ['Select', 'Text', 'Image', 'Background', 'Shapes', 'More']) {
      await page.locator('.cve-mnav__btn', { hasText: tab }).click()
      await page.waitForTimeout(150)
      check(!(await overflow(page)), `simu ${tab}: hakuna overflow ya mlalo`)
      check((await page.locator('.cve-mback').count()) === 0 || !(await page.locator('.cve-mback').isVisible()), `simu ${tab}: Back ya sheet ya Sifa haionekani nje ya Sifa`)
    }
    // Sheet ya Sifa kwa maandishi yaliyochaguliwa: Back ipo, maudhui ndani ya skrini
    await page.locator('.cve-mnav__btn', { hasText: 'Text' }).click()
    // Kwenye simu, kitufe kinaweza kufunikwa na sheet; DOM click inatumika kama kwenye ukaguzi mwingine wa simu.
    await page.locator('.cve-lib__item[data-tool="text.add"]').evaluate((el) => el.click())
    await page.waitForTimeout(300)
    await page.locator('.cve-mselbar .cve-btn', { hasText: 'Sifa' }).evaluate((el) => el.click())
    await page.waitForTimeout(200)
    const back = page.locator('.cve-mback .cve-btn', { hasText: 'Rudi kwenye uwanja' })
    check(await back.isVisible(), 'simu: Back ipo kwenye sheet ya Sifa ya maandishi')
    const bb = await back.boundingBox()
    check(bb && bb.height >= 44, 'simu: lengo la Back ≥44px', bb ? `${Math.round(bb.height)}px` : 'n/a')
    const geo = await page.evaluate(() => {
      const r = document.querySelector('.cve-props__inner')?.getBoundingClientRect()
      return r ? { l: Math.round(r.left), r: Math.round(r.right), vw: document.documentElement.clientWidth } : null
    })
    check(geo && geo.l >= 0 && geo.r <= geo.vw, 'simu: maudhui ya Sifa ndani ya skrini', JSON.stringify(geo))
    await back.click()
    await page.waitForTimeout(200)
    check((await page.locator('.cve-root').getAttribute('data-view')) === 'canvas', 'simu: Back inarudi kwenye uwanja')
    await ctx.close()
  }
  // ── Desktop ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'sw-TZ' })
    const page = await ctx.newPage()
    page.on('pageerror', (e) => { if (!ignorable(e.message)) jsErrors.push(e.message) })
    await openEditor(page, false)
    check(!(await overflow(page)), 'desktop: hakuna overflow ya mlalo')
    check(!(await page.locator('.cve-mback').isVisible()), 'desktop: Back ya simu imefichwa')
    const props = await page.evaluate(() => {
      const a = document.querySelector('.cve-props')
      const cs = getComputedStyle(a)
      return { w: Math.round(a.getBoundingClientRect().width), dir: cs.flexDirection, disp: cs.display }
    })
    check(props.w === 300 && props.dir === 'row', 'desktop: kidirisha cha Sifa kina upana wa 300px na mpangilio wa mlalo', JSON.stringify(props))
    // Kundi la rail (G) linafungua paneli ya kulia kwenye desktop, bila Back ya simu
    await page.locator('.cve-rail__btn[aria-label="Rangi na mitindo"], .cve-rail__btn[aria-label="Colour & Style"], .cve-rail__btn').nth(0).click()
    await page.waitForTimeout(200)
    check(!(await overflow(page)), 'desktop: baada ya kufungua rail, hakuna overflow ya mlalo')
    await page.screenshot({ path: '/home/user/pasihai-implementation/creative-shots/29-desktop-after-mobile-changes.png' })
    await ctx.close()
  }
} catch (e) {
  check(false, 'Mtiririko umesimama', e.message.split('\n')[0])
} finally {
  await browser.close()
}
check(jsErrors.length === 0, 'Hakuna JS error', jsErrors.slice(0, 2).join(' | ') || 'safi')
const fail = checks.filter((c) => !c.ok).length
console.log(`\nUkaguzi wa simu dhidi ya desktop: ${checks.length - fail} PASS, ${fail} FAIL`)
process.exit(fail ? 1 : 0)
