// ══════════════════════════════════════════════════════════════
// PASIHAI — CHATHAI GROUPS: SKRINI ZA USIMAMIZI (M2 · UI/UX)
//
// Skrini MOJA kwa kila jukumu (hakuna nakala):
//   · GroupInfoBody        — Taarifa za kikundi (kitovu cha vitendo)
//   · GroupAddMembersBody  — Ongeza wanachama (Contacts selection)
//   · GroupMembersBody     — Wanachama & roles (roles/ban/remove/grants)
//   · GroupSettingsGroupBody — Mipangilio ya kikundi (DB inatekeleza)
//   · GroupEditInfoBody    — Hariri taarifa (maelezo/madhumuni)
//
// Kanuni: DB (RPC/RLS) ndiyo mamlaka ya mwisho. `groupCan` (mirror ya JS)
// huficha/kuzima tu visivyoruhusiwa; kila kitendo halisi huthibitishwa na
// backend na kukataliwa kwake kunaonyeshwa kwa ujumbe HALISI (§56 — hakuna
// "success" ya uongo, hakuna kitufe kisichofanya kitu).
// ══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react'

import { chatService } from '../../services/chatService.js'
import {
  GROUP_ACTION_LABELS,
  GROUP_GRANTABLE_ACTIONS,
  GROUP_ROLE_LABELS,
  GROUP_ROLE_RANK,
  groupCan,
  groupRoleMax,
} from '../../config/groupPermissions.js'
import {
  GROUP_DESCRIPTION_MAX,
  GROUP_JOIN_LABELS,
  GROUP_JOIN_METHODS,
  GROUP_PRIVACY_LABELS,
  GROUP_SLOW_MODE,
  GROUP_SLOW_MODE_LABELS,
  GROUP_TEXT_MAX,
  GROUP_TYPE_LABELS,
} from '../../config/groupLimits.js'
import { Chip } from '../ui.jsx'
import { ChatAvatar } from './ChatBits.jsx'
import { PersonRow } from './ChatPanels.jsx'
import {
  IconArrowRight,
  IconBan,
  IconCheck,
  IconChevronRight,
  IconClose,
  IconInfo,
  IconPeople,
  IconPersonAdd,
  IconSearchSmall,
  IconSettings,
  IconShare,
  IconShield,
  IconText,
} from '../icons.jsx'

export const MEMBER_STATUS_LABELS = {
  active: 'Hai',
  pending: 'Inasubiri idhini',
  banned: 'Amezuiwa',
  left: 'Amekwisha kujiunga',
}

