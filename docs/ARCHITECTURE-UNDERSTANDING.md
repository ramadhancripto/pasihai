# PASIHAI — ARCHITECTURE UNDERSTANDING REPORT

**Aina ya hati:** Ripoti ya uelewa wa mfumo (kabla ya production implementation)
**Hali ya prototype:** Hatua 0 + 1 zimekamilika (React 19 + Vite, design system + app shell)
**Kilichofanyika katika hatua hii:** ⚠️ **Hakuna code iliyoandikwa, hakuna faili iliyobadilishwa, hakuna module iliyoongezwa.** Hati hii pekee ni matokeo.
**Tarehe:** 2026-10-07

---

## 0. MUHTASARI — Vituo sita muhimu zaidi

1. **Prototype iliyopo inafuata mipaka ya kimuundo (boundaries) kwa uaminifu** — destinations tano, tabs tano za Home, hakuna "For You", Channels si chat, Hubs si chat. Msingi huu hauharibiki.
2. **Pengo kubwa zaidi la usanifu (architectural gap) si UI — ni model ya uhusiano na ruhusa.** Kwa sasa prototype ina `user.type` moja ambayo inachanganya *entity type*, *role*, na *relationship*. System definition inatenganisha: **Identity ≠ Relationship ≠ Visibility ≠ Permission**. Hili ndilo la kwanza kulipanga.
3. **Hakuna tabaka la kati (service/repository) kabisa.** Faili **7** za UI zinasoma `data/mock.js` moja kwa moja. Kila kitu kipya (sync, permissions, offline) kitavunjika hapa kwanza kama hatutaweka seam sasa.
4. **Offline-first haina sehemu yoyote ya kiufundi bado:** hakuna persistence, hakuna queue, hakuna network state, hakuna transport abstraction. Hii ni sahihi kwa prototype, lakini inamaanisha: *hatuna deni la kurekebisha — tuna nafasi ya kuweka mfumo sahihi mara moja.*
5. **Kuna mgongano mmoja wa kimsingi wa kimuundo (architectural conflict) ambao haujaonekana kwenye document:** cooperative store-and-forward inagongana na **haki ya kufuta data** (deletion). Content iliyosafirishwa kwenda vifaa vingine haiwezi "kufutwa" kwa uhakika. Hii inahitaji uamuzi wa sera kabla ya Phase P.
6. **Firebase ina hatari moja ya wazi:** Firestore ina offline persistence yake yenyewe. Kuiwasha bila uamuzi ni **mfumo mbadala (duplicate system)** — inakiuka kanuni #60. Uamuzi unahitajika kabla ya kuingia Firebase.

---

## A. PASIHAI NI MFUMO GANI

### Uelewa wangu

PASIHAI ni **jukwaa la kijamii lenye mawasiliano kwanza** (communication-first), linaloendesha katika mazingira mbalimbali ya muunganisho. Si "social media app" yenye offline mode iliyoongezwa baadaye — **offline/local-first ni sehemu ya kielelezo cha msingi, si nyongeza.**

Mfumo unaunganisha tabaka sita (layers) ambazo kila moja ina mpaka wake:

| Tabaka | Kazi | Eneo la UI | Kitenzi |
|---|---|---|---|
| Communication | Mawasiliano binafsi na vikundi | **Soga** | Communicate |
| Relationships | Uhusiano wa aina nyingi | (unaenea kila mahali) | — |
| Social content | Kuchapisha na kutumia content | **Home** | Consume |
| Discovery | Kupata yasiyojulikana | **Gundua** | Discover |
| Participation | Hubs, Communities, Groups, Private Spaces, Channels | **Spaces** | Participate |
| Operations | Biashara | **Business** | Operate |

Na kwa kuongeza — **Transport Layer** na **Cooperative Network** ziko *chini ya* mfumo mzima, si tabaka la saba la UI.

### Kanuni tano za msingi (nimezielewa hivi)

| Kanuni | Maana ya kiutendaji kwangu |
|---|---|
| *Communication first. Social growth follows.* | Mtumiaji wa marafiki 15 / followers 0 ni raia wa daraja la kwanza, si "empty state". |
| *One network, many communities, different boundaries.* | Uhusiano mmoja hauchanganywi na mwingine; ruhusa ni za eneo (scope) si za mtu kwa ujumla. |
| *Internet is one transport, not the whole network.* | Hakuna mahali kwenye UI (au code) panapoweza kudhani Internet ipo. |
| *Minimum Knowledge Architecture.* | Backend inajua kinachotosha kuendesha huduma, si maisha ya mtumiaji. |
| *Offline haimaanishi bila functionality.* | Kila feature inauliza: local? cached? queue? sync baadaye? server lazima? |

### Ulinganisho na prototype

✅ **Inafuata:** Mipaka ya destinations tano imeandikwa wazi kwenye code (`src/components/BottomNav.jsx` — kila item ina `purpose`: Kutazama / Mawasiliano / Kugundua / Kushiriki / Kuendesha). Kurasa za placeholder zinaeleza mpaka wake kwa mfano halisi.

⚠️ **Haijawakilishwa:** Tabaka "Relationships" halipo kama kitu cha kujitegemea — imeunganishwa ndani ya entities (tazama sehemu J).

---

## B. HYBRID INTERNET + OFFLINE MODEL

### Uelewa wangu

Nimeelewa States A–D kama **hali za uwezo (capability states)**, si "online/offline" binary:

| State | Uwezo | Kile kinachopaswa kufanya kazi |
|---|---|---|
| **A** Internet + Local | Uwezo kamili | Kila kitu, pamoja na usaidizi wa cooperative |
| **B** Internet only | Uwezo wa kawaida | Achieve parity na app ya kawaida ya kijamii |
| **C** Local only | Uwezo wa eneo | Cached content, local messages, LOCAL_ONLY posts, local sharing ya authorized |
| **D** Hakuna | Uwezo wa kifaa | Cached reading, drafting, queueing, settings |

Muhimu: **State A haipaswi kuharibiwa na local layer.** Mtumiaji aliye online hana sababu ya kuona "local-first machinery" — anapata uzoefu safi. Local layer inaonekana pale inaposaidia (kuokoa data, kufanya kazi bila mtandao).

### Mapungufu ya lazima kwenye UI (kuepuka "broken app" feeling)

- State haionyeshwi kwa kelele; inaonekana kwa **hila** na kwa **maana**: "Ujumbe wako umehifadhiwa, utasafiri mtandao ukipatikana" ni bora kuliko "No Internet".
- Kanuni ya #46: kufeli kwa mtandao ni **graceful**, si error.

### Ulinganisho na prototype

⚠️ **Haijawakilishwa kabisa.** Haipo state ya network, haipo UI ya "waiting sync", haipo persistence. Hii ni **sahihi kwa sasa** (prototype ni UI pekee), lakini ni eneo ambalo hatuna deni — tunaanza safi.

