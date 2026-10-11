// ══════════════════════════════════════════════════════════════
// Gallery ya aina za kuanza kwenye Create (MASTER §2).
//   mode    → inafungua mhariri wa pamoja kwa mode hiyo (MODES katika creativeModel.js)
//   anchor  → inasogeza ukurasa hadi sehemu iliyopo ya hub (hakuna mhariri mpya)
//   planned → inaonyeshwa imezimwa na lebo "Mpango"
// Hakuna aina yenye fomu yake; zote hutumia mhariri mmoja.
// ══════════════════════════════════════════════════════════════

export const CREATION_GALLERY = [
  { id: 'new', label: 'New Design', hint: 'Ukubwa wako mwenyewe', mode: 'custom', icon: 'plusSquare' },
  { id: 'photo', label: 'Photo Editor', hint: 'Picha moja na maandishi na marekebisho', mode: 'image', icon: 'image' },
  { id: 'graphic', label: 'Graphic Design', hint: 'Turubai tupu kwa muundo wowote', mode: 'blank', icon: 'shapes' },
  { id: 'video', label: 'Video Editor', hint: 'Timeline ya video', planned: true, icon: 'film' },
  { id: 'story', label: 'Story / Status', hint: 'Wima 1080 × 1920', mode: 'story', icon: 'images' },
  { id: 'poster', label: 'Poster / Flyer', hint: 'Ukubwa wa A4', mode: 'poster', icon: 'files' },
  { id: 'ad', label: 'Advertisement', hint: 'Export ya PNG. Uchapishaji haujaunganishwa', mode: 'ad', icon: 'megaphone' },
  { id: 'thumbnail', label: 'Thumbnail', hint: 'Video au makala', mode: 'thumbnail', icon: 'clapperboard' },
  { id: 'carousel', label: 'Carousel', hint: 'Slaidi moja kwa sasa', mode: 'carousel', icon: 'layers3' },
  { id: 'slideshow', label: 'Slideshow', hint: 'Slaidi moja kwa sasa', mode: 'slideshow', icon: 'layers3' },
  { id: 'templates', label: 'Templates', hint: 'Anza kutoka template iliyopo', anchor: 'cv-templates', icon: 'layoutTemplate' },
  { id: 'recent', label: 'Open Recent Project', hint: 'Miradi yako kwenye kifaa hiki', anchor: 'cv-projects', icon: 'folderKanban' },
]

/** Chuja gallery kwa neno (lebo au maelezo). Neno tupu linarudisha yote. */
export function filterGallery(query = '') {
  const q = String(query).trim().toLowerCase()
  if (!q) return CREATION_GALLERY
  return CREATION_GALLERY.filter((g) => `${g.label} ${g.hint}`.toLowerCase().includes(q))
}
