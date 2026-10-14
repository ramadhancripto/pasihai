// ══════════════════════════════════════════════════════════════
// PASIHAI — SUPABASE CONTACTS REPOSITORY (live)
//
// Implementation ya contactsRepository kwa Supabase (migration 032):
//   user_contacts         → contacts za mmiliki (RLS: mmiliki pekee)
//   profile_phones        → namba ya mmiliki (siri; RPC pekee inaandika)
//   lookup_contact_phone()/lookup_contact_phones() → utafutaji salama wa namba
//   contact_friend_state()/contact_message_gate()  → mahusiano (INVOKER)
//
// KANUNI:
//   * Namba HAIRUDISHWI KAMWE kwa mtu mwingine — lookup hurudisha account_id pekee.
//   * Save Contact HUHAIFANYI mtu kuwa friend (friendships zinatumika kwa hiari yake).
//   * Hakuna service_role kwenye frontend; kila kitu kinapita RLS + RPC.
// ══════════════════════════════════════════════════════════════

import { supabase, isSupabaseLive } from '../../lib/supabaseClient.js'

const TABLE = 'user_contacts'
const SELECT_COLS =
  'id, owner_user_id, contact_user_id, phone_e164, display_name, avatar_snapshot_url, notes, source, is_favorite, created_at, updated_at'

function toContact(row) {
  if (!row) return null
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    contactUserId: row.contact_user_id || null,
    phoneE164: row.phone_e164 || null,
    displayName: row.display_name,
    avatarSnapshotUrl: row.avatar_snapshot_url || null,
    notes: row.notes || '',
    source: row.source || 'manual',
    isFavorite: !!row.is_favorite,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw new Error(`Hitilafu ya uthibitisho: ${error.message}`)
  if (!data?.user?.id) throw new Error('Hujaingia. Ingia kwanza ili kutumia Contacts.')
  return data.user.id
}

/** Ramani ya makosa ya RPC → ujumbe wa Kibantu unaoeleweka. */
function mapRpcError(error, context) {
  const code = error?.code
  const msg = String(error?.message || '')
  if (msg.includes('rate_limited')) return new Error('Umejaribu mara nyingi sana. Subiri kidogo kisha ujaribu tena.')
  if (msg.includes('invalid_phone')) return new Error('Muundo wa namba si sahihi. Chagua nchi kisha andika namba kamili.')
  if (msg.includes('phone_not_verified')) return new Error('Namba hii haijathibitishwa (OTP) kwenye akaunti yako bado.')
  if (msg.includes('phone_verification_source_unavailable')) return new Error('Uthibitisho wa namba haupatikani kwenye mfumo kwa sasa. Jaribu tena baadaye.')
  if (msg.includes('too_many_numbers')) return new Error('Namba nyingi mno kwa mkupuo mmoja (kikomo ni 200).')
  if (msg.includes('auth_required')) return new Error('Hujaingia. Ingia kwanza.')
  if (code === '23505') return new Error('Namba hii tayari inamilikiwa na akaunti nyingine.')
  if (code === '23514') return new Error('Data haikidhi masharti (jina/namba).')
  return new Error(`${context}: ${error?.message || 'kosa lisilojulikana'}`)
}

