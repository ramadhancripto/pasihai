// ══════════════════════════════════════════════════════════════
// PASIHAI — GUNDUA BITS (safu ya ugunduzi)
//
// Lugha ya kuona ya PASIHAI (si ya WhatsApp):
//   · kila AINA ya entity ina kadi YAKE: mtu · biashara · channel ·
//     jumuiya · hub · kikundi · live
//   · kichwa cha kadi = "band" ya rangi ya PASIHAI yenye icon ya aina
//     (green = msingi · blue = taarifa · gold = tahadhari/highlight)
//   · vitendo ni vya MUKTADHA (Tazama Biashara · Fuata · Jiunge · Anza Chat)
//   · kitufe ⋯ + long-press = vitendo vya haraka (SI njia pekee)
// ══════════════════════════════════════════════════════════════

import { Chip } from '../ui.jsx'
import { formatCount } from '../../utils/format.js'
import {
  IconArrowRight,
  IconCheck,
  IconComment,
  IconGlobe,
  IconGroup,
  IconHeadset,
  IconHub,
  IconLive,
  IconMapPin,
  IconMegaphone,
  IconMoreVertical,
  IconPeople,
  IconPersonAdd,
  IconPersonSearch,
  IconPlay,
  IconShield,
  IconSpark,
  IconStar,
  IconStorefront,
  IconTag,
} from '../icons.jsx'

export const MODULE_ICON = { spark: IconSpark, people: IconPeople, megaphone: IconMegaphone, live: IconLive }
export const CAT_ICON = {
  store: IconStorefront, personSearch: IconPersonSearch, group: IconGroup, hub: IconHub,
  globe: IconGlobe, personAdd: IconPersonAdd, channel: IconMegaphone, people: IconPeople,
  live: IconLive, spark: IconSpark,
}
export const KIND_ICON = {
  business: IconStorefront, channel: IconMegaphone, hub: IconHub, community: IconGlobe,
  group: IconGroup, person: IconPersonSearch, live: IconLive, room: IconHeadset,
}

/* ── Moduli kuu za ugunduzi (§3) ───────────────────────────── */

export function DiscoveryModule({ module, active, count, onSelect }) {
  const Icon = MODULE_ICON[module.icon] || IconSpark
  return (
    <button
      type="button"
      className={`psh-gu-mod psh-gu-mod--${module.tone} ${active ? 'is-active' : ''}`}
      aria-pressed={active}
      onClick={() => onSelect(module.mode || module.id)}
    >
      <span className="psh-gu-mod__ic">
        <Icon size={20} />
      </span>
      <span className="psh-gu-mod__text">
        <span className="psh-gu-mod__label">{module.label}</span>
        <span className="psh-gu-mod__hint">{module.hint}</span>
      </span>
      {typeof count === 'number' ? <span className="psh-gu-mod__count">{formatCount(count)}</span> : null}
    </button>
  )
}

/* ── Kategoria za ugunduzi (§5) ────────────────────────────── */

export function CategoryModule({ cat, onSelect }) {
  const Icon = CAT_ICON[cat.icon] || IconSpark
  return (
    <button type="button" className="psh-gu-cat" onClick={() => onSelect(cat.mode)}>
      <span className="psh-gu-cat__ic">
        <Icon size={18} />
      </span>
      <span className="psh-gu-cat__label">{cat.label}</span>
      {typeof cat.count === 'number' ? <span className="psh-gu-cat__count">{formatCount(cat.count)}</span> : null}
    </button>
  )
}

/* ── Kichwa cha sehemu ─────────────────────────────────────── */

export function SectionHead({ title, hint, actionLabel = 'Zote', onAction }) {
  return (
    <header className="psh-gu-sechead">
      <div className="psh-gu-sechead__text">
        <h2 className="psh-gu-sechead__title">{title}</h2>
        {hint ? <p className="psh-gu-sechead__hint">{hint}</p> : null}
      </div>
      {onAction ? (
        <button type="button" className="psh-gu-sechead__action" onClick={onAction}>
          {actionLabel}
          <IconArrowRight size={15} />
        </button>
      ) : null}
    </header>
  )
}

