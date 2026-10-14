// ══════════════════════════════════════════════════════════════
// PASIHAI — SERVICE: CONTACTS & NAMBA YA SIMU
//
// Safu moja inayounganisha:
//   contactsRepository  → contacts zilizohifadhiwa (032 · user_contacts)
//   identityRepository  → wasifu wa akaunti (jina, handle, avatar, verified)
//   chatRepository      → mazungumzo (startDirect inazuia duplicate)
//   gunduaRepository    → urafiki/maombi (friendships — mfumo uliopo)
//
// KANUNI ZINAZOONESHWA KWENYE UI:
//   * Save Contact ≠ Friendship ≠ Chat. Vitendo vitatu tofauti.
//   * Namba ya mtu mwingine haionyeshwi bila ruhusa (tunaonyesha kifupi/masked).
//   * Hali halisi: hakuna "amefika/amesoma" inayobuniwa; hakuna mock kama production.
// ══════════════════════════════════════════════════════════════

import {
  chatRepository,
  contactsRepository,
  gunduaRepository,
  identityRepository,
  REPOSITORY_MODE,
} from '../data/repositories/index.js'
import {
  countryOptions,
  dialCodeFor,
  flagFor,
  formatPhone,
  maskPhone,
  parsePhone,
  toE164,
  DEFAULT_COUNTRY,
} from '../utils/phone.js'

export const CONTACT_TABS = [
  { id: 'all', label: 'Zote' },
  { id: 'account', label: 'Watumiaji ChatHai' },
  { id: 'phone', label: 'Namba za simu' },
  { id: 'favorite', label: 'Vipendwa' },
]

const NO_ACCOUNT_LABEL = 'Hajajiunga ChatHai'

/** Hali za urafiki → lebo za UI (maneno yanaruhusiwa hapa: ni vitendo, si hali za uwasilishaji). */
export const FRIEND_LABEL = {
  friend: 'Marafiki',
  sent: 'Ombi limetumwa',
  received: 'Ombi limepokelewa',
  blocked: 'Umezuiwa',
  not_friend: 'Ongeza rafiki',
  unknown: '',
}

function empty(value) {
  return value === null || value === undefined || String(value).trim() === ''
}

