import { InternetRelayTransport } from '../transportInterfaces.js'
import { createRelayQueue, RELAY_STATE } from './relayQueue.js'

/**
 * Live repo + local outbox. Queue/forward ≠ delivered.
 */
export class LiveInternetRelayAdapter extends InternetRelayTransport {
  constructor(systemRepo) {
    super()
    this.repo = systemRepo
    this.queue = createRelayQueue({
      sendToBackend: async (payload) => {
        if (!systemRepo?.relayMessage) return { ok: false, reason: 'no_repo' }
        return systemRepo.relayMessage({
          kind: 'text',
          recipientId: payload.recipientId,
          kb: Math.max(1, Math.ceil((payload.text || '').length / 1024)),
          label: payload.text || '',
        })
      },
    })
  }

  async relayMessage(message) {
    const enq = await this.queue.enqueue({
      recipientId: message.recipientId,
      text: message.text,
      idempotencyKey: message.idempotencyKey,
    })
    if (!enq.ok) {
      return { success: false, queued: false, delivered: false, reason: enq.reason, state: null }
    }
    const flushed = await this.queue.flushOnce()
    const mine = flushed.find((r) => r.id === enq.id) || { state: RELAY_STATE.QUEUED }
    return {
      success: mine.state === RELAY_STATE.FORWARDED || mine.state === RELAY_STATE.QUEUED,
      queued: true,
      forwarded: mine.state === RELAY_STATE.FORWARDED,
      delivered: false,
      state: mine.state,
      reason: mine.state === RELAY_STATE.FORWARDED ? 'forwarded_not_delivered' : mine.reason || mine.state,
      messageId: enq.id,
    }
  }

  async fetchRelayedMessages() {
    return []
  }

  async getQuotaInfo() {
    if (!this.repo?.getInternetRelay) return { isEnabled: false, remainingMB: 0 }
    const r = await this.repo.getInternetRelay()
    return {
      isEnabled: !!r.enabled,
      usedMB: r.usedMb,
      dailyLimitMB: r.limitMb,
      remainingMB: r.remainingMb,
    }
  }

  async enableRelay() {
    return this.repo.setInternetRelayEnabled(true)
  }

  async disableRelay() {
    return this.repo.setInternetRelayEnabled(false)
  }

  async isRelayEnabled() {
    const q = await this.getQuotaInfo()
    return q.isEnabled
  }

  async acknowledgeRelay() {
    return { messageId: null, relayed: false, delivered: false, reason: 'not_implemented' }
  }
}
