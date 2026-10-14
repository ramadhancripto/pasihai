import { parseContent } from '../../utils/postContent.js'
import StructuredPost from '../studio/StructuredPost.jsx'
// ══════════════════════════════════════════════════════════════
// PASIHAI — FEED BODIES
//
// Kila aina ya content ina BODY yake, lakini zote zinakaa ndani ya shell
// moja (FeedItem): identity · label · body · actions. Hakuna kurudia
// muundo wa HTML kwa kila aina ya chapisho.
//
// Bodies zinazopatikana:
//   text · media (picha / picha+maandishi) · video-first · audio ·
//   poll · announcement · liveActivity · reel
// ══════════════════════════════════════════════════════════════

import { useState } from 'react'
import { useVideoAutoplay } from '../../hooks/useVideoAutoplay.js'
import { MediaFrame, Waveform, Chip, Avatar } from '../ui.jsx'
import MediaGallery from './MediaGallery.jsx'
import { mediaItemsOf } from '../../utils/mediaLayout.js'
import {
  IconPlay,
  IconPhoto,
  IconLive,
  IconMegaphone,
  IconMic,
  IconReel,
  IconEye,
  IconCheck,
  IconArrowRight,
  IconRefresh,
  IconHeadset,
  IconVideo,
  IconCalendarAdd,
  IconVolume,
  IconVolumeOff,
} from '../icons.jsx'

/* ── Prima: maandishi ya chapisho ─────────────────────────── */
const TEXT_TRUNCATE_LIMIT = 280

function FeedText({ text }) {
  const [expanded, setExpanded] = useState(false)
  if (!text) return null
  // Chapisho lenye muundo (Makala, Tangazo, Nukuu) lina envelope yenye marker.
  const structured = parseContent(text)
  if (structured) return <StructuredPost content={structured} />
  const needsTruncate = text.length > TEXT_TRUNCATE_LIMIT && !expanded
  return (
    <p className={`psh-feedtext ${needsTruncate ? 'psh-feedtext--folded' : ''}`}>
      {needsTruncate ? text.slice(0, TEXT_TRUNCATE_LIMIT) : text}
      {needsTruncate && (
        <>
          ...{' '}
          <button type="button" className="psh-feedtext__more" onClick={() => setExpanded(true)}>
            Zaidi
          </button>
        </>
      )}
      {expanded && text.length > TEXT_TRUNCATE_LIMIT && (
        <>
          {' '}
          <button type="button" className="psh-feedtext__more" onClick={() => setExpanded(false)}>
            Fupi
          </button>
        </>
      )}
    </p>
  )
}

/* ── Prima: media yenye play/duration ───────────────────────
   video        → IconPlay (overlay ya play ikiwa hakuna faili)
   picha        → IconPhoto kwenye uso wa placeholder (bila play)
   media halisi → hakuna glyph; faili linaonekana yenyewe          */
function MediaWithOverlay({ media, tone, icon, rounded = true, fit = 'contain', showPlay = true, videoHint = false }) {
  const Icon = icon
  const hasUrl = Boolean(media?.url)
  /* `videoHint` inatoka kwa aina ya chapisho (video/reel) — hivyo media
     iliyohifadhiwa bila mediaType bado inapata chrome ya video. */
  const isVideo = media?.mediaType === 'video' || videoHint
  const hasPlayableVideo = Boolean(hasUrl && (isVideo || showPlay))
  const Glyph = !hasUrl ? (isVideo ? Icon : IconPhoto) : null
  const placeholderIcon = Glyph ? <Glyph size={26} /> : null
  const playOverlay = showPlay && !hasUrl && Icon && isVideo
  return (
    <MediaFrame
      tone={media?.tone ?? 'green'}
      ratio={media?.ratio ?? '4 / 3'}
      caption={media?.caption}
      rounded={rounded}
      showCaption={!Icon}
      icon={placeholderIcon}
      mediaUrl={media?.url}
      mediaType={media?.mediaType || (Icon && showPlay ? 'video' : 'image')}
      poster={media?.poster}
      fit={fit}
      sizes={{ width: media?.width, height: media?.height }}
      overlay={
        hasPlayableVideo ? null : (
          <>
            {playOverlay ? <span className="psh-media__scrim" aria-hidden="true" /> : null}
            {playOverlay && media?.views ? (
              <span className="psh-media__views">
                <IconEye size={12} />
                {media.views}
              </span>
            ) : null}
            {playOverlay && media?.duration ? (
              <span className="psh-media__dur">{media.duration}</span>
            ) : null}
            {playOverlay ? (
              <span className="psh-media__play" aria-hidden="true">
                <span className="psh-media__playbtn">
                  <IconPlay size={18} />
                </span>
              </span>
            ) : null}
          </>
        )
      }
    />
  )
}

