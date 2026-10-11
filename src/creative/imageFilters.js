// Vichujio vya picha (kundi H). Kila kichujio ni seti ya thamani za marekebisho ambazo tayari
// zinaonyeshwa kwenye turubai na kwenye export (mwangaza, utofauti, rangi, joto, tint). Kwa hiyo
// hakuna njia mpya ya uchoraji. Kichujio kinatumika mara moja, na nguvu (0–100) inachanganya
// kati ya hali ya kawaida na thamani kamili ya kichujio. Ukungu hauguswi; ni wa kundi C.
import { clamp } from './creativeModel.js'

// Thamani za kawaida: mwangaza/utofauti/rangi = 100, joto/tint = 0.
export const NEUTRAL_ADJUST = Object.freeze({ brightness: 100, contrast: 100, saturation: 100, temperature: 0, tint: 0 })

export const FILTER_PRESETS = Object.freeze([
  { id: 'warm', label: 'Joto', target: { brightness: 104, contrast: 102, saturation: 110, temperature: 35, tint: 0 } },
  { id: 'cool', label: 'Baridi', target: { brightness: 102, contrast: 104, saturation: 95, temperature: -35, tint: 0 } },
  { id: 'mono', label: 'Nyeusi na nyeupe', target: { brightness: 100, contrast: 115, saturation: 0, temperature: 0, tint: 0 } },
  { id: 'vivid', label: 'Angavu', target: { brightness: 108, contrast: 112, saturation: 140, temperature: 0, tint: 0 } },
  { id: 'vintage', label: 'Zamani', target: { brightness: 104, contrast: 92, saturation: 65, temperature: 25, tint: 8 } },
])

export function presetById(id) {
  return FILTER_PRESETS.find((p) => p.id === id) ?? null
}

// Thamani zilizochanganywa kwa nguvu. Nguvu 0 = kawaida, 100 = kichujio kamili.
// Rudisha patch ya sehemu tano tu (blur haiguswi).
export function presetPatch(id, intensity = 100) {
  const preset = presetById(id)
  if (!preset) return null
  const k = clamp(intensity, 0, 100, 100) / 100
  const patch = {}
  for (const key of Object.keys(NEUTRAL_ADJUST)) {
    const base = NEUTRAL_ADJUST[key]
    const value = Math.round(base + (preset.target[key] - base) * k)
    patch[key] = key === 'temperature' || key === 'tint'
      ? clamp(value, -100, 100, 0)
      : clamp(value, 0, 200, 100)
  }
  return patch
}

// Kuondoa vichujio: sehemu tano za rangi zinarudi kwenye kawaida. Blur na uwazi havigusiwi.
export function clearFilterPatch() {
  return { ...NEUTRAL_ADJUST }
}

// Kichujio kiko hai ikiwa sehemu yoyote ya rangi iko mbali na kawaida.
export function hasFilter(layer) {
  if (!layer) return false
  return Object.keys(NEUTRAL_ADJUST).some((k) => (layer[k] ?? NEUTRAL_ADJUST[k]) !== NEUTRAL_ADJUST[k])
}
