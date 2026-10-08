# PASIHAI — CHAT AUDIT (Stage 1) · Stitch ↔ Architecture

**Tarehe:** 2026-10-07 · **Aina:** audit kabla ya coding (hakuna code iliyobadilika)
**Lengo:** kuweka **Chat System** ndani ya architecture iliyopo — ONE communication system —
bila kuunda navigation ya pili, account system ya pili, wala engine ya pili ya ujumbe.

---

## A. Stitch files zilizotolewa (chanzo cha **visual/UX** pekee)

| Faili | Screen | Kile muhimu |
|---|---|---|
| `code.html` + `screen.png` | **Chat Inbox** | App bar: `Chat` + hali `Sync` + `⚡ Lite 84% saved`; chips: `Online · Data Saved 14MB · Imesawazishwa`; tafuta; chips za kichujio: **Zote · Direct · Vikundi · Haijasomwa**; orodha: Direct (Amina Mussa · RAFIKI), Group (Madaktari Class · KIKUNDI), Group+Community (Wakulima Dar · `Wakulima Tanzania`), Creator, Hub; badges za unread; FAB compose |
| `code (5).html` + `screen (6).png` | **Inbox** (lahaja) | Zote/Direct/Vikundi/Haijasomwa; hint ya archive (`Imehifadhiwa (Kifaa & Wingu)` · `Sogeza kwa machaguo`); labels za relationship kwenye chips (KIKUNDI · Jumuiya · PASIHAI FRIEND · PASIHAI ACCOUNT); footer `Ujumbe umesimbwa mwanzo-hadi-mwisho`; `+ New Chat` |
| `code (1).html` + `screen (2).png` | **Direct Thread** | Header (back · jina · `Encrypted channel` · simu · ⋮); pills za hali; siku; bubbles za maandishi; **shared Home post**; **voice note** (waveform 0:14/0:38 + ❤1); **poll** (Kura ya Haraka · 4 zilipigwa); **location card** (Eneo la Moja kwa Moja · Dakika 8 zimebaki); ticks |
| `code (7).html` + `screen (8).png` | **Direct Thread** (local-first) | Tangazo la `Mtandao Hafifu · Local Mesh Imewashwa`; `Maelezo ya Data Saved (24.8 MB …)`; labels za ujumbe: `Local Mesh (Kupitia ukaribu)`, `Relayed (Maandishi yamefika)`, `Waiting for sync (Upo kwenye foleni ya kutuma)`, `Imehifadhiwa Kwenye Simu`, `Imehifadhiwa (Offline Vault)`; **media imezuiliwa**: `Inasubiri Wi-Fi au Data Kamili` + `Tuma sasa kwa Data Yako` / `Subiri Wi-Fi`; footer: `E2E · P2P Bluetooth & Wi-Fi Direct · Imesawazishwa` |
| `code (3).html` + `code (15).html` + `code (17).html` + `screen (4).png`, `screen (16).png` | **Conversation Detail / Requests** | `Ulinzi wa Ukaribu wa PASIHAI`; orodha ya contacts: `PASIHAI Friend · Saved` · namba iliyofichwa (`+255 784 ••• 120`) · `Tuma Ujumbe` · `Hifadhi kama Rafiki Binafsi`; `Si Rafiki` → `Omba Rafiki`/`Omba Mazungumzo`; `Hana Akaunti` → `Alika PASIHAI`; **Ulinzi wa Faragha** (chat requests): `Yaliyopokelewa 1 Mpya` / `Yaliyotumwa (2)` + `Kubali & Anza Mazungumzo` / `Kataa` / `Zuia` |
| `code (9).html` + `screen (10).png` | **Conversation Detail** | `Kikundi Kipya` · `Tafuta kwa…`; `MARAFIKI WALIOHIFADHIWA (3 VIP)`; `MARAFIKI WA PASIHAI (3 mtandao)`; `MAWASILIANO YA SIMU YENYE PASIHAI` (`Akaunti Zinazotambulika`) → `Tuma Ombi` / `Soga`; `WAALIKE PASIHAI (Bila akaunti bado)` → `Alika` |
| `code (11).html` + `screen (12).png` | **Phone lookup** | Ingiza namba + nchi (`+255`); matokeo 4: `Kesi 1` Saved Friend → `Anza Mazungumzo`; `Kesi 2` PASIHAI Friend → `Anza Mazungumzo` + `Hifadhi Rafiki`; `Kesi 3` account + `Si Rafiki` → `Tuma Ombi` + `Omba Rafiki`; `Kesi 4` `Hajajiunga na PASIHAI` → `Alika PASIHAI kupitia SMS`; `Ulinzi wa Faragha` |
| `code (13).html` + `screen (14).png` | **Group Thread** | Group identity (+48 wanachama · members preview); pinned banner (`Muhimbili Rotations`); `MSIMAMIZI`/`Mwanafunzi`/`Kiongozi` role labels; **reply quote**; **PDF attachment** (1.4 MB · PDF Doc + download) + reactions; **poll** (18 kura 42% / 24 kura 58%); `Audio imeandaliwa`; `CR Rep`; typing indicator `Dr. Kelvin anaandika`; footer `E2E` |
| `code (17).html` + `screen (18).png` | **Group + Community** | `COMMUNITY YA MSINGI · Spaces · Wakulima Tanzania` + `Funga Spaces`; **TANGAZO KUTOKA** community; reply context; **Hati Rasmi** PDF; mahindi 🍞 reactions; `Imechapishwa kutoka Spaces` (shared article); footer `Unachangia kwenye: Wakulima Dar (…)` |

