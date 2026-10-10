// ══════════════════════════════════════════════════════════════
// PASIHAI — OUTBOX MANAGER (Pending Actions Queue)
//
// Inasimamia vitendo vinavyosubiri kusynchronize na server.
// Inatumia IndexedDB (localDatabase.js) kwa persistence.
//
// FEATURES:
//   - Enqueue actions (add to queue)
//   - Process queue (send to server)
//   - Retry failed actions (exponential backoff)
//   - Idempotency keys (prevent duplicates)
//   - Priority queue (important actions first)
//   - Status tracking (pending, sending, sent, failed)
//
// ACTION TYPES:
//   - toggleLike, toggleSaved, addComment, addPost, n.k.
//
// MATUMIZI:
//   import { outboxManager } from '../utils/outboxManager.js'
//   await outboxManager.enqueue({
//     type: 'toggleLike',
//     payload: { postId: '123' },
//     idempotencyKey: 'uuid-here'
//   })
//   await outboxManager.process()
// ══════════════════════════════════════════════════════════════

import { outbox } from './localDatabase.js'

/* ── Action status ─────────────────────────────────────────── */
export const STATUS = {
  PENDING: 'pending',           // Inasubiri kusynchronize
  SENDING: 'sending',           // Inatumwa sasa
  SENT_TO_SERVER: 'sent_to_server', // Imetumwa kwa server (inahifadhiwa kwenye outbox kwa usalama)
  SENT: 'sent',                 // Imetumwa na kuthibitishwa (imefutwa kutoka outbox)
  FAILED: 'failed',             // Imeshindwa (itajaribu tena)
  CANCELLED: 'cancelled',       // Imefutwa
}

/* ── Retry configuration ───────────────────────────────────── */
const MAX_RETRIES = 3
const RETRY_DELAYS = [5000, 15000, 60000] // 5s, 15s, 60s (exponential backoff)

