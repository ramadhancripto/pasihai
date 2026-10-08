// ══════════════════════════════════════════════════════════════
// PASIHAI — REPOSITORY: MFUMO (System / Local / Offline / Relay)
//
// CONTRACT (haitegemei provider yoyote — si Firebase-specific):
//   getScenarioKey()            → Promise<string>       hali ya kifaa sasa
//   getConnection()             → Promise<Connection>   vocabulary moja
//   getDataSaved(scope)         → Promise<DataSaved>    MB zilizoepushwa
//   getCache()                  → Promise<CacheInfo>    cache ≠ saved
//   getRelayPolicy()            → Promise<RelayPolicy>  ujumbe mfupi pekee · ≤5 MB/siku
//   getLocalMesh()              → Promise<LocalMesh>    content ya karibu (tofauti)
//   getInternetRelay()          → Promise<InternetRelay> enabled · ukomo · matumizi
//   setInternetRelayEnabled(on) → Promise<InternetRelay>
//   setRelayDailyLimit(mb)      → Promise<{ok, relay, reason, message}>
//   relayMessage(payload)       → Promise<Decision>     uamuzi wa sera kwa ujumbe
//   getRelayMessages()          → Promise<RelayMessage[]>
//   setRelayChoice(id, on)      → Promise<RelayChoice[]>
//   getTransports()             → Promise<Transport[]>
//   listQueue() · syncQueue() · enqueue(item) · getNearby() · getActivity()
//   getOfflineables() · saveOffline(id) · getLocalContent() · shareNearby(id)
//   getDeliveryOptions()
//
// IMPLEMENTATION YA SASA: Mock (inasoma src/data/mock.js) + hifadhi ndogo
// ya kumbukumbu (in-memory store) kwa mabadiliko ya majaribio.
// IMPLEMENTATION ZA BAADAYE: LocalSystemRepository (local DB + sync engine) |
// FirebaseSystemRepository (byte accounting halisi + transport halisi).
//
// SERA YA INTERNET RELAY (haibadiliki kwa provider):
//   · ujumbe mfupi pekee (maandishi · metadata · uelekezaji mdogo)
//   · HAIRUHUSIWI: video · reels · picha · sauti · hati · PDF · ZIP ·
//     viambatisho · uploads kubwa — hakuna vighairi
//   · ukomo ABSOLUTE wa 5 MB kwa siku (default 3 MB)
//   · ujumbe mmoja ≤ policy.maxMessageKb
//   · haitumii data ya mtu mwingine kimya kimya
// ══════════════════════════════════════════════════════════════

import {
  systemScenarios,
  systemScenarioDefault,
  systemDataSaved,
  systemCache,
  systemQueueItems,
  systemRelayPolicy,
  systemRelayChoices,
  systemRelayMessages,
  systemLocalMesh,
  systemTransports,
  systemLocalContent,
  systemOfflineables,
  systemActivity,
  systemNearby,
  systemDeliveryOptions,
} from '../mock.js'

/* ── Hali ya kifaa (scenario) ───────────────────────────────── */

function scenarioKeyFromUrl() {
  const search = typeof window !== 'undefined' ? window.location?.search || '' : ''
  if (!search) return null
  const key = new URLSearchParams(search).get('sys')
  return key && systemScenarios[key] ? key : null
}

function activeScenario() {
  const key = scenarioKeyFromUrl() || systemScenarioDefault
  return systemScenarios[key]
}

/* ── Hifadhi ndogo ya majaribio (in-memory) ─────────────────── */

let store = null

function db() {
  if (store) return store
  const sc = activeScenario()
  store = {
    key: sc.id,
    relayChoices: { ...sc.relayChoices },
    internetRelay: { ...sc.internetRelay },
    relayMessages: systemRelayMessages.map((m) => ({ ...m })),
    queue: systemQueueItems.map((item) => ({ ...item, state: sc.queue[item.id] || 'waiting' })),
    enqueued: 0,
    offline: systemOfflineables.map((item) => ({ ...item, saved: false })),
    local: systemLocalContent.map((item) => ({ ...item, shared: false })),
  }
  return store
}

const queueItem = (item, state) => ({ ...item, state })

/* ── Hesabu ndogo ───────────────────────────────────────────── */

const round2 = (n) => Math.round(n * 100) / 100

/** Uboreshaji wa ujumbe (mock): serialization fupi, metadata isiyo ya lazima
 *  inaondolewa, ack batching. Uwiano huu ni wa mfano — kiwango halisi
 *  kitatoka kwenye relay engine baadaye. Hatuna kubadilisha maana ya ujumbe. */