**Ushauri wa usanifu:** State ya network iwe **application service** (`NetworkStateService`), isiwe `navigator.onLine` iliyotawanyika kwenye components. `navigator.onLine` haitoshi kamwe (inaweza kusema "online" wakati server haipatikani) — hivyo `LIMITED` na `WAITING_SYNC` ni lazima ziwe za mfumo wetu, si za browser.

---

## C. LOCAL-FIRST DATA MODEL

### Uelewa wangu

Msingi: **Local state kwanza → Sync inapowezekana.** Lakini si kila kitu kinaruhusiwa kuwa global.

Nichukue mzunguko wa content kama **mashine ya hali (state machine)** — na ninaona document ina states mbili zinazohitaji kutenganishwa kwa makini:

```
DRAFT ──> LOCAL_ONLY ──> WAITING_SYNC ──> SYNCING ──> SYNCED
             │                              │
             │                              └──> PENDING_REVIEW ──> APPROVED / RESTRICTED / REJECTED
             │
             └──> LOCAL_SHARED (imesambazwa kwa vifaa vya karibu, kwa ruhusa)
```

**Jambo muhimu nililoliona:** kuna mambo mawili tofauti yanayoitwa "local" kwenye document, na **yasichanganywe**:

1. **LOCAL_ONLY kama hali ya usambazaji (distribution state)** — content ipo kwenye kifaa, haijafika global.
2. **Eneo (area/location) kama kipimo cha umuhimu (relevance)** — §30 inasema wazi: *"Location determines relevance, not exposure."*

Hizi ni tofauti. Content ya LOCAL_ONLY **si** "content ya mtaa" — ni content **ambayo haijasafiri**. Na content ya mtaa inaweza kuwa **public global** (mfano hub ya Dar inaonekana duniani). Ombi langu la ufafanuzi lipo kwenye sehemu P (Q1).

### Schema ya local (mapendekezo ya model, si code)

**Tables za msingi (local DB):**

| Kundi | Jedwali | Maelezo |
|---|---|---|
| Identity | `entities` | Persons **na** publishers (channel/hub/community/group/business/space) — `entity_id`, `entity_type`, `authority` |
| | `me` | Utambulisho wa kifaa hiki (si lazima = entity moja) |
| Relationships | `edges` | `from`, `to`, `edge_type`, `scope`, `state`, `since` |
| Content | `content_items` | author, publisher (entity), scope, permissions, area, states, times |
| | `media_objects` | `content_hash`, `size`, `mime`, `chunk_manifest`, `availability` |
| | `reactions`, `comments` | set semantics (commutative) |
| Social | `statuses`, `stories` | TTL-driven |
| Comms | `conversations`, `messages` | append-only, E2EE plan tofauti |
| Live | `live_sessions` | state, mode, transport |
| | `notifications` | event-derived |
| Infra | `sync_queue` | operations |
| | `cache_entries` | **TOFAUTI NA** `saved_items` |
| | `saved_items` | uamuzi wa mtumiaji — haifutwi kiotomatiki |
| Config | `settings`, `consent` | pamoja na relay/cooperative consent |

**Sheria tatu za schema:**

1. **`cache_entries` na `saved_items` ni jedwali tofauti kabisa.** Document inasema hivi wazi (§11, §22) na hii inazuia UI kudanganya mtumiaji. Hii ni sheria ya schema, si ya UI.
2. **Kila kitu kinachosafiri kina `content_hash` + provenance envelope** (nani, lini, ruhusa gani) — hii ni lazima kwa verification ya kifaa bila server (§23).
3. **Muda huhifadhiwa kama timestamp** (epoch + logical clock), **kutafsiriwa** kwa "dakika 12" kwenye UI.

### Ulinganisho na prototype — matokeo ya uchunguzi

| Kilichopimwa | Matokeo | Athari |
|---|---|---|
| Persistence | **hakuna** (`localStorage`/`IndexedDB`/Cache API hazitumiki) | Safi kuanza; lakini hakuna kitu kinachobaki kwenye reload |
| Layer ya data | **7 faili za UI** zinasoma `data/mock.js` moja kwa moja | ⚠️ Kuna seam ya kujenga |
| Muda | `time: 'dakika 12'` — **maandishi ya lugha kwenye domain data** | ⚠️ Haiwezi kupangwa (sort), haitafsiriki |
| Counters | `reactions: 24`, `comments: 5` — namba tuli | ⚠️ Hakuna mamlaka (authority) wala conflict rule |
| IDs | fupi (`p1`, `amina`) | Inafaa mock; production inahitaji ID za ulimwengu + entity URI kwa deep-linking |
| Entity vs relationship | `user.type: 'friend' \| 'channel' \| 'hub' \| 'business' \| 'creator' \| 'you'` | ⚠️ **Kuchanganya aina nne za dhana** (tazama J) |
| Visibility / Permission | **hazipo** (grep haikupata kitu) | ⚠️ Dhanio kubwa la baadaye |
| Location / Area | **haipo** | Haijawakilishwa (sahihi — lakini "relevant local content" ya Mchanganyiko inategemea hii) |
| Trust/verification | `verified: true` (boolean) | ⚠️ Inahitaji kubadilika kuwa model ya provenance/trust token |

**Hitimisho la sehemu C:** prototype ni safi lakini `mock.js` imekuwa *de facto* domain model. Hatari: kama tutaongeza vipengele juu ya schema hii, kila kipengele kipya kitalazimika kuvunja mambo. **Ushauri: weka seam ya repository kabla ya kipengele kingine chochote kikubwa.**

---

## D. SYNC ARCHITECTURE

### Uelewa wangu

Sync **si** "reload page". Ni **application service** yenye mzunguko kamili:

```
Local Action → Operation Queue → Validation → Connectivity Check
   → Sync → Server → Acknowledgement → Local State Update
```

**Operation record inahitaji:** `operation_id`, `entity_id`, `operation_type`, `created_at`, `priority`, `retry_count`, `payload_reference`, `sync_state`.

**Moja ninaongeza (kwa sababu offline inahitaji):** kila operation ihitaji **logical clock** (mfano Hybrid Logical Clock). Bila hiyo, hatutaweza kujua mpangilio sahihi wa matukio yaliyotokea wakati hakuna mtandao — na hilo linaathiri kila domain. Hii ni **ya lazima sasa**, kwa sababu kuiongeza baadaye kunagusa kila jedwali.

### Conflict rules — **kwa domain, si moja kwa wote**

Document inasema wazi: usitumie rule moja kwa kila kitu. Pendekezo langu:

| Domain | Kitu kinachogongana | Rule inayofaa | Sababu |
|---|---|---|---|
| Messages | mpangilio | **Server-assigned monotonic order** + append-only | Mazungumzo yanahitaji mpangilio mmoja unaokubalika |
| Posts/text | hariri | **Version + LWW yenye server authority** | Maandishi yana mwisho mmoja wa ukweli |
| Reactions/likes | set | **Commutative set semantics** (add/remove) | Haiwezi kugongana kihalisi |
| Counters | namba | **Server authority** (au CRDT counter) | Kifaa hakiwezi kujua total ya kweli |
| Relationships (edges) | state | **State machine** (request → accepted, etc.) | Si "text" — ni mabadiliko ya hali |
| Settings | thamani | **LWW kwa kifaa** (`updated_at` + device priority) | Mazingira ya kifaa yanaweza kutofautiana |
| Drafts | hariri | **Local authority** (haisafiri mpaka mtumiaji aamue) | Ni mali ya mtumiaji |
| Content moderation state | state | **Server authority pekee** — kifaa hakiwezi kubadilisha | Usalama |
| Wallet/Hai Points | namba | **Server authority pekee, ledger** | Fedha haziwezi kuwa local-authoritative |

### Publish Gate (lango la kuchapisha)

```
Local Action
     ↓
Local Validation (schema, media, size)
     ↓
Local Safety check (class ya content)
     ↓
   Internet?
   /      \
 NO       YES
 ↓         ↓
QUEUE   Server Review
 ↓         ↓
LOCAL      Approved?
SHARING    /      \
(local)  YES       NO
          ↓         ↓
       GLOBAL    REJECTED
```

### Ulinganisho na prototype

⚠️ Haipo. Ni muhimu kutambua: **hakuna kitu kinachohitaji "kuvunjwa" ili kujenga sync — kuna nafasi tupu.** Lakini mpangilio ni muhimu: **Sync Engine ijengwe KABLA ya cooperative layer**, kwa sababu cooperative layer ni transport ya queue hiyo hiyo.

---

## E. TRANSPORT ARCHITECTURE

### Uelewa wangu

Application **haijui** transport. Ni:

```
Application → TransportService.send() → (engine inachagua) → Internet | WiFiDirect | Bluetooth | LocalWiFi
```

Kwa hivyo `sendViaBluetooth()` haipo kwenye code ya feature hata mara moja.

**Transport engine inaamua kwa:** availability, permissions, cost, battery, size, priority, security, reliability.

### Ukweli wa kiufundi (feasibility) — ninaongeza hii kwa uwazi

Document haitaji vikwazo vya platforms, lakini vinatawala phase N. Hivi ni vya lazima kujadili kabla ya kuahidi vipengele:

| Transport | Android | iOS | Vikwazo vya lazima |
|---|---|---|---|
| Wi-Fi Direct | ✅ inapatikana | ❌ haipo kama API ya moja kwa moja | Android-only kwa P2P halisi |
| Bluetooth (BLE) | ✅ | ✅ (vikwazo) | Uwezo mdogo wa bytes; BLE si kwa media |
| Local Wi-Fi (AP moja) | ✅ | ✅ | Inahitaji AP moja au hotspot |
| Internet | ✅ | ✅ | Cost + availability |
| Future mesh | — | — | Haja ya hardware/OS support |

**Athari:** "Local-first" itakuwa **tofauti kwa platform** mwanzoni. Hii si kuzuia — ni kupanga kwa uhalisia (na inaunga mkono Transport Abstraction: kama Android ina uwezo zaidi, UI haibadiliki).

**Pia:** scanning ya Bluetooth/Wi-Fi inahitaji ruhusa za wazi (na Android 12+ zina mahitaji maalum). **UI ya ridhaa (consent) ni lazima kabla ya transport, si baada.**

### Ulinganisho na prototype

⚠️ Haipo (na hakuna `fetch`/WebSocket hata moja — nimehakiki). Safi.

**Ushauri:** Hata kabla ya transport halisi, **interface ya `TransportService` iwe imeandikwa** ili UI/features zisijenge kile kinacholazimika kuvunjwa baadaye. Hii ni "seam", si "implementation".

---

## F. COOPERATIVE CACHE

### Uelewa wangu

Cache = **rasilimali ya mtandao**, si mali ya mtumiaji.

| | Cached | Saved |
|---|---|---|
| Nani aliamua | Mfumo | Mtumiaji |
| Muda | Temporary (TTL) | Mpaka mtumiaji afute |
| Inafutwa kiotomatiki? | ✅ inapohitajika nafasi | ❌ kamwe |
| Inaonekana kwenye UI | Kama "savings/storage" info, kwa hila | Kama "Zilizohifadhiwa" |

### Sheria ninazoongeza (kutokana na Minimum Knowledge + E2EE)

1. **Media ya mazungumzo ya faragha haicache-ki kwa manufaa ya wengine** kwa default. Haiwezi kuthibitishwa na kifaa kingine (§9), na kuihifadhi ni hatari ya faragha.
2. **Cache inaheshimiwa kwa content yenye provenance envelope inayoruhusu usambazaji** (§23 trust token) — vinginevyo cache inakuwa njia ya kusambaza content iliyozuiliwa.
3. **Cache haionyeshwi kama "Saved"** kwa njia yoyote. UI inaonyesha vitu hivi viwili mahali tofauti kabisa.

### Ulinganisho na prototype

