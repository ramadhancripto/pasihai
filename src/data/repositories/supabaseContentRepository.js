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
import { mapSupabaseFeed } from '../mappers/supabaseFeedMapper.js'
import { mapSupabaseStatus } from '../mappers/statusMapper.js'
import {
  AuthError,
  NetworkError,
  PASIHAIError,
  RLSError,
  SchemaError,
  ValidationError,
  parseSupabaseError,
} from '../../utils/errors.js'
import {
  getPostMediaExtension,
  POST_MEDIA_BUCKET,
  POST_MEDIA_SIGNED_URL_TTL,
  PostMediaConfigurationError,
  validatePostMediaFile,
} from '../../utils/postMedia.js'
import { validateStatusDraft } from '../../utils/statusMedia.js'
import { offlineActions } from '../../utils/offlineActions.js'
import { contentCache } from '../../utils/contentCache.js'

const STATUS_MEDIA_BUCKET = 'pasihai-status-media'
const STATUS_SIGNED_URL_TTL = 24 * 60 * 60
const STATUS_TONES = new Set(['green', 'blue', 'gold', 'plum'])
const STATUS_SELECT = 'id, user_id, media_url, media_path, media_type, text, tone, created_at, expires_at, author:profiles!statuses_user_id_fkey(user_id, username, display_name, entity_type, avatar_tone, verified)'

function statusStorageError(error, context) {
  if (error instanceof PASIHAIError) return error
  const message = typeof error?.message === 'string' ? error.message : String(error || '')
  const upload = context === 'addStatus.upload'
  if (error?.status === 404 || error?.statusCode === '404' || /bucket.{0,40}(not found|does not exist)/i.test(message)) {
    return new SchemaError(
      `Bucket binafsi ya Status pasihai-status-media haipo. Inahitajika migration 017_status_media_storage_rls.sql na sera za Storage.${upload ? ' Upload imeshindikana; hakuna Status iliyohifadhiwa.' : ' Media ya Status haikuweza kusomwa.'}`,
      { context, originalError: error },
    )
  }
  if (/row-level security|permission denied|not authorized|unauthorized/i.test(message)) {
    return new RLSError(
      `Supabase Storage imekataa Status media (${context}). Hakikisha sera za migration 017 zimewekwa kwenye bucket pasihai-status-media.${upload ? ' Hakuna Status iliyohifadhiwa.' : ' Media ya Status haikuweza kusomwa.'}`,
      { context, originalError: error },
    )
  }
  return parseSupabaseError(error, context)
}

function postStorageError(error, context) {
  if (error instanceof PASIHAIError) return error
  const message = typeof error?.message === 'string' ? error.message : String(error || '')
  if (error?.status === 404 || error?.statusCode === '404' || /bucket.{0,40}(not found|does not exist)/i.test(message)) {
    return new SchemaError(
      `Bucket ya post media “${POST_MEDIA_BUCKET}” haipo. Tumia supabase/migrations/018_post_media_storage_rls.sql kwenye Supabase.`,
      { context, originalError: error },
    )
  }
  if (/row-level security|permission denied|not authorized|unauthorized/i.test(message)) {
    return new RLSError(
      `Supabase Storage imekataa media (${context}). Hakikisha migration 018 na sera za bucket ${POST_MEDIA_BUCKET} zimetumika.`,
      { context, originalError: error },
    )
  }
  return handleError(error, context)
}

function makePostMediaPath(userId, file) {
  const extension = getPostMediaExtension(file)
  if (!extension) throw new ValidationError('Aina ya faili haikubaliki kwa post media.')
  const randomId = globalThis.crypto?.randomUUID?.()
    || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
  return `${userId}/${randomId}.${extension}`
}

async function signPostMediaRow(row, context) {
  if (!row?.media_path) return row
  const storage = supabase?.storage
  if (!storage) throw new NetworkError('Supabase Storage client haijasanidiwa.')
  const { data, error } = await storage
    .from(POST_MEDIA_BUCKET)
    .createSignedUrl(row.media_path, POST_MEDIA_SIGNED_URL_TTL)
  if (error) throw postStorageError(error, context)
  if (!data?.signedUrl) {
    throw new NetworkError(`Supabase haikurudisha signed URL ya post media (${context}).`)
  }
  return { ...row, media_url: data.signedUrl }
}

async function signPostMediaRows(rows, context) {
  return Promise.all((rows || []).map((row) => signPostMediaRow(row, context)))
}

