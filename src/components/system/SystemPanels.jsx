// ══════════════════════════════════════════════════════════════
// PASIHAI — SYSTEM PANELS (Data Saved · System · Relay · Nearby ·
// Sync · Save Offline · Share Nearby · Activity)
//
// Panels zote zinatumia **Sheet** ileile ya App (panel mechanism
// MOJA). Hakuna route mpya, hakuna nav mpya, hakuna popover ya pili.
//
// Data inatoka kwa systemService. Sehemu za "Body" zimejitenga na
// kukubali `view` tayari — ili (a) ziwe rahisi kupima, (b) UI
// isiwe na mantiki ya data.
// ══════════════════════════════════════════════════════════════

import { useState } from 'react'

import useAsyncData from '../../hooks/useAsyncData.js'
import { systemService } from '../../services/systemService.js'
import { formatMb } from '../../utils/format.js'
import {
  IconArrowRight,
  IconBolt,
  IconCheck,
  IconDatabase,
  IconDownload,
  IconInfo,
  IconRadar,
  IconRefresh,
  IconRelay,
  IconShare,
  IconShield,
  IconTimer,
  IconFile,
  IconGrid,
  IconChat,
  IconPhoto,
  IconHeart,
  IconComment,
  IconReel,
  IconVideo,
  IconMic,
} from '../icons.jsx'
import { Chip, Identity, Segmented } from '../ui.jsx'
import { Switch } from '../panels.jsx'

/* ── Ramani za iconi ──────────────────────────────────────── */

const ACTION_ICON = {
  relay: IconRelay,
  nearby: IconRadar,
  sync: IconRefresh,
  saveoffline: IconDownload,
  sharenearby: IconShare,
  activity: IconBolt,
}

const KIND_ICON = {
  message: IconChat,
  post: IconGrid,
  photo: IconPhoto,
  reaction: IconHeart,
  comment: IconComment,
  reel: IconReel,
  video: IconVideo,
  audio: IconMic,
  document: IconFile,
  receiving: IconDownload,
  sending: IconShare,
  relay: IconRelay,
  sync: IconRefresh,
  cache: IconDatabase,
  queued: IconTimer,
  sharing: IconShare,
}

const SCOPE_LABEL = { today: 'Today', week: 'Week', month: 'Month' }

const STATE_LABEL = {
  waiting: 'WAITING',
  sending: 'SENDING',
  synced: 'SYNCED',
  failed: 'FAILED',
}

const STATE_TONE = {
  waiting: 'waiting',
  sending: 'sending',
  synced: 'synced',
  failed: 'failed',
}

/* ══════════════════════════════════════════════════════════════
   1) DATA SAVED — maelezo ya data iliyoepushwa
   ══════════════════════════════════════════════════════════════ */

export function DataSavedBody({ view, scope, onScope, onToast }) {
  if (!view) return null
  const { breakdown, impact, cache } = view

  return (
    <div className="psh-panelstack">
      <h3 className="psh-panelstack__h">DATA SAVING</h3>

      <div className="psh-sys-metric">
        <strong>{formatMb(view.total)}</strong>
        <span>Data ya internet iliyoepushwa · {SCOPE_LABEL[scope] || scope}</span>
      </div>

      <Segmented name="Kipimo cha Data Saved" options={view.scopes} value={scope} onChange={onScope} />

      <ul className="psh-sys-break">
        {breakdown.map((row) => (
          <li key={row.id}>
            <span className="psh-sys-break__text">
              <span className="psh-sys-break__label">{row.label}</span>
              <span className="psh-sys-break__hint">{row.hint}</span>
            </span>
            <strong>{formatMb(row.mb)}</strong>
          </li>
        ))}
      </ul>

      <h3 className="psh-panelstack__h">Athari kwa mtandao</h3>
      <ul className="psh-sys-impact">
        {impact.map((row) => (
          <li key={row.id}>
            <strong>{row.value}</strong>
            <span>{row.label}</span>
          </li>
        ))}
      </ul>

      <h3 className="psh-panelstack__h">Saved ≠ Cached</h3>
      <ul className="psh-kv">
        <li>
          <span>Uliyohifadhi kwa mkono (Zilizohifadhiwa)</span>
          <strong>
            {cache.savedItems} vitu · {formatMb(cache.savedMb)}
          </strong>
        </li>
        <li>
          <span>Content iliyobaki kwa ufanisi (cache)</span>
          <strong>
            {cache.cachedItems} vitu · {formatMb(cache.cachedMb)}
          </strong>
        </li>
      </ul>
      <p className="psh-note">
        <IconInfo size={16} />
        {cache.note}
      </p>

      <p className="psh-note">
        <IconInfo size={16} />
        {view.meaning} {view.notMeaning}
      </p>

      <p className="psh-panelstack__foot">
        <IconDatabase size={16} />
        Namba hizi ni za majaribio. Uhasibu halisi wa bytes utakuja kupitia service ileile.
      </p>
    </div>
  )
}

