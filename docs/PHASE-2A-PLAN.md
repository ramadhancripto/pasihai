# PASIHAI — PHASE 2A PLAN: HOME FEED FOUNDATION

**Lengo:** msingi wa Home Feed kwa mock data, kupitia architecture seam ya Phase 1.
**Hali:** utekelezaji tu wa 2A. Soga/Spaces/Business/Reels-deep/Live-deep/Composer/Story-Viewer/Firebase/Cloudinary — **hazijagusa**.

---

## 1. INSPECTION (kilichopo kabla ya coding)

| # | Kipengele | Hali |
|---|---|---|
| 1 | Home service | `homeService.getNavigation()` · `getStatusStrip()` |
| 2 | Composition root | `data/repositories/index.js` — swap point (mock sasa) |
| 3 | Async hook | `hooks/useAsyncData.js` |
| 4 | Home components | `home/StatusRow.jsx` · `home/HomeTabs.jsx` · `home/CreateArea.jsx` · `panels.jsx` |
| 5 | Mock data | `posts` **12** (p1–p12) · `reels` **8** (r1–r8) · `liveSessions` **12** (l1–l12) — **zote hazijatumika bado** |
| 6 | Mahali pa feed | `contentRepository` (contract tayari inataja Phase 2) + service mpya `feedService` |
| 7 | Components za kutumika tena | `Identity` (+ `defaultRelationship`) · `Avatar` · `EntityBadge` · `MediaFrame` · `Waveform` · `Chip` · `useAsyncData` · `Dropdown` |

### Kinds zilizopo kwenye `posts` (zinafaa mahitaji ya 2A)
`text` (p1,p6,p9) · `announcement` (p2) · `image` (p3,p7) · `video` (p4) · `poll` (p5) ·
`product` (p8) · `audio` (p10) · `liveActivity` (p11) · `event` (p12)

---

## 2. DOMAIN/PREsentation MODEL YA FEED ITEM

```
{
  id, kind,                     // text|image|video|audio|poll|announcement|liveActivity|reel
  entity,                       // entity (kutoka identity repository)
  relationship,                 // 'Rafiki'|'Channel'|'Hub'|'Biashara'|'Mbunifu' (au undefined → UI fallback)
  ageMinutes,                   // NAMBA (si maandishi) — kwa mpangilio
  text, label,                  // maandishi + chip ya hiari ('Tangazo', 'Bidhaa', 'Tukio')
  media,                        // { tone, ratio, caption, duration, views }
  poll, live,                   // miundo ya aina maalum
  tabs[], filters[],            // uanachama wa Home tab + kichujio cha maudhui
  stats{ reactions, comments }  // engagement summary
}
```

## 3. MPANGILIO WA FILES

### Zitaundwa (9)
| Faili | Kazi |
|---|---|
| `src/data/mappers/feedMapper.js` | Kubadilisha posts/reels/liveSessions → feed items |
| `src/services/feedService.js` | Tab + filter + join ya entity + mpangilio wa deterministic |
| `src/utils/time.js` | `formatAge(minutes)` → 'dakika 12' / 'saa 1' / 'siku 1' |
| `src/components/feed/FeedList.jsx` | Orodha + hali ya kupakia + empty state + hesabu ya kichujio |
| `src/components/feed/FeedItem.jsx` | Shell: identity · label · body slot · actions |
| `src/components/feed/bodies.jsx` | Bodies: text · media · video · audio · poll · announcement · live · reel |
| `src/components/feed/FeedActions.jsx` | ♡ · 💬 · ↗ · hifadhi (hali ya ndani) |
| `src/styles/feed.css` | Muonekano wa feed (classes mpya pekee) |
| `docs/PHASE-2A-PLAN.md` | Hati hii |

### Zitabadilishwa (5) — additive pekee
| Faili | Badiliko |
|---|---|
| `src/data/mock.js` | + `ageMinutes` (namba) kwa posts 12, reels 8, liveSessions 12 — **hakuna kufuta** |
| `src/data/repositories/contentRepository.js` | + `listFeed()` (contract ilikuwa inataja Phase 2) |
| `src/pages/Home.jsx` | Ondoa ghost placeholder + kadi ya hali ya ujenzi → `FeedList` |
| `src/App.jsx` | + prop `onOpenProfile` kwa Home |
| `src/main.jsx` | + `import './styles/feed.css'` |
| `scripts/smoke.jsx` · `scripts/shots.mjs` | Checks za feed |

### Zisizoguswa
CSS zote zilizopo · `StatusRow` · `HomeTabs` · `CreateArea` · `panels.jsx` · `Header` · `BottomNav` ·
`Sheet` · `ui.jsx` · `icons.jsx` · `Account`/`Settings`/`Notification` services · tokens.

### Zisizofutwa
**0 faili.** (Ghost placeholder na kadi ya ujenzi ni code ndani ya `Home.jsx`, zilikuwa zimeandikwa
kuwa za muda — zinaondolewa kwa sababu feed inachukua nafasi yao; CSS classes zao zinabaki.)

## 4. MPANGILIO WA DETERMINISTIC (si ML)

```
score = relationshipWeight + recencyWeight + typeWeight
  relationship : friend 50 · hub 40 · channel 35 · creator 30 · business 25
  recency      : clamp(30 - floor(ageMinutes/60), 0, 30)      (+ bonasi ya live state)
  type         : liveActivity 10 · poll 8 · announcement 6 · reel 4 · video 3 · image 2 · audio 2 · text 0
tie-break: ageMinutes asc, kisha id
```
Hakuna behavior tracking, analytics, ML au recommendation engine.

## 5. VALIDATION
`npm run build` · `npm run smoke` · browser verification (mobile/tablet/desktop, console errors) ·
pixel diff: kurasa zisizo Home lazima **0.000%**; Home region ya juu (juu ya feed) lazima **0.000%**.
