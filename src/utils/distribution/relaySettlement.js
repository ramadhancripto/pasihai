import { RELAY_STATE } from './relayQueue.js'
import { DESIGN_COMMISSION_RATE } from './haiPointsPolicy.js'

/** Local contract matching proposed 038. Not hosted. */
export function createSettlementBook({ rate = DESIGN_COMMISSION_RATE } = {}) {
  const done = new Set()
  return {
    rate,
    async settle({ messageId, state, compactBytes, providerId }) {
      if (!messageId) return { ok: false, settled: false, reason: 'missing' }
      if (state !== RELAY_STATE.DELIVERED && state !== 'delivered') {
        return { ok: false, settled: false, reason: 'not_delivered', state }
      }
      if (done.has(messageId)) {
        return { ok: false, settled: false, reason: 'duplicate_settlement' }
      }
      const commissionMb = ((Number(compactBytes) || 0) / 1048576) * rate
      done.add(messageId)
      return {
        ok: true,
        settled: true,
        commission_rate: rate,
        commission_mb: commissionMb,
        messageId,
        providerId: providerId || null,
      }
    },
  }
}
