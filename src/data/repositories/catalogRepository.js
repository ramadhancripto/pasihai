// ══════════════════════════════════════════════════════════════
// PASIHAI — REPOSITORY: CATALOG (Vocabulary + Preferences + Product info)
//
// CONTRACT (haitegemei provider yoyote — si Firebase-specific):
//   getHomeTabs()        → Promise<Tab[]>          Mchanganyiko · Reels · Friends · Channels · Live
//   getContentFilters()  → Promise<Filter[]>       kichujio cha aina ya maudhui
//   getViewModes()       → Promise<ViewMode[]>     Automatic · Vertical · Horizontal
//   getFeedPreferences() → Promise<FeedPreferences>
//   getProductInfo(key)  → Promise<ProductInfo|null>
//   getEntityVocabulary()→ Promise<{roles, actions}>  Role · Relationship · Action
//
// IMPLEMENTATION YA SASA : Mock (inasoma src/data/mock.js)
// IMPLEMENTATION ZA BAADAYE: LocalCatalogRepository | RemoteConfigAdapter
//
// HALI: haya ni data ya app (vocabulary/config + maelezo ya bidhaa),
// si content ya mtumiaji. Baadaye yanaweza kubaki app-side au kuja
// kutoka remote config — contract inabaki ile ile.
//
// `moreMenuItems` ipo kwenye mock.js lakini HAITUMIKI (MorePanel ina rows
// zake za UI). Haijaingizwa kwenye contract — usiongeze bila mahitaji.
// ══════════════════════════════════════════════════════════════

import {
  homeTabs,
  contentFilters,
  viewModes,
  feedPreferences,
  upNext,
  entityRoles,
  entityActions,
} from '../mock.js'

export const mockCatalogRepository = {
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
