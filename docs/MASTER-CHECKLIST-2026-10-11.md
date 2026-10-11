# PASIHAI — Master Checklist (2026-10-11)

Hati hii inalinganisha mahitaji yaliyokusanywa kutoka README, ROADMAP, PASIHAI_KNOWN_LIMITATIONS,
FULL-SYSTEM-AUDIT-v2, PRE-TRANSFER-AUDIT, PRODUCTION-READINESS-REPORT, SUPABASE-CONFIGURATION-READINESS-CHECKLIST
na ombi la awamu hii, na hali halisi ya repo.

**Vifungu:**
- **Hali** — `DONE` (imethibitishwa kwa test iliyotajwa), `CODE` (code ipo lakini haijathibitishwa live), `PARTIAL`, `MISSING`, `BLOCKED` (inahitaji uamuzi au mazingira ambayo sina).
- **Ushahidi** — namba ya test kutoka `docs/VERIFICATION-REPORT-2026-10-11.md`.
- Hakuna mstari hapa unaodai "production ready". Hakuna test ya Supabase test project iliyofanyika (hakuna project wala credentials kwenye mazingira haya).

---

## 1. Authentication

| Requirement | Hali | Files | Kazi inayobaki | Ushahidi |
|---|---|---|---|---|
| Signup (email + password) | CODE | `src/services/authService.js` (signUp), `src/pages/Login.jsx`, `src/lib/AuthContext.jsx` | Thibitisha kwenye Supabase test project | test-auth 23/23 (static/mock) |
| Login | CODE | `authService.signInWithPassword` | Thibitisha live | test-auth 23/23 |
| Logout | CODE | `authService.signOut`, `panels.jsx` | Thibitisha live | test-auth |
| Session persistence / auto-login | CODE | `AuthContext` (`getSession`, `onAuthStateChange`) | Reload test live (cookie/localStorage) | — |
| Password reset — kuomba link | CODE | `authService.resetPassword` (`resetPasswordForEmail`), `Login.jsx` | Thibitisha email live | — |
| Password reset — kuweka nywila mpya baada ya link | **MISSING** | hakuna `updateUser` wala handler ya `PASSWORD_RECOVERY` | Ongeza route/handler ya recovery + `updateUser({password})` | — |
| Email verification — "Email not confirmed" | PARTIAL | `authService.js:22` (ujumbe pekee) | Kitufe cha kutuma tena uthibitisho (`resend`) + thibitisha live | — |
| Profile ya akaunti inaundwa baada ya signup | DONE (local DB) | `supabase/migrations/001_profiles.sql` (trigger ya `auth.users`) | Thibitisha live | local DB: profiles 3/3 |
| Username uniqueness | PARTIAL | `profiles.username UNIQUE` + CHECK | Jaribu duplicate → error (local) | — |
| Auth gate / redirect | CODE | `src/lib/AuthGate.jsx` | Browser test ya redirect | — |

## 2. Akaunti moja kwa Home, Chat, Groups, Channels, Hubs, Communities

| Requirement | Hali | Files | Kazi inayobaki | Ushahidi |
|---|---|---|---|---|
| Identity/profile kutoka chanzo halisi | CODE | `supabaseIdentityRepository.js` (8/8 methods) | Live test | repo-gap |
| Home feed live | CODE | `supabaseContentRepository.js` (25/25 methods) | Live test; media upload ipo mara 1 tu | repo-gap |
| Chat live | **PARTIAL 5/34** | `supabaseChatRepository.js` | Methods 29 zinakosekana (orodha kwenye VERIFICATION report) | repo-gap |
| Spaces (Hubs/Communities/Channels) live | **MISSING 0/13** | hakuna `supabaseSpacesRepository.js`; schema ipo `014_spaces.sql` | Repo + services + RLS | repo-gap |
| Gundua live | **MISSING 0/29** | hakuna `supabaseGunduaRepository.js` | Repo nzima | repo-gap |
| System (connection, relay, transports) live | **MISSING 0/26** | hakuna `supabaseSystemRepository.js` | Hiyo inahitaji uamuzi wa nini ni "real" (mesh/relay ni nini kwenye web?) | repo-gap |
| Catalog live | **MISSING 0/6** | hakuna | Repo | repo-gap |

## 3. Chat

