// ══════════════════════════════════════════════════════════════
// PASIHAI — SPACES BITS (sehemu za kuona)
//
// Lugha moja ya kuona (§45): tokens za PASIHAI, radius ileile, vitufe
// vya `.psh-btn`, icons za `icons.jsx`. Hakuna CSS ya pili ya vitufe,
// hakuna rangi za nje, hakuna gradients/glassmorphism.
//
// Kadi mbili PEKEE kwa sababu kuna familia mbili:
//   · SpaceCard   — Hub · Jumuiya (familia moja: mahali + watu)
//   · ChannelCard — Channel (kuchapisha: creator → content → hadhira)
//
// SectionHead/Rail zinatumika kutoka safu ya Gundua — muundo mmoja.
// ══════════════════════════════════════════════════════════════

import { Avatar, Chip } from '../ui.jsx'
import { Rail, SectionHead } from '../gundua/GunduaBits.jsx'
import { formatCount } from '../../utils/format.js'
import {
  IconArrowRight,
  IconCalendarAdd,
  IconChat,
  IconCheck,
  IconChevronLeft,
  IconDownload,
  IconFile,
  IconGlobe,
  IconGroup,
  IconHub,
  IconMapPin,
  IconMegaphone,
  IconPeople,
  IconPlus,
  IconShield,
  IconStar,
} from '../icons.jsx'

export { Rail, SectionHead }

/* ── Aina ya Space → icon na jina la familia ───────────────── */

export function spaceIcon(type) {
  if (type === 'channel') return IconMegaphone
  if (type === 'community') return IconGlobe
  return IconHub
}

export function familyLabel(type) {
  if (type === 'channel') return 'Channel'
  if (type === 'community') return 'Jumuiya'
  return 'Hub'
}

/* ── Alama ya ufikivu (hali, si aina ya kitu — §5/§15) ─────── */

export function VisibilityBadge({ visibility, label, className = '' }) {
  if (!visibility || visibility === 'public') return null
  return (
    <span
      className={`psh-sp__vis psh-sp__vis--${visibility} ${className}`}
      title={label}
      aria-label={label}
    >
      <IconShield size={13} />
      {visibility === 'listed' ? 'Iliyoorodheshwa' : 'Fichwa'}
    </span>
  )
}

/* ── Kadi: Hub · Jumuiya (familia moja) ────────────────────── */

