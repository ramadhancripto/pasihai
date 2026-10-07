// ══════════════════════════════════════════════════════════════
// PASIHAI — FEED LIST
//
// Huchukua feed kutoka kwa feedService na ku-render items.
// Inaonyesha idadi pale kichujio kinapotumika (hesabu halisi, si ya kubuni).
// Hali tupu inasema ukweli: hakuna content ya aina hiyo kwenye tab hii.
//
// `filterLabel` inatolewa na Home (ambayo inapata vocabulary kwa service) —
// FeedList haisomi vocabulary yenyewe.
//
// Sehemu za tab (Stitch integration):
//   · Tab ya Live: pills Inaendelea · Zilizopangwa · Zilizopita (kichujio cha
//     hali NDANI ya tab — si safu ya pili ya Home).
//   · Tab ya Channels: "Channels zinazopendekezwa" (discovery).
//   · Mwisho wa mkondo: hali ya "Umesoma yote kwa leo!".
// ══════════════════════════════════════════════════════════════

import { useState } from 'react'
import { feedService } from '../../services/feedService.js'
import useAsyncData from '../../hooks/useAsyncData.js'
import FeedItem from './FeedItem.jsx'
import { Avatar, EntityAction } from '../ui.jsx'
import { IconInfo, IconSpark, IconArrowRight, IconCheck } from '../icons.jsx'

/* Hali za vikao vya Live (zile zile za feedService: live · upcoming · replay) */
const LIVE_SEGMENTS = [
  { id: 'live', label: 'Inaendelea', state: 'live' },
  { id: 'upcoming', label: 'Zilizopangwa', state: 'upcoming' },
  { id: 'replay', label: 'Zilizopita', state: 'replay' },
]

export default function FeedList({ tab, filter, filterLabel, onOpenProfile, onToast }) {
  const feed = useAsyncData(() => feedService.getFeed({ tab, filter }), [tab, filter])
  const suggestions = useAsyncData(() => feedService.getChannelSuggestions(), [])
  const vocab = useAsyncData(() => feedService.getEntityVocabulary(), [])
  const [segment, setSegment] = useState('live')
  const [followed, setFollowed] = useState([])

  // Hali ya kupakia: skeleton ya kadi mbili (muundo ule ule wa kadi).
  if (!feed) {
    return (
      <section className="psh-feed" aria-label="Mkondo wa Home" aria-busy="true">
        {[0, 1].map((i) => (
          <div className="psh-skel" key={i}>
            <div className="psh-skel__row">
              <span className="psh-skel__ava" />
              <span className="psh-skel__lines">
                <span className="psh-skel__line psh-skel__line--w40" />
                <span className="psh-skel__line psh-skel__line--w70" />
              </span>
            </div>
            <div className="psh-skel__block" />
          </div>
        ))}
      </section>
    )
  }

  const filtersActive = filter !== 'all'
  const isLive = tab === 'live'

  // Kichujio cha hali ya Live ni cha kuonyesha pekee — data bado inatoka service.
  const items =
    isLive && feed.items.length
      ? feed.items.filter((item) => item.live?.state === segment)
      : feed.items

  const segmentCounts = isLive
    ? Object.fromEntries(
        LIVE_SEGMENTS.map((s) => [
          s.id,
          feed.items.filter((item) => item.live?.state === s.state).length,
        ]),
      )
    : null

  return (
    <section className="psh-feed" aria-label="Mkondo wa Home">
      {isLive ? (
        <div className="psh-liveseg" role="tablist" aria-label="Hali za vikao vya Live">
          {LIVE_SEGMENTS.map((s) => {
            const isActive = segment === s.id
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`psh-liveseg__pill ${isActive ? 'is-active' : ''}`}
                onClick={() => setSegment(s.id)}
              >
                {s.id === 'live' && isActive ? (
                  <span className="psh-liveseg__dot" aria-hidden="true" />
                ) : null}
                {s.label} ({segmentCounts[s.id]})
              </button>
            )
          })}
        </div>
      ) : null}

      {filtersActive ? (
        <p className="psh-feed__count">
          <IconInfo size={15} />
          Vitu {items.length} vya “{filterLabel}” kwenye tab hii
        </p>
      ) : null}

      {items.length === 0 ? (
        <div className="psh-feed__empty">
          <IconInfo size={20} />
          <p className="psh-feed__emptyTitle">Hakuna content ya aina hii hapa bado</p>
          <p className="psh-feed__emptyText">
            Jaribu kichujio kingine, au tab nyingine — Mchanganyiko ina kila kitu.
          </p>
        </div>
      ) : (
        <div className="psh-feed__items">
          {items.map((item) => (
            <FeedItem key={item.id} item={item} onOpenProfile={onOpenProfile} onToast={onToast} />
          ))}
        </div>
      )}

      {/* Channels zinazopendekezwa — discovery (tab ya Channels pekee) */}
      {tab === 'channels' && suggestions?.length ? (
        <section className="psh-discover" aria-label="Channels zinazopendekezwa">
          <header className="psh-discover__head">
            <h3 className="psh-discover__title">Channels zinazopendekezwa</h3>
            <p className="psh-discover__sub">Gundua maeneo mapya ya kufuatilia</p>
          </header>
          <ul className="psh-discover__list">
            {suggestions.map((channel) => (
              <li key={channel.id} className="psh-discover__item">
                <Avatar user={channel.user} size={40} shape="square" badge={false} />
                <div className="psh-discover__text">
                  <p className="psh-discover__name">
                    {channel.name}
                    {channel.verified ? (
                      <span className="psh-discover__tick" aria-label="Imethibitishwa">
                        <IconCheck size={13} />
                      </span>
                    ) : null}
                    {vocab?.roles?.[channel.type] ? (
                      <span className={`psh-role psh-role--${channel.type}`}>
                        {vocab.roles[channel.type]}
                      </span>
                    ) : null}
                  </p>
                  <p className="psh-discover__meta">
                    {channel.handle} · {channel.followers} wanaofuatilia
                  </p>
                </div>
                <EntityAction
                  className="psh-discover__btn"
                  vocab={vocab?.actions?.[channel.type]}
                  isDone={followed.includes(channel.id)}
                  onClick={() => {
                    setFollowed((list) =>
                      list.includes(channel.id) ? list : [...list, channel.id],
                    )
                    onToast?.(`Umeanza kufuatilia ${channel.name} (mfano)`)
                  }}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Mwisho wa mkondo — ni wa kweli, si maudhui ya kubuni */}
      {items.length > 0 ? (
        <div className="psh-feed__end">
          <span className="psh-feed__endicon" aria-hidden="true">
            <IconSpark size={20} />
          </span>
          <p className="psh-feed__endTitle">Umesoma yote kwa leo!</p>
          <p className="psh-feed__endText">
            Umeona machapisho yote mapya kwenye sehemu hii. Ungana na watu kwenye Soga au
            gundua maeneo mapya.
          </p>
          <button
            type="button"
            className="psh-btn psh-btn--primary psh-feed__endbtn"
            onClick={() => onToast?.('Soga — uzoefu kamili unakuja hatua ijayo')}
          >
            Fungua Soga
            <IconArrowRight size={16} />
          </button>
        </div>
      ) : null}
    </section>
  )
}
