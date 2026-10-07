# PASIHAI — PHASE 1 REPORT: FOUNDATION SEAMS

**Tarehe:** 2026-10-07
**Scope:** Ondoa direct dependency ya UI kwenye `src/data/mock.js`; weka seam safi.
**Hali:** ✅ Imekamilika — **SIMAMA** (Phase 2, Firebase, Auth, Firestore, Cloudinary: hazijaanza)

---

## 1. WHAT CHANGED

UI **haigusi** `src/data/mock.js` tena. Faili **7** zilizokuwa zinasoma mock.js moja kwa moja
zinasoma **application services** sasa, na services zinasoma **repositories**, na repositories
(za sasa: mock) zinasoma data.

Vimeongezwa:

| Tabaka | Faili |
|---|---|
| Application State | `src/hooks/useAsyncData.js` |
| Application Services | `homeService` · `accountService` · `settingsService` · `notificationService` · `productInfoService` |
| Repository contracts + mock | `identityRepository` · `contentRepository` · `activityRepository` · `catalogRepository` |
| Composition root (swap point) | `src/data/repositories/index.js` |

Pia: **smoke test** imeongezwa kundi la **architecture guard** (inashindwa kama UI itarudi
kugusa mock.js), na `scripts/shots.mjs` imebadilishwa kutoka screenshots → **UI verification**
(43 DOM assertions + screenshots + console error check).

## 2. WHY IT CHANGED

1. UI ilikuwa **imefungwa** kwenye implementation detail (`mock.js`) — kubadilisha chanzo cha data
   kungegusa skrini nyingi.
2. Hati ya usanifu inasema mzunguko uwe: `UI → Application State → Service → Repository → Data`.
3. Tunahitaji **swap point** moja: Mock → (baadaye) Local DB / Firebase / Sync **bila kubadilisha UI**.
4. Data ya baadaye (Firebase, local DB) ni **async** — kwa hivyo services zinarudisha Promise
   kuanzia sasa. Kama zingekuwa sync leo, UI ingelazimika kubadilika baadaye; seam ingekuwa haina maana.

## 3. ARCHITECTURE BEFORE

```
Component / Page
      ↓
  src/data/mock.js          ← dependency ya moja kwa moja (faili 7)
```

## 4. ARCHITECTURE AFTER (iliyotekelezwa kweli)

```
Components (components/home/*, panels.jsx, pages/*)
      ↓
  hooks/useAsyncData.js                     Application State
      ↓
  services/homeService.js                   Application Services
  services/accountService.js
  services/settingsService.js
  services/notificationService.js
  services/productInfoService.js
      ↓
  data/repositories/index.js                Composition root  ← SWAP POINT
      ↓
  data/repositories/identityRepository.js   Contract + Mock implementation
  data/repositories/contentRepository.js
  data/repositories/activityRepository.js
  data/repositories/catalogRepository.js
      ↓
  data/mock.js                              Demo data (haijabadilishwa hata kidogo)
      ↓
  [baadaye: Local DB · Firebase · Sync]     ← haijaanza
```

**Kubadilisha chanzo cha data baadaye** = kubadilisha **mistari ya `data/repositories/index.js`
pekee**. Hakuna UI inayobadilika.

## 5. FILES MODIFIED (9)

| # | Faili | Kwa nini | Badiliko |
|---|---|---|---|
| 1 | `src/components/home/StatusRow.jsx` | ilisoma `statuses/users/me` | → `homeService.getStatusStrip()`; item inakuja na `user` |
| 2 | `src/components/home/HomeTabs.jsx` | ilisoma `homeTabs/contentFilters` | → `homeService.getNavigation()`; `TabMeaning` inapokea `label` |
| 3 | `src/components/home/CreateArea.jsx` | ilisoma `me` | → `accountService.getCurrentUser()` |
| 4 | `src/components/panels.jsx` | ilisoma `users/me/notifications/viewModes/feedPreferences` | → services nne; panels zinasoma kwa hook |
| 5 | `src/pages/Home.jsx` | ilisoma `viewModes/contentFilters/homeTabs` | → `homeService` + `settingsService`; strip inasubiri data |
| 6 | `src/pages/PlaceholderPage.jsx` | ilisoma `upNext` | → `productInfoService.getPage()` |
| 7 | `src/pages/StyleGuide.jsx` | ilisoma `users/me` | → `accountService.listDirectory()` + `getCurrentUser()` |
| 8 | `scripts/smoke.jsx` | — | + architecture guard + contract checks (checks za awali zote zinabaki) |
| 9 | `scripts/shots.mjs` | — | screenshots → verification (DOM assertions + console check) |

## 6. FILES CREATED (12)

