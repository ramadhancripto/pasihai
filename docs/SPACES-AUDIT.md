# PASIHAI — SPACES AUDIT (Awamu 0 · kabla ya code)

**Tarehe:** 2026-10-08 · **Hali:** audit pekee — **hakuna mstari wa production code uliobadilishwa**
**Chanzo:** `uploads/` (Stitch: 22 `code*.html` · 14 `screen*.png` · `DESIGN.md`) + repo ya `pasihai/`
**Kanuni:** Stitch = visual/UX pekee · PASIHAI architecture inapita kila kitu.
**Lango la sasa (lililothibitishwa):** build ✓ · smoke **393/393** ✓ · shots **294/294** ✓ · console 0.

---

## 0. MUHTASARI (sentensi tano)

1. **Spaces haipo kama bidhaa.** Kwenye nav kuna `Spaces`, lakini ukurasa wake ni `PlaceholderPage`
   anayeeleza mipaka pekee (`upNext.spaces`) — hakuna orodha, hakuna ukurasa wa Hub/Community/Channel.
2. **Data ya Spaces ipo kwenye `mock.js`** kama entities za aina `hub` (3) · `community` (2) · `channel` (5),
   na Gundua (ukurasa halisi) tayari inazionyesha, inazichuja na inaruhusu `Jiunge`/`Fuata`.
3. **Viungo vitatu vya msingi havipo kabisa:** ukurasa wa Space (Overview/Activity/People/Events/Resources/About),
   uundaji wa Space (`Create Space`), na usimamizi (`My Spaces` kwenye Account/Spaces).
4. **Hakuna engine ya pili inayohitajika:** posts/maoni/share/save/more · Chat groups · Save Offline ·
   delivery — vyote vipo na vinafanya kazi (toka M). Kazi kubwa ni **kuunganisha**, si kujenga upya.
5. **Kizuizi kikubwa:** `upNext.spaces` (ina "Vikundi" + "Private Space") **inapingana na §0/§2** —
   lazima iondolewe; hii inagusa smoke/shots (imeorodheshwa §K).

---

## A. KILICHOPO NA KINAFANYA KAZI (reuse moja kwa moja)

| # | Kipo | Wapi | Kinatumikaje kwa Spaces |
|---|---|---|---|
| A1 | Nav 5 `Home·Chat·Gundua·Spaces·Business` | `BottomNav.jsx:17` | Spaces = kituo kimoja; hakuna item mpya (§1) |
| A2 | Entity types `hub` · `community` · `channel` | `mock.js:43` (`users`) | Hub 3 · Community 2 · Channel 5, kila moja na `members/followers`, `relationship`, `place`, `category` |
| A3 | Vocabulary ROLE/ACTION | `mock.js:19-41` (`entityRoles`, `entityActions`) | `hub→Jiunge/Umejiunga`, `community→Omba kujiunga/Umeomba`, `channel→Fuata/Unafuatilia` |
| A4 | Gundua = discovery halisi | `pages/Gundua.jsx` · `gunduaService` · `gunduaRepository` | Ugunduzi wa hubs/communities/channels **haubadiliki** (§38); Spaces inatumia data ileile |
| A5 | `getEntity(type,id)` + profiles | `gunduaRepository.js:415` | Chanzo kimoja cha maelezo ya entity (channel profiles zipo, business profiles zipo) |
| A6 | Feed + vitendo vyote | `feedService` · `FeedItem` · `FeedActions` · `FeedPanels` | Activity ya Space = mkondo ule ule, maoni/share/save/more zile zile (§7,§18) |
| A7 | Kuchapisha kwa aina | `feedService.createPost({kind})` | text · image · video · reel · audio · poll · **event** · announcement — zote zinafanya kazi |
| A8 | Delivery (ugavi) | `systemService.getDeliveryOptions()` | `local · nearby · community · global` — hii ni msingi wa §8/§26/§36 (distribution) |
| A9 | Vikundi = Chat | `chatRepository.createGroup` · `gunduaService.join()` | Kujiunga na kikundi **hutengeneza conversation halisi** — mfumo mmoja (§12,§22,§43) |
| A10 | Save Offline | `systemService.getSaveOffline/saveOffline` | Rasilimali zinaweza kuhifadhiwa bila mtandao (§11,§25) |
| A11 | Sheet + panels mechanism | `Sheet.jsx` · `App.jsx` stack | Panels zote za Space (Events/People/Resources/About/Manage) = Sheet ileile |
| A12 | Mfumo mmoja wa vitufe | `.psh-btn` (+`.psh-gu-btn`) | Hakuna CSS ya vitufe ya pili (§45) |
| A13 | Faragha halisi | `gunduaPrivateEntities` (hub `familiaYetuHub` · channel `studioNeema` · community `wakulimaMbeya`) | Msingi wa §5/§15/§29 (listed/hidden) — upo kwa Gundua, haujafunuliwa kwa Spaces |
| A14 | A11y/QA zilizopo | smoke 393 · shots 294 | Ongeza sehemu za Spaces, si mfumo mpya wa test |

