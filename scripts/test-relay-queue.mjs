#!/usr/bin/env node
import { indexedDB, IDBKeyRange } from 'fake-indexeddb'
globalThis.indexedDB = indexedDB
globalThis.IDBKeyRange = IDBKeyRange

import { localDb } from '../src/utils/localDatabase.js'
import { createRelayQueue, RELAY_STATE } from '../src/utils/distribution/relayQueue.js'
import { LiveInternetRelayAdapter } from '../src/utils/distribution/internetRelayAdapter.js'

let passed = 0
let failed = 0
function check(name, cond, extra = '') {
  if (cond) {
    passed++
    console.log('  PASS ' + name + (extra ? ' — ' + extra : ''))
  } else {
    failed++
    console.log('  FAIL ' + name + (extra ? ' — ' + extra : ''))
  }
}

console.log('\n═══ Relay queue (local outbox; not hosted) ═══\n')
await localDb.destroy()
await localDb.open()

let clock = 1_000
const q = createRelayQueue({
  now: () => clock,
  sendToBackend: async () => ({ ok: true, id: 'srv-1' }),
})

const noRec = await q.enqueue({ text: 'x' })
check('no recipient rejected', noRec.ok === false && noRec.reason === 'no_recipient')

const a = await q.enqueue({ recipientId: 'b', text: 'hi', idempotencyKey: 'idem-1', ttlMs: 5000 })
check('enqueued as queued', a.ok && a.state === RELAY_STATE.QUEUED)
const dup = await q.enqueue({ recipientId: 'b', text: 'hi', idempotencyKey: 'idem-1' })
check('duplicate idempotency returns same id', dup.id === a.id)

const flushed = await q.flushOnce()
check('flush is forwarded not delivered', flushed[0].state === RELAY_STATE.FORWARDED && flushed[0].delivered === false)
const again = await q.flushOnce()
check('second flush does not re-deliver', again[0].state === RELAY_STATE.FORWARDED && again[0].delivered === false)

const noAck = await q.markDelivered(a.id, {})
check('delivered requires recipient ack', noAck.delivered === false)
const wrong = await q.markDelivered(a.id, { recipientAck: { kind: 'delivered', recipientId: 'eve' } })
check('wrong recipient cannot deliver', wrong.delivered === false)
const yes = await q.markDelivered(a.id, { recipientAck: { kind: 'delivered', recipientId: 'b' } })
check('delivered only with ack', yes.delivered === true && yes.state === RELAY_STATE.DELIVERED)
const readTooSoon = await q.markRead(a.id, {})
check('read requires ack', readTooSoon.ok === false)
const read = await q.markRead(a.id, { recipientAck: { kind: 'read', recipientId: 'b' } })
check('read after delivered', read.state === RELAY_STATE.READ)

await localDb.destroy()
await localDb.open()
let calls = 0
const net = createRelayQueue({
  now: () => clock,
  sendToBackend: async () => {
    calls++
    throw new Error('offline')
  },
})
const n = await net.enqueue({ recipientId: 'b', text: 'z', idempotencyKey: 'n1' })
const nf = await net.flushOnce()
check('network failure stays not delivered', nf[0].state === RELAY_STATE.FAILED && nf[0].delivered === false)

await localDb.destroy()
await localDb.open()
clock = 10
const exp = createRelayQueue({
  now: () => clock,
  sendToBackend: async () => ({ ok: true }),
})
const e = await exp.enqueue({ recipientId: 'b', text: 'old', idempotencyKey: 'e1', ttlMs: 5 })
clock = 20
const ef = await exp.flushOnce()
check('expired not forwarded', ef[0].state === RELAY_STATE.EXPIRED)

const adapter = new LiveInternetRelayAdapter({
  async relayMessage() {
    return { ok: true, id: 'rpc' }
  },
})
const r = await adapter.relayMessage({ recipientId: 'u2', text: 'hi', idempotencyKey: 'ad1' })
check('adapter forwarded ≠ delivered', r.forwarded === true && r.delivered === false)

console.log('\nHosted relay: SKIPPED (no staging credentials in this run)')
console.log('\nRESULTS: ' + passed + ' passed, ' + failed + ' failed')
process.exit(failed ? 1 : 0)
