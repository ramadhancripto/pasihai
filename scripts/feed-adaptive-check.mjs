// ══════════════════════════════════════════════════════════════
// PASIHAI — ADAPTIVE FEED CHECK (zana ya uthibitisho)
//
// Matumizi:
//   node scripts/feed-adaptive-check.mjs
//
// Hufanya nini:
//   1. Hujenga component halisi ya mkondo (FeedItem) kwa SSR — kupitia
//      scripts/feed-adaptive-harness.jsx — kwa data ya aina ZOTE za
//      media (portrait · landscape · square · gallery 2/3/4/6 · text).
//   2. Huipakisha CSS ya PRODUCTION (dist/assets/index-*.css) kwenye
//      ukurasa huo, hivyo kipimo kinachoonekana ni kile app inasafirisha.
//   3. Hupima kila chapisho: upana/urefu wa media, uwiano, mipaka.
//   4. Huchukua picha: docs/shots/home-feed-redesign/adaptive-*.png
//
// Hii ni uthibitisho wa COMPONENT (si simulation ya app nzima) kwa aina
// za media ambazo mock data ya sasa haitoi (portrait/gallery). App
// yenyewe inathibitishwa kwa picha za Home feed.
//
// Kabla ya kuendesha: npm run build (CSS ya production inahitajika)
// ══════════════════════════════════════════════════════════════════

import { chromium } from 'playwright'
import { execSync } from 'node:child_process'
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const OUT = 'docs/shots/home-feed-redesign'
mkdirSync(OUT, { recursive: true })

/* ── 1. SSR ya component halisi ────────────────────────────── */
console.log('· Kujenga harness ya component (SSR)…')
execSync(
  'npx vite build --ssr scripts/feed-adaptive-harness.jsx --outDir node_modules/.feedharness --logLevel error',
  { stdio: 'inherit' },
)
const { render } = await import(join(ROOT, 'node_modules/.feedharness/feed-adaptive-harness.js'))
const body = render()

/* ── 2. CSS ya production ──────────────────────────────────── */
const assets = readdirSync(join(ROOT, 'dist/assets'))
const cssFile = assets.find((f) => f.endsWith('.css'))
if (!cssFile) throw new Error('CSS ya production haipo — endesha `npm run build` kwanza.')
const css = readFileSync(join(ROOT, 'dist/assets', cssFile), 'utf8')

const html = `<!doctype html>
<html lang="sw" data-theme="light">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Pasihai — adaptive feed component check</title>
<style>${css}</style>
<style>body{margin:0;background:var(--bg);color:var(--t-1);font-family:var(--font-ui)}
.psh-col--home{max-width:100%;padding-inline:var(--feed-gutter)}
@media(min-width:1180px){.psh-col--home{max-width:1080px;margin-inline:auto}}
.harness__label{padding:14px 0 4px;font-size:13px;font-weight:600;color:var(--t-3)}</style>
</head>
<body><div class="psh-col psh-col--home">${body}</div></body>
</html>`
writeFileSync(join(OUT, 'adaptive-harness.html'), html)

/* ── 3. Pima + piga picha ──────────────────────────────────── */
const browser = await chromium.launch()
const report = []
for (const vp of [
  { id: 'mobile-390', width: 390, height: 900 },
  { id: 'desktop-1440', width: 1440, height: 1000 },
]) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.width < 500 ? 2 : 1 })
  const page = await ctx.newPage()
  await page.setContent(html, { waitUntil: 'load' })
  await page.waitForTimeout(250)
  const data = await page.evaluate(() => {
    return [...document.querySelectorAll('.psh-feeditem')].map((el) => {
      const media = el.querySelector('.psh-media')
      const r = media?.getBoundingClientRect()
      const card = el.getBoundingClientRect()
      return {
        id: el.dataset.id,
        kind: el.dataset.kind,
        caption: el.dataset.caption,
        orient: el.dataset.orient,
        mediaCount: el.dataset.mediaCount,
        mediaW: r ? Math.round(r.width) : null,
        mediaH: r ? Math.round(r.height) : null,
        mediaRatio: r ? +(r.width / r.height).toFixed(3) : null,
        cardW: Math.round(card.width),
        galleryShape: el.querySelector('.psh-gallery')?.className.split('psh-gallery--')[1] || null,
        cells: el.querySelectorAll('.psh-gallery__cell, .psh-gallery__slide').length,
      }
    })
  })
  report.push({ viewport: vp.id, items: data })
  await page.screenshot({ path: `${OUT}/adaptive-${vp.id}.png`, fullPage: true })
  await ctx.close()
}
await browser.close()

writeFileSync(join(OUT, 'adaptive-measurements.json'), JSON.stringify(report, null, 2))
for (const r of report) {
  console.log(`\n▸ ${r.viewport}`)
  for (const i of r.items) {
    console.log(
      `   ${String(i.id).padEnd(16)} kind=${String(i.kind).padEnd(12)} orient=${String(i.orient).padEnd(9)} caption=${String(i.caption).padEnd(5)} media=${i.mediaW}x${i.mediaH} ratio=${i.mediaRatio} gallery=${i.galleryShape ?? '-'} cells=${i.cells}`,
    )
  }
}
console.log(`\nPicha: ${OUT}/adaptive-mobile-390.png · ${OUT}/adaptive-desktop-1440.png`)
