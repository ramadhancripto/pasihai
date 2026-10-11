// ══════════════════════════════════════════════════════════════
// LayerList — tabaka zote: aina, jina, thumbnail, kuonekana, kufunga, chagua, badili jina,
//   nakili, futa, panga upya (mbele/nyuma). Inatumika kwenye paneli ya chini na kwenye mobile.
//   Orodha inaonyeshwa juu-kwenda-chini (tabaka ya juu kabisa kwanza), kama wahariri wengine.
// ══════════════════════════════════════════════════════════════
import { useState } from 'react'
import { Icon } from './controls.jsx'
import { SHAPE_LABEL } from '../../creative/creativeModel.js'

const TYPE_LABEL = { text: 'Maandishi', image: 'Picha', shape: 'Umbo' }

export default function LayerList({ doc, selectedIds = [], onSelect, onAction, variant = 'row' }) {
  const [renaming, setRenaming] = useState(null)
  const [draft, setDraft] = useState('')
  const ordered = [...doc.layers].reverse()
  const count = doc.layers.length

  if (!count) {
    return <p className="cve-muted cve-layers__empty">Bado hakuna tabaka. Ongeza maandishi, picha au umbo.</p>
  }

  const startRename = (l) => { setRenaming(l.id); setDraft(l.name) }
  const finishRename = (l) => {
    const name = draft.trim()
    if (name && name !== l.name) onAction('rename', l.id, name)
    setRenaming(null)
  }

  return (
    <ul className={`cve-layers cve-layers--${variant}`} aria-label="Tabaka">
      {ordered.map((l, i) => {
        const isSel = selectedIds.includes(l.id)
        const isPrimary = selectedIds[selectedIds.length - 1] === l.id
        const position = count - i // nambari ya tabaka kutoka chini
        return (
          <li key={l.id} className={`cve-layer-row${isSel ? ' is-sel' : ''}${l.hidden ? ' is-hidden' : ''}`}>
            <button
              type="button"
              className="cve-layer-row__pick"
              aria-current={isPrimary ? 'true' : undefined}
              aria-pressed={isSel}
              onClick={(e) => onSelect(l.id, e.shiftKey || e.ctrlKey || e.metaKey)}
              onDoubleClick={() => startRename(l)}
            >
              <Thumb layer={l} />
              <span className="cve-layer-row__meta">
                {renaming === l.id ? (
                  <input
                    className="cve-input cve-input--sm"
                    value={draft}
                    autoFocus
                    aria-label="Jina la tabaka"
                    maxLength={80}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => finishRename(l)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.currentTarget.blur()
                      if (e.key === 'Escape') { setRenaming(null) }
                      e.stopPropagation()
                    }}
                  />
                ) : (
                  <span className="cve-layer-row__name">{l.name}</span>
                )}
                <span className="cve-layer-row__type">
                  {TYPE_LABEL[l.type]}{l.type === 'shape' ? ` · ${SHAPE_LABEL[l.shape] ?? ''}` : ''} · nafasi {position}
                </span>
              </span>
            </button>
            <span className="cve-layer-row__acts">
              <IconBtn label={l.hidden ? 'Onyesha' : 'Ficha'} icon={l.hidden ? 'eyeOff' : 'eye'} pressed={!!l.hidden} onClick={() => onAction('toggle', l.id, 'hidden')} />
              <IconBtn label={l.locked ? 'Fungua' : 'Funga'} icon={l.locked ? 'lock' : 'unlock'} pressed={!!l.locked} onClick={() => onAction('toggle', l.id, 'locked')} />
              <IconBtn label="Sogeza juu" icon="up" disabled={i === 0} onClick={() => onAction('order', l.id, 'forward')} />
              <IconBtn label="Sogeza chini" icon="down" disabled={i === count - 1} onClick={() => onAction('order', l.id, 'backward')} />
              <IconBtn label="Nakili" icon="copy" onClick={() => onAction('duplicate', l.id)} />
              <IconBtn label="Futa" icon="trash" onClick={() => onAction('delete', l.id)} />
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function IconBtn({ label, icon, onClick, disabled = false, pressed }) {
  return (
    <button
      type="button"
      className="cve-iconbtn"
      aria-label={`${label}`}
      title={label}
      aria-pressed={pressed === undefined ? undefined : pressed}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onClick() }}
    >
      <Icon name={icon} size={16} />
    </button>
  )
}

function Thumb({ layer }) {
  if (layer.type === 'image') {
    return <span className="cve-thumb"><img src={layer.src} alt="" draggable={false} /></span>
  }
  if (layer.type === 'shape') {
    return (
      <span className="cve-thumb cve-thumb--shape" aria-hidden="true">
        <span style={{ background: layer.fill || 'transparent', border: layer.stroke && layer.strokeWidth ? `2px solid ${layer.stroke}` : 'none', borderRadius: layer.shape === 'ellipse' ? '50%' : 4 }} />
      </span>
    )
  }
  return <span className="cve-thumb cve-thumb--text" aria-hidden="true" style={{ color: layer.color }}>Aa</span>
}
