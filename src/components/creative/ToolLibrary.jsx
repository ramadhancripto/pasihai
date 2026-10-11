// ══════════════════════════════════════════════════════════════
// ToolLibrary — maktaba ya zana: utafutaji, vikundi A–P vinavyokunjika, Rahisi/Kina,
// zilizotumika hivi karibuni, zilizobandikwa, na hali ya kila zana (capabilities.js).
//   • Zana iliyozimwa bado inaweza kubofya: inaonyesha sababu (toast) badala ya kimya.
//   • Hakuna zana inayoonekana kama inafanya kazi ikiwa ni planned/service/premium.
// ══════════════════════════════════════════════════════════════
import { GROUPS, TOOLS, findTool, matchesQuery } from '../../creative/toolRegistry.js'
import { toolState } from '../../creative/capabilities.js'
import { togglePinned, toggleGroup, setMode } from '../../creative/toolPrefs.js'
import { Icon } from './controls.jsx'

export default function ToolLibrary({ prefs, onPrefs, ctx, query, onQuery, onRun, onShortcuts, activeFlyout, searchRef, onClose, onlyGroup = null, sheet = false }) {
  const q = query.trim()
  const advanced = prefs.mode === 'advanced'
  // Kundi moja (sheet ya mobile): pinned na recent zimefichwa ili zisichanganye.
  // Sheet ya mobile yenye kundi moja: pinned na recent zimefichwa. Drawer ya desktop inazionyesha.
  const hideExtras = Boolean(onlyGroup) && sheet
  const pinned = hideExtras ? [] : prefs.pinned.map(findTool).filter(Boolean)
  const recent = hideExtras ? [] : prefs.recent.map(findTool).filter(Boolean)
  const searching = q.length > 0
  const results = searching ? TOOLS.filter((t) => matchesQuery(t, q)) : []

  const visibleIn = (groupId) => TOOLS.filter((t) => t.group === groupId && (advanced || t.basic))

  const renderItem = (tool) => {
    const state = toolState(tool, ctx)
    const isPinned = prefs.pinned.includes(tool.id)
    const open = activeFlyout && tool.action === `${activeFlyout.kind}.open` ? true : false
    const tip = !state.enabled && state.reason
      ? state.reason
      : [tool.label, tool.shortcut ? `(${tool.shortcut})` : '', tool.where ? `— ${tool.where}` : ''].filter(Boolean).join(' ')
    return (
      <li key={tool.id} className="cve-lib__li">
        <button
          type="button"
          className={`cve-lib__item${state.enabled ? '' : ' is-off'}${open ? ' is-open' : ''}`}
          aria-disabled={state.enabled ? undefined : true}
          aria-label={state.badge ? `${tool.label} (${state.badge})` : tool.label}
          title={tip}
          data-tool={tool.id}
          data-enabled={state.enabled ? 'true' : 'false'}
          onClick={() => onRun(tool, state)}
        >
          <Icon name={tool.icon} size={17} />
          <span className="cve-lib__label">{tool.label}</span>
          {tool.shortcut ? <kbd className="cve-lib__kbd">{tool.shortcut}</kbd> : null}
          {state.badge ? <span className={`cve-lib__badge cve-lib__badge--${tool.status}`}>{state.badge}</span> : null}
        </button>
        <button
          type="button"
          className={`cve-lib__pin${isPinned ? ' is-on' : ''}`}
          aria-pressed={isPinned}
          aria-label={`${isPinned ? 'Ondoa kwenye' : 'Bandika'} ${tool.label}`}
          title={isPinned ? 'Ondoa kwenye zilizobandikwa' : 'Bandika juu'}
          onClick={() => onPrefs(togglePinned(prefs, tool.id))}
        >
          <Icon name="star" size={14} />
        </button>
      </li>
    )
  }

  return (
    <nav className="cve-lib" aria-label="Maktaba ya zana">
      {onClose ? (
        <button type="button" className="cve-lib__back" onClick={onClose} aria-label="Rudi kwenye uwanja" title="Rudi kwenye uwanja wa kuhariri">
          <Icon name="back" size={16} />
          <span>Rudi kwenye uwanja</span>
        </button>
      ) : null}
      <div className="cve-lib__top">
        <div className="cve-lib__search">
          <Icon name="search" size={15} />
          <input
            ref={searchRef}
            type="search"
            aria-label="Tafuta zana"
            placeholder="Tafuta zana… (Ctrl+K)"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onQuery('') } }}
          />
        </div>
        <div className="cve-lib__bar">
          <div className="cve-seg cve-lib__mode" role="group" aria-label="Hali ya zana">
            {[['basic', 'Rahisi'], ['advanced', 'Kina']].map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`cve-seg__btn${prefs.mode === id ? ' is-on' : ''}`}
                aria-pressed={prefs.mode === id}
                onClick={() => onPrefs(setMode(prefs, id))}
              >
                {label}
              </button>
            ))}
          </div>
          <button type="button" className="cve-iconbtn" aria-label="Njia za mkato za kibodi" title="Njia za mkato (?)" onClick={onShortcuts}>
            <Icon name="keyboard" size={16} />
          </button>
        </div>
      </div>

      <div className="cve-lib__scroll">
        {searching ? (
          <section className="cve-lib__group" aria-label="Matokeo ya utafutaji">
            <h3 className="cve-lib__head">Matokeo ({results.length})</h3>
            {results.length ? (
              <ul className="cve-lib__list">{results.map(renderItem)}</ul>
            ) : (
              <p className="cve-muted cve-lib__empty">Hakuna zana inayolingana na “{q}”.</p>
            )}
          </section>
        ) : (
          <>
            {pinned.length ? (
              <section className="cve-lib__group" aria-label="Zilizobandikwa">
                <h3 className="cve-lib__head">Zilizobandikwa</h3>
                <ul className="cve-lib__list">{pinned.map(renderItem)}</ul>
              </section>
            ) : null}
            {recent.length ? (
              <section className="cve-lib__group" aria-label="Zilizotumika hivi karibuni">
                <h3 className="cve-lib__head">Hivi karibuni</h3>
                <ul className="cve-lib__list">{recent.map(renderItem)}</ul>
              </section>
            ) : null}
            {(onlyGroup ? GROUPS.filter((g) => g.id === onlyGroup) : GROUPS).map((g) => {
              const items = visibleIn(g.id)
              if (!items.length) {
                // Kikundi kilichofunguliwa hakina zana za msingi: sema hivyo, badala ya drawer tupu.
                return onlyGroup === g.id && !advanced ? (
                  <p key={g.id} className="cve-muted cve-lib__empty" role="status">
                    Hakuna zana za msingi kwenye kundi hili. Badilisha kwenye Kina ili uone zote.
                  </p>
                ) : null
              }
              const collapsed = prefs.collapsed.includes(g.id)
              const panelId = `cve-lib-g-${g.id}`
              return (
                <section key={g.id} className={`cve-lib__group${collapsed ? ' is-collapsed' : ''}`} data-group={g.id}>
                  <h3 className="cve-lib__head">
                    <button
                      type="button"
                      className="cve-lib__toggle"
                      aria-expanded={!collapsed}
                      aria-controls={panelId}
                      onClick={() => onPrefs(toggleGroup(prefs, g.id))}
                    >
                      <span className="cve-lib__chev" aria-hidden="true"><Icon name={collapsed ? 'plus' : 'minus'} size={12} /></span>
                      <span className="cve-lib__gtitle">{g.title}</span>
                      <span className="cve-lib__count">{items.length}</span>
                    </button>
                  </h3>
                  {collapsed ? null : (
                    <ul className="cve-lib__list" id={panelId} aria-label={g.title}>
                      {items.map(renderItem)}
                    </ul>
                  )}
                </section>
              )
            })}
          </>
        )}
      </div>
    </nav>
  )
}
