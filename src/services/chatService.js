// ══════════════════════════════════════════════════════════════
// PASIHAI — APPLICATION SERVICE: CHAT
//
// MFUMO MMOJA wa mawasiliano:
//   Direct Conversation · Group Conversation
//   (+ parentContext: community/hub = metadata ya kikundi)
//
// Hali za mtandao ZINATOKA kwa safu ya mfumo iliyopo (systemService):
//   ONLINE · LOCAL · WAITING_SYNC · SYNCED · OFFLINE
// Media inaheshimu sera ya Internet Relay: HAIBEBI faili —
// hatubadili kwenda internet kimya kimya (hakuna silent fallback).
// ══════════════════════════════════════════════════════════════

import { chatRepository, identityRepository, systemRepository, REPOSITORY_MODE } from '../data/repositories/index.js'
import { systemService } from './systemService.js'
import { contactsService } from './contactsService.js'
import {
  GROUP_ANNOUNCEMENT_SENDERS,
  GROUP_DESCRIPTION_MAX,
  GROUP_JOIN_LABELS,
  GROUP_JOIN_METHODS,
  GROUP_LOCATION_VISIBILITY,
  GROUP_NAME_MAX,
  GROUP_PRIVACY,
  GROUP_RULES_MAX,
  GROUP_SLOW_MODE,
  GROUP_TEXT_MAX,
  GROUP_WHO_CAN_ADD,
  GROUP_WHO_CAN_REPLY,
  GROUP_WHO_CAN_REACT,
  groupMemberLimit,
  isGroupType,
} from '../config/groupLimits.js'
import { normalizeDraftSettings } from '../data/repositories/groupSettingsShape.js'
import { GROUP_GRANTABLE_ACTIONS, groupRoleMax } from '../config/groupPermissions.js'

/* ── Ufafanuzi wa hali za ujumbe (state vocabulary) ───────── */

/* Kila hali: label (kamili) · short (chip) · tone (rangi) · tick (alama).
   MUHIMU — dhana mbili TOFAUTI zinazoheshimiwa kila wakati:
     (1) HALI ya uwasilishaji  : queued/sent/delivered/read/failed…
     (2) NJIA ya usafirishaji  : internet/relay/mesh/local (angalia ROUTES)
   `synced` na `relayed` ni hali za safu/njia ZENYEWE — HAZIMAANISHI
   kuwa mpokeaji amepokea. Risiti (`delivered`/`read`) zinatoka kwa
   mpokeaji; hazipo kwenye mfumo halisi bado (tazama audit ya delivery). */
const MESSAGE_STATES = {
  sending: { label: 'Inatuma…', short: 'Inatuma', tone: 'quiet', tick: 'pending' },
  sent: { label: 'Imetumwa (imekubaliwa na mfumo wangu)', short: 'Imetumwa', tone: 'quiet', tick: 'sent' },
  synced: { label: 'Imesawazishwa (safu ya mfumo — si risiti ya mpokeaji)', short: 'Imesawazishwa', tone: 'ok', tick: 'sent' },
  relayed: { label: 'Imepitishwa kwa Internet Relay (maandishi mafupi pekee)', short: 'Relay', tone: 'ok', tick: 'sent' },
  delivered: { label: 'Imefika kwa kifaa cha mpokeaji', short: 'Imefika', tone: 'ok', tick: 'delivered' },
  read: { label: 'Imesomwa na mpokeaji', short: 'Imesomwa', tone: 'blue', tick: 'read' },
  waiting: { label: 'Waiting for sync (upo kwenye foleni ya kutuma)', short: 'Foleni', tone: 'gold', tick: 'pending' },
  local: { label: 'Local Mesh (kupitia ukaribu)', short: 'Mesh', tone: 'blue', tick: 'pending' },
  vault: { label: 'Imehifadhiwa (Offline Vault)', short: 'Vault', tone: 'quiet', tick: 'pending' },
  'blocked-media': { label: 'Inasubiri Wi-Fi au Data Kamili', short: 'Inasubiri Wi-Fi', tone: 'gold', tick: 'pending' },
  'waiting-wifi': { label: 'Inasubiri Wi-Fi · imehifadhiwa', short: 'Inasubiri Wi-Fi', tone: 'gold', tick: 'pending' },
  'waiting-data': { label: 'Inatumwa kwa Data yako', short: 'Data yako', tone: 'blue', tick: 'pending' },
  retrying: { label: 'Inajaribu tena', short: 'Inajaribu', tone: 'gold', tick: 'retry' },
  failed: { label: 'Imeshindwa kutumwa', short: 'Imeshindwa', tone: 'red', tick: 'failed' },
  expired: { label: 'Imeisha muda kwenye foleni (TTL)', short: 'Imeisha muda', tone: 'quiet', tick: 'expired' },
}

