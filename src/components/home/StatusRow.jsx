// ══════════════════════════════════════════════════════════════
// PASIHAI — STATUS / STORIES (Hatua 2 — muundo)
// Safu inayosogea kwa MLALO kwa kujitegemea.
// Hailazimiki kuonyesha status zote kwenye skrini moja.
// "Your Status" ina alama ya (+).
// ══════════════════════════════════════════════════════════════

import { homeService } from '../../services/homeService.js'
import useAsyncData from '../../hooks/useAsyncData.js'
import { Avatar, PlusBadge } from '../ui.jsx'
import { IconArrowRight, IconPlay } from '../icons.jsx'

export default function StatusRow({ onOpenStatus, onOpenAll }) {
  // Data inakuja kwa application service (si mock.js moja kwa moja).
  // Service inaunganisha status na entity yake — component haijui map ya users.
  const items = useAsyncData(() => homeService.getStatusStrip(), [])

  if (!items) return null

  return (
    <section className="psh-status" aria-label="Status na Stories">
      <ul className="psh-status__row">
        {items.map((item) => {
          const user = item.user
          if (!user) return null
          const viewed = item.viewed
          const ringTone = item.own ? 'own' : viewed ? 'viewed' : ringForUser(user, item)

          return (
            <li key={item.id} className="psh-status__item">
              <button
                type="button"
                className="psh-status__btn"
                onClick={() => (item.own ? onOpenStatus('me') : onOpenStatus(item.userId))}
                aria-label={
              item.own
                ? 'Ongeza kwenye Status yako'
                : `Tazama status ya ${user.name}${item.live ? ' (ana hewani)' : ''}`
            }
              >
                <span className={`psh-status__ring psh-status__ring--${ringTone}`}>
                  <span className="psh-status__inner">
                    <Avatar user={user} size={56} shape="circle" badge={false} />
                  </span>
                  {item.own ? <PlusBadge /> : null}
                  {!item.own && item.hasVideo ? (
                    <span className="psh-status__video" aria-hidden="true">
                      <IconPlay size={10} />
                    </span>
                  ) : null}
                  {!item.own && item.live ? (
                    <span className="psh-status__live" aria-hidden="true">
                      <span className="psh-status__livedot" />
                      LIVE
                    </span>
                  ) : null}
                </span>
                <span className={`psh-status__name ${viewed ? 'is-viewed' : ''}`}>
                  {item.label}
                </span>
                {item.ago ? <span className="psh-status__ago">{item.ago}</span> : null}
              </button>
            </li>
          )
        })}

        {/* Ufunguo wa kuona status zote — mwisho wa safu */}
        <li className="psh-status__item psh-status__item--more">
          <button type="button" className="psh-status__btn" onClick={onOpenAll}>
            <span className="psh-status__ring psh-status__ring--more">
              <span className="psh-status__inner">
                <span className="psh-status__moreicon">
                  <IconArrowRight size={20} />
                </span>
              </span>
            </span>
            <span className="psh-status__name">Zote</span>
          </button>
        </li>
      </ul>
    </section>
  )
}

// Rangi ya mduara inafuata aina ya entity:
//   Rafiki / Hub / Biashara → kijani (brand kuu)
//   Channel / Mbunifu       → bluu (msaada)
//   Mbunifu (creator)       → bluu
// Rangi ya mduara inafuata aina ya entity:
//   creator / ring 'creator' → gold (Prestige Gold — hutumika kwa nadra)
//   channel                  → bluu
//   wengine (friend/hub/biashara) → kijani (brand kuu)
function ringForUser(user, item) {
  if (item?.ring === 'creator' || user.type === 'creator') return 'gold'
  if (user.type === 'channel') return 'blue'
  return 'green'
}
