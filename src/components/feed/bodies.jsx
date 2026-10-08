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
import { MediaFrame, Waveform, Chip, Avatar } from '../ui.jsx'
import {
  IconPlay,
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
} from '../icons.jsx'

/* ── Prima: maandishi ya chapisho ─────────────────────────── */
function FeedText({ text }) {
  if (!text) return null
  return <p className="psh-feedtext">{text}</p>
}

/* ── Prima: media yenye play/duration ─────────────────────── */
function MediaWithOverlay({ media, tone, icon, rounded = true }) {
  const Icon = icon
  return (
    <MediaFrame
      tone={media?.tone ?? 'green'}
      ratio={media?.ratio ?? '4 / 3'}
      caption={media?.caption}
      rounded={rounded}
      showCaption={!Icon}
      icon={Icon ? <Icon size={26} /> : null}
      overlay={
        <>
          {Icon ? <span className="psh-media__scrim" aria-hidden="true" /> : null}
          {Icon && media?.views ? (
            <span className="psh-media__views">
              <IconEye size={12} />
              {media.views}
            </span>
          ) : null}
          {Icon && media?.duration ? (
            <span className="psh-media__dur">{media.duration}</span>
          ) : null}
          {Icon ? (
            <span className="psh-media__play" aria-hidden="true">
              <span className="psh-media__playbtn">
                <IconPlay size={18} />
              </span>
            </span>
          ) : null}
        </>
      }
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

/* ── 2. Picha (pamoja na maandishi + picha) ───────────────── */
export function MediaBody({ item, onToast, onCta }) {
  return (
    <>
      <FeedText text={item.text} />
      <div className="psh-feedmedia">
        <MediaWithOverlay media={item.media} />
      </div>
      <CtaRow item={item} cta={item.cta} onCta={onCta} />
    </>
  )
}

/* ── 3. Video-first: media kwanza, maelezo baadaye ────────── */
export function VideoBody({ item, onCta }) {
  return (
    <>
      <div className="psh-feedmedia psh-feedmedia--first">
        <MediaWithOverlay media={item.media} icon={IconPlay} />
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

/* ── 8. Reel — kadi compact kwenye Mchanganyiko ───────────── */
export function ReelBody({ item }) {
  const media = item.media ?? {}
  return (
    <div className="psh-reel">
      <span className={`psh-reel__thumb psh-reel__thumb--tone-${media.tone ?? 'green'}`} aria-hidden="true">
        <span className="psh-reel__play">
          <IconPlay size={16} />
        </span>
        {media.duration ? <span className="psh-reel__dur">{media.duration}</span> : null}
      </span>

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
