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
import { supabaseConfig } from '../../lib/supabaseConfig.js'
import { registerRepo } from './lazyRepo.js'
import { mockIdentityRepository } from './identityRepository.js'
import { mockContentRepository } from './contentRepository.js'
import { mockActivityRepository } from './activityRepository.js'
import { mockCatalogRepository } from './catalogRepository.js'
import { mockSystemRepository } from './systemRepository.js'
import { mockChatRepository } from './chatRepository.js'
import { mockGunduaRepository } from './gunduaRepository.js'
import { mockSpacesRepository } from './spacesRepository.js'

/* ── Mode detection (SSR-safe) ─────────────────────────────── */
// Chanzo kimoja cha ukweli: supabaseConfig.js. Live ni kweli TU ikiwa
// mode ni 'live' na hakuna tatizo la usanidi. Hakuna fallback kimya.
function checkIsLive() {
  return supabaseConfig.isLive
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
      
      // Symbols na 'then' (await/thenable checks) hazipaswi kutupa
      if (typeof prop === 'symbol' || prop === 'then') return undefined

      // Repo imepakia lakini method haipo kwenye Supabase: kataa wazi, usirudishe mock
      if (supabaseRepos[supabaseName]) {
        return () => Promise.reject(liveNotImplemented(`${supabaseName}.${String(prop)}`))
      }

      // Ikiwa bado inapakia, toa error badala ya kurudisha mock
      throw new Error(
        `[Repository] Live mode: Supabase ${supabaseName} repository bado inapakia. ` +
        `Tumia await waitForSupabaseRepos() kabla ya kutumia repositories.`
      )
    }
  })
}

/* Kosa la wazi kwa method ambayo haijaunganishwa na live. Hairudishi data ya mock. */
export function liveNotImplemented(name) {
  const err = new Error(`Kipengele hiki bado hakijaunganishwa na Supabase live: ${name}`)
  err.code = 'LIVE_NOT_IMPLEMENTED'
  return err
}

/* Repo ya mock isiyo na Supabase: kwenye live, kila function inakataliwa wazi.
   `allowed` ni methods zenye toleo halisi la live. */
function liveGuard(mockRepo, label, allowed = {}) {
  if (!checkIsLive()) return mockRepo
  return new Proxy(mockRepo, {
    get(target, prop) {
      if (typeof prop === 'symbol' || prop === 'then') return undefined
      if (Object.prototype.hasOwnProperty.call(allowed, prop)) return allowed[prop]
      const value = target[prop]
      if (typeof value === 'function') {
        return () => Promise.reject(liveNotImplemented(`${label}.${String(prop)}`))
      }
      return value
    },
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
      if (typeof target[prop] === 'function') {
        return () => Promise.reject(liveNotImplemented(`gunduaRepository.${String(prop)}`))
      }
      return target[prop]
    },
  })
}

// Hizi hazina toleo la Supabase. Kwenye live zinakataliwa wazi; hazirudishi mock.
// Isipokuwa: connection ya kivinjari (navigator.onLine) ni hali halisi ya kivinjari, si uthibitisho wa seva.
export const catalogRepository = liveGuard(mockCatalogRepository, 'catalogRepository')
export const systemRepository = liveGuard(mockSystemRepository, 'systemRepository', {
  getConnection: async () => ({
    state: typeof navigator !== 'undefined' && navigator.onLine === false ? 'OFFLINE' : 'ONLINE',
    source: 'navigator.onLine',
  }),
})
export const gunduaRepository = createGunduaRepository(mockGunduaRepository)
export const spacesRepository = liveGuard(mockSpacesRepository, 'spacesRepository')

/* Sajili repos kwa lazyRepo (spacesRepository.js inazitumia wakati wa kuitwa; hakuna mzunguko wa imports). */
registerRepo('identityRepository', identityRepository)
registerRepo('contentRepository', contentRepository)
registerRepo('systemRepository', systemRepository)
registerRepo('gunduaRepository', gunduaRepository)

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