/* ── Media ya chapisho: moja → frame; nyingi → grid/carousel ── */
function PostMedia({ item, icon, fit = 'contain', showPlay = true }) {
  const items = mediaItemsOf(item)
  if (items.length > 1) return <MediaGallery item={item} />
  const videoHint = item?.kind === 'video' || item?.kind === 'reel'
  return (
    <MediaWithOverlay
      media={items[0] ?? item.media}
      icon={icon}
      fit={fit}
      showPlay={showPlay}
      videoHint={videoHint}
    />
  )
}

/* ── Prima: safu ya kitendo (channel · bidhaa · tukio) ─────── */
function CtaRow({ item, cta, onCta }) {
  if (!cta) return null
  const primary = cta.tone === 'primary'
  return (
    <div className="psh-ctarow">
      <button
        type="button"
        className={`psh-btn ${primary ? 'psh-btn--primary' : 'psh-btn--quiet'} psh-ctarow__btn`}
        onClick={() => onCta?.(item, cta)}
      >
        {cta.label}
        <IconArrowRight size={16} />
      </button>
    </div>
  )
}

/* ── 1. Maandishi ─────────────────────────────────────────── */
export function TextBody({ item, onCta}) {
  return <FeedText text={item.text} />
}

/* ── 2. Picha (pamoja na maandishi + picha) ─────────────────
   Media inachukua nafasi yake kwa uwiano wake halisi; maandishi
   yanabaki safi upande wa pili kwenye skrini pana (CSS).       */
export function MediaBody({ item, onToast, onCta }) {
  return (
    <>
      <FeedText text={item.text} />
      <div className="psh-feedmedia">
        <PostMedia item={item} icon={IconPhoto} showPlay={false} />
      </div>
      <CtaRow item={item} cta={item.cta} onCta={onCta} />
    </>
  )
}

/* ── 3. Video-first: media kwanza, maelezo baadaye ────────── */
export function VideoBody({ item, onCta }) {
  const { containerRef, toggleMute, isMuted, isLoading, hasError, retry } = useVideoAutoplay()
  return (
    <>
      <div ref={containerRef} className="psh-video-wrap">
        <div className="psh-feedmedia psh-feedmedia--first">
          <PostMedia item={item} icon={IconPlay} />
        </div>
        {/* Sound toggle — browser autoplay policy: start muted, user taps to unmute */}
        <div className="psh-video-controls">
          <button
            type="button"
            className="psh-video-ctrl psh-video-ctrl--mute"
            onClick={toggleMute}
            aria-label={isMuted ? 'Washa sauti' : 'Zima sauti'}
          >
            {isMuted ? <IconVolumeOff size={18} /> : <IconVolume size={18} />}
          </button>
        </div>
        {isLoading && <div className="psh-video-loading" aria-label="Inapakia video" />}
        {hasError && (
          <button type="button" className="psh-video-retry" onClick={retry}>
            Jaribu tena
          </button>
        )}
      </div>
      <FeedText text={item.text} />
    </>
  )
}

/* ── 4. Sauti ─────────────────────────────────────────────── */
export function AudioBody({ item }) {
  const [playing, setPlaying] = useState(false)
  return (
    <>
      <FeedText text={item.text} />
      <div className="psh-audio">
        <button
          type="button"
          className={`psh-audio__play ${playing ? 'is-on' : ''}`}
          onClick={() => setPlaying((v) => !v)}
          aria-label={playing ? 'Simamisha sauti' : 'Cheza sauti'}
        >
          <IconMic size={18} />
        </button>
        <Waveform bars={item.media?.waveform} progress={playing ? 0.62 : 0.3} />
        <span className="psh-audio__time">{item.media?.duration}</span>
      </div>
    </>
  )
}

