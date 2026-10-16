#!/usr/bin/env node
import { indexedDB, IDBKeyRange } from 'fake-indexeddb'
globalThis.indexedDB = indexedDB
globalThis.IDBKeyRange = IDBKeyRange

import { localDb } from '../src/utils/localDatabase.js'
import { createDistributionEngine } from '../src/utils/distribution/engine.js'
import { createLoopbackHub, createLoopbackTransport } from '../src/utils/distribution/loopbackTransport.js'
import { LocalContentProvider } from '../src/utils/distribution/localContentProvider.js'
import { sha256Hex } from '../src/utils/distribution/hash.js'
import { VISIBILITY } from '../src/utils/distribution/policy.js'
import { listNativePeers } from '../src/utils/distribution/nativeMesh.js'

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

console.log('\n═══ Distribution engine ═══\n')

await localDb.destroy()
await localDb.open()

const a = createDistributionEngine({ deviceId: 'A', chunkBytes: 8 })
const b = createDistributionEngine({ deviceId: 'B', chunkBytes: 8 })
const payload = new TextEncoder().encode('Pasihai mesh chunk-test payload!!')
const id = 'cid-1'
const man = await a.ingestBytes({
  contentId: id,
  bytes: payload,
  contentType: 'file',
  visibility: VISIBILITY.PUBLIC,
  authorId: 'user-a',
  maxHops: 2,
})
check('ingest complete', man.complete === true && man.chunkCount > 1)
const back = await a.getBytes(id)
check('roundtrip hash', (await sha256Hex(back)) === man.sha256)

const hub = createLoopbackHub()
hub.register('A', a)
hub.register('B', b)
const tB = createLoopbackTransport(hub, 'B')
check('loopback peers for B', (await tB.listPeers()).some((p) => p.id === 'A'))
check('loopback is not ble', (await tB.listPeers())[0].transport === 'loopback')

await tB.pull('A', id, b, { requestorId: 'user-b' })
const bBytes = await b.getBytes(id)
check('B received matching hash', (await sha256Hex(bBytes)) === man.sha256)

const { splitBytes } = await import('../src/utils/distribution/chunk.js')
const partialId = 'cid-partial'
const parts = splitBytes(payload, 8)
const hashes = []
for (const p of parts) hashes.push(await sha256Hex(p))
const c = createDistributionEngine({ deviceId: 'C', chunkBytes: 8 })
await c.acceptManifest(
  {
    contentId: partialId,
    sha256: man.sha256,
    sizeBytes: payload.byteLength,
    chunkBytes: 8,
    chunkCount: parts.length,
    chunkHashes: hashes,
    contentType: 'file',
    visibility: VISIBILITY.PUBLIC,
    authorId: 'user-a',
    maxHops: 2,
    hopsRemaining: 2,
    complete: false,
  },
  { requestorId: 'c' },
)
await c.putChunk(partialId, 0, parts[0], hashes[0])
let incomplete = false
try {
  await c.getBytes(partialId)
} catch (e) {
  incomplete = e.code === 'INCOMPLETE'
}
check('incomplete is not playable', incomplete)

hub.register('C', c)
const job = await c.pullFrom(a, id, { requestorId: 'c', peerId: 'A' })
check('resume completes', job.status === 'complete')
check('resume hash', (await sha256Hex(await c.getBytes(id))) === man.sha256)

const priv = await a.ingestBytes({
  contentId: 'priv-1',
  bytes: new TextEncoder().encode('secret'),
  visibility: VISIBILITY.PRIVATE,
  authorId: 'user-a',
})
let forbidden = false
try {
  await b.acceptManifest(priv, { requestorId: 'user-b' })
} catch {
  forbidden = true
}
check('private not accepted by stranger', forbidden)

const provider = new LocalContentProvider(a)
const listed = await provider.listAvailableContent({})
check('provider lists public not private', listed.some((x) => x.contentId === id) && !listed.some((x) => x.contentId === 'priv-1'))

const native = await listNativePeers()
check('native peers empty without plugin', native.peers.length === 0 && native.available === false)

const dup = await b.pullFrom(a, id, { requestorId: 'user-b', peerId: 'A' })
check('duplicate pull is complete not a second copy error', dup.status === 'complete')

console.log('\nRESULTS: ' + passed + ' passed, ' + failed + ' failed')
process.exit(failed ? 1 : 0)
