# PASIHAI — STITCH UI INTEGRATION · STAGE 1–2: AUDIT & COMPONENT MAPPING

**Tarehe:** 2026-10-07 · **Hali: IMESIMAMA** — implementation (Stage 3+) haijaanza.
Hati hii ni ya kukagua na kuidhinisha kabla ya mabadiliko yoyote ya code.

> Kabla ya kubadilisha kitu chochote: audit kamili + component mapping + change plan (hii).
> Baada ya idhini: Stages 3–10 kwa mpangilio, kila stage ikiwa na build · smoke · shots · regression check.

---

## 0. Muhtasari (TL;DR)

**Mafunzo makuu 6:**

1. **Stitch = chanzo cha MUONEKANO (mobile-first), si chanzo cha code wala architecture.**
   Faili 15 kati ya 16 ni mobile-width `max-w-[390px]`. Hakuna layout ya kweli ya tablet/desktop
   (isipokuwa board ya View Mode). Responsive itabaki kwa mfumo wetu.
2. **Stitch haitumiki moja kwa moja:** Tailwind CDN · Google Fonts · Material Symbols (font ya nje,
   glyphs 85) · picha **87 za nje** (all `lh3.googleusercontent.com`). Prototype yetu ni **offline**
   (fonts self-hosted) — kwa hiyo Stitch ni *visual reference*, tunajenga upya kwa CSS/tokens zetu.
3. **Hakuna mgongano wa brand:** `#18A982` · `#3B82F6` · `#EAF8F3` · `#D4A72C` zinalingana kabisa
   na DESIGN.md (Stitch) na tokens zetu. Tofauti ni za *neutral family* (tazama §4).
4. **Stitch inaheshimu rules zetu:** Home row **moja** (Mchanganyiko · Reels · Friends · Channels · Live),
   bottom nav **5**, filters na view mode ni **popover** (si safu ya kudumu), view mode **4**
   (Automatic · Vertical · Horizontal · Full screen).
5. **Tofauti kubwa moja ya muonekano:** Stitch = **kadi** (white surface + hairline border + radius 16 +
   `shadow-sm` juu ya background iliyotintiwa); PASIHAI yetu = **safu tambarare** (dividers).
   Hili ni uamuzi wa owner — **Q1**.
6. **Existing ina mengi ambayo Stitch haina** (seam, feed model 8 kinds, panels 10, taarifa, wasifu,
   saved, prefs, tests 92+69, screenshots 52): **yote yanahifadhiwa** — nada ya "preserve, consolidate,
   improve".

---

## 1. Method — kilichokaguliwa

| Chanzo | Kiasi | Kile kilichokaguliwa |
|---|---|---|
| `uploads/` (Stitch) | **16 faili** | HTML 8 (screens 7 + duplicate 1) · PNG 7 · `DESIGN.md` 1 — kila faili limesomwa: structure, comments, classes, rangi, assets, fonts |
| `pasihai/src` | **faili 44** (JSX 19) | pages · components · feed · home · panels · ui · icons · hooks · services · repositories · mappers · mock · utils |
| `pasihai/src/styles` | **CSS 3,256 mistari** / faili 10 | tokens · base · shell · components · home · feed · panels · placeholder · guide · fonts |
| Tests | scripts 2 | `smoke.jsx` (92 checks) · `shots.mjs` (69 assertions) |
| Screenshots | **52 PNG** | `docs/shots/` (20) · `phase-1/` (21) · `phase-2a/` (11) |
| Reports | 6 docs | ARCHITECTURE (2) · PHASE-1 (2) · PHASE-2A (2) |
| | | **Hakuna faili iliyoachwa bila kukaguliwa** |

---

## 2. Audit ya PASIHAI iliyopo (Existing)

### 2.1 Architecture (inahifadhiwa bila kubadilika)

```
UI (pages · components)  →  hooks/useAsyncData  →  services/*  →  data/repositories/index.js
                                                                        ↓
                                                     repositories/*  →  mappers/*  →  data/mock.js
```

