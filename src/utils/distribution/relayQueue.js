import { outboxManager, STATUS } from '../outboxManager.js'
import { outbox } from '../localDatabase.js'

export const RELAY_STATE = {
  QUEUED: 'queued',
  FORWARDED: 'forwarded',
  DELIVERED: 'delivered',
  READ: 'read',
  EXPIRED: 'expired',
  FAILED: 'failed',
}

const TYPE = 'internet_relay'

const RANK = {
  [RELAY_STATE.QUEUED]: 0,
  [RELAY_STATE.FAILED]: 0,
  [RELAY_STATE.FORWARDED]: 1,
  [RELAY_STATE.DELIVERED]: 2,
  [RELAY_STATE.READ]: 3,
  [RELAY_STATE.EXPIRED]: 9,
}

function canAdvance(from, to) {
  if (from === to) return true
  if (from === RELAY_STATE.EXPIRED) return false
  if (to === RELAY_STATE.EXPIRED) return from !== RELAY_STATE.DELIVERED && from !== RELAY_STATE.READ
  if (from === RELAY_STATE.FAILED && to === RELAY_STATE.FORWARDED) return true
  if (from === RELAY_STATE.FAILED && to === RELAY_STATE.QUEUED) return true
  return RANK[to] > RANK[from]
}

export function createRelayQueue({ sendToBackend, now = () => Date.now() } = {}) {
  async function save(a) {
    await outbox.put(a)
    return a
  }

  async function transition(id, to, patch) {
    const a = await outboxManager.getAction(id)
    if (!a || a.type !== TYPE) return { ok: false, reason: 'missing' }
    const from = a.payload.relayState
    if (!canAdvance(from, to)) {
      return { ok: false, reason: 'illegal_transition', from, to, state: from }
    }
    Object.assign(a.payload, patch, { relayState: to })
    a.updatedAt = new Date(now()).toISOString()
    if (to === RELAY_STATE.FORWARDED) a.status = STATUS.SENT_TO_SERVER
    if (to === RELAY_STATE.FAILED || to === RELAY_STATE.EXPIRED) a.status = STATUS.FAILED
    await save(a)
    return { ok: true, state: to, action: a }
  }

  return {
    async enqueue({ recipientId, text, idempotencyKey, ttlMs = 86400000, contentId = null }) {
      if (!recipientId) {
        return { ok: false, state: null, reason: 'no_recipient' }
      }
      const item = await outboxManager.enqueue({
        type: TYPE,
        idempotencyKey,
        priority: 1,
        payload: {
          recipientId,
          text: text || '',
          contentId,
          relayState: RELAY_STATE.QUEUED,
          expiresAt: now() + ttlMs,
          forwardedAt: null,
          deliveredAt: null,
          readAt: null,
        },
      })
      return { ok: true, id: item.id, state: item.payload.relayState }
    },

    async get(id) {
      const a = await outboxManager.getAction(id)
      if (!a || a.type !== TYPE) return null
      return a
    },

    async flushOnce() {
      const q = await outboxManager.getQueue({ type: TYPE })
      const results = []
      for (const a of q) {
        const p = a.payload || {}
        if (p.relayState === RELAY_STATE.DELIVERED || p.relayState === RELAY_STATE.READ) {
          results.push({ id: a.id, state: p.relayState, skipped: true })
          continue
        }
        if (p.expiresAt && now() > p.expiresAt) {
          const t = await transition(a.id, RELAY_STATE.EXPIRED, { lastError: 'expired' })
          results.push({ id: a.id, state: t.state || p.relayState, delivered: false })
          continue
        }
        if (p.relayState === RELAY_STATE.FORWARDED) {
          results.push({ id: a.id, state: RELAY_STATE.FORWARDED, delivered: false })
          continue
        }
        if (!sendToBackend) {
          results.push({ id: a.id, state: RELAY_STATE.QUEUED, reason: 'no_backend' })
          continue
        }
        try {
          const r = await sendToBackend(p)
          if (r && r.ok) {
            const t = await transition(a.id, RELAY_STATE.FORWARDED, {
              forwardedAt: new Date(now()).toISOString(),
              backendId: r.id || r.messageId || null,
            })
            results.push({ id: a.id, state: t.state, delivered: false })
          } else {
            await transition(a.id, RELAY_STATE.FAILED, { lastError: r?.reason || 'backend_rejected' })
            results.push({ id: a.id, state: RELAY_STATE.FAILED, delivered: false })
          }
        } catch (e) {
          await transition(a.id, RELAY_STATE.FAILED, { lastError: e.message || 'network' })
          results.push({ id: a.id, state: RELAY_STATE.FAILED, delivered: false, reason: 'network' })
        }
      }
      return results
    },

    async markDelivered(id, { recipientAck } = {}) {
      if (!recipientAck || recipientAck.kind !== 'delivered') {
        return { ok: false, reason: 'no_recipient_ack', delivered: false }
      }
      const a = await outboxManager.getAction(id)
      if (!a) return { ok: false, reason: 'missing', delivered: false }
      if (recipientAck.recipientId !== a.payload.recipientId) {
        return { ok: false, reason: 'wrong_recipient', delivered: false }
      }
      const t = await transition(id, RELAY_STATE.DELIVERED, {
        deliveredAt: new Date(now()).toISOString(),
      })
      return { ok: t.ok, state: t.state, delivered: t.ok === true, reason: t.reason }
    },

    async markRead(id, { recipientAck } = {}) {
      if (!recipientAck || recipientAck.kind !== 'read') {
        return { ok: false, reason: 'no_recipient_ack' }
      }
      const a = await outboxManager.getAction(id)
      if (!a) return { ok: false, reason: 'missing' }
      if (recipientAck.recipientId !== a.payload.recipientId) {
        return { ok: false, reason: 'wrong_recipient' }
      }
      const t = await transition(id, RELAY_STATE.READ, {
        readAt: new Date(now()).toISOString(),
      })
      return { ok: t.ok, state: t.state, reason: t.reason }
    },
  }
}
