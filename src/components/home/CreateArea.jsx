// ══════════════════════════════════════════════════════════════
// PASIHAI — CREATE AREA (Quick Post)
//
//   [ DP ] [ Shiriki jambo na marafiki zako ........ (⋯) ]  ← typing bar
//          [Zana: Tags · Mentions]                          ← inafunguka kwa (⋯)
//   [Media preview]                                         ← ikichaguliwa
//   ╭──── (+) ────╮                                          ← dock ya asili
//   │ Media · Reel · Live                                     │
//   ╰─────────────────────────────────────────────────────────╯
//                                                  [ Chapisha ]
//
// Quick area inafunguka ndani ya Home — haipeleki mtumiaji kwenye panel
// ya ndani zaidi. Publish inatumia feedService.createPost halisi; "Imechapishwa"
// inaonyeshwa tu baada ya post id kurudishwa (angalia publishOutcome).
// (+) inabaki kama ilivyo: inafungua menyu kamili ya Create (Post Studio).
// ══════════════════════════════════════════════════════════════

import { useEffect, useId, useRef, useState } from 'react'
import { accountService } from '../../services/accountService.js'
import { feedService } from '../../services/feedService.js'
import { isSupabaseLive } from '../../lib/supabaseClient.js'
import useAsyncData from '../../hooks/useAsyncData.js'
import {
  POST_IMAGE_ACCEPT,
  POST_VIDEO_ACCEPT,
  postMediaErrorMessage,
  validatePostMediaFile,
} from '../../utils/postMedia.js'
import {
  formatMediaSize,
  insertAtRange,
  normalizeHandle,
  normalizeTag,
  publishMessage,
  publishOutcome,
} from '../../utils/quickPost.js'
import { Avatar } from '../ui.jsx'
import StructuredPost from '../studio/StructuredPost.jsx'
import { Swatches, SizeSelect } from '../studio/FormatControls.jsx'
import {
  BODY_SIZES,
  CONCLUSION_SIZES,
  HEADING_SIZES,
  MAX_BODY,
  MAX_CONCLUSION,
  MAX_HEADING,
  createContent,
  sanitizeContent,
  serializeContent,
  validateContent,
} from '../../utils/postContent.js'
import { IconMoreHorizontal, IconPhoto, IconPlus, IconReel, IconLive, IconTag } from '../icons.jsx'

const IDLE = { tone: 'idle', message: '' }

