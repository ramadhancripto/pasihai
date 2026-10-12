// ══════════════════════════════════════════════════════════════
// PASIHAI — SOCIAL SERVICE
//
// Huduma za uhusiano: omba urafiki, fuata, unganika.
// Inatumia Supabase tables: follows, friendships, notifications.
//
// Kila social action inatengeneza notification kwa target user.
// ══════════════════════════════════════════════════════════════

import { supabase, isSupabaseLive } from '../lib/supabaseClient.js'

async function requireUser(context) {
  if (!isSupabaseLive || !supabase) throw new Error('Supabase haijaunganishwa')
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error(`Hitilafu ya uthibitisho: ${context}`)
  return user
}

/**
 * Tengeneza notification kwa target user.
 * Inatumia moja kwa moja Supabase — haihitaji service nyingine.
 */
async function createNotification(targetUserId, type, actorId, postId, title, body) {
  if (!targetUserId || !type || !title) return
  try {
    await supabase.from('notifications').insert({
      user_id: targetUserId,
      type,
      actor_id: actorId,
      post_id: postId || null,
      title,
      body: body || null,
    })
  } catch (err) {
    // Notification failure haiwezi kuzuia social action
    console.warn('[socialService] Notification imeshindikana:', err.message)
  }
}

/**
 * Pata jina la mtumiaji (kwa notification text).
 */
async function getActorName(userId) {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('user_id', userId)
      .single()
    return data?.display_name || data?.username || 'Mtumiaji'
  } catch {
    return 'Mtumiaji'
  }
}

/**
 * Tuma ombi la urafiki kwa mtu mwingine.
 * Imeandikwa kwenye jedwali la friendships.
 * Notification inatengenezwa kwa mpokeaji.
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

  // Tengeneza notification kwa mpokeaji
  const actorName = await getActorName(user.id)
  await createNotification(
    targetUserId,
    'friend_request',
    user.id,
    null,
    `${actorName} ametuma ombi la urafiki`,
    `${actorName} anataka kuwa rafiki yako`
  )

  return { sent: true }
}

/**
 * Fuata mtu/channel (follow).
 * Imeandikwa kwenye jedwali la follows.
 * Notification inatengenezwa kwa anayefuatwa.
 */
export async function followUser(targetUserId) {
  const user = await requireUser('Kufuata')
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: user.id, followee_id: targetUserId })
  if (error && error.code !== '23505') {
    throw new Error(`Kufuata kulishindikana: ${error.message}`)
  }

  // Tengeneza notification
  const actorName = await getActorName(user.id)
  await createNotification(
    targetUserId,
    'follow',
    user.id,
    null,
    `${actorName} ameanza kukufuata`,
    null
  )

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

/**
 * Kubali ombi la urafiki.
 * Notification inatengenezwa kwa mtumaji wa ombi.
 */
export async function acceptFriendRequest(friendshipId, requesterId) {
  const user = await requireUser('Kubali urafiki')
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId)
    .eq('addressee_id', user.id)
  if (error) throw new Error(`Kubali kulishindikana: ${error.message}`)

  // Notification kwa mtumaji wa ombi
  const actorName = await getActorName(user.id)
  await createNotification(
    requesterId,
    'friend_accepted',
    user.id,
    null,
    `${actorName} amekubali ombi lako la urafiki`,
    null
  )

  return { accepted: true }
}