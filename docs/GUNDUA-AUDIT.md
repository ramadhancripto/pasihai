# PASIHAI — GUNDUA (Discover) AUDIT — Stage 1

**Tarehe:** 2026-10-07 · **Aina:** audit kabla ya coding (hakuna code iliyobadilika)
**Lengo:** kuweka **Gundua = safu ya UGUNDUZI** ndani ya architecture iliyopo — bila engine ya pili ya Friends,
Chat, Business, Community, Hub, Channel, Network/Relay au Home feed.

---

## A. Stitch files (chanzo cha **visual/UX** pekee)

| Faili | Screen | Kile muhimu (UX) |
|---|---|---|
| `code.html` + `screen.png` | **Gundua — Inbox ya ugunduzi (mobile)** | Header `Gundua` + search · chips: **Yote · Watu & Marafiki · Public Hubs & Vikundi · Karibu Nami** · banner **Faragha Kamili ya PASIHAI** ("vilivyoidhinisha kuonekana wazi pekee") · `Watu Unaoweza Kuwafahamu` (Omba Urafiki · Wasifu) · `Public Hubs za Eneo Lako` ("eneo la jumla, sio ruhusa ya siri") · `Vikundi vya Wazi Vinavyovuma` · nota: **vikundi vya kibinafsi havionekani** · CTA `Kitabu cha Simu` |
| `code (1).html` + `screen (2).png` | **Gundua — desktop (Watu & Jumuiya za Wazi)** | Search · chips **Yote · Watu & Marafiki · Public Hubs · Jumuiya za Wazi** · banner **ULINZI WA FARAGHA / PASIHAI Shield** ("namba za simu zimefichwa") · watu 3 (Omba Urafiki · Wasifu · moja **Rafiki** → Anza Chat) · **Public Hubs** (2, pamoja na `+18 marafiki zako wamo`) · **Vikundi vya Wazi** (Baiskeli Dar es Salaam · 420 · safari ijayo) · nota ya vikundi vya faragha |
| `code (3).html` + `screen (4).png` | **Biashara za Karibu (mobile)** | Kategoria za haraka (Vyakula · Maduka · Huduma · Afya · Wataalamu) · `Masafa ya Gundua: Karibu nami` · `Zilizofunguliwa Sasa (18)` · kadi za biashara (umbali · ★ rating · "Imefunguliwa hadi saa 4:00 usiku" · bidhaa pendwa · TSh) · **Matoleo na Ofa za Karibu** (PUNGUZO 15% · namba ya ofa) · **ramani** (Fungua Ramani) · nota ya faragha (Zero-Leak) |
| `code (5).html` + `screen (6).png` | **Biashara — desktop** | `Gundua Eneo` · `Uhakiki Halisi` (verified) · chaguo la mwenyeji · bidhaa + bei · ofa ya leo · map full-width (vituo 48, radius) |
| `code (7).html` + `screen (8).png` | **Mtandao wa Umma (mobile)** | Header `Mtandao wa Umma` + `Tanzania Nzima` · **modules za ugunduzi**: `Mchanganyiko · Friends · Channels · Live · Biashara · Watu · Vikundi · Hubs · Jumuiya · Ongeza Rafiki` · Live rail (LIVE · 840 watazamaji) · `Zilizo Karibu Nawe` (biashara zilizothibitishwa) · `Jumuiya na Hubs za Wazi` · `Watu Unaoweza Kuwafahamu` · `Channels za Kipekee` |
| `code (9).html` + `screen (10).png` | **Lango Kuu la Jamii (desktop)** | `Mchanganyiko Mkuu` (48 zinazovuma · +18 wapya) · modules: Biashara · Watu & Marafiki · Vikundi vya Umma · Nafasi za Kazi · Matukio · Eneo Lako · biashara za karibu (kadi tajiri) · **kumbi za moja kwa moja** (HEWANI · 312 wanasikiliza) · `Watu Unaoweza Kuungana Nao` (Kutoka Orodha ya Simu) |
| `code (12).html` | **Live / Anzisha (variant)** | `LIVE` · `HEWANI` · Live cards na categories |
| `code (10).html`, `code (6).html`, `code (8).html` | Home/live variants zilizotumika awali | Marudio ya modules zilezile (hayabadilishi IA) |

