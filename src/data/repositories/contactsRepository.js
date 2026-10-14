// ══════════════════════════════════════════════════════════════
// PASIHAI — REPOSITORY: CONTACTS (mock)
//
// CONTRACT (sawa kwa mock na Supabase — UI haijui tofauti):
//   listContacts()                  → Contact[]
//   createContact(payload)          → { contact, duplicate }
//   updateContact(id, patch)        → Contact
//   deleteContact(id)               → { ok }
//   lookupNumber(e164)              → { accountId|null }
//   importContacts(rows)            → { saved, duplicates, unmatched, failed, details[] }
//   getMyPhone()                    → { phoneE164, verifiedAt, discoverable } | null
//   setMyPhone(e164)                → { phoneE164, changed }
//   clearMyPhone()                  → { cleared }
//   subscribe(cb)                   → unsubscribe
//
// KANUNI: contact ≠ friendship ≠ chat. Hifadhi ya contact haifanyi mtu kuwa
// rafiki, na haimpi ruhusa ya kuona namba. Kila safu ya mock ina `demo: true`
// ili UI iweze kutaja chanzo kwa uaminifu (hakuna mock inayojifanya production).
// ══════════════════════════════════════════════════════════════

import { mockChatRepository } from './chatRepository.js'

const OWNER = 'me'

/* ── Orodha ya namba zilizosajiliwa (mock ya upande wa server) ─────────
   Live: `public.profile_phones` + `lookup_contact_phone()` (HMAC, rate limit).
   Mock: meza ndogo tu — uthibitisho kwamba SI utafutaji wa jina. */
const REGISTERED_PHONES = {
  '+255784123456': { accountId: 'amina', discoverable: true },
  '+255754987654': { accountId: 'hamisi', discoverable: true },
  '+255682333444': { accountId: 'musaKhalfan', discoverable: true },
  '+255712458902': { accountId: null, discoverable: true },   // Babu Ally — hajasajiliwa
  '+255784112334': { accountId: null, discoverable: true },   // Zawadi Komba — hajasajiliwa
  '+255700999888': { accountId: 'daudi', discoverable: false }, // amezima ugunduzi
}

function seed() {
  return [
    { id: 'uc1', ownerUserId: OWNER, contactUserId: 'amina', phoneE164: '+255784123456',
      displayName: 'Amina (mwalimu)', notes: 'Mwalimu wa sekondari — Kunduchi.', source: 'device_import',
      isFavorite: true, demo: true },
    { id: 'uc2', ownerUserId: OWNER, contactUserId: 'juma', phoneE164: '+255712458884',
      displayName: 'Juma Rashid', notes: '', source: 'manual', isFavorite: false, demo: true },
    { id: 'uc3', ownerUserId: OWNER, contactUserId: 'fatma', phoneE164: '+255754987654',
      displayName: 'Fatma Nuru', notes: 'Fundi wa solar.', source: 'device_import',
      isFavorite: false, demo: true },
    { id: 'uc4', ownerUserId: OWNER, contactUserId: 'neemaCreates', phoneE164: '+255786112220',
      displayName: 'Neema (mkurugenzi)', notes: '', source: 'manual', isFavorite: false, demo: true },
    { id: 'uc5', ownerUserId: OWNER, contactUserId: 'musaKhalfan', phoneE164: '+255682333444',
      displayName: 'Musa Khalfan', notes: 'Alinitafuta kwa namba — ombi la mazungumzo.', source: 'discovered',
      isFavorite: false, demo: true },
    { id: 'uc6', ownerUserId: OWNER, contactUserId: 'kelvinMushi', phoneE164: null,
      displayName: 'Kelvin Mushi', notes: 'Flutter — ombi limetumwa.', source: 'discovered',
      isFavorite: false, demo: true },
    { id: 'uc7', ownerUserId: OWNER, contactUserId: 'accountIliyofutwa', phoneE164: null,
      displayName: 'Daniel Mgeni', notes: 'Akaunti yake ilifutwa — namba haipo.', source: 'manual',
      isFavorite: false, demo: true },
    { id: 'uc8', ownerUserId: OWNER, contactUserId: null, phoneE164: '+255712458902',
      displayName: 'Babu Ally', notes: 'Hajajiunga Pasihai bado.', source: 'device_import',
      isFavorite: false, demo: true },
    { id: 'uc9', ownerUserId: OWNER, contactUserId: null, phoneE164: '+255784112334',
      displayName: 'Zawadi Komba', notes: '', source: 'device_import', isFavorite: false, demo: true },
    { id: 'uc10', ownerUserId: OWNER, contactUserId: null, phoneE164: '+255713000111',
      displayName: 'Fundi Musa', notes: 'Namba ya kazini.', source: 'manual', isFavorite: false, demo: true },
  ].map((c) => ({
    avatarSnapshotUrl: null,
    createdAt: '2026-09-20T08:00:00.000Z',
    updatedAt: '2026-10-10T08:00:00.000Z',
    ...c,
  }))
}

