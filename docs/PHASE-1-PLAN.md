# PASIHAI — PHASE 1 PLAN: FOUNDATION SEAMS

**Lengo:** Ondoa direct dependency ya UI kwenye `src/data/mock.js`.
**Scope:** Seam pekee. Hakuna feature mpya, hakuna Firebase, hakuna Cloudinary, hakuna schema.

---

## 1. AUDIT — Nani anatumia mock.js leo

Faili **7** zinasoma `src/data/mock.js` moja kwa moja:

| # | Faili | Inahitaji nini | Aina ya data |
|---|---|---|---|
| 1 | `components/home/StatusRow.jsx` | `statuses`, `users`, `me` | Content + Identity |
| 2 | `components/home/HomeTabs.jsx` | `homeTabs`, `contentFilters` | App vocabulary |
| 3 | `components/home/CreateArea.jsx` | `me` | Identity |
| 4 | `components/panels.jsx` | `users`, `me`, `notifications`, `viewModes`, `feedPreferences` | Identity + Activity + Preferences |
| 5 | `pages/Home.jsx` | `viewModes`, `contentFilters`, `homeTabs` | App vocabulary |
| 6 | `pages/PlaceholderPage.jsx` | `upNext` | Taarifa za bidhaa/domain |
| 7 | `pages/StyleGuide.jsx` | `users`, `me` | Identity (ukurasa wa maendeleo) |

### Uainishaji wa data iliyopo kwenye mock.js

| Kundi | Export | Hali |
|---|---|---|
| **Domain data** (itabadilika → backend baadaye) | `users`, `me`, `statuses`, `notifications` | Inatumika leo |
| **App vocabulary / config** (inabaki app-side; inaweza kuwa remote config) | `homeTabs`, `contentFilters`, `viewModes`, `moreMenuItems`, `feedPreferences` | `moreMenuItems` **haitumiki** (MorePanel ina rows zake) |
| **Taarifa za bidhaa** (static) | `upNext` | Inatumika (kurasa 4 za placeholder) |
| **Content ya Phase 2+** | `posts`, `reels`, `liveSessions`, `liveCategories` | **Haitumiki bado** — haitolewa kwenye seam sasa |

### Uamuzi wa muundo (kwa nini hivi)

1. **Services zinarudisha Promise.** Sababu: implementations za baadaye (Firebase/Local/Sync) ni async.
   Kama services zingekuwa sync leo, UI ingelazimika kubadilika kesho — seam ingekuwa haina maana.
2. **Repositories ni za sasa (mock-only), interfaces zimeandikwa kama JSDoc contract** — hazitegemei Firebase.
3. **Composition root moja** (`data/repositories/index.js`) — ndipo implementations zinachaguliwa.
   Kubadilisha Mock → Firebase ni **mistari ya hapo pekee**.
4. **Hook mmoja mdogo** (`hooks/useAsyncData.js`) — "Application State" kwa UI. Hadi data inafika,
   component ina-render `null` (mock inajibu mara moja; hakuna mabadiliko ya kuona).

---

## 2. ARCHITECTURE

### Kabla
```
Component  →  src/data/mock.js          (direct dependency)
```

### Baada
```
Component
   ↓
hooks/useAsyncData.js                   (Application State)
   ↓
services/*Service.js                    (Application Services)
   ↓
data/repositories/index.js              (Composition root — swap point)
   ↓
data/repositories/*Repository.js        (Contract + Mock implementation)
   ↓
src/data/mock.js                        (Demo data — haijabadilishwa)
```

---

## 3. FILES — mabadiliko yaliyopangwa

### Zitaundwa (11)
| Faili | Kazi |
|---|---|
| `src/hooks/useAsyncData.js` | Hook ya Application State |
| `src/data/repositories/identityRepository.js` | Contract + mock: current user, user by id, directory |
| `src/data/repositories/contentRepository.js` | Contract + mock: status/stories |
| `src/data/repositories/activityRepository.js` | Contract + mock: notifications |
| `src/data/repositories/catalogRepository.js` | Contract + mock: tabs, filters, view modes, feed prefs, product info |
| `src/data/repositories/index.js` | Composition root (swap point) |
| `src/services/homeService.js` | Skrini ya Home (navigation + status strip) |
| `src/services/accountService.js` | Identity/account (current user, profile, directory) |
| `src/services/settingsService.js` | View modes, feed preferences |
| `src/services/notificationService.js` | Taarifa (scope filter + unread count + join ya entity) |
| `src/services/productInfoService.js` | Taarifa ya kurasa za placeholder |

### Zitabadilishwa (8)
| Faili | Badiliko |
|---|---|
| `components/home/StatusRow.jsx` | Import → `homeService`; status inakuja ikiwa na `user` |
| `components/home/HomeTabs.jsx` | Import → `homeService`; `TabMeaning` (haistumiki) inapokea `label` |
| `components/home/CreateArea.jsx` | Import → `accountService.getCurrentUser()` |
| `components/panels.jsx` | Imports → `account/notification/settings` services; panels zinasoma kwa hook |
| `pages/Home.jsx` | Imports → `homeService` + `settingsService` |
| `pages/PlaceholderPage.jsx` | Import → `productInfoService.getPage()` |
| `pages/StyleGuide.jsx` | Import → `accountService` (directory + current user) |
| `scripts/smoke.jsx` | Ongeza: architecture guard + contract checks (checks zote za awali zinabaki) |

### Zisizoguswa
`src/data/mock.js` · tokens/CSS zote · icons · `ui.jsx` · `Header/BottomNav/Sheet/Wordmark` ·
`App.jsx` · `vite.config.js` · `package.json` · screenshots · `docs/*` zilizopo.

### Zisizofutwa
**Hakuna faili itafutwa.**

---

## 4. VALIDATION

1. `npm run build`
2. `npm run smoke` (checks zote za awali + checks mpya)
3. Screenshots mpya (mobile/tablet/desktop) → kulinganishwa na zilizopo (`docs/shots/`) kwa **pixel diff** (PIL)
4. Architecture guard: hakuna faili ya UI inayo-import `data/mock.js`

## 5. STOP
Baada ya Phase 1: **SIMAMA.** Phase 2, Firebase, Auth, Firestore, Cloudinary — hazianzi.
