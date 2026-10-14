import { chromium } from 'playwright'
const B = await chromium.launch()
const D = 'docs/shots/contacts'
const fresh = async (opts = {}) => {
  const p = await B.newPage({ viewport: { width: 420, height: 920 }, deviceScaleFactor: 2, ...opts })
  p.on('pageerror', e => console.log('PAGEERR:', e.message))
  return p
}
const open = async (p, url = '#/contacts') => { await p.goto('http://127.0.0.1:5173/' + url); await p.waitForTimeout(2600) }

// 01 lista
let p = await fresh(); await open(p)
await p.screenshot({ path: `${D}/01-orodha-ya-contacts.png` }); await p.close()

// 02 tabs + tafuta
p = await fresh(); await open(p)
await p.locator('.psh-cx-tab', { hasText: 'Watumiaji ChatHai' }).click(); await p.waitForTimeout(400)
await p.screenshot({ path: `${D}/02-tab-watumiaji-chathai.png` })
await p.locator('.psh-cx__search input').fill('0784'); await p.waitForTimeout(400)
await p.screenshot({ path: `${D}/03-tafuta-jina-username-namba.png` }); await p.close()

// 04 wasifu (contact asiye na akaunti)
p = await fresh(); await open(p)
await p.locator('.psh-cx-row', { hasText: 'Babu Ally' }).first().click(); await p.waitForTimeout(800)
await p.screenshot({ path: `${D}/04-wasifu-hajajiunga.png` }); await p.keyboard.press('Escape'); await p.waitForTimeout(500)
// wasifu wa akaunti + zuia
await p.locator('.psh-cx-row', { hasText: 'Fatma' }).first().click(); await p.waitForTimeout(800)
await p.locator('.psh-sheet__panel').last().locator('.psh-cx-menu__row', { hasText: 'Zuia mtu huyu' }).click(); await p.waitForTimeout(900)
await p.screenshot({ path: `${D}/05-wasifu-umezuia.png` }); await p.close()

// 06 ongeza (form + E.164 hint)
p = await fresh(); await open(p)
await p.locator('.psh-cx__head-actions .psh-cx-btn--primary').click(); await p.waitForTimeout(600)
const sheet = p.locator('.psh-sheet__panel').last()
await sheet.locator('input.psh-cx-input').first().fill('Neema (mwalimu)')
await sheet.locator('input[aria-label="Namba ya simu"]').fill('0784 123 456'); await p.waitForTimeout(400)
await p.screenshot({ path: `${D}/06-ongeza-contact.png` })
await sheet.locator('.psh-cx-btn--primary', { hasText: 'Hifadhi contact' }).click(); await p.waitForTimeout(900)
await p.screenshot({ path: `${D}/07-duplicate-inazuiwa.png` }); await p.close()

// 08 import
p = await fresh(); await open(p)
await p.locator('.psh-cx__head-actions button[aria-label="Import contacts"]').click(); await p.waitForTimeout(700)
await p.locator('textarea').fill('Mtu Mpya A, 0765 555 111\nMtu Mpya B, 0765 555 222\nRudia Amina, 0784 123 456\nNamba Mbaya, 12')
await p.locator('.psh-cx-btn', { hasText: 'Endelea na orodha hii' }).click(); await p.waitForTimeout(600)
await p.screenshot({ path: `${D}/08-import-chagua.png` })
await p.locator('.psh-cx-btn--primary', { hasText: 'Hifadhi (' }).click(); await p.waitForTimeout(1100)
await p.screenshot({ path: `${D}/09-import-matokeo.png` }); await p.close()

// 10 namba yangu
p = await fresh(); await open(p)
await p.locator('.psh-cx__head-actions button[aria-label="Namba yangu"]').click(); await p.waitForTimeout(700)
await p.screenshot({ path: `${D}/10-namba-yangu.png` }); await p.close()

// 11 offline
p = await fresh(); await open(p)
await p.context().setOffline(true)
await p.evaluate(() => window.dispatchEvent(new Event('offline'))); await p.waitForTimeout(600)
await p.screenshot({ path: `${D}/11-offline.png` })
await p.context().setOffline(false); await p.close()

// 12 dark + 13 desktop
p = await fresh(); await p.addInitScript(() => { try { localStorage.setItem('pasihai-theme','dark') } catch {} })
await open(p); await p.screenshot({ path: `${D}/12-dark.png` }); await p.close()
p = await fresh({ viewport: { width: 1280, height: 900 } }); await open(p)
await p.screenshot({ path: `${D}/13-desktop.png` }); await p.close()

// 14 entry point (Chat)
p = await fresh(); await open(p, '#/chat')
await p.locator('button[aria-label*="chat" i], .psh-chat__fab, .psh-chat__new').first().click().catch(() => {})
await p.waitForTimeout(900)
await p.screenshot({ path: `${D}/14-chat-kiingilio.png` }); await p.close()

await B.close()
console.log('screenshots zimekamilika')
