// ══════════════════════════════════════════════════════════════
// PASIHAI — CLOUDINARY MEDIA (picha/video za Posts na Status)
//
// Kanuni:
//   - Frontend inatumia cloud name na upload preset TU. API secret
//     HAIPO hapa, wala kwenye VITE_* variables, wala kwenye GitHub.
//   - Upload hii ni UNSIGNED (preset). Vikwazo halisi (folder, aina za
//     faili, ukubwa) lazima viwekwe kwenye preset kwenye Cloudinary
//     dashboard; code hii inakagua pia, lakini haiwezi kuzuia upload
//     ya moja kwa moja kwa API bila preset.
//   - URL inayohifadhiwa ni `secure_url` iliyorudishwa na Cloudinary
//     pekee. Mteja haruhusiwi kuingiza URL yake mwenyewe.
//   - Upload moja kwa wakati mmoja kwa kila tab (kizuizi cha msingi).
//
// Moduli hii ni safi kwa majaribio: fetch inaweza kubadilishwa.
// ══════════════════════════════════════════════════════════════

import { NetworkError, RateLimitError, ValidationError } from './errors.js'

export const CLOUDINARY_FOLDER = 'pasihai'
export const CLOUDINARY_HOST = 'res.cloudinary.com'
const CLOUDINARY_API = 'https://api.cloudinary.com/v1_1'
const DEFAULT_TIMEOUT_MS = 120_000

// Aina zinazokubalika (sawa na postMedia.js / statusMedia.js). Hii ni ukaguzi wa ziada.
export const CLOUDINARY_ALLOWED_MIME = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
}

/**
 * Inasoma mipangilio kutoka env. Hali:
 *   'off'    → hakuna usanidi; mfumo wa zamani (Supabase Storage) unatumika
 *   'on'     → cloud name na preset zipo zote
 *   'broken' → moja tu imewekwa; upload inakataliwa (hakuna kurudi kimya)
 */
export function readCloudinaryConfig(source = {}) {
  const cloudName = String(source.VITE_CLOUDINARY_CLOUD_NAME ?? '').trim()
  const uploadPreset = String(source.VITE_CLOUDINARY_UPLOAD_PRESET ?? '').trim()
  const hasName = Boolean(cloudName)
  const hasPreset = Boolean(uploadPreset)
  const mode = hasName && hasPreset ? 'on' : hasName || hasPreset ? 'broken' : 'off'
  const nameValid = !hasName || /^[a-z0-9_-]+$/i.test(cloudName)
  return {
    mode: mode === 'on' && !nameValid ? 'broken' : mode,
    cloudName,
    uploadPreset,
    folder: CLOUDINARY_FOLDER,
    problem: mode === 'broken'
      ? 'Cloudinary imesanidiwa nusu: weka VITE_CLOUDINARY_CLOUD_NAME NA VITE_CLOUDINARY_UPLOAD_PRESET zote mbili.'
      : mode === 'on' && !nameValid
        ? 'VITE_CLOUDINARY_CLOUD_NAME ina herufi batili.'
        : null,
  }
}

const runtimeEnv = (typeof import.meta !== 'undefined' && import.meta.env) || {}
export const cloudinaryConfig = readCloudinaryConfig(runtimeEnv)

/** Je, `url` ni URL ya asset ya cloud yetu (https, host sahihi, path ya upload)? */
export function isOwnCloudinaryUrl(url, cloudName = cloudinaryConfig.cloudName) {
  if (typeof url !== 'string' || !cloudName) return false
  try {
    const u = new URL(url)
    return (
      u.protocol === 'https:'
      && u.hostname === CLOUDINARY_HOST
      && u.pathname.startsWith(`/${cloudName}/`)
      && /\/(image|video)\/upload\//.test(u.pathname)
      && !u.search
      && !u.hash
    )
  } catch {
    return false
  }
}

/** Ujumbe salama wa kosa: hauna URL wala siri, na unakatwa kwa urefu. */
function safeCloudinaryMessage(message) {
  return String(message || '').replace(/https?:\/\/\S+/g, '').slice(0, 160).trim()
}

let inFlight = null

