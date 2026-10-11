// ══════════════════════════════════════════════════════════════
// PASIHAI — Creator Studio: muundo mkuu (pure, bila imports)
//
// Chanzo kimoja cha ukweli kwa: sehemu za Studio, hali za kila sehemu,
// na mpango/entitlements. Hakuna bei, hakuna malipo, na hakuna
// "inapatikana" kwa kitu ambacho backend yake haipo.
// ══════════════════════════════════════════════════════════════

/** Hali zinazotumika kila mahali kwenye Studio. Maneno haya ndiyo pekee yanayoonyeshwa. */
export const STATUS = {
  available: { label: 'Inapatikana', tone: 'ok' },
  partial: { label: 'Sehemu tu', tone: 'warn' },
  planned: { label: 'Inakuja', tone: 'muted' },
  locked: { label: 'Inahitaji mpango', tone: 'premium' },
  requires_eligibility: { label: 'Inahitaji ustahiki', tone: 'muted' },
  not_connected: { label: 'Haijaunganishwa', tone: 'muted' },
}

/**
 * Sehemu za Studio. `group` huamua sidebar. `status` ni hali halisi ya utekelezaji.
 * Usibadilishe status kuwa "available" bila logic + ushahidi.
 */
export const SECTIONS = [
  { id: 'home', label: 'Studio Home', group: null, status: 'available' },

  { id: 'create', label: 'Create', group: 'Unda', status: 'available' },
  { id: 'content', label: 'My Content', group: 'Unda', status: 'partial' },
  { id: 'media', label: 'Media Library', group: 'Unda', status: 'partial' },

  { id: 'projects', label: 'Projects', group: 'Kazi', status: 'planned' },
  { id: 'templates', label: 'Templates', group: 'Kazi', status: 'partial' },
  { id: 'brand', label: 'Brand Kit', group: 'Kazi', status: 'planned' },

  { id: 'ads', label: 'Advertisements', group: 'Ukuaji', status: 'planned' },
  { id: 'analytics', label: 'Analytics', group: 'Ukuaji', status: 'partial' },
  { id: 'audience', label: 'Audience', group: 'Ukuaji', status: 'planned' },

  { id: 'monetization', label: 'Monetization', group: 'Biashara', status: 'requires_eligibility' },
  { id: 'collab', label: 'Collaboration', group: 'Biashara', status: 'planned' },
  { id: 'premium', label: 'Premium Tools', group: 'Biashara', status: 'partial' },

  { id: 'settings', label: 'Settings', group: 'Mipangilio', status: 'available' },
]

export const SECTION_GROUPS = ['Unda', 'Kazi', 'Ukuaji', 'Biashara', 'Mipangilio']

export const sectionById = (id) => SECTIONS.find((s) => s.id === id) ?? null

/**
 * Mpango wa mtumiaji. Malipo hayajaunganishwa: kila mtumiaji ni 'free' kwa sasa.
 * Ukiunganishwa billing baadaye, badilisha HAPA tu — UI haipaswi kuwa na sheria za plan.
 */
export const PLANS = {
  free: { id: 'free', label: 'Bure', includes: ['free'], status: 'available' },
  creator: { id: 'creator', label: 'Creator', includes: ['free', 'premium'], status: 'not_connected' },
}

export function getCurrentPlan() {
  return 'free'
}

/**
 * Vipengele na ngazi zake. tier: free | premium | creator.
 * status: hali ya utekelezaji (STATUS). Kipengele kisicho available/partial hakiwezi kufunguliwa.
 */
export const FEATURES = {
  publish_posts: { label: 'Kuchapisha machapisho', tier: 'free', status: 'available' },
  local_drafts: { label: 'Rasimu za kifaa', tier: 'free', status: 'partial', note: 'Zinakaa kwenye kifaa hiki tu.' },
  templates_basic: { label: 'Templates za msingi', tier: 'free', status: 'available' },
  templates_premium: { label: 'Templates za premium', tier: 'premium', status: 'planned' },
  media_library: { label: 'Maktaba ya media', tier: 'free', status: 'partial', note: 'Inaonyesha media ya machapisho yako.' },
  brand_kit: { label: 'Brand Kit', tier: 'premium', status: 'planned' },
  advanced_analytics: { label: 'Uchambuzi wa kina', tier: 'premium', status: 'planned' },
  scheduled_publishing: { label: 'Kupanga machapisho', tier: 'premium', status: 'planned', note: 'Backend ya kupanga haijaunganishwa.' },
  collaboration: { label: 'Ushirikiano wa timu', tier: 'premium', status: 'planned' },
  ai_assist: { label: 'Msaada wa AI', tier: 'premium', status: 'not_connected', note: 'Huduma ya AI haijaunganishwa.' },
  advertisements: { label: 'Matangazo', tier: 'premium', status: 'planned' },
  monetization: { label: 'Mapato ya ubunifu', tier: 'creator', status: 'requires_eligibility' },
}

