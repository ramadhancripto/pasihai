// ══════════════════════════════════════════════════════════════
// PASIHAI — STATUS STUDIO (uundaji · muonekano)
//
// Faili hii ina panel mbili za Status, zote kwa mfumo MMOJA wa
// muonekano (canvas ya story):
//
//   StatusComposerPanel — kuunda status: canvas hai (WYSIWYG) yenye
//     mkao (4:5 / 9:16), rangi za mandhari, maandishi, lebo za haraka
//     na chaguo la picha/video. Kisha "Hakiki" → preview ya story.
//
//   StatusViewerPanel  — kuona status: vipande vya muda (segments),
//     kichwa cha mwandishi, maandishi kwenye kadi ya blur, hisia za
//     haraka (quick reactions) na jibu linalotumwa kwa Chat.
//
// HAKUNA muundo mpya wa data: kila kitu kinatumia feedService /
// chatService zilezile. Hakuna kuandika kwa DB mpya.
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'

import { Avatar, Button } from '../ui.jsx'
import { feedService } from '../../services/feedService.js'
import { chatService } from '../../services/chatService.js'
import { ValidationError } from '../../utils/errors.js'
import {
  StatusConfigurationError,
  statusErrorMessage,
  validateStatusDraft,
  validateStatusFile,
} from '../../utils/statusMedia.js'
import {
  IconArrowRight,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconCropFree,
  IconEye,
  IconFlame,
  IconInfo,
  IconLaugh,
  IconLock,
  IconMoreVertical,
  IconPalette,
  IconPhoto,
  IconSend,
  IconSpark,
  IconText,
  IconUndo,
  IconVideo,
  IconVolume,
  IconVolumeOff,
  IconWow,
} from '../icons.jsx'

/* ── Rangi za mandhari (tone) — zilezile zinazohifadhiwa kwenye DB ── */
const STATUS_TONES = [
  { id: 'green', label: 'Kijani', hint: 'ChatHai Emerald' },
  { id: 'blue', label: 'Bluu', hint: 'Bahari ya Hindi' },
  { id: 'gold', label: 'Dhahabu', hint: 'Jua la Serengeti' },
  { id: 'plum', label: 'Zambarau', hint: 'Jioni ya mji' },
]

/* ── Hisia za haraka: kila moja inaandaa jibu la haraka kwenye Chat ──
   (hakuna emoji — icons za mfumo, hivyo zinaonekana kila kifaa) */
const STATUS_REACTIONS = [
  { id: 'penda', label: 'Nimeipenda', reply: 'Nimeipenda status yako! ', Icon: IconHeartIcon },
  { id: 'safi', label: 'Safi sana', reply: 'Safi sana! ', Icon: IconFlame },
  { id: 'vizuri', label: 'Vizuri', reply: 'Vizuri sana! ', Icon: IconSpark },
  { id: 'cheka', label: 'Ha ha', reply: 'Ha ha ha! ', Icon: IconLaugh },
  { id: 'waa', label: 'Waah', reply: 'Waah! ', Icon: IconWow },
  { id: 'asante', label: 'Asante', reply: 'Asante kwa kushiriki! ', Icon: IconCheckCircle },
]

/* Check-circle: alama safi ya "asante/sawa" (durufu + tiki) */
function IconCheckCircle({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="8.4" />
      <path d="m8.6 12.4 2.3 2.3 4.5-4.8" />
    </svg>
  )
}

