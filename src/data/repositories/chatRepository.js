// ══════════════════════════════════════════════════════════════
// PASIHAI — REPOSITORY: CHAT (mawasiliano)
//
// MFUMO MMOJA: conversation.type = 'direct' | 'group'
// parentContext (community/hub) ni METADATA — si engine ya pili.
//
// CONTRACT:
//   getFilters()                    → Promise<Filter[]>
//   listConversations()             → Promise<Conversation[]>
//   getConversation(id)             → Promise<Conversation|null>
//   listMessages(convId)            → Promise<Message[]>
//   sendMessage(convId, payload)    → Promise<{message, conversation}>
//   reactToMessage(convId, msgId, r)→ Promise<Message[]>
//   setMessageState(convId, msgId, patch) → Promise<Message[]>  (hali · njia · nota)
//   createMediaMessage(convId, media) → Promise<Message>  media mpya (inasubiri chaguo)
//   resolveMedia(convId, msgId, choice) → Promise<Message[]>  (data-now | wait-wifi | mesh)
//   attachMedia(convId)             → Promise<Guard>   sera ya relay kwa media
//   getPhoneBook()                  → Promise<PhoneContact[]>
//   lookupNumber(number)            → Promise<LookupResult[]>  (kesi 4)
//   getRequests() · respondRequest(id, action)
//   startDirect(accountId) · createGroup({name, members})
//   search(query) · markAllRead() · getMoreMenu() · getSettings()
//
// IMPLEMENTATION YA SASA: Mock + in-memory store (mabadiliko ya kikao).
// BAADAYE: LocalChatRepository (local DB + outbox) | FirebaseChatRepository.
// ══════════════════════════════════════════════════════════════

import {
  chatFilters,
  chatConversations,
  chatMessages,
  chatPhoneBook,
  chatNumberLookup,
  chatRequests,
  chatMoreMenu,
  chatSettings,
} from '../mock.js'

let store = null

function db() {
  if (store) return store
  store = {
    conversations: chatConversations.map((c) => ({ ...c })),
    messages: Object.fromEntries(Object.entries(chatMessages).map(([k, v]) => [k, v.map((m) => ({ ...m }))])),
    requests: chatRequests.map((r) => ({ ...r })),
    seq: 0,
    created: 0,
    savedFriends: {},     // { accountId: true }  — Saved Friend = hali
    sentRequests: [],     // maombi niliyotuma
    blocked: [],          // accountId zilizozuiwa
    settings: {},         // mipangilio iliyobadilishwa
    groupTones: {},       // { convId: tone } — picha ya kikundi (mandhari)
    archived: {},         // { convId: true }
    mediaCleared: false,
    deleted: [],          // ujumbe nilioufuta kwangu
  }
  return store
}

const conv = (id) => db().conversations.find((c) => c.id === id) || null

function touch(id, patch) {
  const s = db()
  s.conversations = s.conversations.map((c) => (c.id === id ? { ...c, ...patch } : c))
  return conv(id)
}

/* ── Repository ─────────────────────────────────────────────── */