/* ── Kikundi halisi (identity join) ─────────────────────────── */

const DEMO_MEMBERS = [
  { id: 'kelvin', name: 'Dr. Kelvin', role: 'Msimamizi', tone: 'blue' },
  { id: 'sarah', name: 'Sarah', role: 'Mwanafunzi', tone: 'green' },
  { id: 'juma', name: 'Juma Rashid', role: 'Kiongozi', tone: 'clay' },
  { id: 'asha', name: 'Asha Mussa', role: 'Rafiki', tone: 'gold' },
]

async function withMembers(item) {
  if (item.type !== 'group') {
    // Direct conversation: load the other user's profile
    const account = item.accountId ? await identityRepository.getUser(item.accountId).catch(() => null) : null
    return {
      ...item,
      account,
      title: account?.name || item.title || 'Mazungumzo',
      avatarTone: account?.avatarTone || 'green',
    }
  }
  // Group: use real participant data if available, otherwise demo fallback
  const members = item.participants || []
  const count = item.members > 40 ? 4 : 3
  if (members.length > 0) {
    const memberPreview = members.slice(0, count).map(p => ({
      id: p.id,
      name: p.name,
      role: p.id === item.createdBy ? 'Admin' : 'Member',
      tone: p.avatarTone || 'green',
    }))
    return { ...item, memberPreview }
  }
  return { ...item, memberPreview: DEMO_MEMBERS.slice(0, count) }
}

/* ── Service ────────────────────────────────────────────────── */

/* ── Validation ya uundaji wa kikundi (§5) ─────────────────────
   Kanuni zinalingana na CHECK constraints za migration 033 — UI na
   backend (mock|live|DB trigger) zinasimama kwenye kanuni ILEILE. */
function validateGroupDraftImpl(draft = {}) {
  const errors = {}
  const name = String(draft.name || '').trim()
  if (!name) errors.name = 'Jina la kikundi linahitajika.'
  else if (name.length > GROUP_NAME_MAX) errors.name = `Jina lisiwe zaidi ya herufi ${GROUP_NAME_MAX}.`

  const type = draft.type || 'normal'
  if (!isGroupType(type)) errors.type = 'Aina ya kikundi si sahihi.'
  if (!GROUP_PRIVACY.includes(draft.privacy || 'private')) errors.privacy = 'Chagua Public au Private.'
  if (!GROUP_JOIN_METHODS.includes(draft.joinMethod || 'request')) errors.joinMethod = 'Chagua njia ya kujiunga.'
  if (!GROUP_WHO_CAN_ADD.includes(draft.whoCanAdd || 'owner_admins')) errors.whoCanAdd = 'Chagua nani anaweza kuongeza wanachama.'
  if (!GROUP_WHO_CAN_REPLY.includes(draft.whoCanReply || 'all')) errors.whoCanReply = 'Chagua nani anaweza kujibu.'
  if (!GROUP_WHO_CAN_REACT.includes(draft.whoCanReact || 'all')) errors.whoCanReact = 'Chagua nani anaweza kutumia reactions.'
  if (!GROUP_ANNOUNCEMENT_SENDERS.includes(draft.announcementSenders || 'owner_admins')) {
    errors.announcementSenders = 'Chagua nani anatuma matangazo.'
  }
  if (!GROUP_LOCATION_VISIBILITY.includes(draft.locationVisibility || 'hidden')) {
    errors.locationVisibility = 'Chagua kiwango cha mahali kinachoonekana.'
  }
  const slow = Number(draft.slowModeSeconds ?? 0)
  if (!GROUP_SLOW_MODE.includes(slow)) errors.slowModeSeconds = 'Kipindi cha slow mode si sahihi.'

  const desc = String(draft.description || '').trim()
  if (desc.length > GROUP_DESCRIPTION_MAX) errors.description = `Maelezo mafupi yasizidi herufi ${GROUP_DESCRIPTION_MAX}.`
  for (const [field, label] of [
    ['purpose', 'Madhumuni'],
    ['goals', 'Malengo'],
    ['procedures', 'Taratibu'],
    ['warnings', 'Maonyo'],
    ['consequences', 'Matokeo ya ukiukaji'],
  ]) {
    if (String(draft[field] || '').trim().length > GROUP_TEXT_MAX) errors[field] = `${label} yasizidi herufi ${GROUP_TEXT_MAX}.`
  }
  if (String(draft.rules || '').trim().length > GROUP_RULES_MAX) errors.rules = `Sheria zisizidi herufi ${GROUP_RULES_MAX}.`

  const members = Array.isArray(draft.members) ? draft.members : []
  if (members.length === 0) errors.members = 'Chagua angalau contact mmoja.'
  const limit = groupMemberLimit(type)
  if (members.length + 1 > limit) errors.members = `Kikomo cha wanachama kwa aina hii ni ${limit} (wewe unahesabiwa).`

  return { ok: Object.keys(errors).length === 0, errors }
}

