#!/usr/bin/env node
/**
 * In-process mailbox. SI hosted Internet relay.
 * Proves sender outbox → fake backend queue → recipient fetch → ack → delivered.
 */
import { indexedDB, IDBKeyRange } from 'fake-indexeddb'
globalThis.indexedDB = indexedDB
globalThis.IDBKeyRange = IDBKeyRange

import { localDb } from '../src/utils/localDatabase.js'
import { createRelayQueue, RELAY_STATE } from '../src/utils/distribution/relayQueue.js'

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

console.log('\n═══ Relay integration (in-process backend double; NOT hosted) ═══\n')
await localDb.destroy()
await localDb.open()

const hosted = new Map()
function createMailboxBackend() {
  return {
    async accept(payload) {
      const id = payload.idempotency || crypto.randomUUID()
      if ([...hosted.values()].some((m) => m.clientId === payload.clientId)) {
        return { ok: true, id, duplicate: true }
      }
      hosted.set(id, {
        id,
        clientId: payload.clientId,
        recipientId: payload.recipientId,
        text: payload.text,
        state: 'queued',
      })
      return { ok: true, id }
    },
    inbox(uid) {
      return [...hosted.values()].filter((m) => m.recipientId === uid && m.state !== 'delivered')
    },
    ack(uid, id) {
      const m = hosted.get(id)
      if (!m) return { ok: false, reason: 'missing' }
      if (m.recipientId !== uid) return { ok: false, reason: 'forbidden' }
      m.state = 'delivered'
      return { ok: true, state: 'delivered' }
    },
  }
}

const box = createMailboxBackend()
const sender = createRelayQueue({
  sendToBackend: async (p) => box.accept({ ...p, clientId: 'idem-int' }),
})

const enq = await sender.enqueue({
  recipientId: 'user-b',
  text: 'hello',
  idempotencyKey: 'idem-int',
})
const fl = await sender.flushOnce()
check('sender forwarded after backend accept', fl[0].state === RELAY_STATE.FORWARDED && fl[0].delivered === false)

const inbox = box.inbox('user-b')
check('recipient fetch sees item', inbox.length === 1)
check('unauthorized inbox empty', box.inbox('eve').length === 0)

const forbidden = box.ack('eve', inbox[0].id)
check('unauthorized ack rejected', forbidden.ok === false)

const ack = box.ack('user-b', inbox[0].id)
check('recipient ack on backend', ack.state === 'delivered')

const localDeliver = await sender.markDelivered(enq.id, {
  recipientAck: { kind: 'delivered', recipientId: 'user-b' },
})
check('local delivered only after matching ack', localDeliver.delivered === true)

const restart = createRelayQueue({ sendToBackend: async () => ({ ok: true, id: 'x' }) })
const after = await restart.get(enq.id)
check('survives new queue instance (same IDB)', after.payload.relayState === RELAY_STATE.DELIVERED)

const back = await sender.markDelivered(enq.id, {
  recipientAck: { kind: 'delivered', recipientId: 'user-b' },
})
check('no downgrade after delivered', back.delivered === true)

console.log('\nThis is NOT evidence of hosted relay_message RPC.')
console.log('\nRESULTS: ' + passed + ' passed, ' + failed + ' failed')
process.exit(failed ? 1 : 0)
