// ══════════════════════════════════════════════════════════════
// PASIHAI — APPLICATION SERVICE: SETTINGS / PREFERENCES
//
//   getViewModes()       → ViewMode[]      Automatic · Vertical · Horizontal
//   getFeedPreferences() → FeedPreferences mpangilio + kile kinachoonekana
//
// Kumbuka: hizi ni thamani za app/preferences, si content ya mtumiaji.
// ══════════════════════════════════════════════════════════════

import { catalogRepository } from '../data/repositories/index.js'

export const settingsService = {
  async getViewModes() {
    return catalogRepository.getViewModes()
  },

  async getFeedPreferences() {
    return catalogRepository.getFeedPreferences()
  },
}