---

## B. KILICHOPO LAKINI SI SAHIHI KIARCHITECTURAL (lazima irekebishwe)

| # | Kipo | Kwa nini si sahihi | Sheria |
|---|---|---|---|
| **B1** | `upNext.spaces.note/types` inasema Spaces ina **"Vikundi (Groups)"** na **"Nafasi za Faragha (Private Spaces)"** | Groups ni mali ya **Chat**; hakuna "Private Space" kama aina | §0, §2, §43 |
| **B2** | `upNext.spaces.items` ina **"Channels zinazohusiana"** chini ya Spaces | Channels ni **tawi la pili** la Spaces, si "kitu kinachohusiana" | §3, §27 |
| **B3** | `Spaces` = `PlaceholderPage` (5 items) | Nav item inaonekana "imekamilika" lakini ni bango la mipaka pekee | §53 — ukurasa halisi unahitajika |
| **B4** | `user.spaces` (hub entities) = `["Warsha","Kazi","Miradi"]` | Ni **tags/maeneo**, jina linalochanganya na dhana ya "Spaces" | §41 (Identity ≠ Relationship) |
| **B5** | Faragha ya entity ipo kama `gunduaPrivateEntities` (Gundua pekee) | Spaces haioni hali ya `public · listed-private · hidden` | §5, §15, §29 |
| **B6** | Hakuna kutofautisha **content visibility** na **entity visibility** | §8/§26/§36 zinahitaji ngazi mbili tofauti | §44 |
| **B7** | `ProfilePanel` ina tabs `Machapisho · Nilizopenda · Zilizohifadhiwa` pekee | §39 inahitaji `My Hubs/Communities/Channels` + `Joined` | §39 |
| **B8** | `CreatePanel` (CREATE_ITEMS) haina Hub/Community/Channel | §40 inahitaji uundaji kutoka Home/Space — kitu kimoja | §40 |
| **B9** | Positions/roles za Space hazipo kama data | §13/§23/§34 zinahitaji Owner/Admin/Editor/Moderator kama **data**, si UI | §41 |

---

## C. KINACHOKOSEKANA (gaps — orodha kamili)

**C1 · Ukurasa wa Spaces (mobile + desktop)**
- Tabs `Hubs & Communities` | `Channels` (§3)
- Vichujio vya ndani (Zote · Karibu Nami · mada) — **vichujio vipya vya UI, sio engine mpya**
- Sehemu: `Nafasi Zangu`, `Zinazopendekezwa/Gundua`, `Zinazofuatiliwa`
- States: empty · loading · error (§47)

**C2 · Ukurasa wa Space (Hub/Community — familia moja)**
- Header: cover, logo, jina, handle, muktadha/mahali, maelezo mafupi, wanachama, hali ya faragha,
  `Jiunge`/`Omba`/`Umejiunga`
- Tabs: `Muhtasari · Shughuli · Watu · Matukio · Rasilimali · Kuhusu` (§6, §16)
- `Muhtasari`: purpose · tangazo la mwisho · shughuli za leo · matukio yajayo · rasilimali ·
  vikundi vinavyohusiana · channels zinazohusiana (§17, §22, §23)
- `Watu`: Viongozi (Owner/Admin/Moderator) + Wanachama (§9, §21)
- `Matukio`: kutoka content ya `kind:'event'` (hakuna engine ya pili) (§10, §24)
- `Rasilimali`: documents/links/media + `Save Offline` halisi (§11, §25)
- `Kuhusu`: sheria/kanuni za Space (data, si UI pekee) (§13)

