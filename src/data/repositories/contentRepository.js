// ══════════════════════════════════════════════════════════════
// PASIHAI — REPOSITORY: CONTENT
//
// CONTRACT (haitegemei provider yoyote — si Firebase-specific):
//   getStatuses()            → Promise<StatusItem[]>
//   listFeed()               → Promise<FeedItem[]>
//   listSpacePosts(spaceId)  → Promise<FeedItem[]>  (activity ya Space)
//
// HALI YA KIKAO (vitendo vya mtumiaji — halisi, bila backend):
//   listSaved() / toggleSaved(item) / isSaved(id)
//   listLikes() / toggleLike(id) / isLiked(id)
//   listComments(itemId) / addComment(itemId, text)
//   listMyPosts() / addPost(draft)
//   hideItem(id) / listHidden() / unhideItem(id)
//   reportItem(id, reason) / listReported()
//
// IMPLEMENTATION YA SASA : Mock (mock.js + hali ya kikao kwenye kumbukumbu)
// IMPLEMENTATION ZA BAADAYE: FirebaseContentRepository | LocalContentRepository
//
// KANUNI: vitendo hivi ni vya MTUMIAJI MMOJA (kikao hiki). Hakuna
// analytics, hakuna tracking, na hakuna kubadilisha data ya mtu mwingine
// kimya kimya — kila kitu kinachohifadhiwa ni cha mtumiaji mwenyewe.
// ══════════════════════════════════════════════════════════════

import { posts, reels, liveSessions, postComments, spacePosts, me } from '../mock.js'
import { mapFeed } from '../mappers/feedMapper.js'
import { ValidationError } from '../../utils/errors.js'
import { PostMediaConfigurationError } from '../../utils/postMedia.js'
import { StatusConfigurationError } from '../../utils/statusMedia.js'

/* ── Hali ya kikao (inapotea ukifunga app — prototype) ─────── */
const session = {
  liked: {},        // { itemId: true }
  votes: {},        // { itemId: optionId } — kura zangu
  live: [],         // vikao vyangu vya moja kwa moja
  savedEntities: {}, // { entityId: { id, kind, name, subtitle } }
  joined: {},        // { liveId: true }
  saved: [],        // [{ id, kind, text, author, at }] — mpya kwanza
  comments: {},     // { itemId: [{ id, author, tone, text, at, mine }] }
  myPosts: [],      // feed items za mtumiaji (zinaonekana juu ya mkondo)
  hidden: [],       // ids zilizofichwa kutoka mkondo
  reported: [],     // [{ id, reason, at }]
}

const nowLabel = 'sasa hivi'

function seedComments() {
  for (const [itemId, list] of Object.entries(postComments)) {
    session.comments[itemId] = list.map((c) => ({ ...c, mine: false }))
  }
}
seedComments()

function snapshotOf(item) {
  return {
    id: item.id,
    kind: item.kind ?? 'text',
    text: (item.text ?? item.live?.title ?? '').slice(0, 120),
    author: item.entity?.name ?? item.author ?? 'PASIHAI',
    authorId: item.entity?.id ?? item.userId ?? null,
    at: nowLabel,
  }
}

