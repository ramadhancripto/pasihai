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

export default function Header({ onNotifications, onAccount, onMore, unread = 3 }) {
  return (
    <header className="psh-header">
      <div className="psh-header__inner">
        <div className="psh-header__left">
          <a className="psh-header__brand" href="#/" aria-label="Pasihai, mwanzo">
            <Wordmark size={22} />
          </a>
        </div>

        <div className="psh-header__right" role="group" aria-label="Vitendo vya juu">
          <IconButton label="Taarifa (notifications)" badge={unread > 0} onClick={onNotifications}>
            <IconBell size={22} />
          </IconButton>
          <IconButton label="Akaunti yangu" onClick={onAccount}>
            <IconUser size={22} />
          </IconButton>
          <IconButton label="Menyu zaidi za Home" onClick={onMore}>
            <IconMoreVertical size={22} />
          </IconButton>
        </div>
      </div>
    </header>
  )
}
