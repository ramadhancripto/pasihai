import { createDistributionEngine } from '../utils/distribution/engine.js'
import {
  listNativePeers,
  nativeCapabilities,
  startNativeMesh,
  stopNativeMesh,
  nativeHttpRequest,
  setNativeDiscoverable,
} from '../utils/distribution/nativeMesh.js'
import { pullViaHttp } from '../utils/distribution/meshProtocol.js'
import { canAnnounce } from '../utils/distribution/policy.js'
import {
  loadMeshPrivacy,
  canDiscover,
  canAcceptPeer,
  canShareManifest,
  shouldAutoStartMesh,
} from '../utils/distribution/meshPrivacy.js'
import { storage } from '../utils/storage.js'

let engine

export function getDistributionEngine() {
  if (!engine) engine = createDistributionEngine({ deviceId: 'device' })
  return engine
}

async function canShare(manifest, session) {
  const privacy = loadMeshPrivacy(storage)
  if (!canShareManifest(privacy, manifest)) return false
  if (session?.clientDeviceId && !canAcceptPeer(privacy, session.clientDeviceId)) return false
  return canAnnounce(manifest, { requestorId: session?.clientDeviceId })
}

export const distributionService = {
  privacy() {
    return loadMeshPrivacy(storage)
  },

  async getLocal(contentId) {
    const e = getDistributionEngine()
    const complete = await e.isComplete(contentId)
    if (!complete) return { complete: false, bytes: null }
    return { complete: true, bytes: await e.getBytes(contentId) }
  },

  async startMesh({ deviceId } = {}) {
    const privacy = loadMeshPrivacy(storage)
    if (!canDiscover(privacy)) {
      return { ok: false, reason: 'discoverability_off', backgroundGuaranteed: false }
    }
    return startNativeMesh({
      engine: getDistributionEngine(),
      deviceId: deviceId || 'device',
      canShare,
      discoverable: canDiscover(privacy),
    })
  },

  async stopMesh() {
    return stopNativeMesh()
  },

  /** Lifecycle auto-start. Needs native plugin. Not always-on. */
  async autoStart({ appVisible = true } = {}) {
    const caps = await nativeCapabilities()
    const pluginAvailable = !!caps.plugin
    const privacy = loadMeshPrivacy(storage)
    if (!pluginAvailable) {
      return { started: false, reason: 'plugin_missing', backgroundGuaranteed: false }
    }
    if (!appVisible) {
      await setNativeDiscoverable(false)
      return { started: true, discovering: false, reason: 'hidden_discovery_paused', backgroundGuaranteed: false }
    }
    if (!privacy.discoverable) {
      await setNativeDiscoverable(false)
      return { started: false, reason: 'discoverability_off', backgroundGuaranteed: false }
    }
    const r = await this.startMesh()
    return { started: !!r?.ok, reason: r?.reason || null, backgroundGuaranteed: false }
  },

  async nearbyPeers() {
    const native = await listNativePeers()
    const privacy = loadMeshPrivacy(storage)
    const peers = (native.peers || []).filter((p) => canAcceptPeer(privacy, p.deviceId))
    return {
      transport: native.available ? 'lan-nsd' : 'none',
      peers,
      reason: native.reason,
    }
  },

  async pullFromLanPeer(peer, contentId, { clientDeviceId } = {}) {
    if (!peer?.host || !peer?.port) {
      throw new Error('peer_invalid')
    }
    const baseUrl = `http://${peer.host}:${peer.port}`
    return pullViaHttp({
      httpRequest: nativeHttpRequest,
      baseUrl,
      clientDeviceId: clientDeviceId || 'device',
      engine: getDistributionEngine(),
      contentId,
      canShareCtx: { requestorId: clientDeviceId },
    })
  },

  async capabilities() {
    return nativeCapabilities()
  },
}
