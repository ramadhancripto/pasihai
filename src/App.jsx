// ══════════════════════════════════════════════════════════════
// PASIHAI — APP (Hatua 1)
// Shell: Header + content + BottomNav (5 destinations) + panels.
// Hali zote ni za ndani (local state) — hakuna backend.
// ══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from 'react'

import Header from './components/Header.jsx'
import BottomNav, { NAV_ITEMS } from './components/BottomNav.jsx'
import Sheet from './components/Sheet.jsx'
import Home from './pages/Home.jsx'
import PlaceholderPage from './pages/PlaceholderPage.jsx'
import StyleGuide from './pages/StyleGuide.jsx'
import {
  NotificationsPanel,
  ProfilePanel,
  CreatePanel,
  MorePanel,
  ViewModePanel,
  FeedPrefsPanel,
  ContentPrefsPanel,
  SavedPanel,
} from './components/panels.jsx'

export default function App() {
  /* ── Kurasa na hali za Home ───────────────────────────── */
  const [guide, setGuide] = useState(
    () => new URLSearchParams(window.location.search).has('guide'),
  )
  const [route, setRoute] = useState('home')
  const [homeTab, setHomeTab] = useState('mchanganyiko')
  const [filter, setFilter] = useState('all')
  const [viewMode, setViewMode] = useState('auto')
  const [dataSaver, setDataSaver] = useState(true)

  /* ── Panels (stack) na taarifa za muda ────────────────── */
  const [stack, setStack] = useState([])
  const [toast, setToast] = useState(null)
  const [seenNotifs, setSeenNotifs] = useState(false)

  const top = stack[stack.length - 1] || null

  const toastIt = useCallback((msg) => setToast(msg), [])
  const push = useCallback((panel) => setStack((s) => [...s, panel]), [])
  const pop = useCallback(() => setStack((s) => s.slice(0, -1)), [])
  const closeAll = useCallback(() => setStack([]), [])
  const openTop = useCallback((panel) => setStack([panel]), [])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(t)
  }, [toast])

  // Rudi juu kila tunapobadilisha ukurasa
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [route])

  const goGuide = (on) => {
    const url = new URL(window.location.href)
    if (on) url.searchParams.set('guide', '1')
    else url.searchParams.delete('guide')
    window.history.replaceState({}, '', url)
    setGuide(on)
  }

  /* ── Maudhui ya kila panel ────────────────────────────── */
  const panelDef = useMemo(() => {
    if (!top) return null
    const ctx = { push, payload: top.payload, toast: toastIt }

    switch (top.type) {
      case 'notifications':
        return {
          title: 'Taarifa',
          subtitle: 'Kila kitu kinachokuhusu, mahali pamoja',
          body: <NotificationsPanel onOpenProfile={(id) => push({ type: 'profile', payload: id })} />,
        }
      case 'profile': {
        const userId = top.payload || 'me'
        return {
          title: userId === 'me' ? 'Akaunti yangu' : 'Wasifu',
          subtitle: userId === 'me' ? 'Muonekano wa mtumiaji wa kawaida' : 'Muonekano wa umma',
          body: <ProfilePanel userId={userId} onToast={toastIt} />,
        }
      }
      case 'create':
        return {
          title: 'Unda',
          subtitle: 'Chagua kile unataka kuunda',
          body: <CreatePanel onToast={toastIt} />,
        }
      case 'more':
        return {
          title: 'Menyu ya Home',
          subtitle: 'Hii ni menyu ya Home pekee — si urambazaji wa jumla',
          body: (
            <MorePanel
              viewMode={viewMode}
              onOpenPanel={(p) => push({ type: p })}
              onViewMode={setViewMode}
              onToast={toastIt}
              dataSaver={dataSaver}
              setDataSaver={setDataSaver}
              onRefresh={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            />
          ),
        }
      case 'viewmode':
        return {
          title: 'Muonekano',
          subtitle: 'Automatic · Vertical · Horizontal / Full Scroll',
          back: true,
          body: <ViewModePanel value={viewMode} onChange={setViewMode} onToast={toastIt} />,
        }
      case 'feedprefs':
        return {
          title: 'Mapendeleo ya mkondo',
          subtitle: 'Jinsi mkondo unavyopangwa',
          back: true,
          body: <FeedPrefsPanel onToast={toastIt} />,
        }
      case 'contentprefs':
        return {
          title: 'Mapendeleo ya maudhui',
          subtitle: 'Maslahi unayopenda kuona',
          back: true,
          body: <ContentPrefsPanel onToast={toastIt} />,
        }
      case 'saved':
        return {
          title: 'Zilizohifadhiwa',
          subtitle: 'Vitu ulivyoweka kando',
          back: true,
          body: <SavedPanel onToast={toastIt} />,
        }
      default:
        return null
    }
  }, [top, viewMode, dataSaver, push, toastIt])

  /* ── Style guide (?guide=1) ───────────────────────────── */
  if (guide) {
    return <StyleGuide onHome={() => goGuide(false)} />
  }

  const activeNav = NAV_ITEMS.find((n) => n.id === route)

  return (
    <div className="psh-app">
      <Header
        unread={seenNotifs ? 0 : 3}
        onNotifications={() => {
          setSeenNotifs(true)
          openTop({ type: 'notifications' })
        }}
        onAccount={() => openTop({ type: 'profile', payload: 'me' })}
        onMore={() => openTop({ type: 'more' })}
      />

      <main className="psh-main" id="main">
        {route === 'home' ? (
          <Home
            homeTab={homeTab}
            setHomeTab={setHomeTab}
            filter={filter}
            setFilter={setFilter}
            viewMode={viewMode}
            onCreate={(what) => {
              if (what === 'menu' || what === 'post') openTop({ type: 'create' })
              else toastIt(`${what}: itajengwa kwenye hatua zijazo`)
            }}
            onOpenStatus={(id) => openTop({ type: 'profile', payload: id })}
            onOpenProfile={(id) => openTop({ type: 'profile', payload: id })}
            onToast={toastIt}
            onOpenViewMode={() => openTop({ type: 'viewmode' })}
            onOpenMore={() => openTop({ type: 'more' })}
          />
        ) : (
          <PlaceholderPage pageKey={route} />
        )}
      </main>

      {/* Kibonyezo cha maendeleo: kuona design system */}
      <button type="button" className="psh-devlink" onClick={() => goGuide(true)}>
        Msingi wa muonekano (design system)
      </button>

      <BottomNav
        active={route}
        onChange={(id) => {
          setRoute(id)
          if (id === 'home') return
          // Kila ukurasa wa placeholder unaeleza kazi yake
        }}
      />

      <Sheet
        open={!!panelDef}
        onClose={closeAll}
        onBack={stack.length > 1 ? pop : undefined}
        title={panelDef?.title}
        subtitle={panelDef?.subtitle}
      >
        {panelDef?.body}
      </Sheet>

      {toast ? (
        <div className="psh-toast" role="status" aria-live="polite">
          {toast}
        </div>
      ) : null}

      <span className="u-sr" aria-live="polite">
        Ukurasa wa sasa: {activeNav?.label}
      </span>
    </div>
  )
}
