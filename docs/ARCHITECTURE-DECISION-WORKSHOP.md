# PASIHAI — ARCHITECTURE DECISION WORKSHOP (ADW)

**Hati:** Maamuzi ya usanifu yanayosubiri idhini ya owner
**Hali ya prototype:** Haijabadilishwa (Hatua 0 + 1 tu, kama ilivyo)
**Kilichofanyika:** ⚠️ **Hakuna code, hakuna integration, hakuna SDK, hakuna schema, hakuna env file.**
**Tarehe:** 2026-10-07

---

## 0. MIPAKA YA HATUA HII

### 0.1 Kilichofanyika / kisichofanyika

| Kipengele | Hali |
|---|---|
| React + Vite prototype | ✅ Ilivyo (haijabadilishwa) |
| Architecture audit | ✅ Imekamilika |
| Firebase project (`pasihai-c352e`) | ✅ Imetambuliwa **kama context pekee** |
| Cloudinary environment (`noropw5y`) | ✅ Imetambuliwa **kama context pekee** |
| Architecture decisions | ⏳ **Hati hii — inasubiri idhini** |
| Firebase integration | ❌ Haijaanza |
| Cloudinary integration | ❌ Haijaanza |
| Production backend | ❌ Haijaanza |

**Sikufanya:** kuandika code · kubadilisha source · kuongeza/kufuta modules · kusajili Web App ·
kufungua Firestore/Storage/Auth · kutengeneza Functions · upload service · media repository ·
database schema · environment files za production secrets.

### 0.2 Kanuni ya usiri (nakubali na kuiweka kama sheria ya kudumu)

**Sitaomba kamwe:** Firebase password · service-account private key · private key yoyote ·
Cloudinary API Secret · production secrets · payment credentials · SMS/OTP credentials.

Secrets zitawekwa na owner kupitia **secure environment/configuration mechanism** wakati
integration itakapoidhinishwa. Kwenye code ya frontend **hakutakuwa na secret yoyote** —
hata moja, hata kwa "majaribio".

### 0.3 Jinsi ya kutumia hati hii

Kila ADW ina sehemu 10 zilizoombwa. Kila moja inaisha na:

```
HALI: ⏳ INASUBIRI UAMUZI WA OWNER        →  [ ] IMekubaliwa  [ ] Rekebisha  [ ] Kataa
```

**Mapendekezo yangu (PROVISIONAL RECOMMENDATION) si maamuzi.** Ni msimamo wa kitaalamu
unaoeleza mapungufu, ili owner aamue kwa taarifa kamili.

### 0.4 Muhtasari wa haraka (Matrix)

| # | Uamuzi | Msimamo wangu | Kizuizi (blocker)? |
|---|---|---|---|
| **01** | LOCAL_ONLY vs Visibility | **Mihimili mitatu tofauti** (audience · area · distribution state) | ⛔ Ndiyo |
| **02** | Identity/Entity/Relationship/Role/Permission | **Actor model** + edge wa mtazamaji + ruhusa za scope | ⛔ Ndiyo |
| **03** | Deletion + Store-and-Forward | **Class-based forwarding** + tombstone + TTL | ⛔ Ndiyo |
| **04** | Sync Authority | **Sync Engine yetu**; Firestore = remote store (persistence OFF) | ⛔ Ndiyo |
| **05** | Offline Posting + Moderation | **Local-now, global-later, review-gated** (classes) | ⛔ Ndiyo |
| **06** | E2EE + Multi-device | E2EE ya lazima + **device linking kwa QR/P2P** + recovery key | ⛔ Ndiyo |
| **07** | Cache vs Saved | **Dhana tatu**: Saved · Offline pin · Cached (tofauti kabisa) | Ndiyo (ndogo) |
| **08** | Authorized Relay | **Hatua kwa hatua**: v1 cache ya public pekee → v3 economy | Hapana (baadaye) |
| **09** | Logical Clock | **HLC** + `server_seq` kwa mamlaka | ⛔ Ndiyo |
| **10** | Android vs iOS Transport | **Capability negotiation** + Android kwanza + hotspot bridge | Hapana (Phase N) |
| **I** | Infrastructure boundary (Firebase + Cloudinary) | **Adapters pekee**; hakuna domain logic ndani yao | ⛔ Ndiyo |

### 0.5 Utegemezi kati ya maamuzi

```
        ADW-02 (Identity/Entity/Relationship/Role/Permission)
                 │
      ┌──────────┼──────────────┐
      ↓          ↓              ↓
   ADW-01     ADW-03         ADW-05
 (LOCAL_ONLY) (Deletion)   (Offline+Moderation)
      │          │              │
      └──────────┴──────┬───────┘
                        ↓
                    ADW-04 (Sync Authority)
                        │
            ┌───────────┼───────────┐
            ↓           ↓           ↓
         ADW-09      ADW-07      ADW-06
      (Logical Clock) (Cache)   (E2EE)
                        │           │
                        └─────┬─────┘
                              ↓
                          ADW-08 (Relay)
                              │
                              ↓
                          ADW-10 (Transport)
                              │
                              ↓
                        ADW-I (Adapters: Firebase, Cloudinary)
```

**Maana:** ADW-02, ADW-01, ADW-03, ADW-04 ni **msingi**. Bila hizo, hakuna kitu kingine
kinaweza kujengwa bila kuachwa kuvunjwa. ADW-09 na ADW-07 ni za lazima **kabla ya mstari
wa kwanza wa data layer**.

---

# ADW-01 — LOCAL_ONLY vs VISIBILITY

### FACT
1. §6 (System Definition): *"Content inaweza kuwepo kwenye device bila kuwa published globally."*
2. §30: *"Location determines relevance, not exposure. Location haipaswi kuwa automatic access control."*
3. §22: *"Offline haimaanishi bilaaa safety."* Content inaweza kuwa normal/sensitive/restricted/blocked.
4. Prototype: hakuna `visibility`, hakuna `distribution_state`, hakuna `area` — hazipo kabisa.

### ASSUMPTION (mawazo yangu)
- "LOCAL_ONLY" inatumika kwenye document kwa **dhana mbili tofauti**: (a) content haijasafiri kwenda global, (b) content inayohusiana na eneo. Nazidhani ni tofauti.
- Mtumiaji atatarajia kuweza kuchapisha kitu "kwa vifaa vilivyo karibu" bila kuwa public.
- Kuna hatari kwamba "LOCAL_ONLY" **ikachukuliwa kama "hairuhusiwi kuhakikiwa"** — hii ni hatari ya usalama.

### OPTIONS

**A. LOCAL_ONLY kama visibility scope** (kama Public/Followers/Friends/Members)
- Content ina scope moja. Rahisi kuelezea.
- Shida: content iki sync, scope inabadilikaje? Na "local" kwa nani?

**B. LOCAL_ONLY kama distribution state pekee** (haijasafiri)
- Safi kifalsafa. Shida: haijibu **"nani anaweza kuiona kwa vifaa vya karibu?"**

**C. Mihimili mitatu tofauti, orthogonally** *(pendekezo langu)*

| Mhimili | Swali | Thamani |
|---|---|---|
| `audience` (visibility) | **Nani ana haki kuona?** | public · followers · friends · members(space) · private(dm) · **nearby** |
| `area` (relevance) | **Inahusiana na wapi?** | global · region · locality (haizuii mtu kuiona) |
| `distribution_state` | **Imeifikia wapi?** | draft · local_only · waiting_sync · syncing · synced · pending_review |

`nearby` ni **audience** yenye sheria zake (mtu aliye karibu + anayejulikana kwangu, au aliyealikwa)
— lakini **si** "mtaa" (area). Hii inatatua mkanganyiko.

**D. Scope moja inayohesabiwa (computed)** — audience inatolewa kutoka sheria ngumu za policy.
- Nzuri kwa uthabiti; ngumu kwa UX kuelezea na kwa cache (kifaa kinapaswa kuamua kila mara).

### TRADE-OFFS
| | A | B | C | D |
|---|---|---|---|---|
| Uelewa wa mtumiaji | Kati | Chini | **Juu** | Chini |
| Ugumu wa schema | Chini | Chini | Kati | Juu |
| Usalama (moderation) | Hatari | Hatari | **Safi** | Safi |
| Cache/cooperative | Ngumu | Ngumu | **Rahisi** | Ngumu |

### SECURITY IMPACT
- A/B zinaweza kusababisha **"local = unreviewed = allowed"** — hii inavunja §22.
- C inaruhusu policy ya wazi: `nearby` audience inaweza kuwa **imelazimika kufuata class za content** (ADW-05), bila kuchanganya na kama imesafiri au la.
- **Muhimu:** `distribution_state` **haipaswi kutumiwa na kifaa kama ruhusa ya kuona.** Kifaa kinachotuma content kinatuma **audience**; `distribution_state` ni ya kiufundi.

### PRIVACY IMPACT
- `nearby` ni **njia ya kuvujisha mahali**. Mtu anaweza kuhitimisha: "yuko karibu nami" au "yupo eneo hili sasa".
- **Sheria ya lazima:** kukutana kwa vifaa (encounter) **hakusajiliwi** kama uhusiano na **hakusafirishwi** server-side kwa default.
- `area` ya content ya mtumiaji **haipaswi** kuwa exact location. Mfano: "Dar es Salaam" ✅, GPS ⛔ (bila ridhaa ya wazi na feature inayohitaji).

### UX IMPACT
Maneno yanayotofautishwa wazi kwenye UI (Kiswahili):
- `draft` → **"Rasimu"**
- `audience: private` → **"Kwa mtu huyu"**
- `audience: friends` → **"Marafiki zangu"**
- `audience: nearby` → **"Watu walio karibu"** (pamoja na maelezo: *"Vifaa vilivyo karibu pekee. Hutaonekana kote."*)
- `audience: public` → **"Watu wote"**
- `distribution_state` → **"Inasubiri mtandao"** / **"Haijachapishwa bado"** / **"Inasubiri uhakiki"**

Hii inaunda uelewa rahisi: **"Ninachapisha kwa nani?"** si "nina hali gani?".

### IMPLEMENTATION IMPACT
- Content item inahitaji: `audience`, `area`, `distribution_state`, `permissions` (ADW-02), `policy_class` (ADW-05), `expires_at` (ADW-03).
- Routing service inatumia `area` **kama kipimo cha umuhimu** pekee, na `audience` **kama lango**.
- Cache inaangalia audience: `public`/`followers` zinaweza kusafiri; `private`/`friends` hazisafiri (ADW-03).

### PROVISIONAL RECOMMENDATION
**Option C.** Mihimili mitatu tofauti. `nearby` ni audience, si area. `distribution_state`
haipaswi kutolewa kwa devices wengine kama ruhusa. Encounters hazisajiliwi.

