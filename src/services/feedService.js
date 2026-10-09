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
  // Kwa ajili yako: mchanganyiko wa posts/reels/friends/hubs; channels zinaingia zikifuatwa tu.
  mchanganyiko: (item, ctx) => item.source !== 'liveSession' && passesChannelGate(item, ctx) && isVisible(item, ctx),
  // Reels: video fupi kutoka vyanzo vilivyoruhusiwa na Home.
  reels: (item, ctx) => item.source === 'reel' && passesChannelGate(item, ctx) && isVisible(item, ctx),
  // Friends: marafiki pekee.
  friends: (item, ctx) => item.source !== 'liveSession' && item.entity?.type === 'friend' && isVisible(item, ctx),
  // Channels: channels zinazofuatwa pekee (channels mpya zinagunduliwa kupitia Gundua).
  channels: (item, ctx) =>
    item.source !== 'liveSession' && item.entity?.type === 'channel' && ctx.followed.has(item.entity.id) && isVisible(item, ctx),
  // Live: live sessions zinazoruhusiwa kwa mtumiaji (public, hata kutoka channels ambazo hazijafuatwa).
  live: (item, ctx) => item.source === 'liveSession' && isVisible(item, ctx),
}

/* Channel ambayo haijafuatwa haionekani kwenye tabs za feed (ugunduzi uko Gundua). Live haitumii kizuizi hiki. */
function passesChannelGate(item, ctx) {
  return item.entity?.type !== 'channel' || ctx.followed.has(item.entity.id)
}

/* Visibility: public = wote · followers = friends/channels zinazofuatwa · private = mimi.
   Thamani nyingine yoyote (k.m. 'restricted') imefichwa (fail-closed).
   Kichujio cha frontend (mock); si usalama wa backend. */
function isVisible(item, ctx) {
  const v = item.visibility ?? 'public'
  if (v === 'public') return true
  if (v === 'private') return !!item.mine
  if (v === 'followers') return item.entity?.type === 'friend' || ctx.followed.has(item.entity?.id)
  return false
}

/* ── Mpangilio kwa Home tab ────────────────────────────────
   Live     : live → upcoming → replay, kisha mpya kwanza.
   Friends/Reels/Channels : mpya kwanza.
   Kwa ajili yako: score iliyopo. Posts zangu hazibandikwi juu. */
const LIVE_ORDER = { live: 0, upcoming: 1, replay: 2 }

function orderFor(tab, items) {
  const byId = (a, b) => String(a.id).localeCompare(String(b.id))
  const byAge = (a, b) => (a.ageMinutes ?? 0) - (b.ageMinutes ?? 0)
  if (tab === 'live') {
    return [...items].sort(
      (a, b) => (LIVE_ORDER[a.live?.state] ?? 9) - (LIVE_ORDER[b.live?.state] ?? 9) || byAge(a, b) || byId(a, b),
    )
  }
  if (tab === 'mchanganyiko') {
    return [...items].sort((a, b) => scoreOf(b, b.entity) - scoreOf(a, a.entity) || byAge(a, b) || byId(a, b))
  }
  return [...items].sort((a, b) => byAge(a, b) || byId(a, b))
}

/* ── Mpangilio ────────────────────────────────────────────── */
function orderBy(items, entities) {
  return items
    .map((item) => ({ ...item, _score: scoreOf(item, item.entity) }))
    .sort(
      (a, b) =>
        // chapisho langu mwenyewe liko juu (mtumiaji anajua alichochapisha)
        Number(b.mine ?? false) - Number(a.mine ?? false) ||
        b._score - a._score ||
        (a.ageMinutes ?? 0) - (b.ageMinutes ?? 0) ||
        String(a.id).localeCompare(String(b.id)),
    )
    .map(({ _score, ...item }) => item)
}

