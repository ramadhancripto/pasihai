// ══════════════════════════════════════════════════════════════
// EditorRail — rail ya kushoto ya mhariri (desktop). MASTER §3.
//   Kila kategoria ina aikoni na lebo. Kubofya kategoria kunafungua drawer yake
//   (ToolLibrary yenye onlyGroup). Kubofya kategoria iliyo wazi tena kunaifunga.
//   Makundi, mpangilio na aikoni vinatoka kwenye rejista (GROUPS); hakuna orodha ya pili.
// ══════════════════════════════════════════════════════════════
import { GROUPS } from '../../creative/toolRegistry.js'
import { Icon } from './controls.jsx'

export default function EditorRail({ activeGroup, drawerOpen, onPick }) {
  return (
    <nav className="cve-rail" aria-label="Makundi ya zana">
      <ul className="cve-rail__list">
        {GROUPS.map((g) => {
          const on = drawerOpen && activeGroup === g.id
          return (
            <li key={g.id}>
              <button
                type="button"
                className={`cve-rail__btn${on ? ' is-on' : ''}`}
                aria-pressed={on}
                aria-label={g.title}
                title={g.hint ? `${g.title} — ${g.hint}` : g.title}
                onClick={() => onPick(g.id)}
              >
                <Icon name={g.icon} size={18} />
                <span className="cve-rail__label">{g.title}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
