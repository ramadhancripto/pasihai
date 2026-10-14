// ══════════════════════════════════════════════════════════════
// PASIHAI — CONTACTS BITS (vipande vya UI vinavyotumika tena)
//
// Kanuni ya icons: HALI (verified · friend · blocked · favorite) = icons +
// tooltip/aria-label. VITENDO (Hifadhi · Tuma ujumbe · Ondoa) = maneno.
// ══════════════════════════════════════════════════════════════

import {
  IconBan,
  IconChecks,
  IconInfo,
  IconOffline,
  IconPhone,
  IconRefresh,
  IconSearchSmall,
  IconSpark,
  IconStar,
  IconUser,
  IconChat,
  IconPersonAdd,
} from '../icons.jsx'

const TONE_BG = {
  green: ['var(--av-green-bg)', 'var(--av-green-fg)'],
  blue: ['var(--av-blue-bg)', 'var(--av-blue-fg)'],
  gold: ['var(--av-gold-bg)', 'var(--av-gold-fg)'],
  clay: ['var(--av-clay-bg)', 'var(--av-clay-fg)'],
  plum: ['var(--av-plum-bg)', 'var(--av-plum-fg)'],
  teal: ['var(--av-teal-bg)', 'var(--av-teal-fg)'],
  slate: ['var(--av-slate-bg)', 'var(--av-slate-fg)'],
}

/** Rangi za avatar kutoka tokens (hakuna rangi mpya). */
export function toneStyle(tone) {
  const [bg, fg] = TONE_BG[tone] || TONE_BG.slate
  return { background: bg, color: fg }
}

export function initialsOf(name = '') {
  // Puuza mabano: "Amina (mwalimu)" → "Amina"
  const clean = String(name).replace(/\([^)]*\)/g, ' ').trim() || String(name)
  const parts = clean.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

export function ContactAvatar({ name, tone = 'slate', url = null, size = 42, className = '' }) {
  const letters = initialsOf(name)
  if (url) {
    return (
      <span
        className={`psh-cx-row__ava psh-cx-row__ava--img ${className}`}
        style={{ width: size, height: size, flex: `0 0 ${size}px`, backgroundImage: `url(${url})` }}
        aria-hidden="true"
      />
    )
  }
  return (
    <span
      className={`psh-cx-row__ava ${className}`}
      style={{ ...toneStyle(tone), width: size, height: size, flex: `0 0 ${size}px` }}
      aria-hidden="true"
    >
      {letters}
    </span>
  )
}

/** Alama ndogo za hali — icons pekee; maana kwenye tooltip + aria-label. */
export function Mark({ kind, title, size = 14, lg = false }) {
  const map = {
    verified: { icon: <IconChecks size={size} />, cls: 'psh-cx-mark--blue', label: title || 'Imethibitishwa' },
    phone: { icon: <IconPhone size={size} />, cls: '', label: title || 'Namba imethibitishwa' },
    favorite: { icon: <IconStar size={size} />, cls: 'psh-cx-mark--fav', label: title || 'Kipenzi' },
    blocked: { icon: <IconBan size={size} />, cls: 'psh-cx-mark--red', label: title || 'Umezuiwa' },
    synced: { icon: <IconRefresh size={size} />, cls: '', label: title || 'Imesawazishwa' },
    demo: { icon: <IconSpark size={size} />, cls: '', label: title || 'Data ya majaribio (demo)' },
  }
  const item = map[kind] || map.phone
  return (
    <span className={`psh-cx-mark ${item.cls} ${lg ? 'psh-cx-mark--lg' : ''}`} title={item.label} aria-label={item.label} role="img">
      {item.icon}
    </span>
  )
}

const FRIEND_PILL = {
  friend: { cls: 'friend', label: 'Marafiki' },
  sent: { cls: 'sent', label: 'Ombi limetumwa' },
  received: { cls: 'received', label: 'Ombi limepokelewa' },
  blocked: { cls: 'blocked', label: 'Umezuiwa' },
  not_friend: { cls: 'noaccount', label: 'Ongeza rafiki' },
}

export function FriendPill({ state }) {
  if (!state) return null
  const p = FRIEND_PILL[state]
  if (!p) return null
  return <span className={`psh-cx-pill psh-cx-pill--${p.cls}`}>{p.label}</span>
}

export function TabBar({ tabs, active, onChange }) {
  return (
    <nav className="psh-cx__tabs" aria-label="Vichujio vya contacts">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`psh-cx-tab ${active === t.id ? 'is-on' : ''}`}
          aria-pressed={active === t.id}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          <span className="psh-cx-tab__n">{t.count}</span>
        </button>
      ))}
    </nav>
  )
}

export function SearchBar({ value, onChange, placeholder = 'Tafuta jina, username au namba' }) {
  return (
    <div className="psh-cx__search">
      <IconSearchSmall size={16} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  )
}

