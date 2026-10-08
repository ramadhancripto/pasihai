// ══════════════════════════════════════════════════════════════
// PASIHAI — REPOSITORY: ACTIVITY (Taarifa)
//
// CONTRACT (haitegemei provider yoyote — si Firebase-specific):
//   listNotifications() → Promise<Notification[]>
//
// IMPLEMENTATION YA SASA : Mock (inasoma src/data/mock.js)
// IMPLEMENTATION ZA BAADAYE: FirebaseActivityRepository | LocalActivityRepository
//
// HALI: notification ni tukio (event). Hati ya usanifu inasema notifications
// zitakuwa event-driven baadaye; contract hii inatosha kwa prototype.
// ══════════════════════════════════════════════════════════════

import { notifications } from '../mock.js'

/* ── Hali ya kikao: taarifa zilizosomwa (halisi, bila backend) ── */
const read = {}

function withReadState(n) {
  return { ...n, unread: n.unread && !read[n.id] }
}

export const mockActivityRepository = {
  async listNotifications(scope = 'zote') {
    const all = notifications.map(withReadState)
    if (scope === 'mpya') return all.filter((n) => n.unread)
    return all
  },

  async markRead(id) {
    read[id] = true
    return { id, read: true }
  },

  async markAllRead() {
    for (const n of notifications) read[n.id] = true
    return { read: notifications.length }
  },

  async countUnread() {
    return notifications.filter((n) => n.unread && !read[n.id]).length
  },
}
