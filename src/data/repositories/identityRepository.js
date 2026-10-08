// ══════════════════════════════════════════════════════════════
// PASIHAI — REPOSITORY: IDENTITY
//
// CONTRACT (haitegemei provider yoyote — si Firebase-specific):
//   getCurrentUser()  → Promise<Entity>        mtumiaji wa kifaa hiki
//   getUser(id)       → Promise<Entity|null>   entity kwa id
//   listUsers()       → Promise<Entity[]>      wote wanaojulikana
//   listChannelSuggestions() → Promise<Entity[]>  channels za kupendekeza
//
// MAHUSIANO YA MTUMIAJI (chanzo kimoja cha ukweli — subscriptions):
//   isFollowing(id) · toggleFollow(id) · listFollowed()
//   Chanzo kimoja: Home (Channels), Gundua (Channels) na wasifu wote
//   wanasoma hali ileile — hakuna store ya pili ya "kufuata".
//
// IMPLEMENTATION YA SASA : Mock (inasoma src/data/mock.js)
// IMPLEMENTATION ZA BAADAYE: FirebaseIdentityRepository | LocalIdentityRepository
// ══════════════════════════════════════════════════════════════

import { users, me, channelSuggestions } from '../mock.js'

/* ── Hali ya kikao: ninayefuata (chanzo kimoja) ─────────────
   Inaanza kutoka data ya mock (relationship: 'Unafuatilia'),
   kisha inabadilika kwa vitendo vya mtumiaji. */
const follows = {}

/** Kufuata kunahusu entities zinazofuatika PEKEE (channel · business ·
    creator). Mahusiano mengine (Rafiki · Hub) hayaandikwi hapa. */
const FOLLOWABLE = new Set(['Unafuatilia', 'Hujafuatilia'])

function initFollows() {
  if (Object.keys(follows).length) return
  for (const u of Object.values(users)) {
    if (FOLLOWABLE.has(u.relationship)) follows[u.id] = u.relationship === 'Unafuatilia'
  }
}
initFollows()

/** Rangi ya uhusiano kwa entity (inatumika UI: "Unafuatilia" / "Hujafuatilia") */
function withRelationship(entity) {
  if (!entity) return entity
  if (!(entity.id in follows)) return entity
  return { ...entity, relationship: follows[entity.id] ? 'Unafuatilia' : 'Hujafuatilia' }
}

/* Wasifu wangu: mabadiliko ya kikao (halisi — bila backend) */
const profilePatch = {}

export const mockIdentityRepository = {
  async getCurrentUser() {
    return { ...me, ...profilePatch }
  },

  async getUser(id) {
    if (!id) return null
    if (id === me.id) return me
    return withRelationship(users[id] ?? null)
  },

  async listUsers() {
    return Object.values(users).map(withRelationship)
  },

  async listChannelSuggestions() {
    return channelSuggestions.map((id) => users[id]).filter(Boolean).map(withRelationship)
  },

  /** Sasisha wasifu wangu (jina · bio · eneo) — hali ya kikao */
  async updateProfile(patch) {
    Object.assign(profilePatch, patch)
    return { ...me, ...profilePatch }
  },

  /* ── Kufuata (subscriptions) ────────────────────────────── */

  async listFollowed() {
    return Object.keys(follows).filter((id) => follows[id])
  },

  async isFollowing(id) {
    return !!follows[id]
  },

  async toggleFollow(id, on) {
    follows[id] = typeof on === 'boolean' ? on : !follows[id]
    return { id, following: follows[id] }
  },
}
