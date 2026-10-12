// ══════════════════════════════════════════════════════════════
// PASIHAI — STATUS / STORIES
// Safu ya mlalo; kila akaunti ina entry moja, Status zake ziko kwenye viewer.
// Media preview kubwa, avatar + jina, horizontal scroll.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState, useRef } from 'react'

import { homeService } from '../../services/homeService.js'
import { statusErrorMessage } from '../../utils/statusMedia.js'
import { Avatar } from '../ui.jsx'
import { IconArrowRight, IconPlay, IconPlus } from '../icons.jsx'

const CREATE_STATUS_SLOT = {
  id: 'status-create-slot',
  userId: 'me',
  own: true,
  isCreateSlot: true,
  label: '',
  statuses: [],
}

export default function StatusRow({ onOpenStatus, onOpenAll, version = 0 }) {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [retryKey, setRetryKey] = useState(0)
  const scrollRef = useRef(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    setItems(null)

    homeService.getStatusStrip()
      .then((nextItems) => {
        if (!active) return
        setItems(nextItems)
      })
      .catch((loadError) => {
        if (active) setError(statusErrorMessage(loadError))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [version, retryKey])

  const handleWheel = (e) => {
    const el = scrollRef.current
    if (!el) return
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
  }

  if (loading) {
    return (
      <section className="psh-status" aria-label="Status">
        <div className="psh-status__row psh-status__row--skeleton">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="psh-status__item psh-status__item--skel" />
          ))}
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="psh-status" aria-label="Status">
        <button
          type="button"
          className="psh-status__retry"
          onClick={() => setRetryKey((key) => key + 1)}
          aria-label="Jaribu tena"
        >
          <IconPlay size={16} />
        </button>
      </section>
    )
  }

  const activeItems = items || []
  const hasOwnGroup = activeItems.some((item) => item.own)
  const rowItems = hasOwnGroup ? activeItems : [CREATE_STATUS_SLOT, ...activeItems]

  return (
    <section className="psh-status" aria-label="Status">
      <ul className="psh-status__row" ref={scrollRef} onWheel={handleWheel} dir="ltr">
        {rowItems.map((item) => {
          const user = item.user
          const ringTone = item.own ? 'own' : ringForUser(user, item)
          const name = item.own ? '' : item.label || user?.name || ''
          const viewed = !item.own && item.viewed

          return (
            <li
              key={item.id}
              className={`psh-status__item ${viewed ? 'psh-status__item--viewed' : ''}`}
              data-status-own={item.own ? 'true' : 'false'}
              data-status-id={item.latestStatusId || ''}
            >
              <button
                type="button"
                className="psh-status__btn"
                onClick={() => (item.isCreateSlot ? onOpenStatus?.('me') : onOpenStatus?.(item))}
                aria-label={item.isCreateSlot ? 'Unda status' : `Status ya ${name}`}
              >
                <span className={`psh-status__card psh-status__card--tone-${ringTone}`}>
                  {item.isCreateSlot ? (
                    <span className="psh-status__createcard" aria-hidden="true">
                      <IconPlus size={24} />
                    </span>
                  ) : item.mediaPreview ? (
                    <img className="psh-status__thumb" src={item.mediaPreview} alt="" loading="lazy" />
                  ) : (
                    <span className={`psh-status__gradient psh-status__gradient--${ringTone}`} aria-hidden="true">
                      <Avatar user={user} size={40} shape="circle" badge={false} />
                    </span>
                  )}
                  {item.hasVideo ? (
                    <span className="psh-status__video" aria-hidden="true"><IconPlay size={14} /></span>
                  ) : null}
                  {!item.own && item.live ? (
                    <span className="psh-status__live" aria-hidden="true">
                      <span className="psh-status__livedot" />
                    </span>
                  ) : null}
                </span>

                {name ? (
                  <span className={`psh-status__name ${viewed ? 'is-viewed' : ''}`}>
                    {name}
                  </span>
                ) : null}
              </button>
            </li>
          )
        })}

        <li className="psh-status__item psh-status__item--more">
          <button type="button" className="psh-status__btn" onClick={onOpenAll} aria-label="Zote">
            <span className="psh-status__card psh-status__card--more">
              <span className="psh-status__moreicon"><IconArrowRight size={18} /></span>
            </span>
          </button>
        </li>
      </ul>
    </section>
  )
}

function ringForUser(user = {}, item) {
  if (item?.ring === 'creator' || user.type === 'creator') return 'gold'
  if (user.type === 'channel') return 'blue'
  return 'green'
}