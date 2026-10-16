import { contentManifests, contentChunks, transferJobs, localDb } from '../localDatabase.js'
import { contentSharingIndex } from '../contentSharingIndex.js'
import { sha256Hex, concatChunks } from './hash.js'
import { DEFAULT_CHUNK_BYTES, splitBytes, chunkId } from './chunk.js'
import { canAnnounce, canForward, VISIBILITY } from './policy.js'

function jobId(contentId, peerId) {
  return `xfer:${contentId}:${peerId || 'local'}`
}

export const TransferStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETE: 'complete',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
}

/**
 * Shared content distribution engine (local storage + chunk transfer).
 * Haitumii BLE. Transport inapewa kutoka nje.
 */
export function createMemoryStores() {
  function wrap(keyPath) {
    const map = new Map()
    return {
      async put(item) {
        map.set(item[keyPath], item)
      },
      async get(id) {
        return map.get(id) || null
      },
      async getAll() {
        return [...map.values()]
      },
      async getByIndex(indexName, value) {
        return [...map.values()].filter((row) => row[indexName] === value)
      },
      async delete(id) {
        map.delete(id)
      },
    }
  }
  return {
    contentManifests: wrap('contentId'),
    contentChunks: wrap('id'),
    transferJobs: wrap('id'),
  }
}

