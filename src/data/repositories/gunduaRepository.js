// ══════════════════════════════════════════════════════════════
// PASIHAI — DATA REPOSITORY: GUNDUA (safu ya ugunduzi)
//
// CONTRACT (application layer inaita hizi):
//   getModes() · getCategories() · getFilterGroups() · getFilterSchema(mode)
//   getHighlights(filters)                    → sections za Mchanganyiko
//   getPeople(filters) · getFriends(filters) · getBusinesses(filters)
//   getGroups(filters) · getHubs(filters) · getCommunities(filters)
//   getChannels(filters) · getLive(filters) · getRooms(filters)
//   getMode(mode, filters)                    → results za mode yoyote
//   getCounts(filters)                        → idadi kwa mode/kategoria
//   getEntity(type, id)                       → detail ya umma
//   getOffers() · getSearchIdeas()
//   search(query, filters)                    → matokeo mseto (public pekee)
//   addFriend(id) · respondFriend(id, action) · cancelFriend(id) · getFriendRequests()
//   followChannel(id) · unfollowChannel(id) · join(type, id) · recordJoin(type, id)
//
// KANUNI ZA MSINGI:
//   1. PUBLIC pekee — `visibility !== 'public'` HAIRUDISHWI KAMWE.
//   2. Eneo = relevance, SI ruhusa: `karibu` huchuja NDANI ya public.
//   3. Entity vikanoniki: `users` (identity) + `liveSessions` (Home Live).
//      Gundua haitengenezi watu/biashara/channels/hubs/jumia mpya.
//
// IMPLEMENTATION YA SASA: Mock + in-memory store (mabadiliko ya kikao).
// BAADAYE: FirebaseGunduaRepository (search + geo index) | LocalGunduaRepository.
// ══════════════════════════════════════════════════════════════

import {
  gunduaMyLink,
  users,
  liveSessions,
  gunduaModes,
  gunduaCategories,
  gunduaFilterGroups,
  gunduaFilterSchema,
  gunduaSearchIdeas,
  gunduaPublicGroups,
  gunduaBusinessProfiles,
  gunduaChannelProfiles,
  gunduaLiveMeta,
  gunduaOffers,
  gunduaAudioRooms,
  gunduaPrivateEntities,
} from '../mock.js'

import { mockIdentityRepository as identityRepository } from './identityRepository.js'

/* ── Store (kikao kimoja) ───────────────────────────────────── */

/** Watumiaji wote + uhusiano wao wa sasa (kufuata) — chanzo kimoja:
    identityRepository ndiye anayemiliki hali ya "kufuata" (§ subscriptions). */
async function allUsers() {
  return identityRepository.listUsers()
}

const store = {
  friendStates: {},   // { personId: 'not_friend' | 'sent' | 'received' | 'friend' | 'blocked' }
  joined: { hub: [], community: [], group: [] },
  joinedConversations: {},   // { groupId: conversationId } — kujiunga mara moja pekee
  requestsIn: [{ id: 'fr1', from: 'zawadiStyles', at: 'leo' }],
  chosenPlace: 'Dar es Salaam',
  meCity: 'Dar es Salaam',
  meRegion: 'Dar es Salaam',
}

function init() {
  if (Object.keys(store.friendStates).length) return
  for (const u of Object.values(users)) {
    if (u.friendState) store.friendStates[u.id] = u.friendState
    else if (u.type === 'friend') store.friendStates[u.id] = 'friend'
  }
}
init()

/* ── Ujenzi wa entity za ugunduzi (public pekee) ─────────────── */

const DIST = { '100m': 0.1, '1km': 1, '5km': 5, '10km': 10, '25km': 25, '45km': 45 }

function reachOf(item) {
  const reach = []
  if (typeof item.distanceKm === 'number') reach.push('karibu')
  if (item.place?.mji) reach.push('mji')
  if (item.place?.mkoa) reach.push('mkoa')
  if (item.place?.nchi === 'Tanzania') reach.push('nchi')
  if (['channel', 'live', 'room'].includes(item.kind)) reach.push('global')
  if (item.online) reach.push('online')
  return reach
}

