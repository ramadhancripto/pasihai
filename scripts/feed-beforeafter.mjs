// ══════════════════════════════════════════════════════════════
// PASIHAI — HOME FEED: BEFORE / AFTER COMPOSITES
//
// Matumizi: node scripts/feed-beforeafter.mjs
//
// Huchukua picha halisi za Home (mandhari ya MWANGA) kwenye viewport
// mbili, kisha huziweka pamoja na zile za "kabla" kuwa picha ZA
// KULINGANISHA: docs/shots/home-feed-redesign/compare-*.png
//
// "Kabla" = docs/shots/before/<vp>-light-top.png (zilizopigwa kabla ya
// mabadiliko). "Baada" = inapigwa sasa kutoka dev server.
// ══════════════════════════════════════════════════════════════

import { chromium } from 'playwright'
import { existsSync, mkdirSync } from 'node:fs'
import { execSync } from 'node:child_process'

const BASE = process.env.BASE || 'http://localhost:5173'
const OUT = 'docs/shots/home-feed-redesign'
mkdirSync(OUT, { recursive: true })

const VIEWPORTS = [
  { id: 'mobile-390', width: 390, height: 844, dsf: 2 },
  { id: 'desktop-1440', width: 1440, height: 900, dsf: 1 },
]

const browser = await chromium.launch()
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.dsf,
  })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/#/home`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.psh-feeditem')
  await page.waitForSelector('.psh-splash', { state: 'detached' }).catch(() => {})
  await page.waitForTimeout(800)

  await page.screenshot({ path: `${OUT}/after-${vp.id}-top.png` })
  await page.evaluate(() => window.scrollTo(0, Math.round(window.innerHeight * 1.1)))
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/after-${vp.id}-scroll.png` })
  await page.evaluate(() => window.scrollTo(0, 0))
  await ctx.close()
}
await browser.close()

const beforeDir = 'docs/shots/before'
for (const vp of VIEWPORTS) {
  const before = `${beforeDir}/${vp.id}-light-top.png`
  if (!existsSync(before)) {
    console.warn(`⚠ Hakuna picha ya kabla: ${before} — ruka.`)
    continue
  }
  // Picha mbili kwa mstari mmoja: [KABLA] [BAADA] (upana sawa)
  execSync(
    `python3 - <<'PY'
from PIL import Image, ImageDraw
from pathlib import Path
vp = "${vp.id}"
before = Image.open("${before}").convert("RGB")
after = Image.open("${OUT}/after-{vp}-top.png".replace("{vp}", vp)).convert("RGB")
h = min(before.height, after.height)
b = before.crop((0, 0, before.width, h))
a = after.crop((0, 0, after.width, h))
pad = 16
canvas = Image.new("RGB", (b.width + a.width + pad * 3, h + 52), (244, 247, 246))
canvas.paste(b, (pad, 44))
canvas.paste(a, (pad * 2 + b.width, 44))
d = ImageDraw.Draw(canvas)
d.text((pad + 4, 16), "KABLA (41d8673)", fill=(90, 100, 96))
d.text((pad * 2 + b.width + 4, 16), "BAADA (arena/home-feed-redesign)", fill=(15, 122, 97))
out = Path("${OUT}") / f"compare-{vp}-before-after.png"
canvas.save(out)
print("imeandaliwa:", out, canvas.size)
PY`,
    { stdio: 'inherit', shell: '/bin/bash' },
  )
}
