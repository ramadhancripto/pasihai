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
// Separation ni ya hila (mstari mmoja), si giant card. Hakuna shadow kubwa,
// hakuna gradient, hakuna glassmorphism.
// ══════════════════════════════════════════════════════════════

import { Identity, Chip, EntityPill } from '../ui.jsx'
import { BODIES } from './bodies.jsx'
import FeedActions from './FeedActions.jsx'
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
}) {
  const Body = BODIES[item.kind]
  if (!Body || !item.entity) return null

  const showTime = item.kind !== 'liveActivity' || item.live?.state === 'imepangwa'

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

        <Body
          item={item}
          onToast={onToast}
          onVote={onVote}
          onOpenLive={onOpenLive}
          onCta={onCta}
        />
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
