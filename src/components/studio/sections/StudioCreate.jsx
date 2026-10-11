// Creator Studio — Create (gallery ya aina) na Templates
import { useState } from 'react'
import { FEATURES, catalogItemsByCategory } from '../../../studio/studioModel.js'
import { POST_TYPES, TEMPLATES } from '../../../utils/postContent.js'
import { Empty, Panel, PlannedSection, StatusChip } from './StudioShared.jsx'

// Kwa aina zilizopangwa: njia mbadala inayofanya kazi sasa.
const PLANNED_ALTERNATIVE = {
  carousel: { type: 'poster', label: 'Poster ya picha' },
  slideshow: { type: 'video', label: 'Video' },
  collage: { type: 'poster', label: 'Poster ya picha' },
  thumbnail: { type: 'poster', label: 'Poster ya picha' },
  banner: { type: 'announcement', label: 'Tangazo' },
}

export default function StudioCreate({ onOpenPostStudio, onOpenStatus, onOpenLive, onNavigate, embedded = false }) {
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState(null)
  const groups = catalogItemsByCategory(query)
  const hasAny = Object.keys(groups).length > 0

  function start(item) {
    if (item.action === 'studio') return onOpenPostStudio({ type: item.type })
    if (item.action === 'status') return onOpenStatus()
    if (item.action === 'live') return onOpenLive()
    setPicked(item)
  }

  const alt = picked ? PLANNED_ALTERNATIVE[picked.id] : null

  return (
    <div className="psh-cs__stack">
      {embedded ? null : (
        <header className="psh-cs__pageHead">
          <div>
            <h1 className="psh-cs__h1">Create</h1>
            <p className="psh-cs__muted">Chagua unachotaka kuunda. Kila aina inaanza workflow yake.</p>
          </div>
        </header>
      )}

      <label className="psh-cs__search">
        <span className="u-sr">Tafuta aina ya kuunda</span>
        <input
          className="psh-cs__input"
          type="search"
          placeholder="Tafuta: kura, makala, reel, tangazo…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      {!hasAny ? <Empty title="Hakuna aina inayolingana" text="Jaribu neno lingine." /> : null}

      {Object.entries(groups).map(([category, items]) => (
        <Panel key={category} title={category}>
          <ul className="psh-cs__cards">
            {items.map((item) => (
              <li key={item.id}>
                <button type="button" className="psh-cs__card" onClick={() => start(item)} aria-label={`${item.label}: ${item.hint}`}>
                  <span className="psh-cs__cardTitle">{item.label}</span>
                  <span className="psh-cs__muted">{item.hint}</span>
                  <StatusChip status={item.status} />
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      ))}

      {picked ? (
        <PlannedSection
          title={picked.label}
          status={picked.status}
          summary={`${picked.hint} Bado haijaunganishwa, kwa hiyo haitafunguka kama mhariri kamili.`}
          alternatives={alt ? [{ label: `Anza na ${alt.label}`, onClick: () => onOpenPostStudio({ type: alt.type }) }] : []}
        />
      ) : null}

      <p className="psh-cs__muted">
        Post Studio inafanya kazi kwa: maandishi, makala, tangazo, nukuu, kura, picha, video na Reel.
        Live inafungua usanidi uliopo; streaming bado haijaunganishwa.
      </p>
    </div>
  )
}

export function StudioTemplates({ onOpenPostStudio }) {
  const list = Object.values(TEMPLATES)
  return (
    <div className="psh-cs__stack">
      <header className="psh-cs__pageHead">
        <div>
          <h1 className="psh-cs__h1">Templates</h1>
          <p className="psh-cs__muted">Template ni mwonekano tu. Maudhui yako yanabaki yaleyale, na machapisho ya zamani hayabadiliki.</p>
        </div>
      </header>

      <ul className="psh-cs__cards">
        {list.map((t) => {
          const types = t.types.map((k) => POST_TYPES[k]?.label ?? k)
          return (
            <li key={t.id}>
              <article className="psh-cs__card psh-cs__card--static">
                <span className="psh-cs__cardTitle">{t.label} <small className="psh-cs__muted">v{t.version}</small></span>
                <span className="psh-cs__muted">Aina: {types.join(', ')}</span>
                <span className="psh-cs__muted">Mpangilio: {t.layout}</span>
                <button
                  type="button"
                  className="psh-btn psh-btn--primary psh-btn--sm"
                  onClick={() => onOpenPostStudio({ type: t.types[0], templateId: t.id })}
                >
                  Tumia template
                </button>
              </article>
            </li>
          )
        })}
        <li>
          <article className="psh-cs__card psh-cs__card--static" aria-label="Templates za premium">
            <span className="psh-cs__cardTitle">Templates za premium</span>
            <StatusChip status={FEATURES.templates_premium.status} />
            <span className="psh-cs__muted">Hakuna template za premium bado.</span>
          </article>
        </li>
      </ul>
      <p className="psh-cs__muted">Template za kibinafsi (My Designs) bado hazijaunganishwa.</p>
    </div>
  )
}

