// ══════════════════════════════════════════════════════════════
// PASIHAI — APPLICATION SERVICE: MFUMO (System)
//
// Safu hii inaunganisha: hali ya kifaa (connection), Data Saved,
// Relay, Nearby, foleni ya kusubiri (queue), Sync, Save Offline,
// Share Nearby na shughuli za usafirishaji (activity).
//
// KANUNI: UI haitumii repository moja kwa moja. Na mantiki ya
// "kipi kinafaa sasa" (contextual actions) iko HAPA — si kwenye UI.
//
// Vocabulary MOJA ya hali ya kifaa (haizungukwi):
//   ONLINE · LIMITED · LOCAL · OFFLINE · WAITING_SYNC · SYNCING
// ══════════════════════════════════════════════════════════════

import { identityRepository, systemRepository } from '../data/repositories/index.js'

/* ── Kanuni za upatikanaji (contextual rules) ──────────────── */

const STATE_LABEL = {
  ONLINE: 'Mtandaoni',
  LIMITED: 'Limited',
  LOCAL: 'Local Active',
  OFFLINE: 'Offline',
  WAITING_SYNC: 'Waiting for Sync',
  SYNCING: 'Syncing',
}

const hasInternet = (state) => state === 'ONLINE' || state === 'LIMITED' || state === 'SYNCING'
const hasLocal = (transports) =>
  transports.some((t) => t.available && (t.id === 'wifi' || t.id === 'wifiDirect' || t.id === 'bluetooth'))

function anyInternetTransport(transports) {
  return transports.some((t) => t.id === 'internet' && t.available)
}

/* ── Service ────────────────────────────────────────────────── */