| Layer | Faili |
|---|---|
| Pages | `Home.jsx` · `PlaceholderPage.jsx` · `StyleGuide.jsx` |
| Shell | `Header` · `BottomNav` · `Sheet` · `Wordmark` · `panels.jsx` (10) · `ui.jsx` (13 primitives) · `icons.jsx` (44) |
| Home | `StatusRow` · `HomeTabs` · `CreateArea` |
| Feed | `FeedList` · `FeedItem` · `bodies.jsx` (8 kinds + registry) · `FeedActions` |
| Services (6) | `homeService` · `accountService` · `settingsService` · `notificationService` · `productInfoService` · `feedService` |
| Repositories (5+root) | `content` · `identity` · `activity` · `catalog` + `index.js` (composition root = swap point) |
| Data | `feedMapper.js` · `mock.js` (posts 12 · reels 8 · live 12 · statuses 13 · users 13 · notifications 8) |
| Utils | `time.js` (`formatAge`) |

### 2.2 Vipengele vya UI vilivyopo (bila icons): **~49 components/primitives**; + **icons 44** = **93**

### 2.3 Feed model ya 2A (haiathiriki)

- Aina **8**: `text · image · video · audio · poll · announcement · liveActivity · reel`
- Home tabs 5 kwa **sheria** (`TAB_RULES`) · mpangilio deterministic (relationship + recency + type + live state)
- Kichujio **9** (Zote · Machapisho · Picha · Video · Reels · Sauti · Kura · Live · Matangazo)
- View modes **3** (auto · vertical · horizontal) — Stitch inaongeza ya 4; tazama §10/Q

### 2.4 Uthibitisho (unaobaki kuwa lango la kila stage)

- `npm run build` ✓ · `npm run smoke` **92/92** · `node scripts/shots.mjs` **69/69**, console 0
- Pixel diff: kurasa 12 zisizo-Home = **0.000%**; Home inatofautiana kwenye eneo la mkondo pekee

### 2.5 Features za existing ambazo Stitch HAINA (zote zinahifadhiwa)

Panels 10 (taarifa · wasifu · kuunda · more · view mode · feed prefs · content prefs · saved · filter ·
switch) · Sheet + toast · taarifa 8 kwa filters (Zote/Mpya) + unread · profile join kwa entity ·
Status row 13 + "Zote" more-item · View mode panel · feed prefs (mpangilio + switches 5) ·
content prefs · Style guide (`?guide=1`) · devlink · fonts self-hosted 8 · responsive 3 breakpoints ·
test suite mbili · screenshots 52.

---

## 3. Audit ya Stitch (kila faili)

### 3.1 Screen-by-screen

| Faili | Screenshot | Screen | Maudhui makuu |
|---|---|---|---|
| `code.html` | `screen.png` | **Home / Mchanganyiko** (mobile) | Header · status row (8 states: own+add, unviewed, live-pulse, video-ring, viewed-muted) · tabs row moja + utilities 3 · popovers 2 (filter chips 9 · view modes 4) · create area · feed: live activity (audio room) · friend post · poll · channel broadcast · hub post · business post · reel · bottom nav |
| `code (1).html` | `screen (2).png` | **Reels tab** | Status row · subnav · full-bleed player (region chip, duration, volume, play/pause, creator + gold badge + Fuata, caption, audio pill, rail ya like/comment/save/share + disc, scrubber) · next-reel teaser |
| `code (3).html` = `code (5).html` | `screen (4).png` | **View Mode board** (desktop) | Variants **4** za kidhibiti (Compact Dropdown · Bottom Sheet · Segmented · Floating) · modes 4 (Automatic/ Vertical/ Horizontal/ Full screen — "hakuna Scroll") · responsive strategy · UX decision matrix |
| `code (6).html` | `screen (7).png` | **Channels tab** | Status row · nav row moja · context header "Channels unazofuata" + Uchangiaji · channel broadcast card (graphic + headline + highlights bullet + metrics 3 + CTA "Soma Makala Kamili"/"Tuma Soga") · sports card (fixture VS) · news card (external "Soma BBC") · **discovery carousel** (suggested 3 + Fuata) |
| `code (8).html` | `screen (9).png` | **Home + archetypes** (annotated) | Status row · nav tabs · controls (filter + view mode + Auto) · create area · archetypes A–G: friend · live activity · channel · poll · reel · hub · business · end-of-feed indicator |
| `code (10).html` | `screen (11).png` | **Friends tab** | Status row (Hadithi Yako + 4) · nav row + tune/grid/verified · context line "Machapisho na matukio kutoka kwa marafiki…" · composer prompt "Shiriki jambo na marafiki zako…" + Picha/Video/Kura · friend image-grid post (+2) · friend poll/event (Nitakuwepo/Sitaweza) · friend video post · **end-of-feed "Umesoma yote kwa leo!" + Fungua Soga** |
| `code (12).html` | `screen (13).png` | **Live tab** | Live stories row (+ create live) · nav row · **sub-segments** Inaendelea(4)/Zilizopangwa(8)/Zilizopita(12) + tune · audio room card (waveform, speakers glow, attendees, CTA Jiunge) · live video card (badges, sound toggle, chat snip, host bio) · **section Zilizopangwa** (guest mosaic, Kumbusha) · **section Zilizopita & Marudio** (Tazama Marudio) · floating prompt "Unataka kurusha matangazo yako?" |

