#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════
// PASIHAI — DIRECT CHAT UI CHECK (browser, mock mode)
//
// Usage: node scripts/chat-direct-ui-check.mjs [baseUrl]   (default http://localhost:5173)
//
// Inathibitisha mabadiliko ya Direct Chat:
//   - hakuna tarehe ya kubuni ("Leo, 28 Mei") kwenye thread
//   - hakuna kiashiria cha kubuni ("Dr. Kelvin anaandika")
//   - hakuna vitufe vya simu/video vilivyozimwa kwenye header
//   - hakuna kitufe cha maikrofoni kinachotuma ujumbe wa sauti wa kubuni
//   - header ina Back na menyu; composer inatuma ujumbe halisi wa maandishi
// Inatumia mock mode. Haithibitishi Supabase halisi.
// ══════════════════════════════════════════════════════════════

import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(ROOT, 'package.json'))
const { chromium } = require('playwright')

const BASE = process.argv[2] || 'http://localhost:5173'
const results = []
const check = (name, ok, detail = '') => results.push({ name, ok: !!ok, detail: String(detail).slice(0, 160) })

const browser = await chromium.launch()

async function openThread(width, height, label) {
  const page = await browser.newPage({ viewport: { width, height } })
  const errors = []
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  await page.goto(`${BASE}/#/chat`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.psh-chat__row', { timeout: 20000 })
  await page.waitForTimeout(1500)
  // Fungua mazungumzo ya moja kwa moja (Direct): row ya kwanza isiyo kikundi.
  const rows = await page.$$('.psh-chat__row')
  let opened = false
  for (const r of rows) {
    const txt = (await r.innerText()).replace(/\s+/g, ' ')
    if (!/Kikundi/.test(txt)) {
      await r.click()
      opened = true
      break
    }
  }
  check(`${label}: direct thread opened`, opened)
  await page.waitForSelector('.psh-chat__thread', { timeout: 10000 })
  await page.waitForTimeout(800)
  return { page, errors }
}

async function runFor(width, height, label) {
  const { page, errors } = await openThread(width, height, label)
  const threadText = await page.$eval('.psh-chat__thread', (el) => el.innerText)
  check(`${label}: no fabricated day label`, !/28 Mei/.test(threadText), threadText.slice(0, 80))
  check(`${label}: no fabricated typing indicator`, !/anaandika/.test(threadText))

  const header = await page.$('.psh-chat__thead')
  const headerLabels = header ? await header.$$eval('button', (bs) => bs.map((b) => b.getAttribute('aria-label'))) : []
  check(`${label}: header has back button`, headerLabels.includes('Rudi kwenye orodha ya Chat'), headerLabels.join(' | '))
  check(`${label}: header has more menu`, headerLabels.includes('Menyu zaidi za mazungumzo'))
  check(`${label}: no disabled call buttons in header`, !headerLabels.some((l) => /inakuja/.test(l || '')))

  const composerLabels = await page.$$eval('.psh-chat__composer button', (bs) => bs.map((b) => b.getAttribute('aria-label')))
  check(`${label}: no fake voice-record button`, !composerLabels.includes('Rekodi sauti'), composerLabels.join(' | '))

  // Tuma ujumbe halisi wa maandishi na uthibitishe kwamba unaonekana.
  const marker = `jaribio-${Date.now()}`
  const before = (await page.$$('.psh-msg')).length
  await page.fill('.psh-chat__input', marker)
  await page.click('button[aria-label="Tuma ujumbe"]')
  await page.waitForTimeout(1200)
  const after = (await page.$$('.psh-msg')).length
  const bodyText = await page.evaluate(() => document.querySelector('.psh-chat__messages')?.innerText || '')
  check(`${label}: sending text adds a real bubble`, after > before && bodyText.includes(marker), `before=${before} after=${after}`)
  const ticks = await page.$$eval('.psh-msg--me .psh-msg__ticks', (els) => els.map((e) => e.getAttribute('aria-label')))
  check(`${label}: sent bubble shows only "Imetumwa" (no fake "Imefika")`, ticks.length > 0 && ticks.every((t) => t === 'Imetumwa'), ticks.join(','))

  await page.screenshot({ path: join(ROOT, `docs/shots/chat-direct-${label}.png`), fullPage: false }).catch(() => {})
  check(`${label}: no page errors`, errors.length === 0, errors.join(' | '))
  await page.close()
}

try {
  await runFor(390, 844, 'm390')
  await runFor(1280, 900, 'd1280')
} finally {
  await browser.close()
}

const passed = results.filter((r) => r.ok).length
for (const r of results) console.log(`${r.ok ? '✅' : '❌'} ${r.name}${r.detail && !r.ok ? ` — ${r.detail}` : ''}`)
console.log(`\nRESULTS: ${passed}/${results.length} passed`)
process.exit(passed === results.length ? 0 : 1)
