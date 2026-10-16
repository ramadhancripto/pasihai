#!/usr/bin/env node
import { indexedDB, IDBKeyRange } from 'fake-indexeddb'
globalThis.indexedDB = indexedDB
globalThis.IDBKeyRange = IDBKeyRange

import { localDb } from '../src/utils/localDatabase.js'
import { createDistributionEngine } from '../src/utils/distribution/engine.js'
import {
  createSessionStore,
  handleMeshHttp,
  pullViaHttp,
  livePeers,
  bytesToB64,
  generateEcdhPair,
  exportPublicJwk,
  deriveHmacKey,
  requestMac,
  hmacHex,
} from '../src/utils/distribution/meshProtocol.js'
import { sha256Hex } from '../src/utils/distribution/hash.js'
import { VISIBILITY } from '../src/utils/distribution/policy.js'
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

console.log('\n═══ Mesh protocol (in-process HTTP, not Android radios) ═══\n')

await localDb.destroy()
await localDb.open()

const a = createDistributionEngine({ deviceId: 'A', chunkBytes: 8 })
const b = createDistributionEngine({ deviceId: 'B', chunkBytes: 8 })
const payload = new TextEncoder().encode('LAN mesh protocol payload bytes!!')
const contentId = 'lan-1'
const man = await a.ingestBytes({
  contentId,
  bytes: payload,
  visibility: VISIBILITY.PUBLIC,
  authorId: 'user-a',
})
const sessions = await createSessionStore('A')

async function serverHttp(req) {
  const res = await handleMeshHttp(
    { method: req.method, path: new URL(req.url).pathname, headers: req.headers || {}, body: req.body },
    { engine: a, sessions },
  )
  if (res.binary) {
    return { status: res.status, bodyB64: bytesToB64(res.body), body: '', contentType: res.contentType }
  }
  return { status: res.status, body: res.body, contentType: res.contentType }
}

const health = await serverHttp({ url: 'http://peer/pasihai/health', method: 'GET' })
check('health no auth', health.status === 200 && JSON.parse(health.body).ok && JSON.parse(health.body).publicJwk)

const noAuth = await serverHttp({ url: 'http://peer/pasihai/manifest/' + contentId, method: 'GET' })
check('manifest requires session', noAuth.status === 401)

const result = await pullViaHttp({
  httpRequest: serverHttp,
  baseUrl: 'http://peer',
  clientDeviceId: 'B',
  engine: b,
  contentId,
  canShareCtx: { requestorId: 'B' },
})
check('http pull complete', result.job.status === 'complete')
check('http pull hash', (await sha256Hex(await b.getBytes(contentId))) === man.sha256)

await a.ingestBytes({
  contentId: 'priv-lan',
  bytes: new TextEncoder().encode('nope'),
  visibility: VISIBILITY.PRIVATE,
  authorId: 'user-a',
})
const ck = await generateEcdhPair()
const nonceSess = crypto.randomUUID()
const sess = await serverHttp({
  url: 'http://peer/pasihai/session',
  method: 'POST',
  body: JSON.stringify({
    clientDeviceId: 'B',
    clientPublicJwk: await exportPublicJwk(ck),
    nonce: nonceSess,
  }),
})
const sessInfo = JSON.parse(sess.body)
const token = sessInfo.token
const hello = JSON.parse(health.body)
const shared = await deriveHmacKey(ck.privateKey, hello.publicJwk)
check('server proof', sessInfo.proof === (await hmacHex(shared, `proof|${nonceSess}|${hello.deviceId}`)))
const nonceFixed = 'nonce-replay-1'
const ck2 = await generateEcdhPair()
const bodyReplay = JSON.stringify({
  clientDeviceId: 'B',
  clientPublicJwk: await exportPublicJwk(ck2),
  nonce: nonceFixed,
})
const s1 = await serverHttp({ url: 'http://peer/pasihai/session', method: 'POST', body: bodyReplay })
const s2 = await serverHttp({ url: 'http://peer/pasihai/session', method: 'POST', body: bodyReplay })
check('session replay rejected', s1.status === 200 && s2.status === 409)
const nomac = await serverHttp({
  url: 'http://peer/pasihai/manifest/priv-lan',
  method: 'GET',
  headers: { Authorization: 'Bearer ' + token },
})
check('request mac required', nomac.status === 401)
const mac = await requestMac(shared, 'GET', '/pasihai/manifest/priv-lan', sessInfo.sessionId)
const forbid = await serverHttp({
  url: 'http://peer/pasihai/manifest/priv-lan',
  method: 'GET',
  headers: { Authorization: 'Bearer ' + token, 'X-Pasihai-Mac': mac },
})
check('private forbidden over mesh http', forbid.status === 403)

const now = Date.now()
check(
  'stale peers expire',
  livePeers([{ host: '1.1.1.1', port: 1, lastSeen: now - 20_000 }]).length === 0,
)
check(
  'fresh nsd peer kept',
  livePeers([{ host: '10.0.0.2', port: 17432, lastSeen: now }]).length === 1,
)
check('peer without host dropped', livePeers([{ deviceId: 'ghost', lastSeen: now }]).length === 0)

const adapter = new LiveInternetRelayAdapter({
  async relayMessage() {
    return { ok: true, id: 'q1' }
  },
})
const queued = await adapter.relayMessage({ recipientId: 'u2', text: 'hi' })
check('relay queue ≠ delivered', queued.queued === true && queued.delivered === false)
const ack = await adapter.acknowledgeRelay('q1')
check('relay ack not pretended', ack.delivered === false && ack.relayed === false)

console.log('\nRESULTS: ' + passed + ' passed, ' + failed + ' failed')
process.exit(failed ? 1 : 0)
