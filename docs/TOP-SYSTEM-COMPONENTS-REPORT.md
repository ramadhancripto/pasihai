# PASIHAI — TOP SYSTEM COMPONENTS & LOCAL/RELAY INTEGRATION · RIPOTI

**Tarehe:** 2026-10-07 · **Hali:** imekamilika (Stage 1–10)
**Kanuni:** *Preserve · Improve · Do not duplicate.* Hakuna redesign · hakuna navigation mpya ·
hakuna component ya pili ya kitu kilichopo · hakuna kufuta kitu.

> Safu hii inaongeza **system interaction layer** pekee: vitendo viwili vya kudumu kwenye header
> (**Data Saved** · **System**) na panels za muktadha (Relay · Nearby · Sync · Save Offline ·
> Share Nearby · Activity) — zote kwenye **Sheet ileile** na **bottom nav ileile (5)**.

---

## 5a. SAHIHISHO LA SERA — INTERNET RELAY (linaongoza kila kitu kingine)

**Kusudi:** kusaidia **ujumbe mfupi kusafiri kwa data ndogo iwezekanavyo** — SI kupeleka faili.

| Kipengele | Sera |
|---|---|
| Kinachoruhusiwa | maandishi · metadata ya uwasilishaji (delivery/read/sync) · uelekezaji mdogo |
| Kinachozuiliwa KABISA | video · reels · picha · sauti · hati · PDF · ZIP · viambatisho · uploads kubwa · uhamishaji wa media |
| Vighairi | **hakuna** — hakuna exception kwa faili kubwa |
| Ukomo wa kila siku | **5 MB/siku = lazima (hard ceiling)** · default **3 MB/siku** · chaguo: 3 MB au 5 MB |
| Zaidi ya 5 MB | **linakataliwa** (`above_max`), ukomo unabaki 5 MB |
| Ujumbe mmoja | ≤ **32 KB** (baada ya uboreshaji); mkubwa → `Message too large for Internet Relay` |
| Idhini | **OFF kwa default**; inahitaji kuwashwa kwa mkono |
| Ukomo ukifikiwa | state `limit_reached` → **"Internet Relay paused"** · `Daily Internet Relay limit reached` · hakuna trafiki yoyote (hakuna `Tuma`) |
| Faili + relay | `Internet Relay supports messages only.` + njia mbadala (Wi-Fi Direct · Bluetooth · Wi-Fi · upload ya kawaida) — **hakuna automatic fallback** |
| Uboreshaji | serialization fupi · metadata isiyo ya lazima inaondolewa · efficient encoding · ack batching · kuepuka kutuma kinachojulikana |
| Kipaumbele | 1) maandishi → 2) metadata ya uwasilishaji → 3) metadata ya usawazishaji |
| Vipimo | **Relay Data Used ≠ Data Saved** — hii ni hesabu tofauti; na haturipoti salio la bundle/carrier |

**Local Mesh ≠ Internet Relay:**

| | Local Mesh | Internet Relay |
|---|---|---|
| Aina | Wi-Fi ya karibu · Wi-Fi Direct · Bluetooth | Internet |
| Content | video · picha · sauti · hati · ujumbe (kwa ruhusa + uwezo) | ujumbe mfupi pekee |
| Gharama | hakuna data ya simu | data ya simu, **≤5 MB/siku**, inasimama ukifika ukomo |
| Mahali | Relay panel → Local Mesh block + Share Nearby | Relay panel → Internet Relay block |

**Kanuni kuu:** *PASIHAI Relay exists to help messages travel with minimal Internet consumption —
not to consume the user's data in order to move large files.* Ukomo wa 5 MB **si lengo**;
matokeo bora ni ujumbe mwingi mfupi ukipita kwa data ndogo zaidi. **Data ndogo ni bora,
mradi mawasiliano yanabaki ya kuaminika.**

---

## 1. Audit findings (Stage 1–2)

Ripoti kamili: **`docs/SYSTEM-COMPONENT-AUDIT.md`** (component × location × purpose × reusable ×
duplication risk). Muhtasari:

| Kipengele | Kilichopo kabla | Uamuzi |
|---|---|---|
| Header | `Header.jsx` — Wordmark + icons 3 (taarifa · akaunti · menyu) | **Kupanuliwa**: vitendo 2 vya mfumo vikaingia ndani; hakuna header ya pili |
| Panel mechanism | `Sheet.jsx` (bottom sheet / dialog, Esc, "Rudi") | **Imetumika bila mabadiliko** kwa panels **zote 9** mpya |
| Panel stack | `App.jsx` (`stack` · `push` · `pop` · `openTop`) | Ongeza `case` 9 — si route mpya |
| Primitives | `ui.jsx` (Chip · Identity · Segmented · CheckRow · Avatar) · `panels.jsx` (Switch) | Zote zimetumika |
| Icons | `icons.jsx` (47) | **+7** mpya (Database · Swap · Relay · Radar · Download · Bolt · File) kwa style ileile |
| Post flow | `CreateArea` (prompt) · `CreatePanel` (grid "itajengwa baadaye") | **Composer MOJA** imeongezwa; grid "Chapisho" inaifikia; hakuna post system ya pili |
| Relay · Offline · Sync · Cache · Nearby · Network status | **Hakuna kabisa** kwenye code (neno "Nearby" kwenye maandishi ya Gundua pekee) | Safu mpya, seam ya kawaida |
| Saved content | `SavedPanel` ("Zilizohifadhiwa") | **Haigusi** — Saved ≠ Data Saved |
| Data saver | `MorePanel` switch ("Kuokoa data") | **Haigusi** — mapendeleo, si kipimo |
| Taarifa (notifications) | `NotificationsPanel` | **Haigusi** — System Activity ni kumbukumbu ya usafirishaji |
| Gundua | `PlaceholderPage` | **Haigusi** — hubaki ugunduzi mkuu |

**Duplication risks 10 (D1–D10)** ziliainishwa na dawa zake kabla ya mstari wowote wa code;
**hakuna STOP condition iliyotimia** (hakuna component iliyopo iliyokuwa inafanya kazi hii; tests
zote zilipita kabla; hakuna destructive refactor; hakuna backend iliyohitajika).

## 2. Existing components reused

`Header` · `Sheet` + panel stack · `IconButton` (Header) · `Chip` · `Identity` · `Avatar` ·
`Segmented` · `CheckRow` · `Switch` · `useAsyncData` · `Wordmark` · `toast` · `.psh-btn`
hierarchy (primary · secondary · done · sm) · `.psh-note` · `.psh-kv` · `.psh-empty` ·
`.psh-panelstack` · `.psh-iconbtn` · tokens zote (hakuna rangi mpya iliyoongezwa).

## 3. New components

| Component | Mahali | Kazi |
|---|---|---|
| `DataSavedIndicator` | `components/system/DataSavedIndicator.jsx` | Kitufe #1 cha header: 💾 184 MB (simu) / 184 MB saved (desktop) |
| `SystemQuickButton` | `components/system/SystemQuickButton.jsx` | Kitufe #2: ⇄ System + doa ya hali |
| `SystemPanels.jsx` | `components/system/` | Bodies 8 + panels 8: Data Saving · System · Relay · Nearby · Sync · Save Offline · Share Nearby · Activity |
| `ComposerPanel` | `components/panels.jsx` | Composer MOJA ya chapisho + uwasilishaji |
| Icons 7 | `components/icons.jsx` | Database · Swap · Relay · Radar · Download · Bolt · File |
| `formatMb` | `utils/format.js` | MB → "184 MB" / "1.0 GB" |

## 4. Data architecture

```
Component (system/*.jsx, panels.jsx ComposerPanel, Header.jsx)
   ↓ useAsyncData
Service   src/services/systemService.js        ← mantiki ya "kipi kinafaa sasa" iko HAPA
   ↓
Repository src/data/repositories/systemRepository.js   ← contract isiyotegemea provider
   ↓
Mock      src/data/mock.js (sehemu 12 mpya: systemDataSaved · systemCache · systemQueueItems ·
          systemRelayChoices · systemTransports · systemLocalContent · systemOfflineables ·
          systemActivity · systemNearby · systemDeliveryOptions · systemScenarios)
```

- Swap point: `data/repositories/index.js` — mstari mmoja (`systemRepository = mockSystemRepository`).
- **UI haitumii `mock.js` moja kwa moja** — smoke inailinda (kundi la 2 la architecture guard).
- Contracts zinawezesha baadaye: local DB · sync engine · Firebase/backend · transport halisi ·
  byte accounting halisi (repository pekee inabadilika).
- Hali ya kifaa (scenario) inachaguliwa kwa `?sys=local|online|limited|offline|waiting_sync|syncing`
  — zana ya maonyesho/majaribio **si** feature ya mtumiaji.

## 5. Data Saved implementation