export const mockChatRepository = {
  async getFilters() {
    return chatFilters.map((f) => ({ ...f }))
  },

  async listConversations() {
    return db().conversations.map((c) => ({ ...c }))
  },

  async getConversation(id) {
    const c = conv(id)
    return c ? { ...c } : null
  },

  async listMessages(convId) {
    return (db().messages[convId] || []).map((m) => ({ ...m }))
  },

  async sendMessage(convId, { kind = 'text', text = '', replyTo = null, audio = null } = {}) {
    const s = db()
    s.seq += 1
    const msg = {
      id: `m-local-${s.seq}`,
      from: 'me',
      kind,
      text,
      at: 'sasa hivi',
      state: 'sent', // service inabadilisha (synced/waiting/relayed) kulingana na safu ya mfumo
      replyTo: replyTo ? { by: replyTo.by, text: replyTo.text } : undefined,
      audio: audio || undefined,
    }
    s.messages[convId] = [...(s.messages[convId] || []), msg]
    touch(convId, {
      last: { by: 'me', text: text || (kind === 'audio' ? 'Ujumbe wa sauti' : 'Ujumbe'), at: 'sasa hivi', kind },
      updatedAt: 'sasa hivi',
      unread: 0,
    })
    return { message: { ...msg }, conversation: conv(convId) }
  },

  async reactToMessage(convId, msgId, reaction = 'heart') {
    const s = db()
    s.messages[convId] = (s.messages[convId] || []).map((m) => {
      if (m.id !== msgId) return m
      const reactions = { ...(m.reactions || {}) }
      reactions[reaction] = (reactions[reaction] || 0) + 1
      return { ...m, reactions }
    })
    return this.listMessages(convId)
  },

  async resolveMedia(convId, msgId, choice) {
    const s = db()
    s.messages[convId] = (s.messages[convId] || []).map((m) => {
      if (m.id !== msgId) return m
      if (choice === 'data-now') return { ...m, state: 'waiting-data', note: 'Inatumwa kwa Data yako (uamuzi wako) · foleni #2' }
      if (choice === 'wait-wifi') return { ...m, state: 'waiting-wifi', note: 'Inasubiri Wi-Fi · imehifadhiwa (Offline Vault)' }
      if (choice === 'mesh') return { ...m, state: 'local', route: 'mesh', note: 'Local Mesh · kupitia ukaribu' }
      return { ...m, state: 'synced' }
    })
    return this.listMessages(convId)
  },

  async setMessageState(convId, msgId, patch = {}) {
    const s = db()
    s.messages[convId] = (s.messages[convId] || []).map((m) => (m.id === msgId ? { ...m, ...patch } : m))
    return this.listMessages(convId)
  },

  async createMediaMessage(convId, media = {}) {
    const s = db()
    const seq = (s.messages[convId] || []).length + 1
    const msg = {
      id: `${convId}-new${seq}`,
      from: 'me',
      kind: media.kind || 'video',
      at: 'sasa hivi',
      state: 'blocked-media',
      media: {
        label: media.label || 'Video (24.8 MB)',
        meta: media.meta || 'Kutoka kwenye simu yako',
      },
      guard: {
        title: 'Inasubiri Wi-Fi au Data Kamili',
        text: 'Internet Relay haibebi video au picha nzito hivi sasa ili kulinda bando la wenzako kwenye mtandao wa dhahura.',
        primary: 'Tuma sasa kwa Data Yako',
        secondary: 'Subiri Wi-Fi',
      },
    }
    s.messages[convId] = [...(s.messages[convId] || []), msg]
    return { ...msg }
  },

  async attachMedia(convId) {
    // Sera: Internet Relay HAIBEBI media. Local Mesh ndiyo njia ya karibu.
    const pending = (db().messages[convId] || []).find((m) => m.state === 'blocked-media')
    return {
      allowed: false,
      media: pending?.media || { label: 'Media', meta: 'Faili lililochaguliwa' },
      title: 'Inasubiri Wi-Fi au Data Kamili',
      text: 'Internet Relay haibebi video au picha nzito hivi sasa ili kulinda bando la wenzako kwenye mtandao wa dhahura.',
      choices: [
        { id: 'mesh', label: 'Tuma kwa Local Mesh', hint: 'Bila data — vifaa vya karibu' },
        { id: 'data-now', label: 'Tuma sasa kwa Data Yako', hint: 'Inatumia bando lako — kwa uamuzi wako' },
        { id: 'wait-wifi', label: 'Subiri Wi-Fi', hint: 'Imehifadhiwa (Offline Vault)' },
      ],
      silentFallback: false,
    }
  },

  async getPhoneBook() {
    return chatPhoneBook.map((c) => ({ ...c }))
  },

  async lookupNumber(number = '') {
    const digits = String(number).replace(/\D/g, '')
    if (!digits) return []
    const local = chatNumberLookup.cases.filter((c) => c.match.endsWith(digits.slice(-6)))
    return (local.length ? local : chatNumberLookup.cases).map((c) => ({ ...c }))
  },

  async getRequests() {
    return db().requests.map((r) => ({ ...r }))
  },

  async respondRequest(id, action) {
    const s = db()
    let created = null
    s.requests = s.requests.map((r) => {
      if (r.id !== id) return r
      if (action === 'accept') return { ...r, state: 'accepted' }
      if (action === 'decline') return { ...r, state: 'declined' }
      if (action === 'block') return { ...r, state: 'blocked' }
      return r
    })
    if (action === 'accept') {
      const r = s.requests.find((x) => x.id === id)
      const existing = s.conversations.find((c) => c.title === r.from)
      if (!existing) {
        s.created += 1
        created = {
          id: `cnew${s.created}`,
          type: 'direct',
          title: r.from,
          tone: r.tone,
          unread: 0,
          relationship: 'request-accepted',
          delivery: 'synced',
          updatedAt: 'sasa hivi',
          last: { by: 'them', text: 'Mazungumzo yameanza', at: 'sasa hivi', kind: 'text' },
        }
        s.conversations = [created, ...s.conversations]
        s.messages[created.id] = [
          { id: `${created.id}-m1`, from: 'system', kind: 'text', text: 'Mazungumzo mapya — ulimwengu wa faragha wa PASIHAI.', at: 'sasa hivi', state: 'sent' },
        ]
      } else created = existing
    }
    return { requests: await this.getRequests(), conversation: created }
  },

  async startDirect(accountId) {
    const s = db()
    const existing = s.conversations.find((c) => c.accountId === accountId)
    if (existing) return { conversation: existing, created: false }
    const contact = chatPhoneBook.find((c) => c.accountId === accountId)
    s.created += 1
    const created = {
      id: `cnew${s.created}`,
      type: 'direct',
      title: contact?.name || 'Mazungumzo mapya',
      tone: contact?.tone || 'green',
      unread: 0,
      accountId,
      relationship: contact?.saved ? 'saved' : contact?.friend ? 'friend' : 'account',
      delivery: 'synced',
      updatedAt: 'sasa hivi',
      last: { by: 'me', text: 'Mazungumzo yameanza', at: 'sasa hivi', kind: 'text' },
    }
    s.conversations = [created, ...s.conversations]
    s.messages[created.id] = []
    return { conversation: created, created: true }
  },

  async createGroup({ name, members = [], parentContext = null }) {
    const s = db()
    s.created += 1
    const created = {
      id: `gnew${s.created}`,
      type: 'group',
      title: name || 'Kikundi Kipya',
      tone: 'green',
      groupIcon: 'group',
      members: members.length,
      memberIds: members,
      parentContext,
      unread: 0,
      delivery: 'synced',
      updatedAt: 'sasa hivi',
      last: { by: 'system', text: 'Kikundi kimeundwa', at: 'sasa hivi', kind: 'text' },
    }
    s.conversations = [created, ...s.conversations]
    s.messages[created.id] = [
      { id: `${created.id}-m1`, from: 'system', kind: 'text', text: `Kikundi “${created.title}” kimeundwa. Wanachama ${members.length}.`, at: 'sasa hivi', state: 'sent' },
    ]
    return created
  },

  async search(query = '') {
    const q = query.trim().toLowerCase()
    if (!q) return { conversations: [], messages: [], people: [] }
    const s = db()
    const conversations = s.conversations.filter(
      (c) => c.title.toLowerCase().includes(q) || (c.parentContext?.label || '').toLowerCase().includes(q),
    )
    const messages = []
    for (const [convId, list] of Object.entries(s.messages)) {
      for (const m of list) {
        const hay = `${m.text || ''} ${m.doc?.name || ''} ${m.media?.label || ''}`.toLowerCase()
        if (hay.includes(q)) {
          const c = conv(convId)
          messages.push({ id: m.id, convId, title: c?.title || '', text: m.text || m.doc?.name || m.media?.label || '', at: m.at })
        }
      }
    }
    const people = chatPhoneBook.filter((c) => c.name.toLowerCase().includes(q))
    return { conversations, messages: messages.slice(0, 6), people }
  },

  async markAllRead() {
    db().conversations = db().conversations.map((c) => (c.unread ? { ...c, unread: 0 } : c))
    return this.listConversations()
  },

  async getMoreMenu() {
    return chatMoreMenu.map((m) => ({ ...m }))
  },

  async getSettings() {
    return { ...chatSettings, overrides: { ...db().settings } }
  },

  /* ── Saved Friend (state · sio urafiki wa pili) ─────────────── */

  async saveFriend(accountId, on = true) {
    const s = db()
    s.savedFriends = { ...s.savedFriends, [accountId]: on }
    return { accountId, saved: !!on }
  },

  async listSavedFriends() {
    return Object.entries(db().savedFriends)
      .filter(([, on]) => on)
      .map(([accountId]) => accountId)
  },

  /* ── Maombi ya mazungumzo (ninayotuma) ─────────────────────── */

  async sendRequest(accountId) {
    const s = db()
    const contact = chatPhoneBook.find((c) => c.accountId === accountId)
    const entry = {
      id: `sr-${s.sentRequests.length + 1}`,
      accountId,
      name: contact?.name || 'Mtumiaji',
      at: 'sasa hivi',
      state: 'sent',
    }
    s.sentRequests = [entry, ...s.sentRequests]
    return entry
  },

  async listSentRequests() {
    return db().sentRequests.map((r) => ({ ...r }))
  },

  /* ── Kuzuia · kufungua ─────────────────────────────────────── */

  async blockContact(accountId) {
    const s = db()
    if (!s.blocked.includes(accountId)) s.blocked = [...s.blocked, accountId]
    return { blocked: s.blocked }
  },

  async unblockContact(accountId) {
    const s = db()
    s.blocked = s.blocked.filter((id) => id !== accountId)
    return { blocked: s.blocked }
  },

  async listBlocked() {
    return db().blocked.map((id) => {
      const c = chatPhoneBook.find((x) => x.accountId === id)
      return { id, accountId: id, name: c?.name || 'Mtumiaji', tone: c?.tone || 'slate' }
    })
  },

  /* ── Mipangilio ya Chat (hali ya kikao) ────────────────────── */

  async setSettings(patch = {}) {
    const s = db()
    s.settings = { ...s.settings, ...patch }
    return { ...s.settings }
  },

  /* ── Picha ya kikundi (mandhari) · kusafisha media ─────────── */

  async setConversationTone(convId, tone) {
    const s = db()
    s.groupTones = { ...s.groupTones, [convId]: tone }
    return touch(convId, { tone })
  },

  async clearMedia() {
    const s = db()
    s.mediaCleared = true
    return { cleared: true, at: 'sasa hivi' }
  },

  /* ── Kuhifadhi (archive) ───────────────────────────────────── */

  async archiveConversation(convId, on = true) {
    const s = db()
    s.archived = { ...s.archived, [convId]: on }
    return { convId, archived: !!on }
  },

  async listArchived() {
    const s = db()
    return s.conversations.filter((c) => s.archived[c.id]).map((c) => ({ ...c }))
  },

  /* ── Ujumbe: kuhifadhi kwenye kifaa (bila mtandao) ─────────── */

  async saveMessageOffline(convId, msgId) {
    const s = db()
    s.messages[convId] = (s.messages[convId] || []).map((m) =>
      m.id === msgId ? { ...m, savedOffline: true } : m,
    )
    return { convId, msgId, savedOffline: true }
  },

  /* ── Ujumbe: kufuta kwangu ─────────────────────────────────── */

  async deleteMessage(convId, msgId) {
    const s = db()
    s.deleted = [...s.deleted, msgId]
    s.messages[convId] = (s.messages[convId] || []).filter((m) => m.id !== msgId)
    return { convId, msgId, deleted: true }
  },
}
