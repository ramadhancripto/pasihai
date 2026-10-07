# Pasihai — Home UI Prototype

Frontend prototype ya **PASIHAI**, jukwaa la kijamii lenye **mawasiliano kwanza**
(communication-first). Hii ni UI pekee — **hakuna backend, database, authentication,
real-time, mesh, payments au production APIs.**

---

## Hali ya sasa

| Hatua | Kazi | Hali |
|---|---|---|
| **0** | Msingi: design tokens, typografia, icons, primitives, mock data | ✅ Imekamilika |
| **1** | App shell: header, bottom nav (5), kurasa za placeholder, panels | ✅ Imekamilika |
| **1b** | Foundation seams: application/data layer (UI → service → repository) | ✅ Imekamilika |
| 2 | Home mkondo: feed, identity system, aina za content | ⏳ Inafuata (inasubiri idhini) |
| 3 | Reels · Friends · Channels · Live kama tabs kamili | ⏳ |
| 4 | Muonekano unaathiri mkondo kweli (Automatic/Vertical/Horizontal) | ⏳ |
| 5 | Story/Status viewer kamili | ⏳ |
| 6 | Responsive polish + QA ya mwisho | ⏳ |

Ramani kamili iko kwenye `ROADMAP.md`.

---

## Kuendesha

```bash
cd pasihai
npm install
npm run dev        # http://localhost:5173
```

Zana za maendeleo (si lazima):

```bash
npm run build            # build ya production
npm run smoke            # render + architecture guard + contract checks (43 checks)
node scripts/shots.mjs   # UI verification: DOM assertions + screenshots (inahitaji dev server)
```

> Kidokezo: `http://localhost:5173/?guide=1` inafungua **Msingi wa Muonekano**
> (design tokens, typografia, icons, components zote).

---

## Kilichojengwa (Hatua 0 + 1)

### Design system (`src/styles/`)
- `tokens.css` — rangi, typografia, nafasi, radius, vivuli (hakuna rangi iliyo
  "hardcoded" kwenye components)
- `base.css` — reset, hierarchy ya typografia, focus states, `prefers-reduced-motion`
- `components.css` · `shell.css` · `home.css` · `panels.css` · `placeholder.css` · `guide.css`
- Fonts za **Inter** na **Inter Tight** zimewekwa ndani ya project
  (`public/fonts/`) — prototype inafanya kazi bila internet.

### Components (`src/components/`)
- `Wordmark` — `Pasi` (green) + `hai` (blue), 22px / Semi Bold, si oversized
- `Avatar` — rounded-square kwenye feed, mviringo kwenye Status; rangi za tone zilizochaguliwa
- `Identity` — mstari mmoja wa uthabiti: avatar, jina, **aina ya uhusiano**, muda
- `EntityBadge` — Channel (bluu), Hub, Biashara, Mbunifu
- `MediaFrame`, `Waveform`, `Segmented`, `Dropdown`, `CheckRow`, `Switch`, `Sheet`
- `icons.jsx` — seti ya icons za mstari mmoja (viewBox 24, stroke 1.7)

### Shell
- **Header:** `Pasihai` kushoto · 🔔 👤 ⋮ kama group moja compact kulia (nafasi sawa)
- **Bottom nav — destinations tano pekee:**
  Home (Kutazama) · Soga (Mawasiliano) · Gundua (Kugundua) · Spaces (Kushiriki) · Business (Kuendesha)
- **Desktop:** bottom nav inakuwa rail iliyoelea katikati chini — si mobile iliyonyooshwa

### Home (muundo)
- **Status/Stories:** `＋ Status Yako`, pete za viewed/unviewed, badge ya video,
  horizontal scroll **huru** (skrini hadi skrini)
- **Tabs tano:** Mchanganyiko · Reels · Friends · Channels · Live (Mchanganyiko = default)
- **Kichujio cha maudhui:** compact dropdown (Zote · Video · Picha · Machapisho · Reels ·
  Sauti · Kura · Live · Matangazo) — si tabs za ziada