### OPEN QUESTIONS
1. Content iliyoundwa `nearby` inaweza **kupandishwa** kuwa `public` baadaye na mmiliki? (Nadhani ndiyo — lakini inahitaji uhakiki mpya.)
2. `nearby` ina maana gani kwa hubs (Dar Tech Hub ipo Dar — wanachama wote wanapata?) — hii ni **area**, si nearby.
3. Kikomo cha eneo: "karibu" ni mita ngapi? Au wifi-hop count (kiwango cha kimtandao, si GPS)?
4. Mtumiaji anaweza kuona **anaonekana vipi** kwa wengine (`nearby` disclosure) — ipo kwenye UI ya faragha?
5. Content ya `friends` inayosambazwa locally kwa rafiki aliye karibu — huyo rafiki anaweza kuishare kwa mtu mwingine? (→ ADW-08)

```
HALI: ⏳ INASUBIRI UAMUZI WA OWNER        →  [ ] Imekubaliwa  [ ] Rekebisha  [ ] Kataa
```

---

# ADW-02 — IDENTITY / ENTITY / RELATIONSHIP / ROLE / PERMISSION

### FACT
1. §12: **Identity ≠ Visibility ≠ Permission**, na *"Relationship"* ni mhimili wa tatu.
2. §29: Social graph ni **multi-dimensional**: Friends, Following, Followers, Members, Subscribers, Participants, Customers, Admins, Moderators. *"Hakuna relationship moja inayotawala kila kitu."*
3. §17: Business **haipaswi kuwa sehemu ya Personal Profile architecture**.
4. §63: *"One network, many communities, different boundaries."*
5. Prototype: `user.type: 'friend' | 'channel' | 'hub' | 'business' | 'creator' | 'you'` — **moja inachanganya vinne**.

### ASSUMPTION
- Kifaa kimoja kinaweza kuwa na **entity zaidi ya moja** (mtu mmoja: personal + channel + admin wa hub).
- Relationship **ni ya mtazamaji (viewer-scoped)**: "ninafuatilia Tech Sasa" ni data **yangu**.
- Channel/Hub/Business ni **waandaaji (publishers)** wenye uwezo wa kuchapisha, si "watumiaji".

### OPTIONS

**A. Typed actor mmoja (status quo)** — `user.type`
- Haraka. Inavunja mara moja §12 na §29. **Haikubaliki.**

**B. Person-pekee, roles kama fields za person**
- Rahisi; shida: Channel/Hub/Business hazina nafasi. Inalazimisha kujifanya "watumiaji".

**C. Actor model (entities + edges + grants)** *(pendekezo langu)*

```
ENTITY (kitu chenye utambulisho) ── entity_type: person | channel | hub | community | group | space | business
ROLE (ndani ya entity)         ── admin | moderator | editor | owner | member | participant
EDGE (uhusiano wa mtazamaji)   ── friend | follow | subscribe | member_of | customer_of | participant_in
VISIBILITY (audience)          ── public | followers | friends | members | private | nearby
PERMISSION (kitendo)           ── view | react | comment | share | quote | save | download | relay
```

Ruhusa inatolewa na: `(entity ya mtumiaji, role kwenye eneo, edge, audience, policy ya content)`.

**D. RBAC/ABAC engine kamili yenye policy language**
- Nguvu kubwa, lakini **imeshindwa vibaya** kwenye timu ndogo; ngumu kupima na kuhakiki. Mapema mno.

### TRADE-OFFS
C inaongeza ugumu wa **kuanzia** (musts ya msingi) lakini inaondoa kuvunja kwa **kila kipengele cha baadaye** (spaces, channels restricted, business customers, roles).
D ni sahihi kwa mfumo mkubwa wa kibiashara; hapa itachelewesha bila thamani ya moja kwa moja.

### SECURITY IMPACT
- **Least privilege:** role ni **scoped** kwa entity (moderator wa Dar Tech Hub ≠ moderator wa mfumo mzima). Hii inazuia kupanda madaraka (privilege escalation).
- **Deny by default.** Kama ruhusa haijatajwa, ni **kataa**.
- Ruhusa **zinahesabiwa pande zote mbili**: kifaa (kwa haraka, UX) **na** server (kwa mamlaka). Kifaa **kisiaminike** kamwe kwa ruhusa.
- Uhifadhi wa mabadiliko ya role (`grant_log`) ni lazima kwa audit — hasa kwa Business na Hubs.

### PRIVACY IMPACT
- **Edges za mtazamaji** ni muhimu: server **haipaswi** kuhifadhi grafu kamili ya kijamii ikiwa haihitajiki. Kwa mfano, "nafuatilia nani" ni data yangu; inaweza kubaki kifaa changu na kutumwa tu kama bhiti ya utambuzi (discovery) inayohitajika.
- Hii ni **tofauti muhimu na mitandao ya kawaida ya kijamii** ambayo hifadhi grafu yote. Inaunga mkono Minimum Knowledge.
- Business **haiwezi** kuona wateja wote kiholela; inaona kile kinachohitajika kwa mahusiano ya biashara (orders, messages) — kwa ruhusa.

### UX IMPACT
- **Visual parity:** `Identity` component iliyopo inabaki kama ilivyo. Badilika ni **chanzo cha data**, si muonekano.
- Ongezeko la lazima: **"Unachapisha kama..."** — mtumiaji anayeendesha zaidi ya entity moja anahitaji kuchagua (mimi / channel yangu / biashara yangu). Hii ni UX mpya ndogo, si kuvunja.
- `defaultRelationship(user)` inabadilika kuwa `relationshipBetween(me, entity, context)`.

### IMPLEMENTATION IMPACT
- Majedwali: `entities`, `edges`, `roles` (grants), pamoja na `me` (utambulisho wa kifaa).
- Resolver: kazi **moja** ya kukokotoa ruhusa (`can(viewer, action, content)`) — haitawanyiki kwenye UI.
- Migration: `mock.js` inabadilishwa **nyuma ya dirisha** (repository), UI haibadiliki.
- IDs: entity IDs **za kimataifa** (stable), pamoja na handle; edges zinatumia entity IDs.

### PROVISIONAL RECOMMENDATION
**Option C**, yenye:
- Orodha **iliyofungwa** ya `entity_type`, `role`, `edge_type`, `action` (hakuna strings huru).
- Deny-by-default resolver.
- Role zenye scope (entity + sub-scope ikihitajika: moderator wa group moja ndani ya hub).
- `me` = kifaa; entity ya person **si lazima** iwe moja kwa kifaa (multi-entity management).
- Visual parity: `Identity` component haibadiliki.

### OPEN QUESTIONS
1. **Account moja, entities nyingi?** Au kila entity ni identity yenye login yake? (Nashauri: account moja, entities nyingi, roles za scope.)
2. **Friend ni edge moja au mbili?** Nashauri: edge **moja yenye state** (`requested → accepted → ended`) kwa sababu "rafiki" ni hali ya pamoja, si mali ya mmoja.
3. **Block** ni edge au ni policy ya pande mbili (block inamzuia hata kuona)? Nashauri: block = flag ya pande mbili yenye athari ya pande zote (privacy-first).
4. **Customer** ni edge au ni sifa ya order? Nashauri: **edge yenye scope ya biashara** (haiingii kwenye "friends" na inaonekana kwa biashara pekee).
5. Orodha kamili ya **actions** kwa MVP: nadhani `view, react, comment, share, save` — `quote, download, relay` baadaye.
6. Je, **Channel** inaweza kuwa na **admins wengi** (team)? Nadhani ndiyo, lakini ni uamuzi wa bidhaa.
7. **Deleted entity** (mtu anaacha PASIHAI): edges zake zinafanyaje? Zinafutwa, au zinabaki kama "kumbukumbu"?

```
HALI: ⏳ INASUBIRI UAMUZI WA OWNER        →  [ ] Imekubaliwa  [ ] Rekebisha  [ ] Kataa
```

---

# ADW-03 — DELETION + STORE-AND-FORWARD

### FACT
1. §9–§11: store-and-forward; content inasafiri A → B → C → Internet.
2. §50: *"user control, portability... clear deletion/export concepts."*
3. §10: chunk-based distribution (vipande, hash, availability).
4. Ukweli wa kiufundi: **content iliyosafirishwa haiwezi kufutwa kwa hakikisho.** Huu ni mgongano wa kimsingi, na document haiuusemi wazi.

### ASSUMPTION
- Owner atatarajia "Futa" kuwa na maana **inayoeleweka** — hata kama si kamili.
- Content ya faragha **haipaswi** kusafiri kupitia vifaa vya wengine (hii ni dhana yangu ya msingi).
- TTL (muda wa kuisha) itakuwa **lazima** kwa nakala zinazosafiri.

### OPTIONS

**A. Kusafirisha kila kitu; kufuta = best-effort**
- Rahisi kiufundi, inavunja faragha. Template: barua pepe (email).

**B. Hakuna kusafirisha kabisa** (store-and-forward imezimwa)
- Salama, lakini inaua kipengele kile ambacho ni utofautisho wa PASIHAI.

**C. Class-based forwarding + tombstone + TTL** *(pendekezo langu)*

| Class ya content | Inasafiri? | Kufuta |
|---|---|---|
| `private` (DM) | **Hapana** — au kama ciphertext iliyoandikwa kwa mpokeaji pekee | Tombstone kwa mpokeaji; ciphertext inabaki kwa mpokeaji (kama SMS) — **tunaeleza wazi** |
| `friends` | Hapana kusafiri kwa wasio rafiki | Tombstone; nakala kwa rafiki inaheshimiwa |
| `nearby` (audience) | Kusafiri kwa walio karibu **waliojulikana** | Tombstone |
| `public` | **Ndiyo** — inasafiri (hii ni CDN ya kiraia) | Tombstone + TTL |
| `channel` (followers) | Kusafiri kwa wanachama waliojulikana | Tombstone + TTL |

**D. Recipient-addressed encryption (envelope) + key rotation** — kama **nyongeza ya C**, si mbadala
- Content inasafiri kama ciphertext **iliyoandikwa kwa wapokeaji**; relay haisomi.
- Kufuta/futa ufikiaji = **kubadilisha funguo** (revocation).

### TRADE-OFFS
- C+D inatoa faragha nzuri **lakini** inaongeza ugumu: kila content inahitaji envelope, signature, na sera.
- B ni salama lakini inaua thamani ya bidhaa.
- A ni haraka lakini inaleta hatari ya kisheria na ya kuaminika.

### SECURITY IMPACT
- **Tombstone lazima iwe imesainiwa** na mwandishi; vinginevyo mtu anaweza "kufuta" content ya mtu mwingine kwa uongo.
- **Anti-replay:** `(content_hash, operation_id)` ni ya kipekee; envelope ina HLC (ADW-09) na `expires_at`.
- **Tombstone inaweza kuzuiwa** (kifaa kisicho online). Hivyo: **hakuna dhana ya "kufutwa 100% kote"** — na hii lazima ielezwe wazi, si kufichwa.
- Content ya `policy_class: blocked` **haisafiri kamwe** (§27: `BLOCKED → DO NOT DISTRIBUTE`).

