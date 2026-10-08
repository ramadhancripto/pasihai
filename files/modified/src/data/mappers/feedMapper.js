// ══════════════════════════════════════════════════════════════
// PASIHAI — FEED MAPPER
//
// Kazi: kubadilisha data ya demo (posts · reels · liveSessions) kuwa
// FEED ITEM — muundo mmoja unaoeleweka, ambao UI inaweza ku-render bila
// kujua chanzo kilikuwa nini.
//
// Kanuni: hapa hakuna dhana ya visibility/permission/relationship model.
// Tunatengeneza PRESENTATION foundation pekee. Model kamili ya Identity /
// Entity / Relationship / Role / Visibility / Permission inasubiri ADW-02.
//
// MUUNDO WA FEED ITEM:
//   id            — kitambulisho cha kipekee
//   kind          — text | image | video | audio | poll | announcement | liveActivity | reel
//   userId        — entity iliyochapisha (inaunganishwa na entity kwa service)
//   relationship  — 'Rafiki' | 'Channel' | ...  (hiari: data ya mock inaweza kuwa nayo)
//   ageMinutes    — namba (kwa mpangilio)
//   text          — maandishi (inaweza kuwa tupu)
//   label         — chip ya hiari ('Tangazo', 'Bidhaa', 'Tukio', 'Toleo jipya')
//   media         — { tone, ratio, caption, duration, views } (hiari)
//   poll          — { question, options[], total, myVote } (hiari)
//   live          — { state, mode, title, host, viewers, when, category } (hiari)
//   source        — 'post' | 'reel' | 'liveSession' (chanzo halisi)
//   filters[]     — kichujio cha maudhui (Zote · Video · Picha · ...)
//
// KUMBUKA: HOME TAB membership (Mchanganyiko/Reels/Friends/Channels/Live)
// HAIANDIKWI kwi item — inahesabiwa kwa SHERIA kwenye feedService
// (mfano: Friends = content kutoka entity ya aina 'friend'). Hivyo tuna
// chanzo kimoja cha ukweli, si hand-tags zinazoweza kupingana.
//   stats         — { reactions, comments }  (engagement summary)
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
}

/* ── Post → feed item ─────────────────────────────────────── */
// p8 (product) na p12 (event) ni aina za media zenye label; zinatumia
// body ya picha + chip ya label — bila component mpya.
function mapPost(post) {
  const isProduct = post.kind === 'product'
  const isEvent = post.kind === 'event'

  const kind = isProduct || isEvent ? 'image' : post.kind

  return {
    id: post.id,
    kind,
    /* Aina ya awali kabla ya kuunganisha na body ('event' → 'image').
       Kichujio cha Matukio kinatumia hii, si label ya UI. */
    sourceKind: post.kind ?? 'text',
    userId: post.userId,
    relationship: post.relationship,
    ageMinutes: post.ageMinutes,
    text: post.text ?? '',
    label: post.label ?? (isProduct ? 'Bidhaa' : isEvent ? 'Tukio' : undefined),
    media: post.media,
    poll: post.poll,
    live: post.liveInfo
      ? {
          state: post.liveInfo.state,
          mode: post.liveInfo.mode,
          title: post.text,
          host: post.liveInfo.host,
          viewers: post.liveInfo.listeners,
          when: post.liveInfo.when,
        }
      : undefined,
    highlights: post.highlights,
    cta: post.cta,
    source: 'post',
    filters: post.filterTypes ?? FILTERS_BY_KIND[kind] ?? [],
    stats: { reactions: post.reactions ?? 0, comments: post.comments ?? 0, shares: post.shares ?? 0 },
  }
}

/* ── Reel → feed item ─────────────────────────────────────── */
// Kwenye Mchanganyiko, reel inaonekana kama kadi ya COMPACT (portrait ndogo),
// si uzoefu wa immersive — hiyo ni Phase 2B.
function mapReel(reel) {
  return {
    id: `reel-${reel.id}`,
    kind: 'reel',
    userId: reel.userId,
    relationship: reel.relationship,
    ageMinutes: reel.ageMinutes,
    text: reel.caption ?? '',
    media: { tone: reel.tone, ratio: '4 / 5', duration: reel.duration, views: reel.views },
    source: 'reel',
    filters: FILTERS_BY_KIND.reel,
    stats: { reactions: reel.reactions ?? 0, comments: reel.comments ?? 0 },
  }
}

/* ── Live session → feed item ─────────────────────────────── */
// Live session inaonekana kwenye tab ya Live pekee (Mchanganyiko una
// Live Activity kupitia posts). Uzoefu kamili wa Live ni Phase 2E.
function mapLiveSession(session) {
  return {
    id: `live-${session.id}`,
    kind: 'liveActivity',
    userId: session.userId,
    relationship: session.relationship,
    ageMinutes: session.ageMinutes,
    text: '',
    live: {
      state: session.state,
      mode: session.mode,
      title: session.title,
      host: session.host,
      viewers: session.viewers,
      when: session.when,
      since: session.since,
      category: session.category,
      speakers: session.speakers,
      waveform: session.waveform,
    },
    source: 'liveSession',
    filters: ['live'],
    stats: { reactions: 0, comments: 0 },
  }
}

/* ── Zote pamoja ───────────────────────────────────────────── */
export function mapFeed({ posts = [], reels = [], liveSessions = [] }) {
  return [
    ...posts.map(mapPost),
    ...reels.map(mapReel),
    ...liveSessions.map(mapLiveSession),
  ]
}
