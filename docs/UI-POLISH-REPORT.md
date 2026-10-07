# PASIHAI — UI POLISH / REALISTIC REFINEMENT · RIPOTI

**Tarehe:** 2026-10-07 · **Aina:** polish pass (si redesign)
**Hali:** imekamilika · **SIMAMA** — Stage 6+ hazijaanza

> Kanuni iliyofuatwa: **80% ufafanuzi wa bidhaa + 20% polish ya muonekano.**
> Hakuna navigation mpya · hakuna feature mpya · hakuna safu ya pili ya Home ·
> hakuna component duplicate · hakuna lugha ya pili ya muonekano.

---

## 1. Kilichoboreshwa

### 1.1 Kadi (Card-lite — imara, sasa na hali)
| Kipengele | Kabla | Baada |
|---|---|---|
| Kadi | white · hairline · radius 16 | + **transition ya border** · hali ya hover ya desktop (`hover: hover`) |
| Nafasi ya ndani | body 10px · actions 10px | body **12px** · actions **12px + separator 1px** |
| Usawa wa desktop | media 4:3 kamili | media **max-height 420px** — kadi isitawale skrini |
| Tofauti za aina | label chip | label chip + **role pill** + content-specific bodies (tangazo/kura/live/reel/bidhaa/tukio) — muundo mmoja, variants zinazolengwa |

### 1.2 Buttons (hierarchy kamili)
| Daraja | Matumizi | Hali |
|---|---|---|
| Primary (green) | kitendo kikuu (Fuata · Jiunge · Fungua Soga) | hover `#149174` · pressed scale .985 |
| Secondary (border) | vitendo vinavyosaidia (Ujumbe · Wasiliana · Shiriki wasifu) | hover `--bg-subtle` |
| **Done/tertiary** (mpya) | uhusiano umo tayari (**Unafuatilia · Umejiunga · Rafiki**) | ✓ icon + rangi tulivu |
| Quiet/Ghost | vitendo vyepesi (kwenye kadi) | hover green-soft / neutral |
| Icon button | utilities (36px) | size moja · hover · pressed · disabled (opacity .45) |
| `--sm` (32px) | kadi (Fuata kwenye discovery) | touch target inatosha |

**Pill** imebaki kwa maana yake pekee: chips, entity pills, filter/segment pills.

### 1.3 Identity — ROLE ≠ RELATIONSHIP ≠ ACTION (spec §19–23, §28–30)
```
ROLE         pill ndogo: "Mtu · Channel · Hub · Biashara · Mbunifu"   (aina ya entity)
RELATIONSHIP meta:      "Rafiki · Unafuatilia · Umejiunga"            (uhusiano wangu)
ACTION       kitufe:    "Ongeza rafiki · Fuata · Jiunge · Wasiliana"  (kwa aina ya entity)
```
- **`defaultRelationship` imerekebishwa**: sasa inatoa *relationship* (si role) — `Rafiki`,
  `Unafuatilia`, `Umejiunga`, `Wewe`.
- **`EntityAction` (mpya)**: kitendo hufuata aina ya entity; kinabadilika rkama uhusiano upo
  (Fuata → Unafuatilia · Jiunge → Umejiunga) kwa ✓ + hali tulivu.
- **`entityRoles` / `entityActions` (mpya, kwenye mock)**: Person · Channel · Hub · Community ·
  Group · Business · Creator · You — zinatumika kila mahali (feed · discovery · wasifu).
- **Wasifu**: jina · ROLE (herufi ndogo za juu) · handle · RELATIONSHIP · ACTION + secondary
  (Biashara → Wasiliana).
- **Discovery (Channels)**: role marker + action ya aina + hali ya done.
- **Kanuni**: role haibadiliki; relationship inaweza kubadilika; hazichanganywi.

### 1.4 Status / Stories
- Ring **70 → 64px**, avatar 62 → 56, nafasi 8/12 → 6/10 → **sehemu compact** (haichukui skrini).
- Jina **74px** (linafikia "Status Yako" bila kukatwa); muda chini yake.
- Hali: own (+ · soft) · live (badge nyekundu yenye kupwita) · video (badge bluu) ·
  creator (ring gold) · viewed (ring tulivu).
- Scroll mlalo + scroll-snap — haiathirika.

### 1.5 Feed (typography · metadata · media · interactions)
- Media: **scrim** hafifu kwenye video/reel · **badge ya watazamaji** (24.7K) upande wa kushoto ·
  muda (4:12) kulia — metadata halisi, si idadi ya kubuni ila inayowakilisha muundo.
