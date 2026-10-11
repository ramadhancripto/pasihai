// ══════════════════════════════════════════════════════════════
// PASIHAI — Creator Studio: components za pamoja
// StatusChip · PlannedSection · Empty · LoadingBox · ErrorBox · Panel
// ══════════════════════════════════════════════════════════════

import { STATUS } from '../../../studio/studioModel.js'

export function StatusChip({ status }) {
  const s = STATUS[status] ?? { label: status, tone: 'muted' }
  return <span className={`psh-cs__chip psh-cs__chip--${s.tone}`}>{s.label}</span>
}

export function Panel({ title, action, children, className = '' }) {
  return (
    <section className={`psh-cs__panel ${className}`.trim()} aria-label={title}>
      {title || action ? (
        <header className="psh-cs__panelHead">
          {title ? <h2 className="psh-cs__h2">{title}</h2> : <span />}
          {action}
        </header>
      ) : null}
      {children}
    </section>
  )
}

export function Empty({ title, text, action }) {
  return (
    <div className="psh-cs__empty" role="status">
      <p className="psh-cs__emptyTitle">{title}</p>
      {text ? <p className="psh-cs__muted">{text}</p> : null}
      {action}
    </div>
  )
}

export function LoadingBox({ label = 'Inapakia…' }) {
  return <p className="psh-cs__loading" role="status" aria-busy="true">{label}</p>
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div className="psh-cs__error" role="alert">
      <p>Imeshindikana kupakia: {error?.message || 'hitilafu isiyojulikana'}.</p>
      {onRetry ? (
        <button type="button" className="psh-btn psh-btn--soft psh-btn--sm" onClick={onRetry}>Jaribu tena</button>
      ) : null}
    </div>
  )
}

/**
 * Ukurasa wa sehemu ambayo bado haijaunganishwa na backend.
 * Haidai kufanya kazi: inaeleza kinachohitajika na njia mbadala zilizopo sasa.
 */
export function PlannedSection({ title, status = 'planned', summary, needs = [], alternatives = [] }) {
  return (
    <Panel title={title} action={<StatusChip status={status} />}>
      <p className="psh-cs__body">{summary}</p>
      {needs.length ? (
        <>
          <h3 className="psh-cs__h3">Kinachohitajika kabla ya kuwezeshwa</h3>
          <ul className="psh-cs__list">
            {needs.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </>
      ) : null}
      {alternatives.length ? (
        <>
          <h3 className="psh-cs__h3">Unachoweza kufanya sasa</h3>
          <div className="psh-cs__row">
            {alternatives.map((a) => (
              <button key={a.label} type="button" className="psh-btn psh-btn--soft psh-btn--sm" onClick={a.onClick}>
                {a.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </Panel>
  )
}
