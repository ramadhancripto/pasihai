// PASIHAI — composition root. Product = live Supabase pekee.
// Hakuna mock repositories kwenye runtime ya bidhaa.

import { supabaseConfig } from '../../lib/supabaseConfig.js'
import { registerRepo } from './lazyRepo.js'
import { catalogRepository as staticCatalog } from './catalogRepository.js'

function checkIsLive() {
  return supabaseConfig.isLive
}

const supabaseRepos = {
  content: null,
  identity: null,
  chat: null,
  activity: null,
  friendship: null,
  gunduaDiscovery: null,
  spaces: null,
  system: null,
  contacts: null,
}

const loadPromises = { ...Object.fromEntries(Object.keys(supabaseRepos).map((k) => [k, null])) }

async function loadSupabaseRepo(name) {
  if (supabaseRepos[name]) return supabaseRepos[name]
  if (!loadPromises[name]) {
    const loaders = {
      content: () => import('./supabaseContentRepository.js').then((m) => m.supabaseContentRepository),
      identity: () => import('./supabaseIdentityRepository.js').then((m) => m.supabaseIdentityRepository),
      chat: () => import('./supabaseChatRepository.js').then((m) => m.supabaseChatRepository),
      activity: () => import('./supabaseActivityRepository.js').then((m) => m.supabaseActivityRepository),
      friendship: () => import('./supabaseFriendshipRepository.js').then((m) => m.supabaseFriendshipRepository),
      gunduaDiscovery: () => import('./supabaseGunduaRepository.js').then((m) => m.supabaseGunduaRepository),
      spaces: () => import('./supabaseSpacesRepository.js').then((m) => m.supabaseSpacesRepository),
      system: () => import('./supabaseSystemRepository.js').then((m) => m.supabaseSystemRepository),
      contacts: () => import('./supabaseContactsRepository.js').then((m) => m.supabaseContactsRepository),
    }
    loadPromises[name] = loaders[name]()
      .then((repo) => {
        supabaseRepos[name] = repo
        return repo
      })
      .catch((err) => {
        console.error(`[Repository] Imeshindwa kupakia Supabase ${name}:`, err)
        return null
      })
  }
  return loadPromises[name]
}

export function liveNotImplemented(name) {
  const err = new Error(`Kipengele hiki bado hakijaunganishwa na Supabase live: ${name}`)
  err.code = 'LIVE_NOT_IMPLEMENTED'
  return err
}

function unavailableRepository(label) {
  return new Proxy(
    {},
    {
      get(_t, prop) {
        if (typeof prop === 'symbol' || prop === 'then') return undefined
        return () =>
          Promise.reject(
            new Error(`[Repository] ${label}.${String(prop)} inahitaji VITE_SUPABASE_MODE=live na credentials.`),
          )
      },
    },
  )
}

function createLiveRepository(supabaseName) {
  if (!checkIsLive()) return unavailableRepository(supabaseName)
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (supabaseRepos[supabaseName] && supabaseRepos[supabaseName][prop]) {
          return supabaseRepos[supabaseName][prop]
        }
        if (loadPromises[supabaseName] && !supabaseRepos[supabaseName]) {
          throw new Error(
            `[Repository] Live: Supabase ${supabaseName} imeshindwa kupakia. Angalia mtandao na credentials.`,
          )
        }
        if (!supabaseRepos[supabaseName] && !loadPromises[supabaseName]) {
          loadSupabaseRepo(supabaseName).catch(() => {})
        }
        if (typeof prop === 'symbol' || prop === 'then') return undefined
        if (supabaseRepos[supabaseName]) {
          return () => Promise.reject(liveNotImplemented(`${supabaseName}.${String(prop)}`))
        }
        throw new Error(
          `[Repository] Live: ${supabaseName} bado inapakia. Tumia waitForSupabaseRepos().`,
        )
      },
    },
  )
}

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

function createGunduaRepository() {
  if (!checkIsLive()) return unavailableRepository('gunduaRepository')
  return new Proxy(
    {},
    {
      get(_t, prop) {
        if (LIVE_GUNDUA_FRIENDSHIP_METHODS.has(prop)) {
          return async (...args) => {
            const repo = await loadSupabaseRepo('friendship')
            if (!repo) throw new Error('Friendship repository imeshindwa kupakia.')
            return repo[prop](...args)
          }
        }
        if (LIVE_GUNDUA_DISCOVERY_METHODS.has(prop)) {
          return async (...args) => {
            const repo = await loadSupabaseRepo('gunduaDiscovery')
            if (!repo) throw new Error('Gundua discovery imeshindwa kupakia.')
            return repo[prop](...args)
          }
        }
        if (typeof prop === 'symbol' || prop === 'then') return undefined
        return () => Promise.reject(liveNotImplemented(`gunduaRepository.${String(prop)}`))
      },
    },
  )
}

export const contentRepository = createLiveRepository('content')
export const identityRepository = createLiveRepository('identity')
export const chatRepository = createLiveRepository('chat')
export const activityRepository = createLiveRepository('activity')
export const gunduaRepository = createGunduaRepository()
export const catalogRepository = staticCatalog
export const contactsRepository = createLiveRepository('contacts')
export const systemRepository = createLiveRepository('system')
export const spacesRepository = createLiveRepository('spaces')

registerRepo('identityRepository', identityRepository)
registerRepo('contentRepository', contentRepository)
registerRepo('systemRepository', systemRepository)
registerRepo('gunduaRepository', gunduaRepository)

export const REPOSITORY_MODE = checkIsLive() ? 'supabase' : 'unconfigured'

export async function waitForSupabaseRepos() {
  if (!checkIsLive()) return
  const names = ['content', 'identity', 'chat', 'activity', 'friendship', 'gunduaDiscovery', 'spaces', 'system', 'contacts']
  const results = await Promise.all(names.map((name) => loadSupabaseRepo(name)))
  const failed = names.filter((_, i) => !results[i])
  if (failed.length) {
    throw new Error(`Supabase repositories zimeshindwa kupakia: ${failed.join(', ')}.`)
  }
}
