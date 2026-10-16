export const DEFAULT_CHUNK_BYTES = 32 * 1024

export function splitBytes(bytes, chunkBytes = DEFAULT_CHUNK_BYTES) {
  const u = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  const parts = []
  for (let i = 0; i < u.byteLength; i += chunkBytes) {
    parts.push(u.slice(i, i + chunkBytes))
  }
  return parts
}

export function chunkId(contentId, index) {
  return `${contentId}:${index}`
}