**C3 · Ukurasa wa Channel (publishing-first, tofauti kwa muonekano)**
- Header: cover, logo, `@username`, kategoria, maelezo, hadhira, `Fuata`/`Umejiunga` (§30)
- Sections: `Vilivyoteuliwa · Mapya · Media · Kuhusu` (§30)
- Uwasilishaji wa maudhui kwa aina (video kubwa · picha/jalada · makala · kura · tangazo · sauti · live)
  (§31, §32, §19) — **kwa kutumia `bodies.jsx` iliyopo, si cards mpya**
- Creator view: `Yaliyomo · Hadhira · Maoni · Muonekano · Timu · Faragha · Takwimu` (§33)
- Drafts / scheduled (§47.27–28) — **uamuzi unahitajika** (ona §L)

**C4 · Uundaji (`Create Space`) — hatua 3**
- Hatua 1: aina (`Hub` · `Channel` · `Community`) §40
- Hatua 2: maelezo (jina · kusudi · kategoria · eneo · faragha) §5/§15/§29
- Hatua 3: muonekano (jalada · nembo · rangi kutoka tokens pekee) §35
- Kitu kimoja kinachoundwa kutoka Home **au** Spaces (hakuna mfumo wa pili) §40

**C5 · Hali za faragha (zote tatu kwa kila aina)**
- `Wazi (Public)` · `Binafsi — Iliyoorodheshwa` (identity pekee + `Omba kujiunga`) ·
  `Binafsi — Fichwa` (haipatikani kwa kutafuta) §5/§15/§29
- **Mahali ≠ ruhusa** (§5) — Eneo ni sababu ya umuhimu pekee

**C6 · Ruhusa/permissions kama data**
- Roles: Owner · Admin · Editor/Publisher · Moderator (§34)
- Permission set: view · join · publish · comment · reply · react · invite · moderate · manage (§34, §41)

**C7 · Integrations**
- Home: content ya Space inaonekana ikiwa `visibility=Public` **na** `distribution⊇Home` (§8, §26, §36, §44)
- Gundua: preview ya Space (public pekee; listed-private inaonyesha identity pekee) (§37, §38)
- Account: `My Spaces` / `Joined` (§39)
- Chat: `Vikundi vinavyohusiana` — link tu, conversation ipo Chat (§22, §43)

**C8 · States za QA** — §47 inaorodhesha 17 (Hub) + 19 (Community) + 31 (Channel). Zote haziwezi
kuwa "screens"; zitakuwa **hali za UI + data** zinazothibitishwa kwenye smoke/shots.

---

## D. KINACHORUDIWA (duplication risk — dawa kabla ya code)

| # | Hatari | Ipo tayari | Uamuzi |
|---|---|---|---|
| D1 | Repository ya pili ya entity/data | `gunduaRepository.getEntity`, `identityRepository.listUsers` | **SpacesRepository ipya HAIJENGI** data ya msingi; ina**compose** `identityRepository` + `contentRepository` + `chatRepository` (context/membership pekee) |
| D2 | Feed ya pili/Activity list | `feedService.getFeed` + `FeedItem`/`FeedActions` | Activity ya Space = `getFeed({ spaceId })` — filter moja, mfumo mmoja |
| D3 | Comments/reactions/share/save | `FeedPanels` (`Comments/Share/PostMenu`) | Reuse 100% |
| D4 | Event engine | `kind:'event'` kwenye posts + `cta` | Matukio = content ya `kind:'event'`; hakuna engine |
| D5 | Resource/storage engine | `systemService` (Save Offline) | Rasilimali = data + `saveOffline()`, hakuna vault ya pili |
| D6 | Group/chat engine | `chatRepository`, `gunduaService.join` | Group link = conversation ileile |
| D7 | Discovery engine | Gundua + `gunduaRepository.getCounts/search` | Hakuna utafutaji wa pili; Spaces inatumia `gunduaService.search` kwa discovery iliyopo |
| D8 | Notification engine | `notificationService` + `activityRepository` | Hakuna; taarifa za Space ni aina ya notification iliyopo baadaye |
| D9 | Moderation engine | `reportPost` + `BlockedBody` (Chat) | Ripoti = ileile; blocking = ileile |
| D10 | Media player ya pili | `MediaFrame`, `Waveform`, `bodies.jsx` | Reuse; hakuna player mpya |
| D11 | Vitufe/CSS ya pili | `.psh-btn` | Reuse; `spaces.css` = layout pekee |
| D12 | Icon set ya pili | `icons.jsx` (SVG 60) | **Material Symbols ⛔** (Stitch inatumia) — tunachora/kutumia SVG zilizopo |
| D13 | Routing ya pili | `App.jsx` + Sheet stack | Spaces panels = Sheet stack ileile |
| D14 | "Private Space" object | — | **HAIUNDWI** (§0) |