function makeStatusMediaName(file) {
  const extensionByType = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
  }
  const extension = extensionByType[file.type]
  const randomId = globalThis.crypto?.randomUUID?.()
    || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
  return `${randomId}.${extension}`
}

function statusUrlTtl(expiresAt) {
  const remaining = Math.floor((Date.parse(expiresAt) - Date.now()) / 1000)
  return Math.max(1, Math.min(STATUS_SIGNED_URL_TTL, remaining))
}

async function requireStatusUser(context) {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw parseSupabaseError(error, context)
  if (!data?.user) throw new AuthError('Ingia ili kuendelea na status.')
  return data.user
}

function throwStatusError(error, context) {
  if (error instanceof PASIHAIError) throw error
  if (context === 'addStatus' && error?.code === '23502') {
    throw new SchemaError(
      'Status haijahifadhiwa: schema bado inahitaji migration 017_status_media_storage_rls.sql (media_url/media_type ziwe nullable kwa text-only Status); migration 015_live_statuses_reports.sql ndiyo hutengeneza statuses na RLS.',
      { context, originalError: error },
    )
  }
  throw handleError(error, context)
}

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

      const postRows = await signPostMediaRows(data || [], 'listFeed.media')
      const feed = mapSupabaseFeed({ posts: postRows })
      
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

    const postRows = await signPostMediaRows(data || [], 'listMyPosts.media')
    return mapSupabaseFeed({ posts: postRows })
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
    if (!isSupabaseLive) return []
    if (!supabase) throw new NetworkError('Supabase client haijasanidiwa')

    try {
      const user = await requireStatusUser('getStatuses')
      const { data, error } = await supabase
        .from('statuses')
        .select(STATUS_SELECT)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error

      return await Promise.all((data || []).map(async (row) => {
        let mediaUrl = null
        if (row.media_path) {
          if (!supabase?.storage) {
            throw new SchemaError('Supabase Storage client haijaandaliwa kwa Status media.')
          }
          const expiresIn = statusUrlTtl(row.expires_at)
          const { data: signed, error: signingError } = await supabase.storage
            .from(STATUS_MEDIA_BUCKET)
            .createSignedUrl(row.media_path, expiresIn)
          if (signingError) throw statusStorageError(signingError, 'getStatuses.media')
          if (!signed?.signedUrl) throw new Error('Supabase haikurudisha kiungo cha muda cha media.')
          mediaUrl = signed.signedUrl
        }
        return mapSupabaseStatus(row, { currentUserId: user.id, mediaUrl })
      }))
    } catch (error) {
      throwStatusError(error, 'getStatuses')
    }
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
  async addPost(draft = {}, options = {}) {
    const file = draft.file || null
    const requestedKind = draft.kind ?? 'text'
    const normalizedKind = requestedKind === 'post'
      ? 'text'
      : requestedKind === 'photo'
        ? 'photo'
        : requestedKind
    const expectedType = normalizedKind === 'image'
      ? 'image'
      : normalizedKind === 'video' || normalizedKind === 'reel'
        ? 'video'
        : null
    const fileDetails = file ? validatePostMediaFile(file, expectedType) : null

    if (file && !isSupabaseLive) throw new PostMediaConfigurationError()
    if (!file && ['photo', 'image', 'video', 'reel'].includes(normalizedKind)) {
      throw new ValidationError(
        normalizedKind === 'video' || normalizedKind === 'reel'
          ? 'Chagua faili la video kabla ya kuchapisha.'
          : 'Chagua faili la picha kabla ya kuchapisha.',
      )
    }
    if (!isSupabaseLive) return null
    if (!supabase?.auth || !supabase?.storage) {
      throw new NetworkError('Supabase client/Storage haijasanidiwa; hakikisha credentials za live zipo.')
    }

    let uploadedPath = null
    let postInserted = false
    const removeUnattachedMedia = async () => {
      if (!uploadedPath) return
      try {
        const { error } = await supabase.storage.from(POST_MEDIA_BUCKET).remove([uploadedPath])
        if (error) console.warn('[ContentRepo:addPost] Uploaded media cleanup failed.')
      } catch {
        console.warn('[ContentRepo:addPost] Uploaded media cleanup failed.')
      }
      uploadedPath = null
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw parseSupabaseError(authError, 'addPost.auth')
      const user = authData?.user
      if (!user) {
        if (file) throw new AuthError('Ingia kwenye akaunti yako kabla ya kupakia picha au video.')
        return null
      }

      let kind = normalizedKind === 'photo' ? 'image' : normalizedKind
      if (draft.pollQuestion) kind = 'poll'
      if (file) kind = normalizedKind === 'reel' ? 'reel' : fileDetails.mediaType
      const mediaMeta = { ...(draft.mediaMeta || {}) }
      let mediaUrl = draft.mediaUrl || null

      if (file) {
        const mediaPath = makePostMediaPath(user.id, file)
        const storage = supabase.storage.from(POST_MEDIA_BUCKET)
        const { error: uploadError } = await storage.upload(mediaPath, file, {
          cacheControl: String(POST_MEDIA_SIGNED_URL_TTL),
          contentType: fileDetails.mimeType,
          upsert: false,
        })
        if (uploadError) throw postStorageError(uploadError, 'addPost.upload')
        uploadedPath = mediaPath

        const signedRow = await signPostMediaRow({ media_path: mediaPath }, 'addPost.sign')
        mediaUrl = signedRow.media_url
        Object.assign(mediaMeta, {
          mediaType: fileDetails.mediaType,
          mimeType: fileDetails.mimeType,
          size: fileDetails.size,
          ratio: kind === 'reel' ? '9 / 16' : fileDetails.mediaType === 'video' ? '16 / 9' : '4 / 3',
        })
      }

      const insertData = {
        author_id: user.id,
        kind,
        text: draft.text || null,
        media_url: file ? null : mediaUrl,
        media_path: uploadedPath,
        media_meta: mediaMeta,
        poll_question: draft.pollQuestion || null,
        visibility: draft.visibility || 'public',
      }
      if (options.idempotencyKey) insertData.idempotency_key = options.idempotencyKey

      const selectColumns = 'id, kind, text, media_url, media_path, media_meta, poll_question, visibility, created_at'
      const { data: post, error } = await supabase
        .from('posts')
        .insert(insertData)
        .select(selectColumns)
        .single()

      if (error) {
        if (error.code === '23505' && options.idempotencyKey) {
          const { data: existing, error: existingError } = await supabase
            .from('posts')
            .select('id, kind, text, media_url, media_path, media_meta, visibility, created_at')
            .eq('idempotency_key', options.idempotencyKey)
            .single()
          if (existingError) throw parseSupabaseError(existingError, 'addPost.idempotency')
          if (existing) {
            await removeUnattachedMedia()
            const signedExisting = await signPostMediaRow(existing, 'addPost.idempotency.media')
            return {
              id: signedExisting.id,
              kind: signedExisting.kind,
              text: signedExisting.text,
              mediaUrl: signedExisting.media_url,
              mediaMeta: signedExisting.media_meta || {},
              visibility: signedExisting.visibility,
              createdAt: signedExisting.created_at,
            }
          }
        }
        if (/media_path|column/i.test(error.message || '')) {
          throw new SchemaError(
            'Schema ya post media haijawekwa. Tumia supabase/migrations/018_post_media_storage_rls.sql kwenye Supabase.',
            { originalError: error },
          )
        }
        throw parseSupabaseError(error, 'addPost')
      }
      if (!post) throw new Error('Database haikurudisha chapisho lililohifadhiwa.')
      postInserted = true

      const result = {
        id: post.id,
        kind: post.kind,
        text: post.text,
        mediaUrl: mediaUrl || post.media_url,
        mediaMeta: post.media_meta || mediaMeta,
        visibility: post.visibility,
        createdAt: post.created_at,
      }
      try {
        await contentCache.cachePost(result)
      } catch {
        console.warn('[ContentRepo:addPost] Post saved; local cache update failed.')
      }
      return result
    } catch (error) {
      if (uploadedPath && !postInserted) await removeUnattachedMedia()
      if (file && (error instanceof NetworkError || (typeof navigator !== 'undefined' && !navigator.onLine))) {
        throw new NetworkError(
          'Mtandao haupatikani; picha/video haikutumwa na hakuna post iliyohifadhiwa. Unganisha mtandao kisha jaribu tena.',
          { originalError: error },
        )
      }
      // Faili za media haziwekwi kwenye offline queue: bila upload, hakuna post ya mafanikio.
      if (!file && !options.skipOffline && (error instanceof NetworkError || (typeof navigator !== 'undefined' && !navigator.onLine))) {
        console.log('[ContentRepo] Network error, using offline actions')
        return offlineActions.addPost(draft)
      }
      throw error
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
  async addStatus(st = {}) {
    if (!isSupabaseLive) return null
    if (!supabase) throw new NetworkError('Supabase client haijasanidiwa')

    const draft = validateStatusDraft(st)
    const tone = st.tone || 'green'
    if (!STATUS_TONES.has(tone)) throw new ValidationError('Rangi ya status haikubaliki.')

    const user = await requireStatusUser('addStatus')
    if (st.file && !supabase?.storage) {
      throw new SchemaError('Supabase Storage client haijaandaliwa kwa Status media.')
    }
    const mediaPath = st.file ? `${user.id}/${makeStatusMediaName(st.file)}` : null
    let uploaded = false

    try {
      if (st.file) {
        const { error: uploadError } = await supabase.storage
          .from(STATUS_MEDIA_BUCKET)
          .upload(mediaPath, st.file, {
            cacheControl: String(STATUS_SIGNED_URL_TTL),
            contentType: st.file.type,
            upsert: false,
          })
        if (uploadError) throw statusStorageError(uploadError, 'addStatus.upload')
        uploaded = true
      }

      const { data: status, error } = await supabase
        .from('statuses')
        .insert({
          user_id: user.id,
          media_url: null,
          media_path: mediaPath,
          media_type: draft.mediaType,
          text: draft.text,
          tone,
        })
        .select(STATUS_SELECT)
        .single()

      if (error) throw error
      if (!status) throw new Error('Database haikurudisha status iliyohifadhiwa.')

      let mediaUrl = null
      let mediaWarning = false
      if (mediaPath) {
        try {
          const { data: signed, error: signingError } = await supabase.storage
            .from(STATUS_MEDIA_BUCKET)
            .createSignedUrl(mediaPath, statusUrlTtl(status.expires_at))
          if (signingError) throw signingError
          mediaUrl = signed?.signedUrl || null
          mediaWarning = !mediaUrl
        } catch (signingError) {
          // Upload na database row vimeshafaulu; kusaini upya kutajaribiwa kwenye read.
          mediaWarning = true
          console.warn('[ContentRepo:addStatus] Status saved; media URL will be retried on read.')
        }
      }

      return {
        ...mapSupabaseStatus(status, { currentUserId: user.id, mediaUrl }),
        mediaWarning,
      }
    } catch (error) {
      if (uploaded && mediaPath) {
        try {
          const { error: cleanupError } = await supabase.storage
            .from(STATUS_MEDIA_BUCKET)
            .remove([mediaPath])
          if (cleanupError) console.warn('[ContentRepo:addStatus] Uploaded status media cleanup failed.')
        } catch {
          console.warn('[ContentRepo:addStatus] Uploaded status media cleanup failed.')
        }
      }
      throwStatusError(error, 'addStatus')
    }
  },

  /* ── WRITE: Delete own status ─────────────────────────────── */
  async deleteStatus(statusId) {
    if (!isSupabaseLive) return { deleted: false, id: statusId }
    if (!supabase) throw new NetworkError('Supabase client haijasanidiwa')
    if (!statusId) return { deleted: false, id: statusId }

    const user = await requireStatusUser('deleteStatus')
    try {
      const { data: status, error: lookupError } = await supabase
        .from('statuses')
        .select('id, user_id, media_path')
        .eq('id', statusId)
        .maybeSingle()
      if (lookupError) throw lookupError
      if (!status) return { deleted: false, id: statusId, persistence: 'supabase' }
      if (status.user_id !== user.id) throw new RLSError('Unaweza kufuta status yako mwenyewe tu.')

      const { data: deleted, error: deleteError } = await supabase
        .from('statuses')
        .delete()
        .eq('id', statusId)
        .eq('user_id', user.id)
        .select('id')
        .maybeSingle()
      if (deleteError) throw deleteError
      if (!deleted) throw new RLSError('Status haikupatikana au huna ruhusa ya kuifuta.')

      let mediaCleanupPending = false
      if (status.media_path) {
        try {
          const { error: cleanupError } = await supabase.storage
            .from(STATUS_MEDIA_BUCKET)
            .remove([status.media_path])
          mediaCleanupPending = Boolean(cleanupError)
        } catch {
          mediaCleanupPending = true
        }
        if (mediaCleanupPending) {
          // Database row imefutwa; Storage policy inazuia tena kusoma faili orphan.
          console.warn('[ContentRepo:deleteStatus] Status row deleted; media cleanup is pending.')
        }
      }

      return { deleted: true, id: statusId, persistence: 'supabase', mediaCleanupPending }
    } catch (error) {
      throwStatusError(error, 'deleteStatus')
    }
  },
}
