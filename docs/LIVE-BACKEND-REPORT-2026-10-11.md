# PASIHAI — Ripoti ya Live Backend (Supabase) — 2026-10-11

Hali ya jumla: **haijakamilika kwa live ya Supabase.** Kila kilichothibitishwa kimeandikwa hapa kwa kiwango chake. Hakuna jaribio la remote lililofanywa. Matokeo yote ni ya **PostgreSQL 17 + PostgREST 12.2.3 ya ndani**, si Supabase.

## 1. Viwango vya uthibitisho (usichanganye)

| Kiwango | Maana | Hali |
|---|---|---|
| Build passed | `vite build` imefanikiwa | ✅ exit 0 |
| Unit / config | Majaribio ya mantiki (mock hairuhusiwi kama ushahidi wa live) | ✅ config 16/16, cloudinary 81/81, smoke 510/510 |
| Local integration | Migrations + RLS + REST kwenye Postgres/PostgREST ya ndani | ✅ (sehemu, tazama §5) |
| Remote schema inspected | Schema ya mradi wa Supabase imesomwa | ❌ haijafanyika (inahitaji ruhusa yako) |
| Remote smoke passed | Majaribio dhidi ya mradi wa test wa Supabase | ❌ haijafanyika (inahitaji URL/key ya test) |

## 2. Sababu za mizizi (kwa dalili ulizoziona)

| Dalili | Chanzo | Hali |
|---|---|---|
| "Supabase Status haijawezeshwa" | (a) `VITE_SUPABASE_MODE=LIVE` (herufi kubwa) ilisomwa kama mock; (b) ujumbe wa jumla ulikuwa umewekwa ngumu, haukuonyesha sababu halisi. | **Imerekebishwa**: (a) mode sasa ni `toLowerCase()` (`src/lib/supabaseConfig.js`); (b) ujumbe sasa unaongeza `Sababu: …` kutoka `supabaseConfig.problems`, au `mode=…, URL/KEY imewekwa/haijawekwa` ikiwa hakuna tatizo (`src/utils/statusMedia.js`). Lazima uweke `.env.local` kwenye mzizi wa mradi na uanzishe upya dev server. |
| "Upload haijafanyika" / "Bucket … haipo" | Njia ya kosa ya Storage: bucket au sera za 017/018 hazipo kwenye mradi wa remote. | **Haijathibitishwa.** Ni dalili kwamba remote haina 017/018. Thibitisha kwa `supabase/verify/remote-inspect.sql`. |
| "Ongeza migration 015" | `live_sessions` haipo: 015 haijawekwa kwenye remote (inferensi). | **Haijathibitishwa**, kama hapo juu. |
| Chat: "Huwezi kuanzisha mazungumzo" | 012 CHECK ilikataa kila mazungumzo ya moja-kwa-moja (`title` lazima iwe na thamani) + recursion ya RLS kwenye `chat_participants`. | **Imerekebishwa ndani** kwenye `023_chat_rls_recursion_fix.sql`. |
| Status ya Cloudinary haihifadhiki | 017 `statuses_insert_own` ilikataa `media_path IS NULL` ya Cloudinary. | **Imerekebishwa ndani** kwenye `024_…sql`. |
| Ujumbe "umetumwa" hata kama haukuhifadhiwa | `chatService.sendMessage` ilitumia mock state machine (relay/mesh/foleni) na repo ya Supabase ilirudisha `null` kimya kimya. | **Imerekebishwa**: live inatupa kosa; "synced" ni kweli tu baada ya INSERT kurudisha safu. |
| Repos za mock zikifanya kazi kwenye live | `catalogRepository`, `systemRepository`, `spacesRepository` na `gunduaRepository` (isipokuwa friend methods) zilikuwa mock kabisa. | **Imerekebishwa**: kwenye live zinakataa wazi (`LIVE_NOT_IMPLEMENTED`). `systemRepository.getConnection` sasa inatumia `navigator.onLine`. |

## 3. Mabadiliko ya faili (hayajakomitiwa)

Hakuna `git add`, commit, push wala merge. `git status`: 48 M, na faili nyingi za `??` (migrations 017, 018, 022, 023, 024, `supabase/verify/`, `scripts/test-live-rest.*`, `docs/`).