/* ── Rail (mlalo kwenye simu · grid kwenye desktop) ────────── */

export function Rail({ children, name }) {
  return (
    <div className="psh-gu-rail" role="list" aria-label={name}>
      {children}
    </div>
  )
}

/* ── Kadi: mtu (privacy-first, sababu MOJA ya muktadha) ────── */

export function PersonCard({ p, onOpen, onMore, onAdd, onAccept, onDecline, onChat, onInvite }) {
  const state = p.friendState
  return (
    <article className="psh-gu-card psh-gu-card--person" data-kind="person">
      <button type="button" className="psh-gu-card__main" onClick={() => onOpen(p)} aria-label={`${p.name} — wasifu`}>
        <span className="psh-gu-card__top">
          <span className={`psh-gu-ava psh-gu-ava--${p.tone || 'green'}`}>{initialsOf(p.name)}</span>
          <span className="psh-gu-card__id">
            <span className="psh-gu-card__name">
              {p.name}
              {p.verified ? <IconCheck size={13} strokeWidth={2.2} className="psh-gu-verified" /> : null}
            </span>
            <span className="psh-gu-card__sub">{p.handle}{p.subtitle ? ` · ${p.subtitle}` : ''}</span>
          </span>
          {p.online ? <span className="psh-gu-dot" aria-label="Yupo mtandaoni" /> : null}
        </span>

        {p.discoverReason ? (
          <span className="psh-gu-reason">
            <IconSpark size={12} />
            {p.discoverReason}
          </span>
        ) : null}

        {p.interests?.length ? (
          <span className="psh-gu-tags">
            {p.interests.slice(0, 2).map((i) => (
              <span key={i} className="psh-gu-tag">{i}</span>
            ))}
          </span>
        ) : null}
        {typeof p.distanceKm === 'number' ? (
          <span className="psh-gu-meta">
            <IconMapPin size={12} /> {p.distanceKm} km kutoka hapa
          </span>
        ) : null}
      </button>

      <span className="psh-gu-card__acts">
        <QuickMore label={`Vitendo zaidi: ${p.name}`} onClick={() => onMore(p)} />
        {state === 'friend' ? (
          <>
            <span className="psh-gu-chip-ok">
              <IconCheck size={13} strokeWidth={2.2} /> Rafiki
            </span>
            <button type="button" className="psh-gu-btn psh-gu-btn--ghost" onClick={() => onChat(p)}>
              <IconComment size={15} /> Anza Chat
            </button>
          </>
        ) : null}
        {state === 'not_friend' ? (
          <button type="button" className="psh-gu-btn psh-gu-btn--primary" onClick={() => onAdd(p)}>
            <IconPersonAdd size={15} /> Omba Urafiki
          </button>
        ) : null}
        {state === 'no_account' ? (
          <button type="button" className="psh-gu-btn psh-gu-btn--ghost" onClick={() => onInvite?.(p)}>
            <IconPersonAdd size={15} /> Alika PASIHAI
          </button>
        ) : null}
        {state === 'sent' ? (
          <span className="psh-gu-chip-wait">
            <IconCheck size={13} /> Ombi limetumwa
          </span>
        ) : null}
        {state === 'received' ? (
          <>
            <button type="button" className="psh-gu-btn psh-gu-btn--primary" onClick={() => onAccept(p)}>
              Kubali
            </button>
            <button type="button" className="psh-gu-btn psh-gu-btn--quiet" onClick={() => onDecline(p)}>
              Kataa
            </button>
          </>
        ) : null}
        {state === 'blocked' ? (
          <span className="psh-gu-chip-block">
            <IconShield size={13} /> Umezuiwa
          </span>
        ) : null}
      </span>
    </article>
  )
}

