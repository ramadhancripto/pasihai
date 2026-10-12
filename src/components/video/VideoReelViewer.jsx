// ══════════════════════════════════════════════════════════════
// PASIHAI — VIDEO REEL VIEWER
//
// Full-screen vertical video viewer (Reels/TikTok style).
// - 9:16 vertical video
// - Swipe/scroll to navigate between videos
// - Auto-play visible video, pause others
// - Sidebar: Like, Comment, Repost, Share, Save
// - Creator info + account action (Omba Urafiki / Fuata / Jiunge)
// - Caption with "Zaidi" expansion
// - Mute/unmute toggle
// - Lazy loading, cleanup on unmount
// ══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  IconHeart,
  IconComment,
  IconShare,
  IconBookmark,
  IconMoreVertical,
  IconRepost,
  IconPersonAdd,
  IconCheck,
  IconClose,
  IconFollow,
} from '../icons.jsx'

/* ── Single Reel ─────────────────────────────────────────── */
function ReelSlide({
  item,
  isActive,
  liked,
  saved,
  onLike,
  onComment,
  onShare,
  onRepost,
  onSave,
  onFollow,
  onFriendRequest,
  onClose,
  friendState,
  isDark,
}) {
  const videoRef = useRef(null)
  const [muted, setMuted] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const media = item.media || {}
  const entity = item.entity || {}

  // Auto-play/pause based on visibility
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isActive) {
      video.muted = muted
      video.playsInline = true
      const p = video.play()
      if (p) p.then(() => setPlaying(true)).catch(() => {})
    } else {
      video.pause()
      video.currentTime = 0
      setPlaying(false)
    }
  }, [isActive, muted])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().then(() => setPlaying(true)).catch(() => {})
    } else {
      video.pause()
      setPlaying(false)
    }
  }

  const toggleMute = (e) => {
    e.stopPropagation()
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setMuted(video.muted)
  }

  const caption = item.text || ''
  const showTruncate = caption.length > 120 && !expanded

  return (
    <div className="psh-reel-slide" data-active={isActive || undefined}>
      {/* Video */}
      <div className="psh-reel-slide__video" onClick={togglePlay}>
        <video
          ref={videoRef}
          className="psh-reel-slide__vid"
          src={media.url}
          playsInline
          muted
          loop
          preload="metadata"
          poster={media.poster}
        />
        {!playing && isActive && (
          <div className="psh-reel-slide__pause-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="white" opacity="0.8">
              <polygon points="5 3 19 12 5 21" />
            </svg>
          </div>
        )}
        {/* Mute toggle */}
        <button
          type="button"
          className="psh-reel-slide__mute"
          onClick={toggleMute}
          aria-label={muted ? 'Washa sauti' : 'Zima sauti'}
        >
          {muted ? '🔇' : '🔊'}
        </button>
        {/* Close */}
        <button
          type="button"
          className="psh-reel-slide__close"
          onClick={(e) => { e.stopPropagation(); onClose() }}
          aria-label="Rudi"
        >
          <IconClose size={24} />
        </button>
      </div>

      {/* Bottom: creator info + caption */}
      <div className="psh-reel-slide__bottom">
        <div className="psh-reel-slide__creator">
          <span className="psh-reel-slide__avatar">
            {entity.name?.[0]?.toUpperCase() || '?'}
          </span>
          <span className="psh-reel-slide__name">{entity.name || 'Mtumiaji'}</span>
          {friendState === 'not_friend' && (
            <button
              type="button"
              className="psh-reel-slide__follow-btn"
              onClick={() => onFollow?.(entity)}
            >
              {entity.type === 'channel' ? 'Fuata' : 'Omba Urafiki'}
            </button>
          )}
          {friendState === 'friend' && (
            <span className="psh-reel-slide__friend-tag">
              <IconCheck size={12} /> Rafiki
            </span>
          )}
        </div>
        {caption && (
          <div className="psh-reel-slide__caption">
            <p className={showTruncate ? 'psh-reel-slide__caption-text--truncate' : ''}>
              {showTruncate ? caption.slice(0, 120) : caption}
            </p>
            {showTruncate && (
              <button type="button" className="psh-reel-slide__more" onClick={() => setExpanded(true)}>
                ...Zaidi
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right sidebar: actions */}
      <div className="psh-reel-slide__actions">
        <button type="button" className={`psh-reel-action ${liked ? 'is-liked' : ''}`} onClick={() => onLike?.(item)}>
          <IconHeart size={26} filled={liked} />
          <span>{item.stats?.reactions || 0}</span>
        </button>
        <button type="button" className="psh-reel-action" onClick={() => onComment?.(item)}>
          <IconComment size={26} />
          <span>{item.stats?.comments || 0}</span>
        </button>
        <button type="button" className="psh-reel-action" onClick={() => onRepost?.(item)}>
          <IconRepost size={26} />
          <span>Repost</span>
        </button>
        <button type="button" className="psh-reel-action" onClick={() => onShare?.(item)}>
          <IconShare size={26} />
          <span>Shiriki</span>
        </button>
        <button type="button" className={`psh-reel-action ${saved ? 'is-saved' : ''}`} onClick={() => onSave?.(item)}>
          <IconBookmark size={26} filled={saved} />
        </button>
      </div>
    </div>
  )
}

/* ── Video Reel Viewer (container) ──────────────────────── */
export default function VideoReelViewer({
  items = [],
  startIndex = 0,
  onClose,
  onLike,
  onComment,
  onShare,
  onRepost,
  onSave,
  onFollow,
  onFriendRequest,
  friendStates = {},
  isDark,
}) {
  const [index, setIndex] = useState(startIndex)
  const containerRef = useRef(null)
  const touchStartY = useRef(null)
  const touchDeltaY = useRef(0)

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault()
        setIndex((i) => Math.min(i + 1, items.length - 1))
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault()
        setIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [items.length, onClose])

  // Scroll navigation
  const handleWheel = useCallback((e) => {
    if (Math.abs(e.deltaY) < 30) return
    if (e.deltaY > 0) {
      setIndex((i) => Math.min(i + 1, items.length - 1))
    } else {
      setIndex((i) => Math.max(i - 1, 0))
    }
  }, [items.length])

  // Touch navigation
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY
    touchDeltaY.current = 0
  }

  const handleTouchMove = (e) => {
    if (touchStartY.current === null) return
    touchDeltaY.current = e.touches[0].clientY - touchStartY.current
  }

  const handleTouchEnd = () => {
    if (Math.abs(touchDeltaY.current) > 60) {
      if (touchDeltaY.current < 0) {
        setIndex((i) => Math.min(i + 1, items.length - 1))
      } else {
        setIndex((i) => Math.max(i - 1, 0))
      }
    }
    touchStartY.current = null
    touchDeltaY.current = 0
  }

  // Back button support
  useEffect(() => {
    window.history.pushState({ reel: true }, '')
    const handler = () => onClose()
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [onClose])

  if (!items.length) return null

  return (
    <div
      className="psh-reel-viewer"
      ref={containerRef}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="dialog"
      aria-label="Video Reels"
      aria-modal="true"
    >
      <div
        className="psh-reel-viewer__track"
        style={{ transform: `translateY(-${index * 100}%)` }}
      >
        {items.map((item, i) => (
          <ReelSlide
            key={item.id}
            item={item}
            isActive={i === index}
            liked={item.liked}
            saved={item.saved}
            onLike={onLike}
            onComment={onComment}
            onShare={onShare}
            onRepost={onRepost}
            onSave={onSave}
            onFollow={onFollow}
            onFriendRequest={onFriendRequest}
            onClose={onClose}
            friendState={friendStates[item.entity?.id] || 'none'}
            isDark={isDark}
          />
        ))}
      </div>
      {/* Counter */}
      <div className="psh-reel-viewer__counter">
        {index + 1} / {items.length}
      </div>
    </div>
  )
}