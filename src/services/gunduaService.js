// ══════════════════════════════════════════════════════════════
// PASIHAI — APPLICATION SERVICE: GUNDUA (safu ya ugunduzi)
//
// Gundua NI SAFU YA UGUNDUZI — haitengenezi entity wala engine mpya:
//   · Watu / Biashara / Channels / Hubs / Jumuiya  → identityRepository (users)
//   · Live / Kumbi za sauti                        → liveSessions (Home Live)
//   · Vikundi                                      → Chat: join → chatRepository.createGroup
//   · Mazungumzo ("Wasiliana kwa Chat")            → chatRepository.startDirect
//   · Hali za urafiki                              → friend model ileile ya Chat/identity
//
// ⛔ Hakuna: Network/Relay/Sync control · Friends management · Business engine ·
//    Community/Hub/Channel admin · Home feed ndani ya Gundua.
// ══════════════════════════════════════════════════════════════

import { gunduaRepository, chatRepository, identityRepository } from '../data/repositories/index.js'

const EMPTY = { mada: [], eneo: '', distance: '5km', wakati: [], mahusiano: [], biashara: [], hali: [] }

const GROUP_LABEL = {
  mada: 'Shughuli na Mada', eneo: 'Eneo', wakati: 'Wakati',
  mahusiano: 'Mahusiano', biashara: 'Kategoria za Biashara', hali: 'Hali',
}

function labelFor(groupId, value) {
  switch (groupId) {
    case 'mada': return value
    case 'eneo': return { karibu: 'Karibu Nami', nililochagua: 'Eneo Nililochagua', mji: 'Mji', mkoa: 'Mkoa', nchi: 'Nchi', global: 'Global', online: 'Online' }[value] || value
    case 'wakati': return { live_sasa: 'Live sasa', leo: 'Leo', upcoming: 'Upcoming', wiki: 'Wiki hii', mwezi: 'Mwezi huu' }[value] || value
    case 'mahusiano': return { friends: 'Friends', not_friends: 'Not Friends', following: 'Following', joined: 'Joined', new: 'New to Me' }[value] || value
    case 'biashara': return value
    case 'hali': return { open_now: 'Open Now', offers: 'Ofa na Punguzo', new: 'Mpya' }[value] || value
    default: return value
  }
}

/** Muhtasari mfupi wa vichujio vilivyowekwa (kwa UI) */
export function filterSummary(active = {}) {
  const out = []
  for (const key of ['mada', 'biashara', 'hali', 'wakati', 'mahusiano']) {
    for (const v of active[key] || []) out.push({ group: key, value: v, label: labelFor(key, v) })
  }
  if (active.eneo) {
    out.push({ group: 'eneo', value: active.eneo, label: labelFor('eneo', active.eneo) })
    if (active.eneo === 'karibu' && active.distance) out.push({ group: 'distance', value: active.distance, label: active.distance })
  }
  return out
}

export function activeCount(active = {}) {
  return Object.entries(active).reduce((n, [k, v]) => (k === 'distance' ? n : n + (Array.isArray(v) ? v.length : v ? 1 : 0)), 0)
}

/* Orodha ya simu (chanzo: Chat) → kadi za watu za Gundua.
   Mtu mmoja = rekodi moja: kama ana akaunti ya PASIHAI, kadi inatumia
   utambulisho wake; kama hana, kadi inaonyesha mwaliko (Alika). */
function personFromContact(contact, peopleById) {
  const person = contact.accountId ? peopleById[contact.accountId] : null
  const state = contact.friendState || (contact.accountId ? 'not_friend' : 'no_account')
  const base = {
    id: person?.id || contact.id,
    kind: 'person',
    type: 'contact',
    name: contact.name,
    handle: person?.handle || contact.phone,
    subtitle: person
      ? person.subtitle || 'Akaunti ya PASIHAI'
      : contact.accountId
        ? 'Akaunti ya PASIHAI · si ya umma'
        : 'Hajajiunga na PASIHAI',
    bio: person?.bio || '',
    tone: person?.tone || contact.tone || 'slate',
    verified: !!person?.verified,
    followers: person?.followers || 0,
    interests: person?.interests || [],
    friendState: state,
    discoverReason: 'Kutoka orodha yako ya simu',
    fromContacts: true,
    hasAccount: !!contact.accountId,
    phone: contact.phone,
  }
  // Ana rekodi ya umma → kadi inatumia utambulisho wake halisi (mtu mmoja, rekodi moja).
  return person ? { ...person, ...base } : base
}

