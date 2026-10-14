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
import { GROUP_TYPE_LABELS, groupMemberLimit } from '../../config/groupLimits.js'
import {
  GROUP_ROLE_RANK,
  GROUP_GRANTABLE_ACTIONS,
  groupCan,
  groupPermissionsValid,
  groupRoleMax,
} from '../../config/groupPermissions.js'
import { normalizeDraftSettings } from './groupSettingsShape.js'

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
    groupSettings: {},    // { convId: settings } — chanzo kimoja (model ileile ya live, M1)
    archived: {},         // { convId: true }
    mediaCleared: false,
    deleted: [],          // ujumbe nilioufuta kwangu
    memberState: {},      // { convId: rows } — roles/status/permissions (M2, demo)
  }
  return store
}

const conv = (id) => db().conversations.find((c) => c.id === id) || null

/* ── Wasikilizaji wa mabadiliko (mock) ────────────────────────
   Risiti za majaribio zinapoingia, thread inaweza kujirefresh.
   Mfumo halisi (Supabase) hauna realtime bado — hivyo hii ni ya
   mock pekee na UI haitegemei uthibitisho wake. */
const listeners = new Set()
function notify(convId) {
  listeners.forEach((cb) => {
    try {
      cb(convId)
    } catch {
      /* kosa la msikilizaji haliangushi mfumo */
    }
  })
}

/* ── Wanachama wa kikundi (mock, M2) ──────────────────────────
   Demo huanza na me=owner + rows chache; vitendo hubadilisha hali hii.
   Live: RPC za 034 (chat_group_*) — DB ndiyo mamlaka ya mwisho. */
function memberRows(convId) {
  const s = db()
  if (!s.memberState[convId]) {
    const c = conv(convId)
    const rows = [{ userId: 'me', role: 'owner', status: 'active', permissions: null, isMe: true }]
    if (c?.type === 'group') {
      const demo = (c.memberIds || ['p1', 'p2', 'p4']).filter((id) => id !== 'me').slice(0, 4)
      const roles = ['admin', 'moderator', 'member', 'member']
      demo.forEach((id, i) => rows.push({ userId: id, role: roles[i] || 'member', status: 'active', permissions: null, isMe: false }))
    }
    s.memberState[convId] = rows
  }
  return s.memberState[convId]
}

function memberName(userId) {
  if (userId === 'me') return 'Wewe'
  const hit = chatPhoneBook.find((c) => c.accountId === userId || c.id === userId)
  return hit?.name || null
}

