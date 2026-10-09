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

  /** Safu ya Status/Stories — kila item inakuja ikiwa na entity yake. */
  async getStatusStrip() {
    const [items, currentUser] = await Promise.all([
      contentRepository.getStatuses(),
      identityRepository.getCurrentUser(),
    ])

    // Kwa muundo mpya: Status/Stories zinaonyeshwa kwa akaunti ulizohifadhi
    // (zinazofuatiliwa) pamoja na status yako mwenyewe. Akaunti nyingine hazionekani hapa.
    const mapped = await Promise.all(
      items.map(async (item) => ({
        ...item,
        user: item.own ? currentUser : await identityRepository.getUser(item.userId),
        saved: item.own ? true : await identityRepository.isFollowing(item.userId),
      })),
    )
    return mapped.filter((item) => item.own || item.saved)
  },
}
