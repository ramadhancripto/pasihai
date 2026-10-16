/** pasihai-mesh/1 — LAN HTTP + ECDH P-256 then HMAC-SHA256 (Web Crypto). Si BLE. */

export const MESH_PROTOCOL = 'pasihai-mesh/1'
export const PEER_TTL_MS = 15_000
export const SESSION_TTL_MS = 10 * 60_000
export const DEFAULT_PORT = 17432

const enc = new TextEncoder()

export async function hmacHex(rawKeyBytes, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    rawKeyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function generateEcdhPair() {
  return crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
}

export async function exportPublicJwk(keyPair) {
  return crypto.subtle.exportKey('jwk', keyPair.publicKey)
}

export async function deriveHmacKey(privateKey, peerPublicJwk) {
  const pub = await crypto.subtle.importKey(
    'jwk',
    peerPublicJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  )
  const ecdh = await crypto.subtle.deriveBits({ name: 'ECDH', public: pub }, privateKey, 256)
  const hkdfKey = await crypto.subtle.importKey('raw', ecdh, 'HKDF', false, ['deriveBits'])
  const out = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: enc.encode(MESH_PROTOCOL),
      info: enc.encode('hmac-session'),
    },
    hkdfKey,
    256,
  )
  return new Uint8Array(out)
}

export async function requestMac(shared, method, path, sessionId) {
  return hmacHex(shared, `${method.toUpperCase()}|${path}|${sessionId}`)
}

export function livePeers(peers, now = Date.now(), ttl = PEER_TTL_MS) {
  return (peers || []).filter((p) => p && p.host && p.port && now - (p.lastSeen || 0) <= ttl)
}

export async function createSessionStore(deviceId) {
  const kp = await generateEcdhPair()
  const publicJwk = await exportPublicJwk(kp)
  const sessions = new Map()
  const usedNonces = new Map()

  function gcNonces(now) {
    for (const [n, t] of usedNonces) {
      if (now - t > SESSION_TTL_MS) usedNonces.delete(n)
    }
  }

  return {
    deviceId,
    publicJwk,
    async issue({ clientDeviceId, clientPublicJwk, nonce }) {
      const now = Date.now()
      gcNonces(now)
      if (!nonce || usedNonces.has(nonce)) {
        const err = new Error('replay_or_bad_nonce')
        err.code = 'replay'
        throw err
      }
      if (!clientPublicJwk) throw new Error('missing_client_key')
      usedNonces.set(nonce, now)
      const shared = await deriveHmacKey(kp.privateKey, clientPublicJwk)
      const sessionId = crypto.randomUUID()
      const exp = now + SESSION_TTL_MS
      const mac = await hmacHex(shared, `${sessionId}|${clientDeviceId}|${exp}|${nonce}`)
      const proof = await hmacHex(shared, `proof|${nonce}|${deviceId}`)
      const rec = { sessionId, clientDeviceId, exp, mac, nonce, shared }
      sessions.set(sessionId, rec)
      return { rec: { sessionId, clientDeviceId, exp, mac, nonce }, proof, serverPublicJwk: publicJwk }
    },
    verify(authHeader) {
      if (!authHeader || !authHeader.startsWith('Bearer ')) return null
      const token = authHeader.slice(7)
      const [sessionId, mac] = token.split('.')
      const rec = sessions.get(sessionId)
      if (!rec || rec.mac !== mac) return null
      if (Date.now() > rec.exp) {
        sessions.delete(sessionId)
        return null
      }
      return rec
    },
    async verifyRequest(rec, method, path, macHeader) {
      if (!rec?.shared) return false
      const expect = await requestMac(rec.shared, method, path, rec.sessionId)
      return macHeader && macHeader === expect
    },
  }
}

function json(status, obj) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(obj),
    binary: false,
  }
}