/**
 * Je, mtumiaji anaweza kutumia kipengele sasa?
 * Inarudisha { allowed, statusLabel, reason } — reason inaonyeshwa kwa mtumiaji.
 */
export function featureAccess(featureId, plan = getCurrentPlan()) {
  const f = FEATURES[featureId]
  if (!f) return { allowed: false, statusLabel: 'Haipo', reason: 'Kipengele hakijulikani.' }
  const statusLabel = STATUS[f.status]?.label ?? f.status
  if (!['available', 'partial'].includes(f.status)) {
    return { allowed: false, statusLabel, reason: `${statusLabel}.` }
  }
  const includes = PLANS[plan]?.includes ?? PLANS.free.includes
  if (!includes.includes(f.tier)) {
    return { allowed: false, statusLabel: STATUS.locked.label, reason: 'Inahitaji mpango wa Premium — malipo bado hayajaunganishwa.' }
  }
  return { allowed: true, statusLabel, reason: f.note ?? '' }
}

/** Maudhui ya kuunda (Create gallery). `action` ni njia ya kuanza, si kitendo bandia. */
export const CREATE_CATALOG = [
  { id: 'text', label: 'Chapisho la maandishi', category: 'Machapisho', action: 'studio', type: 'text', status: 'available', hint: 'Maandishi, tags na mentions.' },
  { id: 'article', label: 'Makala', category: 'Machapisho', action: 'studio', type: 'article', status: 'available', hint: 'Kichwa, body na hitimisho.' },
  { id: 'announcement', label: 'Tangazo', category: 'Machapisho', action: 'studio', type: 'announcement', status: 'available', hint: 'Kichwa na maelezo muhimu.' },
  { id: 'quote', label: 'Nukuu', category: 'Machapisho', action: 'studio', type: 'quote', status: 'available', hint: 'Nukuu yenye chanzo na background.' },
  { id: 'poll', label: 'Kura', category: 'Machapisho', action: 'studio', type: 'poll', status: 'available', hint: 'Swali na chaguo 2–4.' },
  { id: 'poster', label: 'Picha / Poster', category: 'Media', action: 'studio', type: 'poster', status: 'available', hint: 'Picha moja na maandishi.' },
  { id: 'video', label: 'Video', category: 'Media', action: 'studio', type: 'video', status: 'available', hint: 'Video moja na maelezo.' },
  { id: 'reel', label: 'Reel (video fupi wima)', category: 'Media', action: 'studio', type: 'reel', status: 'available', hint: 'Video fupi ya wima.' },
  { id: 'story', label: 'Status / Story', category: 'Hadithi', action: 'status', status: 'available', hint: 'Maandishi au picha ya saa 24.' },
  { id: 'live', label: 'Live', category: 'Hadithi', action: 'live', status: 'partial', hint: 'Kikao cha Live. Streaming haijaunganishwa.' },
  { id: 'carousel', label: 'Carousel (picha nyingi)', category: 'Muundo wa juu', action: 'planned', status: 'planned', hint: 'Picha nyingi mfululizo — inahitaji multi-media post.' },
  { id: 'slideshow', label: 'Slideshow', category: 'Muundo wa juu', action: 'planned', status: 'planned', hint: 'Inahitaji mhariri wa slaidi.' },
  { id: 'collage', label: 'Photo collage', category: 'Muundo wa juu', action: 'planned', status: 'planned', hint: 'Inahitaji mhariri wa canvas.' },
  { id: 'thumbnail', label: 'Thumbnail', category: 'Muundo wa juu', action: 'planned', status: 'planned', hint: 'Inahitaji mhariri wa canvas.' },
  { id: 'banner', label: 'Banner ya matangazo', category: 'Matangazo', action: 'planned', status: 'planned', hint: 'Inategemea mfumo wa matangazo — bado haujaunganishwa.' },
  { id: 'ad', label: 'Tangazo lililolipiwa', category: 'Matangazo', action: 'planned', status: 'planned', hint: 'Matangazo ya kulipia hayajaunganishwa.' },
]

