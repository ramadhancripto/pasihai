// ══════════════════════════════════════════════════════════════
// PASIHAI — HOOK: USE ONLINE STATUS
//
// Hook inayofuatilia hali ya mtandao (online/offline).
// Inatumia navigator.onLine na browser events.
//
// MATUMIZI:
//   import { useOnlineStatus } from '../hooks/useOnlineStatus.js'
//   const isOnline = useOnlineStatus()
//   if (!isOnline) { ... onyesha banner ... }
//
// SSR-SAFE:
//   Ikiwa window haipatikani (SSR), inarudisha true (optimistic).
// ══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'

/**
 * Hook inayorudisha hali ya mtandao (online/offline).
 * Inabadilika moja kwa moja wakati browser inapata au kupoteza internet.
 * @returns {boolean} - true ikiwa online, false ikiwa offline
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator === 'undefined') return true
    return navigator.onLine !== false
  })
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  
  return isOnline
}

/**
 * Hook inayorudisha hali ya mtandao na historia ya mabadiliko.
 * Muhimu kwa debugging na analytics.
 * @returns {{ isOnline: boolean, lastChange: number, changes: number }}
 */
export function useOnlineStatusWithHistory() {
  const [state, setState] = useState(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine !== false : true,
    lastChange: Date.now(),
    changes: 0,
  }))
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const handleChange = (online) => {
      setState(prev => ({
        isOnline: online,
        lastChange: Date.now(),
        changes: prev.changes + 1,
      }))
    }
    
    const handleOnline = () => handleChange(true)
    const handleOffline = () => handleChange(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  
  return state
}

export default useOnlineStatus
