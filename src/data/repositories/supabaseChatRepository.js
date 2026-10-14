// ══════════════════════════════════════════════════════════════
// PASIHAI — SUPABASE CHAT REPOSITORY
//
// Implementation ya chatRepository inayotumia Supabase.
// Inalingana na contract ya mockChatRepository.
//
// SUPABASE TABLES:
//   chat_conversations: id, type, title, created_by, created_at, updated_at
//   chat_participants: conversation_id, user_id, joined_at, last_read_at
//   chat_messages: id, conversation_id, sender_id, text, media_url, etc.
//
// MAPPING:
//   chat_conversations.type → conversation.type (direct, group)
//   chat_participants → conversation.participants
//   chat_messages → messages array
// ══════════════════════════════════════════════════════════════

import { supabase, isSupabaseLive } from '../../lib/supabaseClient.js'
import { chatFilters } from '../mock.js'
import { groupMemberLimit } from '../../config/groupLimits.js'
import { normalizeDraftSettings, rowToSettings, settingsToRow } from './groupSettingsShape.js'

/* ── Error handling helper ────────────────────────────────── */
function handleError(error, context) {
  console.error(`[SupabaseChatRepository] ${context}:`, error)
  return null
}

/* ── ChatHai Groups: media ya kikundi (bucket moja ya migration 033) ── */
const GROUP_MEDIA_BUCKET = 'group-media'

function groupImageExt(file) {
  const fromName = (file?.name || '').split('.').pop()?.toLowerCase()
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName
  const map = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }
  return map[file?.type] || 'jpg'
}