/* ── UUID generator (kwa idempotency keys) ─────────────────── */
function generateId() {
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

/* ── Outbox Manager ────────────────────────────────────────── */
export const outboxManager = {
  /**
   * Ongeza action kwenye queue.
   * @param {Object} action - Action kuhifadhi
   * @param {string} action.type - Aina ya action (toggleLike, addComment, n.k.)
   * @param {Object} action.payload - Data ya action
   * @param {string} [action.idempotencyKey] - Key ya kuzuia duplicates (auto-generated ikiwa haipo)
   * @param {number} [action.priority=0] - Priority (0 = kawaida, 1 = muhimu)
   * @returns {Promise<Object>} - Action iliyohifadhiwa
   */
  async enqueue(action) {
    const now = new Date().toISOString()
    const idempotencyKey = action.idempotencyKey || generateId()
    
    // Angalia kama kuna duplicate action inayosubiri
    const existingAction = await outbox.get(idempotencyKey)
    if (existingAction && (existingAction.status === STATUS.PENDING || existingAction.status === STATUS.SENDING)) {
      console.warn(`[Outbox] Duplicate action ${idempotencyKey} — kurudisha iliyopo`)
      return existingAction
    }
    
    const queuedAction = {
      id: idempotencyKey, // ID na idempotencyKey lazima ziwe sawa
      type: action.type,
      payload: action.payload,
      idempotencyKey: idempotencyKey,
      priority: action.priority || 0,
      status: STATUS.PENDING,
      retries: 0,
      createdAt: now,
      updatedAt: now,
      lastError: null,
      serverAcknowledged: false,
    }
    
    await outbox.put(queuedAction)
    return queuedAction
  },
  
  /**
   * Pata actions zote zinazosubiri.
   * @param {Object} [options] - Chaguzi
   * @param {string} [options.status] - Chuja kwa status
   * @param {string} [options.type] - Chuja kwa type
   * @returns {Promise<Object[]>}
   */
  async getQueue(options = {}) {
    let actions = await outbox.getAll()
    
    if (options.status) {
      actions = actions.filter(a => a.status === options.status)
    }
    
    if (options.type) {
      actions = actions.filter(a => a.type === options.type)
    }
    
    // Panga kwa priority (muhimu kwanza) kisha createdAt (zamani kwanza)
    actions.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority
      }
      return new Date(a.createdAt) - new Date(b.createdAt)
    })
    
    return actions
  },
  
  /**
   * Pata action moja kwa ID.
   * @param {string} id - Action ID
   * @returns {Promise<Object|null>}
   */
  async getAction(id) {
    return outbox.get(id)
  },
  
  /**
   * Sasisha status ya action.
   * @param {string} id - Action ID
   * @param {string} status - Status mpya
   * @param {string} [error] - Error message (kwa failed status)
   * @returns {Promise<Object>}
   */
  async updateStatus(id, status, error = null) {
    const action = await outbox.get(id)
    if (!action) {
      throw new Error(`[Outbox] Action ${id} haipatikani`)
    }
    
    action.status = status
    action.updatedAt = new Date().toISOString()
    
    if (error) {
      action.lastError = error
    }
    
    if (status === STATUS.FAILED) {
      action.retries += 1
    }
    
    await outbox.put(action)
    return action
  },
  
  /**
   * Futa action kutoka queue.
   * @param {string} id - Action ID
   * @returns {Promise<void>}
   */
  async remove(id) {
    await outbox.delete(id)
  },
  
  /**
   * Futa actions zote zilizotumwa (status = 'sent').
   * @returns {Promise<number>} - Idadi ya actions zilizofutwa
   */
  async clearSent() {
    // Futa actions zote zilizotumwa kwa mafanikio (SENT na SENT_TO_SERVER)
    const sent = await this.getQueue({ status: STATUS.SENT })
    const sentToServer = await this.getQueue({ status: STATUS.SENT_TO_SERVER })
    const allSent = [...sent, ...sentToServer]
    
    for (const action of allSent) {
      await outbox.delete(action.id)
    }
    return allSent.length
  },
  
  /**
   * Futa actions zote zilizoshindwa na zimefikia max retries.
   * @returns {Promise<number>} - Idadi ya actions zilizofutwa
   */
  async clearFailed() {
    const failed = await this.getQueue({ status: STATUS.FAILED })
    const toDelete = failed.filter(a => a.retries >= MAX_RETRIES)
    
    for (const action of toDelete) {
      await outbox.delete(action.id)
    }
    
    return toDelete.length
  },
  
  /**
   * Hesabu idadi ya actions kwa kila status.
   * @returns {Promise<Object>} - { pending, sending, sent, failed, cancelled }
   */
  async count() {
    const actions = await outbox.getAll()
    const counts = {
      pending: 0,
      sending: 0,
      sent_to_server: 0,
      sent: 0,
      failed: 0,
      cancelled: 0,
      total: actions.length,
    }
    
    for (const action of actions) {
      if (counts[action.status] !== undefined) {
        counts[action.status]++
      }
    }
    
    return counts
  },
  
  /**
   * Angalia kama action inapaswa kujaribu tena.
   * Inatumia exponential backoff na jitter kuzuia thundering herd.
   * @param {Object} action - Action kuangalia
   * @returns {boolean}
   */
  shouldRetry(action) {
    if (action.status !== STATUS.FAILED) return false
    if (action.retries >= MAX_RETRIES) return false
    
    // Angalia kama muda wa kutosha umepita (na jitter)
    const lastUpdate = new Date(action.updatedAt).getTime()
    const now = Date.now()
    const baseDelay = RETRY_DELAYS[action.retries] || RETRY_DELAYS[RETRY_DELAYS.length - 1]
    
    // Ongeza jitter (±30%) kuzuia thundering herd
    const jitter = baseDelay * 0.3 * (Math.random() * 2 - 1) // -30% hadi +30%
    const delayWithJitter = Math.max(1000, baseDelay + jitter) // Minimum 1 second
    
    return (now - lastUpdate) >= delayWithJitter
  },
  
  /**
   * Pata actions zinazoweza kujaribu tena.
   * @returns {Promise<Object[]>}
   */
  async getRetryableActions() {
    const failed = await this.getQueue({ status: STATUS.FAILED })
    return failed.filter(action => this.shouldRetry(action))
  },
  
  /**
   * Angalia kama kuna action ya aina fulani inayosubiri.
   * @param {string} type - Aina ya action
   * @param {string} idempotencyKey - Key ya kuzuia duplicates
   * @returns {Promise<boolean>}
   */
  async hasPendingAction(type, idempotencyKey) {
    const actions = await outbox.getByIndex('type', type)
    return actions.some(a => 
      a.idempotencyKey === idempotencyKey && 
      (a.status === STATUS.PENDING || a.status === STATUS.SENDING)
    )
  },
  
  /**
   * Futa queue yote (kwa testing au reset).
   * @returns {Promise<void>}
   */
  async clear() {
    await outbox.clear()
  },
  
  /**
   * Rejesha actions zilizokwama katika hali ya 'sending' baada ya crash.
   * Ikiwa action imekuwa katika hali ya 'sending' kwa zaidi ya muda maalum,
   * itarudishwa kwenye 'pending' au 'failed'.
   * @param {number} [timeoutMs=60000] - Muda wa kutosha kwa action kuwa 'sending' (default: 60s)
   * @returns {Promise<Object>} - { recovered, failed }
   */
  async recoverStuckActions(timeoutMs = 60000) {
    const sending = await this.getQueue({ status: STATUS.SENDING })
    const now = Date.now()
    const stats = { recovered: 0, failed: 0 }
    
    for (const action of sending) {
      const timeSinceUpdate = now - new Date(action.updatedAt).getTime()
      
      if (timeSinceUpdate > timeoutMs) {
        // Action imekwama - rudisha kwenye pending au failed
        if (action.retries >= MAX_RETRIES) {
          // Imefikia max retries - weka kwenye failed
          await this.updateStatus(
            action.id,
            STATUS.FAILED,
            'Action ilikwama katika hali ya sending baada ya crash (max retries reached)'
          )
          stats.failed++
        } else {
          // Bado ina retries - rudisha kwenye pending
          await this.updateStatus(
            action.id,
            STATUS.PENDING,
            null // Futa error message
          )
          stats.recovered++
        }
      }
    }
    
    if (stats.recovered > 0 || stats.failed > 0) {
      console.log(
        `[Outbox] Recovered ${stats.recovered} stuck actions, ` +
        `${stats.failed} marked as failed`
      )
    }
    
    return stats
  },
}

export default outboxManager
