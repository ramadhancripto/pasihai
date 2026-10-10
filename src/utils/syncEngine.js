// ══════════════════════════════════════════════════════════════
// PASIHAI — SYNC ENGINE
//
// Inasimamia usawazishaji wa data kati ya local database na
// Supabase server. Inachakata outbox queue na kutuma actions
// kwa server kwa utaratibu sahihi.
//
// FEATURES:
//   - Process outbox queue (pending actions)
//   - Retry logic na exponential backoff
//   - Idempotency keys (kuzuia duplicates)
//   - Conflict detection na resolution
//   - Server acknowledgements
//   - Network status monitoring
//
// MATUMIZI:
//   import { syncEngine } from '../utils/syncEngine.js'
//   syncEngine.start() // Anza background sync
//   await syncEngine.processQueue() // Process manually
// ══════════════════════════════════════════════════════════════

import { outboxManager, STATUS } from './outboxManager.js'
import { localDb } from './localDatabase.js'
import { isSupabaseLive } from '../lib/supabaseClient.js'
import { parseSupabaseError, isRetryable } from './errors.js'

/* ── Configuration ─────────────────────────────────────────── */
const CONFIG = {
  autoSync: true,              // Auto-sync wakati online
  syncInterval: 30000,         // 30 seconds kwa periodic sync
  maxConcurrent: 3,            // Max concurrent actions
  retryDelays: [5000, 15000, 60000], // 5s, 15s, 60s
  maxRetries: 3,
  actionTTL: 7 * 24 * 60 * 60 * 1000, // Siku 7 — futa actions za zamani
  jitterFactor: 0.3,           // ±30% jitter kwa retry delays
}

/* ── State ─────────────────────────────────────────────────── */
let isProcessing = false
let syncTimer = null
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

/* ── Event Listeners (kwa cleanup) ─────────────────────────── */
let onlineHandler = null
let offlineHandler = null

/* ── Action handlers ───────────────────────────────────────── */
const actionHandlers = {
  /**
   * Toggle like kwenye post.
   * @param {Object} payload - { postId: string }
   * @param {string} idempotencyKey - Unique key
   */
  async toggleLike(payload, idempotencyKey) {
    const { postId } = payload
    
    // Import dynamically ili kuepuka circular dependency
    const { supabaseContentRepository } = await import('../data/repositories/supabaseContentRepository.js')
    
    return await supabaseContentRepository.toggleLike(postId, { skipOffline: true, idempotencyKey })
  },
  
  /**
   * Toggle save/bookmark kwenye post.
   */
  async toggleSaved(payload, idempotencyKey) {
    const { item } = payload
    const { supabaseContentRepository } = await import('../data/repositories/supabaseContentRepository.js')
    return await supabaseContentRepository.toggleSaved(item, { skipOffline: true, idempotencyKey })
  },
  
  /**
   * Ongeza comment kwenye post.
   */
  async addComment(payload, idempotencyKey) {
    const { postId, text } = payload
    const { supabaseContentRepository } = await import('../data/repositories/supabaseContentRepository.js')
    return await supabaseContentRepository.addComment(postId, text, { skipOffline: true, idempotencyKey })
  },
  
  /**
   * Ongeza post mpya.
   */
  async addPost(payload, idempotencyKey) {
    const { draft } = payload
    const { supabaseContentRepository } = await import('../data/repositories/supabaseContentRepository.js')
    return await supabaseContentRepository.addPost(draft, { skipOffline: true, idempotencyKey })
  },
  
  /**
   * Toggle follow user.
   */
  async toggleFollow(payload, idempotencyKey) {
    const { userId, on } = payload
    const { supabaseIdentityRepository } = await import('../data/repositories/supabaseIdentityRepository.js')
    return await supabaseIdentityRepository.toggleFollow(userId, on, { idempotencyKey })
  },
  
  /**
   * Sasisha profile.
   */
  async updateProfile(payload, idempotencyKey) {
    const { patch } = payload
    const { supabaseIdentityRepository } = await import('../data/repositories/supabaseIdentityRepository.js')
    return await supabaseIdentityRepository.updateProfile(patch, { idempotencyKey })
  },
  
  /**
   * Ficha post (hide).
   */
  async hideItem(payload, idempotencyKey) {
    const { itemId } = payload
    const { supabaseContentRepository } = await import('../data/repositories/supabaseContentRepository.js')
    return await supabaseContentRepository.hideItem(itemId, { skipOffline: true, idempotencyKey })
  },
  
  /**
   * Ripoti post (report).
   */
  async reportItem(payload, idempotencyKey) {
    const { itemId, reason } = payload
    const { supabaseContentRepository } = await import('../data/repositories/supabaseContentRepository.js')
    return await supabaseContentRepository.reportItem(itemId, reason, { skipOffline: true, idempotencyKey })
  },
}

