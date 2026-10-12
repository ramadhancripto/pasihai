// ══════════════════════════════════════════════════════════════
// PASIHAI — SOCIAL SERVICE
//
// Huduma za uhusiano: omba urafiki, fuata, unganika.
// Inatumia Supabase tables: follows, friendships.
// ══════════════════════════════════════════════════════════════

import { supabase, isSupabaseLive } from '../lib/supabaseClient.js'

async function requireUser(context) {
  if (!isSupabaseLive || !supabase) throw new Error('Supabase haijaunganishwa')
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error(`Hitilafu ya uthibitisho: ${context}`)
  return user
}

/**
 * Tuma ombi la urafiki kwa mtu mwingine.
 * Imeandikwa kwenye jedwali la friendships.
 */
export async function sendFriendRequest(targetUserId) {
  const user = await requireUser('Omba urafiki')
  // Angalia kama tayari kuna ombi au urafiki
  const { data: existing } = await supabase
    .from('friendships')
    .select('id, status')
    .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'accepted') throw new Error('Tayari ni marafiki')
    if (existing.status === 'pending') throw new Error('Ombi tayari limetumwa')
  }

  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: user.id, addressee_id: targetUserId, status: 'pending' })
  if (error) throw new Error(`Ombi halikufanikiwa: ${error.message}`)
  return { sent: true }
}

/**
 * Fuata mtu/channel (follow).
 * Imeandikwa kwenye jedwali la follows.
 */
export async function followUser(targetUserId) {
  const user = await requireUser('Kufuata')
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: user.id, followee_id: targetUserId })
  if (error && error.code !== '23505') {
    throw new Error(`Kufuata kulishindikana: ${error.message}`)
  }
  return { following: true }
}

/**
 * Acha kufuata mtu (unfollow).
 */
export async function unfollowUser(targetUserId) {
  const user = await requireUser('Acha kufuata')
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('followee_id', targetUserId)
  if (error) throw new Error(`Kuacha kufuata kulishindikana: ${error.message}`)
  return { following: false }
}

/**
 * Tuma ombi la kuunganishwa (connect).
 * Hii ni sawa na friend request — tumia friendships table.
 */
export async function connectUser(targetUserId) {
  return sendFriendRequest(targetUserId)
}