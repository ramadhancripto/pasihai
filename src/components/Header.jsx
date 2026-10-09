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

export default function Header({ onNotifications, onAccount, onMore, onDataSaved, onSystem, unread = 3 }) {
  return (
    <header className="psh-header">
      <div className="psh-header__inner">
        <div className="psh-header__left">
          <a className="psh-header__brand" href="#/" aria-label="Pasihai, mwanzo">
            <Wordmark size={60} />
          </a>
        </div>

        <div className="psh-header__right" role="group" aria-label="Vitendo vya juu">
          {/* Vitendo viwili vya mfumo: Data Saved · System.
              Ni viwili PEKEE — hakuna kitufe kingine cha mfumo. */}
          <div className="psh-header__sys" role="group" aria-label="Hali ya mfumo">
            <DataSavedIndicator onClick={onDataSaved} />
            <SystemQuickButton onClick={onSystem} />
          </div>
          <span className="psh-header__sep" aria-hidden="true" />
          <IconButton label="Taarifa (notifications)" badge={unread > 0} onClick={onNotifications}>
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
