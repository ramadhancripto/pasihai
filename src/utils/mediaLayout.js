// ══════════════════════════════════════════════════════════════
// PASIHAI — MEDIA LAYOUT (Home feed)
//
// Kazi: kukokotoa jinsi media inavyoonyeshwa kutoka DATA ILIYOPO —
// si kutoka mawazo. Vyanzo vinavyotumika:
//
//   1. media.width / media.height  (Cloudinary media_meta — vimehifadhiwa
//      kwenye posts.media_meta wakati wa upload; angalia
//      supabaseContentRepository.js → cloudinaryMediaMeta)
//   2. media.ratio                 (media_meta.ratio; fallback '4 / 3')
//   3. media.mediaType             ('image' | 'video')
//
// Fallback ni SALAMA: media bila kipimo chochote inapata 4 / 3.
// Hakuna component mpya ya design inayoanzishwa hapa — hizi ni
// hesabu za mpangilio zinazotumiwa na shell ya chapisho (FeedItem),
// MediaFrame na MediaGallery.
// ══════════════════════════════════════════════════════════════

export const FALLBACK_ASPECT = 4 / 3
export const FALLBACK_RATIO = '4 / 3'

export const ORIENT = {
  LANDSCAPE: 'landscape',
  PORTRAIT: 'portrait',
  SQUARE: 'square',
}

/* ── '16 / 9' | '16:9' | 1.777 → namba (w / h) ─────────────── */
export function parseRatio(value) {
  if (value == null) return null
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null
  }
  const text = String(value).trim()
  if (!text) return null
  if (text.includes('/') || text.includes(':')) {
    const parts = text.split(/[/:]/).map((part) => Number.parseFloat(part.trim()))
    if (parts.length === 2 && parts.every((p) => Number.isFinite(p) && p > 0)) {
      return parts[0] / parts[1]
    }
    return null
  }
  const single = Number.parseFloat(text)
  return Number.isFinite(single) && single > 0 ? single : null
}

/* ── Kipimo cha media kutoka data halisi ───────────────────── */
export function mediaAspect(media) {
  const width = Number(media?.width)
  const height = Number(media?.height)
  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return width / height
  }
  return parseRatio(media?.ratio) ?? FALLBACK_ASPECT
}

/* ── Mwelekeo (orientation) kutoka kipimo ─────────────────── */
export function orientationOf(aspect) {
  if (!Number.isFinite(aspect) || aspect <= 0) return ORIENT.SQUARE
  if (aspect > 1.05) return ORIENT.LANDSCAPE
  if (aspect < 0.95) return ORIENT.PORTRAIT
  return ORIENT.SQUARE
}

export function mediaOrientation(media) {
  return orientationOf(mediaAspect(media))
}

/* ── CSS aspect-ratio string kutoka namba (rahisi kusoma) ─── */
export function aspectToCss(aspect) {
  if (!Number.isFinite(aspect) || aspect <= 0) return FALLBACK_RATIO
  // 3:2, 16:9 n.k. — kama namba haitoi uwiano mzuri, tumia decimals 4
  const ratio = aspect
  const rounded = Number(ratio.toFixed(4))
  return `${rounded} / 1`
}

/* ── Media zote za item (1 au zaidi) ───────────────────────────
   Data ya sasa ina media MOJA kwa post (media_url + media_meta).
   mediaItems inasomwa ikiwa ipo tu — hakuna muundo mpya unaobuniwa. */
export function mediaItemsOf(item) {
  const list = Array.isArray(item?.mediaItems) ? item.mediaItems : null
  if (list?.length) return list.filter(Boolean)
  return item?.media ? [item.media] : []
}

/* ── Grid/carousel inayolingana na idadi halisi ya media ──── */
export function galleryShape(count) {
  if (count <= 1) return 'single'
  if (count === 2) return 'duo'
  if (count === 3) return 'trio'
  if (count === 4) return 'quad'
  return 'carousel'
}

/* ── Aina ya chapisho kwa mpangilio (data-attribute) ──────── */
export function postTypeOf(item) {
  const kind = item?.kind
  if (kind === 'image' || kind === 'video') return kind
  if (kind === 'reel') return 'reel'
  if (kind === 'poll' || kind === 'announcement' || kind === 'audio' || kind === 'liveActivity') {
    return kind
  }
  return 'text'
}

/* ── Je, chapisho lina media inayoonekana? ───────────────────
   Reel ni VIDEO — inaonyeshwa kwa ukubwa sawa na video zingine
   (si kadi ndogo), iwe ina faili (media.url) au la. */
export function hasPlayableMedia(item) {
  const media = item?.media
  if (item?.kind === 'reel') return true
  if (!media) return item?.kind === 'image' || item?.kind === 'video'
  if (item.kind === 'audio' || item.kind === 'poll' || item.kind === 'announcement') return false
  if (item.kind === 'liveActivity') return false
  return true
}

/* ── Urefu wa maelezo: mpangilio wa desktop unategemea hii ───
   Maelezo mafupi → media ina nafasi kubwa (safu moja).
   Maelezo marefu  → media na maelezo zinatengana (safu mbili). */
export const CAPTION_LONG_AT = 200

export function captionLengthOf(item) {
  const text = typeof item?.text === 'string' ? item.text.trim() : ''
  return text.length >= CAPTION_LONG_AT ? 'long' : text.length > 0 ? 'short' : 'none'
}

/* ── Muhtasari mmoja wa mpangilio wa item (unatumiwa na UI) ── */
export function layoutFor(item) {
  const items = mediaItemsOf(item)
  const media = items[0] || null
  const aspect = mediaAspect(media)
  return {
    postType: postTypeOf(item),
    orientation: orientationOf(aspect),
    aspect,
    aspectCss: media?.ratio || aspectToCss(aspect),
    aspectNumber: Number(aspect.toFixed(4)),
    mediaCount: items.length,
    galleryShape: galleryShape(items.length),
    hasMedia: hasPlayableMedia(item),
    mediaType: media?.mediaType || (item?.kind === 'video' || item?.kind === 'reel' ? 'video' : 'image'),
    captionLength: captionLengthOf(item),
  }
}

export default layoutFor