**Visual intent (DESIGN.md + screens):** Modern clean minimalism + architectural borders ·
Inter · emerald `#18A982` / tint `#EAF8F3` / blue `#3B82F6` / gold `#D4A72C` ·
hairline `#E2E8F0` · radius 8 (bubbles/inputs) · 16 (cards) · 24 (sheets) · 999 (pills) ·
**background ya mazungumzo = rangi moja safi (hakuna dots/pattern/wallpaper/gradient)** ·
bubbles: outgoing = kijani kirefu + maandishi meupe, incoming = uso mweupe + hairline.

**Nav ya Stitch:** `Home | Chat | Gundua | Spaces | Business` — **item 5, hakuna ya sita**.
Stitch haina account icon kwenye Chat (account ipo kwenye Home/global).

---

## B. Ramani ya project iliyopo (kile kinachotumika)

| Kilichopo | Mahali | Kitumike kwa |
|---|---|---|
| `Sheet` (panel/stacks, Esc, focus restore) | `components/Sheet.jsx` | New Chat · New Group · Requests · Search · More/Settings |
| `useAsyncData` (hook MOJA ya data) | `hooks/` | Chat data zote |
| Tokens · icons (SVG 54) | `styles/tokens.css` · `components/icons.jsx` | Chat UI; icons 11 mpya zitahitajika (search/more/phone/attach/mic/send/check/double-check/pin/poll/location) — au zilizopo |
| Identity layer (Account · Friend · Role) | `accountService` · `identityRepository` · `mock.users/entityRoles` | PASIHAI Account + PASIHAI Friend; **haitengwi** mfumo mpya |
| System layer (connection · relay · mesh · queue · sync · activity) | `systemService` · `systemRepository` | Hali za chat: Online · Local · Waiting sync · Synced · Offline; **relay guard kwa media** |
| Saved content | `SavedPanel` (Zilizohifadhiwa) | **Haigusi** — Saved Friend ni dhana tofauti |
| Create flow (post) | `CreateArea` + `ComposerPanel` | **Haigusi** — composer ya ujumbe ni kazi tofauti (moja kwa Direct+Group) |
| Bottom nav 5 | `BottomNav.jsx` | `soga` → **`chat`** (jina la mtumiaji; **rename pekee**, si item mpya) |
| Placeholder pages | `PlaceholderPage.jsx` | Gundua · Spaces · Business zinabaki; `soga` placeholder **inachukuliwa na Chat halisi** |

---

## C. Uamuzi wa architecture (ONE communication system)

```
chatService  (application layer MOJA)
   └── conversation.type: 'direct' | 'group'
       └── parentContext: { type:'community'|'hub', label }   ← metadata, si engine ya pili
chatRepository (contract; mock leo → local DB/Firebase baadaye)
   └── mock.js: chatConversations · chatMessages · chatPhoneBook · chatRequests · chatMoreMenu
```

**Identity layers (hazichanganywi):**
```
Phone Contact (chanzo cha kifaa)  →  PASIHAI Account  →  PASIHAI Friend  →  Saved Friend
```
Saved Friend = **sifa (property)** kwenye contact/relationship — si entity mpya.
Phone number = njia ya kugundua; **si utambulisho wa umma** (inafichwa, `+255 784 ••• 120`).

