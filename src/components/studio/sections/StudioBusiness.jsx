// Creator Studio — Advertisements, Monetization, Collaboration, Brand Kit, Projects, Premium Tools
// Hakuna bei, hakuna mapato bandia, hakuna malipo. Kila kitu kina hali yake halisi.
import { FEATURES, PLANS, featureAccess, getCurrentPlan, STATUS } from '../../../studio/studioModel.js'
import { Panel, PlannedSection, StatusChip } from './StudioShared.jsx'

export function StudioAds() {
  return (
    <PlannedSection
      title="Advertisements"
      status="planned"
      summary="Mfumo wa matangazo haupo kwenye msimbo wa sasa: hakuna kampeni, bajeti, wala ukaguzi wa matangazo. Hakuna tangazo linaloweza kuundwa wala kuchapishwa kutoka hapa."
      needs={['Muundo wa matangazo na ukaguzi wake (backend)', 'Njia ya malipo iliyounganishwa', 'Sera ya matangazo kwa watumiaji']}
    />
  )
}

export function StudioProjects({ onNavigate }) {
  return (
    <PlannedSection
      title="Projects"
      status="planned"
      summary="Miradi ya maudhui (mfululizo wa machapisho) bado haijaunganishwa kwenye database."
      needs={['Jedwali la miradi lenye RLS', 'Uhusiano wa miradi na machapisho']}
      alternatives={[{ label: 'Tazama rasimu zangu', onClick: () => onNavigate('content') }]}
    />
  )
}

export function StudioBrand() {
  return (
    <PlannedSection
      title="Brand Kit"
      status="planned"
      summary="Rangi, fonti na nembo za chapa hazijahifadhiwa kwenye backend bado. Hakuna seti ya chapa inayoonyeshwa."
      needs={['Jedwali la brand kit lenye RLS', 'Upakiaji wa nembo kwenye storage ya faragha']}
    />
  )
}

export function StudioCollab() {
  return (
    <PlannedSection
      title="Collaboration"
      status="planned"
      summary="Ushirikiano wa timu bado haujajengwa. Hakuna wanachama wa timu wala ruhusa za pamoja."
      needs={['Modeli ya wanachama na ruhusa', 'Mialiko na kukubali']}
    />
  )
}

export function StudioMonetization() {
  const rows = [
    { label: 'Mapato ya ubunifu', status: 'requires_eligibility', note: 'Inahitaji ustahiki wa akaunti. Hakuna kigezo cha ustahiki kilichowekwa bado.' },
    { label: 'Malipo na payouts', status: 'not_connected', note: 'Njia ya malipo haijaunganishwa. Hakuna pesa inayoonyeshwa.' },
    { label: 'Mpango wa Creator', status: 'not_connected', note: 'Mpango wa kulipia haujaunganishwa.' },
    { label: 'Ushirikiano wa chapa (brand deals)', status: 'planned', note: 'Inakuja.' },
  ]
  return (
    <div className="psh-cs__stack">
      <header className="psh-cs__pageHead">
        <div>
          <h1 className="psh-cs__h1">Monetization</h1>
          <p className="psh-cs__muted">Hali ya mapato na malipo kwa akaunti yako.</p>
        </div>
      </header>
      <Panel title="Mapato yako">
        <p className="psh-cs__body"><strong>Haipimwi.</strong> Hakuna mapato yanayoonyeshwa kwa sababu malipo hayajaunganishwa.</p>
      </Panel>
      <Panel title="Hali ya huduma">
        <ul className="psh-cs__rows">
          {rows.map((r) => (
            <li key={r.label} className="psh-cs__row2">
              <div className="psh-cs__rowMain">
                <strong>{r.label}</strong>
                <span className="psh-cs__muted">{r.note}</span>
              </div>
              <StatusChip status={r.status} />
            </li>
          ))}
        </ul>
      </Panel>
      <p className="psh-cs__muted">Mpango wako: {PLANS[getCurrentPlan()].label}. Kubadilisha mpango kunahitaji malipo, ambayo bado hayajaunganishwa.</p>
    </div>
  )
}

/** Hali ya chip: ikiwa kipengele kipo tayari lakini mpango hauruhusu, ni "Inahitaji mpango". */
function chipStatus(feature, access) {
  if (access.allowed) return feature.status
  if (['available', 'partial'].includes(feature.status)) return 'locked'
  return feature.status
}

export function StudioPremium({ onNavigate }) {
  const plan = getCurrentPlan()
  const tiers = ['free', 'premium', 'creator']
  const tierLabel = { free: 'Bure', premium: 'Premium', creator: 'Creator' }
  return (
    <div className="psh-cs__stack">
      <header className="psh-cs__pageHead">
        <div>
          <h1 className="psh-cs__h1">Premium Tools</h1>
          <p className="psh-cs__muted">Vipengele vinavyopatikana kwa mpango wako wa sasa: <strong>{PLANS[plan].label}</strong>.</p>
        </div>
        <button type="button" className="psh-btn psh-btn--soft psh-btn--sm" disabled title="Malipo hayajaunganishwa">Boresha mpango</button>
      </header>
      <p className="psh-cs__muted">Malipo ya kuboresha mpango hayajaunganishwa. Hakuna bei inayoonyeshwa hapa.</p>

      {tiers.map((tier) => {
        const items = Object.entries(FEATURES).filter(([, f]) => f.tier === tier)
        if (!items.length) return null
        return (
          <Panel key={tier} title={tierLabel[tier]}>
            <ul className="psh-cs__rows">
              {items.map(([id, f]) => {
                const access = featureAccess(id, plan)
                return (
                  <li key={id} className="psh-cs__row2">
                    <div className="psh-cs__rowMain">
                      <strong>{f.label}</strong>
                      <span className="psh-cs__muted">{access.reason || STATUS[f.status]?.label}</span>
                    </div>
                    <StatusChip status={chipStatus(f, access)} />
                  </li>
                )
              })}
            </ul>
          </Panel>
        )
      })}

      <button type="button" className="psh-btn psh-btn--quiet psh-btn--sm" onClick={() => onNavigate('templates')}>Angalia Templates</button>
    </div>
  )
}
