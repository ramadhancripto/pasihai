// ══════════════════════════════════════════════════════════════
// Rejista ya zana za Create — chanzo kimoja cha ukweli kwa kila zana kwenye mhariri.
//
// Makundi 16 ya mhariri yako kwenye mpangilio wa "Creator Studio — Information Architecture"
// (§D). Kila zana ina kundi moja tu (hakuna nakala). Kitambulisho cha zana (id) na `action`
// hazijabadilika, kwa hiyo mhariri na majaribio yanaendelea kufanya kazi.
//
// Kila zana ina:
//   id       kitambulisho cha kipekee
//   group    kitambulisho cha kundi (angalia GROUPS)
//   icon     jina kwenye ICON_PATHS (components/creative/controls.jsx)
//   status   ready    → inafanya kazi kikamilifu
//            partial  → inafanya kazi kwa mipaka iliyoandikwa kwenye `note`
//            planned  → haijajengwa; inaonyeshwa imezimwa na lebo "Mpango"
//            service  → inahitaji huduma ya nje (AI, transcription…) isiyounganishwa
//            premium  → inategemea entitlement ya mpango (capabilities.js)
//   action   kitendo cha mhariri (lazima kiwe kwenye ACTION_IDS) — kwa ready/partial
//   where    kwa vidhibiti vilivyo ndani ya kidirisha cha Sifa: mahali pa kukipata
//   needs    selection | multi3 | clipboard | text | image | shape | visual | null
//   basic    true → inaonekana pia kwenye hali ya "Rahisi"
// ══════════════════════════════════════════════════════════════

export const GROUPS = [
  { id: 'A', title: 'Select & Arrange', icon: 'pointer', hint: 'Chagua, sogeza, panga, nakili' },
  { id: 'B', title: 'Text', icon: 'type', hint: 'Fonti, ukubwa, mitindo, athari' },
  { id: 'C', title: 'Images & Photos', icon: 'image', hint: 'Picha, media, marekebisho' },
  { id: 'D', title: 'Background', icon: 'paintBucket', hint: 'Rangi, gradient, picha ya mandhari' },
  { id: 'E', title: 'Shapes & Drawing', icon: 'shapes', hint: 'Maumbo, mistari, kuchora' },
  { id: 'F', title: 'Stickers & Elements', icon: 'sticker', hint: 'Stickers, icons, nembo' },
  { id: 'G', title: 'Colors & Styles', icon: 'palette', hint: 'Rangi, palette, mitindo' },
  { id: 'H', title: 'Effects & Filters', icon: 'sliders', hint: 'Filters, ukungu, vivuli' },
  { id: 'I', title: 'Templates & Layout', icon: 'layoutTemplate', hint: 'Templates, muundo, gridi' },
  { id: 'J', title: 'Layers', icon: 'layers3', hint: 'Mpangilio wa tabaka' },
  { id: 'K', title: 'Pages & Scenes', icon: 'files', hint: 'Kurasa, slaidi, scenes' },
  { id: 'L', title: 'Video Editor', icon: 'film', hint: 'Klipu, ratiba, video' },
  { id: 'M', title: 'Animation & Motion', icon: 'clapperboard', hint: 'Mwendo, mipito, uhuishaji' },
  { id: 'N', title: 'Audio & Captions', icon: 'audioLines', hint: 'Sauti, muziki, manukuu' },
  { id: 'O', title: 'AI Tools', icon: 'sparkles', hint: 'Zana zinazohitaji huduma ya AI' },
  { id: 'P', title: 'Export & Publish', icon: 'download', hint: 'Hifadhi, hakiki, hamisha, chapisha' },
]

export const STATUS_LABEL = {
  ready: 'Inatumika',
  partial: 'Sehemu',
  planned: 'Mpango',
  service: 'Huduma',
  premium: 'Premium',
}

const T = (t) => ({ status: 'ready', basic: false, ...t })
const PLANNED = (note) => ({ status: 'planned', note })

