// ══════════════════════════════════════════════════════════════
// PASIHAI — BOTTOM NAVIGATION (Hatua 1)
// Destinations TANO pekee:
//   Home → Consume     · Chat → Communicate · Gundua → Discover
//   Spaces → Participate · Business → Operate
// Hakuna ya sita. Hakuna duplication na Home tabs.
// ══════════════════════════════════════════════════════════════

import {
  IconHome,
  IconChat,
  IconGundua,
  IconSpaces,
  IconBusiness,
} from './icons.jsx'

const PREVIEW_STATUS = 'Preview ya prototype; data na vitendo vya tab hii bado si huduma kamili ya backend.'

export const NAV_ITEMS = [
  {
    id: 'home', label: 'Home', Icon: IconHome, purpose: 'Kutazama',
    statusLabel: 'Demo', statusDescription: PREVIEW_STATUS,
  },
  {
    id: 'chat', label: 'Chat', Icon: IconChat, purpose: 'Mawasiliano',
    statusLabel: 'Demo', statusDescription: PREVIEW_STATUS,
  },
  {
    id: 'gundua', label: 'Gundua', Icon: IconGundua, purpose: 'Kugundua',
    statusLabel: 'Demo', statusDescription: PREVIEW_STATUS,
  },
  {
    id: 'spaces', label: 'Spaces', Icon: IconSpaces, purpose: 'Kushiriki',
    statusLabel: 'Demo', statusDescription: PREVIEW_STATUS,
  },
  {
    id: 'business',
    label: 'Business',
    Icon: IconBusiness,
    purpose: 'Kuendesha',
    statusLabel: 'Bado',
    statusTone: 'pending',
    statusDescription: 'Business bado haijakamilika: backend na vitendo vya biashara havijatekelezwa.',
  },
]

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="psh-nav" aria-label="Urambazaji mkuu">
      <ul className="psh-nav__list">
        {NAV_ITEMS.map(({ id, label, Icon, statusLabel, statusTone, statusDescription }) => {
          const isActive = active === id
          return (
            <li key={id} className="psh-nav__item">
              <button
                type="button"
                className={`psh-nav__btn ${isActive ? 'is-active' : ''}`}
                aria-label={label}
                aria-description={statusDescription}
                aria-current={isActive ? 'page' : undefined}
                title={`${label}: ${statusDescription}`}
                onClick={() => onChange(id)}
              >
                <span className="psh-nav__icon">
                  <Icon size={23} strokeWidth={isActive ? 1.9 : 1.7} />
                </span>
                <span className="psh-nav__meta">
                  <span className="psh-nav__label">{label}</span>
                  <span
                    className={`psh-nav__state${statusTone ? ` psh-nav__state--${statusTone}` : ''}`}
                    aria-hidden="true"
                  >
                    {statusLabel}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