**Visual intent (Stitch):** clean, light, informasi; pills nyingi; Material Symbols; **kadi za biashara tajiri** (kadi · bei · ofa · uhakiki);
banners za faragha; chips za kichujio juu.
**Uamuzi wa PASIHAI:** tunachukua **IA/UX hii** (modes, sections, filters, privacy) — lakini **visual inajengwa upya** kwa
lugha ya PASIHAI (green-led, kadi tofauti kwa kila entity, hakuna Material Symbols, hakuna pill overload, hakuna
WhatsApp-like rows). Mwongozo wa mtumiaji: *"If the PASIHAI logo were removed, would this still look like WhatsApp? If yes → redesign."*

---

## B. Ramani ya project iliyopo (kile kinachotumika)

| Kilichopo | Mahali | Kitumike kwa |
|---|---|---|
| `Sheet` + mrundi wa panels (Esc · focus restore) | `components/Sheet.jsx` | Filters · entity details · Add Friend · Search |
| `useAsyncData` (seam MOJA ya data) | `hooks/` | Data zote za Gundua |
| Entities: `users` (friend · channel · hub · business · creator) | `data/mock.js` + `identityRepository` | Watu · Channels · Hubs · Biashara — **vyanzo vikanoniki** |
| `liveSessions` (state: live/upcoming/replay) | `mock.js` (+ Home Live tab) | **Live** ya Gundua (chanzo kimoja) |
| `chatRepository` (`getPhoneBook` · `startDirect` · `createGroup`) | `data/repositories/chatRepository.js` | `Kutoka Orodha ya Simu` · "Wasiliana kwa Chat" · "Jiunge na Kikundi" → **Chat iliyopo** |
| Icons (60) + tokens + typography | `components/icons.jsx` · `styles/tokens.css` | Gundua inaongeza icons 7 pekee (People · PersonSearch · PersonAdd · Group · Star · Tag · Qr) |
| `.psh-main--wide` (desktop wide canvas) | `shell.css` + `App.jsx` | Desktop ya Gundua (grid ya sections) |
| `.psh-chip` · `.psh-menu` · `.psh-kv` · `.psh-panelstack` · `Switch` · `Chip` | `ui.jsx` · `panels.jsx` | Panels zote za Gundua |
| Placeholder ya `gundua` (`upNext.gundua`) | `PlaceholderPage` · `mock.js` | **Inabadilishwa** na ukurasa halisi (Chat ilivyofanyika) |

---

## C. ONE discovery layer — hakuna mifumo ya pili

| Uamuzi | Maelezo |
|---|---|
| **Service MOJA** | `gunduaService.js` (application layer) + `gunduaRepository.js` (mock). Hakuna `DiscoverFriendsService`, `DiscoverBusinessService`, n.k. |
| **Entities vikanoniki** | Gundua **haitengenezi** watu/biashara/channels/hubs/jumuiya mpya — inasoma `users` (identity) + `liveSessions`; inaongeza `gunduaPublicGroups` (vikundi vya umma vya kugundua — bado ni **vitu vya Chat** vinavyoundwa kwa `chatRepository.createGroup`) |
| **Friends** | Relationship ya **Chat/identity** ileile (`users[].type === 'friend'`). Gundua inaonyesha **hali** (Omba Urafiki · Ombi Limetumwa · Rafiki · Kubali/Kataa) — hakuna Friends page ya pili, hakuna "mutual friends" count (⛔ Facebook model) |
| **Chat** | Kitufe chochote cha mazungumzo kinatumia `chatRepository.startDirect()`; "Jiunge na Kikundi" kinaunda conversation kwa `chatRepository.createGroup()` → **mfumo uleile wa Chat** |
| **Business** | Kadi za biashara ni **ugunduzi**; ukurasa wa biashara unaonyesha taarifa za umma tu. Hakuna business app ndani ya Gundua |
| **Community / Hub / Channel** | Gundua inaonyesha **umma** pekee; usimamizi unabaki **Spaces**. Hakuna admin UI hapa |
| **Network / Relay / Sync** | **Hakuna** kwenye Gundua (agizo: "Do not add Network/Relay/Sync/System controls here") |
| **Home** | Mchanganyiko **si** feed: sections za ugunduzi (kadi), si orodha ya posts |

