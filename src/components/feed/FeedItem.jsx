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
import { layoutFor } from '../../utils/mediaLayout.js'
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

  // ── Adaptive: mpangilio unatokana na DATA ya media (ratio/width/height) ──
  const layout = layoutFor(item)
  const isVideoLike = item.kind === 'video' || item.kind === 'reel'

  return (
    <article
      className={`psh-feeditem ${layout.hasMedia ? 'psh-feeditem--media' : 'psh-feeditem--textual'}`}
      data-kind={item.kind}
      data-id={item.id}
      data-post-type={layout.postType}
      data-source-kind={item.sourceKind || item.kind}
      data-orient={layout.orientation}
      data-has-media={layout.hasMedia ? 'true' : 'false'}
      data-media-count={layout.mediaCount}
      data-caption={layout.captionLength}
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

        {isVideoLike ? (
          <div
            className="psh-feeditem__video-tappable"
            onClick={(event) => {
              // Vidhibiti vya video (sauti · play) havifungui viewer.
              if (event.target?.closest?.('video, button, a, input, select, textarea, [role="button"], [role="link"]')) return
              onOpenVideo?.(item)
            }}
            role="button"
            aria-label="Fungua video"
          >
            <Body
              item={item}
              onToast={onToast}
              onVote={onVote}
              onOpenLive={onOpenLive}
              onCta={onCta}
            />
          </div>
        ) : (
          <Body
            item={item}
            onToast={onToast}
            onVote={onVote}
            onOpenLive={onOpenLive}
            onCta={onCta}
          />
        )}
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
          onClick={(e) => { e.stopPropagation(); act('following', onFollow) }}
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
          onClick={(e) => { e.stopPropagation(); act('joined', onFollow) }}
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
          onClick={(e) => { e.stopPropagation(); act('joined', onFollow) }}
        >
          {state.joined ? <><IconCheck size={13} /> Umejiunga</> : <><IconConnect size={13} /> Jiunge</>}
        </button>
      </div>
    )
  }

  /* Default: Person */
  return (
    <div className="psh-feed-social psh-feed-social--inline">
      <button
        type="button"
        className={`psh-feed-social__btn psh-feed-social__btn--friend ${state.friendRequested ? 'is-active' : ''}`}
        disabled={!!busy}
        onClick={(e) => { e.stopPropagation(); act('friendRequested', onFriendRequest) }}
      >
        {state.friendRequested ? <><IconCheck size={13} /> Ombi limetumwa</> : <><IconPersonAdd size={13} /> Omba Urafiki</>}
      </button>
      <button
        type="button"
        className="psh-feed-social__btn psh-feed-social__btn--msg"
        disabled={!!busy}
        aria-label="Ujumbe"
        onClick={(e) => { e.stopPropagation(); onMessage?.() }}
      >
        <IconChat size={13} /> Ujumbe
      </button>
    </div>
  )
}