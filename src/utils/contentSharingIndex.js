// ══════════════════════════════════════════════════════════════
// PASIHAI — CONTENT SHARING INDEX
//
// Index ya content iliyohifadhiwa kwenye kifaa kwa kusambazwa
// kwa vifaa vingine vinavyoshiriki (Automatic Content Sharing).
//
// MUHIMU:
//   - Hii NI INDEX tu (si storage ya content yenyewe)
//   - Content yenyewe inahifadhiwa kwenye IndexedDB (posts, comments, n.k.)
//   - Index inafuatilia nini kinapatikana kwa kusambazwa
//   - Access permissions zinaheshimiwa (public, followers, private)
//
// SCHEMA:
//   {
//     contentId: string (UUID),
//     contentType: 'post' | 'comment' | 'reel' | 'status' | n.k.,
//     cacheStatus: 'cached' | 'expired' | 'missing',
//     origin: 'self' | 'friend' | 'community' | 'server',
//     expiry: ISO timestamp au null (hakuna expiry),
//     version: string (hash au version number),
//     accessPermissions: {
//       visibility: 'public' | 'followers' | 'private',
//       authorId: string (UUID),
//       allowedGroups: string[] (group IDs),
//     },
//     metadata: {
//       sizeBytes: number,
//       createdAt: ISO timestamp,
//       lastAccessed: ISO timestamp,
//       accessCount: number,
//     }
//   }
//
// MATUMIZI:
//   import { contentSharingIndex } from '../utils/contentSharingIndex.js'
//   await contentSharingIndex.add(post)
//   const available = await contentSharingIndex.query({ contentType: 'post' })
//   await contentSharingIndex.remove(contentId)
// ══════════════════════════════════════════════════════════════

import { localDb } from './localDatabase.js'

