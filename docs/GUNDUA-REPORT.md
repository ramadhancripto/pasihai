# PASIHAI — GUNDUA (DISCOVER) · RIPOTI — AWAMU 1

> **Hali:** Awamu 1 imekamilika (audit → data → service → UI → verification).
> Prototype pekee · mock data · ⛔ backend. Hii ni ripoti ya awamu, si ya mwisho ya Gundua.

---

## 1. Muhtasari

Gundua ni **safu ya ugunduzi pekee** — mahali ambapo mtumiaji anagundua biashara, watu, vikundi,
Public Hubs, Jumuiya, Channels, Friends na Live. Haijengi engine mpya: kila kitu kinatumia
utambulisho, urafiki na mazungumzo yaliyopo.

Awamu 1 ilifanya kazi kwa mpangilio:

1. **Audit** (`docs/GUNDUA-AUDIT.md`) — kuorodhesha entity, privacy rules na duplicate zilizopo.
2. **Data** — mock ya Gundua (users 13 mpya + entity za umma/faragha) bila kuathiri data ya Home/Chat.
3. **Repository + Service** — `gunduaRepository.js` (public-only) na `gunduaService.js` (contract).
4. **UI** — `Gundua.jsx` + `GunduaBits.jsx` (kadi) + `GunduaPanels.jsx` (panels) + `gundua.css`.
5. **Verification** — smoke `351/351`, shots `278/278`, console 0, gallery + ripoti hii.

Muundo wa ukurasa unafuata agizo: **HEADER (title + search + vichujio) ↓ MODULI KUU ↓ KATEGORIA ↓
LOCAL/RELEVANT ↓ MATOKEO** — na hakuna vidhibiti vya account/Network/Relay/Sync.

---

## 2. Reuse — kile kilichotumika (hakuna kubuni upya)

| Kitu | Chanzo kilichotumika | Kwa nini |
|---|---|---|
| Utambulisho (watu, business, channel, hub, community) | `identityRepository` + `mock.users` | entity moja = utambulisho mmoja (hakuna wasifu wa pili) |
| Urafiki (ombi/kubali/kataa/blocked) | hali ileile ya Chat/identity (`friendStates`) | friend model MOJA kwa mfumo wote |
| Vikundi | `chatRepository.createGroup` | kujiunga kikundi = **Chat iliyopo** |
| Mazungumzo ("Wasiliana kwa Chat", "Anza Chat") | `chatRepository.startDirect` | hakuna messaging ya pili ndani ya Gundua |
| Namba ya simu / orodha ya simu | `chatRepository.lookupNumber`, `getPhoneBook` | utafutaji wa namba ni njia ILEILE ya Chat |
| Live / kumbi za sauti | `liveSessions`, `audioRooms` (Home Live) | Live haitengenezwi upya; Gundua inaonyesha vikao vya **umma** |
| Sheet / panel mechanism | `components/Sheet.jsx` | panels zote ni sheet ileile ya app |
| Icons | `icons.jsx` (+7: People, PersonSearch, PersonAdd, Group, Star, Tag, Qr = **68**) | familia moja ya icons |
| Tokens | `tokens.css` (`--c-green`, `--t-bg`, `--card-r`, `--sh-1` …) | hakuna rangi/kipimo kilichowekwa moja kwa moja |
| Hesabu za idadi | `formatCount` (`src/utils/format.js`) | "89500" → "89.5K" kwa uthabiti |

**Stitch (uploads/) ilitumika kama visual reference PEKEE** — hakuna Tailwind CDN, Material Symbols,
wala rangi mpya zilizochukuliwa; muundo wa Gundua ulijengwa kwa lugha ya PASIHAI (kadi, band, radius).

---

## 3. Files — Modified · Created · Deleted

### Created (awamu 1)

