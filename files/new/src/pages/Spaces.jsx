// ══════════════════════════════════════════════════════════════
// PASIHAI — SPACES (ukurasa wa 4 wa nav — haubadiliki)
//
// Muundo wa ukurasa (§3):
//   HEADER (title · search · Unda) → TABS (Hubs & Jumuiya | Channels)
//   → VICHUJIO → SEHEMU (Nafasi Zangu → Zinazopendekezwa) → SPACE
//
// Space moja inafunguliwa kama SEHEMU ya ukurasa huu (si route mpya):
//   · Hub/Jumuiya → SpacePage (familia moja)
//   · Channel     → ChannelPage (kuchapisha)
//
// Kanuni: vikundi ni vya Chat; ufikivu ni hali; eneo ni umuhimu.
// ══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from 'react'

import Sheet from '../components/Sheet.jsx'
import useAsyncData from '../hooks/useAsyncData.js'
import { spacesService } from '../services/spacesService.js'
import SpacePage from '../components/spaces/SpacePage.jsx'
import ChannelPage from '../components/spaces/ChannelPage.jsx'
import { CreateSpacePanel } from '../components/spaces/SpacePanels.jsx'
import {
  ChannelCard,
  Rail,
  SectionHead,
  SpaceCard,
  SpaceEmpty,
} from '../components/spaces/SpacesBits.jsx'
import { IconPlus, IconSearchSmall, IconSliders } from '../components/icons.jsx'

