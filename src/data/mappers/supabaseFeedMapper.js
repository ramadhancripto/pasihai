// ══════════════════════════════════════════════════════════════
// PASIHAI — SUPABASE FEED MAPPER
//
// Kazi: kubadilisha Supabase rows (posts · reels · live_sessions) kuwa
// FEED ITEM — muundo mmoja unaoeleweka na UI.
//
// Inalingana na: feedMapper.js (mock version)
// Chanzo: Supabase tables (posts, live_sessions)
//
// MUUNDO WA SUPABASE POST ROW:
//   id, author_id, kind, text, media_url, media_meta, poll_question,
//   highlights, cta, label, live_session_id, visibility,
//   reactions_count, comments_count, shares_count,
//   created_at, updated_at, deleted_at
//
// MUUNDO WA FEED ITEM (sawa na feedMapper.js):
//   id, kind, userId, relationship, ageMinutes, text, label, media,
//   poll, live, highlights, cta, source, filters, stats, visibility
// ══════════════════════════════════════════════════════════════

/* ── Aina za content zinazotumika kwenye filter ───────────── */
const FILTERS_BY_KIND = {
  text: ['posts'],
  image: ['picha', 'posts'],
  video: ['video', 'posts'],
  audio: ['audio'],
  poll: ['polls', 'posts'],
  announcement: ['announcements', 'posts'],
  liveActivity: ['live'],
  reel: ['reels', 'video'],
  product: ['picha', 'posts'],
  event: ['picha', 'posts'],
}

/* ── Hesabu ageMinutes kutoka created_at ──────────────────── */
function ageMinutesFrom(createdAt) {
  if (!createdAt) return 0
  const then = new Date(createdAt).getTime()
  const now = Date.now()
  return Math.max(0, Math.floor((now - then) / 60000))
}

/* ── Supabase post row → feed item ────────────────────────── */
export function mapSupabasePost(row) {
  if (!row) return null

  const isProduct = row.kind === 'product'
  const isEvent = row.kind === 'event'
  const kind = isProduct || isEvent ? 'image' : row.kind

  // Media kutoka media_url + media_meta
  const media = row.media_url
    ? {
        url: row.media_url,
        ...(row.media_meta || {}),
        tone: row.media_meta?.tone || 'green',
        ratio: row.media_meta?.ratio || '4 / 3',
        caption: row.text || '',
      }
    : undefined

  // Poll kutoka poll_question
  const poll = row.poll_question
    ? {
        question: row.poll_question,
        options: (row.media_meta?.pollOptions || []).map((label, i) => ({
          id: `o${i + 1}`,
          label,
          votes: 0,
        })),
        total: 0,
      }
    : undefined

  return {
    id: row.id,
    kind,
    sourceKind: row.kind ?? 'text',
    userId: row.author_id,
    relationship: null, // Itaunganishwa na identityRepository
    ageMinutes: ageMinutesFrom(row.created_at),
    text: row.text ?? '',
    label: row.label ?? (isProduct ? 'Bidhaa' : isEvent ? 'Tukio' : undefined),
    media,
    poll,
    live: undefined, // Live sessions zina table tofauti
    highlights: row.highlights,
    cta: row.cta,
    source: row.kind === 'reel' ? 'reel' : 'post',
    filters: FILTERS_BY_KIND[row.kind] ?? FILTERS_BY_KIND[kind] ?? [],
    stats: {
      reactions: row.reactions_count ?? 0,
      comments: row.comments_count ?? 0,
      shares: row.shares_count ?? 0,
    },
    visibility: row.visibility ?? 'public',
  }
}

/* ── Supabase live_session row → feed item ────────────────── */
export function mapSupabaseLiveSession(row) {
  if (!row) return null

  return {
    id: `live-${row.id}`,
    kind: 'liveActivity',
    userId: row.host_id,
    relationship: null,
    ageMinutes: ageMinutesFrom(row.started_at || row.created_at),
    text: '',
    live: {
      state: row.state ?? 'live',
      mode: row.mode ?? 'Video',
      title: row.title ?? '',
      host: row.host_name ?? '',
      viewers: row.viewers_count ?? 0,
      when: row.scheduled_at ? new Date(row.scheduled_at).toLocaleString() : 'Sasa',
      since: row.started_at ? new Date(row.started_at).toLocaleTimeString() : undefined,
      category: row.category ?? 'General',
      speakers: row.speaker_ids ?? [],
      waveform: row.waveform ?? undefined,
    },
    source: 'liveSession',
    visibility: row.visibility ?? 'public',
    filters: ['live'],
    stats: { reactions: 0, comments: 0 },
  }
}

/* ── Supabase rows → feed items (zote pamoja) ─────────────── */
export function mapSupabaseFeed({ posts = [], liveSessions = [] }) {
  return [
    ...posts.map(mapSupabasePost).filter(Boolean),
    ...liveSessions.map(mapSupabaseLiveSession).filter(Boolean),
  ]
}
