// ══════════════════════════════════════════════════════════════
// PASIHAI — SUPABASE CONTENT REPOSITORY
//
// Implementation ya contentRepository inayotumia Supabase.
// Inalingana na contract ya mockContentRepository.
//
// MUHIMU:
//   - Inatumia anon key PEKEE (RLS ndio ulinzi wa kweli)
//   - Visibility inatekelezwa na RLS (can_see_post function)
//   - Frontend HAIPASWI kuamua ruhusa — RLS inafanya hivyo
//   - Katika LIVE MODE: throw errors (usifiche)
//   - Katika MOCK MODE: rudisha [] (kwa sababu hakuna data)
//
// ERROR HANDLING:
//   - Network errors: retryable, UI itaonyesha "jaribu tena"
//   - Auth errors: non-retryable, UI itaonyesha "login kwanza"
//   - RLS errors: non-retryable, UI itaonyesha "huna ruhusa"
//   - Schema errors: non-retryable, UI itaonyesha "database error"
// ══════════════════════════════════════════════════════════════

import { supabase, isSupabaseLive } from '../../lib/supabaseClient.js'
import { mapSupabaseFeed, mapSupabasePost } from '../mappers/supabaseFeedMapper.js'
import { parseSupabaseError, NetworkError } from '../../utils/errors.js'
import { offlineActions } from '../../utils/offlineActions.js'
import { contentCache } from '../../utils/contentCache.js'

/* ── Error Helper ───────────────────────────────────────────── */
function handleError(error, context) {
  const parsed = parseSupabaseError(error, context)
  console.error(`[ContentRepo:${context}]`, parsed.message)
  return parsed
}