/* ── Kadi: biashara (Local Discover) ───────────────────────── */

export function BusinessCard({ b, onOpen, onMore, onChat }) {
  return (
    <article className="psh-gu-card psh-gu-card--biz" data-kind="business">
      <span className="psh-gu-band psh-gu-band--biz" aria-hidden="true">
        <IconStorefront size={22} />
        <span className="psh-gu-band__tags">
          {b.open ? <span className="psh-gu-pill psh-gu-pill--open">Wazi sasa</span> : <span className="psh-gu-pill">Imefungwa</span>}
          {b.offers ? <span className="psh-gu-pill psh-gu-pill--gold"><IconTag size={11} /> Ofa</span> : null}
        </span>
      </span>

      <button type="button" className="psh-gu-card__main" onClick={() => onOpen(b)} aria-label={`${b.name} — maelezo ya biashara`}>
        <span className="psh-gu-card__name">
          {b.name}
          {b.verified ? <IconCheck size={13} strokeWidth={2.2} className="psh-gu-verified" /> : null}
        </span>
        <span className="psh-gu-card__sub">{b.subtitle || b.category} · {b.bio}</span>
        {typeof b.distanceKm === 'number' ? (
          <span className="psh-gu-meta">
            <IconMapPin size={12} /> {b.distanceKm} km kutoka hapa
          </span>
        ) : null}
        {b.openLabel ? <span className="psh-gu-meta psh-gu-meta--soft">{b.openLabel}</span> : null}
        {b.rating ? (
          <span className="psh-gu-rating">
            <IconStar size={13} />
            <b>{b.rating}</b>
            {typeof b.reviews === 'number' ? <span>(mapitio {b.reviews})</span> : null}
          </span>
        ) : null}
        {b.profile?.products?.length ? (
          <span className="psh-gu-preview">
            <span className="psh-gu-preview__label">Bidhaa za haraka</span>
            {b.profile.products.slice(0, 2).map((pr) => (
              <span key={pr.id} className="psh-gu-preview__row">
                <b>{pr.name}</b>
                <span>{pr.price}</span>
              </span>
            ))}
          </span>
        ) : null}
      </button>

      <span className="psh-gu-card__acts">
        <QuickMore label={`Vitendo zaidi: ${b.name}`} onClick={() => onMore(b)} />
        <button type="button" className="psh-gu-btn psh-gu-btn--primary" onClick={() => onOpen(b)}>
          Tazama
        </button>
        <button type="button" className="psh-gu-btn psh-gu-btn--ghost" onClick={() => onChat(b)}>
          <IconComment size={15} /> Chat
        </button>
      </span>
    </article>
  )
}

/* ── Kadi: channel ─────────────────────────────────────────── */

export function ChannelCard({ c, onOpen, onMore, onFollow }) {
  return (
    <article className="psh-gu-card psh-gu-card--channel" data-kind="channel">
      <span className="psh-gu-band psh-gu-band--channel" aria-hidden="true">
        <IconMegaphone size={22} />
        {c.category ? <span className="psh-gu-band__label">{c.category}</span> : null}
      </span>

      <button type="button" className="psh-gu-card__main" onClick={() => onOpen(c)} aria-label={`${c.name} — channel`}>
        <span className="psh-gu-card__name">
          {c.name}
          {c.verified ? <IconCheck size={13} strokeWidth={2.2} className="psh-gu-verified" /> : null}
        </span>
        <span className="psh-gu-card__sub">{c.bio}</span>
        <span className="psh-gu-meta">
          {formatCount(c.followers)} wafuatiliaji · {c.language || 'Kiswahili'}
        </span>
        {c.preview ? (
          <span className="psh-gu-preview">
            <span className="psh-gu-preview__label">Kutoka channel · {c.preview.at}</span>
            <span className="psh-gu-preview__title">{c.preview.title}</span>
            <span className="psh-gu-preview__text">{c.preview.text}</span>
          </span>
        ) : null}
      </button>

      <span className="psh-gu-card__acts">
        <QuickMore label={`Vitendo zaidi: ${c.name}`} onClick={() => onMore(c)} />
        {c.following ? (
          <button type="button" className="psh-gu-btn psh-gu-btn--ghost" onClick={() => onFollow(c, false)}>
            <IconCheck size={15} /> Unafuatilia
          </button>
        ) : (
          <button type="button" className="psh-gu-btn psh-gu-btn--primary" onClick={() => onFollow(c, true)}>
            Fuata
          </button>
        )}
      </span>
    </article>
  )
}

