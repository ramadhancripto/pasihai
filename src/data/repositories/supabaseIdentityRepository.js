// ══════════════════════════════════════════════════════════════
// PASIHAI — SUPABASE IDENTITY REPOSITORY
//
// Implementation ya identityRepository inayotumia Supabase.
// Inalingana na contract ya mockIdentityRepository.
//
// SUPABASE TABLES:
//   profiles: user_id, username, display_name, avatar_tone, bio,
//             entity_type, verified, friends_count, followers_count,
//             following_count, posts_count, prefs, created_at
//   follows: follower_id, followee_id, created_at
//
// MAPPING:
//   profiles.entity_type → entity.type (person, channel, hub, etc.)
//   profiles.display_name → entity.name
//   profiles.username → entity.handle (with @ prefix)
// ══════════════════════════════════════════════════════════════

import { supabase, isSupabaseLive } from '../../lib/supabaseClient.js'

/* ── Error handling helper ────────────────────────────────── */
function handleError(error, context) {
  console.error(`[SupabaseIdentityRepository] ${context}:`, error)
  return null
}

/* ── Vocabulary ya ROLE/ACTION (static — haihitaji DB query) ─ */
const ENTITY_VOCABULARY = {
  roles: {
    person: 'Mtu',
    channel: 'Channel',
    hub: 'Hub',
    community: 'Jumuiya',
    group: 'Kikundi',
    business: 'Biashara',
    creator: 'Mbunifu',
  },
  relationships: {
    friend: 'Rafiki',
    following: 'Unafuatilia',
    joined: 'Umejiunga',
    member: 'Mwanachama',
  },
  actions: {
    person: 'Fuata',
    channel: 'Fuata',
    hub: 'Jiunge',
    community: 'Jiunge',
    group: 'Jiunge',
    business: 'Wasiliana',
    creator: 'Fuata',
  },
}

/* ── Supabase profile row → entity object ─────────────────── */
function mapProfileToEntity(row, relationship = null) {
  if (!row) return null

  return {
    id: row.user_id,
    name: row.display_name || row.username,
    handle: `@${row.username}`,
    type: row.entity_type || 'person',
    avatarTone: row.avatar_tone || 'green',
    bio: row.bio || '',
    verified: row.verified || false,
    friends: row.friends_count || 0,
    followers: row.followers_count || 0,
    following: row.following_count || 0,
    posts: row.posts_count || 0,
    relationship,
    stats: [
      { key: 'friends', label: 'Marafiki', value: row.friends_count || 0 },
      { key: 'followers', label: 'Wanaonifuatilia', value: row.followers_count || 0 },
      { key: 'following', label: 'Ninafuatilia', value: row.following_count || 0 },
    ],
    tabs: ['Machapisho', 'Hifadhi', 'Niliyopenda', 'Kuhusu'],
  }
}

