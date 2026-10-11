// ══════════════════════════════════════════════════════════════
// PASIHAI — FEED MODE HOOK
//
// Manages the 4 feed viewing modes with localStorage persistence.
// Default: large-post-feed (Large Post Feed)
//
// Modes:
//   large-post-feed    — Default; large posts with next post peek
//   vertical-slide     — Near-fullscreen; swipe up/down
//   horizontal-slide   — Fullscreen; swipe left/right
//   automatic-view     — System picks best layout per content/device
// ══════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react'
import { storage } from '../utils/storage.js'

const STORAGE_KEY = 'feedViewMode'
const DEFAULT_MODE = 'large-post-feed'

export const FEED_MODES = [
  { id: 'large-post-feed', label: 'Large Post Feed', icon: 'grid', shortLabel: 'Large' },
  { id: 'vertical-slide', label: 'Vertical Slide', icon: 'vertical', shortLabel: 'Vertical' },
  { id: 'horizontal-slide', label: 'Horizontal Full Screen', icon: 'horizontal', shortLabel: 'Horizontal' },
  { id: 'automatic-view', label: 'Automatic View', icon: 'auto', shortLabel: 'Auto' },
]

export function useFeedMode() {
  const [mode, setModeState] = useState(() => {
    const saved = storage.get(STORAGE_KEY, null)
    return saved && FEED_MODES.some((m) => m.id === saved) ? saved : DEFAULT_MODE
  })

  const setMode = useCallback((newMode) => {
    if (!FEED_MODES.some((m) => m.id === newMode)) return
    setModeState(newMode)
    storage.set(STORAGE_KEY, newMode)
  }, [])

  // CSS class for the feed container
  const feedClassName = `psh-feed psh-feed--${mode}`

  // Whether the mode supports swipe gestures
  const isSwipeMode = mode === 'vertical-slide' || mode === 'horizontal-slide'

  // Whether posts should be near-fullscreen
  const isFullscreenPost = mode === 'vertical-slide' || mode === 'horizontal-slide'

  // Whether to show next-post peek
  const showPeek = mode === 'large-post-feed'

  // Automatic mode: pick layout based on device/content
  const resolveAutomatic = useCallback((contentType, deviceType) => {
    if (mode !== 'automatic-view') return mode
    // On mobile with video content, prefer vertical slide
    if (deviceType === 'mobile' && (contentType === 'video' || contentType === 'reel')) {
      return 'vertical-slide'
    }
    // On desktop or with text/image content, use large post feed
    return 'large-post-feed'
  }, [mode])

  return {
    mode,
    setMode,
    feedClassName,
    isSwipeMode,
    isFullscreenPost,
    showPeek,
    resolveAutomatic,
    modes: FEED_MODES,
  }
}

export default useFeedMode