# PASIHAI — N. SPACES (Mkusanyiko wa utekelezaji)

**Tarehe:** 2026-10-08 · **Awamu:** N (baada ya audit `docs/SPACES-AUDIT.md`)
**Muundo:** Hubs & Jumuiya (familia moja) | Channels (tawi la kuchapisha) — hakuna sehemu ya nne.
**Vilango:** `npm run build` ✓ · `npm run smoke` **460/460** ✓ · `npm run shots` **331/331** ✓ console 0

---

## 1. KILICHOJENGWA (kwa muhtasari)

Spaces kutoka **placeholder** → **bidhaa halisi** yenye safu tatu:

| Safu | Kilichoongezwa |
|---|---|
| **Data** | `spacesMeta` · `spacesMembers` · `spacesGroupLinks` · `spacePosts` (mock) + `spacesRepository` (muktadha/uanachama/ufikivu) |
| **Application** | `spacesService` (view models: orodha · Space · Channel · Unda · Nafasi Zangu) + `feedService.getSpaceFeed` |
| **UI** | `pages/Spaces.jsx` · `SpacePage` · `ChannelPage` · `SpacePanels` (Unda hatua 3) · `SpacesBits` (kadi/sehemu) · `styles/spaces.css` |

**Vitendo halisi (hali ya kikao, bila backend):** kujiunga · kutoka · ombi la kujiunga (private-listed) ·
mwaliko pekee (private-hidden) · kufuata channel · kuhudhuria tukio · kuhifadhi rasilimali kwa matumizi bila
mtandao · kuunda Space · kupenda/kuhifadhi/kutoa maoni kwenye shughuli za Space.

---

## 2. MUUNDO ULIOTEKELEZWA (§0–§3, §6, §16, §30)

```
Spaces (nav item ileile — hakuna route mpya)
├── HEADER: jina · tafuta · Unda Space
├── TABS: [Hubs & Jumuiya] [Channels]
├── VICHUJIO: Zote · Nafasi Zangu · Karibu Nami · Nipya Kwangu
└── SEHEMU: Nafasi Zangu (rail) → Zinazopendekezwa (grid)

Space (Hub · Jumuiya — MUUNDO MMOJA)
├── HEADER: jalada · nembo · jina ✓ · handle · wanachama · eneo · alama ya ufikivu
├── CTA: Jiunge / Omba kujiunga / Mwaliko pekee / Umejiunga / Wewe ni msimamizi
└── TABS 6: Muhtasari · Shughuli · Watu · Matukio · Rasilimali · Kuhusu

Channel (TAWI la kuchapisha — muundo tofauti)
├── HEADER: jalada · nembo · jina ✓ · @handle · kategoria · wafuatiliaji
└── TABS 4: Vilivyoteuliwa · Mapya · Media · Kuhusu (+ sehemu ya Msimamizi)
```

**Kwa nini hub na jumuiya zina muundo mmoja:** §2 — ni familia moja (mahali/people/activity/events/resources/
participation). Channel ni creator → content → hadhira (§3), kwa hivyo ina muundo wake.

---

## 3. REUSE — mifumo iliyopo (hakuna engine ya pili)

| Kitu | Kilichotumika | Uthibitisho (smoke) |
|---|---|---|
| Mkondo wa Space | `feedService.getSpaceFeed` (enrich/filter/order **zilezile**) · `FeedList` (`spaceId`) · `FeedItem`/`FeedActions`/`FeedPanels` | `N4` |
| Content ya Space | `contentRepository.listSpacePosts` (mapper mmoja) | `N4` |
| Matukio | content ya `kind:'event'` (hakuna engine) | `N5` |
| Rasilimali | `systemService` Save Offline (ids `o1…o3`) | `N6` |
| Vikundi | `gunduaService.join('group')` → conversation ya Chat iliyopo | `N7` |
| Uanachama | `gunduaRepository.join/leave` + `identityRepository.isFollowing` | `N10` |
| Watu/roles | `identityRepository` (Owner · Admin · Editor · Moderator kama **data**) | `N3` |
| Vitufe/icons/CSS | `.psh-btn` · `icons.jsx` · tokens za PASIHAI | `N11` |
| Panels | `Sheet` ileile + stack ileile | — |

**Content ya Space HAIINGII mkondo wa Home kimya kimya** (§8/§44): `N4` unathibitisha `listFeed` haiongezeki
wala haionyeshi `sp*`. Ugavi ni uamuzi wa content (baadaye: Space · Home · Gundua · Profile · Search).

---

## 4. UFIKIVU (§5, §15, §29) — hali, si aina ya kitu

| Hali | Tabia | Uthibitisho |
|---|---|---|
| **Wazi (Public)** | inaonekana Spaces/Gundua · `Jiunge` mara moja | `N2` |
| **Binafsi — Iliyoorodheshwa** | utambulisho unaonekana (jina · aina · alama) · content haipatikani · `Omba kujiunga` | `N2` (`familiaYetuHub`) |
| **Binafsi — Fichwa** | haipatikani kwa kutafuta · mwaliko/kiungo pekee | `N2` (`studioNeema`, `wakulimaMbeya`) |

