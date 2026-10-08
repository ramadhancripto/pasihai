// ══════════════════════════════════════════════════════════════
// PASIHAI — REPOSITORY: SPACES (Hub · Jumuiya · Channel)
//
// KANUNI YA MSINGI (§0/§2/§3/§43):
//   1. Hakuna "Private Space" object. Rangi ya ufikivu ni HALI:
//      'public' · 'listed' · 'hidden' (§5/§15/§29).
//   2. Hub na Jumuiya ni FAMILIA MOJA (kukutana/kushiriki);
//      Channel ni TAWI la kuchapisha (creator → content → hadhira).
//   3. Vikundi = Chat pekee. Hapa ni KIUNGO tu (conversation ipo Chat).
//   4. Hakuna engine ya pili: content/maoni/hifadhi/posts zinapita
//      contentRepository; uanachama/kujiunga zinapita gunduaRepository;
//      watu wanatoka identityRepository; vikundi vinatoka chatRepository.
//
// Repository hii ni MUKTADHA (context) pekee: kusudi · kanuni · timu ·
// ufikivu · vikundi vinavyohusiana. Haisomi mock kwa content au chat.
//
// IMPLEMENTATION YA SASA : Mock (mock.js) + hali ya kikao (kumbukumbu)
// IMPLEMENTATION ZA BAADAYE: FirebaseSpacesRepository | LocalSpacesRepository
// ══════════════════════════════════════════════════════════════

import {
  gunduaPrivateEntities,
  spacesMeta,
  spacesMembers,
  spacesMine,
  spacesGroupLinks,
  users,
  me,
} from '../mock.js'
import {
  identityRepository,
  contentRepository,
  systemRepository,
  gunduaRepository,
} from './index.js'

/* ── Hali ya kikao (haipotei hadi app ifungwe — prototype) ───
   Hii ni hali ya MTUMIAJI MWENYEWE pekee: maombi niliyotuma,
   spaces nilizounda, matukio ninayohudhuria. */
const session = {
  requests: {},     // { spaceId: true } — maombi ya kujiunga niliyotuma
  created: [],      // spaces nilizounda kwenye kikao hiki
  attending: {},    // { eventId: true } — matukio ninayohudhuria
  leaving: {},      // { spaceId: true } — nimetoka (hub/jumuiya)
}

/* Aina za Space: hub · community (familia moja) | channel (tawi) */
const SPACE_TYPES = ['hub', 'community', 'channel']

/* ── Mchanganyiko: metadata + entity iliyopo ─────────────────
   getEntity inatoka gunduaRepository (chanzo kimoja cha wasifu),
   meta inatoka mock (muktadha wa Spaces). */
async function compose(id) {
  const created = session.created.find((s) => s.id === id) || null
  const meta = spacesMeta[id] || null
  /* Space iliyoundwa kwenye kikao hiki haipo kwenye mock — inatoka session */
  if (!meta && !created) return null
  const type = created?.type || typeOf(id)
  /* Nafasi za faragha zina utambulisho wake (jina · aina) hata kama
     hazipo kwenye orodha ya umma — 'listed' ni utambulisho pekee (§5). */
  const priv = gunduaPrivateEntities.find((p) => p.id === id) || null
  const entity = created ? null : await gunduaRepository.getEntity(type, id)
  const base = entity || created || (priv ? { id: priv.id, type: priv.type, name: priv.name, bio: priv.reason } : null)
  if (!base) return null
  const visibility = created ? created.visibility : meta.visibility
  /* Channel: kufuata kunatoka identityRepository (chanzo kimoja).
     Hub/Jumuiya: uanachama unatoka orodha ya kikao. */
  const joined = await joinedState(id, type)
  return {
    id,
    type,
    kind: type,
    visibility,
    joinMode: created ? created.joinMode : meta.joinMode,
    purpose: created ? created.purpose : meta.purpose,
    founded: created ? created.founded : meta.founded,
    rules: created ? created.rules : meta.rules,
    team: created ? created.team : meta.team,
    relatedGroups: created ? created.relatedGroups : (spacesGroupLinks[id] || []),
    relatedChannels: created ? created.relatedChannels : (meta.relatedChannels || []),
    resources: created ? created.resources : meta.resources,
    cover: created ? created.cover : meta.cover,
    name: base.name,
    handle: base.handle || `@${id}`,
    bio: base.bio || base.purpose || '',
    category: base.category || '',
    tone: base.tone || base.avatarTone || 'green',
    verified: !!base.verified,
    place: base.place || null,
    members: base.members ?? base.followers ?? 0,
    followers: base.followers ?? 0,
    online: !!base.online,
    owned: ownedState(id),
    joined,
    requested: !!session.requests[id],
  }
}

