// ══════════════════════════════════════════════════════════════
// PASIHAI — PANELS (Hatua 1)
// Notifications · Profile/Account · Create · More (+ View mode,
// Mapendeleo ya mkondo, Mapendeleo ya maudhui, Zilizohifadhiwa)
// ══════════════════════════════════════════════════════════════

import { useState } from 'react'
import { accountService } from '../services/accountService.js'
import { notificationService } from '../services/notificationService.js'
import { settingsService } from '../services/settingsService.js'
import useAsyncData from '../hooks/useAsyncData.js'
import {
  Avatar,
  Chip,
  CheckRow,
  EntityAction,
  Identity,
  Segmented,
  defaultRelationship,
} from '../components/ui.jsx'
import {
  IconBell,
  IconComment,
  IconHeart,
  IconHub,
  IconMegaphone,
  IconLive,
  IconStorefront,
  IconEye,
  IconSliders,
  IconSpark,
  IconBookmark,
  IconGauge,
  IconRefresh,
  IconSettings,
  IconCheck,
  IconPlus,
  IconPhoto,
  IconVideo,
  IconReel,
  IconMic,
  IconPoll,
  IconUser,
  IconGlobe,
  IconArrowRight,
  IconInfo,
} from '../components/icons.jsx'

/* ── Switch ───────────────────────────────────────────────── */

export function Switch({ on, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`psh-switch ${on ? 'is-on' : ''}`}
      onClick={() => onChange(!on)}
    >
      <span className="psh-switch__knob" />
    </button>
  )
}

/* ── Taarifa (Notifications) ──────────────────────────────── */

const N_ICON = {
  comment: IconComment,
  hub: IconHub,
  megaphone: IconMegaphone,
  heart: IconHeart,
  live: IconLive,
  store: IconStorefront,
  none: null,
}

export function NotificationsPanel({ onOpenProfile }) {
  const [scope, setScope] = useState('zote')
  // Kuchuja (scope) na kuunganisha na entity ni kazi ya service.
  const list = useAsyncData(() => notificationService.list({ scope }), [scope])
  const unread = useAsyncData(() => notificationService.countUnread(), [])

  if (!list || unread == null) return null

  return (
    <div className="psh-panelstack">
      <div className="psh-panelstack__toolbar">
        <Segmented
          name="Kichujio cha taarifa"
          value={scope}
          onChange={setScope}
          options={[
            { id: 'zote', label: 'Zote' },
            { id: 'mpya', label: 'Mpya' },
          ]}
        />
        <span className="psh-panelstack__count">{unread} mpya</span>
      </div>

      <ul className="psh-notifs">
        {list.map((n) => {
          const user = n.user
          const Icon = N_ICON[n.icon] || IconBell
          return (
            <li key={n.id} className={`psh-notif ${n.unread ? 'is-unread' : ''}`}>
              <div className="psh-notif__ava">
                <Avatar user={user} size={40} />
                {Icon ? (
                  <span className={`psh-notif__kind psh-notif__kind--${n.type}`}>
                    <Icon size={12} strokeWidth={2.1} />
                  </span>
                ) : null}
              </div>
              <div className="psh-notif__body">
                <p className="psh-notif__text">{n.text}</p>
                <p className="psh-notif__meta">
                  <span className={`psh-ident__rel psh-ident__rel--${user?.type}`}>
                    {defaultRelationship(user)}
                  </span>
                  <span className="psh-ident__sep">·</span>
                  {n.time}
                </p>
              </div>
              {n.unread ? <span className="psh-notif__dot" aria-label="Haijasomwa" /> : null}
              <button
                type="button"
                className="psh-notif__open"
                onClick={() => onOpenProfile(n.userId)}
                aria-label={`Fungua ${user?.name}`}
              />
            </li>
          )
        })}
        {list.length === 0 ? (
          <li className="psh-empty">
            <IconBell size={22} />
            <p>Hakuna taarifa mpya kwa sasa.</p>
          </li>
        ) : null}
      </ul>
    </div>
  )
}

/* ── Wasifu / Akaunti ─────────────────────────────────────── */