| Faili | Kazi | Dependency |
|---|---|---|
| `docs/GUNDUA-AUDIT.md` | Audit ya entity, privacy, duplicate | — |
| `src/data/repositories/gunduaRepository.js` | Data ya Gundua, `passes()` = public-only, store ya kikao (friendState/follows/joined) | `mock.js` |
| `src/services/gunduaService.js` | Contract ya UI: `getPage · getLocal · getEntity · search · addFriend · respondFriend · toggleFollow · join · openChat · lookupNumber · getContacts · filterSummary · activeCount` | repo za Gundua + chat + identity |
| `src/components/gundua/GunduaBits.jsx` | Kadi & moduli (kila aina ina utambulisho wake) | icons, format |
| `src/components/gundua/GunduaPanels.jsx` | Panels: Vichujio · Maelezo ya kitu · Ongeza Rafiki · Vitendo vya muktadha | Sheet, service |
| `src/pages/Gundua.jsx` | Ukurasa kamili: search · moduli · kategoria · sehemu/matokeo · panels | service, bits, panels |
| `src/styles/gundua.css` | Muonekano wote wa Gundua (165 class za `psh-gu-*`) | tokens |
| `docs/shots/gundua/*.png` | Picha 18 za QA (simu · tablet · desktop) | shots.mjs |
| `docs/review/gundua/gallery.html` | Gallery ya ukaguzi (1.8 MB, picha 18) | picha za QA |
| `docs/GUNDUA-REPORT.md` | Ripoti hii | — |

### Modified

| Faili | Mabadiliko (minimum) | Kwa nini |
|---|---|---|
| `src/data/mock.js` | + users 13 wa Gundua (watoto/biashara/channels/hubs/jumuiya/live metadata) · + sehemu ya Gundua (modes, categories 10, filterGroups, filterSchema, distances, searchIdeas, groups 3, businessProfiles, channelProfiles, liveMeta, audioRooms, privateEntities 5) · phonebook `accountId` zimeoanishwa na identity ids · Zawena Kombo (jina/handle/sababu) · Kelvin Mushi bio yake | data ya Gundua bila kugusa data ya Home/Chat |
| `src/data/repositories/index.js` | + export `gunduaRepository` | seam ileile ya repositories |
| `src/components/icons.jsx` | +7 icons (68 jumla) | icons za Gundua kwa familia ileile |
| `src/utils/format.js` | + `formatCount` | hesabu kubwa kwa uthabiti |
| `src/App.jsx` | route `gundua` → `<Gundua onToast onOpenChat />` (badala ya `PlaceholderPage`) | ukurasa halisi |
| `src/main.jsx` | + `import './styles/gundua.css'` | CSS imesajiliwa |
| `src/styles/shell.css` | `.psh-devlink` imepanda juu ya nav kwenye desktop | kitufe cha maendeleo kisionekane juu ya nav |
| `scripts/smoke.jsx` | + block ya Gundua (K18–K26, asserts 75) · asserts 2 za directory 13 → 29 | lango la Gundua |
| `scripts/shots.mjs` | + block ya Gundua (asserts 52, picha 18 kwenye `docs/shots/gundua/`) · loop ya placeholder pages: Gundua imetolewa | uthibitisho wa UI |
| `README.md` | "Soga" → "Chat" (msemo wa zamani) · + `gunduaService` kwenye jedwali la services | usahihi wa nyaraka |

### Deleted

| Faili | Kwa nini |
|---|---|
| `docs/shots/phase-1/12-gundua.png` | ilikuwa picha ya **placeholder** ya Gundua; imebadilishwa na `docs/shots/gundua/01…18` |
| `docs/shots/gundua/tmp-*.png` | picha za kazi za muda (zilifutwa kabla ya ripoti) |

Hakuna component, page, mock, token, CSS, icon, test wala screenshot iliyofutwa bila sababu
iliyoandikwa hapa (file discipline).

---

## 4. ONE system — duplicate gani zilizuepukwa

