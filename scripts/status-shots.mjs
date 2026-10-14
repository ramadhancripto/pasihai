// ══════════════════════════════════════════════════════════════
// PASIHAI — STATUS FLOW SHOTS
//
// Matumizi: node scripts/status-shots.mjs [folder]
//   inahitaji dev server (npm run dev)
//
// Hupitia mtiririko halisi wa Status: Status row → "Unda status"
// (composer) → mode ya maandishi na picha → Hakiki (preview) →
// na kivinjari cha status (viewer) kupitia harness.
// ══════════════════════════════════════════════════════════════

import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'

const BASE = process.env.BASE || 'http://localhost:5173'
const OUT = process.argv[2] || 'docs/shots/status'
mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const VIEWPORTS = [
  { id: 'mobile-390', width: 390, height: 844, dsf: 2 },
  { id: 'desktop-1440', width: 1440, height: 900, dsf: 1 },
]
const THEMES = ['light', 'dark']

const report = []

async function measure(page, prefix) {
  return page.evaluate((p) => {
    const box = (sel) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { w: Math.round(r.width), h: Math.round(r.height) }
    }
    const text = (sel) => document.querySelector(sel)?.textContent?.trim()?.slice(0, 40) || null
    return {
      stage: box('.psh-story'),
      canvas: box('.psh-story'),
      primaryBtn: text('.psh-stc__publish'),
      tabs: [...document.querySelectorAll('.psh-stc__segbtn')].map((b) => b.textContent.trim()),
      swatches: document.querySelectorAll('.psh-stc__swatch').length,
      tags: document.querySelectorAll('.psh-stc__tag').length,
      segmentCount: document.querySelectorAll('.psh-stv__segments > *').length,
      reactions: document.querySelectorAll('.psh-stv__reaction').length,
      panel: p,
    }
  }, prefix)
}

const browser = await chromium.launch()
for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.dsf,
    })
    await ctx.addInitScript((t) => {
      try { localStorage.setItem('pasihai-theme', t) } catch {}
    }, theme)
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 160)))

    await page.goto(`${BASE}/#/home`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.psh-splash', { state: 'detached', timeout: 15000 }).catch(() => {})
    await sleep(900)

    // 1) Fungua composer kutoka Status row ("Unda status")
    await page.locator('[aria-label="Unda status"]').first().click().catch(() => {})
    await sleep(900)
    const opened = await page.locator('.psh-stc').count()
    await page.screenshot({ path: `${OUT}/${vp.id}-${theme}-creator-media.png` })
    const mText = await measure(page, 'creator-media')

    // 2) Mode ya maandishi
    await page.locator('.psh-stc__segbtn', { hasText: 'Maandishi' }).first().click().catch(() => {})
    await sleep(500)
    await page.screenshot({ path: `${OUT}/${vp.id}-${theme}-creator-text.png` })
    const mPhoto = await measure(page, 'creator-text')

    // 3) Andika maandishi kwenye canvas → Hakiki (preview)
    await page.locator('.psh-story__input').first().fill(
      'Machweo ya kipekee Stone Town leo. Upepo mwanana wa Bahari ya Hindi 🌊 #ZanzibarLife',
    ).catch(() => {})
    await sleep(500)
    await page.screenshot({ path: `${OUT}/${vp.id}-${theme}-creator-filled.png` })
    await page.locator('.psh-stc__publish').first().click().catch(() => {})
    await sleep(900)
    // Rudisha mwanzo wa panel ili canvas yote ionekane kwenye picha
    await page.evaluate(() => { const b = document.querySelector('.psh-sheet__body'); if (b) b.scrollTop = 0 })
    await sleep(300)
    await page.screenshot({ path: `${OUT}/${vp.id}-${theme}-preview.png` })
    const mPreview = await measure(page, 'preview')

    report.push({ vp: vp.id, theme, opened, mText, mPhoto, mPreview, errors })
    await ctx.close()

    // 4) Viewer (kupitia harness — mock mode haina status halisi)
    const ctx2 = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.dsf,
    })
    await ctx2.addInitScript((t) => {
      try { localStorage.setItem('pasihai-theme', t) } catch {}
    }, theme)
    const p2 = await ctx2.newPage()
    await p2.goto(`${BASE}/docs/shots/status/status-viewer-harness.html`, {
      waitUntil: 'domcontentloaded',
    })
    await sleep(1800)
    await p2.screenshot({ path: `${OUT}/${vp.id}-${theme}-viewer.png`, fullPage: true })
    const mViewer = await p2.evaluate(() => {
      const box = (sel) => {
        const el = document.querySelector(sel)
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { w: Math.round(r.width), h: Math.round(r.height) }
      }
      return {
        stage: box('.psh-story'),
        segments: document.querySelectorAll('.psh-stv__segments > *').length,
        reactions: document.querySelectorAll('.psh-stv__reaction').length,
        reply: box('.psh-stv__replyinput'),
        send: box('.psh-stv__send'),
        counter: document.querySelector('.psh-stv__counter')?.textContent?.trim() || null,
        hasClose: !!document.querySelector('[aria-label*="Funga Status"]'),
        tapZones: document.querySelectorAll('.psh-stv__tap').length,
      }
    }).catch(() => null)
    report.push({ vp: vp.id, theme: `${theme}-viewer`, mViewer })
    await ctx2.close()
  }
}
await browser.close()

writeFileSync(`${OUT}/status-measurements.json`, JSON.stringify(report, null, 2))
for (const r of report) {
  if (r.theme?.endsWith('-viewer')) {
    console.log(`${r.vp.padEnd(12)} ${r.theme.padEnd(13)} ${JSON.stringify(r.mViewer)}`)
  } else {
    console.log(
      `${r.vp.padEnd(12)} ${r.theme.padEnd(13)} opened=${r.opened} stage=${JSON.stringify(r.mText?.stage || r.mPhoto?.stage)} tabs=${JSON.stringify(r.mPhoto?.tabs)} btn=${r.mText?.primaryBtn} previewStage=${JSON.stringify(r.mPreview?.stage)} errors=${r.errors.length}`,
    )
  }
}
console.log(`\nPicha: ${OUT}/`)
