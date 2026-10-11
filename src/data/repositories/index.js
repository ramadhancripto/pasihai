// ══════════════════════════════════════════════════════════════
// PASIHAI — COMPOSITION ROOT YA REPOSITORIES
//
// Hapa ndipo implementations zinachaguliwa. Hii ni SEHEMU YA KUBADILISHA
// (swap point): kubadilisha Mock → Supabase ni kubadilisha VITE_SUPABASE_MODE
// kwenye .env.local PEKEE — hakuna UI inayobadilika.
//
// MODE SELECTION (wazi, si siri):
//   VITE_SUPABASE_MODE='mock' (default) → mock repositories
//   VITE_SUPABASE_MODE='live'           → Supabase repositories
//
// UI NA SERVICES HAZI-IMPORT REPOSITORIES ZENYEWE:
//   UI        → services/*Service.js
//   Services  → data/repositories/index.js (faili hii)
//
// Hakuna domain logic hapa — wiring pekee.
// ══════════════════════════════════════════════════════════════

// Mock implementations (static imports - salama kwa SSR)
import { mockIdentityRepository } from './identityRepository.js'
import { mockContentRepository } from './contentRepository.js'
import { mockActivityRepository } from './activityRepository.js'
import { mockCatalogRepository } from './catalogRepository.js'
import { mockSystemRepository } from './systemRepository.js'
import { mockChatRepository } from './chatRepository.js'
import { mockGunduaRepository } from './gunduaRepository.js'
import { mockSpacesRepository } from './spacesRepository.js'

/* ── Mode detection (SSR-safe) ─────────────────────────────── */
function checkIsLive() {
  try {
    const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}
    return env.VITE_SUPABASE_MODE === 'live' && 
           env.VITE_SUPABASE_URL && 
           env.VITE_SUPABASE_PUBLISHABLE_KEY
  } catch {
    return false
  }
}

/* ── Lazy Supabase repository loader ─────────────────────────
   Kwa sababu ya Vite SSR bundler TDZ issues, Supabase repos
   zinapakia kwa njia ya dynamic import wakati wa kwanza kutumika.
   
   Hii inamaanisha:
   - Mock mode: repositories zipo moja kwa moja (sync)
   - Live mode: repositories zinapakia kwa async (kwanza tu)
   - Baada ya kupakia, zinafanya kazi kama kawaida
   ─────────────────────────────────────────────────────────── */

const supabaseRepos = {
  content: null,
  identity: null,
  chat: null,
  activity: null,
  friendship: null,
}

const loadPromises = {
  content: null,
  identity: null,
  chat: null,
  activity: null,
  friendship: null,
}

async function loadSupabaseRepo(name) {
  if (supabaseRepos[name]) return supabaseRepos[name]
  
  if (!loadPromises[name]) {
    const loaders = {
      content: () => import('./supabaseContentRepository.js').then(m => m.supabaseContentRepository),
      identity: () => import('./supabaseIdentityRepository.js').then(m => m.supabaseIdentityRepository),
      chat: () => import('./supabaseChatRepository.js').then(m => m.supabaseChatRepository),
      activity: () => import('./supabaseActivityRepository.js').then(m => m.supabaseActivityRepository),
      friendship: () => import('./supabaseFriendshipRepository.js').then(m => m.supabaseFriendshipRepository),
    }
    
    loadPromises[name] = loaders[name]().then(repo => {
      supabaseRepos[name] = repo
      return repo
    }).catch(err => {
      console.error(`[Repository] Imeshindwa kupakia Supabase ${name}:`, err)
      return null
    })
  }
  
  return loadPromises[name]
}

