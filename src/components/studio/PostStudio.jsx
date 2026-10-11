// ══════════════════════════════════════════════════════════════
// PASIHAI — POST STUDIO (ndani ya app, panel ya Create)
//
// Hatua: 1 Aina → 2 Template → 3 Maudhui → 4 Muundo → 5 Preview
// Vitendo tofauti: "Hifadhi rasimu" (kifaa hiki) na "Chapisha" (backend).
//
// Publish inatumia feedService.createPost halisi, na "Imechapishwa" inaonyeshwa
// tu baada ya post id halisi (publishOutcome). Double submit imezuiwa.
// Haina upload/backend mpya: media inatumia validatePostMediaFile kama composer.
// ══════════════════════════════════════════════════════════════

import { useId, useRef, useState } from 'react'
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
import { publishMessage, publishOutcome } from '../../utils/quickPost.js'
import {
  ALIGNS,
  BACKGROUNDS,
  BODY_SIZES,
  CONCLUSION_SIZES,
  HEADING_SIZES,
  MAX_ATTRIBUTION,
  MAX_BODY,
  MAX_CONCLUSION,
  MAX_HEADING,
  MAX_OPTIONS,
  MAX_OPTION_LEN,
  PALETTE,
  POST_TYPES,
  SIZE_LABEL,
  changeType,
  createContent,
  sanitizeContent,
  serializeContent,
  templatesFor,
  validateContent,
} from '../../utils/postContent.js'
import { DraftConflictError, listDrafts, removeDraft, saveDraft } from '../../utils/studioDrafts.js'
import StructuredPost from './StructuredPost.jsx'
import { Swatches, SizeSelect } from './FormatControls.jsx'

const STEPS = [
  { id: 'type', label: '1 · Aina' },
  { id: 'template', label: '2 · Template' },
  { id: 'content', label: '3 · Maudhui' },
  { id: 'customize', label: '4 · Muundo' },
  { id: 'preview', label: '5 · Preview' },
]

const TYPE_LABEL_FIELD = {
  poll: 'Swali',
  quote: 'Nukuu',
  article: 'Maelezo kuu (body)',
  announcement: 'Maelezo',
  text: 'Maudhui',
  video: 'Maelezo ya video',
  reel: 'Maelezo ya Reel',
  poster: 'Maelezo ya poster',
}

const SIZE_TEXT = { sm: 'Ndogo', md: 'Kati', lg: 'Kubwa', xl: 'Kubwa sana' }

/** Maudhui ya kuanzia kutoka kwenye payload ya kufungua Studio. */
function initialContent(payload) {
  // Rasimu iliyohifadhiwa: fungua kama ilivyo (openDraft).
  if (payload?.draft?.content) return sanitizeContent(payload.draft.content)
  // Imefunguliwa kutoka More → Muundo: chukua makala yote (heading/conclusion/sizes).
  if (payload?.article) {
    return sanitizeContent({
      ...payload.article,
      type: 'article',
      template: { id: 'article', version: 1 },
      body: { ...payload.article.body, text: String(payload.text ?? payload.article.body?.text ?? '') },
    })
  }
  // Aina + template iliyochaguliwa kutoka Creator Studio; haziwezi kuwa aina batili (createContent inarekebisha).
  const base = createContent(payload?.type || 'text', payload?.templateId ?? null)
  if (payload?.text) base.body.text = String(payload.text)
  return base
}