**Code (11):**
`src/hooks/useAsyncData.js` (48) · `src/data/repositories/identityRepository.js` (33) ·
`contentRepository.js` (22) · `activityRepository.js` (20) · `catalogRepository.js` (44) ·
`index.js` (29) · `src/services/homeService.js` (42) · `accountService.js` (28) ·
`settingsService.js` (20) · `notificationService.js` (30) · `productInfoService.js` (17)
→ **jumla mistari 333**

**Nyaraka (1):**
`docs/PHASE-1-PLAN.md` — plan ya mabadiliko (faili kwa faili) iliyoandikwa **kabla** ya kugusa code.

## 7. FILES DELETED

**Hakuna.** ✅ (kama ilivyotarajiwa)

`src/data/mock.js` ipo kama ilivyo · components zote · pages zote · tokens/CSS zote · icons ·
`ui.jsx` · `Header/BottomNav/Sheet/Wordmark` · `App.jsx` · `vite.config.js` · `package.json` ·
screenshots za awali (`docs/shots/*.png`) — **vyote vipo**.

### Zisizoguswa hata kidogo
`src/data/mock.js` · styles zote · `App.jsx` · `main.jsx` · `Header.jsx` · `BottomNav.jsx` ·
`Sheet.jsx` · `Wordmark.jsx` · `ui.jsx` · `icons.jsx` · `index.html` · `vite.config.js`

---

## 8. TESTS

### 8.1 `npm run build`
```
✓ 62 modules transformed
dist/index.html                   0.99 kB │ gzip:  0.58 kB
dist/assets/index-DU0SgGQV.css   43.35 kB │ gzip:  7.70 kB   (haijabadilika)
dist/assets/index-CdmOWNtm.js   285.49 kB │ gzip: 87.27 kB
✓ built in 2.80s
```
CSS **haijabadilika kabisa** (bytes sawa) — uthibitisho kwamba hakuna badiliko la muonekano.

### 8.2 `npm run smoke` → **43/43 zimepita**

| Kundi | Idadi | Yaliyothibitishwa |
|---|---|---|
| 1. Render | 16 | components/pages zote zina-render bila hitilafu |
| 2. Architecture guard | 2 | UI **haigusi** mock.js (faili 21 zimekaguliwa) · repositories ndizo zinasoma mock (4/4) |
| 3. Contract checks | 25 | repositories + services zinarudisha data sahihi |

Mifano ya contract checks:
- `identity.getCurrentUser` → **friends=15, followers=0** (mtumiaji wa kawaida amehifadhiwa)
- `content.getStatuses` → 13 status, ya kwanza ni "Yako"
- `homeService.getStatusStrip` → **13/13 zimeunganishwa na entity** · mpangilio umehifadhiwa
  (Neema Joseph → Amina Said)
- `catalog.getHomeTabs` → Mchanganyiko · Reels · Friends · Channels · Live
- `catalog.getViewModes` → Automatic · Vertical · Horizontal / Full Scroll
- `notificationService.list(mpya)` → 3 · `countUnread` → 3
- `catalog.getProductInfo` → inarudisha page kwa key sahihi, `null` kwa key isiyopo

### 8.3 UI verification ya browser → **43/43 assertions** (mobile 390 · tablet 834 · desktop 1280)
- **Bottom nav:** destinations **5** kwa mpangilio: Home · Soga · Gundua · Spaces · Business
- **Header:** wordmark "Pasihai" + **icons 3** (taarifa · akaunti · zaidi)
- **Status/Stories:** **13** status zinaonekana · "Status Yako" ni ya kwanza · Amina wa pili
- **Home tabs:** 5 · default **Mchanganyiko** · kubadilika kwa *Friends* kunathibitishwa
- **Kichujio:** aina **9** kwenye dropdown
- **Create:** prompt "Nini kinaendelea?" + vitendo **5**
- **Mstari wa hali:** "Unatazama · Mchanganyiko · Zote · Automatic"
- **Unda (panel):** aina **8**
- **Taarifa:** **8** taarifa · "3 mpya" · kichujio "Mpya" → **3** · kubofya kunafungua wasifu wa Amina
- **Akaunti yangu:** Neema Joseph · stats **3** · maelezo ya followers = 0
- **Mapendeleo ya mkondo:** mpangilio **3** · switches **5**
- **Kurasa za chini:** Soga (5 items) · Gundua (6) · Spaces (5) · Business (6)
- **Design system:** rangi **9** · icons **44** · identity samples **6**
- **Console errors: HAKUNA** (mobile, tablet, desktop, guide)

### 8.4 UI REGRESSION CHECK — pixel diff (PIL)

Screenshots mpya (`docs/shots/phase-1/`, 21) zimefananishwa na za kabla (`docs/shots/`, 20):

```
Picha 20 zilizolinganishwa | sawa kabisa 20 | tofauti kubwa zaidi 0.000%
Haipo: hakuna
```

