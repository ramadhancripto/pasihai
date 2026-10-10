// ══════════════════════════════════════════════════════════════
// PASIHAI — CONTENT CACHE (Cache-First Strategy)
//
// Cache ya content (posts, comments, profiles) kwa matumizi ya
// offline na kusambazwa kwa vifaa vingine.
//
// MKAKATI:
//   1. SOMA: Angalia cache kwanza, kisha Supabase (ikiwa online)
//   2. ANDIKA: Hifadhi kwenye cache + outbox (kwa sync baadaye)
//   3. SASISHA: Sasisha cache wakati data mpya inapopatikana
//
// MUHIMU:
//   - Cache ni ya MUDA (TTL = 7 siku kwa default)
//   - Content ya mtumiaji HAIFUTWI kwa cache cleanup
//   - Access permissions zinaheshimiwa
//
// MATUMIZI:
//   import { contentCache } from '../utils/contentCache.js'
//   await contentCache.cachePost(post)
//   const post = await contentCache.getPost(postId)
//   await contentCache.cacheComment(comment)
// ══════════════════════════════════════════════════════════════

import { localDb } from './localDatabase.js'
import { contentSharingIndex } from './contentSharingIndex.js'

/* ── Configuration ─────────────────────────────────────────── */
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 siku

/* ── Content Cache Manager ─────────────────────────────────── */
export const contentCache = {
  /* ── POSTS ───────────────────────────────────────────────── */
  
  /**
   * Hifadhi post kwenye cache.
   * @param {Object} post - Post kuhifadhi
   * @param {Object} [options] - Chaguzi za ziada
   * @param {number} [options.ttlMs] - TTL kwa milliseconds (default: 7 siku)
   * @returns {Promise<void>}
   */
  async cachePost(post, options = {}) {
    const ttl = options.ttlMs || DEFAULT_TTL_MS
    const expiry = new Date(Date.now() + ttl).toISOString()
    
    const cachedPost = {
      ...post,
      _cachedAt: new Date().toISOString(),
      _expiresAt: expiry,
    }
    
    await localDb.open()
    const db = localDb.getDatabase()
    const tx = db.transaction('posts', 'readwrite')
    const store = tx.objectStore('posts')
    
    await new Promise((resolve, reject) => {
      const request = store.put(cachedPost)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    
    // Ongeza kwenye Content Sharing Index
    await contentSharingIndex.add(post, {
      contentType: 'post',
      origin: post.authorId === 'me' ? 'self' : 'server',
      expiry,
      sizeBytes: this._estimatePostSize(post),
    })
  },
  
  /**
   * Pata post kutoka cache.
   * @param {string} postId - Post ID
   * @returns {Promise<Object|null>} - Post au null
   */
  async getPost(postId) {
    await localDb.open()
    const db = localDb.getDatabase()
    const tx = db.transaction('posts', 'readonly')
    const store = tx.objectStore('posts')
    
    return new Promise((resolve, reject) => {
      const request = store.get(postId)
      request.onsuccess = () => {
        const post = request.result
        if (!post) {
          resolve(null)
          return
        }
        
        // Angalia expiry
        if (post._expiresAt && new Date(post._expiresAt) < new Date()) {
          resolve(null) // Imekwisha muda
          return
        }
        
        resolve(post)
      }
      request.onerror = () => reject(request.error)
    })
  },
  
  /**
   * Pata posts zote kutoka cache.
   * @param {Object} [filters] - Filters za utafutaji
   * @param {string} [filters.authorId] - Chuja kwa author
   * @param {string} [filters.kind] - Chuja kwa kind
   * @param {number} [filters.limit=50] - Idadi ya juu ya posts
   * @returns {Promise<Object[]>}
   */
  async getPosts(filters = {}) {
    await localDb.open()
    const db = localDb.getDatabase()
    const tx = db.transaction('posts', 'readonly')
    const store = tx.objectStore('posts')
    
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => {
        let posts = request.result || []
        const now = new Date()
        
        // Ondoa zilizokwisha muda
        posts = posts.filter(p => {
          if (!p._expiresAt) return true
          return new Date(p._expiresAt) > now
        })
        
        // Chuja kwa authorId
        if (filters.authorId) {
          posts = posts.filter(p => p.authorId === filters.authorId)
        }
        
        // Chuja kwa kind
        if (filters.kind) {
          posts = posts.filter(p => p.kind === filters.kind)
        }
        
        // Panga kwa createdAt (mpya kwanza)
        posts.sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime()
          const timeB = new Date(b.createdAt || 0).getTime()
          return timeB - timeA
        })
        
        // Limit
        const limit = filters.limit || 50
        posts = posts.slice(0, limit)
        
        resolve(posts)
      }
      request.onerror = () => reject(request.error)
    })
  },
  
  /**
   * Hifadhi feed nzima kwenye cache (posts nyingi kwa wakati mmoja).
   * @param {Array} posts - Array ya posts
   * @param {object} options - { ttlMs }
   * @returns {Promise<void>}
   */
  async cacheFeed(posts, options = {}) {
    if (!posts || !Array.isArray(posts)) return
    
    const ttlMs = options.ttlMs || 5 * 60 * 1000 // 5 dakika default
    
    // Hifadhi kila post
    for (const post of posts) {
      await this.cachePost(post, { ttlMs })
    }
  },
  
  /**
   * Pata feed nzima kutoka cache.
   * @param {object} options - { limit }
   * @returns {Promise<Array>}
   */
  async getFeed(options = {}) {
    const limit = options.limit || 50
    return await this.getPosts({ limit })
  },
  
  /**
   * Ondoa post kutoka cache.
   * @param {string} postId - Post ID
   * @returns {Promise<void>}
   */
  async removePost(postId) {
    await localDb.open()
    const db = localDb.getDatabase()
    const tx = db.transaction('posts', 'readwrite')
    const store = tx.objectStore('posts')
    
    await new Promise((resolve, reject) => {
      const request = store.delete(postId)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    
    await contentSharingIndex.remove(postId)
  },
  
  /* ── COMMENTS ────────────────────────────────────────────── */
  
  /**
   * Hifadhi comment kwenye cache.
   * @param {Object} comment - Comment kuhifadhi
   * @param {Object} [options] - Chaguzi za ziada
   * @returns {Promise<void>}
   */
  async cacheComment(comment, options = {}) {
    const ttl = options.ttlMs || DEFAULT_TTL_MS
    const expiry = new Date(Date.now() + ttl).toISOString()
    
    const cachedComment = {
      ...comment,
      _cachedAt: new Date().toISOString(),
      _expiresAt: expiry,
    }
    
    await localDb.open()
    const db = localDb.getDatabase()
    const tx = db.transaction('comments', 'readwrite')
    const store = tx.objectStore('comments')
    
    await new Promise((resolve, reject) => {
      const request = store.put(cachedComment)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    
    // Ongeza kwenye Content Sharing Index
    await contentSharingIndex.add(comment, {
      contentType: 'comment',
      origin: comment.authorId === 'me' ? 'self' : 'server',
      expiry,
      sizeBytes: this._estimateCommentSize(comment),
    })
  },
  
  /**
   * Pata comments za post kutoka cache.
   * @param {string} postId - Post ID
   * @returns {Promise<Object[]>}
   */
  async getComments(postId) {
    await localDb.open()
    const db = localDb.getDatabase()
    const tx = db.transaction('comments', 'readonly')
    const store = tx.objectStore('comments')
    const index = store.index('postId')
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(postId)
      request.onsuccess = () => {
        let comments = request.result || []
        const now = new Date()
        
        // Ondoa zilizokwisha muda
        comments = comments.filter(c => {
          if (!c._expiresAt) return true
          return new Date(c._expiresAt) > now
        })
        
        // Panga kwa createdAt (zamani kwanza)
        comments.sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime()
          const timeB = new Date(b.createdAt || 0).getTime()
          return timeA - timeB
        })
        
        resolve(comments)
      }
      request.onerror = () => reject(request.error)
    })
  },
  
  /* ── PROFILES ────────────────────────────────────────────── */
  
  /**
   * Hifadhi profile kwenye cache.
   * @param {Object} profile - Profile kuhifadhi
   * @param {Object} [options] - Chaguzi za ziada
   * @returns {Promise<void>}
   */
  async cacheProfile(profile, options = {}) {
    const ttl = options.ttlMs || DEFAULT_TTL_MS
    const expiry = new Date(Date.now() + ttl).toISOString()
    
    const cachedProfile = {
      ...profile,
      _cachedAt: new Date().toISOString(),
      _expiresAt: expiry,
    }
    
    await localDb.open()
    const db = localDb.getDatabase()
    const tx = db.transaction('profiles', 'readwrite')
    const store = tx.objectStore('profiles')
    
    await new Promise((resolve, reject) => {
      const request = store.put(cachedProfile)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  },
  
  /**
   * Pata profile kutoka cache.
   * @param {string} profileId - Profile ID
   * @returns {Promise<Object|null>}
   */
  async getProfile(profileId) {
    await localDb.open()
    const db = localDb.getDatabase()
    const tx = db.transaction('profiles', 'readonly')
    const store = tx.objectStore('profiles')
    
    return new Promise((resolve, reject) => {
      const request = store.get(profileId)
      request.onsuccess = () => {
        const profile = request.result
        if (!profile) {
          resolve(null)
          return
        }
        
        // Angalia expiry
        if (profile._expiresAt && new Date(profile._expiresAt) < new Date()) {
          resolve(null) // Imekwisha muda
          return
        }
        
        resolve(profile)
      }
      request.onerror = () => reject(request.error)
    })
  },
  
  /* ── CLEANUP ─────────────────────────────────────────────── */
  
  /**
   * Safisha content zilizokwisha muda (isipokuwa za mtumiaji).
   * @param {string} currentUserId - ID ya mtumiaji wa sasa
   * @returns {Promise<Object>} - { posts, comments, profiles }
   */
  async cleanup(currentUserId) {
    const now = new Date()
    const stats = { posts: 0, comments: 0, profiles: 0 }
    
    // Safisha posts
    const posts = await this.getPosts({ limit: 10000 })
    for (const post of posts) {
      if (post._expiresAt && new Date(post._expiresAt) < now) {
        // Usifute posts za mtumiaji
        if (post.authorId !== currentUserId) {
          await this.removePost(post.id)
          stats.posts++
        }
      }
    }
    
    // Safisha comments (sawa na posts)
    await localDb.open()
    const db = localDb.getDatabase()
    const tx = db.transaction('comments', 'readwrite')
    const store = tx.objectStore('comments')
    
    await new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => {
        const comments = request.result || []
        
        for (const comment of comments) {
          if (comment._expiresAt && new Date(comment._expiresAt) < now) {
            // Usifute comments za mtumiaji
            if (comment.authorId !== currentUserId) {
              store.delete(comment.id)
              stats.comments++
            }
          }
        }
        
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
    
    // Safisha Content Sharing Index
    await contentSharingIndex.cleanup()
    
    return stats
  },
  
  /**
   * Pata takwimu za cache.
   * @returns {Promise<Object>}
   */
  async getStats() {
    const posts = await this.getPosts({ limit: 10000 })
    
    await localDb.open()
    const db = localDb.getDatabase()
    
    const commentsCount = await new Promise((resolve, reject) => {
      const tx = db.transaction('comments', 'readonly')
      const store = tx.objectStore('comments')
      const request = store.count()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    
    const profilesCount = await new Promise((resolve, reject) => {
      const tx = db.transaction('profiles', 'readonly')
      const store = tx.objectStore('profiles')
      const request = store.count()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    
    return {
      posts: posts.length,
      comments: commentsCount,
      profiles: profilesCount,
    }
  },
  
  /* ── Helper methods ──────────────────────────────────────── */
  
  _estimatePostSize(post) {
    const text = post.text || ''
    const mediaUrl = post.mediaUrl || ''
    
    let size = text.length
    if (mediaUrl) size += 100
    size += 200 // Metadata
    
    return size
  },
  
  _estimateCommentSize(comment) {
    const text = comment.text || ''
    return text.length + 150 // Text + metadata
  },
}

export default contentCache