function whenOf(item) {
  const when = []
  if (item.liveNow) when.push('live_sasa', 'leo')
  if (item.kind === 'live' && item.state === 'upcoming') when.push('upcoming', 'wiki')
  if (item.open) when.push('leo')
  if (item.nextSession) when.push('wiki')
  if (item.activityToday) when.push('leo', 'wiki')
  return when
}

function personItem(u) {
  const state = store.friendStates[u.id] || 'not_friend'
  const followed = u.relationship === 'Unafuatilia'
  return {
    id: u.id,
    kind: u.type === 'creator' ? 'person' : u.type,
    type: u.type,
    name: u.name,
    handle: u.handle,
    subtitle: u.subtitle || u.relationship || '',
    bio: u.bio,
    tone: u.avatarTone,
    verified: !!u.verified,
    followers: u.followers,
    interests: u.interests || [],
    friendState: state,
    discoverReason: u.discoverReason || '',
    /* Sehemu za entity (biashara · channel · hub · jumuiya) — zilezile kutoka identity */
    category: u.category || '',
    open: !!u.open,
    openLabel: u.openLabel || '',
    offers: !!u.offers,
    rating: u.rating,
    reviews: u.reviews,
    since: u.since || '',
    members: u.members || 0,
    activityToday: u.activityToday || 0,
    language: u.language || '',
    joined: store.joined.hub.includes(u.id) || store.joined.community.includes(u.id),
    following: followed,
    preview: gunduaChannelProfiles[u.id]?.preview || null,
    profile: u.type === 'business' ? gunduaBusinessProfiles[u.id] || null : null,
    mada: u.mada || [],
    place: u.place || null,
    distanceKm: u.distanceKm,
    online: !!u.online,
    visibility: 'public',
    reach: reachOf(u),
    when: whenOf(u),
  }
}

function liveItem(s) {
  const meta = gunduaLiveMeta[s.id] || {}
  return {
    id: s.id,
    kind: 'live',
    type: 'live',
    name: s.host,
    title: s.title,
    host: s.host,
    userId: s.userId,
    mode: s.mode,
    state: s.state,
    viewers: s.viewers,
    since: s.since,
    whenLabel: s.when,
    category: s.category,
    tone: s.tone,
    liveNow: s.state === 'live',
    mada: meta.mada || [],
    place: { mji: meta.place || '', mkoa: meta.place || '', nchi: meta.place === 'Global' ? 'Global' : 'Tanzania' },
    lang: meta.lang || 'Video',
    discoverable: meta.discoverable !== false,
    visibility: 'public',
    reach: reachOf({ kind: 'live', place: { nchi: meta.place === 'Global' ? 'Global' : 'Tanzania' }, online: true }),
    when: whenOf({ liveNow: s.state === 'live', kind: 'live', state: s.state }),
  }
}

function groupItem(g) {
  return {
    ...g,
    kind: 'group',
    type: 'group',
    tone: g.tone,
    joined: store.joined.group.includes(g.id),
    friendState: store.friendStates[g.ownerId] || 'not_friend',
    visibility: 'public',
    reach: reachOf(g),
    when: whenOf(g),
  }
}

/** Orodha MOJA ya vitu vinavyogundulika — public pekee (kanuni 1). */
/* Entities zilizofichwa na mtumiaji (kikao hiki — Gundua pekee) */
const hidden = {}

function notHidden(item) {
  const id = item?.id || item?.userId
  return !hidden[id]
}