export const systemService = {
  /* ── Kitufe cha System: hali ya kifaa kwa doa ndogo ─────── */
  async getConnection() {
    const conn = await systemRepository.getConnection()
    return { ...conn, label: conn.label || STATE_LABEL[conn.state] }
  },

  /* ── Dalili ya juu (header): "184 MB saved" ──────────────── */
  async getDataSavedBrief() {
    const [data, cache] = await Promise.all([
      systemRepository.getDataSaved('today'),
      systemRepository.getCache(),
    ])
    return { scope: data.scope, total: data.total, unit: 'MB', cache }
  },

  /* ── Panel ya Data Saving ────────────────────────────────── */
  async getDataSaved(scope = 'today') {
    const [data, cache, relayUsed] = await Promise.all([
      systemRepository.getDataSaved(scope),
      systemRepository.getCache(),
      systemRepository.getInternetRelay(),
    ])
    return {
      ...data,
      unit: 'MB',
      scopes: [
        { id: 'today', label: 'Today' },
        { id: 'week', label: 'Week' },
        { id: 'month', label: 'Month' },
      ],
      headline: 'Data ya internet iliyoepushwa',
      meaning:
        'Hii ni data ya internet ILIYOEPUSHWA kwa sababu content ilifika kwa njia ya karibu, cache au relay iliyoidhinishwa.',
      notMeaning:
        'Si Relay Data Used, si salio la relay, si Hai Points, si ukubwa wa storage, na si cache pekee.',
      cache,
      relayUsedMb: relayUsed.usedMb,
      separationNote:
        'Relay Data Used (data iliyotumika kusaidia ujumbe) na Data Saved (iliyoepushwa) ni vipimo viwili tofauti — vyote vinaweza kuwa kweli kwa wakati mmoja.',
    }
  },

  /* ── System: hali + vitendo vinavyofaa sasa ─────────────── */
  async getSnapshot() {
    const [scenario, connection, brief, localMesh, internetRelay, transports, queue, nearby, activity] =
      await Promise.all([
        systemRepository.getScenarioKey(),
        systemRepository.getConnection(),
        systemRepository.getDataSaved('today'),
        systemRepository.getLocalMesh(),
        systemRepository.getInternetRelay(),
        systemRepository.getTransports(),
        systemRepository.listQueue(),
        systemRepository.getNearby(),
        systemRepository.getActivity(),
      ])

    return {
      scenario,
      connection: { ...connection, label: connection.label || STATE_LABEL[connection.state] },
      dataSaved: { total: brief.total, unit: brief.unit, cache: brief.cache },
      relay: { localMesh, internetRelay },
      transports,
      queue: summarizeQueue(queue),
      nearby,
      activity,
      quickActions: buildQuickActions({
        connection,
        relay: internetRelay,
        localMesh,
        transports,
        queue,
        nearby,
        activity,
      }),
    }
  },

  /* ── Relay (sera: ujumbe mfupi pekee · ≤5 MB/siku) ──────── */
  async getRelay() {
    const [policy, localMesh, internetRelay, messages, choices, transports, connection, dataSaved] =
      await Promise.all([
        systemRepository.getRelayPolicy(),
        systemRepository.getLocalMesh(),
        systemRepository.getInternetRelay(),
        systemRepository.getRelayMessages(),
        systemRepository.getRelayChoices(),
        systemRepository.getTransports(),
        systemRepository.getConnection(),
        systemRepository.getDataSaved('today'),
      ])

    return {
      policy,
      localMesh,
      internetRelay,
      messages: [...messages].sort((a, b) => a.priority - b.priority),
      choices,
      transports,
      connection,
      /* Data Saved ≠ Relay Data Used — vipimo viwili tofauti */
      separation: {
        relayUsedMb: internetRelay.usedMb,
        dataSavedMb: dataSaved.total,
        note: policy.messages.separate,
      },
      guardrail:
        'PASIHAI haitumii data ya mtu mwingine kimya kimya. Internet Relay inahitaji idhini yako ya wazi, hubeba ujumbe mfupi pekee, na huacha mara ukomo wa kila siku unapofikiwa. Local Mesh (Wi-Fi Direct · Bluetooth · Wi-Fi ya karibu) hubeba content kubwa bila data ya simu.',
      measurable: policy.messages.measurable,
      purpose: policy.messages.purpose,
    }
  },

  /** Chaguo za mawasiliano (help · mine · selected) — maandishi pekee. */
  async setRelayChoice(id, on) {
    const choices = await systemRepository.setRelayChoice(id, on)
    return { choices }
  },

  /** Idhini ya wazi: Internet Relay imezimwa kwa default. */
  async setInternetRelayEnabled(on) {
    return systemRepository.setInternetRelayEnabled(on)
  },

  /** Ukomo wa kila siku — unakataliwa kama unavuka 5 MB. */
  async setRelayDailyLimit(mb) {
    const res = await systemRepository.setRelayDailyLimit(mb)
    return res
  },

  /** Ujumbe unajaribiwa kupitia sera (UI haiamui). */
  async relayMessage(payload) {
    return systemRepository.relayMessage(payload)
  },

  /** Faili: relay imezuia — tunatoa maelezo + njia mbadala, bila kubadili
   *  kwenda internet kimya kimya (hakuna automatic file fallback). */
  async getFileRelayGuard() {
    const [policy, internetRelay, localMesh] = await Promise.all([
      systemRepository.getRelayPolicy(),
      systemRepository.getInternetRelay(),
      systemRepository.getLocalMesh(),
    ])
    return {
      message: policy.messages.blocked,
      detail: policy.messages.noAutoFallback,
      alternatives: policy.alternatives,
      localAvailable: localMesh.status !== 'off',
      relayEnabled: internetRelay.enabled,
    }
  },

  /* ── Nearby (watu wanajoin na identity) ──────────────────── */
  async getNearby() {
    const [nearby, connection, transports] = await Promise.all([
      systemRepository.getNearby(),
      systemRepository.getConnection(),
      systemRepository.getTransports(),
    ])
    const people = await Promise.all(
      nearby.people.map(async (p) => ({
        ...p,
        user: await identityRepository.getUser(p.userId),
      })),
    )
    return {
      ...nearby,
      people,
      connection,
      localActive: hasLocal(transports),
      note: 'Ugunduzi kamili uko Gundua. Hapa ni kile kifaa kinachokiona karibu SASA.',
    }
  },

  /* ── Foleni + Sync ───────────────────────────────────────── */
  async getQueue() {
    const [items, connection, activity] = await Promise.all([
      systemRepository.listQueue(),
      systemRepository.getConnection(),
      systemRepository.getActivity(),
    ])
    return { ...summarizeQueue(items), items, connection, lastSync: activity.summary.lastSync }
  },

  async syncNow() {
    const items = await systemRepository.syncQueue()
    const [connection, activity] = await Promise.all([
      systemRepository.getConnection(),
      systemRepository.getActivity(),
    ])
    return { ...summarizeQueue(items), items, connection, lastSync: activity.summary.lastSync }
  },

  /** Chapisho lipya: linaingia kwenye foleni ikiwa uwasilishaji unahitaji mtandao. */
  async enqueuePost({ label, detail = '', needsInternet = false, needsNearby = false }) {
    const items = await systemRepository.enqueue({
      kind: 'post',
      label: label || 'Chapisho',
      detail,
    })
    return {
      ...summarizeQueue(items),
      items,
      queued: needsInternet || needsNearby,
    }
  },

  /* ── Save Offline ────────────────────────────────────────── */
  async getSaveOffline() {
    const [items, connection, transports, nearby] = await Promise.all([
      systemRepository.getOfflineables(),
      systemRepository.getConnection(),
      systemRepository.getTransports(),
      systemRepository.getNearby(),
    ])
    const canFetch = hasInternet(connection.state) || nearby.people.length > 0
    return {
      items,
      connection,
      canFetch,
      reason: canFetch ? '' : 'Hakuna internet wala kifaa cha karibu — hakuna cha kuvuta sasa.',
      note: 'Vinavyohifadhiwa kwa matumizi bila mtandao haviongezi Data Saved hadi vitumike bila internet.',
    }
  },

  async saveOffline(id) {
    const items = await systemRepository.saveOffline(id)
    return { items }
  },

  /* ── Share Nearby (uwasilishaji, si mtandao wa kijamii) ──── */
  async getShareNearby() {
    const [items, connection, transports, nearby, relayGuard] = await Promise.all([
      systemRepository.getLocalContent(),
      systemRepository.getConnection(),
      systemRepository.getTransports(),
      systemRepository.getNearby(),
      this.getFileRelayGuard(),
    ])
    const peers = nearby.people.length
    const canShare = hasLocal(transports) && peers > 0 && items.some((i) => !i.shared)
    return {
      items,
      connection,
      peers,
      relayGuard,
      canShare,
      reason: !hasLocal(transports)
        ? 'Hakuna njia ya karibu inapatikana — washa Wi-Fi Direct au Bluetooth.'
        : peers === 0
          ? 'Hakuna kifaa cha karibu kinachoonekana — kupeana kunahitaji mtu karibu.'
          : '',
      note: 'Kushiriki kwa karibu ni uwasilishaji wa faili kifaa kwa kifaa. Hakuonekani kwa umma.',
    }
  },

  async shareNearby(id) {
    const items = await systemRepository.shareNearby(id)
    return { items }
  },

  /* ── Activity (shughuli za usafirishaji) ─────────────────── */
  async getActivity() {
    const [activity, transports] = await Promise.all([
      systemRepository.getActivity(),
      systemRepository.getTransports(),
    ])
    return { ...activity, transports, note: 'Hii ni kumbukumbu ya usafirishaji — si taarifa za kijamii.' }
  },

  /* ── Uwasilishaji wa chapisho (Post delivery) ────────────── */
  async getDeliveryOptions() {
    const [options, connection, transports] = await Promise.all([
      systemRepository.getDeliveryOptions(),
      systemRepository.getConnection(),
      systemRepository.getTransports(),
    ])

    const local = hasLocal(transports)
    const internet = hasInternet(connection.state) || anyInternetTransport(transports)

    const resolved = options.map((o) => {
      const needsInternet = o.needs.includes('internet')
      const needsNearby = o.needs.includes('nearby')
      const available = needsInternet ? internet : needsNearby ? local : true
      return {
        ...o,
        available,
        queues: !available, // haipatikani sasa → itasubiri sync
        reason: available
          ? ''
          : needsInternet
            ? 'Itasubiri sync — hakuna mtandao sasa'
            : 'Hakuna njia ya karibu — itasubiri',
      }
    })

    const recommended = resolved.find((o) => o.available && o.id !== 'local')?.id || 'local'
    return { options: resolved, connection, local, internet, recommended }
  },

  /* ── Ongeza kwenye foleni kwa chapisho linalosubiri ─────── */
  async queueFromDelivery(deliveryId, label) {
    const { options } = await this.getDeliveryOptions()
    const option = options.find((o) => o.id === deliveryId)
    const queued = !!option?.queues
    if (queued) {
      await systemRepository.enqueue({ kind: 'post', label: label || 'Chapisho', detail: `Inasubiri: ${option.label}` })
    }
    return { queued, option }
  },
}