async function uploadGroupImage(conversationId, file, kind) {
  const path = `${conversationId}/${kind}-${Date.now()}.${groupImageExt(file)}`
  const { error } = await supabase.storage
    .from(GROUP_MEDIA_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error
  return path
}

/* Bucket ni PRIVATE — tunaunda signed URL kwa wanachama pekee (RLS ya storage). */
async function groupMediaUrl(path) {
  if (!path) return null
  if (String(path).startsWith('demo:')) return null
  if (/^https?:\/\//.test(path)) return path
  const { data, error } = await supabase.storage
    .from(GROUP_MEDIA_BUCKET)
    .createSignedUrl(path, 60 * 60)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

/* Hitilafu za DB → hitilafu zenye code inayoeleweka kwa UI (hakuna 'success' ya uongo). */
function mapGroupError(err, fallback = 'Kitendo hakikufanikiwa. Jaribu tena.') {
  const msg = String(err?.message || '')
  if (msg.includes('chat_group_member_limit')) {
    const e = new Error('Kikomo cha wanachama kimefikiwa.')
    e.code = 'member_limit'
    return e
  }
  if (msg.includes('chat_group_membership_verify')) {
    const e = new Error('Wanachama hawakuhifadhiwa kikamilifu. Jaribu tena.')
    e.code = 'verify'
    return e
  }
  if (err?.code === '42501' || /row-level security|permission denied/i.test(msg)) {
    const e = new Error('Hauna ruhusa kwa kitendo hiki.')
    e.code = 'permission'
    return e
  }
  const e = new Error(fallback)
  e.code = 'unknown'
  e.cause = err
  return e
}

/* ── Ramani ya errors za RPC/guards za kikundi (§4: si "permission denied" ghafi) ── */
const GROUP_ERROR_MESSAGES = {
  chat_group_owner_must_transfer: 'Hamisha umiliki kwa mwanachama mwingine kwanza.',
  chat_group_owner_immutable: 'Mmiliki hawezi kuondolewa au kubadilishwa kwa njia hii.',
  chat_group_owner_only: 'Ni mmiliki pekee anayeweza kutekeleza kitendo hiki.',
  chat_group_transfer_self: 'Hauwezi kuhamisha umiliki kwako mwenyewe.',
  chat_group_transfer_invalid_target: 'Mwanachama huyo hayupo kikamilifu kwenye kikundi.',
  chat_group_self_role_change_forbidden: 'Hauwezi kubadilisha role au hali yako mwenyewe.',
  chat_group_self_edit_forbidden: 'Hauwezi kubadilisha role yako mwenyewe.',
  chat_group_insufficient_rank: 'Cheo hiki ni cha juu/kulingana nawe — huwezi kuibadilisha.',
  chat_group_cannot_grant_equal_or_higher: 'Huwezi kumpa mtu cheo cha juu/kulingana nawe.',
  chat_group_invite_required: 'Kikundi hiki kinahitaji mwaliko ili kujiunga.',
  chat_group_join_restricted: 'Kikundi hiki ni cha faragha — ombi la kujiunga linahitajika.',
  chat_group_already_member: 'Tayari u mwanachama wa kikundi hiki.',
  chat_group_banned: 'Hauwezi kujiunga — umezuiliwa kwenye kikundi hiki.',
  chat_group_not_member: 'Wewe si mwanachama wa kikundi hiki.',
  chat_group_member_not_found: 'Mwanachama huyo hakupatikana kwenye kikundi.',
  chat_group_roles_direct_forbidden: 'Roles hazitumiki kwenye mazungumzo ya moja kwa moja.',
  chat_group_leave_direct_unsupported: 'Kuondoka kunahusu vikundi pekee.',
  chat_group_invalid_permissions: 'Ruhusa ulizochagua hazihalali kwa role hii.',
  chat_group_participant_keys_immutable: 'Muundo wa mwanachama haubadiliki.',
  chat_group_conversation_not_found: 'Kikundi hakipatikani.',
  chat_group_not_found: 'Kikundi hakipatikani.',
  chat_group_no_permission_add: 'Hauna ruhusa kuongeza wanachama.',
  chat_group_no_permission_roles: 'Hauna ruhusa kubadilisha roles au ruhusa.',
  chat_group_no_permission_members: 'Hauna ruhusa kusimamia wanachama.',
  chat_group_no_permission_moderate: 'Hauna ruhusa kudhibiti ujumbe.',
  chat_group_no_permission_edit_info: 'Hauna ruhusa kubadilisha taarifa za kikundi.',
  chat_group_no_permission: 'Hauna ruhusa kwa kitendo hiki.',
}

/* ── Helpers za ujumbe ──────────────────────────────────── */
/* RPC moja ya kikundi → errors za Swahili (mapGroupError). */
async function callGroupRpc(name, params, fallback) {
  const { data, error } = await supabase.rpc(name, params)
  if (error) {
    handleError(error, name)
    const msg = String(error?.message || '')
    for (const [key, swahili] of Object.entries(GROUP_ERROR_MESSAGES)) {
      if (msg.includes(key)) { const e = new Error(swahili); e.code = key; throw e }
    }
    throw mapGroupError(error, fallback)
  }
  return data
}

async function requireUser(action) {
  if (!isSupabaseLive || !supabase) {
    throw new Error(`${action}: Supabase live haijawezeshwa.`)
  }
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) throw new Error(`${action}: hujaingia. Ingia tena.`)
  return { user: data.user }
}

function toUiMessage(row, myId) {
  const at = row.created_at
    ? new Date(row.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : ''
  return {
    id: row.id,
    from: row.sender_id === myId ? 'me' : 'them',
    kind: row.media_url ? (row.media_type || 'media') : 'text',
    text: row.text || '',
    at,
    createdAt: row.created_at,
    state: 'synced',
    replyToId: row.reply_to_id || null,
    mediaUrl: row.media_url || null,
  }
}

/* ── Supabase conversation row → conversation object ──────── */
function mapConversation(row, participants = [], lastMessage = null, currentUserId = null) {
  if (!row) return null

  const mappedParticipants = participants.map(p => ({
    id: p.user_id,
    name: p.profiles?.display_name || p.profiles?.username || 'Unknown',
    handle: `@${p.profiles?.username || 'unknown'}`,
    avatarTone: p.profiles?.avatar_tone || 'green',
    joinedAt: p.joined_at,
    lastReadAt: p.last_read_at,
  }))

  // For direct conversations, derive title and tone from the other participant
  let title = row.title
  let accountId = null
  let tone = 'green'
  if (row.type === 'direct' && currentUserId) {
    const other = participants.find(p => p.user_id !== currentUserId)
    if (other) {
      title = other.profiles?.display_name || other.profiles?.username || 'Mazungumzo'
      accountId = other.user_id
      tone = other.profiles?.avatar_tone || 'green'
    }
  }
  if (row.type === 'group') {
    tone = row.tone || 'blue'
  }

  // Compute unread count: messages after last_read_at from other senders
  let unread = 0
  if (currentUserId && lastMessage) {
    const myParticipant = participants.find(p => p.user_id === currentUserId)
    const lastRead = myParticipant?.last_read_at
    if (!lastRead || new Date(lastMessage.created_at) > new Date(lastRead)) {
      if (lastMessage.sender_id !== currentUserId) {
        unread = 1 // Simplified: at least 1 unread
      }
    }
  }

  // Format last message time
  const lastAt = lastMessage?.created_at
    ? new Date(lastMessage.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : ''

  // Format updatedAt
  const updatedAtFormatted = row.updated_at
    ? new Date(row.updated_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : ''

  return {
    id: row.id,
    type: row.type || 'direct',
    title: title || 'Mazungumzo',
    tone,
    accountId,
    participants: mappedParticipants,
    members: mappedParticipants.length,
    unread,
    // UI uses c.last?.text and c.last?.at — not c.lastMessage
    last: lastMessage ? {
      id: lastMessage.id,
      text: lastMessage.text || '',
      senderId: lastMessage.sender_id,
      at: lastAt,
    } : null,
    // Also keep lastMessage for backward compat
    lastMessage: lastMessage ? {
      id: lastMessage.id,
      text: lastMessage.text || '',
      senderId: lastMessage.sender_id,
      createdAt: lastMessage.created_at,
      at: lastAt,
    } : null,
    createdAt: row.created_at,
    updatedAt: updatedAtFormatted,
    relationship: 'none',
  }
}

/* ── Supabase Chat Repository ─────────────────────────────── */
export const supabaseChatRepository = {
  /* ── READ: List conversations ───────────────────────────── */
  async listConversations() {
    if (!isSupabaseLive || !supabase) return []

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      // Get conversations where user is participant
      const { data: participations, error } = await supabase
        .from('chat_participants')
        .select(`
          conversation_id,
          last_read_at,
          chat_conversations (
            id,
            type,
            title,
            created_by,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id)
        .order('chat_conversations(updated_at)', { ascending: false })

      if (error) throw error
      if (!participations) return []

      // For each conversation, get participants, last message, and unread count
      const conversations = await Promise.all(
        participations.map(async (p) => {
          const conv = p.chat_conversations
          if (!conv) return null

          // Get participants
          const { data: participants } = await supabase
            .from('chat_participants')
            .select('user_id, joined_at, last_read_at, profiles(user_id, username, display_name, avatar_tone)')
            .eq('conversation_id', conv.id)

          // Get last message
          const { data: lastMessage } = await supabase
            .from('chat_messages')
            .select('id, text, sender_id, created_at')
            .eq('conversation_id', conv.id)
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          // Get unread count (messages after last_read_at from others)
          let unreadCount = 0
          const myLastRead = p.last_read_at
          if (myLastRead) {
            const { count } = await supabase
              .from('chat_messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .neq('sender_id', user.id)
              .is('deleted_at', null)
              .gt('created_at', myLastRead)
            unreadCount = count || 0
          } else {
            // Never read: count all messages from others
            const { count } = await supabase
              .from('chat_messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .neq('sender_id', user.id)
              .is('deleted_at', null)
            unreadCount = count || 0
          }

          const mapped = mapConversation(conv, participants || [], lastMessage, user.id)
          if (mapped) mapped.unread = unreadCount
          return mapped
        })
      )

      return conversations.filter(Boolean)
    } catch (err) {
      handleError(err, 'listConversations')
      return []
    }
  },

  /* ── READ: Get conversation with messages ───────────────── */
  async getConversation(conversationId) {
    if (!conversationId || !isSupabaseLive || !supabase) return null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      // Verify user is participant
      const { data: participation } = await supabase
        .from('chat_participants')
        .select('last_read_at')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .single()

      if (!participation) return null // Not a participant

      // Get conversation
      const { data: conv, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('id', conversationId)
        .single()

      if (error) throw error
      if (!conv) return null

      // Get participants
      const { data: participants } = await supabase
        .from('chat_participants')
        .select('user_id, joined_at, last_read_at, profiles(user_id, username, display_name, avatar_tone)')
        .eq('conversation_id', conversationId)

      // Get messages (last 50)
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('id, text, sender_id, media_url, media_type, reply_to_id, created_at')
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50)

      // Update last_read_at
      await supabase
        .from('chat_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)

      const conversation = mapConversation(conv, participants || [], null)
      conversation.messages = (messages || []).reverse().map(m => toUiMessage(m, user.id))

      return conversation
    } catch (err) {
      handleError(err, 'getConversation')
      return null
    }
  },

  /* ── WRITE: Send message ────────────────────────────────── */
  /* Labels za vichujio vya UI (sio data ya mtumiaji). */
  async getFilters() {
    return chatFilters.map((f) => ({ ...f }))
  },

  /* Ujumbe wa mazungumzo, umbo la UI: from 'me' | 'them'. Makosa yanatupwa, si null. */
  async listMessages(conversationId) {
    const { user } = await requireUser('Kusoma ujumbe')
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, text, sender_id, media_url, media_type, reply_to_id, created_at')
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw new Error(`Ujumbe haujapakiwa: ${error.message}`)
    return (data || []).reverse().map((m) => toUiMessage(m, user.id))
  },

  /* Inakubali (convId, { text }) au (convId, text). Inatupa kosa kama ujumbe haujahifadhiwa.
     Inarudisha ujumbe kwa umbo la UI; state 'synced' inamaanisha INSERT ilirudisha safu. */
  async sendMessage(conversationId, input = {}, mediaUrl = null, mediaType = null, replyToId = null) {
    const payload = typeof input === 'string' ? { text: input } : (input || {})
    if (payload.kind && payload.kind !== 'text') {
      throw new Error('Aina hii ya ujumbe bado haijaunganishwa na live. Tuma maandishi pekee.')
    }
    const text = String(payload.text ?? '').trim()
    if (!conversationId) throw new Error('Mazungumzo hayajachaguliwa.')
    if (!text) throw new Error('Ujumbe ni tupu.')
    const { user } = await requireUser('Kutuma ujumbe')

    const { data: participation, error: pErr } = await supabase
      .from('chat_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (pErr) throw new Error(`Ruhusa ya mazungumzo haijathibitishwa: ${pErr.message}`)
    if (!participation) throw new Error('Huna ruhusa ya kutuma kwenye mazungumzo haya.')

    const { data: message, error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        text,
        media_url: mediaUrl,
        media_type: mediaType,
        reply_to_id: replyToId,
      })
      .select('id, text, sender_id, media_url, media_type, reply_to_id, created_at')
      .single()
    if (error) throw new Error(`Ujumbe haujahifadhiwa: ${error.message}`)
    return toUiMessage(message, user.id)
  },

  /* ── WRITE: Start direct conversation ───────────────────── */
  async startDirect(otherUserId) {
    if (!otherUserId || !isSupabaseLive || !supabase) return null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      // Check if direct conversation already exists
      const { data: existing } = await supabase
        .from('chat_participants')
        .select('conversation_id, chat_conversations!inner(id, type)')
        .eq('user_id', user.id)
        .eq('chat_conversations.type', 'direct')

      if (existing && existing.length > 0) {
        // Find conversation that includes otherUserId
        for (const p of existing) {
          const { data: otherParticipant } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('conversation_id', p.conversation_id)
            .eq('user_id', otherUserId)
            .single()

          if (otherParticipant) {
            // Get other user's profile for title
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name, username')
              .eq('user_id', otherUserId)
              .single()
            return {
              conversationId: p.conversation_id,
              conversation: {
                id: p.conversation_id,
                title: profile?.display_name || profile?.username || 'Mazungumzo',
              },
            }
          }
        }
      }

      // Get other user's profile for title
      const { data: newProfile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('user_id', otherUserId)
        .single()

      // Create new direct conversation
      const { data: conv, error } = await supabase
        .from('chat_conversations')
        .insert({ type: 'direct', created_by: user.id })
        .select('id')
        .single()

      if (error) throw error

      // Add participants. Kosa lazima lionekane; conversation isiyo na washiriki wote haitangazwi kama imefanikiwa.
      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert([
          { conversation_id: conv.id, user_id: user.id },
          { conversation_id: conv.id, user_id: otherUserId },
        ])
      if (participantsError) throw participantsError

      return {
        conversationId: conv.id,
        conversation: {
          id: conv.id,
          title: newProfile?.display_name || newProfile?.username || 'Mazungumzo mapya',
        },
      }
    } catch (err) {
      handleError(err, 'startDirect')
      return null
    }
  },

  /* ── WRITE: Delete message (soft delete) ────────────────── */
  async deleteMessage(messageId) {
    if (!messageId || !isSupabaseLive || !supabase) return false

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const { error } = await supabase
        .from('chat_messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('sender_id', user.id)

      if (error) throw error
      return true
    } catch (err) {
      handleError(err, 'deleteMessage')
      return false
    }
  },

  /* ── READ: Unread count ─────────────────────────────────── */
  async getUnreadCount() {
    if (!isSupabaseLive || !supabase) return 0

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return 0

      // Count conversations with unread messages
      const { data: participations } = await supabase
        .from('chat_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id)

      if (!participations) return 0

      let unreadCount = 0
      for (const p of participations) {
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', p.conversation_id)
          .is('deleted_at', null)
          .gt('created_at', p.last_read_at)
          .neq('sender_id', user.id)

        unreadCount += count || 0
      }

      return unreadCount
    } catch (err) {
      handleError(err, 'getUnreadCount')
      return 0
    }
  },

  /* ── READ: Phone book (friends/contacts for new chat) ────── */
  async getPhoneBook() {
    if (!isSupabaseLive || !supabase) return []
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      // Get people the current user follows (mutual = friends)
      const { data: following } = await supabase
        .from('follows')
        .select('followee_id')
        .eq('follower_id', user.id)

      const followeeIds = (following || []).map(f => f.followee_id)
      if (followeeIds.length === 0) return []

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, entity_type, avatar_tone, verified')
        .in('user_id', followeeIds)
        .is('deleted_at', null)

      return (profiles || []).map(p => ({
        accountId: p.user_id,
        name: p.display_name || p.username,
        handle: `@${p.username}`,
        type: p.entity_type || 'person',
        avatarTone: p.avatar_tone || 'green',
        verified: p.verified || false,
      }))
    } catch (err) {
      handleError(err, 'getPhoneBook')
      return []
    }
  },

  /* ── READ: More menu items ────────────────────────────────── */
  async getMoreMenu() {
    return [
      { id: 'archived', label: 'Zilizohifadhiwa', icon: 'archive' },
      { id: 'settings', label: 'Mipangilio', icon: 'settings' },
      { id: 'blocked', label: 'Waliokatazwa', icon: 'block' },
    ]
  },

  /* ── READ: Archived conversations ─────────────────────────── */
  async listArchived() {
    // Phase: archived conversations not yet tracked in DB
    return []
  },

  /* ── READ: Chat requests (incoming) ───────────────────────── */
  async getRequests() {
    // Phase: chat-specific requests not yet separate from friend requests
    return []
  },

  /* ── WRITE: Respond to chat request ───────────────────────── */
  async respondRequest(id, action) {
    return { requests: [], conversation: null }
  },

  /* ── READ: Search conversations/messages/people ───────────── */
  async search(query = '') {
    const q = query.trim().toLowerCase()
    if (!q || !isSupabaseLive || !supabase) return { conversations: [], messages: [], people: [] }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { conversations: [], messages: [], people: [] }

      // Search people
      const { data: people } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_tone')
        .or(`display_name.ilike.%${q}%,username.ilike.%${q}%`)
        .is('deleted_at', null)
        .limit(6)

      return {
        conversations: [],
        messages: [],
        people: (people || []).map(p => ({
          accountId: p.user_id,
          name: p.display_name || p.username,
          handle: `@${p.username}`,
          avatarTone: p.avatar_tone || 'green',
        })),
      }
    } catch (err) {
      handleError(err, 'search')
      return { conversations: [], messages: [], people: [] }
    }
  },

  /* ── WRITE: Mark all conversations as read ────────────────── */
  async markAllRead() {
    if (!isSupabaseLive || !supabase) return []
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      await supabase
        .from('chat_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('user_id', user.id)

      return this.listConversations()
    } catch (err) {
      handleError(err, 'markAllRead')
      return []
    }
  },

  /* ── READ: Chat settings ──────────────────────────────────── */
  async getSettings() {
    return {
      notifications: true,
      sounds: true,
      readReceipts: true,
      mediaAutoDownload: true,
    }
  },

  /* ── WRITE: Save/unsave friend in chat ────────────────────── */
  async saveFriend(accountId, on = true) {
    return { accountId, saved: !!on }
  },

  /* ── READ: Saved friends list ─────────────────────────────── */
  async listSavedFriends() {
    return []
  },

  /* ── WRITE: Send chat request ─────────────────────────────── */
  async sendRequest(accountId) {
    return { id: `sr-${Date.now()}`, accountId, state: 'sent', at: new Date().toISOString() }
  },

  /* ── READ: Sent requests ──────────────────────────────────── */
  async listSentRequests() {
    return []
  },

  /* ── WRITE: Block contact ─────────────────────────────────── */
  async blockContact(accountId) {
    if (!isSupabaseLive || !supabase) return { blocked: [] }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { blocked: [] }

      await supabase
        .from('blocks')
        .insert({ blocker_id: user.id, blocked_id: accountId })
        .select()

      return { blocked: [accountId] }
    } catch (err) {
      handleError(err, 'blockContact')
      return { blocked: [] }
    }
  },

  /* ── WRITE: Unblock contact ───────────────────────────────── */
  async unblockContact(accountId) {
    if (!isSupabaseLive || !supabase) return { blocked: [] }
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { blocked: [] }

      await supabase
        .from('blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', accountId)

      return { blocked: [] }
    } catch (err) {
      handleError(err, 'unblockContact')
      return { blocked: [] }
    }
  },

  /* ── READ: Blocked contacts ───────────────────────────────── */
  async listBlocked() {
    if (!isSupabaseLive || !supabase) return []
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data } = await supabase
        .from('blocks')
        .select('blocked_id, profiles!blocks_blocked_id_fkey(username, display_name, avatar_tone)')
        .eq('blocker_id', user.id)

      return (data || []).map(b => ({
        id: b.blocked_id,
        accountId: b.blocked_id,
        name: b.profiles?.display_name || b.profiles?.username || 'Mtumiaji',
        tone: b.profiles?.avatar_tone || 'slate',
      }))
    } catch (err) {
      handleError(err, 'listBlocked')
      return []
    }
  },

  /* ── WRITE: Chat settings ─────────────────────────────────── */
  async setSettings(patch = {}) {
    return { ...patch }
  },

  /* ── WRITE: Set conversation tone ─────────────────────────── */
  async setConversationTone(convId, tone) {
    return { convId, tone }
  },

  /* ── WRITE: Clear media ───────────────────────────────────── */
  async clearMedia() {
    return { cleared: true, at: new Date().toISOString() }
  },

  /* ── WRITE: Archive conversation ──────────────────────────── */
  async archiveConversation(convId, on = true) {
    return { convId, archived: !!on }
  },

  /* ── WRITE: Create group conversation (ChatHai Groups — M1) ──
     Hatua: (1) conversation (2) DP/cover → bucket private (3) settings
     (4) wanachama — muundaji = owner. Kikomo cha wanachama kinahakikiwa
     hapa NA kwenye trigger ya DB (backbuild §7: UI pekee haitoshi).
     Kama hatua yoyote inashindwa, conversation inafutwa — hatuachi
     kikundi nusu (owner wa conversation ndiye anayeweza kufuta). */
  async createGroup({ name, members = [], tone = 'green', files = null, settings = null, parentContext = null }) {
    const { user } = await requireUser('createGroup')
    const type = settings?.type || 'normal'
    const limit = groupMemberLimit(type)
    const title = String(name || '').trim()
    const allMembers = [...new Set([user.id, ...members])]

    if (!title) { const e = new Error('Jina la kikundi linahitajika.'); e.code = 'validation'; throw e }
    if (title.length > 100) { const e = new Error('Jina la kikundi liwe herufi 100 kwa juu.'); e.code = 'validation'; throw e }
    if (members.length === 0) { const e = new Error('Chagua angalau contact mmoja.'); e.code = 'validation'; throw e }
    if (allMembers.length > limit) {
      const e = new Error(`Kikomo cha wanachama kwa aina hii ni ${limit}.`)
      e.code = 'member_limit'
      throw e
    }

    let createdId = null
    const warnings = []
    try {
      /* 1. Conversation */
      const { data: conv, error } = await supabase
        .from('chat_conversations')
        .insert({ type: 'group', title, created_by: user.id })
        .select('id, type, title, created_at')
        .single()
      if (error) throw error
      createdId = conv.id

      /* 2. Wanachama KABLA ya upload/settings (F10 ya audit ya M2):
         storage policy ya 'group-media' inahitaji row ya owner
         (`is_chat_group_owner`) — ikiwa haipo bado, upload inashindwa kwenye
         prod. Mpangilio sahihi: conversation → participants → settings →
         uploads → settings (paths). */
      const participantRows = allMembers.map((userId) => ({
        conversation_id: conv.id,
        user_id: userId,
        role: userId === user.id ? 'owner' : 'member',
        status: 'active',
      }))
      const { error: pError } = await supabase.from('chat_participants').insert(participantRows)
      if (pError) throw pError

      /* 3. Uhakiki: wanachama WOTE wamehifadhiwa kweli kabla ya "mafanikio" (§2.9) */
      const { data: savedRows, error: vErr } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('conversation_id', conv.id)
      if (vErr) throw vErr
      if ((savedRows?.length || 0) < allMembers.length) {
        throw new Error(`chat_group_membership_verify: ${savedRows?.length || 0}/${allMembers.length}`)
      }

      /* 4. Settings — chanzo kimoja cha taarifa za kikundi (dp/cover baadaye) */
      const model = normalizeDraftSettings(settings || {}, { type, memberLimit: limit })
      const settingsRow = {
        conversation_id: conv.id,
        ...settingsToRow(model),
        tone,
        member_limit: limit,
      }
      const { error: sErr } = await supabase.from('chat_group_settings').insert(settingsRow)
      if (sErr) throw sErr

      /* 5. DP/cover (hiari) — sasa owner row ipo, storage policy inaruhusu.
         Picha ni HIARI: kama upload inashindwa, kikundi KINAUNDWA na onyo
         linarudishwa — hatuonyeshi "picha imehifadhiwa" kwa uongo. */
      let dpPath = null
      let coverPath = null
      if (files?.dp) {
        try { dpPath = await uploadGroupImage(conv.id, files.dp, 'dp') }
        catch (e) { handleError(e, 'createGroup:dp'); warnings.push('picha ya kikundi haikuhifadhiwa') }
      }
      if (files?.cover) {
        try { coverPath = await uploadGroupImage(conv.id, files.cover, 'cover') }
        catch (e) { handleError(e, 'createGroup:cover'); warnings.push('cover haikuhifadhiwa') }
      }
      if (dpPath || coverPath) {
        const { error: pathErr } = await supabase
          .from('chat_group_settings')
          .update({ dp_path: dpPath, cover_path: coverPath })
          .eq('conversation_id', conv.id)
        if (pathErr) { handleError(pathErr, 'createGroup:paths'); warnings.push('picha haikuhusishwa na kikundi') }
      }

      return {
        id: conv.id,
        type: 'group',
        title: conv.title,
        tone,
        groupIcon: 'group',
        members: allMembers.length,
        memberIds: allMembers,
        ownerId: user.id,
        unread: 0,
        updatedAt: conv.created_at,
        dpUrl: await groupMediaUrl(dpPath),
        coverUrl: await groupMediaUrl(coverPath),
        settings: { ...model, conversationId: conv.id, dpPath, coverPath },
        warnings,
      }
    } catch (err) {
      handleError(err, 'createGroup')
      if (createdId) {
        const { error: cErr } = await supabase.from('chat_conversations').delete().eq('id', createdId)
        if (cErr) handleError(cErr, 'createGroup:cleanup')
      }
      throw mapGroupError(err, 'Kikundi hakikuweza kuundwa. Jaribu tena.')
    }
  },

  /* ── Settings za kikundi (chanzo kimoja — M1) ─────────────── */
  async getGroupSettings(convId) {
    if (!isSupabaseLive || !supabase) return null
    const { data, error } = await supabase
      .from('chat_group_settings')
      .select('*')
      .eq('conversation_id', convId)
      .maybeSingle()
    if (error) { handleError(error, 'getGroupSettings'); return null }
    if (!data) return null
    const model = rowToSettings(data)
    return {
      ...model,
      dpPath: data.dp_path,
      coverPath: data.cover_path,
      dpUrl: await groupMediaUrl(data.dp_path),
      coverUrl: await groupMediaUrl(data.cover_path),
    }
  },

  async updateGroupSettings(convId, patch = {}) {
    await requireUser('updateGroupSettings')
    const row = settingsToRow(patch)
    if (Object.keys(row).length === 0) {
      const e = new Error('Hakuna mabadiliko yaliyotolewa.')
      e.code = 'validation'
      throw e
    }
    try {
      const { data, error } = await supabase
        .from('chat_group_settings')
        .update(row)
        .eq('conversation_id', convId)
        .select('*')
        .single()
      if (error) throw error
      const model = rowToSettings(data)
      return {
        ...model,
        dpPath: data.dp_path,
        coverPath: data.cover_path,
        dpUrl: await groupMediaUrl(data.dp_path),
        coverUrl: await groupMediaUrl(data.cover_path),
      }
    } catch (err) {
      handleError(err, 'updateGroupSettings')
      throw mapGroupError(err, 'Mabadiliko hayakuhifadhiwa. Jaribu tena.')
    }
  },

  /* ── Wanachama, roles na ruhusa (M2) — DB ndiyo mamlaka ya mwisho ──
     UI hutumia mirror ya JS (`src/config/groupPermissions.js`) kuficha/kuzima
     visivyoruhusiwa; kila kitendo halisi kinapita RPC/RLS. */
  async getGroupMembers(convId) {
    if (!isSupabaseLive || !supabase) return []
    const { user } = await requireUser('getGroupMembers')
    const { data, error } = await supabase
      .from('chat_participants')
      .select('user_id, role, status, permissions, joined_at')
      .eq('conversation_id', convId)
      .order('joined_at', { ascending: true })
    if (error) { handleError(error, 'getGroupMembers'); return [] }
    const ids = [...new Set((data || []).map((r) => r.user_id))]
    let names = {}
    if (ids.length) {
      const { data: rows } = await supabase
        .from('profiles')
        .select('user_id, username, display_name')
        .in('user_id', ids)
      names = Object.fromEntries((rows || []).map((pr) => [pr.user_id, pr.display_name || pr.username || null]))
    }
    return (data || []).map((r) => ({
      userId: r.user_id,
      name: names[r.user_id] || null,
      role: r.role || 'member',
      status: r.status || 'active',
      permissions: Array.isArray(r.permissions) ? r.permissions : null,
      joinedAt: r.joined_at,
      isMe: r.user_id === user.id,
    }))
  },

  /** Ukaguzi wa ruhusa dhidi ya DB (mamlaka ya mwisho). */
  async groupCan(convId, action) {
    if (!isSupabaseLive || !supabase) return false
    const { user } = await requireUser('groupCan')
    const { data, error } = await supabase.rpc('chat_group_can', {
      p_conversation_id: convId,
      p_user_id: user.id,
      p_action: action,
    })
    if (error) { handleError(error, 'groupCan'); return false }
    return data === true
  },

  async groupAddMember(convId, userId) {
    await requireUser('groupAddMember')
    return callGroupRpc('chat_group_add_member', { p_conversation_id: convId, p_user_id: userId }, 'Mwanachama hakuongezwa. Jaribu tena.')
  },

  /** patch = { role?, status?, permissions? } — `permissions` array = grants;
      kuacha `permissions` bila kutaja = hakuna mabadiliko ya grants. */
  async groupSetMember(convId, userId, patch = {}) {
    await requireUser('groupSetMember')
    const params = {
      p_conversation_id: convId,
      p_user_id: userId,
      p_role: patch.role ?? null,
      p_status: patch.status ?? null,
    }
    if (Array.isArray(patch.permissions)) params.p_permissions = patch.permissions
    return callGroupRpc('chat_group_set_member', params, 'Mabadiliko hayakuhifadhiwa. Jaribu tena.')
  },

  async groupJoin(convId) {
    await requireUser('groupJoin')
    return callGroupRpc('chat_group_join', { p_conversation_id: convId }, 'Kujiunga hakukufanikiwa. Jaribu tena.')
  },

  async groupLeave(convId) {
    await requireUser('groupLeave')
    return callGroupRpc('chat_group_leave', { p_conversation_id: convId }, 'Kuondoka hakukufanikiwa. Jaribu tena.')
  },

  async groupTransferOwnership(convId, newOwnerId) {
    await requireUser('groupTransferOwnership')
    return callGroupRpc(
      'chat_group_transfer_ownership',
      { p_conversation_id: convId, p_new_owner_id: newOwnerId },
      'Kuhamisha umiliki hakukufanikiwa. Jaribu tena.',
    )
  },

  /* ── WRITE: React to message ──────────────────────────────── */
  async reactToMessage(convId, msgId, reaction = 'heart') {
    // Phase: reactions on messages not yet in DB schema
    return { msgId, reaction }
  },

  /* ── WRITE: Resolve media ─────────────────────────────────── */
  async resolveMedia(convId, msgId, choice) {
    return { msgId, choice }
  },

  /* ── WRITE: Set message state ─────────────────────────────── */
  async setMessageState(convId, msgId, patch = {}) {
    return { msgId, ...patch }
  },

  /* ── WRITE: Create media message ──────────────────────────── */
  async createMediaMessage(convId, media = {}) {
    return this.sendMessage(convId, { kind: media.type || 'image', text: media.caption || '' }, media.url, media.type)
  },

  /* ── WRITE: Attach media ──────────────────────────────────── */
  async attachMedia(convId) {
    return { convId }
  },

  /* ── READ: Lookup phone number ────────────────────────────── */
  async lookupNumber(number = '') {
    const digits = String(number).replace(/\D/g, '')
    if (!digits || !isSupabaseLive || !supabase) return []
    try {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_tone')
        .or(`username.ilike.%${digits}%,display_name.ilike.%${digits}%`)
        .is('deleted_at', null)
        .limit(5)

      return (data || []).map(p => ({
        accountId: p.user_id,
        name: p.display_name || p.username,
        handle: `@${p.username}`,
        avatarTone: p.avatar_tone || 'green',
      }))
    } catch (err) {
      handleError(err, 'lookupNumber')
      return []
    }
  },
}