---

## D. Privacy model (msingi wa Gundua)

1. Kila entity ina `visibility: 'public' | 'private'` (au `discoverable: true|false`).
2. `gunduaRepository` inarudisha **public pekee** kila wakati (`discoverableOnly()` filter ndani ya repo).
3. **Eneo = relevance, si ruhusa.** `Karibu Nami` + distance huchuja **ndani ya** public only — kamwe haifunui private.
4. Namba za simu hazionyeshwi kwenye Gundua (isipokuwa utafutaji wa namba uliofanywa na mtumiaji mwenyewe kwa idhini — Chat flow).
5. Eneo halisi halionyeshwi; `distance` ni takwimu ya jumla (k.m. "1.4 km").
6. Private registry (`gunduaPrivateEntities`) inaishi kwenye mock **kwa majaribio pekee** — smoke inathibitisha **haitokei kamwe** kwenye list yoyote, hata kwa `Karibu Nami`.

---

## E. Filters — model wa "WHAT / ABOUT / WHERE / WHEN / RELATIONSHIP"

| Kundi | Chaguo |
|---|---|
| **Shughuli na Mada** (multi) | Kijamii · Kiuchumi · Elimu · Afya · Siasa (neutral) · Dini · Michezo · Kilimo · Teknolojia · Burudani · Utamaduni · Mazingira · Ustawi wa Jamii · Huduma za Umma · Ubunifu · Kazi na Ajira · Biashara |
| **Eneo** | Karibu Nami · Eneo Nililochagua · Mji · Mkoa · Nchi · Global · Online + **masafa** (100 m · 1 km · 5 km · 10 km · 25 km · 45 km+) |
| **Wakati** | Live sasa · Leo · Upcoming · Wiki hii · Mwezi huu |
| **Mahusiano** (muktadha pekee) | Friends · Not Friends · Following · Joined · New to Me |
| **Biashara** | Kategoria (Vyakula · Maduka · Huduma · Afya · Wataalamu) · Availability (Open Now) · Offers (Ofa/Zipya) |
| **Live** | Live Now · Kategoria · Eneo (Nearby · Selected · Online) |

**Kanuni:** `getFilterSchema(mode)` inarudisha **vikundi vinavyohusika pekee** (progressive disclosure); Apply · Clear All · Back;
`activeCount` inaonekana kwenye kitufe cha Vichujio + mstari mfupi wa muhtasari (hakuna rangi ya chips daima).

---

## F. Awamu (§29-style)

| Awamu | Kazi |
|---|---|
| 1 | Data: `gunduaRepository` + `gunduaService` + mock (public/private · filters · friend states) + verify |
| 2 | Ukurasa: header + search + modules 4 + kategoria + Mchanganyiko sections (mobile/tablet/desktop) |
| 3 | Modes: Biashara (Eneo · Zilizofunguliwa · Ofa · ramani) · Watu/Friends (+Add Friend + states) · entity panels |
| 4 | Vikundi · Hubs · Jumuiya · Channels · Live · Search · **Filters panel** · integration (Chat · join) |
| 5 | Tests (smoke + shots) · picha · gallery · ripoti |

**STOP conditions:** hakuna iliyotimia — hakuna component iliyopo inafanya kazi hii (Gundua ni placeholder);
build/smoke 276/276 · shots 214/214 zilipita kabla; hakuna destructive refactor; hakuna backend inayohitajika.