### 3.2 `DESIGN.md` (design system ya Stitch) — muhtasari

| Kipengele | Stitch | PASIHAI yetu | Tofauti |
|---|---|---|---|
| Brand | `#18A982` · `#3B82F6` · `#EAF8F3` · `#D4A72C` | sawa kabisa | **hakuna** |
| Neutrals | slate baridi: text `#0F172A` · muted `#64748B` · border `#E2E8F0` · bg `#FAF8FF` | warm-kijani: `#17201D` · `#66736E` · `#E7EEEA` · `#FFFFFF`/`#F7FAF9` | family tofauti (§4.2) |
| Fonts | Inter pekee (11→36px) | Inter + **Inter Tight** (11→32px) | sisi tuna display font |
| Radius | 8 · 12 · 16 · 24 · full | 6 · 8 · 12 · 16 · 20 · full | karibu sawa |
| Elevation | hairline + ambient 0 4 16 -2 | `--sh-1/2/3` hafifu | sawa kifalsafa |
| Kadi | white + border + radius 16 + padding 16 | safu tambarare + dividers | **tofauti kuu (Q1)** |
| Pills/buttons | pill kamili, primary green / secondary blue / tertiary soft / ghost | `.psh-btn` primary/quiet/danger + Chip | tuunganishe tone |

### 3.3 Ukweli wa kiufundi wa Stitch (muhimu kwa integration)

- **Tailwind CDN** (`cdn.tailwindcss.com`) kwenye faili zote → haiwezi kutumika (si build system yetu).
- **Google Fonts** (`Inter`) kwa link ya nje → sisi tuna self-hosted.
- **Material Symbols Outlined** — glyphs **85** zinazotumika; sisi tuna **44 SVG** zetu. Hakuna
  kuchanganya libraries: tunabakiza SVG na **kuongeza ~14 glyphs mpya** zinazohitajika (§8).
- **Picha 87 za nje**, URL 87 za kipekee, **duplicates 0**, **assets za ndani 0** → hakuna asset ya
  kunakili; placeholders zetu zinaendelea (Q2).
- Screens zote mobile `390px`; board ya View Mode ndiyo pekee yenye md/sm breakpoints.

---

## 4. Ulinganisho wa design language (kwa kipengele)

