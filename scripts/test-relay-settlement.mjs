#!/usr/bin/env node
/**
 * In-process: queue → ack → settle. SI hosted.
 */
import { indexedDB, IDBKeyRange } from 'fake-indexeddb'
globalThis.indexedDB = indexedDB
globalThis.IDBKeyRange = IDBKeyRange

import { localDb } from '../src/utils/localDatabase.js'
import { createRelayQueue, RELAY_STATE } from '../src/utils/distribution/relayQueue.js'
import { createSettlementBook } from '../src/utils/distribution/relaySettlement.js'
import { DESIGN_COMMISSION_RATE } from '../src/utils/distribution/haiPointsPolicy.js'

let passed = 0
let failed = 0
function check(name, cond, extra = '') {
  if (cond) { passed++; console.log('  PASS ' + name + (extra ? ' — ' + extra : '')) }
  else { failed++; console.log('  FAIL ' + name + (extra ? ' — ' + extra : '')) }
}

console.log('\n═══ Relay settlement path (in-process; NOT hosted) ═══\n')
await localDb.destroy()
await localDb.open()

const book = createSettlementBook()
const q = createRelayQueue({ sendToBackend: async () => ({ ok: true, id: 'srv' }) })

const enq = await q.enqueue({ recipientId: 'b', text: 'hi', idempotencyKey: 's1' })
await q.flushOnce()
const tooSoon = await book.settle({ messageId: enq.id, state: RELAY_STATE.FORWARDED, compactBytes: 1024 })
check('no settle on forwarded', tooSoon.settled === false && tooSoon.reason === 'not_delivered')

await q.markDelivered(enq.id, { recipientAck: { kind: 'delivered', recipientId: 'b' } })
const item = await q.get(enq.id)
const ok = await book.settle({
  messageId: enq.id,
  state: item.payload.relayState,
  compactBytes: 1048576,
})
check('settle after delivered at 2%', ok.settled && ok.commission_rate === 0.02 && DESIGN_COMMISSION_RATE === 0.02)
check('1 MB * 2% = 0.02 MB commission', Math.abs(ok.commission_mb - 0.02) < 1e-9)
const dup = await book.settle({ messageId: enq.id, state: RELAY_STATE.DELIVERED, compactBytes: 1048576 })
check('double settlement blocked', dup.reason === 'duplicate_settlement')

const eve = await q.markDelivered(enq.id, { recipientAck: { kind: 'delivered', recipientId: 'eve' } })
check('wrong recipient still blocked', eve.delivered !== true)

console.log('\nHosted settle_relay_usage: SKIPPED')
console.log('\nRESULTS: ' + passed + ' passed, ' + failed + ' failed')
process.exit(failed ? 1 : 0)