/* ── Kadi: hub · jumuiya (spaces za umma) ──────────────────── */

export function SpaceCard({ s, variant, onOpen, onMore, onJoin }) {
  const Icon = variant === 'community' ? IconGlobe : IconHub
  const joined = !!s.joined
  return (
    <article className={`psh-gu-card psh-gu-card--space`} data-kind={variant}>
      <span className={`psh-gu-band psh-gu-band--${variant}`} aria-hidden="true">
        <Icon size={22} />
        <span className="psh-gu-band__label">{variant === 'community' ? 'Jumuiya ya Wazi' : 'Hub ya Wazi'}</span>
      </span>

      <button type="button" className="psh-gu-card__main" onClick={() => onOpen(s)} aria-label={`${s.name} — ${variant}`}>
        <span className="psh-gu-card__name">{s.name}</span>
        <span className="psh-gu-card__sub">{s.bio || s.purpose}</span>
        <span className="psh-gu-meta">
          <IconMapPin size={12} />
          {s.place ? `${s.place.mji}${s.place.mkoa && s.place.mkoa !== s.place.mji ? `, ${s.place.mkoa}` : ''}` : 'Tanzania'}
          <span className="psh-gu-meta__sep">· Wanachama {formatCount(s.members || s.followers)}</span>
        </span>
        {s.activityToday ? (
          <span className="psh-gu-meta psh-gu-meta--soft">Mada {s.activityToday} zilizochapishwa leo</span>
        ) : null}
      </button>

      <span className="psh-gu-card__acts">
        <QuickMore label={`Vitendo zaidi: ${s.name}`} onClick={() => onMore(s)} />
        {joined ? (
          <span className="psh-gu-chip-ok">
            <IconCheck size={13} strokeWidth={2.2} /> Umejiunga
          </span>
        ) : (
          <button type="button" className="psh-gu-btn psh-gu-btn--primary" onClick={() => onJoin(s, variant)}>
            {variant === 'community' ? 'Jiunge na Jumuiya' : 'Jiunge na Hub'}
          </button>
        )}
      </span>
    </article>
  )
}

/* ── Kadi: kikundi cha umma (mazungumzo = Chat iliyopo) ────── */

export function GroupCard({ g, onOpen, onMore, onJoin }) {
  return (
    <article className="psh-gu-card psh-gu-card--group" data-kind="group">
      <span className="psh-gu-band psh-gu-band--group" aria-hidden="true">
        <IconGroup size={22} />
        <span className="psh-gu-band__label">Kikundi cha Wazi</span>
      </span>

      <button type="button" className="psh-gu-card__main" onClick={() => onOpen(g)} aria-label={`${g.name} — kikundi`}>
        <span className="psh-gu-card__name">{g.name}</span>
        <span className="psh-gu-card__sub">{g.purpose}</span>
        <span className="psh-gu-meta">
          {formatCount(g.members)} wanachama
          {g.nextSession ? <span className="psh-gu-meta__sep">· Safari ijayo: {g.nextSession}</span> : null}
        </span>
        <span className="psh-gu-note-inline">
          <IconComment size={12} /> Mazungumzo yanatumia Chat ya PASIHAI
        </span>
      </button>

      <span className="psh-gu-card__acts">
        <QuickMore label={`Vitendo zaidi: ${g.name}`} onClick={() => onMore(g)} />
        {g.joined ? (
          <span className="psh-gu-chip-ok">
            <IconCheck size={13} strokeWidth={2.2} /> Umejiunga · ipo kwenye Chat
          </span>
        ) : (
          <button type="button" className="psh-gu-btn psh-gu-btn--primary" onClick={() => onJoin(g, 'group')}>
            Jiunge na Kikundi
          </button>
        )}
      </span>
    </article>
  )
}

