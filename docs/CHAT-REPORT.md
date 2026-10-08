# PASIHAI — CHAT SYSTEM · RIPOTI (§32)

**Tarehe:** 2026-10-07 · **Aina:** Prototype (UI + mock data) — **si production-ready**
**Agizo:** PASIHAI Chat System (§1–§32) · Stitch Chat = visual/UX pekee · mfumo **MMOJA** wa mawasiliano
**Ushahidi:** `npm run build` ✓ · `npm run smoke` **276/276** ✓ · `node scripts/shots.mjs` **214/214** ✓ · console **0** ·
picha **29** (`docs/shots/chat/`) · gallery `docs/review/chat/gallery.html` · audit `docs/CHAT-AUDIT.md`

---

## 1. Muhtasari

Chat imejengwa ndani ya architecture iliyopo — **hakuna** navigation ya pili, account system ya pili, wala engine ya pili ya
ujumbe. Kila kitu kinapita `chatService` → `chatRepository` → mock data, na hali za mtandao zinatoka kwenye **safu ya System**
ileile (`systemService` / `systemRepository`) ambayo ilijengwa kwa Internet Relay.

**Chat = jina rasmi la mtumiaji.** Neno "Soga" limeondolewa kwenye msimbo wote (nav, kurasa, maandishi) — limebaki historia
pekee kwenye docs za audit/awali.

---

## 2. Reuse — kile kilichotumika (hakuna kubuni upya)

| Kilichotumika | Faili | Matumizi ya Chat |
|---|---|---|
| `Sheet` (panels + stacks + Esc + focus restore) | `components/Sheet.jsx` | New Chat · New Group · Requests · Search · More · Settings · Privacy · Notifications · Archived · Blocked · Storage · Media guard · vitendo vya ujumbe |
| `useAsyncData` (seam moja ya data) | `hooks/useAsyncData.js` | Data zote za Chat (inbox, thread, panels) |
| `systemService` · `systemRepository` | `services/` · `data/repositories/` | Hali za connection · foleni ya Sync · Data Saved · Internet Relay policy · transports |
| `identityRepository` (models zilizopo) | `data/repositories/identityRepository.js` | Majina/roles za wanachama wa vikundi |
| Icons SVG moja | `components/icons.jsx` | +7 icons mpya (Send · Paperclip · Phone · Checks · Pin · Archive · Ban) = **61** |
| Tokens za PASIHAI | `styles/tokens.css` | Rangi, radius, spacing, fonts — hakuna token mpya ya rangi |
| `Chip` · `Switch` · `Waveform` · `.psh-menu` · `.psh-note` · `.psh-kv` · `.psh-panelstack` | `components/ui.jsx` · `panels.jsx` · CSS iliyopo | Panels zote za Chat zinaonekana kama sehemu ya app ileile |
| Header + BottomNav (persistent) | `components/Header.jsx` · `BottomNav.jsx` | Chat ni **destination**, si shell mpya |

---

## 3. Files — Modified · Created · Deleted

### CREATED (9)
| Faili | Kwa nini |
|---|---|
| `docs/CHAT-AUDIT.md` | Audit ya Stitch ↔ architecture kabla ya code (§4) |
| `src/data/repositories/chatRepository.js` | Contract + `mockChatRepository` (in-memory store) — mfumo mmoja wa ujumbe |
| `src/services/chatService.js` | Application layer MOJA (inbox · thread · send · media · requests · lookup · search · more) |
| `src/components/chat/ChatBits.jsx` | `ChatAvatar` · `Ticks` (delivery) · `MethodNote` (njia ya usafirishaji) |
| `src/components/chat/Thread.jsx` | Direct + Group thread: bubbles zote · composer MOJA · vitendo vya ujumbe |
| `src/components/chat/ChatPanels.jsx` | New Chat · New Group · Requests · Search · More · Settings · privacy · notifications · archived · blocked · storage · media guard |
| `src/styles/chat.css` | Chat UI (background rangi moja · bubbles · aina zote · desktop two-pane) |
| `docs/CHAT-REPORT.md` | Ripoti hii (§32) |
| `docs/review/chat/gallery.html` | Gallery ya ukaguzi (picha 29) |

