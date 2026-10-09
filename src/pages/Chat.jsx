// ══════════════════════════════════════════════════════════════
// PASIHAI — CHAT (ukurasa) — mfumo MMOJA wa mawasiliano
//
// · Inbox (Direct + Vikundi) — kichwa: Chat · Search · ⋮ (bila account icon)
// · Thread (Direct + Group) — composer mmoja
// · New Chat · New Group · Requests · Search · More/Settings
// · Desktop: panes mbili (orodha | mazungumzo) · Simu: moja kwa wakati
//
// Hali za mfumo zinatokana na safu ileile ya System (hakuna network layer mpya).
// ══════════════════════════════════════════════════════════════

import { useCallback, useMemo, useState } from 'react'

import useAsyncData from '../hooks/useAsyncData.js'
import { chatService } from '../services/chatService.js'
import { systemService } from '../services/systemService.js'
import Sheet from '../components/Sheet.jsx'
import Thread from '../components/chat/Thread.jsx'
import { ChatAvatar } from '../components/chat/ChatBits.jsx'
import {
  NewChatPanel,
  NewGroupPanel,
  RequestsPanel,
  SearchPanel,
  MorePanel,
  CallBody,
  SettingsBody,
  PrivacyBody,
  NotificationsBody,
  ArchivedBody,
  BlockedBody,
  StorageBody,
  MediaGuardBody,
} from '../components/chat/ChatPanels.jsx'
import {
  IconInfo,
  IconMoreVertical,
  IconPlus,
  IconRadar,
  IconSearchSmall,
  IconShield,
  IconSpaces,
  IconHub,
} from '../components/icons.jsx'

/* ── Hali ya kifaa → rangi ya doa ───────────────────────────── */
const DOT = {
  ONLINE: 'ok',
  LOCAL: 'ok',
  SYNCING: 'blue',
  LIMITED: 'gold',
  WAITING_SYNC: 'gold',
  OFFLINE: 'off',
}