**Picha 20/20 zinalingana kabisa — 0.000% tofauti.** Hakuna regression ya muonekano.

> Kumbukumbu: tofauti ya awali ya 0.481% ilikuwa **mpangilio wa hatua kwenye script yangu ya test**
> (kufungua kichujio kabla ya kubadilisha tab), **si** regression ya UI. Mpangilio uliorekebishwa;
> baada ya hapo picha zinalingana kabisa.

---

## 9. UI REGRESSION CHECK — mahsusi

| Kipimo | Baseline | Phase 1 | Hali |
|---|---|---|---|
| Picha za QA zinazolingana | — | 20/20 | ✅ 0.000% |
| CSS bytes (build) | 43.35 kB | 43.35 kB | ✅ sawa |
| Bottom nav | 5 destinations | 5 destinations | ✅ |
| Home tabs | 5 (Mchanganyiko default) | 5 (Mchanganyiko default) | ✅ |
| Status/Stories | 13 | 13 | ✅ |
| Console errors | 0 | 0 | ✅ |

**Visual behavior imehifadhiwa kikamilifu.** Hakuna class ya CSS iliyoongezwa, iliyobadilishwa au
kuondolewa. Hakuna component iliyoundwa upya — ni **kubadilisha chanzo cha data pekee**.

Tabia moja ya kiufundi inayojulikana (si regression ya muonekano): wakati wa `renderToString`
(SSR — inatumika kwenye smoke test pekee), components zinazosoma kwa service zinaonyesha hali ya
kupakia kwa sababu `useEffect` haifanyi kazi kwenye SSR. **Kwenye browser halisi, data inaonekana
mara moja** (mock inajibu kwa microtask) — hii imethibitishwa kwa assertions 43 za browser.

---

## 10. FIREBASE STATUS

```
Firebase integration : NOT STARTED
```
- Hakuna SDK (`firebase`) kwenye `package.json` — nathibitisha
- Hakuna `import` ya firebase kwenye code (tafuta ya "firebase" ni **comment** kwenye
  `repositories/index.js` inayoeleza mfano wa kubadilisha baadaye)
- Hakuna app iliyosajiliwa · hakuna Auth · hakuna Firestore · hakuna Storage · hakuna Functions
- Hakuna config · hakuna `.env` · **hakuna secret yoyote** (sitaomba, sitatengeneza)

## 11. CLOUDINARY STATUS

```
Cloudinary integration : NOT STARTED
```
- Hakuna SDK kwenye `package.json` · hakuna import · hakuna upload service · hakuna media repository
- Hakuna environment variable · **API Secret haijaguswa kamwe**

---

## 12. NEXT RECOMMENDED PHASE

**Pendekezo langu (SI kuanza):** ADW-03 na ADW-04 (idhini ya uamuzi) ni kizuizi cha kila kitu
kinachofuata cha maana. Kwa hivyo:

| Chaguo | Kazi | Inahitaji |
|---|---|---|
| **A. ADW-03 + ADW-04 idhini, kisha Phase: Local Data Layer** | IndexedDB schema, `cache ≠ saved`, schema versioning | ⛔ Vizuizi vya ADW-01/02/03/09 |
| **B. Phase 2 (mkondo wa Home — UI, mock data)** | Feed, aina za content, identity kwenye feed | Inaweza kuanza **bila** ADW (UI pekee) — lakini **bila** schema ya domain |
| **C. Repository contract extension** | Kuongeza `posts/reels/live` kwenye `contentRepository` | Ndogo; thamani ni ndogo mpaka feed iwepo |

**Ushauri wangu:** **A** ikiwa maamuzi ya ADW yako tayari. Ikiwa hapana, **B** inaweza kuendelea
kwa mock data ndani ya seam hii (repository/contract tayari zina nafasi) — **bila** kugusa schema.

**Sitaanza chochote.** Nasubiri idhini yako.

---

## MUHTASARI WA STOP CONDITION

| Agizo | Hali |
|---|---|
| Ondoa direct dependency ya UI kwenye mock.js | ✅ (0 hits) |
| Seam: UI → Service → Repository → Mock → mock.js | ✅ imetekelezwa |
| Preserve existing prototype | ✅ hakuna kufutwa; picha 20/20 zinalingana |
| Usibadilishe navigation / bottom nav / Home tabs / visual design | ✅ |
| Hakuna abstraction kubwa isiyohitajika | ✅ faili 11, mistari 333 |
| Hakuna user.type kama production architecture | ✅ model ya identity **haijagusa** — inasubiri ADW-02 |
| Usifanye Firebase / Cloudinary | ✅ NOT STARTED |
| Tests: build | ✅ |
| Tests: smoke | ✅ 43/43 |
| UI regression check | ✅ 20/20 pixel-identical |
| **SIMAMA** | ✅ Nasubiri idhini |