export default function Spaces({
  onToast,
  onOpenPanel,
  onOpenProfile,
  onOpenChat,
  onRefreshFeed,
  feedVersion = 0,
  initialSpace = null,
  onClearInitial,
  resetToken = 0,
}) {
  const [tab, setTab] = useState('places')
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [version, setVersion] = useState(0)
  const [open, setOpen] = useState(null)
  const [stack, setStack] = useState([])
  const [busyId, setBusyId] = useState(null)

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  const push = useCallback((p) => setStack((s) => [...s, p]), [])
  const pop = useCallback(() => setStack((s) => s.slice(0, -1)), [])
  const closeAll = useCallback(() => setStack([]), [])
  const top = stack[stack.length - 1] || null

  const page = useAsyncData(() => spacesService.getPage({ tab, filter, query }), [tab, filter, query, version])

  /* Nav "Spaces" tena → orodha (ukurasa mmoja, si route mpya) */
  useEffect(() => {
    if (!resetToken) return
    setOpen(null)
    setQuery('')
    setQ('')
  }, [resetToken])

  /* Space iliyoundwa kwenye mahali pengine (Home → Unda) inafunguliwa hapa */
  useEffect(() => {
    if (initialSpace) {
      setOpen(initialSpace)
      onClearInitial?.()
    }
  }, [initialSpace, onClearInitial])

  const openSpace = useCallback((item) => setOpen({ type: item.type, id: item.id }), [])

  const act = async (item, fn) => {
    if (busyId) return
    setBusyId(item.id)
    try {
      await fn()
    } finally {
      setBusyId(null)
    }
  }

  const join = (item) =>
    act(item, async () => {
      const res = await spacesService.join(item.type, item.id)
      onToast?.(res?.note || 'Imejiunga')
      reload()
    })

  const submitSearch = (e) => {
    e.preventDefault()
    setQuery(q.trim())
  }

  const filters = page?.filters || []
  const sections = page?.sections || []

  const panel = useMemo(() => {
    if (!top) return null
    if (top.key === 'create') {
      return {
        title: 'Unda Space',
        subtitle: 'Hatua 3: aina · maelezo · muonekano',
        back: stack.length > 1,
        body: (
          <CreateSpacePanel
            type={top.payload?.type}
            onToast={onToast}
            onClose={closeAll}
            onCreated={(space) => {
              reload()
              setOpen({ type: space.type, id: space.id })
            }}
          />
        ),
      }
    }
    return null
  }, [top, stack.length, onToast, closeAll, reload])

  /* ── Space moja (Hub · Jumuiya) ──────────────────────────── */
  if (open) {
    if (open.type === 'channel') {
      return (
        <ChannelPage
          id={open.id}
          onBack={() => {
            setOpen(null)
            reload()
          }}
          onToast={onToast}
          onOpenPanel={onOpenPanel}
          onOpenProfile={onOpenProfile}
          onOpenChat={onOpenChat}
          onRefreshFeed={onRefreshFeed}
          feedVersion={feedVersion}
        />
      )
    }
    return (
      <SpacePage
        type={open.type}
        id={open.id}
        onBack={() => {
          setOpen(null)
          reload()
        }}
        onToast={onToast}
        onOpenPanel={onOpenPanel}
        onOpenProfile={onOpenProfile}
        onOpenChat={onOpenChat}
        onRefreshFeed={onRefreshFeed}
        feedVersion={feedVersion}
      />
    )
  }

  /* ── Ukurasa mkuu ────────────────────────────────────────── */
  return (
    <div className="psh-spaces">
      <header className="psh-spaces__head">
        <div className="psh-spaces__headText">
          <h1 className="psh-pagehead__title">Spaces</h1>
          <p className="psh-spaces__sub">
            Hubs na Jumuiya ni mahali pa kukutana; Channels ni vyanzo vya kuchapisha.
          </p>
        </div>
        <button
          type="button"
          className="psh-btn psh-btn--sm psh-btn--primary"
          onClick={() => push({ key: 'create' })}
        >
          <IconPlus size={15} />
          Unda Space
        </button>
      </header>

      <form className="psh-spaces__search" onSubmit={submitSearch} role="search">
        <IconSearchSmall size={18} />
        <input
          className="psh-spaces__input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tafuta hub, jumuiya au channel…"
          aria-label="Tafuta Spaces"
        />
        <button type="submit" className="psh-spaces__searchBtn">
          Tafuta
        </button>
      </form>

      <div className="psh-spaces__tabs" role="tablist" aria-label="Aina za Spaces">
        {(page?.tabs || spacesService.TABS).map((t) => {
          const on = t.id === tab
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              className={`psh-spaces__tab ${on ? 'is-active' : ''}`}
              onClick={() => {
                setTab(t.id)
                setFilter('all')
              }}
            >
              <span className="psh-spaces__tabLabel">{t.label}</span>
              <span className="psh-spaces__tabHint">{t.hint}</span>
            </button>
          )
        })}
      </div>

      <div className="psh-spaces__filters" role="group" aria-label="Vichujio vya Spaces">
        <IconSliders size={16} />
        {filters.map((f) => {
          const on = f.id === filter
          const count =
            f.id === 'all'
              ? page?.allCount
              : f.id === 'mine'
                ? page?.counts?.mine
                : null
          return (
            <button
              key={f.id}
              type="button"
              className={`psh-spaces__chip ${on ? 'is-active' : ''}`}
              aria-pressed={on}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              {count != null ? <span className="psh-spaces__chipCount">{count}</span> : null}
            </button>
          )
        })}
      </div>

      {!page ? (
        <div className="psh-spaces__loading" aria-busy="true">
          {[0, 1].map((i) => (
            <div className="psh-skel" key={i}>
              <div className="psh-skel__block" />
            </div>
          ))}
        </div>
      ) : page.empty ? (
        <SpaceEmpty
          title={page.empty.title}
          text={page.empty.text}
          onAction={() => push({ key: 'create' })}
          actionLabel="Unda Space"
        />
      ) : (
        sections.map((sec) => (
          <section key={sec.id} className="psh-spaces__section" aria-label={sec.title}>
            <SectionHead
              title={sec.title}
              hint={sec.hint}
              actionLabel={sec.items.length > 4 ? 'Zote' : undefined}
              onAction={sec.items.length > 4 ? () => setFilter(sec.id === 'mine' ? 'mine' : 'all') : undefined}
            />
            {sec.layout === 'rail' ? (
              <Rail name={sec.title}>
                {sec.items.map((item) =>
                  item.family === 'channel' ? (
                    <ChannelCard key={item.id} c={item} onOpen={openSpace} onFollow={join} busy={busyId === item.id} />
                  ) : (
                    <SpaceCard key={item.id} s={item} onOpen={openSpace} onJoin={join} busy={busyId === item.id} />
                  ),
                )}
              </Rail>
            ) : (
              <div className="psh-spaces__grid">
                {sec.items.map((item) =>
                  item.family === 'channel' ? (
                    <ChannelCard key={item.id} c={item} onOpen={openSpace} onFollow={join} busy={busyId === item.id} />
                  ) : (
                    <SpaceCard key={item.id} s={item} onOpen={openSpace} onJoin={join} busy={busyId === item.id} />
                  ),
                )}
              </div>
            )}
          </section>
        ))
      )}

      {page?.note ? <p className="psh-spaces__note">{page.note}</p> : null}

      <Sheet
        open={!!panel}
        onClose={closeAll}
        onBack={stack.length > 1 ? pop : undefined}
        title={panel?.title}
        subtitle={panel?.subtitle}
      >
        {panel?.body}
      </Sheet>
    </div>
  )
}
