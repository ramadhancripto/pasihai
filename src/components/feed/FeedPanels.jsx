import { plainText } from '../../utils/postContent.js'
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
import { homeService } from '../../services/homeService.js'
import { chatService } from '../../services/chatService.js'
import { ValidationError } from '../../utils/errors.js'
import { StatusConfigurationError, statusErrorMessage, validateStatusDraft, validateStatusFile } from '../../utils/statusMedia.js'
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

      {item.text ? <p className="psh-cmts__post">{plainText(item.text)}</p> : null}

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
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!file) {
      setPreviewUrl('')
      return undefined
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const chooseFile = (event) => {
    const picked = event.currentTarget.files?.[0] || null
    event.currentTarget.value = ''
    if (!picked) return
    try {
      const mediaKind = validateStatusFile(picked)
      const expectedKind = event.currentTarget.dataset.statusKind
      if (expectedKind && expectedKind !== mediaKind) {
        throw new ValidationError(`Tumia kitufe cha ${expectedKind === 'image' ? 'picha' : 'video'} kuchagua faili hili.`)
      }
      setFile(picked)
      setError('')
    } catch (validationError) {
      setError(statusErrorMessage(validationError))
    }
  }

  const post = async () => {
    if (busy) return
    setError('')
    setBusy(true)
    try {
      validateStatusDraft({ text, file })
      const created = await feedService.createStatus({ text, tone, file })
      if (!created) throw new Error('Status haikuhifadhiwa.')
      if (created.persistence === 'mock') throw new StatusConfigurationError()

      onCreated?.()
      if (created.mediaWarning) {
        onToast?.('Status imehifadhiwa, lakini kiungo cha kuonyesha media hakikupatikana; itajaribiwa tena.')
      } else {
        onToast?.('Status imehifadhiwa — inaonekana hadi saa 24.')
      }
      onClose?.()
    } catch (postError) {
      setError(statusErrorMessage(postError))
    } finally {
      setBusy(false)
    }
  }

  const canPost = Boolean(text.trim() || file)
  const previewIsVideo = file?.type.startsWith('video/')

  return (
    <div className="psh-panelstack">
      <p className="psh-panelstack__lead">
        Andika status au ongeza picha/video kwa hiari. Status huisha baada ya saa 24.
      </p>

      <label className="psh-compose">
        <span className="u-sr">Maandishi ya status</span>
        <textarea
          className="psh-compose__input"
          rows={3}
          maxLength={500}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Andika status yako…"
        />
        <span className="psh-status-composer__count" aria-live="polite">{text.length}/500</span>
      </label>

      <div className="psh-status-media">
        <div className="psh-status-media__pickers">
          <input
            id="psh-status-image-file"
            className="u-sr psh-status-media__input"
            type="file"
            data-status-kind="image"
            accept="image/jpeg,image/png,image/webp,image/gif"
            aria-label="Chagua picha ya Status"
            aria-describedby="psh-status-media-help"
            disabled={busy}
            onChange={chooseFile}
          />
          <label className="psh-btn psh-btn--soft psh-btn--sm psh-status-media__picker" htmlFor="psh-status-image-file">
            {file?.type.startsWith('image/') ? 'Badilisha picha' : 'Chagua picha'}
          </label>
          <input
            id="psh-status-video-file"
            className="u-sr psh-status-media__input"
            type="file"
            data-status-kind="video"
            accept="video/mp4,video/webm,video/quicktime"
            aria-label="Chagua video ya Status"
            aria-describedby="psh-status-media-help"
            disabled={busy}
            onChange={chooseFile}
          />
          <label className="psh-btn psh-btn--soft psh-btn--sm psh-status-media__picker" htmlFor="psh-status-video-file">
            {previewIsVideo ? 'Badilisha video' : 'Chagua video'}
          </label>
        </div>
        <p id="psh-status-media-help" className="psh-note">
          Picha: JPEG, PNG, WebP, GIF · Video: MP4, WebM, MOV · hadi MB 25.
        </p>
        {file ? (
          <div className="psh-status-media__preview">
            {previewIsVideo ? (
              <video src={previewUrl} controls playsInline preload="metadata" aria-label="Hakiki video ya status" />
            ) : (
              <img src={previewUrl} alt="Hakiki picha ya status" />
            )}
            <div className="psh-status-media__fileline">
              <span>{file.name}</span>
              <button type="button" className="psh-status-media__remove" disabled={busy} onClick={() => setFile(null)}>
                Ondoa
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <h3 className="psh-panelstack__h">Rangi ya mandhari</h3>
      <ul className="psh-chips">
        {STATUS_TONES.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={`psh-chipbtn ${tone === item.id ? 'is-on' : ''}`}
              aria-pressed={tone === item.id}
              disabled={busy}
              onClick={() => setTone(item.id)}
            >
              {tone === item.id ? <IconCheck size={14} strokeWidth={2.4} /> : null}
              {item.label}
            </button>
          </li>
        ))}
      </ul>

      {error ? <p className="psh-status-feedback psh-status-feedback--error" role="alert">{error}</p> : null}

      <div className="psh-panelstack__actions">
        <Button
          variant="primary"
          loading={busy}
          loadingLabel="Inahifadhi…"
          disabled={!canPost}
          onClick={post}
        >
          Chapisha status
        </Button>
      </div>
    </div>
  )
}