export const mockContentRepository = {
  async getStatuses() {
    // Status si mock: UI ibaki empty mpaka source ya Supabase iwe live.
    return []
  },

  async addStatus() {
    // Linda pia matumizi ya moja kwa moja ya repository dhidi ya mafanikio ya demo.
    throw new StatusConfigurationError()
  },

  async deleteStatus(statusId) {
    return { deleted: false, id: statusId, persistence: 'mock' }
  },

  async listFeed() {
    const base = mapFeed({ posts, reels, liveSessions })
    return [...session.live, ...base]
  },

  /* ── Content ya NDANI ya Space (activity) ──────────────────
     Njia ILEILE ya mapper ili vitendo (maoni · reactions · hifadhi)
     vifanye kazi bila tofauti. Content hii haiingilii hesabu za
     mkondo wa Home — inapatikana kwa spaceId pekee. */
  async listSpacePosts(spaceId) {
    if (!spaceId) return []
    const inside = spacePosts.filter((p) => p.spaceId === spaceId)
    const byAuthor = posts.filter((p) => p.userId === spaceId)
    return [...session.myPosts.filter((p) => p.spaceId === spaceId), ...mapFeed({ posts: [...inside, ...byAuthor] })]
  },

  /* ── Machapisho yangu (yanaonekana juu ya mkondo) ────────── */

  async listMyPosts() {
    return session.myPosts.map((p) => ({ ...p }))
  },

  async addPost(draft = {}) {
    if (draft.file || draft.mediaUrl) throw new PostMediaConfigurationError()
    if (['photo', 'image', 'video', 'reel'].includes(draft.kind)) {
      throw new ValidationError('Chagua faili halisi la picha/video na tumia Supabase Storage kabla ya kuhifadhi post.')
    }
    const item = {
      id: `my-${session.myPosts.length + 1}`,
      kind: draft.kind ?? 'text',
      userId: me.id,
      relationship: 'Wewe',
      ageMinutes: 0,
      text: draft.text ?? '',
      label: draft.label,
      poll: draft.poll,
      media: draft.media,
      live: draft.live,
      source: draft.source ?? 'post',
      filters: draft.filters ?? ['posts'],
      stats: { reactions: 0, comments: 0, shares: 0 },
      mine: true,
    }
    session.myPosts = [item, ...session.myPosts]
    return item
  },

  /* ── Kuhifadhi (Saved) ───────────────────────────────────── */

  async listSaved() {
    return session.saved.map((s) => ({ ...s }))
  },

  async isSaved(id) {
    return session.saved.some((s) => s.id === id)
  },

  async toggleSaved(item) {
    const exists = session.saved.some((s) => s.id === item.id)
    if (exists) {
      session.saved = session.saved.filter((s) => s.id !== item.id)
      return { id: item.id, saved: false }
    }
    session.saved = [snapshotOf(item), ...session.saved]
    return { id: item.id, saved: true }
  },

  /* ── Kupenda (Like) ──────────────────────────────────────── */

  async listLikes() {
    return Object.keys(session.liked).filter((k) => session.liked[k])
  },

  async isLiked(id) {
    return !!session.liked[id]
  },

  async toggleLike(id) {
    session.liked[id] = !session.liked[id]
    return { id, liked: !!session.liked[id] }
  },

  /* ── Maoni (Comments) ────────────────────────────────────── */

  async listComments(itemId) {
    return (session.comments[itemId] ?? []).map((c) => ({ ...c }))
  },

  async addComment(itemId, text, author = me) {
    const c = {
      id: `c-${Date.now()}-${(session.comments[itemId]?.length ?? 0) + 1}`,
      authorId: author.id,
      author: author.name,
      tone: author.avatarTone ?? 'green',
      text,
      at: nowLabel,
      mine: true,
    }
    session.comments[itemId] = [...(session.comments[itemId] ?? []), c]
    return c
  },

  /* ── Hifadhi ya entities (mtu · biashara · channel · kikundi) ──
     Hifadhi ≠ Cached: hii ni uamuzi wa mtumiaji kuweka kando.            */

  async saveEntity(entity, on = true) {
    if (!entity?.id) return { id: null, saved: false }
    session.savedEntities[entity.id] = on
      ? { id: entity.id, kind: entity.kind || entity.type || 'entity', name: entity.name || entity.title || 'Bila jina', subtitle: entity.subtitle || entity.handle || '' }
      : null
    if (!on) delete session.savedEntities[entity.id]
    return { id: entity.id, saved: !!on }
  },

  async listSavedEntities() {
    return Object.values(session.savedEntities).filter(Boolean)
  },

  /* ── Kujiunga na kikao cha moja kwa moja (hali) ───────────── */

  async joinLive(id) {
    session.joined[id] = true
    if (id) {
      session.live = session.live.map((l) =>
        l.id === id ? { ...l, live: { ...l.live, viewers: (l.live?.viewers || 0) + 1 } } : l,
      )
    }
    return { id, joined: true }
  },

  async listJoinedLive() {
    return Object.keys(session.joined)
  },

  /* ── Kura za poll ────────────────────────────────────────── */

  async listVotes() {
    return { ...session.votes }
  },

  async votePoll(itemId, optionId) {
    session.votes[itemId] = optionId
    return { itemId, optionId }
  },

  /* ── Vikao vyangu vya Live (halisi: vinaanza na kukamilika) ── */

  async startLive(mode = 'Video') {
    const item = {
      id: `my-live-${session.live.length + 1}`,
      kind: 'liveActivity',
      userId: me.id,
      relationship: 'Wewe',
      ageMinutes: 0,
      text: mode === 'Sauti' ? 'Kikao changu cha sauti' : 'Kikao changu cha moja kwa moja',
      live: { state: 'live', mode, title: mode === 'Sauti' ? 'Kikao changu cha sauti' : 'Kikao changu cha moja kwa moja', host: me.name, viewers: 0, when: 'sasa hivi' },
      source: 'liveSession',
      filters: ['live'],
      stats: { reactions: 0, comments: 0, shares: 0 },
      mine: true,
      liveRunning: true,
    }
    session.live = [item, ...session.live]
    return item
  },

  async listMyLive() {
    return session.live.map((l) => ({ ...l }))
  },

  async endLive(id) {
    session.live = session.live.map((l) => (l.id === id ? { ...l, liveRunning: false, live: { ...l.live, state: 'replay' } } : l))
    return { id, ended: true }
  },

  /* ── Kuficha · Kuripoti ──────────────────────────────────── */

  async listHidden() {
    return [...session.hidden]
  },

  async hideItem(id) {
    if (!session.hidden.includes(id)) session.hidden = [...session.hidden, id]
    return { id, hidden: true }
  },

  async unhideItem(id) {
    session.hidden = session.hidden.filter((x) => x !== id)
    return { id, hidden: false }
  },

  async listReported() {
    return session.reported.map((r) => ({ ...r }))
  },

  async reportItem(id, reason) {
    if (!session.reported.some((r) => r.id === id)) {
      session.reported = [...session.reported, { id, reason, at: nowLabel }]
    }
    return { id, reported: true }
  },
}
