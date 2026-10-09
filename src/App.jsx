// ══════════════════════════════════════════════════════════════
// PASIHAI — APP (Hatua 1)
// Shell: Header + content + BottomNav (5 destinations) + panels.
// Hali zote ni za ndani (local state) — hakuna backend.
// ══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from 'react'

import Header from './components/Header.jsx'
import useChromeHide from './hooks/useChromeHide.js'
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
} from './components/feed/FeedPanels.jsx'
import { CreateSpacePanel } from './components/spaces/SpacePanels.jsx'
import { homeService } from './services/homeService.js'
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

export default function App() {
  /* ── Kurasa na hali za Home ───────────────────────────── */
  const [guide, setGuide] = useState(
    () => new URLSearchParams(window.location.search).has('guide'),
  )
  const [route, setRoute] = useState('home')
  /* Space inayofunguliwa kwenye ukurasa wa Spaces (kutoka Home · Wasifu) */
  const [openSpace, setOpenSpace] = useState(null)
  /* Kubonyeza nav "Spaces" tena kunarejesha orodha (tab ileile — nav 5) */
  const [spacesReset, setSpacesReset] = useState(0)
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
  const [seenNotifs, setSeenNotifs] = useState(false)

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

  /* Status zote: orodha halisi kutoka service. */
  const openStatusAll = useCallback(async () => {
    const items = await homeService.getStatusStrip()
    openTop({ type: 'statusall', payload: items })
  }, [openTop])


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
                setRoute('spaces')
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
              onStatus={() => push({ type: 'status' })}
              onLive={async () => {
                const item = await startLive('Video')
                push({ type: 'live', payload: item })
              }}
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
                setRoute('spaces')
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
                setRoute('home')
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
                setRoute('chat')
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
              items={top.payload || null}
              onToast={toastIt}
              onOpenProfile={(id) => push({ type: 'profile', payload: id })}
              onOpenMine={() => push({ type: 'status' })}
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
    toastIt,
    closeAll,
    openTop,
    refreshFeed,
    startLive,
    openStatusAll,
  ])

  /* ── Style guide (?guide=1) ───────────────────────────── */
  // Chat ina header yake fupi (mazungumzo ni skrini nzima) — hook haitumiki hapo
  useChromeHide(route !== 'chat' && !guide)

  if (guide) {
    return <StyleGuide onHome={() => goGuide(false)} />
  }

  const activeNav = NAV_ITEMS.find((n) => n.id === route)

  return (
    <div className="psh-app">
      {route === 'home' ? (
      <Header
        unread={seenNotifs ? 0 : 3}
        onNotifications={() => {
          setSeenNotifs(true)
          openTop({ type: 'notifications' })
        }}
        onAccount={() => openTop({ type: 'profile', payload: 'me' })}
        onMore={() => openTop({ type: 'more' })}
        onDataSaved={() => openTop({ type: 'datasaved' })}
        onSystem={() => openTop({ type: 'system' })}
      />
      ) : null}

      <main className={`psh-main ${route === 'chat' ? 'psh-main--wide' : ''} ${route !== 'home' ? 'psh-main--nohead' : ''}`} id="main">
        {route === 'spaces' ? (
          <Spaces
            onToast={toastIt}
            onOpenPanel={push}
            onOpenProfile={(id) => openTop({ type: 'profile', payload: id })}
            onOpenChat={() => setRoute('chat')}
            onRefreshFeed={refreshFeed}
            feedVersion={feedVersion}
            initialSpace={openSpace}
            onClearInitial={() => setOpenSpace(null)}
            resetToken={spacesReset}
          />
        ) : route === 'chat' ? (
          <Chat onToast={toastIt} />
        ) : route === 'gundua' ? (
          <Gundua onToast={toastIt} onOpenChat={() => setRoute('chat')} />
        ) : route === 'home' ? (
          <Home
            homeTab={homeTab}
            setHomeTab={setHomeTab}
            filter={filter}
            setFilter={setFilter}
            viewMode={viewMode}
            onCreate={async (what) => {
              // Post ni moja: prompt → composer (uwasilishaji ni metadata).
              if (what === 'menu') return openTop({ type: 'create' })
              if (what === 'live') {
                const item = await startLive('Video')
                return openTop({ type: 'live', payload: item })
              }
              return openTop({ type: 'compose', payload: { kind: what } })
            }}
            onOpenStatus={(id) =>
              id === 'me' ? openTop({ type: 'status' }) : openTop({ type: 'profile', payload: id })
            }
            onOpenAllStatus={openStatusAll}
            onOpenProfile={(id) => openTop({ type: 'profile', payload: id })}
            onToast={toastIt}
            onOpenPanel={push}
            onRefreshFeed={refreshFeed}
            onOpenChat={() => setRoute('chat')}
            feedVersion={feedVersion}
            onOpenViewMode={() => openTop({ type: 'viewmode' })}
            onOpenMore={() => openTop({ type: 'more' })}
          />
        ) : (
          <PlaceholderPage pageKey={route} />
        )}
      </main>

      <BottomNav
        active={route}
        onChange={(id) => {
          if (id === 'spaces') setSpacesReset((n) => n + 1)
          setRoute(id)
          // Kurasa halisi: Home · Chat · Gundua · Spaces. Business = placeholder.
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
