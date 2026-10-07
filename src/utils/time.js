// PASIHAI — FORMATTER YA MUDA (presentation)
//
// Kwa nini: data huhifadhi muda kama NAMBA (`ageMinutes`), si maandishi.
// Namba inaweza kupangwa (sorting), kuhesabiwa na kutafsiriwa.
// Component inaita formatter pekee.
//
// Inatoa matokeo yale yale yaliyokuwa kwenye mock ya awali:
//   12 → 'dakika 12'   60 → 'saa 1'   1440 → 'siku 1'

export function formatAge(minutes) {
  const m = Number(minutes)
  if (!Number.isFinite(m) || m < 0) return ''

  if (m < 60) return `dakika ${Math.floor(m)}`
  if (m < 1440) return `saa ${Math.round(m / 60)}`
  return `siku ${Math.round(m / 1440)}`
}
