// ══════════════════════════════════════════════════════════════
// PASIHAI — Creator Studio: data ya pamoja (reuse ya huduma zilizopo)
//   accountService.getCurrentUser / getMyContent('posts')  → machapisho yangu
//   notificationService.countUnread                        → arifa halisi
//   studioDrafts.listDrafts                                → rasimu za kifaa
// Hakuna data ya kubuni. Thamani zisizopatikana zinabaki 0 au null.
// ══════════════════════════════════════════════════════════════

import { accountService } from '../services/accountService.js'
import { notificationService } from '../services/notificationService.js'
import { listDrafts } from '../utils/studioDrafts.js'
import { POST_TYPES } from '../utils/postContent.js'

export async function loadStudioBase() {
  const me = await accountService.getCurrentUser()
  const [posts, unread] = await Promise.all([
    accountService.getMyContent('posts'),
    notificationService.countUnread(),
  ])
  const drafts = me?.id ? listDrafts(me.id) : []
  return {
    me,
    posts: Array.isArray(posts) ? posts : [],
    drafts,
    unread: Number(unread) || 0,
  }
}

export function postStats(post) {
  const s = post?.stats ?? {}
  const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)
  return { reactions: n(s.reactions), comments: n(s.comments), shares: n(s.shares) }
}

export function interactionTotal(post) {
  const s = postStats(post)
  return s.reactions + s.comments + s.shares
}

/** Media ya chapisho, au null ikiwa haina media. */
export function mediaOf(post) {
  const m = post?.media
  if (!m || (!m.url && !m.mediaType)) return null
  const kind = m.mediaType || (post.kind === 'reel' ? 'video' : post.kind)
  return { url: m.url ?? null, kind: kind === 'video' || kind === 'reel' ? 'video' : 'image', meta: m.mediaMeta ?? null }
}

/** Lebo ya aina ya rasimu (inatumia POST_TYPES, kwa hiyo aina zote zinaonekana kwa Kiswahili). */
export function draftTypeLabel(type) {
  return POST_TYPES[type]?.label ?? 'Rasimu'
}

export const KIND_LABEL = {
  text: 'Chapisho',
  image: 'Picha',
  photo: 'Picha',
  video: 'Video',
  reel: 'Reel',
  poll: 'Kura',
  live: 'Live',
  liveActivity: 'Live',
}
