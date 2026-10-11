// ══════════════════════════════════════════════════════════════
// PASIHAI — Creative renderer (Canvas 2D)
//
// Chanzo kimoja cha ukweli cha jinsi kila kipengele kinavyochorwa kwenye export
// na preview. Geometry ya maumbo (shapePrimitives) inatumiwa pia na DOM (SVG)
// ili preview na export zisitofautiane.
//
// renderDocument() inafanya kazi na ctx yoyote yenye API ya Canvas 2D,
// kwa hiyo inajaribiwa kwenye Node bila browser.
// ══════════════════════════════════════════════════════════════

import { fontFor, DEFAULT_INK, MAX_CANVAS, shadowCss } from './creativeModel.js'

export class ExportError extends Error {
  constructor(message, code = 'EXPORT_FAILED') {
    super(message)
    this.name = 'ExportError'
    this.code = code
  }
}

const DEG = Math.PI / 180

/** Primitives za umbo katika koordinati za ndani (0,0 → w,h). Inatumiwa na SVG na canvas. */
export function shapePrimitives(layer) {
  const { shape, w, h } = layer
  const sw = layer.strokeWidth || 0
  const half = sw / 2
  const lineWidth = sw || 8
  switch (shape) {
    case 'rounded': {
      const rx = Math.max(0, Math.min(layer.radius || 0, (w - sw) / 2, (h - sw) / 2))
      return [{ kind: 'rect', x: half, y: half, w: w - sw, h: h - sw, rx }]
    }
    case 'ellipse':
      return [{ kind: 'ellipse', cx: w / 2, cy: h / 2, rx: Math.max(0, (w - sw) / 2), ry: Math.max(0, (h - sw) / 2) }]
    case 'triangle':
      return [{ kind: 'polygon', points: [[w / 2, half], [w - half, h - half], [half, h - half]] }]
    case 'line':
      return [{ kind: 'line', x1: 0, y1: h / 2, x2: w, y2: h / 2, width: lineWidth }]
    case 'arrow': {
      const head = Math.min(w * 0.3, Math.max(lineWidth * 3, 24))
      const hh = head * 0.6
      return [
        { kind: 'line', x1: 0, y1: h / 2, x2: w - head * 0.5, y2: h / 2, width: lineWidth },
        { kind: 'polygon', points: [[w, h / 2], [w - head, h / 2 - hh], [w - head, h / 2 + hh]], headFill: true },
      ]
    }
    default: {
      // Mstatili unaweza kuwa na pembe za mviringo kwa `radius` (ukubwa umebanwa ndani ya kipengele).
      const rx = Math.max(0, Math.min(layer.radius || 0, (w - sw) / 2, (h - sw) / 2))
      return [{ kind: 'rect', x: half, y: half, w: w - sw, h: h - sw, rx }]
    }
  }
}

/** Kugawa maandishi kwenye mistari kwa upana (neno kwa neno; neno refu sana linakatwa herufi). */
export function wrapLines(text, maxWidth, measure) {
  const out = []
  const limit = Math.max(1, maxWidth)
  for (const para of String(text ?? '').split('\n')) {
    if (para === '') { out.push(''); continue }
    let line = ''
    for (const word of para.split(' ')) {
      const cand = line === '' ? word : `${line} ${word}`
      if (line !== '' && measure(cand) > limit) {
        out.push(line)
        line = word
      } else {
        line = cand
      }
      // Neno lenyewe ni refu kuliko turubai: likatwe herufi kwa herufi.
      while (line.length > 1 && measure(line) > limit) {
        let cut = line.length - 1
        while (cut > 1 && measure(line.slice(0, cut)) > limit) cut -= 1
        out.push(line.slice(0, cut))
        line = line.slice(cut)
      }
    }
    out.push(line)
  }
  return out
}

/** Gradient ya CSS: 0° = juu, 90° = kulia, 135° = chini-kulia. */
export function gradientEndpoints(W, H, angleDeg) {
  const a = (angleDeg ?? 135) * DEG
  const dx = Math.sin(a)
  const dy = -Math.cos(a)
  const L = Math.abs(W * dx) + Math.abs(H * dy)
  const cx = W / 2
  const cy = H / 2
  return { x0: cx - (dx * L) / 2, y0: cy - (dy * L) / 2, x1: cx + (dx * L) / 2, y1: cy + (dy * L) / 2 }
}

