// ══════════════════════════════════════════════════════════════
// ChatHai Groups — CONFIG ya aina na mipaka (chanzo KIMOJA cha namba)
//
// Kanuni ya master spec (§7, §54): kikomo cha wanachama na kanuni za
// aina ya kikundi HAZIKO hard-coded kwenye UI. Zinasomwa kutoka hapa,
// na namba zinalingana na jedwali la DB (`chat_group_type_limits`,
// migration 033). Test ya `supabase/verify/groups-test.mjs` inathibitisha
// kwamba JS na DB zinataja namba ILEILE (chanzo kimoja, sehemu mbili za
// utekelezaji: UI + backend).
//
// Hali ya sasa (iliyoidhinishwa): kikundi cha kawaida = 1,024 wanachama.
// Announcement na Managed zinafuata tier ya 1,024 kwa sasa — mabadiliko
// yao ni uamuzi wa Owner, si kuandikwa hapa kwa bahati.
// ══════════════════════════════════════════════════════════════

export const GROUP_TYPES = ['normal', 'announcement', 'managed']

export const GROUP_MEMBER_LIMITS = {
  normal: 1024,
  announcement: 1024,
  managed: 1024,
}

export const GROUP_TYPE_LABELS = {
  normal: 'Kikundi cha kawaida',
  announcement: 'Kikundi cha matangazo',
  managed: 'Kikundi kinachosimamiwa',
}

export const GROUP_TYPE_HINTS = {
  normal: 'Kila mwanachama anayeweza kutuma anaweza kuchangia kulingana na ruhusa.',
  announcement: 'Matangazo hufikia wote; kutuma, kujibu na reactions zina ruhusa tofauti.',
  managed: 'Uongozi husimamia wanachama, maombi na maudhui kwa ruhusa maalum za kila kitendo.',
}

/* Aina ya kikundi inayotumika kikundi kimoja kimoja (mode moja ya infra ileile) */
export function isGroupType(t) {
  return GROUP_TYPES.includes(t)
}

export function groupMemberLimit(type = 'normal') {
  return GROUP_MEMBER_LIMITS[type] || GROUP_MEMBER_LIMITS.normal
}

/* ── Faragha ─────────────────────────────────────────────────── */
export const GROUP_PRIVACY = ['public', 'private']
export const GROUP_PRIVACY_LABELS = {
  public: 'Public',
  private: 'Private',
}
export const GROUP_PRIVACY_HINTS = {
  public: 'Kikundi kinaweza kupatikana; kujiunga kunafuata njia na ruhusa zilizowekwa.',
  private: 'Ni wanachama pekee wanaoona; kujiunga kunafuata njia na ruhusa zilizowekwa.',
}

/* ── Kujiunga ────────────────────────────────────────────────── */
export const GROUP_JOIN_METHODS = ['direct', 'invite', 'invite_link', 'request']
export const GROUP_JOIN_LABELS = {
  direct: 'Kuongezwa moja kwa moja',
  invite: 'Mwaliko wa mtu mmoja',
  invite_link: 'Kiungo cha mwaliko',
  request: 'Ombi + idhini',
}

export const GROUP_WHO_CAN_ADD = ['owner', 'owner_admins', 'members']
export const GROUP_WHO_CAN_ADD_LABELS = {
  owner: 'Owner pekee',
  owner_admins: 'Owner + admins walioidhinishwa',
  members: 'Wanachama wote',
}

export const GROUP_WHO_CAN_REPLY = ['all', 'admins']
export const GROUP_WHO_CAN_REPLY_LABELS = { all: 'Wanachama wote', admins: 'Admins pekee' }

export const GROUP_WHO_CAN_REACT = ['all', 'admins']
export const GROUP_WHO_CAN_REACT_LABELS = { all: 'Wanachama wote', admins: 'Admins pekee' }

export const GROUP_ANNOUNCEMENT_SENDERS = ['owner', 'owner_admins']
export const GROUP_ANNOUNCEMENT_SENDERS_LABELS = {
  owner: 'Owner pekee',
  owner_admins: 'Owner + admins walioidhinishwa',
}

export const GROUP_SLOW_MODE = [0, 30, 60, 300, 900, 3600]
export const GROUP_SLOW_MODE_LABELS = {
  0: 'Bila slow mode',
  30: 'Sekunde 30',
  60: 'Dakika 1',
  300: 'Dakika 5',
  900: 'Dakika 15',
  3600: 'Saa 1',
}

/* ── Mahali ilipoundwa ───────────────────────────────────────── */
export const GROUP_LOCATION_VISIBILITY = ['hidden', 'country', 'region', 'district', 'city']
export const GROUP_LOCATION_VISIBILITY_LABELS = {
  hidden: 'Isionyeshwe',
  country: 'Nchi pekee',
  region: 'Mkoa',
  district: 'Wilaya',
  city: 'Mji',
}

/* ── Lugha ───────────────────────────────────────────────────── */
export const GROUP_LANGUAGES = ['sw', 'en', 'fr', 'ar', 'other']
export const GROUP_LANGUAGE_LABELS = {
  sw: 'Kiswahili',
  en: 'Kiingereza',
  fr: 'Kifaransa',
  ar: 'Kiarabu',
  other: 'Nyingine',
}

/* ── Mipaka ya maandishi na faili ────────────────────────────── */
export const GROUP_NAME_MAX = 100 // lingana na CHECK ya chat_conversations (1..100)
export const GROUP_DESCRIPTION_MAX = 300 // maelezo mafupi
export const GROUP_TEXT_MAX = 2000 // sehemu ndefu (madhumuni, sheria n.k.)
export const GROUP_RULES_MAX = 4000
export const GROUP_DP_MAX_BYTES = 5 * 1024 * 1024
export const GROUP_COVER_MAX_BYTES = 5 * 1024 * 1024
export const GROUP_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export function isGroupImage(file) {
  return !!file && GROUP_IMAGE_TYPES.includes(file.type)
}

export function humanBytes(bytes = 0) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let n = bytes
  let i = 0
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i += 1
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}
