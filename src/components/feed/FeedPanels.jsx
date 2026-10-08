// ══════════════════════════════════════════════════════════════
// PASIHAI — PANELS ZA CHAPISHO (Maoni · Kushiriki · Zaidi)
//
// Panels hizi ni sehemu za mazungumzo ya mkondo — SI ukurasa wa pili:
//   · Maoni: orodha halisi + kuongeza maoni yangu
//   · Kushiriki: nakili kiungo (clipboard) · tuma kwa Chat (halisi)
//   · Zaidi: ficha · ripoti · nakili kiungo · fuata mwandishi
//
// Kila kitu kinaenda kwa feedService → contentRepository (hali ya kikao).
// ══════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'

import { Avatar, Button } from '../ui.jsx'
import { feedService } from '../../services/feedService.js'
import { chatService } from '../../services/chatService.js'
import {
  IconBan,
  IconCheck,
  IconComment,
  IconEye,
  IconHeart,
  IconInfo,
  IconLink,
  IconShare,
  IconShield,
  IconSpark,
  IconTag,
} from '../icons.jsx'

/* ── 1. MAONI ─────────────────────────────────────────────── */

export function CommentsPanel({ item, onToast, onCommentAdded }) {
  const [list, setList] = useState(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let live = true
    feedService.listComments(item.id).then((c) => live && setList(c))
    return () => { live = false }
  }, [item.id])

  const send = async (e) => {
    e?.preventDefault?.()
    const t = text.trim()
    if (!t || busy) return
    setBusy(true)
    const c = await feedService.addComment(item.id, t)
    setList((l) => [...(l || []), c])
    setText('')
    setBusy(false)
    onCommentAdded?.(1)
    onToast?.('Maoni yako yameongezwa')
  }

  return (
    <div className="psh-cmts">
      <p className="psh-cmts__lead">
        <IconComment size={15} /> Maoni ya <b>{item.entity?.name}</b> — yanaonekana kwa wote wanaoona chapisho hiki.
      </p>

      {item.text ? <p className="psh-cmts__post">{item.text}</p> : null}

      {!list ? (
        <p className="psh-cmts__empty">Inapakia maoni…</p>
      ) : list.length === 0 ? (
        <p className="psh-cmts__empty">
          <IconSpark size={16} /> Hakuna maoni bado. Kuwa wa kwanza kuchangia.
        </p>
      ) : (
        <ul className="psh-cmts__list">
          {list.map((c) => (
            <li key={c.id} className={c.mine ? 'is-mine' : ''}>
              <span className={`psh-gu-ava psh-gu-ava--${c.tone || 'green'}`} aria-hidden="true">
                {c.author.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
              </span>
              <div className="psh-cmts__body">
                <p className="psh-cmts__name">
                  {c.author}
                  {c.mine ? <span className="psh-cmts__you">Wewe</span> : null}
                </p>
                <p className="psh-cmts__text">{c.text}</p>
                <p className="psh-cmts__at">{c.at}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form className="psh-cmts__form" onSubmit={send}>
        <input
          className="psh-share__input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Andika maoni…"
          aria-label="Andika maoni"
        />
        <Button variant="primary" onClick={send} loading={busy} disabled={!text.trim()} loadingLabel="Inatuma">
          Tuma
        </Button>
      </form>
    </div>
  )
}

/* ── 2. KUSHIRIKI ─────────────────────────────────────────── */

export function SharePanel({ item, onToast, onOpenChat }) {
  const [conversations, setConversations] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [sentTo, setSentTo] = useState([])

  useEffect(() => {
    let live = true
    chatService.getInbox('zote').then((res) => live && setConversations((res?.conversations || []).slice(0, 5)))
    return () => { live = false }
  }, [])

  const link = `pasihai.app/p/${item.id}`

  const copy = async () => {
    try {
      await navigator.clipboard?.writeText(`https://${link}`)
      onToast?.('Kiungo kimenakiliwa')
    } catch {
      onToast?.('Kiungo: ' + link)
    }
  }

  const sendToChat = async (convo) => {
    setBusyId(convo.id)
    const res = await chatService.sendMessage(convo.id, { text: `Nimekushirikia chapisho: ${link}` })
    setBusyId(null)
    if (!res?.message) {
      onToast?.('Ujumbe haujatumwa — angalia hali ya mtandao')
      return
    }
    setSentTo((s) => [...s, convo.id])
    onToast?.(`Kimeshirikiwa kwenye ${convo.title || convo.name}`)
  }

  return (
    <div className="psh-share">
      <p className="psh-share__lead">
        <IconShare size={15} /> Kushiriki kunatuma <b>kiungo</b>, si faili — hakuna media inayopita Internet Relay.
      </p>

      <ul className="psh-share__quick">
        <li>
          <button type="button" className="psh-share__row" onClick={copy}>
            <span className="psh-share__icon"><IconLink size={18} /></span>
            <span className="psh-share__text">
              <b>Nakili kiungo</b>
              <span>{link}</span>
            </span>
          </button>
        </li>
        <li>
          <button
            type="button"
            className="psh-share__row"
            disabled={busyId === 'save'}
            onClick={async () => {
              setBusyId('save')
              const res = await feedService.toggleSaved(item)
              setBusyId(null)
              onToast?.(res.saved ? 'Kimehifadhiwa — kinaonekana kwenye Zilizohifadhiwa' : 'Kimeondolewa kwenye zilizohifadhiwa')
            }}
          >
            <span className="psh-share__icon"><IconTag size={18} /></span>
            <span className="psh-share__text">
              <b>Hifadhi kwenye Zilizohifadhiwa</b>
              <span>Chapisho hili linaonekana kwenye paneli ya Zilizohifadhiwa</span>
            </span>
          </button>
        </li>
      </ul>

      <h3 className="psh-share__h">Tuma kwenye Chat</h3>
      {!conversations ? (
        <p className="psh-cmts__empty">Inapakia mazungumzo…</p>
      ) : (
        <ul className="psh-share__list">
          {conversations.map((c) => {
            const done = sentTo.includes(c.id)
            return (
              <li key={c.id}>
                <span className="psh-share__who">
                  <b>{c.title || c.name}</b>
                  <span>{c.type === 'group' ? 'Kikundi' : 'Direct'} · {c.last?.text?.slice(0, 30) || '—'}</span>
                </span>
                <Button
                  size="sm"
                  variant={done ? 'done' : 'soft'}
                  loading={busyId === c.id}
                  onClick={() => sendToChat(c)}
                  icon={done ? <IconCheck size={15} /> : null}
                >
                  {done ? 'Imetumwa' : 'Tuma'}
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      <p className="psh-share__note">
        <IconShield size={14} /> Chat inaendelea kuwa mfumo mmoja — kushiriki hakuundi mazungumzo mapya
        bila wewe kuamua.
      </p>
    </div>
  )
}

/* ── 3. ZAIDI (muktadha) ──────────────────────────────────── */

export function PostMenuPanel({ item, onToast, onHidden, onOpenProfile }) {
  const [state, setState] = useState({ hidden: false, reported: false, following: false })
  const [busy, setBusy] = useState('')

  useEffect(() => {
    let live = true
    Promise.all([
      feedService.listFollowed(),
    ]).then(([followed]) => live && setState((s) => ({ ...s, following: followed.includes(item.userId) })))
    return () => { live = false }
  }, [item.userId])

  const run = async (key, fn, msg) => {
    setBusy(key)
    await fn()
    setBusy('')
    setState((s) => ({ ...s, [key]: true }))
    onToast?.(msg)
  }

  return (
    <div className="psh-postmenu">
      <p className="psh-postmenu__item">
        <b>{item.entity?.name}</b>
        <span>{item.entity?.handle} · {item.kind}</span>
      </p>

      <ul className="psh-menu">
        <li>
          <button
            type="button"
            className="psh-menu__row"
            onClick={() => run('following', () => feedService.toggleFollow(item.userId, true), `Unafuata ${item.entity?.name}`)}
          >
            <span className="psh-menu__icon"><IconCheck size={18} /></span>
            <span className="psh-menu__text">
              <span className="psh-menu__label">{state.following ? 'Unafuata' : 'Fuata mwandishi'}</span>
              <span className="psh-menu__hint">{state.following ? 'Hali ipo kwenye wasifu na Gundua' : 'Chapisho lake litaonekana zaidi'}</span>
            </span>
          </button>
        </li>
        <li>
          <button
            type="button"
            className="psh-menu__row"
            onClick={() => run('hidden', () => feedService.hidePost(item.id), 'Chapisho kimefichwa kutoka mkondo')}
          >
            <span className="psh-menu__icon"><IconEye size={18} /></span>
            <span className="psh-menu__text">
              <span className="psh-menu__label">{state.hidden ? 'Kimefichwa' : 'Ficha chapisho'}</span>
              <span className="psh-menu__hint">Hakuna taarifa kwa mwandishi</span>
            </span>
          </button>
        </li>
        <li>
          <button
            type="button"
            className="psh-menu__row"
            onClick={async () => {
              await feedService.toggleSaved(item)
              onToast?.('Kimehifadhiwa kwenye Zilizohifadhiwa')
            }}
          >
            <span className="psh-menu__icon"><IconTag size={18} /></span>
            <span className="psh-menu__text"><span className="psh-menu__label">Hifadhi</span></span>
          </button>
        </li>
        <li>
          <button
            type="button"
            className="psh-menu__row"
            onClick={() => onOpenProfile?.(item.entity?.id)}
          >
            <span className="psh-menu__icon"><IconHeart size={18} /></span>
            <span className="psh-menu__text">
              <span className="psh-menu__label">Fungua wasifu</span>
              <span className="psh-menu__hint">Taarifa za umma za mwandishi</span>
            </span>
          </button>
        </li>
        <li>
          <button
            type="button"
            className="psh-menu__row psh-menu__row--danger"
            disabled={state.reported || busy === 'reported'}
            onClick={() => run('reported', () => feedService.reportPost(item.id, 'Maudhui yasiyofaa'), 'Ripoti imetumwa kwa ukaguzi')}
          >
            <span className="psh-menu__icon"><IconBan size={18} /></span>
            <span className="psh-menu__text">
              <span className="psh-menu__label">{state.reported ? 'Umeripoti' : 'Ripoti chapisho'}</span>
              <span className="psh-menu__hint">Ukaguzi wa PASIHAI — hakuna taarifa kwa mwandishi</span>
            </span>
          </button>
        </li>
      </ul>

      <p className="psh-note">
        <IconInfo size={15} /> Vitendo hivi ni vya muktadha wa chapisho hiki pekee. Ficha na ripoti
        haziathiri urafiki au ufuataji wako.
      </p>
    </div>
  )
}

/* ── 4. KIKAO CHA MOJA KWA MOJA (Live) ────────────────────────
   Kikao ni cha kweli: kuanza · kujiunga · kukumbuka · kumaliza —
   kila kitu kinahifadhiwa kwenye hali ya kikao (contentRepository). */

export function LivePanel({ item, onToast, onChanged, onOpenProfile }) {
  const live = item?.live || {}
  const mine = !!item?.mine
  const [busy, setBusy] = useState(null)
  const [joined, setJoined] = useState(false)
  const [reminded, setReminded] = useState(false)

  if (!item) return null

  const run = async (id, fn, msg) => {
    setBusy(id)
    try {
      await fn()
      onToast?.(msg)
      onChanged?.()
    } finally {
      setBusy(null)
    }
  }

  const stateLabel =
    live.state === 'live' ? 'Inaendelea' : live.state === 'upcoming' ? 'Imepangwa' : 'Iliyopita'

  return (
    <div className="psh-livepanel">
      <div className="psh-livepanel__head">
        <span className={`psh-live__badge psh-live__badge--${live.state === 'live' ? 'live' : live.state === 'upcoming' ? 'upcoming' : 'replay'}`}>
          {live.state === 'live' ? <span className="psh-live__dot" aria-hidden="true" /> : null}
          {stateLabel}
        </span>
        <span className="psh-live__mode">{live.mode}</span>
        {item.liveRunning ? <span className="psh-live__cat">Kikao chako</span> : null}
      </div>

      <h3 className="psh-livepanel__title">{live.title || item.text}</h3>
      <p className="psh-livepanel__meta">
        Mwenyeji: <b>{live.host}</b>
        {live.viewers ? <> · {live.viewers.toLocaleString('en-US')} wanaoshiriki</> : null}
        {live.when ? <> · {live.when}</> : null}
      </p>

      <ul className="psh-livepanel__facts">
        <li>
          <IconEye size={16} />
          <span>
            {live.state === 'live'
              ? 'Kikao kinaendelea sasa'
              : live.state === 'upcoming'
                ? 'Kikao bado hakijaanza'
                : 'Kikao kimekwisha — unaweza kukitazama tena'}
          </span>
        </li>
        <li>
          <IconShield size={16} />
          <span>Vikao ni vya kikao hiki — hakuna kurekodiwa kwa siri.</span>
        </li>
      </ul>

      <div className="psh-livepanel__actions">
        {item.liveRunning ? (
          <Button
            variant="danger"
            loading={busy === 'end'}
            loadingLabel="Inamaliza…"
            onClick={() =>
              run('end', () => feedService.endLive(item.id), 'Kikao kimekamilika — kimehamia Zilizopita')
            }
          >
            Maliza kikao
          </Button>
        ) : live.state === 'upcoming' ? (
          <Button
            variant={reminded ? 'done' : 'primary'}
            loading={busy === 'rem'}
            onClick={() => {
              setReminded(true)
              run('rem', () => Promise.resolve(), 'Tutakukumbusha kikao hiki kianzapo')
            }}
          >
            {reminded ? 'Tutakukumbusha' : 'Kumbusha'}
          </Button>
        ) : (
          <Button
            variant={joined ? 'done' : 'primary'}
            loading={busy === 'join'}
            onClick={() => {
              setJoined(true)
              run('join', () => Promise.resolve(), 'Umejiunga na kikao — unatazama sasa')
            }}
          >
            {joined ? 'Unatazama' : live.state === 'replay' ? 'Tazama tena' : 'Jiunge'}
          </Button>
        )}
        {!mine ? (
          <Button variant="ghost" onClick={() => onOpenProfile?.(item.userId)}>
            Wasifu wa mwenyeji
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => onChanged?.()} loading={busy === 'refresh'}>
            Sasisha hali
          </Button>
        )}
      </div>

      <p className="psh-note">
        <IconInfo size={15} /> Kikao cha moja kwa moja ni tofauti na Live Activity — hiki ni kikao,
        kile ni shughuli kwenye mkondo.
      </p>
    </div>
  )
}

/* ── 5. STATUS / STORIES ─────────────────────────────────────
   Kuunda status yangu (saa 24) na kuona status zote.                 */

const STATUS_TONES = [
  { id: 'green', label: 'Kijani' },
  { id: 'blue', label: 'Bluu' },
  { id: 'gold', label: 'Dhahabu' },
  { id: 'plum', label: 'Zambarau' },
]

export function StatusComposerPanel({ onToast, onClose, onCreated }) {
  const [text, setText] = useState('')
  const [tone, setTone] = useState('green')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const post = async () => {
    if (!text.trim()) return
    setBusy(true)
    await feedService.createStatus({ text: text.trim(), tone })
    setBusy(false)
    setDone(true)
    onToast?.('Status yako imechapishwa — inaonekana saa 24')
    onCreated?.()
    onClose?.()
  }

  return (
    <div className="psh-panelstack">
      <p className="psh-panelstack__lead">
        Status huonekana kwa saa 24 kisha hupotea. Ni yako — haihifadhiwi kwa mtu mwingine.
      </p>

      <label className="psh-compose">
        <span className="u-sr">Maandishi ya status</span>
        <textarea
          className="psh-compose__input"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Andika status yako…"
        />
      </label>

      <h3 className="psh-panelstack__h">Rangi ya mandhari</h3>
      <ul className="psh-chips">
        {STATUS_TONES.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              className={`psh-chipbtn ${tone === t.id ? 'is-on' : ''}`}
              aria-pressed={tone === t.id}
              onClick={() => setTone(t.id)}
            >
              {tone === t.id ? <IconCheck size={14} strokeWidth={2.4} /> : null}
              {t.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="psh-panelstack__actions">
        <Button
          variant="primary"
          loading={busy}
          loadingLabel="Inachapisha…"
          disabled={!text.trim() || done}
          onClick={post}
        >
          Chapisha status
        </Button>
      </div>
    </div>
  )
}

export function StatusAllPanel({ items, onOpenProfile, onOpenMine, onToast }) {
  if (!items) return <p className="psh-cmts__empty">Inapakia status…</p>
  return (
    <div className="psh-panelstack">
      <p className="psh-panelstack__lead">
        Status zote za watu unaowafuata. Kila moja inaisha saa 24 baada ya kuchapishwa.
      </p>
      <ul className="psh-statusall">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="psh-statusall__row"
              onClick={() => (item.own ? onOpenMine?.() : onOpenProfile?.(item.userId))}
            >
              <Avatar user={item.user} size={40} shape="circle" badge={false} />
              <span className="psh-statusall__text">
                <b>{item.own ? 'Status yako' : item.user?.name}</b>
                <span>
                  {item.label}
                  {item.ago ? ` · ${item.ago}` : ''}
                </span>
              </span>
              <span className={`psh-statusall__dot psh-statusall__dot--${item.own ? 'own' : item.viewed ? 'viewed' : 'new'}`} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
      <p className="psh-note">
        <IconInfo size={15} /> Hii ni orodha halisi ya status zilizopo sasa. Kugusa jina kunafungua
        maelezo ya mtu au status yako.
      </p>
    </div>
  )
}