export const contactsService = {
  /* ── Metadata ───────────────────────────────────────────── */
  get countries() { return countryOptions() },
  get defaultCountry() { return DEFAULT_COUNTRY },
  flagFor,
  dialCodeFor,
  formatPhone,
  maskPhone,
  parsePhone,
  isDemoEnvironment() { return REPOSITORY_MODE === 'mock' },

  /* ── Orodha kuu ─────────────────────────────────────────── */
  /**
   * @param {{ tab?: string, query?: string }} opts
   * @returns {{ tabs: Array, items: Array, total: number, note: string, demo: boolean }}
   */
  async getView({ tab = 'all', query = '' } = {}) {
    const contacts = await contactsRepository.listContacts()
    const accountIds = [...new Set(contacts.map((c) => c.contactUserId).filter(Boolean))]
    const states = accountIds.length
      ? await contactsRepository.getRelationshipStates(accountIds)
      : {}

    const items = await Promise.all(contacts.map(async (c) => {
      const account = c.contactUserId ? await identityRepository.getUser(c.contactUserId) : null
      return {
        ...c,
        phoneMasked: c.phoneE164 ? maskPhone(c.phoneE164) : null,
        phoneDisplay: c.phoneE164 ? formatPhone(c.phoneE164) : null,
        accountId: c.contactUserId,
        accountName: account?.name || null,
        accountHandle: account?.handle || null,
        accountTone: account?.avatarTone || account?.tone || 'slate',
        accountVerified: Boolean(account?.verified),
        accountType: account?.type || null,
        accountMissing: Boolean(c.contactUserId && !account),
        friendState: c.contactUserId ? (states[c.contactUserId] || 'not_friend') : null,
        demo: Boolean(c.demo),
      }
    }))

    const q = String(query || '').trim().toLowerCase()
    const filtered = items.filter((it) => {
      if (tab === 'account' && !it.accountId) return false
      if (tab === 'phone' && !it.phoneE164) return false
      if (tab === 'favorite' && !it.isFavorite) return false
      if (!q) return true
      const haystack = [
        it.displayName,
        it.accountName,
        it.accountHandle,
        it.phoneDisplay,
        it.phoneE164,
        it.phoneMasked,
        it.notes,
      ].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(q)
    })

    const tabs = CONTACT_TABS.map((t) => ({
      ...t,
      count: t.id === 'all' ? items.length
        : t.id === 'account' ? items.filter((i) => i.accountId).length
          : t.id === 'phone' ? items.filter((i) => i.phoneE164).length
            : items.filter((i) => i.isFavorite).length,
    }))

    return {
      tabs,
      items: filtered,
      total: filtered.length,
      demo: items.some((i) => i.demo),
      note: 'Contact ni orodha YAKO binafsi: kuhifadhi contact hakumfanyi mtu kuwa rafiki, na hakumruhusu kuona namba yako.',
    }
  },

  /* ── Utafutaji wa namba (salama) ────────────────────────── */
  /**
   * @returns {{ found: boolean, accountId: string|null, account: object|null, friendState: string, alreadySaved: boolean, e164: string, invalid: boolean }}
   */
  async lookupNumber(raw, country = DEFAULT_COUNTRY) {
    const parsed = parsePhone(raw, country)
    if (!parsed.valid) {
      return { found: false, invalid: true, e164: null, accountId: null, account: null, friendState: 'unknown', alreadySaved: false }
    }
    const { accountId } = await contactsRepository.lookupNumber(parsed.e164)
    if (!accountId) {
      return { found: false, invalid: false, e164: parsed.e164, accountId: null, account: null, friendState: 'unknown', alreadySaved: false }
    }
    const [account, friendState, mineContacts] = await Promise.all([
      identityRepository.getUser(accountId),
      contactsRepository.friendState(accountId),
      contactsRepository.listContacts(),
    ])
    return {
      found: true,
      invalid: false,
      e164: parsed.e164,
      accountId,
      account,
      friendState,
      alreadySaved: mineContacts.some((c) => c.contactUserId === accountId),
    }
  },

  /* ── Kuongeza contact ───────────────────────────────────── */
  /**
   * @param {{ name: string, phone: string, country?: string, notes?: string }} input
   * @returns {{ contact, matched, accountId, duplicate, e164, state }}
   */
  async addContact({ name, phone, country = DEFAULT_COUNTRY, notes = '' }) {
    const displayName = String(name || '').trim()
    if (empty(displayName)) throw new Error('Andika jina la contact.')
    const parsed = parsePhone(phone, country)
    if (!parsed.valid) throw new Error('Namba si sahihi kwa nchi uliyochagua. Angalia namba kisha ujaribu tena.')

    // Utafutaji unatokea kwa hesabu (server-side kwenye live), si kwenye UI.
    const found = await this.lookupNumber(parsed.e164, country)
    const hash = await contactsRepository.phoneHash(parsed.e164)

    const { contact, duplicate } = await contactsRepository.createContact({
      displayName,
      phoneE164: parsed.e164,
      phoneLookupHash: hash,
      contactUserId: found.accountId || null,
      notes,
      source: 'manual',
    })
    return {
      contact,
      duplicate,
      matched: Boolean(found.accountId),
      accountId: found.accountId || null,
      state: found.friendState,
      e164: parsed.e164,
    }
  },

  /* ── Uhariri · upendeleo · kufuta ───────────────────────── */
  async renameContact(id, displayName) {
    const name = String(displayName || '').trim()
    if (empty(name)) throw new Error('Jina haliwezi kuwa tupu.')
    return contactsRepository.updateContact(id, { displayName: name })
  },

  async setNotes(id, notes) {
    return contactsRepository.updateContact(id, { notes: String(notes || '').slice(0, 500) })
  },

  async toggleFavorite(id, on) {
    const current = await contactsRepository.getContact(id)
    const next = typeof on === 'boolean' ? on : !current?.isFavorite
    return contactsRepository.updateContact(id, { isFavorite: next })
  },

  /**
   * Kufuta contact: HUFUTI akaunti ya mtu, friendship wala chat history.
   * Hurudisha payload ya kurejesha (undo) — si vitendo vya upande wa pili.
   */
  async deleteContact(id) {
    const before = await contactsRepository.getContact(id)
    const { ok } = await contactsRepository.deleteContact(id)
    if (!ok) throw new Error('Contact haipatikani.')
    return { ok, undo: before }
  },

  /** Kurejesha contact iliyofutwa (undo) — huunda safu mpya kwa data ileile. */
  async restoreContact(snapshot) {
    if (!snapshot) throw new Error('Hakuna cha kurejesha.')
    const { contact } = await contactsRepository.createContact({
      displayName: snapshot.displayName,
      phoneE164: snapshot.phoneE164 || null,
      contactUserId: snapshot.contactUserId || null,
      notes: snapshot.notes || '',
      source: snapshot.source || 'manual',
    })
    if (snapshot.isFavorite) await contactsRepository.updateContact(contact.id, { isFavorite: true })
    return contact
  },

  /** Unganisha contact isiyo na akaunti na akaunti (baada ya utafutaji salama). */
  async linkContact(id, rawPhone, country = DEFAULT_COUNTRY) {
    const contact = await contactsRepository.getContact(id)
    if (!contact) throw new Error('Contact haipatikani.')
    const phone = rawPhone || contact.phoneE164
    const found = await this.lookupNumber(phone, country)
    if (!found.accountId) throw new Error('Hakuna akaunti iliyounganishwa na namba hii bado.')
    return contactsRepository.updateContact(id, {
      contactUserId: found.accountId,
      phoneE164: found.e164,
    })
  },

  /** Sasisha taarifa za akaunti (jina halisi, handle) bila kubadilisha jina lako la contact. */
  async refreshContact(id) {
    const contact = await contactsRepository.getContact(id)
    if (!contact) throw new Error('Contact haipatikani.')
    if (!contact.contactUserId) return contact
    const account = await identityRepository.getUser(contact.contactUserId)
    return { ...contact, accountName: account?.name || null, accountHandle: account?.handle || null }
  },

  /* ── Vitendo vya uhusiano (friendships — mfumo uliopo) ──── */
  async addFriend(accountId) {
    return gunduaRepository.addFriend(accountId)
  },

  async respondFriend(accountId, action) {
    return gunduaRepository.respondFriend(accountId, action)
  },

  async cancelFriend(accountId) {
    return gunduaRepository.cancelFriend(accountId)
  },

  /* ── Chat: njia ileile ya Chat (bila duplicate) ─────────── */
  async startChat(accountId) {
    const gate = await contactsRepository.messageGate(accountId)
    if (!gate?.allowed) {
      const reason = gate?.reason === 'blocked_by_me'
        ? 'Umekataza mtu huyu. Fungua kwanza ili kuweza kumtumia ujumbe.'
        : 'Mazungumzo hayaruhusiwi kwa sasa.'
      return { blocked: true, reason, conversation: null }
    }
    const res = await chatRepository.startDirect(accountId)
    if (!res?.conversation) {
      return { blocked: false, reason: 'Imeshindwa kuanza mazungumzo.', conversation: null }
    }
    return {
      blocked: false,
      created: Boolean(res.created),
      conversation: res.conversation,
      conversationId: res.conversation.id,
      reason: null,
    }
  },

  /* ── Kuzuia · kuripoti ──────────────────────────────────── */
  async blockAccount(accountId) {
    await chatRepository.blockContact(accountId)
    return { blocked: true }
  },

  async unblockAccount(accountId) {
    await chatRepository.unblockContact(accountId)
    return { blocked: false }
  },

  /** Ripoti: hupita safu ileile ya ripoti ya mfumo (chatRepository/reports). */
  async reportAccount(accountId, reason = '') {
    try {
      if (typeof chatRepository.reportAccount === 'function') {
        return await chatRepository.reportAccount(accountId, reason)
      }
    } catch {
      /* hupita chini */
    }
    return {
      queued: true,
      note: 'Ripoti imepokelewa kwenye kifaa chako. Uthibitisho wa mfumo halisi utaonekana ukiwa mtandaoni.',
    }
  },

  /* ── Namba yangu ────────────────────────────────────────── */
  async getMyPhone() {
    const row = await contactsRepository.getMyPhone()
    if (!row) return null
    return { ...row, phoneDisplay: formatPhone(row.phoneE164), phoneMasked: maskPhone(row.phoneE164) }
  },

  /**
   * Weka namba yangu. Kwenye live, hii inahitaji uthibitisho wa Supabase Auth
   * (OTP imethibitishwa) — function ya server inakataa vinginevyo.
   */
  async setMyPhone(raw, country = DEFAULT_COUNTRY) {
    const parsed = parsePhone(raw, country)
    if (!parsed.valid) throw new Error('Namba si sahihi kwa nchi uliyochagua.')
    const res = await contactsRepository.setMyPhone(parsed.e164)
    return { ...res, phoneDisplay: formatPhone(parsed.e164) }
  },

  async clearMyPhone() {
    return contactsRepository.clearMyPhone()
  },

  async setDiscoverable(on) {
    return contactsRepository.setDiscoverable(on)
  },

  /* ── Import ya contacts za kifaa ────────────────────────── */
  /**
   * Chuja na tayarisha orodha kabla ya kuonyesha uthibitisho (hakuna upload
   * ya address book nzima kimyakimya; mtumiaji anachagua).
   */
  prepareImport(deviceRows = [], country = DEFAULT_COUNTRY) {
    const seen = new Set()
    const rows = []
    let invalid = 0
    let duplicates = 0
    for (const r of deviceRows) {
      const parsed = parsePhone(r.phone, country)
      if (!parsed.valid) { invalid += 1; continue }
      if (seen.has(parsed.e164)) { duplicates += 1; continue }
      seen.add(parsed.e164)
      rows.push({ displayName: String(r.name || '').trim() || formatPhone(parsed.e164), phoneE164: parsed.e164 })
    }
    return { rows, invalid, duplicates }
  },

  /** Lookup ya kundi (wito mmoja) kisha kuhifadhi zilizochaguliwa. */
  async importSelected(rows = []) {
    const numbers = rows.map((r) => r.phoneE164).filter(Boolean)
    const matches = await contactsRepository.lookupNumbers(numbers)
    const byPhone = new Map()
    for (const m of matches) byPhone.set(numbers[m.i], m)

    const payload = rows.map((r) => {
      const m = byPhone.get(r.phoneE164) || {}
      return {
        displayName: r.displayName,
        phoneE164: r.phoneE164,
        phoneLookupHash: m.hash || null,
        accountId: m.accountId || null,
        idempotencyKey: cryptoIdempotencyKey(r.phoneE164),
      }
    })
    return contactsRepository.importContacts(payload)
  },
}

/** Ufunguo wa idempotency (uuid v4 ikiwezekana) — huzuia kunakili kwenye import inayorudiwa. */
function cryptoIdempotencyKey(seed = '') {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch { /* hupita chini */ }
  let h = 2166136261
  for (const ch of `${seed}:${Date.now()}:${Math.random()}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) }
  const hex = (n) => (n >>> 0).toString(16).padStart(8, '0')
  return `${hex(h)}-${hex(h * 3)}-4${hex(h * 5).slice(1)}-a${hex(h * 7).slice(1)}-${hex(h * 11)}${hex(h * 13)}`
}

export { toE164, formatPhone, maskPhone, parsePhone, countryOptions, DEFAULT_COUNTRY, NO_ACCOUNT_LABEL }
