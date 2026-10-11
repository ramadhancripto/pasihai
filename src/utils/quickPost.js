// ══════════════════════════════════════════════════════════════
// PASIHAI — Quick Post helpers (pure, bila imports)
//
// Inatumiwa na quick area ya Home (CreateArea). Hakuna I/O hapa:
// publish halisi inafanyika kwenye feedService.createPost, na
// hapa tunatafsiri tu jibu lake kuwa hali ya UI.
// ══════════════════════════════════════════════════════════════

const TAG_RE = /^[\p{L}\p{N}_]{1,30}$/u
const HANDLE_RE = /^@[A-Za-z0-9_.]{1,30}$/

/** Tag safi bila `#` inayoongoza, au null kama ni batili. */
export function normalizeTag(raw) {
  const tag = String(raw ?? '').trim().replace(/^#+/, '')
  return TAG_RE.test(tag) ? tag : null
}

/** Handle safi lenye `@`, au null kama ni batili. */
export function normalizeHandle(raw) {
  const value = String(raw ?? '').trim()
  const withAt = value.startsWith('@') ? value : `@${value}`
  return HANDLE_RE.test(withAt) ? withAt : null
}

/**
 * Inaingiza `insert` kwenye `text` mahali pa selection (start..end).
 * Inarudisha text mpya na nafasi ya cursor baada ya kuingiza.
 */
export function insertAtRange(text, start, end, insert) {
  const value = String(text ?? '')
  const s = Math.max(0, Math.min(Number(start) || 0, value.length))
  const e = Math.max(s, Math.min(Number(end) || 0, value.length))
  const next = value.slice(0, s) + insert + value.slice(e)
  return { text: next, caret: s + insert.length }
}

/**
 * Hali halisi ya publish kutoka kwenye jibu la createPost.
 *  - 'failed'    : hakuna post id → hakuna "imehifadhiwa".
 *  - 'pending'   : id ya muda (`temp-…`) → imehifadhiwa kwenye kifaa, bado haijafika backend.
 *  - 'local'     : mock/demo mode (si Supabase live) → kikao tu, si backend.
 *  - 'published' : id halisi kutoka backend.
 */
export function publishOutcome(post, { live = false } = {}) {
  const id = post?.id
  if (!id || typeof id !== 'string') return { status: 'failed', id: null }
  if (id.startsWith('temp-')) return { status: 'pending', id }
  if (!live) return { status: 'local', id }
  return { status: 'published', id }
}

/** Ujumbe wa Kiswahili kwa kila hali ya publish. */
export function publishMessage(outcome) {
  switch (outcome?.status) {
    case 'published':
      return 'Imechapishwa.'
    case 'pending':
      return 'Imehifadhiwa kwenye kifaa tu. Itatumwa mtandao utakaporudi — bado haijachapishwa.'
    case 'local':
      return 'Imehifadhiwa kwenye kikao cha demo tu (hakuna backend ya live).'
    default:
      return 'Chapisho halijahifadhiwa: mfumo haukurudisha kitambulisho cha post.'
  }
}

/** Ukubwa wa faili unaosomeka kwa binadamu. */
export function formatMediaSize(bytes) {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n < 0) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