### PRIVACY IMPACT
- **Kufuta kwa kweli ni kugumu** kwenye mfumo uliogawanywa. Tunapaswa kufanya **kile kinachowezekana** na **kueleza kilichobaki**:
  - Tunafuta kwenye vifaa vyetu na vya wapokeaji wanaoshirikiana nasi.
  - Nakala za vifaa vilivyokwisha kusafirisha zinaisha kwa **TTL** (siku X).
  - Hii ni bora kuliko mitandao ya kawaida (ambayo haifuti kabisa kwenye cache za wengine), na **tunaweza kusema hivyo kwa uaminifu** — bila kudai 100%.
- **Screenshots** haziwezi kuzuiwa kikamilifu. Sera: eleza, usiahidi kuzuia.

### UX IMPACT
- Maneno: **"Futa"** + maelezo mafupi: *"Itafutwa kwako, kwa PASIHAI, na kwa waliopokea. Vifaa vilivyokwisha nakili kwa muda vitaiacha baada ya siku 30."*
- Kuonyesha `expires_at` kwa content inayosafiri (badge ya hila, si kelele).
- **Hakuna** kitufe cha "futa kwa kila mtu kwa muda usio na kikomo" — kwa sababu hiyo ni ahadi isiyowezekana.

### IMPLEMENTATION IMPACT
- `content_items` inahitaji: `expires_at`, `distribution_class`, `tombstone_state`, `author_signature`, `relay_policy`.
- `media_objects` inahitaji: `chunk_manifest`, `availability`, `max_lifetime`.
- Tombstone propagation ni **operation** kwenye queue (ADW-04), si rufaa ya moja kwa moja.
- Key rotation (kwa content ya recipients-walioandikiwa) inahitaji `key_epoch` kwa kila uhusiano.

### PROVISIONAL RECOMMENDATION
**C + D**, yenye sheria tano:
1. Content ya `private` **haisafiri** (isipokuwa ciphertext iliyoandikwa kwa mpokeaji).
2. `public`/`followers` inaweza kusafiri — **kama CDN ya kiraia**, yenye TTL.
3. Tombstone **imesainiwa**, na **ni best-effort** (tunaeleza, hatudai).
4. TTL **lazima** kwa nakala zote zinazosafiri (default: 30 siku, inaweza kubadilishwa).
5. Content ya `blocked` haisafiri kamwe.

### OPEN QUESTIONS
1. **TTL ya default** ni ipi? (Nashauri siku 30 kwa public, siku 7 kwa nearby.)
2. Kuna kesi za **kufuta kwa dharura** (content inayodhuru) zinazohitaji "kill signal" yenye kipaumbele cha juu? Hii inahitaji mfumo wa server-push — inaathiri Phase L.
3. Kufuta **media** (chunks zinazosambazwa) — kifaa kinachoipitisha kinapaswa kufuta chunks? Baada ya muda gani?
4. **Data export** (portability) inahitaji API — iko Phase T?
5. Nini hutokea kwa content ya mtumiaji **aliyefuta account** — tombstone au kufuta kabisa? (Nashauri: tombstone na kufuta data ya kibinafsi, kuhifadhi jina kwa muktadha wa mazungumzo.)

```
HALI: ⏳ INASUBIRI UAMUZI WA OWNER        →  [ ] Imekubaliwa  [ ] Rekebisha  [ ] Kataa
```

---

# ADW-04 — SYNC AUTHORITY

### FACT
1. §19: Sync si "reload page" — ni application service.
2. §20: Conflict strategies zinatofautiana kwa domain; *"Usitumie one-size-fits-all."*
3. Ukweli wa kiufundi: **Firestore ina offline persistence yake yenyewe, ambayo imewashwa kwa default kwenye web.** Kuiwasha pamoja na Sync Engine yetu = **mifumo miwili** (inavunja §60).
4. Ukweli mwingine: Firestore ina conflict resolution ya **last-write-wins** kwake — haitoshi kwa domain mbalimbali za PASIHAI (messages zinaitaji mpangilio; edges zinaitaji state machine; wallet inahitaji mamlaka ya server).
5. Prototype: hakuna persistence, hakuna sync, hakuna queue.

### ASSUMPTION
- Owner anatarajia Firestore **kama infrastructure**, si kama mfumo wa PASIHAI (ilionyeshwa wazi kwenye ujumbe: *"Firebase ni infrastructure providers/adapters"*).
- Cost ya Firestore ina uzito (writes zinahesabiwa) — batching na deduplication ni lazima.

### OPTIONS

**A. Firestore offline persistence kama sync engine**
- Haraka sana kuanza. Inatoa offline cache bila kazi.
- Shida: haiwezi kutumia transport yoyote isiyo Internet (inaangamiza ADW-10) · haiwezi kuchagua conflict rules kwa domain · cache ya Firestore **inaweza kuhifadhi media/data ya E2EE kwenye diski bila udhibiti wetu** · Firebase inakuwa "mfumo", si adapter · cost isiyodhibitiwa kwa queue ndefu.

**B. Sync Engine yetu ndiyo mamlaka; Firestore = remote store (persistence OFF)** *(pendekezo langu)*
- Local IndexedDB = chanzo cha ukweli kwenye kifaa.
- Queue yetu = njia pekee ya kuandika nje.
- Firestore inatumika **kupokea/kusoma** kwa kutumia SDK, bila offline persistence.

**C. Hybrid: engine yetu kwa domain; Firestore realtime kwa Soga pekee**
- Kinaonekana rahisi lakini kinajenga **mifumo miwili ya mzunguko wa data** — hatari ya §60 na ya kutokukubaliana (inconsistency).

**D. Server-authoritative kila kitu (hakuna mamlaka ya local)**
- Salama zaidi kwa counters/malipo, lakini **inaua offline-first**.

### TRADE-OFFS
| | A | B | C | D |
|---|---|---|---|---|
| Muda wa kuanza | **Haraka** | Kati | Kati | Haraka |
| Offline-first halisi | ❌ | ✅ | ⚠️ | ❌ |
| Transport abstraction | ❌ | ✅ | ⚠️ | ❌ |
| Udhibiti wa conflict | ❌ | ✅ | ⚠️ | ✅ |
| Faragha (cache) | ❌ | ✅ | ⚠️ | ❌ |
| Cost control | ❌ | ✅ | ⚠️ | ❌ |

### SECURITY IMPACT
- **Server lazima iwe mamlaka ya mwisho** kwa: counters, wallet/Hai Points, moderation states, roles/grants, na visibility ya public content. Kifaa **hakiwezi** kuamua mwenyewe.
- **Idempotency:** kila operation ina `operation_id`; server inakataa mara ya pili (retry salama). Bila hii, retry ya offline inaunda duplicates.
- **Defense in depth:** kifaa kinahakiki, server **inahakiki tena** (never trust client).
- **Firestore rules** ni safu ya pili, **si** safu ya kwanza ya usalama. Ruhusa ni domain logic.

### PRIVACY IMPACT
- B inatuwezesha **kudhibiti kile kinachohifadhiwa kwenye cache ya kifaa** — muhimu kwa E2EE (ADW-06) na kwa "Minimum Knowledge".
- A inaweza kuhifadhi content ya faragha kwenye cache ya Firestore — **hatari ya kweli ya faragha** kwenye kifaa kilioibiwa.
- B inaruhusu **encrypted local DB** kwa funguo za kifaa (Keystore/Keychain).

### UX IMPACT
- Hali za sync zinaonekana **kwa hila**: "Inasubiri mtandao" kwa kipengele, si kwa kila kitu.
- Sync **haiombi mtumiaji kufanya kitu** mara nyingi. Inaonyesha tu pale inapohitajika (content, number ya pending).
- User anaweza kuona "kitu kimoja kilichosubiri" — si orodha ya kiufundi.

### IMPLEMENTATION IMPACT
- `FirestoreSettings { persistence: disabled }` ni uamuzi wa **kanuni** (imerekodiwa hapa kama ADW, itatekelezwa Phase 1).
- Queue: `operation_id, entity_id, op_type, created_at, priority, retry_count, payload_ref, sync_state` + **HLC** (ADW-09).
- **Conflict table kwa domain** (kutoka ripoti iliyotangulia): messages=server order · posts=LWW+version · reactions=set · counters=server · edges=state machine · settings=LWW/device · drafts=local · moderation=server · wallet=server ledger.
- **Remote adapter interface:** `RemoteStore { push(op), pull(cursor), subscribe(channel) }` — Firebase ni **implementation moja**.
- **Batching + dedupe** ili kupunguza cost ya Firestore writes.

### PROVISIONAL RECOMMENDATION
**Option B.** Firestore = remote store kwa **persistence imezimwa**; Sync Engine yetu ni mamlaka ya mzunguko;
kila domain ina conflict rule yake; server inahakiki kila kitu; Firebase ipo nyuma ya `RemoteStore` interface
ili iweze kubadilishwa (§53 inasema Firebase si lazima iwe permanent).

### OPEN QUESTIONS
1. **Realtime:** Feed inahitaji listeners za realtime, au polling+N? (Nashauri: realtime kwa Soga pekee; feed = pull.)
2. Cost: tunakadiria writes ngapi kwa mtumiaji kwa siku? (Inaamua muundo wa batching na compaction.)
3. **Multi-device sync** ya mtu mmoja: ni kwa kifaa vipi, na kinasoma nini kutoka server?
4. Nini hutokea **queue inakua kubwa** (kifaa offline wiki mbili)? Kuna kikomo cha operation? (Nashauri: kikomo + compaction + tahadhari kwa mtumiaji.)
5. Je, tunahitaji **E2EE local DB** mwanzoni (nashauri ndiyo kwa media/messages) — inaathiri utendaji kwenye vifaa vya chini.

```
HALI: ⏳ INASUBIRI UAMUZI WA OWNER        →  [ ] Imekubaliwa  [ ] Rekebisha  [ ] Kataa
```

---

# ADW-05 — OFFLINE POSTING + MODERATION

### FACT
1. §21: mzunguko wa offline posting: Local Validation → Safety/Policy Check → LOCAL HOLD/LOCAL_ONLY → (Internet?) → Queue/Server Review → Approved/Rejected.
2. §22: *"PASIHAI isiruhusu mtu kusema: 'Kwa sababu niko offline, kila kitu kinaruhusiwa.'"*
3. §24–§25: Trust token; moderation; Minimum Knowledge.
4. Mgongano ambao document haiuusemi: **kifaa hakiwezi kuhakiki content** — lakini kifaa ni **njia ya usambazaji**. Hii ni hatari ya kweli.

### ASSUMPTION
- Owner anatarajia offline publishing **ifanye kazi** (ni ahadi ya msingi ya bidhaa).
- Majority ya content ni ya kawaida; hatari kubwa ni **public content isiyohakikiwa inayosambazwa**.
- "Local" haipaswi kuwa mwanya wa kukwepa uhakiki.

### OPTIONS

**A. Kuzuia publishing kabisa offline** (draft pekee)
- Salama kabisa kwa usambazaji, lakini inavunja ahadi ya offline-first kwa mtumiaji wa kawaida.

**B. Local publishing kamili + usambazaji kamili wa local**
- Haraka, inavunja §22 kwa vitendo.

