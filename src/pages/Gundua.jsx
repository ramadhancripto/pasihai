// ══════════════════════════════════════════════════════════════
// PASIHAI — GUNDUA (Discover)
// Safu ya UGUNDUZI pekee: kugundua biashara, watu, vikundi, hubs,
// jumuiya, channels, friends, live — bila engine ya pili.
//
// Muundo (§2): HEADER (title + search + vichujio)
//   ↓ MAIN DISCOVERY BUTTONS ↓ CATEGORIES ↓ LOCAL/RELEVANT ↓ RESULTS
// ══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import Sheet from '../components/Sheet.jsx'
import { gunduaService } from '../services/gunduaService.js'
import { feedService } from '../services/feedService.js'
import { chatService } from '../services/chatService.js'
import {
  BusinessCard,
  CategoryModule,
  ChannelCard,
  DiscoveryModule,
  FilterBar,
  GroupCard,
  LiveCard,
  MapPreview,
  OfferCard,
  PersonCard,
  Rail,
  SectionHead,
  SpaceCard,
} from '../components/gundua/GunduaBits.jsx'
import { AddFriendPanel, EntityBody, FiltersPanel, QuickActionsBody } from '../components/gundua/GunduaPanels.jsx'
import { IconInfo, IconSearchSmall, IconShield, IconSliders } from '../components/icons.jsx'

const MODE_KEYS = ['mchanganyiko', 'friends', 'channels', 'live']

/* ══════════════════════════════════════════════════════════════
   Ukurasa
   ══════════════════════════════════════════════════════════════ */