/* ── Supabase Content Repository ──────────────────────────── */
export const supabaseContentRepository = {
  /* ── READ: Feed items (posts + reels) ───────────────────── */
  async listFeed() {
    if (!isSupabaseLive) return [] // Mock mode: rudisha []
    if (!supabase) {
      throw new NetworkError('Supabase client haijasanidiwa')
    }

    // Jaribu kusoma kutoka server kwanza
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        throw parseSupabaseError(error, 'listFeed')
      }

      const feed = mapSupabaseFeed({ posts: data || [] })
      
      // Hifadhi kwenye cache kwa offline access
      await contentCache.cacheFeed(feed)
      
      return feed
    } catch (err) {
      // Kama ni network error, jaribu kusoma kutoka cache
      if (err instanceof NetworkError) {
        console.log('[ContentRepo] Network error, reading from cache')
        const cached = await contentCache.getFeed()
        if (cached && cached.length > 0) {
          console.log(`[ContentRepo] Returning ${cached.length} cached posts`)
          return cached
        }
      }
      // Rudisha error kama hakuna cache
      throw err
    }
  },

  /* ── READ: Posts za mtumiaji mwenyewe ───────────────────── */
  async listMyPosts() {
    if (!isSupabaseLive) return []
    if (!supabase) {
      throw new NetworkError('Supabase client haijasanidiwa')
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return [] // Halali: hakuna user aliyelogin

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('author_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      throw parseSupabaseError(error, 'listMyPosts')
    }

    return mapSupabaseFeed({ posts: data || [] })
  },

  /* ── READ: Items zilizofichwa ───────────────────────────── */
  async listHidden() {
    if (!isSupabaseLive) return []
    if (!supabase) {
      throw new NetworkError('Supabase client haijasanidiwa')
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('hidden_items')
      .select('post_id')
      .eq('user_id', user.id)

    if (error) {
      throw parseSupabaseError(error, 'listHidden')
    }

    return (data || []).map((row) => row.post_id)
  },

  /* ── READ: Items zilizopendwa (likes) ───────────────────── */
  async listLikes() {
    if (!isSupabaseLive || !supabase) return []

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data, error } = await supabase
        .from('reactions')
        .select('post_id')
        .eq('user_id', user.id)

      if (error) throw error
      return (data || []).map((row) => row.post_id)
    } catch (err) {
      handleError(err, 'listLikes')
      return []
    }
  },

  /* ── READ: Items zilizohifadhiwa (bookmarks) ────────────── */
  async listSaved() {
    if (!isSupabaseLive || !supabase) return []

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      // Bookmarks zina ref_type na ref_id (post au entity)
      const { data, error } = await supabase
        .from('bookmarks')
        .select('ref_id, ref_type, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Rudisha format inayolingana na mockContentRepository.listSaved()
      return (data || []).map((row) => ({
        id: row.ref_id,
        kind: row.ref_type, // 'post' au 'entity'
        text: '', // Itajazwa na service layer kwa enrichFeedItems
        author: '', // Itajazwa na service layer
        at: new Date(row.created_at).toLocaleDateString(),
      }))
    } catch (err) {
      handleError(err, 'listSaved')
      return []
    }
  },

  /* ── READ: Kura za polls ────────────────────────────────── */
  async listVotes() {
    // Phase A haina poll_votes table — rudisha empty object
    return {}
  },

  /* ── READ: Status/Stories ───────────────────────────────── */
  async getStatuses() {
    // Phase A haina statuses table — rudisha empty array
    return []
  },

  /* ── READ: Space posts ──────────────────────────────────── */
  async listSpacePosts(spaceId) {
    // Phase 1D — haijatekelezwa bado
    return []
  },

  /* ══════════════════════════════════════════════════════════
     WRITE OPERATIONS (Phase 1B — haijatekelezwa bado)
     
     Hizi zinarejesha mock behavior kwa sasa. Baadaye zitatumia
     Supabase INSERT/UPDATE/DELETE.
     ══════════════════════════════════════════════════════════ */

  /* ── WRITE: Toggle like/reaction ─────────────────────────── */
  async toggleLike(itemId, options = {}) {
    if (!isSupabaseLive) return false // Mock mode: rudisha false
    if (!supabase) {
      throw new NetworkError('Supabase client haijasanidiwa')
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false // Halali: hakuna user aliyelogin

      // Check if already liked
      const { data: existing } = await supabase
        .from('reactions')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('post_id', itemId)
        .single()

      if (existing) {
        // Unlike - DELETE ni idempotent, hakuna haja ya idempotency_key
        const { error } = await supabase
          .from('reactions')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', itemId)

        if (error) {
          throw parseSupabaseError(error, 'toggleLike:unlike')
        }
        return false // Now unliked
      } else {
        // Like - INSERT inahitaji idempotency_key
        const insertData = {
          user_id: user.id,
          post_id: itemId,
          emoji: 'like',
        }

        if (options.idempotencyKey) {
          insertData.idempotency_key = options.idempotencyKey
        }

        const { error } = await supabase
          .from('reactions')
          .insert(insertData)

        if (error) {
          // Angalia kama ni duplicate (idempotency conflict)
          if (error.code === '23505' && options.idempotencyKey) {
            // Duplicate detected - like tayari ipo
            console.log('[ContentRepo] Duplicate like detected, already liked')
            return true // Already liked
          }
          throw parseSupabaseError(error, 'toggleLike:like')
        }
        return true // Now liked
      }
    } catch (err) {
      // Kama ni network error na sio syncMode, andika offline
      if (!options.skipOffline && (err instanceof NetworkError || (typeof navigator !== 'undefined' && !navigator.onLine))) {
        console.log('[ContentRepo] Network error, using offline actions for toggleLike')
        const { outboxManager } = await import('../../utils/outboxManager.js')
        await outboxManager.enqueue({
          type: 'toggleLike',
          payload: { postId: itemId },
          priority: 5, // Lower priority kuliko posts/comments
        })
        // Rudisha optimistic response
        return true // Assume liked
      }
      throw err
    }
  },

  /* ── WRITE: Toggle save/bookmark ─────────────────────────── */
  async toggleSaved(item, options = {}) {
    if (!isSupabaseLive) return false
    if (!supabase) {
      throw new NetworkError('Supabase client haijasanidiwa')
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const itemId = item.id || item
      const refType = item.source === 'reel' ? 'post' : 'post'

      // Check if already saved
      const { data: existing } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('ref_type', refType)
        .eq('ref_id', itemId)
        .single()

      if (existing) {
        // Unsave - DELETE ni idempotent
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('ref_type', refType)
          .eq('ref_id', itemId)

        if (error) {
          throw parseSupabaseError(error, 'toggleSaved:unsave')
        }
        return false // Now unsaved
      } else {
        // Save - INSERT inahitaji idempotency_key
        const insertData = {
          user_id: user.id,
          ref_type: refType,
          ref_id: itemId,
        }

        if (options.idempotencyKey) {
          insertData.idempotency_key = options.idempotencyKey
        }

        const { error } = await supabase
          .from('bookmarks')
          .insert(insertData)

        if (error) {
          // Angalia kama ni duplicate
          if (error.code === '23505' && options.idempotencyKey) {
            console.log('[ContentRepo] Duplicate bookmark detected, already saved')
            return true // Already saved
          }
          throw parseSupabaseError(error, 'toggleSaved:save')
        }
        return true // Now saved
      }
    } catch (err) {
      // Kama ni network error na sio syncMode, andika offline
      if (!options.skipOffline && (err instanceof NetworkError || (typeof navigator !== 'undefined' && !navigator.onLine))) {
        console.log('[ContentRepo] Network error, using offline actions for toggleSaved')
        const { outboxManager } = await import('../../utils/outboxManager.js')
        await outboxManager.enqueue({
          type: 'toggleSaved',
          payload: { item },
          priority: 5,
        })
        return true // Assume saved
      }
      throw err
    }
  },

  async isSaved(id) {
    const saved = await this.listSaved()
    return saved.some((item) => item.id === id)
  },

  async isLiked(id) {
    const likes = await this.listLikes()
    return likes.includes(id)
  },

  /* ── READ: List comments for a post ──────────────────────── */
  async listComments(itemId) {
    if (!isSupabaseLive || !supabase) {
      // Kama hakuna server, jaribu cache
      const cached = await contentCache.getComments(itemId)
      return cached || []
    }

    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          text,
          author_id,
          parent_id,
          created_at,
          author:profiles!author_id(user_id, username, display_name, avatar_tone)
        `)
        .eq('post_id', itemId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      if (error) throw error

      const comments = (data || []).map((c) => ({
        id: c.id,
        text: c.text,
        userId: c.author_id,
        parentId: c.parent_id,
        createdAt: c.created_at,
        author: c.author ? {
          id: c.author.user_id,
          name: c.author.display_name || c.author.username,
          handle: `@${c.author.username}`,
          avatarTone: c.author.avatar_tone || 'green',
        } : null,
      }))

      // Hifadhi kwenye cache
      for (const comment of comments) {
        await contentCache.cacheComment(comment)
      }

      return comments
    } catch (err) {
      // Kama ni network error, jaribu cache
      if (err instanceof NetworkError) {
        console.log('[ContentRepo] Network error on listComments, reading from cache')
        const cached = await contentCache.getComments(itemId)
        if (cached && cached.length > 0) return cached
      }
      handleError(err, 'listComments')
      return []
    }
  },

  /* ── WRITE: Add comment ──────────────────────────────────── */
  async addComment(itemId, text, options = {}) {
    if (!isSupabaseLive) return null
    if (!supabase) {
      throw new NetworkError('Supabase client haijasanidiwa')
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      // Andaa data ya INSERT
      const insertData = {
        post_id: itemId,
        author_id: user.id,
        text: text.trim(),
      }

      // Ongeza idempotency_key kama ipo (kuzuia duplicates)
      if (options.idempotencyKey) {
        insertData.idempotency_key = options.idempotencyKey
      }

      const { data: comment, error } = await supabase
        .from('comments')
        .insert(insertData)
        .select('id, text, author_id, created_at')
        .single()

      if (error) {
        // Angalia kama ni duplicate (idempotency conflict)
        if (error.code === '23505' && options.idempotencyKey) {
          // Duplicate detected - jaribu kupata comment iliyopo
          console.log('[ContentRepo] Duplicate comment detected, fetching existing')
          const { data: existing } = await supabase
            .from('comments')
            .select('id, text, author_id, created_at')
            .eq('idempotency_key', options.idempotencyKey)
            .single()
          
          if (existing) {
            return {
              id: existing.id,
              text: existing.text,
              userId: existing.author_id,
              createdAt: existing.created_at,
            }
          }
        }
        throw parseSupabaseError(error, 'addComment')
      }

      const result = {
        id: comment.id,
        text: comment.text,
        userId: comment.author_id,
        createdAt: comment.created_at,
      }

      // Hifadhi kwenye cache
      await contentCache.cacheComment(result)

      return result
    } catch (err) {
      // Kama ni network error na sio syncMode, andika offline
      if (!options.skipOffline && (err instanceof NetworkError || (typeof navigator !== 'undefined' && !navigator.onLine))) {
        console.log('[ContentRepo] Network error, using offline actions')
        const offlineComment = await offlineActions.addComment(itemId, text)
        return offlineComment
      }
      throw err
    }
  },

  /* ── WRITE: Create post ──────────────────────────────────── */
  async addPost(draft, options = {}) {
    if (!isSupabaseLive) return null
    if (!supabase) {
      throw new NetworkError('Supabase client haijasanidiwa')
    }

    // Jaribu kuandika kwenye server
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      // Determine kind from draft
      let kind = 'text'
      if (draft.mediaUrl) {
        if (draft.mediaType === 'video') kind = 'video'
        else if (draft.mediaType === 'image') kind = 'image'
        else if (draft.mediaType === 'audio') kind = 'audio'
      }
      if (draft.pollQuestion) kind = 'poll'
      if (draft.kind) kind = draft.kind

      // Andaa data ya INSERT
      const insertData = {
        author_id: user.id,
        kind,
        text: draft.text || null,
        media_url: draft.mediaUrl || null,
        media_meta: draft.mediaMeta || {},
        poll_question: draft.pollQuestion || null,
        visibility: draft.visibility || 'public',
      }

      // Ongeza idempotency_key kama ipo (kuzuia duplicates)
      if (options.idempotencyKey) {
        insertData.idempotency_key = options.idempotencyKey
      }

      const { data: post, error } = await supabase
        .from('posts')
        .insert(insertData)
        .select('id, kind, text, media_url, visibility, created_at')
        .single()

      if (error) {
        // Angalia kama ni duplicate (idempotency conflict)
        if (error.code === '23505' && options.idempotencyKey) {
          // Duplicate detected - jaribu kupata post iliyopo
          console.log('[ContentRepo] Duplicate detected, fetching existing post')
          const { data: existing } = await supabase
            .from('posts')
            .select('id, kind, text, media_url, visibility, created_at')
            .eq('idempotency_key', options.idempotencyKey)
            .single()
          
          if (existing) {
            return {
              id: existing.id,
              kind: existing.kind,
              text: existing.text,
              mediaUrl: existing.media_url,
              visibility: existing.visibility,
              createdAt: existing.created_at,
            }
          }
        }
        throw parseSupabaseError(error, 'addPost')
      }

      const result = {
        id: post.id,
        kind: post.kind,
        text: post.text,
        mediaUrl: post.media_url,
        visibility: post.visibility,
        createdAt: post.created_at,
      }

      // Hifadhi kwenye cache
      await contentCache.cachePost(result)

      return result
    } catch (err) {
      // Kama ni network error na sio syncMode, andika offline
      if (!options.skipOffline && (err instanceof NetworkError || (typeof navigator !== 'undefined' && !navigator.onLine))) {
        console.log('[ContentRepo] Network error, using offline actions')
        const offlinePost = await offlineActions.addPost(draft)
        return offlinePost
      }
      // Rudisha error kama sio network error au ni syncMode
      throw err
    }
  },

  /* ── WRITE: Hide item ────────────────────────────────────── */
  async hideItem(id, options = {}) {
    if (!isSupabaseLive || !supabase) return false

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      // Check if already hidden
      const { data: existing } = await supabase
        .from('hidden_items')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('post_id', id)
        .single()

      if (existing) {
        // Unhide
        const { error } = await supabase
          .from('hidden_items')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', id)

        if (error) throw error
        return false // Now visible
      } else {
        // Hide - INSERT inahitaji idempotency_key
        const insertData = {
          user_id: user.id,
          post_id: id,
        }

        if (options.idempotencyKey) {
          insertData.idempotency_key = options.idempotencyKey
        }

        const { error } = await supabase
          .from('hidden_items')
          .insert(insertData)

        if (error) {
          // Angalia kama ni duplicate
          if (error.code === '23505' && options.idempotencyKey) {
            console.log('[ContentRepo] Duplicate hide detected, already hidden')
            return true // Already hidden
          }
          throw error
        }
        return true // Now hidden
      }
    } catch (err) {
      // Kama ni network error na sio syncMode, andika offline
      if (!options.skipOffline && (err instanceof NetworkError || (typeof navigator !== 'undefined' && !navigator.onLine))) {
        console.log('[ContentRepo] Network error, using offline actions for hideItem')
        const { outboxManager } = await import('../../utils/outboxManager.js')
        await outboxManager.enqueue({
          type: 'hideItem',
          payload: { itemId: id },
          priority: 7, // Low priority
        })
        return true // Optimistic
      }
      handleError(err, 'hideItem')
      return false
    }
  },

  /* ── WRITE: Report item ──────────────────────────────────── */
  async reportItem(id, reason, options = {}) {
    if (!isSupabaseLive || !supabase) return false

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const insertData = {
        reporter_id: user.id,
        target_type: 'post',
        target_id: id,
        reason: reason || 'other',
      }

      if (options.idempotencyKey) {
        insertData.idempotency_key = options.idempotencyKey
      }

      const { error } = await supabase
        .from('reports')
        .insert(insertData)

      if (error) {
        // Angalia kama ni duplicate
        if (error.code === '23505' && options.idempotencyKey) {
          console.log('[ContentRepo] Duplicate report detected, already reported')
          return true // Already reported
        }
        throw error
      }
      return true
    } catch (err) {
      // Kama ni network error na sio syncMode, andika offline
      if (!options.skipOffline && (err instanceof NetworkError || (typeof navigator !== 'undefined' && !navigator.onLine))) {
        console.log('[ContentRepo] Network error, using offline actions for reportItem')
        const { outboxManager } = await import('../../utils/outboxManager.js')
        await outboxManager.enqueue({
          type: 'reportItem',
          payload: { itemId: id, reason: reason || 'other' },
          priority: 6,
        })
        return true // Optimistic
      }
      handleError(err, 'reportItem')
      return false
    }
  },

  async unhideItem(id) {
    // Phase 1B — rudisha false
    return false
  },

  async listReported() {
    // Phase 1B — rudisha empty array
    return []
  },

  async saveEntity(entity, on = true) {
    // Phase 1B — rudisha false
    return false
  },

  async listSavedEntities() {
    // Phase 1B — rudisha empty array
    return []
  },

  async joinLive(id) {
    // Phase 1C — rudisha false
    return false
  },

  async listJoinedLive() {
    // Phase 1C — rudisha empty array
    return []
  },

  /* ── WRITE: Vote on poll ─────────────────────────────────── */
  async votePoll(itemId, optionId) {
    if (!isSupabaseLive || !supabase) return null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      // Delete any existing vote for this poll
      await supabase
        .from('poll_votes')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', itemId)

      // Insert new vote
      const { error } = await supabase
        .from('poll_votes')
        .insert({
          user_id: user.id,
          option_id: optionId,
          post_id: itemId,
        })

      if (error) throw error
      return { optionId }
    } catch (err) {
      handleError(err, 'votePoll')
      return null
    }
  },

  /* ── WRITE: Start live session ───────────────────────────── */
  async startLive(mode) {
    // Phase 1C — rudisha null (live_sessions table inahitaji migration 015)
    return null
  },

  /* ── WRITE: End live session ─────────────────────────────── */
  async endLive(id) {
    // Phase 1C — rudisha false
    return false
  },

  /* ── READ: List my live sessions ─────────────────────────── */
  async listMyLive() {
    // Phase 1C — rudisha empty array
    return []
  },

  /* ── WRITE: Add status/story ─────────────────────────────── */
  async addStatus(st) {
    if (!isSupabaseLive || !supabase) return null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data: status, error } = await supabase
        .from('statuses')
        .insert({
          user_id: user.id,
          media_url: st.mediaUrl,
          media_type: st.mediaType || 'image',
          text: st.text || null,
        })
        .select('id, user_id, media_url, media_type, text, created_at')
        .single()

      if (error) throw error

      return {
        id: status.id,
        userId: status.user_id,
        mediaUrl: status.media_url,
        mediaType: status.media_type,
        text: status.text,
        createdAt: status.created_at,
      }
    } catch (err) {
      handleError(err, 'addStatus')
      return null
    }
  },
}
