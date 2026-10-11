// ══════════════════════════════════════════════════════════════
// Makundi ya display tu (F, K, L, M, N, O) — ukaguzi wa kivinjari (Playwright, Chromium halisi)
// Inathibitisha: kila kundi linafungua paneli yake yenye hali; paneli haina vitufe; Back ipo;
// kubofya zana ya planned hakuongezi chochote kwenye turubai.
// Matumizi: node scripts/planned-groups-check.mjs   (inahitaji dev server kwenye BASE)
// ══════════════════════════════════════════════════════════════
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE || 'http://127.0.0.1:5173'
const SHOTS = process.env.SHOTS || '/home/user/pasihai-implementation/creative-shots'
mkdirSync(SHOTS, { recursive: true })

const GROUPS = [
  { letter: 'F', title: 'Stickers & Elements', heading: 'Stickers & Elements' },
  { letter: 'K', title: 'Pages & Scenes', heading: 'Pages & Scenes' },
  { letter: 'L', title: 'Video Editor', heading: 'Video Editor' },
  { letter: 'M', title: 'Animation & Motion', heading: 'Animation & Motion' },
  { letter: 'N', title: 'Audio & Captions', heading: 'Audio & Captions' },
  { letter: 'O', title: 'AI Tools', heading: 'AI Tools' },
]

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

  for (const g of GROUPS) {
    await openRail(page, g.title)
    const panel = page.locator('[data-testid="props-panel"]')
    check((await panel.getAttribute('data-focus')) === g.letter, `${g.heading}: paneli inaonyesha kundi lake`)
    check(await panel.locator('.cve-props__title', { hasText: g.heading }).count() === 1, `${g.heading}: kichwa cha paneli kipo`)
    check(await panel.locator('.cve-planned-list li').count() >= 1, `${g.heading}: hali ya zana zinaonekana`)
    check(await panel.locator('.cve-chip', { hasText: /Mpango|Huduma/ }).count() >= 1, `${g.heading}: lebo ya hali (Mpango/Huduma) inaonekana`)
    // Kitufe cha kichwa cha kikundi (cve-group__head) ni kukunja/kufungua tu, si kitendo.
    check(await panel.locator('button:not(.cve-group__head)').count() === 0, `${g.heading}: hakuna vitufe vya kuigiza kwenye paneli`)
    check(await page.locator('.cve-lib__back').count() === 1, `${g.heading}: drawer ina Back moja`)
  }

  // N: huduma zinaonyeshwa kuwa hazijaunganishwa
  await openRail(page, 'Audio & Captions')
  check(await page.locator('[data-testid="props-panel"]').getByText('Huduma zinazohitajika', { exact: false }).count() === 1, 'N: huduma zinazohitajika zinaonekana')
  check(await page.getByText('Hakuna zana za msingi kwenye kundi hili', { exact: false }).count() === 1, 'N (Rahisi): drawer inasema hakuna zana za msingi, badala ya tupu')
  await page.screenshot({ path: `${SHOTS}/23-planned-groups.png` })

  // Kubofya zana ya planned hakuongezi chochote kwenye turubai
  await openRail(page, 'Stickers & Elements')
  // Drawer iko kwenye Rahisi (zana za msingi tu). Badilisha kwenye Kina ili kuona zana zote.
  await page.locator('.cve-lib button', { hasText: /^Kina$/ }).click()
  const before = await page.locator('.cve-layer').count()
  // Zana ya planned ina aria-disabled, kwa hiyo Playwright inakataa kubofya bila force. Mtumiaji anaweza kubofya; tunapima kwamba hakuna kinachotokea.
  await page.locator('.cve-lib__item[data-tool="elem.icons"]').click({ force: true })
  await page.waitForTimeout(300)
  check(await page.locator('.cve-layer').count() === before, 'Zana ya planned (Icons) haiongezi tabaka kwenye turubai', `tabaka ${before}`)
} catch (e) {
  check(false, 'Mtiririko umesimama', e.message.split('\n')[0])
} finally {
  await browser.close()
}

const failed = checks.filter((c) => !c.ok).length
if (jsErrors.length) console.log('Makosa ya JS:', jsErrors.slice(0, 5))
const pass = checks.length - failed
console.log(`\nUkaguzi wa makundi ya display tu: ${pass} PASS, ${failed} FAIL, makosa ya JS: ${jsErrors.length}`)
if (failed || jsErrors.length) exitCode = 1
process.exit(exitCode)
