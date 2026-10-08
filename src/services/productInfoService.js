// ══════════════════════════════════════════════════════════════
// PASIHAI — APPLICATION SERVICE: PRODUCT INFO
//
//   getPage(pageKey) → ProductInfo|null
//     pageKey: 'chat' | 'gundua' | 'spaces' | 'business'
//
// Hii ni taarifa ya kile kitakachojengwa kwa kila eneo — inatumika kwenye
// kurasa za placeholder zinazoeleza mipaka ya urambazaji.
// ══════════════════════════════════════════════════════════════

import { catalogRepository } from '../data/repositories/index.js'

export const productInfoService = {
  async getPage(pageKey) {
    return catalogRepository.getProductInfo(pageKey)
  },
}
