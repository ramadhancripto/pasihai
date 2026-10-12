// ══════════════════════════════════════════════════════════════
// PASIHAI — HEADER (Hatua 1)
// Pasihai                                  🔔  👤  ⋮
// - Wordmark kushoto
// - Icon tatu upande wa kulia kama GROUP MOJA compact
// - Hakuna hamburger, hakuna spacer kubwa kati ya icons
// ══════════════════════════════════════════════════════════════

import Wordmark from './Wordmark.jsx'
import { IconBell, IconUser, IconMoreVertical } from './icons.jsx'
import { IconButton } from './ui.jsx'
import DataSavedIndicator from './system/DataSavedIndicator.jsx'
import SystemQuickButton from './system/SystemQuickButton.jsx'

/* ── Moon/Sun icons (inline SVG — no dependency) ──────────── */
const IconMoon = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)
const IconSun = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
)

export default function Header({ onNotifications, onAccount, onMore, onDataSaved, onSystem, isDark, onToggleTheme }) {
  return (
    <header className="psh-header">
      <div className="psh-header__inner">
        <div className="psh-header__left">
          <a className="psh-header__brand" href="#/home" aria-label="Pasihai, mwanzo">
            <Wordmark size={60} />
          </a>
        </div>

        <div className="psh-header__right" role="group" aria-label="Vitendo vya juu">
          <div className="psh-header__sys" role="group" aria-label="Hali ya mfumo">
            <DataSavedIndicator onClick={onDataSaved} />
            <SystemQuickButton onClick={onSystem} />
          </div>
          <span className="psh-header__sep" aria-hidden="true" />
          <IconButton label={isDark ? 'Mandhari ya mwanga' : 'Mandhari ya giza'} onClick={onToggleTheme}>
            {isDark ? <IconSun size={22} /> : <IconMoon size={22} />}
          </IconButton>
          <IconButton label="Taarifa (notifications)" onClick={onNotifications}>
            <IconBell size={26} />
          </IconButton>
          <IconButton label="Akaunti yangu" onClick={onAccount}>
            <IconUser size={26} />
          </IconButton>
          <IconButton label="Menyu zaidi za Home" onClick={onMore}>
            <IconMoreVertical size={26} />
          </IconButton>
        </div>
      </div>
    </header>
  )
}