/* ── Hesabu za foleni ───────────────────────────────────────── */

function summarizeQueue(items) {
  const counts = { waiting: 0, sending: 0, synced: 0, failed: 0 }
  for (const i of items) counts[i.state] = (counts[i.state] || 0) + 1
  const pending = counts.waiting + counts.sending
  return {
    counts,
    pending,
    headline: pending === 0 ? 'Hakuna kinachosubiri' : `Vitendo ${pending} vinasubiri`,
  }
}

/* ── Vitendo vinavyofaa SASA (contextual) ─────────────────────
   Kanuni: hatuonyeshi kila kitu kila wakati. Kila kitufe kinajua
   kama kinafaa, na kwa nini hakitumiki.                            */

function buildQuickActions({ connection, relay, localMesh, transports, queue, nearby, activity }) {
  const local = hasLocal(transports)
  const internet = hasInternet(connection.state) || anyInternetTransport(transports)
  const peers = nearby.people.length
  const pending = queue.filter((i) => i.state === 'waiting' || i.state === 'sending').length

  const meshUp = localMesh.status !== 'off'
  const relayUsable = relay.enabled || meshUp

  return [
    {
      id: 'relay',
      label: 'Relay',
      hint: relay.reached
        ? `${relay.limitMb} MB / ${relay.limitMb} MB — imesimama`
        : relay.enabled
          ? `Ujumbe mfupi pekee · ${relay.usedMb} / ${relay.limitMb} MB leo`
          : meshUp
            ? `Local Mesh: ${localMesh.label} · relay imezimwa`
            : 'Ujumbe mfupi pekee · ≤5 MB/siku',
      available: connection.state !== 'OFFLINE' && relayUsable,
      reason:
        connection.state === 'OFFLINE'
          ? 'Haipatikani — hakuna njia ya karibu wala mtandao'
          : relayUsable
            ? ''
            : 'Washa Internet Relay au washa Local Mesh kwanza',
      tone: relay.state === 'limit_reached' ? 'attention' : relay.enabled ? 'ok' : 'normal',
    },
    {
      id: 'nearby',
      label: 'Nearby',
      hint: nearby.available ? `Kifaa ${nearby.people.length} na content ${nearby.content.length} vinaonekana` : 'Hakuna kinachoonekana',
      available: nearby.available,
      reason: nearby.available ? '' : 'Hakuna kifaa kinachoonekana karibu',
      tone: 'normal',
    },
    {
      id: 'sync',
      label: 'Sync',
      hint: pending ? `Vitendo ${pending} vinasubiri` : 'Hakuna kinachosubiri',
      badge: pending || '',
      available: true,
      tone: pending ? 'attention' : 'quiet',
      reason: '',
    },
    {
      id: 'saveoffline',
      label: 'Save Offline',
      hint:
        internet || peers
          ? 'Hifadhi content kwa matumizi bila mtandao'
          : 'Hakuna internet wala kifaa cha karibu',
      available: internet || peers > 0,
      reason: internet || peers ? '' : 'Unahitaji mtandao au kifaa cha karibu',
      tone: 'normal',
    },
    {
      id: 'sharenearby',
      label: 'Share Nearby',
      hint:
        local && peers
          ? `Kifaa ${peers} vinaweza kupokea faili`
          : 'Faili si za relay — njia mbadala zinaonyeshwa',
      // Inafikiwa hata bila kifaa: panel inaeleza kwamba faili haziingii
      // Internet Relay na inatoa njia mbadala — si kufungwa kimya kimya.
      available: true,
      reason: '',
      tone: 'normal',
    },
    {
      id: 'activity',
      label: 'Activity',
      hint: `Inapokea ${activity.summary.receiving} · Kupitisha ${activity.summary.sharing} · Inasubiri ${pending}`,
      available: true,
      reason: '',
      tone: 'quiet',
    },
  ]
}
