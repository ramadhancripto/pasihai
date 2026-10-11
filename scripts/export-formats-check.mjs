// ══════════════════════════════════════════════════════════════
// Ukaguzi wa mwisho wa export (PNG/JPEG/WebP): ubora, uwazi, 1×/2×, hakiki, kipimo halisi,
// turubai ndogo/kubwa (200px, 4000px, na zaidi ya 4000px kwa moduli), uwiano, na kukatika.
// Pikseli zinasomwa kutoka kwa faili halisi zilizoandikwa, si kutoka kwa metadata ya app.
// Matumizi: node scripts/export-formats-check.mjs   (inahitaji dev server kwenye BASE)
// ══════════════════════════════════════════════════════════════
import { chromium } from 'playwright'
import { mkdirSync, readFileSync, statSync } from 'node:fs'

const BASE = process.env.BASE || 'http://127.0.0.1:5173'
const DL = '/tmp/pasihai-formats'
mkdirSync(DL, { recursive: true })

const checks = []
const jsErrors = []
function check(ok, label, detail = '') {
  checks.push({ ok: Boolean(ok), label })
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`)
}
const ignorable = (msg) => /favicon|Download the React DevTools|ResizeObserver loop|\[vite\]/i.test(msg)

// Inasoma pikseli kutoka kwa picha (base64). Inarudisha vipimo, rangi za pointi, na hesabu ya pikseli nyekundu kwenye mistari.
async function decodeB64([b64, pts, rows]) {
  const bin = atob(b64)
  const u = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i)
  const bmp = await createImageBitmap(new Blob([u]))
  const c = document.createElement('canvas')
  c.width = bmp.width
  c.height = bmp.height
  const x = c.getContext('2d', { willReadFrequently: true })
  x.drawImage(bmp, 0, 0)
  const isRed = (p) => p[0] > 200 && p[1] < 60 && p[2] < 60
  const redCount = (y) => {
    const d = x.getImageData(0, y, bmp.width, 1).data
    let n = 0
    for (let i = 0; i < d.length; i += 4) if (isRed([d[i], d[i + 1], d[i + 2]])) n++
    return n
  }
  return {
    w: bmp.width,
    h: bmp.height,
    px: pts.map(([px, py]) => Array.from(x.getImageData(px, py, 1, 1).data)),
    rowRed: rows.map((y) => redCount(y)),
  }
}

const MAGIC = (buf) => {
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png'
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg'
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp'
  return 'unknown'
}

async function openEditor(page, modeText = 'Social Post') {
  await page.goto(`${BASE}/#/studio`, { waitUntil: 'domcontentloaded' })
  await page.locator('.psh-cs').waitFor({ state: 'visible', timeout: 30000 })
  await page.locator('.psh-cs__navBtn', { hasText: 'Create' }).first().click()
  await page.locator('[data-testid="creative-hub"]').waitFor({ state: 'visible', timeout: 15000 })
  return modeText
}

async function openExportPanel(page) {
  await page.locator('.cve-rail__btn[aria-label="Export & Publish"]').click()
  await page.locator('.cve-lib__item[data-tool="export.resolution"]').click()
  return page.locator('[data-testid="props-panel"]')
}

// Pima: inarudisha {bytesKB, w, h, mime}
async function measure(page, panel) {
  // Subiri kipimo kilichopita kiishe, kisha pima upya; kipimo cha zamani hakitumiki.
  await panel.locator('.cve-btn', { hasText: 'Pima ukubwa' }).waitFor({ state: 'visible', timeout: 60000 })
  await panel.locator('[data-testid="export-measured"]').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
  await panel.locator('.cve-btn', { hasText: 'Pima ukubwa' }).click()
  await panel.locator('.cve-btn', { hasText: 'Inakadiria' }).waitFor({ state: 'visible', timeout: 5000 }).catch(() => {})
  await panel.locator('.cve-btn', { hasText: 'Pima ukubwa' }).waitFor({ state: 'visible', timeout: 60000 })
  const m = panel.locator('[data-testid="export-measured"]')
  await m.waitFor({ state: 'visible', timeout: 60000 })
  const t = await m.innerText()
  const dim = t.match(/(\d+)×(\d+) px/)
  return {
    text: t,
    kb: (t.match(/Ukubwa halisi: (\d+) KB/) || [])[1] ? Number(t.match(/Ukubwa halisi: (\d+) KB/)[1]) : null,
    w: dim ? Number(dim[1]) : null,
    h: dim ? Number(dim[2]) : null,
    mime: (t.match(/· ([a-z/]+)$/) || [])[1] ?? null,
  }
}

