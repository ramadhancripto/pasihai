// ══════════════════════════════════════════════════════════════
// PASIHAI — OFFLINE ACTIONS (Outbox Integration)
//
// Module inayosimamia kuunganisha outbox na repositories.
// Inahakikisha kwamba write actions zinafanya kazi offline
// na kusync wakati mtandao unapatikana.
//
// MKAKATI:
//   1. MTUMIAJI anafanya action (k.m., addPost)
//   2. Action inahifadhiwa kwenye outbox (na optimistic update)
//   3. Sync engine inatuma action kwa Supabase (wakati online)
//   4. Server inathibitisha, action inafutwa kutoka outbox
//
// IDEMPOTENCY:
//   - Kila action ina idempotency key ya kipekee
//   - Server inakataa duplicates
//   - Hata kama acknowledgement inapotea, action haitumwi tena
//
// MATUMIZI:
//   import { offlineActions } from '../utils/offlineActions.js'
//   const post = await offlineActions.addPost(draft)
//   const comment = await offlineActions.addComment(postId, text)
//   const liked = await offlineActions.toggleLike(postId)
// ══════════════════════════════════════════════════════════════

import { outboxManager } from './outboxManager.js'
import { contentCache } from './contentCache.js'
import { supabaseContentRepository } from '../data/repositories/supabaseContentRepository.js'
import { supabaseIdentityRepository } from '../data/repositories/supabaseIdentityRepository.js'

