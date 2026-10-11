// ══════════════════════════════════════════════════════════════
// Safu ya uwezo (capabilities / entitlements) — mahali pekee panapoamua zana ipi inaweza kutumika.
//   • Hakuna vikwazo vya usajili ndani ya vipengele vya UI: vyote vinauliza `toolState()`.
//   • SERVICES: huduma za nje zilizounganishwa. Zikiwa `false`, zana inayozitegemea inaonyeshwa "Huduma".
//   • PLAN / ENTITLEMENTS: mpango wa mtumiaji. Hakuna malipo wala billing hapa — ni muundo wa kuongeza baadaye.
// ══════════════════════════════════════════════════════════════
import { STATUS_LABEL } from './toolRegistry.js'

/** Huduma za nje. Weka `true` tu pale integration halisi imethibitishwa. */
export const SERVICES = Object.freeze({
  ai: false,
  backgroundRemoval: false,
  transcription: false,
  voice: false,
})

/** Mpango wa sasa. Hakuna mpango wa malipo bado: kila mtu ni `free`. */
export const DEFAULT_PLAN = 'free'

export const ENTITLEMENTS = Object.freeze({
  free: Object.freeze([]),
  premium: Object.freeze(['premium_assets', 'advanced_export', 'ai_credits']),
})

export function hasEntitlement(plan, key) {
  return (ENTITLEMENTS[plan] ?? []).includes(key)
}

const NEEDS = {
  selection: { test: (c) => c.selectionCount >= 1, reason: 'Chagua kipengele kwenye turubai kwanza.' },
  multi3: { test: (c) => c.selectionCount >= 3, reason: 'Chagua vipengele vitatu au zaidi.' },
  text: { test: (c) => c.selectionType === 'text', reason: 'Chagua maandishi kwanza.' },
  image: { test: (c) => c.selectionType === 'image', reason: 'Chagua picha kwanza.' },
  shape: { test: (c) => c.selectionType === 'shape', reason: 'Chagua umbo kwanza.' },
  visual: { test: (c) => ['text', 'image', 'shape'].includes(c.selectionType), reason: 'Chagua kipengele kwanza.' },
  clipboard: { test: (c) => c.hasClipboard, reason: 'Clipboard ni tupu. Nakili kipengele kwanza (Ctrl+C).' },
}

/**
 * Hali ya zana kwa muktadha wa sasa.
 * Inarudisha { enabled, badge, reason }. badge ni null kwa zana zinazofanya kazi kikamilifu.
 */
export function toolState(tool, ctx = {}) {
  const c = {
    selectionCount: 0,
    selectionType: null,
    hasClipboard: false,
    plan: DEFAULT_PLAN,
    services: SERVICES,
    ...ctx,
  }
  // Kwanza: hali ya zana yenyewe.
  if (tool.status === 'planned') return { enabled: false, badge: STATUS_LABEL.planned, reason: tool.note ?? 'Bado haijajengwa.' }
  if (tool.status === 'service') {
    const on = c.services[tool.service] === true
    return on
      ? { enabled: true, badge: null, reason: '' }
      : { enabled: false, badge: STATUS_LABEL.service, reason: tool.note ?? 'Huduma haijaunganishwa.' }
  }
  if (tool.status === 'premium') {
    const on = hasEntitlement(c.plan, tool.entitlement)
    return on
      ? { enabled: true, badge: null, reason: '' }
      : { enabled: false, badge: STATUS_LABEL.premium, reason: tool.note ?? 'Inapatikana kwenye mpango wa premium.' }
  }
  // Pili: mahitaji ya muktadha (uteuzi, aina ya kipengele, clipboard).
  if (tool.needs && NEEDS[tool.needs] && !NEEDS[tool.needs].test(c)) {
    return { enabled: false, badge: tool.status === 'partial' ? STATUS_LABEL.partial : null, reason: NEEDS[tool.needs].reason }
  }
  return {
    enabled: true,
    badge: tool.status === 'partial' ? STATUS_LABEL.partial : null,
    reason: '',
  }
}

/** Kwa ukaguzi wa majaribio: idadi ya zana kwa kila hali. */
export function countByStatus(tools) {
  return tools.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1
    return acc
  }, {})
}
