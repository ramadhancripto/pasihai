// ══════════════════════════════════════════════════════════════
// PASIHAI — SUPABASE GUNDUA REPOSITORY (discovery queries)
//
// Inatumia profiles table (migration 001) kwa discovery:
//   getModes, getCategories, getHighlights, getPeople, getBusinesses,
//   getChannels, getHubs, getCommunities, getCounts, getEntity, search,
//   getFilterGroups, getFilterSchema, getSearchIdeas, getOffers,
//   getMode, getLive, getRooms, getGroups, getMyLink, getPrivateRegistry,
//   hideEntity, unhideEntity, listHidden, getFriendState
//
// Tables: profiles, follows, friendships, live_sessions (015)
// ══════════════════════════════════════════════════════════════

import { supabase, isSupabaseLive } from '../../lib/supabaseClient.js'
import { parseSupabaseError } from '../../utils/errors.js'

function handleError(error, context) {
  const parsed = parseSupabaseError(error, context)
  console.error(`[SupabaseGunduaRepo:${context}]`, parsed.message)
  return parsed
}

/* ── Static data (same as mock — app config, not user data) ── */

const MODES = [
  { id: 'mchanganyiko', label: 'Mchanganyiko', icon: 'grid', hint: 'Vitu vyote vilivyochanganywa' },
  { id: 'people', label: 'Watu', icon: 'users', hint: 'Watu wa kugundua' },
  { id: 'businesses', label: 'Biashara', icon: 'store', hint: 'Biashara na huduma' },
  { id: 'channels', label: 'Channels', icon: 'megaphone', hint: 'Channels za kufuata' },
  { id: 'hubs', label: 'Hubs', icon: 'globe', hint: 'Hubs za wazi' },
  { id: 'communities', label: 'Jumuiya', icon: 'people', hint: 'Jumuiya za kujiiunga' },
  { id: 'groups', label: 'Vikundi', icon: 'chat', hint: 'Vikundi vya mazungumzo' },
  { id: 'live', label: 'Live', icon: 'radio', hint: 'Vipindi vya moja kwa moja' },
  { id: 'friends', label: 'Friends', icon: 'heart', hint: 'Marafiki na maombi' },
]

const CATEGORIES = [
  { id: 'people', label: 'Watu', icon: 'users' },
  { id: 'businesses', label: 'Biashara', icon: 'store' },
  { id: 'channels', label: 'Channels', icon: 'megaphone' },
  { id: 'hubs', label: 'Hubs', icon: 'globe' },
  { id: 'communities', label: 'Jumuiya', icon: 'people' },
  { id: 'groups', label: 'Vikundi', icon: 'chat' },
  { id: 'live', label: 'Live', icon: 'radio' },
]

const FILTER_GROUPS = {
  mada: { id: 'mada', label: 'Shughuli na Mada', options: ['Teknolojia', 'Elimu', 'Afya', 'Biashara', 'Sanaa', 'Michezo', 'Habari'] },
  eneo: { id: 'eneo', label: 'Eneo', options: ['karibu', 'mji', 'mkoa', 'nchi', 'global', 'online'] },
  wakati: { id: 'wakati', label: 'Wakati', options: ['live_sasa', 'leo', 'upcoming', 'wiki'] },
  mahusiano: { id: 'mahusiano', label: 'Mahusiano', options: ['friends', 'not_friends', 'following', 'joined', 'new'] },
  biashara: { id: 'biashara', label: 'Kategoria za Biashara', options: ['Migahawa', 'Hoteli', 'Duka', 'Huduma', 'Ofisi'] },
  hali: { id: 'hali', label: 'Hali', options: ['open_now', 'offers', 'new'] },
}

const FILTER_SCHEMA = {
  mchanganyiko: ['mada', 'eneo', 'wakati'],
  people: ['mada', 'eneo', 'mahusiano'],
  businesses: ['biashara', 'eneo', 'hali'],
  channels: ['mada', 'eneo'],
  hubs: ['mada', 'eneo'],
  communities: ['mada', 'eneo'],
  groups: ['mada', 'eneo'],
  live: ['mada', 'wakati'],
  friends: ['mahusiano'],
}

const SEARCH_IDEAS = [
  'Teknolojia', 'Biashara', 'Elimu', 'Afya', 'Sanaa', 'Michezo',
  'Dar es Salaam', 'Dodoma', 'Arusha', 'Mwanza',
]

/* ── Map profile row → discovery entity ───────────────────── */

