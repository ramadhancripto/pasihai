// ══════════════════════════════════════════════════════════════
// PASIHAI — HOME FEED REDESIGN · SHOTS (zana ya uthibitisho)
//
// Matumizi:
//   npm run dev                                (terminal moja)
//   node scripts/feed-redesign-shots.mjs [outDir]
//
// Hutoa picha halisi za Home feed (mobile · tablet · desktop) kwa
// light na dark theme, pamoja na vipimo vya DOM (upana wa kadi,
// ukubwa wa media, aina za posts zilizopo).
// ══════════════════════════════════════════════════════════════

import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'

const BASE = process.env.BASE || 'http://localhost:5173'
const OUT = process.argv[2] || 'docs/shots/home-feed-redesign'
const THEMES = ['light', 'dark']
mkdirSync(OUT, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function openFeed(context, theme) {
  await context.addInitScript((t) => {
    try {
      window.localStorage.setItem('pasihai-theme', t)
    } catch {}
  }, theme)
  const page = await context.newPage()
  await page.goto(`${BASE}/#/home`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.psh-feeditem', { timeout: 30000 })
  // Subiri splash iondoke (1.5s + fade 0.4s)
  await page.waitForSelector('.psh-splash', { state: 'detached', timeout: 15000 }).catch(() => {})
  await sleep(700)
  return page
}

async function measure(page) {
  return page.evaluate(() => {
    const items = [...document.querySelectorAll('.psh-feeditem')]
    const mediaBox = (el) => {
      // `.psh-media`/`.psh-gallery` kwanza: kwenye desktop reel wrapper ina
      // `display: contents` (haipo kwenye layout), hivyo kipimo chake ni 0x0.
      const m =
        el.querySelector('.psh-media') ||
        el.querySelector('.psh-gallery') ||
        el.querySelector('.psh-reel__thumb') ||
        el.querySelector('.psh-reel')
      if (!m) return null
      const r = m.getBoundingClientRect()
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        ratio: +(r.width / r.height).toFixed(2),
        cls: [...m.classList].join(' '),
      }
    }
    const col = document.querySelector('.psh-col')
    const feed = document.querySelector('.psh-feed')
    return {
      theme: document.documentElement.getAttribute('data-theme'),
      viewport: window.innerWidth,
      feedCls: feed ? feed.className : null,
      colWidth: col ? Math.round(col.getBoundingClientRect().width) : null,
      cardWidth: items[0] ? Math.round(items[0].getBoundingClientRect().width) : null,
      itemCount: items.length,
      kinds: items.map((i) => i.dataset.kind),
      media: items
        .map((i) => ({ kind: i.dataset.kind, box: mediaBox(i) }))
        .filter((x) => x.box)
        .slice(0, 8),
    }
  })
}

const VIEWPORTS = [
  { id: 'mobile-390', width: 390, height: 844, isMobile: true, hasTouch: true, dsf: 2 },
  { id: 'tablet-834', width: 834, height: 1112, dsf: 1 },
  { id: 'desktop-1440', width: 1440, height: 900, dsf: 1 },
  { id: 'desktop-1920', width: 1920, height: 1000, dsf: 1 },
]

const browser = await chromium.launch()
const report = []

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.dsf,
      isMobile: !!vp.isMobile,
      hasTouch: !!vp.hasTouch,
    })
    const page = await openFeed(ctx, theme)
    const m = await measure(page)
    const tag = `${vp.id}-${theme}`
    await page.screenshot({ path: `${OUT}/${tag}-top.png` })
    await page.screenshot({ path: `${OUT}/${tag}-full.png`, fullPage: true })
    await page.evaluate(() => window.scrollTo(0, Math.round(window.innerHeight * 1.15)))
    await sleep(450)
    await page.screenshot({ path: `${OUT}/${tag}-scroll.png` })
    report.push({ tag, ...m })
    await ctx.close()
  }
}

await browser.close()

writeFileSync(`${OUT}/measurements.json`, JSON.stringify(report, null, 2))
for (const r of report) {
  console.log(
    `${r.tag.padEnd(22)} feed=${r.feedCls?.replace('psh-feed ', '') || '-'} col=${r.colWidth} card=${r.cardWidth} items=${r.itemCount} media=${r.media
      .map((x) => `${x.kind}:${x.box.w}x${x.box.h}`)
      .join(' ')}`,
  )
}
