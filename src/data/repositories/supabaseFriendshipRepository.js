// ══════════════════════════════════════════════════════════════
// PASIHAI — SUPABASE FRIENDSHIP REPOSITORY (Phase 2)
//
// Inatumia table iliyopo `friendships` (migration 007) na profiles.
// Hakuna schema mpya. Inashughulikia tu friend requests:
//   getFriendRequests · addFriend · respondFriend · cancelFriend · getFriends
//
// Mapungufu yanayojulikana (yameandikwa kwenye ripoti ya Phase 2):
//   - RLS ya friendships inamruhusu mwombaji kubadilisha status kuwa
//     'declined' pekee. Kwa hiyo baada ya kughairi/kukataliwa, mwombaji
//     hawezi kutuma tena ombi kwa mtu huyo hadi sera ibadilishwe.
//   - Hakuna DELETE policy; kughairi kunaweka status 'declined'.
//   - Ombi la pande mbili (A→B na B→A) linazuiwa hapa kwa ukaguzi wa
//     client, si kwa constraint ya DB; race ya nadra inawezekana.
//   - discover/nearby/fromSpaces/blocked bado hazina chanzo halisi: zinarudi [].
// ══════════════════════════════════════════════════════════════

import { supabase } from '../../lib/supabaseClient.js'
import { parseSupabaseError } from '../../utils/errors.js'

const PERSON_SELECT = 'user_id, username, display_name, avatar_tone'

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw parseSupabaseError(error, 'friendship.auth')
  const id = data?.user?.id
  if (!id) throw new Error('Hujaingia. Ingia kwanza ili kutuma au kujibu maombi ya urafiki.')
  return id
}

function toPerson(profile, friendState) {
  const tone = profile?.avatar_tone || 'green'
  return {
    id: profile?.user_id,
    name: profile?.display_name || profile?.username || 'Mtumiaji',
    handle: profile?.username ? `@${profile.username}` : '',
    avatarTone: tone,
    tone,
    friendState,
    discoverReason: '',
  }
}

function stateFor(row, me) {
  if (!row) return 'not_friend'
  if (row.status === 'accepted') return 'friend'
  if (row.status === 'blocked') return 'blocked'
  if (row.status === 'pending') return row.requester_id === me ? 'sent' : 'received'
  return 'not_friend' // declined
}

async function findPairRows(me, otherId) {
  const { data, error } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status')
    .or(
      `and(requester_id.eq.${me},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${me})`,
    )
  if (error) throw parseSupabaseError(error, 'friendship.findPair')
  return data || []
}

export const supabaseFriendshipRepository = {
  /** Maombi yaliyopokelewa (pending, mimi ni addressee). */
  async getFriendRequests() {
    const me = await currentUserId()
    const { data, error } = await supabase
      .from('friendships')
      .select(`id, requester_id, created_at, requester:profiles!requester_id(${PERSON_SELECT})`)
      .eq('addressee_id', me)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (error) throw parseSupabaseError(error, 'friendship.getFriendRequests')
    return (data || []).map((row) => ({
      id: row.id,
      from: row.requester_id,
      at: row.created_at,
      person: toPerson(row.requester, 'received'),
    }))
  },

  /** Mahusiano ya akaunti: sent · myFriends · requests. Vingine vinabaki tupu hadi vyanzo viwepo. */
  async getFriends() {
    const me = await currentUserId()
    const { data, error } = await supabase
      .from('friendships')
      .select(
        `id, requester_id, addressee_id, status, created_at,
         requester:profiles!requester_id(${PERSON_SELECT}),
         addressee:profiles!addressee_id(${PERSON_SELECT})`,
      )
      .or(`requester_id.eq.${me},addressee_id.eq.${me}`)
      .in('status', ['pending', 'accepted'])
    if (error) throw parseSupabaseError(error, 'friendship.getFriends')

    const myFriends = []
    const requests = []
    const sent = []
    for (const row of data || []) {
      const iAmRequester = row.requester_id === me
      const other = iAmRequester ? row.addressee : row.requester
      if (row.status === 'accepted') {
        myFriends.push(toPerson(other, 'friend'))
      } else if (iAmRequester) {
        sent.push(toPerson(other, 'sent'))
      } else {
        requests.push(toPerson(other, 'received'))
      }
    }
    return { myFriends, requests, sent, discover: [], fromSpaces: [], nearby: [], blocked: [] }
  },

  /** Tuma ombi. Haitumi ombi la pili kama lipo tayari. */
  async addFriend(otherId) {
    const me = await currentUserId()
    if (otherId === me) return { id: otherId, state: 'self', changed: false }

    const rows = await findPairRows(me, otherId)
    const accepted = rows.find((r) => r.status === 'accepted')
    if (accepted) return { id: otherId, state: 'friend', changed: false }
    const blocked = rows.find((r) => r.status === 'blocked')
    if (blocked) return { id: otherId, state: 'blocked', changed: false }
    const pending = rows.find((r) => r.status === 'pending')
    if (pending) return { id: otherId, state: stateFor(pending, me), changed: false }
    const mineDeclined = rows.find((r) => r.status === 'declined' && r.requester_id === me)
    if (mineDeclined) {
      throw new Error(
        'Ombi lako la awali kwa mtu huyu lilighairiwa au kukataliwa. Kutuma tena kunahitaji mabadiliko ya sera ya database, haijaruhusiwa bado.',
      )
    }

    const { error } = await supabase
      .from('friendships')
      .insert({ requester_id: me, addressee_id: otherId, status: 'pending' })
    if (error) {
      // 23505: ombi lilitumwa na tab/kifaa kingine muda mfupi uliopita
      if (error.code === '23505') return { id: otherId, state: 'sent', changed: false }
      throw parseSupabaseError(error, 'friendship.addFriend')
    }
    return { id: otherId, state: 'sent', changed: true }
  },

  /** Jibu ombi lililopokelewa: accept | decline. `id` ni user ID ya mtumaji. */
  async respondFriend(requesterId, action) {
    const me = await currentUserId()
    if (action !== 'accept' && action !== 'decline') {
      return { id: requesterId, state: 'unchanged', changed: false }
    }
    const nextStatus = action === 'accept' ? 'accepted' : 'declined'
    const { data, error } = await supabase
      .from('friendships')
      .update({ status: nextStatus })
      .eq('requester_id', requesterId)
      .eq('addressee_id', me)
      .eq('status', 'pending')
      .select('id, requester_id, addressee_id, status')
    if (error) throw parseSupabaseError(error, 'friendship.respondFriend')
    if (data && data.length > 0) {
      return { id: requesterId, state: stateFor(data[0], me), changed: true }
    }
    const current = (await findPairRows(me, requesterId))[0]
    return { id: requesterId, state: stateFor(current, me), changed: false }
  },

  /** Ghairi ombi nililolituma. Status inakuwa 'declined' (hakuna DELETE policy). */
  async cancelFriend(otherId) {
    const me = await currentUserId()
    const { data, error } = await supabase
      .from('friendships')
      .update({ status: 'declined' })
      .eq('requester_id', me)
      .eq('addressee_id', otherId)
      .eq('status', 'pending')
      .select('id')
    if (error) throw parseSupabaseError(error, 'friendship.cancelFriend')
    return { id: otherId, state: 'not_friend', changed: Boolean(data && data.length) }
  },
}
