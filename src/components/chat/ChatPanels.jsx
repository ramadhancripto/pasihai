// ══════════════════════════════════════════════════════════════
// PASIHAI — CHAT PANELS
// New Chat · New Group · Requests · Search · More · Settings ·
// Privacy · Notifications · Archived · Blocked · Storage ·
// Media guard (sera ya relay kwa media)
//
// Panels zote ni miili (bodies) inayopokea data tayari — App inaziweka
// ndani ya Sheet ileile (panel mechanism MOJA).
// ══════════════════════════════════════════════════════════════

import { useState } from 'react'

import useAsyncData from '../../hooks/useAsyncData.js'
import { formatMb } from '../../utils/format.js'
import { chatService } from '../../services/chatService.js'
import { systemService } from '../../services/systemService.js'
import { Switch } from '../panels.jsx'
import { Chip } from '../ui.jsx'
import { ChatAvatar } from './ChatBits.jsx'
import {
  IconArchive,
  IconArrowRight,
  IconBan,
  IconBolt,
  IconCheck,
  IconComment,
  IconInfo,
  IconMic,
  IconPaperclip,
  IconRadar,
  IconRefresh,
  IconSearchSmall,
  IconShield,
  IconTimer,
} from '../icons.jsx'

/* ── Mtu mmoja (person row) ─────────────────────────────────── */

function PersonRow({ name, meta, tone = 'green', action, icon, onSelect, onAction, badge, selected }) {
  return (
    <li className={`psh-chat-person ${selected ? 'is-selected' : ''}`}>
      {/* Muundo: vitufe viwili VILIVYO TOFAUTI (hakuna kitufe ndani ya kitufe) —
          mstari wenyewe = chagua; kitufe cha pembeni = tendo la haraka. */}
      <button type="button" className="psh-chat-person__main" onClick={onSelect}>
        <ChatAvatar tone={tone} name={name} icon={icon} size="sm" />
        <span className="psh-chat-person__text">
          <span className="psh-chat-person__name">
            {name}
            {badge}
          </span>
          <span className="psh-chat-person__meta">{meta}</span>
        </span>
      </button>
      {action ? (
        <button
          type="button"
          className={`psh-btn psh-btn--sm ${selected ? 'psh-btn--primary' : 'psh-btn--ghost'}`}
          onClick={() => onAction?.()}
          aria-label={`${action} — ${name}`}
        >
          {action}
        </button>
      ) : null}
    </li>
  )
}

/* ══════════════════════════════════════════════════════════════
   1) NEW CHAT — Saved Friends · PASIHAI Friends · accounts · invite
      + lookup ya namba (kesi 4) — flow MOJA
   ══════════════════════════════════════════════════════════════ */

