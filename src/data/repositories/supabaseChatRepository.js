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

/* ── Error handling helper ────────────────────────────────── */
function handleError(error, context) {
  console.error(`[SupabaseChatRepository] ${context}:`, error)
  return null
}

/* ── Supabase conversation row → conversation object ──────── */
function mapConversation(row, participants = [], lastMessage = null) {
  if (!row) return null

  return {
    id: row.id,
    type: row.type || 'direct',
    title: row.title || null,
    participants: participants.map(p => ({
      id: p.user_id,
      name: p.profiles?.display_name || p.profiles?.username || 'Unknown',
      handle: `@${p.profiles?.username || 'unknown'}`,
      avatarTone: p.profiles?.avatar_tone || 'green',
      joinedAt: p.joined_at,
      lastReadAt: p.last_read_at,
    })),
    lastMessage: lastMessage ? {
      id: lastMessage.id,
      text: lastMessage.text || '',
      senderId: lastMessage.sender_id,
      createdAt: lastMessage.created_at,
    } : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

      // For each conversation, get participants and last message
      const conversations = await Promise.all(
        participations.map(async (p) => {
          const conv = p.chat_conversations
          
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
            .single()

          return mapConversation(conv, participants || [], lastMessage)
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
  async sendMessage(conversationId, text, mediaUrl = null, mediaType = null, replyToId = null) {
    if (!conversationId || !text || !isSupabaseLive || !supabase) return null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      // Verify user is participant
      const { data: participation } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .single()

      if (!participation) return null // Not a participant

      // Insert message
      const { data: message, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          text: text.trim(),
          media_url: mediaUrl,
          media_type: mediaType,
          reply_to_id: replyToId,
        })
        .select('id, text, sender_id, media_url, media_type, reply_to_id, created_at')
        .single()

      if (error) throw error

      return {
        id: message.id,
        text: message.text,
        senderId: message.sender_id,
        mediaUrl: message.media_url,
        mediaType: message.media_type,
        replyToId: message.reply_to_id,
        createdAt: message.created_at,
      }
    } catch (err) {
      handleError(err, 'sendMessage')
      return null
    }
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
            return { conversationId: p.conversation_id }
          }
        }
      }

      // Create new direct conversation
      const { data: conv, error } = await supabase
        .from('chat_conversations')
        .insert({ type: 'direct', created_by: user.id })
        .select('id')
        .single()

      if (error) throw error

      // Add participants
      await supabase
        .from('chat_participants')
        .insert([
          { conversation_id: conv.id, user_id: user.id },
          { conversation_id: conv.id, user_id: otherUserId },
        ])

      return { conversationId: conv.id }
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
}