- **Header:** `184 MB` (simu) · `184 MB saved` (desktop); aria-label kamili: *"Data Saved: 184 MB ya
  data ya internet iliyoepushwa. Fungua maelezo"*.
- **Panel (DATA SAVING):** kipimo kikubwa `184 MB` · scopes **Today | Week | Month** ·
  breakdown 4: Kushiriki kwa karibu 96 · Content iliyokuwa cached 52 · Uwasilishaji wa karibu 24 ·
  Relay iliyoidhinishwa 12 (inajumlisha hadi jumla — inathibitishwa na smoke).
- **Athari kwa mtandao (6):** content iliyopokelewa kwa karibu 42 · iliyoshirikiwa 17 ·
  vifaa 2 · uhamisho 61 · data ya internet iliyotumika 96 MB · iliyoepushwa 184 MB.
- **Maana (§21):** panel inasema wazi: ni data ya internet iliyoepushwa kwa njia ya karibu/cache/relay
  iliyoidhinishwa; **si** salio la relay, **si** Hai Points, **si** storage, **si** cache pekee.

## 6. System Quick implementation

`SystemQuickButton` → panel ya **SYSTEM**: hali ya kifaa + **vitendo 6 vya muktadha**, kila kimoja
kikijua kama kinafaa sasa na kwa nini:

| Hali | Relay | Nearby | Sync | Save Offline | Share Nearby | Activity |
|---|---|---|---|---|---|---|
| **LOCAL** (default) | ✓ Active | ✓ | ✓ [3] | ✓ | ✓ | ✓ |
| **ONLINE** | ✓ Available | ✓ | ✓ | ✓ | ✓ | ✓ |
| **LIMITED** | ✓ Limited | ✓ | ✓ | ✓ | ✓ | ✓ |
| **OFFLINE** | ✗ hakuna njia ya karibu | ✗ hakuna kifaa | ✓ (inasubiri) | ✗ hakuna chanzo | ✗ hakuna kifaa | ✓ |
| **WAITING_SYNC** | ✓ Available | ✗ | ✓ | ✗ | ✗ | ✓ |
| **SYNCING** | ✓ Paused | ✓ | ✓ | ✓ | ✓ | ✓ |

Vitendo visivyowezekana **vinazimwa (`disabled`) na vinaeleza sababu** (hakuna kuficha kisichoeleweka).
Sync pekee kinapopata "attention" ni pale vitendo vinasubiri (badge ya idadi).

## 7. Relay integration

`System → Relay` — **capability MOJA** (haipo mahali pengine popote), yenye sehemu mbili
zinazoonekana **tofauti**:

**Local Mesh** (status: Active/Available/Offline) — kinds 5 (video · picha · sauti · hati · ujumbe),
sheria 3 (ruhusa ya mpokeaji · uwezo wa njia/storage/betri · usalama), stats: local data relayed
12 MB · devices helped 4. Nota: *"Local Mesh hubeba content kubwa bila data ya simu. Internet Relay
hubeba ujumbe mfupi pekee."*

**Internet Relay** — switch ya idhini (off → on), alert ya hali (`Off` / `limit reached`),
**Daily Internet limit** (Segmented: 3 MB/day · 5 MB/day) + *"Maximum allowed 5 MB / day"*,
**meter** ya used/remaining, messages relayed, internet data used, cap ya ujumbe mmoja (32 KB),
sera (inaruhusiwa ✓ / hairuhusiwi kwa chips zilizokatwa mstari), kipaumbele 1·2·3,
orodha ya uboreshaji, **foleni ya relay** (ujumbe mfupi, raw KB → compact KB, `Tuma`/RELAYED/WAITING),
chaguo 3 za mawasiliano, **njia 4**, na ufafanuzi **Relay Data Used ≠ Data Saved**.

Hali halisi zilizothibitishwa: **OFF default** → ujumbe unakataliwa (`off`); kuwasha kwa mkono;
ukomo 3 ✓ · 5 ✓ · 6 ✗ · 20 ✗; ujumbe 32 KB unapita hadi ukomo, kisha `limit_reached` (hakuna
`Tuma`, hakuna trafiki zaidi); faili 9 aina zote zinakataliwa.

## 8. Local Post integration

