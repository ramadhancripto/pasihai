// ══════════════════════════════════════════════════════════════
// PASIHAI — Creative document model (injini moja ya canvas)
//
// Hati moja inatumiwa na modes zote: post, story, poster, tangazo,
// thumbnail, n.k. Mode inaamua ukubwa, zana za awali na layers za kuanzia;
// haibadilishi injini. Hakuna HTML/JS ya mtumiaji: maandishi ni maandishi tu,
// picha ni data: au https tu, na rangi ni HEX tu.
//
// Pure: hakuna DOM, hakuna network. Inatumika na UI, renderer na tests.
// ══════════════════════════════════════════════════════════════

export const SCHEMA_VERSION = 1
export const MAX_LAYERS = 200
export const MAX_TEXT_LENGTH = 2000
export const MAX_TITLE_LENGTH = 120
export const MIN_CANVAS = 200
export const MAX_CANVAS = 4000
export const MIN_LAYER_SIZE = 8
export const SNAP_THRESHOLD = 6

export const DEFAULT_INK = '#1b1f1d'
export const DEFAULT_WHITE = '#ffffff'
export const DEFAULT_ACCENT = '#18a982'

const HEX_RE = /^#[0-9a-f]{6}$/i
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/
const IMAGE_DATA_RE = /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/
const IMAGE_HTTPS_RE = /^https:\/\/[^\s"'<>()]+$/i

export const LAYER_TYPES = ['text', 'image', 'shape']
export const SHAPE_KINDS = ['rect', 'rounded', 'ellipse', 'triangle', 'line', 'arrow']
export const TEXT_ALIGNS = ['left', 'center', 'right']
export const BACKGROUND_TYPES = ['solid', 'gradient', 'image']
export const LAYER_ORDER_OPS = ['front', 'forward', 'backward', 'back']
export const ALIGN_OPS = ['left', 'centerX', 'right', 'top', 'centerY', 'bottom']

const DEFAULT_NAMES = { text: 'Maandishi', image: 'Picha', shape: 'Umbo' }

export class CreativeValidationError extends Error {
  constructor(message, code = 'INVALID_DOCUMENT') {
    super(message)
    this.name = 'CreativeValidationError'
    this.code = code
  }
}

// Fonti: mbili zimefungwa kwenye app (Inter, Inter Tight). Nyingine zinategemea kifaa.
export const FONTS = [
  { key: 'inter', label: 'Inter', stack: "'Inter', system-ui, sans-serif", bundled: true },
  { key: 'inter-tight', label: 'Inter Tight', stack: "'Inter Tight', 'Inter', system-ui, sans-serif", bundled: true },
  { key: 'georgia', label: 'Georgia', stack: "Georgia, 'Times New Roman', serif", bundled: false },
  { key: 'times', label: 'Times New Roman', stack: "'Times New Roman', Times, serif", bundled: false },
  { key: 'trebuchet', label: 'Trebuchet MS', stack: "'Trebuchet MS', Arial, sans-serif", bundled: false },
  { key: 'verdana', label: 'Verdana', stack: 'Verdana, Geneva, sans-serif', bundled: false },
  { key: 'impact', label: 'Impact', stack: "Impact, 'Arial Narrow Bold', sans-serif", bundled: false },
  { key: 'courier', label: 'Courier New', stack: "'Courier New', Courier, monospace", bundled: false },
]
export const FONT_KEYS = FONTS.map((f) => f.key)
export const DEFAULT_FONT = 'inter'

export function fontFor(key) {
  return FONTS.find((f) => f.key === key) ?? FONTS[0]
}

// ── Modes ───────────────────────────────────────────────────────
// status: available | partial | planned (sawa na STATUS ya Creator Studio).
// planned → haiwezi kuanzishwa. partial → inaanzishwa, na kikwazo kimeandikwa.
export const MODES = {
  blank: {
    id: 'blank', label: 'Blank Canvas', width: 1080, height: 1080, status: 'available',
    note: 'Turubai tupu. Ongeza unachotaka.', build: () => [],
  },
  social: {
    id: 'social', label: 'Social Post', width: 1080, height: 1080, status: 'available',
    note: 'Chapisho la mraba kwa feed.',
    build: (W, H) => [makeText({ name: 'Kichwa', x: W * 0.08, y: H * 0.1, w: W * 0.84, h: H * 0.2, text: 'Kichwa cha chapisho', fontSize: Math.round(H * 0.07), bold: true })],
  },
  story: {
    id: 'story', label: 'Status / Story', width: 1080, height: 1920, status: 'available',
    note: 'Wima 9:16 kwa Status na Story.',
    build: (W, H) => [makeText({ name: 'Kichwa', x: W * 0.08, y: H * 0.42, w: W * 0.84, h: H * 0.16, text: 'Habari ya leo', fontSize: Math.round(H * 0.035), bold: true, align: 'center' })],
  },
  image: {
    id: 'image', label: 'Image Design', width: 1080, height: 1080, status: 'available',
    note: 'Picha moja na maandishi ya juu.', build: () => [],
  },
  poster: {
    id: 'poster', label: 'Poster / Flyer', width: 1240, height: 1754, status: 'available',
    note: 'Ukubwa wa A4 kwa poster au flyer.',
    build: (W, H) => [
      makeText({ name: 'Kichwa', x: W * 0.08, y: H * 0.08, w: W * 0.84, h: H * 0.14, text: 'Jina la tukio', fontSize: Math.round(H * 0.05), bold: true, align: 'center' }),
      makeText({ name: 'Maelezo', x: W * 0.08, y: H * 0.8, w: W * 0.84, h: H * 0.12, text: 'Tarehe • Mahali • Mawasiliano', fontSize: Math.round(H * 0.022), align: 'center' }),
    ],
  },
  ad: {
    id: 'ad', label: 'Advertisement', width: 1200, height: 628, status: 'partial',
    note: 'Unaweza kubuni na kuhifadhi PNG. Uchapishaji wa matangazo haujaunganishwa.',
    build: (W, H) => [makeText({ name: 'Ujumbe', x: W * 0.06, y: H * 0.2, w: W * 0.56, h: H * 0.4, text: 'Ujumbe wa tangazo lako', fontSize: Math.round(H * 0.09), bold: true })],
  },
  announcement: {
    id: 'announcement', label: 'Announcement', width: 1080, height: 1350, status: 'available',
    note: 'Tangazo lenye kichwa na maelezo.',
    build: (W, H) => [
      makeText({ name: 'Kichwa', x: W * 0.08, y: H * 0.08, w: W * 0.84, h: H * 0.16, text: 'Tangazo', fontSize: Math.round(H * 0.06), bold: true }),
      makeText({ name: 'Maelezo', x: W * 0.08, y: H * 0.3, w: W * 0.84, h: H * 0.3, text: 'Andika maelezo hapa.', fontSize: Math.round(H * 0.03) }),
    ],
  },
  thumbnail: {
    id: 'thumbnail', label: 'Thumbnail', width: 1280, height: 720, status: 'available',
    note: 'Thumbnail ya video au makala.',
    build: (W, H) => [makeText({ name: 'Kichwa', x: W * 0.06, y: H * 0.3, w: W * 0.88, h: H * 0.4, text: 'Kichwa kikubwa', fontSize: Math.round(H * 0.13), bold: true, align: 'center' })],
  },
  carousel: {
    id: 'carousel', label: 'Carousel', width: 1080, height: 1080, status: 'partial',
    note: 'Slaidi moja kwa sasa. Slaidi nyingi bado hazijaunganishwa.', build: () => [],
  },
  slideshow: {
    id: 'slideshow', label: 'Slideshow', width: 1080, height: 1350, status: 'partial',
    note: 'Slaidi moja kwa sasa. Timeline ya slaidi bado haijaunganishwa.', build: () => [],
  },
  shortvideo: {
    id: 'shortvideo', label: 'Short Video', width: 1080, height: 1920, status: 'planned',
    note: 'Uhariri wa video haujaunganishwa. Hakuna video inayotengenezwa.', build: () => [],
  },
  videopost: {
    id: 'videopost', label: 'Video Post', width: 1920, height: 1080, status: 'planned',
    note: 'Uhariri wa video haujaunganishwa. Hakuna video inayotengenezwa.', build: () => [],
  },
  product: {
    id: 'product', label: 'Product Promotion', width: 1080, height: 1080, status: 'available',
    note: 'Picha ya bidhaa na maelezo mafupi.',
    build: (W, H) => [
      makeText({ name: 'Jina la bidhaa', x: W * 0.08, y: H * 0.78, w: W * 0.84, h: H * 0.1, text: 'Jina la bidhaa', fontSize: Math.round(H * 0.05), bold: true }),
    ],
  },
  textgraphic: {
    id: 'textgraphic', label: 'Text Graphic', width: 1200, height: 1200, status: 'available',
    note: 'Picha ya maandishi pekee.',
    build: (W, H) => [makeText({ name: 'Nukuu', x: W * 0.1, y: H * 0.3, w: W * 0.8, h: H * 0.4, text: 'Nukuu yako hapa', fontSize: Math.round(H * 0.07), align: 'center', italic: true })],
  },
  custom: {
    id: 'custom', label: 'Custom Design', width: 1080, height: 1080, status: 'available', custom: true,
    note: 'Chagua ukubwa wako mwenyewe.', build: () => [],
  },
}
export const MODE_ORDER = Object.keys(MODES)

// ── Ids, strings, numbers ──────────────────────────────────────
let idCounter = 0
export function newId(prefix = 'e') {
  idCounter += 1
  const rand = Math.random().toString(36).slice(2, 7)
  return `${prefix}${Date.now().toString(36)}${idCounter.toString(36)}${rand}`.replace(/[^A-Za-z0-9]/g, '').slice(0, 64)
}

export function clamp(v, min, max, fallback) {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

export function normalizeHex(v, fallback) {
  return typeof v === 'string' && HEX_RE.test(v) ? v.toLowerCase() : fallback
}

export function normalizeNullableHex(v) {
  if (v === null || v === undefined || v === '') return null
  return normalizeHex(v, null)
}

/** Ondoa herufi za udhibiti; hifadhi mistari mipya ya maandishi. */
export function cleanString(v, max, { multiline = false } = {}) {
  if (typeof v !== 'string') return ''
  let s = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  if (multiline) s = s.replace(/\r\n?/g, '\n')
  else s = s.replace(/[\r\n]+/g, ' ')
  return s.slice(0, max)
}

// Uwiano wa picha: kata katikati ili ulingane na `ratio` (upana/urefu). Upana wa kipengele unabaki,
// urefu unahesabiwa. Uwiano wa asili (naturalW/naturalH) unarudisha picha nzima.
export function aspectCrop(layer, ratio) {
  const sr = layer.naturalW / layer.naturalH
  let crop
  if (sr > ratio) {
    const cw = ratio / sr
    crop = { x: (1 - cw) / 2, y: 0, w: cw, h: 1 }
  } else {
    const ch = sr / ratio
    crop = { x: 0, y: (1 - ch) / 2, w: 1, h: ch }
  }
  return { crop, h: Math.max(MIN_LAYER_SIZE, Math.round(layer.w / ratio)) }
}

export function isAllowedImageSrc(src) {
  return typeof src === 'string' && (IMAGE_DATA_RE.test(src) || IMAGE_HTTPS_RE.test(src))
}

// ── Layer factories ─────────────────────────────────────────────
function baseLayer(type, over) {
  return {
    id: over.id ?? newId('l'),
    type,
    name: over.name ?? DEFAULT_NAMES[type],
    x: 0, y: 0, w: 200, h: 100,
    rotation: 0, opacity: 1, locked: false, hidden: false,
    ...over,
  }
}

export function makeText(over = {}) {
  return normalizeLayer(baseLayer('text', {
    w: 600, h: 120, text: 'Andika hapa', fontKey: DEFAULT_FONT, fontSize: 64,
    bold: false, italic: false, color: DEFAULT_INK, bgColor: null, align: 'left',
    lineHeight: 1.2, letterSpacing: 0,
    stroke: { width: 0, color: DEFAULT_WHITE }, shadow: null,
    ...over,
  }))
}

export function makeShape(kind = 'rect', over = {}) {
  const line = kind === 'line' || kind === 'arrow'
  return normalizeLayer(baseLayer('shape', {
    name: over.name ?? SHAPE_LABEL[kind] ?? 'Umbo',
    w: line ? 320 : 280, h: line ? 12 : 200,
    shape: kind, fill: line ? null : DEFAULT_ACCENT,
    stroke: line ? DEFAULT_INK : null, strokeWidth: line ? 12 : 0, radius: kind === 'rounded' ? 48 : 0,
    ...over,
  }))
}
export const SHAPE_LABEL = {
  rect: 'Mstatili', rounded: 'Mstatili wa mviringo', ellipse: 'Duara', triangle: 'Pembetatu', line: 'Mstari', arrow: 'Mshale',
}

/** Picha: inawekwa ndani ya kikomo cha turubai, ikihifadhi uwiano wake wa asili. */
export function makeImage(src, natural, doc, over = {}) {
  const nw = Math.max(1, Math.round(natural?.width || 1))
  const nh = Math.max(1, Math.round(natural?.height || 1))
  const maxW = doc.width * 0.8
  const maxH = doc.height * 0.8
  const scale = Math.min(maxW / nw, maxH / nh, 1)
  const w = Math.max(MIN_LAYER_SIZE, Math.round(nw * scale))
  const h = Math.max(MIN_LAYER_SIZE, Math.round(nh * scale))
  return normalizeLayer(baseLayer('image', {
    name: over.name ?? 'Picha', src, naturalW: nw, naturalH: nh,
    x: Math.round((doc.width - w) / 2), y: Math.round((doc.height - h) / 2), w, h,
    crop: { x: 0, y: 0, w: 1, h: 1 }, border: { width: 0, color: DEFAULT_INK },
    radius: 0, brightness: 100, contrast: 100, saturation: 100, blur: 0,
    ...over,
  }))
}

// ── Normalization (inatumika na sanitize na kila edit) ──────────
// Kivuli: rangi ya hex + alpha tofauti. Alpha isiyokuwepo (data ya zamani) ni 1, kama awali.
export function normalizeShadowFx(raw) {
  if (!raw || typeof raw !== 'object') return null
  return {
    color: normalizeHex(raw.color, '#000000'),
    alpha: clamp(raw.alpha, 0, 1, 1),
    blur: clamp(raw.blur, 0, 80, 12),
    offsetX: clamp(raw.offsetX, -200, 200, 4),
    offsetY: clamp(raw.offsetY, -200, 200, 6),
  }
}

// Kivuli kipya cha chaguo-msingi (uwazi 35%).
export const DEFAULT_SHADOW = { color: '#000000', alpha: 0.35, blur: 12, offsetX: 4, offsetY: 6 }

// Rangi ya CSS/canvas yenye alpha ya kivuli.
export function shadowCss(sh) {
  const a = sh.alpha ?? 1
  if (!/^#[0-9a-f]{6}$/i.test(sh.color)) return sh.color
  const n = parseInt(sh.color.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

// Maumbo tayari: kila preset ni patch ya sifa za umbo lililochaguliwa. Hakuna mabadiliko ya ukubwa wala nafasi.
export const SHAPE_PRESETS = [
  { id: 'pill', label: 'Kidonge', patch: (l) => ({ shape: 'rounded', radius: Math.round(Math.min(l.w, l.h) / 2) }) },
  { id: 'outline', label: 'Mpaka tu', patch: () => ({ fill: null, stroke: DEFAULT_INK, strokeWidth: 8, shadow: null }) },
  { id: 'card', label: 'Kadi yenye kivuli', patch: () => ({ shape: 'rect', radius: 24, fill: '#ffffff', stroke: null, strokeWidth: 0, shadow: { ...DEFAULT_SHADOW, blur: 16, offsetY: 8 } }) },
  { id: 'badge', label: 'Duara yenye kivuli', patch: () => ({ shape: 'ellipse', fill: DEFAULT_ACCENT, stroke: null, strokeWidth: 0, shadow: { ...DEFAULT_SHADOW, blur: 12, offsetY: 6 } }) },
]

export function applyShapePreset(layer, id) {
  const p = SHAPE_PRESETS.find((x) => x.id === id)
  return p ? p.patch(layer) : null
}

function normalizeCrop(raw) {
  const c = raw && typeof raw === 'object' ? raw : {}
  let w = clamp(c.w, 0.05, 1, 1)
  let h = clamp(c.h, 0.05, 1, 1)
  let x = clamp(c.x, 0, 1 - w, 0)
  let y = clamp(c.y, 0, 1 - h, 0)
  return { x, y, w, h }
}

export function normalizeLayer(raw) {
  if (!raw || typeof raw !== 'object') throw new CreativeValidationError('Kipengele si sahihi.')
  if (!LAYER_TYPES.includes(raw.type)) throw new CreativeValidationError('Aina ya kipengele haitambuliki.')
  const type = raw.type
  const layer = {
    id: typeof raw.id === 'string' && ID_RE.test(raw.id) ? raw.id : newId('l'),
    type,
    name: cleanString(raw.name, 60) || DEFAULT_NAMES[type],
    x: clamp(raw.x, -8000, 8000, 0),
    y: clamp(raw.y, -8000, 8000, 0),
    w: clamp(raw.w, MIN_LAYER_SIZE, 8000, 200),
    h: clamp(raw.h, MIN_LAYER_SIZE, 8000, 100),
    rotation: ((clamp(raw.rotation, -3600, 3600, 0) % 360) + 360) % 360,
    opacity: clamp(raw.opacity, 0, 1, 1),
    locked: raw.locked === true,
    hidden: raw.hidden === true,
    flipX: raw.flipX === true,
    flipY: raw.flipY === true,
  }
  if (type === 'text') {
    const stroke = raw.stroke && typeof raw.stroke === 'object' ? raw.stroke : {}
    const shadow = normalizeShadowFx(raw.shadow)
    return {
      ...layer,
      text: cleanString(raw.text, MAX_TEXT_LENGTH, { multiline: true }),
      fontKey: FONT_KEYS.includes(raw.fontKey) ? raw.fontKey : DEFAULT_FONT,
      fontSize: clamp(raw.fontSize, 6, 600, 64),
      bold: raw.bold === true,
      italic: raw.italic === true,
      underline: raw.underline === true,
      strike: raw.strike === true,
      list: ['none', 'bullet', 'number'].includes(raw.list) ? raw.list : 'none',
      color: normalizeHex(raw.color, DEFAULT_INK),
      bgColor: normalizeNullableHex(raw.bgColor),
      align: TEXT_ALIGNS.includes(raw.align) ? raw.align : 'left',
      lineHeight: clamp(raw.lineHeight, 0.8, 3, 1.2),
      letterSpacing: clamp(raw.letterSpacing, -10, 80, 0),
      stroke: { width: clamp(stroke.width, 0, 20, 0), color: normalizeHex(stroke.color, DEFAULT_WHITE) },
      shadow,
    }
  }
  if (type === 'image') {
    if (!isAllowedImageSrc(raw.src)) throw new CreativeValidationError('Kiungo cha picha si salama au si sahihi.', 'UNSAFE_IMAGE')
    const border = raw.border && typeof raw.border === 'object' ? raw.border : {}
    return {
      ...layer,
      src: raw.src,
      naturalW: clamp(raw.naturalW, 1, 20000, 1000),
      naturalH: clamp(raw.naturalH, 1, 20000, 1000),
      crop: normalizeCrop(raw.crop),
      border: { width: clamp(border.width, 0, 60, 0), color: normalizeHex(border.color, DEFAULT_INK) },
      radius: clamp(raw.radius, 0, 4000, 0),
      brightness: clamp(raw.brightness, 0, 200, 100),
      contrast: clamp(raw.contrast, 0, 200, 100),
      saturation: clamp(raw.saturation, 0, 200, 100),
      blur: clamp(raw.blur, 0, 40, 0),
      temperature: clamp(raw.temperature, -100, 100, 0),
      tint: clamp(raw.tint, -100, 100, 0),
      shadow: normalizeShadowFx(raw.shadow),
    }
  }
  // shape
  return {
    ...layer,
    shape: SHAPE_KINDS.includes(raw.shape) ? raw.shape : 'rect',
    fill: normalizeNullableHex(raw.fill),
    stroke: normalizeNullableHex(raw.stroke),
    strokeWidth: clamp(raw.strokeWidth, 0, 200, 0),
    radius: clamp(raw.radius, 0, 4000, 0),
    shadow: normalizeShadowFx(raw.shadow),
  }
}

function normalizeBackgroundCore(r) {
  const opacity = clamp(r.opacity, 0, 1, 1)
  if (r.type === 'gradient') {
    return {
      type: 'gradient',
      from: normalizeHex(r.from, DEFAULT_ACCENT),
      to: normalizeHex(r.to, '#3b82f6'),
      angle: clamp(r.angle, 0, 360, 135),
      opacity,
    }
  }
  if (r.type === 'image') {
    if (!isAllowedImageSrc(r.src)) throw new CreativeValidationError('Kiungo cha mandhari si salama au si sahihi.', 'UNSAFE_IMAGE')
    return { type: 'image', src: r.src, opacity, blur: clamp(r.blur, 0, 40, 0) }
  }
  return { type: 'solid', color: normalizeHex(r.color, DEFAULT_WHITE), opacity }
}

// Mandhari ya awali (prev) ni ya hiari. Ikiwa si sahihi inapuuzwa, mandhari kuu inabaki.
export function normalizeBackground(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}
  const bg = normalizeBackgroundCore(r)
  if (r.prev && typeof r.prev === 'object') {
    try {
      bg.prev = normalizeBackgroundCore(r.prev)
    } catch {
      // mandhari ya awali si sahihi: inapuuzwa
    }
  }
  return bg
}

// ── Document ───────────────────────────────────────────────────
export function createDocument(modeId = 'blank', opts = {}) {
  const mode = MODES[modeId] ?? MODES.blank
  const width = mode.custom ? clamp(opts.width, MIN_CANVAS, MAX_CANVAS, 1080) : mode.width
  const height = mode.custom ? clamp(opts.height, MIN_CANVAS, MAX_CANVAS, 1080) : mode.height
  return {
    schema: SCHEMA_VERSION,
    title: cleanString(opts.title ?? mode.label, MAX_TITLE_LENGTH) || mode.label,
    mode: mode.id,
    width: Math.round(width),
    height: Math.round(height),
    background: { type: 'solid', color: DEFAULT_WHITE },
    layers: mode.build(width, height),
  }
}

/** Thibitisha na safisha hati kutoka chanzo chochote (kifaa, backend, JSON). Inatupa kosa kwa muundo batili. */
export function sanitizeDocument(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new CreativeValidationError('Mradi si hati halali.')
  }
  if (raw.schema !== SCHEMA_VERSION) {
    throw new CreativeValidationError('Toleo la mradi hili halitambuliki na app hii.', 'SCHEMA_VERSION')
  }
  if (!Array.isArray(raw.layers)) throw new CreativeValidationError('Orodha ya tabaka inakosekana.')
  if (raw.layers.length > MAX_LAYERS) throw new CreativeValidationError(`Tabaka zimezidi kikomo cha ${MAX_LAYERS}.`, 'LIMIT')

  const warnings = []
  const seen = new Set()
  const layers = raw.layers.map((l) => {
    const layer = normalizeLayer(l)
    if (seen.has(layer.id)) {
      warnings.push(`Kitambulisho kilichorudiwa kimebadilishwa: ${layer.name}`)
      layer.id = newId('l')
    }
    seen.add(layer.id)
    return layer
  })
  const doc = {
    schema: SCHEMA_VERSION,
    title: cleanString(raw.title, MAX_TITLE_LENGTH) || 'Mradi bila jina',
    mode: MODES[raw.mode] ? raw.mode : 'blank',
    width: Math.round(clamp(raw.width, MIN_CANVAS, MAX_CANVAS, 1080)),
    height: Math.round(clamp(raw.height, MIN_CANVAS, MAX_CANVAS, 1080)),
    background: normalizeBackground(raw.background),
    layers,
  }
  return { doc, warnings }
}

export function findLayer(doc, id) {
  return doc.layers.find((l) => l.id === id) ?? null
}

const withLayers = (doc, layers) => ({ ...doc, layers })
const indexOf = (doc, id) => doc.layers.findIndex((l) => l.id === id)

export function addLayer(doc, raw) {
  if (doc.layers.length >= MAX_LAYERS) throw new CreativeValidationError(`Umefikia kikomo cha tabaka ${MAX_LAYERS}.`, 'LIMIT')
  const layer = normalizeLayer(raw)
  return { doc: withLayers(doc, [...doc.layers, layer]), id: layer.id }
}

export function updateLayer(doc, id, patch) {
  const idx = indexOf(doc, id)
  if (idx < 0) return doc
  const cur = doc.layers[idx]
  const next = normalizeLayer({ ...cur, ...patch, id: cur.id, type: cur.type })
  if (JSON.stringify(next) === JSON.stringify(cur)) return doc
  const layers = doc.layers.slice()
  layers[idx] = next
  return withLayers(doc, layers)
}

export function removeLayer(doc, id) {
  return withLayers(doc, doc.layers.filter((l) => l.id !== id))
}

/** Nakala iko juu ya asili, ikisogezwa kidogo ili ionekane. */
export function duplicateLayer(doc, id) {
  const idx = indexOf(doc, id)
  if (idx < 0) return { doc, id: null }
  if (doc.layers.length >= MAX_LAYERS) throw new CreativeValidationError(`Umefikia kikomo cha tabaka ${MAX_LAYERS}.`, 'LIMIT')
  const src = doc.layers[idx]
  const copy = normalizeLayer({
    ...src, id: newId('l'), name: cleanString(`${src.name} (nakala)`, 60),
    x: src.x + 24, y: src.y + 24,
  })
  const layers = doc.layers.slice()
  layers.splice(idx + 1, 0, copy)
  return { doc: withLayers(doc, layers), id: copy.id }
}

/** Mpangilio wa z-order. Index 0 = chini kabisa. */
export function moveLayer(doc, id, op) {
  const idx = indexOf(doc, id)
  if (idx < 0 || !LAYER_ORDER_OPS.includes(op)) return doc
  const last = doc.layers.length - 1
  const target = op === 'front' ? last
    : op === 'back' ? 0
      : op === 'forward' ? Math.min(idx + 1, last)
        : Math.max(idx - 1, 0)
  return moveLayerTo(doc, id, target)
}

export function moveLayerTo(doc, id, toIndex) {
  const idx = indexOf(doc, id)
  if (idx < 0) return doc
  const target = Math.min(Math.max(0, toIndex), doc.layers.length - 1)
  if (target === idx) return doc
  const layers = doc.layers.slice()
  const [item] = layers.splice(idx, 1)
  layers.splice(target, 0, item)
  return withLayers(doc, layers)
}

/** Kupanga kwenye turubai (kwa unrotated bounds). */
export function alignLayer(doc, id, where) {
  const layer = findLayer(doc, id)
  if (!layer || !ALIGN_OPS.includes(where)) return doc
  const patch = {}
  if (where === 'left') patch.x = 0
  if (where === 'centerX') patch.x = (doc.width - layer.w) / 2
  if (where === 'right') patch.x = doc.width - layer.w
  if (where === 'top') patch.y = 0
  if (where === 'centerY') patch.y = (doc.height - layer.h) / 2
  if (where === 'bottom') patch.y = doc.height - layer.h
  return updateLayer(doc, id, patch)
}

/** Vipengele vingi: vyote vinaondolewa kwa hatua moja (undo moja). */
export function removeLayers(doc, ids) {
  const set = new Set(ids)
  return withLayers(doc, doc.layers.filter((l) => !set.has(l.id)))
}

/** Nakala za vipengele vilivyochaguliwa, kila moja ikiwekwa juu ya asili yake. */
export function duplicateLayers(doc, ids) {
  const set = new Set(ids)
  const picked = doc.layers.filter((l) => set.has(l.id))
  if (!picked.length) return { doc, ids: [] }
  if (doc.layers.length + picked.length > MAX_LAYERS) throw new CreativeValidationError(`Umefikia kikomo cha tabaka ${MAX_LAYERS}.`, 'LIMIT')
  let layers = doc.layers.slice()
  const newIds = []
  for (const src of picked) {
    const idx = layers.findIndex((l) => l.id === src.id)
    const copy = normalizeLayer({
      ...src, id: newId('l'), name: cleanString(`${src.name} (nakala)`, 60), x: src.x + 24, y: src.y + 24,
    })
    layers.splice(idx + 1, 0, copy)
    newIds.push(copy.id)
  }
  return { doc: withLayers(doc, layers), ids: newIds }
}

/** Kufunga/kuficha vipengele vingi kwa thamani moja. Vilivyofungwa haviguswi wakati wa kufungua. */
export function setLayersFlag(doc, ids, flag, value) {
  if (flag !== 'locked' && flag !== 'hidden') return doc
  let cur = doc
  for (const id of ids) {
    const l = findLayer(cur, id)
    if (l && l[flag] !== value) cur = updateLayer(cur, id, { [flag]: value })
  }
  return cur
}

/** Panga vipengele vingi kwa mpaka wa kikundi cha vilivyochaguliwa (sio turubai). */
export function alignLayers(doc, ids, where) {
  if (!ALIGN_OPS.includes(where)) return doc
  const picked = ids.map((id) => findLayer(doc, id)).filter((l) => l && !l.locked)
  if (picked.length < 2) return doc
  const minX = Math.min(...picked.map((l) => l.x))
  const maxX = Math.max(...picked.map((l) => l.x + l.w))
  const minY = Math.min(...picked.map((l) => l.y))
  const maxY = Math.max(...picked.map((l) => l.y + l.h))
  let cur = doc
  for (const l of picked) {
    const p = {}
    if (where === 'left') p.x = minX
    if (where === 'centerX') p.x = Math.round((minX + maxX) / 2 - l.w / 2)
    if (where === 'right') p.x = maxX - l.w
    if (where === 'top') p.y = minY
    if (where === 'centerY') p.y = Math.round((minY + maxY) / 2 - l.h / 2)
    if (where === 'bottom') p.y = maxY - l.h
    cur = updateLayer(cur, l.id, p)
  }
  return cur
}

/** Gawanya vipengele vitatu au zaidi kwa nafasi sawa kati ya vilivyokithiri (mlalo au wima). */
export function distributeLayers(doc, ids, axis) {
  if (axis !== 'x' && axis !== 'y') return doc
  const picked = ids.map((id) => findLayer(doc, id)).filter((l) => l && !l.locked)
  if (picked.length < 3) return doc
  const size = axis === 'x' ? 'w' : 'h'
  const pos = axis === 'x' ? 'x' : 'y'
  const sorted = picked.slice().sort((a, b) => (a[pos] + a[size] / 2) - (b[pos] + b[size] / 2))
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const start = first[pos]
  const end = last[pos] + last[size]
  const total = sorted.reduce((sum, l) => sum + l[size], 0)
  const gap = (end - start - total) / (sorted.length - 1)
  let cursor = start
  let cur = doc
  for (const l of sorted) {
    if (l.id !== first.id && l.id !== last.id) cur = updateLayer(cur, l.id, { [pos]: Math.round(cursor) })
    cursor += l[size] + gap
  }
  return cur
}

/** Clipboard ya ndani ya mhariri: nakala safi za vipengele (bila id). */
export function copyLayers(doc, ids) {
  return ids.map((id) => findLayer(doc, id)).filter(Boolean).map((l) => {
    const { id: _id, ...rest } = l
    return rest
  })
}

/** Bandika nakala za clipboard, zikiwa zimehamishwa kidogo ili ziwe rahisi kuonekana. */
export function pasteLayers(doc, payload, offset = 24) {
  if (!Array.isArray(payload) || !payload.length) return { doc, ids: [] }
  if (doc.layers.length + payload.length > MAX_LAYERS) throw new CreativeValidationError(`Umefikia kikomo cha tabaka ${MAX_LAYERS}.`, 'LIMIT')
  const created = payload.map((raw) => normalizeLayer({ ...raw, id: newId('l'), x: raw.x + offset, y: raw.y + offset }))
  return { doc: withLayers(doc, [...doc.layers, ...created]), ids: created.map((l) => l.id) }
}

function withoutPrev(bg) {
  const { prev, ...rest } = bg
  return rest
}

export function setBackground(doc, raw) {
  const r = raw && typeof raw === 'object' ? raw : {}
  const next = normalizeBackground(r)
  if (!('prev' in r)) {
    // Mandhari ya awali inahifadhiwa aina au picha inapobadilika. Rangi, uwazi na ukungu havibadili.
    const cur = doc.background ?? normalizeBackground(null)
    const kindChanged = next.type !== cur.type || (next.type === 'image' && next.src !== cur.src)
    const prev = kindChanged ? withoutPrev(cur) : cur.prev
    if (prev) next.prev = prev
  }
  return { ...doc, background: next }
}

export function setTitle(doc, title) {
  return { ...doc, title: cleanString(title, MAX_TITLE_LENGTH) || 'Mradi bila jina' }
}

/** Bila kupoteza vitu: mwelekeo wa turubai unabaki ule ule. */
export function scaleForBox(W, H, boxW, boxH) {
  if (!(W > 0 && H > 0 && boxW > 0 && boxH > 0)) return 1
  return Math.min(boxW / W, boxH / H)
}

/**
 * Snap ya kusogeza: kingo na katikati ya kipengele zinavutwa kwenye kingo/katikati ya turubai.
 * Inarudisha nafasi mpya na mistari ya mwongozo (guides) ya kuonyesha.
 */
export function snapPosition(doc, layer, x, y, threshold = SNAP_THRESHOLD) {
  const xs = [0, doc.width / 2, doc.width]
  const ys = [0, doc.height / 2, doc.height]
  const guides = { v: [], h: [] }
  const pick = (candidates, targets) => {
    let best = null
    for (const c of candidates) {
      for (const t of targets) {
        const d = Math.abs(c.value - t)
        if (d <= threshold && (best === null || d < best.d)) best = { d, shift: t - c.value, target: t }
      }
    }
    return best
  }
  let nx = x
  let ny = y
  const sx = pick([{ value: x }, { value: x + layer.w / 2 }, { value: x + layer.w }], xs)
  if (sx) { nx = x + sx.shift; guides.v.push(sx.target) }
  const sy = pick([{ value: y }, { value: y + layer.h / 2 }, { value: y + layer.h }], ys)
  if (sy) { ny = y + sy.shift; guides.h.push(sy.target) }
  return { x: nx, y: ny, guides }
}

// ── Historia (undo / redo) ─────────────────────────────────────
// key: mabadiliko yenye key sawa mfululizo (k.m. slaidi ya ukubwa) yanaunganishwa kuwa hatua moja.
export function createHistory(present, limit = 100) {
  return { past: [], present, future: [], limit, lastKey: null }
}

export function commitHistory(h, next, key = null) {
  if (next === h.present) return h
  const coalesce = key !== null && key === h.lastKey && h.past.length > 0
  const past = coalesce ? h.past : [...h.past, h.present].slice(-h.limit)
  return { ...h, past, present: next, future: [], lastKey: key }
}

export function undoHistory(h) {
  if (!h.past.length) return h
  const prev = h.past[h.past.length - 1]
  return { ...h, past: h.past.slice(0, -1), present: prev, future: [h.present, ...h.future], lastKey: null }
}

export function redoHistory(h) {
  if (!h.future.length) return h
  const [next, ...rest] = h.future
  return { ...h, past: [...h.past, h.present], present: next, future: rest, lastKey: null }
}

export const canUndo = (h) => h.past.length > 0
export const canRedo = (h) => h.future.length > 0

// ── Starter templates (zinabadilisha maudhui; zinathibitishwa na normalize) ──
export const STARTER_TEMPLATES = [
  {
    id: 'bold-title', label: 'Kichwa kikubwa',
    background: { type: 'solid', color: '#0f7a5c' },
    build: (W, H) => [makeText({ name: 'Kichwa', x: W * 0.08, y: H * 0.35, w: W * 0.84, h: H * 0.3, text: 'Kichwa chako kikubwa', fontSize: Math.round(H * 0.09), bold: true, align: 'center', color: DEFAULT_WHITE })],
  },
  {
    id: 'quote', label: 'Nukuu',
    background: { type: 'solid', color: '#fbf4e0' },
    build: (W, H) => [
      makeShape('rect', { name: 'Mstari wa rangi', x: W * 0.1, y: H * 0.28, w: W * 0.08, h: 12, fill: '#9a4a2c', stroke: null, strokeWidth: 0 }),
      makeText({ name: 'Nukuu', x: W * 0.1, y: H * 0.32, w: W * 0.8, h: H * 0.36, text: '"Nukuu yako hapa."', fontSize: Math.round(H * 0.06), italic: true, color: DEFAULT_INK }),
    ],
  },
  {
    id: 'gradient-card', label: 'Gradient',
    background: { type: 'gradient', from: '#18a982', to: '#3b82f6', angle: 135 },
    build: (W, H) => [makeText({ name: 'Kichwa', x: W * 0.08, y: H * 0.4, w: W * 0.84, h: H * 0.2, text: 'Ujumbe mfupi', fontSize: Math.round(H * 0.07), bold: true, align: 'center', color: DEFAULT_WHITE })],
  },
]

export function applyTemplate(doc, templateId) {
  const tpl = STARTER_TEMPLATES.find((t) => t.id === templateId)
  if (!tpl) return doc
  return { ...doc, background: normalizeBackground(tpl.background), layers: tpl.build(doc.width, doc.height) }
}

// ── Jiometri ya kuhariri (inatumika na CanvasStage na tests) ─────
const RAD = Math.PI / 180

/** Pembe (digrii) ya kielekezi `p` kutoka kituo `c`. */
export function angleDeg(c, p) {
  return (Math.atan2(p.y - c.y, p.x - c.x) / RAD)
}

/**
 * Kubadilisha ukubwa kwa kona. `sx,sy` = mwelekeo wa kona (±1). `dx,dy` = mwendo wa kielekezi
 * kwenye turubai (si kwenye umbo lililozungushwa). Kona iliyo kinyume inabaki mahali pake.
 * keepRatio: picha inahifadhi uwiano wake.
 */
export function resizeGeometry(orig, sx, sy, dx, dy, keepRatio = false) {
  const r = (orig.rotation || 0) * RAD
  const cos = Math.cos(r)
  const sin = Math.sin(r)
  // Mwendo wa kielekezi unaletwa kwenye mfumo wa umbo (inverse rotation).
  const lx = dx * cos + dy * sin
  const ly = -dx * sin + dy * cos
  let w = orig.w + sx * lx
  let h = orig.h + sy * ly
  if (keepRatio) {
    const ratio = orig.w / orig.h
    let k = Math.abs(w / orig.w - 1) >= Math.abs(h / orig.h - 1) ? w / orig.w : h / orig.h
    k = Math.max(k, MIN_LAYER_SIZE / orig.w, MIN_LAYER_SIZE / orig.h)
    w = orig.w * k
    h = w / ratio
  }
  w = Math.max(MIN_LAYER_SIZE, w)
  h = Math.max(MIN_LAYER_SIZE, h)
  const dcx = ((w - orig.w) / 2) * sx
  const dcy = ((h - orig.h) / 2) * sy
  const cx = orig.x + orig.w / 2 + (dcx * cos - dcy * sin)
  const cy = orig.y + orig.h / 2 + (dcx * sin + dcy * cos)
  return { x: Math.round(cx - w / 2), y: Math.round(cy - h / 2), w: Math.round(w), h: Math.round(h) }
}

/** Mzunguko mpya: rotation ya awali + tofauti ya pembe, ikirekebishwa kwenye 15° karibu. */
export function rotationFor(origRotation, startAngle, angle, snap = 15, slop = 3) {
  let rot = origRotation + (angle - startAngle)
  rot = ((rot % 360) + 360) % 360
  const snapped = Math.round(rot / snap) * snap
  if (Math.abs(rot - snapped) < slop) rot = snapped % 360
  return Math.round(rot * 10) / 10
}
