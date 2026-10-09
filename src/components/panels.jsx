// ══════════════════════════════════════════════════════════════
// PASIHAI — PANELS (Hatua 1)
// Notifications · Profile/Account · Create · More (+ View mode,
// Mapendeleo ya mkondo, Mapendeleo ya maudhui, Zilizohifadhiwa)
// ══════════════════════════════════════════════════════════════

import { useState } from 'react'
import { accountService } from '../services/accountService.js'
import { spacesService } from '../services/spacesService.js'
import { feedService } from '../services/feedService.js'
import { chatService } from '../services/chatService.js'
import { systemService } from '../services/systemService.js'
import { notificationService } from '../services/notificationService.js'
import { settingsService } from '../services/settingsService.js'
import useAsyncData from '../hooks/useAsyncData.js'
import {
  Avatar,
  Button,
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
  IconRadar,
  IconTimer,
  IconShield,
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

export function NotificationsPanel({ onOpenProfile, onToast }) {
  const [scope, setScope] = useState('zote')
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState(false)
  // Kuchuja (scope) na kuunganisha na entity ni kazi ya service.
  const list = useAsyncData(() => notificationService.list({ scope }), [scope, version])
  const unread = useAsyncData(() => notificationService.countUnread(), [version])

  if (!list || unread == null) return null

  const markAll = async () => {
    setBusy(true)
    await notificationService.markAllRead()
    setVersion((v) => v + 1)
    setBusy(false)
    onToast?.('Taarifa zote zimewekwa kama zilizosomwa')
  }

  const openOne = async (n) => {
    if (n.unread) {
      await notificationService.markRead(n.id)
      setVersion((v) => v + 1)
    }
    onOpenProfile?.(n.userId)
  }

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
        <Button
          size="sm"
          variant="ghost"
          loading={busy}
          loadingLabel="Inasoma…"
          disabled={unread === 0}
          onClick={markAll}
        >
          Soma zote
        </Button>
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
                onClick={() => openOne(n)}
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

const MY_TABS = [
  { id: 'posts', label: 'Machapisho' },
  { id: 'liked', label: 'Nilizopenda' },
  { id: 'saved', label: 'Zilizohifadhiwa' },
  /* Nafasi Zangu: object moja (Hub · Jumuiya · Channel) — §39 */
  { id: 'spaces', label: 'Nafasi Zangu' },
]

export function ProfilePanel({ userId = 'me', onToast, onInteract, onOpenItem, onOpenSpace }) {
  // Wasifu unatoka kwa account service (service inajua 'me' vs entity nyingine).
  // Hooks zote ziko mbele ya early-return — mpangilio wa hooks hauvunjiki.
  const [version, setVersion] = useState(0)
  const [tabIndex, setTabIndex] = useState(0)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ name: '', bio: '', location: '' })
  const [busy, setBusy] = useState(null)

  const user = useAsyncData(() => accountService.getProfile(userId), [userId, version])
  const vocab = useAsyncData(() => accountService.getEntityVocabulary(), [])
  const myContent = useAsyncData(
    () => (userId === 'me' ? accountService.getMyContent(MY_TABS[tabIndex].id) : Promise.resolve(null)),
    [userId, tabIndex, version],
  )
  /* Nafasi Zangu: chanzo kimoja — Spaces (Hub · Jumuiya · Channel) */
  const mySpaces = useAsyncData(
    () => (userId === 'me' && MY_TABS[tabIndex].id === 'spaces' ? spacesService.getMySpaces() : Promise.resolve(null)),
    [userId, tabIndex, version],
  )
  const [acted, setActed] = useState(false)
  /* Muhtasari wa nafasi (chanzo kimoja: spacesService) — kwa safu ya wasifu */
  const navSpaces = useAsyncData(() => spacesService.getMySpaces(), [version])

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

      {isMe && editing ? (
        <div className="psh-profile__edit">
          <label className="psh-field">
            <span>Jina</span>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder={user.name}
            />
          </label>
          <label className="psh-field">
            <span>Kuhusu</span>
            <input
              type="text"
              value={draft.bio}
              onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
              placeholder={user.bio}
            />
          </label>
          <label className="psh-field">
            <span>Mahali</span>
            <input
              type="text"
              value={draft.location}
              onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
              placeholder={user.location || 'Dar es Salaam'}
            />
          </label>
          <div className="psh-panelstack__actions">
            <Button
              variant="primary"
              loading={busy === 'save'}
              loadingLabel="Inahifadhi…"
              onClick={async () => {
                setBusy('save')
                await accountService.updateMyProfile({
                  name: draft.name.trim() || user.name,
                  bio: draft.bio.trim() || user.bio,
                  location: draft.location.trim() || user.location,
                })
                setBusy(null)
                setEditing(false)
                setVersion((v) => v + 1)
                onToast?.('Wasifu wako umesasishwa')
                onInteract?.('me', 'profile-updated')
              }}
            >
              Hifadhi mabadiliko
            </Button>
            <Button variant="quiet" onClick={() => setEditing(false)}>
              Ghairi
            </Button>
          </div>
        </div>
      ) : null}

      <div className="psh-profile__actions">
        {isMe ? (
          <>
            <Button
              variant="primary"
              onClick={() => {
                setDraft({ name: user.name || '', bio: user.bio || '', location: user.location || '' })
                setEditing((v) => !v)
              }}
            >
              {editing ? 'Funga uhariri' : 'Hariri wasifu'}
            </Button>
            <Button
              loading={busy === 'share'}
              loadingLabel="Inanakili…"
              onClick={async () => {
                setBusy('share')
                const link = `https://pasihai.app/u/${(user.handle || 'mimi').replace('@', '')}`
                try {
                  await navigator.clipboard?.writeText(link)
                  onToast?.('Kiungo cha wasifu kimenakiliwa')
                } catch {
                  onToast?.(`Kiungo cha wasifu: ${link}`)
                }
                setBusy(null)
              }}
            >
              Shiriki wasifu
            </Button>
          </>
        ) : (
          <>
            <EntityAction
              vocab={action}
              isDone={acted || myRel === action?.done}
              busy={busy === 'relate'}
              onClick={async () => {
                setBusy('relate')
                const done = action?.done ?? 'Unafuatilia'
                const wasDone = acted || myRel === done
                const res = await feedService.toggleFollow(userId, !wasDone)
                setBusy(null)
                setActed(res.following)
                setVersion((v) => v + 1)
                onInteract?.(userId, res.following ? 'follow' : 'unfollow')
                onToast?.(
                  res.following
                    ? `${done}: ${user.name}`
                    : `Umekoma kufuata ${user.name}`,
                )
              }}
            />
            {action?.secondary ? (
              <Button
                loading={busy === 'message'}
                loadingLabel="Inafungua…"
                onClick={async () => {
                  setBusy('message')
                  await chatService.startDirect(userId)
                  setBusy(null)
                  onInteract?.(userId, 'message')
                  onToast?.(`Mazungumzo na ${user.name} yamefunguliwa kwenye Chat`)
                }}
              >
                {action.secondary}
              </Button>
            ) : null}
          </>
        )}
      </div>

      {isMe ? (
        <>
          <ul className="psh-profile__list" role="tablist" aria-label="Maudhui yangu">
            {MY_TABS.map((t, i) => (
              <li key={t.id}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tabIndex === i}
                  className={tabIndex === i ? 'is-active' : ''}
                  onClick={() => setTabIndex(i)}
                >
                  {t.label}
                </button>
              </li>
            ))}
          </ul>

          {/* Nafasi Zangu — Hub · Jumuiya · Channel (object moja) */}
          {MY_TABS[tabIndex].id === 'spaces' ? (
            !mySpaces ? (
              <p className="psh-empty">Inapakia nafasi zako…</p>
            ) : mySpaces.items.length === 0 ? (
              <div className="psh-empty">
                <IconInfo size={22} />
                <p>
                  Hujaunga na nafasi yoyote bado. Nafasi unazojiunga au kumiliki zitaonekana hapa —
                  anza kwenye Spaces.
                </p>
              </div>
            ) : (
              <>
                <p className="psh-profile__note">
                  <IconInfo size={16} />
                  Nafasi {mySpaces.counts.total} · umiliki {mySpaces.counts.owned} · umejiunga{' '}
                  {mySpaces.counts.joined}. {mySpaces.note}
                </p>
                <ul className="psh-profile__content">
                  {mySpaces.items.map((sp) => (
                    <li key={sp.id}>
                      <button
                        type="button"
                        className="psh-profile__row"
                        onClick={() => onOpenSpace?.(sp)}
                      >
                        <span className="psh-profile__rowkind">{sp.type}</span>
                        <span className="psh-profile__rowtext">
                          {sp.name}
                          {sp.owned ? ' · nafasi yako' : sp.joined ? ' · umejiunga' : ''}
                        </span>
                        <IconArrowRight size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )
          ) : !myContent ? (
            <p className="psh-empty">Inapakia maudhui yako…</p>
          ) : myContent.length === 0 ? (
            <div className="psh-empty">
              <IconInfo size={22} />
              <p>
                {MY_TABS[tabIndex].id === 'posts'
                  ? 'Hujachapisha kitu bado. Anza kwa kuandika chapisho kwenye Home.'
                  : MY_TABS[tabIndex].id === 'liked'
                    ? 'Hujapenda chapisho lolote bado.'
                    : 'Hujahifadhi chapisho lolote bado.'}
              </p>
            </div>
          ) : (
            <ul className="psh-profile__content">
              {myContent.map((it) => (
                <li key={it.id}>
                  <button type="button" className="psh-profile__row" onClick={() => onOpenItem?.(it)}>
                    <span className="psh-profile__rowkind">{it.kind}</span>
                    <span className="psh-profile__rowtext">
                      {it.text || it.poll?.question || it.media?.caption || 'Chapisho'}
                    </span>
                    <IconArrowRight size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
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
          {navSpaces?.counts?.total ? (
            <li>
              <span>Nafasi zangu</span>
              <strong>
                {navSpaces.counts.total} ({navSpaces.counts.owned} umiliki)
              </strong>
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

/* Aina za Space — kitu kimoja kinachoundwa kutoka Home au Spaces (§40).
   Groups HAZIPO hapa: vikundi ni vya Chat. */
export const CREATE_SPACE_ITEMS = [
  { id: 'hub', label: 'Hub', Icon: IconHub },
  { id: 'community', label: 'Jumuiya', Icon: IconGlobe },
  { id: 'channel', label: 'Channel', Icon: IconMegaphone },
]

export function CreatePanel({ onToast, onCompose, onStatus, onLive, onCreateSpace }) {
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
              onClick={() => {
                // Kila aina ina njia yake halisi ya kuunda (hali ya kikao).
                if (id === 'story' || id === 'status') return onStatus?.()
                if (id === 'live') return onLive?.()
                return onCompose?.(id)
              }}
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
      {/* Spaces: Hub · Jumuiya · Channel — mchakato ule ule wa hatua 3 */}
      <div className="psh-create__group" aria-label="Anza Space">
        <h3 className="psh-create__groupTitle">Anza Space</h3>
        <ul className="psh-create__grid psh-create__grid--spaces">
          {CREATE_SPACE_ITEMS.map(({ id, label, Icon, hint }) => (
            <li key={id}>
              <button type="button" className="psh-create__item" onClick={() => onCreateSpace?.(id)}>
                <span className="psh-create__icon">
                  <Icon size={22} />
                </span>
                <span className="psh-create__label">{label}</span>
                {hint ? <span className="psh-create__hint">{hint}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <p className="psh-create__foot">
        <IconInfo size={16} />
        Kila unachounda kinabaki kwenye kikao hiki cha app — hakuna backend, na hakuna data yako
        inayotumwa mahali popote.
      </p>
    </div>
  )
}

/* ── Chapisho (Composer) — Post MOJA, uwasilishaji ni metadata ─
   Hakuna "Local Post" button wala "Global Post" button: ni post
   ileile, na mfumo unaamua chaguo lipi linafaa SASA.               */

const COMPOSE_KINDS = {
  text: { label: 'Chapisho', placeholder: 'Nini kinaendelea?', hint: 'Maandishi' },
  photo: { label: 'Picha', placeholder: 'Eleza picha yako…', hint: 'Picha moja' },
  image: { label: 'Picha', placeholder: 'Eleza picha yako…', hint: 'Picha moja' },
  video: { label: 'Video', placeholder: 'Eleza video yako…', hint: 'Video' },
  reel: { label: 'Reel', placeholder: 'Andika maelezo mafupi…', hint: 'Video fupi ya wima' },
  poll: { label: 'Kura', placeholder: 'Swali lako…', hint: 'Kura — chagua maswali na majibu' },
  audio: { label: 'Sauti', placeholder: 'Eleza sauti yako…', hint: 'Sauti' },
}

export function ComposerPanel({ kind = 'text', onToast, onClose, onPosted }) {
  const meta = COMPOSE_KINDS[kind] || COMPOSE_KINDS.text
  const [text, setText] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [picked, setPicked] = useState(null)
  const [busy, setBusy] = useState(false)
  const view = useAsyncData(() => systemService.getDeliveryOptions(), [])

  if (!view) return null

  const isPoll = kind === 'poll'
  const filled = options.filter((o) => o.trim())
  const ready = isPoll ? Boolean(text.trim() && filled.length >= 2) : Boolean(text.trim())

  const selected = view.options.find((o) => o.id === picked) || view.options.find((o) => o.id === view.recommended)
  const queuedNow = !!selected?.queues

  const submit = async () => {
    if (!ready) return
    setBusy(true)

    const post = await feedService.createPost({
      kind,
      text: text.trim(),
      options: isPoll ? filled : undefined,
    })
    const short = text.trim().slice(0, 42)
    const res = await systemService.queueFromDelivery(
      selected.id,
      short ? `Chapisho: “${short}${text.trim().length > 42 ? '…' : ''}”` : 'Chapisho jipya',
    )
    setBusy(false)
    onToast(
      res.queued
        ? `${selected.label}: kimeundwa — kiko kwenye foleni (Waiting for sync)`
        : `${selected.label}: kimechapishwa — kinaonekana kwenye mkondo`,
    )
    onPosted?.(post)
    onClose?.()
  }

  return (
    <div className="psh-panelstack">
      <p className="psh-panelstack__lead">
        Post ni MOJA. Uwasilishaji ni metadata — mfumo huchagua kile kinachowezekana sasa, na
        kile kinachosubiri mtandao.
      </p>

      <p className="psh-compose__kind">
        {meta.label} · {meta.hint}
      </p>

      <label className="psh-compose">
        <span className="u-sr">Maandishi ya chapisho</span>
        <textarea
          className="psh-compose__input"
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={meta.placeholder}
        />
      </label>

      {isPoll ? (
        <>
          <h3 className="psh-panelstack__h">Majibu ya kura</h3>
          <ul className="psh-pollform">
            {options.map((opt, i) => (
              <li key={i}>
                <input
                  type="text"
                  className="psh-field__input"
                  value={opt}
                  placeholder={`Jibu la ${i + 1}`}
                  aria-label={`Jibu la ${i + 1}`}
                  onChange={(e) =>
                    setOptions((o) => o.map((v, j) => (j === i ? e.target.value : v)))
                  }
                />
                {options.length > 2 ? (
                  <Button
                    size="sm"
                    variant="quiet"
                    onClick={() => setOptions((o) => o.filter((_, j) => j !== i))}
                  >
                    Ondoa
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
          {options.length < 5 ? (
            <Button size="sm" variant="soft" onClick={() => setOptions((o) => [...o, ''])}>
              Ongeza jibu
            </Button>
          ) : null}
        </>
      ) : null}

      <h3 className="psh-panelstack__h">Uwasilishaji (delivery)</h3>
      <ul className="psh-checkrows psh-checkrows--tight">
        {view.options.map((o) => (
          <li key={o.id}>
            <CheckRow
              radio
              checked={selected?.id === o.id}
              label={o.label}
              hint={o.available ? o.hint : `${o.hint} · ${o.reason}`}
              onSelect={() => setPicked(o.id)}
            />
          </li>
        ))}
      </ul>

      <p className="psh-note">
        <IconShield size={16} />
        Identity, uhusiano, uonekani na ruhusa ni tabaka tofauti. Uwasilishaji hauonekani kama
        kigezo cha aina ya post.
      </p>

      <div className="psh-panelstack__toolbar">
        <span className="psh-panelstack__count">
          {queuedNow ? (
            <>
              <IconTimer size={14} /> Itasubiri sync
            </>
          ) : (
            <>
              <IconRadar size={14} /> Inaweza kupelekwa sasa
            </>
          )}
        </span>
        <Button
          variant="primary"
          loading={busy}
          loadingLabel="Inatuma…"
          disabled={!ready}
          onClick={submit}
        >
          {queuedNow ? 'Chapisha — itasubiri sync' : 'Chapisha'}
        </Button>
      </div>
    </div>
  )
}

/* ── More (Home pekee) ────────────────────────────────────── */

export function MorePanel({ viewMode, onOpenPanel, onViewMode, onToast, dataSaver, setDataSaver, onRefresh }) {
  // Labels za muonekano zinatoka kwa settings service.
  const modes = useAsyncData(() => settingsService.getViewModes(), [])
  const [busy, setBusy] = useState(null)

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
          onClick={async () => {
            setBusy('refresh')
            await onRefresh?.()
            setBusy(null)
            onToast('Mkondo umesasishwa — maudhui mapya yameangaliwa')
          }}
        >
          <span className="psh-menu__icon">
            <IconRefresh size={20} />
          </span>
          <span className="psh-menu__text">
            <span className="psh-menu__label">Sasisha</span>
            <span className="psh-menu__hint">
              {busy === 'refresh' ? 'Inasasisha…' : 'Angalia maudhui mapya sasa'}
            </span>
          </span>
        </button>
      </li>
      <li>
        <button
          type="button"
          className="psh-menu__row"
          onClick={() => onOpenPanel('system')}
        >
          <span className="psh-menu__icon">
            <IconSettings size={20} />
          </span>
          <span className="psh-menu__text">
            <span className="psh-menu__label">Mipangilio ya kifaa</span>
            <span className="psh-menu__hint">System · Relay · Sync · Hifadhi</span>
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
        Chaguo hili linahifadhiwa kwenye kikao hiki na linaonekana kwenye mstari wa hali wa Home
        (“Unatazama”). Muonekano hubadilisha jinsi mkondo unavyopangwa kwenye skrini.
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
  // Mapendeleo yanatoka kwa settings service; yaliyochaguliwa huhifadhiwa
  // kwenye hali ya kikao (halisi — yanaonekana tena ukifungua paneli).
  const prefs = useAsyncData(() => settingsService.getFeedPreferences(), [])
  const stored = useAsyncData(() => settingsService.getUserPrefs(), [])
  const [sort, setSort] = useState(null)
  const [showOverrides, setShowOverrides] = useState({})
  const [busy, setBusy] = useState(false)

  if (!prefs || !stored) return null

  const activeSort = sort ?? stored.feedSort ?? prefs.sort[0]?.id
  const show = Object.fromEntries(
    prefs.show.map((s) => [s.id, showOverrides[s.id] ?? stored.feedShow?.[s.id] ?? s.on]),
  )

  const persist = async (patch) => {
    setBusy(true)
    await settingsService.saveUserPrefs(patch)
    setBusy(false)
  }

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
              onSelect={() => {
                setSort(s.id)
                persist({ feedSort: s.id })
                onToast?.(`Mpangilio: ${s.label}`)
              }}
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
                persist({ feedShow: { ...(stored.feedShow || {}), [s.id]: v } })
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
  const stored = useAsyncData(() => settingsService.getUserPrefs(), [])
  const [picked, setPicked] = useState(null)
  const [busy, setBusy] = useState(false)

  if (!stored) return null

  const chosen = picked ?? stored.contentInterests ?? []
  const toggle = (t) => {
    setPicked((p) => {
      const list = p ?? stored.contentInterests ?? []
      return list.includes(t) ? list.filter((x) => x !== t) : [...list, t]
    })
  }
  const save = async () => {
    setBusy(true)
    await settingsService.saveUserPrefs({ contentInterests: chosen })
    setBusy(false)
    onToast?.(`Mapendeleo yamehifadhiwa — maslahi ${chosen.length}`)
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
              className={`psh-chipbtn ${chosen.includes(t) ? 'is-on' : ''}`}
              aria-pressed={chosen.includes(t)}
              onClick={() => toggle(t)}
            >
              {chosen.includes(t) ? <IconCheck size={14} strokeWidth={2.4} /> : null}
              {t}
            </button>
          </li>
        ))}
      </ul>
      <p className="psh-panelstack__foot">
        <IconInfo size={16} />
        Umechagua {chosen.length} maslahi. Haya yanatumika kwenye Gundua na Mchanganyiko.
      </p>
      <div className="psh-panelstack__actions">
        <Button variant="primary" loading={busy} loadingLabel="Inahifadhi…" onClick={save}>
          Hifadhi mapendeleo
        </Button>
      </div>
    </div>
  )
}

/* ── Zilizohifadhiwa ──────────────────────────────────────── */

export function SavedPanel({ onToast, onOpenItem, onGoReels }) {
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState(null)
  const saved = useAsyncData(() => feedService.listSaved(), [version])
  const places = useAsyncData(() => feedService.listSavedEntities(), [version])

  const unsave = async (entity) => {
    setBusy(entity.id)
    await feedService.saveEntity({ id: entity.id }, false)
    setBusy(null)
    setVersion((v) => v + 1)
    onToast?.(`${entity.name} imeondolewa kwenye zilizohifadhiwa`)
  }

  const remove = async (item) => {
    setBusy(item.id)
    await feedService.toggleSaved(item)
    setBusy(null)
    setVersion((v) => v + 1)
    onToast?.('Kimeondolewa kwenye zilizohifadhiwa')
  }

  if (!saved) return null

  if (saved.length === 0 && (places || []).length === 0) {
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
          <Button onClick={() => onGoReels?.()}>Tazama Reels</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="psh-panelstack">
      <p className="psh-panelstack__lead">
        Umehifadhi vitu {saved.length + (places || []).length}. Hifadhi ni yako pekee — mtu
        mwingine haoni.
      </p>

      {(places || []).length ? (
        <>
          <h3 className="psh-panelstack__h">Watu · biashara · channels</h3>
          <ul className="psh-savedlist">
            {places.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="psh-savedlist__row"
                  onClick={() => onOpenPlace?.(p)}
                >
                  <span className="psh-savedlist__kind">{p.kind}</span>
                  <span className="psh-savedlist__text">
                    <b>{p.name}</b>
                    <span>{p.subtitle || 'Ulihifadhi kutoka Gundua'}</span>
                  </span>
                </button>
                <Button
                  size="sm"
                  variant="quiet"
                  loading={busy === p.id}
                  onClick={() => unsave(p)}
                >
                  Ondoa
                </Button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <ul className="psh-savedlist">
        {saved.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="psh-savedlist__row"
              onClick={() => onOpenItem?.(item)}
            >
              <span className="psh-savedlist__kind">{item.kind}</span>
              <span className="psh-savedlist__text">
                <b>{item.entity?.name || item.author?.name || item.user?.name || 'Chapisho lako'}</b>
                <span>{item.text || item.media?.caption || item.poll?.question || 'Bila maandishi'}</span>
              </span>
            </button>
            <Button
              size="sm"
              variant="quiet"
              loading={busy === item.id}
              onClick={() => remove(item)}
            >
              Ondoa
            </Button>
          </li>
        ))}
      </ul>
      <p className="psh-panelstack__foot">
        <IconInfo size={16} />
        Inaondolewa hapa pekee — chapisho haliondolewi kwa mwandishi.
      </p>
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
