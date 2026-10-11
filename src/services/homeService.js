// ══════════════════════════════════════════════════════════════
// PASIHAI — APPLICATION SERVICE: HOME
//
// Hukusanya data ya skrini ya Home. UI haitumii repositories moja kwa moja.
//
//   getNavigation()  → { tabs, filters }        tabs za Home + kichujio
//   getStatusStrip() → StatusItem[] (na `user`) safu ya Status/Stories
//
// Kumbuka: hii ni "application layer" — sehemu inayofaa kuweka cache,
// memoization au batching baadaye, bila kugusa UI.
// ══════════════════════════════════════════════════════════════

import {
  catalogRepository,
  contentRepository,
  identityRepository,
} from '../data/repositories/index.js'

export const homeService = {
  async getNavigation() {
    const [tabs, filters] = await Promise.all([
      catalogRepository.getHomeTabs(),
      catalogRepository.getContentFilters(),
    ])
    return { tabs, filters }
  },

  /**
   * Orodha bapa ya Status hai kutoka source moja ya repository.
   * IDs pekee ndizo hutumika kuondoa nakala halisi; maandishi hayalinganishwi.
   */
  async getStatuses() {
    const sourceItems = await contentRepository.getStatuses()
    const uniqueById = new Map()
    for (const item of sourceItems || []) {
      if (item?.id == null) continue
      const id = String(item.id)
      if (!uniqueById.has(id)) uniqueById.set(id, item)
    }

    const now = Date.now()
    const items = [...uniqueById.values()].filter((item) => {
      const expiry = Date.parse(item.expiresAt || '')
      return !Number.isFinite(expiry) || expiry > now
    })
    const needsCurrentProfile = items.some((item) => item.own && !item.user)
    const currentUser = needsCurrentProfile ? await identityRepository.getCurrentUser() : null

    const mapped = await Promise.all(items.map(async (item) => {
      const userId = item.userId || item.user?.id
      const user = item.user || (item.own
        ? currentUser
        : await identityRepository.getUser(userId))
      const saved = item.own || typeof item.saved === 'boolean'
        ? Boolean(item.own || item.saved)
        : await identityRepository.isFollowing(userId)
      return { ...item, userId, user, saved }
    }))

    return mapped.filter((item) => item.own || item.saved)
  },

  /**
   * Safu ya Stories: akaunti moja = entry moja; kila Status halisi ya akaunti
   * hubaki kwenye `statuses` na kufunguka mfululizo ndani ya Story viewer.
   */
  async getStatusStrip() {
    const items = await this.getStatuses()
    const byUserId = new Map()

    for (const item of items) {
      const userId = item.userId || item.user?.id
      if (!userId) continue
      const key = String(userId)
      const group = byUserId.get(key) || {
        id: key,
        userId: key,
        user: item.user || null,
        own: false,
        saved: false,
        statuses: [],
      }
      group.user = group.user || item.user || null
      group.own ||= Boolean(item.own)
      group.saved ||= Boolean(item.saved)
      group.statuses.push(item)
      byUserId.set(key, group)
    }

    return [...byUserId.values()]
      .map((group) => {
        const stories = group.statuses.sort((a, b) => {
          const byTime = (Date.parse(a.createdAt || '') || 0) - (Date.parse(b.createdAt || '') || 0)
          return byTime || String(a.id).localeCompare(String(b.id))
        })
        const latestStatus = stories[stories.length - 1]
        return {
          ...group,
          id: `status-group:${group.userId}`,
          label: group.own ? 'Status Yako' : group.user?.name || 'Status',
          statuses: stories,
          latestStatus,
          latestStatusId: latestStatus.id,
          statusCount: stories.length,
          hasVideo: latestStatus.mediaType === 'video',
          mediaType: latestStatus.mediaType || null,
          ago: latestStatus.ago || '',
          ring: latestStatus.ring,
          live: latestStatus.live,
        }
      })
      .sort((a, b) => {
        const byTime = (Date.parse(b.latestStatus?.createdAt || '') || 0)
          - (Date.parse(a.latestStatus?.createdAt || '') || 0)
        return byTime || String(a.userId).localeCompare(String(b.userId))
      })
  },
}
