// ══════════════════════════════════════════════════════════════
// PASIHAI — Post content model (pure, bila imports)
//
// Content = data inayoweza kuhaririwa (aina, sehemu, muundo wa maandishi).
// Template = maelekezo ya kuonyesha (layout + ruhusa za customize).
// Hakuna HTML/JS/CSS ya mtumiaji: ukubwa, rangi na mpangilio vinatoka
// kwenye allowlist hapa chini tu.
//
// Uhifadhi: aina za text/video/reel/poll zinabaki maandishi ya kawaida
// (hakuna mabadiliko ya backend). Aina zenye muundo (article, announcement,
// quote, poster) zinahifadhiwa kama envelope ya JSON yenye marker, kwenye
// safu ile ile ya `text`. Envelope inatambulika tu ikiwa marker ipo.
// ══════════════════════════════════════════════════════════════

export const CONTENT_MARKER = '[[pasihai:post:v1]]'
export const MAX_HEADING = 120
export const MAX_BODY = 5000
export const MAX_CONCLUSION = 1000
export const MAX_ATTRIBUTION = 120
export const MAX_OPTIONS = 4
export const MAX_OPTION_LEN = 80

/** Aina za chapisho: `kind` ni aina ya backend iliyopo (createPost). */
export const POST_TYPES = {
  text: { label: 'Chapisho', kind: 'text', media: null, fields: ['body'] },
  article: { label: 'Makala', kind: 'text', media: null, fields: ['heading', 'body', 'conclusion'] },
  announcement: { label: 'Tangazo', kind: 'text', media: null, fields: ['heading', 'body'] },
  poll: { label: 'Kura', kind: 'poll', media: null, fields: ['body', 'options'] },
  video: { label: 'Video', kind: 'video', media: 'video', fields: ['body'] },
  quote: { label: 'Nukuu', kind: 'text', media: null, fields: ['body', 'attribution'] },
  poster: { label: 'Poster ya picha', kind: 'photo', media: 'image', fields: ['heading', 'body'] },
  reel: { label: 'Reel', kind: 'reel', media: 'video', fields: ['body'] },
}

/** Templates: mwonekano uliotengenezwa tayari. `types` ni aina zinazoungwa mkono. */
export const TEMPLATES = {
  simple: { id: 'simple', version: 1, label: 'Simple', layout: 'plain', types: ['text', 'video', 'reel'] },
  article: { id: 'article', version: 1, label: 'Makala', layout: 'article', types: ['article'] },
  announcement: { id: 'announcement', version: 1, label: 'Tangazo', layout: 'emphasis', types: ['announcement'] },
  quote: { id: 'quote', version: 1, label: 'Nukuu', layout: 'quote', types: ['quote'] },
  media: { id: 'media', version: 1, label: 'Media', layout: 'media', types: ['poster', 'video', 'reel'] },
  poll: { id: 'poll', version: 1, label: 'Kura', layout: 'poll', types: ['poll'] },
}

export const DEFAULT_TEMPLATE = {
  text: 'simple',
  article: 'article',
  announcement: 'announcement',
  quote: 'quote',
  poster: 'media',
  video: 'media',
  reel: 'media',
  poll: 'poll',
}

/** Ukubwa wa maandishi: jina → px (inatumika kwenye preview na feed). */
export const SIZE_PX = { sm: 14, md: 16, lg: 20, xl: 28 }
export const SIZE_LABEL = { sm: 'Ndogo', md: 'Kati', lg: 'Kubwa', xl: 'Kubwa sana' }
export const HEADING_SIZES = ['md', 'lg', 'xl']
export const BODY_SIZES = ['sm', 'md', 'lg']
export const CONCLUSION_SIZES = ['sm', 'md', 'lg']

/** Palette salama: rangi za maandishi. Kila moja inapaswa kusomeka kwenye background za BACKGROUNDS. */
export const PALETTE = {
  ink: { label: 'Nyeusi', hex: '#1b1f1d' },
  green: { label: 'Kijani', hex: '#0f7a5c' },
  blue: { label: 'Bluu', hex: '#1f5fc2' },
  plum: { label: 'Zambarau', hex: '#6b2c6e' },
  clay: { label: 'Udongo', hex: '#9a4a2c' },
  slate: { label: 'Kijivu', hex: '#3e4a46' },
}

/** Backgrounds salama (hex tu). `none` = hakuna background. */
export const BACKGROUNDS = {
  none: { label: 'Hakuna', hex: null },
  mint: { label: 'Mint', hex: '#e7f7f1' },
  sky: { label: 'Bluu nyepesi', hex: '#e9f0fd' },
  cream: { label: 'Krimu', hex: '#fbf4e0' },
}

export const ALIGNS = ['left', 'center']

const PLAIN_TYPES = new Set(['text', 'video', 'reel', 'poll'])

function clean(value, max) {
  return String(value ?? '')
    // Ondoa control characters (isipokuwa newline/tab), kisha punguza urefu.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .slice(0, max)
}

function pick(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback
}

function pickColor(value, fallback = 'ink') {
  return Object.prototype.hasOwnProperty.call(PALETTE, value) ? value : fallback
}

function pickBackground(value) {
  return Object.prototype.hasOwnProperty.call(BACKGROUNDS, value) ? value : 'none'
}

/** Content mpya tupu kwa aina na template (template ya chaguo-msingi ikiwa haijapewa). */
export function createContent(type = 'text', templateId = null) {
  const safeType = POST_TYPES[type] ? type : 'text'
  const tpl = templateId && TEMPLATES[templateId]?.types.includes(safeType)
    ? templateId
    : DEFAULT_TEMPLATE[safeType]
  return {
    type: safeType,
    template: { id: tpl, version: TEMPLATES[tpl].version },
    heading: { text: '', size: 'lg', color: 'ink' },
    body: { text: '', size: 'md', align: 'left' },
    conclusion: { text: '', size: 'md', color: 'ink' },
    attribution: '',
    options: ['', ''],
    background: 'none',
    mediaType: null,
  }
}

