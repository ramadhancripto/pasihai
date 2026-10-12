// ══════════════════════════════════════════════════════════════
// PASIHAI — FEED ITEM (shell ya chapisho)
//
// Muundo mmoja kwa aina ZOTE za content:
//
//   [avatar] Jina ✓ [ROLE]  [Fuata/Omba Urafiki/Jiunge/Ujumbe]
//            Rafiki · dakika 12
//
//   [chip ya label]
//   [body ya aina husika]
//
//   ♡ 24   💬 5   ↗ Repost   [hifadhi]   ⋯
//
// Separation ni ya hila (mstari mmoja), si giant card.
// ══════════════════════════════════════════════════════════════

import { useState } from 'react'
import { Identity, Chip, EntityPill } from '../ui.jsx'
import { BODIES } from './bodies.jsx'
import FeedActions from './FeedActions.jsx'
import { formatAge } from '../../utils/time.js'
import { IconPersonAdd, IconFollow, IconChat, IconCheck, IconGroup, IconConnect } from '../icons.jsx'

export default function FeedItem({
  item,
  onOpenProfile,
  onToast,
  onToggleLike,
  onToggleSave,
  onOpenComments,
  onOpenShare,
  onOpenMenu,
  onVote,
  onOpenLive,
  onCta,
  onOpenVideo,
  onFollow,
  onFriendRequest,
  onMessage,
  socialState = {},
}) {
  const Body = BODIES[item.kind]
  if (!Body || !item.entity) return null

  const showTime = item.kind !== 'liveActivity' || item.live?.state === 'imepangwa'

  /* Social buttons: ona tu kwa mtu/channel/hub ambaye si wewe mwenyewe */
  const rel = item.relationship || item.entity?.relationship || 'none'
  const isSelf = item.entity?.type === 'you'
  const isFriend = rel === 'Rafiki' || rel === 'saved' || rel === 'friend'
  const isChannel = item.entity?.type === 'channel'
  const isHub = item.entity?.type === 'hub'
  const isGroup = item.entity?.type === 'group'
  const showSocial = !isSelf && !isFriend

  const entitySocialState = socialState[item.entity?.id] || {}

  /* ── Social action buttons (JUU, karibu na jina) ────────── */
  const socialAction = showSocial ? (
    <SocialButtons
      entity={item.entity}
      isChannel={isChannel}
      isHub={isHub}
      isGroup={isGroup}
      state={entitySocialState}
      onFollow={() => onFollow?.(item.entity)}
      onFriendRequest={() => onFriendRequest?.(item.entity)}
      onMessage={() => onMessage?.(item.entity)}
      onToast={onToast}
    />
  ) : null

  return (
    <article
      className="psh-feeditem"
      data-kind={item.kind}
      data-id={item.id}
      aria-label={`Chapisho kutoka ${item.entity.name}`}
    >
      <header className="psh-feeditem__head">
        <Identity
          user={item.entity}
          relationship={item.relationship}
          pill={
            item.role ? <EntityPill type={item.entity.type} label={item.role} /> : null
          }
          action={socialAction}
          time={showTime && item.ageMinutes != null ? formatAge(item.ageMinutes) : undefined}
          onOpen={() => onOpenProfile?.(item.entity.id)}
        />
      </header>

      <div className="psh-feeditem__body">
        {item.label ? (
          <p className="psh-feeditem__label">
            <Chip tone={item.kind === 'announcement' ? 'green' : 'soft'}>{item.label}</Chip>
          </p>
        ) : null}

        <div
          className={item.kind === 'video' || item.kind === 'reel' ? 'psh-feeditem__video-tappable' : ''}
          onClick={(item.kind === 'video' || item.kind === 'reel') ? () => onOpenVideo?.(item) : undefined}
          role={item.kind === 'video' || item.kind === 'reel' ? 'button' : undefined}
          aria-label={item.kind === 'video' || item.kind === 'reel' ? 'Fungua video' : undefined}
        >
          <Body
            item={item}
            onToast={onToast}
            onVote={onVote}
            onOpenLive={onOpenLive}
            onCta={onCta}
          />
        </div>
      </div>

      <FeedActions
        item={item}
        liked={item.liked}
        saved={item.saved}
        stats={item.stats}
        onToggleLike={() => onToggleLike?.(item)}
        onToggleSave={() => onToggleSave?.(item)}
        onOpenComments={() => onOpenComments?.(item)}
        onOpenShare={() => onOpenShare?.(item)}
        onOpenMenu={() => onOpenMenu?.(item)}
      />
    </article>
  )
}

