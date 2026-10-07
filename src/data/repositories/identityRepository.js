// ══════════════════════════════════════════════════════════════
// PASIHAI — REPOSITORY: IDENTITY
//
// CONTRACT (haitegemei provider yoyote — si Firebase-specific):
//   getCurrentUser()  → Promise<Entity>        mtumiaji wa kifaa hiki
//   getUser(id)       → Promise<Entity|null>   entity kwa id
//   listUsers()       → Promise<Entity[]>      wote wanaojulikana
//   listChannelSuggestions() → Promise<Entity[]>  channels za kupendekeza
//
// IMPLEMENTATION YA SASA : Mock (inasoma src/data/mock.js)
// IMPLEMENTATION ZA BAADAYE: FirebaseIdentityRepository | LocalIdentityRepository
//
// KUMBUKA YA DOMAIN: `type` iliyopo kwenye mock ni ya MAJARIBIO pekee.
// Model kamili ya Identity / Entity / Relationship / Role / Visibility /
// Permission inasubiri maamuzi ya ADW-02. Phase 1 haigusi dhana hizo.
// ══════════════════════════════════════════════════════════════

import { users, me, channelSuggestions } from '../mock.js'

export const mockIdentityRepository = {
  async getCurrentUser() {
    return me
  },

  async getUser(id) {
    if (!id) return null
    if (id === me.id) return me
    return users[id] ?? null
  },

  async listUsers() {
    return Object.values(users)
  },

  async listChannelSuggestions() {
    return channelSuggestions.map((id) => users[id]).filter(Boolean)
  },
}
