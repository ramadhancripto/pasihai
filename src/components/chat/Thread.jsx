// ══════════════════════════════════════════════════════════════
// PASIHAI — THREAD (Direct + Group: mfumo MMOJA)
//
// · bubbles za aina zote (text · reply · audio · poll · location ·
//   shared · doc · announcement · video/media)
// · composer MOJA (text · attach · camera · mic · send)
// · vitendo vya ujumbe: long-press (vidole) / ⋯ (keyboard+mouse) →
//   sheet moja (reuse ya Sheet ileile ya app)
// · swipe → jibu
// · sera ya relay: media haipiti — inaonyeshwa njia mbadala, si kubadili kimya
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'

import Sheet from '../Sheet.jsx'
import { Waveform } from '../ui.jsx'
import { ChatAvatar, Ticks, MethodNote } from './ChatBits.jsx'
import { chatService } from '../../services/chatService.js'
import {
  IconArrowRight,
  IconBan,
  IconCheck,
  IconChecks,
  IconChevronLeft,
  IconComment,
  IconDownload,
  IconFile,
  IconInfo,
  IconMapPin,
  IconMic,
  IconMoreVertical,
  IconPaperclip,
  IconPhoto,
  IconPlay,
  IconPoll,
  IconRadar,
  IconRefresh,
  IconRelay,
  IconSend,
  IconShare,
  IconShield,
  IconTimer,
  IconVideo,
  IconBolt,
} from '../icons.jsx'

/* ── Ujumbe mmoja ───────────────────────────────────────────── */