/* ── Ruhusa ya kuongeza wanachama (§2·§4) ───────────────────────
   Chanzo KILEKILE cha watu kinachotumiwa na picker (getPhoneBook /
   getNewChat): kikundi hakiwezi kuongezewa mtu ambaye hayupo kwenye
   orodha hiyo. Hapa ni ulinzi wa service layer; ulinzi wa DB/RLS kwa
   ruhusa za kila kitendo ni M2 (unahitaji idhini — haujagusa policies). */
async function assertMembersAllowedImpl(memberIds = []) {
  const ids = [...new Set(memberIds.filter(Boolean))]
  if (!ids.length) return
  const book = await chatRepository.getPhoneBook()
  /* Kontakti inaweza kuwasilishwa kwa `accountId` (weka live) au `id` ya
     orodha (mock/demo) — zote ni watu WALEWALE wa chanzo kimoja. Watu
     wasio na akaunti (accountId null) hawawezi kuwa wanachama. */
  const allowed = new Set()
  for (const c of book || []) {
    if (!c.accountId) continue
    allowed.add(c.accountId)
    if (c.id) allowed.add(c.id)
  }
  const notAllowed = ids.filter((id) => !allowed.has(id))
  if (notAllowed.length) {
    const e = new Error(
      notAllowed.length === 1
        ? 'Mtu uliyemchagua hayupo kwenye contacts zako — hawezi kuongezwa kwenye kikundi.'
        : `Watu ${notAllowed.length} uliowachagua hawapo kwenye contacts zako — hawawezi kuongezwa.`,
    )
    e.code = 'member_not_allowed'
    e.notAllowed = notAllowed
    throw e
  }
}

/* ── Kuzuia double submission (§2) ──────────────────────────────
   Ombi LILELILE linalorudiwa wakati mmoja linarudisha ahadi ILEILE —
   kikundi kimoja, si mawili. Baada ya kumaliza, kikundi kingine cha
   jina lilelile bado kinaweza kuundwa kwa kawaida. */
let inflightGroupCreate = null

function groupCreateKey(payload = {}) {
  const members = [...(payload.members || [])].map(String).sort().join(',')
  return JSON.stringify({
    n: String(payload.name || '').trim(),
    t: payload.type || 'normal',
    m: members,
    dp: !!payload.files?.dp,
    cv: !!payload.files?.cover,
  })
}

