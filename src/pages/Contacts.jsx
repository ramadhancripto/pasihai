// ══════════════════════════════════════════════════════════════
// PASIHAI — CONTACTS (ukurasa)
//
// · Search · Tabs (Zote · Watumiaji ChatHai · Namba za simu · Vipendwa)
// · Orodha ya contacts + hali za akaunti
// · Add · Import · Wasifu wa contact · Badilisha · Namba yangu
// · Hali: loading · error+retry · offline · empty (hakuna kubuni)
//
// KANUNI: contact ≠ friendship ≠ chat. Namba za wengine hazionyeshwi.
// ══════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from 'react'

import Sheet from '../components/Sheet.jsx'
import { useOnlineStatus } from '../hooks/useOnlineStatus.js'
import { contactsService } from '../services/contactsService.js'
import {
  Banner,
  ContactRow,
  SearchBar,
  StateBlock,
  TabBar,
} from '../components/contacts/ContactsBits.jsx'
import {
  AddContactBody,
  ContactProfileBody,
  EditContactBody,
  ImportContactsBody,
  MyNumberBody,
  UndoDeleted,
} from '../components/contacts/ContactsPanels.jsx'
import { IconDownload, IconInfo, IconPersonAdd, IconPhone } from '../components/icons.jsx'
import '../styles/contacts.css'

