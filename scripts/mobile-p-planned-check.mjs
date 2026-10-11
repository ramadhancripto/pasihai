// ══════════════════════════════════════════════════════════════
// Zana zilizopangwa za kundi P kwenye simu (390×844): kila zana ina tabia iliyo wazi.
// Inathibitisha: taarifa inalingana na rejista (note/sababu), hakuna ujumbe wa mafanikio wa uongo,
// hakuna tabaka lililoongezwa, hakuna dialog ya kuchapisha, na hakuna overflow.
// Matumizi: node scripts/mobile-p-planned-check.mjs   (inahitaji dev server kwenye BASE)
// ══════════════════════════════════════════════════════════════
import { chromium } from 'playwright'
import { TOOLS, STATUS_LABEL } from '../src/creative/toolRegistry.js'

const BASE = process.env.BASE || 'http://127.0.0.1:5173'
const checks = []
const jsErrors = []
function check(ok, label, detail = '') {
  checks.push({ ok: Boolean(ok), label })
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`)
}
const ignorable = (msg) => /favicon|Download the React DevTools|ResizeObserver loop|\[vite\]/i.test(msg)
const SUCCESS = /imehifadhiwa|imechapishwa|imefanikiwa|imetumwa|imepangwa|imeongezwa|imenakiliwa|imetengenezwa/i

const planned = TOOLS.filter((t) => t.group === 'P' && !t.action && t.status !== 'ready' && t.status !== 'partial')
const withAction = TOOLS.filter((t) => t.group === 'P' && t.status !== 'planned' && t.status !== 'premium' && t.status !== 'service')
check(planned.length >= 8, `rejista: zana zilizopangwa za P ni ${planned.length}`, planned.map((t) => t.id).join(', '))
check(withAction.every((t) => t.status === 'ready' || t.status === 'partial'), 'rejista: zana zisizo planned za P ni ready/partial')

const browser = await chromium.launch({ headless: true })
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, locale: 'sw-TZ' })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => { if (!ignorable(e.message)) jsErrors.push(e.message) })
  page.on('console', (m) => { if (m.type() === 'error' && !ignorable(m.text())) jsErrors.push(m.text()) })

  await page.goto(`${BASE}/#/studio`, { waitUntil: 'domcontentloaded' })
  await page.locator('.psh-cs').waitFor({ state: 'visible', timeout: 30000 })
  await page.locator('.psh-cs__navBtn', { hasText: 'Create' }).first().evaluate((el) => el.click())
  await page.locator('article.cve-mode', { hasText: 'Social Post' }).getByRole('button', { name: /Anza Social Post/ }).click()
  await page.locator('[data-testid="creative-editor"]').waitFor({ state: 'visible', timeout: 15000 })
  await page.locator('.cve-mnav__btn', { hasText: 'More' }).click()
  await page.locator('.cve-lib button', { hasText: /^Kina$/ }).click()

  const layersBefore = await page.locator('.cve-layer').count()
  for (const t of planned) {
    const expected = t.note ?? 'Bado haijajengwa.'
    const item = page.locator(`.cve-lib__item[data-tool="${t.id}"]`)
    const present = (await item.count()) === 1
    check(present, `${t.id}: zana ipo kwenye drawer`)
    if (!present) continue
    check((await item.getAttribute('aria-disabled')) === 'true', `${t.id}: imezimwa (aria-disabled)`, STATUS_LABEL[t.status])
    await item.click({ force: true })
    await page.waitForTimeout(250)
    const toast = (await page.locator('.cve-toast').innerText()).trim()
    check(toast.length > 0, `${t.id}: taarifa inaonekana kwenye skrini`, toast.slice(0, 60))
    check(toast === expected, `${t.id}: taarifa inalingana na rejista (${STATUS_LABEL[t.status]})`, toast === expected ? '' : `inatarajiwa: ${expected.slice(0, 50)}`)
    check(!SUCCESS.test(toast), `${t.id}: hakuna ujumbe wa mafanikio wa uongo`)
    check((await page.locator('[role="dialog"]').count()) === 0, `${t.id}: hakuna dialog iliyofunguka`)
  }
  check((await page.locator('.cve-layer').count()) === layersBefore, 'zana zote zilizopangwa: hakuna tabaka lililoongezwa', `tabaka ${layersBefore}`)

  // Zana ya premium ina ujumbe wa premium, si planned.
  const adv = TOOLS.find((t) => t.id === 'biz.advancedExport')
  if (adv && (await page.locator(`.cve-lib__item[data-tool="${adv.id}"]`).count()) === 1) {
    await page.locator(`.cve-lib__item[data-tool="${adv.id}"]`).click({ force: true })
    await page.waitForTimeout(250)
    const t = (await page.locator('.cve-toast').innerText()).trim()
    check(/premium/i.test(t), 'biz.advancedExport: ujumbe unataja premium', t.slice(0, 60))
  }

  // Overflow ya simu baada ya kugusa zote
  const ov = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  check(!ov, 'simu: hakuna overflow ya mlalo baada ya kugusa zana zote za P')
  await page.screenshot({ path: '/home/user/pasihai-implementation/creative-shots/28-mobile-p-planned-toast.png' })
  await ctx.close()
} catch (e) {
  check(false, 'Mtiririko umesimama', e.message.split('\n')[0])
} finally {
  await browser.close()
}
check(jsErrors.length === 0, 'Hakuna JS error', jsErrors.slice(0, 2).join(' | ') || 'safi')
const fail = checks.filter((c) => !c.ok).length
console.log(`\nZana za P kwenye simu: ${checks.length - fail} PASS, ${fail} FAIL`)
process.exit(fail ? 1 : 0)
