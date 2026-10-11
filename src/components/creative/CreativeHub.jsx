// ══════════════════════════════════════════════════════════════
// CreativeHub — sehemu ya Create ya Creator Studio.
//   Inafungua CreativeEditor (turubai moja) kwa mode au template.
//   Inaorodhesha miradi yako ya kifaa hiki, na inaonyesha gallery ya Post Studio kama sehemu ya pili.
//   Hakuna fomu za pekee za kila format: mode ni seti ya ukubwa + tabaka za kuanzia tu.
// ══════════════════════════════════════════════════════════════
import { useEffect, useMemo, useState } from 'react'
import { accountService } from '../../services/accountService.js'
import useStudioData from '../../studio/useStudioData.js'
import { Empty, Panel, LoadingBox, ErrorBox, StatusChip } from '../studio/sections/StudioShared.jsx'
import StudioCreate from '../studio/sections/StudioCreate.jsx'
import {
  MODES, MODE_ORDER, STARTER_TEMPLATES, applyTemplate, createDocument, sanitizeDocument,
} from '../../creative/creativeModel.js'
import { listProjects, getProject, removeProject } from '../../creative/creativeProjects.js'
import CreativeEditor from './CreativeEditor.jsx'
import { Icon } from './controls.jsx'
import { CREATION_GALLERY, filterGallery } from '../../creative/creationGallery.js'
import '../../styles/creative-editor.css'

