// ══════════════════════════════════════════════════════════════
// PASIHAI — APPLICATION SERVICE: SETTINGS / PREFERENCES
//
//   getViewModes()       → ViewMode[]      Automatic · Vertical · Horizontal
//   getFeedPreferences() → FeedPreferences mpangilio + kile kinachoonekana
//
// Kumbuka: hizi ni thamani za app/preferences, si content ya mtumiaji.
// ══════════════════════════════════════════════════════════════

import { catalogRepository, systemRepository } from '../data/repositories/index.js'

export const settingsService = {
  async getViewModes() {
    return catalogRepository.getViewModes()
  },

  async getFeedPreferences() {
    return catalogRepository.getFeedPreferences()
  },
  /* Mapendeleo yaliyohifadhiwa na mtumiaji (kikao hiki) */
  async getUserPrefs() {
    return systemRepository.getPrefs()
  },

  async saveUserPrefs(patch) {
    return systemRepository.savePrefs(patch)
  },
}