| # | Kipengele | Existing | Stitch | Uamuzi unapendekezwa |
|---|---|---|---|---|
| 4.1 | Rangi za brand | ✅ sawa | ✅ sawa | **Hakuna mabadiliko** |
| 4.2 | Neutrals | warm-kijani | slate baridi | **Bakiza yetu** (utambulisho + contrast iliyothibitishwa); chukua nidhamu ya borders |
| 4.3 | Typography | Inter + Inter Tight, scale 11–32 | Inter pekee 11–36 | **Bakiza yetu**; Stitch's label-sm (uppercase badges) tayari tunayo |
| 4.4 | Feed framing | safu tambarare + dividers | kadi + border + radius 16 | **Q1** (pendekezo: "card-lite") |
| 4.5 | Radius | tokens 6–20 | 8–24, kadi 16 | Tumia `--r-lg` (16) kwa kadi za feed; hakuna token mpya |
| 4.6 | Elevation | `--sh-1..3` | hairline + `0 4 16 -2` | **Border-kwanza**, shadow ni ya panels tu |
| 4.7 | Identity | avatar + jina + rel text + muda | jina + **pill badge** ya entity + muda | **Merge**: pill ya entity (Chip tones) ndani ya Identity |
| 4.8 | Icons | SVG 44, jozi moja | Material 85 | **Bakiza SVG**; ongeza glyphs 14 kama SVG |
| 4.9 | Buttons | `.psh-btn` 3 + Chip 4 | pill 4 tones | Merge: ongeza tone za soft/blue kwenye Chip/btn |
| 4.10 | Status/Stories | ring 5 states + video + more | + own badge, live pulse, gold creator ring | **Merge** (vipengele vipya kwenye StatusRow) |
| 4.11 | Status label | "Status Yako" | "Hadithi Yako" (Friends screen) | **"Status Yako"** (yetu ni canonical; Stitch haina msimamo mmoja) |
| 4.12 | Taarifa dot | gold | red `error` | **Gold** (uamuzi wa Phase 1: gold kwa nadra) |
| 4.13 | Media | MediaFrame tone 7 (placeholder) | picha halisi + scrim | **Bakiza placeholders** + boresha (scrim, 4:5, radius) |
| 4.14 | Live | shell 1 (state/mode/host/viewers/CTA) | audio room + video live + speakers + sub-segments | **Merge** (njia moja, data additive) |

---

## 5. Duplications

### 5.1 Ndani ya Stitch

| Aina | Mahali | Uamuzi |
|---|---|---|
| Faili duplicate kamili | `code (3).html` **=** `code (5).html` (md5 sawa) | Punguza: faili **moja** tu ya kurejea |
| Status row | screens **5** (variants) | Muundo **mmoja** (StatusRow yetu) + variants |
| Bottom nav | screens **7** | Muundo mmoja — **BottomNav** yetu |
| Tabs row | screens **7** | Muundo mmoja — **HomeTabs** yetu |
| Feed card anatomy | screens **4** | Muundo mmoja — **FeedItem + bodies** yetu |
| Filter popover | screens ≥2 | Control **moja** — FilterMenu |
| View mode popover | screens ≥2 | Control **moja** — ViewModePanel |

### 5.2 Kati ya systems (component mapping — **canonical decisions**)