// Hamisha: inapakua faili, inathibitisha magic bytes, na inarudisha {path, size, buf, name}
async function exportAndSave(page, panel, label) {
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 90000 }),
    panel.locator('.cve-btn--primary', { hasText: label }).click(),
  ])
  const name = dl.suggestedFilename()
  const path = `${DL}/${name}`
  await dl.saveAs(path)
  const buf = readFileSync(path)
  return { name, size: statSync(path).size, buf, b64: buf.toString('base64'), format: MAGIC(buf) }
}

const browser = await chromium.launch({ headless: true })
try {
  // ── A. Moduli: turubai ndogo/kubwa, uwiano, kukatika, scale, ubora, uwazi ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'sw-TZ' })
    const page = await ctx.newPage()
    page.on('pageerror', (e) => { if (!ignorable(e.message)) jsErrors.push(e.message) })
    await page.goto(`${BASE}/#/studio`, { waitUntil: 'domcontentloaded' })
    await page.locator('.psh-cs').waitFor({ state: 'visible', timeout: 30000 })

    const res = await page.evaluate(async () => {
      const R = await import('/src/creative/creativeRender.js')
      const M = await import('/src/creative/creativeModel.js')
      const red = (p) => p[0] > 200 && p[1] < 60 && p[2] < 60
      const blue = (p) => p[2] > 200 && p[0] < 60
      const white = (p) => p[0] > 245 && p[1] > 245 && p[2] > 245 && p[3] === 255
      const mkDoc = (W, H) => ({
        ...M.createDocument('blank'), width: W, height: H,
        layers: [
          M.makeShape('rect', { x: W - 60, y: H - 60, w: 40, h: 40, fill: '#ff0000', name: 'marker' }),
          M.makeShape('rect', { x: 100, y: 100, w: 10, h: 10, fill: '#ff0000', name: 'line' }),
          M.makeShape('rect', { x: 20, y: 20, w: 60, h: 60, fill: '#0000ff', name: 'tl' }),
        ],
      })
      const decodeBlob = async (blob, pts, rows) => {
        const bmp = await createImageBitmap(blob)
        const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height
        const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(bmp, 0, 0)
        const rowRed = rows.map((y) => {
          const d = x.getImageData(X0, y, X1 - X0, 1).data; let n = 0
          for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] < 60 && d[i + 2] < 60) n++
          return n
        })
        return { w: bmp.width, h: bmp.height, px: pts.map(([a, b]) => Array.from(x.getImageData(a, b, 1, 1).data)), rowRed }
      }
      const out = { sizes: [], quality: {}, transparency: {} }
      let X0 = 0, X1 = 0
      const cases = [[200, 200], [1080, 1080], [4000, 4000], [4000, 2000], [5000, 3000]]
      for (const [W, H] of cases) {
        for (const scale of [1, 2]) {
          const doc = mkDoc(W, H)
          const exp = R.exportSize(doc, scale)
          const r = await R.exportImage(doc, { format: 'png', scale, loadImage: R.defaultLoadImage })
          const k = r.scale
          X0 = Math.round(95 * k); X1 = Math.round(115 * k)
          const d = await decodeBlob(r.blob, [
            [Math.round((W - 40) * k), Math.round((H - 40) * k)],  // marker, kona ya chini-kulia
            [Math.round(50 * k), Math.round(50 * k)],               // bluu, kona ya juu-kushoto
            [r.width - 1, r.height - 1],                           // kona ya mwisho: nyeupe
          ], [Math.round(105 * k)])
          out.sizes.push({
            W, H, scale, expW: exp.width, expH: exp.height, clamped: exp.clamped,
            gotW: d.w, gotH: d.h, k,
            markerRed: red(d.px[0]), blueTL: blue(d.px[1]), cornerWhite: white(d.px[2]),
            lineRed: d.rowRed[0], lineExpected: 10 * k,
            ratioDoc: W / H, ratioGot: d.w / d.h,
          })
        }
      }
      // Ubora: JPEG na WebP zinabadilika na quality; PNG haibadiliki.
      const doc = mkDoc(1080, 1080)
      for (const f of ['jpeg', 'webp', 'png']) {
        const lo = await R.exportImage(doc, { format: f, quality: 0.5, loadImage: R.defaultLoadImage })
        const hi = await R.exportImage(doc, { format: f, quality: 1.0, loadImage: R.defaultLoadImage })
        out.quality[f] = { lo: lo.blob.size, hi: hi.blob.size, mime: hi.mime }
      }
      // Uwazi
      const t = await R.exportImage(doc, { format: 'png', transparent: true, loadImage: R.defaultLoadImage })
      const tp = await decodeBlob(t.blob, [[2, 2], [1080 - 40, 1080 - 40]], [])
      out.transparency.png = { corner: tp.px[0], marker: tp.px[1], warnings: t.warnings }
      const tw = await R.exportImage(doc, { format: 'webp', transparent: true, loadImage: R.defaultLoadImage })
      const twd = await decodeBlob(tw.blob, [[2, 2]], [])
      out.transparency.webp = { corner: twd.px[0], mime: tw.mime }
      const tj = await R.exportImage(doc, { format: 'jpeg', transparent: true, loadImage: R.defaultLoadImage })
      const tjd = await decodeBlob(tj.blob, [[2, 2]], [])
      out.transparency.jpeg = { corner: tjd.px[0], warnings: tj.warnings, mime: tj.mime }
      return out
    })

    for (const s of res.sizes) {
      const tag = `${s.W}×${s.H} @${s.scale}×`
      check(s.gotW === s.expW && s.gotH === s.expH, `${tag}: vipimo vya faili ni ${s.expW}×${s.expH}`, `faili ${s.gotW}×${s.gotH}`)
      check(Math.abs(s.ratioGot - s.ratioDoc) < 0.01, `${tag}: uwiano umehifadhiwa`, `${s.ratioDoc.toFixed(3)} → ${s.ratioGot.toFixed(3)}`)
      check(s.markerRed, `${tag}: alama nyekundu kona ya chini-kulia ipo (hakuna kukatika)`)
      check(s.blueTL, `${tag}: umbo la juu-kushoto lipo mahali pake`)
      check(s.cornerWhite, `${tag}: kona ya mwisho ni nyeupe na opaque`)
      check(Math.abs(s.lineRed - s.lineExpected) <= 2, `${tag}: mstari wa 10px unachorwa kwa ${s.lineExpected}px (sio bitmap iliyokuzwa)`, `pikseli ${s.lineRed}`)
      if (s.clamped) check(s.expW <= 4000 && s.expH <= 4000, `${tag}: imepunguzwa hadi ≤4000`)
    }
    const q = res.quality
    check(q.jpeg.hi > q.jpeg.lo * 1.2, 'JPEG: quality 100% ni kubwa kuliko 50%', `${q.jpeg.lo} → ${q.jpeg.hi} B`)
    check(q.webp.hi > q.webp.lo * 1.2, 'WebP: quality 100% ni kubwa kuliko 50%', `${q.webp.lo} → ${q.webp.hi} B`)
    check(q.png.lo === q.png.hi, 'PNG: quality haibadilishi faili (ni bila hasara)', `${q.png.lo} = ${q.png.hi} B`)
    const tr = res.transparency
    check(tr.png.corner[3] === 0, 'PNG bila mandhari: kona ina alpha 0 (uwazi halisi)', `alpha ${tr.png.corner[3]}`)
    check(tr.png.marker[3] === 255, 'PNG bila mandhari: umbo bado lina alpha 255')
    check(tr.webp.corner[3] === 0, 'WebP bila mandhari: kona ina alpha 0', `alpha ${tr.webp.corner[3]}`)
    check(tr.jpeg.corner[3] === 255 && tr.jpeg.corner[0] > 245, 'JPEG bila mandhari: mandhari nyeupe inatumika (JPEG haina uwazi)')
    check(tr.jpeg.warnings.some((w) => /JPEG haina uwazi/.test(w)), 'JPEG bila mandhari: onyo linaonyeshwa')
    await ctx.close()
  }

  // ── B. UI: Social Post 1080, miundo yote, 1×/2×, hakiki, kipimo, uwazi, ubora ──
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'sw-TZ', acceptDownloads: true })
    const page = await ctx.newPage()
    page.on('pageerror', (e) => { if (!ignorable(e.message)) jsErrors.push(e.message) })
    await openEditor(page)
    await page.locator('article.cve-mode', { hasText: 'Social Post' }).getByRole('button', { name: /Anza Social Post/ }).click()
    await page.locator('[data-testid="creative-editor"]').waitFor({ state: 'visible', timeout: 15000 })
    const panel = await openExportPanel(page)

    const FORMATS = [['PNG', 'png'], ['JPEG', 'jpeg'], ['WebP', 'webp']]
    for (const [label, want] of FORMATS) {
      for (const scale of [1, 2]) {
        await panel.locator('.cve-seg__btn', { hasText: new RegExp(`^${label}$`) }).click()
        await panel.locator('.cve-seg__btn', { hasText: new RegExp(`^${scale}×$`) }).click()
        const m = await measure(page, panel)
        const dim = 1080 * scale
        check(m.w === dim && m.h === dim, `UI ${label} ${scale}×: kipimo kinaonyesha ${dim}×${dim}`, m.text)
        const e = await exportAndSave(page, panel, `Hamisha ${label}`)
        check(e.format === want, `UI ${label} ${scale}×: faili ina muundo halisi wa ${want}`, `magic=${e.format}, ${e.name}`)
        const d = await page.evaluate(decodeB64, [e.b64, [], []])
        check(d.w === dim && d.h === dim, `UI ${label} ${scale}×: pikseli za faili ni ${dim}×${dim}`, `${d.w}×${d.h}`)
        check(m.kb === null || Math.round(e.size / 1024) === m.kb, `UI ${label} ${scale}×: kipimo kinalingana na faili halisi`, `kipimo ${m.kb} KB, faili ${e.size} B`)
        check(new RegExp(`-2x\\.`).test(e.name) === (scale === 2), `UI ${label} ${scale}×: jina la faili linaonyesha ${scale}×`, e.name)
      }
    }

    // Ubora kwenye UI (JPEG): 50% vs 100%
    await panel.locator('.cve-seg__btn', { hasText: /^JPEG$/ }).click()
    const slider = panel.locator('.cve-slider input.cve-num')
    await slider.fill('50')
    await slider.press('Tab')
    await panel.locator('[data-testid="export-measured"]').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {})
    const lo = await measure(page, panel)
    await slider.fill('100')
    await slider.press('Tab')
    await panel.locator('[data-testid="export-measured"]').waitFor({ state: 'detached', timeout: 5000 })
    const hi = await measure(page, panel)
    check(lo.kb !== null && hi.kb !== null && hi.kb > lo.kb, 'UI JPEG: quality 100% inatoa faili kubwa kuliko 50%', `${lo.kb} KB → ${hi.kb} KB`)

    // Uwazi kwenye UI (PNG)
    await panel.locator('.cve-seg__btn', { hasText: /^PNG$/ }).click()
    await panel.locator('.cve-seg__btn', { hasText: /^1×$/ }).click()
    await panel.locator('.cve-toggle', { hasText: 'Bila mandhari' }).click()
    const et = await exportAndSave(page, panel, 'Hamisha PNG')
    const dt = await page.evaluate(decodeB64, [et.b64, [[2, 2]], []])
    check(dt.px[0][3] === 0, 'UI PNG bila mandhari: faili ina kona ya uwazi (alpha 0)', `alpha ${dt.px[0][3]}`)
    check(et.name.includes('bila-mandhari'), 'UI PNG bila mandhari: jina la faili linasema bila-mandhari', et.name)
    await panel.locator('.cve-toggle', { hasText: 'Bila mandhari' }).click()

    // Hakiki inatumia mipangilio: 2× → picha ya 2160
    await panel.locator('.cve-seg__btn', { hasText: /^2×$/ }).click()
    await panel.locator('.cve-btn', { hasText: 'Hakiki' }).click()
    const img = page.locator('img[alt="Hakiki ya muundo"]')
    await img.waitFor({ state: 'visible', timeout: 60000 })
    const nat = await img.evaluate((el) => [el.naturalWidth, el.naturalHeight])
    check(nat[0] === 2160 && nat[1] === 2160, 'Hakiki 2×: picha ya hakiki ina 2160×2160', `${nat[0]}×${nat[1]}`)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    if (await img.count()) {
      const close = page.locator('.cve-dialog button', { hasText: /Funga|Sawa|Close/ }).first()
      if (await close.count()) await close.click()
      await page.waitForTimeout(300)
    }
    check((await img.count()) === 0, 'Hakiki: dialog inafungwa')
    await page.screenshot({ path: '/home/user/pasihai-implementation/creative-shots/27-export-formats-ui.png' })
    await ctx.close()
  }

  // ── C. UI: turubai ndogo (200px) na kubwa (4000px, kikomo cha app) ──
  for (const size of [200, 4000]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'sw-TZ', acceptDownloads: true })
    const page = await ctx.newPage()
    page.on('pageerror', (e) => { if (!ignorable(e.message)) jsErrors.push(e.message) })
    await openEditor(page)
    const card = page.locator('article.cve-mode', { hasText: 'Custom Design' })
    await card.locator('input[type=number]').nth(0).fill(String(size))
    await card.locator('input[type=number]').nth(1).fill(String(size))
    await card.getByRole('button', { name: /Anza/ }).click()
    await page.locator('[data-testid="creative-editor"]').waitFor({ state: 'visible', timeout: 15000 })
    const panel = await openExportPanel(page)
    await panel.locator('.cve-seg__btn', { hasText: /^2×$/ }).click()
    const sizeText = (await panel.locator('[data-testid="export-size"]').innerText()).trim()
    const expect2 = size * 2 > 4000 ? 4000 : size * 2
    check(sizeText.includes(`${expect2}×${expect2} px`), `Turubai ${size}px @2×: vipimo vinaonyeshwa ${expect2}×${expect2}`, sizeText)
    if (size * 2 > 4000) check(/imepunguzwa/.test(sizeText), `Turubai ${size}px @2×: maandishi ya kupunguzwa yanaonekana`, sizeText)
    const m = await measure(page, panel)
    check(m.w === expect2 && m.h === expect2, `Turubai ${size}px @2×: kipimo halisi ${expect2}×${expect2}`, m.text)
    const e = await exportAndSave(page, panel, 'Hamisha PNG')
    const d = await page.evaluate(decodeB64, [e.b64, [[expect2 - 1, expect2 - 1]], []])
    check(e.format === 'png' && d.w === expect2 && d.h === expect2, `Turubai ${size}px @2×: faili ni PNG ${expect2}×${expect2}`, `${d.w}×${d.h}`)
    check(d.px[0][0] === 255 && d.px[0][3] === 255, `Turubai ${size}px @2×: kona ya mwisho nyeupe, bila kukatika`)
    if (size === 4000) {
      const j = await measure(page, panel)
      await panel.locator('.cve-seg__btn', { hasText: /^JPEG$/ }).click()
      await panel.locator('[data-testid="export-measured"]').waitFor({ state: 'detached', timeout: 5000 })
      const mj = await measure(page, panel)
      check(mj.w === 4000 && mj.mime === 'image/jpeg', 'Turubai 4000px JPEG: kipimo halisi kinafanya kazi', mj.text)
      check(j.text.length > 0, 'Turubai 4000px PNG: kipimo kilirudi matokeo')
    }
    await ctx.close()
  }
} catch (e) {
  check(false, 'Mtiririko umesimama', e.message.split('\n')[0])
} finally {
  await browser.close()
}

check(jsErrors.length === 0, 'Hakuna JS error', jsErrors.slice(0, 2).join(' | ') || 'safi')
const fail = checks.filter((c) => !c.ok).length
console.log(`\nUkaguzi wa export: ${checks.length - fail} PASS, ${fail} FAIL`)
process.exit(fail ? 1 : 0)