function IconHeartIcon(props) {
  return (
    <svg
      width={props.size || 20}
      height={props.size || 20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 19.6s-7.3-4.4-7.3-9.3A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.3 2.7c0 4.9-7.3 9.3-7.3 9.3Z" />
    </svg>
  )
}

/* ── Lebo za haraka (maandishi tu — hazibadilishi data yoyote) ── */
const QUICK_TAGS = ['#HabariYaLeo', '#PichaZaSimu', '#Zanzibar', '#Safari', '#TanzaniaYetu']

const TONE_CLASS = (tone) => `psh-story--tone-${STATUS_TONES.some((t) => t.id === tone) ? tone : 'green'}`

/* ══════════════════════════════════════════════════════════════
   1. CANVAS YA STORY — sehemu moja inayotumiwa na composer,
      preview na viewer (muonekano mmoja, si mitindo mitatu).
   ══════════════════════════════════════════════════════════════ */
function StoryStage({
  tone = 'green',
  mediaUrl = '',
  isVideo = false,
  mediaError = false,
  fullPortrait = false,
  className = '',
  children,
}) {
  const classes = [
    'psh-story',
    TONE_CLASS(tone),
    mediaUrl && !mediaError ? 'psh-story--media' : 'psh-story--text',
    fullPortrait ? 'psh-story--tall' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes}>
      {mediaUrl && !mediaError ? (
        isVideo ? (
          <video
            key={mediaUrl}
            className="psh-story__asset"
            src={mediaUrl}
            playsInline
            controls
            muted
            preload="metadata"
          />
        ) : (
          <img className="psh-story__asset" src={mediaUrl} alt="" />
        )
      ) : null}
      <span className="psh-story__scrim psh-story__scrim--top" aria-hidden="true" />
      <span className="psh-story__scrim psh-story__scrim--bottom" aria-hidden="true" />
      {children}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   2. STATUS COMPOSER — uundaji
   ══════════════════════════════════════════════════════════════ */
export function StatusComposerPanel({ onToast, onClose, onCreated }) {
  const [mode, setMode] = useState('media') // media | text
  const [text, setText] = useState('')
  const [tone, setTone] = useState('green')
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [fullPortrait, setFullPortrait] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [stage, setStage] = useState('compose') // compose | preview
  const textRef = useRef(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl('')
      return undefined
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const isVideo = Boolean(file?.type?.startsWith('video/'))
  const canPost = Boolean(text.trim() || file)
  const toneMeta = STATUS_TONES.find((t) => t.id === tone)

  const chooseFile = (event) => {
    const picked = event.currentTarget.files?.[0] || null
    const expectedKind = event.currentTarget.dataset.statusKind
    event.currentTarget.value = ''
    if (!picked) return
    try {
      const mediaKind = validateStatusFile(picked)
      if (expectedKind && expectedKind !== mediaKind) {
        throw new ValidationError(
          `Tumia kitufe cha ${expectedKind === 'image' ? 'picha' : 'video'} kuchagua faili hili.`,
        )
      }
      setFile(picked)
      setError('')
    } catch (validationError) {
      setError(statusErrorMessage(validationError))
    }
  }

  const addTag = (tag) => {
    setText((current) => {
      if (current.includes(tag)) return current
      const next = current ? `${current.replace(/\s+$/, '')} ${tag}` : tag
      return next.slice(0, 500)
    })
    textRef.current?.focus()
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
      setStage('compose')
    } finally {
      setBusy(false)
    }
  }

  /* ── Preview: muonekano KAMILI wa story kabla ya kuchapisha ── */
  if (stage === 'preview') {
    return (
      <div className="psh-stc psh-stc--preview">
        <StoryStage tone={tone} mediaUrl={previewUrl} isVideo={isVideo} className="psh-story--preview">
          <div className="psh-story__segbar" aria-hidden="true">
            <span className="is-current" />
          </div>
          {/* Kadi ya maandishi + alama ziko chini: kadi inakaa kwenye
              sehemu ya chini ya canvas (margin-top:auto) — kama viewer. */}
          <div className="psh-story__bottom">
            <div className="psh-story__caption psh-story__caption--card">
              {text.trim() ? <p>{text.trim()}</p> : <p className="is-muted">Status bila maandishi</p>}
            </div>
            <div className="psh-story__badge">
              <IconEye size={14} />
              Hivi ndivyo wengine wataona · saa 24
            </div>
          </div>
        </StoryStage>

        {error ? (
          <p className="psh-stc__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="psh-stc__dispatch">
          <button type="button" className="psh-stc__ghostbtn" disabled={busy} onClick={() => setStage('compose')}>
            <IconChevronLeft size={18} />
            Rudi
          </button>
          <button
            type="button"
            className="psh-stc__publish"
            disabled={busy || !canPost}
            onClick={post}
            aria-busy={busy}
          >
            {busy ? 'Inahifadhi…' : 'Chapisha Status'}
            <IconSend size={18} />
          </button>
        </div>
      </div>
    )
  }

  /* ── Compose: canvas hai ── */
  return (
    <div className="psh-stc">
      <div className="psh-stc__bar">
        <div className="psh-stc__seg" role="tablist" aria-label="Aina ya Status">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'media'}
            className={`psh-stc__segbtn ${mode === 'media' ? 'is-on' : ''}`}
            onClick={() => setMode('media')}
          >
            <IconPhoto size={16} />
            Picha &amp; Video
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'text'}
            className={`psh-stc__segbtn ${mode === 'text' ? 'is-on' : ''}`}
            onClick={() => setMode('text')}
          >
            <IconText size={16} />
            Maandishi
          </button>
        </div>
        <button
          type="button"
          className="psh-stc__iconbtn"
          onClick={() => { setText(''); setFile(null); setError('') }}
          aria-label="Tendua"
          disabled={busy || (!text && !file)}
        >
          <IconUndo size={19} />
        </button>
      </div>

      <div className="psh-stc__titlerow">
        <div className="psh-stc__titleblock">
          <h3 className="psh-stc__title">
            {mode === 'media' ? 'Weka Status ya Picha' : 'Weka Status ya Maandishi'}
          </h3>
          <p className="psh-stc__sub">Panga kisha ushiriki — inaonekana kwa saa 24</p>
        </div>
        <span className="psh-stc__privacy">
          <IconLock size={15} />
          Marafiki Wote
        </span>
      </div>

      <StoryStage tone={tone} mediaUrl={previewUrl} isVideo={isVideo} fullPortrait={fullPortrait}>
        <div className="psh-story__floatbar">
          <button
            type="button"
            className="psh-story__pill"
            onClick={() => setFullPortrait((v) => !v)}
            aria-label="Badilisha mkao wa Status"
          >
            <IconCropFree size={15} />
            <span>{fullPortrait ? '9:16 Kamili' : '4:5 Asili'}</span>
          </button>
          <div className="psh-story__tools">
            <button
              type="button"
              className="psh-story__tool"
              onClick={() => setFullPortrait((v) => !v)}
              title="Mkao"
              aria-label="Mkao"
            >
              <IconCropFree size={18} />
            </button>
            <button
              type="button"
              className={`psh-story__tool ${mode === 'text' ? 'is-on' : ''}`}
              onClick={() => { setMode('text'); textRef.current?.focus() }}
              title="Maandishi"
              aria-label="Maandishi"
            >
              <IconText size={18} />
            </button>
            <button
              type="button"
              className="psh-story__tool"
              onClick={() => setTone((current) => {
                const at = STATUS_TONES.findIndex((t) => t.id === current)
                return STATUS_TONES[(at + 1) % STATUS_TONES.length].id
              })}
              title="Rangi ya mandhari"
              aria-label="Rangi ya mandhari"
            >
              <IconPalette size={18} />
            </button>
            <label className="psh-story__tool psh-story__tool--cta" title="Chagua picha">
              <IconPhoto size={18} />
              <input
                className="u-sr psh-stc__file"
                type="file"
                data-status-kind="image"
                accept="image/jpeg,image/png,image/webp,image/gif"
                aria-label="Chagua picha ya Status"
                disabled={busy}
                onChange={chooseFile}
              />
            </label>
          </div>
        </div>

        <div className={`psh-story__editor ${file ? 'psh-story__editor--lower' : ''}`}>
          <textarea
            ref={textRef}
            className="psh-story__input"
            rows={file ? 2 : 4}
            maxLength={500}
            value={text}
            disabled={busy}
            onChange={(event) => setText(event.target.value)}
            placeholder="Andika status yako…"
            aria-label="Maandishi ya status"
          />
        </div>

        <div className="psh-story__stagefoot">
          <span className="psh-story__count" aria-live="polite">{text.length} herufi</span>
          <button
            type="button"
            className="psh-story__clear"
            onClick={() => { setText(''); textRef.current?.focus() }}
            disabled={busy || !text}
          >
            <IconUndo size={14} />
            Futa
          </button>
        </div>
      </StoryStage>

      {/* Rangi za mandhari */}
      <div className="psh-stc__box">
        <div className="psh-stc__boxhead">
          <span className="psh-stc__boxlabel">Rangi ya mandharinyuma</span>
          <span className="psh-stc__boxtone">{toneMeta?.hint}</span>
        </div>
        <div className="psh-stc__swatches">
          {STATUS_TONES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`psh-stc__swatch psh-stc__swatch--${item.id} ${tone === item.id ? 'is-on' : ''}`}
              onClick={() => setTone(item.id)}
              aria-pressed={tone === item.id}
              aria-label={item.label}
              disabled={busy}
            >
              {tone === item.id ? <IconCheck size={16} strokeWidth={2.6} /> : null}
            </button>
          ))}
        </div>
      </div>

      {/* Picha/Video */}
      <div className="psh-stc__media">
        <div className="psh-stc__mediaRow">
          <label className="psh-stc__filebtn">
            <IconPhoto size={17} />
            {file?.type?.startsWith('image/') ? 'Badilisha picha' : 'Chagua picha'}
            <input
              className="u-sr psh-stc__file"
              type="file"
              data-status-kind="image"
              accept="image/jpeg,image/png,image/webp,image/gif"
              aria-label="Chagua picha ya Status"
              disabled={busy}
              onChange={chooseFile}
            />
          </label>
          <label className="psh-stc__filebtn">
            <IconVideo size={17} />
            {isVideo ? 'Badilisha video' : 'Chagua video'}
            <input
              className="u-sr psh-stc__file"
              type="file"
              data-status-kind="video"
              accept="video/mp4,video/webm,video/quicktime"
              aria-label="Chagua video ya Status"
              disabled={busy}
              onChange={chooseFile}
            />
          </label>
        </div>
        {file ? (
          <div className="psh-stc__fileline">
            <span className="psh-stc__filename">{file.name}</span>
            <button type="button" className="psh-stc__fileremove" disabled={busy} onClick={() => setFile(null)}>
              Ondoa
            </button>
          </div>
        ) : (
          <p className="psh-stc__hint">
            Picha: JPEG, PNG, WebP, GIF · Video: MP4, WebM, MOV · hadi MB 25
          </p>
        )}
      </div>

      {/* Lebo za haraka */}
      <div className="psh-stc__tags">
        <span className="psh-stc__taglabel">Lebo za haraka:</span>
        {QUICK_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            className="psh-stc__tag"
            disabled={busy}
            onClick={() => addTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>

      {error ? (
        <p className="psh-stc__error" role="alert">
          {error}
        </p>
      ) : null}

      {/* Watazamaji + kuchapisha */}
      <div className="psh-stc__meta">
        <span className="psh-stc__metaicon">
          <IconEye size={18} />
        </span>
        <span className="psh-stc__metatext">
          <b>Marafiki na wanaokufuata</b>
          <span>Inadumu kwa masaa 24</span>
        </span>
        <span className="psh-stc__metapill">Saa 24</span>
      </div>

      <button
        type="button"
        className="psh-stc__publish psh-stc__publish--wide"
        disabled={!canPost || busy}
        onClick={() => setStage('preview')}
      >
        Hakiki na uchapishwe
        <IconArrowRight size={18} />
      </button>

      <p className="psh-stc__note">
        <IconInfo size={15} />
        Status huhifadhiwa kwenye akaunti yako; maandishi na media huhifadhiwa kama yalivyo.
      </p>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   3. STATUS VIEWER — muonekano wa story
   ══════════════════════════════════════════════════════════════ */
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
  const [muted, setMuted] = useState(true)
  const [reaction, setReaction] = useState(null)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const replyRef = useRef(null)

  const status = statuses[index] || null
  const user = group?.user || status?.user || null
  const name = group?.own ? 'Status yako' : user?.name || 'Status'
  const mediaUrl = status?.mediaUrl || status?.media?.url || null
  const mediaType = status?.mediaType || status?.media?.type || null
  const tone = STATUS_VIEWER_TONES.has(status?.tone) ? status.tone : 'green'
  const isVideo = mediaType === 'video'
  const createdLabel = status?.ago || status?.createdAtLabel || 'Imechapishwa'

  useEffect(() => { setMediaError(false) }, [status?.id])

  // Kuendelea kiotomatiki kwa status za picha (kama stories)
  useEffect(() => {
    if (isVideo || statuses.length < 2) return undefined
    const timer = setTimeout(() => {
      if (index < statuses.length - 1) setIndex((c) => c + 1)
      else onClose?.()
    }, 5000)
    return () => clearTimeout(timer)
  }, [index, isVideo, statuses.length, onClose])

  const go = (delta) => {
    setIndex((current) => Math.min(statuses.length - 1, Math.max(0, current + delta)))
  }

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

  /* Jibu la haraka → linatumwa kwa Chat (chatService halisi) */
  const sendReply = async (event) => {
    event?.preventDefault?.()
    const body = reply.trim()
    if (!body || sending) return
    if (!user?.id) {
      onToast?.('Jibu linahitaji akaunti ya mwandishi wa Status.')
      return
    }
    setSending(true)
    try {
      const started = await chatService.startDirect(user.id)
      const convId = started?.conversation?.id
      if (!convId) throw new Error('Mazungumzo hayakupatikana.')
      await chatService.sendMessage(convId, { text: body, kind: 'text' })
      setReply('')
      setReaction(null)
      onToast?.(`Jibu limetumwa kwa ${name} · Chat`)
    } catch (replyError) {
      onToast?.(replyError?.message || 'Jibu halikutumwa. Jaribu tena.')
    } finally {
      setSending(false)
    }
  }

  const pickReaction = (item) => {
    setReaction(item.id)
    setReply((current) => (current.trim() ? current : item.reply))
    replyRef.current?.focus()
  }

  if (!status) {
    return (
      <div className="psh-stv__empty" role="status">
        <p>Status hii haipo tena au muda wake umeisha.</p>
        <Button variant="soft" onClick={onClose}>Rudi</Button>
      </div>
    )
  }

  return (
    <div className="psh-stv" data-own={group?.own ? 'true' : 'false'} aria-label="Story viewer ya Status">
      <div className="psh-stv__frame">
        <StoryStage
          tone={tone}
          mediaUrl={mediaUrl}
          isVideo={isVideo}
          mediaError={mediaError}
          className="psh-story--viewer"
        >
          <div className="psh-stv__segments" aria-label={`Status ${index + 1} kati ya ${statuses.length}`}>
            {statuses.map((item, itemIndex) => (
              <span
                key={item.id}
                className={itemIndex < index ? 'is-complete' : itemIndex === index ? 'is-current' : ''}
              />
            ))}
          </div>

          <header className="psh-stv__head">
            <span className="psh-stv__avatar">
              <Avatar user={user} size={44} shape="circle" badge={false} />
              <span className="psh-stv__ring" aria-hidden="true" />
            </span>
            <span className="psh-stv__who">
              <b>{name}</b>
              <span>
                {status.createdAt ? (
                  <time dateTime={status.createdAt}>{createdLabel}</time>
                ) : (
                  createdLabel
                )}
                <i className="psh-stv__dot" aria-hidden="true">·</i>
                <i className="psh-stv__kindtag">{isVideo ? 'Video' : mediaUrl ? 'Picha' : 'Maandishi'}</i>
              </span>
            </span>
            <span className="psh-stv__actions">
              {isVideo ? (
                <button
                  type="button"
                  className="psh-stv__act"
                  onClick={() => setMuted((v) => !v)}
                  aria-label={muted ? 'Washa sauti' : 'Zima sauti'}
                >
                  {muted ? <IconVolumeOff size={19} /> : <IconVolume size={19} />}
                </button>
              ) : null}
              <button
                type="button"
                className="psh-stv__act"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Chaguo zaidi"
              >
                <IconMoreVertical size={19} />
              </button>
              <button
                type="button"
                className="psh-stv__act"
                onClick={onClose}
                aria-label="Funga Status"
              >
                <IconClose size={21} />
              </button>
            </span>
          </header>

          {menuOpen ? (
            <div className="psh-stv__menu" role="menu">
              {group?.own ? (
                <>
                  <button type="button" role="menuitem" onClick={onAdd}>Ongeza Status</button>
                  <button
                    type="button"
                    role="menuitem"
                    className="is-danger"
                    disabled={busy}
                    onClick={deleteCurrentStatus}
                  >
                    Futa Status hii
                  </button>
                </>
              ) : (
                <>
                  <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); replyRef.current?.focus() }}>
                    Jibu kwa Chat
                  </button>
                  <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onToast?.('Ripoti imetumwa kwa msimamizi.') }}>
                    Ripoti Status
                  </button>
                </>
              )}
              <button type="button" role="menuitem" onClick={() => setMenuOpen(false)}>Funga menyu</button>
            </div>
          ) : null}

          <div className="psh-stv__bottom">
            {status.text?.trim() ? (
              <div className="psh-story__caption psh-story__caption--card">
                <p>{status.text.trim()}</p>
              </div>
            ) : null}

            {!mediaUrl || mediaError ? (
              <p className="psh-stv__unavailable" role="status">
                {mediaError && status.mediaType
                  ? `${status.mediaType === 'video' ? 'Video' : 'Picha'} ya Status haipatikani kwa sasa.`
                  : 'Maudhui ya Status hayaonekani; maandishi tu yaliyopo yanaonyeshwa.'}
              </p>
            ) : null}

            {!group?.own ? (
              <>
                <div className="psh-stv__reactions" role="group" aria-label="Hisia za haraka">
                  {STATUS_REACTIONS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`psh-stv__reaction ${reaction === item.id ? 'is-on' : ''}`}
                      onClick={() => pickReaction(item)}
                      aria-label={item.label}
                      aria-pressed={reaction === item.id}
                      title={item.label}
                    >
                      <item.Icon size={20} />
                    </button>
                  ))}
                </div>

                <form className="psh-stv__reply" onSubmit={sendReply}>
                  <span className="psh-stv__replybox">
                    <input
                      ref={replyRef}
                      className="psh-stv__replyinput"
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      placeholder={`Jibu ${name.split(' ')[0]}…`}
                      aria-label="Jibu kwa Chat"
                      maxLength={280}
                    />
                    <button
                      type="button"
                      className="psh-stv__replypick"
                      onClick={() => pickReaction(STATUS_REACTIONS[0])}
                      aria-label="Ongeza hisia"
                    >
                      <IconSparkDot />
                    </button>
                  </span>
                  <button
                    type="submit"
                    className="psh-stv__send"
                    disabled={sending || !reply.trim()}
                    aria-label="Tuma jibu"
                  >
                    <IconSend size={19} />
                  </button>
                </form>
              </>
            ) : (
              <div className="psh-stv__ownrow">
                <span className="psh-stv__ownpill">
                  <IconEye size={15} />
                  Status yako
                  {status.expiresAtLabel ? ` · Inaisha ${status.expiresAtLabel}` : ''}
                </span>
                <div className="psh-stv__ownbuttons">
                  <button type="button" className="psh-stv__ownbtn" onClick={onAdd}>
                    Ongeza
                  </button>
                  <button
                    type="button"
                    className="psh-stv__ownbtn psh-stv__ownbtn--danger"
                    disabled={busy}
                    onClick={deleteCurrentStatus}
                  >
                    {busy ? 'Inafuta…' : 'Futa'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Eneo la kugusa kwa status iliyopita / inayofuata */}
          <button
            type="button"
            className="psh-stv__tap psh-stv__tap--prev"
            onClick={() => go(-1)}
            disabled={index <= 0}
            aria-label="Status iliyopita"
          />
          <button
            type="button"
            className="psh-stv__tap psh-stv__tap--next"
            onClick={() => go(1)}
            disabled={index >= statuses.length - 1}
            aria-label="Status inayofuata"
          />
        </StoryStage>

        {error ? (
          <p className="psh-stc__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="psh-stv__foot">
        <span className="psh-stv__counter">
          {index + 1} / {statuses.length}
        </span>
        <span className="psh-stv__dots" aria-hidden="true">
          {statuses.map((item, itemIndex) => (
            <i key={item.id} className={itemIndex === index ? 'is-on' : ''} />
          ))}
        </span>
        <span className="psh-stv__navbtns">
          <button
            type="button"
            className="psh-stv__navbtn"
            onClick={() => go(-1)}
            disabled={index <= 0}
            aria-label="Iliyotangulia"
          >
            <IconChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="psh-stv__navbtn"
            onClick={() => go(1)}
            disabled={index >= statuses.length - 1}
            aria-label="Ifuatayo"
          >
            <IconChevronRight size={16} />
          </button>
        </span>
      </div>
    </div>
  )
}

/* Alama ndogo ya "hisia" ndani ya kisanduku cha jibu */
function IconSparkDot() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8.2" />
      <path d="M8.6 13.8c.9 1.5 2 2.2 3.4 2.2s2.5-.7 3.4-2.2" />
      <path d="M9.4 9.6h.01M14.6 9.6h.01" strokeWidth="2.2" />
    </svg>
  )
}

export { STATUS_TONES }
export default StatusComposerPanel
