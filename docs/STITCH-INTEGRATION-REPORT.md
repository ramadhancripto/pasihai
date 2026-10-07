# PASIHAI — STITCH INTEGRATION · STAGES 3–5: RIPOTI

**Tarehe:** 2026-10-07 · **Hali:** Stages 3–5 zimekamilika · **SIMAMA** kwa uhakiki wa owner
(kama ilivyokubaliwa: Q4 = simama baada ya Stage 5)
**Upeo:** tokens · foundation components · Home components (kadi-lite, identity pills, status
badges, utilities, live segments, discovery, end-of-feed)
**Hazijaanza:** Stages 6–10 (filter chips popover · View Mode "Full screen" · responsive pass ·
cleanup · verification ya mwisho) · Phase 2B

---

## 1. Maamuzi ya owner (Q1–Q4) — yametekelezwa

| # | Uamuzi | Utekelezaji |
|---|---|---|
| Q1 | **Card-lite** | Kadi: white surface · hairline `#e7eeea` 1px · radius **16** · hakuna shadow. Tokens: `--card-r/--card-pad/--card-gap` |
| Q2 | **Placeholders zetu + polish** | Hakuna picha ya nje iliyoingizwa; rekodi 4:5; scrim/duration zilizopo zimebaki |
| Q3 | **Reels player = Phase 2B** | Reel card (feed) imeboreshwa (4:5, 96px); player kamili haijajengwa |
| Q4 | **Simama baada ya Stage 5** | Ripoti hii; Stages 6–10 zinasubiri idhini |

---

## 2. Stage 3 — Design tokens & framing (card-lite)

| Kipengele | Kabla | Baada |
|---|---|---|
| Safu ya chapisho | tambarare + `border-bottom` | **kadi**: `padding 16px` · `border 1px var(--line)` · `border-radius 16px` |
| Nafasi kati ya posts | 0 (dividers) | `gap: 12px` (`--card-gap`) |
| Hali tupu | tambarare | kadi yenye border/radius |
| Rangi | haijabadilika | `#FFFFFF` · `#18A982` · `#3B82F6` · `#EAF8F3` · gold `#D4A72C` |
| Shadow | hakuna (imebaki) | hakuna — "hakuna huge cards / shadows" inaheshimiwa |

> Uthibitisho wa kiotomatiki: `Mkondo: kadi ni "card-lite" (border 1px · radius 16 · white)`.

## 3. Stage 4 — Foundation components

| Nyongeza | Mahali | Maelezo |
|---|---|---|
| `EntityPill` | `ui.jsx` + `components.css` | Pill ya identity kwa aina 6 (friend · channel · hub · business · creator · you) — muundo mmoja, doa la rangi |
| `Identity` prop `pill` | `ui.jsx` | Jina + pill mstari mmoja; **hakuna kurudia** kwa `rel` text (imeepushwa auto) |
| Icons 3 | `icons.jsx` | `IconHeadset` (Live audio) · `IconTimer` (replay) · `IconCalendarAdd` (imepangwa) → jumla **47** |
| Style guide | `StyleGuide.jsx` | Pills 6 zimeongezwa kwenye sehemu ya "Vifungo na vidhibiti" |

**Architecture safety:** `EntityPill` inaonyesha **identity pekee** (`entity.type`); relationship
hutolewa kwa `item.relationship` — dhana hazichanganywi (kanuni ya Phase 2A inaendelea).

## 4. Stage 5 — Home components

### 4.1 Status / Stories (`StatusRow` + mock)
- **Live badge** (error-red pill yenye pale yenye kupwita) kwa wastani wa waandaaji — Stitch equivalent.
- **Ring ya gold** kwa creator (Prestige Gold — hutumika kwa nadra, kama DESIGN.md inavyosema).
- Video badge ipo kama ilivyokuwa; "Status Yako" + more-item "Zote" hazijabadilika.

### 4.2 Home tabs row (`HomeTabs`)
- **Mstari mmoja** ukabaki: tabs 5 + **utilities 2** (kichujio cha maudhui · muonekano) — kama Stitch.
- Kichujio = **icon-only** (sliders) + `is-set` state (kijani) pale kichujio kinapotumika;
  **jina la kichujio halipo mbali** — linaonekana kwenye mstari wa hali ("Unatazama …") na
  ndani ya dropdown. Hivyo: safu ya pili ya kudumu **haipo** (Rule 8 inaheshimiwa).
