const KEY = 'pasihai.meshPrivacy'

export const DEFAULT_MESH_PRIVACY = {
  discoverable: true,
  allowUnknownSenders: false,
  sharePublicOnly: true,
  approvedPeerIds: [],
}

export function loadMeshPrivacy(storage) {
  const raw = storage?.get?.(KEY)
  return { ...DEFAULT_MESH_PRIVACY, ...(raw && typeof raw === 'object' ? raw : {}) }
}

export function saveMeshPrivacy(storage, patch) {
  const next = { ...loadMeshPrivacy(storage), ...patch }
  storage?.set?.(KEY, next)
  return next
}

export function canDiscover(privacy) {
  return privacy?.discoverable === true
}

export function canAcceptPeer(privacy, peerId) {
  if (!privacy) return false
  if (privacy.approvedPeerIds?.includes(peerId)) return true
  return privacy.allowUnknownSenders === true
}

export function canShareManifest(privacy, manifest) {
  if (!manifest) return false
  if (manifest.visibility === 'private') return false
  if (privacy.sharePublicOnly && manifest.visibility !== 'public') return false
  return manifest.visibility === 'public' || manifest.visibility === 'followers'
}

/** Auto-start when visible + discoverable. Not always-on background. */
export function shouldAutoStartMesh({ privacy, appVisible, pluginAvailable }) {
  return !!(privacy?.discoverable && appVisible && pluginAvailable)
}
