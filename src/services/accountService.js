// ══════════════════════════════════════════════════════════════
// PASIHAI — APPLICATION SERVICE: ACCOUNT / IDENTITY
//
//   getCurrentUser()  → Entity            mtumiaji wa kifaa hiki
//   getProfile(id)    → Entity|null       wasifu wa umma wa entity
//   listDirectory()   → Entity[]          wote wanaojulikana
//   getEntityVocabulary() → {roles, actions}  ROLE ≠ RELATIONSHIP ≠ ACTION
//
// HALI YA DOMAIN: hii ni seam ya KUSOMA identity pekee. Haianzishi
// model mpya ya Identity/Entity/Relationship/Role/Visibility/Permission —
// hiyo inasubiri maamuzi ya ADW-02.
// ══════════════════════════════════════════════════════════════

import { identityRepository, catalogRepository } from '../data/repositories/index.js'

export const accountService = {
  async getCurrentUser() {
    return identityRepository.getCurrentUser()
  },

  async getProfile(userId) {
    if (!userId || userId === 'me') return identityRepository.getCurrentUser()
    return identityRepository.getUser(userId)
  },

  async listDirectory() {
    return identityRepository.listUsers()
  },

  /** Vocabulary ya ROLE (huyu ni nani) na ACTION (nifanye nini). */
  async getEntityVocabulary() {
    return catalogRepository.getEntityVocabulary()
  },
}
