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
function checkIsLive() {
  return supabaseConfig.isLive
}

/* ── Lazy Supabase repository loader ───────────────────────── */

const supabaseRepos = {
  content: null,
  identity: null,
  chat: null,
  activity: null,
  friendship: null,
  gunduaDiscovery: null,
  spaces: null,
}

const loadPromises = {
  content: null,
  identity: null,
  chat: null,
  activity: null,
  friendship: null,
  gunduaDiscovery: null,
  spaces: null,
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
      gunduaDiscovery: () => import('./supabaseGunduaRepository.js').then(m => m.supabaseGunduaRepository),
      spaces: () => import('./supabaseSpacesRepository.js').then(m => m.supabaseSpacesRepository),
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

  return new Proxy(mockRepo, {
    get(target, prop) {
      if (supabaseRepos[supabaseName] && supabaseRepos[supabaseName][prop]) {
        return supabaseRepos[supabaseName][prop]
      }

      if (loadPromises[supabaseName] && !supabaseRepos[supabaseName]) {
        throw new Error(
          `[Repository] Live mode: Supabase ${supabaseName} repository imeshindwa kupakia. ` +
          `Hakikisha credentials ni sahihi na mtandao unafanya kazi.`
        )
      }

      if (!supabaseRepos[supabaseName] && !loadPromises[supabaseName]) {
        loadSupabaseRepo(supabaseName).catch(err => {
          console.error(`[Repository] Live mode: Imeshindwa kupakia Supabase ${supabaseName}:`, err)
        })
      }

      if (typeof prop === 'symbol' || prop === 'then') return undefined

      if (supabaseRepos[supabaseName]) {
        return () => Promise.reject(liveNotImplemented(`${supabaseName}.${String(prop)}`))
      }

      throw new Error(
        `[Repository] Live mode: Supabase ${supabaseName} repository bado inapakia. ` +
        `Tumia await waitForSupabaseRepos() kabla ya kutumia repositories.`
      )
    }
  })
}

/* Kosa la wazi kwa method ambayo haijaunganishwa na live. */
export function liveNotImplemented(name) {
  const err = new Error(`Kipengele hiki bado hakijaunganishwa na Supabase live: ${name}`)
  err.code = 'LIVE_NOT_IMPLEMENTED'
  return err
}

/* Repo ya mock isiyo na Supabase: kwenye live, `allowed` methods zinaruhusiwa. */
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

/* ── Implementations za sasa ───────────────────────────────── */

export const contentRepository = createRepositoryProxy(mockContentRepository, 'content')
export const identityRepository = createRepositoryProxy(mockIdentityRepository, 'identity')
export const chatRepository = createRepositoryProxy(mockChatRepository, 'chat')
export const activityRepository = createRepositoryProxy(mockActivityRepository, 'activity')

/* ── Gundua: discovery + friendships ────────────────────────
   Discovery methods (getModes, getBusinesses, etc.) → supabaseGunduaRepository
   Friendship methods (addFriend, getFriends, etc.)  → supabaseFriendshipRepository
   ─────────────────────────────────────────────────────────── */

const LIVE_GUNDUA_DISCOVERY_METHODS = new Set([
  'getModes',
  'getCategories',
  'getFilterGroups',
  'getFilterSchema',
  'getSearchIdeas',
  'getHighlights',
  'getPeople',
  'getBusinesses',
  'getChannels',
  'getHubs',
  'getCommunities',
  'getGroups',
  'getLive',
  'getRooms',
  'getMode',
  'getCounts',
  'getEntity',
  'getOffers',
  'search',
  'getMyLink',
  'getPrivateRegistry',
  'getFriendState',
  'hideEntity',
  'unhideEntity',
  'listHidden',
])

