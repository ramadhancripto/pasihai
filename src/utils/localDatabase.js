// ══════════════════════════════════════════════════════════════
// PASIHAI — LOCAL DATABASE (IndexedDB)
//
// Database ya ndani kwa kuhifadhi data locally (offline-first).
// Inatumia IndexedDB API moja kwa moja (hakuna dependencies).
//
// SCHEMA:
//   posts        - machapisho yaliyohifadhiwa (cache + offline)
//   comments     - maoni yaliyohifadhiwa
//   messages     - ujumbe wa chat (cache + outbox)
//   profiles     - wasifu wa watumiaji (cache)
//   outbox       - vitendo vinavyosubiri kusynchronize
//   metadata     - last sync timestamp, version, n.k.
//
// MATUMIZI:
//   import { localDb } from '../utils/localDatabase.js'
//   await localDb.open()
//   await localDb.posts.put({ id: '1', text: 'Hello' })
//   const posts = await localDb.posts.getAll()
// ══════════════════════════════════════════════════════════════

const DB_NAME = 'pasihai'
const DB_VERSION = 3 // v3: contentSharingIndex table

/* ── Database instance ─────────────────────────────────────── */
let db = null
let isOpen = false

/* ── Schema definition ─────────────────────────────────────── */
const SCHEMA = {
  posts: {
    keyPath: 'id',
    indexes: [
      { name: 'authorId', keyPath: 'authorId' },
      { name: 'createdAt', keyPath: 'createdAt' },
      { name: 'kind', keyPath: 'kind' },
    ],
  },
  comments: {
    keyPath: 'id',
    indexes: [
      { name: 'postId', keyPath: 'postId' },
      { name: 'authorId', keyPath: 'authorId' },
      { name: 'createdAt', keyPath: 'createdAt' },
    ],
  },
  messages: {
    keyPath: 'id',
    indexes: [
      { name: 'conversationId', keyPath: 'conversationId' },
      { name: 'senderId', keyPath: 'senderId' },
      { name: 'createdAt', keyPath: 'createdAt' },
    ],
  },
  profiles: {
    keyPath: 'id',
    indexes: [
      { name: 'username', keyPath: 'username' },
    ],
  },
  outbox: {
    keyPath: 'id',
    indexes: [
      { name: 'type', keyPath: 'type' },
      { name: 'status', keyPath: 'status' },
      { name: 'createdAt', keyPath: 'createdAt' },
      { name: 'priority', keyPath: 'priority' },
      { name: 'idempotencyKey', keyPath: 'idempotencyKey', unique: true },
    ],
  },
  contentSharingIndex: {
    keyPath: 'contentId',
    indexes: [
      { name: 'contentType', keyPath: 'contentType' },
      { name: 'origin', keyPath: 'origin' },
      { name: 'visibility', keyPath: 'accessPermissions.visibility' },
      { name: 'expiry', keyPath: 'expiry' },
    ],
  },
  metadata: {
    keyPath: 'key',
    indexes: [],
  },
}

