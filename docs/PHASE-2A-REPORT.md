# PASIHAI — PHASE 2A: HOME FEED FOUNDATION · RIPOTI

**Tarehe:** 2026-10-07 · **Hali:** imekamilika, inasubiri idhini ya owner
**Upeo:** msingi wa mkondo wa Home (feed) kwa mock data kupitia architecture seam iliyopo.
**HAIKUFANYIKA:** Firebase · Cloudinary · backend · Reels/Friends/Channels/Live deep ·
composer kamili · Story Viewer · offline sync · ML/analytics.

---

## 1. Files Changed (7 code + 1 docs)

| # | Faili | Mabadiliko | Kwa nini |
|---|---|---|---|
| 1 | `src/data/mock.js` | **+`ageMinutes`** kwa vipengele 32 (posts 12 · reels 8 · liveSessions 12) | Mpangilio wa deterministic unahitaji umri wa maudhui; hakuna data iliyofutwa |
| 2 | `src/data/repositories/contentRepository.js` | **+`listFeed()`** → `feedMapper.mapFeed()` | Seam ya Phase 1 (contract ilikuwa inataja Phase 2) |
| 3 | `src/pages/Home.jsx` | `psh-feedghost` + `NextStepCard` **zimeondolewa**; `FeedList` imeingizwa; `+onOpenProfile`, `filterLabel` | Home sasa inaonyesha mkondo halisi |
| 4 | `src/App.jsx` | **+prop `onOpenProfile`** → profile ya juu | Kubonyeza identity ya mwandishi kunafungua wasifu (kama taarifa) |
| 5 | `src/main.jsx` | **+`import './styles/feed.css'`** | Styles za mkondo |
| 6 | `scripts/smoke.jsx` | **+Kundi 4** (msingi wa mkondo) + hesabu za tabs | Test seam: mapper · service · deterministic · kinds · identity |
| 7 | `scripts/shots.mjs` | **+kundi la 2A** (assertions + picha → `docs/shots/phase-2a/`) | Browser verification ya mkondo |

**Docs:** `README.md` (sehemu "Mkondo wa Home" + safu ya `feedService`).
**Code ndani ya Home.jsx:** component ndogo ya *inline* `NextStepCard` (placeholder
ya hatua 1) iliondolewa pamoja na matumizi yake. CSS ya `.psh-feedghost`
(`src/styles/home.css`) **imebaki** — haijafutwa.

## 2. Files Created (9 code + 2 docs)

| # | Faili | Kazi |
|---|---|---|
| 1 | `src/utils/time.js` | `formatAge(minutes)` → "dakika 12" · "saa 1" · "siku 1" (namba kwa data, maandishi kwa UI) |
| 2 | `src/data/mappers/feedMapper.js` | `mapFeed({posts,reels,liveSessions})` → feed item model; `FILTERS_BY_KIND`; product/event → kind `image` + label "Bidhaa"/"Tukio" |
| 3 | `src/services/feedService.js` | `getFeed({tab,filter})` → `{items,total,shown,tab,filter}`; **`TAB_RULES`** (uanachama wa tab kwa sheria); scoring deterministic |
| 4 | `src/components/feed/FeedItem.jsx` | Shell ya chapisho: head (Identity + muda) · label chip · body · actions; `data-kind`/`data-id` kwa tests |
| 5 | `src/components/feed/bodies.jsx` | Bodies 8: `Text · Media · Video · Audio · Poll · Announcement · LiveActivity · Reel` + registry `BODIES` |
| 6 | `src/components/feed/FeedActions.jsx` | Penda · Maoni · Shiriki · Hifadhi (state ya ndani; hesabu 0 hazionyeshwi) |
| 7 | `src/components/feed/FeedList.jsx` | Orodha + hesabu ya kichujio + hali tupu; props `tab/filter/filterLabel/onOpenProfile/onToast` |
| 8 | `src/styles/feed.css` | Classes zote `.psh-feed*` (mpya kabisa; hakuna CSS iliyopo iliyobadilishwa) |
| 9 | `docs/PHASE-2A-PLAN.md` | Plan ya awali |
| 10 | `docs/shots/phase-2a/*.png` | Picha 11 za QA (zinatolewa na `scripts/shots.mjs`) |
| 11 | `docs/PHASE-2A-REPORT.md` | Ripoti hii |

## 3. Files Deleted — **0**

Hakuna faili iliyofutwa. Hakuna component · mock data · token · CSS · icon ·
ukurasa · screenshot iliyofutwa.