function memberError(key, message) {
  const e = new Error(message)
  e.code = key
  return e
}

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
    notify(convId)
    return this.listMessages(convId)
  },

  /* ── Kufuatilia mabadiliko (mock) ─────────────────────────── */
  subscribe(cb) {
    listeners.add(cb)
    return () => listeners.delete(cb)
  },

  /* ── Kuiga mfuatano wa risiti — MOCK PEKEE ────────────────────
     steps = [{ state, afterMs, route?, receipt? }]

     KANUNI YA UAMINIFU:
       * Kila risiti inabeba `simulated: true` (UI inaandika "majaribio").
       * OFFLINE/LOCAL → hakuna hatua: ujumbe unabaki kwenye foleni;
         hatubuni uwasilishaji usiofanyika.
       * Vikundi: hesabu ya JUMLA pekee (audience + waliofika/waliosoma);
         hatusemi kamwe "kila mtu amefika/amesoma". */
  demoDelivery(convId, msgId, steps = []) {
    if (!steps.length) return
    const c = conv(convId)
    const audience = c?.type === 'group' ? c.members || 0 : 0
    steps.forEach((step) => {
      setTimeout(() => {
        const s = db()
        const list = s.messages[convId] || []
        if (!list.some((m) => m.id === msgId)) return
        s.messages[convId] = list.map((m) => {
          if (m.id !== msgId) return m
          const receipt = { simulated: true, ...(m.receipt || {}), ...(step.receipt || {}) }
          if (audience) {
            receipt.audience = audience
            receipt.delivered = Math.round(audience * 0.64)
            if (step.state === 'read') receipt.read = Math.round(audience * 0.25)
          }
          return { ...m, state: step.state, route: step.route || m.route, receipt }
        })
        notify(convId)
      }, step.afterMs)
    })
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

  async createGroup({ name, members = [], tone = 'green', files = null, settings = null, parentContext = null }) {
    const s = db()
    const type = settings?.type || 'normal'
    const limit = groupMemberLimit(type)
    const title = String(name || '').trim()
    const total = members.length + 1 // wewe (muundaji = Owner) + waliyochaguliwa

    /* Utekelezaji wa mfumo huu wa demo: kanuni ILEILE ya live (backend). */
    if (!title) { const e = new Error('Jina la kikundi linahitajika.'); e.code = 'validation'; throw e }
    if (title.length > 100) { const e = new Error('Jina la kikundi liwe herufi 100 kwa juu.'); e.code = 'validation'; throw e }
    if (members.length === 0) { const e = new Error('Chagua angalau contact mmoja.'); e.code = 'validation'; throw e }
    if (total > limit) {
      const e = new Error(`Kikomo cha wanachama kwa aina hii ni ${limit}.`)
      e.code = 'member_limit'
      throw e
    }

    s.created += 1
    const id = `gnew${s.created}`
    /* Demo pekee: faili hazipakiwi kwenye storage hapa — zinaonyeshwa kwa object URL.
       Live repository inapakia kwenye bucket ya 'group-media' (migration 033). */
    const dpUrl = files?.dp ? URL.createObjectURL(files.dp) : null
    const coverUrl = files?.cover ? URL.createObjectURL(files.cover) : null
    const created = {
      id,
      type: 'group',
      title,
      tone,
      groupIcon: 'group',
      members: total,
      memberIds: ['me', ...members],
      ownerId: 'me',
      parentContext,
      unread: 0,
      delivery: 'synced',
      updatedAt: 'sasa hivi',
      dpUrl,
      coverUrl,
      last: { by: 'system', text: 'Kikundi kimeundwa', at: 'sasa hivi', kind: 'text' },
    }
    s.conversations = [created, ...s.conversations]
    s.messages[id] = [
      { id: `${id}-m1`, from: 'system', kind: 'text', text: `Kikundi “${title}” kimeundwa. Aina: ${GROUP_TYPE_LABELS[type] || type} · Wanachama ${total}/${limit}.`, at: 'sasa hivi', state: 'sent' },
    ]
    s.groupTones[id] = tone
    s.groupSettings[id] = {
      ...normalizeDraftSettings(settings || {}, { type, memberLimit: limit }),
      conversationId: id,
      memberLimit: limit,
      tone,
      dpPath: files?.dp ? `demo:${id}/dp` : null,
      coverPath: files?.cover ? `demo:${id}/cover` : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    return { ...created, settings: s.groupSettings[id], warnings: [] }
  },

  /* ── Settings za kikundi (chanzo kimoja — model ileile ya live) ── */
  async getGroupSettings(convId) {
    const s = db()
    const row = s.groupSettings[convId]
    return row ? { ...row } : null
  },

  async updateGroupSettings(convId, patch = {}) {
    const s = db()
    const current = s.groupSettings[convId]
    if (!current) { const e = new Error('Taarifa za kikundi hiki hazipatikani.'); e.code = 'not_found'; throw e }
    if (patch.memberLimit !== undefined) {
      const ceiling = groupMemberLimit(patch.type || current.type)
      if (Number(patch.memberLimit) > ceiling) {
        const e = new Error(`Kikomo cha juu kwa aina hii ni ${ceiling}.`)
        e.code = 'member_limit'
        throw e
      }
    }
    const next = { ...current, ...patch, conversationId: convId, updatedAt: new Date().toISOString() }
    s.groupSettings[convId] = next
    return { ...next }
  },

  /* ── Wanachama, roles na ruhusa (M2) — kanuni ILEILE ya DB, kwa demo ── */
  async getGroupMembers(convId) {
    const c = conv(convId)
    if (!c || c.type !== 'group') return []
    return memberRows(convId).map((r) => ({ ...r, name: memberName(r.userId) }))
  },

  async groupCan(convId, action) {
    const c = conv(convId)
    if (!c) return false
    const rows = memberRows(convId)
    if (c.type !== 'group') {
      return !!rows.find((r) => r.isMe && r.status === 'active')
    }
    const me = rows.find((r) => r.isMe)
    const settings = db().groupSettings[convId] || null
    return groupCan({
      role: me?.role || null,
      status: me?.status || 'active',
      kind: 'group',
      groupType: settings?.type || 'normal',
      settings,
      permissions: me?.permissions ?? null,
      action,
    })
  },

  async groupAddMember(convId, accountId) {
    const rows = memberRows(convId)
    const c = conv(convId)
    if (!c || c.type !== 'group') throw memberError('not_found', 'Kikundi hakipatikani.')
    if (!(await this.groupCan(convId, 'add_member'))) {
      throw memberError('chat_group_no_permission_add', 'Hauna ruhusa kuongeza wanachama.')
    }
    if (rows.some((r) => r.userId === accountId)) {
      throw memberError('chat_group_already_member', 'Tayari ni mwanachama wa kikundi hiki.')
    }
    const settings = db().groupSettings[convId] || {}
    const limit = settings.memberLimit || groupMemberLimit(settings.type || 'normal')
    const active = rows.filter((r) => r.status === 'active').length
    if (active >= limit) throw memberError('chat_group_member_limit', 'Kikomo cha wanachama kimefikiwa.')
    const row = { userId: accountId, role: 'member', status: 'active', permissions: null, isMe: false }
    rows.push(row)
    touch(convId, { members: rows.length })
    notify(convId)
    return { ...row, name: memberName(accountId), warnings: [] }
  },

  async groupSetMember(convId, accountId, patch = {}) {
    const rows = memberRows(convId)
    const me = rows.find((r) => r.isMe)
    const target = rows.find((r) => r.userId === accountId)
    if (!target) throw memberError('chat_group_member_not_found', 'Mwanachama huyo hakupatikana kwenye kikundi.')
    if (accountId === 'me') {
      throw memberError('chat_group_self_role_change_forbidden', 'Hauwezi kubadilisha role yako mwenyewe.')
    }
    if (target.role === 'owner') {
      throw memberError('chat_group_owner_immutable', 'Mmiliki hawezi kuondolewa au kubadilishwa kwa njia hii.')
    }
    const rank = GROUP_ROLE_RANK[me?.role] ?? 0
    const targetRank = GROUP_ROLE_RANK[target.role] ?? 0
    if (patch.role && patch.role !== target.role) {
      if (!(await this.groupCan(convId, 'manage_roles'))) {
        throw memberError('chat_group_no_permission_roles', 'Hauna ruhusa kubadilisha roles au ruhusa.')
      }
      if ((GROUP_ROLE_RANK[patch.role] ?? 0) >= rank) {
        throw memberError('chat_group_cannot_grant_equal_or_higher', 'Huwezi kumpa mtu cheo cha juu/kulingana nawe.')
      }
      if (targetRank >= rank) {
        throw memberError('chat_group_insufficient_rank', 'Cheo hiki ni cha juu/kulingana nawe — huwezi kuibadilisha.')
      }
    }
    if (patch.status && patch.status !== target.status) {
      const allowed = (await this.groupCan(convId, 'restrict_members')) || (await this.groupCan(convId, 'manage_members'))
      if (!allowed) throw memberError('chat_group_no_permission_members', 'Hauna ruhusa kusimamia wanachama.')
      if (targetRank >= rank) {
        throw memberError('chat_group_insufficient_rank', 'Cheo hiki ni cha juu/kulingana nawe — huwezi kuibadilisha.')
      }
    }
    if (patch.permissions !== undefined && patch.permissions !== null) {
      if (!groupPermissionsValid(patch.role || target.role, patch.permissions)) {
        throw memberError('chat_group_invalid_permissions', 'Ruhusa ulizochagua hazihalali kwa role hii.')
      }
    }
    if (patch.role !== undefined) target.role = patch.role
    if (patch.status !== undefined) target.status = patch.status
    if (patch.permissions !== undefined) target.permissions = patch.permissions
    notify(convId)
    return { ...target, name: memberName(target.userId), warnings: [] }
  },

  async groupJoin(convId) {
    const c = conv(convId)
    if (!c || c.type !== 'group') throw memberError('chat_group_not_found', 'Kikundi hakipatikani.')
    const settings = db().groupSettings[convId] || {}
    const rows = memberRows(convId)
    const mine = rows.find((r) => r.isMe)
    if (mine) {
      if (mine.status === 'banned') throw memberError('chat_group_banned', 'Hauwezi kujiunga — umezuiliwa kwenye kikundi hiki.')
      if (mine.status === 'active' || mine.status === 'pending') {
        throw memberError('chat_group_already_member', 'Tayari u mwanachama wa kikundi hiki.')
      }
    }
    const join = settings.joinMethod || 'request'
    const privacy = settings.privacy || 'private'
    if (join === 'invite' || join === 'invite_link') throw memberError('chat_group_invite_required', 'Kikundi hiki kinahitaji mwaliko ili kujiunga.')
    if (join === 'direct' && privacy === 'private') throw memberError('chat_group_join_restricted', 'Kikundi hiki ni cha faragha — ombi la kujiunga linahitajika.')
    const status = join === 'direct' ? 'active' : 'pending'
    if (mine) mine.status = status
    else rows.push({ userId: 'me', role: 'member', status, permissions: null, isMe: true })
    notify(convId)
    return { userId: 'me', status, warnings: [] }
  },

  async groupLeave(convId) {
    const rows = memberRows(convId)
    const mine = rows.find((r) => r.isMe)
    if (!mine || mine.status !== 'active') throw memberError('chat_group_not_member', 'Wewe si mwanachama hai wa kikundi hiki.')
    if (mine.role === 'owner') throw memberError('chat_group_owner_must_transfer', 'Hamisha umiliki kwa mwanachama mwingine kwanza.')
    mine.status = 'left'
    notify(convId)
    return { userId: 'me', status: 'left', warnings: [] }
  },

  async groupTransferOwnership(convId, newOwnerId) {
    const rows = memberRows(convId)
    const mine = rows.find((r) => r.isMe)
    const target = rows.find((r) => r.userId === newOwnerId)
    if (mine?.role !== 'owner') throw memberError('chat_group_owner_only', 'Ni mmiliki pekee anayeweza kuhamisha umiliki.')
    if (newOwnerId === 'me') throw memberError('chat_group_transfer_self', 'Hauwezi kuhamisha umiliki kwako mwenyewe.')
    if (!target || target.status !== 'active') throw memberError('chat_group_transfer_invalid_target', 'Mwanachama huyo hayupo kikamilifu kwenye kikundi.')
    mine.role = 'admin'
    target.role = 'owner'
    touch(convId, { ownerId: newOwnerId })
    notify(convId)
    return { oldOwner: 'admin', newOwner: 'owner', warnings: [] }
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
