# PASIHAI — Ripoti ya Uthibitisho (2026-10-11)

Ripoti hii inaeleza kile kilichothibitishwa, kwa amri gani, na kile ambacho hakijathibitishwa.
**Hakuna sehemu ya ripoti hii inayodai Supabase halisi imethibitishwa**: hakuna Supabase test project wala credentials
kwenye mazingira haya, na hakuna production test iliyofanywa.

## 0. Mazingira

| Kitu | Thamani |
|---|---|
| Node / npm | v20.20.2 / 10.8.2 |
| Dependencies | `npm ci` kutoka `package-lock.json` (166 packages) |
| Postgres ya ndani | PostgreSQL 17.10 (binaries za `@embedded-postgres/linux-x64`), `127.0.0.1:54329` |
| Supabase | **Shim ya ndani** (`supabase/verify/supabase-shim.sql`): roles, `auth.users`, `auth.uid()`, `storage.objects/buckets`, default grants. Sio Supabase |
| Browser | Chromium ya Playwright (`chromium-1140`) kwenye Ubuntu |
| Dev server | Vite 7.3.7, `http://localhost:5173`, mock mode (default) |

## 1. Tiers za majaribio

| Tier | Imefanywa? | Matokeo |
|---|---|---|
| **Local/mock tests** (unit, smoke, scripts) | ✅ | 29/29 scripts exit 0, smoke 510/510 |
| **Local database tests** (Postgres 17 + shim) | ✅ | migrations 21/21, behavior/RLS 8/8 |
| **Browser tests** (mock mode, mobile + desktop) | ✅ | 30/30 |
| **Supabase test project** | ❌ **BLOCKED** | Hakuna project wala credentials |
| **Production** | ❌ Hakufanywa | Kwa makusudi |

## 2. Amri na matokeo (run ya mwisho, code ya mwisho)

| Amri | Exit | Matokeo |
|---|---|---|
| `npm ci` | 0 | 166 packages |
| `npm run build` | 0 | Build ya production; onyo la ukubwa wa chunk (si kosa) |
| `npm run smoke` | 0 | 510/510 |
| `node scripts/test-auth.mjs` | 0 | 23/23 (Passed 23, Failed 0) |
| `node scripts/test-supabase-repos.mjs` | 0 | 66/66 |
| `node scripts/test-local-db.mjs` | 0 | 37/37 (ilikuwa 36/37; test ilikuwa stale, DB v3) |
| `node scripts/test-idempotency.mjs` | 0 | 41/41 |
| `node scripts/test-offline.mjs` | 0 | 41/41 |
| `node scripts/test-sync.mjs` | 0 | 38/38 |
| `node scripts/test-outbox-safety.mjs` | 0 | 21/21 |
| `node scripts/test-network-failure.mjs` | 0 | 18/18 |
| `node scripts/test-failure-scenarios.mjs` | 0 | 24/24 |
| `node scripts/test-stress.mjs` | 0 | 20/20 |
| `node scripts/test-supplemental.mjs` | 0 | 17/17 |
| `node scripts/test-batch-b.mjs` / `-c-integration` / `-d` | 0 | 31/31, 42/42, 31/31 |
| Scripts za creative/post/quick/image/color/shape/text/background/panel | 0 | Zote PASS, 0 FAIL |
| **Jumla ya `scripts/test-*.mjs`** | | **29/29 exit 0** (logs: `/home/user/pasihai-verify/logs/final-*.log`) |
| `npm run db:verify` | 0 | Migrations **21/21**; behavior **8/8** |
| Browser (`/home/user/pasihai-verify/browser-check.mjs`) | 0 | **30/30** |

## 3. Migrations (fresh database)

Migrations zinatekelezwa kwa mpangilio wa jina (`sort()`), kila moja kwenye DB mpya, kama `postgres`
(kama `supabase db push`). Kosa la kwanza lingesimamisha run.

- Kabla: 001–010 OK, **011 FAIL**: `functions in index predicate must be marked IMMUTABLE`
  (`idx_shares_user ... WHERE created_at > now() - interval '30 days'`). Migration hii haikuwahi kutekelezwa
  kwenye Postgres yoyote kama ilivyoandikwa.
- Baada ya fix: 001–018 zote OK, pamoja na 007b, 008b.
- 022 (mpya) inaongezwa: 21/21.

**Ushahidi wa kubadilisha file:** `011_shares.sql` — predicate ya `now()` imeondolewa, index ni `(user_id, created_at DESC)`.
Haibadilishi DB yoyote iliyopo kwa sababu migrations hazirudiwi; inahitaji uthibitisho kwamba production haina 011 kwa
schema ya zamani (sijaweza kuthibitisha, hakuna access).