**Post ni MOJA.** `Create → Chapisho`, prompt, na grid "Chapisho" zote zinafungua **composer ileile**:
- Chaguo za uwasilishaji (metadata, si aina ya post): **Local only · Nearby · Community · Global**.
- Mfumo huchagua linalofaa sasa: offline → Global/Community zinaonyesha *"Itasubiri sync — hakuna
  mtandao sasa"*; toolbar inabadilika → kitufe **„Chapisha — itasubiri sync"**; kuchapisha kunaiweka
  kwenye foleni (kinaonekana kwenye Sync na kwenye badge ya System).
- Hakuna button ya "Local Post" · "Global Post" · "Relay Post".

## 9. Local Sharing integration

`System → Share Nearby`: faili 4 zinapatikana (reel · picha · sauti · hati); kupeana → hali
**„Imeshirikiwa"**. Ni **uwasilishaji** (kifaa kwa kifaa), si mtandao wa kijamii; nota inasema wazi.
Kanuni: kupeana kunahitaji **kifaa cha karibu** — kama hakuna, kitendo kinazimwa kwa sababu.
`Shiriki` ya feed haigusi (kitendo cha content, dhana tofauti).

## 10. Offline Queue integration

Repository ina foleni ya vitendo (message · post · photo · reaction · comment · sync):
hali **WAITING · SENDING · SYNCED · FAILED**. Hakuna mfumo wa pili wa foleni (hakuna queue
ilipokuwa ipo). Vitendo vipya (chapisho linalosubiri) vinaingia kwenye foleni ileile.

## 11. Sync integration

`System → Sync`: idadi ya vinasubiri (halisi), orodha yenye hali, `Sync now` (inazimwa offline),
na muhtasari wa counts (waiting · sending · synced) uliohesabiwa kutoka data. Sync **haifichi**
kinachosubiri; offline inaeleza kwamba vitendo havipotei.

## 12. Cache integration

**Saved ≠ Cached** (panel ya Data Saving):
- *Saved* = 3 vitu ulivyohifadhi kwa mkono (1,268 MB) — `SavedPanel` ileile haijaguswa.
- *Cached* = 18 vitu (640 MB) kwa ufanisi wa mtandao.
- Data Saved **haitoi relay** kama chanzo: channels ni kushiriki kwa karibu · cache · uwasilishaji
  wa karibu · **Local Mesh** (12 MB).
- Nota: *"Si kila byte ya cache inaepusha internet — ile iliyoepusha imeorodheshwa kwenye Data Saved."*
  (§31 ya agizo: hakuna madai yasiyowezekana).

## 13. Transport handling

