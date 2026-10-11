// Ubadilishaji wa rangi: HEX ↔ RGB ↔ HSL. Ni kazi safi (pure), bila React wala DOM,
// ili zijaribiwe kwa node. Kila kitu kinahifadhiwa kama HEX kwenye mradi.

const clampInt = (v, min, max) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, Math.round(n)))
}

// "#rgb" au "#rrggbb" (herufi kubwa/ndogo, na # ni hiari). Rudisha { r, g, b } au null.
export function hexToRgb(hex) {
  if (typeof hex !== 'string') return null
  let s = hex.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(s)) s = s.split('').map((c) => c + c).join('')
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return null
  return {
    r: parseInt(s.slice(0, 2), 16),
    g: parseInt(s.slice(2, 4), 16),
    b: parseInt(s.slice(4, 6), 16),
  }
}

export function rgbToHex(r, g, b) {
  const part = (v) => clampInt(v, 0, 255).toString(16).padStart(2, '0')
  return `#${part(r)}${part(g)}${part(b)}`
}

// RGB (0–255) → HSL: h 0–360, s 0–100, l 0–100 (nambari nzima).
export function rgbToHsl(r, g, b) {
  const rn = clampInt(r, 0, 255) / 255
  const gn = clampInt(g, 0, 255) / 255
  const bn = clampInt(b, 0, 255) / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
  }
  return { h: Math.round(h) % 360, s: Math.round(s * 100), l: Math.round(l * 100) }
}

// HSL (h 0–360, s 0–100, l 0–100) → RGB (0–255).
export function hslToRgb(h, s, l) {
  const hn = ((clampInt(h, 0, 360) % 360) + 360) % 360 / 360
  const sn = clampInt(s, 0, 100) / 100
  const ln = clampInt(l, 0, 100) / 100
  if (sn === 0) {
    const v = Math.round(ln * 255)
    return { r: v, g: v, b: v }
  }
  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn
  const p = 2 * ln - q
  const hue = (t) => {
    let x = t
    if (x < 0) x += 1
    if (x > 1) x -= 1
    if (x < 1 / 6) return p + (q - p) * 6 * x
    if (x < 1 / 2) return q
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6
    return p
  }
  return {
    r: Math.round(hue(hn + 1 / 3) * 255),
    g: Math.round(hue(hn) * 255),
    b: Math.round(hue(hn - 1 / 3) * 255),
  }
}

export function hslToHex(h, s, l) {
  const { r, g, b } = hslToRgb(h, s, l)
  return rgbToHex(r, g, b)
}

// Kwa HEX halali pekee. HEX batili inarudisha null (usiitumie kubadilisha mradi).
export function hexToHsl(hex) {
  const rgb = hexToRgb(hex)
  return rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null
}