function MessageBubble({ m, group, onAction, onReplySwipe, onResolve, onReact, onPlay, onDownload, onToast }) {
  const [played, setPlayed] = useState(false)
  const ref = useRef(null)
  const touch = useRef({ x: 0, y: 0, active: false })
  const timer = useRef(null)
  const [shift, setShift] = useState(0)

  const mine = m.from === 'me'

  /* Long-press (vidole) — si njia PEKEE: kitufe cha ⋯ kinapatikana kila wakati */
  const onTouchStart = (e) => {
    const t = e.touches[0]
    touch.current = { x: t.clientX, y: t.clientY, active: true }
    timer.current = window.setTimeout(() => {
      if (touch.current.active) onAction(m)
    }, 480)
  }
  const onTouchMove = (e) => {
    if (!touch.current.active) return
    const t = e.touches[0]
    const dx = t.clientX - touch.current.x
    const dy = Math.abs(t.clientY - touch.current.y)
    if (dy > 18) {
      window.clearTimeout(timer.current)
      touch.current.active = false
      setShift(0)
      return
    }
    if (dx > 6) {
      window.clearTimeout(timer.current)
      setShift(Math.min(64, dx))
    }
  }
  const onTouchEnd = () => {
    window.clearTimeout(timer.current)
    if (shift > 52) onReplySwipe(m)
    setShift(0)
    touch.current.active = false
  }

  const pct = (v) => `${Math.max(4, Math.min(100, v))}%`

  return (
    <div className={`psh-msg ${mine ? 'psh-msg--me' : 'psh-msg--them'}`}>
      <button
        type="button"
        className="psh-msg__more"
        aria-label={`Vitendo vya ujumbe: ${m.text ? m.text.slice(0, 40) : m.kind}`}
        onClick={() => onAction(m)}
      >
        <IconMoreVertical size={16} />
      </button>

      <div className="psh-msg__col">
        {!mine && group && m.from !== 'system' ? (
          <span className="psh-msg__sender">
            <b>{m.senderName || m.from}</b>
            {m.role ? (
              <span className={`psh-msg__role ${/Msimamizi|Kiongozi/.test(m.role) ? 'psh-msg__role--gold' : ''}`}>
                {m.role}
              </span>
            ) : null}
          </span>
        ) : null}

        <div
          ref={ref}
          className="psh-msg__bubble"
          style={shift ? { transform: `translateX(${shift}px)` } : undefined}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onContextMenu={(e) => {
            e.preventDefault()
            onAction(m)
          }}
          onDoubleClick={() => onReplySwipe(m)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onAction(m)
          }}
          tabIndex={0}
          role="group"
          aria-label={`Ujumbe kutoka ${mine ? 'wewe' : m.from}`}
        >
          {m.replyTo ? (
            <div className="psh-msg__quote">
              <span className="psh-msg__quoteby">{m.replyTo.by}</span>
              <span className="psh-msg__quotetext">{m.replyTo.text}</span>
            </div>
          ) : null}

          {/* ── Aina za ujumbe ───────────────────────────── */}

          {m.kind === 'announcement' && m.announcement ? (
            <div className="psh-msg__ann">
              <span className="psh-msg__eyebrow">📢 Tangazo kutoka {m.announcement.from}</span>
              <p className="psh-msg__text">{m.announcement.text}</p>
            </div>
          ) : null}

          {m.text && m.kind !== 'announcement' ? <p className="psh-msg__text">{m.text}</p> : null}

          {m.kind === 'audio' && m.audio ? (
            <div className="psh-msg__audio">
              <button
                type="button"
                className="psh-msg__play"
                aria-label={played ? 'Sauti imesikilizwa' : 'Sikiliza sauti'}
                aria-pressed={played}
                onClick={() => {
                  setPlayed((v) => !v)
                  onPlay?.(m, !played)
                }}
              >
                <IconPlay size={15} />
              </button>
              <span className="psh-msg__wave">
                <Waveform bars={Array.from({ length: m.audio.bars || 22 }, (_, i) => 6 + ((i * 7) % 14))} progress={played ? 1 : m.audio.progress || 0.3} />
              </span>
              <span className="psh-msg__dur">{m.audio.duration || '0:38'}</span>
            </div>
          ) : null}

          {(m.kind === 'video' || m.kind === 'image') && m.media ? (
            <div className="psh-msg__guard">
              <div className="psh-msg__videoframe">
                {m.kind === 'image' ? <IconPhoto size={26} /> : <IconVideo size={26} />}
                <span>{m.media.label}</span>
                <span className="psh-msg__videobadge">{m.media.meta}</span>
              </div>
              {m.guard ? (
                <>
                  <div className="psh-msg__guardcard">
                    <span className="psh-msg__guardtitle">
                      <IconTimer size={15} />
                      {m.guard.title}
                    </span>
                    <span className="psh-msg__guardtext">{m.guard.text}</span>
                  </div>
                  <div className="psh-msg__guardactions">
                    <button
                      type="button"
                      className="psh-msg__guardbtn psh-msg__guardbtn--primary"
                      onClick={() => onResolve(m.id, 'data-now')}
                    >
                      <IconBolt size={15} />
                      {m.guard.primary}
                    </button>
                    <button
                      type="button"
                      className="psh-msg__guardbtn"
                      onClick={() => onResolve(m.id, 'wait-wifi')}
                    >
                      <IconRadar size={15} />
                      {m.guard.secondary}
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {m.poll ? (
            <div className="psh-msg__poll">
              <span className="psh-msg__pollhead">
                <IconPoll size={12} /> Kura ya Haraka
              </span>
              <span className="psh-msg__pollq">{m.poll.title}</span>
              {m.poll.options.map((o) => (
                <span key={o.id} className={`psh-msg__opt ${o.chosen ? 'psh-msg__opt--chosen' : ''}`}>
                  <span className="psh-msg__optrow">
                    <span>{o.chosen ? '✅ ' : ''}{o.label}</span>
                    <span>{o.votes}%{o.count ? ` (${o.count} kura)` : ''}</span>
                  </span>
                  <span className="psh-msg__bar">
                    <span className="psh-msg__barfill" style={{ width: pct(o.votes) }} />
                  </span>
                </span>
              ))}
              <span className="psh-msg__pollfoot">
                Kura {m.poll.total} zilizopigwa · {m.poll.options.find((o) => o.chosen) ? 'Umeshashiriki' : 'Wazi'}
              </span>
            </div>
          ) : null}

          {m.location ? (
            <div className="psh-msg__loc">
              <span className="psh-msg__map">
                <span className="psh-msg__mapbadge">
                  <IconMapPin size={12} /> Eneo la Moja kwa Moja
                </span>
                <span className="psh-msg__mapeta">{m.location.badge}</span>
              </span>
              <span className="psh-msg__loctitle">{m.location.title}</span>
              <span className="psh-msg__sharedmeta">
                {m.location.who} · {m.location.sub}
              </span>
            </div>
          ) : null}

          {m.shared ? (
            <div className="psh-msg__shared">
              {m.shared.eyebrow ? <span className="psh-msg__eyebrow">{m.shared.eyebrow}</span> : null}
              <span className="psh-msg__sharedtitle">{m.shared.title}</span>
              <span className="psh-msg__sharedsub">{m.shared.sub}</span>
              {m.shared.meta ? <span className="psh-msg__sharedmeta">{m.shared.meta}</span> : null}
              {m.shared.cta ? (
                <button type="button" className="psh-msg__cta" onClick={() => onToast?.(m.shared.cta)}>
                  {m.shared.cta}
                </button>
              ) : null}
            </div>
          ) : null}

          {m.doc ? (
            <div className="psh-msg__doc">
              <span className="psh-msg__docicon">
                <IconFile size={18} />
              </span>
              <span className="psh-msg__doctext">
                <span className="psh-msg__docname">{m.doc.name}</span>
                <span className="psh-msg__docmeta">{m.doc.meta}</span>
              </span>
              <button
                type="button"
                className="psh-msg__play"
                aria-label={m.savedOffline ? `${m.doc.name} imehifadhiwa` : `Hifadhi ${m.doc.name} kwenye kifaa`}
                aria-pressed={!!m.savedOffline}
                onClick={() => onDownload?.(m)}
              >
                {m.savedOffline ? <IconCheck size={15} /> : <IconDownload size={15} />}
              </button>
            </div>
          ) : null}

          {m.audioNote ? <span className="psh-msg__sharedmeta">🎧 {m.audioNote}</span> : null}

          <span className="psh-msg__meta">
            {m.at}
            {mine ? <Ticks state={m.state} /> : null}
          </span>
        </div>

        {/* Hali ya ujumbe (njia · foleni · vault) */}
        <MethodNote route={m.route} stateInfo={m.stateInfo} />
        {m.note ? <span className="psh-msg__state">{m.note}</span> : null}

        {m.reactions ? (
          <span className="psh-msg__reactions">
            {m.reactions.heart ? <>❤ {m.reactions.heart}</> : null}
            {m.reactions.like ? <>👍 {m.reactions.like}</> : null}
            {m.reactions.clap ? <>👏 {m.reactions.clap}</> : null}
          </span>
        ) : null}
      </div>
    </div>
  )
}

/* ── Thread kamili ──────────────────────────────────────────── */

export default function Thread({
  view,
  onBack,
  onSend,
  onReact,
  onResolveMedia,
  onAttach,
  onMore,
  onCall,
  onPlayAudio,
  onSaveOffline,
  onForward,
  onDelete,
  onOpenConversation,
  onToast,
  busy,
}) {
  const [draft, setDraft] = useState('')
  const [reply, setReply] = useState(null)
  const [action, setAction] = useState(null)
  const [forward, setForward] = useState(false)
  const [forwardList, setForwardList] = useState(null)
  const [forwardBusy, setForwardBusy] = useState(null)
  const listRef = useRef(null)

  /* Orodha ya kusambaza inatoka kwenye inbox ileile (mfumo mmoja wa Chat). */
  useEffect(() => {
    if (!forward || forwardList) return
    let live = true
    chatService.getInbox('zote').then((res) => {
      if (live) setForwardList((res?.conversations || []).filter((c) => c.id !== view?.conversation?.id).slice(0, 6))
    })
    return () => {
      live = false
    }
  }, [forward, forwardList, view?.conversation?.id])

  const conv = view?.conversation
  const msgs = view?.messages || []

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [msgs.length, conv?.id])

  useEffect(() => {
    setDraft('')
    setReply(null)
  }, [conv?.id])

  if (!conv) {
    return (
      <div className="psh-chat__thread">
        <div className="psh-empty">
          <IconComment size={26} />
          <p>Chagua mazungumzo</p>
        </div>
      </div>
    )
  }

  const group = conv.type === 'group'
  const withNames = msgs.map((m) => ({
    ...m,
    senderName:
      m.from === 'me'
        ? 'Wewe'
        : m.from === 'them'
          ? conv.title
          : m.from === 'system'
            ? 'PASIHAI'
            : (conv.memberPreview || []).find((p) => p.id === m.from)?.name || m.from,
  }))

  const send = async () => {
    const text = draft.trim()
    if (!text) return
    await onSend({ kind: 'text', text, replyTo: reply })
    setDraft('')
    setReply(null)
  }

  const systemBanner = (() => {
    const s = view.system
    if (s.state === 'OFFLINE') return { tone: '', icon: IconTimer, title: 'Offline · Waiting for sync', text: 'Ujumbe unahifadhiwa kwenye simu yako na kuingia kwenye foleni ya kutuma.' }
    if (s.state === 'LOCAL' && s.localMeshUp) return { tone: 'mesh', icon: IconRadar, title: 'Local Mesh inatumika (bila data)', text: 'Ujumbe unapisishwa kwa ukaribu. Media nzito (video/picha) itasubiri uwasilishaji kamili.' }
    if (s.relayReached) return { tone: '', icon: IconTimer, title: 'Internet Relay paused', text: `${s.relayDetail}` }
    if (s.state === 'WAITING_SYNC') return { tone: '', icon: IconRefresh, title: 'Waiting for sync', text: 'Ujumbe mfupi unaweza kupita Internet Relay; mengine yanasubiri mtandao.' }
    return null
  })()

  return (
    <div className="psh-chat__thread">
      <header className="psh-chat__thead">
        <button type="button" className="psh-icobtn psh-chat__back" aria-label="Rudi kwenye orodha ya Chat" onClick={onBack}>
          <IconChevronLeft size={20} />
        </button>
        <ChatAvatar tone={conv.tone} name={conv.title} icon={group ? conv.groupIcon : null} online={group ? undefined : true} />
        <span className="psh-chat__theadtext">
          <span className="psh-chat__theadname">{conv.title}</span>
          {group ? (
            <span className="psh-chat__theadsub">
              {`wanachama ${conv.members || (conv.memberIds || []).length}`}
            </span>
          ) : null}
        </span>
        <button type="button" className="psh-icobtn" aria-label="Sauti na mwito" onClick={() => onCall?.()}>
          <IconMic size={19} />
        </button>
        <button type="button" className="psh-icobtn" aria-label="Menyu zaidi za mazungumzo" onClick={onMore}>
          <IconMoreVertical size={19} />
        </button>
      </header>

      {systemBanner ? (
        <div
          className={`psh-chat__banner psh-chat__banner--compact ${systemBanner.tone === 'mesh' ? 'psh-chat__banner--mesh' : ''}`}
          title={systemBanner.text}
          role="status"
        >
          <systemBanner.icon size={14} />
          <b>{systemBanner.title}</b>
          <span className="psh-sr-only">{systemBanner.text}</span>
        </div>
      ) : null}

      <div className="psh-chat__messages" ref={listRef}>
        <span className="psh-chat__day">{group ? 'Jumuiya ya Darasa · Leo' : 'Leo, 28 Mei'}</span>

        {withNames.map((m) => (
          <MessageBubble
            key={m.id}
            m={m}
            group={group}
            onAction={(m) => {
              setForward(false)
              setAction(m)
            }}
            onReplySwipe={(msg) => {
              setReply({ by: msg.from === 'me' ? 'Wewe' : msg.senderName, text: msg.text || msg.doc?.name || msg.media?.label || 'Ujumbe' })
              onToast?.('Jibu — andika ujumbe wako')
            }}
            onResolve={onResolveMedia}
            onReact={onReact}
            onPlay={onPlayAudio}
            onDownload={onSaveOffline}
            onToast={onToast}
          />
        ))}

        {group ? (
          <span className="psh-chat__typing">
            <span className="psh-chat__typingdots" aria-hidden="true">
              <i /><i /><i />
            </span>
            Dr. Kelvin anaandika
          </span>
        ) : null}
      </div>

      {reply ? (
        <div className="psh-chat__reply">
          <IconComment size={14} />
          <span>
            Unajibu <b>{reply.by}</b> — {reply.text.slice(0, 48)}
          </span>
          <button type="button" onClick={() => setReply(null)} aria-label="Ondoa jibu">
            ✕
          </button>
        </div>
      ) : null}

      <div className="psh-chat__composer">
        <button
          type="button"
          className="psh-chat__cbtn"
          aria-label="Ambatisha faili (media haipiti Internet Relay)"
          onClick={() => onAttach(conv.id)}
        >
          <IconPaperclip size={20} />
        </button>
        <button type="button" className="psh-chat__cbtn" aria-label="Picha au kamera" onClick={() => onAttach(conv.id)}>
          <IconPhoto size={20} />
        </button>
        <textarea
          className="psh-chat__input"
          rows={1}
          placeholder={view.system.state === 'OFFLINE' ? 'Andika ujumbe (utahifadhiwa kwa foleni)' : 'Andika ujumbe'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          aria-label="Andika ujumbe"
        />
        <button
          type="button"
          className="psh-chat__cbtn"
          aria-label="Rekodi sauti"
          onClick={() => onSend({ kind: 'audio', audio: { duration: '0:14', progress: 0.2, bars: 20, label: 'Sauti' } })}
        >
          <IconMic size={20} />
        </button>
        <button
          type="button"
          className="psh-chat__cbtn psh-chat__cbtn--send"
          aria-label="Tuma ujumbe"
          onClick={send}
          disabled={busy || !draft.trim()}
        >
          <IconSend size={19} />
        </button>
      </div>

      <div className="psh-chat__footnotes">
        <span>
          <IconRadar size={12} /> Local Mesh {view.system.localMeshUp ? 'inapatikana' : 'haipo'}
        </span>
        <span>
          <IconRelay size={12} /> Relay {view.system.relayEnabled ? 'imewashwa' : 'imezimwa'}
        </span>
      </div>

      {/* ── Vitendo vya ujumbe (Sheet ileile ya app) ────────── */}
      <Sheet
        open={!!action}
        onClose={() => setAction(null)}
        title="Vitendo vya ujumbe"
        subtitle={action?.text ? action.text.slice(0, 60) : action?.kind}
      >
        {action ? (
          <div className="psh-msgact">
            <div className="psh-msgact__quote">
              <b>{action.from === 'me' ? 'Wewe' : action.senderName || action.from}</b> · {action.at}
              <br />
              {action.text || action.doc?.name || action.media?.label || action.kind}
            </div>

            <ul className="psh-msgact__reactions" aria-label="Itikia ujumbe">
              {['❤', '👍', '😂', '🙏', '👏'].map((emoji) => (
                <li key={emoji}>
                  <button
                    type="button"
                    className="psh-msgact__reaction"
                    onClick={() => {
                      onReact(action.id, emoji === '❤' ? 'heart' : emoji === '👍' ? 'like' : 'clap')
                      setAction(null)
                    }}
                  >
                    {emoji}
                  </button>
                </li>
              ))}
            </ul>

            <ul className="psh-menu">
              <li>
                <button
                  type="button"
                  className="psh-menu__row"
                  onClick={() => {
                    setReply({ by: action.from === 'me' ? 'Wewe' : action.senderName || action.from, text: action.text || 'Ujumbe' })
                    setAction(null)
                  }}
                >
                  <span className="psh-menu__icon">
                    <IconComment size={19} />
                  </span>
                  <span className="psh-menu__text">
                    <span className="psh-menu__label">Jibu</span>
                    <span className="psh-menu__hint">Au swipe ujumbe → kulia</span>
                  </span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="psh-menu__row"
                  onClick={async () => {
                    const text = action.text || action.doc?.name || ''
                    try {
                      await navigator.clipboard?.writeText(text)
                      onToast?.('Maandishi yamenakiliwa')
                    } catch {
                      onToast?.(`Maandishi: ${text.slice(0, 60)}`)
                    }
                    setAction(null)
                  }}
                >
                  <span className="psh-menu__icon">
                    <IconFile size={19} />
                  </span>
                  <span className="psh-menu__text">
                    <span className="psh-menu__label">Nakili maandishi</span>
                  </span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="psh-menu__row"
                  onClick={() => setForward(true)}
                >
                  <span className="psh-menu__icon">
                    <IconShare size={19} />
                  </span>
                  <span className="psh-menu__text">
                    <span className="psh-menu__label">Sambaza</span>
                  </span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="psh-menu__row"
                  onClick={() => {
                    onToast?.(`Hali: ${action.stateInfo?.label || action.state}`)
                    setAction(null)
                  }}
                >
                  <span className="psh-menu__icon">
                    <IconInfo size={19} />
                  </span>
                  <span className="psh-menu__text">
                    <span className="psh-menu__label">Taarifa za ujumbe</span>
                    <span className="psh-menu__hint">{action.stateInfo?.label}</span>
                  </span>
                </button>
              </li>
            </ul>

            {forward ? (
              <div className="psh-fwd">
                <h3 className="psh-panelstack__h">Sambaza kwa</h3>
                {!forwardList ? (
                  <p className="psh-cmts__empty">Inapakia mazungumzo…</p>
                ) : (
                  <ul className="psh-menu">
                    {forwardList.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="psh-menu__row"
                          disabled={forwardBusy === c.id}
                          onClick={async () => {
                            setForwardBusy(c.id)
                            const res = await chatService.sendMessage(c.id, {
                              text: action.text || action.doc?.name || 'Ujumbe uliosambazwa',
                            })
                            setForwardBusy(null)
                            if (!res?.message) {
                              onToast?.('Haikutumwa — angalia hali ya mtandao')
                              return
                            }
                            onToast?.(`Umesambaza kwenye “${c.title}”`)
                            onForward?.(c.id)
                            setForward(false)
                            setAction(null)
                          }}
                        >
                          <span className="psh-menu__icon">
                            <IconShare size={18} />
                          </span>
                          <span className="psh-menu__text">
                            <span className="psh-menu__label">{c.title}</span>
                            <span className="psh-menu__hint">
                              {forwardBusy === c.id ? 'Inatuma…' : c.type === 'group' ? 'Kikundi' : 'Mazungumzo'}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            {!forward ? (
              <>
                <ul className="psh-menu">
                  <li>
                    <button
                      type="button"
                      className="psh-menu__row psh-menu__row--danger"
                      onClick={async () => {
                        await onDelete?.(action.id)
                        setAction(null)
                      }}
                    >
                      <span className="psh-menu__icon">
                        <IconBan size={19} />
                      </span>
                      <span className="psh-menu__text">
                        <span className="psh-menu__label">Futa ujumbe (kwangu)</span>
                        <span className="psh-menu__hint">Hauondolewi kwa mwenzako</span>
                      </span>
                    </button>
                  </li>
                </ul>
              </>
            ) : null}

            <p className="psh-note">
              <IconChecks size={16} /> Vitendo hivi ni vya muktadha wa ujumbe huu pekee. Kufuta ni
              kwa upande wako — mwenzako anaendelea kuuona.
            </p>
          </div>
        ) : null}
      </Sheet>
    </div>
  )
}
