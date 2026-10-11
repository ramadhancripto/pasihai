// Mitindo ya rangi inayoweza kutumika tena (kundi G). Mtindo ni seti ya rangi za kitu kimoja, zenye jina.
// Unahifadhiwa kwenye kifaa hiki tu (kama rangi zilizohifadhiwa), si kwenye mradi. Kazi zote hapa ni safi
// isipokuwa loadStyles/saveStyles, ambazo zinapokea storage kama parameta ili zijaribiwe kwa node.
import { DEFAULT_INK, normalizeHex } from './creativeModel.js'

export const STYLE_KEY = 'pasihai.creative.styles.v1'
export const STYLE_MAX = 24

// Sehemu za rangi ambazo mtindo unaweza kubeba, kwa kila aina ya kitu.
// Maandishi: rangi ya maandishi na mandhari nyuma yake. Umbo: ndani (fill) na mpaka (stroke).
// Picha haina sehemu hizi, kwa hiyo haina mitindo ya rangi.
const COLOR_FIELDS = {
  text: ['color', 'bgColor'],
  shape: ['fill', 'stroke'],
}

// Thamani ya kuweka wakati mtindo unaondolewa. Maandishi yanarudi wino wa chaguo-msingi, na nyingine hazina rangi.
const RESET_VALUE = { color: DEFAULT_INK, bgColor: null, fill: null, stroke: null }

function safeStorage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

export function fieldsFor(layer) {
  return layer ? COLOR_FIELDS[layer.type] ?? [] : []
}

// Inasafisha mtindo mmoja; inakataa chochote kisicho halali.
function cleanStyle(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = typeof raw.id === 'string' && raw.id ? raw.id : null
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, 40) : ''
  if (!id || !name || !raw.colors || typeof raw.colors !== 'object') return null
  const colors = {}
  for (const key of ['color', 'bgColor', 'fill', 'stroke']) {
    if (!(key in raw.colors)) continue
    const v = raw.colors[key]
    colors[key] = v === null ? null : normalizeHex(v, null)
    if (v !== null && colors[key] === null) return null
  }
  if (Object.keys(colors).length === 0) return null
  return { id, name, colors }
}

export function loadStyles(storage = safeStorage()) {
  try {
    const raw = storage?.getItem(STYLE_KEY)
    const list = raw ? JSON.parse(raw) : []
    if (!Array.isArray(list)) return []
    const out = []
    for (const item of list) {
      const s = cleanStyle(item)
      if (s && !out.some((x) => x.id === s.id)) out.push(s)
      if (out.length >= STYLE_MAX) break
    }
    return out
  } catch {
    return []
  }
}

export function saveStyles(styles, storage = safeStorage()) {
  try {
    storage?.setItem(STYLE_KEY, JSON.stringify(styles.slice(0, STYLE_MAX)))
    return true
  } catch {
    return false // kifaa kimejaa: mtindo hauhifadhiwi, na kitu kingine hakiathiriki
  }
}

// Inachukua rangi za kitu kilichochaguliwa. Rudisha null kama kitu hakina rangi za kuhifadhi.
export function createStyle(name, layer, makeId = () => `st-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`) {
  const fields = fieldsFor(layer)
  if (!fields.length) return null
  const colors = {}
  for (const key of fields) {
    const v = layer[key]
    colors[key] = v === null || v === undefined ? null : normalizeHex(v, null)
  }
  const cleanName = (typeof name === 'string' ? name.trim() : '').slice(0, 40)
  return { id: makeId(), name: cleanName || 'Mtindo', colors }
}

// Mtindo unafaa kitu hiki ikiwa una angalau sehemu moja ya kitu hicho.
export function styleApplies(style, layer) {
  return fieldsFor(layer).some((k) => k in style.colors)
}

// Patch ya kutumia mtindo: sehemu zinazofaa tu.
export function stylePatch(style, layer) {
  const patch = {}
  for (const key of fieldsFor(layer)) {
    if (key in style.colors) patch[key] = style.colors[key]
  }
  return Object.keys(patch).length ? patch : null
}

// Patch ya kuondoa mtindo: rudisha sehemu ambazo mtindo ulizigusa, kwa thamani ya chaguo-msingi.
export function removePatch(style, layer) {
  const patch = {}
  for (const key of fieldsFor(layer)) {
    if (key in style.colors) patch[key] = RESET_VALUE[key]
  }
  return Object.keys(patch).length ? patch : null
}

export function addStyle(styles, style) {
  return [style, ...styles.filter((s) => s.id !== style.id)].slice(0, STYLE_MAX)
}

export function deleteStyle(styles, id) {
  return styles.filter((s) => s.id !== id)
}
