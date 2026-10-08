# PASIHAI — M: UI PREMIUM + FUNCTION REAL (hatua ya 2/3)

**Tarehe:** 2026-10-08 · **Hali:** hatua ya wiring imekamilika (mkondo · panels · Chat · Gundua)
**Lango:** build ✓ · smoke **393/393** ✓ · shots **294/294** ✓ · console 0 ✓

---

## 1. Lengo (kutoka `ask_user`)
- **Scope:** mfumo wote — Home · Chat · Gundua · panels zote.
- **Vitendo:** kila kitufe/action ifanye kitu halisi (hali · loading · disabled · toast). Hakuna
  `(mfano)`, hakuna "itajengwa baadaye", hakuna kitufe kilichokufa.
- **Logic/data:** upangaji, utafutaji, vichujio, hesabu na hali ya kikao vinafanya kazi kikamilifu —
  mock data + **hali ya kikao (memory)**; backend ⛔.
- **Urembe:** sawia — polish inayoonekana, si redesign; IA/nav/tokens hazibadiliki.

## 2. Kanuni iliyotumika
1. **Seam haijavunjwa**: UI → service → repository. UI haisomi `mock.js` na haitumii repository
   moja kwa moja (hakuna `import` ya `data/repositories` kwenye pages/components).
2. **Hali ni ya mtumiaji mmoja**: kila kinachohifadhiwa ni cha kikao hiki; hakuna kubadilisha data
   ya mtu mwingine kimya kimya.
3. **Hakuna namba za kubuni**: takwimu zinatoka service (mfano `systemService.getSnapshot()`);
   `Data Saved` = data ya internet iliyoepushwa pekee.
4. **Mfumo mmoja wa vitufe**: `.psh-btn` (+ alias `.psh-gu-btn`) — hakuna CSS ya pili ya vitufe.

## 3. Kilichoongezwa kwenye safu ya data (hali ya kikao)
| Repository | Kipya |
|---|---|
| `contentRepository` | kura za poll · vikao vyangu vya Live (anza/maliza) · status zangu · hifadhi ya entities · `joinLive` |
| `identityRepository` | `updateProfile` (jina · bio · eneo) |
| `chatRepository` | Saved Friend · maombi yaliyotumwa · kuzuia/kufungua · mipangilio · mandhari ya kikundi · archive · kufuta ujumbe (kwangu) · kuhifadhi ujumbe kwenye kifaa |
| `gunduaRepository` | `hideEntity`/`unhideEntity`/`listHidden` (hali yako pekee) · `getMyLink` (msimbo/QR kutoka data) |
| `systemRepository` | `getPrefs`/`savePrefs` (maslahi · mpangilio wa mkondo) |
| `mock.js` | `gunduaMyLink` (data, si hard-code kwenye UI) |

## 4. Panels na vitendo vilivyowekwa hai
**Mkondo (Home):** Penda · Maoni (+kuandika) · Shiriki (nakili · hifadhi · tuma Chat) · Hifadhi ·
⋯ (fuata mwandishi · ficha · hifadhi · wasifu · ripoti) · kura ya poll · CTA ya chapisho
(biashara → Chat; nyingine → chapisho/maoni) · Live (jiunge · endesha · maliza).

**Unda:** chapisho · picha · video · Reel · **kura (na majibu)** · **status (saa 24)** · **kikao cha
Live**. Kila kimoja kinaunda kitu halisi kwenye mkondo.

**Panels za Home:** Taarifa (soma · soma zote) · Wasifu (hariri wasifu · shiriki kiungo · tabs
Machapisho/Nilizopenda/Zilizohifadhiwa) · Zilizohifadhiwa (orodha halisi + Ondoa) · Mapendeleo
(mkondo · maslahi — yanahifadhiwa) · More (Sasisha halisi · Mipangilio → System).

**Chat:** New Chat (Hifadhi Rafiki · Tuma Ombi · Alika kwa SMS = nakili maandishi · kiungo/QR =
clipboard) · New Group (picha = mandhari halisi) · Maombi (kubali/kataa/zuia) · Search (anza
mazungumzo) · Settings/Notifications (switch zinahifadhiwa) · Privacy (nani anayeweza kutuma
maombi) · Archived (orodha halisi + Rudisha) · Blocked (orodha halisi + Fungua) · Storage (namba
halisi kutoka System) · **Sauti na mwito** (panel halisi: hakuna simu kwenye prototype; njia halisi
= ujumbe wa sauti · maandishi) · Thread (sikiliza sauti = hali · hifadhi faili kwenye kifaa · nakili ·
sambaza kwa mazungumzo halisi · futa kwangu).