---

## 4. Architecture Before → After

**Before (mwisho wa Phase 1):**
```
Home.jsx → useAsyncData → homeService → homeRepository ─┐
                        → accountService → ...          ├→ data/mock.js
                        → settingsService → ...         ┘
Home ilikuwa na: Create area + Status strip + Tabs + kichujio + "ghost" ya mkondo
```

**After (Phase 2A):**
```
Home.jsx
  └─ FeedList
       └─ feedService.getFeed({ tab, filter })
            ├─ contentRepository.listFeed() → feedMapper.mapFeed()
            │        └─ data/mock.js  (posts · reels · liveSessions)
            └─ identityRepository.listUsers() + getCurrentUser()   ← join ya entity

UI → hook → service → repository → mock      (seam ya Phase 1 haijavunjwa)
```
- UI **haitumii** `data/mock.js` moja kwa moja (imethibitishwa: viungo 0).
- Kubadilisha chanzo cha data baadaye (Local DB/Firebase/Sync) = kubadilisha
  `data/repositories/index.js` pekee; mkondo haubadiliki.

---

## 5. Home Feed Model

**Feed item** (`feedMapper`): `{ id, kind, source, userId, relationship, ageMinutes,
text, label, media{tone,ratio,caption,duration,views}, poll{…}, live{state,mode,title,
host,viewers,when,since,category}, filters[], stats{reactions,comments} }`
— `entity` inaongezwa na `feedService` (join).

| Kipimo | Thamani |
|---|---|
| Vipengele jumla | **32** = posts 12 + reels 8 + live sessions 12 |
| Kinds | **8** — text · image · video · audio · poll · announcement · liveActivity · reel |
| Identity aina 6 | `you` · friend · channel · hub · business · creator — labels (kutoka `defaultRelationship`): Wewe · Rafiki · Channel · Hub · Biashara · Mbunifu (default: Mtumiaji) |
| Uhusiano (relationship) | `rel = relationship \|\| defaultRelationship(user)` — `user.type` = **identity pekee**; relationship/visibility/permission hazichanganywi (hakuna rewrite ya identity/permission kwenye 2A) |

**Home tabs (5 pekee — haziongezwi):** uanachama unahesabiwa kwa sheria
(`TAB_RULES`), si kwa hand-tags:

| Tab | Sheria | Vipengele |
|---|---|---|
| **Mchanganyiko** (default) | kila kitu isipokuwa vikao vya Live | **20** |
| Reels | `source === 'reel'` | **8** |
| Friends | entity type `friend` | **10** (posts 6 + live activity 1 + reels 4) |
| Channels | entity type `channel` | **4** (posts 3 + reel 1) |
| Live | `source === 'liveSession'` | **12** |

**Mpangilio (deterministic — hakuna ML/analytics/behavior):**
`score = RELATIONSHIP_WEIGHT(friend 50 · hub 40 · channel 35 · creator 30 · business 25)
+ recency (clamp(30 − ageMinutes/60)) + TYPE_WEIGHT(liveActivity 10 · poll 8 ·
announcement 6 · reel 4 · video 3 · image 2 · audio 2 · text 0)
+ LIVE_STATE_WEIGHT(live 40 · upcoming 20 · replay 5)`; tie-break `ageMinutes → id`.
Mara mbili = matokeo sawa (imethibitishwa kwenye smoke).

**Kichujio (kwenye Mchanganyiko):** Zote 20 · Machapisho 10 · Picha 4 · Video 9 ·
Reels 8 · Sauti 2 · Kura 1 · Live 1 · Matangazo 1.
**Hali tupu halisi:** Friends + Matangazo → 0 (hakuna tangazo kwa marafiki).

---

## 6. UI

- **Shell moja** inatumika kwa aina zote: identity (+ badge ya aina) · muda ·
  chip ya label · body maalum · actions · (engagement). Hakuna HTML inayorudiwa
  kwa kila aina.
- **Live Activity ≠ post ya kawaida**: shell yake (`IMEPANGWA / INAENDELEA / MARUDIO`
  ↑), mode (Sauti/Video), host · watazamaji · muda, na CTA (`Jiunge`/`Kumbuka`).
- **Reel** ni chip + kijipicha 3/4 + muda + watazamaji (si media kubwa).
- **Hali tupu** ina maandishi na mwongozo, si UI iliyovunjika.
- Design: nyeupe `#FFFFFF` · `#18A982` · `#3B82F6` · `#EAF8F3` · gold `#D4A72C`
  kwa nadra; Inter/Inter Tight; **hakuna** huge cards · excessive shadows ·
  gradients · glassmorphism. Mistari `#e7eeea`, umbali wa `var(--s-*)`.