| Hatari ya duplicate | Kilichofanyika |
|---|---|
| Chat ya pili ndani ya Gundua | Vikundi + "Wasiliana kwa Chat" zinatumia `chatRepository`; hakuna message thread kwenye Gundua |
| Friends page ya pili | Hakuna ukurasa wa Friends: Gundua ina **mode** ya Friends inayosoma hali ileile ya urafiki |
| Utafutaji wa pili wa watu | `lookupNumber` na `getContacts` zinapita `chatRepository` (chanzo kimoja) |
| Business engine | Biashara ni utambulisho + `businessProfiles` (data), si mfumo wa mauzo/manage |
| Community/Hub management | Usimamizi unabaki **Spaces**; Gundua inaonyesha umma pekee na inaeleza hilo kwenye panel |
| Live engine | Vikao vinatoka `liveMeta`/`audioRooms` za Home Live |
| Navigation ya pili | Hakuna nav mpya: Gundua ni destination ya 3 iliyopo; rangi/typography ni zile zile |
| Account/profile controls | Hakuna kwenye ukurasa wa Gundua (header ya app inabaki kama ilivyo) |

**Uthibitisho wa kiotomatiki:** smoke inahakikisha `join('group', …)` inarudisha conversation halisi
ya Chat, kuwa kujiunga **mara ya pili** hakutengenezi kikundi kingine, na kwamba faili za Gundua
hazitumii `mock.js` moja kwa moja (UI → service → repository).

---

## 5. Services na contract

**Repository (`gunduaRepository.js`)**
`getModes · getCategories · getFilterGroups · getFilterSchema(mode) · getSearchIdeas · getHighlights ·
getPeople · getFriends · getBusinesses · getGroups · getHubs · getCommunities · getChannels · getLive ·
getRooms · getMode · getCounts · getOffers · getEntity · search(query, filters) · getFriendState ·
addFriend · respondFriend · followChannel/unfollowChannel · join · isJoined · getJoinedConversation ·
getPrivateRegistry`

**Service (`gunduaService.js`)**
`getPage({mode, filters, query}) · getLocal(filters) · getEntity · search · addFriend · respondFriend ·
toggleFollow · join · openChat · lookupNumber · getContacts · getAddFriendIdeas · filterSummary ·
activeCount · privacyNote · EMPTY`

`getPage` inarudisha kitu kimoja kinachotosha UI: `mode · query · filters · modules · categories(+count) ·
counts · filterSchema · activeFilters · activeCount · highlights · results · friendsView · searchView ·
ideas · offers · scope · me · privacy`.

---

## 6. Modes na kategoria (§3, §5)

**Moduli kuu 4** (si chips ndogo; touch target ≥ 44 px; active state ya kijani):
`Mchanganyiko (42) · Friends (12) · Channels (5) · Live (6)`.

**Kategoria 10:** Biashara 7 · Watu 12 · Vikundi 3 · Public Hubs 3 · Communities 2 · Channels 5 ·
Friends 12 · Ongeza Rafiki — · Live 6 · Mchanganyiko 42.

Kategoria za mode-zilizopo (Friends/Channels/Live/Mchanganyiko) zinabadilisha mode moja kwa moja;
kategoria za entity (Biashara/Watu/Vikundi/Hubs/Communities) zinafungua panel ya matokeo ya aina
ileile — kwa hivyo mtumiaji haondoki kwenye muktadha.

**Mchanganyiko** ina sehemu 6 (si feed isiyo na mwisho): `Karibu Nawe (ramani · 6 vituo)` ·
`Zilizo Karibu Nawe 4` · `Vipindi vya Moja kwa Moja 3` · `Watu wa Kugundua 3` ·
`Jumuiya na Hubs za Wazi 3` · `Vikundi vya Wazi Vinavyovuma 3` · `Channels za Kipekee 3` ·
`Ofa za wazi 2`.

---

