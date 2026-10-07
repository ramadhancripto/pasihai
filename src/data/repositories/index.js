// ══════════════════════════════════════════════════════════════
// PASIHAI — COMPOSITION ROOT YA REPOSITORIES
//
// Hapa ndipo implementations zinachaguliwa. Hii ni SEHEMU YA KUBADILISHA
// (swap point): kubadilisha Mock → Firebase / Local Data / Sync (baadaye)
// ni kubadilisha mistari ya hapa chini PEKEE — hakuna UI inayobadilika.
//
// UI NA SERVICES HAZI-IMPORT REPOSITORIES ZENYEWE:
//   UI        → services/*Service.js
//   Services  → data/repositories/index.js (faili hii)
//
// Hakuna domain logic hapa — wiring pekee.
// ══════════════════════════════════════════════════════════════

import { mockIdentityRepository } from './identityRepository.js'
import { mockContentRepository } from './contentRepository.js'
import { mockActivityRepository } from './activityRepository.js'
import { mockCatalogRepository } from './catalogRepository.js'

/* ── Implementations za sasa (mock) ─────────────────────────
   Baadaye: badilisha mstari mmoja, k.m.
     export const identityRepository = firebaseIdentityRepository
   bila kubadilisha services wala UI.
   ─────────────────────────────────────────────────────────── */

export const identityRepository = mockIdentityRepository
export const contentRepository = mockContentRepository
export const activityRepository = mockActivityRepository
export const catalogRepository = mockCatalogRepository
