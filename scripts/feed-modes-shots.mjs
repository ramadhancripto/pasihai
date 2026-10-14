// ══════════════════════════════════════════════════════════════
// PASIHAI — MODE SHOTS (vertical-slide · horizontal-slide)
//
// Matumizi: node scripts/feed-modes-shots.mjs [folder]
//
// Kila mode inachukuliwa kwa CONTEXT MPYA (sheet ya muonekano
// haifungwi baada ya kutumia mode — hivyo kureload/context mpya ni
// njia pekee ya kuendelea). Hukagua pia kwamba media ya video/reel
// inaonekana (si kadi ndogo) kwenye mode hizo.
// ══════════════════════════════════════════════════════════════

import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE || 'http://localhost:5173'
const OUT = process.argv[2] || 'docs/shots/after'
mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const MODES = [
  { id: 'vertical', label: 'Vertical Slide' },
  { id: 'horizontal', label: 'Horizontal Full Screen' },
]

const browser = await chromium.launch()
for (const mode of MODES) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 160)))
  await page.goto(`${BASE}/#/home`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.psh-splash', { state: 'detached', timeout: 15000 }).catch(() => {})
  await sleep(900)
  await page.locator('.psh-strip__mode').first().click()
  await sleep(500)
  const picked = await page.getByText(mode.label, { exact: false }).first().click().then(() => true).catch(() => false)
  await sleep(300)
  await page.getByRole('button', { name: /Tumia muonekano huu/i }).first().click().catch(() => {})
  await sleep(1200)
  await page.keyboard.press('Escape').catch(() => {})
  await sleep(600)
  const info = await page.evaluate(() => {
    const feed = document.querySelector('.psh-feed')
    const first = feed?.querySelector('.psh-feeditem')
    const media = first?.querySelector('.psh-media')
    const thumb = first?.querySelector('.psh-reel__thumb')
    return {
      cls: feed?.className,
      viewMode: feed?.dataset.viewMode,
      kind: first?.dataset.kind,
      mediaW: media ? Math.round(media.getBoundingClientRect().width) : null,
      mediaH: media ? Math.round(media.getBoundingClientRect().height) : null,
      hasThumbCard: Boolean(thumb),
      items: feed?.querySelectorAll('.psh-feeditem').length,
    }
  })
  await page.screenshot({ path: `${OUT}/mode-${mode.id}.png` })
  console.log(`${mode.id.padEnd(11)} picked=${picked} ${JSON.stringify(info)} errors=${errors.length}`)
  for (const e of errors) console.log('   ⚠', e)
  await ctx.close()
}
await browser.close()
console.log(`Picha: ${OUT}/mode-vertical.png · mode-horizontal.png`)