| Requirement | Hali | Files | Kazi inayobaki | Ushahidi |
|---|---|---|---|---|
| Presence ("online") isiyobuniwa | DONE (UI) | `Thread.jsx`, `Chat.jsx` (online dot imeondolewa) | Presence halisi itahitaji realtime, ambayo haipo | browser 30/30 |
| Thread header inaonyesha `@handle` ya akaunti | DONE | `Thread.jsx` | — | browser |
| Relationship chips: PASIHAI Friend (bluu), Saved Contact (kijani), zenye lebo ya maandishi | DONE | `Chat.jsx`, `src/styles/chat-direct.css` | — | browser |
| Archive kutoka UI (menu ya mstari) | DONE (mock) / MISSING (live) | `Chat.jsx` (`rowmenu`), `chatService.getInbox` | `archiveConversation`, `listArchived` hazipo live | browser + repo-gap |
| Archived haionekani kwenye inbox | DONE (mock) | `chatService.getInbox` | — | browser |
| Hesabu za "More" menu (archived, blocked, requests) ni halisi | DONE (mock) | `chatService.getMore` | Live: `getMoreMenu`, `listBlocked`, `getRequests` hazipo | repo-gap |
| Malengo ya kugusa ≥44px (header, search, filters, row menu) | DONE (list pane) | `chat-direct.css` | Thread pane bado haijapimwa | browser (list) |
| `policyNote` ReferenceError (`relayEnabled`) | DONE | `chatService.js` | — | build + code review |
| Block / unblock | **MISSING (live)** | `blockContact`, `unblockContact`, `listBlocked` | Live repo | repo-gap |
| Delivery states (`sent`, `synced`, `relayed`, `waiting`, `local`, `vault`) zinazotokana na ushahidi | **NOT COMPLIANT** | `chatService.sendMessage` inakabidhi hali kutoka `systemRepository.getConnection()` | **Inahitaji idhini** — inaonyesha hali bila ushahidi | — |
| Group members (hardcoded demo kwenye `withMembers`) | **NOT COMPLIANT** | `chatService.js` (`Dr. Kelvin`, `Sarah`, …), `mock.js` (counts 48/36/126) | Ondoa demo; tumia membership halisi (Spaces/Groups backend) | — |
| Pin / Mute / Locked | MISSING | hakuna data field | Inahitaji schema + uamuzi | — |
| Calls (sauti/video) | MISSING | header buttons zimezimwa ("inakuja") | Hakuna WebRTC; kubaki disabled | — |
| Audio playback | PARTIAL | state tu, hakuna player | — | — |
| Realtime (messages live) | MISSING | hakuna `.channel(` wala realtime kwenye `src` | Wezesha Supabase Realtime + subscriptions | grep |
| Offline outbox / reconnect (mock) | DONE (mock) | `test-offline` 41/41, `test-sync` 38/38, `test-outbox-safety` 21/21 | Live reconnect haijathibitishwa | scripts |

## 4. Groups / Channels / Hubs / Communities (Spaces)

| Requirement | Hali | Files | Kazi inayobaki | Ushahidi |
|---|---|---|---|---|
| Schema (spaces, space_members, space_posts) | DONE (local) | `014_spaces.sql` | RLS ya spaces haijathibitishwa kwa kina | migrations 21/21 |
| Membership (join/leave/request) | MISSING (live) | `spacesRepository` 13 methods, zote mock | Repo + RLS | repo-gap |
| Permissions / roles | MISSING | — | Ufafanuzi wa roles + RLS tests | — |
| Member counts halisi | **NOT COMPLIANT** | `mock.js` hardcoded | Hesabu kutoka `space_members` | — |

## 5. Profiles, contacts, avatars

| Requirement | Hali | Files | Kazi inayobaki | Ushahidi |
|---|---|---|---|---|
| Profile edit/view live | CODE | `supabaseIdentityRepository.js` | Live test | repo-gap |
| Avatars (DP) | **MISSING** | `ui.jsx` (initials tu); `avatar_url` haionyeshwi popote | Render + storage upload | grep |
| Contacts / friendships | PARTIAL | `007_friendships.sql`, `supabaseFriendshipRepository.js` (untracked) | Review na live test | — |

## 6. Supabase schema, migrations, RLS, RPCs

| Requirement | Hali | Ushahidi |
|---|---|---|
| Migrations 001–018 zinatekelezwa kwa mpangilio kwenye DB safi | DONE (local PG 17 + shim) | `npm run db:verify` migrations 21/21 |
| Migration 011 (`idx_shares_user` predicate `now()`) | FIXED (file) | Haikuwahi kutekelezwa kwenye Postgres yoyote; sasa index ya kawaida |
| Post counts zinasasishwa (reactions, comments, shares) | FIXED (migration 022) | behavior 8/8 (bila fix: 7/8, reaction count 0) |
| RLS: own-data, anon, self-escalation, tamper | DONE (local, meza chache) | behavior 8/8 |
| RLS kwa meza zote | PARTIAL | Haijathibitishwa kwa meza nyingi |
| RPCs | N/A | Hakuna `.rpc(` kwenye `src` |
| Storage buckets + RLS (017, 018) | DONE (local) | migrations 21/21; upload live haijathibitishwa |
| Hosted Supabase project (migrations zikitumwa) | **BLOCKED** | Hakuna project wala credentials |
| Migration 016 idempotency kwenye hosted DB | **BLOCKED** | Hakuna project |
| Migrations 019–021 | RESERVED | Zinatajwa kwenye ukaguzi wa auth unaosubiri idhini; 022 imechukuliwa na count fix |

