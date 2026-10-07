// ══════════════════════════════════════════════════════════════
// PASIHAI — SHEET (Hatua 1)
// Paneli inayotokea kutoka chini kwenye simu, na kuwa dialog
// katikati kwenye desktop. Panels ndani ya panels zina kitufe
// cha "Rudi".
// ══════════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react'
import { IconClose, IconChevronLeft } from './icons.jsx'

export default function Sheet({ open, onClose, onBack, title, subtitle, children, size = 'md' }) {
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = window.setTimeout(() => {
      const first = panelRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      first?.focus?.({ preventScroll: true })
    }, 40)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      window.clearTimeout(t)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="psh-sheet" role="presentation">
      <div className="psh-sheet__scrim" onClick={onClose} aria-hidden="true" />
      <div
        className={`psh-sheet__panel psh-sheet__panel--${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Paneli'}
        ref={panelRef}
      >
        <div className="psh-sheet__grip" aria-hidden="true" />
        <header className="psh-sheet__head">
          <div className="psh-sheet__headleft">
            {onBack ? (
              <button type="button" className="psh-icobtn" onClick={onBack} aria-label="Rudi">
                <IconChevronLeft size={20} />
              </button>
            ) : null}
            <div>
              {title ? <h2 className="psh-sheet__title">{title}</h2> : null}
              {subtitle ? <p className="psh-sheet__sub">{subtitle}</p> : null}
            </div>
          </div>
          <button type="button" className="psh-icobtn" onClick={onClose} aria-label="Funga">
            <IconClose size={20} />
          </button>
        </header>
        <div className="psh-sheet__body">{children}</div>
      </div>
    </div>
  )
}