/* Akaunti ambazo ni marafiki kwenye mock (users[].ring === 'friend'). */
const FRIEND_ACCOUNTS = new Set([
  'amina', 'juma', 'fatma', 'barakaEng', 'neemaCreates', 'sara', 'hassan',
])

/** Hali ya demo ya uhusiano — inatumia mock iliyopo (ring, maombi, blocks). */
function demoState(id, blockedIds = []) {
  if (!id) return 'unknown'
  if (blockedIds.includes(id)) return 'blocked'
  if (id === 'kelvinMushi') return 'sent'
  if (id === 'musaKhalfan') return 'received'
  return FRIEND_ACCOUNTS.has(id) ? 'friend' : 'not_friend'
}

/** Hash ya demo — SI usalama. Live inatumia HMAC-SHA256 ya server. */
function demoHash(e164) {
  let h = 2166136261
  for (const ch of String(e164)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) }
  return `demo${(h >>> 0).toString(16).padStart(8, '0')}`
}

let store = null
let seq = 0
const listeners = new Set()

function db() {
  if (!store) {
    store = { contacts: seed(), myPhone: { phoneE164: '+255712345678', verifiedAt: '2026-09-01T09:00:00.000Z', discoverable: true, demo: true } }
  }
  return store
}

function notify() {
  for (const cb of listeners) { try { cb() } catch { /* listener mmoja asivunje wengine */ } }
}

/** Namba inamilikiwa na akaunti gani? (mock ya profile_phones + discoverable) */
function matchAccount(e164) {
  const hit = REGISTERED_PHONES[e164]
  if (!hit || !hit.discoverable || !hit.accountId) return null
  return hit.accountId
}

const clone = (c) => ({ ...c })