## 7. UI, responsive, accessibility

| Requirement | Hali | Ushahidi |
|---|---|---|
| Home, Chat, Gundua, Spaces: hakuna page errors | DONE (390 & 1280) | browser 30/30 |
| Hakuna horizontal overflow kwenye routes hizo | DONE | browser |
| Business tab | PLACEHOLDER | README inasema bado haijatekelezwa |
| Loading / error / empty states live | NOT VERIFIED | — |
| Accessibility audit kamili | NOT DONE | KNOWN_LIMITATIONS 4.3 |
| Android (Capacitor) build | NOT VERIFIED | `android/` ni source; hakuna gradle run |

## 8. Security

| Requirement | Hali | Ushahidi |
|---|---|---|
| Hakuna secrets kwenye frontend | DONE (grep) | Hakuna `service_role`, `sk_`, private key kwenye `src` |
| JWT ya publishable key kwenye docs | **FIXED** | Ilikuwa kwenye `PASIHAI_ENVIRONMENT_TEMPLATE.md` na `docs/BATCH-1-AUTH-REPORT.md`; sasa placeholder |
| `.env.example` ina placeholders tu | DONE | Project URL sasa `YOUR-PROJECT-REF` |
| Project ref `lbcpacijbiukqcpkfktp` kwenye docs | OPEN | Sio secret, lakini inatambulisha project. Inashauriwa kubadilishwa kwenye docs za zamani |
| Keystore / google-services.json / local.properties kwenye ZIP | DONE (hakuna) | scan ya faili |
| RLS haifungui data bila sababu | PARTIAL | local tests tu |

## 9. Repo hygiene

| Item | Hali |
|---|---|
| Git: nothing committed in this session; 86+ working-tree entries (creative studio, status, post studio, 015, 017, 018, na mabadiliko ya awali) | OPEN — inahitaji ukaguzi wako kabla ya commit |
| Git remote | MISSING — hakuna `origin` |
| `files/modified` na `files/new` ni nakala za source (zinajirudia) | OPEN — hazikufutwa; inahitaji uamuzi |
| Nyaraka zinapingana (README: 461 tests; KNOWN_LIMITATIONS: 706/706 na "74%") | OPEN — nyaraka za zamani; sasa namba ni za [VERIFICATION REPORT](VERIFICATION-REPORT-2026-10-11.md) |
| `scripts/test-local-db.mjs` ilikuwa stale (ilitarajia DB v2, code ni v3) | FIXED |
| `supabase/tests/run_tests_v2.sql`, `full_suite.sql` | OPEN — `run_tests_v2` inafuta data na kuingiza `auth.users`; ni kwa test DB tu |
| Presence/delivery/members fake data | OPEN (ona sehemu 3) |
| Pending patch ya Direct Chat | Haijawa pending: mabadiliko yako kwenye repo (uncommitted); `git checkout -- src/pages/Chat.jsx src/components/chat/Thread.jsx src/services/chatService.js` + kufuta `src/styles/chat-direct.css` kuyarudisha |

## 10. Mambo yanayohitaji uamuzi wako

1. **Delivery states** kwenye `chatService.sendMessage`: naondoa `sent/synced/relayed/vault` zinazotokana na connection? Mbadala: mock ionyeshe "imehifadhiwa kwenye kifaa" tu.
2. **Supabase test project**: unaweza kuunda project tofauti ya test? Credentials ziwekwe kwenye `.env.local` kwenye mashine yako (si chat). `npm run db:verify` ina `TRUNCATE auth.users` kwenye behavior test; inaweza kuendeshwa tu kwenye test project uliyoidhinisha.
3. **Mpangilio wa migrations**: 019–021 zimehifadhiwa kwa auth; 022 ni count fix. Idhinisha au badilisha.
4. **`files/modified` na `files/new`**: zifutwe au zibaki?
5. **Upeo wa awamu**: Chat live, Spaces live, Gundua live na System live ni kazi ya awamu nyingi. Nipendekeze mpangilio wa awamu?