export const TOOLS = [
  // ── Select & Arrange ──────────────────────────────────────
  T({ id: 'sel.all', group: 'A', label: 'Chagua vyote', icon: 'check', action: 'sel.all', shortcut: 'Ctrl+A', basic: true, kw: 'chagua select all' }),
  T({ id: 'sel.clear', group: 'A', label: 'Ondoa uteuzi', icon: 'close', action: 'sel.clear', shortcut: 'Esc', basic: true, kw: 'ondoa deselect' }),
  T({ id: 'select.pick', group: 'A', label: 'Chagua kipengele (select)', icon: 'pointer', where: 'Turubai: bofya kipengele. Shift/Ctrl + bofya kuchagua vingi', basic: true, kw: 'select chagua' }),
  T({ id: 'obj.move', group: 'A', label: 'Sogeza (move)', icon: 'pointer', where: 'Turubai: buruta kipengele. Mishale kusogeza 1px (Shift: 10px)', needs: 'selection', kw: 'move sogeza buruta' }),
  T({ id: 'obj.resize', group: 'A', label: 'Badilisha ukubwa (resize)', icon: 'crop', where: 'Turubai: buruta mpini wa kona au pembe', needs: 'selection', kw: 'resize ukubwa' }),
  T({ id: 'obj.rotate', group: 'A', label: 'Zungusha (rotate)', icon: 'rotate', where: 'Turubai: shika mpini wa juu. Sifa › Nafasi na ukubwa › Zungusha', needs: 'selection', kw: 'rotate zungusha' }),
  T({ id: 'obj.copy', group: 'A', label: 'Nakili (copy)', icon: 'copy', action: 'obj.copy', shortcut: 'Ctrl+C', needs: 'selection', basic: true, kw: 'copy nakili clipboard' }),
  T({ id: 'obj.paste', group: 'A', label: 'Bandika (paste)', icon: 'download', action: 'obj.paste', shortcut: 'Ctrl+V', needs: 'clipboard', basic: true, kw: 'paste bandika' }),
  T({ id: 'obj.duplicate', group: 'A', label: 'Rudufu kipengele', icon: 'copy', action: 'obj.duplicate', shortcut: 'Ctrl+D', needs: 'selection', basic: true, kw: 'duplicate rudufu nakala' }),
  T({ id: 'obj.delete', group: 'A', label: 'Futa', icon: 'trash', action: 'obj.delete', shortcut: 'Delete', needs: 'selection', basic: true, kw: 'delete futa ondoa' }),
  T({ id: 'obj.lock', group: 'A', label: 'Funga / fungua', icon: 'lock', action: 'obj.lock', shortcut: 'Ctrl+L', needs: 'selection', basic: true, kw: 'lock unlock funga' }),
  T({ id: 'obj.hide', group: 'A', label: 'Ficha / onyesha', icon: 'eyeOff', action: 'obj.hide', shortcut: 'Ctrl+Shift+H', needs: 'selection', basic: true, kw: 'hide show ficha onyesha' }),
  T({ id: 'obj.flipX', group: 'A', label: 'Geuza mlalo', icon: 'swap', action: 'obj.flipX', needs: 'visual', kw: 'flip geuza mlalo horizontal' }),
  T({ id: 'obj.flipY', group: 'A', label: 'Geuza wima', icon: 'swap', action: 'obj.flipY', needs: 'visual', kw: 'flip geuza wima vertical' }),
  T({ id: 'obj.opacity', group: 'A', label: 'Uwazi wa kipengele', icon: 'drop', where: 'Sifa › Nafasi na ukubwa › Uwazi', needs: 'selection', kw: 'opacity uwazi transparency' }),
  T({ id: 'obj.position', group: 'A', label: 'Nafasi na ukubwa', icon: 'crop', where: 'Sifa › Nafasi na ukubwa (X, Y, upana, urefu)', needs: 'selection', kw: 'position size x y upana urefu' }),
  T({ id: 'align.centerX', group: 'A', label: 'Katikati (mlalo)', icon: 'alignCH', action: 'align.centerX', needs: 'selection', kw: 'align panga katikati' }),
  T({ id: 'align.centerY', group: 'A', label: 'Katikati (wima)', icon: 'alignCV', action: 'align.centerY', needs: 'selection', kw: 'align panga katikati wima' }),
  T({ id: 'distribute.x', group: 'A', label: 'Gawanya sawasawa (mlalo)', icon: 'alignCH', action: 'distribute.x', needs: 'multi3', kw: 'distribute gawanya' }),
  T({ id: 'obj.group', group: 'A', ...PLANNED('Vikundi vya vipengele bado havijaundwa kwenye modeli ya hati.'), label: 'Kundi (group / ungroup)', icon: 'layers', kw: 'group ungroup kundi' }),
  T({ id: 'view.snap', group: 'A', label: 'Snap kwenye miongozo', icon: 'alignCV', action: 'view.snap', basic: true, kw: 'snap guides miongozo' }),
  T({ id: 'view.guides', group: 'A', label: 'Miongozo (guides)', icon: 'alignCV', where: 'Turubai: miongozo inaonekana unapoburuta kipengele', kw: 'guides miongozo' }),
  T({ id: 'view.safe', group: 'A', ...PLANNED('Eneo salama (safe area) bado halijaongezwa kwenye turubai.'), label: 'Eneo salama (safe area)', icon: 'crop', kw: 'safe area eneo salama' }),
  T({ id: 'view.zoomIn', group: 'A', label: 'Kuza ndani', icon: 'plus', action: 'view.zoomIn', shortcut: 'Ctrl+=', basic: true, kw: 'zoom kuza' }),
  T({ id: 'view.zoomOut', group: 'A', label: 'Kuza nje', icon: 'minus', action: 'view.zoomOut', shortcut: 'Ctrl+-', basic: true, kw: 'zoom punguza' }),
  T({ id: 'view.fit', group: 'A', label: 'Sawazisha ukubwa', icon: 'preview', action: 'view.fit', shortcut: 'Ctrl+0', kw: 'fit zoom sawazisha' }),
  T({ id: 'view.pan', group: 'A', ...PLANNED('Kusogeza kwa mkono hakujajengwa. Turubai inasogezwa kwa scroll tu.'), label: 'Mkono wa kusogeza (pan)', icon: 'pointer', kw: 'pan mkono hand' }),
  T({ id: 'view.rulers', group: 'A', ...PLANNED('Rula bado hazijajengwa.'), label: 'Rula (rulers)', icon: 'crop', kw: 'ruler rula' }),
  T({ id: 'edit.undo', group: 'A', label: 'Rudisha (undo)', icon: 'undo', action: 'edit.undo', shortcut: 'Ctrl+Z', basic: true, kw: 'undo rudisha' }),
  T({ id: 'edit.redo', group: 'A', label: 'Rudia (redo)', icon: 'redo', action: 'edit.redo', shortcut: 'Ctrl+Y', basic: true, kw: 'redo rudia' }),

  // ── Text ──────────────────────────────────────────────────
  T({ id: 'text.add', group: 'B', label: 'Ongeza maandishi', icon: 'text', action: 'text.add', shortcut: 'T', basic: true, kw: 'text maandishi andika' }),
  T({ id: 'text.edit', group: 'B', label: 'Hariri maandishi', icon: 'text', action: 'text.edit', shortcut: 'Enter', needs: 'text', basic: true, kw: 'edit hariri double click' }),
  T({ id: 'text.presets', group: 'B', label: 'Mitindo ya haraka (kichwa, mwili)', icon: 'text', where: 'Sifa › Font na ukubwa › Mitindo ya haraka', needs: 'text', basic: true, kw: 'presets heading kichwa' }),
  T({ id: 'text.font', group: 'B', label: 'Font (tafuta na chagua)', icon: 'text', where: 'Sifa › Font na ukubwa › Font', needs: 'text', basic: true, kw: 'font fonti tafuta search' }),
  T({ id: 'text.size', group: 'B', label: 'Ukubwa wa maandishi', icon: 'text', where: 'Sifa › Font na ukubwa › Ukubwa', needs: 'text', basic: true, kw: 'size ukubwa' }),
  T({ id: 'text.bold', group: 'B', label: 'Nzito (bold)', icon: 'text', action: 'text.toggleBold', shortcut: 'Ctrl+B', needs: 'text', basic: true, kw: 'bold nzito' }),
  T({ id: 'text.italic', group: 'B', label: 'Italiki', icon: 'text', action: 'text.toggleItalic', shortcut: 'Ctrl+I', needs: 'text', basic: true, kw: 'italic italiki' }),
  T({ id: 'text.underline', group: 'B', label: 'Mstari chini (underline)', icon: 'text', action: 'text.toggleUnderline', needs: 'text', kw: 'underline mstari chini', basic: true }),
  T({ id: 'text.strike', group: 'B', label: 'Mstari wa katikati (strikethrough)', icon: 'text', action: 'text.toggleStrike', needs: 'text', kw: 'strike strikethrough kupitisha mstari' }),
  T({ id: 'text.listBullet', group: 'B', label: 'Orodha ya vitone', icon: 'text', action: 'text.listBullet', needs: 'text', kw: 'bullet vitone orodha list', basic: true }),
  T({ id: 'text.listNumber', group: 'B', label: 'Orodha yenye namba', icon: 'text', action: 'text.listNumber', needs: 'text', kw: 'number namba orodha numbered list', basic: true }),
  T({ id: 'text.align', group: 'B', label: 'Mpangilio (kushoto/katikati/kulia)', icon: 'alignL', where: 'Sifa › Font na ukubwa › Mpangilio', needs: 'text', kw: 'align mpangilio' }),
  T({ id: 'text.color', group: 'B', label: 'Rangi ya maandishi', icon: 'drop', where: 'Sifa › Rangi na mandhari › Rangi', needs: 'text', basic: true, kw: 'color rangi' }),
  T({ id: 'text.gradient', group: 'B', ...PLANNED('Maandishi ya gradient bado hayajajengwa.'), label: 'Maandishi ya gradient', icon: 'drop', kw: 'gradient' }),
  T({ id: 'text.spacing', group: 'B', label: 'Nafasi ya mistari na herufi', icon: 'text', where: 'Sifa › Font na ukubwa › Nafasi', needs: 'text', kw: 'spacing line letter nafasi' }),
  T({ id: 'text.box', group: 'B', label: 'Vipimo vya kisanduku cha maandishi', icon: 'crop', where: 'Sifa › Nafasi na ukubwa › Upana na urefu', needs: 'text', kw: 'box text dimensions kisanduku' }),
  T({ id: 'text.bg', group: 'B', label: 'Mandhari nyuma ya maandishi', icon: 'drop', where: 'Sifa › Maandishi › Mandhari', needs: 'text', kw: 'text background mandhari' }),
  T({ id: 'text.outline', group: 'B', label: 'Mpaka wa maandishi (outline)', icon: 'text', where: 'Sifa › Maandishi › Mpaka', needs: 'text', kw: 'outline stroke mpaka' }),
  T({ id: 'text.shadow', group: 'B', label: 'Kivuli cha maandishi', icon: 'text', where: 'Sifa › Maandishi › Kivuli', needs: 'text', kw: 'shadow kivuli' }),
  T({ id: 'text.glow', group: 'B', ...PLANNED('Mwangaza (glow) bado haujajengwa.'), label: 'Mwangaza (glow)', icon: 'sparkles', kw: 'glow' }),
  T({ id: 'text.curve', group: 'B', ...PLANNED('Maandishi yaliyopinda bado hayajajengwa.'), label: 'Maandishi yaliyopinda (curved)', icon: 'text', kw: 'curve curved arc' }),

  // ── Images & Photos ───────────────────────────────────────
  T({ id: 'img.upload', group: 'C', label: 'Ingiza picha kutoka kifaa', icon: 'image', action: 'image.upload', shortcut: 'I', basic: true, kw: 'upload picha image ingiza' }),
  T({ id: 'media.open', group: 'C', label: 'Media Library', icon: 'images', action: 'media.open', basic: true, kw: 'media library maktaba picha' }),
  T({ id: 'img.replace', group: 'C', label: 'Badilisha picha', icon: 'swap', action: 'image.replace', needs: 'image', kw: 'replace badilisha' }),
  T({ id: 'img.crop', group: 'C', label: 'Kata picha (crop)', icon: 'crop', where: 'Kundi C › Kata', needs: 'image', basic: true, kw: 'crop kata' }),
  T({ id: 'img.adjust', group: 'C', label: 'Mwangaza, utofauti, rangi, ukungu', icon: 'sliders', where: 'Kundi C › Athari za picha', needs: 'image', basic: true, kw: 'brightness contrast saturation mwangaza' }),
  T({ id: 'img.tone', group: 'C', label: 'Joto (temperature) na tint', icon: 'sliders', where: 'Kundi C › Athari za picha', needs: 'image', kw: 'temperature tint joto kijani magenta' }),
  T({ id: 'img.aspect', group: 'C', label: 'Uwiano wa picha (1:1, 4:5, 16:9, 9:16)', icon: 'crop', where: 'Kundi C › Uwiano', needs: 'image', basic: true, kw: 'aspect ratio uwiano 1:1 4:5 16:9 9:16' }),
  T({ id: 'img.shadow', group: 'C', label: 'Kivuli cha picha', icon: 'drop', where: 'Kundi C › Kivuli', needs: 'image', kw: 'shadow kivuli drop' }),
  T({ id: 'img.restore', group: 'C', label: 'Rudisha picha ya asili', icon: 'back', where: 'Kundi C › Rudisha', needs: 'image', kw: 'restore original asili rudisha' }),
  T({ id: 'img.border', group: 'C', label: 'Mpaka na pembe za picha', icon: 'crop', where: 'Kundi C › Mpaka na pembe', needs: 'image', kw: 'border frame radius pembe' }),
  T({ id: 'img.mask', group: 'C', ...PLANNED('Mask ya picha bado haijajengwa.'), label: 'Mask ya picha', icon: 'crop', kw: 'mask' }),
  T({ id: 'img.overlay', group: 'C', ...PLANNED('Mwingiliano wa picha (overlay) bado haujajengwa.'), label: 'Mwingiliano wa picha (overlay)', icon: 'layers', kw: 'overlay' }),
  T({ id: 'media.search', group: 'C', ...PLANNED('Utafutaji wa Media bado haujaunganishwa.'), label: 'Tafuta kwenye Media', icon: 'images', kw: 'search media tafuta' }),
  T({ id: 'media.favorites', group: 'C', ...PLANNED('Vipendwa vya media bado havijaundwa.'), label: 'Vipendwa vya media', icon: 'star', kw: 'favorites vipendwa' }),
  T({ id: 'media.folders', group: 'C', ...PLANNED('Folda za media bado hazijaundwa.'), label: 'Folda na makusanyo', icon: 'folderKanban', kw: 'folders collections folda' }),

  // ── Background ────────────────────────────────────────────
  T({ id: 'bg.open', group: 'D', label: 'Rangi ya mandhari (solid)', icon: 'paintBucket', action: 'bg.open', basic: true, kw: 'background mandhari solid rangi' }),
  T({ id: 'bg.gradient', group: 'D', label: 'Gradient ya mandhari', icon: 'paintBucket', where: 'Kundi D › Aina', basic: true, kw: 'gradient mandhari' }),
  T({ id: 'bg.image', group: 'D', label: 'Picha ya mandhari', icon: 'image', action: 'bg.image', basic: true, kw: 'background image picha mandhari' }),
  T({ id: 'bg.texture', group: 'D', ...PLANNED('Textures na patterns bado hazijaunganishwa.'), label: 'Textures na patterns', icon: 'paintBucket', kw: 'texture pattern' }),
  T({ id: 'bg.position', group: 'D', ...PLANNED('Nafasi ya picha ya mandhari bado haijaunganishwa.'), label: 'Nafasi ya picha ya mandhari', icon: 'crop', kw: 'position nafasi mandhari' }),
  T({ id: 'bg.scale', group: 'D', ...PLANNED('Kipimo cha picha ya mandhari bado hakijaunganishwa.'), label: 'Kipimo cha mandhari (scale / crop)', icon: 'crop', kw: 'scale crop kipimo' }),
  T({ id: 'bg.opacity', group: 'D', label: 'Uwazi wa mandhari', icon: 'drop', where: 'Kundi D › Uwazi na ukungu', basic: true, kw: 'opacity uwazi mandhari' }),
  T({ id: 'bg.blur', group: 'D', label: 'Ukungu wa mandhari (picha)', icon: 'drop', where: 'Kundi D › Uwazi na ukungu', kw: 'blur ukungu mandhari' }),
  T({ id: 'bg.restore', group: 'D', label: 'Rudisha mandhari ya awali', icon: 'back', where: 'Kundi D › Rudisha', kw: 'restore previous mandhari ya awali rudisha' }),
  T({ id: 'bg.reset', group: 'D', label: 'Rudisha mandhari (asili)', icon: 'back', where: 'Kundi D › Rudisha', kw: 'reset mandhari asili rudisha' }),

  // ── Shapes & Drawing ──────────────────────────────────────
  T({ id: 'shapes.open', group: 'E', label: 'Maumbo na mistari', icon: 'shapes', action: 'shapes.open', basic: true, kw: 'shapes maumbo rect ellipse arrow mshale star polygon' }),
  T({ id: 'shape.fill', group: 'E', label: 'Jaza, mpaka na upana wa mpaka', icon: 'drop', where: 'Kundi E › Jaza na mpaka', needs: 'shape', basic: true, kw: 'fill stroke jaza mpaka outline' }),
  T({ id: 'shape.kind', group: 'E', label: 'Aina ya umbo (mstatili, duara, pembetatu)', icon: 'shapes', where: 'Kundi E › Aina ya umbo', needs: 'shape', basic: true, kw: 'shape kind umbo mstatili duara pembetatu' }),
  T({ id: 'shape.preset', group: 'E', label: 'Maumbo tayari (kidonge, kadi, duara)', icon: 'shapes', where: 'Kundi E › Maumbo tayari', needs: 'shape', basic: true, kw: 'preset presets maumbo tayari kadi kidonge' }),
  T({ id: 'shape.radius', group: 'E', label: 'Pembe za mstatili (radius)', icon: 'crop', where: 'Kundi E › Pembe', needs: 'shape', kw: 'radius pembe corner rounded' }),
  T({ id: 'shape.shadow', group: 'E', label: 'Kivuli cha umbo', icon: 'drop', where: 'Kundi E › Kivuli', needs: 'shape', kw: 'shadow kivuli' }),
  T({ id: 'draw.free', group: 'E', ...PLANNED('Kuchora kwa mkono bado hakujajengwa.'), label: 'Kuchora bure (freehand brush)', icon: 'draw', kw: 'draw brush brashi freehand' }),
  T({ id: 'draw.pencil', group: 'E', ...PLANNED('Penseli bado haijajengwa.'), label: 'Penseli (pencil)', icon: 'draw', kw: 'pencil penseli' }),
  T({ id: 'draw.eraser', group: 'E', ...PLANNED('Eraser bado haijajengwa.'), label: 'Eraser', icon: 'draw', kw: 'eraser futa brashi' }),

  // ── Stickers & Elements ───────────────────────────────────
  T({ id: 'elem.icons', group: 'F', ...PLANNED('Maktaba ya icons bado haijaunganishwa.'), label: 'Icons', icon: 'sticker', kw: 'icons icon' }),
  T({ id: 'elem.stickers', group: 'F', ...PLANNED('Maktaba ya stickers bado haijaunganishwa.'), label: 'Stickers', icon: 'sticker', kw: 'stickers sticker' }),
  T({ id: 'elem.emoji', group: 'F', ...PLANNED('Emoji bado hazijaongezwa kama vipengele.'), label: 'Emoji', icon: 'sticker', kw: 'emoji' }),
  T({ id: 'elem.decor', group: 'F', ...PLANNED('Vipengele vya mapambo bado havijaunganishwa.'), label: 'Vipengele vya mapambo', icon: 'sticker', kw: 'decorative mapambo' }),
  T({ id: 'elem.callouts', group: 'F', ...PLANNED('Mishale na callouts bado havijaunganishwa.'), label: 'Mishale na callouts', icon: 'shapes', kw: 'arrows callouts mishale' }),
  T({ id: 'elem.svg', group: 'F', ...PLANNED('Kuingiza SVG bado hakujaunganishwa.'), label: 'Ingiza SVG', icon: 'sticker', kw: 'svg' }),
  T({ id: 'elem.logo', group: 'F', ...PLANNED('Nembo na watermark bado hazijaunganishwa.'), label: 'Nembo na watermark', icon: 'sticker', kw: 'logo watermark nembo' }),
  T({ id: 'media.brand', group: 'F', ...PLANNED('Mali za chapa (brand assets) bado hazijaunganishwa.'), label: 'Mali za chapa (brand assets)', icon: 'star', kw: 'brand assets chapa logo' }),
  T({ id: 'elem.favorites', group: 'F', ...PLANNED('Vipendwa vya elementi bado havijaundwa.'), label: 'Vipendwa vya elementi', icon: 'star', kw: 'favorites vipendwa' }),
  T({ id: 'elem.recent', group: 'F', ...PLANNED('Elementi zilizotumika hivi karibuni bado hazijaundwa.'), label: 'Zilizotumika hivi karibuni', icon: 'star', kw: 'recent hivi karibuni' }),

  // ── Colors & Styles ───────────────────────────────────────
  T({ id: 'color.hex', group: 'G', label: 'Msimbo wa rangi (HEX)', icon: 'drop', action: 'color.hex', where: 'Kundi G › Rangi', basic: true, kw: 'hex rangi color' }),
  T({ id: 'color.recent', group: 'G', label: 'Rangi za hivi karibuni', icon: 'drop', action: 'color.recent', where: 'Kundi G › Za hivi karibuni', kw: 'recent colors hivi karibuni' }),
  T({ id: 'color.rgb', group: 'G', label: 'Ingizo la RGB / HSL', icon: 'drop', action: 'color.rgb', where: 'Kundi G › RGB na HSL', kw: 'rgb hsl' }),
  T({ id: 'color.palette', group: 'G', ...PLANNED('Palette zilizohifadhiwa bado hazijajengwa.'), label: 'Palette zilizohifadhiwa', icon: 'palette', kw: 'palette swatches' }),
  T({ id: 'color.brand', group: 'G', ...PLANNED('Rangi za chapa (brand colors) bado hazijaunganishwa.'), label: 'Rangi za chapa (brand colors)', icon: 'palette', kw: 'brand colors chapa' }),
  T({ id: 'style.copy', group: 'G', ...PLANNED('Kunakili mtindo (copy style) bado hakujajengwa.'), label: 'Nakili mtindo (copy style)', icon: 'copy', kw: 'copy style mtindo' }),
  T({ id: 'style.paste', group: 'G', ...PLANNED('Kubandika mtindo (paste style) bado hakujajengwa.'), label: 'Bandika mtindo (paste style)', icon: 'download', kw: 'paste style mtindo' }),
  T({ id: 'style.reuse', group: 'G', label: 'Mitindo ya rangi inayoweza kutumika tena', icon: 'palette', action: 'style.reuse', where: 'Kundi G › Mitindo ya rangi', kw: 'reusable styles mitindo' }),

  // ── Effects & Filters ─────────────────────────────────────
  T({ id: 'img.presets', group: 'H', label: 'Vichujio vya picha (presets)', icon: 'sliders', action: 'fx.presets', where: 'Kundi H › Vichujio', needs: 'image', basic: true, kw: 'filters presets vichujio joto baridi zamani angavu' }),
  T({ id: 'fx.clear', group: 'H', label: 'Ondoa vichujio', icon: 'back', action: 'fx.clear', where: 'Kundi H › Ondoa vichujio', needs: 'image', kw: 'remove clear ondoa vichujio reset' }),
  T({ id: 'img.sharpen', group: 'H', ...PLANNED('Sharpen bado haijajengwa.'), label: 'Sharpen', icon: 'sliders', kw: 'sharpen' }),
  T({ id: 'fx.vignette', group: 'H', ...PLANNED('Vignette bado haijajengwa.'), label: 'Vignette', icon: 'drop', kw: 'vignette' }),
  T({ id: 'fx.duotone', group: 'H', ...PLANNED('Duotone bado haijajengwa.'), label: 'Duotone', icon: 'drop', kw: 'duotone' }),
  T({ id: 'fx.blend', group: 'H', ...PLANNED('Blending modes bado hazijajengwa.'), label: 'Blending modes', icon: 'layers', kw: 'blend mode' }),
  T({ id: 'fx.compare', group: 'H', ...PLANNED('Kabla na baada (before/after) bado haijajengwa.'), label: 'Kabla na baada (before / after)', icon: 'preview', kw: 'before after compare' }),

  // ── Templates & Layout ────────────────────────────────────
  T({ id: 'tpl.open', group: 'I', label: 'Templates', icon: 'template', action: 'templates.open', basic: true, kw: 'templates violezo' }),
  T({ id: 'layout.presets', group: 'I', label: 'Aina za muundo (canvas presets)', icon: 'layoutTemplate', where: 'Create › Aina za muundo (ukubwa wa turubai)', kw: 'canvas presets social formats ukubwa' }),
  T({ id: 'layout.grid', group: 'I', ...PLANNED('Gridi bado haijajengwa.'), label: 'Gridi', icon: 'layoutTemplate', kw: 'grid gridi' }),
  T({ id: 'layout.frames', group: 'I', ...PLANNED('Fremu bado hazijajengwa.'), label: 'Fremu (frames)', icon: 'layoutTemplate', kw: 'frames fremu' }),
  T({ id: 'layout.resize', group: 'I', ...PLANNED('Kubadilisha muundo bila kupoteza muundo bado haijajengwa.'), label: 'Badilisha muundo (resize design)', icon: 'layoutTemplate', kw: 'resize design format' }),
  T({ id: 'layout.styles', group: 'I', ...PLANNED('Mitindo iliyohifadhiwa bado haijaunganishwa.'), label: 'Mitindo iliyohifadhiwa', icon: 'palette', kw: 'saved styles mitindo' }),
  T({ id: 'layout.brandkit', group: 'I', ...PLANNED('Brand Kit iko kwenye Creator Business; haijaunganishwa kwenye mhariri.'), label: 'Brand Kit', icon: 'briefcase', kw: 'brand kit' }),
  T({ id: 'layout.components', group: 'I', ...PLANNED('Vipengele vya kutumia tena bado havijajengwa.'), label: 'Vipengele vya kutumia tena', icon: 'layoutTemplate', kw: 'components reusable' }),
  T({ id: 'ad.cta', group: 'I', ...PLANNED('Kitufe cha CTA bado hakijaongezwa kwenye matangazo.'), label: 'Kitufe cha CTA', icon: 'megaphone', kw: 'cta button tangazo' }),
  T({ id: 'ad.variants', group: 'I', ...PLANNED('Matoleo ya tangazo bado hayajajengwa.'), label: 'Matoleo ya tangazo (variants)', icon: 'megaphone', kw: 'variants matoleo tangazo' }),
  T({ id: 'biz.premiumAssets', group: 'I', premium: true, status: 'premium', entitlement: 'premium_assets', note: 'Templates na mali za premium zinahitaji mpango wa Premium.', label: 'Templates na mali za premium', icon: 'star', kw: 'premium templates mali' }),

  // ── Layers ────────────────────────────────────────────────
  T({ id: 'layers.open', group: 'J', label: 'Orodha ya tabaka', icon: 'layers', action: 'layers.open', basic: true, kw: 'layers tabaka' }),
  T({ id: 'layers.select', group: 'J', label: 'Chagua tabaka', icon: 'pointer', where: 'Orodha ya tabaka: bofya jina la kipengele', kw: 'select layer chagua tabaka' }),
  T({ id: 'order.forward', group: 'J', label: 'Sogeza mbele', icon: 'up', action: 'order.forward', shortcut: ']', needs: 'selection', basic: true, kw: 'forward mbele order' }),
  T({ id: 'order.backward', group: 'J', label: 'Sogeza nyuma', icon: 'down', action: 'order.backward', shortcut: '[', needs: 'selection', basic: true, kw: 'backward nyuma order' }),
  T({ id: 'order.front', group: 'J', label: 'Leta mbele kabisa', icon: 'up', action: 'order.front', shortcut: 'Ctrl+]', needs: 'selection', kw: 'front juu kabisa' }),
  T({ id: 'order.back', group: 'J', label: 'Peleka nyuma kabisa', icon: 'down', action: 'order.back', shortcut: 'Ctrl+[', needs: 'selection', kw: 'back chini kabisa' }),
  T({ id: 'layers.rename', group: 'J', label: 'Badilisha jina la tabaka', icon: 'text', where: 'Orodha ya tabaka › Jina (bofya mara mbili)', needs: 'selection', kw: 'rename jina' }),

  // ── Pages & Scenes (kurasa nyingi bado hazijajengwa) ─────
  T({ id: 'pages.add', group: 'K', ...PLANNED('Kurasa nyingi bado hazijajengwa; turubai ni moja.'), label: 'Ongeza ukurasa', icon: 'files', kw: 'add page ukurasa' }),
  T({ id: 'pages.duplicate', group: 'K', ...PLANNED('Kurasa nyingi bado hazijajengwa; turubai ni moja.'), label: 'Rudufu ukurasa', icon: 'copy', kw: 'duplicate page ukurasa' }),
  T({ id: 'pages.delete', group: 'K', ...PLANNED('Kurasa nyingi bado hazijajengwa; turubai ni moja.'), label: 'Futa ukurasa', icon: 'trash', kw: 'delete page ukurasa' }),
  T({ id: 'pages.reorder', group: 'K', ...PLANNED('Kurasa nyingi bado hazijajengwa; turubai ni moja.'), label: 'Panga upya kurasa', icon: 'up', kw: 'reorder page panga' }),
  T({ id: 'pages.slides', group: 'K', ...PLANNED('Slaidi zinahitaji mhariri wa slaidi nyingi.'), label: 'Slaidi (slides)', icon: 'files', kw: 'slides slaidi slideshow' }),
  T({ id: 'pages.frames', group: 'K', ...PLANNED('Fremu za story bado hazijajengwa.'), label: 'Fremu za story', icon: 'files', kw: 'story frames fremu' }),
  T({ id: 'pages.duration', group: 'K', ...PLANNED('Muda wa scene unahitaji ratiba.'), label: 'Muda wa scene', icon: 'clapperboard', kw: 'duration muda scene' }),
  T({ id: 'pages.transition', group: 'K', ...PLANNED('Mipito kati ya kurasa bado haijajengwa.'), label: 'Mipito kati ya kurasa', icon: 'clapperboard', kw: 'transition mpito' }),
  T({ id: 'pages.preview', group: 'K', ...PLANNED('Hakiki ya kurasa bado haijajengwa.'), label: 'Hakiki ya kurasa', icon: 'preview', kw: 'page preview hakiki' }),

  // ── Video Editor (planned) ────────────────────────────────
  T({ id: 'video.add', group: 'L', ...PLANNED('Uhariri wa video haujaunganishwa. Hakuna video inayotengenezwa.'), label: 'Ingiza video', icon: 'film', kw: 'video import ingiza' }),
  T({ id: 'video.images', group: 'L', ...PLANNED('Klipu za picha bado hazijaunganishwa.'), label: 'Ingiza picha kama klipu', icon: 'film', kw: 'image clip klipu' }),
  T({ id: 'video.timeline', group: 'L', ...PLANNED('Ratiba (timeline) ya video bado haijajengwa.'), label: 'Ratiba (timeline)', icon: 'film', kw: 'timeline ratiba' }),
  T({ id: 'video.trim', group: 'L', ...PLANNED('Kukata klipu bado hakujajengwa.'), label: 'Kata klipu (trim)', icon: 'film', kw: 'trim kata klipu' }),
  T({ id: 'video.split', group: 'L', ...PLANNED('Kugawanya klipu bado hakujajengwa.'), label: 'Gawanya klipu (split)', icon: 'film', kw: 'split gawanya' }),
  T({ id: 'video.speed', group: 'L', ...PLANNED('Kasi ya video bado haijajengwa.'), label: 'Kasi ya video (speed)', icon: 'film', kw: 'speed kasi' }),
  T({ id: 'video.transitions', group: 'L', ...PLANNED('Mipito ya video bado haijajengwa.'), label: 'Mpito (transitions)', icon: 'clapperboard', kw: 'transitions mpito' }),
  T({ id: 'video.keyframes', group: 'L', ...PLANNED('Keyframes bado hazijajengwa.'), label: 'Keyframes', icon: 'clapperboard', kw: 'keyframes' }),
  T({ id: 'video.pip', group: 'L', ...PLANNED('Picha-ndani-ya-picha bado haijajengwa.'), label: 'Picha-ndani-ya-picha (PiP)', icon: 'film', kw: 'pip picture in picture' }),
  T({ id: 'video.cover', group: 'L', ...PLANNED('Kuchagua cover bado hakujajengwa.'), label: 'Chagua cover', icon: 'film', kw: 'cover thumbnail' }),
  T({ id: 'video.export', group: 'L', ...PLANNED('Export ya video bado haijaunganishwa.'), label: 'Hamisha video', icon: 'download', kw: 'export video' }),

  // ── Animation & Motion (planned) ──────────────────────────
  T({ id: 'anim.text', group: 'M', ...PLANNED('Uhuishaji wa maandishi bado haujajengwa.'), label: 'Uhuishaji wa maandishi', icon: 'clapperboard', kw: 'text animation uhuishaji' }),
  T({ id: 'anim.object', group: 'M', ...PLANNED('Uhuishaji wa vipengele bado haujajengwa.'), label: 'Uhuishaji wa kipengele', icon: 'clapperboard', kw: 'object animation' }),
  T({ id: 'anim.enter', group: 'M', ...PLANNED('Kuingia na kutoka bado hakujajengwa.'), label: 'Kuingia na kutoka', icon: 'clapperboard', kw: 'entrance exit kuingia kutoka' }),
  T({ id: 'anim.duration', group: 'M', ...PLANNED('Muda na kuchelewesha bado havijajengwa.'), label: 'Muda na kuchelewa (duration, delay)', icon: 'clapperboard', kw: 'duration delay muda' }),
  T({ id: 'anim.keyframes', group: 'M', ...PLANNED('Keyframes za mwendo bado hazijajengwa.'), label: 'Keyframes za mwendo', icon: 'clapperboard', kw: 'keyframes motion' }),
  T({ id: 'anim.gif', group: 'M', ...PLANNED('Export ya GIF bado haijajengwa.'), label: 'Hamisha GIF', icon: 'download', kw: 'gif export' }),

  // ── Audio & Captions ──────────────────────────────────────
  T({ id: 'audio.add', group: 'N', ...PLANNED('Sauti bado hazijaunganishwa kwenye mhariri.'), label: 'Ongeza sauti (audio)', icon: 'audioLines', kw: 'audio sauti music muziki' }),
  T({ id: 'audio.trim', group: 'N', ...PLANNED('Kukata sauti bado hakujajengwa.'), label: 'Kata sauti (trim)', icon: 'audioLines', kw: 'audio trim kata' }),
  T({ id: 'audio.volume', group: 'N', ...PLANNED('Sauti (volume) bado haijajengwa.'), label: 'Sauti (volume)', icon: 'audioLines', kw: 'volume sauti' }),
  T({ id: 'audio.fade', group: 'N', ...PLANNED('Fade in / out bado hazijajengwa.'), label: 'Fade in / out', icon: 'audioLines', kw: 'fade' }),
  T({ id: 'audio.waveform', group: 'N', ...PLANNED('Waveform bado haijajengwa.'), label: 'Waveform', icon: 'audioLines', kw: 'waveform' }),
  T({ id: 'audio.license', group: 'N', ...PLANNED('Taarifa za leseni za muziki bado hazijaongezwa.'), label: 'Taarifa za leseni za muziki', icon: 'audioLines', kw: 'license leseni' }),
  T({ id: 'cap.add', group: 'N', label: 'Manukuu (captions / subtitles)', icon: 'text', status: 'service', service: 'transcription', note: 'Manukuu ya kiotomatiki yanahitaji huduma ya transcription.', kw: 'captions subtitles manukuu' }),
  T({ id: 'cap.timing', group: 'N', ...PLANNED('Muda wa maandishi (text timing) unahitaji ratiba.'), label: 'Muda wa maandishi (text timing)', icon: 'text', kw: 'text timing muda' }),
  T({ id: 'audio.voice', group: 'N', status: 'service', service: 'voice', note: 'Sauti ya maelezo inahitaji huduma ya voice.', label: 'Sauti ya maelezo (voiceover)', icon: 'audioLines', kw: 'voiceover sauti maelezo' }),

  // ── AI Tools (service items: disabled until a service is connected) ──
  T({ id: 'ai.suggest', group: 'O', status: 'service', service: 'ai', note: 'Mapendekezo ya maandishi na muundo yanahitaji huduma ya AI.', label: 'Mapendekezo ya maandishi na muundo', icon: 'sparkles', kw: 'ai suggestions mapendekezo' }),
  T({ id: 'ai.caption', group: 'O', status: 'service', service: 'ai', note: 'Mwandishi wa caption anahitaji huduma ya AI.', label: 'Andika caption kwa AI', icon: 'sparkles', kw: 'ai caption' }),
  T({ id: 'ai.text2img', group: 'O', status: 'service', service: 'ai', note: 'Uzalishaji wa picha unahitaji huduma ya AI.', label: 'Picha kutoka maelezo (AI)', icon: 'sparkles', kw: 'ai image generation picha' }),
  T({ id: 'ai.bggen', group: 'O', status: 'service', service: 'ai', note: 'Mandhari ya AI inahitaji huduma ya AI.', label: 'Mandhari kwa AI', icon: 'sparkles', kw: 'ai background generation' }),
  T({ id: 'ai.bgremove', group: 'O', status: 'service', service: 'backgroundRemoval', note: 'Kuondoa mandhari kunahitaji huduma ya background removal.', label: 'Ondoa mandhari ya picha', icon: 'sparkles', kw: 'background removal ondoa mandhari' }),
  T({ id: 'ai.enhance', group: 'O', status: 'service', service: 'ai', note: 'Kuboresha picha kunahitaji huduma ya AI.', label: 'Kuboresha picha (enhance)', icon: 'sparkles', kw: 'enhance kuboresha' }),
  T({ id: 'ai.objremove', group: 'O', status: 'service', service: 'ai', note: 'Kuondoa kitu kwenye picha kunahitaji huduma ya AI.', label: 'Ondoa kitu kwenye picha', icon: 'sparkles', kw: 'object removal ondoa kitu' }),
  T({ id: 'ai.thumb', group: 'O', status: 'service', service: 'ai', note: 'Msaada wa thumbnail unahitaji huduma ya AI.', label: 'Msaada wa thumbnail', icon: 'sparkles', kw: 'thumbnail assistance' }),
  T({ id: 'ai.videoassist', group: 'O', status: 'service', service: 'ai', note: 'Msaada wa video unahitaji huduma ya AI na uhariri wa video.', label: 'Msaada wa video', icon: 'sparkles', kw: 'video assistance' }),
  T({ id: 'ai.translate', group: 'O', status: 'service', service: 'ai', note: 'Tafsiri inahitaji huduma ya AI.', label: 'Tafsiri maandishi', icon: 'sparkles', kw: 'translate tafsiri' }),
  T({ id: 'ai.repurpose', group: 'O', status: 'service', service: 'ai', note: 'Kutumia tena maudhui kunahitaji huduma ya AI.', label: 'Tumia tena maudhui (repurpose)', icon: 'sparkles', kw: 'repurpose content' }),
  T({ id: 'ai.smartcrop', group: 'O', status: 'service', service: 'ai', note: 'Smart crop inahitaji huduma ya AI.', label: 'Smart crop', icon: 'sparkles', kw: 'smart crop' }),
  T({ id: 'biz.aiCredits', group: 'O', premium: true, status: 'premium', entitlement: 'ai_credits', note: 'Mikopo ya AI inahitaji mpango wa Premium.', label: 'Mikopo ya AI', icon: 'sparkles', kw: 'credits mikopo' }),

  // ── Export & Publish ──────────────────────────────────────
  T({ id: 'file.save', group: 'P', label: 'Hifadhi mradi', icon: 'save', action: 'file.save', shortcut: 'Ctrl+S', basic: true, kw: 'save hifadhi' }),
  T({ id: 'file.preview', group: 'P', label: 'Hakiki', icon: 'preview', action: 'file.preview', basic: true, kw: 'preview hakiki' }),
  T({ id: 'file.rename', group: 'P', label: 'Badilisha jina la mradi', icon: 'text', where: 'Juu kushoto: jina la mradi', basic: true, kw: 'rename title jina' }),
  T({ id: 'file.recent', group: 'P', label: 'Miradi yangu', icon: 'layers', where: 'Create › Miradi yangu (hub)', basic: true, kw: 'recent projects miradi' }),
  T({ id: 'file.recover', group: 'P', label: 'Rejesha mabadiliko yaliyopotea', icon: 'check', where: 'Banner ya urejeshaji juu ya turubai', kw: 'recovery rejesha' }),
  T({ id: 'file.duplicate', group: 'P', ...PLANNED('Kunakili mradi kwa jina jipya bado hakujajengwa.'), label: 'Nakili mradi', icon: 'copy', kw: 'duplicate project' }),
  T({ id: 'file.versions', group: 'P', ...PLANNED('Namba ya toleo inahifadhiwa; historia kamili bado haijajengwa.'), label: 'Historia ya matoleo', icon: 'layers', kw: 'versions history' }),
  T({ id: 'export.png', group: 'P', label: 'Hamisha PNG', icon: 'download', action: 'export.png', basic: true, kw: 'export png' }),
  T({ id: 'export.pngClear', group: 'P', label: 'PNG bila mandhari (uwazi)', icon: 'download', action: 'export.pngTransparent', kw: 'transparent uwazi png' }),
  T({ id: 'export.jpeg', group: 'P', label: 'Hamisha JPEG', icon: 'download', action: 'export.jpeg', basic: true, kw: 'export jpeg jpg' }),
  T({ id: 'export.webp', group: 'P', label: 'Hamisha WebP', icon: 'download', action: 'export.webp', kw: 'export webp' }),
  T({ id: 'export.dimensions', group: 'P', label: 'Vipimo vya turubai', icon: 'crop', where: 'Juu ya turubai: ukubwa wa muundo (px)', kw: 'dimensions vipimo ukubwa' }),
  T({ id: 'export.resolution', group: 'P', status: 'ready', action: 'export.panel', basic: true, label: 'Ukubwa, ubora na hakiki', icon: 'crop', kw: 'resolution scale 2x ubora ukubwa export panel' }),
  T({ id: 'export.retry', group: 'P', ...PLANNED('Kujaribu tena export iliyoshindwa bado hakujajengwa; jaribu kuhamisha tena.'), label: 'Jaribu tena export iliyoshindwa', icon: 'download', kw: 'retry failed export' }),
  T({ id: 'post.publish', group: 'P', status: 'partial', action: 'publish.open', basic: true, note: 'Picha moja kwa chapisho la feed. Mafanikio yanategemea mazingira ya upakiaji (storage).', label: 'Chapisha kwenye PASIHAI', icon: 'send', kw: 'publish chapisha post' }),
  T({ id: 'post.caption', group: 'P', label: 'Maelezo ya chapisho', icon: 'text', where: 'Dirisha la Chapisha › Maelezo', kw: 'caption maelezo' }),
  T({ id: 'post.toComposer', group: 'P', ...PLANNED('Kutuma kwa Post Composer bado hakujaunganishwa; tumia Chapisha.'), label: 'Tuma kwa Post Composer', icon: 'send', kw: 'post composer tuma' }),
  T({ id: 'post.hashtags', group: 'P', ...PLANNED('Hashtags bado hazijaongezwa kwenye chapisho la turubai.'), label: 'Hashtags', icon: 'text', kw: 'hashtags' }),
  T({ id: 'post.schedule', group: 'P', ...PLANNED('Ratiba ya kuchapisha bado haijaunganishwa.'), label: 'Ratiba ya kuchapisha', icon: 'clapperboard', kw: 'schedule ratiba' }),
  T({ id: 'ad.publish', group: 'P', ...PLANNED('Kutuma kwa workflow ya matangazo bado hakujaunganishwa; hamisha PNG kwa sasa.'), label: 'Tuma kwenye workflow ya matangazo', icon: 'megaphone', kw: 'ad publish tangazo' }),
  T({ id: 'ad.campaign', group: 'P', ...PLANNED('Mali za kampeni bado hazijaunganishwa.'), label: 'Mali za kampeni', icon: 'megaphone', kw: 'campaign kampeni' }),
  T({ id: 'biz.advancedExport', group: 'P', premium: true, status: 'premium', entitlement: 'advanced_export', note: 'Export za hali ya juu zinahitaji mpango wa Premium.', label: 'Export za hali ya juu', icon: 'download', kw: 'advanced export premium' }),
]