export function imageFilterString(layer) {
  const parts = []
  if (layer.brightness !== 100) parts.push(`brightness(${layer.brightness}%)`)
  if (layer.contrast !== 100) parts.push(`contrast(${layer.contrast}%)`)
  if (layer.saturation !== 100) parts.push(`saturate(${layer.saturation}%)`)
  if (layer.blur > 0) parts.push(`blur(${layer.blur}px)`)
  return parts.length ? parts.join(' ') : 'none'
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  if (rr === 0) {
    ctx.rect(x, y, w, h)
    return
  }
  ctx.moveTo(x + rr, y)
  ctx.lineTo(x + w - rr, y)
  ctx.arc(x + w - rr, y + rr, rr, -Math.PI / 2, 0)
  ctx.lineTo(x + w, y + h - rr)
  ctx.arc(x + w - rr, y + h - rr, rr, 0, Math.PI / 2)
  ctx.lineTo(x + rr, y + h)
  ctx.arc(x + rr, y + h - rr, rr, Math.PI / 2, Math.PI)
  ctx.lineTo(x, y + rr)
  ctx.arc(x + rr, y + rr, rr, Math.PI, Math.PI * 1.5)
  ctx.closePath()
}

function enterLayer(ctx, layer) {
  ctx.save()
  ctx.globalAlpha = (ctx.globalAlpha ?? 1) * layer.opacity
  ctx.translate(layer.x + layer.w / 2, layer.y + layer.h / 2)
  ctx.rotate(layer.rotation * DEG)
  ctx.translate(-layer.w / 2, -layer.h / 2)
  // Geuza (flip) ndani ya kisanduku cha kipengele: mlalo na/au wima.
  if (layer.flipX || layer.flipY) {
    ctx.translate(layer.flipX ? layer.w : 0, layer.flipY ? layer.h : 0)
    ctx.scale(layer.flipX ? -1 : 1, layer.flipY ? -1 : 1)
  }
}

// Maandishi yanayoonyeshwa. Orodha (vitone/namba) inaongezwa kwa kila aya kabla ya kufunga mistari.
// Bila orodha matokeo ni sawa kabisa na maandishi asilia.
export function displayText(layer) {
  const paras = String(layer.text ?? '').split('\n')
  if (layer.list === 'bullet') return paras.map((p) => `• ${p}`).join('\n')
  if (layer.list === 'number') return paras.map((p, i) => `${i + 1}. ${p}`).join('\n')
  return layer.text
}

// Mistari ya chini (underline) na ya katikati (strikethrough) kwa kila mstari uliofungwa.
function drawDecorations(ctx, layer, line, sx, y) {
  const tw = ctx.measureText(line).width
  const x0 = layer.align === 'center' ? sx - tw / 2 : layer.align === 'right' ? sx - tw : sx
  ctx.lineWidth = Math.max(1, layer.fontSize / 14)
  ctx.strokeStyle = layer.color
  ctx.lineCap = 'butt'
  if (layer.underline) {
    const uy = y + layer.fontSize * 0.42
    ctx.beginPath(); ctx.moveTo(x0, uy); ctx.lineTo(x0 + tw, uy); ctx.stroke()
  }
  if (layer.strike) {
    const sy = y - layer.fontSize * 0.08
    ctx.beginPath(); ctx.moveTo(x0, sy); ctx.lineTo(x0 + tw, sy); ctx.stroke()
  }
}