export function ProfilePanel({ userId = 'me', onToast, onInteract }) {
  // Wasifu unatoka kwa account service (service inajua 'me' vs entity nyingine).
  // Hooks zote ziko mbele ya early-return — mpangilio wa hooks hauvunjiki.
  const user = useAsyncData(() => accountService.getProfile(userId), [userId])
  const vocab = useAsyncData(() => accountService.getEntityVocabulary(), [])
  const [acted, setActed] = useState(false)

  if (!user) return null

  const isMe = userId === 'me'
  const role = vocab?.roles?.[user.type] ?? null
  const action = vocab?.actions?.[user.type] ?? null
  const myRel = user.relationship ?? defaultRelationship(user)
  const stats = isMe
    ? user.stats
    : [
        { key: 'friends', label: 'Marafiki', value: user.friends ?? null, hide: user.friends == null },
        { key: 'following', label: 'Anafuatilia', value: user.following ?? null, hide: user.following == null },
        { key: 'followers', label: 'Wanaomfuatilia', value: user.followers ?? null, hide: user.followers == null },
        { key: 'members', label: 'Wanachama', value: user.members ?? null, hide: user.members == null },
      ].filter((s) => !s.hide)

  return (
    <div className="psh-profile">
      <div className="psh-profile__hero">
        <span className="psh-profile__cover" aria-hidden="true" />
        <div className="psh-profile__top">
          <Avatar user={user} size={78} badge />
          <div className="psh-profile__meta">
            <h3 className="psh-profile__name">{user.name}</h3>
            <p className="psh-profile__line">
              {role ? <span className="psh-profile__role">{role}</span> : null}
              <span className="psh-ident__sep">·</span>
              <span>{user.handle}</span>
            </p>
            {!isMe && myRel ? (
              <p className="psh-profile__rel">{myRel}</p>
            ) : null}
          </div>
        </div>
        <p className="psh-profile__bio">{user.bio}</p>
        <p className="psh-profile__since">{user.since}</p>
      </div>

      <ul className="psh-profile__stats">
        {stats.map((s) => (
          <li key={s.key} className={s.value === 0 ? 'is-zero' : ''}>
            <strong>{s.value}</strong>
            <span>{s.label}</span>
          </li>
        ))}
      </ul>

      {/* Kumbuka: mtumiaji wa kawaida anaweza kuwa na followers 0.
          UI haionyeshi hii kama tatizo — inaonyesha aina mbalimbali za uhusiano. */}
      {isMe && user.followers === 0 ? (
        <p className="psh-profile__note">
          <IconInfo size={16} />
          Huna followers bado — na hilo ni sawa. Home yako ina maana kamili kwa marafiki,
          channels na Spaces.
        </p>
      ) : null}

      <div className="psh-profile__actions">
        {isMe ? (
          <>
            <button type="button" className="psh-btn psh-btn--primary" onClick={() => onToast('Hariri wasifu — itajengwa baadaye')}>
              Hariri wasifu
            </button>
            <button type="button" className="psh-btn" onClick={() => onToast('Kiungo cha wasifu kimenakiliwa (mfano)')}>
              Shiriki wasifu
            </button>
          </>
        ) : (
          <>
            <EntityAction
              vocab={action}
              isDone={acted || myRel === action?.done}
              onClick={() => {
                setActed(true)
                onInteract?.(userId, 'relate')
                onToast(`${action?.done ?? 'Imekamilika'}: ${user.name}`)
              }}
            />
            {action?.secondary ? (
              <button
                type="button"
                className="psh-btn"
                onClick={() => onToast(`${action.secondary} — utajengwa hatua ijayo`)}
              >
                {action.secondary}
              </button>
            ) : null}
          </>
        )}
      </div>

      {isMe ? (
        <ul className="psh-profile__list">
          {user.tabs.map((t, i) => (
            <li key={t}>
              <button type="button" className={i === 0 ? 'is-active' : ''} onClick={() => onToast(`${t} — itajengwa baadaye`)}>
                {t}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="psh-kv">
          {user.subtitle ? (
            <li>
              <span>Aina</span>
              <strong>{user.subtitle}</strong>
            </li>
          ) : null}
          {user.category ? (
            <li>
              <span>Kategoria</span>
              <strong>{user.category}</strong>
            </li>
          ) : null}
          {user.location ? (
            <li>
              <span>Mahali</span>
              <strong>{user.location}</strong>
            </li>
          ) : null}
          {user.spaces ? (
            <li>
              <span>Spaces</span>
              <strong>{user.spaces.join(', ')}</strong>
            </li>
          ) : null}
          {user.rating ? (
            <li>
              <span>Kiwango</span>
              <strong>{user.rating} / 5</strong>
            </li>
          ) : null}
        </ul>
      )}
    </div>
  )
}

/* ── Create ───────────────────────────────────────────────── */

export const CREATE_ITEMS = [
  { id: 'post', label: 'Chapisho', Icon: IconPlus, hint: 'Maandishi' },
  { id: 'photo', label: 'Picha', Icon: IconPhoto, hint: '' },
  { id: 'video', label: 'Video', Icon: IconVideo, hint: '' },
  { id: 'reel', label: 'Reel', Icon: IconReel, hint: 'Video fupi' },
  { id: 'story', label: 'Story', Icon: IconGlobe, hint: 'Saa 24' },
  { id: 'status', label: 'Status', Icon: IconUser, hint: '' },
  { id: 'live', label: 'Live', Icon: IconLive, hint: 'Papo hapo' },
  { id: 'poll', label: 'Kura', Icon: IconPoll, hint: '' },
]

export function CreatePanel({ onToast }) {
  return (
    <div className="psh-create">
      <p className="psh-create__lead">
        Anza kitu kipya. Kila kitu unachochapisha kitaonekana kwa hadhira inayofaa — marafiki,
        wanaokufuatilia au channel yako.
      </p>
      <ul className="psh-create__grid">
        {CREATE_ITEMS.map(({ id, label, Icon, hint }) => (
          <li key={id}>
            <button
              type="button"
              className="psh-create__item"
              onClick={() => onToast(`${label}: itajengwa baadaye kwenye prototype`)}
            >
              <span className="psh-create__icon">
                <Icon size={22} />
              </span>
              <span className="psh-create__label">{label}</span>
              {hint ? <span className="psh-create__hint">{hint}</span> : null}
            </button>
          </li>
        ))}
      </ul>
      <p className="psh-create__foot">
        <IconInfo size={16} />
        Prototype hii haichapishi kitu bado — hakuna backend.
      </p>
    </div>
  )
}

/* ── More (Home pekee) ────────────────────────────────────── */

export function MorePanel({ viewMode, onOpenPanel, onViewMode, onToast, dataSaver, setDataSaver, onRefresh }) {
  // Labels za muonekano zinatoka kwa settings service.
  const modes = useAsyncData(() => settingsService.getViewModes(), [])

  if (!modes) return null

  const vm = modes.find((v) => v.id === viewMode)
  return (
    <ul className="psh-menu">
      <li>
        <button type="button" className="psh-menu__row" onClick={() => onOpenPanel('viewmode')}>
          <span className="psh-menu__icon">
            <IconEye size={20} />
          </span>
          <span className="psh-menu__text">
            <span className="psh-menu__label">Muonekano (View mode)</span>
            <span className="psh-menu__hint">{vm?.label}</span>
          </span>
          <IconArrowRight size={18} />
        </button>
      </li>
      <li>
        <button type="button" className="psh-menu__row" onClick={() => onOpenPanel('feedprefs')}>
          <span className="psh-menu__icon">
            <IconSliders size={20} />
          </span>
          <span className="psh-menu__text">
            <span className="psh-menu__label">Mapendeleo ya mkondo</span>
            <span className="psh-menu__hint">Mpangilio na kile kinachoonekana</span>
          </span>
          <IconArrowRight size={18} />
        </button>
      </li>
      <li>
        <button type="button" className="psh-menu__row" onClick={() => onOpenPanel('contentprefs')}>
          <span className="psh-menu__icon">
            <IconSpark size={20} />
          </span>
          <span className="psh-menu__text">
            <span className="psh-menu__label">Mapendeleo ya maudhui</span>
            <span className="psh-menu__hint">Maslahi unayopenda kuona</span>
          </span>
          <IconArrowRight size={18} />
        </button>
      </li>
      <li>
        <button type="button" className="psh-menu__row" onClick={() => onOpenPanel('saved')}>
          <span className="psh-menu__icon">
            <IconBookmark size={20} />
          </span>
          <span className="psh-menu__text">
            <span className="psh-menu__label">Zilizohifadhiwa</span>
            <span className="psh-menu__hint">3 vitu</span>
          </span>
          <IconArrowRight size={18} />
        </button>
      </li>

      <li className="psh-menu__sep" aria-hidden="true" />

      <li>
        <div className="psh-menu__row psh-menu__row--static">
          <span className="psh-menu__icon">
            <IconGauge size={20} />
          </span>
          <span className="psh-menu__text">
            <span className="psh-menu__label">Kuokoa data</span>
            <span className="psh-menu__hint">Punguza video kiotomatiki</span>
          </span>
          <Switch on={dataSaver} onChange={setDataSaver} label="Kuokoa data" />
        </div>
      </li>
      <li>
        <button
          type="button"
          className="psh-menu__row"
          onClick={() => {
            onRefresh?.()
            onToast('Mkondo umesasishwa (mfano)')
          }}
        >
          <span className="psh-menu__icon">
            <IconRefresh size={20} />
          </span>
          <span className="psh-menu__text">
            <span className="psh-menu__label">Sasisha</span>
          </span>
        </button>
      </li>
      <li>
        <button
          type="button"
          className="psh-menu__row"
          onClick={() => onToast('Mipangilio — itajengwa baadaye')}
        >
          <span className="psh-menu__icon">
            <IconSettings size={20} />
          </span>
          <span className="psh-menu__text">
            <span className="psh-menu__label">Mipangilio</span>
          </span>
        </button>
      </li>
      <li className="psh-menu__note">
        <IconInfo size={16} />
        Hii ni menyu ya Home pekee — si urambazaji wa jumla. Urambazaji mkuu uko chini.
      </li>
    </ul>
  )
}

/* ── View mode ────────────────────────────────────────────── */

export function ViewModePanel({ value, onChange, onToast }) {
  // Orodha ya view modes inatoka kwa settings service.
  const modes = useAsyncData(() => settingsService.getViewModes(), [])
  // `picked` = chaguo kwenye paneli hii; bila hiyo, thamani ya sasa inatumika.
  const [picked, setPicked] = useState(null)

  if (!modes) return null

  const selected = picked ?? value

  return (
    <div className="psh-panelstack">
      <p className="psh-panelstack__lead">
        Chagua jinsi maudhui yanavyoonyeshwa. Automatic inachagua muonekano unaofaa kwa kila
        chapisho — kwa hivyo hauhitaji kuchagua mwenyewe kila mara.
      </p>
      <ul className="psh-vmodes">
        {modes.map((m) => {
          const active = selected === m.id
          return (
            <li key={m.id}>
              <button
                type="button"
                className={`psh-vmode ${active ? 'is-active' : ''}`}
                onClick={() => setPicked(m.id)}
                role="radio"
                aria-checked={active}
              >
                <span className="psh-vmode__mark" aria-hidden="true">
                  {active ? <IconCheck size={14} strokeWidth={2.4} /> : null}
                </span>
                <span className="psh-vmode__text">
                  <span className="psh-vmode__label">{m.label}</span>
                  <span className="psh-vmode__desc">{m.desc}</span>
                </span>
                <ViewModeGlyph id={m.id} />
              </button>
            </li>
          )
        })}
      </ul>
      <div className="psh-panelstack__actions">
        <button
          type="button"
          className="psh-btn psh-btn--primary"
          onClick={() => {
            onChange(selected)
            onToast(`Muonekano: ${modes.find((m) => m.id === selected)?.label}`)
          }}
        >
          Tumia muonekano huu
        </button>
        <button type="button" className="psh-btn" onClick={() => setPicked('auto')}>
          Rudisha kwa Automatic
        </button>
      </div>
      <p className="psh-panelstack__foot">
        <IconInfo size={16} />
        Athari ya muonekano kwenye mkondo itaonekana wazi Hatua 4. Hivi sasa chaguo linahifadhiwa
        kwenye kikao hiki.
      </p>
    </div>
  )
}

function ViewModeGlyph({ id }) {
  return (
    <span className={`psh-vglyph psh-vglyph--${id}`} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  )
}

/* ── Mapendeleo ya mkondo ─────────────────────────────────── */

export function FeedPrefsPanel({ onToast }) {
  // Mapendeleo yanatoka kwa settings service. Thamani za default zinatoka
  // kwenye data; `sort`/`showOverrides` ni mabadiliko ya mtumiaji kwenye paneli hii.
  const prefs = useAsyncData(() => settingsService.getFeedPreferences(), [])
  const [sort, setSort] = useState(null)
  const [showOverrides, setShowOverrides] = useState({})

  if (!prefs) return null

  const activeSort = sort ?? prefs.sort[0]?.id
  const show = Object.fromEntries(prefs.show.map((s) => [s.id, showOverrides[s.id] ?? s.on]))

  return (
    <div className="psh-panelstack">
      <h3 className="psh-panelstack__h">Mpangilio</h3>
      <ul className="psh-checkrows">
        {prefs.sort.map((s) => (
          <li key={s.id}>
            <CheckRow
              radio
              checked={activeSort === s.id}
              label={s.label}
              hint={s.desc}
              onSelect={() => setSort(s.id)}
            />
          </li>
        ))}
      </ul>

      <h3 className="psh-panelstack__h">Kile kinachoonekana kwenye mkondo</h3>
      <ul className="psh-switchrows">
        {prefs.show.map((s) => (
          <li key={s.id}>
            <span className="psh-switchrows__label">{s.label}</span>
            <Switch
              on={show[s.id]}
              onChange={(v) => {
                setShowOverrides((prev) => ({ ...prev, [s.id]: v }))
                onToast(`${s.label}: ${v ? 'imewashwa' : 'imezimwa'}`)
              }}
              label={s.label}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── Mapendeleo ya maudhui ────────────────────────────────── */

const INTERESTS = ['Teknolojia', 'Elimu', 'Biashara', 'Burudani', 'Michezo', 'Habari', 'Jumuiya', 'Kupika', 'Sanaa', 'Kilimo']

export function ContentPrefsPanel({ onToast }) {
  const [picked, setPicked] = useState(['Teknolojia', 'Elimu', 'Habari'])
  const toggle = (t) => {
    setPicked((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))
  }
  return (
    <div className="psh-panelstack">
      <p className="psh-panelstack__lead">
        Chagua maslahi unayopenda. Hii inasaidia Home kuonyesha maudhui yanayofaa — bila kuacha
        marafiki nyuma.
      </p>
      <ul className="psh-chips">
        {INTERESTS.map((t) => (
          <li key={t}>
            <button
              type="button"
              className={`psh-chipbtn ${picked.includes(t) ? 'is-on' : ''}`}
              aria-pressed={picked.includes(t)}
              onClick={() => toggle(t)}
            >
              {picked.includes(t) ? <IconCheck size={14} strokeWidth={2.4} /> : null}
              {t}
            </button>
          </li>
        ))}
      </ul>
      <p className="psh-panelstack__foot">
        <IconInfo size={16} />
        Umechagua {picked.length} maslahi. Haya yanatumika kwenye Gundua na Mchanganyiko.
      </p>
      <div className="psh-panelstack__actions">
        <button type="button" className="psh-btn psh-btn--primary" onClick={() => onToast('Mapendeleo yamehifadhiwa (mfano)')}>
          Hifadhi mapendeleo
        </button>
      </div>
    </div>
  )
}

/* ── Zilizohifadhiwa ──────────────────────────────────────── */

export function SavedPanel({ onToast }) {
  return (
    <div className="psh-panelstack">
      <div className="psh-saved">
        <span className="psh-saved__icon">
          <IconBookmark size={22} />
        </span>
        <h3>Hakuna zilizohifadhiwa bado</h3>
        <p>
          Unapoona chapisho, video au bidhaa unayotaka kuirudia, gusa alama ya kuhifadhi na
          utaipata hapa.
        </p>
        <button type="button" className="psh-btn" onClick={onToast('Reel na video — Hatua 3 na 5')}>
          Tazama Reels
        </button>
      </div>
    </div>
  )
}

/* ── Chips za haraka (kwa Home filter) ────────────────────── */

export function FilterMenu({ filters, value, onChange }) {
  return (
    <ul className="psh-checkrows psh-checkrows--tight">
      {filters.map((f) => (
        <li key={f.id}>
          <CheckRow
            radio
            checked={value === f.id}
            label={f.label}
            onSelect={() => onChange(f.id)}
          />
        </li>
      ))}
    </ul>
  )
}