export function SpaceCard({ s, onOpen, onJoin, busy = false }) {
  const Icon = spaceIcon(s.type)
  return (
    <article className={`psh-spc psh-spc--${s.family}`} data-kind={s.type} data-id={s.id}>
      <button
        type="button"
        className="psh-spc__band"
        onClick={() => onOpen?.(s)}
        aria-label={`${s.name} — ${familyLabel(s.type)}`}
        data-tone={s.cover || 'green'}
      >
        <span className="psh-spc__ic" aria-hidden="true">
          <Icon size={22} />
        </span>
        <span className="psh-spc__fam">{familyLabel(s.type)}</span>
        {s.verified ? <IconCheck size={14} strokeWidth={2.2} className="psh-spc__tick" /> : null}
      </button>

      <div className="psh-spc__body">
        <button type="button" className="psh-spc__main" onClick={() => onOpen?.(s)}>
          <h3 className="psh-spc__name">
            {s.name}
            {s.owned ? <span className="psh-spc__own">Nafasi yako</span> : null}
          </h3>
          <p className="psh-spc__purpose">{s.purpose}</p>
          <p className="psh-spc__meta">
            {s.category ? <Chip tone="neutral">{s.category}</Chip> : null}
            {s.place?.mji ? (
              <span className="psh-spc__place">
                <IconMapPin size={12} />
                {s.place.mji}
              </span>
            ) : null}
            <span className="psh-spc__count">
              <IconPeople size={12} />
              {s.membersLabel} {s.type === 'channel' ? 'wafuatiliaji' : 'wanachama'}
            </span>
          </p>
        </button>
        <VisibilityBadge visibility={s.visibility} label={s.visibilityLabel} />

        <div className="psh-spc__acts">
          <button type="button" className="psh-spc__open" onClick={() => onOpen?.(s)}>
            Fungua
            <IconArrowRight size={15} />
          </button>
          {s.joined ? (
            <span className="psh-spc__done">
              <IconCheck size={13} strokeWidth={2.2} />
              {s.owned ? 'Umiliki wako' : 'Umejiunga'}
            </span>
          ) : s.requested ? (
            <span className="psh-spc__pending">Ombi limetumwa</span>
          ) : (
            <button
              type="button"
              className="psh-btn psh-btn--sm psh-btn--primary"
              onClick={() => onJoin?.(s)}
              disabled={busy}
            >
              {busy ? 'Inatuma…' : s.joinLabel}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

/* ── Kadi: Channel (kuchapisha) ───────────────────────────── */

export function ChannelCard({ c, onOpen, onFollow, busy = false }) {
  return (
    <article className="psh-spc psh-spc--channel" data-kind="channel" data-id={c.id}>
      <button
        type="button"
        className="psh-spc__band"
        onClick={() => onOpen?.(c)}
        aria-label={`${c.name} — Channel`}
        data-tone={c.cover || 'blue'}
      >
        <span className="psh-spc__ic" aria-hidden="true">
          <IconMegaphone size={22} />
        </span>
        <span className="psh-spc__fam">{c.category || 'Channel'}</span>
        {c.verified ? <IconCheck size={14} strokeWidth={2.2} className="psh-spc__tick" /> : null}
      </button>

      <div className="psh-spc__body">
        <button type="button" className="psh-spc__main" onClick={() => onOpen?.(c)}>
          <h3 className="psh-spc__name">
            {c.name}
            {c.owned ? <span className="psh-spc__own">Channel yako</span> : null}
          </h3>
          <p className="psh-spc__purpose">{c.purpose}</p>
          <p className="psh-spc__meta">
            <span className="psh-spc__count">
              <IconPeople size={12} />
              {formatCount(c.followers)} wafuatiliaji
            </span>
            <span className="psh-spc__handle">{c.handle}</span>
          </p>
        </button>
        <VisibilityBadge visibility={c.visibility} label={c.visibilityLabel} />

        <div className="psh-spc__acts">
          <button type="button" className="psh-spc__open" onClick={() => onOpen?.(c)}>
            Fungua
            <IconArrowRight size={15} />
          </button>
          {c.owned ? (
            <span className="psh-spc__done">
              <IconCheck size={13} strokeWidth={2.2} />
              Channel yako
            </span>
          ) : c.joined ? (
            <span className="psh-spc__done">
              <IconCheck size={13} strokeWidth={2.2} />
              Unafuatilia
            </span>
          ) : (
            <button
              type="button"
              className="psh-btn psh-btn--sm psh-btn--primary"
              onClick={() => onFollow?.(c)}
              disabled={busy}
            >
              Fuata
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

/* ── Kichwa cha Space (Hub · Jumuiya · Channel) ────────────── */

export function SpaceHeader({ s, onBack, onJoin, onLeave, busy = false }) {
  const Icon = spaceIcon(s.type)
  return (
    <header className="psh-sph">
      <div className="psh-sph__band" data-tone={s.cover || 'green'} aria-hidden="true" />
      <div className="psh-sph__top">
        <button type="button" className="psh-sph__back" onClick={onBack} aria-label="Rudi kwenye orodha ya Spaces">
          <IconChevronLeft size={20} />
          <span>Spaces</span>
        </button>
        <span className="psh-sph__logo" data-tone={s.cover || 'green'} aria-hidden="true">
          <Icon size={26} />
        </span>
      </div>

      <div className="psh-sph__id">
        <h1 className="psh-sph__name">
          {s.name}
          {s.verified ? (
            <span className="psh-sph__tick" aria-label="Imethibitishwa">
              <IconCheck size={15} strokeWidth={2.2} />
            </span>
          ) : null}
        </h1>
        <p className="psh-sph__line">
          <span className="psh-sph__fam">{familyLabel(s.type)}</span>
          <span className="psh-ident__sep">·</span>
          <span>{s.handle}</span>
        </p>
        <p className="psh-sph__meta">
          <Chip tone="soft">{s.membersLabel} {s.type === 'channel' ? 'wafuatiliaji' : 'wanachama'}</Chip>
          {s.category ? <Chip tone="neutral">{s.category}</Chip> : null}
          {s.place?.mji ? (
            <Chip tone="neutral">
              <IconMapPin size={12} /> {s.place.mji}
            </Chip>
          ) : null}
          <VisibilityBadge visibility={s.visibility} label={s.visibilityLabel} />
        </p>
        <p className="psh-sph__purpose">{s.purpose}</p>
      </div>

      <div className="psh-sph__acts">
        {s.membership?.owned ? (
          <span className="psh-sph__rel">
            <IconStar size={14} />
            {s.type === 'channel' ? 'Channel yako' : 'Wewe ni msimamizi'}
          </span>
        ) : s.membership?.joined ? (
          <>
            <span className="psh-sph__rel">
              <IconCheck size={14} strokeWidth={2.2} />
              {s.type === 'channel' ? 'Unafuatilia' : 'Umejiunga'}
            </span>
            <button
              type="button"
              className="psh-btn psh-btn--sm psh-btn--ghost"
              onClick={onLeave}
              disabled={busy}
            >
              {s.type === 'channel' ? 'Ondoa ufuatiliaji' : 'Toka'}
            </button>
          </>
        ) : s.membership?.requested ? (
          <span className="psh-sph__rel psh-sph__rel--pending">
            <IconShield size={14} />
            Ombi limetumwa — linasubiri wasimamizi
          </span>
        ) : (
          <button
            type="button"
            className="psh-btn psh-btn--primary"
            onClick={onJoin}
            disabled={busy}
            data-sp-join
          >
            {busy ? 'Inatuma…' : s.joinLabel}
          </button>
        )}
      </div>
    </header>
  )
}

/* ── Tabs za Space (juu ya ukurasa — si bottom nav) ────────── */

export function SpaceTabs({ tabs, active, onChange, label = 'Sehemu za Space' }) {
  return (
    <div className="psh-spth" role="tablist" aria-label={label}>
      {tabs.map((t) => {
        const on = t.id === active
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={on}
            className={`psh-spth__tab ${on ? 'is-active' : ''}`}
            onClick={() => onChange(t.id)}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

/* ── Watu: timu (roles) + wanachama ────────────────────────── */

export function MembersBlock({ team = [], members = [], lead, onOpenProfile, title = 'Watu' }) {
  return (
    <section className="psh-spw" aria-label={title}>
      {lead ? (
        <div className="psh-spw__lead">
          <Avatar user={lead} size={48} shape="square" badge={false} />
          <div>
            <p className="psh-spw__leadName">
              {lead.name}
              <span className="psh-spw__role psh-spw__role--owner">{lead.role}</span>
            </p>
            <p className="psh-spw__leadMeta">{lead.handle} · anasimamia nafasi hii</p>
          </div>
        </div>
      ) : null}

      {team.length ? (
        <>
          <h4 className="psh-spw__h">Timu (roles)</h4>
          <ul className="psh-spw__list">
            {team.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className="psh-spw__row"
                  onClick={() => onOpenProfile?.(m.id)}
                  aria-label={`${m.name} — ${m.role}`}
                >
                  <Avatar user={m} size={40} shape="square" badge={false} />
                  <span className="psh-spw__id">
                    <span className="psh-spw__name">{m.name}</span>
                    <span className="psh-spw__sub">{m.handle}</span>
                  </span>
                  <span className={`psh-spw__role psh-spw__role--${m.role.toLowerCase()}`}>{m.role}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {members.length ? (
        <>
          <h4 className="psh-spw__h">Wanachama</h4>
          <ul className="psh-spw__list">
            {members.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className="psh-spw__row"
                  onClick={() => onOpenProfile?.(m.id)}
                  aria-label={`${m.name} — mwanachama`}
                >
                  <Avatar user={m} size={40} shape="square" badge={false} />
                  <span className="psh-spw__id">
                    <span className="psh-spw__name">{m.name}</span>
                    <span className="psh-spw__sub">{m.handle}</span>
                  </span>
                  <span className="psh-spw__member">{m.role}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {!team.length && !members.length ? (
        <p className="psh-sp__note">
          Orodha ya wanachama inaonekana kwa wanachama pekee. Wewe ni msimamizi — unaweza kualika watu.
        </p>
      ) : null}
    </section>
  )
}

/* ── Matukio (content ya kind 'event') ─────────────────────── */

export function EventRow({ e, onAttend, onOpen, busy = false }) {
  return (
    <article className="psh-spev" data-id={e.id}>
      <span className="psh-spev__ic" aria-hidden="true">
        <IconCalendarAdd size={20} />
      </span>
      <div className="psh-spev__body">
        <button type="button" className="psh-spev__main" onClick={() => onOpen?.(e)}>
          <h4 className="psh-spev__title">{e.media?.caption || e.label || 'Tukio'}</h4>
          <p className="psh-spev__text">{e.text}</p>
          <p className="psh-spev__meta">
            {e.entity?.name} · {e.stats?.reactions ?? 0} reactions · {e.stats?.comments ?? 0} maoni
          </p>
        </button>
        <div className="psh-spev__acts">
          {e.attending ? (
            <span className="psh-spc__done">
              <IconCheck size={13} strokeWidth={2.2} />
              Utahudhuria
            </span>
          ) : (
            <button
              type="button"
              className="psh-btn psh-btn--sm psh-btn--primary"
              onClick={() => onAttend?.(e)}
              disabled={busy}
            >
              {e.cta?.label || 'Nataka kuhudhuria'}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

/* ── Rasilimali (zinahifadhiwa kwa Save Offline ileile) ────── */

export function ResourceRow({ r, onSave, busy = false }) {
  return (
    <article className="psh-sprs" data-id={r.id}>
      <span className="psh-sprs__ic" aria-hidden="true">
        <IconFile size={20} />
      </span>
      <div className="psh-sprs__body">
        <h4 className="psh-sprs__title">{r.label}</h4>
        <p className="psh-sprs__meta">{r.meta}</p>
      </div>
      {r.saved ? (
        <span className="psh-spc__done">
          <IconCheck size={13} strokeWidth={2.2} />
          Imehifadhiwa
        </span>
      ) : (
        <button
          type="button"
          className="psh-btn psh-btn--sm psh-btn--ghost"
          onClick={() => onSave?.(r)}
          disabled={busy}
        >
          <IconDownload size={15} />
          Hifadhi bila mtandao
        </button>
      )}
    </article>
  )
}

/* ── Kiungo cha kikundi → Chat iliyopo (mfumo mmoja) ───────── */

export function GroupLinkRow({ g, onOpen, busy = false }) {
  return (
    <article className="psh-spg" data-id={g.id}>
      <span className="psh-spg__ic" aria-hidden="true">
        <IconGroup size={20} />
      </span>
      <div className="psh-spg__body">
        <h4 className="psh-spg__title">{g.name}</h4>
        <p className="psh-spg__meta">{formatCount(g.members)} wanachama · kikundi cha Chat</p>
      </div>
      <button type="button" className="psh-btn psh-btn--sm psh-btn--ghost" onClick={() => onOpen?.(g)} disabled={busy}>
        <IconChat size={15} />
        {g.joined ? 'Fungua Chat' : 'Jiunge na kikundi'}
      </button>
    </article>
  )
}

/* ── Takwimu halisi (hakuna views/mapato ya kubuni) ────────── */

export function StatGrid({ stats, type = 'place' }) {
  if (!stats) return null
  const rows =
    type === 'channel'
      ? [
          { k: 'followers', label: 'Wafuatiliaji' },
          { k: 'posts', label: 'Machapisho' },
          { k: 'reactions', label: 'Reactions' },
          { k: 'comments', label: 'Maoni' },
          { k: 'shares', label: 'Kushiriki' },
          { k: 'events', label: 'Matukio' },
        ]
      : [
          { k: 'members', label: 'Wanachama' },
          { k: 'posts', label: 'Machapisho' },
          { k: 'events', label: 'Matukio' },
          { k: 'reactions', label: 'Reactions' },
          { k: 'comments', label: 'Maoni' },
          { k: 'shares', label: 'Kushiriki' },
        ]
  return (
    <section className="psh-sps" aria-label="Takwimu halisi">
      <ul className="psh-sps__grid">
        {rows.map((r) => (
          <li key={r.k}>
            <span className="psh-sps__v">{formatCount(stats[r.k] ?? 0)}</span>
            <span className="psh-sps__l">{r.label}</span>
          </li>
        ))}
      </ul>
      <p className="psh-sp__note">{stats.note}</p>
    </section>
  )
}

/* ── Hali tupu (§47) ───────────────────────────────────────── */

export function SpaceEmpty({ title, text, onAction, actionLabel }) {
  return (
    <div className="psh-spe">
      <IconHub size={22} />
      <p className="psh-spe__title">{title}</p>
      {text ? <p className="psh-spe__text">{text}</p> : null}
      {onAction ? (
        <button type="button" className="psh-btn psh-btn--sm psh-btn--primary" onClick={onAction}>
          <IconPlus size={15} />
          {actionLabel}
        </button>
      ) : null}
    </div>
  )
}

/* ── Kadi ndogo ya mapitio (Muhtasari) ────────────────────── */

export function MiniRow({ icon = 'hub', title, text, actionLabel, onAction }) {
  const Icon = icon === 'file' ? IconFile : icon === 'group' ? IconGroup : icon === 'event' ? IconCalendarAdd : IconHub
  return (
    <article className="psh-spmini">
      <span className="psh-spmini__ic" aria-hidden="true">
        <Icon size={18} />
      </span>
      <div className="psh-spmini__body">
        <h4 className="psh-spmini__title">{title}</h4>
        {text ? <p className="psh-spmini__text">{text}</p> : null}
      </div>
      {onAction ? (
        <button type="button" className="psh-spmini__act" onClick={onAction}>
          {actionLabel}
          <IconArrowRight size={14} />
        </button>
      ) : null}
    </article>
  )
}

export { IconChat, IconGroup }
