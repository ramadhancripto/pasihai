/**
 * Hai Points — existing ledger (028 hai_points_ledger). Not a second currency.
 * Design: 1 Hai Point = 5 MB extra relay after daily free allowance.
 * Schema commission_rate default is 0.10 (10%). Design discussion was 2%.
 * Do not migrate production to 2% without owner permission.
 */
export const HAI_MB_PER_POINT = 5
/** 028 default 0.10. Proposed 038 sets 0.02. Hosted until 038 applied: still 10%. */
export const SCHEMA_COMMISSION_RATE_028 = 0.1
export const SCHEMA_COMMISSION_RATE_038 = 0.02
export const DESIGN_COMMISSION_RATE = 0.02
export const SCHEMA_COMMISSION_RATE = SCHEMA_COMMISSION_RATE_038

const spentKeys = new Set()

export function quoteHaiSpend({ extraBytes }) {
  const extraMb = Math.max(0, Number(extraBytes) || 0) / (1024 * 1024)
  const points = extraMb / HAI_MB_PER_POINT
  return {
    extraMb,
    points,
    needsConsent: points > 0,
    mbPerPoint: HAI_MB_PER_POINT,
    commissionNote: `schema ${SCHEMA_COMMISSION_RATE} vs design ${DESIGN_COMMISSION_RATE} — not applied`,
  }
}

export function authorizeHaiSpend({ consent, idempotencyKey, extraBytes, balance = 0 }) {
  if (!consent?.accepted) {
    return { ok: false, charged: false, reason: 'no_consent' }
  }
  if (!idempotencyKey) return { ok: false, charged: false, reason: 'no_idempotency' }
  if (spentKeys.has(idempotencyKey)) {
    return { ok: false, charged: false, reason: 'duplicate', alreadyCharged: true }
  }
  const q = quoteHaiSpend({ extraBytes })
  if (q.points > balance) return { ok: false, charged: false, reason: 'insufficient_points' }
  spentKeys.add(idempotencyKey)
  return {
    ok: true,
    charged: true,
    points: q.points,
    extraMb: q.extraMb,
    settlement: 'usage_must_be_verified_before_provider_payout',
  }
}

export function _resetHaiSpendKeysForTests() {
  spentKeys.clear()
}
