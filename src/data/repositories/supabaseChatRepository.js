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

/* ── Error handling helper ────────────────────────────────── */
function handleError(error, context) {
  console.error(`[SupabaseChatRepository] ${context}:`, error)
  return null
}

/* ── Helpers za ujumbe ──────────────────────────────────── */
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

  // For direct conversations, derive title from the other participant
  let title = row.title
  let accountId = null
  if (row.type === 'direct' && currentUserId) {
    const other = participants.find(p => p.user_id !== currentUserId)
    if (other) {
      title = other.profiles?.display_name || other.profiles?.username || 'Mazungumzo'
      accountId = other.user_id
    }
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

  return {
    id: row.id,
    type: row.type || 'direct',
    title: title || 'Mazungumzo',
    accountId,
    participants: mappedParticipants,
    members: mappedParticipants.length,
    unread,
    lastMessage: lastMessage ? {
      id: lastMessage.id,
      text: lastMessage.text || '',
      senderId: lastMessage.sender_id,
      createdAt: lastMessage.created_at,
      at: lastMessage.created_at
        ? new Date(lastMessage.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        : '',
    } : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
      conversation.messages = (messages || []).reverse().map(m => ({
        id: m.id,
        text: m.text || '',
        senderId: m.sender_id,
        mediaUrl: m.media_url,
        mediaType: m.media_type,
        replyToId: m.reply_to_id,
        createdAt: m.created_at,
      }))

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

  /* ── WRITE: Create group conversation ─────────────────────── */
  async createGroup({ name, members = [], parentContext = null }) {
    if (!isSupabaseLive || !supabase) return null
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data: conv, error } = await supabase
        .from('chat_conversations')
        .insert({ type: 'group', title: name, created_by: user.id })
        .select('id, type, title, created_at')
        .single()

      if (error) throw error

      // Add all members including creator
      const allMembers = [...new Set([user.id, ...members])]
      const participantRows = allMembers.map(userId => ({
        conversation_id: conv.id,
        user_id: userId,
      }))

      const { error: pError } = await supabase
        .from('chat_participants')
        .insert(participantRows)

      if (pError) throw pError

      return {
        id: conv.id,
        type: 'group',
        title: conv.title,
        tone: 'green',
        members: allMembers.length,
        unread: 0,
        updatedAt: conv.created_at,
      }
    } catch (err) {
      handleError(err, 'createGroup')
      return null
    }
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
