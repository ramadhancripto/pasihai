import { ContentProvider } from '../transportInterfaces.js'
import { canAnnounce } from './policy.js'

/** ContentProvider halisi juu ya distribution engine. */
export class LocalContentProvider extends ContentProvider {
  constructor(engine) {
    super()
    this.engine = engine
  }

  async getContent(request) {
    const m = await this.engine.getManifest(request.contentId)
    if (!m) return { ok: false, reason: 'missing' }
    if (!canAnnounce(m, { requestorId: request.requestorId, isFollower: request.isFollower })) {
      return { ok: false, reason: 'forbidden' }
    }
    const complete = await this.engine.isComplete(request.contentId)
    return { ok: true, manifest: m, complete }
  }

  async announceContent() {
    return undefined
  }

  async listAvailableContent(filters = {}) {
    const list = await this.engine.listShareable({
      requestorId: filters.requestorId,
      isFollower: filters.isFollower,
    })
    return list.map((m) => ({
      contentId: m.contentId,
      contentType: m.contentType,
      sizeBytes: m.sizeBytes,
      visibility: m.visibility,
      sha256: m.sha256,
    }))
  }
}