## 7. Friends — bila model ya mitandao ya kijamii (§7–§8)

Sehemu: **Marafiki Zangu 6 · Maombi ya Urafiki 1 · Yaliyotumwa 1 · Watu wa Kugundua 2 ·
Kutoka Sehemu za Umma 1 · Karibu Nawe 4 · Umezuiwa 1 · Kutoka Orodha ya Simu 10**.

- Kila mtu **mmoja** ana **sababu MOJA** ya muktadha (`Kupitia Dar Tech Hub`, `Kupitia jina la mtumiaji`,
  `Kupitia utafutaji wa namba`, `Kutoka orodha yako ya simu`, `Karibu nawe`).
- **Hakuna** mutual friends, "People You May Know", graph stats, wala namba za marafiki kwenye kadi.
- Hali: `not_friend · sent · received · friend · blocked` (+ `no_account` kwa namba zisizo na akaunti →
  kitufe ni **Alika PASIHAI**, si "Omba Urafiki").
- Orodha ya simu ni chanzo cha Chat: mtu aliye na akaunti **anaonekana kwa utambulisho wake halisi**;
  asiye na akaunti anaonekana kwa jina la simu + mwaliko. Hakuna mtu anayeonekana mara mbili.

---

## 8. Biashara · Channels · Hubs/Jumuiya · Vikundi · Live (§9–§15)

| Aina | Kadi inaonyesha | Panel inaonyesha | Kikomo |
|---|---|---|---|
| Biashara | band ya kijani, Wazi/Imefungwa, Ofa, umbali, masaa, mapitio, bidhaa 2 za haraka | About · Location · Bidhaa · Huduma · Masaa · Ofa (nambari) · Trust (rating, wateja, malipo) · Taarifa za umma | si app ya biashara; Chat ni kitufe kimoja |
| Channels | band ya bluu, kategoria, wafuatiliaji, **kionyeshi cha maudhui** | wasifu + preview | si feed, hakuna kuandika |
| Public Hubs / Jumuiya | band ya rangi yake, eneo, wanachama, shughuli za leo | maelezo + kumbusho: usimamizi uko **Spaces** | public pekee |
| Vikundi | band, wanachama, safari ijayo, note "mazungumzo yanatumia Chat" | Jiunge → **Chat** | discoverable pekee |
| Live / kumbi za sauti | `LIVE` dot inayopwita, watazamaji/wanasikiliza, mwenyeji | Jiunge / Sikiliza Sasa | public pekee; Live ≠ chapisho |

Biashara zimepangwa **karibu → mbali**: Example Store 0.8 · Samaki wa Kupaka 1.4 · Mlimani 2.8 ·
Kipepeo 3.2 · Wakulima 4.2 · Mwenge 4.8 km.

---

## 9. Vichujio (agizo 4)

- **MAIN ≠ FILTER:** vichujio viko karibu na utafutaji (kitufe chenye hesabu `Vichujio 2`).
- **Progressive disclosure (`getFilterSchema(mode)`)**: biashara = `Eneo · Kategoria za Biashara · Hali · Mada`;
  live = `Wakati · Mada · Eneo`; channels = `Mada · Eneo · Mahusiano`; friends = `Mahusiano · Eneo · Mada`.
- Makundi yote: **Shughuli na Mada 17** (pamoja na Siasa — neutral) · **Eneo 7** (+ masafa 6: 100 m, 1, 5, 10, 25, 45 km+) ·
  **Wakati 5** · **Mahusiano 5** · **Biashara 5** · **Hali 3**.
- Multi-select kwa mada/wakati/mahusiano; single kwa eneo; `Safisha Zote` · `Weka Vichujio` · `Ghairi`.
- Baada ya kuweka: **mstari mmoja** tu (`Vichujio 1 · Karibu Nami · 1 km` + `Safisha`) — hauweko
  kama hakuna vichujio (hakuna mstari wa kudumu wa chips).