export function DataSavedPanel({ onToast }) {
  const [scope, setScope] = useState('today')
  const view = useAsyncData(() => systemService.getDataSaved(scope), [scope])

  return <DataSavedBody view={view} scope={scope} onScope={setScope} onToast={onToast} />
}

/* ══════════════════════════════════════════════════════════════
   2) SYSTEM — hali + vitendo vinavyofaa SASA
   ══════════════════════════════════════════════════════════════ */

export function SystemStatusBlock({ connection, transports }) {
  const tone = connection.state === 'OFFLINE' ? 'off' : connection.state === 'LIMITED' ? 'gold' : 'ok'
  const active = transports.find((t) => t.available && t.id !== 'internet')
  return (
    <div className="psh-sys-status">
      <span className={`psh-sys-status__dot psh-sys-status__dot--${tone}`} aria-hidden="true" />
      <span className="psh-sys-status__text">
        <span className="psh-sys-status__label">{connection.label}</span>
        <span className="psh-sys-status__detail">{connection.detail}</span>
      </span>
      <Chip tone="soft">{active ? active.label : connection.transport}</Chip>
    </div>
  )
}

export function SystemBody({ view, onOpen, onToast }) {
  if (!view) return null
  const { quickActions, connection, transports } = view

  return (
    <div className="psh-panelstack">
      <h3 className="psh-panelstack__h">PASIHAI SYSTEM</h3>

      <SystemStatusBlock connection={connection} transports={transports} />

      <ul className="psh-sys-actions">
        {quickActions.map((a) => {
          const Icon = ACTION_ICON[a.id] || IconBolt
          const off = !a.available
          return (
            <li key={a.id}>
              <button
                type="button"
                className={`psh-sys-act ${off ? 'is-off' : ''} ${a.tone === 'attention' ? 'is-attention' : ''}`}
                onClick={() => !off && onOpen(a.id)}
                disabled={off}
                aria-disabled={off || undefined}
                aria-haspopup={off ? undefined : 'dialog'}
              >
                <span className="psh-sys-act__icon">
                  <Icon size={19} />
                </span>
                <span className="psh-sys-act__text">
                  <span className="psh-sys-act__label">{a.label}</span>
                  <span className="psh-sys-act__hint">{off ? a.reason : a.hint}</span>
                </span>
                {a.badge ? <span className="psh-sys-act__badge">{a.badge}</span> : null}
                {off ? null : <IconArrowRight size={17} />}
              </button>
            </li>
          )
        })}
      </ul>

      <p className="psh-note">
        <IconInfo size={16} />
        PASIHAI huchagua njia inayofaa yenyewe — Wi-Fi ya karibu, Wi-Fi Direct, Bluetooth au relay
        iliyoidhinishwa. Huhitaji kuchagua kila mara.
      </p>

      <p className="psh-panelstack__foot">
        <IconDatabase size={16} />
        Data Saved ({formatMb(view.dataSaved.total)}) na Relay ni sehemu ya mfumo mmoja — si kurasa
        tofauti.
      </p>
    </div>
  )
}

export function SystemPanel({ onOpen, onToast }) {
  const view = useAsyncData(() => systemService.getSnapshot(), [])
  return <SystemBody view={view} onOpen={onOpen} onToast={onToast} />
}