/* Aina ya space inatoka identity (chanzo kimoja cha aina za entity) */
function typeOf(id) {
  const created = session.created.find((s) => s.id === id)
  if (created) return created.type
  const u = users[id]
  if (u && SPACE_TYPES.includes(u.type)) return u.type
  const priv = gunduaPrivateEntities.find((p) => p.id === id)
  if (priv && SPACE_TYPES.includes(priv.type)) return priv.type
  return 'hub'
}

/* Uanachama: chanzo kimoja.
   · channel  → identityRepository.isFollowing (kufuata)
   · hub/jumuiya → gunduaRepository.isJoined (kujiunga halisi)
   · baseline → relationship ya identity data ('Umejiunga')
   · spaces nilizounda → umiliki wangu                                     */
async function joinedState(id, type) {
  if (session.leaving[id]) return false
  if (session.created.some((s) => s.id === id)) return true
  if (type === 'channel') return identityRepository.isFollowing(id)
  if (await gunduaRepository.isJoined(type, id)) return true
  return users[id]?.relationship === 'Umejiunga'
}

function ownedState(id) {
  return spacesMine.owned.includes(id) || session.created.some((s) => s.id === id)
}

/* Space inaonekana kwenye orodha? 'hidden' ni kwa mwaliko/kiungo pekee.
   Hii ni kanuni ya UFIKIVU — hapa kwenye data layer, si UI (§38). */
function listed(item, { includeHidden = false } = {}) {
  if (item.visibility !== 'hidden') return true
  if (includeHidden) return true
  return item.joined || item.owned
}

/* ── Ukurasa wa Spaces: hubs/jumuiya (familia moja) + channels ── */

async function allSpaces() {
  const ids = [...Object.keys(spacesMeta), ...session.created.map((s) => s.id)]
  const items = await Promise.all(ids.map((id) => compose(id)))
  return items.filter(Boolean)
}

/* ── Mchanganyiko: ramani kamili ya Space (bila content) ────── */

