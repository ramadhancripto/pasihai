/**
 * In-process Local Relay Lab.
 * Peers here are SIMULATED. Not NSD, not BLE, not physical phones.
 */
import { createDistributionEngine, createMemoryStores } from './engine.js'
import {
  createSessionStore,
  handleMeshHttp,
  pullViaHttp,
  bytesToB64,
} from './meshProtocol.js'
import { VISIBILITY } from './policy.js'
import { sha256Hex } from './hash.js'

function encoder(text) {
  return new TextEncoder().encode(text)
}

export function createLocalRelayLab() {
  const logs = []
  const log = (msg, extra = {}) => {
    logs.push({ at: new Date().toISOString(), msg, ...extra })
  }

  let seq = 0
  const deviceA = createDistributionEngine({
    deviceId: 'SIM-A',
    chunkBytes: 24,
    stores: createMemoryStores(),
    sharingIndex: null,
  })
  const deviceB = createDistributionEngine({
    deviceId: 'SIM-B',
    chunkBytes: 24,
    stores: createMemoryStores(),
    sharingIndex: null,
  })

  let sessions = null

  async function httpFromA(req) {
    if (!sessions) sessions = await createSessionStore('SIM-A')
    const url = new URL(req.url, 'http://sim-a.lab')
    const res = await handleMeshHttp(
      {
        method: req.method,
        path: url.pathname,
        headers: req.headers || {},
        body: req.body,
      },
      { engine: deviceA, sessions },
    )
    if (res.binary) {
      return { status: res.status, bodyB64: bytesToB64(res.body), body: '', contentType: res.contentType }
    }
    return { status: res.status, body: res.body, contentType: res.contentType }
  }

  return {
    mode: 'simulation',
    disclaimer:
      'SIMULATION — vifaa SIM-A/SIM-B si simu halisi wala NSD. Hash ni ya engine halisi.',
    logs,
    devices: [
      { id: 'SIM-A', role: 'sender', kind: 'simulated' },
      { id: 'SIM-B', role: 'receiver', kind: 'simulated' },
    ],

    snapshot() {
      return {
        mode: 'simulation',
        disclaimer: this.disclaimer,
        devices: this.devices,
        logCount: logs.length,
        logs: logs.slice(-30),
      }
    },

    async runScenario(name = 'public-transfer') {
      seq += 1
      const contentId = `lab-${name}-${seq}`
      log('scenario_start', { name, contentId })

      if (name === 'private-deny') {
        const payload = encoder('secret-lab-payload')
        const man = await deviceA.ingestBytes({
          contentId,
          bytes: payload,
          visibility: VISIBILITY.PRIVATE,
          authorId: 'sim-a',
        })
        try {
          await pullViaHttp({
            httpRequest: httpFromA,
            baseUrl: 'http://sim-a.lab',
            clientDeviceId: 'SIM-B',
            engine: deviceB,
            contentId,
            canShareCtx: { requestorId: 'SIM-B' },
          })
          log('unexpected_success', { name })
          return { ok: false, reason: 'should_deny', simulated: true }
        } catch (e) {
          log('private_denied', { status: e.status || e.message })
          return {
            ok: true,
            simulated: true,
            denied: true,
            reason: e.status === 403 || /forbidden|Ruhusa/i.test(String(e.message)) ? 'forbidden' : String(e.message),
            sha256Sender: man.sha256,
            physicalDevice: false,
          }
        }
      }

      const payload = encoder(`pasihai-lab ${name} ${contentId} ${Date.now()}`)
      const man = await deviceA.ingestBytes({
        contentId,
        bytes: payload,
        visibility: VISIBILITY.PUBLIC,
        authorId: 'sim-a',
      })
      log('ingested', { contentId, sha256: man.sha256, chunks: man.chunkCount })

      if (name === 'interrupt-resume') {
        await deviceB.acceptManifest(man, { requestorId: 'SIM-B' })
        const first = await deviceA.getChunkBytes(contentId, 0)
        await deviceB.putChunk(contentId, 0, first.bytes, man.chunkHashes[0])
        let incomplete = false
        try {
          await deviceB.getBytes(contentId)
        } catch (e) {
          incomplete = e.code === 'INCOMPLETE'
        }
        log('interrupted', { incomplete })
        const job = await deviceB.pullFrom(deviceA, contentId, { requestorId: 'SIM-B', peerId: 'SIM-A' })
        const got = await deviceB.getBytes(contentId)
        const h = await sha256Hex(got)
        const match = h === man.sha256
        log('resumed', { match, job: job.status })
        return {
          ok: match && incomplete && job.status === 'complete',
          simulated: true,
          physicalDevice: false,
          interrupted: true,
          incompleteWasUnplayable: incomplete,
          sha256Sender: man.sha256,
          sha256Receiver: h,
          integrity: match,
          delivered: match,
          contentId,
        }
      }

      const result = await pullViaHttp({
        httpRequest: httpFromA,
        baseUrl: 'http://sim-a.lab',
        clientDeviceId: 'SIM-B',
        engine: deviceB,
        contentId,
        canShareCtx: { requestorId: 'SIM-B' },
      })
      const got = await deviceB.getBytes(contentId)
      const h = await sha256Hex(got)
      const match = h === man.sha256
      log('transfer_done', { match, job: result.job.status })

      if (name === 'duplicate') {
        const again = await pullViaHttp({
          httpRequest: httpFromA,
          baseUrl: 'http://sim-a.lab',
          clientDeviceId: 'SIM-B',
          engine: deviceB,
          contentId,
          canShareCtx: { requestorId: 'SIM-B' },
        })
        log('duplicate_pull', { status: again.job.status })
        return {
          ok: match && again.job.status === 'complete',
          simulated: true,
          physicalDevice: false,
          duplicate: true,
          sha256Sender: man.sha256,
          sha256Receiver: h,
          integrity: match,
          delivered: match,
          contentId,
        }
      }

      return {
        ok: match && result.job.status === 'complete',
        simulated: true,
        physicalDevice: false,
        sha256Sender: man.sha256,
        sha256Receiver: h,
        integrity: match,
        delivered: match,
        job: result.job.status,
        contentId,
      }
    },
  }
}
