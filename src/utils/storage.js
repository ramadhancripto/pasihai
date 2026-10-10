// ══════════════════════════════════════════════════════════════
// PASIHAI — LOCAL STORAGE UTILITY
//
// Wrapper salama kwa localStorage inayoshughulikia:
// - JSON serialization/deserialization
// - Error handling (quota exceeded, security errors)
// - Namespace prefix (kuzuia migongano na apps nyingine)
// - Fallback kwa in-memory storage (ikiwa localStorage haipatikani)
//
// MATUMIZI:
//   import { storage } from '../utils/storage.js'
//   storage.set('userPrefs', { theme: 'dark' })
//   const prefs = storage.get('userPrefs')
//   storage.remove('userPrefs')
// ══════════════════════════════════════════════════════════════

const NAMESPACE = 'pasihai_'
const VERSION = 1

/* ── In-memory fallback (kwa SSR au privacy mode) ────────── */
const memoryStore = new Map()

/* ── Je, localStorage inapatikana? ────────────────────────── */
function isLocalStorageAvailable() {
  try {
    if (typeof window === 'undefined') return false
    if (!window.localStorage) return false
    
    // Jaribu kuandika na kusoma (inaweza kushindwa kwa privacy mode)
    const testKey = '__pasihai_test__'
    window.localStorage.setItem(testKey, '1')
    window.localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

const hasLocalStorage = isLocalStorageAvailable()

/* ── Storage API ─────────────────────────────────────────── */
export const storage = {
  /**
   * Hifadhi thamani kwenye localStorage (au memory fallback).
   * @param {string} key - Jina la ufunguo
   * @param {*} value - Thamani yoyote inayoweza kuwa JSON
   * @returns {boolean} - true ikiwa imehifadhiwa
   */
  set(key, value) {
    const fullKey = `${NAMESPACE}${key}`
    const payload = JSON.stringify({ v: VERSION, data: value, t: Date.now() })
    
    if (hasLocalStorage) {
      try {
        window.localStorage.setItem(fullKey, payload)
        return true
      } catch (err) {
        // Quota exceeded au security error
        console.warn(`[storage.set] Imeshindwa kuhifadhi "${key}":`, err.message)
        memoryStore.set(fullKey, payload)
        return false
      }
    }
    
    memoryStore.set(fullKey, payload)
    return true
  },
  
  /**
   * Soma thamani kutoka localStorage (au memory fallback).
   * @param {string} key - Jina la ufunguo
   * @param {*} defaultValue - Thamani ya default ikiwa haipatikani
   * @returns {*} - Thamani iliyohifadhiwa au defaultValue
   */
  get(key, defaultValue = null) {
    const fullKey = `${NAMESPACE}${key}`
    
    let raw = null
    if (hasLocalStorage) {
      try {
        raw = window.localStorage.getItem(fullKey)
      } catch {
        raw = memoryStore.get(fullKey) || null
      }
    } else {
      raw = memoryStore.get(fullKey) || null
    }
    
    if (!raw) return defaultValue
    
    try {
      const parsed = JSON.parse(raw)
      // Version check (baadaye tunaweza kufanya migration)
      if (parsed.v !== VERSION) {
        console.warn(`[storage.get] Version mismatch kwa "${key}":`, parsed.v, '!=', VERSION)
        return defaultValue
      }
      return parsed.data
    } catch {
      console.warn(`[storage.get] Imeshindwa kusoma "${key}"`)
      return defaultValue
    }
  },
  
  /**
   * Ondoa thamani kutoka localStorage.
   * @param {string} key - Jina la ufunguo
   * @returns {boolean} - true ikiwa imeondolewa
   */
  remove(key) {
    const fullKey = `${NAMESPACE}${key}`
    
    if (hasLocalStorage) {
      try {
        window.localStorage.removeItem(fullKey)
      } catch {
        // Ignore
      }
    }
    
    memoryStore.delete(fullKey)
    return true
  },
  
  /**
   * Ondoa data yote ya PASIHAI kutoka localStorage.
   * @returns {number} - Idadi ya vitu vilivyoondolewa
   */
  clearAll() {
    let count = 0
    
    if (hasLocalStorage) {
      try {
        const keys = []
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i)
          if (key && key.startsWith(NAMESPACE)) {
            keys.push(key)
          }
        }
        keys.forEach(key => {
          window.localStorage.removeItem(key)
          count++
        })
      } catch {
        // Ignore
      }
    }
    
    // Clear memory store pia
    for (const key of memoryStore.keys()) {
      if (key.startsWith(NAMESPACE)) {
        memoryStore.delete(key)
        count++
      }
    }
    
    return count
  },
  
  /**
   * Pata taarifa kuhusu matumizi ya storage.
   * @returns {{ keys: number, bytes: number, available: boolean }}
   */
  getInfo() {
    let keys = 0
    let bytes = 0
    
    if (hasLocalStorage) {
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i)
          if (key && key.startsWith(NAMESPACE)) {
            keys++
            bytes += (window.localStorage.getItem(key) || '').length * 2 // UTF-16
          }
        }
      } catch {
        // Ignore
      }
    }
    
    return {
      keys,
      bytes,
      available: hasLocalStorage,
    }
  },
}

export default storage
