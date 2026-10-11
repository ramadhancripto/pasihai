// ══════════════════════════════════════════════════════════════
// PASIHAI — APP (Hatua 1)
// Shell: Header + content + BottomNav (5 destinations) + panels.
// Hali zote ni za ndani (local state) — hakuna backend.
// ══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from 'react'

import Header from './components/Header.jsx'
import useChromeHide from './hooks/useChromeHide.js'
import { useOnlineStatus } from './hooks/useOnlineStatus.js'
import BottomNav, { NAV_ITEMS } from './components/BottomNav.jsx'
import Sheet from './components/Sheet.jsx'
import Home from './pages/Home.jsx'
import Chat from './pages/Chat.jsx'
import Gundua from './pages/Gundua.jsx'
import Spaces from './pages/Spaces.jsx'
import PlaceholderPage from './pages/PlaceholderPage.jsx'
import StyleGuide from './pages/StyleGuide.jsx'
import {
  NotificationsPanel,
  ProfilePanel,
  CreatePanel,
  ComposerPanel,
  MorePanel,
  ViewModePanel,
  FeedPrefsPanel,
  ContentPrefsPanel,
  SavedPanel,
} from './components/panels.jsx'
import {
  CommentsPanel,
  SharePanel,
  PostMenuPanel,
  LivePanel,
  StatusComposerPanel,
  StatusAllPanel,
  StatusViewerPanel,
} from './components/feed/FeedPanels.jsx'
import { CreateSpacePanel } from './components/spaces/SpacePanels.jsx'
import PostStudio from './components/studio/PostStudio.jsx'
import CreatorStudio from './pages/CreatorStudio.jsx'
import { feedService } from './services/feedService.js'
import {
  DataSavedPanel,
  SystemPanel,
  RelayPanel,
  NearbyPanel,
  SyncPanel,
  SaveOfflinePanel,
  ShareNearbyPanel,
  SystemActivityPanel,
} from './components/system/SystemPanels.jsx'
import { syncEngine } from './utils/syncEngine.js'
import { outboxManager } from './utils/outboxManager.js'

// 'studio' ni Creator Studio: inafikiwa kutoka kwenye CreatePanel (kiingilio kimoja) na hash #/studio.
const NAV_ROUTE_IDS = new Set([...NAV_ITEMS.map(({ id }) => id), 'studio'])