export function drawText(ctx, layer) {
  const { w, h, fontSize, lineHeight } = layer
  const lh = fontSize * lineHeight
  ctx.font = `${layer.italic ? 'italic ' : ''}${layer.bold ? '700' : '400'} ${fontSize}px ${fontFor(layer.fontKey).stack}`
  ctx.textBaseline = 'middle'
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${layer.letterSpacing}px`
  const lines = wrapLines(displayText(layer), w, (s) => ctx.measureText(s).width)
  if (layer.bgColor) {
    ctx.fillStyle = layer.bgColor
    ctx.fillRect(0, 0, w, h)
  }
  const sx = layer.align === 'center' ? w / 2 : layer.align === 'right' ? w : 0
  ctx.textAlign = layer.align
  lines.forEach((line, i) => {
    const y = i * lh + lh / 2
    if (layer.shadow) {
      ctx.shadowColor = shadowCss(layer.shadow)
      ctx.shadowBlur = layer.shadow.blur
      ctx.shadowOffsetX = layer.shadow.offsetX
      ctx.shadowOffsetY = layer.shadow.offsetY
    }
    if (layer.stroke?.width > 0) {
      ctx.lineJoin = 'round'
      ctx.lineWidth = layer.stroke.width
      ctx.strokeStyle = layer.stroke.color
      ctx.strokeText(line, sx, y)
    }
    ctx.fillStyle = layer.color
    ctx.fillText(line, sx, y)
    if (layer.underline || layer.strike) drawDecorations(ctx, layer, line, sx, y)
    if (layer.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0)'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
    }
  })
}

// Kivuli kinatumika kwa umbo lote (kujaza na mpaka). save/restore inazuia kivuli kuvuja kwenye tabaka zinazofuata.
export function drawShape(ctx, layer) {
  ctx.save()
  if (layer.shadow) {
    ctx.shadowColor = shadowCss(layer.shadow)
    ctx.shadowBlur = layer.shadow.blur
    ctx.shadowOffsetX = layer.shadow.offsetX
    ctx.shadowOffsetY = layer.shadow.offsetY
  }
  for (const p of shapePrimitives(layer)) {
    if (p.kind === 'line') {
      ctx.strokeStyle = layer.stroke ?? DEFAULT_INK
      ctx.lineWidth = p.width
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(p.x1, p.y1)
      ctx.lineTo(p.x2, p.y2)
      ctx.stroke()
      continue
    }
    ctx.beginPath()
    if (p.kind === 'rect') {
      if (p.rx > 0) roundRectPath(ctx, p.x, p.y, p.w, p.h, p.rx)
      else ctx.rect(p.x, p.y, p.w, p.h)
    } else if (p.kind === 'ellipse') {
      ctx.ellipse(p.cx, p.cy, p.rx, p.ry, 0, 0, Math.PI * 2)
    } else if (p.kind === 'polygon') {
      p.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
      ctx.closePath()
    }
    const fill = p.headFill ? (layer.stroke ?? DEFAULT_INK) : layer.fill
    if (fill) {
      ctx.fillStyle = fill
      ctx.fill()
    }
    if (!p.headFill && layer.stroke && layer.strokeWidth > 0) {
      ctx.strokeStyle = layer.stroke
      ctx.lineWidth = layer.strokeWidth
      ctx.stroke()
    }
  }
  ctx.restore()
}

// Rangi ya multiply kwa joto (temperature) na tint. Thamani 0 inamaanisha hakuna athari (null).
export function tintColor(layer) {
  const t = layer.temperature ?? 0
  const g = layer.tint ?? 0
  if (!t && !g) return null
  let r = 255
  let gg = 255
  let b = 255
  if (t > 0) { const k = t / 100; gg *= 1 - 0.23 * k; b *= 1 - 0.55 * k }
  if (t < 0) { const k = -t / 100; r *= 1 - 0.55 * k; gg *= 1 - 0.23 * k }
  if (g > 0) { const k = g / 100; gg *= 1 - 0.31 * k }
  if (g < 0) { const k = -g / 100; r *= 1 - 0.31 * k; b *= 1 - 0.31 * k }
  return `rgb(${Math.round(r)}, ${Math.round(gg)}, ${Math.round(b)})`
}

export async function drawImage(ctx, layer, img, warnings) {
  const c = layer.crop
  const nw = img.naturalWidth || layer.naturalW
  const nh = img.naturalHeight || layer.naturalH
  const sx = c.x * nw
  const sy = c.y * nh
  const sw = c.w * nw
  const sh = c.h * nh
  if (layer.shadow) {
    // Kivuli kinachorwa na picha yenyewe, hivyo PNG yenye uwazi inapata kivuli cha umbo lake.
    ctx.save()
    ctx.shadowColor = shadowCss(layer.shadow)
    ctx.shadowBlur = layer.shadow.blur
    ctx.shadowOffsetX = layer.shadow.offsetX
    ctx.shadowOffsetY = layer.shadow.offsetY
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, layer.w, layer.h)
    ctx.restore()
  }
  ctx.save()
  if (layer.radius > 0) {
    roundRectPath(ctx, 0, 0, layer.w, layer.h, layer.radius)
    ctx.clip()
  }
  const filter = imageFilterString(layer)
  if (filter !== 'none' && !('filter' in ctx)) warnings.add('Athari za picha hazitumiki kwenye kivinjari hiki kwa export.')
  if ('filter' in ctx) ctx.filter = filter
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, layer.w, layer.h)
  if ('filter' in ctx) ctx.filter = 'none'
  const tint = tintColor(layer)
  if (tint) {
    ctx.globalCompositeOperation = 'multiply'
    ctx.fillStyle = tint
    ctx.fillRect(0, 0, layer.w, layer.h)
    // Multiply inajaza pia pembezoni pasipo picha: destination-in inarudisha uwazi huo.
    ctx.globalCompositeOperation = 'destination-in'
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, layer.w, layer.h)
  }
  ctx.restore()
  if (layer.border.width > 0) {
    const bw = layer.border.width
    ctx.strokeStyle = layer.border.color
    ctx.lineWidth = bw
    roundRectPath(ctx, bw / 2, bw / 2, layer.w - bw, layer.h - bw, Math.max(0, layer.radius - bw / 2))
    ctx.stroke()
  }
}

async function paintBackground(ctx, doc, loadImage, warnings) {
  const { width: W, height: H, background: bg } = doc
  const a = bg.opacity ?? 1
  // Msingi ni nyeupe: uwazi unachanganyika na nyeupe, sawa na preview ya DOM. Rangi thabiti isiyo wazi
  // inajaza turubai yote peke yake, kwa hiyo msingi haucholewi.
  if (!(bg.type === 'solid' && a >= 1)) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)
  }
  if (bg.type === 'gradient') {
    const e = gradientEndpoints(W, H, bg.angle)
    const g = ctx.createLinearGradient(e.x0, e.y0, e.x1, e.y1)
    g.addColorStop(0, bg.from)
    g.addColorStop(1, bg.to)
    ctx.save()
    ctx.globalAlpha = a
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
    return
  }
  if (bg.type === 'image') {
    try {
      const img = await loadImage(bg.src)
      const nw = img.naturalWidth || W
      const nh = img.naturalHeight || H
      const b = bg.blur ?? 0
      // Ukungu unahitaji ukingo: picha inachorwa kubwa kidogo ili kingo zisififie kuwa wazi.
      const m = b > 0 ? b * 2 : 0
      const s = Math.max((W + 2 * m) / nw, (H + 2 * m) / nh)
      const dw = nw * s
      const dh = nh * s
      ctx.save()
      ctx.globalAlpha = a
      ctx.beginPath()
      ctx.rect(0, 0, W, H)
      ctx.clip()
      if (b > 0) {
        if ('filter' in ctx) ctx.filter = `blur(${b}px)`
        else warnings.add('Ukungu wa mandhari hauungwi kwenye kivinjari hiki kwa export.')
      }
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh)
      ctx.restore()
    } catch (err) {
      warnings.add(`Mandhari ya picha haikupakiwa: ${err.message}`)
    }
    return
  }
  if (a < 1) ctx.save()
  if (a < 1) ctx.globalAlpha = a
  ctx.fillStyle = bg.color
  ctx.fillRect(0, 0, W, H)
  if (a < 1) ctx.restore()
}

/**
 * Chora hati nzima kwenye ctx. Tabaka zisizoonekana (hidden) zinaruka.
 * loadImage(src) → Promise<img>. onProgress({done,total}) kwa picha.
 * Inarudisha { warnings: string[] }. Inatupa ExportError kwa picha inayoshindwa tabaka lake.
 */
export async function renderDocument(doc, ctx, { loadImage, onProgress, transparent = false } = {}) {
  if (!loadImage) throw new ExportError('loadImage inahitajika.')
  const warnings = new Set()
  // transparent: mandhari haichorwi → PNG yenye uwazi. (Kwa JPEG, mhariri anaweka transparent=false.)
  if (!transparent) await paintBackground(ctx, doc, loadImage, warnings)

  const visible = doc.layers.filter((l) => !l.hidden)
  const images = visible.filter((l) => l.type === 'image')
  const cache = new Map()
  let done = 0
  if (onProgress) onProgress({ done, total: images.length })
  for (const layer of images) {
    if (!cache.has(layer.src)) {
      try {
        cache.set(layer.src, await loadImage(layer.src))
      } catch (err) {
        throw new ExportError(`Picha "${layer.name}" haikupakiwa kwa export: ${err.message}`, 'IMAGE_LOAD')
      }
    }
    done += 1
    if (onProgress) onProgress({ done, total: images.length })
  }

  for (const layer of visible) {
    enterLayer(ctx, layer)
    if (layer.type === 'text') drawText(ctx, layer)
    else if (layer.type === 'shape') drawShape(ctx, layer)
    else await drawImage(ctx, layer, cache.get(layer.src), warnings)
    ctx.restore()
  }
  return { warnings: [...warnings] }
}

const imageCache = new Map()
/** Kipakiaji cha picha cha browser (cha kawaida). */
export function defaultLoadImage(src) {
  if (imageCache.has(src)) return imageCache.get(src)
  const p = new Promise((resolve, reject) => {
    const img = new Image()
    if (/^https:/i.test(src)) img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new ExportError('kiungo cha picha hakipatikani au hakiruhusu kusomwa'))
    img.src = src
  })
  imageCache.set(src, p)
  p.catch(() => imageCache.delete(src))
  return p
}

/** Export ya PNG kwa ukubwa halisi wa hati. Inahitaji browser (document). */
/** Miundo ya export inayoungwa mkono. Kila moja ina MIME na kama inaruhusu uwazi. */
export const EXPORT_FORMATS = {
  png: { mime: 'image/png', ext: 'png', alpha: true, label: 'PNG' },
  jpeg: { mime: 'image/jpeg', ext: 'jpg', alpha: false, label: 'JPEG' },
  webp: { mime: 'image/webp', ext: 'webp', alpha: true, label: 'WebP' },
}

/**
 * Export ya picha moja. format: 'png' | 'jpeg' | 'webp'. transparent (PNG/WebP tu) huacha mandhari wazi.
 * JPEG haina uwazi: mandhari nyeupe inajazwa kabla ya kuchora, na transparent inapuuzwa kwa ujumbe.
 */
// Ukubwa wa export: scale ya 1× au 2× (chaguo-msingi 1×). Turubai haizidi MAX_CANVAS kwa upana wala urefu;
// zikizidi, scale inapunguzwa hadi ifae. Hesabu hii ni safi, bila DOM.
export const EXPORT_SCALES = Object.freeze([1, 2])

export function exportSize(doc, scale = 1) {
  const requested = EXPORT_SCALES.includes(scale) ? scale : 1
  const fit = Math.min(requested, MAX_CANVAS / doc.width, MAX_CANVAS / doc.height)
  return {
    width: Math.round(doc.width * fit),
    height: Math.round(doc.height * fit),
    scale: fit,
    clamped: fit < requested,
  }
}

export async function exportImage(doc, { format = 'png', transparent = false, quality = 0.92, scale = 1, loadImage = defaultLoadImage, onProgress } = {}) {
  const spec = EXPORT_FORMATS[format]
  if (!spec) throw new ExportError(`Muundo wa ${format} haupatikani.`, 'FORMAT')
  if (typeof document === 'undefined') throw new ExportError('Export inahitaji browser.', 'NO_DOM')
  const { width, height, scale: k } = exportSize(doc, scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new ExportError('Kivinjari hakiruhusu canvas.', 'NO_CONTEXT')
  // Michoro yote iko kwenye kuratibu za mradi; scale inawekwa hapa mara moja.
  ctx.setTransform(k, 0, 0, k, 0, 0)
  const useAlpha = spec.alpha && transparent
  const warnings = []
  if (transparent && !spec.alpha) warnings.push('JPEG haina uwazi: mandhari nyeupe imetumika.')
  if (!useAlpha && !spec.alpha) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, doc.width, doc.height)
  }
  const rendered = await renderDocument(doc, ctx, { loadImage, onProgress, transparent: useAlpha })
  warnings.push(...rendered.warnings)
  const blob = await new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new ExportError(`Kutengeneza ${spec.label} kumeshindikana.`, 'ENCODE'))),
        spec.mime,
        spec.mime === 'image/png' ? undefined : quality,
      )
    } catch (err) {
      reject(new ExportError(
        err?.name === 'SecurityError'
          ? 'Export imezuiwa: picha ya nje haina ruhusa ya CORS. Tumia picha ya kupakia kutoka kifaa chako.'
          : `Export imeshindikana: ${err?.message || 'hitilafu'}`,
        'EXPORT_BLOCKED',
      ))
    }
  })
  // Kivinjari kisichounga mkono WebP hurudisha PNG; tunaripoti badala ya kudai WebP.
  const actualMime = blob.type || spec.mime
  if (actualMime !== spec.mime) warnings.push(`Kivinjari hakitengenezi ${spec.label}; PNG imetumika.`)
  return { blob, width, height, scale: k, warnings, format, mime: actualMime, ext: actualMime === 'image/png' ? 'png' : spec.ext }
}

/** Kifungashio cha zamani: PNG. */
export async function exportPng(doc, opts = {}) {
  const r = await exportImage(doc, { ...opts, format: 'png' })
  return { blob: r.blob, width: r.width, height: r.height, warnings: r.warnings }
}
