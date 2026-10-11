// Creator Studio — Settings (wasifu, arifa, mipangilio iliyopo, mpango)
import useStudioData from '../../../studio/useStudioData.js'
import { getCurrentPlan, PLANS } from '../../../studio/studioModel.js'
import { loadStudioBase } from '../../../studio/studioData.js'
import { ErrorBox, LoadingBox, Panel, StatusChip } from './StudioShared.jsx'

export default function StudioSettings({ onOpenPanel, onOpenProfile }) {
  const base = useStudioData(loadStudioBase, [])
  if (base.status === 'loading') return <LoadingBox label="Inapakia mipangilio…" />
  if (base.status === 'error') return <ErrorBox error={base.error} onRetry={base.retry} />

  const { me } = base.data
  const plan = PLANS[getCurrentPlan()]

  // Kila kitufe hapa kinafungua paneli ILIYOPO ya app; hakuna mipangilio mipya iliyobuniwa.
  const links = [
    { label: 'Arifa', hint: 'Ona arifa zako na uzisome', onClick: () => onOpenPanel({ type: 'notifications' }) },
    { label: 'Mipangilio ya feed', hint: 'Jinsi feed inavyoonekana', onClick: () => onOpenPanel({ type: 'feedprefs' }) },
    { label: 'Mapendeleo ya maudhui', hint: 'Unachotaka kuona', onClick: () => onOpenPanel({ type: 'contentprefs' }) },
    { label: 'Data na hifadhi ya kifaa', hint: 'Matumizi ya data na nje ya mtandao', onClick: () => onOpenPanel({ type: 'datasaved' }) },
    { label: 'Hali ya mfumo', hint: 'Mtandao, usawazishaji na relay', onClick: () => onOpenPanel({ type: 'system' }) },
  ]

  return (
    <div className="psh-cs__stack">
      <header className="psh-cs__pageHead">
        <div>
          <h1 className="psh-cs__h1">Settings</h1>
          <p className="psh-cs__muted">Akaunti, arifa na mapendeleo.</p>
        </div>
      </header>

      <Panel title="Akaunti">
        <p className="psh-cs__body"><strong>{me?.name || 'Mtumiaji'}</strong> {me?.handle ? `· ${me.handle}` : ''}</p>
        <button type="button" className="psh-btn psh-btn--soft psh-btn--sm" onClick={() => onOpenProfile('me')}>Hariri wasifu</button>
      </Panel>

      <Panel title="Mpango">
        <p className="psh-cs__body">Mpango wa sasa: <strong>{plan.label}</strong></p>
        <div className="psh-cs__row">
          <StatusChip status={plan.status} />
          <button type="button" className="psh-btn psh-btn--quiet psh-btn--sm" disabled title="Malipo hayajaunganishwa">Boresha mpango</button>
        </div>
      </Panel>

      <Panel title="Mipangilio ya app">
        <ul className="psh-cs__rows">
          {links.map((l) => (
            <li key={l.label} className="psh-cs__row2">
              <div className="psh-cs__rowMain">
                <strong>{l.label}</strong>
                <span className="psh-cs__muted">{l.hint}</span>
              </div>
              <button type="button" className="psh-btn psh-btn--soft psh-btn--sm" onClick={l.onClick}>Fungua</button>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Usalama na ruhusa">
        <p className="psh-cs__muted">Mipangilio ya usalama wa akaunti na ruhusa za faragha haijaunganishwa kwenye Studio bado. Mabadiliko ya akaunti yanayopatikana sasa yako kwenye skrini ya wasifu.</p>
      </Panel>
    </div>
  )
}