function optimizeKb(rawKb) {
  return Math.max(1, Math.round(rawKb * 0.62))
}

function relaySnapshot() {
  const s = db()
  const policy = systemRelayPolicy
  const ir = s.internetRelay
  const limitMb = Math.min(ir.limitMb, policy.hardMaxMb)
  const usedMb = round2(ir.usedMb)
  const remainingMb = round2(Math.max(0, limitMb - usedMb))
  const reached = usedMb >= limitMb - 1e-9
  const state = !ir.enabled ? 'off' : reached ? 'limit_reached' : 'on'
  return {
    enabled: !!ir.enabled,
    limitMb,
    usedMb,
    remainingMb,
    reached,
    state,
    messagesRelayed: ir.messagesRelayed,
    devicesHelped: ir.devicesHelped,
    capKb: policy.maxMessageKb,
    label:
      state === 'off'
        ? 'Off'
        : state === 'limit_reached'
          ? 'Internet Relay paused'
          : 'Enabled',
    detail:
      state === 'off'
        ? 'Imezimwa — ujumbe haupiti kwa relay'
        : state === 'limit_reached'
          ? `${limitMb} MB / ${limitMb} MB imetumika — hakuna trafiki zaidi`
          : `Inaweza kutumia hadi ${limitMb} MB kwa siku kwa ujumbe unaostahili`,
  }
}

/* ── Repository ─────────────────────────────────────────────── */

/* Mapendeleo ya mtumiaji (kikao hiki — bila backend) */
const sessionPrefs = {
  contentInterests: ['Teknolojia', 'Elimu', 'Habari'],
  feedSort: null,
  feedShow: {},
}