### MODIFIED (9)
| Faili | Mabadiliko (minimum) |
|---|---|
| `src/data/mock.js` | +sehemu ya CHAT (filters · conversations 6 · messages 25 · phoneBook 10 · lookup 4 · requests 3 · moreMenu 8 · settings); `upNext.soga` → `upNext.chat`; Data Saved row `relay`→`mesh` (safu ya mfumo) |
| `src/data/repositories/index.js` | Register `chatRepository` (seam ileile) |
| `src/components/icons.jsx` | +7 icons (Send · Paperclip · Phone · Checks · Pin · Archive · Ban) |
| `src/components/BottomNav.jsx` | Item ya 2: `soga` → **`chat`**, label **`Chat`** (§3) |
| `src/App.jsx` | Route `chat` → ukurasa wa Chat; `psh-main--wide` kwa Chat (desktop two-pane) |
| `src/main.jsx` | Import `styles/chat.css` |
| `src/pages/PlaceholderPage.jsx` | Soga imeondolewa kwenye kurasa za placeholder (Chat ni halisi) |
| `src/components/feed/FeedList.jsx` | "Fungua Soga" → "Fungua Chat" |
| `src/pages/StyleGuide.jsx` · `src/services/productInfoService.js` · `src/styles/placeholder.css` | Maneno/nav → `Chat`; pageKey `soga` → `chat` |

### DELETED (1)
| Kitu | Kwa nini |
|---|---|
| `.psh-pagehead--soga` (CSS rule moja) | **Proven obsolete:** hakuna ukurasa wa `soga` tena; Chat ina CSS yake (`chat.css`). Deletion hii imeorodheshwa hapa (§: deletions zisionyeshwe) |

Hakuna component, page, mock, token, icon, test au screenshot iliyofutwa.

---

## 4. ONE communication system — duplicate gani zilizuepukwa

| Hatari (audit C1–C10) | Uamuzi |
|---|---|
| `DirectChatService` / `GroupChatService` / `CommunityChatService` | **Hakuna.** Service MOJA: `chatService.js`; `type` = `direct` \| `group` |
| Type ya tatu ya conversation (community/hub/channel) | **Hakuna.** `parentContext: { type: 'community' \| 'hub', label }` ni **metadata** ya kikundi |
| Account system ya pili | **Hakuna.** `identityRepository` + `chatPhoneBook` (contacts) |
| Friendship system ndani ya Chat | **Hakuna.** `PASIHAI Friend` = mahusiano ya jukwaa; `Saved Friend` = **state/property** |
| Navigation ya pili (Chat tabs / Chat-only shell) | **Hakuna.** Bottom nav 5 inabaki; Chat ni destination |
| Engine ya pili ya ujumbe kwa vikundi | **Hakuna.** `getThread()` moja; composer **mmoja** (`Thread.jsx`; smoke inathibitisha ×1) |
| Network/sync system ya pili | **Hakuna.** Hali 6 (ONLINE · LOCAL · WAITING_SYNC · SYNCED · LIMITED · OFFLINE) zinatoka `systemRepository`; ujumbe wa offline unaingia **foleni ileile** ya System |
| Relay kwa media | **Hakuna.** Sera ileile: `Internet Relay supports messages only.`; guard inaonyesha njia 3 (Local Mesh · Data yako · Wi-Fi); `silentFallback: false` |
| Search yakichanganya na Gundua | **Hakuna.** Search ya Chat = mazungumzo · ujumbe · watu pekee; hakuna Channels/Reels (§23) |
| More menu kama control panel ya jukwaa | **Hakuna.** Vitu 8 vya Chat pekee; hakuna usimamizi wa Spaces/Hub/Community/Channel (§24) |

---

## 5. Services na contract

`chatService` (application layer — UI haigusi repository moja kwa moja, wala `mock.js`):

| Method | Inarudisha |
|---|---|
| `getInbox(filter)` | filters · conversations (+`account`/`memberPreview`) · counts · `system { state, label, transport, dataSaved }` |
| `getThread(id)` | conversation · messages (+`stateInfo`) · `system { localMeshUp, relayEnabled, relayReached }` · `policyNote` |
| `sendMessage(id, payload)` | `{ message: { state, route, stateInfo, note }, conversation }` — hali inatoka kwa safu ya System |
| `reactToMessage(id, msgId, reaction)` | messages (itikio) |
| `attachMedia(id)` | guard ya sera + **media mpya** (`state: 'blocked-media'`) + `meshAvailable` + `relayNote` |
| `resolveMedia(id, msgId, choice)` | messages (`data-now` → waiting-data · `wait-wifi` → waiting-wifi · `mesh` → local/mesh) |
| `getNewChat()` | savedFriends · pasihaiFriends · accounts · invite · pending · note |
| `lookupNumber(n)` | `{ number, cases[] }` (kesi 4) |
| `getRequests()` · `respondRequest(id, action)` | received/sent · `{ requests, conversation }` (accept → direct ya kawaida) |
| `startDirect(accountId)` | `{ conversation, created }` |
| `createGroup({ name, members })` | conversation ya `group` (+`groupIcon`, `tone`) |
| `search(q)` | `{ conversations, messages, people }` |
| `getMore()` · `markAllRead()` | menu 8 · settings (privacy 3 · notifications 3 · storage 2) |