export function createDistributionEngine({
  chunkBytes = DEFAULT_CHUNK_BYTES,
  deviceId = 'local',
  stores = null,
  sharingIndex = contentSharingIndex,
} = {}) {
  const manifests = stores?.contentManifests || contentManifests
  const chunks = stores?.contentChunks || contentChunks
  const jobs = stores?.transferJobs || transferJobs

  return {
    deviceId,
    chunkBytes,

    async ingestBytes({
      contentId,
      bytes,
      contentType = 'file',
      visibility = VISIBILITY.PUBLIC,
      authorId = null,
      maxHops = 2,
      expiresAt = null,
      origin = 'self',
    }) {
      const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
      const sha256 = await sha256Hex(u)
      const parts = splitBytes(u, chunkBytes)
      const chunkHashes = []
      for (let i = 0; i < parts.length; i++) {
        const h = await sha256Hex(parts[i])
        chunkHashes.push(h)
        await chunks.put({
          id: chunkId(contentId, i),
          contentId,
          index: i,
          sha256: h,
          bytes: parts[i],
        })
      }
      const manifest = {
        contentId,
        sha256,
        sizeBytes: u.byteLength,
        chunkBytes,
        chunkCount: parts.length,
        chunkHashes,
        contentType,
        visibility,
        authorId,
        maxHops,
        hopsRemaining: maxHops,
        expiresAt,
        complete: true,
        origin,
        createdAt: new Date().toISOString(),
      }
      await manifests.put(manifest)
      if (sharingIndex?.add) {
        await sharingIndex.add(
          { id: contentId, type: contentType, visibility, authorId },
          { origin, sizeBytes: u.byteLength, version: sha256 },
        )
      }
      return manifest
    },

    async getManifest(contentId) {
      return manifests.get(contentId)
    },

    async isComplete(contentId) {
      const m = await manifests.get(contentId)
      if (!m) return false
      if (m.complete) return true
      const have = await this._haveIndexes(contentId)
      return have.length === m.chunkCount
    },

    async missingChunks(contentId) {
      const m = await manifests.get(contentId)
      if (!m) return []
      const have = new Set(await this._haveIndexes(contentId))
      const missing = []
      for (let i = 0; i < m.chunkCount; i++) {
        if (!have.has(i)) missing.push(i)
      }
      return missing
    },

    async getBytes(contentId) {
      const m = await manifests.get(contentId)
      if (!m) return null
      const missing = await this.missingChunks(contentId)
      if (missing.length) {
        const err = new Error('Content haijakamilika; si playable.')
        err.code = 'INCOMPLETE'
        err.missing = missing
        throw err
      }
      const parts = []
      for (let i = 0; i < m.chunkCount; i++) {
        const row = await chunks.get(chunkId(contentId, i))
        if (!row?.bytes) throw new Error('Chunk haipo: ' + i)
        const got = await sha256Hex(row.bytes)
        if (m.chunkHashes[i] && got !== m.chunkHashes[i]) {
          throw new Error('Chunk hash mismatch: ' + i)
        }
        parts.push(row.bytes)
      }
      const all = concatChunks(parts)
      const full = await sha256Hex(all)
      if (full !== m.sha256) throw new Error('Content hash mismatch')
      return all
    },

    async putChunk(contentId, index, bytes, expectedHash) {
      const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
      const h = await sha256Hex(u)
      if (expectedHash && h !== expectedHash) {
        throw new Error('Rejected chunk: hash')
      }
      await chunks.put({
        id: chunkId(contentId, index),
        contentId,
        index,
        sha256: h,
        bytes: u,
      })
      const m = await manifests.get(contentId)
      if (m) {
        const missing = await this.missingChunks(contentId)
        if (missing.length === 0) {
          await manifests.put({ ...m, complete: true })
        }
      }
      return h
    },

    async acceptManifest(manifest, { requestorId, isFollower } = {}) {
      if (!canAnnounce(manifest, { requestorId, isFollower })) {
        throw new Error('Ruhusa: content haiwezi kupokelewa/kutangazwa')
      }
      const existing = await manifests.get(manifest.contentId)
      if (existing && existing.sha256 === manifest.sha256) {
        return { duplicate: true, manifest: existing }
      }
      await manifests.put({
        ...manifest,
        complete: false,
        hopsRemaining: Math.max(0, (manifest.hopsRemaining ?? manifest.maxHops ?? 0) - 1),
      })
      return { duplicate: false, manifest }
    },

    async listShareable({ requestorId, isFollower } = {}) {
      const all = await manifests.getAll()
      return all.filter((m) => m.complete && canForward(m, { requestorId, isFollower }))
    },

    async startJob(contentId, peerId) {
      const id = jobId(contentId, peerId)
      const missing = await this.missingChunks(contentId)
      const job = {
        id,
        contentId,
        peerId,
        status: missing.length ? TransferStatus.IN_PROGRESS : TransferStatus.COMPLETE,
        missing,
        updatedAt: new Date().toISOString(),
      }
      await jobs.put(job)
      return job
    },

    async getJob(id) {
      return jobs.get(id)
    },

    async cancelJob(id) {
      const job = await transferJobs.get(id)
      if (!job) return null
      const next = { ...job, status: TransferStatus.CANCELLED, updatedAt: new Date().toISOString() }
      await jobs.put(next)
      return next
    },

    /**
     * Copy chunks from remoteEngine (in-process or any object with getManifest/getChunkBytes).
     * Resume: only missing indexes.
     */
    async pullFrom(remoteEngine, contentId, { requestorId, isFollower, peerId = 'peer' } = {}) {
      const remoteManifest = await remoteEngine.getManifest(contentId)
      if (!remoteManifest) throw new Error('Peer hana manifest')
      await this.acceptManifest(remoteManifest, { requestorId, isFollower })
      const job = await this.startJob(contentId, peerId)
      if (job.status === TransferStatus.COMPLETE) return job
      const missing = await this.missingChunks(contentId)
      for (const index of missing) {
        const chunk = await remoteEngine.getChunkBytes(contentId, index)
        await this.putChunk(contentId, index, chunk.bytes, remoteManifest.chunkHashes[index])
      }
      const doneMissing = await this.missingChunks(contentId)
      const done = {
        ...job,
        status: doneMissing.length ? TransferStatus.IN_PROGRESS : TransferStatus.COMPLETE,
        missing: doneMissing,
        updatedAt: new Date().toISOString(),
      }
      await jobs.put(done)
      return done
    },

    async getChunkBytes(contentId, index) {
      const row = await chunks.get(chunkId(contentId, index))
      if (!row) return null
      return { index, bytes: row.bytes, sha256: row.sha256 }
    },

    async _haveIndexes(contentId) {
      const rows = await chunks.getByIndex('contentId', contentId)
      return rows.map((r) => r.index).sort((a, b) => a - b)
    },

    async open() {
      if (!stores) await localDb.open()
    },
  }
}

export { canAnnounce, canForward, VISIBILITY }