- `src/lib/supabaseConfig.js`: mode `toLowerCase()`.
- `src/utils/statusMedia.js`: `StatusConfigurationError` inaonyesha sababu halisi za usanidi.
- `src/data/repositories/supabaseChatRepository.js`: `sendMessage` inakubali `{text}` au string, inatupa makosa, inarudisha umbo la UI; `listMessages` (from `me`/`them`); `getFilters` (lebo za vichujio, si data ya mtumiaji); `requireUser`.
- `src/data/repositories/index.js`: `liveNotImplemented`, `liveGuard`, proxy inakataa methods zisizo na toleo la live (hakuna mock), `systemRepository.getConnection` ya live.
- `src/services/chatService.js`: tawi la live la `sendMessage` (hakuna relay/mesh/foleni ya mock).
- `src/pages/Chat.jsx`, `src/components/chat/Thread.jsx`: makosa ya send yanaonyeshwa kwa toast, hakuna kuvunjika kwa handler.
- `supabase/migrations/023_chat_rls_recursion_fix.sql` (mpya, haijaendeshwa remote).
- `supabase/migrations/024_cloudinary_status_insert_and_media_url.sql` (mpya, haijaendeshwa remote).
- `supabase/verify/storage-rls-test.mjs` (mpya), `supabase/verify/remote-inspect.sql` (mpya, READ-ONLY).
- `scripts/test-live-rest.jsx`, `scripts/test-live-rest.mjs`, `scripts/test-supabase-config.mjs`.

## 4. Migrations

- **Local (`pasihai_fresh`, `pasihai_rest`):** 001–018, 022, 023, 024 zimeendeshwa. `run-migrations.mjs` 23/23.
- **Remote (`lbcpacijbiukqcpkfktp`):** haijakaguliwa. Hali: **haijulikani.**
- **Zinasubiri idhini:** 022, 023, 024 kwenye remote.
- **Namba 019–021:** hazipo. Zilipangwa kwenye `docs/SCHEMA-PROPOSAL-v2.md` (019 reports, 020 hidden items), lakini reports zipo kwenye 015 na hidden items kwenye 006. Namba haitaziba; migrations mpya zianze **025**.
- **Tahadhari:** majina kama `007b_…` na `008b_…` hayaendani na Supabase CLI (inataka toleo la nambari). Tumia SQL Editor kwa mpangilio, au `run-migrations.mjs`, badala ya `supabase db push`.
- **Hatua ya baadaye:** `posts_media_url_own_cloudinary` imewekwa `NOT VALID`. Ni lazima `VALIDATE CONSTRAINT` baada ya kusafisha data iliyopo.

## 5. Majaribio (matokeo halisi)

| Jaribio | Matokeo | Ushahidi |
|---|---|---|
| `run-migrations.mjs` (fresh, rest) | 23/23 | Local Postgres 17 |
| `behavior-test.mjs` (fresh) | 8/8 | Local |
| `storage-rls-test.mjs` (fresh) | **16/17** | Kushindwa 1: owner hawezi kufuta media ya status iliyofutwa (tazama §7) |
| `test-live-rest.mjs` (PostgREST ya ndani) | **30/30** | Chat (kuanzisha, kutuma, kusoma, `listMessages`, mgeni kukataliwa), status (text, Cloudinary, muda, hakuna duplicate), posts (text, Cloudinary, `media.url`), comments, likes, tamper ya profile, guard za mock |
| `test-supabase-config.mjs` | 16/16 | Config parsing |
| `test-cloudinary.mjs` | 81/81 | Cloudinary validation |
| `npm run smoke` | 510/510 | Mock mode (haijavunjwa) |
| `npm run build` | exit 0 | Vite |
| `remote-inspect.sql` (fresh) | inaendeshwa bila hitilafu | Local, read-only |

## 6. Imethibitishwa / Haijathibitishwa

**Imethibitishwa ndani (local Postgres + PostgREST):** chat RLS (mgeni hasomi wala kutuma), status expiry na visibility, status ya Cloudinary, posts za Cloudinary, comments, likes, profile counts, storage buckets ni private, storage RLS kwa upload/read/anon/expiry.

**Haijathibitishwa:**
- Mradi wa remote wa Supabase (schema, RLS, migrations, buckets) — hakuna ruhusa.
- Auth ya GoTrue: login, refresh, session restore. Hakuna GoTrue ya ndani.
- Upload halisi kwenye Supabase Storage na Cloudinary (hakuna idhini ya upload ya majaribio).
- Ukurasa wa Chat kwenye browser ya live (inahitaji login).
- `waitForSupabaseRepos()` kwenye Node bundle: inakwama (dynamic import). Haijathibitishwa kwenye browser.
- Owner-bypass (`chat_participants` NO FORCE RLS, helpers za SECURITY DEFINER) imethibitishwa kwa superuser wa ndani tu.

