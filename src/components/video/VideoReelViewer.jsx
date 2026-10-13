// ══════════════════════════════════════════════════════════════
// PASIHAI — VIDEO REEL VIEWER (TikTok Style)
//
// Full-screen vertical video viewer (Reels/TikTok style).
// - 9:16 vertical video fills entire screen
// - Swipe/scroll/keyboard to navigate
// - Auto-play visible video, pause others
// - Sidebar: Like, Comment, Share, Save + Profile avatar
// - Creator info + follow button
// - Caption with "Zaidi" expansion
// - Music disc animation
// - Mute/unmute toggle
// - Progress bar
// ══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  IconHeart,
  IconComment,
  IconShare,
  IconBookmark,
  IconRepost,
  IconCheck,
  IconClose,
} from '../icons.jsx'

/* ── SVG Icons ───────────────────────────────────────────── */
function IconVolume({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  )
}

function IconVolumeOff({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  )
}

function IconPlay({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="6 3 20 12 6 21" />
    </svg>
  )
}

function IconMusic({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  )
}

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
  onClose,
  friendState,
}) {
  const videoRef = useRef(null)
  const [muted, setMuted] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showMuteBadge, setShowMuteBadge] = useState(false)
  const [progress, setProgress] = useState(0)
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
      setProgress(0)
    }
  }, [isActive, muted])

  // Progress tracking
  useEffect(() => {
    const video = videoRef.current
    if (!video || !isActive) return

    const update = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100)
      }
    }

    video.addEventListener('timeupdate', update)
    return () => video.removeEventListener('timeupdate', update)
  }, [isActive])

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
    setShowMuteBadge(true)
    setTimeout(() => setShowMuteBadge(false), 800)
  }

  const caption = item.text || ''
  const showTruncate = caption.length > 100 && !expanded
  const stats = item.stats || {}

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

        {/* Play icon when paused */}
        {!playing && isActive && (
          <div className="psh-reel-slide__play-icon">
            <IconPlay size={32} />
          </div>
        )}

        {/* Mute badge */}
        {showMuteBadge && (
          <div className="psh-reel-slide__mute-badge">
            {muted ? <IconVolumeOff size={24} /> : <IconVolume size={24} />}
          </div>
        )}

        {/* Top bar */}
        <div className="psh-reel-slide__topbar">
          <div className="psh-reel-slide__topbar-left">
            <button
              type="button"
              className="psh-reel-icon-btn"
              onClick={(e) => { e.stopPropagation(); onClose() }}
              aria-label="Rudi"
            >
              <IconClose size={22} />
            </button>
          </div>
          <button
            type="button"
            className="psh-reel-icon-btn"
            onClick={toggleMute}
            aria-label={muted ? 'Washa sauti' : 'Zima sauti'}
          >
            {muted ? <IconVolumeOff size={18} /> : <IconVolume size={18} />}
          </button>
        </div>

        {/* Progress bar */}
        <div className="psh-reel-slide__progress">
          <div className="psh-reel-slide__progress-bar" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Bottom: creator info + caption */}
      <div className="psh-reel-slide__bottom">
        <div className="psh-reel-slide__creator">
          <span className="psh-reel-slide__avatar">
            {entity.avatar ? <img src={entity.avatar} alt="" /> : (entity.name?.[0]?.toUpperCase() || '?')}
          </span>
          <span className="psh-reel-slide__name">{entity.name || 'Mtumiaji'}</span>
          {friendState === 'not_friend' && (
            <button
              type="button"
              className="psh-reel-slide__follow-btn"
              onClick={() => onFollow?.(entity)}
            >
              {entity.type === 'channel' ? 'Fuata' : 'Fuata'}
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
              {showTruncate ? caption.slice(0, 100) : caption}
            </p>
            {showTruncate && (
              <button type="button" className="psh-reel-slide__more" onClick={() => setExpanded(true)}>
                ...Zaidi
              </button>
            )}
          </div>
        )}
        <div className="psh-reel-slide__music">
          <IconMusic size={14} />
          <span>Original Sound · {entity.name || 'Mtumiaji'}</span>
        </div>
      </div>

      {/* Right sidebar: actions */}
      <div className="psh-reel-slide__actions">
        {/* Profile avatar */}
        <button type="button" className="psh-reel-action" onClick={() => onFollow?.(entity)}>
          <div className="psh-reel-action__profile">
            {entity.avatar ? <img src={entity.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : (entity.name?.[0]?.toUpperCase() || '?')}
            {friendState === 'not_friend' && <span className="psh-reel-action__profile-add">+</span>}
          </div>
        </button>

        {/* Like */}
        <button type="button" className={`psh-reel-action ${liked ? 'is-liked' : ''}`} onClick={() => onLike?.(item)}>
          <div className="psh-reel-action__icon">
            <IconHeart size={28} filled={liked} />
          </div>
          <span className="psh-reel-action__count">{formatCount(stats.reactions)}</span>
        </button>

        {/* Comment */}
        <button type="button" className="psh-reel-action" onClick={() => onComment?.(item)}>
          <div className="psh-reel-action__icon">
            <IconComment size={28} />
          </div>
          <span className="psh-reel-action__count">{formatCount(stats.comments)}</span>
        </button>

        {/* Repost */}
        <button type="button" className="psh-reel-action" onClick={() => onRepost?.(item)}>
          <div className="psh-reel-action__icon">
            <IconRepost size={28} />
          </div>
          <span className="psh-reel-action__count">{formatCount(stats.shares)}</span>
        </button>

        {/* Share */}
        <button type="button" className="psh-reel-action" onClick={() => onShare?.(item)}>
          <div className="psh-reel-action__icon">
            <IconShare size={28} />
          </div>
        </button>

        {/* Save */}
        <button type="button" className={`psh-reel-action ${saved ? 'is-saved' : ''}`} onClick={() => onSave?.(item)}>
          <div className="psh-reel-action__icon">
            <IconBookmark size={28} filled={saved} />
          </div>
        </button>

        {/* Music disc */}
        <div className="psh-reel-slide__disc">
          <div className="psh-reel-slide__disc-inner" />
        </div>
      </div>
    </div>
  )
}

/* ── Helpers ─────────────────────────────────────────────── */
function formatCount(n) {
  if (!n || n === 0) return '0'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

/* ── Video Reel Viewer (container) ───────────────────────── */
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
      } else if (e.key === ' ') {
        e.preventDefault()
        // Toggle play/pause handled by click
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [items.length, onClose])

  // Scroll navigation with debounce
  const wheelTimer = useRef(null)
  const handleWheel = useCallback((e) => {
    if (Math.abs(e.deltaY) < 30) return
    if (wheelTimer.current) return

    if (e.deltaY > 0) {
      setIndex((i) => Math.min(i + 1, items.length - 1))
    } else {
      setIndex((i) => Math.max(i - 1, 0))
    }

    wheelTimer.current = setTimeout(() => {
      wheelTimer.current = null
    }, 400)
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
    if (Math.abs(touchDeltaY.current) > 50) {
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

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

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
          />
        ))}
      </div>

      {/* Counter */}
      <div className="psh-reel-viewer__counter">
        {index + 1} / {items.length}
      </div>

      {/* Swipe hint (first load only) */}
      {index === 0 && items.length > 1 && (
        <div className="psh-reel-slide__swipe-hint">
          Swipe ↑
        </div>
      )}
    </div>
  )
}