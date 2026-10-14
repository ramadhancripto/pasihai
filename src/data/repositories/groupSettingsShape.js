// ══════════════════════════════════════════════════════════════
// ChatHai Groups — MODEL MMOJA wa settings za kikundi
//
// Mock repository (chatRepository.js) na live repository
// (supabaseChatRepository.js) wanashiriki faili hili ili kusiwe na
// nakala mbili za model ya data (master spec §3, §54).
//
//   app (camelCase)  ⇄  DB (snake_case)
//
// Chaguo-msingi zinalingana na CHECK constraints za migration 033.
// ══════════════════════════════════════════════════════════════

export const SETTINGS_FIELD_MAP = {
  type: 'group_type',
  privacy: 'privacy',
  description: 'description',
  purpose: 'purpose',
  goals: 'goals',
  procedures: 'procedures',
  rules: 'rules',
  warnings: 'warnings',
  consequences: 'consequences',
  language: 'language',
  foundingLocation: 'founding_location',
  locationVisibility: 'location_visibility',
  joinMethod: 'join_method',
  whoCanAdd: 'who_can_add',
  whoCanReply: 'who_can_reply',
  whoCanReact: 'who_can_react',
  announcementSenders: 'announcement_senders',
  slowModeSeconds: 'slow_mode_seconds',
  memberLimit: 'member_limit',
  tone: 'tone',
  dpPath: 'dp_path',
  coverPath: 'cover_path',
}

export const SETTINGS_DEFAULTS = {
  type: 'normal',
  privacy: 'private',
  locationVisibility: 'hidden',
  joinMethod: 'request',
  whoCanAdd: 'owner_admins',
  whoCanReply: 'all',
  whoCanReact: 'all',
  announcementSenders: 'owner_admins',
  slowModeSeconds: 0,
  tone: 'green',
}

const TEXT_FIELDS = [
  'description',
  'purpose',
  'goals',
  'procedures',
  'rules',
  'warnings',
  'consequences',
  'language',
  'foundingLocation',
]

/**
 * Draft kutoka wizard (au patch yoyote) → settings za model mmoja (camelCase).
 * Hatuweki thamani tupu; kila field ina default kutoka SETTINGS_DEFAULTS.
 */
export function normalizeDraftSettings(draft = {}, { type, memberLimit } = {}) {
  const out = { ...SETTINGS_DEFAULTS }
  for (const key of Object.keys(SETTINGS_FIELD_MAP)) {
    if (key === 'dpPath' || key === 'coverPath') continue // njia za storage — hazitoki kwenye draft
    const value = draft[key]
    if (value !== undefined && value !== null && value !== '') out[key] = value
  }
  if (type) out.type = type
  if (memberLimit) out.memberLimit = memberLimit
  for (const f of TEXT_FIELDS) {
    if (typeof out[f] === 'string') {
      const t = out[f].trim()
      out[f] = t || null
    }
  }
  const slow = Number(out.slowModeSeconds)
  out.slowModeSeconds = Number.isFinite(slow) ? slow : 0
  return out
}

/** Row ya DB (snake_case) → model ya app (camelCase). */
export function rowToSettings(row) {
  if (!row) return null
  const out = {}
  for (const [camel, snake] of Object.entries(SETTINGS_FIELD_MAP)) {
    if (snake in row) out[camel] = row[snake]
  }
  out.conversationId = row.conversation_id
  out.createdAt = row.created_at
  out.updatedAt = row.updated_at
  return out
}

/** Patch ya app (camelCase) → row ya update (snake_case). */
export function settingsToRow(patch = {}) {
  const row = {}
  for (const [key, value] of Object.entries(patch)) {
    const snake = SETTINGS_FIELD_MAP[key]
    if (!snake || value === undefined) continue
    row[snake] = value
  }
  return row
}