/** Safu moja ya contact — avatar · jina · username/namba · hali · vitendo. */
export function ContactRow({ item, onOpen, onMessage }) {
  const subtitle = []
  if (item.accountMissing) {
    // Akaunti ilifutwa: hatuonyeshi jina la akaunti wala namba (haipo).
  } else {
    if (item.accountHandle) subtitle.push(item.accountHandle)
    else if (item.accountId) subtitle.push('ChatHai')
    if (item.phoneE164) subtitle.push(item.phoneMasked)
    if (!subtitle.length) subtitle.push('Hakuna namba')
  }

  return (
    <li>
      <div className="psh-cx-row" onClick={() => onOpen?.(item)} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.(item) } }}>
        <ContactAvatar name={item.displayName} tone={item.accountTone} url={item.avatarSnapshotUrl} />
        <span className="psh-cx-row__body">
          <span className="psh-cx-row__name">
            <span className="psh-cx-row__nametext">{item.displayName}</span>
            {item.accountVerified ? <Mark kind="verified" /> : null}
            {item.isFavorite ? <Mark kind="favorite" /> : null}
          </span>
          <span className="psh-cx-row__meta">
            {item.accountMissing
              ? <span className="psh-cx-pill psh-cx-pill--demo">Akaunti haipatikani</span>
              : null}
            <span className="psh-cx-row__metatext">{subtitle.join(' · ')}</span>
            {item.friendState && !item.accountMissing ? <FriendPill state={item.friendState} /> : null}
          </span>
        </span>
        <span className="psh-cx-row__side">
          {item.accountId ? (
            <button
              type="button"
              className="psh-cx-btn psh-cx-btn--icon psh-cx-btn--sm"
              title="Tuma ujumbe"
              aria-label={`Tuma ujumbe kwa ${item.displayName}`}
              onClick={(e) => { e.stopPropagation(); onMessage?.(item) }}
            >
              <IconChat size={16} />
            </button>
          ) : null}
        </span>
      </div>
    </li>
  )
}

/** Hali: loading · error · offline · empty · hakuna matokeo. */
export function StateBlock({ kind, title, body, onRetry, onPrimary, primaryLabel, secondary, onSecondary }) {
  const icons = {
    loading: <IconRefresh size={20} />,
    error: <IconOffline size={20} />,
    offline: <IconOffline size={20} />,
    empty: <IconPersonAdd size={20} />,
    nomatch: <IconSearchSmall size={20} />,
  }
  return (
    <div className="psh-cx-state" role={kind === 'error' ? 'alert' : 'status'}>
      <span className="psh-cx-state__ico">{icons[kind] || <IconInfo size={20} />}</span>
      <b>{title}</b>
      {body ? <span>{body}</span> : null}
      <span className="psh-cx-state__actions">
        {onPrimary ? (
          <button type="button" className="psh-cx-btn psh-cx-btn--primary" onClick={onPrimary}>{primaryLabel || 'Endelea'}</button>
        ) : null}
        {onRetry ? (
          <button type="button" className="psh-cx-btn" onClick={onRetry}>
            <IconRefresh size={15} /> Jaribu tena
          </button>
        ) : null}
        {onSecondary ? (
          <button type="button" className="psh-cx-btn psh-cx-btn--ghost" onClick={onSecondary}>{secondary}</button>
        ) : null}
      </span>
    </div>
  )
}

export function Banner({ kind = 'info', icon = null, children, action = null }) {
  const cls = kind === 'off' ? 'psh-cx-banner--off' : kind === 'err' ? 'psh-cx-banner--err' : kind === 'demo' ? 'psh-cx-banner--demo' : ''
  return (
    <div className={`psh-cx-banner ${cls}`} role={kind === 'err' ? 'alert' : 'status'}>
      {icon || <IconInfo size={15} />}
      <span style={{ flex: '1 1 auto' }}>{children}</span>
      {action}
    </div>
  )
}

export function Note({ children, icon = null }) {
  return (
    <p className="psh-cx-note">
      {icon || <IconInfo size={15} />}
      <span>{children}</span>
    </p>
  )
}

export function Field({ label, children, hint, error }) {
  return (
    <div className="psh-cx-field">
      <span className="psh-cx-field__label">{label}</span>
      {children}
      {hint ? <span className="psh-cx-hint">{hint}</span> : null}
      {error ? <span className="psh-cx-hint psh-cx-hint--err">{error}</span> : null}
    </div>
  )
}

export function KV({ k, v }) {
  return (
    <div className="psh-cx-kv">
      <span className="psh-cx-kv__k">{k}</span>
      <span className="psh-cx-kv__v">{v}</span>
    </div>
  )
}

export function VerifiedMark({ on, title }) {
  return on ? <Mark kind="verified" size={15} lg title={title} /> : null
}