export default function Gundua({ onToast, onOpenChat }) {
  const [mode, setMode] = useState('mchanganyiko')
  const [joinedLive, setJoinedLive] = useState([])
  const [query, setQuery] = useState('')
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState(gunduaService.EMPTY)
  const [page, setPage] = useState(null)
  const [local, setLocal] = useState(null)
  const [tick, setTick] = useState(0)
  const [stack, setStack] = useState([])

  const top = stack[stack.length - 1] || null
  const push = useCallback((p) => setStack((s) => [...s, p]), [])
  const pop = useCallback(() => setStack((s) => s.slice(0, -1)), [])
  const closeAll = useCallback(() => setStack([]), [])
  const reload = useCallback(() => setTick((t) => t + 1), [])
  const resultsRef = useRef(null)

  /* ── Data: safu ya huduma (hakuna import ya mock kwenye UI) ── */
  useEffect(() => {
    let live = true
    ;(async () => {
      const p = await gunduaService.getPage({ mode, filters, query })
      if (live) setPage(p)
    })()
    return () => { live = false }
  }, [mode, filters, query, tick])

  useEffect(() => {
    let live = true
    if (mode !== 'mchanganyiko' || query) { setLocal(null); return () => { live = false } }
    ;(async () => {
      const l = await gunduaService.getLocal(filters)
      if (live) setLocal(l)
    })()
    return () => { live = false }
  }, [mode, query, filters])

  /* ── Vitendo ─────────────────────────────────────────────── */
  const act = useMemo(
    () => ({
      open: (kind, id) => push({ key: 'entity', payload: { kind, id } }),
      more: (item) => push({ key: 'quick', payload: item }),
      add: async (person) => {
        try {
          const res = await gunduaService.addFriend(person.id)
          onToast?.(res?.changed === false ? res.hint || 'Hakuna mabadiliko' : `Ombi la urafiki limetumwa kwa ${person.name || 'mtu huyu'}`)
        } catch (err) {
          onToast?.(err?.message || 'Ombi halikutumwa. Jaribu tena.')
        }
        reload()
      },
      accept: async (person) => { await gunduaService.respondFriend(person.id, 'accept'); onToast?.(`${person.name || 'Mtumiaji'} amekubaliwa — mazungumzo yapo Chat`); reload() },
      decline: async (person) => { await gunduaService.respondFriend(person.id, 'decline'); onToast?.('Ombi la urafiki limekataliwa'); reload() },
      chat: async (item) => {
        const convo = await gunduaService.openChat(item.id)
        onToast?.(`Mazungumzo yameandaliwa (${convo?.name || item.name || 'Chat'})`)
        if (onOpenChat) onOpenChat()
      },
      invite: async (person) => {
        const text = chatService.inviteText(person)
        try {
          await navigator.clipboard?.writeText(text)
          onToast?.(`Mwaliko kwa ${person?.name || 'mwalikwa'} umenakiliwa — tuma kwa SMS au WhatsApp`)
        } catch {
          onToast?.(`Mwaliko: ${text}`)
        }
      },
      /** Kiungo/QR: halisi (clipboard). Kuscan kunahitaji kamera — nakili badala yake. */
      copyLink: async (link, mode) => {
        const text = `https://${link?.link || 'pasihai.app/jiunge'} · ${link?.code || ''}`.trim()
        try {
          await navigator.clipboard?.writeText(text)
          onToast?.(
            mode === 'scan'
              ? 'Kuscan QR kunahitaji kamera — kiungo chako kimenakiliwa badala yake'
              : 'Kiungo chako kimenakiliwa',
          )
        } catch {
          onToast?.(text)
        }
      },
      /** Ramani: inaonyesha eneo la biashara kwenye muonekano wa Gundua */
      openMap: (entity) => {
        setMode('businesses')
        onToast?.(`Ramani: ${entity?.name || 'biashara'} — eneo linapatikana Gundua › Biashara`)
      },
      /** Hifadhi kwa baadaye: hali ya kikao (inaonekana Zilizohifadhiwa) */
      save: async (item) => {
        await feedService.saveEntity(item, true)
        onToast?.(`${item?.name || item?.title || 'Kimehifadhiwa'} — kipo kwenye “Zilizohifadhiwa”`)
      },
      /** Ficha kutoka Gundua: hali yako pekee, hakuna taarifa kwa upande wa pili */
      hide: async (item) => {
        await gunduaService.hideEntity(item.id, true)
        onToast?.('Imefichwa kutoka Gundua — hutaiona tena')
        reload()
      },
      /** Jiunge na kikao/sikiliza: hali inabaki (joinLive) */
      joinLive: async (item) => {
        await feedService.joinLive(item.id)
        onToast?.(
          item.kind === 'room'
            ? `Umeingia kwenye chumba cha sauti “${item.room || item.title}”`
            : `Umejiunga na kikao “${item.title}”`,
        )
        reload()
      },
      follow: async (item, on) => { await gunduaService.toggleFollow(item.id, on); onToast?.(on ? `Unafuata ${item.name}` : `Umekoma kufuata ${item.name}`); reload() },
      join: async (item, kind) => {
        const res = await gunduaService.join(kind, item.id)
        onToast?.(res?.chatNote || res?.note || `Umejiunga na ${item.name}`)
        reload()
      },
      goChat: () => (onOpenChat ? onOpenChat() : onToast?.('Mazungumzo yapo kwenye Chat')),
    }),
    [push, onToast, onOpenChat, reload],
  )

  /* Vikao nilivyojiunga (hali ya kikao — inabaki) */
  const loadJoined = useCallback(async () => {
    setJoinedLive(await feedService.listJoinedLive())
  }, [])

  useEffect(() => {
    loadJoined()
  }, [loadJoined, page])

  const applyFilters = (f) => { setFilters(f); setStack([]); reload() }
  const clearFilters = () => { setFilters(gunduaService.EMPTY); reload() }

  const submitSearch = (e) => {
    e.preventDefault()
    const v = q.trim()
    setQuery(v)
    setMode(v ? 'mchanganyiko' : mode)
    window.setTimeout(() => resultsRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 30)
  }

  /** Chagua moduli/kategoria → nenda kwenye matokeo (mpangilio wa ukurasa unabaki) */
  const pick = useCallback((m) => {
    setMode(m)
    setStack([])
    window.setTimeout(() => resultsRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 60)
  }, [])

  const searchActive = !!query
  const modes = page?.modules || []

  /* ── Kadi kwa aina ───────────────────────────────────────── */
  const cardFor = useCallback((item) => {
    switch (item.kind) {
      case 'business': return <BusinessCard key={item.id} b={item} onOpen={() => act.open('business', item.id)} onMore={() => act.more(item)} onChat={() => act.chat(item)} />
      case 'channel': return <ChannelCard key={item.id} c={item} onOpen={() => act.open('channel', item.id)} onMore={() => act.more(item)} onFollow={(on) => act.follow(item, on)} />
      case 'hub': case 'community': return <SpaceCard key={item.id} s={item} variant={item.kind} onOpen={() => act.open(item.kind, item.id)} onMore={() => act.more(item)} onJoin={() => act.join(item, item.kind)} />
      case 'group': return <GroupCard key={item.id} g={item} onOpen={() => act.open('group', item.id)} onMore={() => act.more(item)} onJoin={() => act.join(item, 'group')} />
      case 'live': case 'room': return <LiveCard key={item.id} l={item} onOpen={() => act.open(item.kind, item.id)} onMore={() => act.more(item)} />
      case 'offer': return <OfferCard key={item.id} o={item} onOpen={() => act.open('business', item.business?.id || item.businessId || item.id)} onMore={() => act.more(item)} />
      default: return <PersonCard key={item.id} p={item} onOpen={() => act.open('person', item.id)} onMore={() => act.more(item)} onAdd={act.add} onAccept={act.accept} onDecline={act.decline} onChat={act.chat} onInvite={act.invite} />
    }
  }, [act])


  /* ── Panel ya sasa (Sheet ileile ya app) ─────────────────── */
  const panel = useMemo(() => {
    if (!top) return null
    switch (top.key) {
      case 'filters':
        return {
          title: 'Vichujio',
          subtitle: `${page?.activeCount || 0} vimewashwa · ${page?.scope?.place || ''}`,
          back: true,
          body: (
            <FiltersPanel
              groups={page?.filterSchema || []}
              value={filters}
              onChange={setFilters}
              onApply={applyFilters}
              onClearAll={clearFilters}
              onBack={pop}
            />
          ),
        }
      case 'entity':
        return {
          title: 'Maelezo',
          subtitle: 'Taarifa za umma pekee',
          back: true,
          body: (
            <EntityPanelBody
              kind={top.payload.kind}
              id={top.payload.id}
              act={act}
              onToast={onToast}
              joinedLive={joinedLive}
            />
          ),
        }
      case 'addfriend':
        return {
          title: 'Ongeza Rafiki',
          subtitle: 'Urafiki wa makusudi — ombi, kisha kibali',
          back: true,
          body: (
            <AddFriendPanel
              onAdd={act.add}
              onChat={act.chat}
              onAccept={act.accept}
              onDecline={act.decline}
              onInvite={act.invite}
              onCopyLink={act.copyLink}
              onToast={onToast}
            />
          ),
        }
      case 'cat':
        return {
          title: top.payload.label,
          subtitle: 'Matokeo ya ugunduzi · umma pekee',
          back: true,
          body: <CategoryPanelBody catId={top.payload.id} act={act} cardFor={cardFor} />,
        }
      case 'quick':
        return {
          title: 'Vitendo',
          subtitle: 'Vya muktadha pekee',
          back: true,
          body: (
            <QuickActionsBody
              item={top.payload}
              onPrimary={() => { const it = top.payload; setStack([{ key: 'entity', payload: { kind: it.kind, id: it.id } }]) }}
              onShare={async (it) => {
                const text = `https://pasihai.app/${it.kind || 'gundua'}/${it.id}`
                try {
                  await navigator.clipboard?.writeText(text)
                  onToast?.('Kiungo kimenakiliwa — unaweza kukitumа kwenye Chat au SMS')
                } catch {
                  onToast?.(text)
                }
              }}
              onSave={act.save}
              onHide={act.hide}
              onToast={onToast}
            />
          ),
        }
      default:
        return null
    }
  }, [top, page, filters, applyFilters, clearFilters, pop, act, onToast, cardFor])

  const results = page?.results || []

  return (
    <div className="psh-gu">
      {/* ── Kichwa cha ukurasa ─────────────────────────────── */}
      <header className="psh-gu-head">
        <div className="psh-gu-head__text">
          <h1 className="psh-gu-head__title">Gundua</h1>
        </div>
      </header>

      <form className="psh-gu-search" onSubmit={submitSearch} role="search">
        <span className="psh-gu-search__ic" aria-hidden="true"><IconSearchSmall size={18} /></span>
        <input
          className="psh-gu-search__input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Unatafuta nini? Biashara, mtu, channel…"
          aria-label="Unatafuta nini"
        />
        {q ? (
          <button type="button" className="psh-gu-search__x" onClick={() => { setQ(''); setQuery('') }} aria-label="Safisha utafutaji">
            ✕
          </button>
        ) : null}
        <button
          type="button"
          className={`psh-gu-search__filter ${page?.activeCount ? 'is-on' : ''}`}
          onClick={() => push({ key: 'filters' })}
          aria-label="Fungua vichujio"
        >
          <IconSliders size={18} />
          <span className="psh-gu-search__filterlabel">Vichujio</span>
          {page?.activeCount ? <span className="psh-gu-search__badge">{page.activeCount}</span> : null}
        </button>
      </form>

      {/* Vichujio vilivyowekwa — mstari mmoja tu, na huonekani kama hakuna */}
      {page?.activeCount ? (
        <FilterBar count={page.activeCount} items={page?.activeFilters || []} onOpen={() => push({ key: 'filters' })} onClear={clearFilters} />
      ) : null}

      {/* ── Moduli kuu za ugunduzi ─────────────────────────── */}
      <section className="psh-gu-mods" aria-label="Njia kuu za ugunduzi">
        {modes.map((m) => (
          <DiscoveryModule
            key={m.id}
            module={m}
            active={mode === m.mode || mode === m.id}
            count={page?.counts?.[m.id]}
            onSelect={(mm) => pick(mm)}
          />
        ))}
      </section>

      {/* ── Kategoria ──────────────────────────────────────── */}
      <section className="psh-gu-cats" aria-label="Kategoria za ugunduzi">
        <SectionHead title="Kategoria" />
        <div className="psh-gu-cats__grid">
          {(page?.categories || []).map((c) => (
            <CategoryModule
              key={c.id}
              cat={{ ...c, count: typeof c.count === 'number' ? c.count : undefined }}
              onSelect={() => {
                if (MODE_KEYS.includes(c.mode)) pick(c.mode)
                else if (c.mode === 'addfriend') push({ key: 'addfriend' })
                else push({ key: 'cat', payload: c })
              }}
            />
          ))}
        </div>
      </section>

      {/* ── Matokeo / Ugunduzi wa karibu ───────────────────── */}
      <div ref={resultsRef} className="psh-gu-results" tabIndex={-1}>
        {searchActive ? (
          <SearchResults query={query} page={page} cardFor={cardFor} onClear={() => { setQ(''); setQuery('') }} />
        ) : mode === 'friends' ? (
          <FriendsView view={page?.friendsView || {}} cardFor={cardFor} onAddFriend={() => push({ key: 'addfriend' })} />
        ) : mode === 'mchanganyiko' ? (
          <>
            {local ? (
              <section className="psh-gu-sec">
                <SectionHead
                  title="Karibu nawe"
                  hint={`${local.openNow} wazi sasa · ${local.total} vituo vya umma`}
                  actionLabel="Vichujio"
                  onAction={() => push({ key: 'filters' })}
                />
                <MapPreview
                  map={local.map}
                  onOpen={() => pick('businesses')}
                />
              </section>
            ) : null}

            {(page?.highlights || []).map((h) => (
              <section key={h.id} className="psh-gu-sec">
                <SectionHead title={h.title} hint={h.hint} onAction={h.mode ? () => setMode(h.mode) : undefined} />
                <Rail name={h.title}>{h.items.map((it) => cardFor(it))}</Rail>
              </section>
            ))}

            {page?.offers?.length ? (
              <section className="psh-gu-sec">
                <SectionHead title="Ofa za wazi" hint="Kutoka biashara zilizo karibu" />
                <Rail name="Ofa">{page.offers.map((o) => cardFor({ ...o, kind: 'offer' }))}</Rail>
              </section>
            ) : null}
          </>
        ) : (
          <section className="psh-gu-sec">
            <SectionHead
              title={labelForMode(mode, modes)}
              hint={`${results.length} matokeo · umma pekee`}
              actionLabel="Vichujio"
              onAction={() => push({ key: 'filters' })}
            />
            {results.length ? (
              <div className={`psh-gu-grid psh-gu-grid--${mode}`}>{results.map((it) => cardFor(it))}</div>
            ) : (
              <p className="psh-gu-empty">
                <IconInfo size={16} /> Hakuna kinacholingana na vichujio hivi. <button type="button" className="psh-gu-linkbtn" onClick={clearFilters}>Safisha vichujio</button>
              </p>
            )}
          </section>
        )}
      </div>

      <p className="psh-gu-foot">
        <IconShield size={14} /> Gundua ni ugunduzi pekee — usimamizi wa Community, Hub na Business unabaki Spaces.
        {mode === 'friends' ? ' Friends haitumii model ya mitandao ya kijamii: hakuna "watu unaoweza kuwafahamu".' : ''}
      </p>

      {/* ── Panels — Sheet ileile ya app ───────────────────── */}
      <Sheet
        open={!!panel}
        onClose={closeAll}
        onBack={stack.length > 1 || panel?.back ? pop : undefined}
        title={panel?.title}
        subtitle={panel?.subtitle}
        size="md"
      >
        {panel?.body}
      </Sheet>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   Sehemu za matokeo
   ══════════════════════════════════════════════════════════════ */

function labelForMode(mode, modes) {
  const m = modes.find((x) => (x.mode || x.id) === mode)
  return m?.label || 'Matokeo'
}

function SearchResults({ query, page, cardFor, onClear }) {
  const view = page?.searchView || {}
  const sections = (view.sections || []).filter((s) => s.items?.length)
  const total = view.total || 0

  if (!total) {
    return (
      <section className="psh-gu-sec">
        <SectionHead title={`Matokeo: "${query}"`} hint="Hakuna kilicholingana" showHint onAction={onClear} actionLabel="Safisha" />
        <div className="psh-gu-empties">
          <p className="psh-gu-empty"><IconInfo size={16} /> Hakuna kitu cha umma kinacholingana na "{query}".</p>
          <p className="psh-gu-hintline">Jaribu: {(page?.ideas || []).slice(0, 4).map((i) => i.label || i).join(' · ')}</p>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="psh-gu-sec">
        <SectionHead title={`Matokeo: "${query}"`} hint={`${total} vitu vya umma`} onAction={onClear} actionLabel="Safisha" />
      </section>
      {sections.map((s) => (
        <section key={s.id} className="psh-gu-sec">
          <SectionHead title={`${s.title} · ${s.items.length}`} hint="Umma pekee" />
          <div className="psh-gu-grid">{s.items.map((it) => cardFor(it))}</div>
        </section>
      ))}
    </>
  )
}

const FRIEND_SECTIONS = [
  ['myFriends', 'Marafiki Zangu', 'Urafiki wa makusudi — uliokubaliwa'],
  ['requests', 'Maombi ya Urafiki', 'Yanahitaji uamuzi wako'],
  ['sent', 'Yaliyotumwa', 'Yanasubiri kibali'],
  ['discover', 'Watu wa Kugundua', 'Sababu MOJA ya muktadha kila mmoja'],
  ['fromContacts', 'Kutoka Orodha ya Simu', 'Chanzo: orodha yako, si mtandao wa kijamii'],
  ['fromSpaces', 'Kutoka Sehemu za Umma', 'Hub, channel au kikundi cha wazi'],
  ['nearby', 'Karibu Nawe', 'Kwa eneo — si ruhusa'],
  ['blocked', 'Umezuiwa', 'Faragha imelindwa'],
]

function FriendsView({ view, cardFor, onAddFriend }) {
  const has = FRIEND_SECTIONS.some(([k]) => (view[k] || []).length)
  return (
    <>
      <section className="psh-gu-sec">
        <SectionHead title="Friends" hint="Urafiki wa PASIHAI: ombi → kibali → rafiki" />
        <div className="psh-gu-friendbar">
          <button type="button" className="psh-gu-btn psh-gu-btn--primary" onClick={onAddFriend}>Ongeza Rafiki</button>
          <span className="psh-gu-hintline">
            <IconShield size={13} /> Hakuna "watu unaoweza kuwafahamu", hakuna takwimu za mtandao, hakuna namba za urafiki.
          </span>
        </div>
      </section>

      {has ? (
        FRIEND_SECTIONS.map(([key, title, hint]) =>
          (view[key] || []).length ? (
            <section key={key} className="psh-gu-sec">
              <SectionHead title={`${title} · ${view[key].length}`} hint={hint} />
              <div className="psh-gu-grid">{view[key].map((p) => cardFor(p))}</div>
            </section>
          ) : null,
        )
      ) : (
        <section className="psh-gu-sec">
          <p className="psh-gu-empty"><IconInfo size={16} /> Hakuna matokeo kwa vichujio hivi vya mahusiano.</p>
        </section>
      )}
    </>
  )
}

/* ══════════════════════════════════════════════════════════════
   Kusoma taarifa za kitu kimoja (umma pekee)
   ══════════════════════════════════════════════════════════════ */

function EntityPanelBody({ kind, id, act, onToast, joinedLive }) {
  const [data, setData] = useState(null)
  useEffect(() => {
    let live = true
    ;(async () => {
      const d = await gunduaService.getEntity(kind, id)
      if (live) setData(d)
    })()
    return () => { live = false }
  }, [kind, id])

  if (!data) return <p className="psh-gu-empty"><IconInfo size={16} /> Inapakia…</p>

  return (
    <EntityBody
      data={data}
      kind={data.kind || kind}
      joined={!!data.joined}
      following={!!data.following}
      onAdd={act.add}
      onAccept={act.accept}
      onDecline={act.decline}
      onChat={act.chat}
      onFollow={(item, on) => act.follow(item, on)}
      onJoin={(item, k) => act.join(item, k)}
      onOpenProfile={() => act.open(kind === 'person' ? 'person' : kind, data.id)}
      onOpenMap={act.openMap}
      onJoinLive={act.joinLive}
      joinedLive={joinedLive?.includes(data.id)}
      onGoChat={act.goChat}
      onToast={onToast}
    />
  )
}

function CategoryPanelBody({ catId, act, cardFor }) {
  const [items, setItems] = useState(null)
  useEffect(() => {
    let live = true
    ;(async () => {
      const p = await gunduaService.getPage({ mode: catId })
      if (live) setItems(p.results || [])
    })()
    return () => { live = false }
  }, [catId])

  if (!items) return <p className="psh-gu-empty"><IconInfo size={16} /> Inapakia…</p>
  if (!items.length) return <p className="psh-gu-empty"><IconInfo size={16} /> Hakuna vitu vya umma kwenye kategoria hii.</p>
  return <div className="psh-gu-grid psh-gu-grid--sheet">{items.map((it) => cardFor(it))}</div>
}
