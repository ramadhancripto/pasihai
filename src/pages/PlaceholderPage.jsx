// ══════════════════════════════════════════════════════════════
// PASIHAI — KURASA ZA PLACEHOLDER (Hatua 1)
// Gundua · Spaces · Business  (Chat ni ukurasa halisi)
// Hizi zinaonyesha MIPAKA ya navigation, si UI ya mwisho.
// Kila moja ina kazi moja wazi — mipaka haivunjwi.
// ══════════════════════════════════════════════════════════════

import { productInfoService } from '../services/productInfoService.js'
import useAsyncData from '../hooks/useAsyncData.js'
import { Chip } from '../components/ui.jsx'
import {
  IconChat,
  IconGundua,
  IconSpaces,
  IconBusiness,
  IconCheck,
  IconInfo,
  IconHub,
  IconGlobe,
  IconShield,
  IconMegaphone,
  IconStorefront,
  IconPeople,
  IconFile,
  IconGauge,
} from '../components/icons.jsx'

/* Business: kipengele kimoja, icon moja na tone moja (kijani/bluu/dhahabu).
   Majina pekee — hakuna maelezo ya ziada. */
const BUSINESS_ITEM_ICON = {
  'Bidhaa na huduma': { Icon: IconStorefront, tone: 'green' },
  Wateja: { Icon: IconPeople, tone: 'blue' },
  'Oda na maombi': { Icon: IconFile, tone: 'gold' },
  Matangazo: { Icon: IconMegaphone, tone: 'blue' },
  'Ufuatiliaji wa kazi': { Icon: IconGauge, tone: 'green' },
  'Channel ya biashara': { Icon: IconBusiness, tone: 'gold' },
}

const PAGE_ICON = {
  gundua: IconGundua,
  spaces: IconSpaces,
  business: IconBusiness,
}

/* Iconi moja kwa kila dhana ya Spaces — zile zile zinazotumika kila mahali
   (Hubs · Jumuiya · Vikundi · Faragha · Channels). Msimbo mmoja, hakuna
   lugha ya pili ya iconi. */
const ITEM_ICON = {
  hub: IconHub,
  globe: IconGlobe,
  spaces: IconSpaces,
  shield: IconShield,
  megaphone: IconMegaphone,
}

const BOUNDARIES = [
  { key: 'home', name: 'Home', role: 'Kutazama (consume)' },
  { key: 'gundua', name: 'Gundua', role: 'Kugundua (discover)' },
  { key: 'spaces', name: 'Spaces', role: 'Kushiriki (participate)' },
  { key: 'business', name: 'Business', role: 'Kuendesha (operate)' },
]

export default function PlaceholderPage({ pageKey }) {
  // Taarifa ya eneo inatoka kwa product info service.
  const page = useAsyncData(() => productInfoService.getPage(pageKey), [pageKey])
  const Icon = PAGE_ICON[pageKey]
  if (!page) return null

  return (
    <div className="psh-col psh-col--page">
      <header className={`psh-pagehead psh-pagehead--${pageKey}`}>
        <span className="psh-pagehead__icon">
          <Icon size={24} />
        </span>
        <div>
          <h1 className="psh-pagehead__title">{page.title}</h1>
        </div>
      </header>

      <section className="psh-pagesection">
        <ul className="psh-pageitems">
          {page.items.map((it) => {
            const label = typeof it === 'string' ? it : it.label
            const biz = typeof it === 'string' ? BUSINESS_ITEM_ICON[it] : null
            const ItemIcon = typeof it === 'string' ? biz?.Icon : ITEM_ICON[it.icon]
            const tone = biz ? biz.tone : it.icon
            return (
              <li key={label}>
                {ItemIcon ? (
                  <span className={`psh-pageitems__icon psh-pageitems__icon--${tone}`} aria-hidden="true">
                    <ItemIcon size={15} />
                  </span>
                ) : (
                  <span className="psh-pageitems__tick" aria-hidden="true">
                    <IconCheck size={14} strokeWidth={2.4} />
                  </span>
                )}
                {label}
              </li>
            )
          })}
        </ul>
      </section>

      {page.types ? (
        <section className="psh-pagesection">
          
          <ul className="psh-typecards">
            {page.types.map((t) => {
              const TypeIcon = ITEM_ICON[t.icon] ?? IconSpaces
              return (
                <li key={t.name}>
                  <div className="psh-typecards__head">
                    <span
                      className={`psh-typecards__icon psh-typecards__icon--${t.icon}`}
                      aria-hidden="true"
                    >
                      <TypeIcon size={15} />
                    </span>
                    <h3>{t.name}</h3>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