/* ── Social Buttons: Fuata / Omba Urafiki / Jiunge / Ujumbe ──
   Ziko JUU karibu na jina la akaunti, si chini.
   Kila aina ya entity ina vitendo vyake:
     Person  → [Omba Urafiki] [Ujumbe]
     Channel → [Fuata]
     Hub     → [Jiunge]
     Group   → [Jiunge]
   ─────────────────────────────────────────────────────────── */
function SocialButtons({
  entity,
  isChannel,
  isHub,
  isGroup,
  state = {},
  onFollow,
  onFriendRequest,
  onMessage,
  onToast,
}) {
  const [busy, setBusy] = useState(null)

  const act = async (key, fn, successMsg) => {
    if (busy || state[key]) return
    setBusy(key)
    try {
      await fn?.()
      onToast?.(successMsg)
    } catch {
      onToast?.('Imeshindikana')
    } finally {
      setBusy(null)
    }
  }

  if (isChannel) {
    return (
      <div className="psh-feed-social psh-feed-social--inline">
        <button
          type="button"
          className={`psh-feed-social__btn psh-feed-social__btn--follow ${state.following ? 'is-active' : ''}`}
          disabled={!!busy}
          onClick={(e) => { e.stopPropagation(); act('following', onFollow, state.following ? 'Umeacha kufuata' : 'Umeanza kufuata') }}
        >
          {state.following ? <><IconCheck size={13} /> Unamfuata</> : <><IconFollow size={13} /> Fuata</>}
        </button>
      </div>
    )
  }

  if (isHub) {
    return (
      <div className="psh-feed-social psh-feed-social--inline">
        <button
          type="button"
          className={`psh-feed-social__btn psh-feed-social__btn--join ${state.joined ? 'is-active' : ''}`}
          disabled={!!busy}
          onClick={(e) => { e.stopPropagation(); act('joined', onFollow, state.joined ? 'Umejiunga tayari' : 'Umejiunga na Hub') }}
        >
          {state.joined ? <><IconCheck size={13} /> Umejiunga</> : <><IconGroup size={13} /> Jiunge</>}
        </button>
      </div>
    )
  }

  if (isGroup) {
    return (
      <div className="psh-feed-social psh-feed-social--inline">
        <button
          type="button"
          className={`psh-feed-social__btn psh-feed-social__btn--join ${state.joined ? 'is-active' : ''}`}
          disabled={!!busy}
          onClick={(e) => { e.stopPropagation(); act('joined', onFollow, state.joined ? 'Umejiunga tayari' : 'Umejiunga na Kikundi') }}
        >
          {state.joined ? <><IconCheck size={13} /> Umejiunga</> : <><IconConnect size={13} /> Jiunge</>}
        </button>
      </div>
    )
  }

  /* Default: Person (mtu wa kawaida) */
  return (
    <div className="psh-feed-social psh-feed-social--inline">
      <button
        type="button"
        className={`psh-feed-social__btn psh-feed-social__btn--friend ${state.friendRequested ? 'is-active' : ''}`}
        disabled={!!busy}
        onClick={(e) => { e.stopPropagation(); act('friendRequested', onFriendRequest, 'Ombi la urafiki limetumwa') }}
      >
        {state.friendRequested ? <><IconCheck size={13} /> Ombi limetumwa</> : <><IconPersonAdd size={13} /> Omba Urafiki</>}
      </button>
      <button
        type="button"
        className="psh-feed-social__btn psh-feed-social__btn--msg"
        disabled={!!busy}
        onClick={(e) => { e.stopPropagation(); onMessage?.() }}
      >
        <IconChat size={13} /> Ujumbe
      </button>
    </div>
  )
}