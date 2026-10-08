// ══════════════════════════════════════════════════════════════
// PASIHAI — FORMAT (zana za kuonyesha)
// ══════════════════════════════════════════════════════════════

/** MB → "184 MB" au "1.0 GB" (vitengo vinavyosomeka). */
export function formatMb(mb) {
  if (!Number.isFinite(mb)) return ''
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
  return `${Math.round(mb)} MB`
}

/** Idadi kwa muonekano mfupi: 420 · 1.2K · 286K · 1.5M */
export function formatCount(n) {
  const v = Number(n) || 0
  if (v >= 1000000) return `${(v / 1000000).toFixed(v % 1000000 === 0 ? 0 : 1)}M`
  if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}K`
  return String(v)
}
