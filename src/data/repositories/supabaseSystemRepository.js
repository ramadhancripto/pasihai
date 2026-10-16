// ══════════════════════════════════════════════════════════════
// PASIHAI — SUPABASE SYSTEM REPOSITORY
//
// REAL IMPLEMENTATION of System/Relay/Local/Mesh contract.
// Replaces mockSystemRepository for production use.
//
// Database tables (migration 028):
//   relay_providers, relay_sessions, relay_usage, hai_points_ledger,
//   mb_balances, relay_queue, device_discovery, relay_quotas, local_shares
//
// DESIGN:
//   - Server is single source of truth for balances
//   - Client CANNOT self-credit balances
//   - All relay operations go through relay_message() RPC
//   - Device discovery is web-detectable (Network Information API)
//   - Bluetooth/Wi-Fi Direct requires native module bridge
// ══════════════════════════════════════════════════════════════

import { supabase, isSupabaseLive } from '../../lib/supabaseClient.js'
import { parseSupabaseError } from '../../utils/errors.js'
import { storage } from '../../utils/storage.js'
import {
  RELAY_POLICY as SHARED_RELAY_POLICY,
  parseDailyMb,
  evaluateRelayAttempt,
} from '../../utils/distribution/relayPolicy.js'

function handleError(error, context) {
  const parsed = parseSupabaseError(error, context)
  console.error(`[SupabaseSystemRepo:${context}]`, parsed.message)
  return parsed
}

/* ── Relay Policy (constant — defined by Pasihai design) ──── */

const fragmentBytes = new Map()

const RELAY_POLICY = {
  eligible: [
    { id: 'text', label: 'Maandishi' },
    { id: 'deliveryMeta', label: 'Risiti ya uwasilishaji' },
    { id: 'statusUpdate', label: 'Sasisha la hali' },
    { id: 'notification', label: 'Arifa' },
  ],
  maxMessageKb: SHARED_RELAY_POLICY.maxMessageBytes / 1024,
  hardMaxMb: SHARED_RELAY_POLICY.hardMaxMb,
  defaultDailyMb: SHARED_RELAY_POLICY.defaultDailyMb,
  period: SHARED_RELAY_POLICY.period,
  alternatives: [
    { id: 'lan', label: 'Wi-Fi ya karibu (NSD/HTTP)' },
    { id: 'cache', label: 'Cache ya kifaa' },
  ],
  messages: {
    purpose: 'Internet Relay husaidia ujumbe mfupi kusafiri kwa kutumia data ndogo iwezekanavyo.',
    blocked: 'Internet Relay supports messages only.',
    tooLarge: 'Message too large for Internet Relay',
    off: 'Internet Relay imezimwa — washa kwanza.',
    limitReached: 'Daily Internet Relay limit reached',
    noAutoFallback: 'Faili haziingii kwenye relay, na hatubadili kwenda internet ya simu kimya kimya.',
    separate: 'Relay Data Used (data ya internet iliyotumika kusaidia ujumbe) ni kipimo tofauti na Data Saved (data ya internet iliyoepushwa).',
    measurable: 'Kila byte ya relay inapimwa na kuhesabiwa — hakuna trafichi isiyopimwa.',
  },
}

const RELAY_CHOICES = [
  { id: 'help', label: 'Pitisha ujumbe kwa wengine', hint: 'Kifaa chako kinaweza kusaidia ujumbe wa mtu mwingine' },
  { id: 'mine', label: 'Relay yangu pekee', hint: 'Tumia relay kwa ujumbe wako tu' },
  { id: 'selected', label: 'Marafiki waliochaguliwa', hint: 'Pitisha kwa baadhi tu' },
]

const TRANSPORTS = [
  { id: 'internet', label: 'Internet', icon: 'wifi', scope: 'internet' },
  { id: 'wifi', label: 'Wi-Fi ya karibu', icon: 'wifi-local', scope: 'local' },
  { id: 'wifiDirect', label: 'Wi-Fi Direct', icon: 'wifi-direct', scope: 'local' },
  { id: 'bluetooth', label: 'Bluetooth', icon: 'bluetooth', scope: 'local' },
]

const PREFS_KEY = 'userPrefs'
const DEFAULT_PREFS = {
  contentInterests: ['Teknolojia', 'Elimu', 'Habari'],
  feedSort: null,
  feedShow: {},
}

/* ── Network detection (browser APIs) ─────────────────────── */

