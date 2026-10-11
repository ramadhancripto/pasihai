// ══════════════════════════════════════════════════════════════
// PASIHAI — Format controls (zinazotumiwa na Post Studio na More → Muundo)
// Rangi zinatoka kwenye PALETTE pekee; saizi kwenye allowlist.
// ══════════════════════════════════════════════════════════════

import { useId } from 'react'
import { PALETTE } from '../../utils/postContent.js'

export const SIZE_TEXT = { sm: 'Ndogo', md: 'Kati', lg: 'Kubwa', xl: 'Kubwa sana' }

export function Swatches({ label, value, onChange }) {
  return (
    <div className="psh-ps__field">
      <span className="psh-ps__label">{label}</span>
      <div className="psh-ps__swatches" role="group" aria-label={label}>
        {Object.keys(PALETTE).map((k) => (
          <button
            key={k}
            type="button"
            className="psh-ps__swatch"
            aria-pressed={value === k}
            aria-label={`${label}: ${PALETTE[k].label}`}
            style={{ background: PALETTE[k].hex }}
            onClick={() => onChange(k)}
          />
        ))}
      </div>
    </div>
  )
}

export function SizeSelect({ label, value, options, onChange }) {
  const id = useId()
  return (
    <div className="psh-ps__field">
      <label className="psh-ps__label" htmlFor={id}>{label}</label>
      <select id={id} className="psh-ps__input" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{SIZE_TEXT[o] ?? o}</option>)}
      </select>
    </div>
  )
}
