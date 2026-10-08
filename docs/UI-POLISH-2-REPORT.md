# PASIHAI — UI POLISH · MZUNGUKO WA 2 · RIPOTI

**Tarehe:** 2026-10-07 · **Aina:** polish pass (si redesign) — mzunguko wa 2
**Hali:** imekamilika · **SIMAMA** — Stage 6–10 bado hazijaanza

> Agizo la owner: (a) **Spaces icon → watu watatu** (kama Stitch), (b) **boresha muonekano urembe
> kidogo uwe professional** (cards · buttons), (c) **punguza kidogo upako** (density).
>
> Kanuni zilizofuatwa: 80% ufafanuzi wa bidhaa + 20% polish · hakuna IA/navigation/feature mpya ·
> hakuna kufuta components · polish, si redesign.

---

## 1. Kilichofanyika

### 1.1 Spaces iconi → watu watatu (agizo (a))
| Kipengele | Kabla | Baada |
|---|---|---|
| `IconSpaces` | watu **wawili** | watu **watatu** (kichwa cha kati r 2.7 · vichwa viwili r 2.05 · arcs) — kama Stitch |
| Matumizi | bottom nav + Spaces orodha | **yale yale** (nav `Spaces`, orodha `Vikundi`) — seti moja ya iconi, hakuna duplicate |
| Iconi zingine | — | Hazijagusa (Hub · Globe · Shield · Megaphone zimebaki) |

### 1.2 Muktadha wa tab (mstari mmoja — bila kelele)
| Kipengele | Maelezo |
|---|---|
| `homeTabs[].meaning` | Kila tab ya Home ina sentensi MOJA ya maelezo (`mock.js`) |
| `Home.jsx → FeedList` | Prop `tabMeaning` — UI haigusi `mock.js` moja kwa moja |
| `.psh-feed__context` | Mstari mdogo (12px · `--t-3`) chini ya Home row — **haujirudii** kwenye kila kadi |

Maneno halisi (yaliyothibitishwa kwa mtihani):

| Tab | Muktadha |
|---|---|
| Mchanganyiko | Marafiki, Channels, Spaces na biashara — vyote mahali pamoja. |
| Reels | Video fupi — moja kwa wakati, bila kupoteza mkondo. |
| Friends | Machapisho na matukio kutoka kwa marafiki zako pekee. |
| Channels | Matangazo kutoka Channels unazofuata — si mazungumzo. |
| Live | Vikao vya moja kwa moja: video, sauti na Live Activity. |

### 1.3 Upako umepunguzwa (density — agizo (c))
| Eneo | Kabla | Baada |
|---|---|---|
| Nafasi kati ya kadi (`--card-gap`) | 12px | **10px** |
| Status row | margin-top s-2 · padding 6/10 | **2px · 4/6** |
| `.psh-strip` (hali ya juu) | padding s-3 2px s-1 | **8px 2px 0** |
| Home row (tabs) | padding 13/12 | **11/10** |
| Mstari wa kuchapisha | margin s-4 · padding s-3 | **10px · 10px** |
| Quick actions | gap 2px 6px | **2px 4px** |
| Orodha ya feed | padding-top s-3 | **10px** |
| Mwisho wa feed | padding s-8/s-5 · icon 42 | **22/20 · 38px** |
| Kadi ya ugunduzi | padding card-pad · head s-3 · item 8 | **14px · 6px · 7px** |
| Empty state | padding s-8 · margin s-3 | **22px · 10px** |
| Kurasa za chini | pt s-5 / pb s-6 · head pb s-4 | **pt s-4 / pb s-5 · head 14px** |
| Orodha za kurasa | item 11px | **9px** |
| Typecards | minmax 180 · wrap s-3 | **minmax 210 · wrap 12px** |