- **Hakuna “Private Space” object** kwenye data layer (`N2`).
- **Eneo = umuhimu pekee**: kichujio `Karibu Nami` kinapanga (Tanzania/Dar kwanza) — hakifungui wala kufunga
  kitu (`N3` inaeleza kwenye Kuhusu; hakuna kanuni ya ruhusa inayotegemea eneo).
- Spaces **fichwa** hazionekani kwenye orodha; zinaonekana kwenye *Nafasi Zangu* kama umejiunga/umiliki.

---

## 5. MAAMUZI YA AUDIT (§L) — yaliyotekelezwa

| # | Swali la audit | Uamuzi uliotekelezwa |
|---|---|---|
| 1 | ukurasa mmoja au wawili? | **Ukurasa mmoja wa Spaces** (tabs 2) + **SpacePage** (Hub/Jumuiya) + **ChannelPage** tofauti |
| 2 | `upNext.spaces` | **imeandikwa upya** (Hubs & Jumuiya | Channels; hakuna Vikundi, hakuna Private Space) |
| 3 | Drafts/Scheduled | **hazijengwi** — hakuna hali ya kubuni (ripoti: mipaka) |
| 4 | takwimu za Channel | **halisi pekee**: wafuatiliaji · machapisho · reactions · maoni · kushiriki · matukio — **hakuna Mapato/Views** |
| 5 | Matukio/Rasilimali | **content + Save Offline** (hakuna engine) |
| 6 | Home integration | content ya Space **haitoki** Home kimya kimya; mkondo wa Home haubadiliki |
| 7 | hatua | S1–S12 zimefanywa kwa mfuatano mmoja (build+smoke kwa kila hatua), bila kuacha hatua iliyofeli |

---

## 6. FAILI (FILE DISCIPLINE)

### FILES CREATED (8)
| Faili | Kwa nini | Dependency |
|---|---|---|
| `src/data/repositories/spacesRepository.js` | muktadha/uanachama/ufikivu wa Spaces | mock (data) + repositories zilizopo |
| `src/services/spacesService.js` | application layer (UI haisomi repositories/mock) | spacesRepository |
| `src/pages/Spaces.jsx` | ukurasa halisi wa nav (placeholder → bidhaa) | spacesService, SpacePage, ChannelPage, SpacePanels |
| `src/components/spaces/SpacesBits.jsx` | kadi 2 (mahali | channel) + sehemu | ui.jsx, icons.jsx, GunduaBits (SectionHead/Rail) |
| `src/components/spaces/SpacePage.jsx` | Space (Hub/Jumuiya) — tabs 6 | FeedList, spacesService |
| `src/components/spaces/ChannelPage.jsx` | Channel — tabs 4 + msimamizi | FeedList, spacesService |
| `src/components/spaces/SpacePanels.jsx` | Unda Space (hatua 3) | spacesService, ui.jsx |
| `src/styles/spaces.css` | layout pekee (tokens, 44px, media queries) | — |

### FILES MODIFIED (12)
| Faili | Badiliko (minimum) |
|---|---|
| `src/data/mock.js` | +`spacesMeta` · `spacesMembers` · `spacesGroupLinks` · `spacePosts`; `upNext.spaces` imeandikwa upya; `user.spaces`→`areas` (hub tags) |
| `src/data/repositories/index.js` | +`spacesRepository` (swap point moja) |
| `src/data/repositories/contentRepository.js` | +`listSpacePosts(spaceId)` (njia ileile ya mapper) |
| `src/data/repositories/gunduaRepository.js` | +`leave(type,id)` (chanzo kimoja cha uanachama) |
| `src/data/repositories/identityRepository.js` | *(hakuna badiliko — `isFollowing` ilikuwepo)* |
| `src/data/mappers/feedMapper.js` | +`sourceKind` (kichujio cha Matukio bila kutegemea label) |
| `src/services/feedService.js` | refactor ndogo: `loadFeedState`/`enrichFeedItems` (zinashirikiwa) + `getSpaceFeed` |
| `src/services/accountService.js` | *(hakuna badiliko)* |
| `src/App.jsx` | route `spaces` → `<Spaces/>`; panel `create-space`; `openSpace`; nav reset ya Spaces |
| `src/components/panels.jsx` | CreatePanel + sehemu “Anza Space” (3 aina); ProfilePanel + tab `Nafasi Zangu`; safu ya “Nafasi zangu” kwenye wasifu |
| `src/components/feed/FeedList.jsx` | hiari `spaceId`/`spaceLabel` (mkondo wa Space) |
| `src/pages/PlaceholderPage.jsx` | *(hakuna badiliko — inabaki kwa Business)* |
| `src/main.jsx` | +import `spaces.css` |
| `scripts/smoke.jsx` | +67 assertions (N1–N12) + render ya `<Spaces/>`; placeholder test = gundua/business |
| `scripts/shots.mjs` | sehemu **N** (21 picha, 25 assertions) + Business pekee kwenye placeholder |
| `docs/SPACES-AUDIT.md` | *(hapana badiliko — kumbukumbu ya awamu 0)* |

