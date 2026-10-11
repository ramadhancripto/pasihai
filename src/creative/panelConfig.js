// ══════════════════════════════════════════════════════════════
// Sehemu ya chini ya mhariri kulingana na mode (MASTER §3 / §5).
//   picha, grafiki, posti, matangazo, posters, thumbnails: Tabaka + Kurasa
//   story: Tabaka + Scenes · carousel, slideshow: Tabaka + Slaidi · video: Tabaka + Ratiba ya video
// Tabo zisizo "ready" zinaonyeshwa imezimwa na lebo "Mpango". Hakuna tabo inayoonekana kufanya kazi bila kufanya kazi.
// ══════════════════════════════════════════════════════════════

const TAB = {
  layers: { id: 'layers', label: 'Tabaka', status: 'ready' },
  pages: {
    id: 'pages', label: 'Kurasa', status: 'planned',
    note: 'Kurasa nyingi bado hazijajengwa. Turubai ni moja kwa sasa.',
  },
  scenes: {
    id: 'scenes', label: 'Scenes', status: 'planned',
    note: 'Scenes za story bado hazijajengwa. Turubai ni moja kwa sasa.',
  },
  slides: {
    id: 'slides', label: 'Slaidi', status: 'planned',
    note: 'Slaidi nyingi bado hazijajengwa. Turubai ni moja kwa sasa.',
  },
  timeline: {
    id: 'timeline', label: 'Ratiba ya video', status: 'planned',
    note: 'Ratiba ya video bado haijajengwa.',
  },
}

/** Tabo za sehemu ya chini kwa mode fulani. */
export function bottomTabsFor(modeId) {
  if (modeId === 'story') return [TAB.layers, TAB.scenes]
  if (modeId === 'carousel' || modeId === 'slideshow') return [TAB.layers, TAB.slides]
  if (modeId === 'shortvideo' || modeId === 'videopost') return [TAB.layers, TAB.timeline]
  return [TAB.layers, TAB.pages]
}
