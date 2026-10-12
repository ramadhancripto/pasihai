// ══════════════════════════════════════════════════════════════
// PASIHAI — HEADER
// Pasihai                         🔔  👤  ⋮
// - Wordmark kushoto
// - Icons tatu: notifications, account, more (⋮)
// - Theme, DataSaved, System → ndani ya ⋮ (More menu)
// ══════════════════════════════════════════════════════════════

import Wordmark from './Wordmark.jsx'
import { IconBell, IconUser, IconMoreVertical, IconSwap } from './icons.jsx'
import { IconButton } from './ui.jsx'

export default function Header({ onNotifications, onAccount, onMore, onSystem }) {
  return (
    <header className="psh-header">
      <div className="psh-header__inner">
        <div className="psh-header__left">
          <a className="psh-header__brand" href="#/home" aria-label="Pasihai, mwanzo">
            <Wordmark size={60} />
          </a>
        </div>

        <div className="psh-header__right" role="group" aria-label="Vitendo vya juu">
          <IconButton label="Taarifa" onClick={onNotifications}>
            <IconBell size={22} />
          </IconButton>
          <IconButton label="Akaunti" onClick={onAccount}>
            <IconUser size={22} />
          </IconButton>
          <IconButton label="System" onClick={onSystem}>
            <IconSwap size={22} />
          </IconButton>
          <IconButton label="Menyu" onClick={onMore}>
            <IconMoreVertical size={22} />
          </IconButton>
        </div>
      </div>
    </header>
  )
}