✅ **Hakuna mkanganyiko kwa sasa** — "Zilizohifadhiwa" ipo kama Saved pekee (§10 ya menu ya Home), na **hakuna namba za uokoaji zinazoonyeshwa** (hii ni muhimu: kanuni #12 inakataza "fake savings" — prototype haidai kitu, na hivyo haivunji kanuni).

⚠️ Switch ya "Kuokoa data" ipo kwenye menyu ya Home (`dataSaver`) — ni hook nzuri, lakini **haiungwi na kipimo chochote bado.** Hii ni sahihi. Wakati kipimo kija, kisiwe cha kubuni.

---

## G. STORE-AND-FORWARD

### Uelewa wangu

Content inaweza kusafiri A → B → C → Internet. Hii ni **transport ya queue**, si feature ya UI.

### Kipengele muhimu ambacho document inaificha (na ambacho ni muhimu sana)

Store-and-forward haiwezi kufanya kazi kwa uaminifu bila **envelope ya usambazaji**. Kila kipande kinachosafiri kihitaji:

| Kipengele cha envelope | Kazi |
|---|---|
| `content_hash` | Kutambua na kuthibitisha (usiweze kubadilisha njiani) |
| `author_signature` (au provenance) | Kuthibitisha chanzo bila server |
| `distribution_scope` | Nani anaruhusiwa kuipitisha |
| `relay_policy` | Kusafirisha (relay) kunaruhusiwa? Kwa mtu gani? |
| `expiry` (TTL) | Content isiyo na mwisho ni hatari (hoarding + misinformation) |
| `size` + `chunk_manifest` | Kusimamia vipande (§10) |
| `policy_class` | Normal / sensitive / restricted / blocked (§22) |

**Kanuni ya TTL ni muhimu sana kwa usalama:** bila `expiry`, content iliyozuiliwa (au ya uongo) inaweza kuendelea kusafiri vifaa hadi vifaa kwa muda usio na kikomo, nje ya uwezo wa mfumo. Na bila `author_signature`, device B inaweza kuunda content "kama" ya device A.

### Ulinganisho na prototype

⚠️ Haipo. Lakini `mock.js` ina **mwanzo wa kile kinachohitajika**: `content_hash`-like identity (`id`), na `media` metadata. Mwelekeo ni sahihi — unahitaji tu kuwa wa lazima na umefungwa kwa signature.

---

## H. AUTHORIZED RELAY

### Uelewa wangu

**No silent relay** ni kanuni ngumu, si mapendekezo. Na ninaona inahitaji **tabaka tatu tofauti**:

| Tabaka | Kazi | Eneo |
|---|---|---|
| **Consent** | Mtumiaji amekubali kusaidia? | Settings + onboarding |
| **Policy** | Content gani inaweza kupitishwa? | Domain logic (content class) |
| **Economics** | Relay ya malipo / Hai Points | Economy service (tofauti kabisa) |

### Vitu vitatu vinavyohitaji uamuzi (ninaleta kwa uwazi)

1. **Relay hauwezi kuhukumu content.** Kifaa kinachopitisha **hakikuona** content (hasa kwa E2EE). Kwa hivyo relay policy **haiwezi** kuwa "kagua kisha pitisha" — inapaswa kuwa **class-based** (content class inaamua, si maudhui). Hii ina athari ya kisheria/uwajibikaji (tazama O).
2. **Relay lazima iwe reversible** — mtumiaji aweze kuzima papo hapo, na UI ionyeshe wazi anachopitisha.
3. **Relay ni tofauti kabisa na cache.** Cache ni "nakala ya muda kwa ufanisi"; relay ni "kutumia bundle/data ya mtu mwingine". UI isiwaunganishe.

### Ulinganisho na prototype

⚠️ Haipo. Na hii ni **sahihi kabisa** — ni phase ya baadaye (Q). Lakini *ridhaa* (consent) inapaswa kuwa **imeundwa** (design) mapema, kwa sababu ni sehemu ya settings architecture ambayo itagusa kila kitu.

---

## I. PRIVACY & SECURITY MODEL

### Uelewa wangu

**Minimum Knowledge Architecture:** backend inajua kinachotosha kuendesha, si maisha ya mtumiaji.

| Eneo | Kanuni | Kile ninachopendekeza kuhifadhiwa |
|---|---|---|
| Private comms | E2EE inapowezekana + encrypted media | Keys upande wa kifaa; server haioni content |
| Metadata | Minimum routing metadata | Nani↔nani lini ni metadata nyeti |
| Location | Tu kwa ridhaa ya wazi na kwa feature inayohitaji | Eneo la jumla, si exact |
| Behavioral | Hakuna profiling isiyo ya lazima | Hakuna "attention resource" model |
| Local transport | Encounters zisijenge social graph kwa default | Kukutana si "kufuata" |

### Vipengele vinne ninavyoongeza (vinatoka kwenye document lakini vinahitaji kuwa wazi)

1. **Proximity privacy:** mfumo ambao "device encounters" ni wa kawaida unaweza **kuvujisha mahali** (kama mahali panaonyesha kuwa mtu yupo karibu nawe). Lazima: encounters **zisirekodiwi** kama uhusiano, na zisiwe server-visible kwa default.
2. **Key management:** E2EE inahitaji uamuzi wa **multi-device** (kifaa kipya kinapata funguo vipi?) na **recovery** (nimepoteza simu — ninaweza kusoma historia?). Bila jibu, E2EE haitafanya kazi kwa watumiaji wa kawaida.
3. **Report/abuse ndani ya E2EE:** njia ya kuripoti inahitaji mfumo wa **kushiriki ujumbe maalum na mhakiki** kwa ridhaa ya mtumiaji. Hii ni sehemu ya Trust & Safety, si ya messaging.
4. **Hakuna claim ya "100% private"** — na ninaongeza: hakuna claim ya "end-to-end encrypted" popote kwenye UI mpaka iwe **kweli** kwa kila njia.

### Ulinganisho na prototype

✅ **Hakuna udanganyifu wowote** wa faragha kwenye UI iliyopo (hakuna madai ya usiri). Vizuri.
⚠️ `location` haipo kabisa — kwa hivyo hatuna deni, lakini "Nearby" (iliyotajwa kwenye Gundua) inahitaji uamuzi kabla ya kujengwa.

---

## J. SOCIAL ARCHITECTURE

### Uelewa wangu — na hili ndilo pengo kubwa zaidi

Document inasema (na nakubaliana kikamilifu):

> **One network, many communities, different boundaries.**
> Mtumiaji anaweza kuwa rafiki, follower, subscriber, member, participant, customer — **bila mahusiano hayo kuchanganywa.**

### Kupanga: Entity ≠ Role ≠ Relationship ≠ Visibility ≠ Permission

| Dhana | Swali | Mfano |
|---|---|---|
| **Entity** | Ni kitu gani? | Person: Amina · Channel: Tech Sasa · Hub: Dar Tech Hub · Business: Example Store |
| **Role** | Ana mamlaka gani **ndani ya entity**? | Admin wa Hub, Moderator wa Space, Owner wa Business |
| **Relationship** | Uhusiano **wangu na nani**? | Rafiki, Ninafuatilia, Mwanachama, Mteja |
| **Visibility** | **Nani anaweza kuona**? | Public, Followers, Members, Friends, Private |
| **Permission** | **Nani anaweza kufanya nini**? | comment, share, relay, download, quote |
| **Area** | **Inahusiana na wapi** (umuhimu)? | Dar es Salaam, Mbeya, Global |

### Ulinganisho na prototype — hii ni dhanio la hatari

Prototype ina:

```
user.type: 'friend' | 'channel' | 'hub' | 'business' | 'creator' | 'you'
```

**Shida:** hii ni kitu kimoja kinachochanganya vitu vinne:

| Thamani | Ni kweli ni... | Inapaswa kuwa |
|---|---|---|
| `friend` | **Relationship** (uhusiano wangu) | `edge_type: friend` kati ya mimi na person |
| `channel` / `hub` / `business` | **Entity type** (aina ya kitu) | `entity_type: channel/hub/business` |
| `creator` | **Role** (au aina ya publisher) | `role` au `publisher_type: creator` |
| `you` | **Self reference** | `me` (utambulisho wa kifaa) |

**Kwa nini hii ni muhimu sasa, si baadaye:** document inahitaji `Visibility ≠ Permission ≠ Relationship`. Kwa schema ya sasa, hakuna nafasi hata ya kuweka hizo dhana. Kila kipengele kipya (spaces, channels restricted content, business customers) kitalazimika kuipindua.

**Lakini pia:** prototype **inaonyesha kwa mafanikio** kwamba suluhisho la UI linaweza kufanya kazi — `Identity` component (`src/components/ui.jsx`) inaonyesha jina + **jina la uhusiano** (`Rafiki`, `Channel`, `Hub`, `Biashara`, `Mbunifu`) kwa uthabiti. Hivyo **hakuna kitu cha kuondoa kwenye UI** — kazi ni kuhamisha data nyuma ya dirisha, bila UI kubadilika (visual parity).

### Social graph (mapendekezo)

Edges pekee zinaweza kuwa za aina hizi (sscope-based):

```
person ──friend──> person           (two-way, state: requested/accepted)
person ──follow──> person|channel   (one-way)
person ──subscribe──> channel       (one-way, content-class scoped)
person ──member──> space|community|group   (with role + state)
person ──participant──> hub         (weaker than member)
person ──customer──> business       (with relationship history)
```

**Sheria:** edge ni ya **mtazamaji** (viewer-scoped). Content haisafiri na "relationship" ndani yake — inasafiri na **publisher + visibility + permissions**, na **kila kifaa kinatupa relationship ya mtazamaji** wakati wa kuonyesha. Hii ni tofauti muhimu kwa cache na sync.

---

## K. CONTENT ARCHITECTURE

### Uelewa wangu

Content item ni zaidi ya "text + image":

| Kipimo | Thamani |
|---|---|
| **Content type** | Text, Text+Image, Video, Reel, Audio, Poll, Announcement, Live Activity, Story, Status, Shared Post |
| **Author** | Mtu (person entity) |
| **Publisher** | Entity inayochapisha (person / channel / hub / business / space) |
| **Visibility** | Public / Followers / Friends / Members / Private / Local-only(distribution) |
| **Permissions** | comment, react, share, relay, download, save, quote |
| **Area** | Global / Regional / Local (umuhimu) |
| **Lifecycle** | DRAFT → LOCAL_ONLY → WAITING_SYNC → SYNCING → SYNCED → PENDING_REVIEW → APPROVED/RESTRICTED/REJECTED |
| **Presentation hint** | Immersive / Video-first / Image-first / Readable / Interactive / Live |
| **Media** | Chunks + hashes + manifest |
| **Provenance** | Signature + trust token (inapohitajika) |

### View Modes = **presentation**, si transport

Nimeelewa wazi: `Automatic`, `Vertical`, `Horizontal / Full Scroll` ni **jinsi ya kuonyesha**, na haziathiri **jinsi ya kusafirisha**. Kwenye prototype hii ni sahihi (`viewModes` zipo kama mapendeleo ya mtumiaji, hazina uhusiano na mtandao).

**Automatic mode inahitaji "presentation hint" iwe imeambatanishwa na content** — vinginevyo kila kifaa kinalazimika "kubahatisha", na matokeo yanatofautiana kifaa hadi kifaa. Hii ni kiungo muhimu: hint inaweza kuwa deterministic (aina ya media + ukubwa), si AI.

### Ulinganisho na prototype

✅ **Inafuata:** `posts` zina `kind` (text/image/video/poll/audio/liveActivity/event/product/announcement) na `media.ratio` — hii ni mwanzo sahihi wa presentation hints. `viewModes` zipo kama mapendeleo.

⚠️ **Haijawakilishwa:** visibility, permissions, lifecycle states, provenance, chunks, TTL ya stories/status.

⚠️ **Hatari ndogo:** `inHomeTabs: ['mchanganyiko','friends']` na `filterTypes: ['video','posts']` ni **routing ya ad-hoc** ndani ya data. Ni mwanzo mzuri (inaonyesha kwamba content inajua mahali pake), lakini inapaswa kubadilika kuwa **routing service ya deterministic** (§26–§27), yenye vigezo na *sababu* (reason) — si tags zilizoandikwa kwa mkono kwa kila post.

---

## L. CREATOR & BUSINESS ARCHITECTURE

### Uelewa wangu

**Creator economy:** payout haipaswi kutegemea followers pekee. Inputs: qualified views, watch time, retention, original engagement, returning viewers, originality, audience quality, ad region/value, policy compliance, fraud signals.

**Business:** operational domain — products, services, orders, customers, offers, analytics. **Si sehemu ya personal profile.**

### Mgongano wa kimsingi ninaouona

Creator economy inahitaji **kipimo (measurement)** — kuhesabu views/mapato. Lakini **Minimum Knowledge Architecture** inasema: usikusanye zaidi ya lazima.

Suluhisho linalowezekana (ombi langu kwenye P): **kipimo cha kutosha kwa malipo, si wasifu wa kitabia.** Mfano: kuhesabu "qualified view" ndani ya kifaa na kutuma **jumla (aggregate) iliyothibitishwa**, si matukio ya mtu mmoja mmoja. Hii inaunganisha malipo na faragha bila kuacha moja.

### Ulinganisho na prototype

✅ **Mipaka inafuatwa:** Business ipo kama destination yake, si tab ya Home; entity `business` ina badge na identity yake; Channel ni publishing (si chat).

⚠️ **Haijawakilishwa:** creators kama domain (payout, metrics), business operations (products/orders/customers kama entities na edges), Hai Points, allowance.

**Muhimu:** Kwa prototype ni sawa kabisa — lakini **`Hai Points` na "5 MB/day allowance" zisijengwe kama UI ya kubuni namba.** Kanuni #12 inakataza hilo. Vitu hivi viwe na **metering service ya kweli** au vikae kimya.

---

## M. BACKEND / FIREBASE BOUNDARY

### Uelewa wangu

**Firebase = infrastructure, si PASIHAI.** Domain logic isifungwe kwenye Firebase-specific APIs.

### Uamuzi mmoja wa lazima (ADR) kabla ya kuanza Firebase

⚠️ **Firestore ina offline persistence yake mwenyewe.** Kuiwasha ni **mfumo wa pili wa sync** — duplicate system (kanuni #60) — na inaweza:
- kuhifadhi media ya mazungumzo ya faragha kwenye cache (hatari ya faragha),
- kuchanganya "cached" na "saved",
- kupigana na Sync Engine yetu kuhusu mamlaka (authority).

**Mapendekezo:** Firebase itumike kama **adapter** — Auth, Firestore (kama remote store), Storage, FCM — lakini **offline persistence ya Firestore iwe imezimwa** na **Sync Engine yetu ndiyo yenye mamlaka ya mzunguko wa local→remote**. Hii inahitaji ADR ya wazi, sasa, kabla ya mstari wowote wa Firebase.

### Ramani ya huduma (service map)

| Huduma | Aina | Mahali pa kwanza |
|---|---|---|
| Identity & Session | Infra | Firebase Auth (adapter) |
| Entities & Edges (social graph) | Domain | Sync Engine → Firestore (adapter) |
| Content & Media | Domain | Firestore + Storage (adapter) |
| Feed / Routing | Domain (deterministic) | Kifaa + server refresh |
| Messaging (Soga) | Domain (E2EE) | Service yetu (baadaye) |
| Sync Engine | Domain (mamlaka ya mzunguko) | Kifaa |
| Transport Abstraction | Infra (kifaa) | Service yetu |
| Notification Service | Domain (event-driven) | FCM + local |
| Moderation / Trust | Domain | Service yetu (server) |
| Economy (Hai Points/allowance) | Domain | Ledger service (server) |

---

## N. PROTOTYPE → PRODUCTION MIGRATION PLAN

### Kanuni ya msingi ya mpangilio

Document (§32, §58) inasema: **Architecture → Domain Model → Data Model → State Model → Permissions → Services → UI → Tests → Integration**, na **domain moja kwa wakati**, na **usiharibu kazi iliyopo** (§59), na **usifanye mifumo mbadala** (§60).

Mpangilio wangu unaheshimu hilo. Kila hatua ina **lango (gate)** — kitu kinachopimika.

| # | Hatua | Kazi | Gate (kinachopimika) | Inagusa prototype? |
|---|---|---|---|---|
| **0** | Architecture freeze | ADRs: mamlaka ya sync, Firebase offline, LOCAL_ONLY, relay/consent, deletion-vs-S&F | ADRs zimeandikwa na kukubaliwa | ❌ Hapana |
| **1** | Seams (bila mabadiliko ya UI) | Repository/Service layer; UI haiimport mock moja kwa moja; entities/edges zinatenganishwa nyuma ya dirisha | UI inafanana **kabisa**; smoke tests 16/16 zinapita | ✅ Inagusa imports pekee |
| **2** | Identity + Social Graph | `entity_type` ≠ `role` ≠ `edge_type`; viewer-scoped edges; `me` | Identity chip inaonyesha vitu vile vile; edges zinahesabika kwa usahihi | ✅ Nyuma ya dirisha |
| **3** | Permissions + Visibility | Action taxonomy; visibility scopes; area (relevance) | Kila content item ina scope + permissions zinazopimika | ✅ Nyuma ya dirisha |
| **4** | Local Data Layer | IndexedDB schema (C), `cache` ≠ `saved`, schema versioning | Data inabaki baada ya reload; migration inapimika | ⚠️ Kuna athari ndogo za UI (states) |
| **5** | Network State + Sync Engine | ONLINE/LIMITED/OFFLINE/WAITING_SYNC; queue; HLC; conflict rules (D) | Operation inasafiri offline→online na kutua sawa | ⚠️ UI ya hali ya kusubiri |
| **6** | Content + Home Feed | Routing ya deterministic (§26); presentation hints; aina zote za content | Feed ina maana kwa mtumiaji wa marafiki-15/followers-0 | ✅ Home inapata mkondo wa kweli |
| **7** | Soga (Messaging) | Domain tofauti; E2EE plan; hakuna chat kwenye Channel/Hub | Ujumbe unafanya kazi offline (queue) na online | 🆕 Ukurasa wa Soga |
| **8** | Spaces / Hubs / Communities / Groups | Membership edges; roles; hakuna chat | Space ≠ chat inathibitika kwenye code | 🆕 |
| **9** | Channels | Publishing entity; visibility ≠ content visibility | Restricted content inapimika | ✅ Tab ya Channels |
| **10** | Stories / Reels / Live | TTL; presentation za kipekee; Live ≠ post | Viewer kamili; Live ina state | ✅ |
| **11** | Notifications | Event-driven; local + server; dedupe; privacy ya payload | Event inazalisha notification bila server | ✅ |
| **12** | Transport Abstraction | `TransportService`; hakuna transport kwenye features | Feature inafanya kazi bila kujua transport | ❌ Hapana (nyuma) |
| **13** | First transports | Local Wi-Fi → Bluetooth → WiFi Direct (Android kwanza) | Transfer ya kweli ya chunk inapimika | ⚠️ Consent UI |
| **14** | Cooperative Cache | Cache classes; TTL; eviction; **hakuna media ya faragha** | Cache haichanganyiki na Saved popote | ⚠️ UI ya storage |
| **15** | Store-and-forward | Envelope + signature + TTL + policy class (G) | Content inasafiri A→B→C kwa uaminifu | ⚠️ |
| **16** | Authorized Relay | Consent; quota; battery; audit; revocable | Hakuna relay bila ridhaa — inapimika | ⚠️ Consent UI |
| **17** | Trust / Moderation | Pipeline; trust token; report flow; E2EE report | Content inaweza kuzuiliwa (restricted/rejected) | ⚠️ |
| **18** | Economy | Metering (actual); Hai Points; allowance; KYC gate | Hakuna namba ya kubuni inayoonyeshwa | ⚠️ |
| **19** | Production Security + QA | Data export/delete; pen-test; compliance | Ripoti ya usalama; sera zilizothibitishwa | ❌ |

### Vitu vitatu vya kuweka bayana kuhusu mpangilio huu

1. **Hatua 0 na 1 haziwezi kurukwa.** Kila kitu kingine kinategemea.
2. **Transport (12) inakuja BAADA ya Sync (5), si kabla.** Sababu: cooperative layer ni transport ya queue ile ile — kuijenga kwanza ni kujenga mfumo mbadala.
3. **UI iliyopo haipotei.** Design system, tokens, components, mipaka ya navigation, identity chip, tabs — vyote vinabaki. Kazi ni kuhamisha data nyuma yao.

---

## O. RISKS / ARCHITECTURAL CONFLICTS

Nimeorodhesha kwa uzito (severity) na pendekezo.

### 1. Kufuta data vs Store-and-forward — **KUBWA**
Content iliyosafirishwa kwenda vifaa vingine **haiwezi kufutwa kwa uhakika**. Document inasema data ownership + deletion concepts, lakini cooperative layer inafanya "kufuta" kuwa ombi, si hakikisho.
**Pendekezo:** Sera ya wazi — content ya class fulani (private/friends) **hairuhusiwi** kusafiri nje ya vifaa vya mmiliki; content ya public inaweza kusafiri lakini deletion inakuwa "best-effort + expiry-based". Iandikwe kama ADR **kabla** ya Phase P.

### 2. Moderation vs Offline-first — **KUBWA**
Huwezi kuhakiki kile ambacho hakijafika. Content ya LOCAL_ONLY **haiwezi kusimamiwa** — lakini §22 inasema "offline haimaanishi bila safety". Mgongano huu unahitaji uamuzi wa sera.
**Pendekezo:** LOCAL_ONLY isambazwe kwa **classes zilizoidhinishwa** pekee (mawasiliano ya faragha na vikundi vilivyojulikana), **si public**. Public content inasubiri review. Hii inaunganisha safety na local-first bila kuvunja moja.

### 3. E2EE vs Trust & Safety / Relay — **KUBWA**
Relay na moderation haziwezi kuona E2EE content. Kujifanya zinaweza ni hatari kisheria na kiheshima.
**Pendekezo:** relay ni **class-based**, si content-based; report flow inahitaji ridhaa ya mtumiaji kushiriki ujumbe maalum.

### 4. Firebase Firestore offline persistence — **KUBWA (na inaweza kuepwa)**
Kama ilivyoelezwa (M): ni mfumo mbadala wa sync, na inaweza kuhifadhi media nyeti.
**Pendekezo:** ADR sasa; persistence imezimwa; Sync Engine yetu ina mamlaka.

### 5. Uwajibikaji wa relay (legal) — **KUBWA**
Kifaa cha mtumiaji kinapopitisha content isiyojulikana kwa upofu, maswali ya kisheria yanatokea (content zilizozuiliwa kisheria). Document inasema "no silent relay" lakini haigusi uwajibikaji wa yule anayepitisha.
**Pendekezo:** uhakiki wa kisheria **kabla** ya Phase Q; sera za class za content zinazoruhusiwa kupitishwa.

### 6. Proximity privacy — **KATI-KUBWA**
"Device encounters" zinaweza kuvujisha mahali na uhusiano. Pia, mtu anaweza kujua mtu yuko karibu.
**Pendekezo:** encounters zisiingie kwenye social graph; zisirekodiwi server-side kwa default; disclosure ya wazi kwa mtumiaji.

### 7. Mapungufu ya iOS kwa local transport — **KATI**
Wi-Fi Direct haipo iOS; Bluetooth ina vikwazo. Ahadi ya "local-first" itakuwa **tofauti kwa platform**.
**Pendekezo:** wasilisha kwa uwazi; transport abstraction inaruhusu uwezo tofauti; usiahidi ulinganifu kamili mwanzoni.

### 8. Regression ya betri/data kwa vifaa vya chini — **KATI**
Soko la Tanzania lina vifaa vya bei nafuu. Cooperative layer inaweza kuongeza matumizi ya betri/data kinyume na lengo.
**Pendekezo:** constraints za lazima kwenye engine (charging-only relay, size caps, thermal awareness); kupima kwa vifaa halisi.

### 9. "Fake savings" — **KATI**
Shinikizo la kuonyesha "umeokoa 70 MB" linaweza kusababisha namba za kubuni — kanuni #12 inakataza.
**Pendekezo:** metering service ya kweli **au** hakuna namba kabisa. UI ianze bila namba.

### 10. Duplication ya dhana (kanuni #60) — **KATI**
Hatari: mtu anajenga "chat" ndani ya Channel/Hub kwa sababu ni rahisi (mfano comment thread inaonekana kama chat).
**Pendekezo:** comment/reply ≠ chat kwa uthibitisho wa kimsingi; hakuna `conversation_id` kwenye Channel/Hub domain.

### 11. Counters na mamlaka — **KATI**
Kifaa hakiwezi kujua "likes 24" kwa uhakika offline.
**Pendekezo:** double-count ya muda (local optimistic + server authoritative reconcile) — lakini UI isionyeshe namba kama "uhakika" wakati wa WAITING_SYNC.

### 12. Muda kama maandishi — **NDOGO (lakini msingi)**
`time: 'dakika 12'` kwenye data inazuia sorting, TTL, na localization.
**Pendekezo:** timestamps + formatter; i18n ya strings za UI (sasa strings zipo hardcoded Kiswahili).

### 13. Ad-hoc routing tags — **NDOGO-KATI**
`inHomeTabs` / `filterTypes` zitakuwa ngumu kudumisha.
**Pendekezo:** routing service ya deterministic yenye vigezo + `reason`.

### 14. Over-engineering — **DAIMA IPO**
Tuna document kubwa na uwezo mkubwa; hatari ni kujenga vyote kwa mara moja (§58 inakataza).
**Pendekezo:** gates; kila phase lazima ithibitishe thamani kwa mtumiaji wa kawaida.

### 15. Ulinganifu wa kisheria/udhibiti (Tanzania) — **KATI**
Data protection, takwimu za mawasiliano, malipo, usimamizi wa content — vyote vina mahitaji ya kisheria.
**Pendekezo:** uhakiki wa kisheria kama hatua rasmi kwenye Phase T na Phase R (KYC kwa ubadilishaji wa Hai Points).

---

## P. QUESTIONS THAT MUST BE RESOLVED BEFORE PRODUCTION

Nimezipanga kwa kile zinachozuia. Zile zilizo na ⛔ ni **vizuizi (blockers)**.

### Sera ya msingi (zinaathiri kila kitu)

**Q1 ⛔ LOCAL_ONLY ni hali ya *usambazaji* au *uonekano*?**
Naona document ina mambo mawili yanayoitwa "local": LOCAL_ONLY (distribution) na "local relevance" (area). Je, LOCAL_ONLY ni scope ya visibility yenye sheria zake, au ni hali ya kusafiri tu? **Hii inaamua schema ya content.**

**Q2 ⛔ Nani anaweza kuunda entity za aina gani?**
Mtu anaweza kuwa na: personal profile + channel + hub (kama admin) + business? Je, entity zote ni za mtu mmoja (account moja, entities nyingi), au kila entity ni identity ya kujitegemea? **Hii inaamua model ya roles na permissions.**

**Q3 ⛔ Kufuta data kunamaanisha nini ikiwa content ilisafiri?**
(tazama O#1) Sera gani: content gani inaruhusiwa kusafiri nje ya vifaa vya mmiliki? Na "kufuta" ni nini hasa kwa content iliyosafiri?

**Q4 ⛔ Content inaweza kusambazwa local kabla ya review ya server?**
Kama ndiyo, kwa classes gani za content? Kama hapana, LOCAL_ONLY ni nini hasa basi?

### Social graph

**Q5** "Friend" ni edge moja kwa pande mbili (state: requested/accepted), au ni edges mbili? Nini hutokea mtu anapofuta?
**Q6** Kufuata (follow) mtu na kufuata channel ni edge moja yenye scope tofauti, au edges za aina tofauti?
**Q7** "Mteja" (customer) wa biashara ni edge kwenye social graph, au ni sifa ya maagizo (orders)? Je, biashara inaweza kuona watumiaji wote waliowahi kuwa wateja?
**Q8** Roles (admin/moderator) ni za entity (Dar Tech Hub) pekee, au zinaweza kuwa za sub-scope (k.m. moderator wa group moja ndani ya hub)?

### Content & permissions

**Q9** Orodha kamili ya actions (permissions): view, comment, react, share, quote, download, save, relay, reuse? Ni ipi inayohitajika kwa MVP?
**Q10** Comment/reply kwenye channel: ni uwanja wa comment (publishing) au mazungumzo (Soga)? **Jibu linaamua kama tunavunja "Channel ≠ Chat" au la.**
**Q11** Status ≠ Story: ni aina mbili tofauti za content na viewers tofauti, au content moja yenye TTL tofauti? Document inasema ni tofauti — nataka kuthibitisha semantics.
**Q12** Presentation hint: iwe imeandikwa na creator, au inatolewa kutoka media metadata (deterministic)? Au Automatic mode inaamua kifaa kwa kifaa?

### Offline & sync

**Q13 ⛔ Tunatumia logical clock (HLC) kwa mpangilio wa offline?**
Kama hapana, offline edits hazitakuwa na mpangilio thabiti. Kama ndiyo, ni lazima sasa (inagusa kila jedwali).
**Q14** Queue ni ya kifaa au ya akaunti? Nikiinstall upya app, je, operations zinasubiri zinasafiri?
**Q15** Conflict rules (D) zinakubalika? Kuna domain yoyote inayohitaji mkakati tofauti?

### Transport, cache, relay

**Q16** Tunaanza na transport gani kwa jaribio la kwanza (Local Wi-Fi ni rahisi zaidi kuthibitisha), na tunakubali kwamba iOS itakuwa nyuma?
**Q17** Cache ya media ya faragha: inaruhusiwa kabisa? (Pendekezo langu: hapana, kwa default.)
**Q18** Relay: ni per-message au per-session? Na kikomo chake ni nini (quota, betri, charging-only)?
**Q19** Metriki ya "internet data avoided" inapimwa vipi hasa? (Na kama hatuwezi kupima kwa kweli, tunaonyesha namba au hapana?)

### Economy, trust, privacy

**Q20** Hai Points: ni utility pekee, au kuna mpango wa kubadilisha kuwa fedha? (Inaamua KYC na compliance kabla ya kujenga.)
**Q21** "5 MB/day" ni kikomo cha *mawasiliano* (communication) pekee, au cha jumla? Ni kwa kifaa au kwa akaunti? Ni server- au device-measured?
**Q22** Payout ya creator inahitaji kipimo gani cha chini kabisa ili iwe ya haki? Na tunaweza kupima bila behavioral profiling?
**Q23** E2EE: 1:1 pekee au vikundi pia? Multi-device na recovery zinafanyaje?
**Q24** Trust token: kifaa cha bei nafuu kinaweza kuthibitisha vipi bila server? Key distribution (server-signed / TOFU) na revocation offline?
**Q25** Eneo (area): tunafafanua vipi maeneo (mji/kata/mtaa)? Ni yetu au yanatolewa na watumiaji (Hubs)?
**Q26** Retention ya Stories (saa 24): kifaa ambacho hakikuwa online siku 3 — kinafutaje kilichopitwa na muda, na kinasema nini kwa mtumiaji?

---

## KIAMBATISHO A — INVENTORY YA PROTOTYPE (kilichopo, kwa ushahidi)

| Kipimo | Matokeo ya uchunguzi |
|---|---|
| Faili za source | 16 (`src/`) |
| Faili za UI zinazosoma `data/mock.js` moja kwa moja | **7** (Home, PlaceholderPage, StyleGuide, panels, StatusRow, HomeTabs, CreateArea) |
| Persistence (localStorage/IndexedDB/Cache API) | **hakuna** |
| Network / sync / transport / queue | **hakuna** |
| `fetch` / WebSocket | **hakuna** |
| Visibility / permission / moderation / area | **hakuna** (grep ilikuta CSS pekee) |
| Muda kama maandishi | **ndiyo** (`'dakika 12'`, `'saa 2'` — 20+ mahali) |
| Counters kama namba tuli | **ndiyo** (`reactions`, `comments`) |
| Entity + relationship + role zimeunganishwa | **ndiyo** (`user.type`) |
| Design tokens | ✅ `tokens.css` kamili |
| Components za reusable | ✅ 11+ (Avatar, Identity, Chip, MediaFrame, Waveform, Sheet, Dropdown…) |
| Icons | ✅ 40+ za mstari mmoja |
| Mipaka ya navigation | ✅ BottomNav yenye `purpose` kwa kila destination |
| Home tabs | ✅ 5 kamili, Mchanganyiko = default |
| View modes | ✅ zipo kama mapendeleo (presentation pekee) |
| Live kama aina tofauti | ✅ `liveSessions` na state/mode |
| Saved vs Cache | ✅ Saved ipo; Cache haipo — **hakuna mkanganyiko** |
| Namba za "data savings" za kubuni | ✅ **hakuna** (kanuni #12 haijavunjwa) |
| Smoke tests | ✅ 16/16 zinapita |
| Screenshots za QA | ✅ 20 (`docs/shots/`) |

---

## KIAMBATISHO B — ADRs ZINAZOHITAJIKA (Hatua 0)

| ADR | Swali | Inazuia |
|---|---|---|
| ADR-001 | Mamlaka ya sync: Sync Engine yetu vs Firestore offline persistence | Firebase integration |
| ADR-002 | LOCAL_ONLY: distribution state vs visibility scope (Q1) | Schema ya content |
| ADR-003 | Model ya entity/role/edge (Q2) | Social graph |
| ADR-004 | Sera ya kufuta data na usambazaji (Q3, Q4) | Cooperative layer |
| ADR-005 | Relay: consent + class + uwajibikaji (Q18, O#5) | Phase Q + sheria |
| ADR-006 | Cache ya media ya faragha (Q17) | Privacy + cache |
| ADR-007 | Logical clock / mpangilio wa offline (Q13) | Data layer |
| ADR-008 | Presentation hints: nani anaamua (Q12) | View modes + feed |
| ADR-009 | Metriki: "data avoided" inapimwa vipi (Q19) | Data efficiency UI |
| ADR-010 | E2EE scope + multi-device + report (Q23) | Soga + T&S |

---

## HITIMISHO

**Nimeelewa PASIHAI kama mfumo**, si UI:

- Ni **communication-first platform** ambayo social layer inakua kutoka uhusiano, na transport layer iko chini ya kila kitu.
- **Offline-first si "app isiyo na internet"** — ni kielelezo cha usanifu kinachodhani network haipo kila wakati, na kwa hivyo kila kipengele kinajibu swali la "ninaweza kufanya nini hapa na sasa?"
- **Hybrid**: Internet ni transport moja, si mfumo wote.
- **Cooperative**: kila mkutano wa vifaa ni fursa — lakini **kamwe bila ridhaa na uzingatiaji wa sera**.
- **Faragha**: Minimum Knowledge — kujua kinachotosha, si kila kitu.

**Hali ya prototype kwa uaminifu:** ni **msingi mzuri wa UI** (design system, mipaka, components, utambulisho wa kuona) — lakini **si msingi wa domain**. Pengo kubwa ni model ya identity/relationship/visibility/permission na tabaka la sync. Vyote viwili vinapaswa kupangwa kabla ya kipengele kikubwa chochote kipya.

**Kitu ninachopendekeza sasa:** kukamilisha **ADR-001 hadi ADR-004** (vizuizi vinne) kabla ya kuendelea — kwa sababu vyote vinagusa schema ambayo kila kipengele kingine kitajengwa juu yake.

> *Communication first. Social growth follows.*
> *One network, many communities, different boundaries.*
> *Internet is one transport, not the whole network.*