/* ── Service ──────────────────────────────────────────────── */
export const feedService = {
  /* ── Hali ya kikao inayohitajika kwa mkondo wowote ─────────
     Chanzo kimoja: likes · saved · votes · hidden · vocabulary ·
     orodha ya entities. getFeed na getSpaceFeed wanashiriki hii. */
  async loadFeedState() {
    const [hidden, likes, saved, votes, currentUser, vocabulary, directory, followedIds] = await Promise.all([
      contentRepository.listHidden(),
      contentRepository.listLikes(),
      contentRepository.listSaved(),
      contentRepository.listVotes(),
      identityRepository.getCurrentUser(),
      catalogRepository.getEntityVocabulary(),
      identityRepository.listUsers(),
      identityRepository.listFollowed(),
    ])
    const entities = new Map(directory.map((entity) => [entity.id, entity]))
    if (currentUser) entities.set(currentUser.id, currentUser)
    return {
      hidden,
      savedIds: new Set(saved.map((x) => x.id)),
      likedIds: new Set(likes),
      votes,
      vocabulary,
      entities,
      followed: new Set(followedIds),
    }
  },

  /* ── Kuunganisha items na identity (ROLE ≠ RELATIONSHIP) ──── */
  enrichFeedItems(items, state) {
    const { savedIds, likedIds, votes, vocabulary, entities } = state
    return items.map((item) => {
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
        saved: savedIds.has(item.id),
        liked: likedIds.has(item.id),
        poll: item.poll ? { ...item.poll, myVote: votes[item.id] || null } : item.poll,
      }
    })
  },

  async getFeed({ tab = 'mchanganyiko', filter = 'all' } = {}) {
    const [feed, myPosts, state] = await Promise.all([
      contentRepository.listFeed(),
      contentRepository.listMyPosts(),
      this.loadFeedState(),
    ])
    // Posts zangu zinafuata sheria za feed (si pinned).
    const all = [...myPosts, ...feed].filter((i) => !state.hidden.includes(i.id))
    const { entities, followed } = state

    // 1) unganisha entity kwanza, kisha 2) hesabu uanachama wa tab kwa sheria
    // ROLE (aina ya entity) na RELATIONSHIP (uhusiano wangu) ni tabaka mbili
    // tofauti: role inatoka kwa aina ya entity; relationship inatoka kwa entity
    // yenyewe (mock). Action inahesabiwa na UI kwa vocabulary hii.
    const joined = this.enrichFeedItems(all, state)
    const rule = TAB_RULES[tab] ?? TAB_RULES.mchanganyiko
    const byTab = joined.filter((item) => item.entity && rule(item, { followed }))
    const selected = filter === 'all' ? byTab : byTab.filter((item) => item.filters.includes(filter))

    return {
      items: orderFor(tab, selected),
      total: byTab.length,
      shown: selected.length,
      tab,
      filter,
    }
  },

  /* ── Mkondo wa NDANI ya Space (activity ya Hub/Jumuiya/Channel) ──
     Njia ILEILE: enrich + filter + mpangilio wa mkondo. Hii ni
     content ya space pekee — haiingilii hesabu za mkondo wa Home (§7). */
  async getSpaceFeed({ spaceId, filter = 'all' } = {}) {
    if (!spaceId) return { items: [], total: 0, shown: 0, filter, spaceId }
    const [raw, state] = await Promise.all([
      contentRepository.listSpacePosts(spaceId),
      this.loadFeedState(),
    ])
    const visible = raw.filter((i) => !state.hidden.includes(i.id))
    const joined = this.enrichFeedItems(visible, state)
    const byFilter = filter === 'all' ? joined : joined.filter((i) => i.filters.includes(filter))
    return {
      items: orderBy(byFilter, state.entities),
      total: joined.length,
      shown: byFilter.length,
      filter,
      spaceId,
    }
  },

  // Vocabulary ya ROLE/ACTION (UI haitumii catalog moja kwa moja).
  async getEntityVocabulary() {
    return catalogRepository.getEntityVocabulary()
  },

  /* ── Vitendo halisi vya mtumiaji (hali ya kikao) ─────────
     Zote zinapita contentRepository — chanzo kimoja, bila backend. */

  async toggleLike(itemId) {
    return contentRepository.toggleLike(itemId)
  },

  async toggleSaved(item) {
    return contentRepository.toggleSaved(item)
  },

  /** Machapisho yangu (pamoja na vikao vyangu vya Live) — halisi */
  async listMine() {
    const feed = await this.getFeed({ tab: 'mchanganyiko' })
    return feed.items.filter((i) => i.mine)
  },

  /** Nilizopenda — halisi */
  async listLikedItems() {
    const feed = await this.getFeed({ tab: 'mchanganyiko' })
    return feed.items.filter((i) => i.liked)
  },

  async listSaved() {
    return contentRepository.listSaved()
  },

  async listComments(itemId) {
    return contentRepository.listComments(itemId)
  },

  async addComment(itemId, text) {
    return contentRepository.addComment(itemId, text)
  },

  async hidePost(itemId) {
    return contentRepository.hideItem(itemId)
  },

  async reportPost(itemId, reason) {
    return contentRepository.reportItem(itemId, reason)
  },

  /** Chapisha chapisho jipya la mtumiaji (halisi — linaonekana juu ya mkondo) */
  async createPost(draft) {
    const kind = draft.kind ?? 'text'
    const TONE = ['green', 'blue', 'gold', 'teal', 'plum', 'clay', 'slate']
    const tone = draft.tone || TONE[Math.floor(Math.random() * TONE.length)]

    const payload = { ...draft, kind }

    if (kind === 'poll') {
      payload.poll = {
        question: draft.text || 'Swali langu',
        options: (draft.options || []).filter(Boolean).map((label, i) => ({ id: `o${i + 1}`, label, votes: 0 })),
        total: 0,
      }
      payload.filters = ['polls', 'posts']
    } else if (kind === 'image') {
      payload.media = { tone, ratio: '4 / 3', caption: draft.text || 'Picha yangu' }
      payload.filters = ['picha', 'posts']
    } else if (kind === 'video' || kind === 'reel') {
      payload.media = { tone, ratio: kind === 'reel' ? '9 / 16' : '16 / 9', duration: kind === 'reel' ? '0:18' : '1:20', views: 0, caption: draft.text || 'Video yangu' }
      payload.filters = kind === 'reel' ? ['reels', 'video'] : ['video', 'posts']
      if (kind === 'reel') payload.source = 'reel'
    } else if (kind === 'audio') {
      payload.media = { tone, duration: '0:42', caption: draft.text || 'Sauti yangu' }
      payload.filters = ['audio']
    } else {
      payload.filters = ['posts']
    }

    return contentRepository.addPost(payload)
  },

  /** Hifadhi entity (mtu · biashara · channel · kikundi) — hali ya kikao */
  async saveEntity(entity, on = true) {
    return contentRepository.saveEntity(entity, on)
  },

  async listSavedEntities() {
    return contentRepository.listSavedEntities()
  },

  /** Kujiunga na kikao cha moja kwa moja (hali inabaki) */
  async joinLive(id) {
    return contentRepository.joinLive(id)
  },

  async listJoinedLive() {
    return contentRepository.listJoinedLive()
  },

  async votePoll(itemId, optionId) {
    return contentRepository.votePoll(itemId, optionId)
  },

  /** Anza kikao cha moja kwa moja (kinaonekana kwenye tab ya Live) */
  async startLive(mode) {
    return contentRepository.startLive(mode)
  },

  async endLive(id) {
    return contentRepository.endLive(id)
  },

  async listMyLive() {
    return contentRepository.listMyLive()
  },

  /** Status/Story: inaonekana kwenye safu ya Status kwa saa 24 (mock) */
  async createStatus(payload) {
    return contentRepository.addStatus(payload)
  },

  /** Kufuata: chanzo kimoja ni identityRepository (§ subscriptions) */
  async toggleFollow(id, on) {
    return identityRepository.toggleFollow(id, on)
  },

  async listFollowed() {
    return identityRepository.listFollowed()
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