/* ── UUID generator ────────────────────────────────────────── */
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback kwa browsers za zamani
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/* ── Offline Actions Manager ───────────────────────────────── */
export const offlineActions = {
  /**
   * Ongeza post mpya (offline-safe).
   * @param {Object} draft - Post draft
   * @param {string} draft.text - Maandishi ya post
   * @param {string} [draft.mediaUrl] - URL ya media
   * @param {string} [draft.visibility] - Visibility (public, followers, private)
   * @returns {Promise<Object>} - Post iliyoundwa (optimistic)
   */
  async addPost(draft) {
    const idempotencyKey = generateUUID()
    const optimisticId = `temp-${idempotencyKey}`
    
    // Unda optimistic post
    const optimisticPost = {
      id: optimisticId,
      authorId: 'me', // Itabadilishwa na server
      kind: draft.kind || 'text',
      text: draft.text || null,
      mediaUrl: draft.mediaUrl || null,
      visibility: draft.visibility || 'public',
      createdAt: new Date().toISOString(),
      _optimistic: true,
    }
    
    // Hifadhi kwenye cache (optimistic update)
    await contentCache.cachePost(optimisticPost, { ttlMs: 24 * 60 * 60 * 1000 }) // 1 siku
    
    // Ongeza kwenye outbox
    await outboxManager.enqueue({
      type: 'addPost',
      payload: {
        kind: draft.kind || 'text',
        text: draft.text || null,
        mediaUrl: draft.mediaUrl || null,
        visibility: draft.visibility || 'public',
      },
      idempotencyKey,
      priority: 1, // Muhimu
    })
    
    return optimisticPost
  },
  
  /**
   * Ongeza comment (offline-safe).
   * @param {string} postId - Post ID
   * @param {string} text - Maandishi ya comment
   * @returns {Promise<Object>} - Comment iliyoundwa (optimistic)
   */
  async addComment(postId, text) {
    const idempotencyKey = generateUUID()
    const optimisticId = `temp-${idempotencyKey}`
    
    // Unda optimistic comment
    const optimisticComment = {
      id: optimisticId,
      postId,
      authorId: 'me',
      text: text.trim(),
      createdAt: new Date().toISOString(),
      _optimistic: true,
    }
    
    // Hifadhi kwenye cache
    await contentCache.cacheComment(optimisticComment, { ttlMs: 24 * 60 * 60 * 1000 })
    
    // Ongeza kwenye outbox
    await outboxManager.enqueue({
      type: 'addComment',
      payload: {
        postId,
        text: text.trim(),
      },
      idempotencyKey,
      priority: 1,
    })
    
    return optimisticComment
  },
  
  /**
   * Toggle like (offline-safe).
   * @param {string} postId - Post ID
   * @returns {Promise<boolean>} - true ikiwa liked, false ikiwa unliked
   */
  async toggleLike(postId) {
    const idempotencyKey = generateUUID()
    
    // Angalia hali ya sasa (kutoka cache au Supabase)
    const isCurrentlyLiked = await supabaseContentRepository.isLiked(postId)
    const newLikedState = !isCurrentlyLiked
    
    // Optimistic update: badilisha hali mara moja
    // (Implementation ya actual like state itategemea UI state management)
    
    // Ongeza kwenye outbox
    await outboxManager.enqueue({
      type: 'toggleLike',
      payload: { postId },
      idempotencyKey,
      priority: 1,
    })
    
    return newLikedState
  },
  
  /**
   * Toggle save/bookmark (offline-safe).
   * @param {Object|string} item - Post item au ID
   * @returns {Promise<boolean>} - true ikiwa saved, false ikiwa unsaved
   */
  async toggleSaved(item) {
    const idempotencyKey = generateUUID()
    const itemId = typeof item === 'string' ? item : item.id
    
    // Angalia hali ya sasa
    const isCurrentlySaved = await supabaseContentRepository.isSaved(itemId)
    const newSavedState = !isCurrentlySaved
    
    // Optimistic update: badilisha hali mara moja
    // (Implementation ya actual save state itategemea UI state management)
    
    // Ongeza kwenye outbox
    await outboxManager.enqueue({
      type: 'toggleSaved',
      payload: { item: typeof item === 'string' ? { id: item } : item },
      idempotencyKey,
      priority: 1,
    })
    
    return newSavedState
  },
  
  /**
   * Toggle follow (offline-safe).
   * @param {string} userId - User ID kufuata/kutoa
   * @returns {Promise<boolean>} - true ikiwa following, false ikiwa not following
   */
  async toggleFollow(userId) {
    const idempotencyKey = generateUUID()
    
    // Angalia hali ya sasa
    const isCurrentlyFollowing = await supabaseIdentityRepository.isFollowing(userId)
    const newFollowingState = !isCurrentlyFollowing
    
    // Ongeza kwenye outbox
    await outboxManager.enqueue({
      type: 'toggleFollow',
      payload: { userId },
      idempotencyKey,
      priority: 1,
    })
    
    return newFollowingState
  },
  
  /**
   * Sasisha profile (offline-safe).
   * @param {Object} updates - Mabadiliko ya profile
   * @returns {Promise<Object>} - Profile iliyosasishwa (optimistic)
   */
  async updateProfile(updates) {
    const idempotencyKey = generateUUID()
    
    // Pata profile ya sasa
    const currentProfile = await supabaseIdentityRepository.getProfile('me')
    
    // Unda optimistic profile
    const optimisticProfile = {
      ...currentProfile,
      ...updates,
      _optimistic: true,
    }
    
    // Hifadhi kwenye cache
    await contentCache.cacheProfile(optimisticProfile)
    
    // Ongeza kwenye outbox
    await outboxManager.enqueue({
      type: 'updateProfile',
      payload: { updates },
      idempotencyKey,
      priority: 1,
    })
    
    return optimisticProfile
  },
  
  /**
   * Pata takwimu za offline actions.
   * @returns {Promise<Object>}
   */
  async getStats() {
    const outboxStats = await outboxManager.count()
    const cacheStats = await contentCache.getStats()
    
    return {
      outbox: outboxStats,
      cache: cacheStats,
    }
  },
  
  /**
   * Futa actions zote zilizoshindwa (kwa testing au reset).
   * @returns {Promise<number>} - Idadi ya actions zilizofutwa
   */
  async clearFailedActions() {
    return await outboxManager.clearFailed()
  },
  
  /**
   * Jaribu tena action iliyoshindwa.
   * @param {string} actionId - Action ID
   * @returns {Promise<void>}
   */
  async retryAction(actionId) {
    await outboxManager.retryAction(actionId)
  },
}

export default offlineActions
