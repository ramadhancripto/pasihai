// ══════════════════════════════════════════════════════════════
// PASIHAI — VIDEO AUTOPLAY HOOK
//
// Uses IntersectionObserver to autoplay/pause videos based on
// viewport visibility. Only one video plays at a time.
//
// Browser policies: most browsers require videos to be muted
// for autoplay. We start muted and let the user unmute.
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback } from 'react'

// Shared state: only one video should play at a time
let currentPlayingEl = null

/**
 * Observes a container and auto-plays the first <video> child
 * when it enters the viewport. Pauses on exit or when another
 * video takes over.
 *
 * @param {Object} opts
 * @param {number} opts.threshold - ratio visible to trigger play (default 0.5)
 * @returns {{ containerRef, toggleMute }}
 */
export function useVideoAutoplay({ threshold = 0.5 } = {}) {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target.querySelector('video')
          if (!video) continue

          if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
            // Mute for browser autoplay policy
            video.muted = true
            video.playsInline = true

            // Pause any other playing video
            if (currentPlayingEl && currentPlayingEl !== video && !currentPlayingEl.paused) {
              currentPlayingEl.pause()
            }

            const promise = video.play()
            if (promise) promise.catch(() => {})
            currentPlayingEl = video
          } else if (!entry.isIntersecting && !video.paused) {
            video.pause()
            if (currentPlayingEl === video) currentPlayingEl = null
          }
        }
      },
      { threshold: [0, threshold, 1] }
    )

    observer.observe(container)

    // Pause when tab becomes hidden
    const onVisibility = () => {
      if (document.hidden) {
        const video = container.querySelector('video')
        if (video && !video.paused) video.pause()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      const video = container.querySelector('video')
      if (currentPlayingEl === video) currentPlayingEl = null
    }
  }, [threshold])

  const toggleMute = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const video = container.querySelector('video')
    if (video) video.muted = !video.muted
  }, [])

  return { containerRef, toggleMute }
}

export default useVideoAutoplay