export default function CreativeHub({ intent = null, onOpenPostStudio, onOpenStatus, onOpenLive, onNavigate, onEditorOpenChange }) {
  const me = useStudioData(() => accountService.getCurrentUser(), [])
  const userId = me.status === 'ready' ? me.data?.id ?? null : null
  const [editor, setEditor] = useState(null)
  const [refresh, setRefresh] = useState(0)
  const [notice, setNotice] = useState('')
  const [customSize, setCustomSize] = useState({ width: 1080, height: 1080 })
  const [galleryQuery, setGalleryQuery] = useState('')

  const projects = useMemo(() => {
    if (!userId) return []
    try { return listProjects(userId) } catch { return [] }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, refresh])

  function open(state) {
    setNotice('')
    setEditor({ ...state, key: `${state.projectId ?? 'new'}-${Date.now()}` })
    onEditorOpenChange?.(true)
  }

  function close() {
    setEditor(null)
    setRefresh((n) => n + 1)
    onEditorOpenChange?.(false)
  }

  function startMode(modeId) {
    const mode = MODES[modeId]
    if (!mode || mode.status === 'planned') return
    const doc = modeId === 'custom' ? createDocument('custom', customSize) : createDocument(modeId)
    open({ doc, saved: false })
  }

  // Njia ya Studio nav (k.m. "Story / Status"): fungua mode moja kwa moja. Hufanyika mara moja kwa kila ombi.
  useEffect(() => {
    if (intent?.mode) startMode(intent.mode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent?.key])

  function startTemplate(templateId) {
    const doc = applyTemplate(createDocument('social'), templateId)
    open({ doc, saved: false, fromTemplate: templateId })
  }

  function openProject(id) {
    try {
      const rec = getProject(userId, id)
      if (!rec) { setNotice('Mradi huu haupo tena kwenye kifaa hiki.'); setRefresh((n) => n + 1); return }
      const { doc } = sanitizeDocument(rec.doc)
      open({ projectId: rec.id, revision: rec.revision, doc, saved: true })
    } catch (err) {
      setNotice(`Mradi haukufunguka: ${err?.message || 'data si sahihi'}.`)
    }
  }

  function deleteProject(id) {
    try {
      removeProject(userId, id)
      setRefresh((n) => n + 1)
    } catch (err) {
      setNotice(`Mradi haukufutwa: ${err?.message || 'hitilafu'}.`)
    }
  }

  if (editor) {
    return (
      <CreativeEditor
        key={editor.key}
        userId={userId}
        initial={{ projectId: editor.projectId ?? null, revision: editor.revision ?? 0, doc: editor.doc }}
        onExit={close}
        onSaved={() => setRefresh((n) => n + 1)}
      />
    )
  }

  return (
    <div className="psh-cs__stack cve-hub" data-testid="creative-hub">
      <header className="psh-cs__pageHead">
        <div>
          <h1 className="psh-cs__h1">Create</h1>
          <p className="psh-cs__muted">
            Turubai moja kwa machapisho, stories, posters na matangazo. Anza kutoka mwanzo au kutoka template.
          </p>
        </div>
      </header>

      {notice ? <p className="psh-cs__error" role="alert">{notice}</p> : null}
      {me.status === 'loading' ? <LoadingBox label="Inapakia akaunti yako…" /> : null}
      {me.status === 'error' ? <ErrorBox error={me.error} onRetry={me.retry} /> : null}
      {me.status === 'ready' && !userId ? (
        <p className="psh-cs__muted" role="status">Ingia kwenye akaunti ili kuhifadhi miradi yako. Unaweza kuanza kubuni sasa hivi.</p>
      ) : null}

      <Panel title="Chagua aina ya kuanza">
        <label className="cve-field">
          <span className="u-sr">Tafuta aina ya muundo</span>
          <input
            className="cve-input"
            type="search"
            placeholder="Tafuta aina (k.m. story, poster)…"
            value={galleryQuery}
            onChange={(e) => setGalleryQuery(e.target.value)}
          />
        </label>
        <ul className="cve-gallery" aria-label="Aina za kuanza muundo">
          {filterGallery(galleryQuery).map((g) => {
            const modeStatus = g.mode ? MODES[g.mode]?.status : null
            const planned = Boolean(g.planned) || modeStatus === 'planned'
            const statusText = planned ? 'Mpango' : modeStatus === 'partial' ? 'Sehemu tu' : g.anchor ? 'Sehemu hii' : ''
            return (
              <li key={g.id}>
                <button
                  type="button"
                  className="cve-gallery__tile"
                  disabled={planned}
                  aria-label={planned ? `${g.label}: bado haijaunganishwa` : g.label}
                  onClick={() => {
                    if (g.anchor) {
                      document.getElementById(g.anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      return
                    }
                    startMode(g.mode)
                  }}
                >
                  <Icon name={g.icon} size={20} />
                  <span className="cve-gallery__text">
                    <strong>{g.label}</strong>
                    <span className="cve-gallery__hint">{g.hint}</span>
                  </span>
                  {statusText ? <span className="cve-gallery__st">{statusText}</span> : null}
                </button>
              </li>
            )
          })}
        </ul>
        {filterGallery(galleryQuery).length === 0 ? <p className="psh-cs__muted" role="status">Hakuna aina inayolingana</p> : null}
      </Panel>

      <Panel title="Anza muundo mpya">
        <ul className="cve-modes" aria-label="Aina za muundo">
          {MODE_ORDER.map((id) => {
            const m = MODES[id]
            const planned = m.status === 'planned'
            return (
              <li key={id}>
                <article className={`cve-mode${planned ? ' is-planned' : ''}`}>
                  <header className="cve-mode__head">
                    <span className="cve-mode__title">{m.label}</span>
                    <StatusChip status={m.status} />
                  </header>
                  <p className="psh-cs__muted">{m.note}</p>
                  <span className="cve-muted">{m.custom ? 'Ukubwa wako' : `${m.width} × ${m.height} px`}</span>
                  {m.custom ? (
                    <div className="cve-grid2">
                      <label className="cve-field">
                        <span className="cve-field__label"><span>Upana (px)</span></span>
                        <input className="cve-input" type="number" min={200} max={4000} value={customSize.width} onChange={(e) => setCustomSize((s) => ({ ...s, width: Number(e.target.value) || 200 }))} />
                      </label>
                      <label className="cve-field">
                        <span className="cve-field__label"><span>Urefu (px)</span></span>
                        <input className="cve-input" type="number" min={200} max={4000} value={customSize.height} onChange={(e) => setCustomSize((s) => ({ ...s, height: Number(e.target.value) || 200 }))} />
                      </label>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="psh-btn psh-btn--primary psh-btn--sm"
                    disabled={planned}
                    onClick={() => startMode(id)}
                    aria-label={planned ? `${m.label}: bado haijaunganishwa` : `Anza ${m.label}`}
                  >
                    {planned ? 'Bado haijaunganishwa' : 'Anza'}
                  </button>
                </article>
              </li>
            )
          })}
        </ul>
      </Panel>

      <div id="cv-templates" className="cve-anchor" aria-hidden="true" />
      <Panel title="Anza kutoka template">
        <ul className="psh-cs__cards">
          {STARTER_TEMPLATES.map((t) => (
            <li key={t.id}>
              <article className="psh-cs__card psh-cs__card--static">
                <span className="psh-cs__cardTitle">{t.label}</span>
                <span className="cve-swatch-big" style={{ background: t.background.type === 'gradient' ? `linear-gradient(135deg, ${t.background.from}, ${t.background.to})` : t.background.color }} aria-hidden="true" />
                <button type="button" className="psh-btn psh-btn--soft psh-btn--sm" onClick={() => startTemplate(t.id)}>Tumia template</button>
              </article>
            </li>
          ))}
        </ul>
      </Panel>

      <div id="cv-projects" className="cve-anchor" aria-hidden="true" />
      <Panel title="Miradi yangu kwenye kifaa hiki">
        {!userId ? (
          <Empty title="Ingia kwenye akaunti" text="Miradi inahitaji akaunti ili kuhifadhiwa." />
        ) : projects.length === 0 ? (
          <Empty title="Bado hakuna mradi" text="Mradi ukihifadhiwa utaonekana hapa." />
        ) : (
          <ul className="cve-projects" aria-label="Miradi yako">
            {projects.map((p) => (
              <li key={p.id} className="cve-project">
                <div className="cve-project__meta">
                  <span className="psh-cs__cardTitle">{p.title}</span>
                  <span className="cve-muted">{MODES[p.mode]?.label ?? 'Mradi'} · toleo {p.revision} · {formatDate(p.updatedAt)}</span>
                </div>
                <div className="cve-project__acts">
                  <button type="button" className="psh-btn psh-btn--primary psh-btn--sm" onClick={() => openProject(p.id)}>Fungua</button>
                  <ConfirmDelete onConfirm={() => deleteProject(p.id)} />
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="psh-cs__muted">Miradi imehifadhiwa kwenye kifaa hiki tu. Kusawazisha kwenye akaunti bado hakujaunganishwa.</p>
      </Panel>

      <Panel title="Machapisho ya maandishi (Post Studio)">
        <p className="psh-cs__muted">Aina za machapisho ya maandishi, kura, makala na tangazo bado zinatumia Post Studio.</p>
        <StudioCreate embedded onOpenPostStudio={onOpenPostStudio} onOpenStatus={onOpenStatus} onOpenLive={onOpenLive} onNavigate={onNavigate} />
      </Panel>
    </div>
  )
}

function ConfirmDelete({ onConfirm }) {
  const [armed, setArmed] = useState(false)
  if (!armed) {
    return <button type="button" className="psh-btn psh-btn--quiet psh-btn--sm" onClick={() => setArmed(true)}>Futa</button>
  }
  return (
    <span className="cve-project__confirm">
      <button type="button" className="psh-btn psh-btn--sm cve-danger" onClick={onConfirm}>Thibitisha kufuta</button>
      <button type="button" className="psh-btn psh-btn--quiet psh-btn--sm" onClick={() => setArmed(false)}>Ghairi</button>
    </span>
  )
}

function formatDate(iso) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString()
}