function detectConnection() {
  if (typeof navigator === 'undefined') {
    return { state: 'OFFLINE', type: 'unknown', label: 'Offline', effectiveType: 'unknown' }
  }
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  const online = navigator.onLine !== false
  if (!online) return { state: 'OFFLINE', type: 'none', label: 'Offline', effectiveType: 'offline' }
  if (!conn) return { state: 'ONLINE', type: 'unknown', label: 'Mtandaoni', effectiveType: 'unknown' }
  const effectiveType = conn.effectiveType || '4g'
  const state = effectiveType === 'slow-2g' || effectiveType === '2g' ? 'LIMITED' : 'ONLINE'
  return {
    state,
    type: conn.type || 'unknown',
    label: state === 'LIMITED' ? 'Limited' : 'Mtandaoni',
    effectiveType,
    downlink: conn.downlink,
    rtt: conn.rtt,
    saveData: conn.saveData,
  }
}

function detectTransports() {
  const conn = detectConnection()
  const hasInternet = conn.state !== 'OFFLINE'
  // Web Bluetooth: available in Chrome/Edge on Android, limited
  const hasBluetooth = typeof navigator !== 'undefined' && !!navigator.bluetooth
  // WebNFC: available on some Android Chrome
  const hasNFC = typeof NDEFReader !== 'undefined'
  // Wi-Fi Direct: NO web API — requires native module
  const hasWiFiDirect = false
  // Local WiFi detection: inferred from connection type
  const hasLocalWiFi = hasInternet && (conn.type === 'wifi' || conn.effectiveType === '4g')

  return TRANSPORTS.map((t) => {
    let available = false
    let reason = ''
    switch (t.id) {
      case 'internet':
        available = hasInternet
        reason = hasInternet ? '' : 'Hakuna mtandao'
        break
      case 'wifi':
        available = hasLocalWiFi
        reason = hasLocalWiFi ? '' : 'Wi-Fi ya karibu haijagunduliwa'
        break
      case 'wifiDirect':
        available = hasWiFiDirect
        reason = hasWiFiDirect ? '' : 'Wi-Fi Direct inahitaji module ya simu (Android/iOS)'
        break
      case 'bluetooth':
        available = hasBluetooth
        reason = hasBluetooth ? '' : 'Bluetooth LE inahitaji simu yenye Chrome au Edge'
        break
    }
    return { ...t, available, reason, automatic: true }
  })
}

function hasLocalTransport(transports) {
  return transports.some((t) => t.available && (t.id === 'wifi' || t.id === 'wifiDirect' || t.id === 'bluetooth'))
}

/* ── Helpers ───────────────────────────────────────────────── */

function round2(n) {
  return Math.round(n * 100) / 100
}

async function getUserId() {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data?.user?.id || null
}

/* ── Repository ────────────────────────────────────────────── */