| # | Component | Existing | Stitch | Uamuzi | Sababu | Mahali (final) |
|---|---|---|---|---|---|---|
| 1 | FeedCard / PostCard | ✅ FeedItem + bodies (kinds 8) | ✅ archetypes A–G | **MERGE → existing** | logic/seam ni yetu; Stitch = anatomy | `feed/FeedItem.jsx` |
| 2 | Identity (header) | ✅ | ✅ | **MERGE** + entity pill | pill = uwazi zaidi | `ui.jsx` + CSS |
| 3 | Entity badge | ✅ corner badge + rel text | ✅ pills 5 | **MERGE** (Chip tones) | moja: `.psh-chip--friend/channel/hub/business/creator` | `ui.jsx`/`components.css` |
| 4 | Status/Stories | ✅ (13, ring 5, viewed) | ✅ 6 states | **MERGE** + live pulse + gold creator + own badge | behavior inahifadhiwa | `home/StatusRow.jsx` |
| 5 | Home tabs | ✅ 5 + filter dropdown | ✅ 5 + utilities 3 | **MERGE** (utilities ziingie mstari mmoja; sticky + hairline) | Rule 8 | `home/HomeTabs.jsx` |
| 6 | Filter control | ✅ checkrows 9 | ✅ popover chips 9 | **MERGE** → chips popover | orodha ni ile ile | `panels.jsx` FilterMenu |
| 7 | View mode control | ✅ 3 modes (dropdown) | ✅ variant 1 + modes 4 | **MERGE** → dropdown (variant 1) + **Full screen** | board inatoa variant 4; yetu = variant 1 | `panels.jsx` + `mock.js` |
| 8 | Create area | ✅ 5 actions | ✅ 3–5 + friends context | **MERGE** (+ context text kwa tab) | preserve | `home/CreateArea.jsx` |
| 9 | Live Activity | ✅ shell | ✅ audio room | **MERGE** (speakers + waveform + attendees) | data additive | `feed/bodies.jsx` + mock |
| 10 | Live Session (video) | ✅ (state live) | ✅ viewport + host bio | **MERGE** | — | `feed/bodies.jsx` |
| 11 | Reel (in-feed) | ✅ 3/4 thumb | ✅ 4:5 + scrim + views | **MERGE** (4:5) | muonekano | bodies + CSS |
| 12 | Reels player | ❌ | ✅ full-screen | **DEFER → 2B** (Q3) | scope kubwa | — |
| 13 | Poll | ✅ bars + % + myVote | ✅ + check + "(Inaongoza)" | **MERGE** | ndogo | bodies + CSS |
| 14 | Announcement/Channel | ✅ TANGAZO + text | ✅ editorial + highlights + CTA 2 | **MERGE** (+highlights +CTA) | additive data | bodies + mock |
| 15 | Business post | ✅ (kind image + label) | ✅ product + CTA | **MERGE** (+CTA) | additive | bodies + mock |
| 16 | Hub post/event | ✅ (kind image + label) | ✅ banner + Jiunge | **MERGE** (+CTA) | additive | bodies + mock |
| 17 | Engagement | ✅ stats 2 + actions 4 | ✅ stats 3 + actions | **MERGE** (+shares 1) | Q — additive | FeedActions + mock |
| 18 | End-of-feed | ❌ | ✅ | **ADD** (mahali kimoja: FeedList) | halisi, ndogo | `feed/FeedList.jsx` |
| 19 | Channel discovery | ❌ | ✅ carousel + Fuata | **ADD** (Channels tab) | inafaa; data mpya ndogo | FeedList/channel section |
| 20 | Live sub-segments | ❌ | ✅ pills 3 | **ADD** (ndani ya Live tab; si row ya Home) | Rule 8 ✅ | FeedList/Live |
| 21 | Bottom nav | ✅ 5 | ✅ 5 (sawa) | **KEEP bila mabadiliko** | canonical tayari | `BottomNav.jsx` |
| 22 | Header | ✅ | ✅ (sawa) | **KEEP** | — | `Header.jsx` |
| 23 | Panels 10 + Sheet + Toast | ✅ | ❌ | **KEEP** (Stitch haina; ni existing-only) | preserve | `panels.jsx` |
| 24 | Media frame | ✅ tones 7 | ✅ photos | **KEEP** + polish | offline (Q2) | `ui.jsx` |
| 25 | Waveform | ✅ | ✅ graphic_eq | **KEEP** + reuse live room | — | `ui.jsx` |
| 26 | Style guide | ✅ `?guide=1` | ❌ | **KEEP** | existing-only | `StyleGuide.jsx` |
| 27 | Icons | ✅ SVG 44 | Material 85 | **KEEP + ADD 14** | library moja | `icons.jsx` |

> **Hakuna** `StitchFeedCard.jsx` / `PostCardV2.jsx` / `HomePostCard.jsx` — kila kitu ni **component moja
> yenye variants**, mahali pamoja (`src/components/`).

---

## 6. Missing components (Stitch-only → kuongezwa, kwa hierarchy)

| Kipaumbele | Component | Kwa nini |
|---|---|---|
| Foundation | Icons 14 (volume, tune→Sliders, grid_view→Grid, verified_user→Shield, celebration, headset_mic, graphic_eq, sensors, timer, calendar_add_on, open_in_new, repeat, mic_off, arrow_downward) | zinahitajika na visuals mpya; SVG moja |
| Navigation | *(hakuna mpya)* — bottom nav/tabs zipo | hazihitajiki |
| Layout | **Card framing** (decide Q1) | muonekano wa feed |
| Identity | Entity pills 5 (Chip tones) | uwazi wa identity |
| Content | End-of-feed · poll leading state · announcement highlights + CTA · business/hub CTA · live speaker row · reel 4:5 | vipengele vya content vinavyokosekana |
| Interaction | Follow pill ("Fuata") · shares stat · external-link button | interaction halisi |
| Specialized | View mode **Full screen** (mode 4) · live sub-segments · channel discovery | features ndogo zilizoainishwa na Stitch |