**Hazijatekelezwa kwenye live:**
- Realtime (`.channel`, `postgres_changes`): haipo kwenye `src`. Hakuna ujumbe wa moja kwa moja; mtumiaji anahitaji kuonyesha upya.
- Chat pagination: ni ujumbe 50 wa mwisho tu, hakuna "pakia zaidi".
- Chat: aina za ujumbe zisizo za maandishi (audio, media) zinakataliwa wazi kwenye live.
- Chat: `setMessageState`, `reactToMessage`, `createGroup`, `archiveConversation`, `blockContact` na nyingine za mock: kwenye live zinakataliwa na `LIVE_NOT_IMPLEMENTED`.
- Gundua (isipokuwa friend requests), Spaces, Catalog, System (isipokuwa connection): kwenye live zinakataliwa.
- Offline outbox / reconnect: haijaunganishwa na live.

## 7. Mapungufu na maamuzi yanayohitajika

1. **Status media orphan:** owner hawezi kufuta media ya status iliyofutwa, kwa sababu SELECT policy ya Storage inaficha media isiyo na status hai. Matokeo: cleanup ya `addStatus` haifanyi kazi kwenye live na media ya yatima hukusanyika. **Suluhisho linalopendekezwa** (haijaandikwa, inahitaji idhini): kuongeza `OR owner = auth.uid()` kwenye `status_media_select_active_visible` kwa folda ya mmiliki tu. Hii inapanua ufikiaji wa mmiliki kwa faili zake mwenyewe.
2. **Post media:** `post_media_delete_own` inamruhusu mmiliki kufuta media bado inayorejelewa na chapisho. Hii imeandikwa kama KNOWN GAP kwenye test. Uamuzi unahitajika: zuia (inahitaji sera ya kufuta inayoangalia rejea) au kubali.
3. **Auth na session restore:** haijathibitishwa. Ni kipaumbele kwa live.
4. **Remote:** inahitaji URL na publishable key ya **mradi wa test** (si production) kwenye env, au idhini ya kufanya kazi local tu.

## 8. Run / deploy (ndani)

```bash
cd pasihai
npm ci
# .env.local (weka thamani zako mwenyewe; usiweke service_role):
#   VITE_SUPABASE_URL=https://<test-ref>.supabase.co
#   VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key>
#   VITE_SUPABASE_MODE=live
npm run build
npm run dev
```

Majaribio ya ndani:
```bash
node scripts/test-supabase-config.mjs
node scripts/test-live-rest.mjs        # inahitaji Postgres + PostgREST ya ndani (tazama kichwa cha faili)
node supabase/verify/storage-rls-test.mjs pasihai_fresh
npm run smoke
```

Remote (mradi wa **test** tu, baada ya idhini):
1. Endesha `supabase/verify/remote-inspect.sql` kwenye SQL Editor. Hakuna uandishi.
2. Chukua backup/PITR kabla ya mabadiliko yoyote.
3. Tumia 017, 018 (kama hazipo), 022, 023, 024 kwa mpangilio, kwenye SQL Editor au runner.
4. Endesha `remote-inspect.sql` tena na ulinganishe matokeo.

## 9. Mpango wa rollback

- **App:** rudisha ZIP ya awali, au `git revert` ya commit ya utekelezaji. Hakuna data inayofutwa.
- **023 (chat):** `ALTER TABLE chat_conversations DROP CONSTRAINT chat_conversations_check;` kisha urejeshe kanuni ya 012. Hii itashindwa kama kuna mazungumzo ya moja-kwa-moja yaliyoundwa baada ya 023. Hapo hakuna rollback salama bila mpango.
- **024 (status/posts):** rudisha sera ya `statuses_insert_own` kama ilivyo kwenye 017. Kisha `ALTER TABLE posts DROP CONSTRAINT posts_media_url_own_cloudinary;`.
- Hakuna `DROP TABLE`, `TRUNCATE` wala `supabase db reset` kwenye production.

## 10. Maombi kwako (idhini/ruhusa)

1. Thibitisha **mradi wa test** (siyo production) na weka URL + publishable key kwenye env, au ruhusu majaribio local tu.
2. Endesha `supabase/verify/remote-inspect.sql` kwenye mradi wa test na ubandike matokeo.
3. Idhini ya kuendesha 017/018/022/023/024 kwenye test.
4. Uamuzi: suluhisho la status-media orphan (§7.1) na post-media delete (§7.2).
5. Idhini ya commit/push GitHub — **haijatolewa**.
