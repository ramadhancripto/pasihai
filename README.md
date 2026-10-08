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
  Home (Kutazama) · Chat (Mawasiliano) · Gundua (Kugundua) · Spaces (Kushiriki) · Business (Kuendesha)
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
| `productInfoService` | taarifa za kurasa za Chat/Gundua/Spaces/Business |
| `feedService` | mkondo wa Home (tab · kichujio · mpangilio deterministic · channels zinazopendekezwa) |
| `gunduaService` | ugunduzi (modes · kategoria · vichujio vya mode · friends view · biashara · live · panels) |
| `chatService` | mazungumzo (Inbox · Direct · Vikundi · New Chat · Requests · hali za local/offline/sync) |

Ramani kamili: `docs/PHASE-1-REPORT.md` · plan: `docs/PHASE-1-PLAN.md`

### UI polish (realistic refinement)

Pass ya polish juu ya muonekano uliopo: hierarchy ya buttons (primary · secondary · **done** ·
ghost · icon) · identity tabaka tatu (**ROLE** pill · **RELATIONSHIP** meta · **ACTION** kwa aina
ya entity) · status compact (64px) · media scrim/badges · live speakers · **Spaces icons**
(Hub · Jumla · Spaces · Shield · Megaphone) · bottom nav touch 44px + kionyeshi active ·
skeleton + fade ya mkondo. Ripoti: `docs/UI-POLISH-REPORT.md` · picha: `docs/review/polish/`.

### UI polish — mzunguko wa 2 (Spaces · density · urembe)

`IconSpaces` sasa = **watu watatu** (kama Stitch) · mstari wa **muktadha wa tab**
(`homeTabs[].meaning` → `FeedList` → `.psh-feed__context`) · **density**: `--card-gap` 12→10,
strip/tabs/create/feed/end/discover/kurasa zimepunguzwa 10–25% · **urembe**: primary shadow,
hali ya “imekamilika” kijani tulivu (`--c-green-soft-2`), typecards zenye kichwa kimoja.
Ripoti: `docs/UI-POLISH-2-REPORT.md` · picha 17 `docs/review/polish/` + `gallery.html`.

### Safu ya mfumo — top system components (Data Saved · System · Relay · Sync · Nearby)

Vitendo viwili vya kudumu kwenye header: **💾 Data Saved** (`DataSavedIndicator`) na
**⇄ System** (`SystemQuickButton`). Panel moja ya mfumo yenye vitendo vya **muktadha**:
Relay · Nearby · Sync · Save Offline · Share Nearby · Activity — hali 6 za kifaa
(`ONLINE · LIMITED · LOCAL · OFFLINE · WAITING_SYNC · SYNCING`), foleni ya vitendo
(waiting · sending · synced · failed), idhini ya relay ya internet (default: haijaruhusiwa),
na **composer MOJA** ya chapisho (uwasilishaji = metadata: Local only · Nearby · Community · Global).
Bottom nav inabaki **5**.

**Sera ya Internet Relay (2026-10-07):** Internet Relay = **ujumbe mfupi pekee** (maandishi · metadata ·
uelekezaji mdogo) — video · picha · sauti · hati · PDF · ZIP · viambatisho **haziruhusiwi** (hakuna vighairi).
Ukomo wa lazima **5 MB/siku** (default 3 MB; 3 au 5 pekee; zaidi ya 5 inakataliwa) · ujumbe mmoja ≤ 32 KB ·
**OFF kwa default** (idhini ya wazi) · ukomo ukifikiwa: *Internet Relay paused* — hakuna trafiki zaidi ·
hakuna kugeuka internet kimya kimya. **Local Mesh** (Wi-Fi Direct · Bluetooth · Wi-Fi ya karibu) hubeba
content kubwa bila data ya simu. **Relay Data Used ≠ Data Saved** (vipimo viwili tofauti). Ripoti: `docs/TOP-SYSTEM-COMPONENTS-REPORT.md` ·
audit: `docs/SYSTEM-COMPONENT-AUDIT.md` · picha 21: `docs/review/system/gallery.html`.

### Chat — mfumo MMOJA wa mawasiliano (2026-10-07)

Chat ni **destination ya pili** kwenye bottom nav (`Home | Chat | Gundua | Spaces | Business`) — jina rasmi **Chat**
(neno "Soga" halitumiki tena). Mfumo **mmoja**: `conversation.type` = `direct` | `group`; community/hub ni
`parentContext` (metadata), **si** type. Hakuna `DirectChatService`/`GroupChatService`, hakuna account system ya pili,
hakuna engine ya pili ya ujumbe.

- **Inbox:** kichwa `Chat` + hali ya Sync + Search + ⋮ pekee (hakuna account icon) · chips za hali · vichujio
  **Zote · Direct · Vikundi · Haijasomwa** · orodha (direct · vikundi · vikundi vilivyounganishwa na community/hub) · FAB `New Chat`.
- **Thread:** bubbles zote (text · reply · reactions · sauti · picha/video · hati · eneo · shared posts/reels · kura ·
  tangazo) · **composer MOJA** · vitendo vya ujumbe (`long-press` au kitufe ⋯ → sheet ileile) · swipe → jibu.
- **Background ya mazungumzo = rangi MOJA safi** (hakuna dots/pattern/wallpaper/gradient). Rangi: outgoing green
  `#18A982`-family + maandishi meupe · incoming uso mweupe + hairline.
- **New Chat:** Saved Friends → PASIHAI Friends → mawasiliano ya simu → **namba** (lookup kesi 4) · **Requests**
  (Kubali → conversation ya kawaida · Kataa kimya kimya · Zuia) · **New Group** (jina · picha · wanachama).
- **Hali za local/offline/sync zinatoka safu ya System ileile:** ONLINE → synced · LOCAL → Local Mesh · LIMITED/WAITING_SYNC →
  relayed (ujumbe mfupi) au foleni · OFFLINE → *Imehifadhiwa (Offline Vault)* + foleni ileile ya Sync.
- **Sera ya relay inaendelea:** media haipiti Internet Relay (maandishi pekee); guard inatoa njia 3 (Local Mesh · Data yako · Wi-Fi)
  na **hakuna** kubadili njia kimya kimya.
- **Responsive:** simu (inbox ↔ mazungumzo) · desktop **panes mbili** (orodha | mazungumzo, upana 1160px) · a11y: labels · 44px · focus ring · focus restore.

Code: `services/chatService.js` · `data/repositories/chatRepository.js` · `components/chat/` ·
`styles/chat.css` · mock: `data/mock.js` (sehemu ya CHAT). Audit: `docs/CHAT-AUDIT.md` · ripoti: `docs/CHAT-REPORT.md` ·
picha 28: `docs/review/chat/gallery.html`.

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
