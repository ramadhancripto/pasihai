// PASIHAI — CHAT SHOTS (inbox + thread + composer)
// Matumizi: node scripts/chat-shots.mjs <outDir> [--tag=before|after]
// Huhitaji .env — mock mode inatosha.
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const OUT = process.argv[2] || 'docs/shots/chat/before'
fs.mkdirSync(OUT, { recursive: true })

const BASE = process.env.APP_URL || 'http://localhost:5173'
const VIEWPORTS = [
  { id: 'mobile-390', width: 390, height: 844, dsf: 2 },
  { id: 'desktop-1440', width: 1440, height: 900, dsf: 1 },
]
const THEMES = ['light', 'dark']
const errors = []
const measurements = {}

async function shoot(page, file) {
  await page.screenshot({ path: path.join(OUT, file) })
  console.log(`   · ${file}`)
}

async function run() {
  const browser = await chromium.launch()

  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: vp.dsf,
        colorScheme: theme,
        locale: 'sw-TZ',
      })
      const page = await ctx.newPage()
      page.on('pageerror', (e) => errors.push(`${vp.id}/${theme}: ${e.message}`))
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(`${vp.id}/${theme} console: ${m.text()}`)
      })

      // Mandhari: app ina data-theme kwenye <html>
      await page.addInitScript((t) => {
        try { localStorage.setItem('psh.theme', t) } catch {}
      }, theme)

      // ── INBOX ───────────────────────────────────────────────
      await page.goto(`${BASE}/#/chat?t=${Date.now()}`, { waitUntil: 'networkidle' })
      await page.waitForSelector('.psh-chat__row', { timeout: 20000 })
      // Splash ya app (psh-splash) — isubiri iondoke kabisa
      try {
        await page.waitForFunction(
          () => !document.querySelector('.psh-splash'),
          null,
          { timeout: 15000 }
        )
      } catch {}
      await page.waitForTimeout(600)

      // Lenga mandhari (mabadiliko ya haraka, hakuna kuvinjari menyu)
      await page.evaluate((t) => {
        document.documentElement.setAttribute('data-theme', t)
      }, theme)

      // ── VIPIMO vya inbox ────────────────────────────────────
      const inbox = await page.evaluate(() => {
        const q = (s) => document.querySelector(s)
        const box = (el) => el ? { w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) } : null
        const rows = [...document.querySelectorAll('.psh-chat__row')]
        return {
          title: q('.psh-chat__title')?.textContent?.trim(),
          search: box(q('.psh-chat__search')),
          filters: document.querySelectorAll('.psh-chat__filter').length,
          filterChip: box(q('.psh-chat__filter')),
          rows: rows.length,
          row: box(rows[0]),
          avatar: box(q('.psh-chat__row .psh-avatar')),
          unread: document.querySelectorAll('.psh-chat__unread').length,
          paneList: box(q('.psh-chat__pane--list')),
          paneThread: box(q('.psh-chat__pane--thread')),
        }
      })
      measurements[`inbox-${vp.id}-${theme}`] = inbox
      console.log(`   inbox ${vp.id}/${theme}: rows=${inbox.rows} row=${inbox.row?.w}x${inbox.row?.h} avatar=${inbox.avatar?.w}x${inbox.avatar?.h}`)

      await shoot(page, `${vp.id}-${theme}-inbox.png`)

      // ── THREAD ─────────────────────────────────────────────
      await page.locator('.psh-chat__row').first().click()
      await page.waitForSelector('.psh-chat__pane--thread, .psh-thread', { timeout: 15000 })
      await page.waitForTimeout(900)

      const thread = await page.evaluate(() => {
        const q = (s) => document.querySelector(s)
        const box = (el) => el ? { w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) } : null
        const bubbles = [...document.querySelectorAll('.psh-thread__bubble, .psh-msg, .psh-thread__row')]
        const mine = bubbles.filter((b) => b.className.includes('mine') || b.className.includes('me'))
        return {
          paneThread: box(q('.psh-chat__pane--thread')),
          bubbles: bubbles.length,
          mine: mine.length,
          bubble: box(bubbles[1] || bubbles[0]),
          composer: box(q('.psh-composer, .psh-thread__composer, footer')),
          header: q('.psh-thread__name, .psh-chat__pane--thread h2')?.textContent?.trim(),
        }
      })
      measurements[`thread-${vp.id}-${theme}`] = thread
      console.log(`   thread ${vp.id}/${theme}: bubbles=${thread.bubbles} bubble=${thread.bubble?.w}x${thread.bubble?.h} composer=${thread.composer?.h}px`)

      await shoot(page, `${vp.id}-${theme}-thread.png`)

      // ── COMPOSER ikiwa na mabango ya haraka ────────────────
      const composerInput = page.locator('.psh-composer textarea, .psh-thread__composer textarea, textarea').first()
      if (await composerInput.count()) {
        await composerInput.click()
        await composerInput.fill('Habari! Nimeona chapisho lako la Zanzibar — nzuri sana.')
        await page.waitForTimeout(500)
        await shoot(page, `${vp.id}-${theme}-thread-typed.png`)
      }

      const overlay = await page.locator('vite-error-overlay').count()
      if (overlay) errors.push(`${vp.id}/${theme}: vite-error-overlay imeonekana`)

      await ctx.close()
    }
  }

  await browser.close()
  fs.writeFileSync(path.join(OUT, 'chat-measurements.json'), JSON.stringify(measurements, null, 2))

  console.log(`\nPAGE ERRORS: ${errors.length}`)
  for (const e of errors.slice(0, 12)) console.log('   ✗', e)
  process.exit(errors.length ? 1 : 0)
}

run()