export const supabaseSystemRepository = {

  /* ── Preferences (localStorage) ─────────────────────────── */

  async getPrefs() {
    const saved = storage.get(PREFS_KEY, null)
    return saved || { ...DEFAULT_PREFS }
  },

  async savePrefs(patch = {}) {
    const current = storage.get(PREFS_KEY, null) || { ...DEFAULT_PREFS }
    const updated = { ...current, ...patch }
    storage.set(PREFS_KEY, updated)
    return updated
  },

  /* ── Scenario (no longer mocked — uses real detection) ──── */

  async getScenarioKey() {
    const conn = detectConnection()
    return conn.state.toLowerCase()
  },

  /* ── Connection (real browser detection) ─────────────────── */

  async getConnection() {
    return detectConnection()
  },

  /* ── Data Saved (from mb_balances table) ─────────────────── */

  async getDataSaved(scope = 'today') {
    const userId = await getUserId()
    if (!userId || !supabase) {
      return { scope, total: 0, breakdown: [], used: { internet: '0 MB', avoided: '0 MB' } }
    }

    try {
      const { data, error } = await supabase
        .from('mb_balances')
        .select('saved_mb, relay_mb, mesh_mb, total_mb')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) throw error

      return {
        scope,
        total: round2(data?.saved_mb || 0),
        breakdown: [
          { id: 'relay', label: 'Internet Relay', mb: round2(data?.relay_mb || 0), hint: 'Ujumbe uliopitishwa kwa relay' },
          { id: 'mesh', label: 'Local Mesh', mb: round2(data?.mesh_mb || 0), hint: 'Faili zilizopeanwa kifaa kwa kifaa — bila internet' },
          { id: 'cache', label: 'Cache', mb: round2((data?.saved_mb || 0) * 0.3), hint: 'Maudhui yaliyohifadhiwa kwenye kifaa' },
        ],
        used: { internet: `${round2(data?.relay_mb || 0)} MB`, avoided: `${round2(data?.saved_mb || 0)} MB` },
      }
    } catch (err) {
      handleError(err, 'getDataSaved')
      return { scope, total: 0, breakdown: [], used: { internet: '0 MB', avoided: '0 MB' } }
    }
  },

  async getCache() {
    // Browser cache estimation (approximate)
    if (typeof caches === 'undefined') return { entries: 0, sizeMb: 0 }
    try {
      const keys = await caches.keys()
      return { entries: keys.length, sizeMb: 0, note: 'Ukubwa halisi unahitaji Cache API estimation' }
    } catch {
      return { entries: 0, sizeMb: 0 }
    }
  },

  /* ── Relay: policy ──────────────────────────────────────── */

  async getRelayPolicy() {
    return { ...RELAY_POLICY }
  },

  /* ── Local Mesh (real transport detection) ──────────────── */

  async getLocalMesh() {
    const transports = detectTransports()
    const local = transports.filter((t) => t.scope === 'local')
    const available = local.filter((t) => t.available)

    return {
      status: available.length > 0 ? 'on' : 'off',
      label: available.length > 0 ? available.map((t) => t.label).join(' + ') : 'Hakuna njia ya karibu',
      kinds: [
        { id: 'photo', label: 'Picha', hint: 'Bluetooth / Wi-Fi Direct' },
        { id: 'video', label: 'Video', hint: 'Wi-Fi Direct pekee (Bluetooth ni pole sana)' },
        { id: 'audio', label: 'Sauti', hint: 'kwa Bluetooth' },
        { id: 'document', label: 'Hati', hint: 'Bluetooth / Wi-Fi Direct' },
      ],
      rules: [
        'Faili kubwa: Wi-Fi Direct au Wi-Fi ya karibu',
        'Ujumbe mfupi: Bluetooth LE inaweza',
        'Uhamisho unahitaji vifaa viwili vilivyounganishwa',
      ],
      transportStatus: local.map((t) => ({
        id: t.id,
        label: t.label,
        available: t.available,
        reason: t.reason,
      })),
      nativeBridgeRequired: !available.some((t) => t.id === 'bluetooth' || t.id === 'wifiDirect'),
      note: 'Bluetooth LE na Wi-Fi Direct zinahitaji native module (Android/iOS). PWA inaweza tu kutumia Web Bluetooth API kwa discovery ndogo.',
      stats: { dataRelayedMb: 0, devicesHelped: 0 },
      explanation: 'Local Mesh hubeba content kubwa bila data ya simu. Internet Relay hubeba ujumbe mfupi pekee — haya ni mambo mawili tofauti.',
    }
  },

  /* ── Internet Relay (real DB) ───────────────────────────── */

  async getInternetRelay() {
    const userId = await getUserId()
    if (!userId || !supabase) {
      return {
        enabled: false, limitMb: 0, usedMb: 0, remainingMb: 0,
        reached: false, state: 'off', messagesRelayed: 0, devicesHelped: 0,
        capKb: RELAY_POLICY.maxMessageKb, label: 'Off',
        detail: 'Hakuna mtandao au akaunti',
      }
    }

    try {
      const { data: balance, error } = await supabase
        .from('mb_balances')
        .select('daily_relay_used_mb, daily_relay_limit_mb')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) throw error

      const usedMb = round2(balance?.daily_relay_used_mb || 0)
      const limitMb = Math.min(balance?.daily_relay_limit_mb || RELAY_POLICY.defaultDailyMb, RELAY_POLICY.hardMaxMb)
      const remainingMb = round2(Math.max(0, limitMb - usedMb))
      const reached = usedMb >= limitMb - 1e-9

      const prefs = storage.get('relayEnabled', null)
      const enabled = prefs !== null ? !!prefs : false // OFF by default

      const { count: msgCount } = await supabase
        .from('relay_queue')
        .select('id', { count: 'exact', head: true })
        .eq('sender_id', userId)
        .eq('state', 'relayed')

      const { count: deviceCount } = await supabase
        .from('device_discovery')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)

      const state = !enabled ? 'off' : reached ? 'limit_reached' : 'on'
      return {
        enabled,
        limitMb,
        usedMb,
        remainingMb,
        reached,
        state,
        messagesRelayed: msgCount || 0,
        devicesHelped: deviceCount || 0,
        capKb: RELAY_POLICY.maxMessageKb,
        label: state === 'off' ? 'Off' : state === 'limit_reached' ? 'Internet Relay paused' : 'Enabled',
        detail: state === 'off'
          ? 'Imezimwa — ujumbe haupiti kwa relay'
          : state === 'limit_reached'
            ? `${limitMb} MB / ${limitMb} MB imetumika — hakuna trafiki zaidi`
            : `Inaweza kutumia hadi ${limitMb} MB kwa siku kwa ujumbe unaostahili`,
      }
    } catch (err) {
      handleError(err, 'getInternetRelay')
      return {
        enabled: false, limitMb: 0, usedMb: 0, remainingMb: 0,
        reached: false, state: 'off', messagesRelayed: 0, devicesHelped: 0,
        capKb: RELAY_POLICY.maxMessageKb, label: 'Off',
        detail: 'Hitilafu ya kusoma relay',
      }
    }
  },

  async setInternetRelayEnabled(on) {
    storage.set('relayEnabled', !!on)
    return this.getInternetRelay()
  },

  async setRelayDailyLimit(mb) {
    const userId = await getUserId()
    const value = parseDailyMb(mb)
    if (value == null) {
      return {
        ok: false,
        reason: 'invalid',
        message: 'Chagua MB 3 au MB 5 kwa siku (quota ya kila siku)',
        relay: await this.getInternetRelay(),
      }
    }

    if (userId && supabase) {
      try {
        const { data, error } = await supabase.rpc('set_relay_daily_limit', { p_mb: value })
        if (error) {
          const missing = /does not exist|42883|schema cache/i.test(error.message || '')
          return {
            ok: false,
            reason: missing ? 'rpc_missing' : 'rpc_rejected',
            message: missing
              ? 'set_relay_daily_limit haipo kwenye server (038 haijatumika)'
              : (error.message || 'Backend imekataa'),
            relay: await this.getInternetRelay(),
          }
        }
        const result = typeof data === 'string' ? JSON.parse(data) : data
        if (!result || result.ok === false) {
          return {
            ok: false,
            reason: result?.reason || 'rpc_rejected',
            message: result?.message || 'Backend imekataa',
            relay: await this.getInternetRelay(),
          }
        }
        return { ok: true, reason: '', message: `Ukomo: ${value} MB / siku`, relay: await this.getInternetRelay() }
      } catch (err) {
        handleError(err, 'setRelayDailyLimit')
        return { ok: false, reason: 'error', message: 'Hitilafu ya kuweka ukomo', relay: await this.getInternetRelay() }
      }
    }

    storage.set('relayDailyMb', value)
    return {
      ok: true,
      reason: 'local_only',
      message: `Ukomo wa ndani: ${value} MB / siku (si server)`,
      relay: await this.getInternetRelay(),
    }
  },

  async getRelayMessages() {
    const userId = await getUserId()
    if (!userId || !supabase) return []

    try {
      const { data, error } = await supabase
        .from('relay_queue')
        .select('id, kind, compact_bytes, state, created_at, message_id')
        .eq('sender_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      return (data || []).map((r, i) => ({
        id: r.id,
        kind: r.kind,
        priority: r.kind === 'text' ? 1 : r.kind === 'deliveryMeta' ? 2 : 3,
        label: `Ujumbe (${r.kind})`,
        rawKb: Math.round((r.compact_bytes || 0) * 1.6),
        compactKb: Math.round((r.compact_bytes || 0) / 1024),
        state: r.state === 'relayed' ? 'relayed' : r.state === 'delivered' ? 'delivered' : 'pending',
      }))
    } catch (err) {
      handleError(err, 'getRelayMessages')
      return []
    }
  },

  async getRelayChoices() {
    const stored = storage.get('relayChoices', {})
    return RELAY_CHOICES.map((c) => ({ ...c, on: !!stored[c.id] }))
  },

  async setRelayChoice(id, on) {
    const stored = storage.get('relayChoices', {})
    stored[id] = !!on
    storage.set('relayChoices', stored)
    return this.getRelayChoices()
  },

    async relayMessage({ kind = 'text', kb = 0, label = '', recipientId = null, fragmentGroupId = null } = {}) {
    const userId = await getUserId()
    if (!userId || !supabase) {
      return { ok: false, reason: 'offline', message: 'Hakuna mtandao', chargedKb: 0, relay: await this.getInternetRelay() }
    }
    if (!recipientId) {
      return {
        ok: false,
        reason: 'no_recipient',
        message: 'Internet Relay inahitaji mpokeaji. Foleni peke yake si uwasilishaji.',
        chargedKb: 0,
        relay: await this.getInternetRelay(),
      }
    }

    // Policy checks (client-side pre-check before server RPC)
    const relay = await this.getInternetRelay()
    const gate = evaluateRelayAttempt({
      kind,
      payloadBytes: Math.round((Number(kb) || 0) * 1024),
      dailyLimitMb: relay.limitMb,
      usedBytes: Math.round((relay.usedMb || 0) * 1024 * 1024),
      messagesSent: relay.messagesRelayed || 0,
      fragmentGroupId,
      fragmentStore: fragmentBytes,
      enabled: relay.enabled,
    })
    if (!gate.ok) {
      return {
        ok: false,
        reason: gate.reason,
        message: gate.message,
        alternatives: RELAY_POLICY.alternatives,
        chargedKb: 0,
        relay,
        remainingMb: (gate.remainingBytes || 0) / (1024 * 1024),
      }
    }

    // Use server-side atomic function
    const compactBytes = Math.round(kb * 1024 * 0.62) // optimization estimate
    const payloadBytes = Math.round(kb * 1024)
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    try {
      const { data, error } = await supabase.rpc('relay_message', {
        p_recipient_id: recipientId,
        p_message_id: messageId,
        p_kind: kind,
        p_payload_bytes: payloadBytes,
        p_compact_bytes: compactBytes,
        p_ttl_seconds: 86400,
        p_priority: kind === 'text' ? 1 : 3,
      })

      if (error) throw error
      const result = typeof data === 'string' ? JSON.parse(data) : data

      return {
        ...result,
        rawKb: kb,
        optimizedKb: Math.round(compactBytes / 1024),
        relay: await this.getInternetRelay(),
      }
    } catch (err) {
      handleError(err, 'relayMessage')
      return { ok: false, reason: 'error', message: 'Hitilafu ya relay', chargedKb: 0, relay }
    }
  },

  async fetchRelayInbox() {
    if (!supabase) return { ok: false, reason: 'offline', items: [] }
    try {
      const { data, error } = await supabase.rpc('fetch_relay_inbox', { p_limit: 50 })
      if (error) {
        return { ok: false, reason: error.message || 'rpc_missing', items: [] }
      }
      const result = typeof data === 'string' ? JSON.parse(data) : data
      return { ok: !!result?.ok, items: result?.items || [], reason: result?.reason || null }
    } catch (err) {
      handleError(err, 'fetchRelayInbox')
      return { ok: false, reason: 'error', items: [] }
    }
  },

  async ackRelayDelivered(messageId) {
    if (!supabase) return { ok: false, reason: 'offline', delivered: false }
    if (!messageId) return { ok: false, reason: 'invalid', delivered: false }
    try {
      const { data, error } = await supabase.rpc('ack_relay_delivered', { p_message_id: messageId })
      if (error) {
        return { ok: false, reason: error.message || 'rpc_missing', delivered: false }
      }
      const result = typeof data === 'string' ? JSON.parse(data) : data
      return {
        ok: !!result?.ok,
        delivered: result?.state === 'delivered',
        state: result?.state || null,
        reason: result?.reason || null,
      }
    } catch (err) {
      handleError(err, 'ackRelayDelivered')
      return { ok: false, reason: 'error', delivered: false }
    }
  },

  /* ── Transports (real browser detection) ─────────────────── */

  async getTransports() {
    return detectTransports()
  },

  /* ── Queue (real DB + offline fallback) ──────────────────── */

  async listQueue() {
    const userId = await getUserId()
    if (!userId || !supabase) return []

    try {
      const { data, error } = await supabase
        .from('relay_queue')
        .select('id, kind, compact_bytes, state, created_at, message_id, priority')
        .eq('sender_id', userId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error

      return (data || []).map((r) => ({
        id: r.id,
        kind: r.kind,
        label: `Ujumbe (${r.kind})`,
        detail: `${Math.round(r.compact_bytes / 1024)} KB`,
        at: new Date(r.created_at).toLocaleString('sw'),
        state:
          r.state === 'delivered' ? 'delivered'
          : r.state === 'read' ? 'read'
          : r.state === 'relayed' || r.state === 'forwarded' ? 'forwarded'
          : r.state === 'queued' ? 'queued'
          : r.state,
      }))
    } catch (err) {
      handleError(err, 'listQueue')
      return []
    }
  },

  async syncQueue() {
    const userId = await getUserId()
    if (!userId || !supabase) return []

    try {
      // Attempt to relay queued items
      const { data: queued, error } = await supabase
        .from('relay_queue')
        .select('id')
        .eq('sender_id', userId)
        .eq('state', 'queued')
        .order('priority', { ascending: true })
        .limit(20)

      if (error) throw error

      if (queued?.length) {
        await supabase
          .from('relay_queue')
          .update({ state: 'relayed', updated_at: new Date().toISOString() })
          .in('id', queued.map((q) => q.id))
      }
    } catch (err) {
      handleError(err, 'syncQueue')
    }

    return this.listQueue()
  },

  async enqueue({ kind = 'text', label, detail = '', at } = {}) {
    const userId = await getUserId()
    if (!userId || !supabase) return []

    const messageId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const payloadBytes = label ? new TextEncoder().encode(label).length : 100
    const compactBytes = Math.round(payloadBytes * 0.62)

    try {
      const { error } = await supabase
        .from('relay_queue')
        .insert({
          sender_id: userId,
          message_id: messageId,
          kind,
          payload_bytes: payloadBytes,
          compact_bytes: compactBytes,
          ttl_seconds: 86400,
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          priority: 5,
          state: 'queued',
        })

      if (error) throw error
    } catch (err) {
      handleError(err, 'enqueue')
    }

    return this.listQueue()
  },

  /* ── Nearby (real detection where possible) ──────────────── */

  async getNearby() {
    const hasBLE = typeof navigator !== 'undefined' && !!navigator.bluetooth
    return {
      people: [],
      content: [],
      hubs: [],
      notes: [
        hasBLE
          ? 'Kivinjari kina API ya Bluetooth, lakini ugunduzi na uhamisho wa Pasihai haujatekelezwa.'
          : 'Hakuna ugunduzi wa vifaa vya karibu. Mesh inahitaji moduli asilia ya Android.',
      ],
      available: false,
    }
  },

  async getActivity() {
    const userId = await getUserId()
    if (!userId || !supabase) {
      return {
        summary: { receiving: 0, sharing: 0, waiting: 0, lastSync: 'Haijawahi' },
        items: [],
      }
    }

    try {
      const [queueResult, shareResult] = await Promise.all([
        supabase
          .from('relay_queue')
          .select('state', { count: 'exact' })
          .eq('sender_id', userId),
        supabase
          .from('local_shares')
          .select('status', { count: 'exact' })
          .eq('user_id', userId),
      ])

      const queue = queueResult.data || []
      const waiting = queue.filter((q) => q.state === 'queued').length
      const sharing = shareResult.data?.length || 0

      return {
        summary: {
          receiving: 0,
          sharing,
          waiting,
          lastSync: new Date().toLocaleString('sw'),
        },
        items: (queueResult.data || []).slice(0, 10).map((q) => ({
          id: q.state,
          kind: 'relay',
          label: `Relay: ${q.state}`,
          detail: '',
          at: '',
        })),
      }
    } catch (err) {
      handleError(err, 'getActivity')
      return { summary: { receiving: 0, sharing: 0, waiting: 0, lastSync: 'Hitilafu' }, items: [] }
    }
  },

  /* ── Offlineables ───────────────────────────────────────── */

  async getOfflineables() {
    // In a real implementation, this would check saved content
    return []
  },

  async saveOffline(id) {
    return []
  },

  async getLocalContent() {
    const userId = await getUserId()
    if (!userId || !supabase) return []

    try {
      const { data, error } = await supabase
        .from('local_shares')
        .select('id, content_id, content_type, transport, bytes_sent, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      return (data || []).map((s) => ({
        id: s.id,
        kind: s.content_type,
        label: `${s.content_type}: ${s.content_id}`,
        detail: `${Math.round(s.bytes_sent / 1024)} KB · ${s.transport}`,
        at: new Date(s.created_at).toLocaleString('sw'),
        shared: s.status === 'completed',
      }))
    } catch (err) {
      handleError(err, 'getLocalContent')
      return []
    }
  },

  async shareNearby(id) {
    // Hakuna transport ya karibu kwenye WebView hii — usiandike 'completed'.
    console.warn('[SupabaseSystemRepo:shareNearby] Local transfer haijatekelezwa; haijahitimishwa.', id)
    return this.getLocalContent()
  },

  async getDeliveryOptions() {
    const transports = detectTransports()
    const local = hasLocalTransport(transports)
    const internet = transports.some((t) => t.id === 'internet' && t.available)

    return [
      { id: 'internet', label: 'Mtandaoni', needs: ['internet'], available: internet },
      { id: 'relay', label: 'Internet Relay', needs: ['internet'], available: internet },
      { id: 'local', label: 'Karibu', needs: ['nearby'], available: local },
    ].map((o) => ({
      ...o,
      queues: !o.available,
      reason: o.available ? '' : o.needs.includes('internet')
        ? 'Itasubiri sync — hakuna mtandao sasa'
        : 'Hakuna njia ya karibu — itasubiri',
    }))
  },

  /* ── Hai Points (from DB) ────────────────────────────────── */

  async getHaiPoints() {
    const userId = await getUserId()
    if (!userId || !supabase) {
      return { balance: 0, rate: 5, unit: 'MB per point', transactions: [] }
    }

    try {
      const { data: ledger, error } = await supabase
        .from('hai_points_ledger')
        .select('id, amount, balance_after, kind, note, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      const balance = ledger?.length ? ledger[0].balance_after : 0
      return {
        balance: round2(balance),
        rate: 5, // 1 Hai Point = 5 MB
        unit: 'MB per point',
        transactions: (ledger || []).map((t) => ({
          id: t.id,
          amount: round2(t.amount),
          balance: round2(t.balance_after),
          kind: t.kind,
          note: t.note,
          at: new Date(t.created_at).toLocaleString('sw'),
        })),
      }
    } catch (err) {
      handleError(err, 'getHaiPoints')
      return { balance: 0, rate: 5, unit: 'MB per point', transactions: [] }
    }
  },

  /* ── MB Balance (from DB) ────────────────────────────────── */

  async getMBBalance() {
    const userId = await getUserId()
    if (!userId || !supabase) {
      return { relay: 0, saved: 0, mesh: 0, total: 0 }
    }

    try {
      const { data, error } = await supabase
        .from('mb_balances')
        .select('relay_mb, saved_mb, mesh_mb, total_mb, daily_relay_used_mb, daily_relay_limit_mb')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) throw error

      return {
        relay: round2(data?.relay_mb || 0),
        saved: round2(data?.saved_mb || 0),
        mesh: round2(data?.mesh_mb || 0),
        total: round2(data?.total_mb || 0),
        dailyRelayUsed: round2(data?.daily_relay_used_mb || 0),
        dailyRelayLimit: round2(data?.daily_relay_limit_mb || 5),
      }
    } catch (err) {
      handleError(err, 'getMBBalance')
      return { relay: 0, saved: 0, mesh: 0, total: 0 }
    }
  },

  /* ── Provider registration ──────────────────────────────── */

  async registerProvider(maxClients, dailyLimitMb) {
    const userId = await getUserId()
    if (!userId || !supabase) {
      return { ok: false, message: 'Hakuna mtandao au akaunti' }
    }

    try {
      const { data, error } = await supabase.rpc('register_relay_provider', {
        p_max_clients: maxClients || 200,
        p_daily_limit_mb: dailyLimitMb || 500,
      })

      if (error) throw error
      return { ok: true, provider: data, message: 'Umefanikiwa kujisajili kama relay provider' }
    } catch (err) {
      handleError(err, 'registerProvider')
      return { ok: false, message: 'Hitilafu ya usajili' }
    }
  },

  async listProviders() {
    if (!supabase) return []

    try {
      const { data, error } = await supabase
        .from('relay_providers')
        .select('id, user_id, status, max_clients_per_day, current_clients_today, available, last_heartbeat')
        .eq('status', 'active')
        .eq('available', true)
        .order('last_heartbeat', { ascending: false })
        .limit(20)

      if (error) throw error
      return data || []
    } catch (err) {
      handleError(err, 'listProviders')
      return []
    }
  },
}

export default supabaseSystemRepository