- Kura: "(Inaongoza)" + ✓ · nafasi · hali ya kushinikiza.
- Live: meta kwa **icon ya jicho** + watazamaji; jukwaa la wasemaji; CTA yenye icon.
- Reel: scrim kwenye kijipicha + muda.
- **Hali ya kupakia (skeleton)**: kadi mbili zenye muundo ule ule (hai ni ya kweli, si ya kubuni).
- **Kuingia kwa mkondo**: fade + slide 3px (180ms) — hupunguzwa kwa `prefers-reduced-motion`.

### 1.6 Bottom navigation (bila destinations mpya)
- Touch target: **≥44px** (`min-height`) · padding 8/7 · icon 24 · label 11px/0.015em.
- Hali ya active: rangi ya green + **kionyeshi kidogo** juu ya icon (2px) — wazi, si mapambo.
- `:active` background hafifu.

### 1.7 Spaces — iconi za Stitch (spec §10)
- Iconi **moja kwa kila dhana**, zile zile zinazotumika kila mahali:
  **Hubs → IconHub · Jumuiya → IconGlobe · Vikundi → IconSpaces · Faragha → IconShield ·
  Channels → IconMegaphone**.
- Zinatumika kwenye orodha ya "Kile kitakachokuwemo" na kwenye kadi za "Aina za Spaces".
- Hakuna lugha ya pili ya iconi; hakuna iconi za mapambo.

### 1.8 Responsive
- Mobile: compact (status 64 · kadi 16/12 · nav 44+).
- Tablet 834: muundo ule ule.
- Desktop 1280: safu 640 · media ≤420px · nav rail — **hakuna kunyoosha UI ya simu**.

---

## 2. Uthibitisho (umeendeshwa kweli)

| Kipimo | Matokeo |
|---|---|
| `npm run build` | ✅ CSS **57.x kB** · JS **312.4 kB** (gzip 95.19) |
| `npm run smoke` | ✅ **114/114** (+7 checks: role/relationship/actions/vocabulary) |
| `node scripts/shots.mjs` | ✅ **80/80** · console errors **0** |
| Picha za ukaguzi | `docs/review/polish/` (14) + `gallery.html` |

**Regression:** kurasa za chini (Soga · Gundua · Business · Guide) **0.09–0.31%** ya pikseli —
bila mabadiliko ya mpangilio (ni rasterization ya maandishi/iconi tu); Spaces inabadilika
**kwa makusudi** (iconi mpya za Stitch).

## 3. Final quality test (§18)

| Swali | Jibu |
|---|---|
| Inaonekana halisi zaidi? | ✅ — metadata, watazamaji, muda, hali za vitendo |
| Ni ya kitaalamu zaidi? | ✅ — hierarchy ya buttons, nafasi, hali zote za mwingiliano |
| Ni polished zaidi? | ✅ — scrim, badges, skeleton, fade |
| Hierarchy iko wazi? | ✅ — ROLE pill → jina → RELATIONSHIP → muda → content → actions |
| Kadi zinasomeka haraka? | ✅ — kichwa kimoja, content, media, actions |
| Buttons zinaeleweka? | ✅ — primary · secondary · ghost · icon · done |
| Iconi ni consistent? | ✅ — seti moja (SVG 47) + msimbo wa Spaces |
| Spaces inatumia lugha ya Stitch? | ✅ — hub · globe · spaces · shield · megaphone |
| UI bado ni safi? | ✅ — hakuna shadow kubwa/gradient/glass/dark |

## 4. Faili

**Modified (16):** `styles/{components,home,feed,panels,placeholder,shell}.css` ·
`components/{ui,panels}.jsx` · `components/home/StatusRow.jsx` ·
`components/feed/{FeedItem,FeedList,bodies}.jsx` · `pages/PlaceholderPage.jsx` ·
`data/mock.js` · `data/repositories/catalogRepository.js` · `services/{accountService,feedService}.js` ·
`scripts/{smoke.jsx,shots.mjs}`
**Created:** `docs/UI-POLISH-REPORT.md` · `docs/review/polish/*` (14 PNG + gallery)
**Deleted: 0** ⛔

## 5. Baada ya polish (bado kwa idhini)

Stage 6 (filter chips popover · View Mode "Full screen") · RSVP · Stage 7–10 · Phase 2B (Reels player).