**Hakuna duplicate itakayoundwa.** Sehemu pekee mpya ni: page + components za layout + repository ya
**muktadha** (membership/roles/link) + CSS + tests.

---

## E. KINACHOWEZA KUTUMIKA TENA (ramani ya reuse → mahali)

| Kitu cha UI | Chanzo | Kinaenda wapi |
|---|---|---|
| `FeedItem` + `FeedActions` + `FeedPanels` | `components/feed/*` | Activity ya Hub/Community/Channel (§7,§18,§31) |
| `bodies.jsx` (`BODIES`) | `components/feed/bodies.jsx` | Uwasilishaji kwa aina — video/picha/kura/tangazo/event (§19,§32) |
| `Segmented` · `Chip` · `CheckRow` · `Dropdown` | `components/ui.jsx` | Tabs za Space · filter chips · faragha (radio) |
| `Avatar` · `Identity` · `EntityPill` · `EntityAction` | `components/ui.jsx` | Header, People, kadi |
| `Button` (variants/sizes/loading) | `components/ui.jsx:107` | Vitendo vyote (§45) |
| `Sheet` + panel stack | `components/Sheet.jsx`, `App.jsx` | Panels zote za Space |
| `Skeleton` | `components/ui.jsx:145` | Loading states (§47) |
| `MapPreview` | `components/gundua/GunduaBits.jsx` | Eneo la Hub (si ramani halisi — bango linasema) |
| `ChatAvatar` · `PersonRow` | `components/chat/*` | Vikundi vinavyohusiana (§22) |
| `SaveOfflinePanel` pattern | `components/system/SystemPanels.jsx` | Rasilimali + Save Offline (§11) |
| `FiltersPanel`/`FilterMenu` pattern | `gundua/GunduaPanels.jsx`, `panels.jsx` | Vichujio vya Spaces (schema/data ileile) |

---

## F. FAILI/ELEMENTS ZA KUBADILISHA (minimum change)

| Faili | Badiliko | Kwa nini |
|---|---|---|
| `src/App.jsx` | route `spaces` → `<Spaces/>`; panels mpya za Space kwenye stack | ukurasa halisi + panels |
| `src/pages/PlaceholderPage.jsx` | **hakuna kufuta**; `spaces` key inaacha kutumika kwenye route | inabaki kwa Business |
| `src/data/mock.js` | (a) `upNext.spaces` **inabadilishwa** kuwa maelezo sahihi ya Hubs/Communities/Channels; (b) +data ya muktadha (roles, rules, events, resources, visibility kwa kila Space) | §0/§2/§3 + data halisi |
| `src/data/repositories/gunduaRepository.js` | +`visibility` ya entity (`public/listed/hidden`) ikiwa haipo; heshima kwenye `search`/`getEntity` | §38 |
| `src/services/feedService.js` | `getFeed({ spaceId })` — filter moja kwa entity | Activity (§7) |
| `src/services/gunduaService.js` | `join()` → inarudisha conversation ileile (ipo); +`requestJoin()` kwa listed-private | §5/§15/§29 |
| `src/services/accountService.js` | `getMyContent('spaces')` → owned/joined | §39 |
| `src/components/panels.jsx` | `CreatePanel` + `Hub/Community/Channel` types; `ProfilePanel` + tab `Nafasi Zangu` | §39, §40 |
| `src/components/home/CreateArea.jsx` | hakuna kubadilisha nav; `+` inaonyesha aina mpya kupitia `CreatePanel` ileile | §40 |
| `src/main.jsx` | + `styles/spaces.css` | CSS moja ya layout |
| `scripts/smoke.jsx` · `scripts/shots.mjs` | sehemu mpya za Spaces; marekebisho ya placeholder (imeorodheshwa §K) | QA |
| `docs/*` | ripoti + gallery | uthibitisho |