**C. Tiered: local-now, global-later, review-gated** *(pendekezo langu)*

| Class | Mfano | Local (vifaa karibu) | Global |
|---|---|---|---|
| **1. Private** | DM, ujumbe wa familia | ✅ papo hapo (E2EE) | Sync (haijakaguliwa — ni faragha) |
| **2. Friends** | Post kwa rafiki/group inayojulikana | ✅ kwa rafiki waliojulikana pekee | Baada ya sync (hakiki ya hiari/kwa-report) |
| **3. Public** | Post ya wote, channel, announcement | ⚠️ **kwa waliojulikana pekee** kama "pending" | **Baada ya uhakiki** |
| **4. Restricted** | Content yenye alama za hatari | ❌ Hapana | ❌ Hapana |

Pamoja na: **device-side pre-checks** (rate limits, hash ya content inayojulikana kuwa mbaya, ukubwa), na
**"pending review" marker** iliyowekwa kwenye envelope — vifaa vingine **vinajua** content haijakaguliwa
na vinaweza kuonyesha alama au kukataa kuipitisha (relay).

**D. Server-pre-review kila kitu**
- Salama, lakini **hauwezekani** offline — na unaua bidhaa kwa watumiaji wa mtandao mdogo.

### TRADE-OFFS
- C inahitaji **mgawanyo wa class** kuwa wazi na wa lazima (hii ni kazi ya domain logic, si ya UI).
- C ina hatari ndogo: content ya public ya "pending" inaweza kusambazwa kwa marafiki wachache kabla ya uhakiki. **Lakini** hii ni sawa kwa kanuni (ni kwa watu wanaojulikana, si kwa wote) — na ni bora kuliko kuzuia kabisa.
- B inaonekana "raia wa mtandao" lakini inaweza kutumika kusambaza content iliyozuiliwa.

### SECURITY IMPACT
- **Kifaa hakiwezi kuhakiki.** Hii ni ukomo wa kiufundi, si uzembe. Tunapunguza hatari kwa: class limits · rate limiting · hash lists · signed "pending" marker · na **kutokuruhusu relay ya kile kifaa hakikijui** (ADW-08: class-based, si content-based).
- **Content ya class 3 (public) haipaswi kuruhusiwa kusafiri kama CDN kabla ya uhakiki** — hii inafunga mwanya mkubwa.
- **Report flow:** ripoti inaweza kutokea offline (queued). Inahitaji **uthibitisho** (reporter authenticated, ili kuzuia unyanyasaji) lakini **haipaswi kuweka reporter kwenye hatari** (reporter hash/ID imefichwa, sema ipotee kwa mtumiaji wa kawaida).

### PRIVACY IMPACT
- **Classification inafanyika kwenye kifaa** (size, type, rate, hash). Hii inaunga mkono Minimum Knowledge: **hatutumii content kwa server kwa ukaguzi wa awali**.
- Lakini hii ina maana server **haiwezi** kuhakiki kila kitu — tunakubali hatari hiyo kwa uaminifu, na kupunguza kwa classes.

### UX IMPACT
Maneno muhimu (Kiswahili), bila kuhangaisha:
- `waiting_sync` → **"Inasubiri mtandao"**
- `pending_review` → **"Inasubiri uhakiki"** (+ maelezo: *"Marafiki wako wanaweza kuiona. Watu wote baada ya uhakiki."*)
- Kwa mpokeaji: badge hafifu **"Haijahakikiwa"** kwenye content ya pending.
- **Hakuna** maneno ya kiufundi ("LOCAL_ONLY", "queue") kwa mtumiaji wa kawaida.

### IMPLEMENTATION IMPACT
- `policy_class` inakuwa **sehemu ya lazima ya content item** (inaamua usambazaji, sio UI pekee).
- Publish gate ni **service** (`PublishGate`) inayotumika pande zote (local + server).
- Rate limits za kifaa: kikomo cha content kwa saa kwa class, na kikomo cha bytes kwa siku (kuhusiana na allowance — ADW ya baadaye).
- `trust_token` (server-issued) inaonyesha content imehakikiwa — kifaa kinaweza kuithibitisha.

### PROVISIONAL RECOMMENDATION
**Option C** yenye sheria nne za lazima:
1. Class 1 na 2 zinapita immediately (kwa walengwa).
2. Class 3 (public) **haiendi global** bila uhakiki; local kwa **waliojulikana** pekee, na imewekwa `pending`.
3. Class 4 (restricted) **haisambazwi kabisa**, hata kwa marafiki.
4. Class 3 **haiwezi kusafiri kama CDN (relay)** kabla ya uhakiki.

### OPEN QUESTIONS
1. **Nani anahakiki content ya local-only** isiyowahi kupata internet? (Nashauri: haihitaji uhakiki kwa sababu haifikii "watu wote" — inabaki local. Lakini kuna kikomo cha muda?)
2. **Uwiano wa uhakiki:** content nyingi zinaweza kusubiri kwenye queue kwa siku. Kuna SLA? (Inaathiri uzoefu wa creator wa channel.)
3. Vifaa vinaweza **kuripoti** content offline? (Nashauri ndiyo — ripoti inasubiri queue, ikiwa na uthibitisho wa upande wa kifaa.)
4. **Repeat offenders:** kifaa kinachoendelea kutuma content iliyozuiliwa — kinapunguzwa uwezo (rate limit reduced) au kinazuiwa? Sera?
5. Je, tunahitaji **appeal** flow kwa content iliyokataliwa? (Inahitaji UI, Phase T.)

```
HALI: ⏳ INASUBIRI UAMUZI WA OWNER        →  [ ] Imekubaliwa  [ ] Rekebisha  [ ] Kataa
```

---

# ADW-06 — E2EE + MULTI-DEVICE

### FACT
1. §24: encryption, E2EE *inapowezekana*, encrypted media, minimal routing metadata, report mechanisms.
2. §24 pia: *"PASIHAI isidai '100% private'."*
3. §23: report/abuse ndani ya E2EE inahitaji utaratibu (haijaelezwa).
4. Ukweli: E2EE **haiwezi** kufanya kazi bila maamuzi ya multi-device na recovery. Bila hayo, mtumiaji anayepoteza simu anapoteza historia — na hilo ni kosa la bidhaa.

### ASSUMPTION
- Soga ni **communication-first** — faragha ni ahadi ya msingi, si nyongeza.
- Watumiaji wengi watakuwa na **kifaa kimoja**, lakini wengine wana simu + kompyuta.
- Kuna hatari ya kifaa kilioibiwa/kushirikiwa (muktadha wa soko).

### OPTIONS

**A. Hakuna E2EE** (server-side encryption at rest pekee)
- Rahisi sana. Ni "faragha ya kuaminiana" — na §24 inasema wazi *tunapaswa* kuwa makini. Inashindwa kwa Minimum Knowledge.

**B. E2EE kwa funguo za kifaa, hakuna recovery**
- Salama, lakini **kupoteza kifaa = kupoteza historia**. Mtumiaji wa kawaida **hatakubali** hii.

**C. E2EE + device linking kwa QR/P2P + recovery key** *(pendekezo langu)*
- Kila kifaa kina funguo zake; kifaa kipya kinaunganishwa kwa **kuchanganua QR kutoka kifaa kilichopo** (kupitia **chaneli ya local** — inatumia uwezo wa transport!).
- **Recovery:** user-held recovery key (maneno 12 au faili), kwa backup iliyosimbwa. **Hakuna server escrow** kwa default.
- Groups: sender keys; **mabadiliko ya uanachama = mzunguko wa funguo** (rotation).

**D. Signal-style kamili (sealed sender, per-device fanout, sender keys za hali ya juu)**
- Bora kwa faragha ya metadata; **ugumu wa juu** na muda mrefu zaidi. Nashauri kama **mwelekeo**, si kuanzia.

### TRADE-OFFS
- C inatoa **93% ya thamani** kwa **30% ya ugumu** wa D. Inaruhusu kifaa kipya kupokea historia (muhimu!), inasaidia groups, na inaruhusu recovery.
- D inaongeza faragha ya metadata (server haijui nani anatuma kwa nani) — lakini inahitaji mabadiliko ya architecture ya routing na inagongana na huduma za server (ADW-04).

### SECURITY IMPACT
- **Funguo:** Android Keystore / iOS Keychain; si kwenye IndexedDB ya kawaida.
- **Multi-device fanout:** ujumbe unasimbwa **kwa kila kifaa cha mpokeaji** (N copies). Hii inaonyesha **idadi ya vifaa** — metadata nyeti ndogo. (D inaficha hii.)
- **Kifaa kilipotea:** mtumiaji anaweza **kuondoa kifaa** na kwa hivyo funguo zake hazipokei ujumbe mpya. Historia ya zamani **ipo kwenye kifaa kilichopotea** — hii ni daima ukweli wa E2EE. Kuiruhusu au la ni uamuzi wa sera.
- **Kifaa kimeibiwa:** lock ya kifaa + app PIN ni safu ya lazima; encryption ya local DB (ADW-04) inasaidia.
- **Report + E2EE:** njia ni **kushiriki ujumbe maalum kwa ridhaa** (mtumiaji anachagua ujumbe na kuyatuma kwa mhakiki, kifaa kinasimbua na kusaini). **Hakuna** uwezo wa server kusoma. Hii ni sehemu ya Phase T na ni lazima isanifu ikiwa sasa — si baadaye.

### PRIVACY IMPACT
- Metadata (nani ↔ nani, lini, mara ngapi) **inabaki nyeti** hata kwa content iliyosimbwa. **Serikali:** kuhifadhi metadata ndogo iwezekanavyo; ADW-04 inasaidia kwa kuweka data local kwa kiasi.
- **Sealed sender (D)** itapunguza hii — lakini inaweza kuhitaji wakati.
- Cloudinary **haisimami** content ya E2EE — kama media ya faragha inapanda, inapaswa kupanda **ikiwa imesimbwa mwanzo** (client-side encryption). Hii ni lazima, si hiari. (→ ADW-I)

### UX IMPACT
- **Kuunganisha kifaa kipya** kwa QR ni nzuri kwa UX (kama WhatsApp Web) na **inatumia local transport** — uthibitisho mzuri wa cooperative layer kwa matumizi ya kweli.
- **Recovery** inahitaji UX makini: watumiaji wengi hawataandika maneno 12. Chaguo: "tuma kwa trusted contact" (baadaye) + "pakua faili la recovery" + "ninaelewa hatari".
- Maneno: **"Ujumbe wako umesimbwa"** — na maelezo rahisi yanayoeleweka kwa mtumiaji wa kawaida (si maneno ya kiufundi).
- Kwa **watumiaji wa simu moja**, E2EE **haipaswi** kuleta homa yoyote.

### IMPLEMENTATION IMPACT
- Maktaba: kiwango cha libsodium / Olm-Megolm (au sawa); **haituandiki crypto wenyewe**.
- `key_epoch` kwa kila uhusiano (kwa revocation).
- **Group re-key** inapobadilika uanachama (ni lazima kwa usalama wa group).
- **Verified state:** vifaa vinaonyesha "imethibitishwa" (kwa QR) — ili kuzuia MITM wakati wa kuunganisha.
- Backup: format yenye version; restore inapita kwenye uthibitisho wa recovery key.

