// ══════════════════════════════════════════════════════════════
// Mapendeleo ya library ya zana: hali ya Rahisi/Kina, zilizotumika hivi karibuni,
// zilizobandikwa, na vikundi vilivyokunjwa. Vinahifadhiwa kwenye kifaa tu (localStorage).
// Kusoma ni salama: data iliyoharibika au id zisizojulikana zinaondolewa.
// ══════════════════════════════════════════════════════════════
import { TOOLS, GROUPS } from './toolRegistry.js'

export const PREFS_KEY = 'pasihai.creative.tools.v1'
export const RECENT_MAX = 6
export const PINNED_MAX = 12
export const MODES = ['basic', 'advanced']

export const DEFAULT_PREFS = Object.freeze({ mode: 'basic', recent: [], pinned: [], collapsed: [] })

const KNOWN_TOOLS = new Set(TOOLS.map((t) => t.id))
const KNOWN_GROUPS = new Set(GROUPS.map((g) => g.id))
const uniq = (arr) => [...new Set(arr)]

/** Inasafisha kitu chochote kilichosomwa kutoka hifadhini. */
export function sanitizePrefs(raw) {
  const p = raw && typeof raw === 'object' ? raw : {}
  const list = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [])
  return {
    mode: MODES.includes(p.mode) ? p.mode : DEFAULT_PREFS.mode,
    recent: uniq(list(p.recent).filter((id) => KNOWN_TOOLS.has(id))).slice(0, RECENT_MAX),
    pinned: uniq(list(p.pinned).filter((id) => KNOWN_TOOLS.has(id))).slice(0, PINNED_MAX),
    collapsed: uniq(list(p.collapsed).filter((g) => KNOWN_GROUPS.has(g))),
  }
}

export function loadToolPrefs(store = globalThis.localStorage) {
  try {
    const raw = store?.getItem(PREFS_KEY)
    return raw ? sanitizePrefs(JSON.parse(raw)) : { ...DEFAULT_PREFS }
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

/** Inarudisha true kama imehifadhiwa; false kama kifaa kimejaa au hakiruhusu. */
export function saveToolPrefs(prefs, store = globalThis.localStorage) {
  try {
    store?.setItem(PREFS_KEY, JSON.stringify(sanitizePrefs(prefs)))
    return true
  } catch {
    return false
  }
}

export function pushRecent(prefs, id) {
  if (!KNOWN_TOOLS.has(id)) return prefs
  return { ...prefs, recent: [id, ...prefs.recent.filter((x) => x !== id)].slice(0, RECENT_MAX) }
}

export function togglePinned(prefs, id) {
  if (!KNOWN_TOOLS.has(id)) return prefs
  const has = prefs.pinned.includes(id)
  if (has) return { ...prefs, pinned: prefs.pinned.filter((x) => x !== id) }
  if (prefs.pinned.length >= PINNED_MAX) return prefs
  return { ...prefs, pinned: [...prefs.pinned, id] }
}

export function toggleGroup(prefs, groupId) {
  if (!KNOWN_GROUPS.has(groupId)) return prefs
  const has = prefs.collapsed.includes(groupId)
  return { ...prefs, collapsed: has ? prefs.collapsed.filter((g) => g !== groupId) : [...prefs.collapsed, groupId] }
}

export function setMode(prefs, mode) {
  return MODES.includes(mode) ? { ...prefs, mode } : prefs
}
