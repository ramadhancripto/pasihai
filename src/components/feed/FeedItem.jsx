// ══════════════════════════════════════════════════════════════
// PASIHAI — FEED ITEM (shell ya chapisho)
//
// Muundo mmoja kwa aina ZOTE za content:
//
//   [avatar] Jina ✓ [ROLE]       ─── identity + role (Mtu · Channel · Hub …)
//            Rafiki · dakika 12  ─── relationship + muda
//
//   [chip ya label]              ─── hiari ('Tangazo', 'Bidhaa', 'Tukio')
//   [body ya aina husika]        ─── text · media · video · audio · poll · live · reel
//
//   ♡ 24   💬 5   ↗ Shiriki   [hifadhi]   ─── actions
//
//   [Omba Urafiki] [Kufuata] [Ujumbe]      ─── social actions (kwa wageni)
//
// Separation ni ya hila (mstari mmoja), si giant card. Hakuna shadow kubwa,
// hakuna gradient, hakuna glassmorphism.
// ══════════════════════════════════════════════════════════════

import { Identity, Chip, EntityPill } from '../ui.jsx'
import { BODIES } from './bodies.jsx'
import FeedActions from './FeedActions.jsx'
import FeedSocialBar from './FeedSocialBar.jsx'
import { formatAge } from '../../utils/time.js'

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

  /* Social buttons: ona tu kwa mtu/channel ambaye si rafiki, si wewe mwenyewe */
  const rel = item.relationship || item.entity?.relationship || 'none'
  const isSelf = item.entity?.type === 'you'
  const isFriend = rel === 'Rafiki' || rel === 'saved' || rel === 'friend'
  const isChannel = item.entity?.type === 'channel'
  const isHub = item.entity?.type === 'hub'
  const isPerson = !isSelf && !isChannel && !isHub
  const showSocial = !isSelf && !isFriend && !isHub

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
          action={
            showSocial && socialState[item.entity?.id]?.friendRequested ? (
              <span className="psh-ident__action psh-ident__action--sent">Ombi limetumwa</span>
            ) : showSocial && !isChannel ? (
              <button
                type="button"
                className="psh-ident__action"
                onClick={(e) => { e.stopPropagation(); onFriendRequest?.(item.entity) }}
              >
                Omba Urafiki
              </button>
            ) : showSocial && isChannel ? (
              <button
                type="button"
                className="psh-ident__action"
                onClick={(e) => { e.stopPropagation(); onFollow?.(item.entity) }}
              >
                Fuata
              </button>
            ) : null
          }
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

      {showSocial && (
        <FeedSocialBar
          entity={item.entity}
          state={socialState[item.entity?.id] || {}}
          onFollow={() => onFollow?.(item.entity)}
          onFriendRequest={() => onFriendRequest?.(item.entity)}
          onMessage={() => onMessage?.(item.entity)}
          onToast={onToast}
        />
      )}
    </article>
  )
}
