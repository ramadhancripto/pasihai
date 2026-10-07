// ══════════════════════════════════════════════════════════════
// PASIHAI — HOME TABS + CONTENT FILTER (Hatua 2 — muundo)
// Tabs TANO pekee: Mchanganyiko | Reels | Friends | Channels | Live
// Kichujio cha aina ya maudhui ni cha PILI (compact dropdown),
// hakiongezi tabs kwenye skrini.
// ══════════════════════════════════════════════════════════════

import { homeService } from '../../services/homeService.js'
import useAsyncData from '../../hooks/useAsyncData.js'
import { Dropdown, Chip } from '../ui.jsx'
import { IconSliders, IconChevronDown, IconEye } from '../icons.jsx'
import { FilterMenu } from '../panels.jsx'

export default function HomeTabs({
  active,
  onChange,
  filter,
  onFilter,
  onOpenViewMode,
  modeLabel,
}) {
  // Tabs na filters zinatoka kwenye catalog (app vocabulary) kwa service.
  const nav = useAsyncData(() => homeService.getNavigation(), [])

  if (!nav) return null

  const { tabs, filters } = nav
  const activeFilter = filters.find((f) => f.id === filter) || filters[0]

  return (
    <div className="psh-htabs">
      <div className="psh-htabs__scroll" role="tablist" aria-label="Sehemu za Home">
        {tabs.map((t) => {
          const isActive = active === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`psh-htab ${isActive ? 'is-active' : ''}`}
              onClick={() => onChange(t.id)}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      <div className="psh-htabs__tools">
        <Dropdown
          label="Kichujio cha maudhui"
          width={230}
          trigger={({ toggle }) => (
            <button
              type="button"
              className={`psh-filterbtn psh-filterbtn--icon ${filter !== 'all' ? 'is-set' : ''}`}
              onClick={toggle}
              aria-label={`Kichujio cha maudhui: ${activeFilter.label}`}
            >
              <IconSliders size={17} />
            </button>
          )}
        >
          {({ close }) => (
            <>
              <p className="psh-dd__head">Aina ya maudhui</p>
              <FilterMenu
                filters={filters}
                value={filter}
                onChange={(id) => {
                  onFilter(id)
                  close()
                }}
              />
            </>
          )}
        </Dropdown>

        {onOpenViewMode ? (
          <button
            type="button"
            className="psh-filterbtn psh-filterbtn--icon"
            onClick={onOpenViewMode}
            aria-label={`Badilisha muonekano wa mkondo (sasa: ${modeLabel ?? 'Automatic'})`}
          >
            <IconEye size={17} />
          </button>
        ) : null}
      </div>
    </div>
  )
}

/* Kumbukumbu ya maana ya kila tab — inaonekana kwa maelezo
   tunapohitaji, si kila wakati.
   HALI: haitumiki popote kwa sasa (dead export). Imehifadhiwa kwa
   maagizo ya "preserve existing"; `label` inatolewa kwa service
   (catalog), component haihifadhi vocabulary mwenyewe. */
export const TAB_MEANING = {
  mchanganyiko: 'Mchanganyiko wa marafiki, channels, Spaces, biashara na maudhui muhimu kwako.',
  reels: 'Video fupi — mtazamo wa moja kwa moja, mmoja kwa wakati.',
  friends: 'Machapisho ya marafiki pekee. Marafiki ni wa kwanza.',
  channels: 'Machapisho kutoka Channels — one-to-many. SI mazungumzo.',
  live: 'Vikao vya papo hapo: video, sauti na Live Activity.',
}

export function TabMeaning({ tab, label }) {
  return (
    <p className="psh-tabmeaning">
      <Chip tone="soft">{label}</Chip>
      <span>{TAB_MEANING[tab]}</span>
    </p>
  )
}
