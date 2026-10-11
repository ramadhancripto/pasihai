// ══════════════════════════════════════════════════════════════
// PASIHAI — Rasimu za Post Studio (local, kwa kila akaunti)
//
// Rasimu ni ya KIFAA hii (localStorage), si ya cloud. Imetenganishwa
// kwa user ID, kwa hiyo mtumiaji mmoja haoni rasimu ya mwingine.
// Media (File) haihifadhiwi: ni reference tu ya maudhui; faili lazima
// lichaguliwe tena. Revision inazuia overwrite ya kimyakimya.
// ══════════════════════════════════════════════════════════════

import { sanitizeContent } from './postContent.js'

export class DraftConflictError extends Error {
  constructor(message = 'Rasimu imebadilishwa mahali pengine. Fungua upya kabla ya kuhifadhi.') {
    super(message)
    this.name = 'DraftConflictError'
    this.code = 'DRAFT_CONFLICT'
  }
}

const keyFor = (userId) => `pasihai.studio.drafts.v1:${userId}`

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
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function writeAll(userId, list, storage) {
  storageOrThrow(storage).setItem(keyFor(userId), JSON.stringify(list))
}

function requireUser(userId) {
  if (!userId) throw new Error('Ingia kwenye akaunti yako kabla ya kuhifadhi rasimu.')
}

/** Rasimu zote za mtumiaji, mpya kwanza. */
export function listDrafts(userId, storage) {
  requireUser(userId)
  return readAll(userId, storage).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
}

export function getDraft(userId, id, storage) {
  requireUser(userId)
  return readAll(userId, storage).find((d) => d.id === id) ?? null
}

function newId() {
  const rand = Math.random().toString(36).slice(2, 8)
  return `draft-${Date.now().toString(36)}-${rand}`
}

/**
 * Hifadhi/sasisha rasimu. Ikiwa `draft.revision` imetolewa, lazima ilingane na
 * iliyohifadhiwa, vinginevyo DraftConflictError (hakuna overwrite ya kimyakimya).
 */
export function saveDraft(userId, draft, storage) {
  requireUser(userId)
  const list = readAll(userId, storage)
  const content = sanitizeContent(draft.content)
  const existing = draft.id ? list.find((d) => d.id === draft.id) : null

  if (existing && draft.revision !== undefined && draft.revision !== existing.revision) {
    throw new DraftConflictError()
  }

  const record = {
    id: existing?.id ?? newId(),
    ownerId: userId,
    content,
    templateId: content.template.id,
    templateVersion: content.template.version,
    revision: (existing?.revision ?? 0) + 1,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    syncStatus: 'local',
  }
  writeAll(userId, [record, ...list.filter((d) => d.id !== record.id)], storage)
  return record
}

/** Ondoa rasimu baada ya uthibitisho wa caller. */
export function removeDraft(userId, id, storage) {
  requireUser(userId)
  const list = readAll(userId, storage)
  const next = list.filter((d) => d.id !== id)
  if (next.length === list.length) return false
  writeAll(userId, next, storage)
  return true
}