/** Kiunganishi cha sehemu zinazofungua workflow halisi. */
export function catalogItemsByCategory(query = '') {
  const q = String(query).trim().toLowerCase()
  const items = q
    ? CREATE_CATALOG.filter((c) => `${c.label} ${c.category} ${c.hint}`.toLowerCase().includes(q))
    : CREATE_CATALOG
  return items.reduce((acc, item) => {
    ;(acc[item.category] ||= []).push(item)
    return acc
  }, {})
}

/** Tafuta sehemu za Studio kwa neno (kwa upau wa kutafuta). */
export function searchSections(query = '') {
  const q = String(query).trim().toLowerCase()
  if (!q) return []
  return SECTIONS.filter((s) => `${s.label} ${s.group ?? ''}`.toLowerCase().includes(q))
}

/**
 * MASTER spec §1: urambazaji wa Studio, sehemu 10 kwa mpangilio huu.
 * Kila kipengele kina `section` (ukurasa halisi wa Studio) na, kwa vipengele vya Create,
 * `intent` (aina ya mode ya mhariri). `status: 'planned'` hufichwa kama "Mpango" na
 * havibofyeki. Sub-item isiyo na section halisi ni planned, si kiungo bandia.
 * `group` ni kundi la kimantiki la sidebar (lebo za vikundi ziko STUDIO_NAV_GROUPS).
 */
export const STUDIO_NAV_GROUPS = [
  { id: 'studio', label: 'Studio', items: ['home'] },
  { id: 'create', label: 'Unda', items: ['create', 'content', 'media'] },
  { id: 'manage', label: 'Simamia', items: ['projects', 'templates', 'ads'] },
  { id: 'grow', label: 'Ukuaji', items: ['analytics'] },
  { id: 'business', label: 'Biashara', items: ['business'] },
  { id: 'account', label: 'Akaunti', items: ['settings'] },
]