/* ── Kadi: Live (identity yenye nguvu) ─────────────────────── */

export function LiveCard({ l, onOpen, onMore }) {
  const isRoom = l.kind === 'room'
  return (
    <article className="psh-gu-card psh-gu-card--live" data-kind="live">
      <span className={`psh-gu-band psh-gu-band--live ${l.liveNow ? 'is-live' : ''}`}>
        {l.liveNow ? (
          <span className="psh-gu-livebadge">
            <i className="psh-gu-livedot" aria-hidden="true" /> LIVE
          </span>
        ) : (
          <span className="psh-gu-pill">{l.state === 'upcoming' ? 'Upcoming' : 'Replay'}</span>
        )}
        <span className="psh-gu-band__tags">
          {l.liveNow && typeof l.viewers === 'number' ? (
            <span className="psh-gu-viewers"><IconPlay size={11} /> {formatCount(l.viewers)}</span>
          ) : null}
          {isRoom ? <span className="psh-gu-viewers"><IconHeadset size={11} /> {formatCount(l.listeners)} wanasikiliza</span> : null}
        </span>
      </span>

      <button type="button" className="psh-gu-card__main" onClick={() => onOpen(l)} aria-label={`${l.title} — ${isRoom ? 'kumbi ya sauti' : 'live'}`}>
        <span className="psh-gu-card__name">{l.title}</span>
        <span className="psh-gu-card__sub">{l.host}{l.place?.mji ? ` · ${l.place.mji === 'Global' ? 'Global' : l.place.mji}` : ''}</span>
        <span className="psh-gu-meta">
          {l.category}
          {l.since ? <span className="psh-gu-meta__sep">· {l.since}</span> : null}
          {l.whenLabel ? <span className="psh-gu-meta__sep">· {l.whenLabel}</span> : null}
        </span>
      </button>

      <span className="psh-gu-card__acts">
        <QuickMore label={`Vitendo zaidi: ${l.title}`} onClick={() => onMore(l)} />
        <button type="button" className="psh-gu-btn psh-gu-btn--primary" onClick={() => onOpen(l)}>
          {isRoom ? 'Sikiliza Sasa' : 'Jiunge'}
        </button>
      </span>
    </article>
  )
}

/* ── Kadi: ofa ─────────────────────────────────────────────── */

export function OfferCard({ o, onOpen, onMore }) {
  return (
    <article className="psh-gu-card psh-gu-card--offer" data-kind="offer">
      <span className={`psh-gu-offerlabel psh-gu-offerlabel--${o.tone || 'green'}`}>{o.label}</span>
      <button type="button" className="psh-gu-card__main" onClick={() => onOpen(o.business)} aria-label={`Ofa: ${o.title}`}>
        <span className="psh-gu-card__name">{o.title}</span>
        <span className="psh-gu-card__sub">{o.business.name} · {o.expires}</span>
        <span className="psh-gu-code">
          <IconTag size={12} /> Nambari ya ofa: <b>{o.code}</b>
        </span>
      </button>
      <span className="psh-gu-card__acts">
        <QuickMore label={`Vitendo zaidi: ${o.title}`} onClick={() => onMore(o.business)} />
        <button type="button" className="psh-gu-btn psh-gu-btn--ghost" onClick={() => onOpen(o.business)}>
          Dai Ofa <IconArrowRight size={14} />
        </button>
      </span>
    </article>
  )
}