- `aria-label` mpya: "Badilisha muonekano wa mkondo (sasa: Automatic)".

### 4.3 Create area (`CreateArea`)
- `prompt` inatoka kwa tab: Mchanganyiko "Nini kinaendelea?" · Friends "Shiriki jambo na marafiki
  zako…" · Reels "Unda Reel mpya…" · Channels "Tangaza kwa wanaofuatilia…" · Live "Anzisha kikao
  cha moja kwa moja…" (data: `homeTabs[].prompt`).

### 4.4 Feed card (`FeedItem` + `bodies` + `FeedActions`)
| Kipengele | Kilichoongezwa |
|---|---|
| Identity | Pill ya aina (badala ya maandishi ya relationship) |
| Poll | Alama ya vema ya kuchaguliwa ✅ + **"(Inaongoza)"** kwa chaguo linaloongoza |
| Tangazo | **Orodha ya mambo makuu** (highlights 3) + **CTA** ("Soma makala kamili") |
| Bidhaa / Tukio | **CTA** ("Wasiliana na muuzaji" · "Jiunge na warsha") |
| Engagement | **Shiriki** sasa inaonyesha hesabu pale ipo (mfano 420) |
| Live | **Jukwaa la wasemaji** (avatars zilizounganishwa kwa service) + **waveform** kwa Sauti + icon ya mode (headset/video/live) + icon kwenye CTA (Jiunge → · Tazama tena ↻ · Kumbuka 🗓) |

### 4.5 Feed list (`FeedList`)
| Kipengele | Maelezo |
|---|---|
| **Live segments** | Pills 3 *ndani ya tab ya Live*: Inaendelea (6) · Zilizopangwa (3) · Zilizopita (3) — Stitch equivalent; si safu ya Home |
| **Channels discovery** | "Channels zinazopendekezwa" (Tech Sasa · Elimu Yetu) + kitufe **Fuata** — data kwa `feedService.getChannelSuggestions()` |
| **Mwisho wa mkondo** | "Umesoma yote kwa leo!" + CTA "Fungua Soga" (ni hali halisi, si maudhui ya kubuni) |

---

## 5. Architecture (Rule 2, 7 — imehifadhiwa)

```
Home.jsx → FeedList → feedService.getFeed({tab,filter})        ← service MOJA
                   → feedService.getChannelSuggestions()          (mpya, ndogo)
                        ↓
        contentRepository.listFeed() · identityRepository.listUsers()
        identityRepository.listChannelSuggestions()               (mpya, ndogo)
                        ↓
        feedMapper.mapFeed()  →  mock.js (additive)
```
- **Hakuna feed system ya pili** (Rule 7) · **hakuna UI inayogusa `mock.js`** (viungo 0).
- Speakers wa Live wanakuwa entities **kwa service** (join), si kwa UI.
- `user.type` = identity pekee; relationship/visibility/permission hazijachanganywa.

## 6. Data (additive pekee — hakuna kufuta)

| Mock | Kilichoongezwa |
|---|---|
| `homeTabs[]` | `prompt` kwa kila tab |
| `statuses[]` | `live: true` kwa 2 (Sara, Neema) |
| `posts p2` | `highlights[3]` · `cta` · `shares 420` |
| `posts p4` | `shares 63` |
| `posts p8` | `cta` |
| `posts p12` | `cta {tone: primary}` · `shares 36` |
| `liveSessions l4/l5/l8` | `speakers[3]` · `l4.waveform[12]` |
| mpya | `channelSuggestions = ['techSasa','elimuYetu']` |

**Vipimo havijabadilika:** Mchanganyiko 20 · Reels 8 · Friends 10 · Channels 4 · Live 12 ·
filters (posts 10 · picha 4 · video 9 · audio 2 · polls 1 · live 1 · matangazo 1).

## 7. Tests (zote zimeendeshwa)