`chatRepository` (mock + in-memory store): contract 22 method — ikiwemo `setMessageState`, `createMediaMessage`,
`getPhoneBook`, `lookupNumber`, `getRequests`, `respondRequest`, `startDirect`, `createGroup`, `search`, `markAllRead`,
`getMoreMenu`, `getSettings`. **Swap point:** `LocalChatRepository` (local DB + outbox) au `FirebaseChatRepository` baadaye.

---

## 6. Direct vs Group — uwakilishi

| Kipengele | Direct | Group |
|---|---|---|
| `type` | `direct` | `group` |
| Identity | `accountId` → `identityRepository.getUser` | `members` (idadi) · `memberIds` · `memberPreview` (roles) |
| Kichwa | jina · `Encrypted channel` · online dot | jina · avatar ya kikundi · `wanachama N` |
| Metadata ya context | — | `parentContext` (community/hub) — **si type** |
| Ujumbe | text · reply · reactions · audio · **picha** · video · poll · location · shared · doc | hiyo hiyo + `announcement` · roles (`Msimamizi`/`Mwanafunzi`/`Kiongozi`) · typing |
| Composer | **mmoja** (uleile) | **mmoja** (uleile) |
| Vitendo | sheet ileile | sheet ileile |

Mfano halisi kwenye mock: `Madaktari Class` (kikundi huru · 48) · `Wakulima Dar` (+ community `Wakulima Tanzania`) ·
`Flutter & AI Developers` (+ hub `Dar Tech Hub`).

---

## 7. Friend · Saved · Phone contacts

| Dhana | Mahali | Maana |
|---|---|---|
| **PASIHAI Account** | `accountId` | identity ya jukwaa; **namba = kugundua pekee**, si utambulisho wa umma (panel inaeleza) |
| **PASIHAI Friend** | `friend: true` | mahusiano ya jukwaa (mmoja anamfahamu mwingine) |
| **Saved Friend** | `saved: true` | **state/property** ya ufikiaji wa haraka (si entity, si chat, si group); apendelewa kwenye New Chat |
| **Phone Contact** | `chatPhoneBook` (chanzo tofauti) | kifaa; inaweza kuwa na/kuwa bila akaunti ya PASIHAI |

Mock: **10** simulizi — saved 3 (`p1–p3`) · PASIHAI Friends 3 (`p4–p6`) · simu yenye akaunti si rafiki 2 (`p7–p8`) · bila akaunti 2 (`p9–p10`).
New Chat panel inaonyesha tabaka zote 4 + idadi (3 VIP · 3 mtandao · akaunti · mwaliko) — **hakuna** ukurasa wa "Friends" ndani ya Chat.

---

## 8. Requests (Chat requests)

- 1 lililopokelewa (`pending`, msaada wa 'mutual friend' Hamisi) · 2 yaliyotumwa.
- Vitendo: **Kubali (Accept)** → conversation **direct ya kawaida** (`cnew1`) inaundwa kwa store ileile · **Kataa (Decline)** → hali `declined`, **hakuna taarifa kwa mtumaji** · **Zuia (Block)** → hali `blocked`, hakuna conversation (`Blocked list` inaonyesha 1).
- Ulinzi wa faragha unaelezwa kwenye panel ("Watu ambao si marafiki… ujumbe wao unaingia hapa kwanza").

---

## 9. Offline · Local · Sync — integration na safu ya System

| Hali (`?sys=…`) | `sendMessage` inarudisha | Njia | Ushahidi wa UI |
|---|---|---|---|
| ONLINE | `synced` | internet | footer/hali "Imesawazishwa" |
| LOCAL (default) | `local` | `mesh` | banner "Local Mesh inatumika (bila data)" |
| LIMITED | `relayed` (mfupi) / `waiting` (mkubwa) | `relay` / foleni | chip ya hali kwenye ujumbe |
| WAITING_SYNC | `relayed` (mfupi ≤ 480 char) / `waiting` (mkubwa) | `relay` / foleni | banner "Waiting for sync" |
| OFFLINE | `vault` | `local` + **enqueue** kwenye foleni ya System | banner "Offline · Waiting for sync" · "Imehifadhiwa (Offline Vault)" |

Smoke inathibitisha: ujumbe wa offline unaongezwa kwenye foleni **ileile** ya `systemService.getQueue()`. Background ya
mazungumzo = **rangi moja safi** (`--c-green-soft` = `rgb(234,248,243)`, imepimwa kwenye browser).

---

## 10. Real (inafanya kazi) vs Mock (data ya kielelezo)