## 7. Existing-only (Stitch haina — HAZIONDOLWI)

Seam + services 6 + repositories 5 + mapper · feed model 8 kinds + TAB_RULES + deterministic scoring ·
filters 9 (hesabu kamili) · panels 10 · sheet/toast · taarifa (unread, filters, join) · wasifu ·
saved · feed prefs · content prefs · style guide · guide page · fonts self-hosted · devlink ·
tests (smoke 92, shots 69) · screenshots 52 · history/reports.

## 8. Assets & icons

| Kipengele | Matokeo |
|---|---|
| Assets za Stitch | picha **87** (URL 87 za kipekee, duplicates **0**), fonts 2 (Inter via Google), icon font 1 (Material Symbols) — **zote za nje** |
| Assets za kunakili | **0** (hakuna faili za asset kwenye Stitch) |
| Uamuzi | **Hakuna asset inayoingizwa**; MediaFrame placeholders zinaendelea (Q2) |
| Icons | Twiga moja: SVG zetu (44) + **14 mpya** — hakuna kuchanganya na Material Symbols |
| Duplicate assets | **0** |

## 9. Rule compliance (Rules 1–12 za agizo)

| Rule | Hali |
|---|---|
| 1 No code before audit | ✅ audit hii |
| 2 Preserve architecture | ✅ seam inabaki; UI haitagusana na mock.js |
| 3 Stitch ≠ source of truth | ✅ tulinganisha kwa hoja (§4, §5) |
| 4 Nothing important disappears | ✅ §7 |
| 5 No duplicate component systems | ✅ canonical table §5.2 |
| 6 One canonical home | ✅ kila component mahali kimoja (`src/components/`) |
| 7 One feed system | ✅ feedService mmoja; Stitch = visuals pekee |
| 8 ONE primary Home row | ✅ tunabakiza; filters = popover (Stitch nayo ni popover `hidden`) |
| 9 View Mode | ✅ control moja; modes 4 kwa kuongeza "Full screen" |
| 10 Content filter | ✅ control moja; chips ndani ya popover |
| 11 Bottom nav 5 | ✅ haibadiliki |
| 12 No SokoHai/GuardHai/ChatHai | ✅ hakuna |

## 10. Change plan (Stage 3–10)

| Stage | Kazi | Faili (msingi) | Uthibitisho |
|---|---|---|---|
| **3. Design tokens** | Hakuna rangi mpya; radius 16 kwa kadi; hairline discipline; (Q1) framing | `tokens.css`, `components.css` | build · smoke · shots za kurasa zisizo-Home 0.000% |
| **4. Foundation** | Icons 14 · Chip tones 5 (entity pills) · button tones · MediaFrame scrim/4:5 | `icons.jsx`, `ui.jsx`, CSS | build · guide (`?guide=1`) screenshot |
| **5. Home components** | StatusRow polish · HomeTabs (utilities ndani ya mstari, sticky) · CreateArea context · FeedItem header pill · bodies (poll leading, announcement highlights+CTA, business/hub CTA, live speakers, reel 4:5) · FeedActions (+shares) · FeedList (end-of-feed, live sub-segments, channel discovery) | `home/*`, `feed/*`, mock (additive) | build · smoke (+checks mpya) · shots (+assertions mpya) · console 0 |
| **6. Navigation & controls** | Filter popover = chips · View mode 4 modes + Full screen behavior | `panels.jsx`, `mock.js`, CSS | build · smoke · shots |
| **7. Responsive** | Mobile 390 · tablet 834 · desktop 1280: hakuna duplicates za pages; max-width ya kadi | CSS | screenshots 3 breakpoints |
| **8. Integration** | Home + shared primitives pekee; kurasa zisizoguswa zithibitishwe | — | pixel diff |
| **9. Cleanup** | Ondoa lililo *proven* obsolete pekee (mfano CSS `.psh-feedghost`) — kila kitu kingine kinabaki | CSS/js | build · smoke · shots |
| **10. Verification** | Bateri kamili + ripoti ya mwisho (sehemu 10 za agizo) | — | build · smoke · shots · pixel diff · console 0 |