### 1.4 Urembe wa professional (cards · buttons — agizo (b))
| Kipengele | Kabla | Baada |
|---|---|---|
| Primary button | rangi tupu | + **shadow `--sh-1`**; `:active` inaiondoa (mrejesho wa kugusa) |
| Hali **“imekamilika”** (Unafuatilia · Umejiunga) | kijivu (`--bg-subtle`) | **kijani tulivu** (`--c-green-soft` → hover `--c-green-soft-2`, maandishi `--c-green-700`) — inasoma kama HALI, si kitufe kipya |
| Kadi za aina (typecards) | icon juu · jina · maelezo | **kichwa kimoja**: icon 26px + jina mstari mmoja, kisha maelezo — denser na safi |
| Tokeni mpya | — | `--c-green-soft-2: #DCF1E8` (hali ya kumaliza) |

### 1.5 Yasiyobadilika (kwa makusudi) ⛔
IA · Home row (Mchanganyiko · Reels · Friends · Channels · Live) · bottom nav **5** ·
view mode control · content filter · rangi za PASIHAI · button hierarchy yenyewe (Primary/
Secondary/done/ghost/icon) · ROLE ≠ RELATIONSHIP ≠ ACTION · hakuna over-badge ·
hakuna navigation/feature mpya · hakuna component iliyofutwa.

---

## 2. Uthibitisho (umeendeshwa kweli)

| Kipimo | Matokeo |
|---|---|
| `npm run build` | ✅ CSS **60.79 kB** (gzip 10.27) · JS **312.93 kB** (gzip 95.36) |
| `npm run smoke` | ✅ **114/114** |
| `node scripts/shots.mjs` | ✅ **80/80** · console errors **0** |
| Muktadha wa tab (runtime) | ✅ mistari 5/5 inaonekana; `console` 0 |
| Picha za ukaguzi | `docs/review/polish/` (**17**) + `gallery.html` (2.1 MB, base64) |

**Alama muhimu:** `scripts/smoke.jsx` na `scripts/shots.mjs` **hayakuguswa** mzunguko huu —
assertions zote za awali zinaendelea kupita bila kubadilishwa. Hakuna tab/route/behavior iliyobadilika.

---

## 3. Final quality test (§18)

| Swali | Jibu |
|---|---|
| Inaonekana halisi zaidi? | ✅ — muktadha wa tab, metadata, hali za vitendo |
| Ni ya kitaalamu zaidi? | ✅ — shadows ndogo kwenye primary, hali ya “done” ya rangi, typecards zenye kichwa kimoja |
| Upako umepunguzwa? | ✅ — nafasi 10–25% ndogo kwenye strip/tabs/feed/end/discover/kurasa |
| Hierarchy iko wazi? | ✅ — ROLE pill → jina → RELATIONSHIP → muda → content → actions |
| Buttons zinaeleweka? | ✅ — primary · secondary · done (kijani) · ghost · icon |
| Iconi ni consistent? | ✅ — seti moja (SVG); Spaces = watu watatu kila mahali |
| Kadi zinasomeka haraka? | ✅ — kichwa kimoja, content, media, actions — bila kurudia |
| UI bado ni safi? | ✅ — hakuna gradient/glass/dark/over-badge |
| Tumbo la kwanza linaonyesha zaidi? | ✅ — denza za juu zinaonyesha kadi zaidi bila kuzidiwa |

---

## 4. Faili

**Modified (10):**
`src/components/icons.jsx` · `src/components/feed/FeedList.jsx` · `src/pages/Home.jsx` ·
`src/pages/PlaceholderPage.jsx` · `src/data/mock.js` ·
`src/styles/{tokens,components,home,feed,placeholder}.css`

**Created (2):** `docs/UI-POLISH-2-REPORT.md` · picha 3 mpya (`11-spaces-top.png`,
`15-done-state.png`, `16-tab-context.png`) + `gallery.html` imeandikwa upya (17 picha)

**Deleted: 0** ⛔

---

## 5. Baada ya mzunguko huu (bado kwa idhini)

Stage 6 (filter chips popover · View Mode “Full screen” · RSVP) · Stage 7–10 ·
Phase 2B (Reels player) · Reels/Live denser heuristics (ikiwa owner ataona bado pana).

**SIMAMA** — hakuna kazi inayoendelea bila idhini mpya.
