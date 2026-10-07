// ══════════════════════════════════════════════════════════════
// PASIHAI — APPLICATION SERVICE: HOME FEED
//
//   getFeed({ tab, filter }) → { items, total, shown, tab, filter }
//
// Kazi za application layer hapa:
//   1. Kuchagua items kwa Home tab + kichujio cha maudhui
//   2. Kuunganisha kila item na entity yake (identity repository)
//   3. Mpangilio wa DETERMINISTIC (mock relevance) — si ML, si analytics
//
// MUHIMU: hakuna behavior tracking, hakuna analytics, hakuna recommendation
// engine halisi. Mpangilio ni formula iliyoandikwa wazi hapa chini, ili UI
// iweze kuonyesha concept ya "Mchanganyiko".
// ══════════════════════════════════════════════════════════════

import {
  contentRepository,
  identityRepository,
  catalogRepository,
} from '../data/repositories/index.js'

/* ── Uzito wa uhusiano (deterministic mock relevance) ─────── */
const RELATIONSHIP_WEIGHT = {
  friend: 50,
  hub: 40,
  channel: 35,
  creator: 30,
  business: 25,
}

/* ── Uzito wa aina ya content ─────────────────────────────── */
const TYPE_WEIGHT = {
  liveActivity: 10,
  poll: 8,
  announcement: 6,
  reel: 4,
  video: 3,
  image: 2,
  audio: 2,
  text: 0,
}

/* ── Hali ya Live (kwa tab ya Live) ───────────────────────── */
const LIVE_STATE_WEIGHT = { live: 40, upcoming: 20, replay: 5 }

function scoreOf(item, entity) {
  const rel = RELATIONSHIP_WEIGHT[entity?.type] ?? 0
  const recency = Math.max(0, Math.min(30, 30 - Math.floor((item.ageMinutes ?? 0) / 60)))
  const type = TYPE_WEIGHT[item.kind] ?? 0
  const live = item.live ? (LIVE_STATE_WEIGHT[item.live.state] ?? 0) : 0
  return rel + recency + type + live
}

/* ── Kanuni za Home tab (deterministic, chanzo kimoja cha ukweli) ──
   Mchanganyiko : kila kitu (isipokuwa vikao vya Live — hivyo vina tab yao)
   Reels        : content yenye source 'reel'
   Friends      : content kutoka entity ya aina 'friend'  (marafiki ni wa kwanza)
   Channels     : content kutoka entity ya aina 'channel'
   Live         : vikao vya Live (live sessions)
   ─────────────────────────────────────────────────────────── */
const TAB_RULES = {
  mchanganyiko: (item) => item.source !== 'liveSession',
  reels: (item) => item.source === 'reel',
  friends: (item) => item.source !== 'liveSession' && item.entity?.type === 'friend',
  channels: (item) => item.source !== 'liveSession' && item.entity?.type === 'channel',
  live: (item) => item.source === 'liveSession',
}

/* ── Mpangilio ────────────────────────────────────────────── */
function orderBy(items, entities) {
  return items
    .map((item) => ({ ...item, _score: scoreOf(item, item.entity) }))
    .sort(
      (a, b) =>
        b._score - a._score ||
        (a.ageMinutes ?? 0) - (b.ageMinutes ?? 0) ||
        String(a.id).localeCompare(String(b.id)),
    )
    .map(({ _score, ...item }) => item)
}

/* ── Service ──────────────────────────────────────────────── */
export const feedService = {
  async getFeed({ tab = 'mchanganyiko', filter = 'all' } = {}) {
    const [all, directory, currentUser, vocabulary] = await Promise.all([
      contentRepository.listFeed(),
      identityRepository.listUsers(),
      identityRepository.getCurrentUser(),
      catalogRepository.getEntityVocabulary(),
    ])

    const entities = new Map(directory.map((entity) => [entity.id, entity]))
    if (currentUser) entities.set(currentUser.id, currentUser)

    // 1) unganisha entity kwanza, kisha 2) hesabu uanachama wa tab kwa sheria
    // ROLE (aina ya entity) na RELATIONSHIP (uhusiano wangu) ni tabaka mbili
    // tofauti: role inatoka kwa aina ya entity; relationship inatoka kwa entity
    // yenyewe (mock). Action inahesabiwa na UI kwa vocabulary hii.
    const joined = all.map((item) => {
      const entity = entities.get(item.userId) ?? null
      return {
      ...item,
      entity,
      role: entity ? (vocabulary.roles[entity.type] ?? null) : null,
      relationship: entity?.relationship ?? item.relationship ?? null,
      live: item.live
        ? {
            ...item.live,
            speakerIds: item.live.speakers,
            speakers: (item.live.speakers ?? [])
              .map((id) => entities.get(id))
              .filter(Boolean),
          }
        : item.live,
      }
    })
    const rule = TAB_RULES[tab] ?? TAB_RULES.mchanganyiko
    const byTab = joined.filter((item) => item.entity && rule(item))
    const selected = filter === 'all' ? byTab : byTab.filter((item) => item.filters.includes(filter))

    return {
      items: orderBy(selected, entities),
      total: byTab.length,
      shown: selected.length,
      tab,
      filter,
    }
  },

  // Vocabulary ya ROLE/ACTION (UI haitumii catalog moja kwa moja).
  async getEntityVocabulary() {
    return catalogRepository.getEntityVocabulary()
  },

  // Channels zinazopendekezwa (Channels tab) — entity kamili kwa UI.
  async getChannelSuggestions() {
    const list = await identityRepository.listChannelSuggestions()
    return list.map((entity) => ({
      id: entity.id,
      name: entity.name,
      handle: entity.handle,
      type: entity.type,
      verified: entity.verified ?? false,
      followers: entity.followers ?? 0,
      user: entity,
    }))
  },
}
