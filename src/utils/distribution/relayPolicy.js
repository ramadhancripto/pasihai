/**
 * Internet Relay — daily free allowance.
 * Period: CALENDAR DAY (same as mb_balances.daily_reset / relay_quotas.daily_reset_at).
 * User may accept 3 MB or 5 MB/day. 5 MB is the free cap, not a different period.
 */
export const RELAY_PERIOD = 'daily'

export const RELAY_POLICY = {
  period: RELAY_PERIOD,
  allowedDailyMb: [3, 5],
  defaultDailyMb: 3,
  hardMaxMb: 5,
  maxMessageBytes: 20 * 1024,
  dailyMessageLimit: 500,
  eligibleKinds: ['text', 'deliveryMeta', 'statusUpdate', 'notification'],
  mediaKindsBlocked: ['video', 'image', 'file', 'reel', 'media'],
}

export function parseDailyMb(value) {
  const n = Number(value)
  if (n === 3 || n === 5) return n
  return null
}

export function evaluateRelayAttempt({
  kind = 'text',
  payloadBytes = 0,
  dailyLimitMb = RELAY_POLICY.defaultDailyMb,
  usedBytes = 0,
  messagesSent = 0,
  fragmentGroupId = null,
  fragmentStore = null,
  enabled = true,
} = {}) {
  if (!enabled) {
    return { ok: false, reason: 'off', message: 'Internet Relay imezimwa' }
  }
  const limitMb = parseDailyMb(dailyLimitMb)
  if (limitMb == null) {
    return { ok: false, reason: 'quota_not_accepted', message: 'Chagua MB 3 au MB 5 kwa siku' }
  }
  if (RELAY_POLICY.mediaKindsBlocked.includes(kind) || !RELAY_POLICY.eligibleKinds.includes(kind)) {
    return {
      ok: false,
      reason: 'media',
      message: 'Video/faili kubwa hazitumii free Internet Relay',
    }
  }
  const bytes = Number(payloadBytes) || 0
  if (bytes <= 0) return { ok: false, reason: 'invalid', message: 'Ukubwa haujulikani' }
  if (bytes > RELAY_POLICY.maxMessageBytes) {
    return {
      ok: false,
      reason: 'too_large',
      message: 'Ujumbe unazidi 20 KB — si relay ya bure',
      capBytes: RELAY_POLICY.maxMessageBytes,
    }
  }
  if (fragmentGroupId && fragmentStore) {
    const prev = fragmentStore.get(fragmentGroupId) || 0
    if (prev + bytes > RELAY_POLICY.maxMessageBytes) {
      return { ok: false, reason: 'split_evasion', message: 'Hauruhusiwi kugawa ujumbe ili kukwepa ukomo' }
    }
  }
  if (messagesSent + 1 > RELAY_POLICY.dailyMessageLimit) {
    return { ok: false, reason: 'message_count', message: 'Idadi ya ujumbe ya leo imeisha' }
  }
  const limitBytes = limitMb * 1024 * 1024
  if (usedBytes + bytes > limitBytes) {
    const remaining = Math.max(0, limitBytes - usedBytes)
    return {
      ok: false,
      reason: 'quota_exhausted',
      message: 'Kiwango cha MB cha leo kimeisha',
      usedBytes,
      remainingBytes: remaining,
      limitMb,
      period: RELAY_PERIOD,
    }
  }
  if (fragmentGroupId && fragmentStore) {
    fragmentStore.set(fragmentGroupId, (fragmentStore.get(fragmentGroupId) || 0) + bytes)
  }
  return {
    ok: true,
    usedBytes,
    remainingBytes: limitBytes - usedBytes - bytes,
    limitMb,
    period: RELAY_PERIOD,
    overFreeAllowance: false,
  }
}

export function quotaSnapshot({ dailyLimitMb, usedBytes = 0 }) {
  const limitMb = parseDailyMb(dailyLimitMb) || 0
  const limitBytes = limitMb * 1024 * 1024
  return {
    period: RELAY_PERIOD,
    limitMb,
    usedMb: usedBytes / (1024 * 1024),
    remainingMb: Math.max(0, (limitBytes - usedBytes) / (1024 * 1024)),
    accepted: limitMb === 3 || limitMb === 5,
  }
}