/* ── Supabase Identity Repository ─────────────────────────── */
export const supabaseIdentityRepository = {
  /* ── READ: Current user ─────────────────────────────────── */
  async getCurrentUser() {
    if (!isSupabaseLive || !supabase) return null

    let authUser = null
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null
      authUser = user

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      if (!profile) return null

      return {
        ...mapProfileToEntity(profile),
        type: 'you',
        since: `Mwanachama tangu ${new Date(profile.created_at).toLocaleDateString('sw-TZ', { month: 'long', year: 'numeric' })}`,
        spaces: [],
      }
    } catch (err) {
      const status = err?.status || err?.statusCode
      const code = err?.code || ''

      // CASE 1: profiles TABLE does not exist — schema not deployed yet.
      // The user IS authenticated (auth.users always exists) but the migration
      // hasn't been run. Return a minimal object so the UI stays usable,
      // and mark it so downstream code can tell it's incomplete.
      const isTableMissing =
        code === 'PGRST205' ||
        code === '42P01' ||
        code === '42703' ||
        status === 404 ||
        err?.message?.includes('schema cache') ||
        err?.message?.includes('does not exist')

      if (isTableMissing) {
        console.warn('[SupabaseIdentityRepository] getCurrentUser: profiles table not deployed — migration needed')
        if (!authUser) return null
        const displayName = authUser.user_metadata?.display_name
          || authUser.email?.split('@')[0] || 'Mtumiaji'
        return {
          id: `auth-${authUser.id}`,
          userId: authUser.id,
          name: displayName,
          handle: `@${displayName.toLowerCase().replace(/\s+/g, '')}`,
          type: 'you',
          avatarTone: 'green',
          verified: false,
          bio: '',
          stats: { friends: 0, followers: 0, following: 0, posts: 0 },
          since: 'Mwanachama mpya',
          spaces: [],
          prefs: {},
          _tableMissing: true,
        }
      }

      // CASE 2: profiles table EXISTS but no row for this user.
      // PGRST116: .single() returned 0 rows.
      // Use ensure_profile() RPC to create profile atomically.
      if (code === 'PGRST116' || status === 406 || err?.message?.includes('no rows returned') || err?.message?.includes('JSON object requested')) {
        console.warn('[SupabaseIdentityRepository] getCurrentUser: profile row missing — calling ensure_profile()')
        if (!authUser) return null
        try {
          const { data: ensured, error: rpcErr } = await supabase
            .rpc('ensure_profile', { p_user_id: authUser.id })
            .single()

          if (!rpcErr && ensured) {
            return {
              ...mapProfileToEntity(ensured),
              type: 'you',
              since: `Mwanachama tangu ${new Date(ensured.created_at).toLocaleDateString('sw-TZ', { month: 'long', year: 'numeric' })}`,
              spaces: [],
            }
          }

          // RPC haikufanya kazi — jaribu INSERT moja kwa moja
          console.warn('[SupabaseIdentityRepository] getCurrentUser: ensure_profile RPC failed, trying direct INSERT:', rpcErr)
          const displayName = authUser.user_metadata?.display_name
            || authUser.email?.split('@')[0] || 'Mtumiaji'
          const username = (authUser.email?.split('@')[0] || 'user')
            .toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 30) || `user_${authUser.id.slice(0, 8)}`

          const { data: newProfile, error: insertErr } = await supabase
            .from('profiles')
            .upsert({
              user_id: authUser.id,
              username: username.length >= 3 ? username : `user_${authUser.id.slice(0, 8)}`,
              display_name: displayName,
            }, { onConflict: 'user_id' })
            .select('*')
            .single()

          if (insertErr) {
            console.error('[SupabaseIdentityRepository] getCurrentUser: profile creation failed:', insertErr)
            return null
          }

          return {
            ...mapProfileToEntity(newProfile),
            type: 'you',
            since: `Mwanachama tangu ${new Date(newProfile.created_at).toLocaleDateString('sw-TZ', { month: 'long', year: 'numeric' })}`,
            spaces: [],
          }
        } catch (createErr) {
          console.error('[SupabaseIdentityRepository] getCurrentUser: profile recovery failed:', createErr)
          return null
        }
      }

      // CASE 3: Any other error — report, don't hide
      handleError(err, 'getCurrentUser')
      return null
    }
  },

  /* ── READ: Single user by ID ────────────────────────────── */
  async getUser(id) {
    if (!id || !isSupabaseLive || !supabase) return null

    try {
      // Check if following
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      let relationship = null

      if (currentUser) {
        const { data: followData } = await supabase
          .from('follows')
          .select('followee_id')
          .eq('follower_id', currentUser.id)
          .eq('followee_id', id)
          .single()

        if (followData) relationship = 'following'
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', id)
        .is('deleted_at', null)
        .single()

      if (error) throw error
      return mapProfileToEntity(profile, relationship)
    } catch (err) {
      handleError(err, `getUser(${id})`)
      return null
    }
  },

  /* ── READ: All users (entities) ─────────────────────────── */
  async listUsers() {
    if (!isSupabaseLive || !supabase) return []

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      let followedIds = new Set()

      // Get followed users for relationship mapping
      if (currentUser) {
        const { data: follows } = await supabase
          .from('follows')
          .select('followee_id')
          .eq('follower_id', currentUser.id)

        followedIds = new Set((follows || []).map((f) => f.followee_id))
      }

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .is('deleted_at', null)
        .order('display_name')
        .limit(100)

      if (error) throw error

      return (profiles || []).map((profile) => {
        const relationship = followedIds.has(profile.user_id) ? 'following' : null
        return mapProfileToEntity(profile, relationship)
      })
    } catch (err) {
      handleError(err, 'listUsers')
      return []
    }
  },

  /* ── SEARCH: Users by name/handle (for @mentions) ───────── */
  async searchUsers(query, limit = 8) {
    if (!isSupabaseLive || !supabase) return []
    if (!query || query.length < 2) return []

    try {
      const pattern = `%${query}%`
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, handle, avatar_url, user_type')
        .or(`display_name.ilike.${pattern},handle.ilike.${pattern}`)
        .is('deleted_at', null)
        .limit(limit)

      if (error) throw error

      return (data || []).map((r) => ({
        id: r.user_id,
        name: r.display_name || r.handle || 'Mtumiaji',
        handle: r.handle || '',
        avatarUrl: r.avatar_url || null,
        type: r.user_type || 'person',
      }))
    } catch (err) {
      handleError(err, 'searchUsers')
      return []
    }
  },

  /* ── READ: Channel suggestions ──────────────────────────── */
  async listChannelSuggestions() {
    if (!isSupabaseLive || !supabase) return []

    try {
      // Channels ambazo mtumiaji hafuati
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      let followedIds = new Set()

      if (currentUser) {
        const { data: follows } = await supabase
          .from('follows')
          .select('followee_id')
          .eq('follower_id', currentUser.id)

        followedIds = new Set((follows || []).map((f) => f.followee_id))
      }

      const { data: channels, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('entity_type', 'channel')
        .is('deleted_at', null)
        .order('followers_count', { ascending: false })
        .limit(5)

      if (error) throw error

      return (channels || [])
        .filter((ch) => !followedIds.has(ch.user_id))
        .map((ch) => mapProfileToEntity(ch))
    } catch (err) {
      handleError(err, 'listChannelSuggestions')
      return []
    }
  },

  /* ── READ: Followed user IDs ────────────────────────────── */
  async listFollowed() {
    if (!isSupabaseLive || !supabase) return []

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('follows')
        .select('followee_id')
        .eq('follower_id', user.id)

      if (error) throw error
      return (data || []).map((row) => row.followee_id)
    } catch (err) {
      handleError(err, 'listFollowed')
      return []
    }
  },

  /* ── READ: Is following? ────────────────────────────────── */
  async isFollowing(id) {
    const followed = await this.listFollowed()
    return followed.includes(id)
  },

  /* ── READ: Entity vocabulary ────────────────────────────── */
  async getEntityVocabulary() {
    return ENTITY_VOCABULARY
  },

  /* ══════════════════════════════════════════════════════════
     WRITE OPERATIONS (Phase 1B — haijatekelezwa bado)
     ══════════════════════════════════════════════════════════ */

  /* ── WRITE: Update profile ───────────────────────────────── */
  async updateProfile(patch, options = {}) {
    if (!isSupabaseLive || !supabase) return null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      // Only allow safe fields to be updated
      const safePatch = {}
      if (patch.displayName) safePatch.display_name = patch.displayName
      if (patch.bio !== undefined) safePatch.bio = patch.bio
      if (patch.avatarTone) safePatch.avatar_tone = patch.avatarTone
      if (patch.avatarUrl) safePatch.avatar_url = patch.avatarUrl
      if (patch.category) safePatch.category = patch.category

      // Prevent privileged field changes
      delete safePatch.verified
      delete safePatch.entity_type
      delete safePatch.friends_count
      delete safePatch.followers_count
      delete safePatch.following_count
      delete safePatch.posts_count

      if (Object.keys(safePatch).length === 0) return null

      // UPDATE ni idempotent - hakuna haja ya idempotency_key
      const { data: profile, error } = await supabase
        .from('profiles')
        .update(safePatch)
        .eq('user_id', user.id)
        .select('*')
        .single()

      if (error) throw error
      return mapProfileToEntity(profile)
    } catch (err) {
      handleError(err, 'updateProfile')
      return null
    }
  },

  /* ── WRITE: Toggle follow ────────────────────────────────── */
  async toggleFollow(id, on, options = {}) {
    if (!isSupabaseLive || !supabase) return false

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      if (on) {
        // Follow - INSERT inahitaji idempotency_key
        const insertData = {
          follower_id: user.id,
          followee_id: id,
        }

        if (options.idempotencyKey) {
          insertData.idempotency_key = options.idempotencyKey
        }

        const { error } = await supabase
          .from('follows')
          .insert(insertData)

        if (error) {
          // Ignore duplicate key error (already following au idempotency conflict)
          if (error.code === '23505') {
            console.log('[IdentityRepo] Duplicate follow detected, already following')
            return true
          }
          throw error
        }
        return true
      } else {
        // Unfollow - DELETE ni idempotent
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('followee_id', id)

        if (error) throw error
        return false
      }
    } catch (err) {
      handleError(err, 'toggleFollow')
      return false
    }
  },

  /**
   * Pakia profile picture (avatar).
   * Inatumia Supabase Storage bucket 'profile-media'.
   * @param {File} file - Faili la picha
   * @returns {Promise<{url: string}|null>} - URL ya picha iliyopakiwa
   */
  async uploadAvatar(file) {
    if (!isSupabaseLive || !supabase) return null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      // Validation
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (file.size > maxSize) throw new Error('Picha ni kubwa sana (max 5MB)')
      if (!file.type.startsWith('image/')) throw new Error('Faili si picha')

      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${user.id}/avatar.${ext}`

      // Upload
      const { error: uploadError } = await supabase.storage
        .from('profile-media')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-media')
        .getPublicUrl(path)

      const url = urlData?.publicUrl
      if (!url) throw new Error('URL haipatikani')

      // Update profile
      await this.updateProfile({ avatarUrl: url })

      return { url }
    } catch (err) {
      handleError(err, 'uploadAvatar')
      return null
    }
  },

  /**
   * Pakia cover/background ya profile.
   * @param {File} file - Faili la picha
   * @returns {Promise<{url: string}|null>} - URL ya picha iliyopakiwa
   */
  async uploadCover(file) {
    if (!isSupabaseLive || !supabase) return null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      // Validation
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) throw new Error('Picha ni kubwa sana (max 10MB)')
      if (!file.type.startsWith('image/')) throw new Error('Faili si picha')

      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${user.id}/cover.${ext}`

      // Upload
      const { error: uploadError } = await supabase.storage
        .from('profile-media')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-media')
        .getPublicUrl(path)

      const url = urlData?.publicUrl
      if (!url) throw new Error('URL haipatikani')

      // Update profile — cover_url field (from migration 029)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ cover_url: url })
        .eq('user_id', user.id)
      if (updateError) throw updateError

      return { url }
    } catch (err) {
      handleError(err, 'uploadCover')
      return null
    }
  },

  /**
   * Futa profile picture.
   */
  async deleteAvatar() {
    if (!isSupabaseLive || !supabase) return false
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      // Futa kutoka storage
      const { data: files } = await supabase.storage
        .from('profile-media')
        .list(user.id)
      if (files) {
        for (const f of files) {
          if (f.name.startsWith('avatar')) {
            await supabase.storage.from('profile-media').remove([`${user.id}/${f.name}`])
          }
        }
      }

      // Ondoa URL kutoka profile
      await this.updateProfile({ avatarUrl: null })
      return true
    } catch (err) {
      handleError(err, 'deleteAvatar')
      return false
    }
  },

  /**
   * Futa cover/background.
   */
  async deleteCover() {
    if (!isSupabaseLive || !supabase) return false
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const { data: files } = await supabase.storage
        .from('profile-media')
        .list(user.id)
      if (files) {
        for (const f of files) {
          if (f.name.startsWith('cover')) {
            await supabase.storage.from('profile-media').remove([`${user.id}/${f.name}`])
          }
        }
      }

      await supabase.from('profiles').update({ cover_url: null }).eq('user_id', user.id)
      return true
    } catch (err) {
      handleError(err, 'deleteCover')
      return false
    }
  },
}