export const STUDIO_NAV = [
  {
    id: 'home', label: 'Studio Home', icon: 'layoutDashboard', section: 'home', children: [
      { id: 'home.overview', label: 'Muhtasari', section: 'home' },
      { id: 'home.projects', label: 'Miradi ya hivi karibuni', section: 'projects' },
      { id: 'home.media', label: 'Media ya hivi karibuni', section: 'media' },
      { id: 'home.drafts', label: 'Rasimu', section: 'content' },
      { id: 'home.scheduled', label: 'Maudhui yaliyopangwa', status: 'planned' },
      { id: 'home.usage', label: 'Matumizi na hifadhi', section: 'settings' },
    ],
  },
  {
    id: 'create', label: 'Create', icon: 'plusSquare', section: 'create', children: [
      { id: 'create.new', label: 'New Design', section: 'create', intent: 'custom' },
      { id: 'create.photo', label: 'Photo Editor', section: 'create', intent: 'image' },
      { id: 'create.graphic', label: 'Graphic Design', section: 'create', intent: 'blank' },
      { id: 'create.video', label: 'Video Editor', section: 'create', intent: 'videopost', status: 'planned' },
      { id: 'create.story', label: 'Story / Status', section: 'create', intent: 'story' },
      { id: 'create.poster', label: 'Poster / Flyer', section: 'create', intent: 'poster' },
      { id: 'create.ad', label: 'Advertisement', section: 'create', intent: 'ad' },
      { id: 'create.thumbnail', label: 'Thumbnail', section: 'create', intent: 'thumbnail' },
      { id: 'create.carousel', label: 'Carousel', section: 'create', intent: 'carousel' },
      { id: 'create.slideshow', label: 'Slideshow', section: 'create', intent: 'slideshow' },
      { id: 'create.templates', label: 'Templates', section: 'templates' },
      { id: 'create.recent', label: 'Fungua mradi wa hivi karibuni', section: 'projects' },
    ],
  },
  {
    id: 'content', label: 'My Content', icon: 'files', section: 'content', children: [
      { id: 'content.all', label: 'Maudhui yote', section: 'content' },
      { id: 'content.scheduled', label: 'Yaliyopangwa', status: 'planned' },
      { id: 'content.archived', label: 'Yaliyohifadhiwa', status: 'planned' },
    ],
  },
  {
    id: 'media', label: 'Media Library', icon: 'images', section: 'media', children: [
      { id: 'media.all', label: 'Media yote', section: 'media' },
      { id: 'media.audio', label: 'Sauti', status: 'planned' },
      { id: 'media.fonts', label: 'Fonti', status: 'planned' },
      { id: 'media.stickers', label: 'Stika na aikoni', status: 'planned' },
      { id: 'media.brand', label: 'Mali ya chapa', section: 'brand' },
    ],
  },
  {
    id: 'projects', label: 'Projects', icon: 'folderKanban', section: 'projects', children: [
      { id: 'projects.all', label: 'Miradi yote', section: 'projects' },
      { id: 'projects.favorites', label: 'Vipendwa', status: 'planned' },
      { id: 'projects.folders', label: 'Folda za miradi', status: 'planned' },
    ],
  },
  {
    id: 'templates', label: 'Templates', icon: 'layoutTemplate', section: 'templates', children: [
      { id: 'tpl.social', label: 'Machapisho ya kijamii', section: 'create', intent: 'social' },
      { id: 'tpl.story', label: 'Stories', section: 'create', intent: 'story' },
      { id: 'tpl.poster', label: 'Posters na flyers', section: 'create', intent: 'poster' },
      { id: 'tpl.ad', label: 'Matangazo', section: 'create', intent: 'ad' },
      { id: 'tpl.thumbnail', label: 'Thumbnails', section: 'create', intent: 'thumbnail' },
      { id: 'tpl.video', label: 'Video templates', status: 'planned' },
    ],
  },
  {
    id: 'ads', label: 'Advertisements', icon: 'megaphone', section: 'ads', children: [
      { id: 'ads.manager', label: 'Msimamizi wa matangazo', section: 'ads' },
      { id: 'ads.create', label: 'Unda tangazo', section: 'create', intent: 'ad' },
      { id: 'ads.video', label: 'Matangazo ya video', status: 'planned' },
      { id: 'ads.performance', label: 'Utendaji', section: 'analytics' },
    ],
  },
  {
    id: 'analytics', label: 'Analytics', icon: 'chartCombined', section: 'analytics', children: [
      { id: 'analytics.content', label: 'Utendaji wa maudhui', section: 'analytics' },
      { id: 'analytics.audience', label: 'Hadhira', section: 'audience' },
      { id: 'analytics.campaigns', label: 'Kampeni', status: 'planned' },
      { id: 'analytics.reports', label: 'Ripoti', status: 'planned' },
    ],
  },
  {
    id: 'business', label: 'Creator Business', icon: 'briefcase', section: 'brand', children: [
      { id: 'biz.profile', label: 'Wasifu wa muundaji', section: 'settings' },
      { id: 'biz.brand', label: 'Brand Kit', section: 'brand' },
      { id: 'biz.collab', label: 'Ushirikiano', section: 'collab' },
      { id: 'biz.monetization', label: 'Mapato', section: 'monetization' },
      { id: 'biz.premium', label: 'Zana za premium', section: 'premium' },
    ],
  },
  {
    id: 'settings', label: 'Settings', icon: 'settings2', section: 'settings', children: [
      { id: 'set.account', label: 'Akaunti na wasifu', section: 'settings' },
      { id: 'set.notifications', label: 'Arifa', action: 'notifications' },
      { id: 'set.plan', label: 'Mpango na matumizi', section: 'premium' },
      { id: 'set.privacy', label: 'Faragha', status: 'planned' },
      { id: 'set.accessibility', label: 'Ufikivu', status: 'planned' },
      { id: 'set.help', label: 'Msaada', status: 'planned' },
    ],
  },
]

/** Vipengele vyote vinavyoweza kutafutwa: sehemu kuu na sub-items (zenye section au intent). */
export function studioNavEntries() {
  const out = []
  for (const top of STUDIO_NAV) {
    out.push({ id: top.id, label: top.label, parent: null, section: top.section, status: top.status ?? null, icon: top.icon })
    for (const c of top.children) out.push({ ...c, parent: top.label, icon: top.icon })
  }
  return out
}

/** Tafuta urambazaji wote (sehemu + sub-items). Vipengele vilivyopangwa havirudishwi kama vinavyoweza kufunguliwa. */
export function searchNav(query = '') {
  const q = String(query).trim().toLowerCase()
  if (!q) return []
  return studioNavEntries().filter((e) => `${e.label} ${e.parent ?? ''}`.toLowerCase().includes(q))
}