export function NewChatBody({ view, onStart, onInvite, onLookup, onNewGroup, onRequests, lookup, onToast }) {
  const [number, setNumber] = useState(view?.number || '0784 123 456')
  const [saved, setSaved] = useState([])
  const [requested, setRequested] = useState([])
  const [busy, setBusy] = useState(null)
  if (!view) return null

  /* Hifadhi Rafiki = hali (Saved Friend), si urafiki wa pili. */
  const saveFriend = async (caseItem) => {
    setBusy(caseItem.id)
    const res = await chatService.saveFriend(caseItem.accountId, true)
    setSaved((list) => [...list, res.accountId])
    setBusy(null)
    onToast?.('Amehifadhiwa kama Rafiki Binafsi (Saved Friend) — yuko juu ya orodha')
  }

  /* Tuma Ombi = ombi halisi linaloonekana kwenye Maombi › Yaliyotumwa. */
  const sendRequest = async (accountId, name) => {
    setBusy(accountId)
    const req = await chatService.sendRequest(accountId)
    setRequested((list) => [...list, accountId])
    setBusy(null)
    onToast?.(`Ombi la mazungumzo limetumwa${name ? ` kwa ${name}` : ''} — linaonekana kwenye Maombi (${req.state})`)
  }

  /* Mwaliko: maandishi halisi yanakiliwa — mtumiaji anayatuma kwa SMS. */
  const invite = async (c) => {
    const text = chatService.inviteText(c)
    try {
      await navigator.clipboard?.writeText(text)
      onToast?.('Maandishi ya mwaliko yamenakiliwa — tuma kwa SMS au WhatsApp')
    } catch {
      onToast?.(`Mwaliko: ${text}`)
    }
    onInvite?.(c)
  }

  return (
    <div className="psh-panelstack">
      <div className="psh-panelstack__actions">
        <button type="button" className="psh-btn psh-btn--sm" onClick={onNewGroup}>
          <IconPaperclip size={16} /> Kikundi Kipya
        </button>
        <button type="button" className="psh-btn psh-btn--sm" onClick={onRequests}>
          <IconShield size={16} /> Maombi ya mazungumzo
          {view.pending ? <Chip tone="green">{view.pending}</Chip> : null}
        </button>
      </div>

      <h3 className="psh-panelstack__h">Tafuta namba ya simu</h3>
      <div className="psh-chat-lookup">
        <div className="psh-chat-lookup__row">
          <span className="psh-chat-lookup__country">🇹🇿 +255</span>
          <input
            className="psh-chat-lookup__input"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            inputMode="tel"
            aria-label="Namba ya simu"
            placeholder="0784 123 456"
          />
        </div>
        <button
          type="button"
          className="psh-btn psh-btn--primary"
          onClick={() => onLookup(number)}
        >
          <IconSearchSmall size={16} /> Tafuta namba
        </button>
        <p className="psh-panelstack__count">
          Namba si utambulisho wa umma — inatumika kugundua akaunti pekee.
        </p>
      </div>

      {lookup ? (
        <div className="psh-chat-section">
          <div className="psh-chat-section__head">
            <span className="psh-chat-section__title">Matokeo ya Uchunguzi (Mifano {lookup.cases.length})</span>
            <span className="psh-chat-section__count">Chagua kielelezo</span>
          </div>
          {lookup.cases.map((c) => (
            <div key={c.id} className="psh-chat-case">
              <div className="psh-chat-case__top">
                <ChatAvatar tone={c.tone} name={c.name || c.phone} size="sm" />
                <span className="psh-chat-person__text">
                  <span className="psh-chat-person__name">
                    {c.name || 'Hajajiunga na PASIHAI'}
                    {c.saved ? <Chip tone="gold">Saved Friend</Chip> : c.friend ? <Chip tone="green">PASIHAI Friend</Chip> : c.accountId ? <Chip tone="soft">Akaunti ya PASIHAI</Chip> : null}
                  </span>
                  <span className="psh-chat-person__meta">
                    {c.phone}
                    {c.handle ? ` · ${c.handle}` : ''}
                    {c.sample ? ' · mfano' : ''}
                  </span>
                </span>
                <span className="psh-chat-case__badge">{c.case}</span>
              </div>
              <div className="psh-chat-case__note">
                <IconShield size={15} />
                <span>{c.note}</span>
              </div>
              <div className="psh-chat-case__actions">
                {c.accountId ? (
                  <>
                    <button type="button" className="psh-btn psh-btn--sm psh-btn--primary" onClick={() => onStart(c.accountId)}>
                      Anza Mazungumzo
                    </button>
                    {c.friend && !c.saved && !saved.includes(c.accountId) ? (
                      <button
                        type="button"
                        className="psh-btn psh-btn--sm"
                        disabled={busy === c.id}
                        onClick={() => saveFriend(c)}
                      >
                        {busy === c.id ? 'Inahifadhi…' : 'Hifadhi Rafiki'}
                      </button>
                    ) : null}
                    {saved.includes(c.accountId) ? <Chip tone="gold">Saved Friend</Chip> : null}
                    {!c.friend && !requested.includes(c.accountId) ? (
                      <button
                        type="button"
                        className="psh-btn psh-btn--sm"
                        disabled={busy === c.accountId}
                        onClick={() => sendRequest(c.accountId, c.name)}
                      >
                        {busy === c.accountId ? 'Inatuma…' : 'Tuma Ombi'}
                      </button>
                    ) : null}
                    {requested.includes(c.accountId) ? <Chip tone="soft">Ombi limetumwa</Chip> : null}
                  </>
                ) : (
                  <button type="button" className="psh-btn psh-btn--sm" onClick={() => invite(c)}>
                    Alika PASIHAI kupitia SMS
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="psh-chat-section">
        <div className="psh-chat-section__head">
          <span className="psh-chat-section__title">Marafiki waliohifadhiwa (Saved Friends)</span>
          <span className="psh-chat-section__count">{view.savedFriends.length} VIP</span>
        </div>
        <ul>
          {view.savedFriends.map((c) => (
            <PersonRow
              key={c.id}
              name={c.name}
              meta={c.phone}
              tone={c.tone}
              action="Anza"
              onSelect={() => onStart(c.accountId)}
              onAction={() => onStart(c.accountId)}
              badge={<Chip tone="gold">Rafiki Aliyehifadhiwa</Chip>}
            />
          ))}
        </ul>
      </div>

      <div className="psh-chat-section">
        <div className="psh-chat-section__head">
          <span className="psh-chat-section__title">Marafiki wa PASIHAI</span>
          <span className="psh-chat-section__count">{view.pasihaiFriends.length} mtandao</span>
        </div>
        <ul>
          {view.pasihaiFriends.map((c) => (
            <PersonRow
              key={c.id}
              name={c.name}
              meta={c.phone}
              tone={c.tone}
              action="Anza"
              onSelect={() => onStart(c.accountId)}
              onAction={() => onStart(c.accountId)}
            />
          ))}
        </ul>
      </div>

      <div className="psh-chat-section">
        <div className="psh-chat-section__head">
          <span className="psh-chat-section__title">Mawasiliano ya simu yenye PASIHAI</span>
          <span className="psh-chat-section__count">Akaunti zinazotambulika</span>
        </div>
        <ul>
          {view.accounts.map((c) => (
            <PersonRow
              key={c.id}
              name={c.name}
              meta={c.phone}
              tone={c.tone}
              action={requested.includes(c.accountId) ? 'Limetumwa' : 'Tuma Ombi'}
              onSelect={() =>
                requested.includes(c.accountId)
                  ? onToast?.('Ombi tayari limetumwa — linasubiri kukubaliwa')
                  : sendRequest(c.accountId, c.name)
              }
              onAction={() =>
                requested.includes(c.accountId)
                  ? onToast?.('Ombi tayari limetumwa — linasubiri kukubaliwa')
                  : sendRequest(c.accountId, c.name)
              }
            />
          ))}
        </ul>
      </div>

      <div className="psh-chat-section">
        <div className="psh-chat-section__head">
          <span className="psh-chat-section__title">Alika kwa PASIHAI</span>
          <span className="psh-chat-section__count">Bila akaunti bado</span>
        </div>
        <ul>
          {view.invite.map((c) => (
            <PersonRow
              key={c.id}
              name={c.name}
              meta={c.phone}
              tone={c.tone}
              action="Alika"
              onSelect={() => invite(c)}
              onAction={() => invite(c)}
            />
          ))}
        </ul>
      </div>

      <p className="psh-note">
        <IconInfo size={16} />
        {view.note}
      </p>
    </div>
  )
}

export function NewChatPanel({ onStart, onInvite, onNewGroup, onRequests, onToast }) {
  const [lookup, setLookup] = useState(null)
  const base = useAsyncData(() => chatService.getNewChat(), [])

  const view = base ? { ...base, number: undefined } : null

  return (
    <NewChatBody
      view={view}
      lookup={lookup}
      onLookup={async (n) => setLookup(await chatService.lookupNumber(n))}
      onStart={onStart}
      onInvite={onInvite}
      onNewGroup={onNewGroup}
      onRequests={onRequests}
      onToast={onToast}
    />
  )
}

/* ══════════════════════════════════════════════════════════════
   2) NEW GROUP — jina · picha (mandhari) · wanachama · tafuta
   ══════════════════════════════════════════════════════════════ */

const GROUP_TONES = [
  { id: 'green', label: 'Kijani' },
  { id: 'blue', label: 'Bluu' },
  { id: 'gold', label: 'Dhahabu' },
  { id: 'plum', label: 'Zambarau' },
]

export function NewGroupBody({ view, name, setName, picked, toggle, onCreate, onToast }) {
  const [q, setQ] = useState('')
  const [tone, setTone] = useState('green')
  if (!view) return null

  const all = [...view.savedFriends, ...view.pasihaiFriends, ...view.accounts]
  const list = q ? all.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())) : all

  return (
    <div className="psh-panelstack">
      <label className="psh-compose">
        <span className="u-sr">Jina la kikundi</span>
        <input
          className="psh-chat-lookup__input"
          style={{ width: '100%', minHeight: 42 }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jina la kikundi"
          aria-label="Jina la kikundi"
        />
      </label>

      <div className="psh-panelstack__actions">
        <ChatAvatar tone={tone} name={(name || 'Kikundi').slice(0, 2).toUpperCase()} size="md" />
        <span className="psh-panelstack__count">Picha ya kikundi — chagua mandhari</span>
        <ul className="psh-chips">
          {GROUP_TONES.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                className={`psh-chipbtn ${tone === t.id ? 'is-on' : ''}`}
                aria-pressed={tone === t.id}
                aria-label={`Mandhari ya kikundi: ${t.label}`}
                onClick={() => setTone(t.id)}
              >
                {t.label}
              </button>
            </li>
          ))}
        </ul>
        {picked.length ? <Chip tone="green">Wanachama {picked.length}</Chip> : null}
      </div>

      <label className="psh-chat__search" style={{ cursor: 'text' }}>
        <IconSearchSmall size={17} />
        <input
          className="psh-chat-lookup__input"
          style={{ border: 0, background: 'transparent', minHeight: 0, padding: 0 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tafuta wanachama…"
          aria-label="Tafuta wanachama"
        />
      </label>

      <h3 className="psh-panelstack__h">Chagua wanachama</h3>
      <ul>
        {list.map((c) => {
          const on = picked.includes(c.id)
          return (
            <PersonRow
              key={c.id}
              name={c.name}
              meta={c.saved ? 'Saved Friend' : c.friend ? 'PASIHAI Friend' : 'Akaunti ya PASIHAI'}
              tone={c.tone}
              action={on ? '✓ Ameshachaguliwa' : 'Ongeza'}
              onSelect={() => toggle(c.id)}
              onAction={() => toggle(c.id)}
              selected={on}
              badge={on ? <Chip tone="green">Amechaguliwa</Chip> : null}
            />
          )
        })}
      </ul>

      <div className="psh-panelstack__actions">
        <button
          type="button"
          className="psh-btn psh-btn--primary"
          onClick={() => onCreate({ name, members: picked, tone })}
          disabled={!name.trim() || picked.length === 0}
          aria-disabled={!name.trim() || picked.length === 0 || undefined}
        >
          Unda kikundi
        </button>
      </div>
      <p className="psh-note">
        <IconInfo size={16} />
        Kikundi ni mazungumzo. Community au Hub (kama wapo) ni metadata — usimamizi wao uko Spaces.
      </p>
    </div>
  )
}

export function NewGroupPanel({ onCreate, onToast }) {
  const view = useAsyncData(() => chatService.getNewChat(), [])
  const [name, setName] = useState('')
  const [picked, setPicked] = useState([])

  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  return (
    <NewGroupBody
      view={view}
      name={name}
      setName={setName}
      picked={picked}
      toggle={toggle}
      onCreate={onCreate}
      onToast={onToast}
    />
  )
}

/* ══════════════════════════════════════════════════════════════
   3) CHAT REQUESTS — kubali · kataa · zuia
   ══════════════════════════════════════════════════════════════ */

export function RequestsBody({ view, onRespond, onToast }) {
  const [tab, setTab] = useState('received')
  if (!view) return null
  const list = tab === 'received' ? view.received : view.sent

  return (
    <div className="psh-panelstack">
      <div className="psh-sys-alert">
        <IconShield size={16} />
        <span>
          <b>ULINZI WA FARAGHA.</b> Watu ambao si marafiki zako wa PASIHAI wanapotaka kuanza mazungumzo
          ya faragha, ujumbe wao unaingia hapa kwanza ili kulinda faragha yako.
        </span>
      </div>

      <ul className="psh-checkrows psh-checkrows--tight">
        <li>
          <button
            type="button"
            className={`psh-chat__filter ${tab === 'received' ? 'is-active' : ''}`}
            onClick={() => setTab('received')}
          >
            Yaliyopokelewa{view.received.filter((r) => r.state === 'pending').length ? (
              <>
                {' '}
                <span className="psh-chat__filterdot" /> {view.received.filter((r) => r.state === 'pending').length} Mpya
              </>
            ) : null}
          </button>
        </li>
        <li>
          <button
            type="button"
            className={`psh-chat__filter ${tab === 'sent' ? 'is-active' : ''}`}
            onClick={() => setTab('sent')}
          >
            Yaliyotumwa ({view.sent.length})
          </button>
        </li>
      </ul>

      {list.length === 0 ? (
        <div className="psh-empty">
          <IconShield size={24} />
          <p>Hakuna maombi hapa.</p>
        </div>
      ) : null}

      {list.map((r) => (
        <div key={r.id} className="psh-chat-request">
          <div className="psh-chat-case__top">
            <ChatAvatar tone={r.tone} name={r.from} size="sm" />
            <span className="psh-chat-person__text">
              <span className="psh-chat-person__name">
                {r.from}
                {r.handle ? <span className="psh-chat-person__meta">{r.handle}</span> : null}
              </span>
              <span className="psh-chat-person__meta">
                {r.at} · {r.via || 'Ombi la mazungumzo'}
              </span>
            </span>
            {r.state !== 'pending' ? <Chip tone="soft">{r.state === 'accepted' ? 'Imekubaliwa' : r.state === 'blocked' ? 'Imezuiwa' : 'Imekataliwa'}</Chip> : null}
          </div>

          <div className="psh-chat-request__msg">{r.text}</div>

          {r.mutual ? (
            <div className="psh-chat-request__mutual">
              <ChatAvatar tone={r.mutualTone || 'clay'} name={r.mutual.split(' ')[0]} size="sm" />
              <span>{r.mutual}</span>
            </div>
          ) : null}

          {r.state === 'pending' && tab === 'received' ? (
            <>
              <div className="psh-chat-request__actions">
                <button type="button" className="psh-btn psh-btn--primary" onClick={() => onRespond(r.id, 'accept')}>
                  <IconCheck size={17} /> Kubali (Accept) & Anza Mazungumzo
                </button>
              </div>
              <div className="psh-chat-request__actions--row">
                <button type="button" className="psh-btn" onClick={() => onRespond(r.id, 'decline')}>
                  ✕ Kataa (Decline)
                </button>
                <button type="button" className="psh-btn psh-btn--danger" onClick={() => onRespond(r.id, 'block')}>
                  <IconBan size={16} /> Zuia (Block)
                </button>
              </div>
              <p className="psh-panelstack__count">
                Kukataa hakutumii taarifa yoyote kwa mtumaji. Mazungumzo yatataolewa kimya kimya.
              </p>
            </>
          ) : null}
        </div>
      ))}

      <div className="psh-chat__guard-note">
        <IconShield size={16} />
        <span>Una udhibiti kamili wa nani anaweza kupata namba yako au kukutumia ombi la mazungumzo.</span>
      </div>
    </div>
  )
}

export function RequestsPanel({ onToast }) {
  const [state, setState] = useState(null)
  const initial = useAsyncData(() => chatService.getRequests(), [])
  const view = state || initial
  if (!view) return null

  return (
    <RequestsBody
      view={view}
      onRespond={async (id, action) => {
        const res = await chatService.respondRequest(id, action)
        setState({ received: res.requests.filter((r) => r.type === 'received'), sent: res.requests.filter((r) => r.type === 'sent') })
        onToast?.(
          action === 'accept'
            ? 'Ombi limekubaliwa — mazungumzo yameanza'
            : action === 'block'
              ? 'Mtumiaji amezuiwa'
              : 'Ombi limekataliwa kimya kimya',
        )
      }}
      onToast={onToast}
    />
  )
}

/* ══════════════════════════════════════════════════════════════
   4) CHAT SEARCH — mazungumzo · ujumbe · watu (si Gundua)
   ══════════════════════════════════════════════════════════════ */

export function SearchBody({ query, setQuery, results, onOpenConversation, onStart, onToast }) {
  return (
    <div className="psh-panelstack">
      <label className="psh-chat__search" style={{ cursor: 'text' }}>
        <IconSearchSmall size={17} />
        <input
          className="psh-chat-lookup__input"
          style={{ border: 0, background: 'transparent', minHeight: 0, padding: 0 }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tafuta mazungumzo, ujumbe au watu…"
          aria-label="Tafuta kwenye Chat"
          autoFocus
        />
      </label>

      {!query ? (
        <p className="psh-panelstack__lead">
          Tafuta kwenye Chat: mazungumzo, ujumbe, vikundi, marafiki na watu. Ugunduzi wa jumuiya uko
          kwenye Gundua — si hapa.
        </p>
      ) : null}

      {query && results ? (
        <>
          <div className="psh-chat-section">
            <span className="psh-chat-section__title">Mazungumzo ({results.conversations.length})</span>
            <ul>
              {results.conversations.map((c) => (
                <PersonRow
                  key={c.id}
                  name={c.title}
                  meta={c.parentContext ? `Kikundi · ${c.parentContext.label}` : c.type === 'group' ? 'Kikundi' : 'Direct'}
                  tone={c.tone}
                  icon={c.type === 'group' ? c.groupIcon || 'group' : null}
                  onSelect={() => onOpenConversation(c.id)}
                />
              ))}
            </ul>
          </div>

          <div className="psh-chat-section">
            <span className="psh-chat-section__title">Ujumbe ({results.messages.length})</span>
            <ul className="psh-menu">
              {results.messages.map((m) => (
                <li key={m.id}>
                  <button type="button" className="psh-menu__row" onClick={() => onOpenConversation(m.convId)}>
                    <span className="psh-menu__icon">
                      <IconSearchSmall size={18} />
                    </span>
                    <span className="psh-menu__text">
                      <span className="psh-menu__label">{m.title}</span>
                      <span className="psh-menu__hint">
                        {m.text.slice(0, 56)} · {m.at}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="psh-chat-section">
            <span className="psh-chat-section__title">Watu ({results.people.length})</span>
            <ul>
              {results.people.map((p) => (
                <PersonRow
                  key={p.id}
                  name={p.name}
                  meta={`${p.phone}${p.saved ? ' · Saved Friend' : p.friend ? ' · PASIHAI Friend' : p.accountId ? ' · Akaunti ya PASIHAI' : ' · Hajajiunga'}`}
                  tone={p.tone}
                  action={p.accountId ? 'Anza' : 'Alika'}
                  onSelect={() =>
                    p.accountId
                      ? onStart?.(p.accountId)
                      : onToast?.(
                          `${p.name} hajiungi PASIHAI bado — tumia “Alika” kwenye New Chat kumwalika`,
                        )
                  }
                  onAction={() =>
                    p.accountId
                      ? onStart?.(p.accountId)
                      : onToast?.(
                          `${p.name} hajiungi PASIHAI bado — tumia “Alika” kwenye New Chat kumwalika`,
                        )
                  }
                />
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  )
}

export function SearchPanel({ onOpenConversation, onStart, onToast }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)

  const run = async (q) => {
    setQuery(q)
    setResults(q.trim() ? await chatService.search(q) : null)
  }

  return (
    <SearchBody
      query={query}
      setQuery={run}
      results={results}
      onOpenConversation={onOpenConversation}
      onStart={onStart}
      onToast={onToast}
    />
  )
}

/* ══════════════════════════════════════════════════════════════
   5) CHAT MORE (⋮) · SETTINGS · PRIVACY · NOTIFICATIONS ·
      ARCHIVED · BLOCKED · STORAGE
   ══════════════════════════════════════════════════════════════ */

export function MoreBody({ view, onOpen, onMarkAll, onToast }) {
  if (!view) return null
  return (
    <div className="psh-panelstack">
      <ul className="psh-menu">
        {view.menu.map((m) => (
          <li key={m.id}>
            <button type="button" className="psh-menu__row" onClick={() => onOpen(m.id)}>
              <span className="psh-menu__icon">
                {m.id === 'archived' ? <IconArchive size={19} /> : m.id === 'blocked' ? <IconBan size={19} /> : m.id === 'storage' ? <IconBolt size={19} /> : <IconShield size={19} />}
              </span>
              <span className="psh-menu__text">
                <span className="psh-menu__label">{m.label}</span>
                {m.hint ? <span className="psh-menu__hint">{m.hint}</span> : null}
              </span>
              <IconArrowRight size={17} />
            </button>
          </li>
        ))}
      </ul>
      <p className="psh-note">
        <IconInfo size={16} />
        Hii ni menyu ya Chat pekee — hakuna usimamizi wa Spaces, Hubs, Community wala Channel hapa.
      </p>
    </div>
  )
}

export function MorePanel({ onOpen, onToast }) {
  const view = useAsyncData(() => chatService.getMore(), [])
  return <MoreBody view={view} onOpen={onOpen} onToast={onToast} />
}

function ToggleList({ items, onToast, overrides = {} }) {
  const [local, setLocal] = useState({})
  const value = (s) => local[s.id] ?? overrides[s.id] ?? s.on

  const flip = async (s, v) => {
    setLocal((prev) => ({ ...prev, [s.id]: v }))
    await chatService.updateSettings({ [s.id]: v })
    onToast?.(`${s.label}: ${v ? 'imewashwa' : 'imezimwa'} — imehifadhiwa`)
  }

  return (
    <ul className="psh-switchrows">
      {items.map((s) => (
        <li key={s.id}>
          <span className="psh-sys-switchrow">
            <span className="psh-switchrows__label">{s.label}</span>
          </span>
          <Switch on={value(s)} onChange={(v) => flip(s, v)} label={s.label} />
        </li>
      ))}
    </ul>
  )
}

export function SettingsBody({ view, onToast }) {
  if (!view) return null
  const ov = view.settings.overrides || {}
  return (
    <div className="psh-panelstack">
      <h3 className="psh-panelstack__h">Chat settings</h3>
      <ToggleList items={view.settings.notifications} onToast={onToast} overrides={ov} />
      <h3 className="psh-panelstack__h">Storage na media</h3>
      <ToggleList items={view.settings.storage} onToast={onToast} overrides={ov} />
      <p className="psh-note">
        <IconInfo size={16} />
        {view.settings.e2e}
      </p>
    </div>
  )
}

const REQUEST_WITH = ['Watu wote', 'Watu ninaowafahamu', 'Watu waliohifadhiwa', 'Hakuna mtu']

export function PrivacyBody({ view, onToast }) {
  const [who, setWho] = useState(view?.settings?.overrides?.requestPolicy || REQUEST_WITH[1])
  if (!view) return null
  return (
    <div className="psh-panelstack">
      <h3 className="psh-panelstack__h">Faragha</h3>
      <ul className="psh-sys-lines">
        {view.settings.privacy.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <p className="psh-note">
        <IconShield size={16} />
        {view.settings.localFirst}
      </p>
      <div className="psh-panelstack__actions">
        <span className="psh-panelstack__count">
          Nani anaweza kutuma maombi: <b>{who}</b>
        </span>
        <button
          type="button"
          className="psh-btn psh-btn--sm"
          onClick={async () => {
            const next = REQUEST_WITH[(REQUEST_WITH.indexOf(who) + 1) % REQUEST_WITH.length]
            setWho(next)
            await chatService.updateSettings({ requestPolicy: next })
            onToast?.(`Nani anaweza kutuma maombi: ${next}`)
          }}
        >
          Badilisha nani anayeweza kutuma maombi ya mazungumzo
        </button>
      </div>
    </div>
  )
}

export function NotificationsBody({ view, onToast }) {
  if (!view) return null
  return (
    <div className="psh-panelstack">
      <h3 className="psh-panelstack__h">Taarifa</h3>
      <ToggleList
        items={view.settings.notifications}
        onToast={onToast}
        overrides={view.settings.overrides || {}}
      />
    </div>
  )
}

export function ArchivedBody({ onToast, onRefresh }) {
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState(null)
  const list = useAsyncData(() => chatService.listArchived(), [version])

  const restore = async (c) => {
    setBusy(c.id)
    await chatService.archiveConversation(c.id, false)
    setBusy(null)
    setVersion((v) => v + 1)
    onToast?.(`“${c.title}” imerudishwa kwenye orodha kuu`)
    onRefresh?.()
  }

  if (!list) return null

  return (
    <div className="psh-panelstack">
      {list.length === 0 ? (
        <div className="psh-empty">
          <IconArchive size={26} />
          <p>
            Hakuna mazungumzo yaliyohifadhiwa (Archived). Yanayohifadhiwa hayana taarifa na
            hayana idadi ya ujumbe mpya.
          </p>
        </div>
      ) : (
        <ul className="psh-menu">
          {list.map((c) => (
            <li key={c.id}>
              <div className="psh-menu__row psh-menu__row--static">
                <span className="psh-menu__icon">
                  <IconArchive size={18} />
                </span>
                <span className="psh-menu__text">
                  <span className="psh-menu__label">{c.title}</span>
                  <span className="psh-menu__hint">Bila taarifa · bado unayo</span>
                </span>
                <button
                  type="button"
                  className="psh-btn psh-btn--sm"
                  disabled={busy === c.id}
                  onClick={() => restore(c)}
                >
                  {busy === c.id ? 'Inarudisha…' : 'Rudisha'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="psh-note">
        <IconInfo size={16} /> Kuhifadhi mazungumzo ni kuweka kando — si kufuta, na hakuna taarifa
        zinazoendelea kuja.
      </p>
    </div>
  )
}

export function BlockedBody({ onToast }) {
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState(null)
  const list = useAsyncData(() => chatService.listBlocked(), [version])

  const unblock = async (b) => {
    setBusy(b.accountId)
    await chatService.unblockContact(b.accountId)
    setBusy(null)
    setVersion((v) => v + 1)
    onToast?.(`${b.name} amefunguliwa — anaweza kutuma tena`)
  }

  if (!list) return null

  return (
    <div className="psh-panelstack">
      {list.length === 0 ? (
        <div className="psh-empty">
          <IconBan size={24} />
          <p>Hakuna mtumiaji aliyezuiwa.</p>
        </div>
      ) : (
        <ul className="psh-menu">
          {list.map((b) => (
            <li key={b.accountId}>
              <div className="psh-menu__row psh-menu__row--static">
                <span className="psh-menu__icon">
                  <IconBan size={19} />
                </span>
                <span className="psh-menu__text">
                  <span className="psh-menu__label">{b.name} amezuiwa</span>
                  <span className="psh-menu__hint">Hawawezi kukutumia ujumbe wala maombi</span>
                </span>
                <button
                  type="button"
                  className="psh-btn psh-btn--sm"
                  disabled={busy === b.accountId}
                  onClick={() => unblock(b)}
                >
                  {busy === b.accountId ? 'Inafungua…' : 'Fungua'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="psh-note">
        <IconInfo size={16} />
        Kuzuia hakupeleki taarifa kwa mtumiaji aliyezuiwa.
      </p>
    </div>
  )
}

export function StorageBody({ onToast }) {
  const [version, setVersion] = useState(0)
  const [busy, setBusy] = useState(false)
  const snapshot = useAsyncData(() => systemService.getSnapshot(), [version])
  const offline = useAsyncData(() => systemService.getSaveOffline(), [version])

  const clear = async () => {
    setBusy(true)
    const res = await chatService.clearMedia()
    setBusy(false)
    setVersion((v) => v + 1)
    onToast?.(res.cleared ? 'Media ya zamani imesafishwa kwenye kikao hiki' : 'Hakuna media ya kusafisha')
  }

  if (!snapshot) return null

  const savedCount = (offline?.items || []).filter((i) => i.saved).length
  const canFetch = offline ? (offline.canFetch ? 'Inawezekana' : 'Haiwezekani sasa') : '—'

  return (
    <div className="psh-panelstack">
      <ul className="psh-kv">
        <li>
          <span>Data Saved (iliyoepushwa)</span>
          <strong>{formatMb(snapshot.dataSaved?.total)}</strong>
        </li>
        <li>
          <span>Cache ya sasa</span>
          <strong>{formatMb(snapshot.dataSaved?.cache?.total)}</strong>
        </li>
        <li>
          <span>Media iliyohifadhiwa bila mtandao</span>
          <strong>
            {savedCount} / {(offline?.items || []).length}
          </strong>
        </li>
        <li>
          <span>Kupakua media mpya sasa</span>
          <strong>{canFetch}</strong>
        </li>
      </ul>
      {offline?.note ? <p className="psh-note">{offline.note}</p> : null}
      <p className="psh-panelstack__foot">
        <IconInfo size={16} /> Namba hizi zinatoka kwenye hali ya kifaa (System) — si makadirio.
      </p>
      <div className="psh-panelstack__actions">
        <button
          type="button"
          className="psh-btn psh-btn--sm"
          disabled={busy}
          onClick={clear}
        >
          {busy ? 'Inasafisha…' : 'Safisha media ya zamani'}
        </button>
      </div>
      <p className="psh-note">
        <IconInfo size={16} />
        Media iliyozuiliwa na sera ya relay huchukua nafasi kwenye Offline Vault hadi itumwe.
      </p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   6) MEDIA GUARD — sera ya Internet Relay kwa media
      (hakuna silent fallback; mtumiaji achague njia)
   ══════════════════════════════════════════════════════════════ */

export function MediaGuardBody({ guard, onChoose, onToast }) {
  if (!guard) return null
  return (
    <div className="psh-panelstack">
      <div className="psh-sys-alert psh-sys-alert--limit">
        <IconTimer size={16} />
        <span>
          <b>{guard.title}</b>
          <br />
          {guard.text}
        </span>
      </div>

      <div className="psh-chat__guard-note">
        <IconShield size={16} />
        <span>
          {guard.relayNote} Hatuhamishi faili kwenda internet kimya kimya — unachagua njia mwenyewe.
        </span>
      </div>

      <h3 className="psh-panelstack__h">Chagua njia</h3>
      <ul className="psh-menu">
        {guard.choices.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className="psh-menu__row"
              disabled={c.id === 'mesh' && !guard.meshAvailable}
              aria-disabled={c.id === 'mesh' && !guard.meshAvailable ? true : undefined}
              onClick={() => {
                if (c.id === 'mesh' && !guard.meshAvailable) {
                  onToast?.('Local Mesh haipo karibu sasa — chagua njia nyingine')
                  return
                }
                onChoose(c.id)
              }}
            >
              <span className="psh-menu__icon">
                {c.id === 'mesh' ? <IconRadar size={19} /> : c.id === 'data-now' ? <IconBolt size={19} /> : <IconRefresh size={19} />}
              </span>
              <span className="psh-menu__text">
                <span className="psh-menu__label">{c.label}</span>
                <span className="psh-menu__hint">
                  {c.id === 'mesh' && !guard.meshAvailable ? 'Haipatikani sasa' : c.hint}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <p className="psh-note">
        <IconInfo size={16} />
        Video, picha, sauti na hati hazipiti Internet Relay (ujumbe mfupi pekee). Faili linaweza kutumwa
        kwa Local Mesh, Wi-Fi au kwa Data yako — kwa uamuzi wako.
      </p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   7) SAUTI NA MWITO — hakuna simu ya sauti kwenye prototype hii.
      Badala yake: njia HALISI zinazopatikana sasa (ujumbe wa sauti)
      na maelezo ya wazi. Hakuna kitufe kinachodai kitu kisichopo.
   ══════════════════════════════════════════════════════════════ */

export function CallBody({ conv, onVoiceMessage, onClose, onToast }) {
  if (!conv) return null
  return (
    <div className="psh-panelstack">
      <div className="psh-chat-case__top">
        <ChatAvatar tone={conv.tone} name={conv.title} />
        <span className="psh-chat-person__text">
          <span className="psh-chat-person__name">{conv.title}</span>
          <span className="psh-chat-person__meta">
            {conv.type === 'group' ? `Kikundi · wanachama ${conv.members || 0}` : 'Mazungumzo ya faragha'}
          </span>
        </span>
      </div>

      <p className="psh-note">
        <IconInfo size={16} /> Simu za sauti na video hazipo kwenye prototype hii. Unachoweza
        kufanya sasa ni kutuma ujumbe wa sauti — njia ileile ya mawasiliano ya Chat.
      </p>

      <ul className="psh-menu">
        <li>
          <button
            type="button"
            className="psh-menu__row"
            onClick={() => {
              onVoiceMessage?.(conv.id)
              onClose?.()
            }}
          >
            <span className="psh-menu__icon">
              <IconMic size={19} />
            </span>
            <span className="psh-menu__text">
              <span className="psh-menu__label">Tuma ujumbe wa sauti</span>
              <span className="psh-menu__hint">Unarekodi ujumbe mfupi kwenye mazungumzo haya</span>
            </span>
          </button>
        </li>
        <li>
          <button
            type="button"
            className="psh-menu__row"
            onClick={() => {
              onToast?.('Ujumbe wa maandishi — composer iko chini')
              onClose?.()
            }}
          >
            <span className="psh-menu__icon">
              <IconComment size={19} />
            </span>
            <span className="psh-menu__text">
              <span className="psh-menu__label">Andika ujumbe wa maandishi</span>
              <span className="psh-menu__hint">Composer ileile ya thread</span>
            </span>
          </button>
        </li>
      </ul>
    </div>
  )
}