export const gunduaService = {
  EMPTY,

  /* ── Ukurasa mkuu: modes · kategoria · sections/results ──── */

  async getPage({ mode = 'mchanganyiko', filters = EMPTY, query = '' } = {}) {
    const active = { ...EMPTY, ...filters }
    const [
      modes, categories, counts, filterSchema, highlights, ideas, me, offers,
    ] = await Promise.all([
      gunduaRepository.getModes(),
      gunduaRepository.getCategories(),
      gunduaRepository.getCounts(active),
      gunduaRepository.getFilterSchema(mode === 'addfriend' ? 'people' : mode),
      gunduaRepository.getHighlights(active),
      gunduaRepository.getSearchIdeas(),
      identityRepository.getCurrentUser(),
      gunduaRepository.getOffers(),
    ])

    /* Matokeo ya mode (au search) */
    let results = []
    let friendsView = null
    let searchView = null

    if (query) {
      searchView = await gunduaService.search(query, active)
    } else if (mode === 'friends') {
      friendsView = await gunduaRepository.getFriends(active)
      // Orodha ya simu: chanzo kilekile cha Chat (hakuna mock ya pili)
      const [book, everyone] = await Promise.all([chatRepository.getPhoneBook(), gunduaRepository.getPeople({})])
      const byId = {}
      for (const p of everyone) byId[p.id] = p
      friendsView.fromContacts = await Promise.all(
        book.map(async (c) => personFromContact(
          { ...c, friendState: c.accountId ? await gunduaRepository.getFriendState(c.accountId) : 'no_account' },
          byId,
        )),
      )
      // Mahusiano: yaliyokwisha kubaliwa hayaonekani kwenye "Watu wa Kugundua"
      const seen = new Set([
        ...friendsView.myFriends.map((p) => p.id),
        ...book.filter((c) => c.accountId).map((c) => c.accountId),
      ])
      friendsView.discover = (friendsView.discover || []).filter((p) => !seen.has(p.id))
    } else if (mode !== 'mchanganyiko' && mode !== 'addfriend') {
      results = await gunduaRepository.getMode(mode, active)
    }

    return {
      mode,
      query,
      filters: active,
      modules: modes,
      categories: categories.map((c) => ({ ...c, count: counts[c.id] ?? null })),
      counts,
      filterSchema,
      activeFilters: filterSummary(active),
      activeCount: activeCount(active),
      highlights: mode === 'mchanganyiko' && !query ? highlights : [],
      results,
      friendsView,
      searchView,
      ideas,
      offers: mode === 'businesses' ? offers : [],
      scope: { place: 'Dar es Salaam', label: 'Wazi · Umma' },
      me: { name: me?.name, handle: me?.handle },
      privacy: gunduaService.privacyNote(),
    }
  },

  /** Ramani/eneo la mode ya Biashara (mfano — hakuna ramani halisi bado) */
  async getLocal(filters = {}) {
    const active = { ...EMPTY, ...filters, eneo: filters.eneo || 'karibu', distance: filters.distance || '5km' }
    const [businesses, offers] = await Promise.all([
      gunduaRepository.getBusinesses(active),
      gunduaRepository.getOffers(),
    ])
    return {
      businesses,
      offers,
      openNow: businesses.filter((b) => b.open).length,
      total: businesses.length,
      map: { label: 'Ramani ya Gundua', hint: 'Vituo vinavyoonekana kwenye eneo lako la jumla', pins: businesses.length },
    }
  },

  async getEntity(type, id) {
    return gunduaRepository.getEntity(type, id)
  },

  /* ── Search ─────────────────────────────────────────────── */

  async search(query, filters = EMPTY) {
    const raw = await gunduaRepository.search(query, filters)
    const active = { ...EMPTY, ...filters }
    const shown = activeCount(active) > 0 ? raw : raw
    return {
      ...shown,
      query,
      sections: [
        { id: 'people', title: 'Watu', kind: 'person', items: shown.people },
        { id: 'businesses', title: 'Biashara', kind: 'business', items: shown.businesses },
        { id: 'channels', title: 'Channels', kind: 'channel', items: shown.channels },
        { id: 'communities', title: 'Jumuiya', kind: 'community', items: shown.communities },
        { id: 'hubs', title: 'Public Hubs', kind: 'hub', items: shown.hubs },
        { id: 'groups', title: 'Vikundi', kind: 'group', items: shown.groups },
        { id: 'live', title: 'Live', kind: 'live', items: shown.live },
      ].filter((s) => s.items.length > 0),
    }
  },

  /* ── Urafiki: model ILEILE ya Chat/identity ─────────────── */

  async addFriend(id) {
    const res = await gunduaRepository.addFriend(id)
    return { ...res, hint: res.changed ? 'Ombi la urafiki limetumwa' : 'Ombi tayari lipo' }
  },

  async respondFriend(id, action) {
    const res = await gunduaRepository.respondFriend(id, action)
    return {
      ...res,
      hint: action === 'accept' ? 'Sasa ni rafiki wa PASIHAI' : action === 'decline' ? 'Ombi limekataliwa kimya kimya' : 'Hakuna mabadiliko',
    }
  },

  async getFriendRequests() {
    return gunduaRepository.getFriendRequests()
  },

  async cancelFriend(id) {
    const res = await gunduaRepository.cancelFriend(id)
    return { ...res, hint: res.changed ? 'Ombi limeondolewa' : 'Hakuna ombi la kuondoa' }
  },

  /* Mahusiano ya Account: sent · myFriends · discover (PYMK) — chanzo kimoja: gunduaRepository */
  async getFriends(filters = {}) {
    return gunduaRepository.getFriends(filters)
  },

  /* ── Channels: kufuata ──────────────────────────────────── */

  async toggleFollow(id, follow) {
    return follow ? gunduaRepository.followChannel(id) : gunduaRepository.unfollowChannel(id)
  },

  /* ── Kujiunga: Hubs · Jumuiya · KIKUNDI (→ Chat iliyopo) ── */

  async join(type, id) {
    if (type === 'group') {
      const group = await gunduaRepository.getEntity('group', id)
      if (!group) return null
      /* Amejiunga tayari? Tumia mazungumzo yale yale (hakuna vikundi viwili). */
      const already = await gunduaRepository.getJoinedConversation(id)
      if (already) {
        return {
          type,
          id,
          joined: true,
          alreadyJoined: true,
          conversationId: already,
          chatNote: 'Kikundi hiki kipo tayari kwenye Chat',
        }
      }
      /* Mazungumzo yanatengenezwa kwenye CHAT iliyopo — hakuna engine ya pili. */
      const created = await chatRepository.createGroup({
        name: group.name,
        members: [group.ownerId].filter(Boolean),
        parentContext: null,
      })
      await gunduaRepository.join('group', id, created?.id)
      return {
        type,
        id,
        joined: true,
        conversation: created,
        conversationId: created?.id || null,
        chatNote: 'Kikundi kimeongezwa kwenye Chat (mazungumzo yako)',
      }
    }
    const res = await gunduaRepository.join(type, id)
    return { ...res, chatNote: '' }
  },

  /* ── Mazungumzo: yote yanapita Chat iliyopo ─────────────── */

  async openChat(accountId) {
    const res = await chatRepository.startDirect(accountId)
    return { conversation: res.conversation, created: res.created }
  },

  /** Namba ya simu: njia ILEILE ya Chat (hakuna utafutaji wa pili). */
  async lookupNumber(number) {
    const cases = await chatRepository.lookupNumber(number)
    return Promise.all(
      cases.map(async (c) => ({ ...c, friendState: c.accountId ? await gunduaRepository.getFriendState(c.accountId) : 'no_account' })),
    )
  },

  /** Orodha ya simu: chanzo kilekile cha Chat (chatPhoneBook). */
  async getContacts() {
    const book = await chatRepository.getPhoneBook()
    return Promise.all(
      book.map(async (c) => ({ ...c, friendState: c.accountId ? await gunduaRepository.getFriendState(c.accountId) : 'no_account' })),
    )
  },

  async getAddFriendIdeas() {
    const [ideas, people] = await Promise.all([
      gunduaRepository.getSearchIdeas(),
      gunduaRepository.getPeople({ mahusiano: ['not_friends'] }),
    ])
    return { ideas, people }
  },

  async getPrivateRegistry() {
    return gunduaRepository.getPrivateRegistry()
  },

  async getSearchIdeas() {
    return gunduaRepository.getSearchIdeas()
  },

  async getFilterGroups() {
    return gunduaRepository.getFilterGroups()
  },

  filterSummary,
  activeCount,

  privacyNote: () =>
    'Gundua inaonyesha vitu vya UMAA pekee (vilivyoidhinisha kuonekana wazi). Namba za simu na eneo halisi havionyeshwi; eneo linatumika kwa umuhimu (relevance) pekee — si ruhusa.',
  /** Kiungo/msimbo wangu — QR na kiungo (bila namba ya simu) */
  async getMyLink() {
    return gunduaRepository.getMyLink()
  },

  /** Ficha entity kutoka Gundua (hali yako pekee) */
  async hideEntity(id, on = true) {
    return gunduaRepository.hideEntity(id, on)
  },

  async listHidden() {
    return gunduaRepository.listHidden()
  },

  async unhideEntity(id) {
    return gunduaRepository.unhideEntity(id)
  },
}