export const chatService = {
  /* ── Inbox: orodha + hali ya mfumo ───────────────────────── */
  async getInbox(filter = 'zote') {
    const [conversations, filters, connection, brief, archived] = await Promise.all([
      chatRepository.listConversations(),
      chatRepository.getFilters(),
      systemRepository.getConnection(),
      systemService.getDataSavedBrief(),
      chatRepository.listArchived(),
    ])

    /* Archived: haziondoki kwenye orodha kuu (zinapatikana kupitia panel ya Archived).
       Hazifutwi, na kuziweka archived hakutoki kwenye kikundi. */
    const archivedIds = new Set(archived.map((c) => c.id))
    const list = await Promise.all(conversations.filter((c) => !archivedIds.has(c.id)).map(withMembers))
    const filtered =
      filter === 'direct'
        ? list.filter((c) => c.type === 'direct')
        : filter === 'vikundi'
          ? list.filter((c) => c.type === 'group')
          : filter === 'haijasomwa'
            ? list.filter((c) => c.unread > 0)
            : list

    return {
      filters,
      activeFilter: filter,
      conversations: filtered,
      counts: {
        zote: list.length,
        direct: list.filter((c) => c.type === 'direct').length,
        vikundi: list.filter((c) => c.type === 'group').length,
        haijasomwa: list.filter((c) => c.unread > 0).length,
        unreadTotal: list.reduce((n, c) => n + (c.unread || 0), 0),
      },
      system: {
        state: connection.state,
        label: connection.label,
        detail: connection.detail,
        transport: connection.transport,
        dataSaved: brief.total,
      },
    }
  },

  /* ── Thread: conversation + messages + hali ─────────────── */
  async getThread(convId) {
    const [conversation, messages, connection, relay, transports] = await Promise.all([
      chatRepository.getConversation(convId),
      chatRepository.listMessages(convId),
      systemRepository.getConnection(),
      systemRepository.getInternetRelay(),
      systemRepository.getTransports(),
    ])
    if (!conversation) return null

    const localMeshUp = transports.some((t) => t.scope === 'local' && t.available)

    return {
      conversation: await withMembers(conversation),
      messages: messages.map((m) => {
        const info = MESSAGE_STATES[m.state] || MESSAGE_STATES.sent
        /* Risiti (kama ipo): inaonyesha kile kinachojulikana kwa hakika.
           `receipt.simulated = true` = risiti ya MAJARIBIO (mock) — UI
           inaitangaza waziwazi, haijafichwa kama data halisi. */
        return {
          ...m,
          stateInfo: info,
          tick: info.tick,
          receipt: m.receipt || null,
        }
      }),
      system: {
        state: connection.state,
        label: connection.label,
        detail: connection.detail,
        localMeshUp,
        relayEnabled: relay.enabled,
        relayReached: relay.reached,
        relayDetail: relay.detail,
      },
      /* Nota ya sera — inaonekana kwenye thread pale inapohitajika */
      policyNote: !localMeshUp && !relay.enabled ? 'Internet Relay imezimwa · Local Mesh haipo karibu' : '',
    }
  },

  /* ── Tuma ujumbe: hali inatoka kwa safu ya mfumo ────────── */
  async sendMessage(convId, payload = {}) {
    // Live: ujumbe ni 'synced' tu INSERT ikirudisha safu. Hakuna relay/mesh/foleni ya mock.
    // Kosa lolote linatupwa ili UI ionyeshe kushindwa kwa uaminifu.
    if (REPOSITORY_MODE === 'supabase') {
      const message = await chatRepository.sendMessage(convId, payload)
      return { message: { ...message, route: 'internet', stateInfo: MESSAGE_STATES.synced }, conversation: null }
    }
    const connection = await systemRepository.getConnection()
    const { message, conversation } = await chatRepository.sendMessage(convId, payload)

    // Text ndogo pekee inaweza kupita Internet Relay; media haipiti kabisa.
    const eligible = (message.text || '').length <= 480 && (payload.kind || 'text') === 'text'
    const NOTES = {
      vault: 'Imehifadhiwa (Offline Vault) · itasafiri mtandao ukirudi',
      local: 'Local Mesh · kupitia ukaribu (bila data)',
      relayed: 'Imepitishwa kwa Internet Relay (ujumbe mfupi pekee)',
      waiting: 'Kwenye foleni · itasafiri mtandao ukirudi',
      synced: '',
    }
    let state = 'sent'
    let route = 'internet'

    if (connection.state === 'OFFLINE') {
      state = 'vault'
      route = 'local'
      // Ujumbe uningia kwenye foleni ILEILE ya mfumo (System → Sync)
      await systemRepository.enqueue({
        kind: 'message',
        label: `Ujumbe kwa ${conversation?.title || 'mazungumzo'}`,
        detail: 'Chat · maandishi',
      })
    } else if (connection.state === 'LOCAL') {
      state = 'local'
      route = 'mesh'
    } else if (connection.state === 'LIMITED' || connection.state === 'WAITING_SYNC') {
      state = eligible ? 'relayed' : 'waiting'
      route = eligible ? 'relay' : 'local'
    } else {
      state = 'synced'
    }

    const updated = await chatRepository.setMessageState(convId, message.id, {
      state,
      route,
      note: NOTES[state] || '',
    })

    // Hakuna timer za delivered/read. Risiti zinahitaji uthibitisho wa backend.
    const fresh = Array.isArray(updated)
      ? (updated.find((m) => m.id === message.id) || message)
      : message

    return {
      message: { ...fresh, route, stateInfo: MESSAGE_STATES[fresh.state] || MESSAGE_STATES.sent },
      conversation,
    }
  },

  /* ── Kufuatilia mabadiliko ya thread (risiti zinapoingia) ───
     Mock ina notify ya ndani; mfumo halisi (Supabase) HAUna realtime
     bado — hivyo hii inarudi no-op, na UI haidai mabadiliko yoyote. */
  subscribeThread(convId, onUpdate) {
    if (typeof chatRepository.subscribe !== 'function') return () => {}
    const off = chatRepository.subscribe((changedConvId) => {
      if (!changedConvId || changedConvId === convId) onUpdate?.()
    })
    return typeof off === 'function' ? off : () => {}
  },

  async reactToMessage(convId, msgId, reaction = 'heart') {
    return chatRepository.reactToMessage(convId, msgId, reaction)
  },

  /* ── Media: sera ya relay inatumika (hakuna silent fallback) ── */
  async attachMedia(convId, media = {}) {
    const [guard, relay, transports, message] = await Promise.all([
      chatRepository.attachMedia(convId),
      systemRepository.getInternetRelay(),
      systemRepository.getTransports(),
      chatRepository.createMediaMessage(convId, media),
    ])
    const mesh = transports.find((t) => t.id === 'wifiDirect' && t.available)
    return {
      ...guard,
      media: message.media,
      message,
      meshAvailable: !!mesh,
      relayNote: relay.enabled
        ? 'Internet Relay inapitisha maandishi pekee — media haipiti.'
        : 'Internet Relay imezimwa. Hata ikiwashwa hupitisha maandishi pekee — media haipiti.',
    }
  },

  async resolveMedia(convId, msgId, choice) {
    const messages = await chatRepository.resolveMedia(convId, msgId, choice)
    return messages
  },

  /* ── New Chat: tabaka tatu za identity ──────────────────── */
  async getNewChat() {
    const [phoneBook, requests, directory] = await Promise.all([
      chatRepository.getPhoneBook(),
      chatRepository.getRequests(),
      identityRepository.listUsers(),
    ])
    return {
      savedFriends: phoneBook.filter((c) => c.saved),
      pasihaiFriends: phoneBook.filter((c) => c.friend && !c.saved),
      accounts: phoneBook.filter((c) => c.accountId && !c.friend),
      invite: phoneBook.filter((c) => !c.accountId),
      directoryCount: directory.length,
      pending: requests.filter((r) => r.state === 'pending' && r.type === 'received').length,
      note: 'Simu (phone contacts) ni chanzo cha kifaa; PASIHAI Friend na Saved Friend ni mahusiano ya jukwaa.',
    }
  },

  /**
   * Utafutaji wa namba ya simu — njia MOJA (contactsService):
   *   · ubadilishaji wa E.164 kwa parser (si kubadilisha string)
   *   · ulinganishaji kamili kwa hash (server-side kwenye live) — si jina
   *   · hali ya urafiki kwa RLS ya mtumiaji mwenyewe
   * Hafichui namba ya mtu mwingine; hurudisha akaunti au "hajajiunga".
   */
  async lookupNumber(number, country) {
    const res = await contactsService.lookupNumber(number, country)
    if (res.invalid) {
      return { number, invalid: true, e164: null, cases: [] }
    }
    if (!res.found) {
      return {
        number,
        invalid: false,
        e164: res.e164,
        cases: [{
          id: 'none',
          match: res.e164,
          name: null,
          phone: contactsService.maskPhone(res.e164),
          accountId: null,
          friend: false,
          saved: false,
          friendState: 'unknown',
          note: 'Namba hii haijasajiliwa ChatHai bado. Unaweza kumwalika ajiunge.',
        }],
      }
    }
    return {
      number,
      invalid: false,
      e164: res.e164,
      cases: [{
        id: res.accountId,
        match: res.e164,
        name: res.account?.name || null,
        handle: res.account?.handle || null,
        phone: contactsService.maskPhone(res.e164),
        accountId: res.accountId,
        friend: res.friendState === 'friend',
        saved: res.alreadySaved,
        friendState: res.friendState,
        verified: Boolean(res.account?.verified),
        note: res.alreadySaved
          ? 'Akaunti ipo kwenye contacts zako. Unaweza kuendelea na mazungumzo.'
          : res.friendState === 'friend'
            ? 'Rafiki wa ChatHai. Unaweza kuanza mazungumzo au kumhifadhi kwenye contacts.'
            : res.friendState === 'blocked'
              ? 'Umekataza mtu huyu. Fungua kwanza ili kuweza kuwasiliana.'
              : 'Akaunti ipo ChatHai (si rafiki). Unaweza kutuma ombi la urafiki au kuanza mazungumzo.',
      }],
    }
  },

  /* ── Requests ───────────────────────────────────────────── */
  async getRequests() {
    const all = await chatRepository.getRequests()
    return {
      received: all.filter((r) => r.type === 'received'),
      sent: all.filter((r) => r.type === 'sent'),
    }
  },

  async respondRequest(id, action) {
    return chatRepository.respondRequest(id, action)
  },

  /* ── Anzisha / unda ─────────────────────────────────────── */
  async startDirect(accountId) {
    return chatRepository.startDirect(accountId)
  },

  /** Validation MOJA ya uundaji wa kikundi — inatumiwa na wizard na service. */
  validateGroupDraft(draft) {
    return validateGroupDraftImpl(draft)
  },

  /**
   * Uundaji wa kikundi — njia MOJA:
   *   1. validation (§2: jina · wanachama · kikomo)
   *   2. ruhusa ya wanachama (chanzo kilekile cha picker)
   *   3. kuzuia double submission (ombi lilelile linarudisha kikundi kimoja)
   *   4. model mmoja wa settings (groupSettingsShape.js)
   *   5. repository (mock | live); live ina trigger ya DB kwa kikomo na
   *      uhakiki wa wanachama kabla ya kufanikiwa
   * Owner = muundaji (chat_conversations.created_by + role='owner' ya 033).
   *
   * opts.memberPolicy:
   *   'contacts' (default) — wanachama lazima wawe kwenye orodha ya picker
   *   'system'             — njia za ndani (mfano kujiunga kupitia Gundua)
   */
  async createGroup(payload = {}, opts = {}) {
    const { ok, errors } = validateGroupDraftImpl(payload)
    if (!ok) {
      const e = new Error(Object.values(errors)[0] || 'Taarifa za kikundi hazijakamilika.')
      e.code = 'validation'
      e.errors = errors
      throw e
    }
    if ((opts.memberPolicy || 'contacts') !== 'system') {
      await assertMembersAllowedImpl(payload.members || [])
    }
    const key = groupCreateKey(payload)
    if (inflightGroupCreate && inflightGroupCreate.key === key) {
      return inflightGroupCreate.promise
    }
    const run = (async () => {
      const type = payload.type || 'normal'
      const limit = groupMemberLimit(type)
      const settings = normalizeDraftSettings(payload, { type, memberLimit: limit })
      return chatRepository.createGroup({
        name: payload.name,
        members: payload.members,
        tone: payload.tone || settings.tone,
        files: payload.files || null,
        settings,
        parentContext: payload.parentContext || null,
      })
    })()
    inflightGroupCreate = { key, promise: run }
    run
      .finally(() => {
        if (inflightGroupCreate && inflightGroupCreate.promise === run) inflightGroupCreate = null
      })
      .catch(() => {})
    return run
  },

  /* ── Settings za kikundi (chanzo kimoja — M1) ─────────────── */
  async getGroupSettings(convId) {
    return chatRepository.getGroupSettings(convId)
  },

  async updateGroupSettings(convId, patch) {
    if (!patch || typeof patch !== 'object' || Object.keys(patch).length === 0) {
      const e = new Error('Hakuna mabadiliko yaliyotolewa.')
      e.code = 'validation'
      throw e
    }
    return chatRepository.updateGroupSettings(convId, patch)
  },

  /* ── Wanachama, roles na ruhusa (M2) ────────────────────────
     DB (RPC/RLS) ndiyo mamlaka ya mwisho; JS (`groupPermissions.js`) ni
     mirror ya UI. Hizi ni njia MOJA kwa mock na live. */
  async getGroupMembers(convId) {
    return chatRepository.getGroupMembers(convId)
  },

  async groupCan(convId, action) {
    return chatRepository.groupCan(convId, action)
  },

  async groupAddMember(convId, accountId) {
    return chatRepository.groupAddMember(convId, accountId)
  },

  async groupSetMember(convId, accountId, patch) {
    return chatRepository.groupSetMember(convId, accountId, patch)
  },

  async groupJoin(convId) {
    return chatRepository.groupJoin(convId)
  },

  async groupLeave(convId) {
    return chatRepository.groupLeave(convId)
  },

  async groupTransferOwnership(convId, newOwnerId) {
    return chatRepository.groupTransferOwnership(convId, newOwnerId)
  },

  /** Ruhusa za msingi za role (kwa "weka upya/defaults") — mirror ya DB maxcaps. */
  groupRoleDefaults(role) {
    return GROUP_GRANTABLE_ACTIONS.filter((a) => groupRoleMax(role, a))
  },

  /* ── Search · More · Settings ───────────────────────────── */
  async search(query) {
    return chatRepository.search(query)
  },

  async getMore() {
    const [menu, settings, requests, archived, blocked] = await Promise.all([
      chatRepository.getMoreMenu(),
      chatRepository.getSettings(),
      chatRepository.getRequests(),
      chatRepository.listArchived(),
      chatRepository.listBlocked(),
    ])
    const pending = requests.filter((r) => r.state === 'pending').length
    /* Hints ni hesabu halisi kutoka kwenye data — si namba zilizoandikwa kwa mkono */
    const hints = {
      archived: archived.length ? String(archived.length) : '',
      blocked: blocked.length ? String(blocked.length) : '',
      requests: pending ? `${pending} mpya` : '',
    }
    return {
      menu: menu.map((m) => (m.id in hints ? { ...m, hint: hints[m.id] } : m)),
      settings,
      pending,
    }
  },

  async markAllRead() {
    return chatRepository.markAllRead()
  },

  MESSAGE_STATES,
  async saveFriend(accountId, on = true) {
    return chatRepository.saveFriend(accountId, on)
  },

  async listSavedFriends() {
    return chatRepository.listSavedFriends()
  },

  async sendRequest(accountId) {
    return chatRepository.sendRequest(accountId)
  },

  async listSentRequests() {
    return chatRepository.listSentRequests()
  },

  async blockContact(accountId) {
    return chatRepository.blockContact(accountId)
  },

  async unblockContact(accountId) {
    return chatRepository.unblockContact(accountId)
  },

  async listBlocked() {
    return chatRepository.listBlocked()
  },

  async updateSettings(patch) {
    return chatRepository.setSettings(patch)
  },

  async setConversationTone(convId, tone) {
    return chatRepository.setConversationTone(convId, tone)
  },

  async clearMedia() {
    return chatRepository.clearMedia()
  },

  async archiveConversation(convId, on) {
    return chatRepository.archiveConversation(convId, on)
  },

  async listArchived() {
    return chatRepository.listArchived()
  },

  async saveMessageOffline(convId, msgId) {
    return chatRepository.saveMessageOffline(convId, msgId)
  },

  async deleteMessage(convId, msgId) {
    return chatRepository.deleteMessage(convId, msgId)
  },

  /** Maandishi ya mwaliko — halisi: yanakiliwa, mtumiaji anayatuma kwa SMS. */
  inviteText(contact) {
    const phone = contact?.phone ? ` (${contact.phone})` : ''
    return `Niko PASIHAI${phone ? '' : ''}. Njoo tuunganishe: pasihai.app/jiunge`
  },

  /* Mwaliko wa kikundi — MAANDISHI pekee (hakuna token/kiungo: mfumo wa viungo
     vya mwaliko haupo bado; kujiunga hufanywa kwa kuongezwa na mwanachama).
     Mtumiaji hunakili na kutuma mwenyewe (SMS/WhatsApp) — kama ilivyo kwa
     mwaliko wa mtu mmoja hapo juu. */
  groupInviteText(conv, settings) {
    const name = conv?.title || 'kikundi'
    const join = GROUP_JOIN_LABELS[settings?.joinMethod] || 'Ombi + idhini'
    return `Karibu kwenye kikundi “${name}” kwenye PASIHAI Chat. Njia ya kujiunga: ${join}. Niambie nikiongeze kwenye kikundi.`
  },
}