**Hakuna faili litakalofutwa.**

---

## G. FAILI/ELEMENTS MPYA ZINAZOHITAJIKA (kwa uhalisia pekee)

| Mpya | Kazi | Haiwezi kutumika tena kwa sababu |
|---|---|---|
| `src/data/repositories/spacesRepository.js` | Muktadha/uanachama/roles/link (compose ya repos zilizopo) | Hakuna repository ya "muktadha wa Space"; hii **haisomi** mock moja kwa moja kwa data ya posts/chat |
| `src/services/spacesService.js` | Application layer (Space → view model) | Seam inayohitajika ili UI isi-import repositories |
| `src/pages/Spaces.jsx` | Ukurasa mkuu (tabs 2 + sehemu) | Placeholder haitoshi (§53) |
| `src/components/spaces/SpacesBits.jsx` | Cards: Hub + Community (familia moja), Channel (tofauti kwa muonekano), SectionHead, PrivateBadge | Kadi za Gundua ni za ugunduzi; za Spaces zinahitaji members/roles/link |
| `src/components/spaces/SpacePage.jsx` | Space header + tabs (Hub/Community) | Muundo wa ukurasa wa Space haupo |
| `src/components/spaces/ChannelPage.jsx` | Channel header + sections (publishing) + creator view | Channel ni publishing-first; muundo tofauti (§30, §33) |
| `src/components/spaces/SpacePanels.jsx` | Panels: People · Events · Resources · About · Manage · Create Space (hatua 3) | Sheet bodies mpya; zote zina-reuse `Sheet`, `Button`, `Chip` |
| `src/styles/spaces.css` | Layout/media queries za Spaces | CSS ya layout pekee; hakuna rangi/vitufe vipya |

**Hakuna component, page, token, icon au mock iliyopo itakayofutwa.**

---

## H. MPANGILIO WA UTEKELEZAJI (module-by-module · kila hatua → build + smoke + shots)

| Hatua | Kazi | Uthibitisho |
|---|---|---|
| **S1** | Data + seam: `spacesRepository` (context/roles/rules/events/resources/visibility) + `spacesService` + `mock.js` (badilisha `upNext.spaces`, +data ya Space) | node checks + smoke (data inarudi, hakuna mock import kwenye UI) |
| **S2** | Ukurasa wa Spaces (`pages/Spaces.jsx` + `spaces.css` + cards + tabs) | shots: mobile/tablet/desktop · empty/loading/error |
| **S3** | Space page (Hub + Community: header/tabs/About/People) | shots + a11y 44px/labels |
| **S4** | Activity = `getFeed({spaceId})` + reuse `FeedItem/FeedActions/FeedPanels` | smoke: chapisho la Space linaonekana · maoni/penda/hifadhi kwenye Space |
| **S5** | Events + Resources (kutoka content + Save Offline) | smoke: event linaonekana · resource inahifadhiwa bila mtandao |
| **S6** | Related Groups → Chat (reuse `join`) | smoke: kikundi kimoja pekee (hakuna duplicate) |
| **S7** | Channel page (sections + presentation kwa aina) | shots: video/picha/makala/kura/tangazo |
| **S8** | Create Space (hatua 3) + Home integration (kitu kimoja) | smoke: kilichoundwa kutoka Home = kile kile kwenye Spaces |
| **S9** | My Spaces (Account) + creator view (Yaliyomo/Hadhira/Maoni/Timu) | smoke + shots |
| **S10** | Faragha: public · listed · hidden (entity + content) | smoke: private **haitoki** kwenye Home/Gundua (regression ya faragha) |
| **S11** | States: loading/empty/error/offline + a11y + responsive | shots za hali zote |
| **S12** | Report + gallery + FILES list | docs |

**Kila hatua inasimama kwa build ✓ + smoke ✓** — hakuna kuendelea kwa hatua inayofuata ikiwa moja inafeli.

---

## I. STITCH AUDIT (faili 22 za `code*` + picha 14) — ramani