export default function Chat({ onToast }) {
  const [filter, setFilter] = useState('zote')
  const [activeId, setActiveId] = useState(null)
  const [key, setKey] = useState(0)
  const [panel, setPanel] = useState(null)
  const [stack, setStack] = useState([]) // mrundi wa panels — Back inarudi kwenye iliyotangulia
  const [guard, setGuard] = useState(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(() => setKey((k) => k + 1), [])

  /* Panel navigation: fungua (kwa mrundi) · rudi · funga */
  const go = (id) => {
    setStack((s) => (panel && panel !== id ? [...s, panel] : s))
    setPanel(id)
  }
  const back = () => {
    const next = [...stack]
    const prev = next.pop() || null
    setStack(next)
    setPanel(prev)
  }
  const close = () => {
    setStack([])
    setPanel(null)
    setGuard(null)
  }

  const inbox = useAsyncData(() => chatService.getInbox(filter), [filter, key])
  const thread = useAsyncData(
    () => (activeId ? chatService.getThread(activeId) : Promise.resolve(null)),
    [activeId, key],
  )
  const settings = useAsyncData(() => (panel === 'settings' || panel === 'privacy' || panel === 'notifications' ? chatService.getMore() : Promise.resolve(null)), [panel])
  /* Mapendeleo ya mwonekano: default kutoka chatSettings, override ya mtumiaji ikishinda */
  const chatPrefs = useAsyncData(() => chatService.getMore(), [panel])
  const paperDefault = chatPrefs?.settings?.appearance?.find((a) => a.id === 'paperView')?.on
  const paperOn = (chatPrefs?.settings?.overrides?.paperView ?? paperDefault) === true
  const dataSaved = useAsyncData(() => systemService.getDataSavedBrief(), [key])

  const conversations = inbox?.conversations || []
  const activeConv = thread?.conversation

  const openConversation = (id) => {
    setActiveId(id)
    close()
  }

  /* ── Vitendo vinavyobadilisha data ───────────────────────── */
  const send = async (payload) => {
    if (!activeId) return
    setBusy(true)
    const res = await chatService.sendMessage(activeId, payload)
    setBusy(false)
    const label = chatService.MESSAGE_STATES[res.message?.state]?.label
    onToast?.(label ? `Ujumbe: ${label}` : 'Ujumbe umetumwa')
    refresh()
  }

  const react = async (msgId, reaction) => {
    await chatService.reactToMessage(activeId, msgId, reaction)
    refresh()
  }

  const resolveMedia = async (msgId, choice) => {
    await chatService.resolveMedia(activeId, msgId, choice)
    onToast?.(
      choice === 'data-now'
        ? 'Inatumwa kwa Data yako — uamuzi wako'
        : choice === 'mesh'
          ? 'Inatumwa kwa Local Mesh (bila data)'
          : 'Imehifadhiwa — inasubiri Wi-Fi',
    )
    refresh()
  }

  const attach = async (convId) => {
    const g = await chatService.attachMedia(convId)
    setGuard(g)
    go('mediaguard')
    refresh() /* ujumbe mpya unaonekana kwenye thread (inasubiri chaguo) */
  }

  /* Sauti: hali inahifadhiwa kwenye kikao (hakuna kichezaji cha sauti bado). */
  const playAudio = (m, playing) => {
    onToast?.(playing ? 'Sauti inasikilizwa — hali imewekwa kwenye kikao hiki' : 'Umesimamisha sauti')
  }

  /* Faili/hifadhi kwenye kifaa — hali halisi ya ujumbe. */
  const saveOffline = async (m) => {
    if (m.savedOffline) {
      onToast?.(`${m.doc?.name || 'Faili'} tayari iko kwenye kifaa`)
      return
    }
    await chatService.saveMessageOffline(activeId, m.id)
    onToast?.(`${m.doc?.name || 'Faili'} imehifadhiwa kwenye kifaa — inapatikana bila mtandao`)
    refresh()
  }

  /* Kufuta ujumbe: kwangu pekee. */
  const deleteMessage = async (msgId) => {
    await chatService.deleteMessage(activeId, msgId)
    onToast?.('Ujumbe umefutwa kwako pekee — mwenzako anaendelea kuuona')
    refresh()
  }

  const startDirect = async (accountId) => {
    const res = await chatService.startDirect(accountId)
    close()
    setActiveId(res.conversation.id)
    onToast?.(res.created ? `Mazungumzo mapya na ${res.conversation.title}` : `Mazungumzo na ${res.conversation.title}`)
    refresh()
  }

  const createGroup = async ({ name, members, tone }) => {
    const created = await chatService.createGroup({ name, members, tone })
    close()
    setActiveId(created.id)
    onToast?.(`Kikundi “${created.title}” kimeundwa — wanachama ${members.length}`)
    refresh()
  }

  /* ── Panel stack (Sheet ileile) ──────────────────────────── */
  const panelDef = useMemo(() => {
    switch (panel) {
      case 'newchat':
        return {
          title: 'New Chat',
          subtitle: 'Saved Friends · PASIHAI Friends · simu · namba',
          body: (
            <NewChatPanel
              onStart={startDirect}
              onInvite={() => refresh()}
              onNewGroup={() => go('newgroup')}
              onRequests={() => go('requests')}
              onToast={onToast}
            />
          ),
        }
      case 'call':
        return {
          title: 'Sauti na mwito',
          subtitle: 'Njia halisi zinazopatikana sasa',
          back: true,
          body: (
            <CallBody
              conv={activeConv}
              onVoiceMessage={(id) => attach(id)}
              onClose={close}
              onToast={onToast}
            />
          ),
        }
      case 'newgroup':
        return {
          title: 'Kikundi Kipya',
          subtitle: 'Jina · wanachama · tafuta',
          back: true,
          body: <NewGroupPanel onCreate={createGroup} onToast={onToast} />,
        }
      case 'requests':
        return {
          title: 'Maombi ya mazungumzo',
          subtitle: 'Ulinzi wa faragha — kubali · kataa · zuia',
          back: true,
          body: <RequestsPanel onToast={(m) => { onToast?.(m); refresh() }} />,
        }
      case 'search':
        return {
          title: 'Tafuta kwenye Chat',
          subtitle: 'Mazungumzo · ujumbe · watu (si Gundua)',
          body: (
            <SearchPanel
              onOpenConversation={openConversation}
              onStart={startDirect}
              onToast={onToast}
            />
          ),
        }
      case 'more':
        return {
          title: 'Chat — menyu zaidi',
          subtitle: 'Chat pekee: settings · faragha · taarifa · archives',
          body: <MorePanel onOpen={(id) => go(id)} onToast={onToast} />,
        }
      case 'settings':
        return {
          title: 'Mipangilio ya Chat',
          subtitle: 'Sauti · storage · ulinzi',
          back: true,
          body: <SettingsBody view={settings} onToast={onToast} />,
        }
      case 'privacy':
        return {
          title: 'Faragha',
          subtitle: 'Nani anaweza kutuma ombi',
          back: true,
          body: <PrivacyBody view={settings} onToast={onToast} />,
        }
      case 'notifications':
        return {
          title: 'Taarifa za Chat',
          subtitle: 'Sauti na kimya',
          back: true,
          body: <NotificationsBody view={settings} onToast={onToast} />,
        }
      case 'archived':
        return {
          title: 'Chats zilizohifadhiwa',
          subtitle: 'Archived — zimewekwa kando, hazijafutwa',
          back: true,
          body: <ArchivedBody onToast={onToast} onRefresh={refresh} />,
        }
      case 'blocked':
        return { title: 'Waliotiwa marufuku', subtitle: 'Blocked contacts', back: true, body: <BlockedBody onToast={onToast} /> }
      case 'storage':
        return { title: 'Storage na media', subtitle: 'Offline Vault · Data Saved', back: true, body: <StorageBody onToast={onToast} /> }
      case 'markall':
        return {
          title: 'Zote kama zimesomwa',
          subtitle: 'Vitendo',
          back: true,
          body: (
            <div className="psh-panelstack">
              <button
                type="button"
                className="psh-btn psh-btn--primary"
                onClick={async () => {
                  await chatService.markAllRead()
                  onToast?.('Zote zimewekwa kama zimesomwa')
                  back()
                  refresh()
                }}
              >
                Weka zote kama zimesomwa
              </button>
            </div>
          ),
        }
      case 'mediaguard':
        return {
          title: 'Kutuma media',
          subtitle: 'Sera ya Internet Relay — hakuna kubadili kimya kimya',
          back: true,
          body: (
            <MediaGuardBody
              guard={guard}
              onChoose={(choice) => {
                const msg = guard?.message
                close()
                if (msg) resolveMedia(msg.id, choice)
                else onToast?.('Chagua njia kwenye ujumbe unaosubiri')
              }}
              onToast={onToast}
            />
          ),
        }
      default:
        return null
    }
  }, [panel, settings, guard, thread, onToast]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="psh-col">
      <div
        className={`psh-chat ${paperOn ? 'psh-chat--paper' : ''}`}
        data-mobile-view={activeId ? 'thread' : 'list'}
      >
        {/* ══ PANE 1: Inbox ═══════════════════════════════════ */}
        <section className="psh-chat__pane psh-chat__pane--list" aria-label="Orodha ya mazungumzo">
          <header className="psh-chat__head">
            <div className="psh-chat__headleft">
              <h1 className="psh-chat__title">Chat</h1>
              {inbox ? (
                <span className="psh-chat__sync">
                  <span className={`psh-chat__syncdot psh-chat__syncdot--${DOT[inbox.system.state] || 'off'}`} aria-hidden="true" />
                  {inbox.system.state === 'LOCAL' ? 'Sync' : inbox.system.label}
                </span>
              ) : null}
            </div>
            <div className="psh-chat__headactions">
              <button type="button" className="psh-icobtn" aria-label="Tafuta kwenye Chat" onClick={() => go('search')}>
                <IconSearchSmall size={20} />
              </button>
              <button type="button" className="psh-icobtn" aria-label="Menyu zaidi za Chat" onClick={() => go('more')}>
                <IconMoreVertical size={20} />
              </button>
            </div>
          </header>

          {inbox ? (
            <div className="psh-chat__sysline" aria-label="Hali ya mfumo">
              <span className={`psh-chat__syschip ${inbox.system.state === 'LOCAL' || inbox.system.state === 'ONLINE' ? 'psh-chat__syschip--ok' : ''}`}>
                <IconRadar size={12} />
                <b>{inbox.system.label}</b>
              </span>
              <span className="psh-chat__syschip">
                <IconShield size={12} />
                Data Saved <b>{dataSaved ? `${dataSaved.total} MB` : '—'}</b>
              </span>
              <span className="psh-chat__syschip">
                <IconInfo size={12} />
                {inbox.system.transport}
              </span>
            </div>
          ) : null}

          <button type="button" className="psh-chat__search" onClick={() => go('search')}>
            <IconSearchSmall size={17} />
            Tafuta mazungumzo na jumbe…
          </button>

          <div className="psh-chat__filters" role="radiogroup" aria-label="Vichujio vya Chat">
            {(inbox?.filters || []).map((f) => (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={filter === f.id}
                className={`psh-chat__filter ${filter === f.id ? 'is-active' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
                {f.id === 'haijasomwa' && inbox?.counts.haijasomwa ? <span className="psh-chat__filterdot" /> : null}
                {inbox ? <span className="psh-chat__filtercount">{inbox.counts[f.id]}</span> : null}
              </button>
            ))}
          </div>

          <div className="psh-chat__list">
            {conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`psh-chat__row ${activeId === c.id ? 'is-active' : ''}`}
                onClick={() => openConversation(c.id)}
              >
                <ChatAvatar
                  tone={c.tone}
                  name={c.title}
                  icon={c.type === 'group' ? c.groupIcon : null}
                  online={c.type === 'direct' ? true : undefined}
                />
                <span className="psh-chat__rowmain">
                  <span className="psh-chat__rowtop">
                    <span className="psh-chat__rowname">{c.title}</span>
                    {c.relationship === 'saved' ? (
                      <span className="psh-chip psh-chip--gold">Saved</span>
                    ) : c.type === 'group' ? (
                      <span className="psh-chip psh-chip--soft">Kikundi</span>
                    ) : null}
                  </span>
                  {c.parentContext ? (
                    <span className="psh-chat__context">
                      {c.parentContext.type === 'hub' ? <IconHub size={12} /> : <IconSpaces size={12} />}
                      Kikundi · {c.parentContext.label}
                    </span>
                  ) : null}
                  <span className="psh-chat__rowtext">{c.last?.text}</span>
                </span>
                <span className="psh-chat__rowmeta">
                  <span className="psh-chat__rowtime">{c.last?.at || c.updatedAt}</span>
                  {c.unread ? <span className="psh-chat__unread">{c.unread}</span> : null}
                </span>
              </button>
            ))}

            {conversations.length === 0 ? (
              <div className="psh-empty">
                <IconSearchSmall size={24} />
                <p>Hakuna mazungumzo kwenye kichujio hiki.</p>
              </div>
            ) : null}
          </div>

          <button type="button" className="psh-chat__fab" onClick={() => go('newchat')}>
            <IconPlus size={18} /> New Chat
          </button>

        </section>

        {/* ══ PANE 2: Thread ══════════════════════════════════ */}
        <section className="psh-chat__pane psh-chat__pane--thread" aria-label="Mazungumzo">
          <Thread
            view={thread}
            busy={busy}
            onBack={() => setActiveId(null)}
            onSend={send}
            onReact={react}
            onResolveMedia={resolveMedia}
            onAttach={attach}
            onMore={() => go('more')}
            onToast={onToast}
          />
        </section>
      </div>

      {/* Panels — Sheet ileile ya app */}
      <Sheet
        open={!!panelDef}
        onClose={close}
        onBack={panelDef?.back ? back : undefined}
        title={panelDef?.title}
        subtitle={panelDef?.subtitle}
      >
        {panelDef?.body}
      </Sheet>
    </div>
  )
}