async function discoverableAll() {
  const directory = await allUsers()
  const people = directory
    .filter((u) => ['friend', 'person', 'creator', 'business', 'channel', 'hub', 'community'].includes(u.type))
    .map(personItem)
    .filter(notHidden)
  const live = liveSessions.map(liveItem).filter((l) => l.discoverable).filter(notHidden)
  const groups = gunduaPublicGroups.map(groupItem).filter(notHidden)
  const rooms = gunduaAudioRooms.map((r) => ({
    id: r.id, kind: 'room', type: 'room', name: r.room, title: r.title, host: r.host2,
    hostId: r.hostId, listeners: r.listeners, state: r.state, liveNow: r.state === 'live',
    mada: r.mada, place: { mji: r.place, mkoa: r.place, nchi: 'Tanzania' },
    visibility: 'public', reach: reachOf({ kind: 'room', place: { nchi: 'Tanzania' }, online: true }),
    when: whenOf({ liveNow: true }),
  }))
  return { people, live, groups, rooms }
}

/* ── Kuficha kutoka Gundua: hali ya mtumiaji (si adhabu kwa mwingine) ──
   Hali hii ni ya kikao hiki; haimwathiri mtu mwingine na haimpelekei
   taarifa yoyote.                                                      */

async function byKind(kind) {
  const d = await discoverableAll()
  if (kind === 'business') return d.people.filter((p) => p.type === 'business')
  if (kind === 'channel') return d.people.filter((p) => p.type === 'channel')
  if (kind === 'hub') return d.people.filter((p) => p.type === 'hub')
  if (kind === 'community') return d.people.filter((p) => p.type === 'community')
  return []
}

/* ── Kuchuja (filters) ──────────────────────────────────────── */

function norm(filters) {
  return {
    mada: filters?.mada || [],
    eneo: filters?.eneo || '',
    distance: filters?.distance || '5km',
    wakati: filters?.wakati || [],
    mahusiano: filters?.mahusiano || [],
    biashara: filters?.biashara || [],
    hali: filters?.hali || [],
  }
}

const intersect = (a = [], b = []) => a.some((x) => b.includes(x))

function passes(item, f) {
  if (item.visibility !== 'public') return false // kanuni 1 — haipitiki
  if (f.mada.length && !intersect(item.mada, f.mada)) return false
  if (f.wakati.length && !intersect(item.when, f.wakati)) return false
  if (f.biashara.length && item.type === 'business' && !f.biashara.includes(item.category)) return false
  if (f.biashara.length && item.type !== 'business') return false
  if (f.hali.length) {
    const ok =
      (f.hali.includes('open_now') && item.open) ||
      (f.hali.includes('offers') && item.offers) ||
      (f.hali.includes('new') && item.kind === 'business' && item.since)
    if (!ok) return false
  }
  if (f.mahusiano.length) {
    const ok =
      (f.mahusiano.includes('friends') && item.friendState === 'friend') ||
      (f.mahusiano.includes('not_friends') && item.friendState !== 'friend') ||
      (f.mahusiano.includes('following') && item.following) ||
      (f.mahusiano.includes('joined') && (item.joined || store.joined.hub.includes(item.id) || store.joined.community.includes(item.id))) ||
      (f.mahusiano.includes('new') && item.friendState !== 'friend' && !item.joined)
    if (!ok) return false
  }
  if (f.eneo) {
    if (f.eneo === 'karibu') {
      if (typeof item.distanceKm !== 'number') return false
      if (item.distanceKm > (DIST[f.distance] ?? 5)) return false
    } else if (!item.reach.includes(f.eneo)) return false
  }
  return true
}

async function applyFilters(items, filters) {
  const list = await items
  const f = norm(filters)
  return list.filter((i) => passes(i, f))
}

/* ── Sections za Mchanganyiko ───────────────────────────────── */