> **Ukweli wa kiufundi:** faili **zote 22** zinatumia **Tailwind CDN** na **Material Symbols** →
> ⛔ hazitumiki kama code (sheria ya STITCH ilivyokwisha kukubaliwa). Zinatumika kama **visual/UX
> reference pekee**: muundo, mpangilio wa sehemu, vichwa, tabs, hierarchy.

### I.1 Ndani ya Spaces (faili 13 za `code*` + picha 13)

| Stitch | Picha | Inaonyesha | Uamuzi |
|---|---|---|---|
| `code.html` | screen.png | Spaces mobile: tabs Zote/Karibu/mada · `Hubs Zangu` · kadi za Hub (jalada, badges, members, `Ingia Hub`) | **tumia muundo** (Hubs & Communities) |
| `code (26).html` | screen (2).png | Spaces intro: Gundua & Ungana · counts (Hubs 2 · Channels 3 · Jumuiya 1) · kadi 3 (Hubs/Channels/Communities) · `Nafasi Zangu Zinaoendelea` | **tumia** (Overview ya Spaces) |
| `code (20).html` | screen (23).png | Spaces manage: tabs `Hubs & Communities | Channels` · `Nafasi Zangu` · `Explore New Hubs` + `Join` · bango: Groups → Chat | **tumia** (IA §3 + ujumbe §43) |
| `code (1).html` | screen (5).png | `Create Space`: aina 3 (Hub · Channel · Community) + maelezo ya Hub | **tumia** (hatua 1–2) |
| `code (18).html` | screen (21).png | **Hub Details (Kariakoo)**: header, tabs, Hub Pulse, feed yenye maoni, Upcoming Event, Verified Resource | **tumia sana** (kiolezo cha Hub) |
| `code (24).html` | screen (27).png | **Hub Details (Dar Tech Hub)**: `Umejiunga` · Shughuli/Live · Vikundi vya Soga · Wasimamizi · Miongozo | **tumia** (People/Groups/Rules) |
| `code (16).html` | screen (19).png | **Community**: Purpose · Active Today · Upcoming Events · Featured Resources · Community Groups | **tumia** (§17) |
| `code (22).html` | screen (25).png | **Community admin**: `Wewe ni Msimamizi` · Dhibiti · Vikundi vya Mazungumzo · Wanachama · Miongozo | **tumia** (§13, §21) |
| `code (8).html` | screen (11).png | Channel feed (Kiswahili): header + tabs (Vilivyoteuliwa/Mapya/Video) | **tumia** muundo; maudhui ya mock yetu |
| `code (10).html` | screen (13).png | Channel feed (EN): Pinned announcement · articles · poll · "Key Clinical Points" | **tumia** (aina za content §31) |
| `code (12).html` | screen (15).png | Channel feed + `Copy text`/link (kushiriki) | **tumia** (kushiriki kiungo — ipo) |
| `code (6).html` | screen (9).png | Channel dashboard: `Maoni/Views 1.2M` · `Mapato/Est. TZS 2.4M` · Yaliyomo/Hadhira/Faragha/Maoni/Muonekano | ⚠️ **tumia muundo WA SEHEMU pekee**; **namba za Mapato/Views ⛔** (ona §J) |
| `code (14).html` | screen (17).png | My Channels: `Chaneli Zangu` · Following · Discover · `Chapisha Ujumbe` | **tumia** (§33, §39) |

### I.2 Nje ya Spaces (faili 9 za `code*` + picha 1) — **HAZITUMIKI** kwa kazi hii

| Stitch | Inaonyesha | Uamuzi |
|---|---|---|
| `code (3).html`, `code (4).html` | View Mode exploration (4 variants) | ⛔ nje ya Spaces; pendekezo la awali (Compact Dropdown) linapingana na §46 ("haitambuliki kama View Mode") — **haitumiki** |
| `code (5).html` | Biashara za Karibu | ⛔ module ya Business |
| `code (7).html`, `code (9).html` | Gundua (radar, mseto) | ⛔ Gundua ilishajengwa (awamu L) |
| `code (11).html`, `code (15).html` | Conversation Detail (namba/lookup) | ⛔ Chat ilishajengwa (CHAT SYSTEM) |
| `code (13).html`, `code (17).html` | Group Thread | ⛔ Chat ilishajengwa |
| `DESIGN.md` | Tokens za Stitch (`#006c51`, surface `#faf8ff`, pill buttons, nav "5 slots: Feed/Discover/Post/Hubs/Profile") | ⛔ **kinyume cha tokens za PASIHAI**; tumia tokens zetu (`#18A982`, `#EAF8F3`, `#17201D`…) — kumbukumbu pekee |

