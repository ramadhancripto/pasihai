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

export const mockActivityRepository = {
  async listNotifications() {
    return notifications
  },
}
