// ══════════════════════════════════════════════════════════════
// PASIHAI — ERROR TYPES NA HANDLING
//
// Error classes maalum kwa PASIHAI zinazotofautisha aina za
// hitilafu: network, authorization, RLS, schema, n.k.
//
// MATUMIZI:
//   import { NetworkError, AuthError, RLSError } from '../utils/errors.js'
//   throw new NetworkError('Mtandao haupatikani')
// ══════════════════════════════════════════════════════════════

/**
 * Base class kwa errors zote za PASIHAI.
 */
export class PASIHAIError extends Error {
  constructor(message, code, details = null) {
    super(message)
    this.name = 'PASIHAIError'
    this.code = code
    this.details = details
    this.timestamp = new Date().toISOString()
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
    }
  }
}

/**
 * Network error — mtandao haupatikani au umekatika.
 */
export class NetworkError extends PASIHAIError {
  constructor(message = 'Mtandao haupatikani', details = null) {
    super(message, 'NETWORK_ERROR', details)
    this.name = 'NetworkError'
    this.retryable = true
  }
}

/**
 * Authorization error — mtumiaji hajalogin au hana ruhusa.
 */
export class AuthError extends PASIHAIError {
  constructor(message = 'Hujalogin au hana ruhusa', details = null) {
    super(message, 'AUTH_ERROR', details)
    this.name = 'AuthError'
    this.retryable = false
  }
}

/**
 * RLS (Row Level Security) error — Supabase RLS imezuia operesheni.
 */
export class RLSError extends PASIHAIError {
  constructor(message = 'Huna ruhusa ya kufanya operesheni hii', details = null) {
    super(message, 'RLS_ERROR', details)
    this.name = 'RLSError'
    this.retryable = false
  }
}

/**
 * Schema error — table au column haipo, au data si sahihi.
 */
export class SchemaError extends PASIHAIError {
  constructor(message = 'Schema ya database si sahihi', details = null) {
    super(message, 'SCHEMA_ERROR', details)
    this.name = 'SchemaError'
    this.retryable = false
  }
}

/**
 * Validation error — data ya input si sahihi.
 */
export class ValidationError extends PASIHAIError {
  constructor(message = 'Data ya input si sahihi', details = null) {
    super(message, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
    this.retryable = false
  }
}

/**
 * Conflict error — data imebadilika kwenye server (conflict resolution inahitajika).
 */
export class ConflictError extends PASIHAIError {
  constructor(message = 'Data imebadilika kwenye server', details = null) {
    super(message, 'CONFLICT_ERROR', details)
    this.name = 'ConflictError'
    this.retryable = true
  }
}

/**
 * Rate limit error — umezidi kiwango cha ruhusu.
 */
export class RateLimitError extends PASIHAIError {
  constructor(message = 'Umezidi kiwango cha ruhusu', details = null) {
    super(message, 'RATE_LIMIT_ERROR', details)
    this.name = 'RateLimitError'
    this.retryable = true
    this.retryAfter = details?.retryAfter || 60 // seconds
  }
}

/**
 * Timeout error — operesheni imechukua muda mrefu.
 */
export class TimeoutError extends PASIHAIError {
  constructor(message = 'Operesheni imechukua muda mrefu', details = null) {
    super(message, 'TIMEOUT_ERROR', details)
    this.name = 'TimeoutError'
    this.retryable = true
  }
}

/**
 * Parse Supabase error na kurudisha PASIHAIError inayofaa.
 * @param {Error|Object} error - Error kutoka Supabase
 * @param {string} context - Muktadha wa operesheni (e.g., 'listFeed')
 * @returns {PASIHAIError}
 */
export function parseSupabaseError(error, context) {
  if (!error) {
    return new PASIHAIError('Hitilafu isiyojulikana', 'UNKNOWN_ERROR')
  }
  
  const message = error.message || String(error)
  const code = error.code || ''
  
  // Network errors
  if (
    message.includes('Failed to fetch') ||
    message.includes('NetworkError') ||
    message.includes('net::ERR_') ||
    message.includes('ECONNREFUSED') ||
    message.includes('ETIMEDOUT')
  ) {
    return new NetworkError(`Mtandao haupatikani (${context})`, { originalError: error })
  }
  
  // Timeout errors
  if (message.includes('timeout') || message.includes('Timeout')) {
    return new TimeoutError(`Operesheni imechukua muda mrefu (${context})`, { originalError: error })
  }
  
  // Auth errors
  if (
    code === '401' ||
    message.includes('not authenticated') ||
    message.includes('invalid token') ||
    message.includes('JWT')
  ) {
    return new AuthError(`Hujalogin au token si sahihi (${context})`, { originalError: error })
  }
  
  // RLS errors
  if (
    code === '42501' || // insufficient_privilege
    message.includes('permission denied') ||
    message.includes('RLS') ||
    message.includes('row-level security')
  ) {
    return new RLSError(`Huna ruhusa ya kufanya operesheni hii (${context})`, { originalError: error })
  }
  
  // Schema errors
  if (
    code === '42P01' || // undefined_table
    code === '42703' || // undefined_column
    message.includes('relation') ||
    message.includes('column') ||
    message.includes('does not exist')
  ) {
    return new SchemaError(`Schema ya database si sahihi (${context})`, { originalError: error })
  }
  
  // Validation errors
  if (
    code === '23502' || // not_null_violation
    code === '23503' || // foreign_key_violation
    code === '23505' || // unique_violation
    code === '23514' || // check_violation
    message.includes('violates')
  ) {
    return new ValidationError(`Data ya input si sahihi (${context})`, { originalError: error })
  }
  
  // Rate limit errors
  if (
    code === '429' ||
    message.includes('rate limit') ||
    message.includes('too many requests')
  ) {
    const retryAfter = error.headers?.get?.('Retry-After') || 60
    return new RateLimitError(`Umezidi kiwango cha ruhusu (${context})`, { 
      originalError: error, 
      retryAfter: parseInt(retryAfter, 10) 
    })
  }
  
  // Conflict errors
  if (
    code === '409' ||
    message.includes('conflict') ||
    message.includes('concurrent')
  ) {
    return new ConflictError(`Data imebadilika kwenye server (${context})`, { originalError: error })
  }
  
  // Default: generic error
  return new PASIHAIError(
    `Hitilafu isiyojulikana (${context}): ${message}`,
    'UNKNOWN_ERROR',
    { originalError: error }
  )
}

/**
 * Angalia kama error inaweza kujaribu tena (retryable).
 * @param {Error} error - Error kuangalia
 * @returns {boolean}
 */
export function isRetryable(error) {
  if (error instanceof PASIHAIError) {
    return error.retryable === true
  }
  // Default: network errors ni retryable
  return error.message?.includes('Failed to fetch') || false
}