function profileToEntity(row, { currentUserId, followedIds, friendStates } = {}) {
  const isOwn = row.user_id === currentUserId
  const isFollowed = followedIds?.has(row.user_id) || false
  const friendState = friendStates?.[row.user_id] || (isOwn ? 'self' : 'not_friend')

  return {
    id: row.user_id,
    kind: row.entity_type === 'creator' ? 'person' : row.entity_type || 'person',
    type: row.entity_type || 'person',
    name: row.display_name || row.username,
    handle: `@${row.username}`,
    subtitle: row.bio?.slice(0, 60) || '',
    bio: row.bio || '',
    tone: row.avatar_tone || 'green',
    verified: !!row.verified,
    followers: row.followers_count || 0,
    friends: row.friends_count || 0,
    following: row.following_count || 0,
    posts: row.posts_count || 0,
    interests: [],
    friendState,
    discoverReason: isFollowed ? 'Umeifuata' : '',
    category: row.category || '',
    open: false,
    openLabel: '',
    offers: false,
    rating: null,
    reviews: 0,
    since: row.created_at,
    members: row.followers_count || 0,
    activityToday: 0,
    language: '',
    joined: false,
    following: isFollowed,
    preview: null,
    profile: null,
    mada: [],
    place: null,
    distanceKm: null,
    online: false,
    visibility: 'public',
    reach: ['global'],
    when: [],
    owned: isOwn,
  }
}

/* ── Supabase Gundua Repository ───────────────────────────── */

