# PASIHAI — SYSTEM COMPONENT AUDIT (Stage 1–2)

**Tarehe:** 2026-10-07 · **Aina:** audit kabla ya coding (hakuna code iliyobadilishwa)
**Lengo:** kubaini kile kilichopo kabla ya kuongeza *system interaction layer* (Data Saved · System ·
Relay · Nearby · Sync · Save Offline · Share Nearby · Activity) — ili **kila capability iwe na
implementation MOJA** na **hakuna component ya pili** inayofanya kitu kilekile.

**SAHIHISHO LA SERA (2026-10-07, baada ya audit):** Internet Relay si njia ya kupeleka faili.
Ni njia ya **mawasiliano yenye ukomo**: ujumbe mfupi pekee (maandishi · metadata · uelekezaji mdogo),
ukomo wa lazima **5 MB/siku** (default 3 MB), ujumbe mmoja ≤ 32 KB. Content kubwa hubaki kwa
**Local Mesh** (Wi-Fi Direct · Bluetooth · Wi-Fi ya karibu). Data Saved haitoi relay kama chanzo.
Sera kamili: `docs/TOP-SYSTEM-COMPONENTS-REPORT.md` §5a.

> Kanuni: *Preserve · Improve · Do not duplicate* (§59). UI → hooks → services → repositories → mock.
> UI haipaswi ku-import `mock.js` moja kwa moja (smoke inailinda).

---

## 1. Muundo uliopo (ramani ya haraka)

```
src/
  App.jsx                     shell: header + main + bottom nav + Sheet + toast + panel stack
  components/
    Header.jsx                header: Wordmark | vitendo vya juu (taarifa · akaunti · menyu)
    BottomNav.jsx             nav 5 (Home · Soga · Gundua · Spaces · Business) — NAV_ITEMS
    Sheet.jsx                 **panel mechanism MOJA** (bottom sheet simu / dialog desktop, back, Esc)
    ui.jsx                    primitives: Avatar · Identity · EntityPill · Chip · IconButton ·
                              MediaFrame · Waveform · Segmented · CheckRow · Dropdown · EntityAction
    panels.jsx                panels zote: Notifications · Profile · Create · More · ViewMode ·
                              FeedPrefs · ContentPrefs · Saved · FilterMenu + Switch
    icons.jsx                 seti moja ya icons (SVG, viewBox 24, stroke 1.7) — 47 icons
    feed/  home/              components za mkondo na Home
    Wordmark.jsx              "Pasihai" (green + blue)
  pages/
    Home.jsx                  Home (tabs 5 · filter · feed)
    PlaceholderPage.jsx       Soga · Gundua · Spaces · Business
    StyleGuide.jsx            ?guide=1
  hooks/useAsyncData.js       **hook MOJA** ya kusoma service (Promise → data)
  services/                   application layer: feed · home · account · notification · settings · productInfo
  data/repositories/          swap point: index.js inachagua implementations (mock)
  data/mock.js                data ya majaribio (chanzo kimoja)
  styles/                     tokens · base · shell · components · home · feed · panels · placeholder · guide
```

---

## 2. Top controls zilizopo (header)

| Existing component | Location | Purpose | Reusable? | New required? | Duplication risk |
|---|---|---|---|---|---|
| `Header` | `components/Header.jsx` | Header moja: Wordmark kushoto; kikundi cha vitendo kulia | ✅ **NDIYO** — panua, usianzishe header nyingine | `DataSavedIndicator` + `SystemQuickButton` (vipengele viwili vipya **ndani** ya header) | ⚠️ **Kubwa ikiwa utaunda header/popover mpya** — dawa: tunatumia `IconButton` + `Sheet` zilizopo; hakuna header/popover ya pili |
| `IconButton` | `components/ui.jsx` | Kitufe cha icon (aria-label + badge dot) | ✅ NDIYO | Hapana — `SystemQuickButton` itatumia muundo huu | — |
| `Wordmark` | `components/Wordmark.jsx` | "Pasihai" | ✅ NDIYO | Hapana | — |
| Icons seti | `components/icons.jsx` | icons zote (line, stroke 1.7) | ✅ NDIYO | ✅ Ongeza **6** icons mpya (Database · Swap · Relay · Radar · Download · Bolt) — hakuna iliyopo inafaa kwa dhana hizi | ⚠️ Ikiwa iconi mpya zitatengenezwa kwa style tofauti — dawa: tumia helper `S` ileile |