### PROVISIONAL RECOMMENDATION
**Option C sasa, D kama mwelekeo wa baadaye.** Sheria:
1. E2EE **ni ya lazima** kwa Soga (1:1 na vikundi) — si hiari kwa kila ujumbe (opt-in E2EE ni mtego wa faragha: mtu hadanganyike kuwa salama).
2. **Multi-device** kwa QR/device-linking kupitia local channel.
3. **Recovery** kwa user-held key; hakuna server escrow.
4. **Report** kwa ridhaa ya mtumiaji (kushiriki ujumbe maalum).
5. Media ya faragha **haisimami** Cloudinary bila client-side encryption.
6. **Hakuna madai ya "100% private"** popote kwenye UI.

### OPEN QUESTIONS
1. **Groups kubwa** (100+ wanachama) zinaweza E2EE kwa sender keys? Au Soga ina vikundi vidogo tu?
2. **Background:** ujumbe unapokelewa wakati app imefungwa? (Inaathiri push: FCM inaona metadata — tunakubali?)
3. **Shared device** (simu ya familia): profiles nyingi kwenye kifaa kimoja? Hii ni muhimu kwa soko la Tanzania.
4. **Voice/video calls** (Soga ina "simu za sauti na video" kwenye mock) — E2EE kwa simu (SRTP/DTLS)? Baada ya kujenga ujumbe.
5. Nini hutokea kifaa kipya kinapounganishwa — **historia inarudi** kwa kiasi gani? (Nashauri: kifaa kilichopo kinatuma historia iliyosimbwa kwa kifaa kipya, kama ilivyokubaliwa.)
6. **Vifaa vingi vya mtu mmoja:** kikomo cha idadi?

```
HALI: ⏳ INASUBIRI UAMUZI WA OWNER        →  [ ] Imekubaliwa  [ ] Rekebisha  [ ] Kataa
```

---

# ADW-07 — CACHE vs SAVED

### FACT
1. §11, §22: *"Cached ≠ Saved."* Cached = system, temporary, inaweza kufutwa. Saved = uamuzi wa mtumiaji.
2. §11: data efficiency inapimwa (internet bytes, local bytes, avoided).
3. §44: media optimization (thumbnail, preview, low-res, chunks).
4. Prototype: "Zilizohifadhiwa" (Saved) ipo; **hakuna** cache → **hakuna mkanganyiko kwa sasa** (hii ni nzuri).

### ASSUMPTION
- Kuna **dhana ya tatu** ambayo document haitaji lakini bidhaa inaihitaji: *"weka hii iwe inapatikana bila mtandao kwenye kifaa hiki"* — hii si Saved (kijamii) na si Cached (system). Hii ni **pin**.
- Watumiaji wa mtandao mdogo **watahangaika** kama hatutofautishi vitu hivi kwa maneno tofauti.

### OPTIONS

**A. Store moja yenye flag (`is_user_saved`)**
- Rahisi kiufundi, **hatari sana** kwa UX: mtumiaji akiona "cache 300MB" anaweza kudhani ni faili zake.

**B. Store mbili kabisa + majina tofauti + UI tofauti** *(pendekezo langu)*

| | **Saved** (kijamii) | **Offline** (pin ya kifaa) | **Cached** (mfumo) |
|---|---|---|---|
| Nani aliamua | Mtumiaji | Mtumiaji | Mfumo |
| Kwa nini | Kuipata baadaye | Kuitumia bila mtandao | Ufanisi wa mtandao |
| Inaisha | Hapana (mpaka mtumiaji) | Ndiyo (mtumiaji au storage) | Ndiyo, automatically |
| Inasafiri kwa vifaa vyangu | **Ndiyo** (ni data yangu) | Hapana (ni ya kifaa hiki) | Hapana |
| Inashirikiwa na wengine (relay) | Hapana | Hapana | **Ndiyo** (public pekee) |
| Inaonekana kwenye menyu | "Zilizohifadhiwa" | "Inapatikana bila mtandao" | "Hifadhi ya muda" |

**C. B + control panel** — pamoja na UI ya kusimamia: ukubwa, kufuta cache, kuona kilichohifadhiwa kwa offline.

### TRADE-OFFS
- C ni kazi ya ziada (UI moja ya settings) lakini **inaondoa mkanganyiko** kabisa — na kwa soko la mtandao mdogo, hii ni thamani ya kweli.
- A inaokoa muda lakini inaleta deni la UX lisiloweza kurekebishwa baadaye (mtumiaji atakumbuka uzoefu mbaya).

### SECURITY IMPACT
- Cache **haiwezi** kuwa njia ya kusambaza content iliyozuiliwa. Kwa hivyo: **cache inashirikiwa (relay) kwa content yenye `policy_class: normal` na `audience: public` pekee** (inaunganisha ADW-05 na ADW-08).
- Cache ya media ya faragha: **hairuhusiwi** kusambazwa kwa wengine (E2EE haithibitishiki kwa kifaa kingine, na ni ukiukaji wa faragha).

### PRIVACY IMPACT
- **Cache ya faragha:** media ya E2EE **haipaswi** kuhifadhiwa kama nakala "inayoweza kushirikiwa". Inahifadhiwa ndani ya app, kwa ufunguo wa kifaa.
- **Kuonyesha ukubwa wa cache kwa watumiaji wengine (relay)** — ni lazima kuwe na udhibiti wa wazi: mtumiaji anajua anachotoa.
- **Encounters** (kukutana kwa vifaa) hazionyeshwi kama "vifaa nilivyokutana navyo" — hiyo ni metadata ya mahali.

### UX IMPACT
- **Muhimu:** maneno yanatofautisha. "Saved" = ⭐ "Zilizohifadhiwa". "Offline pin" = ⬇ "Inapatikana bila mtandao". "Cache" = ⚙ "Hifadhi ya muda (hupotea yenyewe)".
- Kwenye **Data Saver** (ipo kwenye menyu ya Home): kuonyesha cache + kitufe cha kufuta, kwa lugha rahisi.
- **Hakuna** namba za kubuni. Kama hatuna kipimo halisi, **hatuonyeshi namba**.

### IMPLEMENTATION IMPACT
- Majedwali matatu: `saved_items` · `offline_pins` · `cache_entries` (+ `cache_index` kwa chunk availability).
- Quotas: cache ina kikomo kwa kifaa (m. 500MB–2GB kulingana na nafasi), inafutwa kwa LRU; pins zinaheshimiwa.
- `StorageManager.persist()` (web) / storage classes (native) kwa kuhifadhi.
- Metrics (ADW ya baadaye): `internet_bytes_received`, `local_bytes_received`, `local_bytes_shared`, `internet_bytes_avoided` — **zinapimwa kwa kweli**, au **hazionyeshwi**.

### PROVISIONAL RECOMMENDATION
**Option C** — dhana **tatu** zilizo wazi: **Saved** (kijamii, inasafiri kwa vifaa vyangu), **Offline** (pin ya kifaa hiki),
**Cached** (mfumo, inaisha yenyewe). Cache inaweza kuruhusiwa kusambaza **public + normal** pekee.
Menyu ya Home "Kuokoa data" inakuwa mahali pa kusimamia cache — kwa lugha isiyochanganya.

### OPEN QUESTIONS
1. **Pin (offline)** ni kipengele cha MVP? (Nashauri ndiyo — ni thamani kubwa kwa mtandao mdogo.)
2. Kikomo cha cache: kwa device class (RAM/storage)? Inaonekana kwa mtumiaji?
3. **Zilizohifadhiwa** zinasync kwa vifaa vyote vya mtumiaji? (Nashauri ndiyo, ni data yake.)
4. Kuna kitufe cha "futa cache yote" — au cache inatunzwa automatically bila UI? (Nashauri: kitufe kipo; udhibiti ni heshima.)
5. Cache ya **media ya marafiki** (si public, si private): ndiyo/hapana? (Nashauri: ndiyo kwa kifaa changu, hapana kwa kusambaza kwa wengine.)

```
HALI: ⏳ INASUBIRI UAMUZI WA OWNER        →  [ ] Imekubaliwa  [ ] Rekebisha  [ ] Kataa
```

---

# ADW-08 — AUTHORIZED RELAY

### FACT
1. §15: relay inaweza kuwa Disabled · Allow limited · Paid/authorized.
2. §14: **NO SILENT RELAY** — *"PASIHAI haitumii bundle ya mtu mwingine kwa content ya mtu mwingine bila authorization."*
3. §16: Hai Points zinaweza kutumika kwa relay/data services; **si** fedha kiotomatiki; kubadilisha kuwa fedha kunahitaji KYC.
4. §41: cooperative network economics.
5. Ukweli: relay inaweza kuwa **njia ya unyanyasaji** (malware, amplification) na ina athari za **kisheria** (uwajibikaji wa yule anayepitisha).

### ASSUMPTION
- Relay **inagusa pesa/data ya mtumiaji** — hivyo consent ni lazima kuwa ya wazi, si default.
- Watumiaji wengi **hawatajua** wanapofanya relay. Kwa hivyo UI lazima iwe wazi **kabla**, si baada.
- Relay **haiwezi** kusoma content (hasa E2EE) — hivyo sera **haiwezi** kuwa "kagua content".

### OPTIONS

**A. Relay imezimwa (v1)**
- Salama kabisa. Inaondoa thamani ya cooperative kwa muda.

**B. Cache exchange ya public content pekee** *(pendekezo langu kwa v1)*
- Vifaa vinashirikiana **nakala za content ya public** (picha/video zilizothibitishwa) ili kupunguza upakuaji.
- **Hakuna** content ya faragha, **hakuna** relay ya ujumbe.
- Ni "CDN ya kiraia" — rahisi kuelezea, rahisi kupima, rahisi kuhakiki.

**C. Relay kamili yenye consent + quota + policy** *(v2)*
- Mtumiaji anakubali; kikomo cha MB/siku; charging-only; Wi-Fi pekee (hiari); revocable; audit trail.

**D. Relay ya malipo (Hai Points)** — *(v3, Phase Q)*
- Soko la relay; malipo kwa relayers; inahitaji metering ya kweli + KYC ikiwa ubadilishaji wa fedha.

### TRADE-OFFS
- B inatoa **80% ya thamani ya mtandao** kwa **20% ya hatari**: cache ya public haigusi faragha (content ilishakuwa public), na inapunguza data.
- C inahitaji mfumo wa consent, quota, na audit — ni kazi kubwa. Inastahili **baada** ya sync/transport imara.
- D inahitaji **metering wa kweli** (na haiwezi kuwa makadirio).