## D. Hatari za duplication + dawa

| # | Hatari | Dawa |
|---|---|---|
| C1 | Nav ya pili / item ya 6 | `soga` → `chat` **rename**; nav 5 inabaki |
| C2 | Header ya Chat + account icon | Header ya ukurasa: `Chat` + search + ⋮ **pekee**; account iko kwenye header ya jumla ileile |
| C3 | Engine tatu (direct/group/community) | **`chatService` moja**; community/hub ni `parentContext` metadata |
| C4 | Composer ya pili kwa kila aina | **Composer MOJA** (text · attach · mic · send) kwa Direct + Group |
| C5 | Account/friends system ya pili | Reuse `identityRepository`/`users`; Saved/Phone ni tabaka kwenye contact model |
| C6 | Network/sync system ya pili ndani ya Chat | Reuse `systemService` (connection, relay guard, queue); hakuna network layer mpya |
| C7 | Chat search = Gundua | Search inatafuta **conversations · messages · watu** pekee; nota: ugunduzi uko Gundua |
| C8 | More menu = Spaces/Hub/Community management | More ni **Chat pekee**: settings · privacy · notifications · archived · requests · blocked · storage · mark all read |
| C9 | Stitch Tailwind/Material icons | Hatumii Tailwind CDN wala Material Symbols — CSS yetu + icons zetu |
| C10 | Background ya chat yenye pattern | Rangi **moja safi** (`--c-green-soft`); hakuna wallpaper/gradient |

**STOP conditions:** hakuna iliyotimia (hakuna component iliyopo inafanya kazi hii; build/smoke 184/184/shots 146/146 zilipita kabla; hakuna destructive refactor; hakuna backend inayohitajika).

---

## E. Mpango kwa awamu (§29)

| Awamu | Kazi |
|---|---|
| 1 | Nav `Chat` · Inbox · Direct Thread · Group Thread |
| 2 | New Chat (Saved Friends · PASIHAI Friends · phone contacts · lookup ya namba) |
| 3 | Chat Requests (kubali/kataa/zuia) · New Group |
| 4 | Chat Search · More menu · Chat settings |
| 5 | Muunganisho na safu ya System (local/offline/sync + relay guard kwa media) |

---

## F. Utekelezaji — matokeo (2026-10-07, baada ya code)

| Awamu | Hali | Faili/ushahidi |
|---|---|---|
| 1 · Nav `Chat` · Inbox · Direct · Group | ✅ | `BottomNav.jsx` (item `chat`) · `pages/Chat.jsx` · `components/chat/Thread.jsx` · picha 01–03, 10–11 |
| 2 · New Chat · lookup kesi 4 | ✅ | `ChatPanels.jsx` (`NewChatBody` · `lookupNumber`) · picha 12–14 |
| 3 · Requests · New Group | ✅ | `respondRequest` (accept → direct ya kawaida) · `createGroup` · picha 15–18 |
| 4 · Search · More · Settings | ✅ | `SearchBody` (si Gundua) · `MoreBody` (vitu 8 vya Chat) · picha 19–21 |
| 5 · Muunganisho na safu ya System | ✅ | `sendMessage` → `synced/local/relayed/waiting/vault` + foleni ileile; media guard §22 · picha 22–23, 29 |

**Lango:** build ✓ CSS 91.82 kB · JS 432.95 kB · smoke **276/276** · shots **214/214** · console **0** ·
picha **29** (`docs/shots/chat/`) · gallery `docs/review/chat/gallery.html` · ripoti `docs/CHAT-REPORT.md`.

**Kasoro zilizokamatwa wakati wa utekelezaji (zote zimerekebishwa):** bubbles zilipishana kwenye vikundi (grid → flex) ·
desktop pane ilikandamizwa (`.psh-main--wide` + `--col` 1160px) · kitufe ndani ya kitufe kwenye safu za watu ·
Back ilifunga panels zote (mrundi/stack) · media guard haikuwa na ujumbe wa kuunganisha (`createMediaMessage`) ·
`resolveMedia` ilirudisha `synced` kwa ujumbe wa relay (`setMessageState` sasa inatunza hali) · `soga` placeholders.

**Bado hakuna:** backend · Firebase/Auth/Firestore/Storage/Cloudinary · offline DB · sync engine · E2EE halisi ·
notifications · calls · persistence (in-memory store). Hii ni **prototype**.
