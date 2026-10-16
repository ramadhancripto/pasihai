export async function sha256Hex(data) {
  let buf
  if (data instanceof ArrayBuffer) buf = data
  else if (ArrayBuffer.isView(data)) {
    buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
  } else {
    buf = new TextEncoder().encode(String(data))
  }
  const digest = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function concatChunks(chunks) {
  const total = chunks.reduce((n, c) => n + c.byteLength, 0)
  const out = new Uint8Array(total)
  let o = 0
  for (const c of chunks) {
    const u = c instanceof Uint8Array ? c : new Uint8Array(c)
    out.set(u, o)
    o += u.byteLength
  }
  return out
}
