// ══════════════════════════════════════════════════════════════
// PASIHAI — SYSTEM TOUR CHECK
//
// Matumizi: node scripts/system-tour.mjs   (inahitaji dev server)
//
// Hupitia kurasa ZOTE za app (hash routes) kwa simu na desktop,
// hukusanya console errors, na hutoa picha → docs/shots/tour/
// ══════════════════════════════════════════════════════════════

import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'

const BASE = process.env.BASE || 'http://localhost:5173'
const OUT = 'docs/shots/tour'
mkdirSync(OUT, { recursive: true })

const ROUTES = [
  { id: 'home', label: 'Home (mkondo)' },
  { id: 'chat', label: 'Chat' },
  { id: 'gundua', label: 'Gundua' },
  { id: 'spaces', label: 'Spaces' },
  { id: 'studio', label: 'Creator Studio' },
  { id: 'business', label: 'Business' },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await chromium.launch()
const report = []

for (const vp of [
  { id: 'mobile-390', width: 390, height: 844, dsf: 2 },
  { id: 'desktop-1440', width: 1440, height: 900, dsf: 1 },
]) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.dsf,
  })
  for (const route of ROUTES) {
    const page = await ctx.newPage()
    const errors = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text().slice(0, 200))
    })
    page.on('pageerror', (err) => errors.push(`pageerror: ${String(err.message).slice(0, 200)}`))

    await page.goto(`${BASE}/#/${route.id}`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.psh-splash', { state: 'detached', timeout: 15000 }).catch(() => {})
    await sleep(1400)

    const info = await page.evaluate(() => {
      const visible = (sel) => {
        const el = document.querySelector(sel)
        return el && el.getBoundingClientRect().height > 0
      }
      return {
        route: document.querySelector('[data-route]:not([hidden])')?.dataset.route || null,
        navActive: document.querySelector('.psh-nav__btn.is-active .psh-nav__label')?.textContent || null,
        feedItems: document.querySelectorAll('.psh-feeditem').length,
        nodes: document.querySelectorAll('main *').length,
        hasHeader: visible('.psh-header'),
        bodyHeight: Math.round(document.body.getBoundingClientRect().height),
      }
    })
    await page.screenshot({ path: `${OUT}/${vp.id}-${route.id}.png` })
    report.push({ viewport: vp.id, ...route, ...info, errors })
    await page.close()
  }
  await ctx.close()
}
await browser.close()

writeFileSync(`${OUT}/tour-report.json`, JSON.stringify(report, null, 2))
let bad = 0
for (const r of report) {
  const flag = r.errors.length ? 'ERRORS' : 'ok'
  if (r.errors.length) bad++
  console.log(
    `${r.viewport.padEnd(13)} ${r.route.padEnd(16)} route=${String(r.route).padEnd(16)} nav=${String(r.navActive).padEnd(9)} nodes=${String(r.nodes).padEnd(6)} h=${String(r.bodyHeight).padEnd(6)} ${flag}`,
  )
  for (const e of r.errors) console.log(`     ⚠ ${e}`)
}
console.log(`\n${report.length - bad}/${report.length} kurasa zinafanya kazi bila console error.`)
console.log(`Picha: ${OUT}/`)