/* ── Repository proxy (sync interface, async loading) ─────── */
function createRepositoryProxy(mockRepo, supabaseName) {
  const isLive = checkIsLive()
  
  if (!isLive) {
    return mockRepo
  }
  
  // Katika live mode, tumia Proxy ili kupakia Supabase repo kwa lazy
  // MUHIMU: Hakuna fallback kwa mock — ikiwa Supabase inashindwa, toa error
  return new Proxy(mockRepo, {
    get(target, prop) {
      // Ikiwa Supabase repo imepakia, itumie
      if (supabaseRepos[supabaseName] && supabaseRepos[supabaseName][prop]) {
        return supabaseRepos[supabaseName][prop]
      }
      
      // Ikiwa Supabase repo imeshindwa kupakia, toa error
      if (loadPromises[supabaseName] && !supabaseRepos[supabaseName]) {
        // Subiri kidogo kisha angalia tena
        throw new Error(
          `[Repository] Live mode: Supabase ${supabaseName} repository imeshindwa kupakia. ` +
          `Hakikisha credentials ni sahihi na mtandao unafanya kazi.`
        )
      }
      
      // Anza kupakia Supabase repo (async)
      if (!supabaseRepos[supabaseName] && !loadPromises[supabaseName]) {
        loadSupabaseRepo(supabaseName).catch(err => {
          console.error(`[Repository] Live mode: Imeshindwa kupakia Supabase ${supabaseName}:`, err)
        })
      }
      
      // Ikiwa bado inapakia, toa error badala ya kurudisha mock
      throw new Error(
        `[Repository] Live mode: Supabase ${supabaseName} repository bado inapakia. ` +
        `Tumia await waitForSupabaseRepos() kabla ya kutumia repositories.`
      )
    }
  })
}

/* ── Implementations za sasa ─────────────────────────────────
   Mock mode: repositories zipo moja kwa moja.
   Live mode: repositories zinapakia kwa lazy (Proxy).
   ─────────────────────────────────────────────────────────── */

export const contentRepository = createRepositoryProxy(mockContentRepository, 'content')
export const identityRepository = createRepositoryProxy(mockIdentityRepository, 'identity')
export const chatRepository = createRepositoryProxy(mockChatRepository, 'chat')
export const activityRepository = createRepositoryProxy(mockActivityRepository, 'activity')

/* Gundua: friend requests/marafiki ni live (friendships) katika live mode.
   Methods nyingine za Gundua (discovery, vikundi, vyumba) bado ni mock —
   zimeandikwa kwenye ripoti kama mapungufu, hazijaigwa kama live. */
const LIVE_GUNDUA_METHODS = new Set([
  'addFriend',
  'respondFriend',
  'cancelFriend',
  'getFriendRequests',
  'getFriends',
])

function createGunduaRepository(mockRepo) {
  if (!checkIsLive()) return mockRepo
  return new Proxy(mockRepo, {
    get(target, prop) {
      if (LIVE_GUNDUA_METHODS.has(prop)) {
        return async (...args) => {
          const repo = await loadSupabaseRepo('friendship')
          if (!repo) throw new Error('Friendship repository imeshindwa kupakia. Jaribu tena.')
          return repo[prop](...args)
        }
      }
      return target[prop]
    },
  })
}

// Hizi bado ni mock pekee (Supabase repos hazijaandaliwa bado)
export const catalogRepository = mockCatalogRepository
export const systemRepository = mockSystemRepository
export const gunduaRepository = createGunduaRepository(mockGunduaRepository)
export const spacesRepository = mockSpacesRepository

/* ── Mode export (kwa debugging) ─────────────────────────── */
export const REPOSITORY_MODE = checkIsLive() ? 'supabase' : 'mock'

/* ── Helper: Subiri Supabase repos zipakie (kwa testing) ── */
export async function waitForSupabaseRepos() {
  if (!checkIsLive()) return

  const names = ['content', 'identity', 'chat', 'activity', 'friendship']
  const results = await Promise.all(names.map((name) => loadSupabaseRepo(name)))
  // loadSupabaseRepo hurudisha null kwenye kushindwa (haitupi). Hapa tunapiga error wazi
  // badala ya kuruhusu UI ifanye kazi kwa repository isiyopakiwa.
  const failed = names.filter((_, i) => !results[i])
  if (failed.length) {
    throw new Error(`Supabase repositories zimeshindwa kupakia: ${failed.join(', ')}. Angalia mtandao au build.`)
  }
}