function routeFromHash(hash = '') {
  const segment = String(hash).replace(/^#\/?/, '').split(/[/?#]/, 1)[0]
  return NAV_ROUTE_IDS.has(segment) ? segment : 'home'
}

export default function App() {
  /* ── Offline detection ─────────────────────────────────── */
  const isOnline = useOnlineStatus()

  /* ── Kurasa na hali za Home ───────────────────────────── */
  const [guide, setGuide] = useState(
    () => new URLSearchParams(window.location.search).has('guide'),
  )
  const [route, setRoute] = useState(() => routeFromHash(window.location.hash))
  const [visitedRoutes, setVisitedRoutes] = useState(
    () => new Set([routeFromHash(window.location.hash)]),
  )
  /* Kuweka kurasa zilizowahi kutembelewa mounted huhifadhi hali ya local. */
  /* Space inayofunguliwa kwenye ukurasa wa Spaces (kutoka Home · Wasifu) */
  const [openSpace, setOpenSpace] = useState(null)
  const [homeTab, setHomeTab] = useState('mchanganyiko')
  const [filter, setFilter] = useState('all')
  const [viewMode, setViewMode] = useState('auto')
  const [dataSaver, setDataSaver] = useState(true)
  // Kila kitendo halisi (chapisha · penda · hifadhi · fuata) kinasasisha skrini.
  const [feedVersion, setFeedVersion] = useState(0)
  const refreshFeed = useCallback(() => setFeedVersion((v) => v + 1), [])

  /* ── Panels (stack) na taarifa za muda ────────────────── */
  const [stack, setStack] = useState([])
  const [toast, setToast] = useState(null)

  const top = stack[stack.length - 1] || null

  const toastIt = useCallback((msg) => setToast(msg), [])
  const push = useCallback((panel) => setStack((s) => [...s, panel]), [])
  const pop = useCallback(() => setStack((s) => s.slice(0, -1)), [])
  const closeAll = useCallback(() => setStack([]), [])
  const openTop = useCallback((panel) => setStack([panel]), [])

  /* Kuanza kikao cha Live: kinaundwa kwenye hali ya kikao, kisha kinaonekana. */
  const startLive = useCallback(
    async (mode = 'Video') => {
      const item = await feedService.startLive(mode)
      toastIt(`Kikao cha moja kwa moja kimeanza (${mode}) — kinaonekana kwenye tab ya Live`)
      refreshFeed()
      return item
    },
    [refreshFeed, toastIt],
  )

  /* StatusAllPanel inasoma service yenyewe ili ionyeshe loading/error/empty state. */
  const openStatusAll = useCallback(() => openTop({ type: 'statusall' }), [openTop])


  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(t)
  }, [toast])

  // Hash ndiyo state ya navigation: deep links na Back/Forward husawazishwa.
  useEffect(() => {
    const syncRouteFromLocation = () => {
      const nextRoute = routeFromHash(window.location.hash)
      setRoute(nextRoute)
      setVisitedRoutes((current) => {
        if (current.has(nextRoute)) return current
        const next = new Set(current)
        next.add(nextRoute)
        return next
      })

      // Hash za zamani/zosizojulikana zirudi kwenye route salama bila entry mpya.
      const canonicalHash = `#/${nextRoute}`
      if (window.location.hash && window.location.hash !== canonicalHash) {
        const url = new URL(window.location.href)
        url.hash = `/${nextRoute}`
        window.history.replaceState(window.history.state, '', url)
      }
    }

    window.addEventListener('hashchange', syncRouteFromLocation)
    window.addEventListener('popstate', syncRouteFromLocation)
    syncRouteFromLocation()
    return () => {
      window.removeEventListener('hashchange', syncRouteFromLocation)
      window.removeEventListener('popstate', syncRouteFromLocation)
    }
  }, [])

  // Hifadhi tab ya sasa kama inavyofanya kazi sasa: anza route mpya juu.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [route])

  /* ── Store-and-Forward: Anzisha sync engine na recover stuck actions ── */
  useEffect(() => {
    // Recover stuck actions baada ya app restart au crash
    outboxManager.recoverStuckActions().then(stats => {
      if (stats.recovered > 0 || stats.failed > 0) {
        console.log(`[App] Recovered ${stats.recovered} stuck actions, ${stats.failed} marked as failed`)
      }
    }).catch(err => {
      console.error('[App] Failed to recover stuck actions:', err)
    })

    // Anza background sync
    syncEngine.start()
    console.log('[App] Store-and-Forward initialized')

    // Cleanup wakati app inafungwa
    return () => {
      syncEngine.stop()
    }
  }, [])

  const goGuide = (on) => {
    const url = new URL(window.location.href)
    if (on) url.searchParams.set('guide', '1')
    else url.searchParams.delete('guide')
    window.history.replaceState({}, '', url)
    setGuide(on)
  }

  const navigateTo = useCallback((destination) => {
    const nextRoute = NAV_ROUTE_IDS.has(destination) ? destination : 'home'
    setRoute(nextRoute)
    setVisitedRoutes((current) => {
      if (current.has(nextRoute)) return current
      const next = new Set(current)
      next.add(nextRoute)
      return next
    })

    const nextHash = `#/${nextRoute}`
    if (window.location.hash !== nextHash) window.location.hash = nextHash
  }, [])

  /* ── Maudhui ya kila panel ────────────────────────────── */
  const panelDef = useMemo(() => {
    if (!top) return null
    const ctx = { push, payload: top.payload, toast: toastIt }

    switch (top.type) {
      case 'notifications':
        return {
          title: 'Taarifa',
          subtitle: 'Kila kitu kinachokuhusu, mahali pamoja',
          body: (
            <NotificationsPanel
              onToast={toastIt}
              onOpenProfile={(id) => push({ type: 'profile', payload: id })}
            />
          ),
        }
      case 'profile': {
        const userId = top.payload || 'me'
        return {
          title: userId === 'me' ? 'Akaunti yangu' : 'Wasifu',
          subtitle: userId === 'me' ? 'Muonekano wa mtumiaji wa kawaida' : 'Muonekano wa umma',
          body: (
            <ProfilePanel
              userId={userId}
              onToast={toastIt}
              onInteract={() => refreshFeed()}
              onOpenItem={(item) => push({ type: 'comments', payload: item })}
              onOpenSpace={(space) => {
                closeAll()
                setOpenSpace({ type: space.type, id: space.id })
                navigateTo('spaces')
              }}
            />
          ),
        }
      }
      case 'create':
        return {
          title: 'Unda',
          subtitle: 'Chagua kile unataka kuunda',
          body: (
            <CreatePanel
              onToast={toastIt}
              onCreateSpace={(type) => push({ type: 'create-space', payload: { type } })}
              onCompose={(kind) => push({ type: 'compose', payload: { kind } })}
              onStudio={() => {
                closeAll()
                navigateTo('studio')
              }}
              onStatus={() => push({ type: 'status' })}
              onLive={async () => {
                const item = await startLive('Video')
                push({ type: 'live', payload: item })
              }}
            />
          ),
        }
      case 'studio':
        return {
          title: 'Post Studio',
          subtitle: 'Aina → template → maudhui → muundo → preview',
          body: (
            <PostStudio
              payload={top.payload}
              onToast={toastIt}
              onClose={closeAll}
              onPosted={refreshFeed}
            />
          ),
        }
      case 'create-space':
        return {
          title: 'Unda Space',
          subtitle: 'Hatua 3: aina · maelezo · muonekano — kitu kimoja, mahali popote',
          body: (
            <CreateSpacePanel
              type={top.payload?.type}
              onToast={toastIt}
              onClose={closeAll}
              onCreated={(space) => {
                closeAll()
                setOpenSpace({ type: space.type, id: space.id })
                navigateTo('spaces')
              }}
            />
          ),
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
          body: (
            <SavedPanel
              onToast={toastIt}
              onOpenPlace={(p) => push({ type: 'profile', payload: p.id })}
              onOpenItem={(item) => push({ type: 'comments', payload: item })}
              onGoReels={() => {
                closeAll()
                navigateTo('home')
                setHomeTab('reels')
              }}
            />
          ),
        }

      /* ── Safu ya mfumo: panels zote zinatumia Sheet ileile ── */

      case 'datasaved':
        return {
          title: 'Data Saving',
          subtitle: 'Data ya internet iliyoepushwa — si salio, si cache pekee',
          body: <DataSavedPanel onToast={toastIt} />,
        }
      case 'system':
        return {
          title: 'System',
          subtitle: 'Hali ya kifaa na vitendo vinavyofaa sasa',
          body: (
            <SystemPanel
              onOpen={(id) => push({ type: id })}
              onToast={toastIt}
            />
          ),
        }
      case 'relay':
        return {
          title: 'Relay',
          subtitle: 'Internet Relay = ujumbe mfupi pekee (≤5 MB/siku) · Local Mesh = content ya karibu',
          back: true,
          body: <RelayPanel onToast={toastIt} />,
        }
      case 'nearby':
        return {
          title: 'Nearby',
          subtitle: 'Kile kifaa kinachokiona karibu sasa — Gundua hubaki ugunduzi mkuu',
          back: true,
          body: <NearbyPanel onToast={toastIt} />,
        }
      case 'sync':
        return {
          title: 'Sync',
          subtitle: 'Vitendo vinavyosubiri kupelekwa',
          back: true,
          body: <SyncPanel onToast={toastIt} />,
        }
      case 'saveoffline':
        return {
          title: 'Save Offline',
          subtitle: 'Hifadhi kwa matumizi bila mtandao',
          back: true,
          body: <SaveOfflinePanel onToast={toastIt} />,
        }
      case 'sharenearby':
        return {
          title: 'Share Nearby',
          subtitle: 'Kupeana faili kifaa kwa kifaa — si mtandao wa kijamii',
          back: true,
          body: <ShareNearbyPanel onToast={toastIt} />,
        }
      case 'activity':
        return {
          title: 'System Activity',
          subtitle: 'Shughuli za usafirishaji — si taarifa za kijamii',
          back: true,
          body: <SystemActivityPanel onToast={toastIt} />,
        }
      /* ── Panels za chapisho (Gundua/Hatua ya 2) ──────────── */
      case 'comments':
        return {
          title: 'Maoni',
          subtitle: top.payload?.author?.name
            ? `Kuhusu chapisho la ${top.payload.author.name}`
            : 'Maoni ya chapisho hili',
          back: true,
          body: (
            <CommentsPanel
              item={top.payload}
              onToast={toastIt}
              onCommentAdded={refreshFeed}
            />
          ),
        }
      case 'share':
        return {
          title: 'Shiriki',
          subtitle: 'Kiungo pekee — hakuna faili inayopita Internet Relay',
          back: true,
          body: (
            <SharePanel
              item={top.payload}
              onToast={toastIt}
              onOpenChat={() => {
                closeAll()
                navigateTo('chat')
              }}
            />
          ),
        }
      case 'postmenu':
        return {
          title: 'Vitendo vya chapisho',
          subtitle: 'Ficha · hifadhi · ripoti — ni vya chapisho hiki pekee',
          back: true,
          body: (
            <PostMenuPanel
              item={top.payload}
              onToast={toastIt}
              onChanged={refreshFeed}
              onOpenProfile={(id) => push({ type: 'profile', payload: id })}
            />
          ),
        }
      case 'live':
        return {
          title: top.payload?.live?.title || 'Kikao cha moja kwa moja',
          subtitle: 'Kikao (Live) — si Live Activity',
          back: true,
          body: (
            <LivePanel
              item={top.payload}
              onToast={toastIt}
              onChanged={refreshFeed}
              onOpenProfile={(id) => push({ type: 'profile', payload: id })}
            />
          ),
        }
      case 'status':
        return {
          title: 'Status yangu',
          subtitle: 'Saa 24 kisha hupotea',
          back: true,
          body: (
            <StatusComposerPanel onToast={toastIt} onClose={closeAll} onCreated={refreshFeed} />
          ),
        }
      case 'statusall':
        return {
          title: 'Status zote',
          subtitle: 'Zinaisha saa 24 baada ya kuchapishwa',
          back: true,
          body: (
            <StatusAllPanel
              onOpenStatus={(group) => push({ type: 'statusviewer', payload: group })}
              onOpenMine={() => push({ type: 'status' })}
            />
          ),
        }
      case 'statusviewer':
        return {
          title: top.payload?.own ? 'Status yako' : top.payload?.user?.name || 'Story',
          subtitle: 'Picha, video au maandishi · muda wa saa 24',
          back: true,
          body: (
            <StatusViewerPanel
              group={top.payload}
              onToast={toastIt}
              onChanged={refreshFeed}
              onClose={pop}
              onAdd={() => push({ type: 'status' })}
            />
          ),
        }
      case 'compose':
        return {
          title: 'Chapisho jipya',
          subtitle: 'Post moja — uwasilishaji ni metadata',
          body: (
            <ComposerPanel
              kind={top.payload?.kind || 'text'}
              onToast={toastIt}
              onClose={closeAll}
              onPosted={refreshFeed}
            />
          ),
        }
      default:
        return null
    }
  }, [
    top,
    viewMode,
    dataSaver,
    push,
    pop,
    toastIt,
    closeAll,
    openTop,
    refreshFeed,
    startLive,
    openStatusAll,
    navigateTo,
  ])

  /* ── Style guide (?guide=1) ───────────────────────────── */
  // Chat ina header yake fupi (mazungumzo ni skrini nzima) — hook haitumiki hapo
  useChromeHide(route !== 'chat' && !guide)

  if (guide) {
    return <StyleGuide onHome={() => goGuide(false)} />
  }

  const activeNav = NAV_ITEMS.find((n) => n.id === route) ?? (route === 'studio' ? { label: 'Creator Studio' } : null)

  return (
    <div className="psh-app">
      {/* Offline banner — inaonyesha wakati app ipo offline */}
      {!isOnline && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            background: '#FEF3C7',
            color: '#92400E',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 500,
            textAlign: 'center',
            borderBottom: '1px solid #F59E0B',
            position: 'sticky',
            top: 0,
            zIndex: 1000,
          }}
        >
          ⚠️ Huo mtandaoni — vitendo vipya vitasubiri hadi upate mtandao
        </div>
      )}

      {route === 'home' ? (
        <Header
          onNotifications={() => openTop({ type: 'notifications' })}
          onAccount={() => openTop({ type: 'profile', payload: 'me' })}
          onMore={() => openTop({ type: 'more' })}
          onDataSaved={() => openTop({ type: 'datasaved' })}
          onSystem={() => openTop({ type: 'system' })}
        />
      ) : null}

      <main className={`psh-main ${route === 'chat' ? 'psh-main--wide' : ''} ${route !== 'home' ? 'psh-main--nohead' : ''}`} id="main">
        {visitedRoutes.has('home') ? (
          <div className="psh-route" data-route="home" hidden={route !== 'home'}>
            <Home
              homeTab={homeTab}
              setHomeTab={setHomeTab}
              filter={filter}
              setFilter={setFilter}
              viewMode={viewMode}
              onCreate={async (what, payload) => {
                // Post ni moja: prompt → composer (uwasilishaji ni metadata).
                if (what === 'menu') return openTop({ type: 'create' })
                if (what === 'studio') return openTop({ type: 'studio', payload: payload || {} })
                if (what === 'live') {
                  const item = await startLive('Video')
                  return openTop({ type: 'live', payload: item })
                }
                return openTop({ type: 'compose', payload: { kind: what } })
              }}
              onOpenStatus={(item) =>
                item === 'me'
                  ? openTop({ type: 'status' })
                  : openTop({ type: 'statusviewer', payload: item })
              }
              onOpenAllStatus={openStatusAll}
              onOpenProfile={(id) => openTop({ type: 'profile', payload: id })}
              onToast={toastIt}
              onOpenPanel={push}
              onRefreshFeed={refreshFeed}
              onOpenChat={() => navigateTo('chat')}
              feedVersion={feedVersion}
              onOpenViewMode={() => openTop({ type: 'viewmode' })}
              onOpenMore={() => openTop({ type: 'more' })}
            />
          </div>
        ) : null}

        {visitedRoutes.has('chat') ? (
          <div className="psh-route" data-route="chat" hidden={route !== 'chat'}>
            <Chat onToast={toastIt} />
          </div>
        ) : null}

        {visitedRoutes.has('gundua') ? (
          <div className="psh-route" data-route="gundua" hidden={route !== 'gundua'}>
            <Gundua onToast={toastIt} onOpenChat={() => navigateTo('chat')} />
          </div>
        ) : null}

        {visitedRoutes.has('spaces') ? (
          <div className="psh-route" data-route="spaces" hidden={route !== 'spaces'}>
            <Spaces
              onToast={toastIt}
              onOpenPanel={push}
              onOpenProfile={(id) => openTop({ type: 'profile', payload: id })}
              onOpenChat={() => navigateTo('chat')}
              onRefreshFeed={refreshFeed}
              feedVersion={feedVersion}
              initialSpace={openSpace}
              onClearInitial={() => setOpenSpace(null)}
            />
          </div>
        ) : null}

        {visitedRoutes.has('studio') ? (
          <div className="psh-route" data-route="studio" hidden={route !== 'studio'}>
            <CreatorStudio
              feedVersion={feedVersion}
              online={isOnline}
              onOpenPostStudio={(payload) => openTop({ type: 'studio', payload: payload || {} })}
              onOpenStatus={() => openTop({ type: 'status' })}
              onOpenLive={async () => {
                try {
                  const item = await startLive('Video')
                  openTop({ type: 'live', payload: item })
                } catch (err) {
                  toastIt(err?.message || 'Live haijaanza. Jaribu tena.')
                }
              }}
              onOpenPanel={push}
              onOpenProfile={(id) => openTop({ type: 'profile', payload: id })}
              onOpenNotifications={() => openTop({ type: 'notifications' })}
            />
          </div>
        ) : null}

        {visitedRoutes.has('business') ? (
          <div className="psh-route" data-route="business" hidden={route !== 'business'}>
            <PlaceholderPage pageKey="business" />
          </div>
        ) : null}
      </main>

      <BottomNav active={route} onChange={navigateTo} />

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