export const mockSystemRepository = {
  async getPrefs() {
    return JSON.parse(JSON.stringify(sessionPrefs))
  },

  async savePrefs(patch = {}) {
    Object.assign(sessionPrefs, patch)
    return JSON.parse(JSON.stringify(sessionPrefs))
  },

  async getScenarioKey() {
    return db().key
  },

  async getConnection() {
    return activeScenario().connection
  },

  async getDataSaved(scope = 'today') {
    const data = systemDataSaved[scope] || systemDataSaved.today
    return { scope, ...data }
  },

  async getCache() {
    return systemCache
  },

  /* ── Relay: sera · mesh · internet ───────────────────────── */

  async getRelayPolicy() {
    return systemRelayPolicy
  },

  async getLocalMesh() {
    const sc = activeScenario()
    return { ...systemLocalMesh, ...sc.localMesh, kinds: systemLocalMesh.kinds, rules: systemLocalMesh.rules }
  },

  async getInternetRelay() {
    return relaySnapshot()
  },

  async setInternetRelayEnabled(on) {
    db().internetRelay.enabled = !!on
    return relaySnapshot()
  },

  async setRelayDailyLimit(mb) {
    const policy = systemRelayPolicy
    const value = Number(mb)
    if (!Number.isFinite(value) || value <= 0) {
      return { ok: false, reason: 'invalid', message: 'Thamani si sahihi', relay: relaySnapshot() }
    }
    if (value > policy.hardMaxMb) {
      // ⛔ Ukomo wa lazima: hauwezi kuvukwa kwa njia yoyote
      return {
        ok: false,
        reason: 'above_max',
        message: `Ukomo wa juu ni ${policy.hardMaxMb} MB / siku — imekataliwa`,
        relay: relaySnapshot(),
      }
    }
    db().internetRelay.limitMb = value
    return {
      ok: true,
      reason: '',
      message: `Ukomo: ${value} MB / siku`,
      relay: relaySnapshot(),
    }
  },

  async getRelayMessages() {
    return db().relayMessages.map((m) => ({ ...m }))
  },

  async getRelayChoices() {
    const s = db()
    return systemRelayChoices.map((c) => ({ ...c, on: !!s.relayChoices[c.id] }))
  },

  async setRelayChoice(id, on) {
    db().relayChoices[id] = !!on
    return this.getRelayChoices()
  },

  /** Uamuzi wa sera kwa ujumbe: unaruhusiwa au unakataliwa.
   *  Faili HAZIINGII kwenye relay hata kidogo (hakuna automatic fallback). */
  async relayMessage({ kind = 'text', kb = 0, label = '' } = {}) {
    const policy = systemRelayPolicy
    const s = db()
    const snap = relaySnapshot()

    const eligible = policy.eligible.some((e) => e.id === kind)
    if (!eligible) {
      return {
        ok: false,
        reason: 'media',
        message: policy.messages.blocked,
        alternatives: policy.alternatives.map((a) => ({ ...a })),
        chargedKb: 0,
        relay: snap,
      }
    }

    if (!s.internetRelay.enabled) {
      return { ok: false, reason: 'off', message: policy.messages.off, chargedKb: 0, relay: snap }
    }

    if (!Number.isFinite(kb) || kb <= 0) {
      return { ok: false, reason: 'invalid', message: 'Ukubwa haujulikani', chargedKb: 0, relay: snap }
    }

    if (kb > policy.maxMessageKb) {
      return {
        ok: false,
        reason: 'too_large',
        message: policy.messages.tooLarge,
        capKb: policy.maxMessageKb,
        alternatives: policy.alternatives.map((a) => ({ ...a })),
        chargedKb: 0,
        relay: snap,
      }
    }

    const compactKb = optimizeKb(kb)
    const costMb = compactKb / 1024
    // ⛔ Ukaguzi unatumia jumla KAMILI (bila kufupisha) — hauwezi kuvuka hata kidogo
    if (s.internetRelay.usedMb + costMb > s.internetRelay.limitMb + 1e-9) {
      return {
        ok: false,
        reason: 'limit',
        message: policy.messages.limitReached,
        optimizedKb: compactKb,
        chargedKb: 0,
        relay: snap,
      }
    }

    s.internetRelay.usedMb = round2(s.internetRelay.usedMb + costMb)
    s.internetRelay.messagesRelayed += 1
    s.relayMessages = [
      { id: `rl${s.internetRelay.messagesRelayed}`, kind, priority: kind === 'text' ? 1 : kind === 'deliveryMeta' ? 2 : 3, label: label || 'Ujumbe', rawKb: kb, compactKb, state: 'relayed' },
      ...s.relayMessages,
    ]

    return {
      ok: true,
      reason: '',
      message: 'Imepitishwa kwa relay',
      rawKb: kb,
      optimizedKb: compactKb,
      chargedKb: compactKb,
      relay: relaySnapshot(),
    }
  },

  /* ── Njia (transport) ────────────────────────────────────── */

  async getTransports() {
    const sc = activeScenario()
    return systemTransports.map((t) => ({
      ...t,
      available: !!sc.transports[t.id],
      reason: sc.transportReasons?.[t.id] || '',
      automatic: true, // mfumo huchagua; mtumiaji hachagui kila mara
    }))
  },

  /* ── Foleni · Sync · Nearby · Activity ───────────────────── */

  async listQueue() {
    return db().queue.map((i) => ({ ...i }))
  },

  async syncQueue() {
    const s = db()
    s.queue = s.queue.map((i) =>
      i.state === 'waiting' || i.state === 'sending' ? { ...i, state: 'synced', at: 'sasa hivi' } : i,
    )
    return this.listQueue()
  },

  async enqueue({ kind = 'post', label, detail = '', at = 'sasa hivi' }) {
    const s = db()
    s.enqueued += 1
    s.queue = [queueItem({ id: `qlocal${s.enqueued}`, kind, label, detail, at }, 'waiting'), ...s.queue]
    return this.listQueue()
  },

  async getNearby() {
    const sc = activeScenario()
    const qty = sc.nearby
    return {
      people: systemNearby.people.slice(0, qty.people),
      content: systemNearby.content.slice(0, qty.content),
      hubs: systemNearby.hubs.slice(0, qty.hubs),
      notes: qty.people || qty.content ? systemNearby.notes : [],
      available: qty.people + qty.content + qty.hubs > 0,
    }
  },

  async getActivity() {
    const s = db()
    return {
      summary: {
        receiving: systemActivity.summary.receiving,
        sharing: systemActivity.summary.sharing,
        waiting: countBy(s.queue, 'waiting'),
        lastSync: activeScenario().lastSync,
      },
      items: systemActivity.items.map((i) => ({ ...i })),
    }
  },

  async getOfflineables() {
    return db().offline.map((i) => ({ ...i }))
  },

  async saveOffline(id) {
    const s = db()
    s.offline = s.offline.map((i) => (i.id === id ? { ...i, saved: true } : i))
    return this.getOfflineables()
  },

  async getLocalContent() {
    return db().local.map((i) => ({ ...i }))
  },

  async shareNearby(id) {
    const s = db()
    s.local = s.local.map((i) => (i.id === id ? { ...i, shared: true } : i))
    return this.getLocalContent()
  },

  async getDeliveryOptions() {
    return systemDeliveryOptions.map((o) => ({ ...o }))
  },
}

function countBy(items, state) {
  return items.filter((i) => i.state === state).length
}
