// ══════════════════════════════════════════════════════════════
// PASIHAI — APPLICATION SERVICE: SPACES
//
//   getPage({tab, filter})  → { tabs, filters, sections, counts, mine }
//   getSpace(type, id)      → SpaceView (Hub · Jumuiya — familia moja)
//   getChannel(id)          → ChannelView (tawi la kuchapisha)
//   join() · leave() · requestJoin() · attendEvent() · saveResource()
//   createSpace(draft) · getMySpaces() · getVisibilityModel() · getStats()
//
// KANUNI:
//   · Hub na Jumuiya = familia MOJA; Channel = tawi la KUCHAPISHA (§2/§3).
//   · Vikundi = Chat pekee: hapa ni KIUNGO cha conversation iliyopo (§43).
//   · Hakuna engine ya pili: content/maoni/hifadhi zinapita feedService.
//   · Ufikivu ni HALI tatu: public · listed (ombi) · hidden (mwaliko).
//   · Eneo = umuhimu (relevance) — KAMWE si ruhusa (§5).
//   · Takwimu ni halisi pekee: hakuna views/wapato za kubuni.
// ══════════════════════════════════════════════════════════════

import { spacesRepository } from '../data/repositories/index.js'

const TABS = [
  { id: 'places', label: 'Hubs & Jumuiya', },
  { id: 'channels', label: 'Channels', },
]

const FILTERS = [
  { id: 'all', label: 'Zote' },
  { id: 'mine', label: 'Nafasi Zangu' },
  { id: 'nearby', label: 'Karibu Nami' },
  { id: 'new', label: 'Nipya Kwangu' },
]

/* Tabs za Space ya aina Hub/Jumuiya — muundo mmoja (§6/§16) */
const SPACE_TABS = [
  { id: 'muhtasari', label: 'Muhtasari' },
  { id: 'shughuli', label: 'Shughuli' },
  { id: 'watu', label: 'Watu' },
  { id: 'matukio', label: 'Matukio' },
  { id: 'rasilimali', label: 'Rasilimali' },
  { id: 'kuhusu', label: 'Kuhusu' },
]

/* Tabs za Channel — publishing-first, tofauti kwa muundo (§30/§31) */
const CHANNEL_TABS = [
  { id: 'vilivyoteuliwa', label: 'Vilivyoteuliwa' },
  { id: 'mapya', label: 'Mapya' },
  { id: 'media', label: 'Media' },
  { id: 'kuhusu', label: 'Kuhusu' },
]

const VISIBILITY_LABEL = {
  public: 'Wazi',
  listed: 'Binafsi · Iliyoorodheshwa',
  hidden: 'Binafsi · Fichwa',
}

function joinLabel(item) {
  if (item.visibility === 'listed') return 'Omba kujiunga'
  if (item.visibility === 'hidden') return 'Mwaliko pekee'
  return item.type === 'channel' ? 'Fuata' : item.type === 'community' ? 'Jiunge na Jumuiya' : 'Jiunge na Hub'
}

function countedText(n) {
  return new Intl.NumberFormat('sw-TZ').format(n ?? 0)
}

/* Kadi moja ya Space (Hub · Jumuiya · Channel) — muundo mmoja wa data */
function card(item) {
  return {
    id: item.id,
    type: item.type,
    name: item.name,
    handle: item.handle,
    purpose: item.purpose || item.bio,
    category: item.category,
    tone: item.tone,
    cover: item.cover,
    verified: item.verified,
    place: item.place,
    online: item.online,
    members: item.members,
    followers: item.followers,
    membersLabel: countedText(item.type === 'channel' ? item.followers : item.members),
    visibility: item.visibility,
    visibilityLabel: VISIBILITY_LABEL[item.visibility],
    joined: item.joined,
    owned: item.owned,
    requested: item.requested,
    joinLabel: joinLabel(item),
    /* Familia: hub na jumuiya zinaonekana kwa lugha ileile */
    family: item.type === 'channel' ? 'channel' : 'place',
    meta: [
      item.category || null,
      item.place?.mji ? item.place.mji : null,
      item.type === 'channel' ? `${countedText(item.followers)} wafuatiliaji` : `${countedText(item.members)} wanachama`,
    ].filter(Boolean),
  }
}