export const mockGunduaRepository = {
  async getModes() {
    return gunduaModes.map((m) => ({ ...m }))
  },

  async getCategories() {
    return gunduaCategories.map((c) => ({ ...c }))
  },

  async getFilterGroups() {
    return gunduaFilterGroups
  },

  async getFilterSchema(mode = 'mchanganyiko') {
    return (gunduaFilterSchema[mode] || gunduaFilterSchema.mchanganyiko).map((id) => gunduaFilterGroups[id])
  },

  async getSearchIdeas() {
    return [...gunduaSearchIdeas]
  },

  async getHighlights(filters) {
    const d = await discoverableAll()
    const f = norm(filters)
    const business = (await byKind('business')).filter((i) => passes(i, f))
    const people = d.people.filter((p) => ['friend', 'person', 'creator'].includes(p.type)).filter((i) => passes(i, f))
    const spaces = [...(await byKind('hub')), ...(await byKind('community'))].filter((i) => passes(i, f))
    const groups = d.groups.filter((i) => passes(i, f))
    const channels = (await byKind('channel')).filter((i) => passes(i, f))
    const live = [...d.live.filter((i) => i.liveNow), ...d.rooms].filter((i) => passes(i, f))

    const sections = [
      { id: 'near', title: 'Zilizo Karibu Nawe', hint: 'Biashara na huduma zilizothibitishwa karibu na ulipo', mode: 'businesses', kind: 'business', items: business.filter((b) => typeof b.distanceKm === 'number').sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 4) },
      { id: 'live', title: 'Vipindi vya Moja kwa Moja', hint: 'Live sasa — vikao vya umma', mode: 'live', kind: 'live', items: live.slice(0, 3) },
      // ⛔ HAKUNA "People You May Know" (§7): kila mtu ana SABABU MOJA ya muktadha
      { id: 'people', title: 'Watu wa Kugundua', hint: 'Kila mmoja ana sababu moja ya muktadha', mode: 'people', kind: 'person', items: people.filter((p) => p.friendState !== 'friend').slice(0, 3) },
      { id: 'spaces', title: 'Jumuiya na Hubs za Wazi', hint: 'Makundi makubwa yenye maslahi kama yako', mode: 'hubs', kind: 'hub', items: spaces.slice(0, 3) },
      { id: 'groups', title: 'Vikundi vya Wazi Vinavyovuma', hint: 'Jiunge — mazungumzo yanaendelea kwenye Chat', mode: 'groups', kind: 'group', items: groups.slice(0, 3) },
      { id: 'channels', title: 'Channels za Kipekee', hint: 'Maudhui ya kuaminika kwa kufuata', mode: 'channels', kind: 'channel', items: channels.slice(0, 3) },
    ]
    return sections.filter((s) => s.items.length > 0)
  },

  async getPeople(filters) {
    const d = await discoverableAll()
    return d.people.filter((p) => ['friend', 'person', 'creator'].includes(p.type)).filter((i) => passes(i, norm(filters)))
  },

  async getFriends(filters) {
    const all = await this.getPeople(filters)
    const f = norm(filters)
    return {
      myFriends: all.filter((p) => p.friendState === 'friend'),
      requests: all.filter((p) => p.friendState === 'received'),
      sent: all.filter((p) => p.friendState === 'sent'),
      discover: all.filter((p) => p.friendState === 'not_friend'),
      fromSpaces: all.filter((p) => /hub|channel|kikundi|jumuiya/i.test(p.discoverReason)),
      // `fromContacts` HAIPO hapa: chanzo chake ni orodha ya simu ya Chat
      // (chatRepository.getPhoneBook) — service inaijaza (§ friends).
      nearby: all
        .filter((p) => typeof p.distanceKm === 'number' && p.distanceKm <= 5 && p.friendState !== 'blocked')
        .sort((a, b) => a.distanceKm - b.distanceKm),
      blocked: all.filter((p) => p.friendState === 'blocked'),
    }
  },

  async getBusinesses(filters) {
    const list = await applyFilters(await byKind('business'), filters)
    return list.sort((a, b) => (a.distanceKm ?? 99) - (b.distanceKm ?? 99))
  },

  async getGroups(filters) {
    return applyFilters((await discoverableAll()).groups, filters)
  },

  async getHubs(filters) {
    return applyFilters(await byKind('hub'), filters)
  },

  async getCommunities(filters) {
    return applyFilters(await byKind('community'), filters)
  },

  async getChannels(filters) {
    return applyFilters(await byKind('channel'), filters)
  },

  async getLive(filters) {
    const d = await discoverableAll()
    return applyFilters([...d.live, ...d.rooms], filters)
  },

  async getRooms(filters) {
    return applyFilters((await discoverableAll()).rooms, filters)
  },

  async getMode(mode, filters) {
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

  async getCounts(filters) {
    const f = norm(filters)
    const d = await discoverableAll()
    const people = d.people.filter((i) => passes(i, f))
    return {
      mchanganyiko: people.length + d.groups.filter((i) => passes(i, f)).length + d.live.filter((i) => passes(i, f)).length,
      friends: people.filter((i) => ['friend', 'person', 'creator'].includes(i.type)).length,
      channels: people.filter((i) => i.type === 'channel').length,
      live: d.live.filter((i) => i.liveNow && passes(i, f)).length + d.rooms.length,
      businesses: people.filter((i) => i.type === 'business').length,
      people: people.filter((i) => ['friend', 'person', 'creator'].includes(i.type)).length,
      groups: d.groups.filter((i) => passes(i, f)).length,
      hubs: people.filter((i) => i.type === 'hub').length,
      communities: people.filter((i) => i.type === 'community').length,
    }
  },

  async getOffers() {
    return gunduaOffers.map((o) => ({ ...o, business: { ...users[o.businessId], profile: gunduaBusinessProfiles[o.businessId] } }))
  },

  /* ── Entity detail (taarifa za UMAA pekee) ───────────────── */

  async getEntity(type, id) {
    const u = (await allUsers()).find((x) => x.id === id)
    if (type === 'group') {
      const g = gunduaPublicGroups.find((x) => x.id === id)
      return g ? { ...groupItem(g) } : null
    }
    if (type === 'live' || type === 'room') {
      const l = liveSessions.map(liveItem).find((x) => x.id === id) || gunduaAudioRooms.find((r) => r.id === id)
      return l ? { ...l } : null
    }
    if (!u) return null
    const base = personItem(u)
    if (u.type === 'business') return { ...base, profile: gunduaBusinessProfiles[id] || null, offer: gunduaOffers.find((o) => o.businessId === id) || null }
    if (u.type === 'channel') return { ...base, profile: gunduaChannelProfiles[id] || null, following: base.following }
    if (u.type === 'hub') return { ...base, members: u.members || u.followers, activityToday: u.activityToday || 0, joined: store.joined.hub.includes(id) }
    if (u.type === 'community') return { ...base, members: u.members || u.followers, joined: store.joined.community.includes(id) }
    return base
  },

  /* ── Search (public pekee) ───────────────────────────────── */

  async search(query = '', filters) {
    const f = norm(filters)
    const q = String(query).trim().toLowerCase()
    if (!q) return { people: [], businesses: [], channels: [], communities: [], hubs: [], groups: [], live: [], total: 0 }
    const d = await discoverableAll()
    const hit = (i) =>
      [i.name, i.handle, i.title, i.bio, i.purpose, i.subtitle, i.category].filter(Boolean).join(' ').toLowerCase().includes(q) ||
      (i.mada || []).some((m) => m.includes(q))
    const pass = (i) => passes(i, f) && i.visibility === 'public'
    const people = d.people.filter((p) => ['friend', 'person', 'creator'].includes(p.type)).filter(hit).filter(pass)
    const out = {
      people,
      businesses: d.people.filter((p) => p.type === 'business').filter(hit).filter(pass),
      channels: d.people.filter((p) => p.type === 'channel').filter(hit).filter(pass),
      communities: d.people.filter((p) => p.type === 'community').filter(hit).filter(pass),
      hubs: d.people.filter((p) => p.type === 'hub').filter(hit).filter(pass),
      groups: d.groups.filter(hit).filter(pass),
      live: [...d.live, ...d.rooms].filter(hit).filter(pass),
    }
    out.total = Object.values(out).reduce((n, arr) => n + arr.length, 0)
    return out
  },

  /* ── Friend model (ileile ya Chat/identity) ──────────────── */

  async getFriendRequests() {
    return store.requestsIn.map((r) => ({ ...r, person: { ...users[r.from] } }))
  },

  async addFriend(id) {
    if (!users[id] || store.friendStates[id] === 'blocked') return { id, state: store.friendStates[id] || 'blocked', changed: false }
    store.friendStates[id] = 'sent'
    return { id, state: 'sent', changed: true }
  },

  /* Ghairi ombi lililotumwa (sent → not_friend). Ombi la mtu mwingine halibadilishwi. */
  async cancelFriend(id) {
    if (store.friendStates[id] !== 'sent') return { id, state: store.friendStates[id] || 'not_friend', changed: false }
    store.friendStates[id] = 'not_friend'
    return { id, state: 'not_friend', changed: true }
  },

  async respondFriend(id, action) {
    if (action === 'accept') {
      store.friendStates[id] = 'friend'
      store.requestsIn = store.requestsIn.filter((r) => r.from !== id)
      return { id, state: 'friend', changed: true }
    }
    if (action === 'decline') {
      store.friendStates[id] = 'not_friend'
      store.requestsIn = store.requestsIn.filter((r) => r.from !== id)
      return { id, state: 'not_friend', changed: true }
    }
    return { id, state: store.friendStates[id] || 'not_friend', changed: false }
  },

  /* ── Kufuata · Kujiunga ──────────────────────────────────── */

  /* Kufuata channel: chanzo KIMOJA ni identityRepository (§ subscriptions).
     Gundua na Home wanasoma hali ileile ya uhusiano. */
  async followChannel(id) {
    const res = await identityRepository.toggleFollow(id, true)
    return { id: res.id, following: res.following }
  },

  async unfollowChannel(id) {
    const res = await identityRepository.toggleFollow(id, false)
    return { id: res.id, following: res.following }
  },

  async join(type, id, conversationId = null) {
    const bucket = store.joined[type] || (store.joined[type] = [])
    if (!bucket.includes(id)) bucket.push(id)
    if (conversationId) {
      store.joinedConversations[id] = conversationId
    }
    return { type, id, joined: true, conversationId: store.joinedConversations[id] || null }
  },

  /** Kutoka kwenye hub/jumuiya (hali ya kikao — chanzo kimoja) */
  async leave(type, id) {
    const bucket = store.joined[type] || []
    store.joined[type] = bucket.filter((x) => x !== id)
    return { type, id, joined: false }
  },

  /** Mazungumzo ya kikundi kilichojiungwa (ili kujiunga MARA MOJA pekee) */
  async getJoinedConversation(id) {
    return store.joinedConversations[id] || null
  },

  async isJoined(type, id) {
    return (store.joined[type] || []).includes(id)
  },

  /** Kiungo/msimbo wangu wa kugundulika — kutoka data, si UI */
  async getMyLink() {
    return { ...gunduaMyLink }
  },

  async hideEntity(id, on = true) {
    if (on) hidden[id] = true
    else delete hidden[id]
    return { id, hidden: !!on }
  },

  async unhideEntity(id) {
    delete hidden[id]
    return { id, hidden: false }
  },

  async listHidden() {
    return Object.keys(hidden)
  },

  async getFriendState(id) {
    return store.friendStates[id] || 'not_friend'
  },

  /* ── Takwimu za ndani kwa majaribio (privacy) ────────────── */

  async getPrivateRegistry() {
    return gunduaPrivateEntities.map((p) => ({ ...p }))
  },
}
