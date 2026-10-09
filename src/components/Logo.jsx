// PASIHAI — Logo (picha halisi za brand, zenye mandharinyuma wazi)
// variant: 'mark'   → P ya mawimbi (icon tu)
//          'lockup' → logo + jina "Pasihai"  (header, kawaida)
//          'full'   → logo + jina + "Stay Connected" (skrini za utangulizi)
import lockupSrc from '../assets/logo/pasihai-lockup.png'
import fullSrc from '../assets/logo/pasihai-full.png'
import iconSrc from '../assets/logo/pasihai-icon.png'

const SOURCES = { mark: iconSrc, lockup: lockupSrc, full: fullSrc }

export default function Logo({ variant = 'lockup', height, width, className = '', title = 'Pasihai' }) {
  const src = SOURCES[variant] || lockupSrc
  return (
    <img
      className={`psh-logo psh-logo--${variant} ${className}`}
      src={src}
      alt={title}
      height={height}
      width={width}
      style={height ? { height, width: 'auto' } : undefined}
      draggable="false"
    />
  )
}