/* ══════════════════════════════════════════════════════════════
   3) RELAY — sera: Internet Relay = UJUMBE MFUPI PEKEE (≤5 MB/siku)
      · Local Mesh  = content ya karibu (video · picha · sauti …)
      · Internet Relay = maandishi · metadata · uelekezaji mdogo
   ══════════════════════════════════════════════════════════════ */

/* Baa ndogo ya matumizi (used / limit) */
function UsMeter({ used, limit, label }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0
  return (
    <div className="psh-sys-meter" role="img" aria-label={`${used} MB kati ya ${limit} MB imetumika`}>
      <div className="psh-sys-meter__track">
        <span className="psh-sys-meter__fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="psh-sys-meter__cap">{label}</span>
    </div>
  )
}

export function RelayBody({ view, onEnable, onLimit, onChoice, onRelayMessage, onToast }) {
  if (!view) return null
  const {
    policy,
    localMesh,
    internetRelay: ir,
    messages,
    choices,
    transports,
    separation,
  } = view

  const localTransports = transports.filter((t) => t.scope === 'local')
  const internetTransport = transports.find((t) => t.scope === 'internet')

  return (
    <div className="psh-panelstack">
      <h3 className="psh-panelstack__h">RELAY</h3>
      <p className="psh-panelstack__lead">{view.purpose}</p>

      {/* ── Local Mesh (content ya karibu) ─────────────────── */}
      <div className="psh-sys-block">
        <div className="psh-sys-status psh-sys-status--bare">
          <span
            className={`psh-sys-status__dot psh-sys-status__dot--${
              localMesh.status === 'active' ? 'ok' : localMesh.status === 'off' ? 'off' : 'gold'
            }`}
            aria-hidden="true"
          />
          <span className="psh-sys-status__text">
            <span className="psh-sys-status__label">Local Mesh</span>
            <span className="psh-sys-status__detail">
              {localMesh.label} — {localMesh.detail}
            </span>
          </span>
        </div>
        <p className="psh-sys-kicker">Inaweza kubeba (bila data ya simu)</p>
        <ul className="psh-sys-chips">
          {localMesh.kinds.map((k) => (
            <li key={k.id}>
              <Chip tone="soft">{k.label}</Chip>
            </li>
          ))}
        </ul>
        <ul className="psh-sys-lines">
          {localMesh.rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <ul className="psh-kv">
          <li>
            <span>Local data relayed</span>
            <strong>{formatMb(localMesh.stats.dataRelayedMb)}</strong>
          </li>
          <li>
            <span>Devices helped</span>
            <strong>{localMesh.stats.devicesHelped}</strong>
          </li>
        </ul>
      </div>

      {/* ── Internet Relay (ujumbe mfupi pekee) ────────────── */}
      <div className="psh-sys-block">
        <div className="psh-sys-irhead">
          <span className="psh-sys-status__text">
            <span className="psh-sys-status__label">Internet Relay</span>
            <span className="psh-sys-status__detail">
              Ujumbe mfupi pekee — si mfumo wa kupeleka faili
            </span>
          </span>
          <Switch
            on={ir.enabled}
            onChange={(v) => onEnable(v)}
            label="Internet Relay"
          />
        </div>

        {ir.state === 'off' ? (
          <p className="psh-sys-alert psh-sys-alert--off">
            <IconInfo size={16} />
            <span>
              <b>Off</b> — haitumiki hadi uwashe. Ukiwasha: PASIHAI inaweza kutumia hadi kikomo
              ulichochagua kwa siku kusaidia ujumbe unaostahili.
            </span>
          </p>
        ) : null}

        {ir.state === 'limit_reached' ? (
          <p className="psh-sys-alert psh-sys-alert--limit">
            <IconTimer size={16} />
            <span>
              <b>{policy.messages.limitReached}</b> — Internet Relay paused: {ir.limitMb} MB /{' '}
              {ir.limitMb} MB imetumika. Hakuna trafiki zaidi leo.
            </span>
          </p>
        ) : null}

        <p className="psh-sys-kicker">Daily Internet limit</p>
        <Segmented
          name="Ukomo wa Internet Relay kwa siku"
          options={policy.optionsMb.map((mb) => ({ id: String(mb), label: `${mb} MB / day` }))}
          value={String(ir.limitMb)}
          onChange={(v) => onLimit(Number(v))}
        />
        <p className="psh-sys-foot-note">Maximum allowed {policy.hardMaxMb} MB / day</p>

        <UsMeter
          used={ir.usedMb}
          limit={ir.limitMb}
          label={`Used today ${ir.usedMb} MB · Remaining ${ir.remainingMb} MB`}
        />

        <ul className="psh-kv">
          <li>
            <span>Messages relayed</span>
            <strong>{ir.messagesRelayed}</strong>
          </li>
          <li>
            <span>Internet data used</span>
            <strong>{formatMb(ir.usedMb)}</strong>
          </li>
        </ul>

        <p className="psh-sys-foot-note">
          Ujumbe mmoja: hadi {policy.maxMessageKb} KB (ulioboreshwa). Ukizidi:{' '}
          <i>{policy.messages.tooLarge}</i>
        </p>
      </div>

      {/* ── Sera ya ujumbe ─────────────────────────────────── */}
      <h3 className="psh-panelstack__h">Sera ya ujumbe</h3>
      <ul className="psh-sys-policy">
        {policy.eligible.map((e) => (
          <li key={e.id} className="is-ok">
            <span className="psh-sys-policy__mark" aria-hidden="true">
              ✓
            </span>
            <span className="psh-sys-break__text">
              <span className="psh-sys-break__label">{e.label}</span>
              <span className="psh-sys-break__hint">{e.hint}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="psh-sys-kicker">Hairuhusiwi kabisa</p>
      <ul className="psh-sys-chips psh-sys-chips--blocked">
        {policy.ineligible.map((e) => (
          <li key={e.id}>
            <Chip tone="neutral">{e.label}</Chip>
          </li>
        ))}
      </ul>

      <p className="psh-sys-kicker">Kipaumbele</p>
      <ol className="psh-sys-prior">
        {policy.priorities.map((p, i) => (
          <li key={p}>
            <span className="psh-sys-prior__num" aria-hidden="true">
              {i + 1}
            </span>
            {p}
          </li>
        ))}
      </ol>
      <p className="psh-sys-foot-note">{policy.messages.noAutoFallback}</p>

      {/* ── Uboreshaji wa ujumbe ───────────────────────────── */}
      <h3 className="psh-panelstack__h">Uboreshaji (optimization)</h3>
      <ul className="psh-sys-lines">
        {policy.optimization.map((o) => (
          <li key={o}>{o}</li>
        ))}
      </ul>
      <p className="psh-sys-foot-note">
        Lengo: bytes ndogo iwezekanavyo kwa ujumbe unaofika — bila kupunguza usahihi wala usalama.
      </p>

      {/* ── Foleni ya relay (ujumbe mfupi) ─────────────────── */}
      <h3 className="psh-panelstack__h">Ujumbe wa relay</h3>
      <p className="psh-sys-foot-note">Relay ikikubali ujumbe bado haimaanishi kwamba umefika kwa mpokeaji.</p>
      <ul className="psh-sys-items">
        {messages.map((m) => {
          const Icon = KIND_ICON[m.kind] || IconGrid
          const canSend = ir.enabled && !ir.reached && m.state === 'waiting'
          return (
            <li key={m.id}>
              <span className="psh-sys-items__icon">
                <Icon size={17} />
              </span>
              <span className="psh-sys-break__text">
                <span className="psh-sys-break__label">{m.label}</span>
                <span className="psh-sys-break__hint">
                  {m.rawKb} KB → {m.compactKb} KB (iliyoboreshwa)
                </span>
              </span>
              {canSend ? (
                <button
                  type="button"
                  className="psh-btn psh-btn--sm"
                  onClick={() => onRelayMessage(m)}
                >
                  Peleka relay
                </button>
              ) : (
                <span className={`psh-sys-state psh-sys-state--${m.state === 'relayed' ? 'synced' : 'waiting'}`}>
                  {m.state === 'relayed' ? 'RELAY IMEKUBALI' : 'INASUBIRI RELAY'}
                </span>
              )}
            </li>
          )
        })}
      </ul>

      {/* ── Chaguo za mawasiliano ──────────────────────────── */}
      <h3 className="psh-panelstack__h">Chaguo za mawasiliano</h3>
      <ul className="psh-switchrows">
        {choices.map((c) => (
          <li key={c.id}>
            <span className="psh-sys-switchrow">
              <span className="psh-switchrows__label">{c.label}</span>
              <span className="psh-sys-switchrow__hint">{c.hint}</span>
            </span>
            <Switch on={c.on} onChange={(v) => onChoice(c.id, v)} label={c.label} />
          </li>
        ))}
      </ul>

      {/* ── Njia ───────────────────────────────────────────── */}
      <h3 className="psh-panelstack__h">Njia (transport)</h3>
      <ul className="psh-sys-transports">
        {[...localTransports, internetTransport].filter(Boolean).map((t) => (
          <li key={t.id} className={t.available ? '' : 'is-off'}>
            <span className="psh-sys-transports__text">
              <span className="psh-sys-break__label">{t.label}</span>
              <span className="psh-sys-break__hint">
                {t.available ? t.hint : t.reason || t.hint}
              </span>
            </span>
            <Chip tone={t.available ? 'green' : 'soft'}>
              {t.available ? 'Inapatikana' : 'Haipatikani'}
            </Chip>
          </li>
        ))}
      </ul>

      {/* ── Ufafanuzi: Relay ≠ Data Saved ──────────────────── */}
      <h3 className="psh-panelstack__h">Relay Data Used ≠ Data Saved</h3>
      <ul className="psh-kv">
        <li>
          <span>Relay Data Used (leo)</span>
          <strong>{formatMb(separation.relayUsedMb)}</strong>
        </li>
        <li>
          <span>Data Saved (leo)</span>
          <strong>{formatMb(separation.dataSavedMb)}</strong>
        </li>
      </ul>
      <p className="psh-note">
        <IconInfo size={16} />
        {separation.note}
      </p>
      <p className="psh-note">
        <IconShield size={16} />
        {view.guardrail}
      </p>
      <p className="psh-panelstack__foot">
        <IconInfo size={16} />
        {view.measurable}
      </p>
    </div>
  )
}

export function RelayPanel({ onToast }) {
  const [view, setView] = useState(null)
  const initial = useAsyncData(() => systemService.getRelay(), [])
  const shown = view || initial
  if (!shown) return null

  const reload = async () => setView(await systemService.getRelay())

  const setEnable = async (on) => {
    await systemService.setInternetRelayEnabled(on)
    onToast?.(
      on
        ? 'Internet Relay imewashwa — ujumbe mfupi pekee, hadi kikomo ulichochagua'
        : 'Internet Relay imezimwa',
    )
    await reload()
  }

  const setLimit = async (mb) => {
    const res = await systemService.setRelayDailyLimit(mb)
    onToast?.(res.ok ? res.message : `Imekataliwa: ${res.message}`)
    await reload()
  }

  const setChoice = async (id, on) => {
    await systemService.setRelayChoice(id, on)
    await reload()
  }

  const relayOne = async (m) => {
    const res = await systemService.relayMessage({ kind: m.kind, kb: m.rawKb, label: m.label })
    onToast?.(
      res.ok
        ? `Imepitishwa: ${m.rawKb} KB → ${res.optimizedKb} KB · imesalia ${res.relay.remainingMb} MB`
        : res.message,
    )
    await reload()
  }

  return (
    <RelayBody
      view={shown}
      onEnable={setEnable}
      onLimit={setLimit}
      onChoice={setChoice}
      onRelayMessage={relayOne}
      onToast={onToast}
    />
  )
}

/* ══════════════════════════════════════════════════════════════
   4) NEARBY — kile kifaa kinachokiona SASA (si ugunduzi mkuu)
   ══════════════════════════════════════════════════════════════ */

export function NearbyBody({ view, onToast }) {
  if (!view) return null
  return (
    <div className="psh-panelstack">
      <h3 className="psh-panelstack__h">NEARBY</h3>

      {view.available ? (
        <>
          {view.people.length ? (
            <>
              <h3 className="psh-panelstack__h">Watu</h3>
              <ul className="psh-sys-people">
                {view.people.map((p) => (
                  <li key={p.userId}>
                    <Identity
                      user={p.user}
                      subtitle={p.meta}
                      pill={
                        p.user?.type && p.user.type !== 'friend' ? (
                          <Chip tone="soft">{p.user.type === 'business' ? 'Biashara' : 'Channel'}</Chip>
                        ) : null
                      }
                    />
                    <button
                      type="button"
                      className="psh-btn psh-btn--sm"
                      onClick={() => onRequestShare?.(p)}
                    >
                      Peana faili
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {view.content.length ? (
            <>
              <h3 className="psh-panelstack__h">Content inapatikana</h3>
              <ul className="psh-sys-items">
                {view.content.map((c) => (
                  <li key={c.id}>
                    <span className="psh-sys-items__icon">
                      <IconGrid size={17} />
                    </span>
                    <span className="psh-sys-break__text">
                      <span className="psh-sys-break__label">{c.label}</span>
                      <span className="psh-sys-break__hint">{c.meta}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {view.hubs.length ? (
            <>
              <h3 className="psh-panelstack__h">Hubs / vikundi</h3>
              <ul className="psh-sys-items">
                {view.hubs.map((h) => (
                  <li key={h.id}>
                    <span className="psh-sys-items__icon">
                      <IconRadar size={17} />
                    </span>
                    <span className="psh-sys-break__text">
                      <span className="psh-sys-break__label">{h.label}</span>
                      <span className="psh-sys-break__hint">{h.meta}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      ) : (
        <div className="psh-empty">
          <IconRadar size={26} />
          <p>Hakuna kifaa kinachoonekana karibu sasa.</p>
        </div>
      )}

      {view.notes.length ? (
        <ul className="psh-sys-lines">
          {view.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}

      <p className="psh-note">
        <IconInfo size={16} />
        {view.note}
      </p>
    </div>
  )
}

export function NearbyPanel({ onToast }) {
  const view = useAsyncData(() => systemService.getNearby(), [])
  return <NearbyBody view={view} onToast={onToast} />
}

/* ══════════════════════════════════════════════════════════════
   5) SYNC — foleni ya vitendo (queue) + Sync now
   ══════════════════════════════════════════════════════════════ */

export function SyncBody({ view, busy, onSync, onToast }) {
  if (!view) return null
  const canSync = view.connection?.state !== 'OFFLINE'
  return (
    <div className="psh-panelstack">
      <h3 className="psh-panelstack__h">SYNC</h3>

      <div className="psh-sys-metric psh-sys-metric--sm">
        <strong>{view.pending}</strong>
        <span>
          {view.pending === 1 ? 'Kitu kinasubiri' : 'Vitu vinasubiri'} · Sync ya mwisho {view.lastSync}
        </span>
      </div>

      {view.items.length ? (
        <ul className="psh-sys-items psh-sys-items--queue">
          {view.items.map((i) => {
            const Icon = KIND_ICON[i.kind] || IconGrid
            return (
              <li key={i.id}>
                <span className="psh-sys-items__icon">
                  <Icon size={17} />
                </span>
                <span className="psh-sys-break__text">
                  <span className="psh-sys-break__label">{i.label}</span>
                  <span className="psh-sys-break__hint">
                    {i.detail} · {i.at}
                  </span>
                </span>
                <span className={`psh-sys-state psh-sys-state--${STATE_TONE[i.state]}`}>
                  {STATE_LABEL[i.state] || i.state}
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="psh-empty">
          <IconCheck size={26} />
          <p>Hakuna kinachosubiri. Kila kitu kimepelekwa.</p>
        </div>
      )}

      {!canSync ? (
        <p className="psh-note">
          <IconInfo size={16} />
          Sync inahitaji mtandao. Vitendo vinasubiri — vitapelekwa mtandao ukirudi, na hutaipoteza.
        </p>
      ) : null}

      <div className="psh-panelstack__actions">
        <button
          type="button"
          className="psh-btn psh-btn--primary"
          onClick={onSync}
          disabled={busy || !canSync}
          aria-disabled={busy || !canSync || undefined}
        >
          <IconRefresh size={17} />
          {busy ? 'Inatuma…' : 'Sync now'}
        </button>
        {view.counts.failed ? (
          <Chip tone="soft">{view.counts.failed} failed — jaribu tena</Chip>
        ) : null}
      </div>

      <ul className="psh-kv">
        <li>
          <span>Zinasubiri (waiting)</span>
          <strong>{view.counts.waiting}</strong>
        </li>
        <li>
          <span>Zinatuma (sending)</span>
          <strong>{view.counts.sending}</strong>
        </li>
        <li>
          <span>Zimekamilika (synced)</span>
          <strong>{view.counts.synced}</strong>
        </li>
      </ul>
    </div>
  )
}

export function SyncPanel({ onToast }) {
  const [state, setState] = useState(null)
  const [busy, setBusy] = useState(false)
  const initial = useAsyncData(() => systemService.getQueue(), [])
  const view = state || initial

  const onSync = async () => {
    setBusy(true)
    const next = await systemService.syncNow()
    setState(next)
    setBusy(false)
    onToast?.(
      next.counts.pending
        ? `Sync imekamilika — ${next.counts.synced} zimepelekwa, ${next.counts.pending} zinasubiri mtandao`
        : `Sync imekamilika — vitendo ${next.counts.synced} vimepelekwa`,
    )
  }

  return <SyncBody view={view} busy={busy} onSync={onSync} onToast={onToast} />
}

/* ══════════════════════════════════════════════════════════════
   6) SAVE OFFLINE — hifadhi kwa matumizi bila mtandao
   ══════════════════════════════════════════════════════════════ */

export function SaveOfflineBody({ view, onSave, onToast }) {
  if (!view) return null
  return (
    <div className="psh-panelstack">
      <h3 className="psh-panelstack__h">SAVE OFFLINE</h3>
      <p className="psh-panelstack__lead">
        Hifadhi content kabla ya kupoteza mtandao. Ukishahifadhiwa, inapatikana bila internet.
      </p>

      {!view.canFetch ? (
        <p className="psh-note">
          <IconInfo size={16} />
          {view.reason}
        </p>
      ) : null}

      <ul className="psh-sys-items">
        {view.items.map((i) => (
          <li key={i.id}>
            <span className="psh-sys-items__icon">
              <IconDownload size={17} />
            </span>
            <span className="psh-sys-break__text">
              <span className="psh-sys-break__label">{i.label}</span>
              <span className="psh-sys-break__hint">{i.meta}</span>
            </span>
            {i.saved ? (
              <Chip tone="green">Imehifadhiwa</Chip>
            ) : (
              <button
                type="button"
                className="psh-btn psh-btn--sm"
                onClick={() => onSave(i.id)}
                disabled={!view.canFetch}
                aria-disabled={!view.canFetch || undefined}
              >
                Hifadhi
              </button>
            )}
          </li>
        ))}
      </ul>

      <p className="psh-panelstack__foot">
        <IconInfo size={16} />
        {view.note}
      </p>
    </div>
  )
}

export function SaveOfflinePanel({ onToast }) {
  const [items, setItems] = useState(null)
  const initial = useAsyncData(() => systemService.getSaveOffline(), [])
  const view = items ? { ...initial, items } : initial

  const onSave = async (id) => {
    const res = await systemService.saveOffline(id)
    setItems(res.items)
    onToast?.('Imehifadhiwa kwa matumizi bila mtandao — inapatikana bila internet')
  }

  return <SaveOfflineBody view={view} onSave={onSave} onToast={onToast} />
}

/* ══════════════════════════════════════════════════════════════
   7) SHARE NEARBY — uwasilishaji wa faili kifaa kwa kifaa
   ══════════════════════════════════════════════════════════════ */

export function ShareNearbyBody({ view, onShare, onToast }) {
  if (!view) return null
  return (
    <div className="psh-panelstack">
      <h3 className="psh-panelstack__h">SHARE NEARBY</h3>
      <p className="psh-panelstack__lead">
        Content inapatikana karibu. Kupeana kunafanyika kifaa kwa kifaa — bila matumizi ya data.
      </p>

      {!view.canShare ? (
        <p className="psh-note">
          <IconInfo size={16} />
          {view.reason}
        </p>
      ) : null}

      {view.relayGuard && !view.canShare ? (
        <div className="psh-sys-guard">
          <p className="psh-sys-alert psh-sys-alert--off">
            <IconShield size={16} />
            <span>
              <b>{view.relayGuard.message}</b> — {view.relayGuard.detail}
            </span>
          </p>
          <p className="psh-sys-kicker">Njia mbadala (kwa uamuzi wako)</p>
          <ul className="psh-sys-chips">
            {view.relayGuard.alternatives.map((a) => (
              <li key={a.id}>
                <Chip tone="soft">{a.label}</Chip>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ul className="psh-sys-items">
        {view.items.map((i) => (
          <li key={i.id}>
            <span className="psh-sys-items__icon">
              <IconShare size={17} />
            </span>
            <span className="psh-sys-break__text">
              <span className="psh-sys-break__label">{i.label}</span>
              <span className="psh-sys-break__hint">{i.meta}</span>
            </span>
            {i.shared ? (
              <Chip tone="green">Imeshirikiwa</Chip>
            ) : (
              <button
                type="button"
                className="psh-btn psh-btn--sm"
                onClick={() => onShare(i.id)}
                disabled={!view.canShare}
                aria-disabled={!view.canShare || undefined}
              >
                Share nearby
              </button>
            )}
          </li>
        ))}
      </ul>

      <p className="psh-panelstack__foot">
        <IconInfo size={16} />
        {view.note}
      </p>
    </div>
  )
}

export function ShareNearbyPanel({ onToast }) {
  const [items, setItems] = useState(null)
  const initial = useAsyncData(() => systemService.getShareNearby(), [])
  const view = items ? { ...initial, items } : initial

  const onShare = async (id) => {
    const res = await systemService.shareNearby(id)
    setItems(res.items)
    onToast?.('Inashirikiwa kwa kifaa cha karibu — hakuna data ya internet inayotumika')
  }

  return <ShareNearbyBody view={view} onShare={onShare} onToast={onToast} />
}

/* ══════════════════════════════════════════════════════════════
   8) SYSTEM ACTIVITY — kumbukumbu ya usafirishaji
   ══════════════════════════════════════════════════════════════ */

export function SystemActivityBody({ view, onToast }) {
  if (!view) return null
  const { summary, items } = view
  return (
    <div className="psh-panelstack">
      <h3 className="psh-panelstack__h">SYSTEM ACTIVITY</h3>

      <ul className="psh-sys-stats">
        <li>
          <strong>{summary.receiving}</strong>
          <span>Inapokea</span>
        </li>
        <li>
          <strong>{summary.sharing}</strong>
          <span>Inashiriki</span>
        </li>
        <li>
          <strong>{summary.waiting}</strong>
          <span>Inasubiri</span>
        </li>
        <li>
          <strong>{summary.lastSync}</strong>
          <span>Sync ya mwisho</span>
        </li>
      </ul>

      <ul className="psh-sys-items">
        {items.map((i) => {
          const Icon = KIND_ICON[i.kind] || IconBolt
          return (
            <li key={i.id}>
              <span className="psh-sys-items__icon">
                <Icon size={17} />
              </span>
              <span className="psh-sys-break__text">
                <span className="psh-sys-break__label">{i.label}</span>
                <span className="psh-sys-break__hint">{i.detail}</span>
              </span>
              <span className="psh-sys-items__at">{i.at}</span>
            </li>
          )
        })}
      </ul>

      <h3 className="psh-panelstack__h">Njia zinazotumika</h3>
      <ul className="psh-sys-lines">
        {view.transports
          .filter((t) => t.available)
          .map((t) => (
            <li key={t.id}>{t.label}</li>
          ))}
      </ul>

      <p className="psh-note">
        <IconInfo size={16} />
        {view.note}
      </p>
    </div>
  )
}

export function SystemActivityPanel({ onToast }) {
  const view = useAsyncData(() => systemService.getActivity(), [])
  return <SystemActivityBody view={view} onToast={onToast} />
}
