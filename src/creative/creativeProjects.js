// ══════════════════════════════════════════════════════════════
// PASIHAI — Miradi ya Creative (local, kwa kila akaunti)
//
// Miradi iko kwenye KIFAA hii (localStorage), si kwenye cloud: hakuna jedwali
// la backend bado (inahitaji migration + idhini). Imetenganishwa kwa user ID.
// Kila hifadhi inathibitisha hati kwanza; revision inazuia overwrite kimyakimya.
// ══════════════════════════════════════════════════════════════

import { sanitizeDocument, MODES } from './creativeModel.js'

export const PROJECT_STORE_VERSION = 'v1'
export const MAX_PROJECT_BYTES = 3_500_000 // kikomo cha ndani kwa mradi mmoja (localStorage ~5 MB kwa origin)

export class CreativeConflictError extends Error {
  constructor(message = 'Mradi umebadilishwa mahali pengine. Fungua upya kabla ya kuhifadhi.') {
    super(message)
    this.name = 'CreativeConflictError'
    this.code = 'PROJECT_CONFLICT'
  }
}

export class CreativeQuotaError extends Error {
  constructor(message = 'Mradi ni mkubwa sana kwa hifadhi ya kifaa hiki. Punguza picha au tumia picha kutoka Media Library.') {
    super(message)
    this.name = 'CreativeQuotaError'
    this.code = 'PROJECT_QUOTA'
  }
}

const keyFor = (userId) => `pasihai.creative.projects.${PROJECT_STORE_VERSION}:${userId}`
const recoveryKeyFor = (userId) => `pasihai.creative.recovery.${PROJECT_STORE_VERSION}:${userId}`

function requireUser(userId) {
  if (!userId) throw new Error('Ingia kwenye akaunti yako kabla ya kuhifadhi mradi.')
}

function storageOrThrow(storage) {
  const s = storage ?? (typeof localStorage !== 'undefined' ? localStorage : null)
  if (!s) throw new Error('Hifadhi ya kifaa haipatikani kwenye mazingira haya.')
  return s
}

function readAll(userId, storage) {
  const raw = storageOrThrow(storage).getItem(keyFor(userId))
  if (!raw) return []
  try {
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list.filter((p) => p && p.ownerId === userId) : []
  } catch {
    return []
  }
}

function writeAll(userId, list, storage) {
  const s = storageOrThrow(storage)
  try {
    s.setItem(keyFor(userId), JSON.stringify(list))
  } catch (err) {
    if (err?.name === 'QuotaExceededError' || err?.code === 22) throw new CreativeQuotaError()
    throw err
  }
}

function newProjectId() {
  return `cp${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

/** Miradi yote ya mtumiaji, mipya kwanza. */
export function listProjects(userId, storage) {
  requireUser(userId)
  return readAll(userId, storage).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
}

export function getProject(userId, id, storage) {
  requireUser(userId)
  return readAll(userId, storage).find((p) => p.id === id) ?? null
}

/**
 * Hifadhi mradi. `revision` ikitolewa lazima ilingane na iliyohifadhiwa.
 * Inarudisha rekodi iliyohifadhiwa (ambayo ndiyo "Imehifadhiwa" pekee inayoruhusiwa kuonyeshwa).
 */
export function saveProject(userId, { id = null, doc, revision, title } = {}, storage) {
  requireUser(userId)
  const { doc: clean, warnings } = sanitizeDocument(title !== undefined ? { ...doc, title } : doc)
  const list = readAll(userId, storage)
  const existing = id ? list.find((p) => p.id === id) : null
  if (id && !existing) throw new Error('Mradi haupo tena. Hifadhi kama mradi mpya.')
  if (existing && revision !== undefined && revision !== existing.revision) {
    throw new CreativeConflictError()
  }
  const now = new Date().toISOString()
  const record = {
    id: existing?.id ?? newProjectId(),
    ownerId: userId,
    title: clean.title,
    mode: clean.mode,
    doc: clean,
    revision: (existing?.revision ?? 0) + 1,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    syncStatus: 'local',
  }
  const bytes = JSON.stringify(record).length
  if (bytes > MAX_PROJECT_BYTES) throw new CreativeQuotaError()
  writeAll(userId, [record, ...list.filter((p) => p.id !== record.id)], storage)
  return { record, warnings }
}

export function removeProject(userId, id, storage) {
  requireUser(userId)
  const list = readAll(userId, storage)
  const next = list.filter((p) => p.id !== id)
  if (next.length === list.length) return false
  writeAll(userId, next, storage)
  return true
}

// ── Recovery: rasimu ya mwisho iliyo na mabadiliko ambayo hayajahifadhiwa ──
export function writeRecovery(userId, { projectId, doc }, storage) {
  requireUser(userId)
  const s = storageOrThrow(storage)
  try {
    s.setItem(recoveryKeyFor(userId), JSON.stringify({ projectId: projectId ?? null, doc, savedAt: new Date().toISOString() }))
  } catch {
    // Recovery ni ya hiari: kushindwa kwake hakuzuii kuhariri.
    return false
  }
  return true
}

export function readRecovery(userId, storage) {
  requireUser(userId)
  const raw = storageOrThrow(storage).getItem(recoveryKeyFor(userId))
  if (!raw) return null
  try {
    const r = JSON.parse(raw)
    const { doc } = sanitizeDocument(r.doc)
    return { projectId: typeof r.projectId === 'string' ? r.projectId : null, doc, savedAt: r.savedAt ?? null }
  } catch {
    return null
  }
}

export function clearRecovery(userId, storage) {
  requireUser(userId)
  storageOrThrow(storage).removeItem(recoveryKeyFor(userId))
}

export const projectModeLabel = (mode) => MODES[mode]?.label ?? 'Mradi'