### FILES DELETED (0)
**Hakuna faili, component, mock, token, icon, page, test au screenshot iliyofutwa.**

---

## 7. QA — namba halisi

| Kipimo | Kabla (M) | Baada (N) |
|---|---|---|
| `npm run build` | ✓ CSS 126.73 kB · JS 564.63 kB | ✓ CSS **143.54 kB** (gz 21.48) · JS **627.81 kB** (gz 177.49) |
| `npm run smoke` | 393/393 | **460/460** (+67) |
| `npm run shots` | 294/294 · console 0 | **331/331** (+37) · console **0** |
| Nav destinations | 5 | **5** (haijabadilika) |
| Picha | 294 | **315** (`docs/shots/spaces/` = 21) |

**Sehemu mpya za smoke:** N1 orodha · N2 ufikivu · N3 Space page · N4 shughuli/mkondo · N5 matukio ·
N6 rasilimali/offline · N7 vikundi→Chat · N8 channel · N9 uundaji · N10 uanachama · N11 hakuna mifumo ya pili
(a11y · tokens · nav 5) · N12 hakuna routes mpya.

**Picha za Spaces (`docs/shots/spaces/`):** 01 orodha · 02 hub muhtasari · 03 shughuli · 04 watu · 05 matukio ·
06 rasilimali · 07 kuhusu · 08 jumuiya · 09 kikundi→Chat · 10 channels tab · 11 channel page ·
12 msimamizi · 13–16 Unda (hatua 1–3 + Space mpya) · 17 nafasi zangu · 18 wasifu · 19 hali tupu ·
20 desktop (1440px, grid 3 safu) · 21 jumuiya ya afya.

---

## 8. MIPAKA YA UKWELI (hakuna kuiga)

| Kitu | Hali |
|---|---|
| Backend / Auth / Firestore / Storage | ⛔ hakuna — hali ya kikao (inapotea ukifunga app) |
| Drafts / ratiba za Channel (§47.27–28) | ⛔ **hazijajengwa** — hakuna hali ya kubuni |
| Takwimu za views/mapato | ⛔ hakuna; UI inaonyesha **reactions · maoni · kushiriki · wafuatiliaji** pekee |
| Upload/played media halisi | ⛔ `MediaFrame`/placeholder kama awali |
| Comments/blocking wa Space-level | zinapita kwenye chapisho husika (mfumo uleule) |
| Roles za Space (kubadilisha watu) | zinaonekana kama **data**; mchakato wa kuongeza mtu ⛔ haujajengwa |
| Analytics/notifications za Space | hazipo (notification service ipo kwa Home) |

Maeneo haya yanaonekana kwenye UI kama **maelezo ya ukweli**, si vitufe vinavyodai kufanya.

---

## 9. STITCH — kilichotumika na kilichokataliwa

**Iliyotumika (muundo/IA):** `code (18)` Hub Kariakoo (Hub Pulse · post · event · resource) · `code (24)` Hub
Dar Tech (Wasimamizi · Vikundi) · `code (16)` Community (Purpose · Events · Featured Resources) ·
`code (20)` mgmt (tabs Hubs & Communities | Channels) · `code (1)` Create (aina 3) · `code (8)/(10)/(12)`
channel feeds (tabs All/Video/Articles/Polls + pinned) · `code (14)` My Channels.

**Iliyokataliwa:** Tailwind CDN (zote 22) · Material Symbols · rangi za `DESIGN.md` (`#006c51`, surface
`#faf8ff`) · nav ya Stitch (Feed/Discover/Post/Hubs/Profile) · `Mapato TZS 2.4M` · `1.2M Views` ·
`+14.2%` / `84.1% High Ret.` · pills nyingi.

---

## 10. KINACHOFUATA (mapendekezo, bila kuanza)

1. **My Spaces → usimamizi**: kuongeza/kubadilisha roles (Owner/Admin/Editor/Moderator) kama vitendo halisi.
2. **Ugavi wa content (§44)**: kuchagua `Space · Home · Gundua · Profile · Search` kwa kila chapisho (sasa:
   Space pekee, Home haipokei kimya kimya).
3. **Notifications za Space**: aina mpya ya taarifa (kujiunga, ombi, tukio) kwa `notificationService` ileile.
4. **Gundua ↔ Spaces**: kadi ya Gundua inaweza kuunganisha moja kwa moja kwenye Space page (sasa profile
   panel pekee).
5. **Drafts/Scheduled + analytics**: zinahitaji uamuzi wako (§L.3/§L.4) — hazijajengwa.

**Hali ya mwisho: build ✓ · smoke 460/460 ✓ · shots 331/331 ✓ console 0 · nav 5 · hakuna faili iliyofutwa.**

### Viambatisho
- `docs/review/spaces/gallery.html` — gallery ya QA (picha 21, stats 460/460 · 331/331)
- `docs/shots/spaces/` — picha 21 za skrini
- `pasihai-spaces-N.zip` (4.3 MB) — kifurushi cha mabadiliko: `files/new/` (8) · `files/modified/` (14) ·
  `docs/` (audit · ripoti · gallery · picha) · `README.md`