- Masafa yanaathiri matokeo halisi: `Karibu Nawe` 5 km = vituo 6 (5 wazi) · 1 km = kituo 1 (Example Store 0.8).
- Muonekano ni wa PASIHAI: chips za radius ya wastani, hakuna look ya WhatsApp/Facebook/Instagram/Maps.

---

## 10. Faragha (§3 — kanuni ya msingi)

- **Umma pekee:** `passes()` kwenye repository inachuja kila kitu kwa `visibility === 'public'` + ruhusa.
- **Eneo = umuhimu, si ruhusa:** kichujio cha `100 m` + `Karibu Nami` hakifunui kitu kimoja cha faragha
  (kitu cha faragha cha jaribio: hub ya familia 0.4 km, vikao vya faragha, jumuiya ya faragha, biashara ya faragha).
- **Utafutaji:** kuandika jina la kitu cha faragha (`familia`) **hakurudishi kitu** — smoke inathibitisha `total === 0`.
- **Namba ya simu:** haionyeshwi kwenye kadi (handle/`+255 …`) na utafutaji wa namba unaeleza hali
  ("Akaunti ipo kwenye marafiki", "Hajajiunga") — namba si utambulisho wa umma.
- Kila panel ina mstari wa faragha; bango la faragha linaonekana mara ya kwanza kwenye ukurasa.
- Gundua haitumii data ya mtu mwingine kimya kimya: orodha ya simu inasomwa kwa idhini (mstari wazi kwenye panel).

---

## 11. Real (inafanya kazi) vs Mock (kielelezo)

**Halisi (state inabadilika kwenye kikao):** modes · kategoria (+hesabu) · vichujio na hesabu ya "active" ·
matokeo na upangaji kwa umbali · sehemu za Friends · ombi la urafiki (not_friend → sent) ·
kubali/kataa (received → friend/decline) · kufuata channel (Fuata ↔ Unafuatilia) · kujiunga hub/jumuiya/kikundi
(kikundi → conversation halisi ya Chat) · utafutaji wa namba/contacts (njia ya Chat) · panels na back/Escape.

**Kielelezo (mock data, wazi):** biashara zote, channels, hubs, jumuiya, vikundi, live/rooms, taarifa za
biashara (bidhaa, masaa, ofa), ramani (muonekano, si ramani halisi), QR (mfano), "Jiunge na Kikao",
"Ramani", "Alika", "Nakili kiungo", "Sambaza/Hifadhi/Ficha" — zote zinaarifu (toast) kuwa ni mfano.

Hakuna backend, hakuna Firebase/Firestore/Storage/Cloudinary, hakuna API, hakuna schema, hakuna E2EE/payments/notifications.

---

## 12. Build · Tests · Screenshots

| Kipimo | Matokeo |
|---|---|
| `npm run build` | ✓ CSS **118.01 kB** (gzip 17.95) · JS **518.27 kB** (gzip 148.89) |
| `npm run smoke` | **351/351 ✓** (Chat 276 + Gundua 75) |
| `npm run shots` | **278/278 ✓** · console **0** |
| Picha za Gundua | **18** (`docs/shots/gundua/` · simu 390×844, tablet 820×1180, desktop 1440×950) |
| Gallery | `docs/review/gundua/gallery.html` (1.8 MB) |

Lang o la Gundua lililothibitishwa (mifano): modes 4 kwa mpangilio · kategoria 10 · sehemu 6 za
Mchanganyiko · hakuna Relay/Sync/Network/account · faragha ("familia" → 0; 1 km → Example Store pekee) ·
vichujio (schema kwa mode, masafa 6, "Vichujio N active", matokeo yanapungua) · Friends (sehemu 8,
hakuna mutual/PYMK, hakuna namba za marafiki) · kujiunga kikundi = Chat iliyopo + hakuna duplicate ·
biashara kwa umbali · tablet safu 3 / desktop safu 5 + rail → grid · touch 44 px · kila kitufe cha icon
kina label · Escape inafunga panel.

