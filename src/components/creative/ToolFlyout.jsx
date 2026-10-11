// ══════════════════════════════════════════════════════════════
// ToolFlyout — paneli ya zana iliyofunguliwa: Maumbo, Templates, Media Library.
// Ilitoka ToolRail.jsx; orodha ya zana sasa iko kwenye toolRegistry.js.
// ══════════════════════════════════════════════════════════════
import { useState } from 'react'
import { Icon } from './controls.jsx'
import useStudioData from '../../studio/useStudioData.js'
import { loadStudioBase, mediaOf } from '../../studio/studioData.js'
import { SHAPE_KINDS, SHAPE_LABEL, STARTER_TEMPLATES } from '../../creative/creativeModel.js'

// ── Flyout: maudhui ya zana iliyofunguliwa ─────────────────────
export function ToolFlyout({ kind, onClose, onAddShape, onApplyTemplate, onPickMedia, mobile = false }) {
  const title = kind === 'shapes' ? 'Maumbo' : kind === 'templates' ? 'Templates' : 'Media Library'
  return (
    <aside className={`cve-flyout${mobile ? ' cve-flyout--sheet' : ''}`} aria-label={title} data-flyout={kind}>
      <header className="cve-flyout__head">
        <h3>{title}</h3>
        <button type="button" className="cve-iconbtn" aria-label="Funga" onClick={onClose}><Icon name="close" size={16} /></button>
      </header>
      {kind === 'shapes' ? <ShapesList onAdd={onAddShape} /> : null}
      {kind === 'templates' ? <TemplatesList onApply={onApplyTemplate} /> : null}
      {kind === 'media' ? <MediaList onPick={onPickMedia} /> : null}
    </aside>
  )
}

function ShapesList({ onAdd }) {
  return (
    <ul className="cve-flyout__grid" aria-label="Aina za maumbo">
      {SHAPE_KINDS.map((k) => (
        <li key={k}>
          <button type="button" className="cve-flyout__tile" onClick={() => onAdd(k)}>
            <ShapeGlyph kind={k} />
            <span>{SHAPE_LABEL[k]}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function ShapeGlyph({ kind }) {
  const common = { fill: 'var(--cve-accent, #18a982)', stroke: 'none' }
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
      {kind === 'rect' ? <rect x="6" y="10" width="32" height="24" {...common} /> : null}
      {kind === 'rounded' ? <rect x="6" y="10" width="32" height="24" rx="8" {...common} /> : null}
      {kind === 'ellipse' ? <ellipse cx="22" cy="22" rx="16" ry="12" {...common} /> : null}
      {kind === 'triangle' ? <polygon points="22,8 38,36 6,36" {...common} /> : null}
      {kind === 'line' ? <line x1="6" y1="22" x2="38" y2="22" stroke="var(--cve-accent, #18a982)" strokeWidth="4" strokeLinecap="round" /> : null}
      {kind === 'arrow' ? <path d="M6 22h28M26 14l10 8-10 8" fill="none" stroke="var(--cve-accent, #18a982)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /> : null}
    </svg>
  )
}

function TemplatesList({ onApply }) {
  return (
    <>
      <p className="cve-hint">Template inabadilisha mandhari na tabaka za turubai. Unaweza kurudisha kwa Undo.</p>
      <ul className="cve-flyout__list" aria-label="Templates">
        {STARTER_TEMPLATES.map((t) => (
          <li key={t.id}>
            <button type="button" className="cve-flyout__row" onClick={() => onApply(t.id)}>
              <span className="cve-swatch-big" style={{ background: t.background.type === 'gradient' ? `linear-gradient(135deg, ${t.background.from}, ${t.background.to})` : t.background.color }} aria-hidden="true" />
              <span>{t.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}

function MediaList({ onPick }) {
  const base = useStudioData(loadStudioBase, [])
  const [err, setErr] = useState('')
  if (base.status === 'loading') return <p className="cve-muted">Inapakia media yako…</p>
  if (base.status === 'error') return <p className="cve-error" role="alert">Media haikupakiwa. <button type="button" className="cve-linkbtn" onClick={base.retry}>Jaribu tena</button></p>

  const images = base.data.posts
    .map((p) => ({ post: p, media: mediaOf(p) }))
    .filter((x) => x.media && x.media.kind === 'image' && x.media.url)

  if (!images.length) {
    return <p className="cve-muted">Bado hakuna picha kwenye machapisho yako. Pakia picha kutoka kifaa chako badala yake.</p>
  }
  return (
    <>
      <p className="cve-hint">Picha kutoka kwenye machapisho yako. Kiungo cha picha ya Media kinaweza kuisha muda; picha ya kifaa inahifadhiwa ndani ya mradi.</p>
      {err ? <p className="cve-error" role="alert">{err}</p> : null}
      <ul className="cve-flyout__grid" aria-label="Picha za Media">
        {images.map(({ post, media }) => (
          <li key={post.id ?? media.url}>
            <button type="button" className="cve-flyout__tile cve-flyout__tile--img" onClick={() => onPick({ url: media.url }, setErr)}>
              <img src={media.url} alt="" />
              <span className="cve-muted">{(post.text ?? post.title ?? 'Picha').slice(0, 24)}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
