// ══════════════════════════════════════════════════════════════
// ChatHai Groups — M2 UI/UX JOURNEY (mtihani wa matumizi halisi)
//
// Huendesha app INAYOENDA (dev server 5173, mock mode) kama mtumiaji:
//   Groups Home → Unda kikundi → Thread → Kichwa → Taarifa za kikundi →
//   Wanachama & roles → Mipangilio → Ongeza wanachama → Karibisha →
//   Hariri taarifa → Ondoka (na kanuni ya Owner) → Hamisha umiliki →
//   Ondoka (Admin) → 390px · 1280px
//
// Matumizi: npm run dev  (port 5173) → node scripts/groups-ux-journey.mjs
// Matokeo: docs/shots/groups-ux/*.png + PREVIEW.html + RESULTS n/n
// ══════════════════════════════════════════════════════════════
import { chromium } from 'playwright'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import zlib from 'node:zlib'

const D = process.env.SHOT_DIR || 'docs/shots/groups-ux'
mkdirSync(D, { recursive: true })

/* PNG ndogo halisi (DP/cover za majaribio) */
const table = []
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  table[n] = c >>> 0
}
const crc32 = (buf) => {
  let crc = 0xffffffff
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const t = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crc])
}
function pngSolid(w, h, rgb) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  const raw = Buffer.alloc((w * 3 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0
    for (let x = 0; x < w; x++) {
      const o = y * (w * 3 + 1) + 1 + x * 3
      raw[o] = rgb[0] + ((x * 3) % 40)
      raw[o + 1] = rgb[1]
      raw[o + 2] = rgb[2]
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}
const dpPath = '/tmp/groups-ux-dp.png'
const coverPath = '/tmp/groups-ux-cover.png'
writeFileSync(dpPath, pngSolid(128, 128, [22, 106, 80]))
writeFileSync(coverPath, pngSolid(480, 200, [30, 84, 150]))

const shots = []
const results = []
const pageErrors = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail: String(detail).slice(0, 220) })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + String(detail).slice(0, 160) : ''}`)
}

const B = await chromium.launch()
const ctx = await B.newContext({
  viewport: { width: 420, height: 920 },
  deviceScaleFactor: 2,
  permissions: ['clipboard-read', 'clipboard-write'],
})
const p = await ctx.newPage()
p.on('pageerror', (e) => {
  pageErrors.push(e.message)
  console.log('PAGEERR:', e.message)
})

const sheet = () => p.locator('.psh-sheet__panel').last()
const shot = async (name, page = p) => {
  await page.screenshot({ path: `${D}/${name}` })
  shots.push(name)
  console.log('SHOT', name)
}
const toastWait = async (re, ms = 7000) => {
  try {
    await p.waitForFunction((src) => {
      const t = document.querySelector('.psh-toast')
      return !!t && new RegExp(src).test(t.textContent || '')
    }, re.source ?? String(re), { timeout: ms })
  } catch {
    /* chini: tunasoma hali halisi */
  }
  return (await p.locator('.psh-toast').textContent().catch(() => '')) || ''
}
const toastNow = async () => (await p.locator('.psh-toast').textContent().catch(() => '')) || ''
const sheetBack = async () => {
  await sheet().getByRole('button', { name: 'Rudi' }).click()
  await p.waitForTimeout(350)
}
const openChat = async (page) => {
  await page.goto('http://127.0.0.1:5173/?sys=online#/chat')
  await page.waitForTimeout(2400)
}

/* ── 1) GROUPS HOME ─────────────────────────────────────────── */
await openChat(p)
await p.getByRole('radio', { name: /Vikundi/ }).click()
await p.waitForTimeout(600)
const homeRows = await p.locator('.psh-chat__row').count()
const homeSearch = await p.locator('#chat-group-q').count()
const homeNew = await p.locator('.psh-chat__grpnew').count()
const homeCounts = await p.locator('.psh-chat__rowcount').count()
check('1 Groups Home: kichujio cha Vikundi kina orodha ya vikundi', homeRows >= 2, `rows=${homeRows}`)
check('1 Groups Home: utafutaji wa papo hapo upo', homeSearch === 1)
check('1 Groups Home: kitendo dhahiri cha kuunda kipo', homeNew === 1)
check('1 Groups Home: idadi ya wanachama inaonekana kwenye safu', homeCounts >= 2, `counts=${homeCounts}`)
await p.locator('#chat-group-q').fill('Wakulima')
await p.waitForTimeout(400)
const filtered = await p.locator('.psh-chat__row').count()
check('1 utafutaji unachuja kweli (Wakulima → 1)', filtered === 1, `filtered=${filtered}`)
await p.locator('#chat-group-q').fill('')
await p.waitForTimeout(400)
await shot('01-groups-home.png')

/* ── 2) UNDA KIKUNDI (habari za lazima pekee) ───────────────── */
await p.locator('.psh-chat__grpnew').click()
await p.waitForSelector('.psh-gw', { timeout: 8000 })
const pills = (await p.locator('.psh-gw-steppill').allTextContents()).map((s) => s.replace(/\s+/g, ' ').trim())
check('2 wizard: hatua 4 (Msingi · Wanachama · Mipangilio · Muhtasari)', pills.length === 4, pills.join(' | '))
await p.getByRole('button', { name: 'Endelea' }).click()
await p.waitForTimeout(350)
const nameErr = await p.locator('.psh-gw-field__err').first().textContent().catch(() => '')
check('2 validation: jina ni lazima', /Jina la kikundi linahitajika/.test(nameErr), nameErr)
await p.locator('#gw-name').fill('Wakulima wa UX')
await p.locator('input[aria-label="Pakia DP ya kikundi"]').setInputFiles(dpPath)
await p.waitForTimeout(600)
const dpVisible = await p.locator('img.psh-chat__ava__img').count()
check('2 DP imepakiwa na inaonekana (on yesho la picha halisi)', dpVisible > 0)
await shot('02-wizard-msingi.png')
await p.getByRole('button', { name: 'Endelea' }).click()
await p.waitForTimeout(400)
/* Back-nav: kurudi nyuma HAKUPOTEZI data */
await sheet().locator('.psh-gw-nav button', { hasText: 'Rudi' }).click()
await p.waitForTimeout(400)
const backName = await sheet().locator('#gw-name').inputValue()
const backDp = await p.locator('img.psh-chat__ava__img').count()
check('2 back-nav: jina na DP vinabaki', backName === 'Wakulima wa UX' && backDp > 0, `${backName} · dp=${backDp}`)
await p.getByRole('button', { name: 'Endelea' }).click()
await p.waitForTimeout(400)

/* Hatua ya wanachama: lazima angalau mmoja (kanuni iliyopo) */
await p.getByRole('button', { name: 'Endelea' }).click()
await p.waitForTimeout(350)
const memErr = await p.locator('.psh-gw-field__err').first().textContent().catch(() => '')
check('2 validation: angalau contact mmoja (kanuni iliyopo ya backend)', /Chagua angalau contact mmoja/.test(memErr), memErr)
const people = sheet().locator('.psh-chat-person__main')
await people.nth(0).click()
await people.nth(1).click()
await p.waitForTimeout(300)
const counter = await p.locator('.psh-chip', { hasText: 'Wanachama' }).first().textContent()
check('2 wanachama: counter inaonyesha wewe + waliochaguliwa', /Wanachama 3 \/ 1024/.test(counter || ''), counter)
await shot('03-wizard-wanachama.png')
await p.getByRole('button', { name: 'Endelea' }).click()
await p.waitForTimeout(400)

/* Mipangilio (hiari) — inaonekana, inaweza kurukwa */
const hasSkip = await p.getByRole('button', { name: 'Ruka' }).count()
const sehs = (await p.locator('.psh-gw-seh').allTextContents()).map((s) => s.trim())
check('2 hatua ya Mipangilio inaweza kurukwa (Ruka)', hasSkip === 1)
check('2 Mipangilio ina sehemu 3 (Utambulisho · Sheria · Kujiunga)', sehs.length === 3, sehs.join(' | '))
await p.locator('#gw-purpose').fill('Masoko ya pamoja kwa wakulima.')
await p.locator('#gw-rules').fill('Heshima kwa wote.')
await p.locator('input[aria-label="Pakia cover ya kikundi"]').setInputFiles(coverPath)
await p.waitForTimeout(600)
const coverVisible = await p.locator('img.psh-gw-coverimg').count()
check('2 cover imepakiwa na inaonekana', coverVisible > 0)
await shot('04-wizard-mipangilio.png')
await p.getByRole('button', { name: 'Endelea' }).click()
await p.waitForTimeout(400)

const sumText = await sheet().textContent()
check('2 muhtasari: jina linaonekana', /Wakulima wa UX/.test(sumText || ''))
await shot('05-wizard-muhtasari.png')
await p.getByRole('button', { name: 'Unda kikundi' }).click()
const t1 = await toastWait(/kimeundwa/)
check('2 uundaji: kikundi kimeundwa (toast halisi)', /kimeundwa/.test(t1), t1)
await p.waitForTimeout(900)

/* ── 3) THREAD + KICHWA KINAGUSA ────────────────────────────── */
const threadName = await p.locator('.psh-chat__theadname').first().textContent().catch(() => '')
check('3 thread ya kikundi kipya inafunguka', /Wakulima wa UX/.test(threadName || ''), threadName)
await shot('06-thread-kikundi-kipya.png')
const headerBtn = await p.locator('.psh-chat__theadmain').count()
check('3 kichwa cha kikundi ni kitufe (kinagusa)', headerBtn === 1)
await p.locator('.psh-chat__theadmain').click()
await p.waitForTimeout(600)
const giHero = await p.locator('.psh-gi-hero__name').textContent().catch(() => '')
check('3 kichwa → Taarifa za kikundi zinafunguka', /Wakulima wa UX/.test(giHero || ''), giHero)
const giRows = await p.locator('.psh-gi-row').count()
check('3 vitendo vya Taarifa: rows (ongeza · wanachama · hariri · mipangilio · karibisha · ondoka)', giRows === 6, `rows=${giRows}`)
await shot('07-group-info.png')

/* ── 4) WANACHAMA & ROLES ───────────────────────────────────── */
await p.locator('#gi-members').click()
await p.waitForTimeout(600)
const memberRows = await p.locator('#gm-list > li').count()
check('4 Wanachama & roles: orodha ya wanachama', memberRows === 3, `rows=${memberRows}`)
const roleSels = await p.locator('.psh-gm-rolesel').count()
check('4 Owner anaweza kubadilisha roles (selects zinaonekana)', roleSels === 2, `selects=${roleSels}`)
/* Badilisha role ya mwanachama wa kwanza → Mwanachama */
await p.locator('.psh-gm-rolesel').first().selectOption('member')
const tRole = await toastWait(/Role ya .* ni Mwanachama/)
check('4 role imebadilishwa (toast halisi)', /Role ya .* ni Mwanachama/.test(tRole), tRole)
/* Ondoa mwanachama wa mwisho — uthibitisho wa hatua mbili */
const lastRow = sheet().locator('#gm-list > li').last()
const lastName = (await lastRow.locator('.psh-menu__label').textContent().catch(() => '')) || ''
await lastRow.getByRole('button', { name: /^Ondoa / }).click()
await p.waitForTimeout(300)
const confirmVisible = await sheet().locator('.psh-gi-confirm').count()
check('4 uondoaji unadai uthibitisho (confirm)', confirmVisible === 1)
await shot('08-wanachama-uthibitisho.png')
await sheet().locator('.psh-gi-confirm').getByRole('button', { name: 'Ondoa' }).click()
const tRemove = await toastWait(/ameondolewa kwenye kikundi/)
check('4 uondoaji umefanyika baada ya uthibitisho', /ameondolewa/.test(tRemove), tRemove)
await p.waitForTimeout(400)
const rowsAfter = await p.locator('#gm-list > li').count()
const countChip = await p.locator('.psh-chip', { hasText: 'Wanachama' }).first().textContent()
const leftNote = await p.locator('#gm-left-note').textContent().catch(() => '')
check('4 orodha = wanachama wa sasa (3 → 2)', rowsAfter === 2, `rows=${rowsAfter}`)
check('4 idadi hai imepungua (Wanachama 2 / 1024)', /Wanachama 2 \/ 1024/.test(countChip || ''), countChip)
check('4 walioondoka wanaonyeshwa kwa uwazi (historia imehifadhiwa)', /Walioondoka: 1/.test(leftNote || ''), leftNote)
await shot('09-wanachama-baada-ya-uondoaji.png')

/* ── 5) MIPANGILIO YA KIKUNDI ───────────────────────────────── */
await sheetBack() /* → groupinfo */
await p.waitForTimeout(400)
await p.locator('#gi-settings').click()
await p.waitForTimeout(600)
const privacySel = await p.locator('#gs-privacy').count()
const joinSel = await p.locator('#gs-join').count()
const linkNote = await sheet().textContent()
check('5 Mipangilio: faragha ipo', privacySel === 1)
check('5 Mipangilio: njia ya kujiunga ipo', joinSel === 1)
check('5 Mipangilio: ukomo wa viungo vya mwaliko umeelezwa kwa uwazi', /Viungo vya mwaliko \(token\) havipo bado/.test(linkNote || ''))
await p.locator('#gm-slow').selectOption('60')
await p.locator('#gs-save').click()
const tSave = await toastWait(/Mipangilio imehifadhiwa/)
check('5 mipangilio imehifadhiwa (toast halisi)', /imehifadhiwa/.test(tSave), tSave)
await shot('10-mipangilio-imehifadhiwa.png')

/* ── 6) ONGEZA WANACHAMA ────────────────────────────────────── */
await sheetBack() /* → groupinfo */
await p.waitForTimeout(400)
const beforeAdd = await p.locator('.psh-gi-hero__sub').textContent()
await p.locator('#gi-add').click()
await p.waitForTimeout(600)
const cands = await p.locator('#ga-list > li').count()
check('6 Ongeza wanachama: contacts wanapatikana (bila walio wanachama)', cands >= 4, `candidates=${cands}`)
await sheet().locator('#ga-list > li').first().locator('.psh-chat-person__main').click()
await p.waitForTimeout(250)
const pickedChip = await p.locator('.psh-chip', { hasText: 'Wamechaguliwa' }).count()
check('6 uteuzi unaonekana (chip ya waliochaguliwa)', pickedChip === 1)
await shot('11-ongeza-wanachama.png')
await p.locator('#ga-confirm').click()
const tAdd = await toastWait(/Wameongezwa/)
check('6 wanachama wameongezwa (toast halisi)', /Wameongezwa 1/.test(tAdd), tAdd)
await p.waitForTimeout(500)
const afterAdd = await p.locator('.psh-gi-hero__sub').textContent()
const nBefore = Number((beforeAdd || '').match(/\d+/)?.[0] || 0)
const nAfter = Number((afterAdd || '').match(/\d+/)?.[0] || 0)
check('6 idadi ya wanachama imeongezeka kwenye Taarifa', nAfter === nBefore + 1, `${nBefore} → ${nAfter}`)

/* ── 7) KARIBISHA (mwaliko wa maandishi — halisi) ───────────── */
await p.locator('#gi-invite').click()
const tInvite = await toastWait(/mwaliko/i, 4000)
let clip = ''
try {
  clip = await p.evaluate(() => navigator.clipboard.readText())
} catch {
  /* clipboard hazipatikani kichwani — ushahidi = toast */
}
check('7 Karibisha: maandishi ya mwaliko yamenakiliwa', /mwaliko/i.test(tInvite) || /Karibu kwenye kikundi/.test(clip), tInvite || clip.slice(0, 60))

/* ── 8) HARIRI TAARIFA ──────────────────────────────────────── */
await p.locator('#gi-edit').click()
await p.waitForTimeout(600)
await p.locator('#ge-desc').fill('Ushirikiano wa pembejeo na masoko — UX.')
await p.locator('#ge-purpose').fill('Kuongeza mavuno kwa pamoja.')
await shot('12-hariri-taarifa.png')
await p.locator('#ge-save').click()
const tEdit = await toastWait(/Taarifa za kikundi zimehifadhiwa/)
check('8 hariri taarifa imehifadhiwa (toast halisi)', /zimehifadhiwa/.test(tEdit), tEdit)
await p.waitForTimeout(500)
const desc = await p.locator('.psh-gi-desc').textContent().catch(() => '')
check('8 maelezo yanaonekana kwenye Taarifa (kama yapo)', /Ushirikiano wa pembejeo/.test(desc || ''), desc)
await shot('13-group-info-na-maelezo.png')

/* ── 9) OWNER HAWEZI KUONDOKA (kanuni halisi ya backend) ────── */
await p.locator('#gi-leave').click()
await p.waitForTimeout(300)
const ownerPrompt = await sheet().locator('.psh-gi-confirm__text').textContent().catch(() => '')
check('9 Owner: uthibitisho unaeleza kanuni (hamisha umiliki kwanza)', /hamisha umiliki/i.test(ownerPrompt || ''), ownerPrompt)
await sheet().locator('.psh-gi-confirm').getByRole('button', { name: 'Jaribu' }).click()
const tOwner = await toastWait(/Hamisha umiliki/)
check('9 Owner: kukataliwa kwa ujumbe halisi wa backend', /Hamisha umiliki/.test(tOwner), tOwner)
await shot('14-owner-leave-imakataliwa.png')

/* ── 10) HAMISHA UMILIKI → ONDOKA (Admin) ───────────────────── */
await p.locator('#gi-members').click()
await p.waitForTimeout(600)
const transferSel = sheet().locator('select[aria-label="Chagua mwanachama wa kuhamishia umiliki"]')
await transferSel.selectOption({ index: 1 })
await sheet().getByRole('button', { name: 'Hamisha umiliki' }).click()
await p.waitForTimeout(300)
await shot('15-hamisha-umiliki-uthibitisho.png')
await sheet().locator('.psh-gi-confirm').getByRole('button', { name: 'Hamisha' }).click()
const tTransfer = await toastWait(/Umiliki umehamishwa/)
check('10 umiliki umehamishwa (toast halisi)', /umehamishwa/.test(tTransfer), tTransfer)
await p.waitForTimeout(500)
const myRole = await p.locator('.psh-chip', { hasText: 'Role yako' }).textContent().catch(() => '')
check('10 wewe sasa ni Admin (role chip)', /Admin/.test(myRole || ''), myRole)

await sheetBack() /* → groupinfo */
await p.waitForTimeout(500)
await p.locator('#gi-leave').click()
await p.waitForTimeout(300)
await sheet().locator('.psh-gi-confirm').getByRole('button', { name: 'Ondoka' }).click()
const tLeave = await toastWait(/Umeondoka kwenye kikundi/)
check('10 ondoka (kama Admin) kumefanikiwa (toast halisi)', /Umeondoka/.test(tLeave), tLeave)
await p.waitForTimeout(800)
const threadGone = await p.locator('.psh-chat__thead').count()
check('10 baada ya kuondoka: thread imefungwa (orodha inaonekana)', threadGone === 0, `thead=${threadGone}`)
await shot('16-baada-ya-kuondoka.png')
await p.close()

/* ── 11) SIMU 390 + DESKTOP 1280 ────────────────────────────── */
const ctx2 = await B.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, permissions: ['clipboard-write'] })
const p2 = await ctx2.newPage()
p2.on('pageerror', (e) => pageErrors.push(e.message))
await openChat(p2)
await p2.getByRole('radio', { name: /Vikundi/ }).click()
await p2.waitForTimeout(500)
await p2.locator('.psh-chat__row').first().click()
await p2.waitForTimeout(700)
await shot('17-mobile-390-thread.png', p2)
await p2.locator('.psh-chat__theadmain').click()
await p2.waitForTimeout(600)
await shot('18-mobile-390-group-info.png', p2)
check('11 390px: Taarifa za kikundi zinafanya kazi', (await p2.locator('.psh-gi-hero__name').count()) === 1)
await p2.close()

const ctx3 = await B.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, permissions: ['clipboard-write'] })
const p3 = await ctx3.newPage()
p3.on('pageerror', (e) => pageErrors.push(e.message))
await openChat(p3)
await p3.getByRole('radio', { name: /Vikundi/ }).click()
await p3.waitForTimeout(500)
await shot('19-desktop-1280-groups-home.png', p3)
await p3.locator('.psh-chat__row').first().click()
await p3.waitForTimeout(700)
await p3.locator('.psh-chat__theadmain').click()
await p3.waitForTimeout(700)
await shot('20-desktop-1280-group-info.png', p3)
await p3.locator('#gi-members').click()
await p3.waitForTimeout(600)
await shot('21-desktop-1280-wanachama.png', p3)
check('11 1280px: Wanachama & roles zinafanya kazi', (await p3.locator('#gm-list > li').count()) >= 2)
await p3.close()

/* ── Dark mode: mwonekano unakaguliwa (hakuna kuvunja theme) ── */
const ctx4 = await B.newContext({ viewport: { width: 420, height: 920 }, deviceScaleFactor: 2, colorScheme: 'dark', permissions: ['clipboard-write'] })
const p4 = await ctx4.newPage()
p4.on('pageerror', (e) => pageErrors.push(e.message))
await openChat(p4)
await p4.getByRole('radio', { name: /Vikundi/ }).click()
await p4.waitForTimeout(500)
await p4.locator('.psh-chat__row').first().click()
await p4.waitForTimeout(600)
await p4.locator('.psh-chat__theadmain').click()
await p4.waitForTimeout(600)
await shot('22-dark-mode-group-info.png', p4)
check('11 dark mode: Taarifa za kikundi zinasomeka', (await p4.locator('.psh-gi-hero__name').count()) === 1)
await p4.close()
await B.close()

/* ── Muhtasari ──────────────────────────────────────────────── */
check('12 hakuna page errors kwenye journey', pageErrors.length === 0, pageErrors.join(' | ').slice(0, 200))

const failed = results.filter((r) => !r.ok)
console.log(`\nRESULTS: ${results.length - failed.length}/${results.length} passed`)
if (failed.length) {
  console.log('FAILED:')
  for (const f of failed) console.log(' ✗', f.name, '—', f.detail)
}

/* Gallery (base64 — offline-safe) */
const captions = {
  '01-groups-home.png': 'Groups Home — vikundi, utafutaji, Kikundi Kipya, idadi ya wanachama',
  '02-wizard-msingi.png': 'Unda kikundi — hatua 1: Msingi (jina · DP · aina · faragha)',
  '03-wizard-wanachama.png': 'Hatua 2: Wanachama (Contacts selection + counter)',
  '04-wizard-mipangilio.png': 'Hatua 3: Mipangilio (hiari — inaweza kurukwa)',
  '05-wizard-muhtasari.png': 'Hatua 4: Muhtasari',
  '06-thread-kikundi-kipya.png': 'Thread — kikundi kimeundwa',
  '07-group-info.png': 'Taarifa za kikundi — safu za vitendo',
  '08-wanachama-uthibitisho.png': 'Wanachama & roles — uthibitisho wa uondoaji',
  '09-wanachama-baada-ya-uondoaji.png': 'Wanachama & roles — baada ya kuondoa',
  '10-mipangilio-imehifadhiwa.png': 'Mipangilio ya kikundi — imehifadhiwa',
  '11-ongeza-wanachama.png': 'Ongeza wanachama — uteuzi',
  '12-hariri-taarifa.png': 'Hariri taarifa — maelezo + madhumuni',
  '13-group-info-na-maelezo.png': 'Taarifa — maelezo yanaonekana',
  '14-owner-leave-imakataliwa.png': 'Owner: kuondoka kunakataliwa (hamisha umiliki kwanza)',
  '15-hamisha-umiliki-uthibitisho.png': 'Hamisha umiliki — uthibitisho',
  '16-baada-ya-kuondoka.png': 'Baada ya kuondoka (Admin) — orodha',
  '17-mobile-390-thread.png': 'Simu 390 — thread ya kikundi',
  '18-mobile-390-group-info.png': 'Simu 390 — Taarifa za kikundi',
  '19-desktop-1280-groups-home.png': 'Desktop 1280 — Groups Home',
  '20-desktop-1280-group-info.png': 'Desktop 1280 — Taarifa za kikundi',
  '21-desktop-1280-wanachama.png': 'Desktop 1280 — Wanachama & roles',
  '22-dark-mode-group-info.png': 'Dark mode — Taarifa za kikundi',
}
const items = shots
  .map((name) => {
    const b64 = readFileSync(`${D}/${name}`).toString('base64')
    const cap = captions[name] || name
    return `<figure><img src="data:image/png;base64,${b64}" alt="${cap}"><figcaption>${name}<br><span>${cap}</span></figcaption></figure>`
  })
  .join('\n')
const html = `<!doctype html>
<html lang="sw"><head><meta charset="utf-8"><title>ChatHai Groups — UI/UX journey</title>
<style>
 body{font-family:system-ui,sans-serif;margin:24px;background:#f6f5f1;color:#1d1d1b}
 h1{font-size:20px} p.sub{color:#666;max-width:900px}
 .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px;margin-top:18px}
 figure{margin:0;background:#fff;border:1px solid #e2e0d9;border-radius:14px;padding:10px}
 img{width:100%;border-radius:10px;display:block}
 figcaption{font-size:12px;color:#444;margin-top:8px;font-weight:600}
 figcaption span{color:#777;font-weight:400}
</style></head><body>
<h1>ChatHai Groups — journey halisi (mock mode, dev server 5173)</h1>
<p class="sub">Mtiririko: Groups Home → Unda kikundi (hatua 4) → Thread → Kichwa → Taarifa za kikundi → Wanachama &amp; roles (role · uondoaji kwa uthibitisho) → Mipangilio → Ongeza wanachama → Karibisha → Hariri taarifa → Kanuni ya Owner → Hamisha umiliki → Ondoka → 390px · 1280px.</p>
<div class="grid">${items}</div>
</body></html>`
writeFileSync(`${D}/PREVIEW.html`, html)
console.log(`\nGallery: ${D}/PREVIEW.html (${shots.length} picha)`)
if (failed.length) process.exitCode = 1
