// ══════════════════════════════════════════════════════════════
// PASIHAI — UI PRIMITIVES (Hatua 0)
// Avatar, Identity, Chip, IconButton, MediaFrame, Segmented, Dropdown.
// Kila kitu kinategemea tokens zilizoainishwa — hakuna rangi ya moja kwa moja.
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import {
  IconCheck,
  IconSpark,
  IconMegaphone,
  IconHub,
  IconStorefront,
  IconPlus,
} from './icons.jsx'

/* ── Initials ─────────────────────────────────────────────── */

export function initials(name = '') {
  const parts = name.replace(/[^\p{L}\s.]/gu, ' ').trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

/* ── Badge ya aina ya entity ──────────────────────────────── */
// Badge hii inafanya identity system iwe sawa kila mahali:
// Rafiki (hakuna badge), Channel, Hub, Biashara, Mbunifu.

const BADGE_ICON = {
  channel: IconMegaphone,
  hub: IconHub,
  business: IconStorefront,
  creator: IconSpark,
}

export function EntityBadge({ type, size = 16 }) {
  if (type === 'channel' && false) return null
  const Icon = BADGE_ICON[type]
  const isCreator = type === 'creator'
  if (!Icon && !isCreator) return null
  return (
    <span
      className={`psh-badge psh-badge--${type}`}
      style={{ width: size, height: size }}
      title={
        type === 'channel'
          ? 'Channel'
          : type === 'hub'
            ? 'Hub'
            : type === 'business'
              ? 'Biashara'
              : 'Mbunifu'
      }
    >
      {isCreator ? (
        <span className="psh-badge__spark" />
      ) : (
        <Icon size={size - 6} strokeWidth={2} />
      )}
    </span>
  )
}

/* ── Avatar ───────────────────────────────────────────────── */

export function Avatar({ user, size = 40, shape = 'square', badge = true, className = '' }) {
  if (!user) return null
  const tone = user.avatarTone || 'green'
  const dim = typeof size === 'number' ? `${size}px` : size
  return (
    <span
      className={`psh-avatar psh-avatar--${shape} psh-avatar--tone-${tone} ${className}`}
      style={{ '--av-size': dim, fontSize: `calc(${dim} * 0.36)` }}
      aria-hidden="true"
    >
      <span className="psh-avatar__initials">{initials(user.name)}</span>
      {badge && user.type && user.type !== 'friend' && user.type !== 'you' ? (
        <EntityBadge type={user.type} size={Math.max(15, Math.round(toNum(dim) * 0.4))} />
      ) : null}
    </span>
  )
}

function toNum(v) {
  if (typeof v === 'number') return v
  const n = parseFloat(String(v))
  return Number.isFinite(n) ? n : 40
}

/* ── IconButton ───────────────────────────────────────────── */

export function IconButton({ label, children, badge, className = '', ...rest }) {
  return (
    <button type="button" className={`psh-icobtn ${className}`} aria-label={label} title={label} {...rest}>
      {children}
      {badge ? <span className="psh-icobtn__dot" aria-hidden="true" /> : null}
    </button>
  )
}

/* ── Button (mfumo MMOJA wa vitufe) ───────────────────────────
   Aina: primary · soft · ghost · quiet · done · danger (default = secondary)
   Ukubwa: sm (34) · md (40) · lg (48)
   `loading` → kitufe kinajifunga kwa muda, spinner inaonekana, label inabaki
   kwa screen-reader (aria-busy + aria-live). Hakuna kubofya kwenye hali hiyo. */
export function Button({
  variant = 'secondary',
  size = 'md',
  icon = null,
  block = false,
  loading = false,
  disabled = false,
  loadingLabel,
  className = '',
  children,
  ...rest
}) {
  const cls = [
    'psh-btn',
    variant !== 'secondary' ? `psh-btn--${variant}` : '',
    size !== 'md' ? `psh-btn--${size}` : '',
    block ? 'psh-btn--block' : '',
    loading ? 'is-loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <button
      type="button"
      className={cls}
      aria-busy={loading || undefined}
      aria-disabled={disabled || loading || undefined}
      disabled={disabled || loading}
      {...rest}
    >
      {icon}
      <span className="psh-btn__label">{loading && loadingLabel ? loadingLabel : children}</span>
    </button>
  )
}

/* ── Skeleton (kadi inayopakia — umbo lile lile la kadi halisi) ── */
export function Skeleton({ lines = 2, block = true, ava = true, className = '' }) {
  return (
    <div className={`psh-skel ${className}`} aria-hidden="true">
      {ava ? (
        <div className="psh-skel__row">
          <span className="psh-skel__ava" />
          <span className="psh-skel__lines">
            <span className="psh-skel__line psh-skel__line--w40" />
            <span className="psh-skel__line psh-skel__line--w70" />
          </span>
        </div>
      ) : null}
      {lines > 0 ? <span className="psh-skel__line psh-skel__line--w90" /> : null}
      {lines > 1 ? <span className="psh-skel__line psh-skel__line--w60" /> : null}
      {block ? <div className="psh-skel__block" /> : null}
    </div>
  )
}

/* ── Chip ─────────────────────────────────────────────────── */

export function Chip({ children, tone = 'neutral', className = '', ...rest }) {
  return (
    <span className={`psh-chip psh-chip--${tone} ${className}`} {...rest}>
      {children}
    </span>
  )
}

/* ── Identity: mstari wa kwanza wa kila content ───────────── */
// Umbizo:  ○ Jina    |    Aina · muda

const VERIFIED = (props) => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-label="Imethibitishwa" role="img" {...props}>
    <path
      fill="var(--c-blue)"
      d="M12 2.6l2.35 1.72 2.9-.18 1.06 2.72 2.5 1.5-.86 2.78.86 2.78-2.5 1.5-1.06 2.72-2.9-.18L12 21.4l-2.35-1.72-2.9.18-1.06-2.72-2.5-1.5.86-2.78-.86-2.78 2.5-1.5L6.75 4.14l2.9.18Z"
    />
    <path
      fill="#fff"
      d="M10.9 15.1l-2.5-2.5 1.1-1.1 1.4 1.4 3.6-3.7 1.1 1.1z"
    />
  </svg>
)