## 4. RLS na tabia ya DB (behavior-test.mjs, 8/8)

| Test | Kabla ya fix 022 | Baada ya fix |
|---|---|---|
| Auth trigger inaunda profiles 3/3 | PASS | PASS |
| Reaction inaongeza `posts.reactions_count` | **FAIL** (`0`, inatarajiwa `1`) | PASS (`1`) |
| Mtumiaji anaweza ku-bookmark mwenyewe | PASS | PASS |
| Mtumiaji hawezi ku-bookmark kwa niaba ya mwingine | PASS | PASS |
| Mtumiaji C haoni bookmarks za B | PASS | PASS |
| Mtumiaji hawezi kuweka `followers_count` yake | PASS | PASS |
| Mwandishi hawezi ku-tamper `reactions_count` moja kwa moja | PASS | PASS |
| `anon` haisomi bookmarks | PASS | PASS |

**Bug iliyogunduliwa na kurekebishwa:** `protect_post_counts()` (003) ilirudisha counts isipokuwa `current_user = 'supabase_admin'`.
Count triggers za SECURITY DEFINER zinaendeshwa kama mmiliki (postgres), kwa hiyo masasisho halali yalirudishwa kimya kimya.
Fix: `supabase/migrations/022_post_counts_guard_fix.sql` — inarudisha thamani ya zamani tu wakati `pg_trigger_depth() = 1`
(statement ya moja kwa moja ya client). Migrations 003/004/009/011 hazijabadilishwa.

## 5. Mabadiliko kwenye repo katika awamu hii

**Migrations / DB**
- `supabase/migrations/011_shares.sql` — index fix (sehemu 3).
- `supabase/migrations/022_post_counts_guard_fix.sql` — **mpya**, count guard fix.
- `supabase/verify/supabase-shim.sql`, `run-migrations.mjs`, `behavior-test.mjs` — **mpya**, harness ya majaribio ya ndani.
  Harness inakataa host isiyo ya localhost (ni ya uharibifu: inafuta DB na inafanya `TRUNCATE auth.users`).

**Chat (Direct Chat)**
- `src/services/chatService.js` — archived hazionyeshwi kwenye inbox; hesabu za More menu ni halisi; `policyNote` ReferenceError (`relayEnabled` → `relay.enabled`).
- `src/components/chat/Thread.jsx` — presence bandia imeondolewa; `@handle` ya akaunti kwenye header ya direct.
- `src/pages/Chat.jsx` — relationship chips (PASIHAI Friend bluu, Saved Contact kijani); kitufe cha ⋯ cha 44px kwa kila row; panel ya Archive.
- `src/styles/chat-direct.css` — **mpya**, malengo ya kugusa ≥44px kwenye list pane, chips, row menu.

**Usalama / config**
- `PASIHAI_ENVIRONMENT_TEMPLATE.md`, `docs/BATCH-1-AUTH-REPORT.md` — JWT ya publishable key imeondolewa (placeholder).
- `.env.example` — project URL sasa `https://YOUR-PROJECT-REF.supabase.co`.

**Tests / scripts / deps**
- `scripts/test-local-db.mjs` — 1.4 sasa inatarajia DB v3 (code ni v3, test ilikuwa v2).
- `package.json` — `pg@8` devDependency; script `db:verify`.
- `package-lock.json` — dependencies za `pg`.

**Nyaraka**
- `docs/MASTER-CHECKLIST-2026-10-11.md` — **mpya**.
- `docs/VERIFICATION-REPORT-2026-10-11.md` — **mpya** (hii).
- `docs/SETUP-AND-DEPLOY.md` — **mpya**.
- `docs/verification/repo-gap-2026-10-11.json` — **mpya**, ripoti ya mapengo ya repositories.

Hakuna commit, push, merge, reset wala deploy.

## 6. Mapengo ya repositories (live mode)

Uchambuzi wa kiotomatiki (`repo-gap.mjs`): methods zinazoitwa na services/UI dhidi ya zilizopo kwenye `supabase*Repository.js`.

| Repository | Methods zinazoitwa | Zipo live | Zinazokosekana |
|---|---|---|---|
| contentRepository | 25 | 25 | 0 |
| identityRepository | 8 | 8 | 0 |
| activityRepository | 3 | 1 | 2 (`markAllRead`, `markRead`) |
| chatRepository | 34 | 5 | **29** |
| spacesRepository | 13 | 0 (hakuna file) | **13** |
| gunduaRepository | 29 | 0 (hakuna file) | **29** |
| systemRepository | 26 | 0 (hakuna file) | **26** |
| catalogRepository | 6 | 0 (hakuna file) | **6** |

