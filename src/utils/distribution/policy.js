/** Access + hop/TTL. Private haitangazwi kwa mesh. */

export const VISIBILITY = {
  PUBLIC: 'public',
  FOLLOWERS: 'followers',
  PRIVATE: 'private',
}

export function canAnnounce(manifest, { requestorId, isFollower } = {}) {
  if (!manifest) return false
  const v = manifest.visibility || VISIBILITY.PUBLIC
  if (v === VISIBILITY.PRIVATE) return false
  if (v === VISIBILITY.FOLLOWERS) {
    if (requestorId && requestorId === manifest.authorId) return true
    return isFollower === true
  }
  return v === VISIBILITY.PUBLIC
}

export function hopAllowed(manifest) {
  const hops = Number(manifest.hopsRemaining ?? manifest.maxHops ?? 0)
  return hops > 0
}

export function notExpired(manifest, now = Date.now()) {
  if (!manifest.expiresAt) return true
  return new Date(manifest.expiresAt).getTime() > now
}

export function canForward(manifest, ctx) {
  return canAnnounce(manifest, ctx) && hopAllowed(manifest) && notExpired(manifest)
}