### SECURITY IMPACT
- **Envelope ya lazima:** relay inaruhusu content **yenye:** `author_signature` sahihi · `expires_at` haijapita · `policy_class: normal` · `relay_policy: allowed` · `audience: public` (kwa B).
- **Rate limits + size limits** kwa kifaa (kuzuia amplification).
- **Kifaa kinacho relay kinahitaji kuwa salama** — kama kifaa kimeambukizwa, kinaweza kupotosha chunks. Hivyo: **chunk verification kwa `content_hash`** ni lazima kwa mpokeaji (kilichoandikwa §10).
- **Uwajibikaji (legal):** kifaa kinachopitisha content isiyojulikana — hii inahitaji **uhakiki wa kisheria**. Sheria za Tanzania (na za kimataifa) zinaweza kuweka uwajibikaji kwa "intermediary". Pendekezo: relay **class-based pekee** (public, reviewed) + uwezo wa kufuta (kill list) + sera zilizoandikwa.

### PRIVACY IMPACT
- **B:** hakuna faragha inayoguswa (public pekee). Metadata: kifaa kinajua kimepokea chunk ya content X — **hii ni metadata ya kibinafsi ndogo** (nini kinavutia mtumiaji). Kwa hivyo: **relay cache haipaswi kuwa signal ya kupendekeza content** kwa mtumiaji (hii inavunja Minimum Knowledge).
- **C:** relay wa ujumbe, hata kama ciphertext, unaweka metadata: "kifaa A kilituma kitu kwa B kwa niaba ya C". Hivyo: **relay ID isihifadhiwe** server-side; ujumbe usiwe na uhusiano na relay unaoonekana kwa mtu mwingine.
- Kwa ujumla: **No silent relay** inahitaji server **kutojua** relayer (au kumjua kwa kiwango cha chini kabisa).

### UX IMPACT
Maneno (Kiswahili) yanayoeleweka:
- **"Saidia wengine kuipata"** (relay) yenye maelezo: *"Vifaa vilivyo karibu vinaweza kupata picha/video kutoka kwenye kifaa chako badala ya kupakua tena. Hii inaokoa data ya wengine."*
- **"Weka kikomo"** (MB/siku), **"Wakati wa kuchaji pekee"**, **"Wi-Fi pekee"**, **"Zima"**.
- **Counter ya wazi:** *"Umesaidia MB 245 mwezi huu"* — inashiriki hisia ya ushirikiano (§41) **bila** kudai kuokoa ambayo haikupimwa.
- **Kill switch** wa haraka (kwenye menyu ya haraka).

### IMPLEMENTATION IMPACT
- `relay_consent` (settings) + `relay_policy` (content envelope) + `relay_quota` (metering).
- **Relay ni sehemu ya Transport Layer** (ADW-10) — si feature ya UI.
- Metering wa kweli: bytes zilizosafirishwa kwa niaba ya wengine; **hakuna makadirio**.
- **Audit ya ndani:** mtumiaji anaweza kuona alichosafirisha; **server haihifadhi** orodha ya relayers.

### PROVISIONAL RECOMMENDATION
Awamu tatu:
1. **v1 (Phase O):** **B** — cache exchange ya **public** pekee, **opt-in** (default: **imezimwa**), yenye quota.
2. **v2 (Phase Q):** **C** — relay kamili yenye consent, quota, charging-only, kill switch, audit ya ndani.
3. **v3 (Phase R):** **D** — economy (Hai Points) **baada** ya metering wa kweli na KYC (ikiwa ubadilishaji wa fedha).
**Kanuni ya kudumu:** hakuna relay ya content ya faragha; hakuna relay wa content isiyohakikiwa; hakuna relay bila consent.

### OPEN QUESTIONS
1. **Default ya v1:** imezimwa (nashauri) au imewashwa? (Imezimwa = heshima, lakini inapunguza matumizi.)
2. Relay inahesabiwa kwenye **5MB/day allowance** ya mtumiaji? (Nashauri: **hapana** kwa relay inayomsaidia mwingine; **ndiyo** kwa relay ya malipo; lakini data ya kifaa cha relay inagusa bundle yake — hivyo **inapimwa na kuonyeshwa tofauti**.)
3. **Kill list** (content iliyozuiliwa baada ya kusambazwa): server inaweza kutuma orodha ndogo ya hashes? (Inaathiri Phase T.)
4. Nini hutokea **relay inagundua chunk mbovu** (checksum imeshindwa)? Kuripoti? Kufuta cache?
5. Uh. **Charging-only** ni default (nashauri ndiyo) — lakini watch out: watumiaji wengi hawana umeme wa uhakika. Kikomo cha betri (mf. >30%) badala yake?

```
HALI: ⏳ INASUBIRI UAMUZI WA OWNER        →  [ ] Imekubaliwa  [ ] Rekebisha  [ ] Kataa
```

---

# ADW-09 — LOGICAL CLOCK

### FACT
1. §20: conflict handling inahitaji strategies mbalimbali (LWW, version, timestamps, merge, server authority).
2. §19: queue ina `created_at`, `priority`, `retry_count`.
3. Ukweli: **saa ya kifaa inaweza kuwa mbovu** (mtumiaji anabadilisha saa, kifaa cha bei nafuu kinapotea muda). Bila logical clock, mpangilio wa offline hautakuwa thabiti.

### ASSUMPTION
- Offline operations zitatokea **kwa wakati mmoja** (mtumiaji anachapisha vitu kadhaa bila mtandao).
- Server itatoa mpangilio wa kimataifa kwa content inayoonekana (feed), lakini kifaa kinahitaji mpangilio wa local **kabla** ya sync.
- **Anti-replay** ni muhimu kwa relay na kwa queue.

### OPTIONS

**A. Wall-clock pekee (`Date.now()`)**
- Rahisi sana. Inavunja mara moja: kifaa chenye saa iliyopotoka kinasumbua mpangilio wa kila mtu.

**B. Lamport clock** (counter pekee)
- Mpangilio thabiti, lakini **haujuliani na muda halisi** — "dakika 12" haipo, na UX inateseka.

**C. Hybrid Logical Clock (HLC)** *(pendekezo langu)*
- `(physical_time, counter)` — inasogea mbele, inakaribiana na saa halisi, ina mpangilio wa jumla (total order).
- Inaunganisha faida za A na B.

**D. Version vectors / vector clocks**
- Inagundua **concurrency kwa usahihi** (wapi kuna mgongano halisi), lakini ukubwa unakua kwa idadi ya vifaa/washiriki.
- Inafaa kwa **vikundi vidogo** na kwa **domain za state** (mf. edges), si kwa kila kitu.

### TRADE-OFFS
- C inatosha kwa **99%** ya mahitaji (mpangilio, causality ya kimsingi, anti-replay), na ni ndogo.
- D inaongeza ugumu wa schema; inafaa kwa **collaborative editing** (ambayo PASIHAI haina kwa sasa).
- **Server sequence** (`server_seq`) ni tofauti: inatoa mpangilio wa kimataifa kwa feed/messages baada ya kufika. **HLC + server_seq** ni mchanganyiko sahihi.

### SECURITY IMPACT
- **HLC si usalama.** Saa inaweza kudanganywa. Hivyo: **server inakagua (clamp/validate)** HLC inayofika. HLC inayorudi nyuma sana au kusonga mbele sana inakataliwa au kurekebishwa.
- **Anti-replay:** `(operation_id, content_hash)` ya kipekee + HLC window + signature. Hii ni lazima kwa store-and-forward (ADW-03) na relay (ADW-08).
- **Anti-spam kwa muda:** HLC inasaidia kupima rate kwa kifaa (tukio 1000 kwa sekunde = shaka).

### PRIVACY IMPACT
- HLC **inaweza kufichua tabia** (mtumiaji yupo aktivu saa ngapi, mapumziko). Hivyo: **server inatumia HLC kwa mpangilio pekee**, na **haipaswi** kuitumia kwa profiling.
- Kwa content ya local-only, HLC inabaki kifaa (haisafiri) — hakuna uvujaji.
- Display time kwa mtumiaji inatokana na **server_seq** (mara nyingi), au HLC ya local kwa content isiyosafiri.

### UX IMPACT
- **UI haioni HLC.** Ni ya kiufundi.
- "dakika 12" inatolewa na **formatter** kutoka timestamp (inarekebishwa server inapojibu), si maandishi yaliyoandikwa.
- Content ya local-only inaonyesha muda wa kifaa **pamoja na alama hafifu** ("haijachapishwa") — ili mtumiaji asidhani ilichapishwa kwa wote.

### IMPLEMENTATION IMPACT
- Kila operation na kila content item ina `hlc` (imefungwa kwenye envelope).
- Server ina `server_seq` kwa kila entity (feed global order, messages, counters).
- **Clock skew handling:** kifaa kinarekebisha muda kutoka server; HLC ina `max_skew` (mf. dakika 15); zaidi ya hapo → operation inawekwa alama na kupimwa upya.
- Queue inahesabiwa kwa HLC ili retry zisibadilishe mpangilio.
- **Compaction:** operations zilizosafiri zinafupishwa (kwa domain) ili queue isikue bila kikomo.

### PROVISIONAL RECOMMENDATION
**C + server_seq:**
1. **HLC** kwa kila operation (mpangilio wa local + causality + anti-replay).
2. **`server_seq`** kwa mpangilio wa kimataifa (feed, messages, counters) — mamlaka ya server.
3. **Version numbers** kwa entity zinazohaririwa (posts) → LWW yenye server authority.
4. **Version vectors (D)** kwa **domain chache pekee** (edges/state machines) — ikiwa inahitajika; si kwa kila kitu.
5. Server **inakagua** HLC (clamp) na **haitumii** kwa profiling.

### OPEN QUESTIONS
1. `server_seq` ni **global** au **kwa-feed/kwa-entity**? (Nashauri: kwa-entity + global kwa messages.)
2. `max_skew` ni ipi? (dakika 15 inaonekana sawa; lakini vifaa vya bei nafuu vinaweza kuwa mbaya zaidi.)
3. Tunahitaji **kurekebisha muda wa kifaa moja kwa moja** (tunapoona skew)? Hii inagusa ruhusa za mfumo.
4. **Retention ya operations zilizosafiri:** kwa muda gani tunaweka kwa dedupe? (Nashauri: siku 90 kwa operation_id.)
5. Kuna haja ya **CRDT** kwa domain yoyote (mfano comments/reactions)? (Nashauri: reactions = set (CRDT ndogo); comments = append-only (server order).)

```
HALI: ⏳ INASUBIRI UAMUZI WA OWNER        →  [ ] Imekubaliwa  [ ] Rekebisha  [ ] Kataa
```

---

# ADW-10 — ANDROID vs iOS TRANSPORT