const LIVE_GUNDUA_FRIENDSHIP_METHODS = new Set([
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
      // Friendship methods → supabaseFriendshipRepository
      if (LIVE_GUNDUA_FRIENDSHIP_METHODS.has(prop)) {
        return async (...args) => {
          const repo = await loadSupabaseRepo('friendship')
          if (!repo) throw new Error('Friendship repository imeshindwa kupakia. Jaribu tena.')
          return repo[prop](...args)
        }
      }
      // Discovery methods → supabaseGunduaRepository
      if (LIVE_GUNDUA_DISCOVERY_METHODS.has(prop)) {
        return async (...args) => {
          const repo = await loadSupabaseRepo('gunduaDiscovery')
          if (!repo) throw new Error('Gundua discovery repository imeshindwa kupakia. Jaribu tena.')
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

export const gunduaRepository = createGunduaRepository(mockGunduaRepository)

/* ── Catalog: static app config data (works in both modes) ─ */
export const catalogRepository = liveGuard(mockCatalogRepository, 'catalogRepository', {
  getHomeTabs: async () => mockCatalogRepository.getHomeTabs(),
  getContentFilters: async () => mockCatalogRepository.getContentFilters(),
  getViewModes: async () => mockCatalogRepository.getViewModes(),
  getFeedPreferences: async () => mockCatalogRepository.getFeedPreferences(),
  getProductInfo: async (key) => mockCatalogRepository.getProductInfo(key),
  getEntityVocabulary: async () => mockCatalogRepository.getEntityVocabulary(),
})

/* ── System: device-local + connection ────────────────────── */
export const systemRepository = liveGuard(mockSystemRepository, 'systemRepository', {
  getConnection: async () => ({
    state: typeof navigator !== 'undefined' && navigator.onLine === false ? 'OFFLINE' : 'ONLINE',
    source: 'navigator.onLine',
  }),
  getDataSaved: async (scope = 'today') => mockSystemRepository.getDataSaved(scope),
  getCache: async () => mockSystemRepository.getCache(),
  getScenarioKey: async () => mockSystemRepository.getScenarioKey(),
  getRelayPolicy: async () => mockSystemRepository.getRelayPolicy(),
  getLocalMesh: async () => mockSystemRepository.getLocalMesh(),
  getInternetRelay: async () => mockSystemRepository.getInternetRelay(),
  setInternetRelayEnabled: async (on) => mockSystemRepository.setInternetRelayEnabled(on),
  setRelayDailyLimit: async (mb) => mockSystemRepository.setRelayDailyLimit(mb),
  getRelayMessages: async () => mockSystemRepository.getRelayMessages(),
  getRelayChoices: async () => mockSystemRepository.getRelayChoices(),
  setRelayChoice: async (id, on) => mockSystemRepository.setRelayChoice(id, on),
  relayMessage: async (payload) => mockSystemRepository.relayMessage(payload),
  getTransports: async () => mockSystemRepository.getTransports(),
  listQueue: async () => mockSystemRepository.listQueue(),
  syncQueue: async () => mockSystemRepository.syncQueue(),
  enqueue: async (item) => mockSystemRepository.enqueue(item),
  getNearby: async () => mockSystemRepository.getNearby(),
  getActivity: async () => mockSystemRepository.getActivity(),
  getOfflineables: async () => mockSystemRepository.getOfflineables(),
  saveOffline: async (id) => mockSystemRepository.saveOffline(id),
  getLocalContent: async () => mockSystemRepository.getLocalContent(),
  shareNearby: async (id) => mockSystemRepository.shareNearby(id),
  getDeliveryOptions: async () => mockSystemRepository.getDeliveryOptions(),
  getPrefs: async () => mockSystemRepository.getPrefs(),
  savePrefs: async (patch) => mockSystemRepository.savePrefs(patch),
})

/* ── Spaces: Supabase live implementation ─────────────────── */
export const spacesRepository = createRepositoryProxy(mockSpacesRepository, 'spaces')

/* ── Sajili repos kwa lazyRepo ────────────────────────────── */
registerRepo('identityRepository', identityRepository)
registerRepo('contentRepository', contentRepository)
registerRepo('systemRepository', systemRepository)
registerRepo('gunduaRepository', gunduaRepository)

/* ── Mode export (kwa debugging) ─────────────────────────── */
export const REPOSITORY_MODE = checkIsLive() ? 'supabase' : 'mock'

/* ── Helper: Subiri Supabase repos zipakie (kwa testing) ── */
export async function waitForSupabaseRepos() {
  if (!checkIsLive()) return

  const names = ['content', 'identity', 'chat', 'activity', 'friendship', 'gunduaDiscovery', 'spaces']
  const results = await Promise.all(names.map((name) => loadSupabaseRepo(name)))
  const failed = names.filter((_, i) => !results[i])
  if (failed.length) {
    throw new Error(`Supabase repositories zimeshindwa kupakia: ${failed.join(', ')}. Angalia mtandao au build.`)
  }
}