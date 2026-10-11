import { ValidationError } from './errors.js'

export const STATUS_MAX_MEDIA_BYTES = 25 * 1024 * 1024

export const STATUS_CONFIGURATION_MESSAGE =
  'Status haijahifadhiwa: Supabase Status haijawezeshwa. Weka VITE_SUPABASE_MODE=live pamoja na VITE_SUPABASE_URL na VITE_SUPABASE_PUBLISHABLE_KEY. Maandishi yanahitaji schema ya statuses (migration 015 na 017); picha/video pia zinahitaji bucket binafsi pasihai-status-media na sera za Storage za migration 017. Hakuna Status iliyohifadhiwa.'

export class StatusConfigurationError extends Error {
  constructor(message = STATUS_CONFIGURATION_MESSAGE) {
    super(message)
    this.name = 'StatusConfigurationError'
    this.code = 'STATUS_CONFIGURATION_ERROR'
  }
}

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime'])

export function getStatusMediaKind(file) {
  if (!file) return null
  if (IMAGE_TYPES.has(file.type)) return 'image'
  if (VIDEO_TYPES.has(file.type)) return 'video'
  return null
}

export function validateStatusFile(file) {
  if (!file) return null

  const mediaType = getStatusMediaKind(file)
  if (!mediaType) {
    throw new ValidationError('Chagua picha ya JPEG, PNG, WebP, GIF au video ya MP4, WebM, MOV.')
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    throw new ValidationError('Faili uliyochagua haina maudhui.')
  }
  if (file.size > STATUS_MAX_MEDIA_BYTES) {
    throw new ValidationError('Picha/video isizidi MB 25.')
  }

  return mediaType
}

export function validateStatusDraft({ text = '', file = null } = {}) {
  const body = typeof text === 'string' ? text.trim() : ''
  if (body.length > 500) {
    throw new ValidationError('Maandishi ya status yasizidi herufi 500.')
  }

  const mediaType = validateStatusFile(file)
  if (!body && !file) {
    throw new ValidationError('Andika maandishi au chagua picha/video ya status.')
  }

  return { text: body || null, mediaType }
}

export function statusErrorMessage(error) {
  switch (error?.code) {
    case 'VALIDATION_ERROR':
      return error.message || 'Tafadhali kagua maandishi au faili ulilochagua.'
    case 'AUTH_ERROR':
      return 'Ingia tena ili kuona au kuchapisha status.'
    case 'RLS_ERROR': {
      const message = typeof error?.message === 'string' ? error.message : ''
      return /storage|migration/i.test(message)
        ? message
        : `${message || 'Huna ruhusa ya kufanya kitendo hiki kwenye Status.'} Kagua sera za RLS za statuses (migration 015) na, kwa media, Storage (migration 017).`
    }
    case 'NETWORK_ERROR':
    case 'TIMEOUT_ERROR':
      return 'Imeshindikana kuwasiliana na seva. Kagua mtandao kisha ujaribu tena.'
    case 'STATUS_CONFIGURATION_ERROR':
      return error.message || STATUS_CONFIGURATION_MESSAGE
    case 'SCHEMA_ERROR': {
      const message = typeof error?.message === 'string' ? error.message : ''
      return /migration|pasihai-status-media/i.test(message)
        ? message
        : 'Status haijahifadhiwa: schema ya statuses inahitaji migration 015_live_statuses_reports.sql na 017_status_media_storage_rls.sql. Picha/video pia zinahitaji bucket binafsi pasihai-status-media na sera zake za Storage. Hakuna Status iliyohifadhiwa.'
    }
    case 'RATE_LIMIT_ERROR':
      return 'Umejaribu mara nyingi. Subiri kidogo kisha ujaribu tena.'
    default:
      return 'Status haikuweza kupakiwa au kuhifadhiwa. Tafadhali jaribu tena.'
  }
}