export default function CreateArea({ onCreate, onPosted, onToast, prompt = 'Nini kinaendelea?' }) {
  // DP ya mtumiaji wa sasa inatoka kwa account service.
  const me = useAsyncData(() => accountService.getCurrentUser(), [])

  const [text, setText] = useState('')
  const [toolsOpen, setToolsOpen] = useState(false)
  const [tool, setTool] = useState(null) // 'tag' | 'mention' | null
  const [tagDraft, setTagDraft] = useState('')
  const [mentionQuery, setMentionQuery] = useState('')
  const [file, setFile] = useState(null) // { file, kind: 'photo'|'reel', mediaType, previewUrl }
  const [status, setStatus] = useState(IDLE)
  const [saving, setSaving] = useState(false)
  // Muundo wa makala (More → Muundo). Body = maandishi ya typing bar.
  const [articleOn, setArticleOn] = useState(false)
  const [article, setArticle] = useState(() => createContent('article'))

  const savingRef = useRef(false)
  const photoInputRef = useRef(null)
  const reelInputRef = useRef(null)
  const textRef = useRef(null)
  const selRef = useRef({ start: 0, end: 0 })
  const toolsId = useId()
  const photoInputId = useId()
  const reelInputId = useId()
  const mentionInputId = useId()
  const tagInputId = useId()

  // Watu wa kutaja: wanapakiwa tu wakati Mentions zimefunguliwa.
  const people = useAsyncData(
    () => (toolsOpen && tool === 'mention' ? accountService.listDirectory() : Promise.resolve([])),
    [toolsOpen, tool],
  )

  // Safisha object URL ya preview ikibadilika au komponenti inaondolewa.
  useEffect(() => () => {
    if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl)
  }, [file])

  if (!me) return null

  const trimmed = text.trim()
  const canPublish = !saving && (trimmed.length > 0 || Boolean(file))

  function rememberSelection(event) {
    const { selectionStart, selectionEnd } = event.target
    selRef.current = { start: selectionStart ?? 0, end: selectionEnd ?? 0 }
  }

  function insertToken(token) {
    const { start, end } = selRef.current
    const next = insertAtRange(text, start, end, `${token} `)
    setText(next.text)
    requestAnimationFrame(() => {
      const el = textRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(next.caret, next.caret)
      selRef.current = { start: next.caret, end: next.caret }
    })
  }

  function addTag(event) {
    event?.preventDefault()
    const tag = normalizeTag(tagDraft)
    if (!tag) {
      setStatus({ tone: 'error', message: 'Tag lazima iwe herufi, namba au _ (hadi herufi 30), bila nafasi.' })
      return
    }
    insertToken(`#${tag}`)
    setTagDraft('')
    setStatus(IDLE)
  }

  function mentionPerson(person) {
    const handle = normalizeHandle(person?.handle || person?.username)
    if (!handle) {
      setStatus({ tone: 'error', message: 'Mtu huyu hana handle halali ya kutajwa.' })
      return
    }
    insertToken(handle)
    setStatus(IDLE)
  }

  const mentionMatches = (Array.isArray(people) ? people : [])
    .filter((p) => p && p.id !== me.id)
    .filter((p) => {
      const q = mentionQuery.trim().toLowerCase().replace(/^@/, '')
      if (!q) return true
      return `${p.handle ?? ''} ${p.name ?? ''}`.toLowerCase().includes(q)
    })
    .slice(0, 6)

  function chooseFile(event, kind) {
    const picked = event.target.files?.[0]
    event.target.value = '' // ruhusu kuchagua faili lile tena
    if (!picked) return
    let details
    try {
      details = validatePostMediaFile(picked, kind === 'reel' ? 'video' : null)
    } catch (error) {
      setStatus({ tone: 'error', message: postMediaErrorMessage(error) })
      return
    }
    if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl)
    setFile({
      file: picked,
      kind,
      mediaType: details.mediaType,
      previewUrl: URL.createObjectURL(picked),
    })
    setStatus(IDLE)
  }

  function removeFile() {
    if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl)
    setFile(null)
    setStatus(IDLE)
  }

  async function publish() {
    if (savingRef.current || !canPublish) return
    // Makala: content yenye muundo inathibitishwa kabla ya publish.
    let postText = trimmed
    if (articleOn) {
      const draft = sanitizeContent({ ...article, type: 'article', body: { ...article.body, text: trimmed } })
      const r = validateContent(draft)
      if (!r.ok) {
        setStatus({ tone: 'error', message: r.errors.join(' ') })
        return
      }
      postText = serializeContent(draft)
    }
    savingRef.current = true
    setSaving(true)
    setStatus({ tone: 'saving', message: file ? 'Inapakia na kuhifadhi…' : 'Inahifadhi chapisho…' })

    try {
      const post = await feedService.createPost({
        kind: file ? file.kind : 'text',
        text: postText,
        file: file?.file || undefined,
      })
      const outcome = publishOutcome(post, { live: isSupabaseLive })
      if (outcome.status === 'failed') {
        throw new Error(publishMessage(outcome))
      }

      // Imefanikiwa (au imewekwa kwenye foleni/demo): safisha fomu.
      if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl)
      setText('')
      setFile(null)
      setArticleOn(false)
      setArticle(createContent('article'))
      setToolsOpen(false)
      setTool(null)
      setTagDraft('')
      setMentionQuery('')
      const message = publishMessage(outcome)
      setStatus({ tone: outcome.status === 'published' ? 'ok' : 'warn', message })
      onPosted?.(post)
      onToast?.(message)
    } catch (error) {
      // Maandishi na media vinabaki ili mtumiaji ajaribu tena.
      setStatus({ tone: 'error', message: postMediaErrorMessage(error) || error?.message || 'Chapisho halijahifadhiwa.' })
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  function onKeyDown(event) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      publish()
    }
  }

  return (
    <section className="psh-createbar psh-qp" aria-label="Chapisho la haraka">
      {/* ── Typing bar ── */}
      <div className="psh-qp__bar">
        <Avatar user={me} size={40} />
        <textarea
          ref={textRef}
          className="psh-qp__input"
          rows={2}
          value={text}
          placeholder={prompt}
          aria-label="Andika chapisho"
          disabled={saving}
          onChange={(event) => {
            setText(event.target.value)
            rememberSelection(event)
          }}
          onSelect={rememberSelection}
          onKeyUp={rememberSelection}
          onClick={rememberSelection}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          className="psh-qp__more"
          aria-label="Zana zaidi za kuandika"
          aria-expanded={toolsOpen}
          aria-controls={toolsId}
          onClick={() => {
            setToolsOpen((open) => !open)
            if (toolsOpen) setTool(null)
          }}
        >
          <IconMoreHorizontal size={20} />
        </button>
      </div>

      {/* ── Zana (More) ── */}
      {toolsOpen ? (
        <div className="psh-qp__tools" id={toolsId} aria-label="Zana za kuandika">
          <div className="psh-qp__toolrow" role="group" aria-label="Chagua zana">
            <button
              type="button"
              className="psh-qp__chip"
              aria-pressed={tool === 'tag'}
              onClick={() => setTool(tool === 'tag' ? null : 'tag')}
            >
              <IconTag size={14} /> Tags
            </button>
            <button
              type="button"
              className="psh-qp__chip"
              aria-pressed={tool === 'mention'}
              onClick={() => setTool(tool === 'mention' ? null : 'mention')}
            >
              @ Mentions
            </button>
            <button
              type="button"
              className="psh-qp__chip"
              aria-pressed={tool === 'format'}
              onClick={() => {
                if (tool === 'format') return setTool(null)
                setArticleOn(true)
                setTool('format')
              }}
            >
              Muundo (makala)
            </button>
            <button
              type="button"
              className="psh-qp__chip"
              onClick={() => onCreate('studio', { text: trimmed, article: articleOn ? sanitizeContent(article) : null })}
            >
              Fungua Post Studio
            </button>
          </div>

          {tool === 'format' ? (
            <div className="psh-qp__toolform psh-qp__toolform--stack" aria-label="Muundo wa makala">
              <label className="psh-ps__field">
                <span className="psh-ps__label">Kichwa</span>
                <input className="psh-qp__field" value={article.heading.text} maxLength={MAX_HEADING}
                  onChange={(e) => setArticle((a) => sanitizeContent({ ...a, heading: { ...a.heading, text: e.target.value } }))} />
              </label>
              <SizeSelect label="Ukubwa wa kichwa" value={article.heading.size} options={HEADING_SIZES}
                onChange={(v) => setArticle((a) => sanitizeContent({ ...a, heading: { ...a.heading, size: v } }))} />
              <Swatches label="Rangi ya kichwa" value={article.heading.color}
                onChange={(v) => setArticle((a) => sanitizeContent({ ...a, heading: { ...a.heading, color: v } }))} />
              <SizeSelect label="Ukubwa wa body" value={article.body.size} options={BODY_SIZES}
                onChange={(v) => setArticle((a) => sanitizeContent({ ...a, body: { ...a.body, size: v } }))} />
              <label className="psh-ps__field">
                <span className="psh-ps__label">Hitimisho (conclusion)</span>
                <textarea className="psh-qp__field" rows={2} value={article.conclusion.text} maxLength={MAX_CONCLUSION}
                  onChange={(e) => setArticle((a) => sanitizeContent({ ...a, conclusion: { ...a.conclusion, text: e.target.value } }))} />
              </label>
              <SizeSelect label="Ukubwa wa hitimisho" value={article.conclusion.size} options={CONCLUSION_SIZES}
                onChange={(v) => setArticle((a) => sanitizeContent({ ...a, conclusion: { ...a.conclusion, size: v } }))} />
              <Swatches label="Rangi ya hitimisho" value={article.conclusion.color}
                onChange={(v) => setArticle((a) => sanitizeContent({ ...a, conclusion: { ...a.conclusion, color: v } }))} />
              <button type="button" className="psh-btn psh-btn--quiet psh-btn--sm"
                onClick={() => { setArticleOn(false); setTool(null) }}>
                Ondoa muundo wa makala
              </button>
            </div>
          ) : null}

          {tool === 'tag' ? (
            <form className="psh-qp__toolform" onSubmit={addTag}>
              <label htmlFor={tagInputId} className="u-sr">Jina la tag</label>
              <input
                id={tagInputId}
                className="psh-qp__field"
                value={tagDraft}
                placeholder="mfano: pasihai"
                maxLength={31}
                onChange={(event) => setTagDraft(event.target.value)}
              />
              <button type="submit" className="psh-btn psh-btn--soft psh-btn--sm" disabled={!tagDraft.trim()}>
                Ongeza tag
              </button>
            </form>
          ) : null}

          {tool === 'mention' ? (
            <div className="psh-qp__toolform psh-qp__toolform--stack">
              <label htmlFor={mentionInputId} className="u-sr">Tafuta mtu wa kutaja</label>
              <input
                id={mentionInputId}
                className="psh-qp__field"
                value={mentionQuery}
                placeholder="Tafuta jina au @handle"
                onChange={(event) => setMentionQuery(event.target.value)}
              />
              {!Array.isArray(people) ? (
                <p className="psh-qp__hint" role="status">Inapakia watu…</p>
              ) : mentionMatches.length === 0 ? (
                <p className="psh-qp__hint">Hakuna mtu anayelingana.</p>
              ) : (
                <ul className="psh-qp__people">
                  {mentionMatches.map((person) => (
                    <li key={person.id}>
                      <button
                        type="button"
                        className="psh-qp__person"
                        aria-label={`Taja ${person.name ?? person.handle}`}
                        onClick={() => mentionPerson(person)}
                      >
                        <span>{person.name}</span>
                        <small>{person.handle}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ── Media iliyochaguliwa (preview halisi ya faili) ── */}
      {file ? (
        <div className="psh-qp__media" aria-label="Media uliyochagua">
          {file.mediaType === 'video' ? (
            <video src={file.previewUrl} controls playsInline preload="metadata" aria-label="Preview ya video" />
          ) : (
            <img src={file.previewUrl} alt={`Preview ya picha: ${file.file.name}`} />
          )}
          <div className="psh-qp__medialine">
            <span title={file.file.name}>
              {file.kind === 'reel' ? 'Reel' : file.mediaType === 'video' ? 'Video' : 'Picha'} · {file.file.name} · {formatMediaSize(file.file.size)}
            </span>
            <button type="button" className="psh-qp__link" onClick={removeFile} disabled={saving}>
              Ondoa
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Preview ya makala (inatumia renderer ile ile ya feed) ── */}
      {articleOn ? (
        <div className="psh-qp__media" aria-label="Preview ya makala">
          <StructuredPost content={{ ...article, type: 'article', body: { ...article.body, text: trimmed } }} />
          {(() => {
            const r = validateContent({ ...article, type: 'article', body: { ...article.body, text: trimmed } })
            return r.ok ? null : <p className="psh-qp__hint" role="status">{r.errors.join(' ')}</p>
          })()}
        </div>
      ) : null}

      {/* ── Dock ya asili: (+) juu ya mstari wa block · Media · Reel · Live ── */}
      <div className="psh-createbar__dock">
        <button
          type="button"
          className="psh-createbar__plus"
          onClick={() => onCreate('menu')}
          aria-label="Fungua menyu ya kuunda"
        >
          <IconPlus size={22} strokeWidth={2.2} />
        </button>
        <ul className="psh-createbar__quick">
          <li>
            <button
              type="button"
              className="psh-createbar__act"
              aria-label="Chagua picha au video"
              disabled={saving}
              onClick={() => photoInputRef.current?.click()}
            >
              <IconPhoto size={18} />
              <span>Media</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              className="psh-createbar__act"
              aria-label="Chagua video ya Reel"
              disabled={saving}
              onClick={() => reelInputRef.current?.click()}
            >
              <IconReel size={18} />
              <span>Reel</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              className="psh-createbar__act"
              aria-label="Anza kikao cha moja kwa moja"
              onClick={() => onCreate('live')}
            >
              <IconLive size={18} />
              <span>Live</span>
            </button>
          </li>
        </ul>
        <input
          ref={photoInputRef}
          id={photoInputId}
          className="u-sr"
          type="file"
          tabIndex={-1}
          accept={`${POST_IMAGE_ACCEPT},${POST_VIDEO_ACCEPT}`}
          aria-hidden="true"
          onChange={(event) => chooseFile(event, 'photo')}
        />
        <input
          ref={reelInputRef}
          id={reelInputId}
          className="u-sr"
          type="file"
          tabIndex={-1}
          accept={POST_VIDEO_ACCEPT}
          aria-hidden="true"
          onChange={(event) => chooseFile(event, 'reel')}
        />
      </div>

      {canPublish || saving ? (
        <div className="psh-qp__publishrow">
          <button
            type="button"
            className="psh-btn psh-btn--primary psh-btn--sm psh-qp__publish"
            disabled={!canPublish}
            onClick={publish}
          >
            {saving ? 'Inahifadhi…' : 'Chapisha'}
          </button>
        </div>
      ) : null}

      <p className={`psh-qp__status psh-qp__status--${status.tone}`} role="status" aria-live="polite">
        {status.message}
      </p>

    </section>
  )
}