---

## 13. Issues zilizokamatwa na kurekebishwa (kwa uwazi)

1. **`[object Promise]`** kwenye hali za urafiki za orodha ya simu — `getFriendState` haikusubiriwa → `await`.
2. **Watoto 26+13 vs directory 13** — smoke ya Chat ilianguka baada ya mock mpya; asserts 2 zimesasishwa hadi 29
   (sababu imeandikwa kwenye code).
3. **Phonebook isiyoendana** (`p3 'neema'`, `p6 'baraka'` = ids zisizopo; `p10` iligongana na Zawena Kombo) —
   ids zimeoanishwa; `p10` imerejeshwa kama ilivyokuwa; mtu mpya amepewa jina/handle la pekee
   (KANUNI: mtu mmoja = rekodi moja, hakuna utambulisho wa pili).
4. **`fromContacts` ilitoka kwenye mock string** — sasa inatoka kwenye orodha ya simu ya Chat (chanzo kimoja).
5. **Kubali ombi halikuondoa kadi kwenye "Watu wa Kugundua"** — mahusiano yaliyokwisha kubaliwa hayaonekani kama watu wapya.
6. **Duplicates za kadi:** "Rafiki · Rafiki" (chip mara mbili) na "Tazama Biashara" iliyovunjika kwenye chips mbili za kona?
   → kitufe **"Tazama"** + `min-width: 0` kwenye vitufe (maandishi yanashuka salama).
7. **Kitufe cha Chat kilirudiwa** kwenye panel ya biashara → kitufe kimoja; assert imeongezwa.
8. **Namba ya matokeo `(mapitio )`** ilionekana bila hesabu kwa biashara moja → guard.
9. **Ramani yenye vive `xMidYMid meet`** iliacha nafasi tupu kwenye desktop → `slice` + `viewBox` pana.
10. **Kujiunga kikundi mara ya pili** kulizalisha kikundi cha pili kwenye Chat → `joinedConversations` (dedupe);
    assert inathibitisha idempotence.
11. **Kitufe cha maendeleo (design system)** kilijipanga juu ya nav kwenye desktop → kimepanda juu ya nav.
12. **"Watu Unaoweza Kuwafahamu"** ilikuwa kichwa cha sehemu (lugha ya model ya mitandao ya kijamii) →
    imebadilishwa kuwa **"Watu wa Kugundua"** + assert mpya inazuia kurudi.
13. **Vichujio vya `1km`/`5km`** havikupatana na maandishi ya UI (`1 km`) → tests zimeoanishwa na labels halisi.
14. **Focus kwenye utafutaji** haukuwa wazi wa kutosha → `:focus-visible` yenye outline 2 px + pete laini.

---

## 14. Yaliyoachwa kwa awamu zijazo (kwa uwazi)

- Kadi za Stitch-zaidi (visual corrections kwa kila aina), polish ya desktops zaidi ya moja (multi-column
  ya kadi 3 → 4 kwenye skrini pana sana), micro-interactions (long-press contextual kama nyongeza).
- Panels za kina kwa channels/hubs/jumuiya (wasifu kamili), "Ramani kamili" (mfano wa skrini nzima).
- Utafutaji wa kina (historia, mapendekezo, "ulitafuta hivi karibuni") — bado ni `searchIdeas` rahisi.
- Gallery/ripoti ya mwisho ya Gundua na zip ya mwisho — baada ya awamu zijazo.
- **Hakuna** kazi ya backend/offline/sync kwenye Gundua (kwa makubaliano: backend bado).

> Kwa mujibu wa kanuni ya kazi: **sitendelei awamu inayofuata bila idhini** — hapa nasimama na kutoa
> ripoti (files · tests · screenshots) kwa uthibitisho.
