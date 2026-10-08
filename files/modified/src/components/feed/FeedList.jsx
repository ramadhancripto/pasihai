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
import { chatService } from '../../services/chatService.js'
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

export default function FeedList({
  tab,
  filter,
  /* spaceId: mkondo wa NDANI ya Space (activity) — njia ileile (§7) */
  spaceId = null,
  spaceLabel = '',
  filterLabel,
  tabMeaning,
  onOpenProfile,
  onToast,
  onOpenPanel,
  onRefreshFeed,
  onOpenChat,
  feedVersion = 0,
}) {
  const feed = useAsyncData(
    () =>
      spaceId
        ? feedService.getSpaceFeed({ spaceId, filter })
        : feedService.getFeed({ tab, filter }),
    [tab, filter, spaceId, feedVersion],
  )
  const suggestions = useAsyncData(() => feedService.getChannelSuggestions(), [])
  const vocab = useAsyncData(() => feedService.getEntityVocabulary(), [])
  const [segment, setSegment] = useState('live')
  const [followBusy, setFollowBusy] = useState(null)

  /* ── Vitendo vya chapisho (halisi — hali ya kikao) ──────── */
  const [busy, setBusy] = useState(false)
  const act = async (fn) => {
    if (busy) return
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
    }
  }
  const toggleLike = (item) =>
    act(async () => {
      const res = await feedService.toggleLike(item.id)
      onToast?.(res.liked ? 'Umependa chapisho' : 'Umeondoa kupenda')
      refresh()
    })
  const toggleSave = (item) =>
    act(async () => {
      const res = await feedService.toggleSaved(item)
      onToast?.(res.saved ? 'Kimehifadhiwa — kinaonekana kwenye Zilizohifadhiwa' : 'Kimeondolewa kwenye zilizohifadhiwa')
      refresh()
    })
  const vote = (itemId, optionId) =>
    act(async () => {
      await feedService.votePoll(itemId, optionId)
      onToast?.('Kura yako imesajiliwa')
      refresh()
    })
  const refresh = () => onRefreshFeed?.()

  /* CTA ya chapisho: kila kimoja kinafanya kitu halisi.
     · Biashara (wasiliana) → mazungumzo ya Chat yanafunguliwa
     · Nyingine (makala · warsha) → chapisho linafunguliwa na maoni yake */
  const openCta = (item, cta) => {
    const authorId = item.author?.id || item.userId
    const isBusiness = (item.author?.type || item.entityType) === 'business'
    if (isBusiness && authorId) {
      return chatService.startDirect(authorId).then(() => {
        onToast?.(`Mazungumzo na ${item.author?.name || 'muuzaji'} yamefunguliwa kwenye Chat`)
        onOpenChat?.()
      })
    }
    onToast?.('Chapisho limefunguliwa — kinachofuata ni maelezo na maoni')
    return onOpenPanel?.({ type: 'comments', payload: item })
  }

  // Hali ya kupakia: skeleton ya kadi mbili (muundo ule ule wa kadi).
  if (!feed) {
    return (
      <section
        className="psh-feed"
        aria-label={spaceId ? `Shughuli za ${spaceLabel || 'Space'}` : 'Mkondo wa Home'}
        aria-busy="true"
      >
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
    <section className="psh-feed" aria-label={spaceId ? `Shughuli za ${spaceLabel || 'Space'}` : 'Mkondo wa Home'}>
      {tabMeaning && !spaceId ? <p className="psh-feed__context">{tabMeaning}</p> : null}

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
          <p className="psh-feed__emptyTitle">
            {spaceId ? 'Hakuna shughuli hapa bado' : 'Hakuna content ya aina hii hapa bado'}
          </p>
          <p className="psh-feed__emptyText">
            {spaceId
              ? `Wanachama wa ${spaceLabel || 'nafasi hii'} hawajachapisha kitu bado — wewe waweza kuanza.`
              : 'Jaribu kichujio kingine, au tab nyingine — Mchanganyiko ina kila kitu.'}
          </p>
        </div>
      ) : (
        <div className="psh-feed__items">
          {items.map((item) => (
            <FeedItem
              key={item.id}
              item={item}
              onOpenProfile={onOpenProfile}
              onToast={onToast}
              onToggleLike={toggleLike}
              onToggleSave={toggleSave}
              onVote={vote}
              onOpenLive={(it) => onOpenPanel?.({ type: 'live', payload: it })}
              onOpenComments={(it) => onOpenPanel?.({ type: 'comments', payload: it })}
              onOpenShare={(it) => onOpenPanel?.({ type: 'share', payload: it })}
              onOpenMenu={(it) => onOpenPanel?.({ type: 'postmenu', payload: it })}
              onCta={openCta}
            />
          ))}
        </div>
      )}

      {/* Channels zinazopendekezwa — discovery (tab ya Channels pekee) */}
      {!spaceId && tab === 'channels' && suggestions?.length ? (
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
                  isDone={
                    (vocab?.actions?.[channel.type]?.done ?? 'Unafuatilia') ===
                    channel.relationship
                  }
                  busy={followBusy === channel.id}
                  onClick={() =>
                    act(async () => {
                      const done =
                        vocab?.actions?.[channel.type]?.done ?? 'Unafuatilia'
                      const on = channel.relationship === done
                      setFollowBusy(channel.id)
                      try {
                        const res = await feedService.toggleFollow(channel.id, !on)
                        onToast?.(
                          res.following
                            ? `Unafuata ${channel.name}`
                            : `Umekoma kufuata ${channel.name}`,
                        )
                        refresh()
                      } finally {
                        setFollowBusy(null)
                      }
                    })
                  }
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
            Umeona machapisho yote mapya kwenye sehemu hii. Ungana na watu kwenye Chat au
            gundua maeneo mapya.
          </p>
          <button
            type="button"
            className="psh-btn psh-btn--primary psh-feed__endbtn"
            onClick={() => onToast?.('Chat — fungua Chat kwenye urambazaji wa chini')}
          >
            Fungua Chat
            <IconArrowRight size={16} />
          </button>
        </div>
      ) : null}
    </section>
  )
}
