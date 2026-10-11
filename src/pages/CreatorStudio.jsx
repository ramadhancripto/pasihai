// ══════════════════════════════════════════════════════════════
// PASIHAI — Creator Studio (ukurasa mkuu)
//   Urambazaji wa sehemu 10 (MASTER §1): sidebar inayoweza kukunjwa kwenye desktop,
//   bottom nav kwenye mobile (Home · Create · Content · Media · More).
//   Vitendo vyote vinatumia paneli na workflow zilizopo (hakuna duplicate).
// ══════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react'
import {
  SECTIONS,
  STATUS,
  STUDIO_NAV,
  STUDIO_NAV_GROUPS,
  getCurrentPlan,
  PLANS,
  searchNav,
  sectionById,
} from '../studio/studioModel.js'
import useStudioData from '../studio/useStudioData.js'
import { notificationService } from '../services/notificationService.js'
import { Icon } from '../components/creative/controls.jsx'
import StudioHome from '../components/studio/sections/StudioHome.jsx'
import { StudioTemplates } from '../components/studio/sections/StudioCreate.jsx'
import CreativeHub from '../components/creative/CreativeHub.jsx'
import StudioContent, { StudioMedia } from '../components/studio/sections/StudioContent.jsx'
import StudioAnalytics, { StudioAudience } from '../components/studio/sections/StudioInsights.jsx'
import {
  StudioAds,
  StudioBrand,
  StudioCollab,
  StudioMonetization,
  StudioPremium,
  StudioProjects,
} from '../components/studio/sections/StudioBusiness.jsx'
import StudioSettings from '../components/studio/sections/StudioSettings.jsx'
import '../styles/creator-studio.css'

const DEFAULT_SECTION = 'home'
const SECTION_IDS = new Set(SECTIONS.map((s) => s.id))
const NAV_COLLAPSED_KEY = 'pasihai.studio.nav.v1'
// Bottom nav ya mobile (MASTER §4): vitu vinne vya kwanza + More.
const MOBILE_TABS = [
  { id: 'home', label: 'Home', icon: 'layoutDashboard' },
  { id: 'create', label: 'Create', icon: 'plusSquare' },
  { id: 'content', label: 'Content', icon: 'files' },
  { id: 'media', label: 'Media', icon: 'images' },
]
const MORE_IDS = ['projects', 'templates', 'ads', 'analytics', 'business', 'settings']

function readCollapsed() {
  try { return globalThis.localStorage?.getItem(NAV_COLLAPSED_KEY) === '1' } catch { return false }
}