### FACT (ukweli wa kiufundi, haupingiki)
1. **Wi-Fi Direct:** Android ✅ ina API. **iOS ❌ haina API ya umma.**
2. **Multipeer Connectivity (Apple, AWDL):** iOS ↔ iOS ✅ (nzuri), lakini **iOS ↔ Android ❌**.
3. **Bluetooth (BLE):** Android ✅, iOS ✅ (vikwazo vya nyuma/background). Uwezo: **kbps-level** — haifai media, inafaa metadata na ujumbe mdogo.
4. **Local Wi-Fi:** ✅ vyote, lakini inahitaji **AP moja** au **hotspot**.
5. **Hotspot bridge:** Android anaweza kuunda hotspot ya Wi-Fi ya kawaida; **iOS anaweza kujiunga nayo** ✅ — hii ni njia ya **kuzalisha uwezo wa Android↔iOS**.
6. **Prototype ni React + Vite (web):** web **haina** ufikiaji wa BLE/Wi-Fi Direct. Hivyo transport halisi inahitaji **shell ya native** (Capacitor / React Native / Kotlin+Swift).
7. Ruhusa: Android 12+ `BLUETOOTH_SCAN/CONNECT`; Android 13+ `NEARBY_WIFI_DEVICES`. iOS ina maelezo ya lazima.
8. Background: iOS inapunguza sana BLE/Wi-Fi background; Android inahitaji foreground service kwa transfer ndefu.

### ASSUMPTION
- Soko la msingi (Tanzania na Afrika Mashariki) lina **Android kubwa**. Hii inapendekeza **Android-first**.
- Owner hahitaji **parity kamili** siku ya kwanza, lakini **haipendi** kuficha uwezo usiopo.
- Watumiaji wa iOS wanahitaji **uzoefu kamili wa Internet** (hii ni ndiyo msingi).

### OPTIONS

**A. Kusubiri parity**
- Usijenge kitu mpaka iOS inaweza. **Inaua kipengele** kwa kusubiri kitu ambacho hakiwezi kufika.

**B. Android-first kamili; iOS inapata kile inachoweza** *(pendekezo langu)*
- Android: Wi-Fi Direct + BLE + Local Wi-Fi + hotspot hosting.
- iOS: BLE + Local Wi-Fi (client) + AWDL (iOS↔iOS) + kujiunga hotspot ya Android.
- UI inaonyesha **kile kinachopatikana**, si kile kinachokosekana.

**C. Web/PWA pekee**
- Hakuna local transport. Inaondoa utofautisho wa bidhaa.

**D. Capability negotiation kati ya vifaa** *(lazima pamoja na B)*
- Vifaa vinabadilishana **uwezo** wakati wa kuunganishwa; kisha kuchagua **transport inayofaa** (intersection).
- Hii ndiyo inayofanya application **isijue** transport (ADW-10 + §42/§43).

### TRADE-OFFS
- B+D inatoa **thamani kubwa kwa Android** (soko kubwa) **bila** kuahidi kitu kisichowezekana iOS.
- Hatari: **mgawanyiko wa uzoefu** unaweza kuchanganya watumiaji ("kwa nini rafiki yangu anaona vipengele Zaidi?"). Suluhisho: lugha safi + capability-driven UI.
- A inachelewesha bila faida. C inaua bidhaa.

### SECURITY IMPACT
- **Trust ya peer ni kwa funguo, si kwa proximity.** Kukutana si uthibitisho ("anyone near me can talk to me" ni kosa). Kila peer ina **signature key**; vifaa vinathibitisha kwa QR/devicelinking au kwa trust ya awali.
- **MITM kwenye local:** Wi-Fi Direct/BLE zinaweza kuwa na "evil twin" AP. E2EE (ADW-06) ndiyo ulinzi; transport **haina** kuaminika.
- **Rogue AP / hotspot ya mtu mwingine:** relay ya local inaweza kunasa metadata. Hivyo: **metadata ya local iwe ndogo**; hakuna content isiyosimbwa inayotumwa local.
- **Background limits ni pia usalama** (iOS).
- **Chunk verification** (`content_hash`) ni lazima — kifaa cha uongo kinaweza kutuma chunks mbovu.

### PRIVACY IMPACT
- **Scanning kunafichua uwepo.** MTU anaweza kujua yupo karibu na kifaa chako (au watu fulani). Hivyo:
  - Scanning ina **fremu ya wazi** (kifaa si "discoverable" bila ridhaa).
  - **Encounters hazihifadhiwi** kama uhusiano (ADW-01).
  - iOS 13+ inaonyesha taarifa ya Bluetooth — tutakuwa wazi kwamba tunatumia Bluetooth.
- **Hotspot mode** inaonyesha SSID (inaweza kuwa na jina la mtu). Hivyo: SSID ya jumla ("PASIHAI") na sio jina la mtumiaji.
- **Uwezo tofauti kwa platform** haupaswi kufichua maelezo ya kifaa kwa wengine (kwa mfano "huyu ana iPhone").

### UX IMPACT
- **Capability-driven UI:** vitufe vinavyoonekana tu pale vinapofanya kazi. **Hakuna** vitufe vya kuvunjika.
- Maneno ya wazi wakati wa kutafuta vifaa: **"Kutafuta vifaa vilivyo karibu..."** + uwezekano wa kukatiza.
- **Onboarding ya ruhusa:** eleza **kwa nini** tunahitaji Bluetooth ("ili kupeana ujumbe bila mtandao"), si "ruhusa ya Bluetooth".
- Ujumbe wa uwezo: *"Kwenye kifaa hiki, kupeana karibu kunapatikana kwa ujumbe mdogo na Wi-Fi ya karibu."* (Ukweli, bila kuahidi.)
- **Prototype (web) haipati** transport — ni sawa; UI inaonyesha hali ya "hii itapatikana kwenye app".

### IMPLEMENTATION IMPACT
- **Transport Abstraction** (`TransportService.send()`) — application haijui transport (§42/§43).
- Implementations: `InternetTransport` · `LocalWiFiTransport` · `BluetoothTransport` · `WiFiDirectTransport` (Android pekee) · `MultipeerTransport` (iOS↔iOS).
- **Capability negotiation handshake** ni lazima kabla ya transfer.
- **Chunk protocol** yenye resume, checksum, na schedule (ADW-03, ADW-08).
- **Native shell:** React + Vite inabaki kama UI; shell (Capacitor/RN) inatoa transport. **Hii inaathiri kuanzia Phase M, si sasa.**
- **Battery/thermal:** kikomo cha transfer (mf. charging au >30% betri kwa transfer kubwa).

### PROVISIONAL RECOMMENDATION
**Option B + D:**
1. **Android-first** kwa transport (Wi-Fi Direct + BLE + Local Wi-Fi + hotspot hosting).
2. **iOS** inapata: BLE (metadata/ujumbe mdogo), Local Wi-Fi (client), AWDL (iOS↔iOS), kujiunga hotspot ya Android.
3. **Capability negotiation** kati ya vifaa (intersection).
4. **Capability-driven UI** — onyesha kinachopatikana, usificha kwa udanganyifu.
5. **Trust kwa funguo, si kwa proximity.**
6. **Transport ni Phase M–N** — baada ya sync (ADW-04) na data layer.

### OPEN QUESTIONS
1. **Native shell:** Capacitor au React Native? (Capacitor inaokoa code ya React iliyopo; RN inabadilisha UI layer. Nashauri **Capacitor**.)
2. Kifaa cha kwanza cha **pilot** ni Android pekee? (Nashauri ndiyo — rahisi kupima na kuthibitisha.)
3. **Local Wi-Fi AP** (shule/duka/kanisa lenye router) ni hali ya kwanza ya kushughulikia? (Nashauri ndiyo — ni rahisi na inahitaji teknolojia ndogo zaidi.)
4. Transport inaruhusiwa kufanya kazi **background**? (iOS: hapana kwa muda mrefu. Tunakubali "foreground-only" kwa transfers kubwa?)
5. **Cross-platform local transfer** ni ahadi ya v1, au "best-effort kwa Wi-Fi"? (Nashauri: "best-effort kwa Wi-Fi/hotspot" — na kusema wazi.)
6. Ruhusa za Bluetooth: maelezo (copy) yako tayari? (Nashauri: maelezo ya lazima ya KISWAHILI na KINGEREZA kwa ajili ya app store.)

```
HALI: ⏳ INASUBIRI UAMUZI WA OWNER        →  [ ] Imekubaliwa  [ ] Rekebisha  [ ] Kataa
```

---

# ADW-I — MPAKA WA INFRASTRUCTURE (FIREBASE + CLOUDINARY)

### FACT
1. Owner amethibitisha: Firebase project `pasihai` / `pasihai-c352e` ipo; Cloudinary environment `noropw5y` ipo (Free, dynamic folders).
2. **Hakuna** app iliyosajiliwa, hakuna Auth/Firestore/Storage/Functions setup, hakuna integration.
3. Owner ameeleza wazi: Firebase na Cloudinary ni **infrastructure providers/adapters**, si PASIHAI.
4. Owner: *"Usifunge domain logic moja kwa moja kwenye Firebase APIs bila architecture decision."*
5. Cloudinary: **API Secret haijatolewa na haitatolewa kwa frontend** — hii ni sahihi (secret ndani ya frontend = secret iliyovuja).

### ASSUMPTION
- Firebase itatumika kama: Auth · Firestore (remote store) · Storage · FCM · Functions (kwa signature generation na server-side logic nyepesi).
- Cloudinary itatumika kama: media **transformation + delivery** (CDN), na **upload** (signed).
- **Domain logic haitakuwa** ndani ya Firebase Functions kwa kila kitu — lakini Functions ni mahali panapofaa kwa **signature ya upload** na **khakiki nyepesi**.
- Owner hahitaji kutumia kila service ya Firebase.

### OPTIONS

