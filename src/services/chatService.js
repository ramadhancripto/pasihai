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

import { chatRepository, identityRepository, systemRepository } from '../data/repositories/index.js'
import { systemService } from './systemService.js'

/* ── Ufafanuzi wa hali za ujumbe (state vocabulary) ───────── */

const MESSAGE_STATES = {
  sent: { label: 'Imetumwa', tone: 'quiet' },
  synced: { label: 'Imesawazishwa', tone: 'ok' },
  relayed: { label: 'Relayed (maandishi yamefika)', tone: 'ok' },
  waiting: { label: 'Waiting for sync (upo kwenye foleni ya kutuma)', tone: 'gold' },
  local: { label: 'Local Mesh (kupitia ukaribu)', tone: 'blue' },
  vault: { label: 'Imehifadhiwa (Offline Vault)', tone: 'quiet' },
  'blocked-media': { label: 'Inasubiri Wi-Fi au Data Kamili', tone: 'gold' },
  'waiting-wifi': { label: 'Inasubiri Wi-Fi · imehifadhiwa', tone: 'gold' },
  'waiting-data': { label: 'Inatumwa kwa Data yako', tone: 'blue' },
}

/* ── Kikundi halisi (identity join) ─────────────────────────── */

async function withMembers(item) {
  if (item.type !== 'group') {
    const account = item.accountId ? await identityRepository.getUser(item.accountId) : null
    return { ...item, account }
  }
  const demo = [
    { id: 'kelvin', name: 'Dr. Kelvin', role: 'Msimamizi', tone: 'blue' },
    { id: 'sarah', name: 'Sarah', role: 'Mwanafunzi', tone: 'green' },
    { id: 'juma', name: 'Juma Rashid', role: 'Kiongozi', tone: 'clay' },
    { id: 'asha', name: 'Asha Mussa', role: 'Rafiki', tone: 'gold' },
  ]
  return { ...item, memberPreview: demo.slice(0, item.members > 40 ? 4 : 3) }
}

/* ── Service ────────────────────────────────────────────────── */

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
      messages: messages.map((m) => ({
        ...m,
        stateInfo: MESSAGE_STATES[m.state] || MESSAGE_STATES.sent,
      })),
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
    const fresh = updated.find((m) => m.id === message.id) || message
    return {
      message: { ...fresh, route, stateInfo: MESSAGE_STATES[fresh.state] || MESSAGE_STATES.sent },
      conversation,
    }
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

  async lookupNumber(number) {
    const cases = await chatRepository.lookupNumber(number)
    return { number, cases }
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

  async createGroup(payload) {
    return chatRepository.createGroup(payload)
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
}
