// ══════════════════════════════════════════════════════════════
// PASIHAI — STATUS / STORIES
// Safu ya mlalo; kila akaunti ina entry moja, Status zake ziko kwenye viewer.
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'

import { homeService } from '../../services/homeService.js'
import { statusErrorMessage } from '../../utils/statusMedia.js'
import { Avatar, Button } from '../ui.jsx'
import { IconArrowRight, IconPlay, IconPlus } from '../icons.jsx'

const CREATE_STATUS_SLOT = {
  id: 'status-create-slot',
  userId: 'me',
  own: true,
  isCreateSlot: true,
  label: 'Status Yako',
  statuses: [],
}

export default function StatusRow({ onOpenStatus, onOpenAll, version = 0 }) {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    setItems(null)

    homeService.getStatusStrip()
      .then((nextItems) => {
        if (!active) return
        if (nextItems.some((item) => !item.user)) {
          throw new Error('Taarifa za baadhi ya waandishi wa status hazikupatikana.')
        }
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

  if (loading) {
    return (
      <section className="psh-status" aria-label="Status na Stories">
        <p className="psh-status__state" role="status" aria-live="polite">Inapakia status…</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="psh-status" aria-label="Status na Stories">
        <div className="psh-status__state psh-status__state--error" role="alert">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setRetryKey((key) => key + 1)}>
            Jaribu tena
          </Button>
        </div>
      </section>
    )
  }

  const activeItems = items || []
  const hasOwnGroup = activeItems.some((item) => item.own)
  const rowItems = hasOwnGroup ? activeItems : [CREATE_STATUS_SLOT, ...activeItems]

  return (
    <section className="psh-status" aria-label="Status na Stories">
      {activeItems.length === 0 ? (
        <p className="psh-status__empty-note" role="status">
          Hakuna status hai zinazoonekana sasa. Hapa ndipo Status yako halisi itaonekana baada ya kuhifadhiwa.
        </p>
      ) : null}
      <ul className="psh-status__row">
        {rowItems.map((item) => {
          const user = item.user
          const ringTone = item.own ? 'own' : ringForUser(user, item)
          const name = item.own ? 'Status Yako' : item.label || user?.name || 'Status'

          return (
            <li
              key={item.id}
              className="psh-status__item"
              data-status-own={item.own ? 'true' : 'false'}
              data-status-id={item.latestStatusId || ''}
            >
              <button
                type="button"
                className="psh-status__btn"
                onClick={() => (item.isCreateSlot ? onOpenStatus?.('me') : onOpenStatus?.(item))}
                aria-label={item.isCreateSlot
                  ? 'Unda status yako'
                  : item.own
                    ? `Tazama status zako ${item.statusCount > 1 ? `(${item.statusCount})` : ''}`.trim()
                    : `Tazama status ya ${user?.name || 'mtumiaji'}${item.live ? ' (ana hewani)' : ''}`}
              >
                <span className={`psh-status__ring psh-status__ring--${ringTone}`}>
                  <span className="psh-status__inner">
                    {item.isCreateSlot ? (
                      <span className="psh-status__createicon" aria-hidden="true"><IconPlus size={25} /></span>
                    ) : (
                      <Avatar user={user} size={56} shape="circle" badge={false} />
                    )}
                  </span>
                  {item.hasVideo ? (
                    <span className="psh-status__video" aria-hidden="true"><IconPlay size={10} /></span>
                  ) : null}
                  {!item.own && item.live ? (
                    <span className="psh-status__live" aria-hidden="true">
                      <span className="psh-status__livedot" /> LIVE
                    </span>
                  ) : null}
                </span>
                <span className="psh-status__name">{name}</span>
                {item.isCreateSlot ? (
                  <span className="psh-status__ago">Ongeza</span>
                ) : item.statusCount > 1 ? (
                  <span className="psh-status__ago">{item.statusCount} Status</span>
                ) : item.ago ? (
                  <span className="psh-status__ago">{item.ago}</span>
                ) : null}
              </button>
            </li>
          )
        })}

        <li className="psh-status__item psh-status__item--more">
          <button type="button" className="psh-status__btn" onClick={onOpenAll}>
            <span className="psh-status__ring psh-status__ring--more">
              <span className="psh-status__inner">
                <span className="psh-status__moreicon"><IconArrowRight size={20} /></span>
              </span>
            </span>
            <span className="psh-status__name">Zote</span>
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