- **Create:** `[DP] Nini kinaendelea?` + Picha · Video · Chapisho · Reel · Live
- **Mstari wa hali:** "Unatazama: Mchanganyiko · Zote · Automatic" — inafanya hali
  ionekane bila kujaza skrini

### Panels (zote zinafanya kazi kwa data ya majaribio)
- **Taarifa** — Zote/Mpya, badge za aina, kubofya kunafungua wasifu
- **Wasifu/Akaunti** — stats zinaonyesha aina mbalimbali za uhusiano; mtumiaji
  mwenye **followers 0** anapata uzoefu kamili (hakuna lawama kwenye UI)
- **Unda** — Chapisho, Picha, Video, Reel, Story, Status, Live, Kura
- **Menyu ya Home** (⋮ pekee): Muonekano · Mapendeleo ya mkondo · Mapendeleo ya maudhui ·
  Zilizohifadhiwa · Kuokoa data (switch) · Sasisha · Mipangilio
- **Muonekano** — Automatic / Vertical / Horizontal Full Scroll (radio + kielelezo cha mwelekeo)

---

## Application / Data Layer (Phase 1 — Foundation Seams)

UI **haitumii** `src/data/mock.js` moja kwa moja. Mzunguko ni:

```
Components / Pages
      ↓
  hooks/useAsyncData.js          Application State
      ↓
  services/*Service.js           Application Services
      ↓
  data/repositories/index.js     Composition root  ← SWAP POINT
      ↓
  data/repositories/*.js         Contract + Mock implementation
      ↓
  data/mock.js                   Demo data
```

Kubadilisha chanzo cha data baadaye (Local DB / Firebase / Sync) = kubadilisha
**mistari ya `data/repositories/index.js` pekee** — hakuna UI inayobadilika.

| Service | Inatoa |
|---|---|
| `homeService` | tabs + filters + safu ya Status (na entity) |
| `accountService` | mtumiaji wa sasa, wasifu, directory |
| `settingsService` | view modes, mapendeleo ya mkondo |
| `notificationService` | taarifa (scope filter + unread count + join) |
| `productInfoService` | taarifa za kurasa za Soga/Gundua/Spaces/Business |
| `feedService` | mkondo wa Home (tab · kichujio · mpangilio deterministic · channels zinazopendekezwa) |

Ramani kamili: `docs/PHASE-1-REPORT.md` · plan: `docs/PHASE-1-PLAN.md`

### UI polish (realistic refinement)

Pass ya polish juu ya muonekano uliopo: hierarchy ya buttons (primary · secondary · **done** ·
ghost · icon) · identity tabaka tatu (**ROLE** pill · **RELATIONSHIP** meta · **ACTION** kwa aina
ya entity) · status compact (64px) · media scrim/badges · live speakers · **Spaces icons**
(Hub · Jumla · Spaces · Shield · Megaphone) · bottom nav touch 44px + kionyeshi active ·
skeleton + fade ya mkondo. Ripoti: `docs/UI-POLISH-REPORT.md` · picha: `docs/review/polish/`.

### Stitch UI integration (Stages 3–5)

Muonekano wa Stitch (mobile-first reference) umeunganishwa ndani ya architecture yetu:

- **Home tabs row mmoja** + utilities 2 (kichujio · muonekano) kwenye mstari ule ule.
- **Kadi-lite** za mkondo: white + hairline border + radius 16, hakuna shadow.
- **EntityPill** (Rafiki · Channel · Hub · Biashara · Mbunifu · Wewe) — identity pekee; relationship ni tofauti.
- **Status:** live badge + ring ya gold kwa creator.
- **Live:** pills za hali ndani ya tab (Inaendelea · Zilizopangwa · Zilizopita) + jukwaa la wasemaji.
- **Channels:** "Channels zinazopendekezwa" + Fuata. **Mwisho wa mkondo:** "Umesoma yote kwa leo!".
- Ripoti: `docs/STITCH-INTEGRATION-REPORT.md` · audit: `docs/STITCH-AUDIT.md`.

