// Makundi ya "display tu" (F, K, L, M, N, O): hali yao inatoka kwenye rejista, bila vitendo.
// Hakuna zana hapa inayofanya kazi; kila kitu ni planned au kinahitaji huduma ambayo haijaunganishwa.
// Paneli inaonyesha hali hii wazi, bila vitufe vya kuigiza.
import { GROUPS, TOOLS, STATUS_LABEL } from './toolRegistry.js'
import { SERVICES } from './capabilities.js'

export const DISPLAY_ONLY_GROUPS = Object.freeze(['F', 'K', 'L', 'M', 'N', 'O'])

const HEADLINE = {
  F: 'Maktaba ya stickers, icons na elementi bado haijaunganishwa. Hakuna kinachoongezwa kutoka hapa.',
  K: 'Mradi huu una ukurasa mmoja. Kurasa nyingi, slaidi na scenes bado hazijajengwa.',
  L: 'Uhariri wa video haujaunganishwa. Hakuna ratiba wala klipu, na hakuna video inayotengenezwa.',
  M: 'Uhuishaji na mwendo bado haujajengwa. Hakuna presets wala keyframes.',
  O: 'Zana za AI zinahitaji huduma ya AI iliyounganishwa au mpango wa Premium. Hadi ziunganishwe, hazifanyi kazi na hakuna kinachotengenezwa.',
  N: 'Sauti na manukuu bado havijaunganishwa. Manukuu ya kiotomatiki na sauti ya maelezo zinahitaji huduma za nje.',
}

// Rudisha muhtasari wa kundi, au null kama kundi si la display tu.
export function plannedGroupSummary(groupId) {
  if (!DISPLAY_ONLY_GROUPS.includes(groupId)) return null
  const group = GROUPS.find((g) => g.id === groupId)
  if (!group) return null
  const tools = TOOLS.filter((t) => t.group === groupId)
  const counts = { planned: 0, service: 0 }
  const items = tools.map((t) => {
    counts[t.status] = (counts[t.status] ?? 0) + 1
    return {
      id: t.id,
      label: t.label,
      status: t.status,
      statusLabel: STATUS_LABEL[t.status] ?? t.status,
      note: t.note ?? null,
      service: t.service ?? null,
    }
  })
  const services = [...new Set(items.map((i) => i.service).filter(Boolean))]
  return {
    id: groupId,
    title: group.title,
    headline: HEADLINE[groupId],
    items,
    counts,
    services: services.map((name) => ({ name, connected: Boolean(SERVICES[name]) })),
  }
}