Orodha kamili ya chat inayokosekana: `archiveConversation, attachMedia, blockContact, clearMedia, createGroup, createMediaMessage,
getFilters, getMoreMenu, getPhoneBook, getRequests, getSettings, listArchived, listBlocked, listMessages, listSavedFriends,
listSentRequests, lookupNumber, markAllRead, reactToMessage, resolveMedia, respondRequest, saveFriend, saveMessageOffline,
search, sendRequest, setConversationTone, setMessageState, setSettings, unblockContact`.

**Matokeo ya kitendo:** Chat ya live inapakia conversations, kisha inashindwa kwenye `getFilters` na `listMessages`.
Ni bora kutoiwezesha live mode kwa Chat mpaka mapengo haya yafungwe.

## 7. Kilichoonekana lakini hakijarekebishwa (sababu zimeandikwa)

| Kitu | Sababu |
|---|---|
| `chatService.sendMessage` inatoa states `sent/synced/relayed/vault` kutoka connection | Inahitaji idhini: hali bila ushahidi inakiuka sheria ya PASIHAI |
| Group members demo (`Dr. Kelvin`, …) kwenye `withMembers`; counts 48/36/126 kwenye `mock.js` | Inahitaji membership halisi (Spaces backend) |
| Password update baada ya recovery link | Haipo (`updateUser`, `PASSWORD_RECOVERY`). Inahitaji route na test ya email |
| Kutuma tena uthibitisho wa email | Haipo |
| Realtime | Hakuna matumizi kwenye `src`. Inahitaji Supabase Realtime |
| Avatars (DP) | Hazionyeshwi popote; initials tu |
| Spaces, Gundua, System, Catalog live | Repositories hazipo (sehemu 6) |
| `files/modified/` na `files/new/` | Nakala za source zinazojirudia; hazikufutwa |
| Migrations 019–021 | Zimehifadhiwa kwa ukaguzi wa auth unaosubiri idhini |
| `supabase/tests/run_tests_v2.sql` | Inafuta data na kuingiza `auth.users`; ni kwa test DB tu |
| Android (Capacitor) | Hakuna gradle build iliyofanywa |
| Thread pane touch targets | Hazijapimwa (list pane tu) |
| Accessibility audit kamili | Haijafanywa |

## 7a. Uthibitisho wa ZIP (extraction test)

ZIP ilifunguliwa kwenye folda safi (`PASIHAI-source-2026-10-11/`), kisha:

| Hatua | Exit / matokeo |
|---|---|
| `zipfile.testzip()` | OK |
| `npm ci` (kutoka lockfile ya ZIP) | 0 |
| `npm run build` | 0 |
| `npm run smoke` | 0, 510/510 |
| `scripts/test-*.mjs` (29 scripts) | 29/29 exit 0 |
| `npm run db:verify` | 0; migrations 21/21; RESULTS 8/8 |
| Browser (`supabase/verify/browser-check.mjs`) dhidi ya dev server ya ZIP (port 5174) | 30/30 |

Manifest ya ZIP (`MANIFEST.txt` ndani ya ZIP) inaorodhesha faili zote na SHA-256 yake. Faili zilizotengwa kwa makusudi
zimeorodheshwa kwenye `PASIHAI-source-2026-10-11-EXCLUDED.txt`: `node_modules/`, `.git/`, `dist/`, `docs/shots/`, `PASIHAI-PREVIEW.html`.
Hakuna `.env.local`, keystore, `google-services.json` au `local.properties` kwenye ZIP. Scan ya patterns za secrets kwenye
faili za ZIP haikupata matokeo.

Nyaraka za uthibitisho zipo kwenye `docs/verification/`: matokeo ya tests (`test-results-2026-10-11.txt`), matokeo ya DB
(`db-verify-2026-10-11.txt`), browser (`browser-check-2026-10-11.json`), na mapengo ya repositories (`repo-gap-2026-10-11.json`).

## 8. Kinachohitajika ili kuthibitisha Supabase halisi

1. Project ya Supabase ya **test**, tofauti na production.
2. Migrations ziende kwenye test project kwa `supabase db push` (au SQL editor) kutoka `supabase/migrations/`.
3. Weka `.env.local` kwenye mashine yako (si chat): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_MODE=live`.
   Usiweke service_role key kwenye `.env.local` ya frontend.
4. Idhinisha wazi kwamba `supabase/verify/behavior-test.mjs` inaweza kufanyika kwenye test project hiyo (inafanya `TRUNCATE auth.users`).

Hadi hapo, hakuna madai ya Supabase integration.