export const spacesService = {
  TABS,
  FILTERS,
  SPACE_TABS,
  CHANNEL_TABS,

  /* ── Ukurasa wa Spaces: orodha + sehemu ──────────────────── */

  async getPage({ tab = 'places', filter = 'all', query = '' } = {}) {
    const list = await spacesRepository.listSpaces()
    const q = String(query).trim().toLowerCase()
    const hit = (i) =>
      !q ||
      [i.name, i.handle, i.purpose, i.bio, i.category].filter(Boolean).join(' ').toLowerCase().includes(q)

    const base = tab === 'channels' ? list.channels : list.places
    let results = base.filter(hit)

    if (filter === 'mine') results = results.filter((i) => i.joined || i.owned)
    if (filter === 'nearby') {
      /* Eneo ni UMUHIMU pekee: Tanzania kwanza, kisha mengine — si ruhusa (§5) */
      results = [...results].sort(
        (a, b) =>
          Number(b.place?.nchi === 'Tanzania') - Number(a.place?.nchi === 'Tanzania') ||
          (a.place?.mji === 'Dar es Salaam' ? -1 : 0) - (b.place?.mji === 'Dar es Salaam' ? -1 : 0) ||
          String(a.name).localeCompare(String(b.name)),
      )
    }
    if (filter === 'new') {
      results = [...results].sort(
        (a, b) => Number(b.founded || 0) - Number(a.founded || 0) || String(a.name).localeCompare(String(b.name)),
      )
    }

    const mine = list.mine.map(card)
    const cards = results.map(card)

    /* Sehemu: Nafasi zangu (juu) → Zinazopendekezwa (zilizosalia) */
    const sections = []
    if (filter === 'all' && mine.length) {
      sections.push({
        id: 'mine',
        title: 'Nafasi Zangu',
        hint: 'Hubs · Jumuiya · Channels ulizojiunga au kumiliki',
        layout: 'rail',
        items: mine,
      })
    }
    const mineIds = new Set(mine.map((m) => m.id))
    const rest = filter === 'all' ? cards.filter((c) => !mineIds.has(c.id)) : cards
    sections.push({
      id: 'results',
      title: filter === 'all' ? 'Zinazopendekezwa' : FILTERS.find((f) => f.id === filter)?.label || 'Matokeo',
      hint:
        tab === 'channels'
          ? 'Vyanzo unavyoweza kufuatilia'
          : 'Mahali pa kukutana, kushiriki na kushirikiana',
      layout: 'grid',
      items: rest,
    })

    return {
      tab,
      filter,
      query,
      tabs: TABS,
      filters: FILTERS,
      counts: { ...list.counts, mine: mine.length, shown: cards.length },
      allCount: base.length,
      mine,
      sections,
      /* Hali tupu inasema ukweli (§47) */
      empty:
        cards.length === 0
          ? filter === 'mine'
            ? {
                title: 'Bado hujaunga na nafasi yoyote',
                text: 'Hakuna bado',
              }
            : {
                title: 'Hakuna nafasi inayolingana',
                text: 'Jaribu kichujio kingine — au unda nafasi yako mwenyewe.',
              }
          : null,
      /* Kanuni ya faragha inaonekana wazi kwenye skrini (§15) */
      note: 'Nafasi za faragha hazionyeshwi kwenye orodha hii. Hali ya ufikivu inaonekana kwenye kila kadi; eneo ni umuhimu, si ruhusa.',
    }
  },

  /* ── Space moja (Hub · Jumuiya) ──────────────────────────── */

  async getSpace(type, id) {
    const item = await spacesRepository.getSpace(type, id)
    if (!item) return null
    const [events, resources, stats] = await Promise.all([
      spacesRepository.getEvents(id),
      spacesRepository.getResources(id),
      spacesRepository.getStats(id),
    ])

    const c = card(item)
    const relation = item.owned
      ? 'Umiliki wako'
      : item.joined
        ? 'Umejiunga'
        : item.requested
          ? 'Ombi limetumwa'
          : item.visibility === 'hidden'
            ? 'Mwaliko pekee'
            : 'Hujajiunga'

    return {
      ...c,
      tabs: SPACE_TABS,
      name: item.name,
      handle: item.handle,
      purpose: item.purpose,
      founded: item.founded,
      rules: item.rules || [],
      team: item.people.team,
      lead: item.people.lead,
      members: item.people.members,
      peopleCount: item.people.team.length + item.people.members.length,
      relatedGroups: item.relatedGroups,
      relatedChannels: item.relatedChannels,
      activity: item.activity,
      activityCount: item.activity.length,
      events,
      eventCount: events.length,
      resources: resources.items,
      resourcesAvailable: resources.available,
      stats,
      canManage: item.canManage,
      membership: { joined: item.joined, requested: item.requested, owned: item.owned, relation },
      overview: {
        lead: item.people.lead,
        activeToday: item.online ? 1 : 0,
        rulesPreview: (item.rules || []).slice(0, 2),
        nextEvent: events[0] || null,
        featuredResource: resources.items[0] || null,
        latest: item.activity.slice(0, 2),
      },
    }
  },

  /* ── Channel (tawi la kuchapisha) ────────────────────────── */

  async getChannel(id) {
    const item = await spacesRepository.getSpace('channel', id)
    if (!item) return null
    const [stats, events, resources] = await Promise.all([
      spacesRepository.getStats(id),
      spacesRepository.getEvents(id),
      spacesRepository.getResources(id),
    ])
    const activity = item.activity
    const media = activity.filter((i) => ['image', 'video', 'reel', 'audio'].includes(i.kind))
    const featured = activity.filter((i) => i.kind === 'announcement' || i.label)
    const c = card(item)

    return {
      ...c,
      tabs: CHANNEL_TABS,
      purpose: item.purpose,
      founded: item.founded,
      rules: item.rules || [],
      team: item.people.team,
      stats,
      canManage: item.canManage,
      membership: {
        joined: item.joined,
        owned: item.owned,
        relation: item.owned ? 'Channel yako' : item.joined ? 'Unafuatilia' : 'Hujafuatilia',
      },
      sections: {
        featured: featured.length ? featured : activity.slice(0, 1),
        latest: activity,
        media,
        about: {
          purpose: item.purpose,
          rules: item.rules || [],
          founded: item.founded,
          category: item.category,
          place: item.place,
          visibilityLabel: c.visibilityLabel,
          team: item.people.team,
          relatedChannels: item.relatedChannels,
          resources: resources.items,
          events,
        },
      },
      /* Uundaji wa channel ni wenye mipaka: logo · jalada · maelezo ·
         kategoria · kipengele — HAKUNA fonts/themes/wallpaper (§35) */
      appearance: {
        allowed: ['Nembo (logo)', 'Jalada (cover)', 'Maelezo', 'Kategoria', 'Kipengele'],
        note: 'Muonekano wa Channel unatumia rangi za PASIHAI pekee — hakuna fonts za nje, themes au wallpaper.',
      },
    }
  },

  /* ── Vitendo: kujiunga · kutoka · ombi · matukio · rasilimali ── */

  async join(type, id) {
    const res = await spacesRepository.join(type, id)
    return res
  },

  async requestJoin(type, id) {
    return spacesRepository.requestJoin(type, id)
  },

  async leave(type, id) {
    return spacesRepository.leave(type, id)
  },

  async attendEvent(eventId, on = true) {
    const res = await spacesRepository.attendEvent(eventId, on)
    return { ...res, note: res.attending ? 'Umeweka nia ya kuhudhuria' : 'Umeondoa nia ya kuhudhuria' }
  },

  /** Hifadhi rasilimali bila mtandao — njia ILEILE ya Save Offline */
  async saveResource(id) {
    const items = await spacesRepository.saveResource(id)
    return { items }
  },

  /* ── Uundaji (hatua 3) ───────────────────────────────────── */

  async getCreateModel() {
    const [types, visibility] = await Promise.all([
      Promise.resolve([
        { id: 'hub', label: 'Hub' },
        { id: 'community', label: 'Jumuiya' },
        { id: 'channel', label: 'Channel' },
      ]),
      spacesRepository.getVisibilityModel(),
    ])
    return {
      steps: [
        { id: 'type', label: 'Aina', hint: 'Hub · Jumuiya · Channel' },
        { id: 'details', label: 'Maelezo', hint: 'Jina · kusudi · kategoria · ufikivu' },
        { id: 'look', label: 'Muonekano', hint: 'Rangi · nembo · jalada' },
      ],
      types,
      visibility,
      categories: [
        'Teknolojia',
        'Kilimo',
        'Afya',
        'Elimu',
        'Biashara',
        'Sanaa',
        'Michezo',
        'Habari',
        'Jumla',
      ],
      covers: [
        { id: 'green', label: 'Kijani (msingi)' },
        { id: 'blue', label: 'Bluu (taarifa)' },
        { id: 'teal', label: 'Teal (utulivu)' },
        { id: 'gold', label: 'Dhahabu (tahadhari — nadra)' },
      ],
      /* Kanuni inaonekana kwenye UI: kitu kimoja, mahali popote (§40) */
      note: 'Unachounda hapa ni kitu kilekile unachoona kwenye Spaces na Gundua — hakuna mfumo wa pili.',
    }
  },

  async createSpace(draft) {
    const space = await spacesRepository.createSpace(draft)
    return {
      ...space,
      note:
        space.type === 'channel'
          ? `Channel “${space.name}” imeundwa — unaweza kuchapisha mara moja.`
          : `${space.type === 'community' ? 'Jumuiya' : 'Hub'} “${space.name}” imeundwa — unaweza kuchapisha na kualika wanachama.`,
    }
  },

  /* ── Nafasi Zangu + ufikivu ──────────────────────────────── */

  async getMySpaces() {
    const list = await spacesRepository.listSpaces({ includeHidden: true })
    const mine = list.mine
    return {
      items: mine.map(card),
      hubs: mine.filter((i) => i.type === 'hub').map(card),
      communities: mine.filter((i) => i.type === 'community').map(card),
      channels: mine.filter((i) => i.type === 'channel').map(card),
      owned: mine.filter((i) => i.owned).map(card),
      requested: (await spacesRepository.listMyRequests()),
      counts: {
        total: mine.length,
        owned: mine.filter((i) => i.owned).length,
        joined: mine.filter((i) => i.joined && !i.owned).length,
      },
      /* Uamuzi wa mfumo: uanachama ni ule ule kwenye Spaces na Gundua */
      note: 'Nafasi zako ni object moja: ku-jiunge Gundua au Spaces kunabadilisha kitu kimoja.',
    }
  },

  async getVisibilityModel() {
    return spacesRepository.getVisibilityModel()
  },

  async getStats(id) {
    return spacesRepository.getStats(id)
  },
}