/**
 * Pakia picha au video Cloudinary kwa unsigned preset.
 * @returns {Promise<{url, publicId, resourceType, format, bytes, width, height, duration}>}
 */
export async function uploadMediaToCloudinary(file, {
  mediaType,
  config = cloudinaryConfig,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxBytes,
} = {}) {
  if (config.mode === 'broken') throw new ValidationError(config.problem)
  if (config.mode !== 'on') {
    throw new ValidationError('Cloudinary haijasanidiwa (VITE_CLOUDINARY_CLOUD_NAME na VITE_CLOUDINARY_UPLOAD_PRESET).')
  }
  if (mediaType !== 'image' && mediaType !== 'video') {
    throw new ValidationError('Aina ya media haikubaliki kwa Cloudinary.')
  }
  if (!file || typeof file.size !== 'number' || file.size <= 0) {
    throw new ValidationError('Faili la media ni tupu au si sahihi.')
  }
  const mime = typeof file.type === 'string' ? file.type.toLowerCase() : ''
  if (!CLOUDINARY_ALLOWED_MIME[mediaType].includes(mime)) {
    throw new ValidationError('Aina ya faili haikubaliki.')
  }
  if (maxBytes && file.size > maxBytes) {
    throw new ValidationError('Faili ni kubwa kuliko kikomo kinachokubalika.')
  }
  if (inFlight) {
    throw new RateLimitError('Upload nyingine inaendelea. Subiri ikamilike kisha ujaribu tena.')
  }

  const body = new FormData()
  body.append('file', file)
  body.append('upload_preset', config.uploadPreset)
  body.append('folder', config.folder)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const run = (async () => {
    let res
    try {
      res = await fetchImpl(`${CLOUDINARY_API}/${config.cloudName}/${mediaType}/upload`, {
        method: 'POST',
        body,
        signal: controller.signal,
      })
    } catch (err) {
      if (err?.name === 'AbortError') {
        throw new NetworkError('Upload ya media imechukua muda mrefu. Jaribu tena.')
      }
      throw new NetworkError('Mtandao umeshindwa wakati wa kupakia media. Jaribu tena.')
    }

    let json = null
    try {
      json = await res.json()
    } catch {
      json = null
    }

    if (res.status === 429) {
      throw new RateLimitError('Umepakia mara nyingi sana. Subiri kidogo kisha ujaribu tena.')
    }
    if (!res.ok || !json || json.error) {
      const detail = safeCloudinaryMessage(json?.error?.message)
      throw new NetworkError(
        `Cloudinary imekataa upload (${res.status})${detail ? `: ${detail}` : ''}.`,
      )
    }

    // Thibitisha jibu kabla ya kulihifadhi.
    const url = json.secure_url
    if (!isOwnCloudinaryUrl(url, config.cloudName)) {
      throw new NetworkError('Cloudinary ilirudisha URL isiyotarajiwa. Upload haijakubaliwa.')
    }
    if (typeof json.public_id !== 'string' || !json.public_id.startsWith(`${config.folder}/`)) {
      throw new NetworkError('Cloudinary ilirudisha public_id nje ya folder ya PASIHAI.')
    }
    if (json.resource_type !== mediaType) {
      throw new NetworkError('Aina ya asset iliyorudishwa hailingani na aina iliyotumwa.')
    }

    return {
      url,
      publicId: json.public_id,
      resourceType: json.resource_type,
      format: typeof json.format === 'string' ? json.format : null,
      bytes: Number.isFinite(json.bytes) ? json.bytes : file.size,
      width: Number.isFinite(json.width) ? json.width : null,
      height: Number.isFinite(json.height) ? json.height : null,
      duration: Number.isFinite(json.duration) ? json.duration : null,
    }
  })()

  inFlight = run
  try {
    return await run
  } finally {
    clearTimeout(timer)
    if (inFlight === run) inFlight = null
  }
}

/** Metadata ya kuhifadhi kwenye posts.media_meta (bila URL ya pili). */
export function cloudinaryMediaMeta(result) {
  return {
    provider: 'cloudinary',
    publicId: result.publicId,
    resourceType: result.resourceType,
    format: result.format,
    bytes: result.bytes,
    width: result.width,
    height: result.height,
    duration: result.duration,
  }
}