**Hakuna** control yoyote ya mfumo kwenye header kwa sasa (hakuna data-saved, hakuna network status).

---

## 3. Panels / sheet / modal (mechanism)

| Existing component | Location | Purpose | Reusable? | New required? | Duplication risk |
|---|---|---|---|---|---|
| `Sheet` | `components/Sheet.jsx` | **Panel mechanism MOJA**: bottom sheet (simu) / dialog (desktop), scrim, Esc, focus ya kwanza, kitufe cha "Rudi" kwa stack > 1 | ✅ **NDIYO — LAZIMA** | Hapana | ⛔ **Kubwa ikiwa tutaunda sheet/popover ya pili** — dawa: Data Saved na System **zote** zinatumia `Sheet` |
| Panel stack (`stack`, `push`, `pop`, `openTop`) | `App.jsx` | Panels ndani ya panels (mfano More → ViewMode) | ✅ NDIYO | Ongeza `case` mpya: `datasaved`, `system`, `relay`, `nearby`, `sync`, `saveoffline`, `sharenearby`, `activity`, `compose` | ⚠️ Kila case ni sehemu ya panel **ile moja** — si route mpya |
| `Dropdown` | `components/ui.jsx` | Menyu inayoning'inia (anchor) | ✅ NDIYO | Hapana — *spec §3 inaruhusu popover au sheet; tumia **Sheet*** (mlango mmoja wa panel) | ⚠️ Kutumia Dropdown kwa Data Saved kunaunda lugha ya pili ya panel — **imeachwa** |
| `Switch` | `components/panels.jsx` | Toggle (aria-checked) | ✅ NDIYO | Relay choices + consent toggle zitatumia hii | — |
| `Segmented` | `components/ui.jsx` | Radiogroup ya segments | ✅ NDIYO | Time scope (Today·Week·Month) ya Data Saved | ⚠️ Isiwe tab system ya pili — ni scope ya data pekee |
| `CheckRow` | `components/ui.jsx` | Safu ya uteuzi (radio/checkbox) | ✅ NDIYO | Delivery/visibility ya Post (Local only · Nearby · Community · Global) | ⚠️ Hii **si** kichujio kipya cha feed — ni metadata ya uwasilishaji |

---

## 4. Capabilities zinazohusiana — zilizopo vs mpya