**Real kwenye prototype:** navigation · routing · inbox/filters/counts · conversation list na thread rendering · kutuma
ujumbe (hali inatoka kwa hali halisi ya `?sys=`) · reply · reactions · media guard + chaguo la mtumiaji · requests
(accept/decline/block) · startDirect · createGroup · search · more/settings panels · back-stack · focus restore · gestures
(long-press · swipe→reply) · responsive two-pane · a11y (labels · 44px · focus).

**Mock (data ya kielelezo — haijaunganishwa na backend):** watu, mazungumzo, jumbe, phone book, lookup cases, requests,
archived/blocked/storage counts, "kupiga simu", kupakua faili, kucheza sauti, kusambaza, picha ya kikundi, toggles za
settings. **Hakuna** Firebase · Auth · Firestore · Storage · Cloudinary · API · schema · offline DB · sync engine ·
Bluetooth · Wi-Fi Direct · E2EE halisi · notifications · payments.

---

## 11. Build · Tests · Screenshots

| Lango | Matokeo |
|---|---|
| `npm run build` | ✓ `index.html` 0.99 kB (gzip 0.58) · **CSS 91.82 kB (gzip 14.65)** · **JS 432.55 kB (gzip 127.12)** |
| `npm run smoke` | **276/276 ✓** (Chat: 92 assertions mpya — nav rename · inbox · types · direct · group · composer mmoja · §20 background · new chat · lookup kesi 4 · requests zote 3 · group create · search · more · media guard · states 5 za scenario · service/repository MOJA · a11y) |
| `node scripts/shots.mjs` | **214/214 ✓** (Chat: 66 assertions + picha 29) · **console 0** |
| Picha | `docs/shots/chat/` **29 PNG** (390×844 · 820×1180 · 1440×900) · `docs/shots/system/` 25 (zilizopo) |
| Gallery | `docs/review/chat/gallery.html` (picha 29 · ~1.6 MB) |

---

## 12. Issues zilizokamatwa na kurekebishwa (kwa uwazi)

1. **Bubbles zilipishana** kwenye vikundi (`display:grid` + `grid-auto-flow: column`) → kubadilishwa kuwa **flex** (`row-reverse` kwa upande wa mimi) — picha zote zimepigwa upya.
2. **Desktop: pane ya mazungumzo ilikandamizwa** (safu ya app ni 640px) → `.psh-main--wide` + `--col` ya Chat = **1160px** kwenye ≥1024px.
3. **Vitufe vilipishana** kwenye safu za watu (kitufe ndani ya kitufe) → muundo mpya: kitufe cha mstari + kitufe cha tendo (a11y safi, hakuna interception).
4. **Back ilifunga/iliruka panels** → mrundi (stack) wa panels; Back inarudi kwenye iliyotangulia, Esc inafunga zote.
5. **Media guard haikuwa na ujumbe wa kuunganisha** → `createMediaMessage` inaunda media mpya kwenye thread, kisha chaguo linabadilisha hali yake.
6. **`soga` placeholders** (mock/CSS/PlaceholderPage/FeedList/StyleGuide/productInfo) → Chat; rule moja ya CSS iliyopitwa imeondolewa.
7. **Vocab ya hali**: `resolveMedia` ilikuwa inarudisha `synced` kwa ujumbe wa relay → sasa `setMessageState` inatunza `relayed`/`waiting`/`vault`/`local` kama zilivyo.
8. **Typo** "Mauzo mazito" → "Media nzito"; kichwa cha mwaliko "WaaliKe" → "Alika kwa PASIHAI"; footnote ya inbox inarudisha mstari wa Stitch (E2E).

---

## 13. Issues zilizoachwa (kwa uwazi) — na kwa nini

| Kitu | Hali |
|---|---|
| Kupiga simu / video call | **Haijajengwa** — si sehemu ya §1 (message interaction foundation pekee); kitufe kinaeleza |
| Kupakua faili · kucheza sauti · kusambaza · picha ya kikundi | Vitufe vinaeleza (mfano) — vinahitaji storage/media pipeline (baadaye) |
| Archived/Blocked/Storage | Data ya kielelezo (mock) — hakuna persistence halisi |
| Mark-as-read kwa ujumbe mmoja | Kichwa/thread hazibadilishi `unread` kwa conversation (mock ina `markAllRead` pekee) |
| Edge-swipe back kwenye simu | Kitufe cha Back kinatosha; gesture ni nyongeza (haitakiwi) |
| Persistence | In-memory store — reload inarudisha mock ya awali (kama ilivyo kwa safu ya System) |

**⛔ Hii ni prototype, si production-ready.** Hakuna backend, hakuna uthibitisho wa kweli, hakuna E2EE halisi, hakuna
sync engine; data zote za watu/jumbe ni mock. Stitch ilitumika kama **visual/UX pekee** — Tailwind CDN, Material Symbols
na picha zake hazitumiki; Chat inatumia tokens, icons na components za PASIHAI.