**Regression rule:** kila stage inaendesha `npm run build` + `npm run smoke` + `node scripts/shots.mjs`;
kurasa zisizo-Home lazima zibaki **0.000%** hadi pale mabadiliko yanapokusudiwa.

## 11. Maamuzi yanayohitaji owner (kabla ya Stage 3)

| # | Swali | Mapendekezo |
|---|---|---|
| **Q1** | Muonekano wa kadi za feed: (a) **Card-lite**: white + hairline border + radius 16, hakuna shadow — bg inabaki nyeupe; (b) **Stitch kamili**: kadi + `shadow-sm` juu ya bg `#F7FAF9`; (c) **Baki tambarare** (dividers) | **(a) Card-lite** — inachukua framing ya Stitch bila "huge cards/shadows" |
| **Q2** | Media: (a) **placeholders zetu** + polish; (b) hamisha picha 87 ziwe local; (c) chache (6–8) za demo | **(a)** — offline, hakuna hatari ya hakimiliki, ZIP ndogo |
| **Q3** | Reels tab: (a) boresha reel card + tab; **player kamili = Phase 2B**; (b) jenga player sasa | **(a)** |
| **Q4** | Mwendo wa utekelezaji: (a) Stages 3–10 mfululizo + ripoti moja; (b) simama baada ya **Stage 5** (Home ikamilike) unioneshe, kisha 6–10; (c) simama baada ya kila stage | **(b)** — inaheshimu "kila hatua ionyeshwe" |

---

## Apendix A — Feature checklist ya Stitch → destination

| Feature ya Stitch | Destination |
|---|---|
| Status states (own/live/video/gold/viewed) | StatusRow (Stage 5) |
| Filter popover chips | FilterMenu (Stage 6) |
| View mode 4 (Full screen) | ViewModePanel + mock (Stage 6) |
| Live sub-segments | FeedList/Live (Stage 5) |
| Live audio room (waveform/speakers/attendees) | LiveActivityBody (Stage 5) |
| Live video card (badges/sound/chat snip) | live body mode Video (Stage 5) — chat snip = **2B** |
| Scheduled live (guest mosaic + Kumbusha) | live body state `upcoming` (Stage 5) |
| Replay card (Tazama Marudio) | live body state `replay` (Stage 5) |
| Channel broadcast (highlights + CTA 2) | AnnouncementBody (Stage 5) |
| Sports fixture card (VS) | announcement variant (Stage 5, data additive) |
| News card + external link | announcement variant + IconOpenInNew (Stage 5) |
| Channel discovery carousel | Channels section (Stage 5) |
| Friends composer prompt | CreateArea context variant (Stage 5) |
| Friends poll/event (Nitakuwepo/Sitaweza) | poll + event body (Stage 5) |
| End-of-feed ("Umesoma yote kwa leo!") | FeedList (Stage 5) |
| Reel player + rail + scrubber + next teaser | **Phase 2B** (Q3) |
| Floating live prompt CTA | **Phase 2B** (ni campaign surface) |
| View Mode board variants 2–4 | Rejea tu (`docs/`) — control ni variant 1 |

## Apendix B — Icon gap (14)

`volume_up` · `tune`(=Sliders ✅) · `grid_view`(=Grid ✅) · `verified_user`(=Shield ✅) · `celebration` ·
`headset_mic` · `graphic_eq`(=Waveform ✅) · `sensors` · `timer` · `calendar_add_on` · `open_in_new` ·
`repeat` · `mic_off` · `arrow_downward` · `music_note` · `podcasts` · `sentiment_satisfied` · `replay`(=Refresh ✅)

> Alama ✅ = tayari tunayo kwa jina lingine. Mpya halisi: **~14**.