### Mkondo wa Home (Phase 2A — Feed Foundation)

```
Home.jsx → FeedList → feedService.getFeed({ tab, filter })
      ↓
  data/repositories/contentRepository.listFeed()
      ↓
  data/mappers/feedMapper.js  ←  data/mock.js (posts · reels · liveSessions)
```

- Home tabs **5** (Mchanganyiko · Reels · Friends · Channels · Live). Uanachama
  wa tab unahesabiwa kwa **sheria** (`TAB_RULES` kwenye feedService) — si kwa
  hand-tags zinazoweza kupingana.
- Mpangilio ni **deterministic**: relationship + recency + content-type + live state.
  ❌ Hakuna ML, analytics, behavior collection, wala "For You".
- Aina **8** za kipengele: `text · image · video · audio · poll · announcement ·
  liveActivity · reel`. Identity: person · friend · channel · hub · business · creator
  (`user.type` = identity pekee; relationship/visibility/permission ni tofauti).
- Live Activity ina shell yake (si post ya kawaida). Vikao vya Live havimo
  Mchanganyiko (vina tab yao).
- Ripoti: `docs/PHASE-2A-REPORT.md` · plan: `docs/PHASE-2A-PLAN.md`

---

## Kanuni zilizofuatwa

- ❌ Hakuna Hubs/Groups/People/Businesses/Nearby kama Home tabs — zipo Gundua/Spaces/Business
- ❌ Hakuna "For You" (Mchanganyiko ndiyo ya default)
- ❌ Channels ≠ chat; Hubs ≠ chat
- ❌ Hakuna hamburger, hakuna item ya sita kwenye bottom nav, hakuna side navigation
- ❌ Hakuna glassmorphism, gradients nyingi, dark dashboard, huge shadows, pill overload
- ✅ Gold (`#D4A72C`) inatumika kwa nadra: notification dot, tone moja ya avatar,
  chip ya "Hatua 1 imekamilika"
- ✅ Mtumiaji wa kawaida (marafiki 15, followers 0) ni raia wa daraja la kwanza

---

## Muundo wa faili

```
pasihai/
├── index.html
├── package.json · vite.config.js
├── public/fonts/            # Inter + Inter Tight (self-hosted)
├── src/
│   ├── main.jsx · App.jsx
│   ├── data/mock.js         # washiriki, status, feed, reels, live, notifications, menus
│   ├── components/
│   │   ├── icons.jsx · ui.jsx · Wordmark.jsx · Header.jsx
│   │   ├── BottomNav.jsx · Sheet.jsx · panels.jsx
│   │   └── home/  StatusRow.jsx · HomeTabs.jsx · CreateArea.jsx
│   ├── pages/     Home.jsx · PlaceholderPage.jsx · StyleGuide.jsx
│   └── styles/    tokens · base · components · shell · home · panels · placeholder · guide
├── scripts/       smoke.jsx · shots.mjs
└── docs/shots/    # screenshots za QA (mobile, tablet, desktop)
```

---

## Kile ambacho KIKO WAZI kwa Hatua 2+

1. Mkondo wa kweli wa Home (feed) na aina zote za content
2. Identity system ndani ya feed + separation ya hila (si giant cards)
3. Tab za Reels / Friends / Channels / Live kwa utambulisho wao
4. Muonekano (Automatic/Vertical/Horizontal) ukiathiri mkondo kwa kweli
5. Story/Status viewer kamili
6. Responsive polish + QA ya mwisho

---

## Uchaguzi wa kiufundi

- **React 19 + Vite** — component-based, rahisi kupanua kuelekea production
- **CSS ya kawaida yenye tokens** — hakuna Tailwind/CSS-in-JS ili muundo ubaki wazi
  na rahisi kusoma kwa timu yoyote
- **Hakuna library ya icons** — SVG zetu wenyewe ili tupate uthabiti kamili
- **Self-hosted fonts** — prototype inafanya kazi bila internet
