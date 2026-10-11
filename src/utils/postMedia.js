// ══════════════════════════════════════════════════════════════
// PASIHAI — POST MEDIA VALIDATION / UPLOAD ERRORS
// Scope: media iliyochaguliwa ndani ya post composer pekee.
// ══════════════════════════════════════════════════════════════

import { ValidationError } from './errors.js'

export const POST_MEDIA_BUCKET = 'pasihai-post-media'
export const POST_MEDIA_SIGNED_URL_TTL = 60 * 60
export const MAX_POST_MEDIA_BYTES = 50 * 1024 * 1024

const MEDIA_TYPE_BY_MIME = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
}

const EXTENSION_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
}

export const POST_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'
export const POST_VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime'

export function getPostMediaType(file) {
  const mimeType = typeof file?.type === 'string' ? file.type.toLowerCase() : ''
  return MEDIA_TYPE_BY_MIME[mimeType] || null
}

export function getPostMediaExtension(file) {
  const mimeType = typeof file?.type === 'string' ? file.type.toLowerCase() : ''
  return EXTENSION_BY_MIME[mimeType] || null
}

export function validatePostMediaFile(file, expectedType = null) {
  if (!file || typeof file !== 'object') {
    throw new ValidationError('Chagua faili la picha au video kwanza.')
  }

  const mimeType = typeof file.type === 'string' ? file.type.toLowerCase() : ''
  const mediaType = MEDIA_TYPE_BY_MIME[mimeType]
  if (!mediaType) {
    throw new ValidationError('Aina ya faili haikubaliki. Tumia JPG, PNG, WebP, GIF, MP4, WebM au MOV.')
  }
  if (expectedType && mediaType !== expectedType) {
    throw new ValidationError(expectedType === 'image' ? 'Chagua faili la picha.' : 'Chagua faili la video.')
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    throw new ValidationError('Faili halina data ya kusomeka.')
  }
  if (file.size > MAX_POST_MEDIA_BYTES) {
    throw new ValidationError('Faili limezidi kikomo cha 50 MB. Chagua picha/video ndogo zaidi.')
  }

  return { mediaType, mimeType, size: file.size }
}

export const POST_MEDIA_SETUP_MESSAGE =
  'Upload haijafanyika: app haiko kwenye Supabase live mode au Storage haijasanidiwa. Hatua inayokosekana: weka VITE_SUPABASE_MODE=live, VITE_SUPABASE_URL na VITE_SUPABASE_PUBLISHABLE_KEY; kisha tumia supabase/migrations/018_post_media_storage_rls.sql ili kuunda bucket pasihai-post-media na sera zake. Hakuna post iliyohifadhiwa.'

export class PostMediaConfigurationError extends Error {
  constructor(message = POST_MEDIA_SETUP_MESSAGE) {
    super(message)
    this.name = 'PostMediaConfigurationError'
    this.code = 'MEDIA_CONFIG_ERROR'
  }
}

export function postMediaErrorMessage(error) {
  if (error?.code === 'MEDIA_CONFIG_ERROR' || error?.code === 'VALIDATION_ERROR') {
    return error.message
  }
  if (error?.code === 'AUTH_ERROR') {
    return error.message || 'Ingia kwenye akaunti yako kabla ya kuhifadhi picha au video.'
  }
  if (error?.code === 'RLS_ERROR') {
    return error.message || 'Supabase Storage imekataa upload. Hakikisha migration ya post media imetumika.'
  }
  if (error?.code === 'SCHEMA_ERROR') {
    return error.message || 'Bucket ya media haipo. Tumia migration 018 ya post media.'
  }
  const detail = typeof error?.message === 'string' ? error.message.trim() : ''
  return detail ? `Imeshindwa kuhifadhi post: ${detail}` : 'Imeshindwa kuhifadhi post. Jaribu tena.'
}