export function StatusAllPanel({ onOpenStatus, onOpenMine }) {
  const [items, setItems] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    setItems(null)

    homeService.getStatusStrip()
      .then((nextItems) => {
        if (!active) return
        if (nextItems.some((item) => !item.user)) {
          throw new Error('Taarifa za mwandishi wa status hazikupatikana.')
        }
        setItems(nextItems)
      })
      .catch((loadError) => {
        if (active) setError(statusErrorMessage(loadError))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [retryKey])

  if (loading) {
    return <p className="psh-statusall__state" role="status" aria-live="polite">Inapakia status…</p>
  }

  if (error) {
    return (
      <div className="psh-statusall__state psh-statusall__state--error" role="alert">
        <span>{error}</span>
        <Button variant="ghost" size="sm" onClick={() => setRetryKey((key) => key + 1)}>
          Jaribu tena
        </Button>
      </div>
    )
  }

  if (!items?.length) {
    return (
      <div className="psh-panelstack">
        <p className="psh-panelstack__lead">Hakuna Status hai kutoka akaunti unazofuata kwa sasa.</p>
        <div className="psh-statusall__empty">
          <p>Hakuna Status ya majaribio inayoonyeshwa. Status itatokea baada ya Supabase kuihifadhi.</p>
          <Button variant="primary" onClick={onOpenMine}>Unda status</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="psh-panelstack">
      <p className="psh-panelstack__lead">
        Akaunti moja ina entry moja; Status zake zinafunguka pamoja ndani ya Story viewer.
      </p>
      <ul className="psh-statusall">
        {items.map((item) => {
          const latest = item.latestStatus
          const name = item.own ? 'Status yako' : item.user.name
          const handle = item.user.handle || item.user.type || 'Mtumiaji'
          const mediaLabel = latest?.mediaType === 'video'
            ? 'Video'
            : latest?.mediaType === 'image'
              ? 'Picha'
              : 'Maandishi'
          const countLabel = `${item.statusCount} ${item.statusCount === 1 ? 'Status' : 'Status'} · ${mediaLabel}`
          const createdAt = latest?.createdAt
          const createdLabel = latest?.ago || latest?.createdAtLabel || ''

          return (
            <li key={item.id} className="psh-statusall__item" data-status-own={item.own ? 'true' : 'false'}>
              <article className="psh-statusall__card">
                <header className="psh-statusall__head">
                  <button
                    type="button"
                    className="psh-statusall__identity"
                    onClick={() => onOpenStatus?.(item)}
                    aria-label={`Tazama ${name}, ${countLabel}`}
                  >
                    <Avatar user={item.user} size={42} shape="circle" badge={false} />
                    <span className="psh-statusall__text">
                      <b>{name}</b>
                      <span>{handle}</span>
                    </span>
                  </button>
                  <span className="psh-statusall__count">{item.statusCount}</span>
                </header>
                <p className="psh-statusall__meta">{countLabel}</p>
                <p className="psh-statusall__time">
                  {createdAt ? <time dateTime={createdAt}>{createdLabel || 'Imechapishwa'}</time> : createdLabel}
                  {latest?.expiresAtLabel ? ` · Inaisha ${latest.expiresAtLabel}` : ''}
                </p>
                <Button variant="soft" size="sm" onClick={() => onOpenStatus?.(item)}>
                  Tazama Story
                </Button>
              </article>
            </li>
          )
        })}
      </ul>
      <p className="psh-note">
        <IconInfo size={15} /> Maelezo na media huonekana ndani ya Story viewer. Maoni ya Status hayatekelezwi kwa sasa.
      </p>
    </div>
  )
}

const STATUS_VIEWER_TONES = new Set(['green', 'blue', 'gold', 'plum'])

export function StatusViewerPanel({ group, onToast, onChanged, onClose, onAdd }) {
  const initialStatuses = (group?.statuses || []).filter((status, index, list) => {
    if (!status?.id || list.findIndex((item) => item?.id === status.id) !== index) return false
    const expiry = Date.parse(status.expiresAt || '')
    return !Number.isFinite(expiry) || expiry > Date.now()
  })
  const initialId = group?.initialStatusId || initialStatuses[0]?.id
  const [statuses, setStatuses] = useState(initialStatuses)
  const [index, setIndex] = useState(() => {
    const found = initialStatuses.findIndex((status) => status.id === initialId)
    return found >= 0 ? found : 0
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [mediaError, setMediaError] = useState(false)

  const status = statuses[index] || null
  const user = group?.user || status?.user || null
  const name = group?.own ? 'Status yako' : user?.name || 'Status'
  const mediaUrl = status?.mediaUrl || status?.media?.url || null
  const mediaType = status?.mediaType || status?.media?.type || null
  const tone = STATUS_VIEWER_TONES.has(status?.tone) ? status.tone : 'green'
  const isVideo = mediaType === 'video'
  const createdLabel = status?.ago || status?.createdAtLabel || 'Imechapishwa'

  useEffect(() => { setMediaError(false) }, [status?.id])

  const deleteCurrentStatus = async () => {
    if (!status?.id || !group?.own || busy) return
    setBusy(true)
    setError('')
    try {
      const result = await feedService.deleteStatus(status.id)
      if (!result?.deleted) {
        setError('Status haikupatikana tena au tayari imeisha muda wake.')
        return
      }
      const next = statuses.filter((item) => item.id !== status.id)
      setStatuses(next)
      setIndex((current) => Math.min(current, Math.max(0, next.length - 1)))
      onChanged?.()
      onToast?.(result.mediaCleanupPending
        ? 'Status imefutwa; usafishaji wa faili yake unaendelea.'
        : 'Status imefutwa.')
      if (next.length === 0) onClose?.()
    } catch (deleteError) {
      setError(statusErrorMessage(deleteError))
    } finally {
      setBusy(false)
    }
  }

  if (!status) {
    return (
      <div className="psh-status-viewer__empty" role="status">
        <p>Status hii haipo tena au muda wake umeisha.</p>
        <Button variant="soft" onClick={onClose}>Rudi</Button>
      </div>
    )
  }

  return (
    <div className="psh-status-viewer" aria-label="Story viewer ya Status">
      <div className="psh-status-viewer__progress" aria-label={`Status ${index + 1} kati ya ${statuses.length}`}>
        {statuses.map((item, itemIndex) => (
          <span
            key={item.id}
            className={itemIndex < index ? 'is-complete' : itemIndex === index ? 'is-current' : ''}
          />
        ))}
      </div>

      <header className="psh-status-viewer__head">
        <div className="psh-status-viewer__identity">
          <Avatar user={user} size={38} shape="circle" badge={false} />
          <span className="psh-status-viewer__who">
            <b>{name}</b>
            <span>
              {status.createdAt
                ? <time dateTime={status.createdAt}>{createdLabel}</time>
                : createdLabel}
            </span>
          </span>
        </div>
        {group?.own ? (
          <div className="psh-status-viewer__own-actions">
            <Button variant="soft" size="sm" onClick={onAdd}>Ongeza</Button>
            <Button
              variant="danger"
              size="sm"
              loading={busy}
              loadingLabel="Inafuta…"
              disabled={busy}
              onClick={deleteCurrentStatus}
            >
              Futa
            </Button>
          </div>
        ) : null}
      </header>

      {error ? <p className="psh-status-feedback psh-status-feedback--error" role="alert">{error}</p> : null}

      <div className={`psh-status-viewer__stage psh-status-story--${tone}`}>
        <div className={`psh-status-story ${!mediaUrl ? 'psh-status-story--text' : 'psh-status-story--media'}`}>
          {mediaUrl && !mediaError ? (
            isVideo ? (
              <video
                key={status.id}
                className="psh-status-story__media"
                src={mediaUrl}
                controls
                playsInline
                preload="metadata"
                aria-label={`Video ya Status ya ${name}`}
                onError={() => setMediaError(true)}
              />
            ) : (
              <img
                key={status.id}
                className="psh-status-story__media"
                src={mediaUrl}
                alt={`Picha ya Status ya ${name}`}
                onError={() => setMediaError(true)}
              />
            )
          ) : null}
          {status.text?.trim() ? (
            <p className="psh-status-story__caption">{status.text.trim()}</p>
          ) : null}
          {(!mediaUrl || mediaError) && !status.text?.trim() ? (
            <p className="psh-status-story__unavailable" role="status">
              {status.mediaType
                ? `${status.mediaType === 'video' ? 'Video' : 'Picha'} ya Status haipatikani kwa sasa.`
                : 'Maudhui ya Status hayawezi kuonyeshwa.'}
            </p>
          ) : null}
        </div>
      </div>

      <div className="psh-status-viewer__meta">
        <span>{index + 1} / {statuses.length}</span>
        {status.expiresAtLabel ? <time dateTime={status.expiresAt}>Inaisha {status.expiresAtLabel}</time> : null}
      </div>

      <nav className="psh-status-viewer__nav" aria-label="Urambazaji wa Status">
        <Button variant="ghost" size="sm" disabled={index <= 0} onClick={() => setIndex((current) => Math.max(0, current - 1))}>
          ‹ Iliyotangulia
        </Button>
        <Button variant="ghost" size="sm" disabled={index >= statuses.length - 1} onClick={() => setIndex((current) => Math.min(statuses.length - 1, current + 1))}>
          Ifuatayo ›
        </Button>
      </nav>

      <p className="psh-status-viewer__comments">Maoni ya Status hayapatikani kwa sasa.</p>
    </div>
  )
}
