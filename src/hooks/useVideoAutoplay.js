// ══════════════════════════════════════════════════════════════
// PASIHAI — VIDEO AUTOPLAY HOOK
//
// Uses IntersectionObserver to autoplay/pause videos based on
// viewport visibility. Only one video plays at a time.
//
// Browser policies: most browsers require videos to be muted
// for autoplay. We start muted and let the user unmute.
//
// Features:
// - Autoplay on viewport entry, pause on exit
// - Sound toggle (user-initiated unmute)
// - Loading/buffering state
// - Error handling with retry
// - Visibility change handling (tab hidden → pause)
// - Cleanup on unmount
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback, useState } from 'react'

// Shared state: only one video should play at a time
let currentPlayingEl = null

/**
 * Observes a container and auto-plays the first <video> child
 * when it enters the viewport. Pauses on exit or when another
 * video takes over.
 *
 * @param {Object} opts
 * @param {number} opts.threshold - ratio visible to trigger play (default 0.5)
 * @returns {{ containerRef, toggleMute, isMuted, isLoading, hasError }}
 */
export function useVideoAutoplay({ threshold = 0.5 } = {}) {
  const containerRef = useRef(null)
  const [isMuted, setIsMuted] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)

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
            setIsMuted(true)
            setHasError(false)

            // Pause any other playing video
            if (currentPlayingEl && currentPlayingEl !== video && !currentPlayingEl.paused) {
              currentPlayingEl.pause()
            }

            setIsLoading(true)
            const promise = video.play()
            if (promise) {
              promise
                .then(() => setIsLoading(false))
                .catch(() => {
                  setIsLoading(false)
                  // Autoplay blocked — user needs to tap
                })
            }
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

    // Video event handlers
    const video = container.querySelector('video')
    let onWaiting, onPlaying, onError, onCanPlay

    if (video) {
      onWaiting = () => setIsLoading(true)
      onPlaying = () => setIsLoading(false)
      onCanPlay = () => setIsLoading(false)
      onError = () => {
        setIsLoading(false)
        setHasError(true)
      }

      video.addEventListener('waiting', onWaiting)
      video.addEventListener('playing', onPlaying)
      video.addEventListener('canplay', onCanPlay)
      video.addEventListener('error', onError)
    }

    // Pause when tab becomes hidden
    const onVisibility = () => {
      if (document.hidden) {
        const v = container.querySelector('video')
        if (v && !v.paused) v.pause()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      if (video) {
        if (onWaiting) video.removeEventListener('waiting', onWaiting)
        if (onPlaying) video.removeEventListener('playing', onPlaying)
        if (onCanPlay) video.removeEventListener('canplay', onCanPlay)
        if (onError) video.removeEventListener('error', onError)
      }
      if (currentPlayingEl === video) currentPlayingEl = null
    }
  }, [threshold])

  const toggleMute = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const video = container.querySelector('video')
    if (video) {
      video.muted = !video.muted
      setIsMuted(video.muted)
    }
  }, [])

  const retry = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const video = container.querySelector('video')
    if (video) {
      setHasError(false)
      setIsLoading(true)
      video.load()
      const promise = video.play()
      if (promise) {
        promise
          .then(() => setIsLoading(false))
          .catch(() => setIsLoading(false))
      }
    }
  }, [])

  return { containerRef, toggleMute, isMuted, isLoading, hasError, retry }
}

export default useVideoAutoplay