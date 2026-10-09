// PASIHAI — Wordmark: logo halisi (lockup). Ukubwa = urefu kwa px.
import Logo from './Logo.jsx'

export default function Wordmark({ size = 34, className = '', variant = 'lockup' }) {
  return <Logo variant={variant} height={size} className={`psh-wordmark ${className}`} />
}