**Vitu vilivyokataliwa kwa mwonekano:** rangi za Stitch (`#006c51` badala ya `#18A982`), "central post
button" kwenye nav (nav yetu = 5 destinations bila kitufe cha kati), Material Symbols, Tailwind CDN,
footer nav ya Stitch, pills nyingi, na muundo wa "channel = YouTube clone".

---

## J. MIGONGANO YA MUONEKANO/MAUDHUI (na uamuzi)

| # | Kwenye Stitch | Kwa nini hatuitumii | Uamuzi |
|---|---|---|---|
| J1 | `Mapato / Est. TZS 2.4M`, `+14.2%`, `84.1% High Ret.` | Hayana data halisi nyuma; **payments ⛔**; "hakuna namba za kubuni" | **Ondoa** kwenye utekelezaji; dashboard inaonyesha **kile kilichopo**: machapisho, reactions, maoni, wafuasi |
| J2 | `1.2M Views` | Hakuna counts za views kwenye model | Onyesha **reactions/comments/shares** pekee (zipo halisi) |
| J3 | Tailwind + Material Symbols | ⛔ sheria ya STITCH | SVG za `icons.jsx` + CSS zetu |
| J4 | Nav ya Stitch (Feed/Discover/Post/Hubs/Profile) | ⛔ nav 5 yetu ni tofauti | Nav haibadiliki |
| J5 | Rangi za DESIGN.md | ⛔ kinyume cha tokens | Tokens za PASIHAI pekee |
| J6 | "Eneo lako la sasa / km 5" kama ruhusa | §5: location ≠ permission | Eneo = umuhimu pekee; hakuna ufunguzi wa faragha |
| J7 | `Drafts`/`Scheduled` (Channel) | Hayapo kwenye model; §47 inaorodhesha kama hali | **Uamuzi unahitajika** (§L.3) |
| J8 | Team roles kamili (Analytics/TZS) | §34 inaruhusu roles 4 pekee | Roles 4 kama **data + UI ya orodha**; hakuna usimamizi wa mchakato mpya |

---

## K. ATHARI KWA QA ILIYOPO (regression map — kabla ya code)

| # | Test / faili | Linalotarajiwa | Hatua |
|---|---|---|---|
| K1 | `scripts/smoke.jsx:134` `Placeholder — gundua/spaces/business` | ina-render `PlaceholderPage(pageKey)` kwa `spaces` | Baada ya S2: `spaces` inaondolewa kwenye orodha (Business inabaki); **+test mpya** ya `<Spaces/>` |
| K2 | `scripts/shots.mjs:445` `['Spaces','13-spaces.png','Spaces',5]` | inatarajia kichwa "Spaces" + items 5 | S2: inabadilishwa kuwa assertions za ukurasa halisi; picha `phase-1/13-spaces.png` inasasishwa (kumbukumbu ya placeholder inabaki kwenye git history) |
| K3 | `scripts/shots.mjs:95` nav labels | 5 labels — **haiathiriki** | — |
| K4 | smoke: Gundua counts (42 · 6 · 12…) | data ya Gundua | S10: lazima **zibaki** — faragha ya Space isivunje hesabu za Gundua |
| K5 | smoke: Chat (kikundi kimoja, hakuna duplicate) | `gunduaService.join` | S6: lazima zibaki |
| K6 | smoke M (feed/vitendo/chat/gundua) | 393 | Yote lazima yabaki ✓ |
| K7 | shots: Gundua (18 picha, 44 assertions) | — | S2/S3: hakuna kubadilisha Gundua |

**Lengo la regression:** smoke ≥ 393 → ~430+; shots ≥ 294 → ~320+; console **0**; build ✓.

---

## L. MAAMUZI YANAYOHITAJIKA KUTOKA KWAKO (kabla ya S1)

1. **Ukurasa mmoja au wawili?** — Pendekezo: **ukurasa mmoja wa `Spaces`** (tabs `Hubs & Communities` |
   `Channels`) + **ukurasa mmoja wa Space** unaoshirikiwa na Hub/Community, + **Channel page** tofauti
   (publishing). Tunakubali?