**A. Firebase kama mfumo kamili** (Auth + Firestore + Storage + Functions + rules zote)
- Haraka. Inafunga domain (kinyume na #4 hapo juu) na inavunja ADW-04 (offline).

**B. Adapters nyuma ya interfaces** *(pendekezo langu)*

```
PASIHAI Application
        ↓
Application / Domain Services        (haijui Firebase)
        ↓
Repository / Data Layer              (interfaces: RemoteStore, MediaStore, AuthProvider, Notifier)
        ↓
Infrastructure Adapters
        ├── FirebaseAuthAdapter     (Auth)
        ├── FirestoreAdapter        (RemoteStore; persistence OFF)
        ├── FirebaseStorageAdapter  (backup/aux; SIO media ya E2EE bila encryption)
        ├── CloudinaryAdapter       (MediaStore: upload + transform + delivery)
        ├── FcmAdapter              (Notifier)
        └── FutureAdapter           (mtoa mwingine)
```

**C. Mix: Firebase kwa x, mtoa mwingine kwa y** (mf. Auth ya Firebase, media ya Cloudinary, messaging yetu) — **ndiyo B kwa vitendo**.

### TRADE-OFFS
| Jambo | A | B |
|---|---|---|
| Muda wa kuanza | Haraka | Kati |
| Kubadilisha provider | Kugumu | Rahisi |
| Offline-first | ❌ inavunja | ✅ inaruhusu |
| Faragha (E2EE media) | Hatari (Storage inaona) | ✅ inaruhusu client-side encryption |
| Cost control | Ngumu | Rahisi (adapter inaweza kupima) |

### SECURITY IMPACT
- **Cloudinary uploads:** **signed uploads pekee.** Signature inatolewa na **server** (Firebase Function au huduma yetu) inayothibitisha mtumiaji, kikomo cha ukubwa, aina ya faili, na folder. **Unsigned upload preset ni hatari** (mtu yeyote anaweza kupanda bila kikomo → gharama + abuse). **Frontend haina secret.**
- **Delivery:** content ya faragha isitumie URL ya umma isiyo na ulinzi. Tunahitaji **signed/authenticated delivery** kwa media isiyo public (au bora: media ya faragha **isimami kabisa** — E2EE).
- **Filename/folder leakage:** dynamic folders zisitumie majina ya watumiaji au IDs zinazoweza kuhusishwa. Matumizi: `env/pasihai/{yyyy}/{mm}/{opaque_id}`.
- **Firebase Security Rules:** safu ya pili (si ya kwanza); zinaandikwa pamoja na domain rules ili zisikinzane.
- **API keys za Firebase** (web config) si secrets — zinaonekana, ndio maana **Security Rules + App Check** ni muhimu. **App Check** inapendekezwa mara moja integration iidhinishwe.
- **Functions:** signature endpoint inahitaji **rate limiting** na uthibitisho wa mtumiaji.

### PRIVACY IMPACT
- **Cloudinary inaona media.** Hivyo:
  - Media ya **public** → Cloudinary ✅ (transform + CDN, faida kubwa kwa data efficiency §44).
  - Media ya **E2EE/private** → **imesimbwa upande wa kifaa kabla ya kupanda** (client-side encryption). Bila hivyo, tunaahidi faragha ambayo haipo. **Hii ni sheria, si hiari.**
  - Media ya **friends** → uamuzi: E2EE + Cloudinary (ciphertext) au local-only (kutokupanda kabisa). Nashauri **ciphertext** ili friends wapate media bila mtandao wa haraka.
- **Metadata ya Cloudinary** (EXIF, mahali) — **iondolewe** kwa default kabla ya kupanda.
- **Minimum Knowledge:** hatutumii Cloudinary analytics kwa profiling.

### UX IMPACT
- **Mtumiaji hatakiwi kujua** kwamba Firebase au Cloudinary zipo. Hakuna jina la provider linaloonekana kwenye UI — kamwe.
- **Kupakia media:** maendeleo yanaonekana kwa lugha ya mtumiaji (*"Inapakia… 60%"*), si maneno ya kiufundi. Upload inaendelea nyuma na inaonekana kwenye `distribution_state` ya content (ADW-01) — content ipo local na inasubiri.
- **Media ya haraka:** thumbnail/preview inaonekana **papo hapo** (inazalishwa kwenye kifaa) — mtumiaji haoni "blank" wakati media kamili inapanda. Hii ni faida ya moja kwa moja ya §44.
- **Kosa la upload halizuii content:** content inabaki local (`waiting_sync`) na inachapishwa baadaye. **Hakuna** kupoteza kazi kwa sababu ya mtandao.
- **Faragha inaonekana:** kwa media ya faragha, mtumiaji anaona *"Imesimbwa kabla ya kupanda"* — ahadi inayoonekana, si ya siri. Ni sehemu ya kujenga imani (§24).
- **Auth:** ikiwa tutatumia simu/OTP, kuingia ni rahisi kwa mtumiaji wa Tanzania (namba ya simu ni kitambulisho halisi). Lakini inahitaji ujumbe wa wazi kuhusu SMS + uwezekano wa OTP kushindwa (mtandao) — na njia mbadala.

### IMPLEMENTATION IMPACT
- Interfaces: `MediaStore { upload(signed), transform(...), deliveryUrl(...) }`; `RemoteStore { push, pull, subscribe }`; `AuthProvider { signIn, signOut, currentUser, token }`; `Notifier { send, token }`.
- **Media pipeline:** local capture → **optimize/thumbnail (local)** → **EXIF strip** → **client-side encrypt (kama si public)** → signed upload → Cloudinary → metadata reference (hash, size, variants) kwenye content item.
- **Media optimization inaunga mkono §44:** thumbnail na low-res variants zinapatikana mapema; full media baadaye (chunks).
- **Firebase Storage:** nashauri **isitumike kama media store ya msingi** (Cloudinary inashughulikia transformation); itumike kwa backups/aux ikiwa inahitajika — au isitumike kabisa mwanzoni.
- **Functions:** signature ya upload · webhooks nyepesi · **moderation pipeline** (baadaye). **Domain logic kubwa haipaswi kuwa kwenye Functions.**

### PROVISIONAL RECOMMENDATION
**Option B (adapters).** Sheria saba:
1. Domain haijui Firebase/Cloudinary **kabisa** — ina interfaces pekee.
2. **Firestore offline persistence = imezimwa** (ADW-04).
3. **Cloudinary signed uploads pekee**; signature inatolewa na server; frontend haina secret.
4. Media ya **E2EE inasimamiwa ikiwa imesimbwa** (client-side) — kama haitasimbwa, **haipandi**.
5. **EXIF/metadata** inaondolewa kwa default.
6. **App Check** inawashwa mara moja integration iidhinishwe.
7. Media ya public ina **variants** (thumbnail/preview/low-res) kwa data efficiency (§44).

### OPEN QUESTIONS
1. **Firebase App iliyosajiliwa:** ni ipi (Web pekee mwanzoni, au Web + Android mara moja)? (Inaathiri Auth config — nashauri **Web mwanzoni**, Android Phase M.)
2. **Auth method:** simu/OTP ni muhimu kwa soko la Tanzania (namba ya simu ni kitambulisho halisi). Au email? Au zote? (OTP ya Firebase ina cost — tunakadiria?)
3. **Cloudinary plan (Free):** transformation credits zina kikomo; tunakadiria matumizi? (Inaathiri kama tunatumia transformations za Cloudinary au za kifaa.)
4. **Firebase Functions region:** ni ipi (kwa ucheleweshaji wa Afrika Mashariki)? Nashauri **europe-west** au **africa-south1** (kama inapatikana).
5. Kuna mpango wa **kuhamisha** kutoka Firebase baadaye (kwa sababu gani)? Usanifu wa adapter ni wa kutosha?
6. **Storage ya media:** tunahitaji **retention policy** (media ngapi tunahifadhi, kwa muda gani) — inaathiri gharama na faragha.

```
HALI: ⏳ INASUBIRI UAMUZI WA OWNER        →  [ ] Imekubaliwa  [ ] Rekebisha  [ ] Kataa
```

---

# SEHEMU YA 4 — DECISION REGISTER (kwa idhini ya owner)

| # | Uamuzi | Msimamo (provisional) | Uzito | Hali |
|---|---|---|---|---|
| 01 | LOCAL_ONLY vs Visibility | Mihimili mitatu (audience · area · distribution) | ⛔ Blocker | ⏳ |
| 02 | Identity/Entity/Relationship/Role/Permission | Actor model + viewer edges + deny-by-default | ⛔ Blocker | ⏳ |
| 03 | Deletion + Store-and-forward | Class-based + tombstone + TTL + envelope | ⛔ Blocker | ⏳ |
| 04 | Sync Authority | Sync Engine yetu; Firestore persistence OFF | ⛔ Blocker | ⏳ |
| 05 | Offline Posting + Moderation | Local-now, global-later, review-gated | ⛔ Blocker | ⏳ |
| 06 | E2EE + Multi-device | E2EE ya lazima + QR linking + recovery key | ⛔ Blocker | ⏳ |
| 07 | Cache vs Saved | Dhana tatu: Saved · Offline · Cached | Ndogo | ⏳ |
| 08 | Authorized Relay | v1 cache public (opt-in) → v2 limited → v3 economy | Baadaye | ⏳ |
| 09 | Logical Clock | HLC + server_seq | ⛔ Blocker | ⏳ |
| 10 | Android vs iOS Transport | Capability negotiation + Android-first | Baadaye (Phase M) | ⏳ |
| I | Infrastructure Boundary | Adapters; signed uploads; E2EE media encrypted | ⛔ Blocker | ⏳ |

### Vizuizi (blockers) — kile kisichoweza kuanza bila maamuzi

| Kazi | Inahitaji |
|---|---|
| Data layer / schema | 01, 02, 03, 09 |
| Sync engine | 04, 09 |
| Offline posting | 05, 03 |
| Soga (E2EE) | 06, 04 |
| Media pipeline | I, 06 |
| Transport | 10, 03, 08 |
| Firebase integration yoyote | 04, I |
| Cloudinary integration yoyote | I, 06 |

### Kile kinachoweza kuanza **bila** maamuzi (nyongeza ya UI pekee)
Kwa heshima ya §59 (usiharibu kazi iliyopo) — **Hatua 2** (mkondo wa Home wa UI, bila layer ya data ya kweli)
**inaweza** kuendelea kwa mock data **bila** kubadilisha maamuzi haya. Lakini **haiwezi** kuingia
domain/schema mpaka ADW-01/02/03 ziidhinishwe.

---

# SEHEMU YA 5 — TAMKO LA UZINGATIAJI

Nakubali na nimezingatia kabisa maagizo ya hatua hii:

| Agizo | Hali |
|---|---|
| Usifanye coding | ✅ Hakuna mstari wa code ulioandikwa |
| Usibadilishe source files | ✅ Source haijaguswa |
| Usiongeze/kufuta modules | ✅ Hakuna |
| Usianze Firebase integration | ✅ Hakuna |
| Usianze Cloudinary integration | ✅ Hakuna |
| Usiongeze Firebase SDK | ✅ Hakuna |
| Usisajili Web App | ✅ Hakuna |
| Usifungue Firestore/Storage/Auth | ✅ Hakuna |
| Usitengeneze Functions | ✅ Hakuna |
| Usitengeneze upload service / media repository | ✅ Hakuna |
| Usitengeneze env files kwa production secrets | ✅ Hakuna |
| Usitengeneze database schema | ✅ Hakuna (majedwali tajwa hapa ni **mapendekezo ya model**, si schema iliyojengwa) |
| Usiombe au kutengeneza secrets | ✅ **Sitaomba na sitatengeneza** — hata moja |
| Prototype ibaki kama ilivyo | ✅ Ilivyo |

---

# SEHEMU YA 6 — HITIMISHO NA KUSIMAMA

Nimemaliza **Architecture Decision Workshop** kwa maamuzi **10 + 1 (infrastructure boundary)**.

**Kile ninachohitaji kutoka kwako:**
1. Uamuzi kwa kila ADW: **Imekubaliwa / Rekebisha / Kataa** (na kwa "Rekebisha" — mwelekeo unaotaka).
2. Jibu la maswali ya ⛔ kwanza (haswa **01, 02, 03, 04, 09** — hizi zinafunga njia).
3. Ufafanuzi: **maamuzi yaliyokataliwa** yanapaswa kupelekwa kwenye ADR ipi mbadala.

**Kama owner anakubali mapendekezo yote:** hatua inayofuata ni **Hatua 1 ya Migration Plan** (seams: repository/service
layer **bila** mabadiliko ya UI) — lakini hiyo **haitaanza** mpaka upe idhini ya wazi.

> **SIMAMA.** Nasubiri idhini ya owner. Sitafanya coding, sitagusa integration, na sitabadilisha prototype.