| Capability | Ipo sasa? | Location | Uamuzi |
|---|---|---|---|
| **Relay** | ❌ **Hapana** | — (neno linatokea kwenye maandishi ya maono pekee) | Mpya: `System → Relay`, service moja |
| **Offline queue** | ❌ **Hapana** | — | Mpya: seam ndogo (`systemService` queue) — hakuna mfumo wa pili |
| **Sync** | ❌ **Hapana** | — (maelezo ya "Ujumbe usio na mtandao (baadaye)" kwenye Soga) | Mpya: `System → Sync` |
| **Cache** | ❌ Hapana (UI) | `services/homeService.js` ina *maoni* ya cache ya baadaye | Mpya: cache **imejitenga** na *Zilizohifadhiwa* |
| **Nearby** | ⚠️ Neno moja pekee | `mock.js` → `upNext.gundua.items`: "Nearby (kwa idhini)" | Mpya: `System → Nearby` **ndogo**; **Gundua hubaki ugunduzi mkuu** |
| **Network/connection status** | ❌ Hapana | — | Mpya: vocabulary moja (`ONLINE · LIMITED · LOCAL · OFFLINE · WAITING_SYNC · SYNCING`) |
| **Data saved / data usage** | ❌ Hapana | — | Mpya: `DataSavedIndicator` + `DataSavedPanel` |
| **Local sharing** | ⚠️ Kitufe `Shiriki` | `components/feed/FeedActions.jsx` | **Hazifanani**: `Shiriki` = kitendo cha content (social); *Local Sharing* = uwasilishaji wa bytes kwa kifaa cha karibu. Hii ya pili iko ndani ya **System → Share Nearby**; `Shiriki` haigusi |
| **Post creation** | ⚠️ Sehemu | `components/home/CreateArea.jsx` (prompt + plus) · `panels.jsx → CreatePanel` (grid ya aina 8, kila moja "itajengwa baadaye") | **Hakuna composer halisi.** Ongeza **composer MOJA** (maandishi + delivery choice + Chapisha) ndani ya panel ileile — **si** kitufe cha "Local Post" wala "Global Post" |
| **Saved content** | ✅ NDIYO | `panels.jsx → SavedPanel` ("Zilizohifadhiwa") | **HAIGUSWI**. ⚠️ **Tofauti muhimu**: *Saved* = content aliyohifadhi mtumiaji kwa mkono; *Data Saved* = **bytes za internet zilizoepushwa**. Haya ni makundi mawili tofauti — yataelezwa kwenye panel |
| **Data saver preference** | ✅ NDIYO | `panels.jsx → MorePanel` ("Kuokoa data" switch: punguza video kiotomatiki) | **HAIGUSWI**; ni *mapendeleo*, si kipimo. Panel ya Data Saved inaieleza kwa mstari mmoja (hakuna toggle ya pili) |
| **Notifications (Taarifa)** | ✅ NDIYO | `NotificationsPanel` | **HAIGUSWI**. *System Activity* = kumbukumbu ya usafirishaji (receiving/sending/relay/sync) — **si** taarifa za kijamii |
| **Live Activity** | ✅ NDIYO | tab ya Live (content type) | ⚠️ Jina linaweza kuchanganya → ndani ya System tunatumia **"SYSTEM ACTIVITY"** (eyebrow) + Kiswahili "Shughuli za mfumo" |
| **Gundua** | ✅ NDIYO | `PlaceholderPage` | Hubaki ugunduzi mkuu; Nearby ni njia ya mkato ya mfumo pekee |

---

## 5. Services / repositories / mock zilizopo

| Existing | Location | Purpose | Reusable? |
|---|---|---|---|
| `identityRepository` | `data/repositories/identityRepository.js` | watumiaji/wasifu | ✅ kwa Nearby (watu) |
| `contentRepository` | `data/repositories/contentRepository.js` | status · feed | ✅ (rejea content iliyopo nearby) |
| `activityRepository` | `data/repositories/activityRepository.js` | taarifa | ⚠️ **Haitumiki** kwa System Activity (kundi tofauti la data) |
| `catalogRepository` | `data/repositories/catalogRepository.js` | tabs · filters · view modes · vocabulary | ✅ (rejea mipaka ya aina za content) |
| `data/repositories/index.js` | — | **swap point** | ✅ Ongeza `systemRepository` hapa (mstari mmoja) |
| `services/*` | `services/` | application layer | ✅ Ongeza `systemService.js` (moja) |
| `hooks/useAsyncData.js` | `hooks/` | kusoma service | ✅ Inatosha; hakuna hook ya pili ya data |

**Hitimisho:** hakuna service/repository/component iliyopo inayofanya kazi ya Data Saved, System, Relay,
Sync, Queue, Nearby au Activity. Kwa hivyo **hakuna duplication ya lazima kuondoa** — ni kuongeza safu
mpya kwa heshima ya muundo uliopo.

---

## 6. Duplication risks zilizogunduliwa + dawa (RESOLVED kwa kubuni)

