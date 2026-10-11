// ══════════════════════════════════════════════════════════════
// Mhariri — ukaguzi wa rail ya makundi na sehemu ya chini kulingana na mode
// (Playwright, Chromium halisi). Matumizi: node scripts/editor-rail-check.mjs  (BASE = dev server)
// Inathibitisha: rail ina makundi 16 yenye lebo za spec kwa mpangilio; kubofya kundi kunafungua
// drawer yake peke yake; kubofya tena kunafunga; Ctrl+K inafungua utafutaji wa zana zote;
// sehemu ya chini ya Story, Slideshow na Social zinatofautiana kwa mode.
// Inashindwa (exit 1) kwa hitilafu yoyote ya ukaguzi au ya JavaScript isiyotarajiwa.
// ══════════════════════════════════════════════════════════════
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://127.0.0.1:5173'
const SPEC_TITLES = [
  'Select & Arrange', 'Text', 'Images & Photos', 'Background', 'Shapes & Drawing', 'Stickers & Elements',
  'Colors & Styles', 'Effects & Filters', 'Templates & Layout', 'Layers', 'Pages & Scenes', 'Video Editor',
  'Animation & Motion', 'Audio & Captions', 'AI Tools', 'Export & Publish',
]
const checks = []
const jsErrors = []
function check(ok, label, detail = '') {
  checks.push({ ok: Boolean(ok), label })
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`)
}
const ignorable = (msg) => /favicon|Download the React DevTools|ResizeObserver loop|\[vite\]/i.test(msg)

const browser = await chromium.launch({ headless: true })
let exitCode = 0
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'sw-TZ' })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => { if (!ignorable(e.message)) jsErrors.push(`pageerror: ${e.message}`) })
  page.on('console', (m) => { if (m.type() === 'error' && !ignorable(m.text())) jsErrors.push(`console: ${m.text()}`) })

  await page.goto(`${BASE}/#/studio`, { waitUntil: 'domcontentloaded' })
  await page.locator('.psh-cs').waitFor({ state: 'visible', timeout: 30000 })
  await page.locator('.psh-cs__navBtn--top[aria-label="Create"]').click()
  const hub = page.locator('[data-testid="creative-hub"]')
  await hub.waitFor({ state: 'visible', timeout: 15000 })

  // Social Post: mode ya kawaida ya picha
  await page.locator('article.cve-mode', { hasText: 'Social Post' }).getByRole('button', { name: /Anza Social Post/ }).click()
  await page.locator('[data-testid="creative-editor"]').waitFor({ state: 'visible', timeout: 15000 })

  const rail = page.locator('.cve-rail__btn')
  const titles = await rail.evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))
  check(JSON.stringify(titles) === JSON.stringify(SPEC_TITLES), 'Rail ina makundi 16 kwa mpangilio wa spec', `${titles.length}`)
  const titleAttrs = await rail.evaluateAll((els) => els.every((e) => (e.getAttribute('title') || '').length > 0))
  check(titleAttrs, 'Kila kategoria ina tooltip (title)')
  const visibleLabels = await page.locator('.cve-rail__label').evaluateAll((els) => els.every((e) => e.textContent.trim().length > 0))
  check(visibleLabels, 'Kila kategoria ina lebo inayoonekana')

  const drawerGroups = page.locator('.cve-lib .cve-lib__group[data-group]')
  const groupIds = async () => drawerGroups.evaluateAll((els) => els.map((e) => e.getAttribute('data-group')))
  check(JSON.stringify(await groupIds()) === JSON.stringify(['A']), 'Drawer ya awali inaonyesha Select & Arrange peke yake', JSON.stringify(await groupIds()))

  await page.locator('.cve-rail__btn[aria-label="Shapes & Drawing"]').click()
  check(JSON.stringify(await groupIds()) === JSON.stringify(['E']), 'Kubofya Shapes & Drawing kunaonyesha kundi E peke yake')
  check(await page.locator('.cve-rail__btn[aria-label="Shapes & Drawing"]').getAttribute('aria-pressed') === 'true', 'Kategoria iliyofunguliwa ina aria-pressed=true')

  await page.locator('.cve-rail__btn[aria-label="Shapes & Drawing"]').click()
  check(await page.locator('.cve-lib').count() === 0, 'Kubofya kategoria iliyo wazi tena kunafunga drawer')

  await page.locator('.cve-rail__btn[aria-label="Text"]').click()
  check(JSON.stringify(await groupIds()) === JSON.stringify(['B']), 'Text inafungua kundi B peke yake')

  await page.keyboard.press('Control+k')
  await page.waitForTimeout(200)
  check((await groupIds()).length > 1, 'Ctrl+K inafungua utafutaji wa zana zote (makundi mengi)')
  check(await page.locator('.cve-rail__btn[aria-pressed="true"]').count() === 0, 'Ctrl+K hakuna kategoria iliyochaguliwa')

  // Sehemu ya chini kulingana na mode
  const tabsFor = async () => page.locator('.cve-tabs [role="tab"]').evaluateAll((els) => els.map((e) => `${e.textContent.trim()}${e.disabled ? ' (mpango)' : ''}`))
  const tabsSocial = await tabsFor()
  check(JSON.stringify(tabsSocial) === JSON.stringify(['Tabaka', 'Kurasa Mpango (mpango)']), 'Social: sehemu ya chini ina Tabaka na Kurasa (mpango)', tabsSocial.join(' | '))

  const openMode = async (label) => {
    await page.getByRole('button', { name: 'Rudi kwenye Studio' }).first().click()
    await hub.waitFor({ state: 'visible', timeout: 15000 })
    await page.locator('.cve-gallery__tile', { hasText: label }).click()
    await page.locator('[data-testid="creative-editor"]').waitFor({ state: 'visible', timeout: 15000 })
  }

  await openMode('Story / Status')
  const tabsStory = await tabsFor()
  check(tabsStory.some((t) => t.startsWith('Scenes')), 'Story: sehemu ya chini ina Scenes', tabsStory.join(' | '))

  await openMode('Slideshow')
  const tabsSlide = await tabsFor()
  check(tabsSlide.some((t) => t.startsWith('Slaidi')), 'Slideshow: sehemu ya chini ina Slaidi', tabsSlide.join(' | '))

  await page.screenshot({ path: '/home/user/pasihai-implementation/creative-shots/16-editor-rail-slideshow.png' })
} catch (err) {
  console.log(`✗ Mtiririko umesimama: ${err.message.split('\n')[0]}`)
  exitCode = 1
} finally {
  await browser.close()
}

const failed = checks.filter((c) => !c.ok).length
for (const e of jsErrors) console.log(`JS: ${e}`)
console.log(`\nUkaguzi wa rail: ${checks.length - failed} PASS, ${failed} FAIL, makosa ya JS: ${jsErrors.length}`)
if (failed || jsErrors.length) exitCode = 1
process.exit(exitCode)