Transport 4 zinaonekana mahali moja (Relay → Njia), kila moja na `available` + `reason`.
Mtumiaji **hachagui** transport kwa kila operesheni: mfumo huchagua (nota: *"PASIHAI huchagua njia
inayofaa yenyewe… Huhitaji kuchagua kila mara"*). Data inaonyesha ni njia ipi inatumika sasa
(mfano chip `Wi-Fi ya karibu` kwenye System, `Wi-Fi Direct · Bluetooth` kwenye Activity).

## 14. Responsive behaviour

| Kipimo | Simu 390 | Simu ≤420 | Tablet 834 | Desktop 1280 |
|---|---|---|---|---|
| Data Saved | `184 MB` | `184 MB` | `184 MB` | `184 MB saved` |
| System | icon + doa | icon + doa | icon + doa | `⇄ System` |
| Header overflow | 390/390 ✓ | — | 640/640 ✓ | 640/640 ✓ |
| Split mstari | — | separator kufichwa | — | separator inaonekana |

Hakuna overflow wala kusukuma (inathibitishwa kwenye shots: 390px, 834px, 1280px).

## 15. Accessibility

- Vitendo vyote vina **aria-label** (kitufe cha icon: `aria-label="PASIHAI System — Local Active…"`).
- `aria-haspopup="dialog"` kwa vitendo vinavyofungua panel; `aria-disabled` kwa vinavyozimwa.
- **Eneo la kugusa ≈44px:** `.psh-ctl` 36px visual + `::after inset:-4px` (`@media pointer:coarse`);
  `.psh-btn--sm` rows + `::after -6px`. `min-height: 44px` kwa `.psh-sys-act`.
- **Keyboard:** Tab inafikia vitendo vya header; Enter inafungua panel; **Escape inafunga**;
  **focus inarudi kwenye kitufe kilichofungua** (imeongezwa kwenye `Sheet.jsx`, imethibitishwa kwa mtihani).
- Utofautishaji: maandishi yote kwenye tokens za AA (`--t-1`, `--t-2`, `--t-3`); hali za rangi zina
  maandishi (WAITING/SYNCED) si rangi pekee.

## 16. Tests

| Kipimo | Matokeo |
|---|---|
| `npm run build` | ✅ CSS **71.01 kB** (gzip 11.70) · JS **366.20 kB** (gzip 109.33) |
| `npm run smoke` | ✅ **184/184** (kutoka 114 — **+70**: render 11 · contracts 22 · **sera ya relay 37**) |
| `node scripts/shots.mjs` | ✅ **146/146** (kutoka 80 — **+66**) · console **0** |
| Data Saved open/close (+ scopes, Escape) | ✅ |
| System open/close | ✅ |
| Contextual action visibility (hali 6) | ✅ (offline: 4 zimezimwa + sababu) |
| Relay states + idhini | ✅ (default off → on) |
| Sync states | ✅ WAITING → SYNCED (offline: `Sync now` disabled) |
| Local sharing states | ✅ Share nearby → Imeshirikiwa |
| Post flow | ✅ composer → offline+Global → foleni (3→5) |
| Sera ya relay kwa UI (Relay panels, IDs 27 zilizoorodheshwa) | ✅ onyesho halisi |
| Regressions: Home · nav 5 · More · Profile · Guide · Tablet · Desktop | ✅ zote |

**Vipimo vipya vya sera (kutoka kwa agizo §16) — 27/27 zimepita kwenye `npm run smoke`:**

Internet Relay OFF by default ✅ · explicit consent ✅ · 3 MB/day ✅ · 5 MB/day ✅ ·
above 5 MB rejected ✅ (6 na 20) · text allowed ✅ · message metadata allowed ✅ ·
video ✗ ✅ · reel ✗ ✅ · image ✗ ✅ · audio ✗ ✅ · document ✗ ✅ · PDF ✗ ✅ · ZIP ✗ ✅ ·
large attachment ✗ ✅ · oversized message ✗ ✅ · payload optimization ✅ (6 KB → 4 KB) ·
daily limit enforced ✅ · relay stops at limit ✅ (250 ujumbe kisha kusimama, 5/5 MB bila kuvuka) ·
no automatic file fallback ✅ (foleni 5 → 5) · local mesh separate ✅ · Data Saved separate from
Relay Data Used ✅ · existing PASIHAI tests green ✅ (114 za awali zinaendelea kupita).

**Kasoro halisi iliyokamatwa kwa mtihani:** ukaguzi wa ukomo ulitumia thamani iliyofupishwa
(`round2`) — ujumbe wa mwisho ungeruhusiwa kuvuka 5 MB kwa ~0.002 MB. Sasa ukaguzi unatumia jumla
kamili: **haiwezi kuvuka hata kidogo** (5/5 MB imethibitishwa).

## 17. Build result

```
dist/assets/index-BdCZqK2_.css   71.01 kB │ gzip: 11.70 kB
dist/assets/index-CMMx5Jd8.js   366.20 kB │ gzip: 109.33 kB
✓ built in 2.54s
```

## 18. Screenshots

`docs/shots/system/` — **25 PNG** (`01-header-mobile` … `22-system-desktop`), zikijumuisha:
header (simu/desktop) · Data Saved (today/week + chini) · System (local/online/offline) ·
Relay (juu/chini) · Sync (waiting/done/offline) · Nearby (juu/chini) · Share Nearby · Activity ·
Composer (offline) · Waiting for Sync (done).
Zilizoongezwa kwa mzunguko huu: `05c-relay-after-send` · `16-relay-limit-reached` ·
`16b-relay-limit-bottom` · `17-share-nearby-guard`.
Gallery: **`docs/review/system/gallery.html`** (25 picha, base64).

## 19. Files changed (modified)

`data/mock.js` (sehemu 12 za mfumo) · `data/repositories/index.js` (swap point) ·
`components/icons.jsx` (+7) · `components/Header.jsx` (+2 vitendo) · `components/Sheet.jsx`
(focus restore) · `components/panels.jsx` (+ComposerPanel, CreatePanel → composer) ·
`App.jsx` (cases 9 + routing + props) · `main.jsx` (+system.css) ·
`scripts/smoke.jsx` (+70) · `scripts/shots.mjs` (+66 + picha) — **10 faili** + sasisho la sera:
`services/systemService.js` (relay policy · guard · mesh) · `data/repositories/systemRepository.js`
(sera · ukomo · relayMessage) · `components/system/SystemPanels.jsx` (RelayBody mpya · kinga) ·
`data/mock.js` · `styles/system.css` · `App.jsx` · `docs/SYSTEM-COMPONENT-AUDIT.md` (nota).

## 20. Files created

`data/repositories/systemRepository.js` · `services/systemService.js` ·
`components/system/{DataSavedIndicator,SystemQuickButton,SystemPanels}.jsx` · `utils/format.js` ·
`styles/system.css` · `docs/SYSTEM-COMPONENT-AUDIT.md` · `docs/TOP-SYSTEM-COMPONENTS-REPORT.md` ·
`docs/shots/system/*` (21) · `docs/review/system/gallery.html` — **9 vitu** (bila picha).

## 21. Files deleted

**0 (sifuri).** ⛔ Hakuna component, page, mock, token, CSS, icon au test iliyofutwa.

## 22. Duplication check

| Risk (audit) | Hali ya mwisho |
|---|---|
| D1 header/popover ya pili | ✅ hakuna — header ileile; panels zote kwenye `Sheet` ileile |
| D2 Saved vs Data Saved | ✅ tofauti wazi kwenye panel; `SavedPanel` haijaguswa |
| D3 "Kuokoa data" switch | ✅ haijaguswa; ni mapendeleo, si kipimo |
| D4 Nearby vs Gundua | ✅ nota ndani ya panel: Gundua hubaki ugunduzi mkuu |
| D5 Local Sharing vs `Shiriki` | ✅ Local Sharing ni uwasilishaji pekee (System); feed haijaguswa |
| D6 Sync vs "Sasisha" | ✅ majina + kazi tofauti; "Sasisha" ya Home menu haijaguswa |
| D7 Activity vs Taarifa / Live Activity | ✅ eyebrow "SYSTEM ACTIVITY" + nota "si taarifa za kijamii" |
| D8 navigation mpya | ✅ bottom nav **5** (Home · Soga · Gundua · Spaces · Business) — imethibitishwa kwenye shots |
| D9 post system ya pili | ✅ composer MOJA; uwasilishaji = metadata |
| D10 rangi/typography mpya | ✅ tokens zote za PASIHAI; hakuna rangi mpya |

## 23. Known limitations

1. **Mock pekee:** namba za Data Saved, foleni, relay na activity ni za majaribio; uhasibu halisi wa
   bytes na transport halisi ni kazi ya baadaye (repository inabadilika, UI haibadiliki).
2. Hali ya kifaa inachaguliwa kwa `?sys=` (zana ya maonyesho) — hakuna utambuzi halisi wa mtandao.
3. `Sync now` inasimulia mabadiliko kwa mock (in-memory); refresh ya ukurasa inarudisha hali ya awali.
4. Local Mesh "active/available" ni ya mock — hakuna ugunduzi halisi wa vifaa (Bluetooth/Wi-Fi Direct),
   na uboreshaji wa ujumbe unatumia uwiano wa mfano (62%) — relay engine halisi atachukua nafasi yake.
5. Matumizi ya relay yanasimuliwa kwa mock; `Relay Data Used` haisomwi kutoka OS/carrier
   (na haturipoti bundle/carrier kwa kubuni — §14).
5. Data Saved haijaunganishwa na `SavedPanel` (bookmarks) wala na Storage API — kwa makusudi.
6. Stage 6–10 za Stitch (filter chips popover · View Mode "Full screen" · RSVP · Reels player)
   **bado hazijaanza** — zinasubiri idhini tofauti.

---

## Stage kwa Stage (execution order)

| Stage | Kazi | Hali |
|---|---|---|
| 1 | Audit ya project | ✅ `docs/SYSTEM-COMPONENT-AUDIT.md` §1–5 |
| 2 | Component map + duplication risks (D1–D10) | ✅ §6, hakuna STOP |
| 3 | Data Saved architecture (repo → service → UI) | ✅ |
| 4 | System Quick architecture | ✅ |
| 5 | Relay · Nearby · Sync · Save Offline · Share Nearby · Activity | ✅ |
| 6 | Local Post delivery (composer moja) | ✅ |
| 7 | Offline queue / cache / sync states | ✅ |
| 8 | Responsive + accessibility | ✅ (fixes: peers rule · focus restore · touch targets) |
| 9 | Full regression (build · smoke · shots · console · nav 5) | ✅ |
| 10 | Report + screenshots + gallery | ✅ |
| — | **Sahihisho la sera (Internet Relay = ujumbe mfupi · ≤5 MB/siku)** | ✅ §5a |