| Kipimo | Matokeo |
|---|---|
| `npm run build` | ✅ CSS **55.30 kB** (gzip 9.37) · JS **309.04 kB** (gzip 94.34) |
| `npm run smoke` | ✅ **107/107** (kabla: 92) — +15 checks za Stage 5 |
| `node scripts/shots.mjs` | ✅ **79/79** assertions (kabla: 69) — **console errors 0** |
| Picha | `docs/shots/phase-2a/` (12) · `docs/shots/phase-1/` (21) |

Checks mpya za smoke: highlights/CTA/shares za tangazo · CTA za bidhaa/tukio · speakers wa Live
(walio-join) · waveform · channel suggestions · status live/gold-ring · EntityPill kwenye FeedItem ·
hakuna `psh-ident__rel` inaporudiwa · live segments 6/3/3 · StyleGuide icons 47.

## 8. Regression (pixel diff dhidi ya picha za kabla ya Stage 3)

| Kundi | Matokeo |
|---|---|
| **Soga · Gundua · Spaces · Business · StyleGuide (desktop)** | **0.000%** ✅ |
| Panels (More · View mode · Create · Taarifa · Wasifu ×2, simu + desktop) | 0.08–5.98% — **zote iko kwenye kona ya juu-kulia** (x 560–780): kitufe kipya cha muonekano kwenye safu ya tabs |
| Home (simu · desktop · tablet) | mabadiliko **kwenye eneo la mkondo** (kadi, pills, segments) |

> Tofauti za panels ni **zilizokusudiwa** (utilities za Stitch kwenye safu ya tabs); hazigusi
> maudhui ya panel yenyewe. StyleGuide components +4.99% = pills 6 mpya + icons 3 mpya.

## 9. Rules 8–12 — hali

| Rule | Hali |
|---|---|
| 8 ONE primary Home row | ✅ tabs 5 pekee; filter + view mode ni **icon utilities** kwenye mstari ule ule |
| 9 View Mode control moja | ✅ (`ViewModePanel`); mode ya 4 "Full screen" = **Stage 6** |
| 10 Content filter moja | ✅ (`FilterMenu`); chips-popover = **Stage 6** |
| 11 Bottom nav 5 | ✅ haijabadilika (0.000% kwenye kurasa za chini) |
| 12 No other products | ✅ |

## 10. Faili

**Modified (22):** `styles/{tokens,components,home,feed}.css` · `components/{ui,icons}.jsx` ·
`components/home/{StatusRow,HomeTabs,CreateArea}.jsx` · `components/feed/{FeedItem,FeedActions,bodies,FeedList}.jsx` ·
`pages/{Home,StyleGuide}.jsx` · `data/mock.js` · `data/mappers/feedMapper.js` ·
`data/repositories/identityRepository.js` · `services/feedService.js` · `scripts/{smoke.jsx,shots.mjs}` ·
`README.md`
**Created (3 code/docs + 2 screenshots):** `docs/STITCH-AUDIT.md` · `docs/STITCH-INTEGRATION-REPORT.md` ·
`docs/shots/phase-2a/{16-live-zilizopangwa,17-channels-mwisho}.png`
**Deleted: 0** ⛔

## 11. Safu inayofuata (Stage 6–10 — inasubiri idhini)

1. **Stage 6:** filter popover → chips (chips 9, moja active) · View Mode mode ya 4 **"Full screen"**
   + maelezo mafupi kwa kila mode (kutoka board ya Stitch).
2. **Stage 6b (counts-sensitive):** **event RSVP card** ("Nitakuwepo"/"Sitaweza") — inahitaji post
   mpya ya rafiki na kusasisha vipimo (Mchanganyiko 20→21); nimeisimamisha kwa makusudi ili
   tuifanye hatua moja ya data iwe wazi.
3. **Stage 7:** responsive pass (hakuna duplicates za pages; tablet/desktop).
4. **Stage 8:** integration check · **Stage 9:** cleanup (CSS ya `.psh-feedghost` iliyoachwa) ·
   **Stage 10:** verification ya mwisho + ripoti ya sehemu 10.

> **SIMAMA** — Phase 2B na Stages 6–10 hazianzi bila idhini.
