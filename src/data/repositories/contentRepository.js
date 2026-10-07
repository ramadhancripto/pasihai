// ══════════════════════════════════════════════════════════════
// PASIHAI — REPOSITORY: CONTENT
//
// CONTRACT (haitegemei provider yoyote — si Firebase-specific):
//   getStatuses() → Promise<StatusItem[]>   Status / Stories za safu ya Home
//   listFeed()    → Promise<FeedItem[]>     feed items (muundo: feedMapper.js)
//
// IMPLEMENTATION YA SASA : Mock (inasoma src/data/mock.js)
// IMPLEMENTATION ZA BAADAYE: FirebaseContentRepository | LocalContentRepository
//
// Kumbuka la muundo: repository inarudisha FEED ITEMS tayari zimefungwa
// kwa muundo mmoja (kwa mapper). Chanzo (posts/reels/live/reels/API)
// kinabaki kuwa jambo la ndani — UI haijui.
// ══════════════════════════════════════════════════════════════

import { statuses, posts, reels, liveSessions } from '../mock.js'
import { mapFeed } from '../mappers/feedMapper.js'

export const mockContentRepository = {
  async getStatuses() {
    return statuses
  },

  async listFeed() {
    return mapFeed({ posts, reels, liveSessions })
  },
}