export default function CreatorStudio({
  feedVersion = 0,
  online = true,
  onOpenPostStudio,
  onOpenStatus,
  onOpenLive,
  onOpenPanel,
  onOpenProfile,
  onOpenNotifications,
}) {
  const [section, setSection] = useState(DEFAULT_SECTION)
  // Aina ya mhariri iliyoombwa kutoka kwenye nav (k.m. "Story / Status"). Inafutwa unapohamia sehemu nyingine.
  const [intent, setIntent] = useState(null)
  // Mhariri wa Create unapofunguliwa, nav na topbar vinafichwa ili turubai itumie skrini nzima.
  const [editorOpen, setEditorOpen] = useState(false)
  const [navCollapsed, setNavCollapsed] = useState(readCollapsed)
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    try { globalThis.localStorage?.setItem(NAV_COLLAPSED_KEY, navCollapsed ? '1' : '0') } catch { /* hifadhi haipatikani */ }
  }, [navCollapsed])

  const go = (id, nextIntent = null) => {
    if (!SECTION_IDS.has(id)) return
    setSection(id)
    setIntent(nextIntent ? { mode: nextIntent, key: Date.now() } : null)
    setMoreOpen(false)
  }

  // Kiingilio kimoja cha urambazaji: sehemu, aina ya mhariri, au kitendo (k.m. arifa).
  const navigate = (entry) => {
    if (entry.action === 'notifications') {
      ;(onOpenNotifications ?? (() => onOpenPanel?.({ type: 'notifications' })))()
      setMoreOpen(false)
      return
    }
    if (entry.status === 'planned' || !entry.section) return
    go(entry.section, entry.intent ?? null)
  }

  const actions = {
    onNavigate: (id) => go(id),
    onOpenPostStudio,
    onOpenStatus,
    onOpenLive,
    onOpenPanel,
    onOpenProfile,
    online,
  }

  const current = sectionById(section) ?? sectionById(DEFAULT_SECTION)
  // Eneo linalotumika: kwanza kulingana na sehemu yake kuu, kisha sub-item (k.m. 'brand' ni ya Creator Business).
  const activeTop = STUDIO_NAV.find((t) => t.section === section)
    ?? STUDIO_NAV.find((t) => t.children.some((c) => c.section === section && !c.intent))
  const activeId = activeTop?.id ?? null

  const renderBody = () => {
    switch (section) {
      case 'home': return <StudioHome {...actions} />
      case 'create': return <CreativeHub intent={intent} onOpenPostStudio={onOpenPostStudio} onOpenStatus={onOpenStatus} onOpenLive={onOpenLive} onNavigate={(id) => go(id)} onEditorOpenChange={setEditorOpen} />
      case 'content': return <StudioContent onOpenPostStudio={onOpenPostStudio} />
      case 'media': return <StudioMedia onOpenPostStudio={onOpenPostStudio} />
      case 'projects': return <StudioProjects onNavigate={(id) => go(id)} />
      case 'templates': return <StudioTemplates onOpenPostStudio={onOpenPostStudio} />
      case 'brand': return <StudioBrand />
      case 'ads': return <StudioAds />
      case 'analytics': return <StudioAnalytics onOpenPostStudio={onOpenPostStudio} />
      case 'audience': return <StudioAudience onNavigate={(id) => go(id)} />
      case 'monetization': return <StudioMonetization />
      case 'collab': return <StudioCollab />
      case 'premium': return <StudioPremium onNavigate={(id) => go(id)} />
      case 'settings': return <StudioSettings onOpenPanel={onOpenPanel} onOpenProfile={onOpenProfile} />
      default: return null
    }
  }

  return (
    <div className={`psh-cs${editorOpen ? ' is-editor' : ''}`} data-section={section}>
      <Topbar
        online={online}
        onNavigate={navigate}
        onGo={(id) => go(id)}
        onOpenPostStudio={onOpenPostStudio}
        onOpenNotifications={onOpenNotifications ?? (() => onOpenPanel({ type: 'notifications' }))}
      />
      <div className={`psh-cs__shell${navCollapsed ? ' is-navCollapsed' : ''}`}>
        <nav className={`psh-cs__nav${navCollapsed ? ' is-collapsed' : ''}`} aria-label="Urambazaji wa Creator Studio">
          <div className="psh-cs__navHead">
            <button
              type="button"
              className="psh-cs__navToggle"
              aria-expanded={!navCollapsed}
              aria-controls="psh-cs-nav-list"
              aria-label={navCollapsed ? 'Panua urambazaji' : 'Kunja urambazaji'}
              title={navCollapsed ? 'Panua urambazaji' : 'Kunja urambazaji'}
              onClick={() => setNavCollapsed((v) => !v)}
            >
              <Icon name="sidebar" size={18} />
            </button>
          </div>
          <div id="psh-cs-nav-list">
            {STUDIO_NAV_GROUPS.map((group) => (
              <div key={group.id} className="psh-cs__navGroup">
                <p className="psh-cs__navLabel">{group.label}</p>
                <ul className="psh-cs__navList">
                  {group.items.map((topId) => {
                    const top = STUDIO_NAV.find((t) => t.id === topId)
                    const active = activeId === top.id
                    return (
                      <li key={top.id}>
                        <button
                          type="button"
                          className={`psh-cs__navBtn psh-cs__navBtn--top${active ? ' is-on' : ''}`}
                          aria-current={active && (section === top.section) ? 'page' : undefined}
                          aria-label={top.label}
                          title={top.label}
                          onClick={() => navigate(top)}
                        >
                          <Icon name={top.icon} size={18} />
                          <span className="psh-cs__navText">{top.label}</span>
                        </button>
                        {active && !navCollapsed ? (
                          <ul className="psh-cs__subList" aria-label={`Sehemu ndogo za ${top.label}`}>
                            {top.children.map((c) => {
                              const planned = c.status === 'planned'
                              const on = c.section === section && !c.intent
                              return (
                                <li key={c.id}>
                                  <button
                                    type="button"
                                    className={`psh-cs__navBtn psh-cs__navBtn--sub${on ? ' is-on' : ''}`}
                                    disabled={planned}
                                    aria-disabled={planned || undefined}
                                    aria-current={on ? 'page' : undefined}
                                    onClick={() => navigate(c)}
                                  >
                                    <span>{c.label}</span>
                                    {planned ? <span className="psh-cs__navStatus">{STATUS.planned.label}</span> : null}
                                  </button>
                                </li>
                              )
                            })}
                          </ul>
                        ) : null}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <main className="psh-cs__main" id="creator-studio-main" aria-labelledby="cs-current">
          <h2 id="cs-current" className="u-sr">{current?.label}</h2>
          <div key={`${section}-${feedVersion}`} className="psh-cs__content">
            {renderBody()}
          </div>
        </main>
      </div>

      {/* Bottom nav ya mobile (≤960px). Imefichwa na CSS kwenye desktop. */}
      <nav className="psh-cs__mnav" aria-label="Urambazaji wa simu">
        {MOBILE_TABS.map((tab) => {
          const entry = STUDIO_NAV.find((t) => t.id === tab.id)
          const active = !moreOpen && activeId === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              className={`psh-cs__mtab${active ? ' is-on' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => navigate(entry)}
            >
              <Icon name={tab.icon} size={22} />
              <span>{tab.label}</span>
            </button>
          )
        })}
        <button
          type="button"
          className={`psh-cs__mtab${moreOpen || MORE_IDS.includes(activeId) ? ' is-on' : ''}`}
          aria-expanded={moreOpen}
          aria-controls="psh-cs-more"
          onClick={() => setMoreOpen((v) => !v)}
        >
          <Icon name="more" size={22} />
          <span>More</span>
        </button>
      </nav>

      {moreOpen ? (
        <div className="psh-cs__sheetWrap" role="presentation" onClick={() => setMoreOpen(false)}>
          <div
            id="psh-cs-more"
            className="psh-cs__sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Zaidi"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === 'Escape') setMoreOpen(false) }}
          >
            <div className="psh-cs__sheetHead">
              <strong>More</strong>
              <button type="button" className="psh-btn psh-btn--quiet psh-btn--sm" onClick={() => setMoreOpen(false)}>Funga</button>
            </div>
            <ul className="psh-cs__sheetList">
              {MORE_IDS.map((id) => {
                const top = STUDIO_NAV.find((t) => t.id === id)
                return (
                  <li key={id}>
                    <button type="button" className={`psh-cs__sheetBtn${activeId === id ? ' is-on' : ''}`} onClick={() => navigate(top)}>
                      <Icon name={top.icon} size={20} />
                      <span>{top.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Topbar({ online, onNavigate, onGo, onOpenPostStudio, onOpenNotifications }) {
  const [query, setQuery] = useState('')
  const [quickOpen, setQuickOpen] = useState(false)
  const unread = useStudioData(() => notificationService.countUnread(), [])
  const results = useMemo(() => searchNav(query).slice(0, 8), [query])
  const plan = PLANS[getCurrentPlan()]

  return (
    <header className="psh-cs__top">
      <div className="psh-cs__brand">Creator Studio</div>

      <div className="psh-cs__searchWrap">
        <label className="psh-cs__search">
          <span className="u-sr">Tafuta sehemu za Studio</span>
          <input
            className="psh-cs__input"
            type="search"
            placeholder="Tafuta sehemu…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              const first = results.find((r) => r.status !== 'planned')
              if (e.key === 'Enter' && first) { onNavigate(first); setQuery('') }
              if (e.key === 'Escape') setQuery('')
            }}
          />
        </label>
        {query && (
          <ul className="psh-cs__results" role="listbox" aria-label="Matokeo ya utafutaji">
            {results.length === 0 ? <li className="psh-cs__muted">Hakuna sehemu inayolingana</li> : null}
            {results.map((r) => {
              const planned = r.status === 'planned'
              return (
                <li key={r.id}>
                  <button type="button" className="psh-cs__resultBtn" disabled={planned} onClick={() => { onNavigate(r); setQuery('') }}>
                    {r.label} <span className="psh-cs__muted">{planned ? STATUS.planned.label : (r.parent ?? 'Studio Home')}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="psh-cs__topActions">
        <span className={`psh-cs__net${online ? '' : ' is-off'}`} role="status">
          {online ? 'Mtandaoni' : 'Nje ya mtandao'}
        </span>
        <span className="psh-cs__plan" title="Mpango wa sasa">{plan.label}</span>

        <button type="button" className="psh-btn psh-btn--quiet psh-btn--sm" onClick={onOpenNotifications} aria-label={`Arifa ambazo hazijasomwa: ${unread.data ?? 0}`}>
          Arifa{unread.status === 'ready' && unread.data ? ` (${unread.data})` : ''}
        </button>

        <div className="psh-cs__quickWrap">
          <button
            type="button"
            className="psh-btn psh-btn--primary psh-btn--sm"
            aria-expanded={quickOpen}
            onClick={() => setQuickOpen((v) => !v)}
          >
            Unda
          </button>
          {quickOpen ? (
            <ul className="psh-cs__results psh-cs__results--right" aria-label="Unda haraka">
              <li><button type="button" className="psh-cs__resultBtn" onClick={() => { setQuickOpen(false); onOpenPostStudio({ type: 'text' }) }}>Chapisho la maandishi</button></li>
              <li><button type="button" className="psh-cs__resultBtn" onClick={() => { setQuickOpen(false); onOpenPostStudio({ type: 'poll' }) }}>Kura</button></li>
              <li><button type="button" className="psh-cs__resultBtn" onClick={() => { setQuickOpen(false); onOpenPostStudio({ type: 'poster' }) }}>Picha / Poster</button></li>
              <li><button type="button" className="psh-cs__resultBtn" onClick={() => { setQuickOpen(false); onGo('create') }}>Kila aina…</button></li>
            </ul>
          ) : null}
        </div>
      </div>
    </header>
  )
}
