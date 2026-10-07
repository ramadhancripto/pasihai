// ══════════════════════════════════════════════════════════════
// PASIHAI — APPLICATION SERVICE: NOTIFICATIONS (Taarifa)
//
//   list({ scope }) → Notification[] (na `user`)   scope: 'zote' | 'mpya'
//   countUnread()   → number
//
// Kazi ya application layer: kuchuja (filter) na kuunganisha (join)
// na identity — component haijui map ya users.
// ══════════════════════════════════════════════════════════════

import { activityRepository, identityRepository } from '../data/repositories/index.js'

export const notificationService = {
  async list({ scope = 'zote' } = {}) {
    const items = await activityRepository.listNotifications()
    const filtered = scope === 'mpya' ? items.filter((n) => n.unread) : items

    return Promise.all(
      filtered.map(async (n) => ({
        ...n,
        user: await identityRepository.getUser(n.userId),
      })),
    )
  },

  async countUnread() {
    const items = await activityRepository.listNotifications()
    return items.filter((n) => n.unread).length
  },
}
