// ══════════════════════════════════════════════════════════════
// PASIHAI — UTILS: NAMBA YA SIMU (E.164)
//
// Kanuni: namba hubadilishwa kuwa E.164 kwa PARSER inayotambua country code,
// si kubadilisha string. Tunatumia libphonenumber-js (metadata ya ITU) —
// inashughulikia trunk prefix (k.m. `0` ya Tanzania), urefu halali wa kila
// nchi, na kupanga muundo.
//
// Namba HAITUMIKI kama kitambulisho cha akaunti — kitambulisho ni user_id.
// ══════════════════════════════════════════════════════════════

import {
  parsePhoneNumberFromString,
  getCountries,
  getCountryCallingCode,
  isSupportedCountry,
} from 'libphonenumber-js'

/** Nchi ya msingi ya app (soko la Pasihai); mtumiaji anaweza kubadilisha. */
export const DEFAULT_COUNTRY = 'TZ'

/* ── Nchi: jina (lugha ya kifaa/Swahili ikiwezekana) · dial · bendera ── */

let _names = null
function regionNames() {
  if (_names !== null) return _names
  try {
    _names = new Intl.DisplayNames(['sw', 'en'], { type: 'region' })
  } catch {
    _names = false
  }
  return _names
}

/** Bendera kutoka ISO-2 (regional indicator symbols). */
export function flagFor(iso) {
  if (!iso || iso.length !== 2) return '🌍'
  return String.fromCodePoint(
    ...iso.toUpperCase().split('').map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  )
}

let _options = null
/** Orodha ya nchi kwa kichaguzi: [{ iso, name, dial, flag }] — TZ kwanza. */
export function countryOptions() {
  if (_options) return _options
  const names = regionNames()
  _options = getCountries()
    .map((iso) => {
      let name = isSupportedCountry(iso) ? iso : iso
      if (names) {
        try { name = names.of(iso) || iso } catch { name = iso }
      }
      return { iso, name, dial: `+${getCountryCallingCode(iso)}`, flag: flagFor(iso) }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'sw'))
  // Nchi ya msingi mbele.
  const i = _options.findIndex((o) => o.iso === DEFAULT_COUNTRY)
  if (i > 0) _options.unshift(_options.splice(i, 1)[0])
  return _options
}

/** Nambari ya kupiga simu ya nchi (bila `+`), k.m. TZ → '255'. */
export function dialCodeFor(iso) {
  if (!iso || !isSupportedCountry(iso)) return ''
  return getCountryCallingCode(iso)
}

/* ── Ubadilishaji ───────────────────────────────────────────── */

/**
 * Badilisha ingizo lolote la mtumiaji kuwa E.164.
 * @param {string} input  k.m. '0784 123 456', '+255784123456'
 * @param {string} countryIso  nchi iliyochaguliwa (default TZ)
 * @returns {{ e164: string|null, valid: boolean, international: string|null, national: string|null, country: string|null }}
 */
export function parsePhone(input, countryIso = DEFAULT_COUNTRY) {
  const empty = { e164: null, valid: false, international: null, national: null, country: countryIso || null }
  const raw = String(input ?? '').trim()
  if (!raw) return empty

  const p = parsePhoneNumberFromString(raw, countryIso || undefined)
  if (!p) return empty

  return {
    e164: p.number,                      // kila mara +CC...
    valid: p.isValid(),
    international: p.formatInternational(),
    national: p.formatNational(),
    country: p.country || countryIso || null,
  }
}

/** E.164 pekee (au null kama si sahihi). */
export function toE164(input, countryIso = DEFAULT_COUNTRY) {
  const parsed = parsePhone(input, countryIso)
  return parsed.valid ? parsed.e164 : null
}

/** Muundo wa kuonyesha (international) — hurudisha ingizo kama haliparseki. */
export function formatPhone(input) {
  const p = parsePhoneNumberFromString(String(input ?? ''))
  if (!p) return String(input ?? '')
  return p.formatInternational()
}

/** Ficha tarakimu za kati (faragha): +255 784 ••• 456 */
export function maskPhone(input) {
  const p = parsePhoneNumberFromString(String(input ?? ''))
  const e164 = p?.number || String(input ?? '')
  const digits = e164.replace(/\D/g, '')
  if (digits.length < 7) return '···'
  const cc = digits.slice(0, digits.length - 9 > 0 ? digits.length - 9 : 3)
  const tail = digits.slice(-3)
  return `+${cc} ••• ${tail}`
}

/** Ni E.164 halali? */
export function isValidE164(input) {
  const p = parsePhoneNumberFromString(String(input ?? ''))
  return Boolean(p && p.isValid() && String(input).trim().startsWith('+'))
}