/* ── Content Sharing Index Manager ─────────────────────────── */
export const contentSharingIndex = {
  /**
   * Ongeza content kwenye index.
   * @param {Object} content - Content kuongeza
   * @param {string} content.id - Content ID
   * @param {string} content.type - Content type (post, comment, reel, n.k.)
   * @param {Object} [content.options] - Chaguzi za ziada
   * @returns {Promise<Object>} - Index entry iliyoundwa
   */
  async add(content, options = {}) {
    const now = new Date().toISOString()
    
    const entry = {
      contentId: content.id,
      contentType: content.type || 'post',
      cacheStatus: 'cached',
      origin: options.origin || 'self',
      expiry: options.expiry || null,
      version: options.version || this._generateVersion(content),
      accessPermissions: {
        visibility: content.visibility || 'public',
        authorId: content.authorId || content.userId || null,
        allowedGroups: options.allowedGroups || [],
      },
      metadata: {
        sizeBytes: options.sizeBytes || this._estimateSize(content),
        createdAt: now,
        lastAccessed: now,
        accessCount: 0,
      },
    }
    
    await localDb.open()
    const db = localDb.getDatabase()
    const tx = db.transaction('contentSharingIndex', 'readwrite')
    const store = tx.objectStore('contentSharingIndex')
    
    return new Promise((resolve, reject) => {
      const request = store.put(entry)
      request.onsuccess = () => resolve(entry)
      request.onerror = () => reject(request.error)
    })
  },
  
  /**
   * Pata content kutoka index.
   * @param {string} contentId - Content ID
   * @returns {Promise<Object|null>} - Index entry au null
   */
  async get(contentId) {
    await localDb.open()
    const db = localDb.getDatabase()
    const tx = db.transaction('contentSharingIndex', 'readonly')
    const store = tx.objectStore('contentSharingIndex')
    
    return new Promise((resolve, reject) => {
      const request = store.get(contentId)
      request.onsuccess = () => {
        const entry = request.result
        if (entry) {
          // Sasisha lastAccessed na accessCount
          this._updateAccessStats(contentId)
        }
        resolve(entry || null)
      }
      request.onerror = () => reject(request.error)
    })
  },
  
  /**
   * Ondoa content kutoka index.
   * @param {string} contentId - Content ID
   * @returns {Promise<void>}
   */
  async remove(contentId) {
    await localDb.open()
    const db = localDb.getDatabase()
    const tx = db.transaction('contentSharingIndex', 'readwrite')
    const store = tx.objectStore('contentSharingIndex')
    
    return new Promise((resolve, reject) => {
      const request = store.delete(contentId)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  },
  
  /**
   * Tafuta content kwenye index kwa filters.
   * @param {Object} filters - Filters za utafutaji
   * @param {string} [filters.contentType] - Chuja kwa type
   * @param {string} [filters.visibility] - Chuja kwa visibility
   * @param {string} [filters.origin] - Chuja kwa origin
   * @param {boolean} [filters.includeExpired=false] - Jumuisha zilizokwisha muda
   * @returns {Promise<Object[]>} - Index entries zinazolingana
   */
  async query(filters = {}) {
    await localDb.open()
    const db = localDb.getDatabase()
    const tx = db.transaction('contentSharingIndex', 'readonly')
    const store = tx.objectStore('contentSharingIndex')
    
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => {
        let results = request.result || []
        const now = new Date()
        
        // Chuja kwa contentType
        if (filters.contentType) {
          results = results.filter(e => e.contentType === filters.contentType)
        }
        
        // Chuja kwa visibility
        if (filters.visibility) {
          results = results.filter(e => e.accessPermissions.visibility === filters.visibility)
        }
        
        // Chuja kwa origin
        if (filters.origin) {
          results = results.filter(e => e.origin === filters.origin)
        }
        
        // Ondoa zilizokwisha muda (isipokuwa ikiwa includeExpired = true)
        if (!filters.includeExpired) {
          results = results.filter(e => {
            if (!e.expiry) return true // Hakuna expiry
            return new Date(e.expiry) > now
          })
        }
        
        // Ondoa zisizo cached
        results = results.filter(e => e.cacheStatus === 'cached')
        
        resolve(results)
      }
      request.onerror = () => reject(request.error)
    })
  },
  
  /**
   * Angalia kama content inapatikana kwa kusambazwa.
   * @param {string} contentId - Content ID
   * @param {string} requestorId - ID ya mtumiaji anayeomba
   * @returns {Promise<boolean>}
   */
  async canShare(contentId, requestorId) {
    const entry = await this.get(contentId)
    if (!entry) return false
    if (entry.cacheStatus !== 'cached') return false
    
    // Angalia expiry
    if (entry.expiry && new Date(entry.expiry) < new Date()) {
      return false
    }
    
    // Angalia permissions
    const perms = entry.accessPermissions
    if (perms.visibility === 'public') return true
    if (perms.visibility === 'private') {
      // Private: author tu au allowed groups
      return perms.authorId === requestorId || 
             perms.allowedGroups.includes(requestorId)
    }
    if (perms.visibility === 'followers') {
      // Followers: inahitaji uchunguzi wa follows table
      // Kwa sasa, rudisha false (inahitaji implementation ya baadaye)
      return false
    }
    
    return false
  },
  
  /**
   * Pata takwimu za index.
   * @returns {Promise<Object>} - { total, byType, byOrigin, totalSizeBytes }
   */
  async getStats() {
    const all = await this.query({ includeExpired: true })
    
    const stats = {
      total: all.length,
      byType: {},
      byOrigin: {},
      totalSizeBytes: 0,
    }
    
    for (const entry of all) {
      // By type
      if (!stats.byType[entry.contentType]) {
        stats.byType[entry.contentType] = 0
      }
      stats.byType[entry.contentType]++
      
      // By origin
      if (!stats.byOrigin[entry.origin]) {
        stats.byOrigin[entry.origin] = 0
      }
      stats.byOrigin[entry.origin]++
      
      // Total size
      stats.totalSizeBytes += entry.metadata.sizeBytes || 0
    }
    
    return stats
  },
  
  /**
   * Safisha content zilizokwisha muda.
   * @returns {Promise<number>} - Idadi ya entries zilizofutwa
   */
  async cleanup() {
    const now = new Date()
    const all = await this.query({ includeExpired: true })
    let removed = 0
    
    for (const entry of all) {
      if (entry.expiry && new Date(entry.expiry) < now) {
        await this.remove(entry.contentId)
        removed++
      }
    }
    
    return removed
  },
  
  /**
   * Futa index yote (kwa testing).
   * @returns {Promise<void>}
   */
  async clear() {
    await localDb.open()
    const db = localDb.getDatabase()
    const tx = db.transaction('contentSharingIndex', 'readwrite')
    const store = tx.objectStore('contentSharingIndex')
    
    return new Promise((resolve, reject) => {
      const request = store.clear()
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  },
  
  /* ── Helper methods ──────────────────────────────────────── */
  
  _generateVersion(content) {
    // Rahisi: tumia timestamp + random string
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 8)
    return `${timestamp}-${random}`
  },
  
  _estimateSize(content) {
    // Makadirio ya ukubwa (bytes)
    const text = content.text || ''
    const mediaUrl = content.mediaUrl || ''
    
    // Text: ~1 byte per character
    let size = text.length
    
    // Media URL: ~100 bytes
    if (mediaUrl) size += 100
    
    // Metadata: ~200 bytes
    size += 200
    
    return size
  },
  
  async _updateAccessStats(contentId) {
    try {
      await localDb.open()
      const db = localDb.getDatabase()
      const tx = db.transaction('contentSharingIndex', 'readwrite')
      const store = tx.objectStore('contentSharingIndex')
      
      const request = store.get(contentId)
      request.onsuccess = () => {
        const entry = request.result
        if (entry) {
          entry.metadata.lastAccessed = new Date().toISOString()
          entry.metadata.accessCount = (entry.metadata.accessCount || 0) + 1
          store.put(entry)
        }
      }
    } catch (err) {
      // Silently ignore stats update errors
      console.warn('[ContentSharingIndex] Failed to update access stats:', err)
    }
  },
}

export default contentSharingIndex
