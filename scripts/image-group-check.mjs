// ══════════════════════════════════════════════════════════════
// Kundi C (Picha) — ukaguzi wa kivinjari (Playwright, Chromium halisi)
// Inathibitisha: paneli ya kundi C, Back, uwiano (1:1/16:9/Asili), kivuli, joto (overlay ya tint),
// Rudisha marekebisho, na Rudisha picha ya asili.
// Matumizi: node scripts/image-group-check.mjs   (inahitaji dev server kwenye BASE)
// ══════════════════════════════════════════════════════════════
import { chromium } from 'playwright'
import { mkdirSync, existsSync } from 'node:fs'

const BASE = process.env.BASE || 'http://127.0.0.1:5173'
const SHOTS = process.env.SHOTS || '/home/user/pasihai-implementation/creative-shots'
const IMAGE = '/tmp/pasihai-test-image.png'
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

// Fungua kikundi cha Sifa (Group) kwa jina lake ikiwa kimefungwa.
async function openGroup(p, title) {
  const g = p.locator('.cve-group', { hasText: title }).first()
  const head = g.locator('button').first()
  const expanded = await head.getAttribute('aria-expanded')
  if (expanded === 'false') await head.click()
}

// Uwiano wa kipengele cha picha kilichochaguliwa (upana/urefu) kutoka DOM.
async function layerRatio(p) {
  const box = await p.locator('.cve-layer-frame, .cve-layer.is-sel').first().boundingBox().catch(() => null)
  return box ? box.width / box.height : null
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

  // Ingiza picha kupitia kundi C
  await openRail(page, 'Images & Photos')
  check(await page.locator('.cve-rail__btn[aria-label="Images & Photos"]').getAttribute('aria-pressed') === 'true', 'Rail: kundi la Picha limechaguliwa')
  check(await page.locator('.cve-lib__back').count() === 1, 'Drawer ina Back moja')
  await page.locator('input[type="file"][aria-label="Chagua picha"]').setInputFiles(IMAGE)
  const imgLayer = page.locator('.cve-layer[data-type="image"]').last()
  await imgLayer.waitFor({ state: 'visible', timeout: 15000 })
  check(await imgLayer.getAttribute('class').then((c) => /is-sel/.test(c)), 'Picha imeingizwa na kuchaguliwa')
  check(await page.locator('[data-testid="props-panel"]').getAttribute('data-focus') === 'C', 'Sifa zinaonyesha paneli ya kundi C')
  check(await page.getByLabel('X', { exact: true }).count() === 0, 'Kundi C halionyeshi nafasi ya X/Y')

  const natural = await page.locator('.cve-img img').first().evaluate((el) => el.naturalWidth / el.naturalHeight)

  // Uwiano 1:1
  await page.locator('[data-testid="props-panel"] .cve-group', { hasText: 'Uwiano' }).getByRole('button', { name: '1:1', exact: true }).click()
  const r1 = await layerRatio(page)
  check(r1 && Math.abs(r1 - 1) < 0.02, 'Uwiano 1:1 unafanya kipengele kuwa mraba', String(r1?.toFixed(3)))

  // Uwiano 16:9
  await page.locator('[data-testid="props-panel"] .cve-group', { hasText: 'Uwiano' }).getByRole('button', { name: '16:9', exact: true }).click()
  const r2 = await layerRatio(page)
  check(r2 && Math.abs(r2 - 16 / 9) < 0.02, 'Uwiano 16:9 unafanya kazi', String(r2?.toFixed(3)))

  // Asili: urudi kwenye uwiano wa picha
  await page.locator('[data-testid="props-panel"] .cve-group', { hasText: 'Uwiano' }).getByRole('button', { name: 'Asili', exact: true }).click()
  const r3 = await layerRatio(page)
  check(r3 && Math.abs(r3 - natural) < 0.02, 'Asili unarudisha uwiano wa picha asili', `${r3?.toFixed(3)} vs ${natural.toFixed(3)}`)

  // Kivuli
  await openGroup(page, 'Kivuli')
  await page.locator('button[aria-pressed]', { hasText: /^Kivuli$/ }).click()
  const filter1 = await page.locator('.cve-img').first().evaluate((el) => el.style.filter)
  check(/drop-shadow/.test(filter1), 'Kivuli kunaonekana kwenye turubai', filter1)

  // Joto: overlay ya tint inaonekana
  await openGroup(page, 'Athari za picha')
  await page.getByLabel('Joto (temperature) (nambari)', { exact: true }).fill('60')
  await page.getByLabel('Joto (temperature) (nambari)', { exact: true }).press('Enter')
  check(await page.locator('[data-testid="img-tint"]').count() === 1, 'Joto linaongeza overlay ya tint')
  await page.screenshot({ path: `${SHOTS}/17-image-group.png` })

  // Rudisha marekebisho: tint inaondoka, kivuli kinabaki
  await page.locator('[data-testid="props-panel"] .cve-group', { hasText: 'Athari za picha' }).getByRole('button', { name: 'Rudisha marekebisho', exact: true }).click()
  check(await page.locator('[data-testid="img-tint"]').count() === 0, 'Rudisha marekebisho linaondoa tint')
  check(/drop-shadow/.test(await page.locator('.cve-img').first().evaluate((el) => el.style.filter)), 'Rudisha marekebisho halingusi kivuli')

  // Rudisha picha ya asili: kivuli, uwiano, tint vinarudi
  await page.getByLabel('Joto (temperature) (nambari)', { exact: true }).fill('40')
  await page.getByLabel('Joto (temperature) (nambari)', { exact: true }).press('Enter')
  // Anza kutoka 16:9 (si 1:1, kwa sababu picha ya jaribio ni mraba) ili ukaguzi wa kurudisha uwe na maana
  await page.locator('[data-testid="props-panel"] .cve-group', { hasText: 'Uwiano' }).getByRole('button', { name: '16:9', exact: true }).click()
  await page.locator('[data-testid="props-panel"] .cve-group', { hasText: 'Rudisha' }).getByRole('button', { name: 'Rudisha picha ya asili', exact: true }).click()
  const r4 = await layerRatio(page)
  check(r4 && Math.abs(r4 - natural) < 0.02, 'Rudisha picha ya asili linarudisha uwiano', `${r4?.toFixed(3)}`)
  check(!/drop-shadow/.test(await page.locator('.cve-img').first().evaluate((el) => el.style.filter)), 'Rudisha picha ya asili linazima kivuli')
  check(await page.locator('[data-testid="img-tint"]').count() === 0, 'Rudisha picha ya asili linaondoa tint')

  // Back: kurudi kwenye turubai bila kupoteza picha
  const layersBefore = await page.locator('.cve-layer').count()
  await page.locator('.cve-lib__back').click()
  await page.locator('.cve-lib__back').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
  check(await page.locator('.cve-lib__back').count() === 0, 'Back inafunga drawer ya kundi C')
  check(await page.locator('[data-testid="props-panel"]').getAttribute('data-focus') === null, 'Sifa zinarudi kwenye hali ya kawaida')
  check(await page.locator('.cve-layer').count() === layersBefore, 'Back haipotezi tabaka', String(layersBefore))
} catch (e) {
  check(false, 'Mtiririko umesimama', e.message.split('\n')[0])
} finally {
  await browser.close()
}

const failed = checks.filter((c) => !c.ok).length
if (jsErrors.length) console.log('Makosa ya JS:', jsErrors.slice(0, 5))
const pass = checks.length - failed
console.log(`\nUkaguzi wa kundi C: ${pass} PASS, ${failed} FAIL, makosa ya JS: ${jsErrors.length}`)
if (failed || jsErrors.length) exitCode = 1
process.exit(exitCode)