- **Imepimwa (si kwa jicho):** media 4/3 → 358×269 px, 16/9 → 358×201 px kwenye
  simu 390 px (~⅓ ya skrini) — hakuna media inayotawala.

## 7. Tests

| Kipimo | Matokeo |
|---|---|
| `npm run build` | ✅ modules 70 · CSS **50.27 kB** (gzip 8.68) · JS **302.41 kB** (gzip 92.45) |
| `npm run smoke` | ✅ **92/92** (Phase 1: 43/43) — +49 checks za mkondo |
| `node scripts/shots.mjs` | ✅ **69/69** assertions (Phase 1: 43/43) — **console errors 0** |
| Picha za QA | `docs/shots/phase-2a/` (11 picha) · `docs/shots/phase-1/` (21 picha) |

**Browser verification (kwenye UI halisi):** Home inapakia · Mchanganyiko ndiyo
default · tabs 5 · Status/Stories zinafanya kazi · Create area ipo · mkondo
unaonyesha aina zote 8 · identity aina 5 zinaonekana kwenye Mchanganyiko ·
kichujio (Picha → 4) · hali tupu · More panel · View Mode panel · bottom nav 5 ·
desktop 1280×900 · tablet 834×1000.

**Smoke inathibitisha pia:** mapper (kind kwa kind, labels) · `formatAge` ·
deterministic ordering (mara mbili) · `TAB_RULES` · join ya entity · hesabu za
tabs · hakuna `mock.js` kwenye UI.

## 8. Regression

Mabadiliko yote yamepimwa kwa **pixel diff** dhidi ya picha za kabla ya 2A
(`docs/shots/*.png`, seti ya Phase 1):

| Kundi | Kurasa | Matokeo |
|---|---|---|
| Kurasa zisizo na mkondo | More menu · View mode · Create · Taarifa · Wasifu (2) · Soga · Gundua · Spaces · Business · Guide (2) | **12/12 = 0.000%** |
| Kurasa za Home | Home (simu, desktop, tablet), status scroll, kichujio, Home iliyosogezwa, More/Wasifu juu ya Home | tofauti **kwenye eneo la mkondo pekee** (simu: kuanzia y=462 CSS; desktop/tablet: safu ya mkondo) |

> Home juu: header · safu ya Status/Stories · Create area · Home tabs ·
> kichujio — **pikseli sawa kabisa** (y<462 CSS = tofauti 0).

Features zilizohifadhiwa bila regression: Status/Stories · tabs · Create area ·
kichujio cha maudhui · view mode · More panel · taarifa · akaunti/wasifu ·
bottom nav · responsive. Hakuna jina lililobadilishwa, hakuna redesign,
hakuna duplicate, hakuna refactor ya faili zisizohusika.

## 9. Firebase — **NOT STARTED**

Hakuna Firebase SDK · hakuna Firestore · hakuna Auth · hakuna Storage ·
hakuna config · hakuna API key. (Rejea: `grep -ri firebase src/` → comment pekee
inayoeleza mpaka wa Phase 1.)

## 10. Cloudinary — **NOT STARTED**

Hakuna Cloudinary SDK · hakuna unsigned upload preset · hakuna media pipeline.
Media zote ni placeholders za mock (tone/ratio/caption).

## 11. Next

**Home sub-phase pekee** (na bado kwa idhini ya owner):
- Uthibitisho wa owner wa muundo wa feed (mpangilio · primitives · Live Activity).
- **Phase 2B** (HAIJANZWA): undani wa Home — mfano: composer ya post, Reels tab
  ya kina, Friends tab ya kina, Channels ya kina, Live ya kina, maoni/engagement
  halisi, Hifadhi/Penda zikihifadhiwa.
- Kabla ya 2B: maamuzi ya owner kuhusu (a) `poll.myVote` & engagement state,
  (b) feed prefs (`Mapendeleo ya mkondo`) kuathiri mpangilio, (c) uanachama wa tab
  kwa entity (mfano live ya channel kwenye tab Channels).

## 12. Blocker / STOP

Hakuna blocker. Mabadiliko yote yamo ndani ya mipaka ya 2A (hakuna Firebase,
Cloudinary, backend, transport, Local DB, sync, payments, notifications backend).

> **SIMAMA** — Phase 2B haianzwi hadi owner aidhinishe.