export default function PostStudio({ payload, onToast, onClose, onPosted }) {
  const me = useAsyncData(() => accountService.getCurrentUser(), [])
  const userId = me?.id ?? null
  const [version, setVersion] = useState(0)
  const drafts = useAsyncData(
    () => (userId ? Promise.resolve(listDrafts(userId)) : Promise.resolve([])),
    [userId, version],
  )

  // Njia ya kuingia: rasimu iliyopo, aina iliyochaguliwa (Creator Studio), au maandishi tu.
  const [step, setStep] = useState(() => (payload?.draft || payload?.type ? 'content' : 'type'))
  const [content, setContent] = useState(() => initialContent(payload))
  const [draftRef, setDraftRef] = useState(() =>
    payload?.draft ? { id: payload.draft.id, revision: payload.draft.revision } : null,
  ) // { id, revision } rasimu iliyofunguliwa
  const [confirmType, setConfirmType] = useState(null) // { next, dropped }
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [mediaFile, setMediaFile] = useState(null) // { file, previewUrl, mediaType }
  const [status, setStatus] = useState({ tone: 'idle', message: '' })
  const [busy, setBusy] = useState(null) // null | 'draft' | 'publish'
  const busyRef = useRef(false)
  const mediaInputId = useId()
  const typeCfg = POST_TYPES[content.type]
  const fields = new Set(typeCfg.fields)
  const check = validateContent(content)

  function patch(fn) {
    setContent((prev) => sanitizeContent(fn(structuredClone(prev))))
    setStatus({ tone: 'idle', message: '' })
  }

  function pickType(next) {
    const r = changeType(content, next)
    if (r.needsConfirm) {
      setConfirmType({ next, dropped: r.dropped })
      return
    }
    setConfirmType(null)
    setContent(r.content)
    setMediaFile(null)
  }

  function confirmTypeChange() {
    const r = changeType(content, confirmType.next, { confirmed: true })
    setContent(r.content)
    setConfirmType(null)
    setMediaFile(null)
  }

  function chooseMedia(event) {
    const picked = event.target.files?.[0]
    event.target.value = ''
    if (!picked) return
    let details
    try {
      details = validatePostMediaFile(picked, typeCfg.media === 'video' ? 'video' : typeCfg.media === 'image' ? 'image' : null)
    } catch (error) {
      setStatus({ tone: 'error', message: postMediaErrorMessage(error) })
      return
    }
    if (mediaFile?.previewUrl) URL.revokeObjectURL(mediaFile.previewUrl)
    setMediaFile({ file: picked, previewUrl: URL.createObjectURL(picked), mediaType: details.mediaType })
    setStatus({ tone: 'idle', message: '' })
  }

  function removeMedia() {
    if (mediaFile?.previewUrl) URL.revokeObjectURL(mediaFile.previewUrl)
    setMediaFile(null)
  }

  function openDraft(draft) {
    setContent(sanitizeContent(draft.content))
    setDraftRef({ id: draft.id, revision: draft.revision })
    setMediaFile(null)
    setStep('content')
    setStatus({ tone: 'ok', message: `Rasimu imefunguliwa (toleo ${draft.revision}). Media lazima ichaguliwe tena.` })
  }

  function saveDraftNow() {
    if (busyRef.current) return
    if (!userId) {
      setStatus({ tone: 'error', message: 'Ingia kwenye akaunti yako kabla ya kuhifadhi rasimu.' })
      return
    }
    busyRef.current = true
    setBusy('draft')
    setStatus({ tone: 'saving', message: 'Inahifadhi rasimu…' })
    try {
      const record = saveDraft(userId, { id: draftRef?.id, revision: draftRef?.revision, content })
      setDraftRef({ id: record.id, revision: record.revision })
      setStatus({ tone: 'ok', message: `Rasimu imehifadhiwa kwenye kifaa hiki (toleo ${record.revision}). Haijachapishwa.` })
      setVersion((v) => v + 1)
    } catch (error) {
      const msg = error instanceof DraftConflictError
        ? error.message
        : `Rasimu haikuhifadhiwa: ${error?.message || 'hitilafu'}`
      setStatus({ tone: 'error', message: msg })
    } finally {
      busyRef.current = false
      setBusy(null)
    }
  }

  function removeDraftNow(id) {
    try {
      removeDraft(userId, id)
      setConfirmDelete(null)
      if (draftRef?.id === id) setDraftRef(null)
      setVersion((v) => v + 1)
      setStatus({ tone: 'ok', message: 'Rasimu imefutwa kwenye kifaa hiki.' })
    } catch (error) {
      setStatus({ tone: 'error', message: `Rasimu haikufutwa: ${error?.message || 'hitilafu'}` })
    }
  }

  async function publish() {
    if (busyRef.current) return
    if (!check.ok) {
      setStatus({ tone: 'error', message: check.errors.join(' ') })
      return
    }
    if (typeCfg.media && !mediaFile) {
      setStatus({ tone: 'error', message: `Chagua ${typeCfg.media === 'video' ? 'video' : 'picha'} kabla ya kuchapisha.` })
      return
    }
    busyRef.current = true
    setBusy('publish')
    setStatus({ tone: 'saving', message: mediaFile ? 'Inapakia na kuhifadhi…' : 'Inahifadhi chapisho…' })
    try {
      const draftPayload = {
        kind: typeCfg.kind,
        text: serializeContent(content),
        file: mediaFile?.file || undefined,
      }
      if (content.type === 'poll') {
        draftPayload.options = content.options.map((o) => o.trim()).filter(Boolean)
      }
      const post = await feedService.createPost(draftPayload)
      const outcome = publishOutcome(post, { live: isSupabaseLive })
      if (outcome.status === 'failed') throw new Error(publishMessage(outcome))

      // Rasimu iliyochapishwa isibaki kama nakala ya pili.
      if (draftRef?.id && userId) {
        try { removeDraft(userId, draftRef.id) } catch { /* ruhusa ya kifaa: si kikwazo cha publish */ }
      }
      if (mediaFile?.previewUrl) URL.revokeObjectURL(mediaFile.previewUrl)
      const message = publishMessage(outcome)
      onToast?.(message)
      onPosted?.(post)
      onClose?.()
    } catch (error) {
      setStatus({ tone: 'error', message: postMediaErrorMessage(error) || 'Chapisho halijahifadhiwa.' })
    } finally {
      busyRef.current = false
      setBusy(null)
    }
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step)
  const draftList = Array.isArray(drafts) ? drafts : []

  return (
    <div className="psh-ps">
      <nav className="psh-ps__steps" aria-label="Hatua za Post Studio">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className="psh-ps__step"
            aria-current={step === s.id ? 'step' : undefined}
            onClick={() => setStep(s.id)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {/* ── 1: Aina ── */}
      {step === 'type' ? (
        <section aria-label="Chagua aina ya chapisho">
          <div className="psh-ps__grid" role="group" aria-label="Aina za chapisho">
            {Object.entries(POST_TYPES).map(([id, cfg]) => (
              <button
                key={id}
                type="button"
                className="psh-ps__card"
                aria-pressed={content.type === id}
                onClick={() => pickType(id)}
              >
                {cfg.label}
              </button>
            ))}
          </div>
          {confirmType ? (
            <div className="psh-ps__warn" role="alertdialog" aria-label="Uthibitisho wa kubadilisha aina">
              <p>Aina mpya haina sehemu hizi, zitapotea: <b>{confirmType.dropped.join(', ')}</b>. Endelea?</p>
              <div className="psh-ps__row">
                <button type="button" className="psh-btn psh-btn--soft psh-btn--sm" onClick={() => setConfirmType(null)}>Ghairi</button>
                <button type="button" className="psh-btn psh-btn--primary psh-btn--sm" onClick={confirmTypeChange}>Endelea</button>
              </div>
            </div>
          ) : null}

          {draftList.length ? (
            <div className="psh-ps__drafts" aria-label="Rasimu zangu kwenye kifaa hiki">
              <h3 className="psh-ps__h">Rasimu zangu (kifaa hiki)</h3>
              <ul>
                {draftList.map((d) => (
                  <li key={d.id} className="psh-ps__draftrow">
                    <span>{POST_TYPES[d.content.type]?.label ?? d.content.type} · toleo {d.revision} · {new Date(d.updatedAt).toLocaleString()}</span>
                    <button type="button" className="psh-btn psh-btn--soft psh-btn--sm" onClick={() => openDraft(d)}>Fungua</button>
                    {confirmDelete === d.id ? (
                      <button type="button" className="psh-btn psh-btn--sm" onClick={() => removeDraftNow(d.id)}>Thibitisha ufute</button>
                    ) : (
                      <button type="button" className="psh-btn psh-btn--quiet psh-btn--sm" onClick={() => setConfirmDelete(d.id)}>Futa</button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ── 2: Template ── */}
      {step === 'template' ? (
        <section aria-label="Chagua template">
          <p className="psh-ps__hint">Template ni mwonekano tu. Maudhui yako yanabaki yaleyale.</p>
          <div className="psh-ps__grid" role="group" aria-label="Templates">
            {templatesFor(content.type).map((t) => (
              <button
                key={t.id}
                type="button"
                className="psh-ps__card"
                aria-pressed={content.template.id === t.id}
                onClick={() => patch((c) => ({ ...c, template: { id: t.id, version: t.version } }))}
              >
                {t.label} <small>v{t.version}</small>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── 3: Maudhui ── */}
      {step === 'content' ? (
        <section aria-label="Maudhui" className="psh-ps__form">
          {fields.has('heading') ? (
            <label className="psh-ps__field">
              <span className="psh-ps__label">{content.type === 'article' ? 'Kichwa kikuu' : 'Kichwa'}</span>
              <input className="psh-ps__input" value={content.heading.text} maxLength={MAX_HEADING}
                onChange={(e) => patch((c) => ({ ...c, heading: { ...c.heading, text: e.target.value } }))} />
            </label>
          ) : null}
          {fields.has('body') ? (
            <label className="psh-ps__field">
              <span className="psh-ps__label">{TYPE_LABEL_FIELD[content.type] ?? 'Maudhui'}</span>
              <textarea className="psh-ps__input psh-ps__textarea" rows={content.type === 'article' ? 8 : 3}
                value={content.body.text} maxLength={MAX_BODY}
                onChange={(e) => patch((c) => ({ ...c, body: { ...c.body, text: e.target.value } }))} />
            </label>
          ) : null}
          {fields.has('conclusion') ? (
            <label className="psh-ps__field">
              <span className="psh-ps__label">Hitimisho (si lazima)</span>
              <textarea className="psh-ps__input" rows={3} value={content.conclusion.text} maxLength={MAX_CONCLUSION}
                onChange={(e) => patch((c) => ({ ...c, conclusion: { ...c.conclusion, text: e.target.value } }))} />
            </label>
          ) : null}
          {fields.has('attribution') ? (
            <label className="psh-ps__field">
              <span className="psh-ps__label">Chanzo / mtu wa nukuu (si lazima)</span>
              <input className="psh-ps__input" value={content.attribution} maxLength={MAX_ATTRIBUTION}
                onChange={(e) => patch((c) => ({ ...c, attribution: e.target.value }))} />
            </label>
          ) : null}
          {fields.has('options') ? (
            <fieldset className="psh-ps__field">
              <legend className="psh-ps__label">Chaguo (2 hadi {MAX_OPTIONS})</legend>
              {content.options.map((opt, i) => (
                <div key={i} className="psh-ps__row">
                  <input className="psh-ps__input" aria-label={`Chaguo ${i + 1}`} value={opt} maxLength={MAX_OPTION_LEN}
                    onChange={(e) => patch((c) => { c.options[i] = e.target.value; return c })} />
                  {content.options.length > 2 ? (
                    <button type="button" className="psh-btn psh-btn--quiet psh-btn--sm"
                      onClick={() => patch((c) => { c.options.splice(i, 1); return c })}>Ondoa</button>
                  ) : null}
                </div>
              ))}
              {content.options.length < MAX_OPTIONS ? (
                <button type="button" className="psh-btn psh-btn--soft psh-btn--sm"
                  onClick={() => patch((c) => { c.options.push(''); return c })}>+ Ongeza chaguo</button>
              ) : null}
            </fieldset>
          ) : null}
          {typeCfg.media ? (
            <div className="psh-ps__field">
              <span className="psh-ps__label">{typeCfg.media === 'video' ? 'Video' : 'Picha'}</span>
              <input id={mediaInputId} className="u-sr" type="file" tabIndex={-1} aria-hidden="true"
                accept={typeCfg.media === 'video' ? POST_VIDEO_ACCEPT : POST_IMAGE_ACCEPT}
                onChange={chooseMedia} />
              {mediaFile ? (
                <div className="psh-ps__media">
                  {mediaFile.mediaType === 'video'
                    ? <video src={mediaFile.previewUrl} controls playsInline preload="metadata" aria-label="Preview ya video" />
                    : <img src={mediaFile.previewUrl} alt={`Preview: ${mediaFile.file.name}`} />}
                  <div className="psh-ps__row">
                    <span>{mediaFile.file.name}</span>
                    <button type="button" className="psh-btn psh-btn--quiet psh-btn--sm" onClick={removeMedia}>Ondoa</button>
                  </div>
                </div>
              ) : (
                <label htmlFor={mediaInputId} className="psh-btn psh-btn--soft psh-btn--sm">
                  Chagua {typeCfg.media === 'video' ? 'video' : 'picha'}
                </label>
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ── 4: Muundo ── */}
      {step === 'customize' ? (
        <section aria-label="Muundo" className="psh-ps__form">
          {fields.has('heading') ? (
            <>
              <SizeSelect label="Ukubwa wa kichwa" value={content.heading.size} options={HEADING_SIZES}
                onChange={(v) => patch((c) => ({ ...c, heading: { ...c.heading, size: v } }))} />
              <Swatches label="Rangi ya kichwa" value={content.heading.color} keys={Object.keys(PALETTE)}
                onChange={(v) => patch((c) => ({ ...c, heading: { ...c.heading, color: v } }))} />
            </>
          ) : null}
          {fields.has('body') ? (
            <>
              <SizeSelect label="Ukubwa wa body" value={content.body.size} options={BODY_SIZES}
                onChange={(v) => patch((c) => ({ ...c, body: { ...c.body, size: v } }))} />
              <div className="psh-ps__field">
                <span className="psh-ps__label">Mpangilio</span>
                <div className="psh-ps__row" role="group" aria-label="Mpangilio">
                  {ALIGNS.map((a) => (
                    <button key={a} type="button" className="psh-btn psh-btn--soft psh-btn--sm" aria-pressed={content.body.align === a}
                      onClick={() => patch((c) => ({ ...c, body: { ...c.body, align: a } }))}>
                      {a === 'left' ? 'Kushoto' : 'Katikati'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : null}
          {fields.has('conclusion') ? (
            <>
              <SizeSelect label="Ukubwa wa hitimisho" value={content.conclusion.size} options={CONCLUSION_SIZES}
                onChange={(v) => patch((c) => ({ ...c, conclusion: { ...c.conclusion, size: v } }))} />
              <Swatches label="Rangi ya hitimisho" value={content.conclusion.color} keys={Object.keys(PALETTE)}
                onChange={(v) => patch((c) => ({ ...c, conclusion: { ...c.conclusion, color: v } }))} />
            </>
          ) : null}
          {['announcement', 'quote'].includes(content.type) ? (
            <label className="psh-ps__field">
              <span className="psh-ps__label">Background</span>
              <select className="psh-ps__input" value={content.background}
                onChange={(e) => patch((c) => ({ ...c, background: e.target.value }))}>
                {Object.entries(BACKGROUNDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </label>
          ) : null}
          {!fields.has('heading') && !fields.has('body') ? (
            <p className="psh-ps__hint">Aina hii haina sehemu za muundo wa maandishi.</p>
          ) : null}
        </section>
      ) : null}

      {/* ── 5: Preview ── */}
      {step === 'preview' ? (
        <section aria-label="Preview ya chapisho" className="psh-ps__preview">
          {content.type === 'poll' ? (
            <div className="psh-ps__pollprev">
              <p className="psh-ps__pollq">{content.body.text || '…'}</p>
              <ul>{content.options.filter((o) => o.trim()).map((o, i) => <li key={i}>{o}</li>)}</ul>
            </div>
          ) : (
            <StructuredPost content={content} />
          )}
          {mediaFile ? (
            <p className="psh-ps__hint">Media: {mediaFile.file.name} ({mediaFile.mediaType === 'video' ? 'video' : 'picha'})</p>
          ) : typeCfg.media ? (
            <p className="psh-ps__hint" role="status">Media haijachaguliwa — chapisho halitachapishwa bila media.</p>
          ) : null}
          {!check.ok ? (
            <ul className="psh-ps__errors" role="status">{check.errors.map((e) => <li key={e}>{e}</li>)}</ul>
          ) : null}
        </section>
      ) : null}

      {/* ── Vitendo ── */}
      <footer className="psh-ps__footer">
        <div className="psh-ps__row">
          {stepIndex > 0 ? (
            <button type="button" className="psh-btn psh-btn--soft psh-btn--sm" onClick={() => setStep(STEPS[stepIndex - 1].id)}>Nyuma</button>
          ) : null}
          {stepIndex < STEPS.length - 1 ? (
            <button type="button" className="psh-btn psh-btn--soft psh-btn--sm" onClick={() => setStep(STEPS[stepIndex + 1].id)}>Endelea</button>
          ) : null}
        </div>
        <div className="psh-ps__row">
          <button type="button" className="psh-btn psh-btn--soft psh-btn--sm" disabled={busy !== null} onClick={saveDraftNow}>
            {busy === 'draft' ? 'Inahifadhi…' : 'Hifadhi rasimu'}
          </button>
          <button type="button" className="psh-btn psh-btn--primary psh-btn--sm" disabled={busy !== null} onClick={publish}>
            {busy === 'publish' ? 'Inachapisha…' : 'Chapisha'}
          </button>
        </div>
      </footer>

      <p className={`psh-ps__status psh-ps__status--${status.tone}`} role="status" aria-live="polite">{status.message}</p>
      <p className="psh-ps__hint">Rasimu zinahifadhiwa kwenye kifaa hiki tu, si kwenye cloud. Media haihifadhiwi kwenye rasimu.</p>
    </div>
  )
}