/* ── 5. Kura ──────────────────────────────────────────────── */
export function PollBody({ item, onVote, onCta}) {
  const poll = item.poll
  const [vote, setVote] = useState(poll?.myVote ?? null)
  if (!poll) return <FeedText text={item.text} />

  const choose = (optionId) => {
    setVote(optionId)
    onVote?.(item.id, optionId)
  }

  const total = poll.total + (vote ? 1 : 0)
  const maxVotes = Math.max(
    ...poll.options.map((o) => o.votes + (vote === o.id ? 1 : 0)),
  )

  return (
    <>
      <p className="psh-poll__q">{poll.question}</p>
      <ul className="psh-poll__opts">
        {poll.options.map((option) => {
          const votes = option.votes + (vote === option.id ? 1 : 0)
          const pct = total ? Math.round((votes / total) * 100) : 0
          const chosen = vote === option.id
          const leading = maxVotes > 0 && votes === maxVotes
          return (
            <li key={option.id}>
              <button
                type="button"
                className={`psh-pollopt ${chosen ? 'is-chosen' : ''} ${vote ? 'is-voted' : ''}`}
                onClick={() => choose(option.id)}
                aria-pressed={chosen}
              >
                <span className="psh-pollopt__bar" style={{ width: `${pct}%` }} aria-hidden="true" />
                <span className="psh-pollopt__row">
                  <span className="psh-pollopt__label">
                    {chosen ? (
                      <span className="psh-pollopt__tick" aria-hidden="true">
                        <IconCheck size={14} />
                      </span>
                    ) : null}
                    {option.label}
                    {leading ? <span className="psh-pollopt__lead">(Inaongoza)</span> : null}
                  </span>
                  <span className="psh-pollopt__pct">{pct}%</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="psh-poll__foot">
        Kura {total}
        {vote ? ' · umeshapiga kura' : ' · gusa kuchagua'}
      </p>
    </>
  )
}

/* ── 6. Tangazo (channel) ─────────────────────────────────── */
export function AnnouncementBody({ item, onToast, onCta}) {
  return (
    <div className="psh-announce">
      <p className="psh-announce__head">
        <IconMegaphone size={15} />
        Tangazo
      </p>
      <FeedText text={item.text} />

      {item.highlights?.length ? (
        <ul className="psh-announce__list">
          {item.highlights.map((line) => (
            <li key={line}>
              <IconCheck size={15} />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <CtaRow item={item} cta={item.cta} onCta={onCta} />
    </div>
  )
}

/* ── 7. Live Activity — SI chapisho la kawaida ────────────── */
const LIVE_STATE = {
  live: { label: 'LIVE', tone: 'live' },
  imepangwa: { label: 'IMEPANGWA', tone: 'soon' },
  upcoming: { label: 'IMEPANGWA', tone: 'soon' },
  replay: { label: 'MARUDIO', tone: 'replay' },
}

const VIEWER_WORD = {
  Sauti: 'wanaosikiliza',
  Video: 'wanaotazama',
  Mchanganyiko: 'wanaoshiriki',
}

export function LiveActivityBody({ item, onOpenLive }) {
  const live = item.live
  if (!live) return <FeedText text={item.text} />

  const state = LIVE_STATE[live.state] ?? { label: live.state, tone: 'replay' }
  const cta = item.liveRunning ? 'Endesha kikao' : live.state === 'live' ? 'Jiunge' : live.state === 'replay' ? 'Tazama tena' : 'Kumbuka'
  const CtaIcon =
    live.state === 'live' ? IconArrowRight : live.state === 'replay' ? IconRefresh : IconCalendarAdd
  const ModeIcon = live.mode === 'Sauti' ? IconHeadset : live.mode === 'Video' ? IconVideo : IconLive
  const viewers = live.viewers ? live.viewers.toLocaleString('en-US') : ''
  const word = VIEWER_WORD[live.mode] ?? 'wanaoshiriki'

  return (
    <div className={`psh-live psh-live--${state.tone}`}>
      <div className="psh-live__top">
        <span className={`psh-live__badge psh-live__badge--${state.tone}`}>
          {state.tone === 'live' ? <span className="psh-live__dot" aria-hidden="true" /> : null}
          {state.label}
        </span>
        <span className="psh-live__mode">
          <ModeIcon size={14} />
          {live.mode}
        </span>
        {live.category ? <span className="psh-live__cat">{live.category}</span> : null}
      </div>

      <p className="psh-live__title">{live.title}</p>

      <p className="psh-live__meta">
        <span>{live.host}</span>
        {viewers ? (
          <>
            <span className="psh-live__dotsep" aria-hidden="true">
              ·
            </span>
            <IconEye size={14} />
            <span>
              {viewers} {word}
            </span>
          </>
        ) : null}
        {live.when ? (
          <>
            <span className="psh-live__dotsep" aria-hidden="true">
              ·
            </span>
            <span>{live.when}</span>
          </>
        ) : null}
        {live.since ? (
          <>
            <span className="psh-live__dotsep" aria-hidden="true">
              ·
            </span>
            <span>imeanza {live.since} zilizopita</span>
          </>
        ) : null}
      </p>

      {live.speakers?.filter((sp) => sp && sp.name)?.length ? (
        <div className="psh-live__stage">
          <ul className="psh-live__speakers" aria-label="Washiriki">
            {live.speakers.filter((sp) => sp && sp.name).map((speaker) => (
              <li key={speaker.id}>
                <Avatar user={speaker} size={26} shape="circle" badge={false} />
              </li>
            ))}
          </ul>
          {live.mode === 'Sauti' && live.waveform?.length ? (
            <Waveform bars={live.waveform} progress={0.45} tone="green" />
          ) : null}
        </div>
      ) : null}

      <div className="psh-live__foot">
        <button
          type="button"
          className={`psh-btn ${live.state === 'live' ? 'psh-btn--primary' : ''} psh-live__cta`}
          onClick={() => onOpenLive?.(item)}
        >
          {cta}
          <CtaIcon size={16} />
        </button>
      </div>
    </div>
  )
}

/* ── 8. Reel ──────────────────────────────────────────────────
   Reel ni VIDEO: inaonyeshwa kwa ukubwa sawa na video zingine za
   mkondo — media inachukua upana wa kadi (uwiano wake halisi, kawaida
   9 / 16 au 4 / 5), kisha chip ya Reel · maelezo · watazamaji chini.
   Hakuna kadi ndogo ya thumbnail, na hakuna kurudia maudhui. */
export function ReelBody({ item }) {
  const { containerRef, toggleMute, isMuted } = useVideoAutoplay()
  const media = item.media ?? {}

  return (
    <div className="psh-reel psh-reel--media" ref={containerRef}>
      <div className="psh-feedmedia psh-feedmedia--first">
        <MediaWithOverlay media={{ ...media, mediaType: 'video' }} icon={IconPlay} />
      </div>
      <div className="psh-reel__meta">
        <span className="psh-reel__kind">
          <Chip tone="soft">
            <IconReel size={13} />
            Reel
          </Chip>
        </span>
        <p className="psh-reel__caption">{item.text}</p>
        {media.views ? (
          <p className="psh-reel__views">
            <IconEye size={14} />
            {media.views} wametazama
          </p>
        ) : null}
        <div className="psh-video-controls psh-video-controls--inline">
          <button
            type="button"
            className="psh-video-ctrl psh-video-ctrl--reel"
            onClick={toggleMute}
            aria-label={isMuted ? 'Washa sauti' : 'Zima sauti'}
          >
            {isMuted ? <IconVolumeOff size={16} /> : <IconVolume size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Registry: kind → body ────────────────────────────────── */
export const BODIES = {
  text: TextBody,
  image: MediaBody,
  video: VideoBody,
  audio: AudioBody,
  poll: PollBody,
  announcement: AnnouncementBody,
  liveActivity: LiveActivityBody,
  reel: ReelBody,
}