2. **`upNext.spaces`** (ina "Vikundi" + "Private Space") inabadilishwa kuwa maelezo sahihi ya
   Hubs/Communities/Channels. Tunakubali? (hii inagusa K1/K2 pekee)
3. **Drafts/Scheduled** za Channel: (a) hazijengwi kabisa (bango la ukweli linaeleza), au
   (b) zinaonekana kama **hali** kwenye mock (bila mchakato wa ratiba)? Pendekezo: **(a)**.
4. **Takwimu za Channel**: (a) reactions/comments/shares/wafuasi pekee (halisi), au (b) pia hesabu za
   "views" za kubuni? Pendekezo: **(a)** — hakuna namba za kubuni.
5. **Events/Resources**: zinabaki kama **content** (`kind:'event'` + resource items zinazohifadhiwa kwa
   `saveOffline`) — hakuna engine mpya. Tunakubali?
6. **Home integration**: content ya Space `Public` inaonekana Home tu ikiwa `distribution` inaruhusu
   (`community/global`). Tunakubali sheria hii (§8/§44)?
7. **Utaratibu**: niendelee **S1 → S12** hatua kwa hatua (kila hatua: build + smoke + shots), nikisimama
   kwa ripoti baada ya **S4** na **S8**, au nifanye S1–S4 kwanza kisha nisimame?

---

## M. HITIMISHO

Kazi hii **haijaanza kwa code** — kama ulivyoelekeza (§53). Repo ipo safi: build ✓ · smoke
**393/393** ✓ · shots **294/294** ✓ · console **0**. Kinachohitajika ni **kuunganisha** mifumo
iliyopo (mkondo · Chat · Gundua · Save Offline · delivery) ndani ya Spaces yenye muundo sahihi
(`Hubs & Communities | Channels`), **bila**:

- engine ya pili (comments/reactions/events/resources/groups/chat/discovery/media/permissions),
- "Private Space" kama aina,
- Groups ndani ya Spaces,
- kubadilisha nav 5, Gundua, Chat, Home au tokens,
- namba za kubuni (Mapato/Views).

**Kinachosubiri:** majibu ya §L (maamuzi 7). Baada ya kibali, nitaanza **S1** (data + seam) na
kusimama kwa ripoti baada ya **S4** na **S8** — kila hatua ikiwa na build ✓ + smoke ✓ + shots ✓.

---

### Kiambatisho — alama za data zilizothibitishwa kwa Spaces (kabla ya code)

| Entity | Aina | Uhusiano | Wanachama/Wafuasi | Mahali/Kategoria | Content iliyopo |
|---|---|---|---|---|---|
| `darTechHub` | hub | Umejiunga | 4,820 · hai 63 | Teknolojia | post 2 (event · video) |
| `tzCreators` | hub | Umejiunga | 9,140 · hai 121 | Sanaa | post 2 |
| `morogoroOrganic` | hub | Hujajiunga | 1,850 | Morogoro | 0 |
| `wakulimaTz` | community | Hujajiunga | 12,800 | Morogoro | **0 (gap → S1)** |
| `afyaJamii` | community | Hujajiunga | 6,400 | Dar es Salaam | **0 (gap → S1)** |
| `pasihaiUpdates` | channel | Unafuatilia | 128,000 | Habari | 2 |
| `techSasa` | channel | Unafuatilia | 46,200 | Teknolojia | 3 |
| `elimuYetu` | channel | Hujafuatilia | 31,400 | Elimu | 2 |
| `bbcSwahili` | channel | Hujafuatilia | 286,000 | Habari | 0 |
| `azamSports` | channel | Hujafuatilia | 412,000 | Michezo | 0 |
| `familiaYetuHub` | hub | — (faragha) | — | — | 0 (hali ya listed/hidden) |
| `studioNeema` | channel | — (faragha) | — | — | 0 |
| `wakulimaMbeya` | community | — (faragha) | — | — | 0 |

Vikundi vinavyohusiana (Chat): `baiskeliDar` (420) · `mamaLishe` (1,240) · `programuWazi` (890) —
kila kimoja kinajiunga **kwa conversation halisi ya Chat** (§22).