/* ── Database wrapper ──────────────────────────────────────── */
export const localDb = {
  /**
   * Fungua database na uunde tables/indexes.
   * @returns {Promise<void>}
   */
  async open() {
    if (isOpen && db) return
    
    if (typeof indexedDB === 'undefined') {
      throw new Error('[LocalDB] IndexedDB haipatikani (SSR au privacy mode)')
    }
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      
      request.onerror = () => {
        console.error('[LocalDB] Imeshindwa kufungua database:', request.error)
        reject(request.error)
      }
      
      request.onsuccess = () => {
        db = request.result
        isOpen = true
        resolve()
      }
      
      request.onupgradeneeded = (event) => {
        const database = event.target.result
        const oldVersion = event.oldVersion
        const newVersion = event.newVersion
        
        console.log(`[LocalDB] Upgrading from v${oldVersion} to v${newVersion}`)
        
        // Unda au sasisha kila table
        for (const [storeName, config] of Object.entries(SCHEMA)) {
          let store
          
          if (!database.objectStoreNames.contains(storeName)) {
            // Unda table mpya
            store = database.createObjectStore(storeName, {
              keyPath: config.keyPath,
            })
          } else {
            // Tumia table iliyopo
            const tx = event.target.transaction
            store = tx.objectStore(storeName)
          }
          
          // Unda indexes (ondoa zilizopo kwanza ikiwa zinahitajika)
          for (const index of config.indexes) {
            const indexExists = store.indexNames.contains(index.name)
            
            if (!indexExists) {
              store.createIndex(index.name, index.keyPath, {
                unique: index.unique || false,
              })
            }
          }
        }
      }
    })
  },
  
  /**
   * Funga database.
   */
  close() {
    if (db) {
      db.close()
      db = null
      isOpen = false
    }
  },
  
  /**
   * Futa database yote (kwa testing au reset).
   * @returns {Promise<void>}
   */
  async destroy() {
    this.close()
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  },
  
  /**
   * Pata taarifa za database.
   * @returns {{ isOpen: boolean, name: string, version: number }}
   */
  getInfo() {
    return {
      isOpen,
      name: DB_NAME,
      version: DB_VERSION,
    }
  },
  
  /**
   * Pata database instance (kwa matumizi ya ndani).
   * @returns {IDBDatabase|null}
   */
  getDatabase() {
    return db
  },
}

/* ── Store wrappers (CRUD operations) ──────────────────────── */
function createStoreWrapper(storeName) {
  return {
    /**
     * Hifadhi item moja au zaidi.
     * @param {Object|Object[]} item - Item au items kuhifadhi
     * @returns {Promise<void>}
     */
    async put(item) {
      await localDb.open()
      const items = Array.isArray(item) ? item : [item]
      
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite')
        const store = tx.objectStore(storeName)
        
        for (const data of items) {
          store.put(data)
        }
        
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      })
    },
    
    /**
     * Soma item kwa ID.
     * @param {string} id - Item ID
     * @returns {Promise<Object|null>}
     */
    async get(id) {
      await localDb.open()
      
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly')
        const store = tx.objectStore(storeName)
        const request = store.get(id)
        
        request.onsuccess = () => resolve(request.result || null)
        request.onerror = () => reject(request.error)
      })
    },
    
    /**
     * Soma items zote.
     * @returns {Promise<Object[]>}
     */
    async getAll() {
      await localDb.open()
      
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly')
        const store = tx.objectStore(storeName)
        const request = store.getAll()
        
        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      })
    },
    
    /**
     * Soma items kwa index.
     * @param {string} indexName - Jina la index
     * @param {*} value - Thamani ya kutafuta
     * @returns {Promise<Object[]>}
     */
    async getByIndex(indexName, value) {
      await localDb.open()
      
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly')
        const store = tx.objectStore(storeName)
        const index = store.index(indexName)
        const request = index.getAll(value)
        
        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      })
    },
    
    /**
     * Futa item kwa ID.
     * @param {string} id - Item ID
     * @returns {Promise<void>}
     */
    async delete(id) {
      await localDb.open()
      
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite')
        const store = tx.objectStore(storeName)
        const request = store.delete(id)
        
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    },
    
    /**
     * Futa items zote.
     * @returns {Promise<void>}
     */
    async clear() {
      await localDb.open()
      
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite')
        const store = tx.objectStore(storeName)
        const request = store.clear()
        
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    },
    
    /**
     * Hesabu idadi ya items.
     * @returns {Promise<number>}
     */
    async count() {
      await localDb.open()
      
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly')
        const store = tx.objectStore(storeName)
        const request = store.count()
        
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    },
  }
}

/* ── Export store wrappers ─────────────────────────────────── */
export const posts = createStoreWrapper('posts')
export const comments = createStoreWrapper('comments')
export const messages = createStoreWrapper('messages')
export const profiles = createStoreWrapper('profiles')
export const outbox = createStoreWrapper('outbox')
export const metadata = createStoreWrapper('metadata')

export default localDb