**Gundua:** kiungo/QR (clipboard) · Alika (maandishi ya mwaliko) · Ramani (inapeleka eneo la biashara) ·
Jiunge/Sikiliza kikao (hali inabaki, `joinedLive`) · Sambaza · Hifadhi kwa baadaye (inaonekana
Zilizohifadhiwa) · Ficha kutoka Gundua (kinaondoka kwenye matokeo) · quick actions 5 → 3 halisi
(Fungua · Sambaza · Hifadhi · Ficha).

## 5. Uthibitisho
| Kipimo | Matokeo |
|---|---|
| `npm run build` | ✓ CSS **126.73 kB** (gzip 19.35) · JS **564.63 kB** (gzip 161.69) |
| `npm run smoke` | **393/393** (351 → 393; +42 za sehemu M) |
| `npm run shots` | **294/294** (278 → 294; +16 za M) · console **0** |
| Picha | `docs/shots/premium/` (9) · gallery `docs/review/premium/gallery.html` |

**Tests mpya (sehemu M ya smoke):** kuchapisha kwa aina (poll/reel) · chapisho langu juu ya mkondo ·
kura inabaki · penda/hifadhi/maoni/ficha · `listMine` · Live (anza → replay) · status safu ·
mapendeleo · wasifu (hariri + tabs) · taarifa (soma zote) · Chat (Saved Friend · ombi · zuia ·
archive · hifadhi faili · futa) · Gundua (ficha/unhide · hifadhi) · **hakuna vidokezo vya vitendo
vilivyokufa kwenye faili 8 za UI** · mfumo mmoja wa vitufe.

## 6. FILES MODIFIED
- `src/data/repositories/contentRepository.js` · `identityRepository.js` · `chatRepository.js` ·
  `gunduaRepository.js` · `systemRepository.js` · `src/data/mock.js`
- `src/services/feedService.js` · `chatService.js` · `gunduaService.js` · `settingsService.js` ·
  `notificationService.js` · `accountService.js`
- `src/components/ui.jsx` (`EntityAction` busy/disabled) · `panels.jsx`
- `src/components/feed/FeedItem.jsx` · `FeedList.jsx` · `bodies.jsx`
- `src/components/chat/Thread.jsx` · `ChatPanels.jsx`
- `src/components/gundua/GunduaPanels.jsx`
- `src/components/home/StatusRow.jsx` · `CreateArea.jsx`
- `src/pages/Home.jsx` · `Chat.jsx` · `Gundua.jsx` · `src/App.jsx`
- `src/styles/feed.css` · `panels.css` · `gundua.css` · `components.css`
- `scripts/smoke.jsx` · `scripts/shots.mjs`

## 7. FILES CREATED
- `src/components/feed/FeedActions.jsx` · `src/components/feed/FeedPanels.jsx`
  (Comments · Share · PostMenu · Live · StatusComposer · StatusAll)
- `docs/shots/premium/` (01–09) · `docs/review/premium/gallery.html` · `docs/M-REPORT.md`

## 8. FILES DELETED
- **Hakuna.** Hakuna component, page, mock, token, CSS, icon, test wala screenshot iliyofutwa.

## 9. Mipaka ya ukweli (yaliyoachwa wazi kwa makusudi)
- Simu za sauti/video **hazipo** — panel inasema hivyo na inatoa njia halisi (ujumbe wa sauti).
- Kichezaji cha sauti/faili hakipo — kitufe kinabadilisha **hali** (imesikilizwa · imehifadhiwa),
  hakidai kuwa kinacheza faili halisi.
- Ramani halisi haipo — "Ramani" inapeleka kwenye eneo la biashara; bango la muonekano linasema
  wazi kuwa si ramani halisi.
- Kuscan QR kunahitaji kamera — kitufe kinaeleza hivyo na kinanakili kiungo badala yake.
- Backend/Firebase/Cloudinary: **hakuna** — kila kitu ni hali ya kikao (memory).

## 10. Uamuzi unaohitajika
- Je, niendelee na **hatua ya 3** (kukamilisha urembe wa skrini kubwa: desktop/tablet kwa panels
  mpya + micro-interactions za mwisho), au nisimame hapa?