/** Vitendo ambavyo mhariri lazima awe navyo. Kila `action` kwenye rejista lazima iwemo hapa. */
export const ACTION_IDS = [
  'export.panel',
  'text.toggleUnderline', 'text.toggleStrike', 'text.listBullet', 'text.listNumber',
  'sel.all', 'sel.clear', 'obj.copy', 'obj.paste', 'obj.duplicate', 'obj.delete', 'obj.lock', 'obj.hide',
  'obj.flipX', 'obj.flipY', 'align.centerX', 'align.centerY', 'distribute.x', 'view.snap',
  'view.zoomIn', 'view.zoomOut', 'view.fit', 'edit.undo', 'edit.redo',
  'text.add', 'text.edit', 'text.toggleBold', 'text.toggleItalic',
  'bg.open', 'bg.image', 'image.upload', 'image.replace', 'shapes.open',
  'order.forward', 'order.backward', 'order.front', 'order.back', 'layers.open',
  'templates.open', 'media.open', 'publish.open', 'color.hex', 'color.recent', 'color.rgb', 'style.reuse', 'fx.presets', 'fx.clear',
  'file.save', 'file.preview', 'export.png', 'export.pngTransparent', 'export.jpeg', 'export.webp',
]

export function toolsByGroup(groupId) {
  return TOOLS.filter((t) => t.group === groupId)
}

export function findTool(id) {
  return TOOLS.find((t) => t.id === id) ?? null
}

export function groupById(id) {
  return GROUPS.find((g) => g.id === id) ?? null
}

/** Maneno ya utafutaji: lebo + kw + jina la kundi + njia ya mkato. */
export function matchesQuery(tool, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const hay = `${tool.label} ${tool.kw ?? ''} ${tool.shortcut ?? ''} ${groupById(tool.group)?.title ?? ''}`.toLowerCase()
  return q.split(/\s+/).every((term) => hay.includes(term))
}