export const supabaseContactsRepository = {
  /* ── READ ───────────────────────────────────────────────── */
  async listContacts() {
    if (!isSupabaseLive || !supabase) return []
    await currentUserId()
    const { data, error } = await supabase
      .from(TABLE)
      .select(SELECT_COLS)
      .order('is_favorite', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw mapRpcError(error, 'listContacts')
    return (data || []).map(toContact)
  },

  async getContact(id) {
    if (!isSupabaseLive || !supabase) return null
    const { data, error } = await supabase.from(TABLE).select(SELECT_COLS).eq('id', id).maybeSingle()
    if (error) throw mapRpcError(error, 'getContact')
    return toContact(data)
  },

  /**
   * Hali za mahusiano (friend · sent · received · blocked · not_friend) kwa ids.
   * Inasoma kwa RLS ya mtumiaji mwenyewe — rows za wengine haziwafikii.
   */
  async getRelationshipStates(ids = []) {
    if (!isSupabaseLive || !supabase || !ids.length) return {}
    const me = await currentUserId()

    const [{ data: friendRows, error: fErr }, { data: blockRows, error: bErr }] = await Promise.all([
      supabase.from('friendships').select('requester_id, addressee_id, status'),
      supabase.from('blocks').select('blocked_id'),
    ])
    if (fErr) throw mapRpcError(fErr, 'getRelationshipStates')
    if (bErr) throw mapRpcError(bErr, 'getRelationshipStates')

    const states = {}
    for (const id of ids) states[id] = 'not_friend'
    for (const b of blockRows || []) {
      if (ids.includes(b.blocked_id)) states[b.blocked_id] = 'blocked'
    }
    for (const f of friendRows || []) {
      const other = f.requester_id === me ? f.addressee_id : f.requester_id
      if (!ids.includes(other)) continue
      if (states[other] === 'blocked') continue
      if (f.status === 'accepted') states[other] = 'friend'
      else if (f.status === 'pending') states[other] = f.requester_id === me ? 'sent' : 'received'
    }
    return states
  },

  /* ── WRITE ──────────────────────────────────────────────── */
  async createContact(payload = {}) {
    if (!isSupabaseLive || !supabase) throw new Error('Supabase live haijawezeshwa.')
    const me = await currentUserId()
    const {
      displayName,
      phoneE164 = null,
      phoneLookupHash = null,
      contactUserId = null,
      source = 'manual',
      notes = '',
      idempotencyKey = null,
      avatarSnapshotUrl = null,
    } = payload

    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        owner_user_id: me,
        contact_user_id: contactUserId,
        phone_e164: phoneE164,
        phone_lookup_hash: phoneLookupHash,
        display_name: displayName,
        avatar_snapshot_url: avatarSnapshotUrl,
        notes,
        source,
        idempotency_key: idempotencyKey,
      })
      .select(SELECT_COLS)
      .single()

    if (error) {
      // 23505 = tayari amehifadhiwa (akaunti ileile AU namba ileile)
      if (error.code === '23505') return { contact: null, duplicate: true }
      throw mapRpcError(error, 'createContact')
    }
    return { contact: toContact(data), duplicate: false }
  },

  async updateContact(id, patch = {}) {
    if (!isSupabaseLive || !supabase) throw new Error('Supabase live haijawezeshwa.')
    await currentUserId()
    const allowed = {
      displayName: 'display_name',
      notes: 'notes',
      isFavorite: 'is_favorite',
      avatarSnapshotUrl: 'avatar_snapshot_url',
      contactUserId: 'contact_user_id',
      phoneE164: 'phone_e164',
      source: 'source',
    }
    const update = {}
    for (const [k, col] of Object.entries(allowed)) if (k in patch) update[col] = patch[k]
    if (!Object.keys(update).length) return this.getContact(id)

    const { data, error } = await supabase.from(TABLE).update(update).eq('id', id).select(SELECT_COLS).maybeSingle()
    if (error) throw mapRpcError(error, 'updateContact')
    if (!data) throw new Error('Contact haipatikani (au si yako).')
    return toContact(data)
  },

  async deleteContact(id) {
    if (!isSupabaseLive || !supabase) throw new Error('Supabase live haijawezeshwa.')
    await currentUserId()
    const { data, error } = await supabase.from(TABLE).delete().eq('id', id).select('id')
    if (error) throw mapRpcError(error, 'deleteContact')
    return { ok: (data || []).length > 0 }
  },

  /* ── LOOKUP: namba → account_id (hakuna namba ya mtu mwingine) ── */
  async lookupNumber(e164) {
    if (!isSupabaseLive || !supabase) return { accountId: null }
    const { data, error } = await supabase.rpc('lookup_contact_phone', { p_phone: e164 })
    if (error) throw mapRpcError(error, 'lookupNumber')
    return { accountId: data?.account_id || null }
  },

  /** Lookup ya kundi (import): hurudisha [{ i, hash, accountId }] */
  async lookupNumbers(e164List = []) {
    if (!isSupabaseLive || !supabase) return []
    if (!e164List.length) return []
    const { data, error } = await supabase.rpc('lookup_contact_phones', { p_phones: e164List })
    if (error) throw mapRpcError(error, 'lookupNumbers')
    return (data || []).map((r) => ({ i: r.i, hash: r.hash, accountId: r.account_id || null }))
  },

  /* ── IMPORT (inarudiwa salama kwa idempotency_key) ──────── */
  async importContacts(rows = []) {
    // saved = zote zilizohifadhiwa sasa; matched/unmatched ni vikundi vyake.
    const result = { saved: 0, matched: 0, unmatched: 0, duplicates: 0, failed: 0, details: [] }
    for (const row of rows) {
      try {
        const res = await this.createContact({
          displayName: row.displayName,
          phoneE164: row.phoneE164 || null,
          phoneLookupHash: row.phoneLookupHash || null,
          contactUserId: row.accountId || null,
          source: 'device_import',
          idempotencyKey: row.idempotencyKey || null,
        })
        if (res.duplicate) {
          result.duplicates += 1
          result.details.push({ name: row.displayName, status: 'duplicate' })
        } else if (row.accountId) {
          result.saved += 1
          result.matched += 1
          result.details.push({ name: row.displayName, status: 'matched', accountId: row.accountId })
        } else {
          result.saved += 1
          result.unmatched += 1
          result.details.push({ name: row.displayName, status: 'unmatched' })
        }
      } catch (err) {
        result.failed += 1
        result.details.push({ name: row.displayName, status: 'failed', error: err.message })
      }
    }
    return result
  },

  /* ── NAMBA YANGU ────────────────────────────────────────── */
  async getMyPhone() {
    if (!isSupabaseLive || !supabase) return null
    const { data, error } = await supabase
      .from('profile_phones')
      .select('phone_e164, verified_at, discoverable, changed_at')
      .maybeSingle()
    if (error) throw mapRpcError(error, 'getMyPhone')
    if (!data) return null
    return {
      phoneE164: data.phone_e164,
      verifiedAt: data.verified_at,
      changedAt: data.changed_at,
      discoverable: data.discoverable,
    }
  },

  async setMyPhone(e164) {
    if (!isSupabaseLive || !supabase) throw new Error('Supabase live haijawezeshwa.')
    const { data, error } = await supabase.rpc('set_my_phone', { p_phone: e164 })
    if (error) throw mapRpcError(error, 'setMyPhone')
    return {
      phoneE164: data?.phone_e164 || e164,
      previousE164: data?.previous_e164 || null,
      changed: !!data?.changed,
    }
  },

  async setDiscoverable(on) {
    if (!isSupabaseLive || !supabase) throw new Error('Supabase live haijawezeshwa.')
    const me = await currentUserId()
    const { error } = await supabase.from('profile_phones').update({ discoverable: !!on }).eq('user_id', me)
    if (error) throw mapRpcError(error, 'setDiscoverable')
    return { discoverable: !!on }
  },

  async clearMyPhone() {
    if (!isSupabaseLive || !supabase) throw new Error('Supabase live haijawezeshwa.')
    const { error } = await supabase.rpc('clear_my_phone')
    if (error) throw mapRpcError(error, 'clearMyPhone')
    return { cleared: true }
  },

  /* ── HASH kwa dedupe ya contacts (namba yangu mwenyewe) ─── */
  async phoneHash(e164) {
    if (!isSupabaseLive || !supabase) return null
    const { data, error } = await supabase.rpc('phone_hmac', { p_phone: e164 })
    if (error) throw mapRpcError(error, 'phoneHash')
    return data || null
  },

  /* ── UHUSIANO (RPC) ─────────────────────────────────────── */
  async friendState(accountId) {
    if (!isSupabaseLive || !supabase) return 'not_friend'
    const { data, error } = await supabase.rpc('contact_friend_state', { p_other: accountId })
    if (error) throw mapRpcError(error, 'friendState')
    return data || 'not_friend'
  },

  async messageGate(accountId) {
    if (!isSupabaseLive || !supabase) return { allowed: true, reason: 'ok' }
    const { data, error } = await supabase.rpc('contact_message_gate', { p_other: accountId })
    if (error) throw mapRpcError(error, 'messageGate')
    return data || { allowed: false, reason: 'unknown' }
  },

  /* ── SUBSCRIBE (live: realtime haijaunganishwa kwa contacts — refetch) ── */
  subscribe() {
    return () => {}
  },
}