| # | Risk | Dawa iliyoamuliwa |
|---|---|---|
| D1 | Header ya pili / popover ya pili | Vitendo viwili vipya vinaingia **ndani ya `Header`**; panel zote zinatumia **`Sheet`** ileile. Hakuna modal/popover mpya |
| D2 | "Saved" = vitu viwili | *Zilizohifadhiwa* (bookmarks) **haiguswi**; kipimo kipya kinaitwa **Data Saved / Data Saving** na panel inaeleza tofauti hiyo |
| D3 | "Kuokoa data" switch vs Data Saved | Switch = mapendeleo (Home menu, bila mabadiliko); Data Saved = kipimo cha matokeo. Panel inaeleza uhusiano kwa mstari mmoja |
| D4 | Nearby vs Gundua | Nearby = njia ya mkato ya mfumo (watu/content/hubs waliopo karibu sasa); **Gundua hubaki ugunduzi mkuu**; nota ndani ya panel |
| D5 | Local Sharing vs `Shiriki` (feed) | Local Sharing iko ndani ya System; `Shiriki` ya feed haigusi. Hati inaeleza |
| D6 | Sync vs "Sasisha" ya Home menu | "Sasisha" = refresh ya mkondo; **Sync** = kupeleka vitendo vinavyosubiri. Majina + maeneo tofauti |
| D7 | System Activity vs Taarifa / Live Activity | Eyebrow "SYSTEM ACTIVITY" + safu ya kumbukumbu ya usafirishaji; Taarifa haigusi |
| D8 | Navigation mpya | ⛔ Hakuna tab mpya, hakuna ukurasa mpya. Kila kitu ni panel (stack ileile) |
| D9 | Post system ya pili | Composer **mmoja** (`Create → Post`); delivery/visibility ni **metadata** ya post ileile. Hakuna "Local Post" button |
| D10 | Rangi/typography mpya | tokens zote zilizopo (`--c-green`, `--c-green-soft`, `--c-blue`, `--c-gold`, `--line`, radius 16) — hakuna rangi mpya isipokuwa vivuli/tints zinazotoka tokens |

**Hakuna STOP iliyohitajika:** hakuna component iliyopo inayofanya kazi hizi; hakuna destructive refactor;
hakuna tests zinazoshindwa kabla ya mabadiliko (build ✓ · smoke **114/114** ✓ · shots **80/80** ✓);
hakuna backend inayohitajika (mock + seam pekee).

---

## 7. Kile ambacho KITATUMIKA kwa kila capability

| Capability | Entry point | Panel | Service | Repository |
|---|---|---|---|---|
| Data Saved | `DataSavedIndicator` (header) | `DataSavedPanel` (Sheet) | `systemService.getDataSaved(scope)` | `systemRepository.getDataSaved` |
| System | `SystemQuickButton` (header) | `SystemPanel` (Sheet) | `systemService.getSnapshot()` | `systemRepository.*` |
| Relay | System → Relay | `RelayPanel` | `getRelay` · `setRelayChoice` · `setRelayConsent` | `systemRepository.getRelay` |
| Nearby | System → Nearby | `NearbyPanel` | `getNearby()` | `systemRepository.getNearby` |
| Sync | System → Sync | `SyncPanel` | `getQueue()` · `syncNow()` | `systemRepository.listQueue` |
| Save Offline | System → Save Offline | `SaveOfflinePanel` | `getSaveOffline()` · `saveOffline(id)` | `systemRepository.getSaveOffline` |
| Share Nearby | System → Share Nearby | `ShareNearbyPanel` | `getShareNearby()` · `shareNearby(id)` | `systemRepository.getShareNearby` |
| Activity | System → Activity | `SystemActivityPanel` | `getActivity()` | `systemRepository.getActivity` |
| Local Post | Create → Chapisho (composer) | `ComposerPanel` | `getDeliveryOptions()` · `enqueuePost()` | `systemRepository.getDeliveryOptions` |

---

## 8. Hali ya lango kabla ya coding

| Kipimo | Matokeo |
|---|---|
| `npm run build` | ✅ |
| `npm run smoke` | ✅ 114/114 |
| `node scripts/shots.mjs` | ✅ 80/80 · console 0 |
| Duplication ya lazima kuondoa | **Hakuna** (D1–D10 zote ni maamuzi ya kubuni, yamezingatiwa) |
| STOP conditions | **Hakuna** iliyotimia |

**Uamuzi:** endelea Stage 3–10 kwa heshima ya muundo uliopo.
