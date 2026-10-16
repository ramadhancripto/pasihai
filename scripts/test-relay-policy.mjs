#!/usr/bin/env node
import { evaluateRelayAttempt, parseDailyMb, RELAY_POLICY } from '../src/utils/distribution/relayPolicy.js'
import { quoteHaiSpend, authorizeHaiSpend, _resetHaiSpendKeysForTests, HAI_MB_PER_POINT, SCHEMA_COMMISSION_RATE, DESIGN_COMMISSION_RATE, SCHEMA_COMMISSION_RATE_028 } from '../src/utils/distribution/haiPointsPolicy.js'

let passed = 0
let failed = 0
function check(name, cond, extra = '') {
  if (cond) { passed++; console.log('  PASS ' + name + (extra ? ' — ' + extra : '')) }
  else { failed++; console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')) }
}

console.log('\n═══ Relay quota / Hai Points (local policy; not hosted) ═══\n')
check('only 3 or 5 accepted', parseDailyMb(3) === 3 && parseDailyMb(5) === 5 && parseDailyMb(4) == null)
check('period is daily', RELAY_POLICY.period === 'daily')

const u3 = evaluateRelayAttempt({ kind: 'text', payloadBytes: 100, dailyLimitMb: 3, usedBytes: 0, enabled: true })
const u5 = evaluateRelayAttempt({ kind: 'text', payloadBytes: 100, dailyLimitMb: 5, usedBytes: 0, enabled: true })
check('user A 3MB remaining', u3.ok && u3.limitMb === 3)
check('user B 5MB remaining', u5.ok && u5.limitMb === 5)

const full = evaluateRelayAttempt({
  kind: 'text', payloadBytes: 100, dailyLimitMb: 3, usedBytes: 3 * 1024 * 1024, enabled: true,
})
check('quota exhausted', full.reason === 'quota_exhausted')

const big = evaluateRelayAttempt({ kind: 'text', payloadBytes: 21 * 1024, dailyLimitMb: 5, enabled: true })
check('single message over 20KB', big.reason === 'too_large')

const count = evaluateRelayAttempt({
  kind: 'text', payloadBytes: 10, dailyLimitMb: 5, messagesSent: 500, enabled: true,
})
check('message count limit', count.reason === 'message_count')

const store = new Map()
const a = evaluateRelayAttempt({
  kind: 'text', payloadBytes: 12 * 1024, dailyLimitMb: 5, fragmentGroupId: 'g1', fragmentStore: store, enabled: true,
})
const b = evaluateRelayAttempt({
  kind: 'text', payloadBytes: 12 * 1024, dailyLimitMb: 5, fragmentGroupId: 'g1', fragmentStore: store, enabled: true,
})
check('split evasion blocked', a.ok && b.reason === 'split_evasion')

const vid = evaluateRelayAttempt({ kind: 'video', payloadBytes: 100, dailyLimitMb: 5, enabled: true })
check('video not free relay', vid.reason === 'media')

_resetHaiSpendKeysForTests()
const q = quoteHaiSpend({ extraBytes: 5 * 1024 * 1024 })
check('1 point = 5 MB', q.points === 1 && HAI_MB_PER_POINT === 5)
const no = authorizeHaiSpend({ consent: { accepted: false }, idempotencyKey: 'k1', extraBytes: 5 * 1024 * 1024, balance: 10 })
check('no consent no charge', no.charged === false && no.reason === 'no_consent')
const yes = authorizeHaiSpend({ consent: { accepted: true }, idempotencyKey: 'k1', extraBytes: 5 * 1024 * 1024, balance: 10 })
check('consent charges once', yes.charged === true)
const dup = authorizeHaiSpend({ consent: { accepted: true }, idempotencyKey: 'k1', extraBytes: 5 * 1024 * 1024, balance: 10 })
check('double charge blocked', dup.alreadyCharged === true && dup.charged === false)
check('038 commission 2% matches design', SCHEMA_COMMISSION_RATE === 0.02 && DESIGN_COMMISSION_RATE === 0.02)
check('028 still documented as 10% until applied', SCHEMA_COMMISSION_RATE_028 === 0.1)

console.log('\nHosted quota RPC: SKIPPED')
console.log('\nRESULTS: ' + passed + ' passed, ' + failed + ' failed')
process.exit(failed ? 1 : 0)
