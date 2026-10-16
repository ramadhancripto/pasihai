import { handleMeshHttp, createSessionStore, livePeers, MESH_PROTOCOL, bytesToB64 } from './meshProtocol.js'

function plugin() {
  const cap = typeof window !== 'undefined' ? window.Capacitor : null
  return cap?.Plugins?.PasihaiMesh || null
}

export async function listNativePeers() {
  const p = plugin()
  if (!p) return { available: false, peers: [], reason: 'plugin_missing' }
  try {
    const res = await p.listPeers()
    const raw = Array.isArray(res?.peers) ? res.peers : []
    const peers = livePeers(raw)
    return {
      available: true,
      peers,
      reason: res?.reason || (peers.length ? null : 'no_live_peers'),
      discovering: !!res?.discovering,
    }
  } catch (e) {
    return { available: false, peers: [], reason: e?.message || 'plugin_error' }
  }
}

export async function nativeCapabilities() {
  const p = plugin()
  if (!p) {
    return {
      plugin: false,
      bluetooth: false,
      wifiDirect: false,
      lanNsd: false,
      lanHttpTransferImplemented: false,
      bluetoothTransferImplemented: false,
      backgroundGuaranteed: false,
    }
  }
  try {
    return await p.getCapabilities()
  } catch {
    return { plugin: true, bluetooth: false, wifiDirect: false, lanHttpTransferImplemented: false }
  }
}

let listenerHandle = null
let sessions = null

export async function startNativeMesh({ engine, deviceId, secret, canShare, discoverable = true }) {
  const p = plugin()
  if (!p) return { ok: false, reason: 'plugin_missing' }
  sessions = await createSessionStore(deviceId)
  if (listenerHandle?.remove) await listenerHandle.remove()
  listenerHandle = await p.addListener('meshHttp', async (ev) => {
    try {
      const res = await handleMeshHttp(
        {
          method: ev.method,
          path: ev.path,
          headers: ev.headers || {},
          body: ev.body,
        },
        { engine, sessions, canShare },
      )
      const payload = { requestId: ev.requestId, status: res.status, contentType: res.contentType }
      if (res.binary) payload.bodyB64 = bytesToB64(res.body)
      else payload.body = res.body
      await p.respondHttp(payload)
    } catch (e) {
      await p.respondHttp({
        requestId: ev.requestId,
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: String(e.message || e) }),
      })
    }
  })
  return p.startTransport({ deviceId, port: 17432, discoverable: !!discoverable })
}

export async function setNativeDiscoverable(on) {
  const p = plugin()
  if (!p?.setDiscoverable) return { ok: false, reason: 'plugin_missing' }
  return p.setDiscoverable({ discoverable: !!on })
}

export async function stopNativeMesh() {
  const p = plugin()
  if (listenerHandle?.remove) await listenerHandle.remove()
  listenerHandle = null
  if (p?.stopTransport) return p.stopTransport()
  return { ok: false, reason: 'plugin_missing' }
}

export async function nativeHttpRequest(opts) {
  const p = plugin()
  if (!p?.httpRequest) {
    const err = new Error('plugin_missing')
    err.code = 'plugin_missing'
    throw err
  }
  return p.httpRequest(opts)
}

export { MESH_PROTOCOL }