/** Inasafisha content yoyote (kutoka kwa mtumiaji au storage) kuwa umbo halali. */
export function sanitizeContent(raw = {}) {
  const base = createContent(raw.type, raw.template?.id)
  const options = Array.isArray(raw.options)
    ? raw.options.slice(0, MAX_OPTIONS).map((o) => clean(o, MAX_OPTION_LEN))
    : base.options
  return {
    ...base,
    heading: {
      text: clean(raw.heading?.text, MAX_HEADING),
      size: pick(raw.heading?.size, HEADING_SIZES, base.heading.size),
      color: pickColor(raw.heading?.color, base.heading.color),
    },
    body: {
      text: clean(raw.body?.text, MAX_BODY),
      size: pick(raw.body?.size, BODY_SIZES, base.body.size),
      align: pick(raw.body?.align, ALIGNS, base.body.align),
    },
    conclusion: {
      text: clean(raw.conclusion?.text, MAX_CONCLUSION),
      size: pick(raw.conclusion?.size, CONCLUSION_SIZES, base.conclusion.size),
      color: pickColor(raw.conclusion?.color, base.conclusion.color),
    },
    attribution: clean(raw.attribution, MAX_ATTRIBUTION),
    options,
    background: pickBackground(raw.background),
  }
}

/** Thibitisha content kabla ya publish/draft. Inarudisha { ok, errors }. */
export function validateContent(content) {
  const errors = []
  const c = sanitizeContent(content)
  if (!TEMPLATES[c.template.id]?.types.includes(c.type)) {
    errors.push('Template haiendani na aina ya chapisho.')
  }
  if (c.type === 'article') {
    if (!c.heading.text.trim()) errors.push('Makala inahitaji kichwa.')
    if (!c.body.text.trim()) errors.push('Makala inahitaji maudhui ya body.')
  } else if (c.type === 'announcement') {
    if (!c.heading.text.trim()) errors.push('Tangazo linahitaji kichwa.')
  } else if (c.type === 'poll') {
    if (!c.body.text.trim()) errors.push('Kura inahitaji swali.')
    const filled = c.options.map((o) => o.trim()).filter(Boolean)
    if (filled.length < 2) errors.push('Kura inahitaji chaguo angalau mbili.')
    if (new Set(filled).size !== filled.length) errors.push('Chaguo za kura zisirudiane.')
  } else if (c.type === 'quote') {
    if (!c.body.text.trim()) errors.push('Nukuu inahitaji maandishi.')
  } else if (c.type === 'text' && !c.body.text.trim()) {
    // video/reel/poster: maandishi si lazima; media inakaguliwa kwenye studio.
    errors.push('Andika kitu kabla ya kuchapisha.')
  }
  return { ok: errors.length === 0, errors }
}

/** Maandishi yatakayohifadhiwa kwenye safu ya `text`. */
export function serializeContent(raw) {
  const c = sanitizeContent(raw)
  if (PLAIN_TYPES.has(c.type)) return c.body.text // poll: swali ndilo maandishi
  return CONTENT_MARKER + JSON.stringify({
    v: 1,
    type: c.type,
    template: c.template,
    heading: c.heading,
    body: c.body,
    conclusion: c.conclusion,
    attribution: c.attribution,
    background: c.background,
  })
}

/** Inarudisha content ikiwa `text` ni envelope halali, vinginevyo null. */
export function parseContent(text) {
  if (typeof text !== 'string' || !text.startsWith(CONTENT_MARKER)) return null
  try {
    const data = JSON.parse(text.slice(CONTENT_MARKER.length))
    if (!data || typeof data !== 'object' || !POST_TYPES[data.type]) return null
    return sanitizeContent({ ...data, options: [] })
  } catch {
    return null
  }
}

/** Maandishi matupu (bila muundo) kwa sehemu zisizo na renderer, k.m. maoni na arifa. */
export function plainText(text) {
  const structured = parseContent(text)
  if (!structured) return typeof text === 'string' ? text : ''
  return [structured.heading.text, structured.body.text, structured.conclusion.text]
    .filter((part) => part && part.trim())
    .join('\n\n')
}

/**
 * Kubadilisha aina bila kufuta content kimyakimya.
 * Ikiwa sehemu zenye maudhui hazitumiki kwenye aina mpya, inarudisha
 * `needsConfirm: true` na orodha ya sehemu zitakazopotea; caller aombe uthibitisho.
 */
export function changeType(content, nextType, { confirmed = false } = {}) {
  const current = sanitizeContent(content)
  if (!POST_TYPES[nextType]) return { content: current, needsConfirm: false, dropped: [] }
  const supported = new Set(POST_TYPES[nextType].fields)
  const dropped = []
  if (!supported.has('heading') && current.heading.text) dropped.push('kichwa')
  if (!supported.has('conclusion') && current.conclusion.text) dropped.push('hitimisho')
  if (!supported.has('attribution') && current.attribution) dropped.push('chanzo')
  if (!supported.has('options') && current.options.some((o) => o.trim())) dropped.push('chaguo za kura')
  if (dropped.length && !confirmed) {
    return { content: current, needsConfirm: true, dropped }
  }
  return {
    content: sanitizeContent({ ...current, type: nextType, template: { id: DEFAULT_TEMPLATE[nextType] } }),
    needsConfirm: false,
    dropped,
  }
}

/** Templates zinazoungwa mkono kwa aina fulani. */
export function templatesFor(type) {
  return Object.values(TEMPLATES).filter((t) => t.types.includes(type))
}
