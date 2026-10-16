// PASIHAI — catalog: UI vocabulary (tabs, filters). Si watumiaji wala posts.

import {
  homeTabs,
  contentFilters,
  viewModes,
  feedPreferences,
  upNext,
  entityRoles,
  entityActions,
} from '../appCatalog.js'

export const catalogRepository = {
  async getHomeTabs() {
    return homeTabs
  },
  async getContentFilters() {
    return contentFilters
  },
  async getViewModes() {
    return viewModes
  },
  async getFeedPreferences() {
    return feedPreferences
  },
  async getProductInfo(pageKey) {
    return upNext[pageKey] ?? null
  },
  async getEntityVocabulary() {
    return { roles: entityRoles, actions: entityActions }
  },
}