export const mockContactsRepository = {
  /* ── READ ───────────────────────────────────────────────── */
  async listContacts() {
    return db().contacts.map(clone)
  },

  async getContact(id) {
    return clone(db().contacts.find((c) => c.id === id) || null) || null
  },

  /* ── WRITE ──────────────────────────────────────────────── */
  async createContact(payload = {}) {
    const s = db()
    const { displayName, phoneE164 = null, contactUserId = null, source = 'manual', notes = '', idempotencyKey = null } = payload

    // Duplicate: akaunti ileile AU namba ileile kwa wasio na akaunti.
    const dup = s.contacts.find((c) =>
      (contactUserId && c.contactUserId === contactUserId) ||
      (!contactUserId && phoneE164 && c.phoneE164 === phoneE164 && !c.contactUserId),
    )
    if (dup) return { contact: clone(dup), duplicate: true }

    const row = {
      id: `uc${100 + (++seq)}`,
      ownerUserId: OWNER,
      contactUserId,
      phoneE164,
      displayName,
      avatarSnapshotUrl: null,
      notes,
      source,
      isFavorite: false,
      idempotencyKey,
      demo: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    s.contacts = [row, ...s.contacts]
    notify()
    return { contact: clone(row), duplicate: false }
  },

  async updateContact(id, patch = {}) {
    const s = db()
    const i = s.contacts.findIndex((c) => c.id === id)
    if (i < 0) throw new Error('Contact haipatikani')
    const allowed = ['displayName', 'notes', 'isFavorite', 'avatarSnapshotUrl', 'contactUserId', 'phoneE164', 'source']
    const next = { ...s.contacts[i] }
    for (const k of allowed) if (k in patch) next[k] = patch[k]
    next.updatedAt = new Date().toISOString()
    s.contacts = [...s.contacts.slice(0, i), next, ...s.contacts.slice(i + 1)]
    notify()
    return clone(next)
  },

  async deleteContact(id) {
    const s = db()
    const before = s.contacts.length
    s.contacts = s.contacts.filter((c) => c.id !== id)
    notify()
    return { ok: s.contacts.length < before }
  },

  /* ── LOOKUP: namba → akaunti (HAKUNA jina, HAKUNA namba ya mwingine) ── */
  async lookupNumber(e164) {
    return { accountId: matchAccount(e164) }
  },

  /* ── IMPORT ─────────────────────────────────────────────── */
  async importContacts(rows = []) {
    // saved = zote zilizohifadhiwa sasa; matched/unmatched ni vikundi vyake.
    const result = { saved: 0, matched: 0, unmatched: 0, duplicates: 0, failed: 0, details: [] }
    for (const row of rows) {
      try {
        const accountId = row.phoneE164 ? matchAccount(row.phoneE164) : null
        const res = await this.createContact({
          displayName: row.displayName,
          phoneE164: row.phoneE164 || null,
          contactUserId: accountId,
          source: 'device_import',
          idempotencyKey: row.idempotencyKey || null,
        })
        if (res.duplicate) { result.duplicates += 1; result.details.push({ name: row.displayName, status: 'duplicate' }) }
        else if (accountId) { result.saved += 1; result.matched += 1; result.details.push({ name: row.displayName, status: 'matched', accountId }) }
        else { result.saved += 1; result.unmatched += 1; result.details.push({ name: row.displayName, status: 'unmatched' }) }
      } catch (err) {
        result.failed += 1
        result.details.push({ name: row.displayName, status: 'failed', error: err.message })
      }
    }
    return result
  },

  /* ── NAMBA YANGU (haiweki bila uthibitisho kwenye live) ── */
  async getMyPhone() {
    return { ...db().myPhone }
  },

  async setMyPhone(e164) {
    const s = db()
    const previous = s.myPhone?.phoneE164 || null
    s.myPhone = { phoneE164: e164, verifiedAt: new Date().toISOString(), discoverable: true, demo: true }
    notify()
    return { phoneE164: e164, previousE164: previous, changed: previous !== e164 }
  },

  async clearMyPhone() {
    db().myPhone = null
    notify()
    return { cleared: true }
  },

  /* ── LOOKUP ya kundi (import) — mock ya lookup_contact_phones ── */
  async lookupNumbers(e164List = []) {
    return e164List.map((e164, i) => ({
      i,
      hash: e164 ? demoHash(e164) : null,
      accountId: e164 ? matchAccount(e164) : null,
    }))
  },

  /* ── HASH kwa dedupe (mock pekee — live: HMAC ya server) ── */
  async phoneHash(e164) {
    return e164 ? demoHash(e164) : null
  },

  /* ── MAHUSIANO ──────────────────────────────────────────── */
  async getRelationshipStates(ids = []) {
    const blockedIds = (await mockChatRepository.listBlocked()).map((b) => b.accountId)
    const states = {}
    for (const id of ids) states[id] = demoState(id, blockedIds)
    return states
  },

  async friendState(accountId) {
    const blockedIds = (await mockChatRepository.listBlocked()).map((b) => b.accountId)
    return demoState(accountId, blockedIds)
  },

  async messageGate(accountId) {
    const state = await this.friendState(accountId)
    if (state === 'blocked') return { allowed: false, reason: 'blocked_by_me' }
    return { allowed: true, reason: 'ok', friend_state: state }
  },

  async setDiscoverable(on) {
    const s = db()
    if (s.myPhone) s.myPhone = { ...s.myPhone, discoverable: !!on }
    notify()
    return { discoverable: !!on }
  },

  /* ── SUBSCRIBE (refetch) ────────────────────────────────── */
  subscribe(cb) {
    listeners.add(cb)
    return () => listeners.delete(cb)
  },
}