/* ── Sync Engine ───────────────────────────────────────────── */
export const syncEngine = {
  /**
   * Anza background sync (auto-sync wakati online).
   */
  start() {
    if (!CONFIG.autoSync) return
    
    // Monitor network status (na named functions kwa cleanup)
    if (typeof window !== 'undefined') {
      // Ondoa listeners za zamani kama zipo (kuzuia duplicates)
      if (onlineHandler) {
        window.removeEventListener('online', onlineHandler)
      }
      if (offlineHandler) {
        window.removeEventListener('offline', offlineHandler)
      }
      
      // Unda handlers mpya (tumia syncEngine moja kwa moja badala ya 'this')
      onlineHandler = () => {
        isOnline = true
        console.log('[SyncEngine] Online — kuanza sync')
        syncEngine.processQueue()
      }
      
      offlineHandler = () => {
        isOnline = false
        console.log('[SyncEngine] Offline — kusimamisha sync')
      }
      
      // Sajili handlers
      window.addEventListener('online', onlineHandler)
      window.addEventListener('offline', offlineHandler)
    }
    
    // Periodic sync
    if (syncTimer) clearInterval(syncTimer)
    syncTimer = setInterval(() => {
      if (isOnline && isSupabaseLive) {
        syncEngine.processQueue()
      }
    }, CONFIG.syncInterval)
    
    console.log('[SyncEngine] Imeanza')
  },
  
  /**
   * Simamisha background sync na kusafisha resources.
   */
  stop() {
    // Safisha timer
    if (syncTimer) {
      clearInterval(syncTimer)
      syncTimer = null
    }
    
    // Ondoa event listeners (kuzuia memory leak)
    if (typeof window !== 'undefined') {
      if (onlineHandler) {
        window.removeEventListener('online', onlineHandler)
        onlineHandler = null
      }
      if (offlineHandler) {
        window.removeEventListener('offline', offlineHandler)
        offlineHandler = null
      }
    }
    
    console.log('[SyncEngine] Imesimama (resources zimesafishwa)')
  },
  
  /**
   * Chakata outbox queue na kutuma actions kwa server.
   * @returns {Promise<Object>} - { processed, succeeded, failed }
   */
  async processQueue() {
    if (isProcessing) {
      console.log('[SyncEngine] Tayari inachakata — kuruka')
      return { processed: 0, succeeded: 0, failed: 0 }
    }
    
    if (!isSupabaseLive) {
      console.log('[SyncEngine] Mock mode — hakuna sync')
      return { processed: 0, succeeded: 0, failed: 0 }
    }
    
    if (!isOnline) {
      console.log('[SyncEngine] Offline — hakuna sync')
      return { processed: 0, succeeded: 0, failed: 0 }
    }
    
    isProcessing = true
    const stats = { processed: 0, succeeded: 0, failed: 0 }
    
    try {
      // Pata pending actions
      const pending = await outboxManager.getQueue({ status: STATUS.PENDING })
      const retryable = await outboxManager.getRetryableActions()
      const actions = [...pending, ...retryable]
      
      console.log(`[SyncEngine] Kuchakata actions ${actions.length}`)
      
      // Process actions (kwa concurrency limit)
      for (let i = 0; i < actions.length; i += CONFIG.maxConcurrent) {
        const batch = actions.slice(i, i + CONFIG.maxConcurrent)
        const results = await Promise.allSettled(
          batch.map(action => this.processAction(action))
        )
        
        for (const result of results) {
          stats.processed++
          if (result.status === 'fulfilled') {
            stats.succeeded++
          } else {
            stats.failed++
          }
        }
      }
      
      console.log(`[SyncEngine] Imekamilika: ${stats.succeeded}/${stats.processed} succeeded`)
    } catch (err) {
      console.error('[SyncEngine] Hitilafu:', err)
    } finally {
      isProcessing = false
    }
    
    return stats
  },
  
  /**
   * Chakata action moja.
   * @param {Object} action - Action kutoka outbox
   * @returns {Promise<any>} - Result ya action
   */
  async processAction(action) {
    const { id, type, payload, idempotencyKey } = action
    
    try {
      // Angalia TTL — kama action ni ya zamani sana, futa
      const actionAge = Date.now() - new Date(action.createdAt).getTime()
      if (actionAge > CONFIG.actionTTL) {
        console.warn(`[SyncEngine] Action ${id} ni ya zamani (${Math.round(actionAge / 3600000)}h) — kufuta`)
        await outboxManager.remove(id)
        return null
      }
      
      // Mark as sending
      await outboxManager.updateStatus(id, STATUS.SENDING)
      
      // Pata handler
      const handler = actionHandlers[type]
      if (!handler) {
        throw new Error(`Handler haijapatikana kwa action type: ${type}`)
      }
      
      // Execute action
      const result = await handler(payload, idempotencyKey)
      
      // Two-phase commit: weka SENT_TO_SERVER kwanza, kisha futa
      // Hii inazuia duplicate submission kama remove() inashindwa
      await outboxManager.updateStatus(id, STATUS.SENT_TO_SERVER)
      
      // Jaribu kufuta action kutoka outbox
      try {
        await outboxManager.remove(id)
        // Kama imefanikiwa, weka status kuwa SENT (au tayari imefutwa)
      } catch (removeError) {
        // Kama remove inashindwa, action itabaki na status SENT_TO_SERVER
        // Sync engine haitaituma tena (inachuja SENT_TO_SERVER)
        console.warn(`[SyncEngine] Action ${id} imetumwa lakini imeshindwa kufutwa kutoka outbox — itabaki na SENT_TO_SERVER`)
      }
      
      return result
    } catch (err) {
      // Hakikisha action haikwami kwenye 'sending' status
      try {
        // Parse error
        const parsedError = parseSupabaseError(err, `sync:${type}`)
        
        // Angalia kama inaweza kujaribu tena
        if (isRetryable(parsedError) && action.retries < CONFIG.maxRetries) {
          await outboxManager.updateStatus(id, STATUS.FAILED, parsedError.message)
          console.warn(`[SyncEngine] Action ${id} imeshindwa — itajaribu tena baadaye`)
        } else {
          // Non-retryable au max retries reached
          await outboxManager.updateStatus(id, STATUS.FAILED, parsedError.message)
          console.error(`[SyncEngine] Action ${id} imeshindwa permanently:`, parsedError.message)
        }
      } catch (statusError) {
        // Kama hata status update inashindwa, jaribu kuondoa action
        console.error(`[SyncEngine] Hata status update imeshindwa kwa action ${id}:`, statusError)
        try {
          await outboxManager.remove(id)
        } catch (removeError) {
          console.error(`[SyncEngine] Hata remove imeshindwa kwa action ${id}:`, removeError)
        }
      }
      
      throw err
    }
  },
  
  /**
   * Pata status ya sync engine.
   * @returns {Object} - { isProcessing, isOnline, queueStats }
   */
  async getStatus() {
    const queueStats = await outboxManager.count()
    return {
      isProcessing,
      isOnline,
      isLiveMode: isSupabaseLive,
      queue: queueStats,
    }
  },
  
  /**
   * Jaribu tena action iliyoshindwa.
   * @param {string} actionId - ID ya action
   */
  async retryAction(actionId) {
    const action = await outboxManager.getAction(actionId)
    if (!action) {
      throw new Error(`Action ${actionId} haipatikani`)
    }
    
    if (action.status !== STATUS.FAILED) {
      throw new Error(`Action ${actionId} si failed (status: ${action.status})`)
    }
    
    // Reset retries na status
    action.status = STATUS.PENDING
    action.retries = 0
    action.lastError = null
    await outboxManager.updateStatus(actionId, STATUS.PENDING)
    
    // Process immediately
    return await this.processAction(action)
  },
  
  /**
   * Futa actions zote zilizotumwa.
   */
  async clearSent() {
    const count = await outboxManager.clearSent()
    console.log(`[SyncEngine] Imefuta sent actions ${count}`)
    return count
  },
  
  /**
   * Futa actions zote zilizoshindwa.
   */
  async clearFailed() {
    const count = await outboxManager.clearFailed()
    console.log(`[SyncEngine] Imefuta failed actions ${count}`)
    return count
  },
}

export default syncEngine