/* ── Hali za skrini: loading · error(+retry) · data ─────────── */
function useGroupData(load, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const [n, setN] = useState(0)
  const reload = useCallback(() => setN((x) => x + 1), [])
  useEffect(() => {
    let alive = true
    setState({ data: null, error: null, loading: true })
    Promise.resolve()
      .then(load)
      .then((data) => {
        if (alive) setState({ data, error: null, loading: false })
      })
      .catch((error) => {
        if (alive) setState({ data: null, error, loading: false })
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, n])
  return { ...state, reload }
}

function LoadNote() {
  return (
    <p className="psh-note" aria-busy="true">
      <IconInfo size={16} /> Inapakia…
    </p>
  )
}

function ErrorNote({ error, onRetry }) {
  return (
    <div className="psh-gi-error" role="alert">
      <span>{error?.message || 'Data haikupatikana.'}</span>
      {onRetry ? (
        <button type="button" className="psh-btn psh-btn--sm" onClick={onRetry}>
          Jaribu tena
        </button>
      ) : null}
    </div>
  )
}

/* ── Mstari mmoja wa kitendo (icon + label + meta + chevron) ── */
function ActionRow({ icon: Icon, label, meta, onClick, danger, disabled, id }) {
  return (
    <button
      id={id}
      type="button"
      className={`psh-gi-row ${danger ? 'psh-gi-row--danger' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="psh-gi-row__ico">
        <Icon size={17} />
      </span>
      <span className="psh-gi-row__label">{label}</span>
      {meta ? <span className="psh-gi-row__meta">{meta}</span> : null}
      <IconChevronRight size={15} />
    </button>
  )
}

/* ── Uthibitisho wa kitendo cha kuharibu (safu moja, ndani ya UI) ── */
function ConfirmRow({ prompt, label = 'Thibitisha', busy, onConfirm, onCancel }) {
  return (
    <div className="psh-gi-confirm" role="alertdialog" aria-label={prompt}>
      <span className="psh-gi-confirm__text">{prompt}</span>
      <button type="button" className="psh-btn psh-btn--sm psh-btn--danger" disabled={busy} onClick={onConfirm}>
        {busy ? 'Inafanya…' : label}
      </button>
      <button type="button" className="psh-btn psh-btn--sm" disabled={busy} onClick={onCancel}>
        Ghairi
      </button>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   E) TAARIFA ZA KIKUNDI — kitovu cha vitendo (compact rows)
   ══════════════════════════════════════════════════════════════ */

export function GroupInfoBody({ conv, convId, onOpen, onToast, onRefresh, onLeft }) {
  const [askLeave, setAskLeave] = useState(false)
  const [busy, setBusy] = useState(null)
  const { data, error, loading, reload } = useGroupData(
    async () => {
      const [members, settings] = await Promise.all([
        chatService.getGroupMembers(convId),
        chatService.getGroupSettings(convId),
      ])
      return { members: members || [], settings: settings || null }
    },
    [convId],
  )

  if (loading) return <LoadNote />
  if (error) return <ErrorNote error={error} onRetry={reload} />

  const { members, settings } = data
  const me = members.find((m) => m.isMe) || null
  const active = members.filter((m) => m.status === 'active')
  const can = (action) =>
    groupCan({
      role: me?.role ?? null,
      status: me?.status || 'active',
      kind: 'group',
      groupType: settings?.type || 'normal',
      settings,
      permissions: me?.permissions ?? null,
      action,
    })

  const run = async (key, fn, done) => {
    setBusy(key)
    try {
      const res = await fn()
      const warn = Array.isArray(res?.warnings) && res.warnings.length ? ` — ${res.warnings.join('; ')}` : ''
      onToast?.(`${done}${warn}`)
      reload()
      onRefresh?.()
      return true
    } catch (err) {
      onToast?.(err?.message || 'Kitendo hakikufanikiwa. Jaribu tena.')
      return false
    } finally {
      setBusy(null)
    }
  }

  const invite = async () => {
    const text = chatService.groupInviteText(conv, settings)
    try {
      await navigator.clipboard?.writeText(text)
      onToast?.('Maandishi ya mwaliko yamenakiliwa — tuma kwa SMS au WhatsApp')
    } catch {
      onToast?.(text)
    }
  }

  const leave = async () => {
    const ok = await run('leave', () => chatService.groupLeave(convId), 'Umeondoka kwenye kikundi.')
    if (ok) {
      setAskLeave(false)
      onLeft?.()
    }
  }

  return (
    <div className="psh-panelstack psh-gi">
      {/* Utambulisho */}
      <div className="psh-gi-hero">
        <ChatAvatar tone={conv?.tone} name={conv?.title || 'Kikundi'} icon={conv?.groupIcon || 'group'} size="lg" src={conv?.dpUrl || null} />
        <div className="psh-gi-hero__text">
          <h3 className="psh-gi-hero__name">{conv?.title || 'Kikundi'}</h3>
          <span className="psh-gi-hero__sub">
            <IconPeople size={13} /> {active.length}
            <span className="psh-gi-dot" aria-hidden="true">·</span>
            {GROUP_TYPE_LABELS[settings?.type] || 'Kikundi'}
            <Chip tone={settings?.privacy === 'public' ? 'green' : 'neutral'}>
              {GROUP_PRIVACY_LABELS[settings?.privacy] || 'Private'}
            </Chip>
          </span>
        </div>
      </div>

      {/* Maelezo: huonyeshwa TU kama yapo (hakuna bloksi tupu) */}
      {settings?.description ? <p className="psh-gi-desc">{settings.description}</p> : null}

      {me?.status && me.status !== 'active' ? (
        <p className="psh-note">
          <IconInfo size={16} /> Hali yako: {MEMBER_STATUS_LABELS[me.status] || me.status}
        </p>
      ) : null}

      <div className="psh-gi-card">
        {can('add_member') ? (
          <ActionRow id="gi-add" icon={IconPersonAdd} label="Ongeza wanachama" onClick={() => onOpen?.('groupadd')} />
        ) : null}
        <ActionRow
          id="gi-members"
          icon={IconPeople}
          label="Wanachama & roles"
          meta={`${active.length}`}
          onClick={() => onOpen?.('groupmembers')}
        />
        {can('edit_info') ? (
          <ActionRow id="gi-edit" icon={IconText} label="Hariri taarifa" onClick={() => onOpen?.('groupedit')} />
        ) : null}
        {can('edit_settings') ? (
          <ActionRow id="gi-settings" icon={IconSettings} label="Mipangilio ya kikundi" onClick={() => onOpen?.('groupsettings')} />
        ) : null}
        <ActionRow id="gi-invite" icon={IconShare} label="Karibisha kwa mwaliko" onClick={invite} />
      </div>

      {/* Ondoka — kitendo cha kuharibu: uthibitisho wa hatua mbili */}
      {!askLeave ? (
        <div className="psh-gi-card">
          <ActionRow
            id="gi-leave"
            danger
            icon={IconClose}
            label="Ondoka kwenye kikundi"
            onClick={() => {
              setAskLeave(true)
              reload()
            }}
          />
        </div>
      ) : (
        <ConfirmRow
          prompt={
            me?.role === 'owner'
              ? 'Wewe ni Owner — hamisha umiliki kwanza (Wanachama & roles).'
              : 'Ondoka kwenye kikundi hiki? Historia yako haifutwi.'
          }
          label={me?.role === 'owner' ? 'Jaribu' : 'Ondoka'}
          busy={busy === 'leave'}
          onConfirm={leave}
          onCancel={() => setAskLeave(false)}
        />
      )}

      <p className="psh-note">
        <IconShield size={16} /> Kila kitendo huthibitishwa na database (RLS + RPC); kukataliwa kunaonyeshwa
        kwa ujumbe halisi wa backend.
      </p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   C) ONGEZA WANACHAMA — Contacts (chanzo kilekile cha New Chat)
   ══════════════════════════════════════════════════════════════ */

export function GroupAddMembersBody({ convId, onToast, onRefresh, onDone }) {
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState([])
  const [busy, setBusy] = useState(false)
  const { data, error, loading, reload } = useGroupData(
    async () => {
      const [members, settings, view] = await Promise.all([
        chatService.getGroupMembers(convId),
        chatService.getGroupSettings(convId),
        chatService.getNewChat(),
      ])
      return { members: members || [], settings: settings || null, view }
    },
    [convId],
  )

  if (loading) return <LoadNote />
  if (error) return <ErrorNote error={error} onRetry={reload} />

  const { members, settings, view } = data
  const me = members.find((m) => m.isMe) || null
  const canAdd = groupCan({
    role: me?.role ?? null,
    status: me?.status || 'active',
    kind: 'group',
    groupType: settings?.type || 'normal',
    settings,
    permissions: me?.permissions ?? null,
    action: 'add_member',
  })
  const limit = settings?.memberLimit || 1024
  const activeCount = members.filter((m) => m.status === 'active').length
  const memberIds = new Set(members.map((m) => m.userId))
  const all = [...(view?.savedFriends || []), ...(view?.pasihaiFriends || []), ...(view?.accounts || [])]
  const candidates = all.filter((c) => !memberIds.has(c.id))
  const list = q ? candidates.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())) : candidates
  const atLimit = activeCount + picked.length >= limit

  const toggle = (id) => {
    setPicked((p) => {
      if (p.includes(id)) return p.filter((x) => x !== id)
      if (activeCount + p.length >= limit) return p
      return [...p, id]
    })
  }

  const submit = async () => {
    if (!picked.length || busy) return
    setBusy(true)
    let okCount = 0
    const failures = []
    for (const id of picked) {
      try {
        await chatService.groupAddMember(convId, id)
        okCount += 1
      } catch (err) {
        failures.push(`${all.find((c) => c.id === id)?.name || id}: ${err?.message || 'imeshindwa'}`)
      }
    }
    setBusy(false)
    onRefresh?.()
    if (okCount) {
      onToast?.(
        `Wameongezwa ${okCount} kwenye kikundi${failures.length ? ` — isiyofanikiwa: ${failures.join('; ')}` : ''}`,
      )
      setPicked([])
      onDone?.()
    } else {
      onToast?.(failures[0] || 'Hakuna aliyeongezwa.')
      reload()
    }
  }

  return (
    <div className="psh-panelstack">
      <div className="psh-panelstack__actions">
        <Chip tone={atLimit ? 'gold' : 'soft'}>
          Wanachama {activeCount + picked.length} / {limit}
        </Chip>
        {picked.length ? <Chip tone="green">Wamechaguliwa {picked.length}</Chip> : null}
      </div>

      {!canAdd ? (
        <p className="psh-note">
          <IconInfo size={16} /> Hauna ruhusa ya kuongeza wanachama kwenye kikundi hiki (add_member).
        </p>
      ) : null}

      <label className="psh-chat__search" style={{ cursor: 'text' }} htmlFor="ga-search">
        <IconSearchSmall size={17} />
        <input
          id="ga-search"
          className="psh-chat-lookup__input"
          style={{ border: 0, background: 'transparent', minHeight: 0, padding: 0 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tafuta contact…"
          aria-label="Tafuta contact wa kuongeza"
        />
      </label>

      <ul id="ga-list">
        {list.map((c) => {
          const on = picked.includes(c.id)
          const full = !on && atLimit
          return (
            <PersonRow
              key={c.id}
              name={c.name}
              meta={c.saved ? 'Saved Friend' : c.friend ? 'PASIHAI Friend' : 'Akaunti ya PASIHAI'}
              tone={c.tone}
              action={on ? '✓ Amechaguliwa' : full ? 'Kikomo kimefika' : 'Ongeza'}
              onSelect={() => canAdd && toggle(c.id)}
              onAction={() => canAdd && toggle(c.id)}
              selected={on}
            />
          )
        })}
      </ul>

      {list.length === 0 ? (
        <p className="psh-note">
          <IconInfo size={16} />{' '}
          {candidates.length === 0
            ? 'Contacts wote waliopo tayari ni wanachama wa kikundi hiki.'
            : `Hakuna contact anayelingana na “${q}”.`}
        </p>
      ) : null}

      <div className="psh-panelstack__actions">
        <button
          id="ga-confirm"
          type="button"
          className="psh-btn psh-btn--primary"
          disabled={!picked.length || busy || !canAdd}
          onClick={submit}
        >
          {busy ? 'Inaongeza…' : `Ongeza wanachama${picked.length ? ` (${picked.length})` : ''}`}
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   F) WANACHAMA & ROLES — roles · ban/unban · remove · grants ·
      hamisha umiliki (Owner). Vitufe hufuata ruhusa za DB.
   ══════════════════════════════════════════════════════════════ */

export function GroupMembersBody({ convId, onToast, onRefresh, onAddMembers }) {
  const [busy, setBusy] = useState(null)
  const [grantsFor, setGrantsFor] = useState(null)
  const [grantsDraft, setGrantsDraft] = useState(null)
  const [transferTo, setTransferTo] = useState('')
  const [confirm, setConfirm] = useState(null) // { key, userId, name, action: 'remove'|'ban'|'transfer' }
  const { data, error, loading, reload } = useGroupData(
    async () => {
      const [members, settings] = await Promise.all([
        chatService.getGroupMembers(convId),
        chatService.getGroupSettings(convId),
      ])
      return { members: members || [], settings: settings || null }
    },
    [convId],
  )

  if (loading) return <LoadNote />
  if (error) return <ErrorNote error={error} onRetry={reload} />

  const { members, settings } = data
  const me = members.find((m) => m.isMe) || null
  const myRank = GROUP_ROLE_RANK[me?.role] ?? 0
  const limit = settings?.memberLimit || 1024
  const activeCount = members.filter((m) => m.status === 'active').length
  const can = (action) =>
    groupCan({
      role: me?.role ?? null,
      status: me?.status || 'active',
      kind: 'group',
      groupType: settings?.type || 'normal',
      settings,
      permissions: me?.permissions ?? null,
      action,
    })

  const act = async (key, fn, done) => {
    setBusy(key)
    try {
      const res = await fn()
      const warn = Array.isArray(res?.warnings) && res.warnings.length ? ` — ${res.warnings.join('; ')}` : ''
      onToast?.(`${done}${warn}`)
      setConfirm(null)
      reload()
      onRefresh?.()
    } catch (err) {
      onToast?.(err?.message || 'Kitendo hakikufanikiwa. Jaribu tena.')
    } finally {
      setBusy(null)
    }
  }

  const nameOf = (m) => m.name || `${String(m.userId).slice(0, 8)}…`

  const renderMember = (m) => {
    const targetRank = GROUP_ROLE_RANK[m.role] ?? 0
    const canRole = can('manage_roles') && !m.isMe && m.role !== 'owner' && myRank > targetRank
    const canStatus = (can('restrict_members') || can('manage_members')) && !m.isMe && m.role !== 'owner' && myRank > targetRank
    const canGrants = canRole && (m.role === 'admin' || m.role === 'moderator')
    const roleOptions = ['admin', 'moderator', 'member'].filter((r) => (GROUP_ROLE_RANK[r] ?? 0) < myRank)
    const grantables = GROUP_GRANTABLE_ACTIONS.filter((a) => groupRoleMax(m.role, a))
    const grantList = grantsDraft || (Array.isArray(m.permissions) ? m.permissions : chatService.groupRoleDefaults(m.role))
    const pendingKey = confirm?.userId === m.userId ? confirm.action : null

    return (
      <li key={m.userId}>
        <div className="psh-menu__row psh-menu__row--static">
          <ChatAvatar tone={m.tone || 'green'} name={nameOf(m)} size="sm" />
          <span className="psh-menu__text">
            <span className="psh-menu__label">{m.isMe ? 'Wewe' : nameOf(m)}</span>
            <span className="psh-menu__hint">
              {!(canRole && !grantsFor) ? (
                <Chip tone={m.role === 'owner' ? 'gold' : 'soft'}>{GROUP_ROLE_LABELS[m.role] || m.role}</Chip>
              ) : null}{' '}
              {m.status !== 'active' ? <Chip tone="neutral">{MEMBER_STATUS_LABELS[m.status] || m.status}</Chip> : null}
            </span>
          </span>
          <span className="psh-panelstack__actions">
            {canRole && !grantsFor ? (
              <select
                className="psh-gw-input psh-gm-rolesel"
                value={m.role}
                disabled={!!busy}
                aria-label={`Badilisha role ya ${nameOf(m)}`}
                onChange={(e) =>
                  act(`role:${m.userId}`, () => chatService.groupSetMember(convId, m.userId, { role: e.target.value }), `Role ya ${nameOf(m)} ni ${GROUP_ROLE_LABELS[e.target.value]}.`)
                }
              >
                {[m.role, ...roleOptions.filter((r) => r !== m.role)].map((r) => (
                  <option key={r} value={r}>
                    {GROUP_ROLE_LABELS[r] || r}
                  </option>
                ))}
              </select>
            ) : null}
            {canStatus && m.status === 'active' ? (
              <button
                type="button"
                className="psh-btn psh-btn--sm"
                disabled={!!busy}
                aria-label={`Zuia ${nameOf(m)}`}
                title="Zuia (ban)"
                onClick={() => setConfirm({ key: `ban:${m.userId}`, userId: m.userId, name: nameOf(m), action: 'ban' })}
              >
                <IconBan size={16} />
              </button>
            ) : null}
            {canStatus && m.status === 'banned' ? (
              <button
                type="button"
                className="psh-btn psh-btn--sm"
                disabled={!!busy}
                aria-label={`Ondoa zuio la ${nameOf(m)}`}
                title="Ondoa zuio (unban)"
                onClick={() => act(`unban:${m.userId}`, () => chatService.groupSetMember(convId, m.userId, { status: 'active' }), `Zuio la ${nameOf(m)} limeondolewa.`)}
              >
                <IconCheck size={16} />
              </button>
            ) : null}
            {canStatus && m.status === 'active' ? (
              <button
                type="button"
                className="psh-btn psh-btn--sm"
                disabled={!!busy}
                aria-label={`Ondoa ${nameOf(m)} kwenye kikundi`}
                title="Ondoa kwenye kikundi"
                onClick={() => setConfirm({ key: `remove:${m.userId}`, userId: m.userId, name: nameOf(m), action: 'remove' })}
              >
                <IconClose size={16} />
              </button>
            ) : null}
            {canGrants ? (
              <button
                type="button"
                className="psh-btn psh-btn--sm"
                disabled={!!busy}
                aria-label={`Ruhusa za ${nameOf(m)}`}
                title="Ruhusa maalum (grants)"
                onClick={() => {
                  setGrantsFor(grantsFor === m.userId ? null : m.userId)
                  setGrantsDraft(null)
                }}
              >
                <IconShield size={16} />
              </button>
            ) : null}
          </span>
        </div>

        {pendingKey ? (
          <ConfirmRow
            prompt={
              pendingKey === 'remove'
                ? `Ondoa ${confirm.name} kwenye kikundi? (Historia haifutwi)`
                : `Zuia ${confirm.name}? Hataweza kutuma wala kusoma.`
            }
            label={pendingKey === 'remove' ? 'Ondoa' : 'Zuia'}
            busy={busy === confirm.key}
            onConfirm={() =>
              act(
                confirm.key,
                () =>
                  chatService.groupSetMember(convId, m.userId, {
                    status: pendingKey === 'remove' ? 'left' : 'banned',
                  }),
                pendingKey === 'remove' ? `${confirm.name} ameondolewa kwenye kikundi.` : `${confirm.name} amezuiwa.`,
              )
            }
            onCancel={() => setConfirm(null)}
          />
        ) : null}

        {grantsFor === m.userId ? (
          <div className="psh-panelstack__actions">
            {grantables.map((a) => (
              <label key={a} className="psh-gw-opt__label">
                <input
                  type="checkbox"
                  checked={grantList.includes(a)}
                  onChange={() => setGrantsDraft(grantList.includes(a) ? grantList.filter((x) => x !== a) : [...grantList, a])}
                />{' '}
                {GROUP_ACTION_LABELS[a] || a}
              </label>
            ))}
            <button
              type="button"
              className="psh-btn psh-btn--primary psh-btn--sm"
              disabled={!!busy}
              onClick={() =>
                act(
                  `grants:${m.userId}`,
                  () => chatService.groupSetMember(convId, m.userId, { permissions: grantList }),
                  `Ruhusa za ${nameOf(m)} zimehifadhiwa.`,
                ).then(() => {
                  setGrantsFor(null)
                  setGrantsDraft(null)
                })
              }
            >
              Hifadhi ruhusa
            </button>
            <button type="button" className="psh-btn psh-btn--sm" disabled={!!busy} onClick={() => setGrantsDraft(chatService.groupRoleDefaults(m.role))}>
              Weka upya (defaults)
            </button>
          </div>
        ) : null}
      </li>
    )
  }

  return (
    <div className="psh-panelstack">
      <div className="psh-panelstack__actions">
        <Chip tone={activeCount >= limit ? 'gold' : 'soft'}>
          Wanachama {activeCount} / {limit}
        </Chip>
        <Chip tone="neutral">Role yako: {GROUP_ROLE_LABELS[me?.role] || '—'}</Chip>
      </div>

      {can('add_member') ? (
        <button id="gm-add-member" type="button" className="psh-btn psh-btn--sm" onClick={onAddMembers}>
          <IconPersonAdd size={16} /> Ongeza wanachama
        </button>
      ) : null}

      <ul className="psh-menu" id="gm-list">
        {members.filter((m) => m.status !== 'left').map(renderMember)}
      </ul>
      {members.some((m) => m.status === 'left') ? (
        <p className="psh-note" id="gm-left-note">
          <IconInfo size={16} /> Walioondoka: {members.filter((m) => m.status === 'left').length} — hawashiriki;
          historia imehifadhiwa.
        </p>
      ) : null}

      {me?.role === 'owner' ? (
        <div className="psh-gi-card psh-gi-section">
          <span className="psh-gi-seh">Hamisha umiliki</span>
          <select
            className="psh-gw-input"
            value={transferTo}
            onChange={(e) => setTransferTo(e.target.value)}
            aria-label="Chagua mwanachama wa kuhamishia umiliki"
          >
            <option value="">— chagua mwanachama hai —</option>
            {members
              .filter((m) => !m.isMe && m.status === 'active')
              .map((m) => (
                <option key={m.userId} value={m.userId}>
                  {nameOf(m)}
                </option>
              ))}
          </select>
          {transferTo && confirm?.action !== 'transfer' ? (
            <button
              type="button"
              className="psh-btn psh-btn--sm"
              disabled={!!busy}
              onClick={() => setConfirm({ key: 'transfer', userId: transferTo, name: nameOf(members.find((m) => m.userId === transferTo) || {}), action: 'transfer' })}
            >
              Hamisha umiliki
            </button>
          ) : null}
          {confirm?.action === 'transfer' ? (
            <ConfirmRow
              prompt={`Hamisha umiliki kwa ${confirm.name}? Wewe utakuwa Admin.`}
              label="Hamisha"
              busy={busy === 'transfer'}
              onConfirm={() =>
                act('transfer', () => chatService.groupTransferOwnership(convId, transferTo), 'Umiliki umehamishwa. Wewe sasa ni Admin.').then(() =>
                  setTransferTo(''),
                )
              }
              onCancel={() => setConfirm(null)}
            />
          ) : null}
        </div>
      ) : null}

      <p className="psh-note">
        <IconInfo size={16} /> Vitufe hufuata ruhusa zako halisi; kila kitendo huthibitishwa na database.
      </p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   G) MIPANGILIO YA KIKUNDI — faragha · kujiunga · ruhusa · slow mode
   ══════════════════════════════════════════════════════════════ */

export function GroupSettingsGroupBody({ convId, onToast, onRefresh }) {
  const [draft, setDraft] = useState(null)
  const [busy, setBusy] = useState(false)
  const { data, error, loading, reload } = useGroupData(
    async () => {
      const [settings, members] = await Promise.all([
        chatService.getGroupSettings(convId),
        chatService.getGroupMembers(convId),
      ])
      return { settings: settings || null, me: (members || []).find((m) => m.isMe) || null }
    },
    [convId],
  )

  if (loading) return <LoadNote />
  if (error) return <ErrorNote error={error} onRetry={reload} />

  const { settings, me } = data
  const canEdit = groupCan({
    role: me?.role ?? null,
    status: me?.status || 'active',
    kind: 'group',
    groupType: settings?.type || 'normal',
    settings,
    permissions: me?.permissions ?? null,
    action: 'edit_settings',
  })
  const eff = {
    privacy: draft?.privacy ?? settings?.privacy ?? 'private',
    joinMethod: draft?.joinMethod ?? settings?.joinMethod ?? 'request',
    whoCanAdd: draft?.whoCanAdd ?? settings?.whoCanAdd ?? 'owner_admins',
    whoCanReply: draft?.whoCanReply ?? settings?.whoCanReply ?? 'all',
    whoCanReact: draft?.whoCanReact ?? settings?.whoCanReact ?? 'all',
    announcementSenders: draft?.announcementSenders ?? settings?.announcementSenders ?? 'owner_admins',
    slowModeSeconds: draft?.slowModeSeconds ?? settings?.slowModeSeconds ?? 0,
  }
  const set = (key, value) => setDraft({ ...(draft || {}), [key]: value })
  const goingPublic = eff.privacy === 'public' && (settings?.privacy || 'private') !== 'public'

  const save = async () => {
    if (!draft || !Object.keys(draft).length || busy) return
    setBusy(true)
    try {
      const res = await chatService.updateGroupSettings(convId, draft)
      const warn = Array.isArray(res?.warnings) && res.warnings.length ? ` — ${res.warnings.join('; ')}` : ''
      onToast?.(`Mipangilio imehifadhiwa.${warn}`)
      setDraft(null)
      reload()
      onRefresh?.()
    } catch (err) {
      onToast?.(err?.message || 'Mipangilio haikuhifadhiwa. Jaribu tena.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="psh-panelstack psh-gi">
      {!canEdit ? (
        <p className="psh-note">
          <IconInfo size={16} /> Hauna ruhusa ya kubadilisha mipangilio (edit_settings) — unaona tu.
        </p>
      ) : null}

      <div className="psh-gi-card psh-gi-section">
        <span className="psh-gi-seh">Faragha & kujiunga</span>
        <label className="psh-gw-field__hint" htmlFor="gs-privacy">
          Faragha
        </label>
        <select id="gs-privacy" className="psh-gw-input" disabled={!canEdit} value={eff.privacy} onChange={(e) => set('privacy', e.target.value)}>
          {['private', 'public'].map((p) => (
            <option key={p} value={p}>
              {GROUP_PRIVACY_LABELS[p]}
            </option>
          ))}
        </select>
        {goingPublic ? (
          <p className="psh-note">
            <IconInfo size={16} /> Kikundi kitaonekana kwa wote — hifadhi ili kuthibitisha.
          </p>
        ) : null}
        <label className="psh-gw-field__hint" htmlFor="gs-join">
          Njia ya kujiunga
        </label>
        <select id="gs-join" className="psh-gw-input" disabled={!canEdit} value={eff.joinMethod} onChange={(e) => set('joinMethod', e.target.value)}>
          {GROUP_JOIN_METHODS.map((m) => (
            <option key={m} value={m}>
              {GROUP_JOIN_LABELS[m]}
            </option>
          ))}
        </select>
        <p className="psh-note">
          <IconInfo size={16} /> Viungo vya mwaliko (token) havipo bado — mwaliko unatumwa kwa maandishi.
        </p>
      </div>

      <div className="psh-gi-card psh-gi-section">
        <span className="psh-gi-seh">Ruhusa</span>
        <label className="psh-gw-field__hint" htmlFor="gm-add">
          Nani anaweza kuongeza wanachama
        </label>
        <select id="gm-add" className="psh-gw-input" disabled={!canEdit} value={eff.whoCanAdd} onChange={(e) => set('whoCanAdd', e.target.value)}>
          <option value="owner">Mmiliki pekee</option>
          <option value="owner_admins">Mmiliki + Admins</option>
          <option value="members">Wanachama wote</option>
        </select>
        <label className="psh-gw-field__hint" htmlFor="gm-reply">
          Nani anaweza kujibu ujumbe
        </label>
        <select id="gm-reply" className="psh-gw-input" disabled={!canEdit} value={eff.whoCanReply} onChange={(e) => set('whoCanReply', e.target.value)}>
          <option value="all">Wote</option>
          <option value="admins">Admins pekee</option>
        </select>
        <label className="psh-gw-field__hint" htmlFor="gm-react">
          Nani anaweza kugusa (reactions)
        </label>
        <select id="gm-react" className="psh-gw-input" disabled={!canEdit} value={eff.whoCanReact} onChange={(e) => set('whoCanReact', e.target.value)}>
          <option value="all">Wote</option>
          <option value="admins">Admins pekee</option>
        </select>
        {settings?.type === 'announcement' ? (
          <>
            <label className="psh-gw-field__hint" htmlFor="gm-ann">
              Nani anatuma matangazo
            </label>
            <select id="gm-ann" className="psh-gw-input" disabled={!canEdit} value={eff.announcementSenders} onChange={(e) => set('announcementSenders', e.target.value)}>
              <option value="owner_admins">Mmiliki + Admins</option>
              <option value="owner">Mmiliki pekee</option>
            </select>
          </>
        ) : null}
        <label className="psh-gw-field__hint" htmlFor="gm-slow">
          Slow mode
        </label>
        <select id="gm-slow" className="psh-gw-input" disabled={!canEdit} value={eff.slowModeSeconds} onChange={(e) => set('slowModeSeconds', Number(e.target.value))}>
          {GROUP_SLOW_MODE.map((v) => (
            <option key={v} value={v}>
              {GROUP_SLOW_MODE_LABELS[v]}
            </option>
          ))}
        </select>
      </div>

      <div className="psh-panelstack__actions">
        <button
          id="gs-save"
          type="button"
          className="psh-btn psh-btn--primary"
          disabled={!canEdit || !draft || !Object.keys(draft).length || busy}
          onClick={save}
        >
          {busy ? 'Inahifadhi…' : 'Hifadhi mipangilio'}
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   E2) HARIRI TAARIFA — maelezo + madhumuni (yanayohifadhiwa)
   ══════════════════════════════════════════════════════════════ */

export function GroupEditInfoBody({ convId, onToast, onSaved }) {
  const [desc, setDesc] = useState(null)
  const [purpose, setPurpose] = useState(null)
  const [busy, setBusy] = useState(false)
  const { data, error, loading, reload } = useGroupData(
    async () => {
      const [settings, members] = await Promise.all([
        chatService.getGroupSettings(convId),
        chatService.getGroupMembers(convId),
      ])
      return { settings: settings || null, me: (members || []).find((m) => m.isMe) || null }
    },
    [convId],
  )

  if (loading) return <LoadNote />
  if (error) return <ErrorNote error={error} onRetry={reload} />

  const { settings, me } = data
  const canEdit = groupCan({
    role: me?.role ?? null,
    status: me?.status || 'active',
    kind: 'group',
    groupType: settings?.type || 'normal',
    settings,
    permissions: me?.permissions ?? null,
    action: 'edit_info',
  })
  const d = desc ?? settings?.description ?? ''
  const p = purpose ?? settings?.purpose ?? ''
  const dirty = d !== (settings?.description ?? '') || p !== (settings?.purpose ?? '')

  const save = async () => {
    if (busy || !dirty) return
    setBusy(true)
    try {
      await chatService.updateGroupSettings(convId, { description: d.trim(), purpose: p.trim() })
      onToast?.('Taarifa za kikundi zimehifadhiwa.')
      onSaved?.()
    } catch (err) {
      onToast?.(err?.message || 'Taarifa hazikuhifadhiwa. Jaribu tena.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="psh-panelstack psh-gi">
      {!canEdit ? (
        <p className="psh-note">
          <IconInfo size={16} /> Hauna ruhusa ya kubadilisha taarifa (edit_info).
        </p>
      ) : null}
      <label className="psh-gw-field" htmlFor="ge-desc">
        <span className="psh-gw-field__label">
          Maelezo mafupi
          <span className="psh-gw-field__opt"> (hiari)</span>
        </span>
        <input
          id="ge-desc"
          className="psh-gw-input"
          value={d}
          disabled={!canEdit}
          maxLength={GROUP_DESCRIPTION_MAX}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Mfano: Ushirikiano wa pembejeo na masoko"
        />
        <span className="psh-gw-count">
          {d.trim().length}/{GROUP_DESCRIPTION_MAX}
        </span>
      </label>
      <label className="psh-gw-field" htmlFor="ge-purpose">
        <span className="psh-gw-field__label">
          Madhumuni
          <span className="psh-gw-field__opt"> (hiari)</span>
        </span>
        <textarea
          id="ge-purpose"
          className="psh-gw-input"
          rows={4}
          value={p}
          disabled={!canEdit}
          maxLength={GROUP_TEXT_MAX}
          onChange={(e) => setPurpose(e.target.value)}
        />
      </label>
      <div className="psh-panelstack__actions">
        <button id="ge-save" type="button" className="psh-btn psh-btn--primary" disabled={!canEdit || !dirty || busy} onClick={save}>
          {busy ? 'Inahifadhi…' : 'Hifadhi'}
        </button>
        {onSaved ? (
          <button type="button" className="psh-btn" disabled={busy} onClick={onSaved}>
            Ghairi
          </button>
        ) : null}
      </div>
    </div>
  )
}