const repository = {
  /* Orodha ya msingi: hubs · jumuiya · channels (na zangu) */
  async listSpaces({ includeHidden = false } = {}) {
    const items = (await allSpaces()).filter((i) => listed(i, { includeHidden }))
    const by = (t) => items.filter((i) => i.type === t).sort(byRelevance)
    const hubs = by('hub')
    const communities = by('community')
    const channels = by('channel')
    return {
      hubs,
      communities,
      channels,
      /* Familia moja: Hubs + Jumuiya kwa orodha moja (§3) */
      places: [...hubs, ...communities].sort(byRelevance),
      counts: {
        hubs: hubs.length,
        communities: communities.length,
        places: hubs.length + communities.length,
        channels: channels.length,
      },
      /* Nafasi zangu: umiliki na uanachama (object moja — §39) */
      mine: items.filter((i) => i.joined || i.owned).sort(byRelevance),
      followed: channels.filter((i) => i.joined),
    }
  },

  /* Space moja: muktadha kamili */
  async getSpace(type, id) {
    const item = await compose(id)
    if (!item) return null
    const [people, activity, relatedGroups] = await Promise.all([
      this.getPeople(id),
      contentRepository.listSpacePosts(id),
      this.getRelatedGroups(id),
    ])
    return { ...item, people, activity, relatedGroups, canManage: item.owned }
  },

  /* Watu: timu (roles) + wanachama (§9/§21/§34) */
  async getPeople(id) {
    const item = await compose(id)
    if (!item || item.visibility === 'hidden') return { team: [], members: [], lead: null }
    /* Watu: wanachama wa mock + timu (spaces zilizoundwa zina timu = mimi) */
    const team = item.team || []
    const ids = [...new Set([...(spacesMembers[id] || []), ...team.map((t) => t.userId)])]
    const users = await Promise.all(ids.map((uid) => identityRepository.getUser(uid)))
    const teamIds = new Set(team.map((t) => t.userId))
    const members = users.filter(Boolean).map((u) => ({
      id: u.id,
      name: u.name,
      handle: u.handle,
      tone: u.avatarTone || 'green',
      verified: !!u.verified,
      role: (team.find((t) => t.userId === u.id) || {}).role || 'Mwanachama',
      isTeam: teamIds.has(u.id),
    }))
    const ownerId = (team[0] || {}).userId
    const lead = ownerId ? members.find((m) => m.id === ownerId) || null : null
    return {
      lead,
      team: members.filter((m) => m.isTeam),
      members: members.filter((m) => !m.isTeam),
      memberRoles: [...new Set(members.map((m) => m.role))],
    }
  },

  /* Content ya Space: inapita kwenye contentRepository ileile */
  async getActivity(id, { kind = 'all' } = {}) {
    const items = await contentRepository.listSpacePosts(id)
    if (kind === 'event') return items.filter((i) => i.sourceKind === 'event')
    if (kind === 'media') return items.filter((i) => ['image', 'video', 'reel', 'audio'].includes(i.kind))
    return items
  },

  /* Matukio: content ya kind 'event' (hakuna engine ya pili — §10/§24) */
  async getEvents(id) {
    const items = await this.getActivity(id, { kind: 'event' })
    return items.map((i) => ({
      ...i,
      attending: !!session.attending[i.id],
    }))
  },

  async attendEvent(eventId, on = true) {
    if (on) session.attending[eventId] = true
    else delete session.attending[eventId]
    return { id: eventId, attending: !!on }
  },

  /* Rasilimali: vitu vinavyoweza kuhifadhiwa bila mtandao (§11/§25).
     Chanzo ni systemRepository (Save Offline) — hakuna vault ya pili. */
  async getResources(id) {
    const item = await compose(id)
    if (!item || !item.resources?.length) return { items: [], available: false }
    const offlineables = await systemRepository.getOfflineables()
    const byId = new Map(offlineables.map((o) => [o.id, o]))
    const items = item.resources
      .map((r) => {
        const live = byId.get(r.id)
        return live ? { ...live, label: r.label || live.label, meta: r.meta || live.meta } : { ...r, saved: false }
      })
      .filter(Boolean)
    return { items, available: items.length > 0 }
  },

  /** Hifadhi rasilimali bila mtandao — njia ileile ya Save Offline */
  async saveResource(id) {
    return systemRepository.saveOffline(id)
  },

  /* Vikundi vinavyohusiana: Chat ni mfumo mmoja (§12/§22/§43) */
  async getRelatedGroups(id) {
    const links = spacesGroupLinks[id] || []
    if (!links.length) return []
    const groups = await Promise.all(links.map((gid) => gunduaRepository.getEntity('group', gid)))
    return (
      await Promise.all(
        groups.filter(Boolean).map(async (g) => ({
          id: g.id,
          name: g.name,
          members: g.members,
          tone: g.tone,
          joined: g.joined,
          conversationId: await gunduaRepository.getJoinedConversation(g.id),
        })),
      )
    )
  },

  /* ── Uanachama: njia zote zinapita gunduaRepository (§5/§15) ── */

  async join(type, id) {
    const item = await compose(id)
    if (!item) return { id, joined: false, blocked: true }
    /* Private-Listed → ombi; Private-Hidden → kiungo/mwaliko pekee */
    if (item.visibility === 'listed') return this.requestJoin(type, id)
    if (item.visibility === 'hidden' && !item.joined) {
      return { id, type, joined: false, needsInvite: true, note: 'Nafasi hii ni ya mwaliko — inahitaji kiungo au mwaliko wa mwanachama.' }
    }
    if (type === 'channel') {
      const res = await gunduaRepository.followChannel(id)
      return { id, type, joined: res.following, note: `Unafuata ${item.name}` }
    }
    const res = await gunduaRepository.join(type, id)
    return { ...res, note: `Umejiunga na ${item.name}` }
  },

  /** Ombi la kujiunga (private-listed) — halisi kama hali ya kikao */
  async requestJoin(type, id) {
    const item = await compose(id)
    if (!item) return { id, requested: false }
    session.requests[id] = true
    return { id, type, requested: true, joined: false, note: `Ombi limekutumwa — litathibitishwa na wasimamizi wa ${item.name}` }
  },

  /** Kutoka kwenye Space (hub/jumuiya) — hali ya kikao */
  async leave(type, id) {
    if (type === 'channel') {
      const res = await gunduaRepository.unfollowChannel(id)
      return { id, joined: res.following, note: 'Umekoma kufuata' }
    }
    session.leaving[id] = true
    session.requests[id] = false
    return { id, joined: false, note: 'Umetoka kwenye nafasi hii — unaweza kujiunga tena' }
  },

  /* ── Uundaji (Create Space) — hatua 3 (§40) ────────────────── */

  async createSpace(draft) {
    const type = SPACE_TYPES.includes(draft?.type) ? draft.type : 'hub'
    const id = `my-${type}-${session.created.length + 1}`
    const author = await identityRepository.getCurrentUser()
    const space = {
      id,
      type,
      name: draft?.name?.trim() || (type === 'channel' ? 'Channel yangu' : type === 'community' ? 'Jumuiya yangu' : 'Hub yangu'),
      handle: `@${(draft?.name || 'nafasi').toLowerCase().replace(/[^a-z0-9]+/g, '')}`.slice(0, 24),
      bio: draft?.purpose || '',
      purpose: draft?.purpose || '',
      category: draft?.category || 'Jumla',
      place: draft?.place ? { mji: draft.place, mkoa: draft.place, nchi: 'Tanzania' } : null,
      visibility: ['public', 'listed', 'hidden'].includes(draft?.visibility) ? draft.visibility : 'public',
      joinMode: type === 'channel' ? 'follow' : draft?.visibility === 'listed' ? 'request' : 'open',
      founded: '2026',
      rules: draft?.rules?.length ? draft.rules : ['Kuwa mwenyewe katika kuchapisha.'],
      team: [{ userId: me.id, role: 'Owner' }],
      relatedGroups: [],
      relatedChannels: [],
      resources: [],
      cover: draft?.cover || 'green',
      tone: draft?.cover || 'green',
      avatarTone: draft?.cover || 'green',
      verified: false,
      ownedBy: author?.id || me.id,
    }
    session.created.push(space)
    return { ...space, owned: true, joined: true }
  },

  /** Spaces nilizounda kwenye kikao hiki (vinapotea ukifunga app) */
  async listCreated() {
    return session.created.map((s) => ({ ...s }))
  },

  /* ── Ufikivu: hali tatu (data, si UI) ──────────────────────── */
  async getVisibilityModel() {
    return [
      {
        id: 'public',
        label: 'Wazi (Public)',
        hint: 'Inaonekana kwenye Gundua na Spaces. Kujiunga ni papo hapo.',
        joinLabel: 'Jiunge',
      },
      {
        id: 'listed',
        label: 'Binafsi — Iliyoorodheshwa',
        hint: 'Utambulisho unaonekana; content haipatikani hadi ujiunge kwa ombi.',
        joinLabel: 'Omba kujiunga',
      },
      {
        id: 'hidden',
        label: 'Binafsi — Fichwa',
        hint: 'Haipatikani kwa kutafuta — mwaliko au kiungo pekee.',
        joinLabel: 'Mwaliko pekee',
      },
    ]
  },

  /* ── Takwimu: halisi pekee (hakuna views/mapato ya kubuni) ── */
  async getStats(id) {
    const item = await compose(id)
    if (!item) return null
    const items = await contentRepository.listSpacePosts(id)
    const events = items.filter((i) => i.sourceKind === 'event').length
    const reactions = items.reduce((n, i) => n + (i.stats?.reactions || 0), 0)
    const comments = items.reduce((n, i) => n + (i.stats?.comments || 0), 0)
    const shares = items.reduce((n, i) => n + (i.stats?.shares || 0), 0)
    return {
      followers: item.followers,
      members: item.members,
      posts: items.length,
      events,
      reactions,
      comments,
      shares,
      /* Tahadhari ya ukweli: hakuna views/wachunguzi wa kubuni */
      note: 'Takwimu hizi ni za kikao hiki cha prototype — ni content na mwingiliano uliopo.',
    }
  },

  isAttending(eventId) {
    return !!session.attending[eventId]
  },

  listMyRequests() {
    return Object.keys(session.requests).filter((k) => session.requests[k])
  },
}

/* Mpangilio: zangu mbele, kisha ukubwa wa wanachama */
function byRelevance(a, b) {
  return (
    Number(b.owned) - Number(a.owned) ||
    Number(b.joined) - Number(a.joined) ||
    (b.members ?? 0) - (a.members ?? 0) ||
    String(a.name).localeCompare(String(b.name))
  )
}

export const mockSpacesRepository = repository

/* Jina lifupi kwa matumizi ya ndani ya repository (compose haipo nje) */
export const SPACES_TYPES = SPACE_TYPES