export default function Contacts({ onToast, onOpenChat }) {
  const [tab, setTab] = useState('all')
  const [query, setQuery] = useState('')
  const [view, setView] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [stack, setStack] = useState([])
  const [undo, setUndo] = useState(null)
  const [myPhone, setMyPhone] = useState(null)
  const isOnline = useOnlineStatus()

  const top = stack[stack.length - 1] || null
  const push = useCallback((p) => setStack((s) => [...s, p]), [])
  const pop = useCallback(() => setStack((s) => s.slice(0, -1)), [])
  const closeAll = useCallback(() => setStack([]), [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [v, phone] = await Promise.all([
        contactsService.getView({ tab, query }),
        contactsService.getMyPhone(),
      ])
      setView(v)
      setMyPhone(phone)
    } catch (err) {
      setError(err?.message || 'Imeshindwa kupata contacts.')
      setView(null)
    } finally {
      setLoading(false)
    }
  }, [tab, query])

  useEffect(() => { load() }, [load])

  /* Refetch wakati data inabadilika (k.m. baada ya import/kufuta) */
  useEffect(() => {
    const off = contactsService.isDemoEnvironment?.() ? null : null
    return () => { if (off) off() }
  }, [])

  const items = view?.items || []

  /** Sasisha kipengele cha juu kwenye stack kutoka data mpya (wasifu usiwe wa zamani). */
  const refreshTop = useCallback(async () => {
    try {
      const fresh = await contactsService.getView({ tab: 'all', query: '' })
      setView((v) => (v ? { ...v, items: v.items } : v))
      setStack((st) => {
        const lastItem = st[st.length - 1]
        if (!lastItem || lastItem.type !== 'profile') return st
        const found = fresh.items.find((x) => x.id === lastItem.item.id)
        if (!found) return st
        return [...st.slice(0, -1), { type: 'profile', item: found }]
      })
    } catch { /* kimya: data ya zamani inabaki */ }
  }, [])

  const openProfile = useCallback(async (item) => {
    // Sasisha item kwa data ya sasa kabla ya kuonyesha wasifu.
    try {
      const fresh = await contactsService.getView({ tab: 'all', query: '' })
      const found = fresh.items.find((x) => x.id === item.id) || item
      push({ type: 'profile', item: found })
    } catch {
      push({ type: 'profile', item })
    }
  }, [push])

  const message = useCallback(async (item) => {
    if (!item?.accountId) return
    const res = await contactsService.startChat(item.accountId)
    if (res.blocked || !res.conversation) {
      onToast?.(res.reason || 'Imeshindwa kuanza mazungumzo.')
      return
    }
    closeAll()
    onToast?.(res.created ? 'Mazungumzo mapya yameanzishwa' : 'Mazungumzo yaliyopo yamefunguliwa')
    onOpenChat?.()
  }, [closeAll, onOpenChat, onToast])

  const panelDef = useMemo(() => {
    if (!top) return null
    switch (top.type) {
      case 'add':
        return {
          title: 'Ongeza contact',
          subtitle: 'Jina · nchi · namba',
          body: (
            <AddContactBody
              onToast={onToast}
              onSaved={() => load()}
              onOpenContact={(idOrContact) => {
                const id = typeof idOrContact === 'string' ? idOrContact : idOrContact?.id
                if (!id) { closeAll(); load(); return }
                setStack([{ type: 'profileById', id }])
                load()
              }}
              onOpenMyNumber={() => push({ type: 'mynumber' })}
            />
          ),
        }
      case 'import':
        return {
          title: 'Import contacts',
          subtitle: 'Kwa ruhusa yako · unachagua mwenyewe',
          body: <ImportContactsBody onToast={onToast} onDone={() => load()} />,
        }
      case 'profile':
        return {
          title: 'Wasifu wa contact',
          subtitle: 'Taarifa zinazoheshimu faragha',
          body: (
            <ContactProfileBody
              item={top.item}
              onToast={onToast}
              onChanged={async () => { await load(); await refreshTop() }}
              onMessage={message}
              onEditContact={(item) => push({ type: 'edit', item })}
              onDeleted={(snapshot) => {
                setUndo(snapshot)
                closeAll()
                load()
              }}
            />
          ),
        }
      case 'profileById':
        return {
          title: 'Wasifu wa contact',
          subtitle: 'Taarifa zinazoheshimu faragha',
          body: <ProfileById id={top.id} onToast={onToast} onChanged={async () => { await load(); await refreshTop() }} onMessage={message}
            onEditContact={(item) => push({ type: 'edit', item })}
            onDeleted={(snapshot) => { setUndo(snapshot); closeAll(); load() }} />,
        }
      case 'edit':
        return {
          title: 'Badilisha contact',
          subtitle: 'Jina lako binafsi · maelezo yako',
          body: <EditContactBody item={top.item} onToast={onToast} onSaved={() => { pop(); load() }} />,
        }
      case 'mynumber':
        return {
          title: 'Namba yangu',
          subtitle: 'Uthibitisho · ugunduzi · kuondoa',
          body: <MyNumberBody phone={myPhone} onToast={onToast} onChanged={() => load()} />,
        }
      default:
        return null
    }
  }, [closeAll, load, message, myPhone, onToast, pop, push, refreshTop, top])

  const onPrimaryEmpty = () => push({ type: 'add' })

  return (
    <div className="psh-cx">
      <header className="psh-cx__head">
        <div>
          <h1 className="psh-cx__title">Contacts</h1>
          <p className="psh-cx__sub">Orodha yako · marafiki · mazungumzo</p>
        </div>
        <div className="psh-cx__head-actions">
          <button type="button" className="psh-cx-btn psh-cx-btn--icon" title="Namba yangu" aria-label="Namba yangu"
            onClick={() => push({ type: 'mynumber' })}>
            <IconPhone size={17} />
          </button>
          <button type="button" className="psh-cx-btn psh-cx-btn--icon" title="Import contacts" aria-label="Import contacts"
            onClick={() => push({ type: 'import' })}>
            <IconDownload size={17} />
          </button>
          <button type="button" className="psh-cx-btn psh-cx-btn--primary" onClick={() => push({ type: 'add' })}>
            <IconPersonAdd size={16} /> Ongeza
          </button>
        </div>
      </header>

      {!isOnline ? (
        <Banner kind="off" icon={<IconInfo size={15} />}>
          Hupo nje ya mtandao. Contacts zinaonekana, lakini kuongeza, kutafuta namba na
          kuhifadhi kutahitaji muunganisho — jaribu tena ukirudi mtandaoni.
        </Banner>
      ) : null}

      {view?.demo ? (
        <Banner kind="demo" icon={<IconInfo size={15} />}>
          Data ya majaribio (demo) — hakuna namba za watu halisi.
        </Banner>
      ) : null}

      {undo ? (
        <UndoDeleted snapshot={undo} onUndone={() => { setUndo(null); load() }} onToast={onToast} />
      ) : null}

      <SearchBar value={query} onChange={setQuery} />

      {view ? <TabBar tabs={view.tabs} active={tab} onChange={setTab} /> : null}

      {loading && !view ? (
        <StateBlock kind="loading" title="Inapakia contacts…" body="Tunapanga orodha yako." />
      ) : error ? (
        <StateBlock
          kind={isOnline ? 'error' : 'offline'}
          title={isOnline ? 'Imeshindwa kupata contacts' : 'Hakuna muunganisho'}
          body={error}
          onRetry={load}
        />
      ) : !items.length ? (
        query ? (
          <StateBlock
            kind="nomatch"
            title="Hakuna aliyelingana"
            body={`Hakuna contact anayelingana na “${query}”. Unaweza kuongeza contact mpya au kutafuta kwa namba kamili.`}
            onPrimary={onPrimaryEmpty}
            primaryLabel="Ongeza contact"
          />
        ) : (
          <StateBlock
            kind="empty"
            kind2="empty"
            title={tab === 'favorite' ? 'Hakuna vipendwa bado' : tab === 'account' ? 'Hakuna watumiaji wa ChatHai' : tab === 'phone' ? 'Hakuna namba za simu' : 'Hakuna contacts bado'}
            body="Anza kwa kuongeza contact kwa namba, au import contacts kutoka kifaa chako (kwa ruhusa yako)."
            onPrimary={onPrimaryEmpty}
            primaryLabel="Ongeza contact"
            onSecondary={() => push({ type: 'import' })}
            secondary="Import contacts"
          />
        )
      ) : (
        <div className="psh-cx__card">
          <ul className="psh-cx__list">
            {items.map((item) => (
              <ContactRow key={item.id} item={item} onOpen={openProfile} onMessage={message} />
            ))}
          </ul>
        </div>
      )}

      {view && items.length ? (
        <p className="psh-cx-hint" style={{ marginTop: 'var(--s-3)' }}>
          {view.total} ya {view.tabs.find((t) => t.id === 'all')?.count ?? view.total} contacts ·
          {' '}kuhifadhi contact hakumfanyi mtu kuwa rafiki.
        </p>
      ) : null}

      <Sheet
        open={!!panelDef}
        onClose={closeAll}
        onBack={stack.length > 1 ? pop : undefined}
        title={panelDef?.title}
        subtitle={panelDef?.subtitle}
      >
        {panelDef?.body}
      </Sheet>
    </div>
  )
}

/* ── Wasifu kwa id (baada ya kuongeza contact mpya) ─────────── */
function ProfileById({ id, onToast, onChanged, onMessage, onEditContact, onDeleted }) {
  const [item, setItem] = useState(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const v = await contactsService.getView({ tab: 'all', query: '' })
        const found = v.items.find((x) => x.id === id)
        if (alive) {
          if (found) setItem(found)
          else setMissing(true)
        }
      } catch {
        if (alive) setMissing(true)
      }
    })()
    return () => { alive = false }
  }, [id])

  if (missing) {
    return (
      <StateBlock kind="error" title="Contact haipatikani" body="Huenda ilifutwa kwenye kifaa kingine."
        onRetry={() => onChanged?.()} />
    )
  }
  if (!item) {
    return <StateBlock kind="loading" title="Inapakia wasifu…" />
  }
  return (
    <ContactProfileBody
      item={item}
      onToast={onToast}
      onChanged={() => { onChanged?.() }}
      onMessage={onMessage}
      onEditContact={onEditContact}
      onDeleted={onDeleted}
    />
  )
}