/* ── Ramani (mfano — muundo wa PASIHAI, si ramani halisi) ───── */

export function MapPreview({ map, onOpen }) {
  return (
    <section className="psh-gu-map" aria-label="Ramani ya Gundua">
      <svg
        className="psh-gu-map__art"
        viewBox="0 0 960 200"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label="Muonekano wa ramani (mfano — si ramani halisi)"
      >
        <rect x="0" y="0" width="960" height="200" fill="#eef4f2" />
        {/* barabara kuu */}
        <path d="M0 132h960" stroke="#dbe7e2" strokeWidth="14" />
        <path d="M0 62h960" stroke="#f4f8f7" strokeWidth="22" />
        <path d="M180 0v200M470 0v200M760 0v200" stroke="#e2ecea" strokeWidth="10" />
        <path d="M320 0v200M640 0v200" stroke="#eaf1ef" strokeWidth="6" />
        {/* vituo vya umma */}
        <circle cx="118" cy="72" r="7" fill="#18A982" />
        <circle cx="286" cy="150" r="7" fill="#3B82F6" />
        <circle cx="404" cy="52" r="7" fill="#18A982" />
        <circle cx="560" cy="122" r="7" fill="#D4A72C" />
        <circle cx="700" cy="66" r="7" fill="#18A982" />
        <circle cx="866" cy="146" r="7" fill="#18A982" />
        {/* nyumba/maeneo — mistari laini */}
        <path d="M60 168h84M60 176h56" stroke="#d7e3df" strokeWidth="4" strokeLinecap="round" />
        <path d="M508 26h96M508 34h64" stroke="#d7e3df" strokeWidth="4" strokeLinecap="round" />
        <path d="M812 32h84M812 40h52" stroke="#d7e3df" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <div className="psh-gu-map__bar">
        <span className="psh-gu-map__text">
          <b>{map.label}</b>
          <span>{map.hint} · vituo {map.pins}</span>
        </span>
        <button type="button" className="psh-gu-btn psh-gu-btn--ghost" onClick={onOpen}>
          Fungua Ramani
        </button>
      </div>
    </section>
  )
}

/* ── Bango la faragha (§20) ────────────────────────────────── */

export function PrivacyNote({ text, onClose }) {
  return (
    <div className="psh-gu-privacy" role="note">
      <span className="psh-gu-privacy__ic">
        <IconShield size={16} />
      </span>
      <span className="psh-gu-privacy__text">
        <b>Faragha Kamili ya PASIHAI</b>
        {text}
      </span>
      {onClose ? (
        <button type="button" className="psh-gu-privacy__x" onClick={onClose} aria-label="Funga taarifa ya faragha">
          ✕
        </button>
      ) : null}
    </div>
  )
}

/* ── Mstari wa kichujio kilichowekwa (compact) ─────────────── */

export function FilterBar({ count, items, onOpen, onClear }) {
  if (!count) return null
  return (
    <div className="psh-gu-filterbar is-active">
      <button type="button" className="psh-gu-filterbar__main" onClick={onOpen}>
        <IconFilterInline /> Vichujio <b>{count}</b>
        <span className="psh-gu-filterbar__list">{items.map((i) => i.label).join(' · ')}</span>
      </button>
      <button type="button" className="psh-gu-filterbar__clear" onClick={onClear}>
        Safisha
      </button>
    </div>
  )
}

function IconFilterInline() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M4 6.4h16M7 12h10M10 17.6h4" strokeLinecap="round" />
    </svg>
  )
}

function QuickMore({ label, onClick }) {
  return (
    <button type="button" className="psh-gu-card__more" aria-label={label} onClick={onClick}>
      <IconMoreVertical size={16} />
    </button>
  )
}

function initialsOf(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}
