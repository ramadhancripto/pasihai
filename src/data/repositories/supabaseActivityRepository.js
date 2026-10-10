// ══════════════════════════════════════════════════════════════
// PASIHAI — SUPABASE ACTIVITY REPOSITORY
//
// Implementation ya activityRepository inayotumia Supabase.
// Inalingana na contract ya mockActivityRepository.
//
// SUPABASE TABLES:
//   notifications: id, user_id, type, actor_id, post_id, title, body, read_at
//
// MAPPING:
//   notifications.type → notification.type
//   notifications.actor_id → actor entity
//   notifications.post_id → linked post
// ══════════════════════════════════════════════════════════════

import { supabase, isSupabaseLive } from '../../lib/supabaseClient.js'

/* ── Error handling helper ────────────────────────────────── */
function handleError(error, context) {
  console.error(`[SupabaseActivityRepository] ${context}:`, error)
  return null
}

/* ── Supabase notification row → notification object ──────── */
function mapNotification(row) {
  if (!row) return null

  const actor = row.actor_profile ? {
    id: row.actor_profile.user_id,
    name: row.actor_profile.display_name || row.actor_profile.username,
    handle: `@${row.actor_profile.username}`,
    avatarTone: row.actor_profile.avatar_tone || 'green',
  } : null

  return {
    id: row.id,
    type: row.type,
    actor,
    postId: row.post_id,
    title: row.title,
    body: row.body || '',
    read: row.read_at !== null,
    createdAt: row.created_at,
    ageMinutes: Math.max(0, Math.floor((Date.now() - new Date(row.created_at).getTime()) / 60000)),
  }
}

/* ── Supabase Activity Repository ────────────────────────── */
export const supabaseActivityRepository = {
  /* ── READ: List notifications ───────────────────────────── */
  async listNotifications(filter = 'all') {
    if (!isSupabaseLive || !supabase) return []

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      let query = supabase
        .from('notifications')
        .select(`
          *,
          actor_profile:profiles!actor_id(user_id, username, display_name, avatar_tone)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (filter === 'unread') {
        query = query.is('read_at', null)
      }

      const { data, error } = await query
      if (error) throw error

      return (data || []).map(mapNotification).filter(Boolean)
    } catch (err) {
      handleError(err, 'listNotifications')
      return []
    }
  },

  /* ── READ: Unread count ─────────────────────────────────── */
  async getUnreadCount() {
    if (!isSupabaseLive || !supabase) return 0

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return 0

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null)

      if (error) throw error
      return count || 0
    } catch (err) {
      handleError(err, 'getUnreadCount')
      return 0
    }
  },

  /* ── WRITE: Mark as read ────────────────────────────────── */
  async markAsRead(notificationId) {
    if (!notificationId || !isSupabaseLive || !supabase) return false

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user.id)

      if (error) throw error
      return true
    } catch (err) {
      handleError(err, 'markAsRead')
      return false
    }
  },

  /* ── WRITE: Mark all as read ────────────────────────────── */
  async markAllAsRead() {
    if (!isSupabaseLive || !supabase) return false

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null)

      if (error) throw error
      return true
    } catch (err) {
      handleError(err, 'markAllAsRead')
      return false
    }
  },

  /* ── WRITE: Delete notification ─────────────────────────── */
  async deleteNotification(notificationId) {
    if (!notificationId || !isSupabaseLive || !supabase) return false

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id)

      if (error) throw error
      return true
    } catch (err) {
      handleError(err, 'deleteNotification')
      return false
    }
  },

  /* ── WRITE: Create notification (system/internal use) ──── */
  async createNotification(userId, type, actorId, postId, title, body) {
    if (!userId || !type || !title || !isSupabaseLive || !supabase) return null

    try {
      const { data: notification, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          actor_id: actorId,
          post_id: postId,
          title,
          body: body || null,
        })
        .select('id')
        .single()

      if (error) throw error
      return { id: notification.id }
    } catch (err) {
      handleError(err, 'createNotification')
      return null
    }
  },
}