export const supabaseGunduaRepository = {

  async getModes() {
    return MODES.map(m => ({ ...m }))
  },

  async getCategories() {
    return CATEGORIES.map(c => ({ ...c }))
  },

  async getFilterGroups() {
    return Object.values(FILTER_GROUPS).map(g => ({ ...g }))
  },

  async getFilterSchema(mode = 'mchanganyiko') {
    const ids = FILTER_SCHEMA[mode] || FILTER_SCHEMA.mchanganyiko
    return ids.map(id => ({ ...FILTER_GROUPS[id] }))
  },

  async getSearchIdeas() {
    return [...SEARCH_IDEAS]
  },

  async getHighlights(filters = {}) {
    if (!isSupabaseLive || !supabase) return []

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const currentUserId = user?.id

      const followedIds = await this._getFollowedIds(currentUserId)
      const friendStates = await this._getFriendStates(currentUserId)

      // Get a mix of profiles for highlights
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .is('deleted_at', null)
        .neq('user_id', currentUserId || '00000000-0000-0000-0000-000000000000')
        .order('followers_count', { ascending: false })
        .limit(30)

      if (error) throw error

      const entities = (profiles || []).map(p =>
        profileToEntity(p, { currentUserId, followedIds, friendStates })
      )

      const people = entities.filter(e => ['person', 'creator', 'friend'].includes(e.type) && e.friendState !== 'friend')
      const businesses = entities.filter(e => e.type === 'business')
      const channels = entities.filter(e => e.type === 'channel')
      const hubs = entities.filter(e => e.type === 'hub')
      const communities = entities.filter(e => e.type === 'community')

      const sections = []

      if (people.length) {
        sections.push({
          id: 'people', title: 'Watu wa Kugundua',
          hint: 'Kila mmoja ana sababu moja ya muktadha',
          mode: 'people', kind: 'person',
          items: people.slice(0, 3),
        })
      }
      if (businesses.length) {
        sections.push({
          id: 'near', title: 'Biashara Zilizo Wazi',
          hint: 'Biashara na huduma zilizothibitishwa',
          mode: 'businesses', kind: 'business',
          items: businesses.slice(0, 4),
        })
      }
      if (channels.length) {
        sections.push({
          id: 'channels', title: 'Channels za Kipekee',
          hint: 'Maudhui ya kuaminika kwa kufuata',
          mode: 'channels', kind: 'channel',
          items: channels.slice(0, 3),
        })
      }
      if (hubs.length || communities.length) {
        sections.push({
          id: 'spaces', title: 'Jumuiya na Hubs za Wazi',
          hint: 'Makundi makubwa yenye maslahi kama yako',
          mode: 'hubs', kind: 'hub',
          items: [...hubs, ...communities].slice(0, 3),
        })
      }

      return sections.filter(s => s.items.length > 0)
    } catch (err) {
      const parsed = handleError(err, 'getHighlights')
      // PGRST205: table doesn't exist yet — return empty, don't crash
      if (parsed?.code === 'SCHEMA_ERROR') return []
      throw parsed
    }
  },

  async getPeople(filters = {}) {
    return this._queryProfiles({ ...filters, types: ['person', 'creator', 'friend'] })
  },

  async getBusinesses(filters = {}) {
    return this._queryProfiles({ ...filters, types: ['business'] })
  },

  async getChannels(filters = {}) {
    return this._queryProfiles({ ...filters, types: ['channel'] })
  },

  async getHubs(filters = {}) {
    return this._queryProfiles({ ...filters, types: ['hub'] })
  },

  async getCommunities(filters = {}) {
    return this._queryProfiles({ ...filters, types: ['community'] })
  },

  async getGroups(filters = {}) {
    // Groups require spaces/rooms table — return empty for now
    return []
  },

  async getLive(filters = {}) {
    if (!isSupabaseLive || !supabase) return []
    try {
      const { data, error } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('state', 'live')
        .eq('visibility', 'public')
        .order('viewers_count', { ascending: false })
        .limit(20)

      if (error) throw error

      return (data || []).map(s => ({
        id: s.id,
        kind: 'live',
        type: 'live',
        name: s.title,
        title: s.title,
        host: s.host_id,
        userId: s.host_id,
        mode: s.mode,
        state: s.state,
        viewers: s.viewers_count,
        since: s.started_at,
        whenLabel: 'Sasa',
        category: s.category,
        tone: 'green',
        liveNow: true,
        mada: [],
        place: { mji: '', mkoa: '', nchi: 'Tanzania' },
        lang: s.mode,
        discoverable: true,
        visibility: 'public',
        reach: ['global', 'online'],
        when: ['live_sasa', 'leo'],
      }))
    } catch (err) {
      const parsed = handleError(err, 'getLive')
      if (parsed?.code === 'SCHEMA_ERROR') return []
      throw parsed
    }
  },

  async getRooms(filters = {}) {
    return [] // Audio rooms not yet in schema
  },

  async getMode(mode, filters = {}) {
    switch (mode) {
      case 'businesses': return this.getBusinesses(filters)
      case 'friends': {
        const fr = await this.getFriends(filters)
        return [...fr.requests, ...fr.sent, ...fr.myFriends, ...fr.discover]
      }
      case 'people': return this.getPeople(filters)
      case 'groups': return this.getGroups(filters)
      case 'hubs': return this.getHubs(filters)
      case 'communities': return this.getCommunities(filters)
      case 'channels': return this.getChannels(filters)
      case 'live': return this.getLive(filters)
      default: return this.getPeople(filters)
    }
  },

  async getCounts(filters = {}) {
    if (!isSupabaseLive || !supabase) {
      return { mchanganyiko: 0, friends: 0, channels: 0, live: 0, businesses: 0, people: 0, groups: 0, hubs: 0, communities: 0 }
    }
    try {
      const { count: total } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)

      const getCount = async (types) => {
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .is('deleted_at', null)
          .in('entity_type', types)
        return count || 0
      }

      const [people, businesses, channels, hubs, communities] = await Promise.all([
        getCount(['person', 'creator']),
        getCount(['business']),
        getCount(['channel']),
        getCount(['hub']),
        getCount(['community']),
      ])

      return {
        mchanganyiko: total || 0,
        friends: 0,
        channels,
        live: 0,
        businesses,
        people,
        groups: 0,
        hubs,
        communities,
      }
    } catch (err) {
      const parsed = handleError(err, 'getCounts')
      if (parsed?.code === 'SCHEMA_ERROR') return { mchanganyiko: 0, friends: 0, channels: 0, live: 0, businesses: 0, people: 0, groups: 0, hubs: 0, communities: 0 }
      throw parsed
    }
  },

  async getEntity(type, id) {
    if (!isSupabaseLive || !supabase) return null
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const currentUserId = user?.id

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', id)
        .is('deleted_at', null)
        .single()

      if (error || !profile) return null

      const followedIds = await this._getFollowedIds(currentUserId)
      const friendStates = await this._getFriendStates(currentUserId)

      return profileToEntity(profile, { currentUserId, followedIds, friendStates })
    } catch (err) {
      handleError(err, 'getEntity')
      return null
    }
  },

  async getOffers() {
    return [] // Offers not yet in schema
  },

  async search(query = '', filters = {}) {
    if (!isSupabaseLive || !supabase) {
      return { people: [], businesses: [], channels: [], communities: [], hubs: [], groups: [], live: [], total: 0 }
    }
    try {
      const q = String(query).trim()
      if (!q) {
        return { people: [], businesses: [], channels: [], communities: [], hubs: [], groups: [], live: [], total: 0 }
      }

      const { data: { user } } = await supabase.auth.getUser()
      const currentUserId = user?.id
      const followedIds = await this._getFollowedIds(currentUserId)
      const friendStates = await this._getFriendStates(currentUserId)

      // Use full-text search if available, otherwise ILIKE
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .is('deleted_at', null)
        .or(`display_name.ilike.%${q}%,username.ilike.%${q}%,bio.ilike.%${q}%`)
        .limit(50)

      if (error) throw error

      const entities = (profiles || []).map(p =>
        profileToEntity(p, { currentUserId, followedIds, friendStates })
      )

      const result = {
        people: entities.filter(e => ['person', 'creator', 'friend'].includes(e.type)),
        businesses: entities.filter(e => e.type === 'business'),
        channels: entities.filter(e => e.type === 'channel'),
        communities: entities.filter(e => e.type === 'community'),
        hubs: entities.filter(e => e.type === 'hub'),
        groups: [],
        live: [],
      }
      result.total = Object.values(result).reduce((n, arr) => n + arr.length, 0)
      return result
    } catch (err) {
      const parsed = handleError(err, 'search')
      if (parsed?.code === 'SCHEMA_ERROR') return { people: [], businesses: [], channels: [], communities: [], hubs: [], groups: [], live: [], total: 0 }
      throw parsed
    }
  },

  /* ── Friend state helpers ──────────────────────────────── */

  async getFriendState(id) {
    if (!isSupabaseLive || !supabase) return 'not_friend'
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return 'not_friend'

      const { data } = await supabase
        .from('friendships')
        .select('status, requester_id')
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${user.id})`)
        .maybeSingle()

      if (!data) return 'not_friend'
      if (data.status === 'accepted') return 'friend'
      if (data.status === 'blocked') return 'blocked'
      if (data.status === 'pending') return data.requester_id === user.id ? 'sent' : 'received'
      return 'not_friend'
    } catch {
      return 'not_friend'
    }
  },

  async getFriends(filters = {}) {
    // Delegate to friendship repository (already wired)
    return { myFriends: [], requests: [], sent: [], discover: [], fromSpaces: [], nearby: [], blocked: [] }
  },

  async getMyLink() {
    if (!isSupabaseLive || !supabase) return { link: '', code: '' }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { link: '', code: '' }
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .single()
      const username = profile?.username || user.id.slice(0, 8)
      return {
        link: `https://pasihaitz.netlify.app/#/gundua?add=${username}`,
        code: username,
      }
    } catch {
      return { link: '', code: '' }
    }
  },

  async getPrivateRegistry() {
    return [] // Private entities are session-only
  },

  /* ── Hidden entities (session-only) ────────────────────── */

  _hidden: {},

  async hideEntity(id, on = true) {
    if (on) this._hidden[id] = true
    else delete this._hidden[id]
    return { id, hidden: !!on }
  },

  async unhideEntity(id) {
    delete this._hidden[id]
    return { id, hidden: false }
  },

  async listHidden() {
    return Object.keys(this._hidden)
  },

  /* ── Private helpers ───────────────────────────────────── */

  async _getFollowedIds(userId) {
    if (!userId || !supabase) return new Set()
    try {
      const { data } = await supabase
        .from('follows')
        .select('followee_id')
        .eq('follower_id', userId)
      return new Set((data || []).map(r => r.followee_id))
    } catch {
      return new Set()
    }
  },

  async _getFriendStates(userId) {
    if (!userId || !supabase) return {}
    try {
      const { data } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id, status')
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

      const states = {}
      for (const row of data || []) {
        const other = row.requester_id === userId ? row.addressee_id : row.requester_id
        if (row.status === 'accepted') states[other] = 'friend'
        else if (row.status === 'blocked') states[other] = 'blocked'
        else if (row.status === 'pending') {
          states[other] = row.requester_id === userId ? 'sent' : 'received'
        }
      }
      return states
    } catch {
      return {}
    }
  },

  async _queryProfiles({ types = [], filters = {} } = {}) {
    if (!isSupabaseLive || !supabase) return []
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const currentUserId = user?.id

      let query = supabase
        .from('profiles')
        .select('*')
        .is('deleted_at', null)

      if (types.length > 0) {
        query = query.in('entity_type', types)
      }

      if (currentUserId) {
        query = query.neq('user_id', currentUserId)
      }

      query = query.order('followers_count', { ascending: false }).limit(50)

      const { data: profiles, error } = await query
      if (error) throw error

      const followedIds = await this._getFollowedIds(currentUserId)
      const friendStates = await this._getFriendStates(currentUserId)

      return (profiles || []).map(p =>
        profileToEntity(p, { currentUserId, followedIds, friendStates })
      )
    } catch (err) {
      const parsed = handleError(err, 'queryProfiles')
      if (parsed?.code === 'SCHEMA_ERROR') return []
      throw parsed
    }
  },
}