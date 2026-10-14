// ══════════════════════════════════════════════════════════════
// PASIHAI — MEDIA + ACTIONS SHOTS
//
// Matumizi: node scripts/feed-media-shots.mjs [folder]
//   inahitaji dev server (npm run dev) kwenye 5173
//
// Hukamata picha za kila aina ya chapisho chenye media (reel · video ·
// image · poll) pamoja na safu ya vitendo (Like · Maoni · Repost ·
// Shiriki · Hifadhi), kwa light NA dark, simu NA desktop — pamoja na
// vipimo halisi vya kila kipengele.
// ══════════════════════════════════════════════════════════════

import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'

const BASE = process.env.BASE || 'http://localhost:5173'
const OUT = process.argv[2] || 'docs/shots/media'
mkdirSync(OUT, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const VIEWPORTS = [
  { id: 'mobile-390', width: 390, height: 844, dsf: 2 },
  { id: 'desktop-1440', width: 1440, height: 900, dsf: 1 },
]
const THEMES = ['light', 'dark']
const KINDS = ['reel', 'video', 'image', 'poll', 'text']

const rows = []
const browser = await chromium.launch()

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.dsf,
    })
    await ctx.addInitScript((t) => {
      try {
        localStorage.setItem('pasihai-theme', t)
      } catch {}
    }, theme)
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 160)))
    await page.goto(`${BASE}/#/home`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.psh-splash', { state: 'detached', timeout: 15000 }).catch(() => {})
    await sleep(900)
    const applied = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))

    for (const kind of KINDS) {
      const item = page.locator(`.psh-feeditem[data-kind="${kind}"]`).first()
      if ((await item.count()) === 0) {
        rows.push({ vp: vp.id, theme, kind, found: false })
        continue
      }
      await item.scrollIntoViewIfNeeded()
      await sleep(320)
      const info = await item.evaluate((node) => {
        const rect = (sel) => {
          const el = node.querySelector(sel)
          if (!el) return null
          const r = el.getBoundingClientRect()
          return { w: Math.round(r.width), h: Math.round(r.height) }
        }
        return {
          itemH: Math.round(node.getBoundingClientRect().height),
          media: rect('.psh-media'),
          reelThumb: rect('.psh-reel__thumb'),
          reelMeta: rect('.psh-reel__meta'),
          actions: rect('.psh-feedactions'),
          actionCount: node.querySelectorAll('.psh-feedaction').length,
          iconW: Math.round(
            node.querySelector('.psh-feedaction svg')?.getBoundingClientRect().width || 0,
          ),
          playBtn: rect('.psh-media__playbtn'),
          views: rect('.psh-media__views'),
          dur: rect('.psh-media__dur'),
          mediaBg: node.querySelector('.psh-media')
            ? getComputedStyle(node.querySelector('.psh-media')).backgroundColor
            : null,
        }
      })
      await item.screenshot({ path: `${OUT}/${vp.id}-${theme}-${kind}.png` })
      const rail = item.locator('.psh-feedactions').first()
      if ((await rail.count()) > 0) {
        await rail.screenshot({ path: `${OUT}/${vp.id}-${theme}-${kind}-rail.png` })
      }
      /* Chip za "Like" ikiwa imeguswa: bonyeza like kisha piga picha ya rail */
      if (kind === 'image') {
        const like = item.locator('.psh-feedaction').first()
        await like.click().catch(() => {})
        await sleep(400)
        const railLiked = item.locator('.psh-feedactions').first()
        await railLiked.screenshot({ path: `${OUT}/${vp.id}-${theme}-${kind}-rail-liked.png` })
        const likedColor = await item
          .locator('.psh-feedaction.is-liked')
          .first()
          .evaluate((el) => getComputedStyle(el).color)
          .catch(() => null)
        info.likedColor = likedColor
        await like.click().catch(() => {}) // rudisha hali ya mwanzo
        await sleep(250)
      }
      rows.push({ vp: vp.id, theme, kind, found: true, applied, ...info })
    }
    if (errors.length) rows.push({ vp: vp.id, theme, errors })
    await ctx.close()
  }
}
await browser.close()

writeFileSync(`${OUT}/media-measurements.json`, JSON.stringify(rows, null, 2))
for (const r of rows) {
  if (r.errors) {
    console.log(`⚠ ${r.vp} ${r.theme} console: ${r.errors.join(' | ')}`)
    continue
  }
  if (!r.found) {
    console.log(`${r.vp.padEnd(12)} ${r.theme.padEnd(5)} ${r.kind.padEnd(5)} — hakuna chapisho la aina hii`)
    continue
  }
  console.log(
    `${r.vp.padEnd(12)} ${r.theme.padEnd(5)} ${r.kind.padEnd(5)} item=${String(r.itemH).padEnd(5)} media=${JSON.stringify(r.media)} thumb=${JSON.stringify(r.reelThumb)} play=${JSON.stringify(r.playBtn)} views=${JSON.stringify(r.views)} dur=${JSON.stringify(r.dur)} rail=${JSON.stringify(r.actions)} icons=${r.iconW} liked=${r.likedColor || '-'} bg=${r.mediaBg}`,
  )
}
console.log(`\nPicha: ${OUT}/`)