/* ── EntityPill — pill ya identity (Rafiki · Channel · Hub · Biashara ·
   Mbunifu · Wewe). Muundo mmoja; rangi + doa vinafuata aina ya entity.
   Identity ≠ Relationship ≠ Visibility ≠ Permission — pill inaonyesha
   AINA ya entity pekee (kama ilivyo kwenye data ya majaribio).           */

export function EntityPill({ type = 'friend', label, className = '' }) {
  if (!label) return null
  return (
    <span className={`psh-chip psh-chip--ent psh-chip--ent-${type} ${className}`}>
      <span className="psh-chip__dot" aria-hidden="true" />
      {label}
    </span>
  )
}

export function Identity({
  user,
  relationship,
  time,
  subtitle,
  pill = null,
  size = 40,
  showHandle = false,
  compact = false,
  onOpen,
}) {
  if (!user) return null
  const rel = relationship || defaultRelationship(user)
  return (
    <div className={`psh-ident ${compact ? 'psh-ident--compact' : ''}`}>
      <button
        type="button"
        className="psh-ident__ava"
        onClick={onOpen}
        aria-label={`Fungua wasifu wa ${user.name}`}
      >
        <Avatar user={user} size={size} />
      </button>
      <div className="psh-ident__text">
        <div className="psh-ident__top">
          <button type="button" className="psh-ident__name" onClick={onOpen}>
            {user.name}
          </button>
          {user.verified ? <VERIFIED /> : null}
          {pill}
        </div>
        <div className="psh-ident__meta">
          {rel ? (
            <span className={`psh-ident__rel psh-ident__rel--${user.type}`}>{rel}</span>
          ) : null}
          {time ? (
            <>
              <span className="psh-ident__sep" aria-hidden="true">
                ·
              </span>
              <span className="psh-ident__time">{time}</span>
            </>
          ) : null}
          {showHandle && user.handle ? (
            <>
              <span className="psh-ident__sep" aria-hidden="true">
                ·
              </span>
              <span className="psh-ident__time">{user.handle}</span>
            </>
          ) : null}
          {subtitle ? (
            <>
              <span className="psh-ident__sep" aria-hidden="true">
                ·
              </span>
              <span className="psh-ident__time">{subtitle}</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/* RELATIONSHIP ya kawaida pale entity haitoi moja.
   Hii NI TOFAUTI na ROLE: role inasema entity ni nini (`entityRoles`),
   relationship inasema mimi na yeye tuko katika uhusiano gani. */
const REL_BY_TYPE = {
  friend: 'Rafiki',
  channel: 'Unafuatilia',
  hub: 'Umejiunga',
  business: 'Unafuatilia',
  creator: 'Unafuatilia',
  you: 'Wewe',
}

export function defaultRelationship(user) {
  if (!user) return ''
  return user.relationship ?? REL_BY_TYPE[user.type] ?? 'Mtumiaji'
}

/* ── MediaFrame: nafasi ya picha/video ya majaribio ───────── */
// Prototype hii haitumii picha za interneti. Tunatumia fremu ya hila
// inayoonyesha aina ya media, uwiano na maelezo.

export function MediaFrame({
  tone = 'green',
  ratio = '4 / 3',
  icon,
  caption,
  overlay,
  children,
  rounded = true,
  showCaption = true,
}) {
  return (
    <div
      className={`psh-media ${rounded ? 'psh-media--rounded' : ''} psh-media--tone-${tone}`}
      style={{ aspectRatio: ratio }}
      role="img"
      aria-label={caption || 'Media'}
    >
      <div className="psh-media__glyph" aria-hidden="true">
        {icon}
      </div>
      {overlay}
      {caption && showCaption ? <div className="psh-media__caption">{caption}</div> : null}
      {children}
    </div>
  )
}

/* ── Waveform (kwa sauti) ─────────────────────────────────── */

export function Waveform({ bars = [], progress = 0.35, tone = 'blue' }) {
  return (
    <div className={`psh-wave psh-wave--${tone}`} aria-hidden="true">
      {bars.map((h, i) => {
        const played = i / bars.length <= progress
        return (
          <span
            key={i}
            className={`psh-wave__bar ${played ? 'is-played' : ''}`}
            style={{ height: `${Math.max(10, h + 12)}%` }}
          />
        )
      })}
    </div>
  )
}

/* ── Segmented (kwa view mode n.k.) ───────────────────────── */

export function Segmented({ options, value, onChange, name }) {
  return (
    <div className="psh-seg" role="radiogroup" aria-label={name}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          className={`psh-seg__item ${value === o.id ? 'is-active' : ''}`}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ── Radio row (kwa menus) ────────────────────────────────── */

export function CheckRow({ checked, label, hint, onSelect, radio = false }) {
  return (
    <button
      type="button"
      className={`psh-checkrow ${checked ? 'is-checked' : ''}`}
      onClick={onSelect}
      role={radio ? 'radio' : 'menuitemcheckbox'}
      aria-checked={checked}
    >
      <span className="psh-checkrow__text">
        <span className="psh-checkrow__label">{label}</span>
        {hint ? <span className="psh-checkrow__hint">{hint}</span> : null}
      </span>
      <span className={`psh-checkrow__mark ${radio ? 'is-radio' : ''}`} aria-hidden="true">
        {checked ? <IconCheck size={14} strokeWidth={2.4} /> : null}
      </span>
    </button>
  )
}

/* ── Dropdown / Popover ───────────────────────────────────── */
// Inatumika kwa More menu na Content filter.

export function Dropdown({ trigger, children, align = 'right', width = 288, label = 'Menyu' }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        wrapRef.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const triggerEl =
    typeof trigger === 'function'
      ? trigger({ open, toggle: () => setOpen((v) => !v) })
      : null

  return (
    <div className="psh-dd" ref={wrapRef}>
      {triggerEl}
      {open ? (
        <div
          className={`psh-dd__panel psh-dd__panel--${align}`}
          style={{ width }}
          role="menu"
          aria-label={label}
        >
          {typeof children === 'function' ? children({ close: () => setOpen(false) }) : children}
        </div>
      ) : null}
    </div>
  )
}

/* ── EntityAction — Action layer ──────────────────────────────
   Kitendo hufuata AINA ya entity (Person → Ongeza rafiki · Channel → Fuata ·
   Hub → Jiunge · Biashara → Fuata/Wasiliana) na hubadilika pale uhusiano
   unapokuwepo tayari (Fuata → Unafuatilia · Jiunge → Umejiunga).             */

export function EntityAction({ vocab, isDone = false, onClick, className = '', busy = false, disabled = false }) {
  if (!vocab) return null
  const off = busy || disabled
  return (
    <button
      type="button"
      className={`psh-btn psh-btn--sm ${isDone ? 'psh-btn--done' : 'psh-btn--primary'} ${className}`}
      aria-pressed={isDone}
      aria-busy={busy || undefined}
      disabled={off}
      onClick={onClick}
    >
      {busy ? (
        <span className="psh-btn__spinner" aria-hidden="true" />
      ) : isDone ? (
        <IconCheck size={14} strokeWidth={2.2} />
      ) : null}
      {isDone ? vocab.done : vocab.action}
    </button>
  )
}

/* ── AvatarPill: kitufe cha kuongeza status ───────────────── */

export function PlusBadge() {
  return (
    <span className="psh-plusbadge" aria-hidden="true">
      <IconPlus size={12} strokeWidth={2.6} />
    </span>
  )
}
