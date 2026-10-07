// ══════════════════════════════════════════════════════════════
// PASIHAI — BOTTOM NAVIGATION (Hatua 1)
// Destinations TANO pekee:
//   Home → Consume     · Soga → Communicate · Gundua → Discover
//   Spaces → Participate · Business → Operate
// Hakuna ya sita. Hakuna duplication na Home tabs.
// ══════════════════════════════════════════════════════════════

import {
  IconHome,
  IconSoga,
  IconGundua,
  IconSpaces,
  IconBusiness,
} from './icons.jsx'

export const NAV_ITEMS = [
  { id: 'home', label: 'Home', Icon: IconHome, purpose: 'Kutazama' },
  { id: 'soga', label: 'Soga', Icon: IconSoga, purpose: 'Mawasiliano' },
  { id: 'gundua', label: 'Gundua', Icon: IconGundua, purpose: 'Kugundua' },
  { id: 'spaces', label: 'Spaces', Icon: IconSpaces, purpose: 'Kushiriki' },
  { id: 'business', label: 'Business', Icon: IconBusiness, purpose: 'Kuendesha' },
]

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="psh-nav" aria-label="Urambazaji mkuu">
      <ul className="psh-nav__list">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = active === id
          return (
            <li key={id} className="psh-nav__item">
              <button
                type="button"
                className={`psh-nav__btn ${isActive ? 'is-active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onChange(id)}
              >
                <span className="psh-nav__icon">
                  <Icon size={23} strokeWidth={isActive ? 1.9 : 1.7} />
                </span>
                <span className="psh-nav__label">{label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