export async function handleMeshHttp(req, { engine, sessions, canShare }) {
  const method = (req.method || 'GET').toUpperCase()
  const path = req.path || '/'
  const auth = req.headers?.authorization || req.headers?.Authorization || ''

  if (method === 'GET' && path === '/pasihai/health') {
    return json(200, {
      ok: true,
      protocol: MESH_PROTOCOL,
      deviceId: sessions.deviceId,
      publicJwk: sessions.publicJwk,
    })
  }

  if (method === 'POST' && path === '/pasihai/session') {
    let body
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    } catch {
      return json(400, { error: 'bad_json' })
    }
    try {
      const { rec, proof, serverPublicJwk } = await sessions.issue({
        clientDeviceId: body.clientDeviceId || 'unknown',
        clientPublicJwk: body.clientPublicJwk,
        nonce: body.nonce,
      })
      return json(200, {
        protocol: MESH_PROTOCOL,
        sessionId: rec.sessionId,
        token: `${rec.sessionId}.${rec.mac}`,
        expiresAt: rec.exp,
        serverDeviceId: sessions.deviceId,
        serverPublicJwk,
        proof,
      })
    } catch (e) {
      if (e.code === 'replay') return json(409, { error: 'replay' })
      return json(400, { error: e.message || 'session_failed' })
    }
  }

  const session = sessions.verify(auth)
  if (!session) return json(401, { error: 'unauthorized' })
  const reqMac = req.headers?.['x-pasihai-mac'] || req.headers?.['X-Pasihai-Mac']
  if (!(await sessions.verifyRequest(session, method, path, reqMac))) {
    return json(401, { error: 'bad_request_mac' })
  }

  const manifestMatch = path.match(/^\/pasihai\/manifest\/([^/]+)$/)
  if (method === 'GET' && manifestMatch) {
    const contentId = decodeURIComponent(manifestMatch[1])
    const m = await engine.getManifest(contentId)
    if (!m) return json(404, { error: 'missing' })
    const allowed = canShare
      ? await canShare(m, session)
      : m.visibility !== 'private' && m.complete
    if (!allowed) return json(403, { error: 'forbidden' })
    return json(200, m)
  }

  const chunkMatch = path.match(/^\/pasihai\/chunk\/([^/]+)\/(\d+)$/)
  if (method === 'GET' && chunkMatch) {
    const contentId = decodeURIComponent(chunkMatch[1])
    const index = Number(chunkMatch[2])
    const m = await engine.getManifest(contentId)
    if (!m) return json(404, { error: 'missing' })
    const allowed = canShare
      ? await canShare(m, session)
      : m.visibility !== 'private' && m.complete
    if (!allowed) return json(403, { error: 'forbidden' })
    const complete = await engine.isComplete(contentId)
    if (!complete) return json(409, { error: 'incomplete_source' })
    const row = await engine.getChunkBytes(contentId, index)
    if (!row) return json(404, { error: 'chunk_missing' })
    return {
      status: 200,
      contentType: 'application/octet-stream',
      body: row.bytes,
      binary: true,
      sha256: row.sha256,
    }
  }

  return json(404, { error: 'not_found' })
}

export function bytesToB64(u8) {
  let s = ''
  const u = u8 instanceof Uint8Array ? u8 : new Uint8Array(u8)
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i])
  return btoa(s)
}

export function b64ToBytes(b64) {
  const bin = atob(b64)
  const u = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i)
  return u
}

export async function pullViaHttp({ httpRequest, baseUrl, clientDeviceId, engine, contentId, canShareCtx }) {
  const health = await httpRequest({ url: `${baseUrl}/pasihai/health`, method: 'GET' })
  if (health.status !== 200) throw Object.assign(new Error('health_failed'), { status: health.status })
  const hello = JSON.parse(health.body)
  const clientKp = await generateEcdhPair()
  const clientPublicJwk = await exportPublicJwk(clientKp)
  const nonce = crypto.randomUUID()
  const sess = await httpRequest({
    url: `${baseUrl}/pasihai/session`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientDeviceId, clientPublicJwk, nonce }),
  })
  if (sess.status !== 200) throw Object.assign(new Error('session_failed'), { status: sess.status })
  const info = JSON.parse(sess.body)
  const shared = await deriveHmacKey(clientKp.privateKey, hello.publicJwk)
  const expectProof = await hmacHex(shared, `proof|${nonce}|${hello.deviceId}`)
  if (info.proof !== expectProof) throw new Error('unauthenticated_peer')
  const token = info.token
  const sessionId = info.sessionId
  async function authed(path, extra = {}) {
    const mac = await requestMac(shared, extra.method || 'GET', path, sessionId)
    return httpRequest({
      url: `${baseUrl}${path}`,
      method: extra.method || 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Pasihai-Mac': mac,
        ...(extra.headers || {}),
      },
      binary: extra.binary,
    })
  }
  const manPath = `/pasihai/manifest/${encodeURIComponent(contentId)}`
  const manRes = await authed(manPath)
  if (manRes.status !== 200) throw Object.assign(new Error('manifest_failed'), { status: manRes.status })
  const manifest = JSON.parse(manRes.body)
  await engine.acceptManifest(manifest, canShareCtx || {})
  const missing = await engine.missingChunks(contentId)
  for (const index of missing) {
    const ch = await authed(`/pasihai/chunk/${encodeURIComponent(contentId)}/${index}`, { binary: true })
    if (ch.status !== 200) throw new Error('chunk_failed:' + index)
    const bytes = ch.bodyB64 ? b64ToBytes(ch.bodyB64) : ch.body
    await engine.putChunk(contentId, index, bytes, manifest.chunkHashes[index])
  }
  const job = await engine.startJob(contentId, baseUrl)
  if (job.status === 'complete') {
    const got = await engine.getBytes(contentId)
    const { sha256Hex } = await import('./hash.js')
    const h = await sha256Hex(got)
    if (h !== manifest.sha256) throw new Error('final_hash_mismatch')
  }
  return { job, manifest, authenticated: true }
}
