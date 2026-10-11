# PASIHAI — Usanidi, Uendeshaji na Deploy

Hati hii ni ya kutoka kwenye ZIP ya source. Kila amri hapa imeendeshwa kwenye ZIP iliyofunguliwa upya (tazama `docs/VERIFICATION-REPORT-2026-10-11.md`).

## 1. Mahitaji

- Node.js 20 au zaidi, npm 10 au zaidi.
- Kwa majaribio ya database ya ndani: PostgreSQL 15 au 17 (au binaries za `@embedded-postgres`).
- Kwa Supabase halisi: akaunti ya Supabase na project ya **test** (si production).
- Kwa Android: Android Studio na JDK (hiari, hatua ya baadaye).

## 2. Kusakinisha

```bash
npm ci
```

`npm ci` inatumia `package-lock.json`. Usitumie `npm install` kwenye CI.

## 3. Kuendesha kwenye mock mode (bila Supabase)

```bash
npm run dev          # http://localhost:5173
npm run build        # build ya production -> dist/
npm run smoke        # render + architecture guard (510 checks)
```

Mock mode ni default. Data yote inatoka `src/data/mock.js` na store ya kumbukumbu. **Mock mode si uthibitisho wa
tabia ya live.** Chat, Spaces na Gundua hazina backend ya live (tazama `docs/MASTER-CHECKLIST-2026-10-11.md`).

## 4. Usanidi wa environment

```bash
cp .env.example .env.local
```

Jaza `.env.local` kwenye mashine yako. **Usiweke `.env.local` kwenye Git wala ZIP.**

| Variable | Maelezo |
|---|---|
| `VITE_SUPABASE_URL` | URL ya project ya **test** (Dashboard → Settings → API) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable/anon key. Ni salama kwenye browser; RLS ndiyo ulinzi |
| `VITE_SUPABASE_MODE` | `mock` (default) au `live`. Usibadilishe kuwa `live` mpaka schema na RLS ziwe tayari |

**Usiweke kamwe** service_role key, database password, au secret yoyote kwenye variables zenye `VITE_` (zinaingia kwenye browser bundle).

## 5. Supabase: migrations

Tekeleza `supabase/migrations/` kwa mpangilio wa jina. Hii ni orodha halisi (21 kwa idadi, pamoja na 007b na 008b):

```
001_profiles.sql            010_polls.sql               018_post_media_storage_rls.sql
002_follows.sql             011_shares.sql              022_post_counts_guard_fix.sql
003_posts.sql               012_chat.sql
004_reactions.sql           013_notifications.sql
005_bookmarks.sql           014_spaces.sql
006_hidden_items.sql        015_live_statuses_reports.sql
007_friendships.sql         016_idempotency_keys.sql
007b_update_can_see_post.sql
008_blocks.sql              017_status_media_storage_rls.sql
008b_update_is_blocked_by.sql
009_comments.sql
```

Kwa project ya test kwa Supabase CLI (inahitaji `supabase link` kwa project ya test):

```bash
supabase link --project-ref <TEST_PROJECT_REF>
supabase db push
```

**Usiendeshe `supabase db push` kwenye production bila mpango.** Hakuna migration ya kuondoa data; lakini migrations
zote zinaongeza schema na policies kwenye database iliyopo.

Ikiwa unatumia SQL editor badala ya CLI, tekeleza kila faili kwa mpangilio huo, mmoja mmoja.

## 6. Majaribio ya database ya ndani (bila Supabase)

Hii inathibitisha migrations kwenye Postgres safi na RLS msingi. **Si Supabase halisi.** Shim inaiga `auth`, `storage`
na roles za Supabase.

```bash
# 1) Anzisha Postgres ya ndani (mfano kwa embedded-postgres au Postgres yako), iwe 127.0.0.1:54329
# 2) Endesha:
npm run db:verify
```

Matarajio: `migrations applied: 21/21` na `RESULTS: 8/8 passed`.

Harness inakataa host isiyo ya localhost (`PG_HOST`), kwa sababu inafuta database na inafanya `TRUNCATE auth.users`.
Usiielekeze kwenye project ya Supabase bila idhini ya wazi.

## 7. Majaribio ya Supabase test project (bado hayajafanywa)

Baada ya kuweka `.env.local` yenye project ya test:

1. Tekeleza migrations (sehemu 5).
2. Jaribu signup, email confirmation, login, session reload, logout.
3. Jaribu RLS kwa watumiaji wawili tofauti.
4. Usiendeshe `supabase/tests/run_tests_v2.sql` (inafuta data) isipokuwa kwenye project ya test iliyoidhinishwa.

## 8. Deploy (hatua ya baadaye)

- Web: `npm run build` kisha weka folda `dist/` kwenye static host (Netlify, Vercel au Cloudflare Pages). Weka
  `VITE_*` variables kwenye host kabla ya build.
- Android: `capacitor.config.json` ipo; build ya APK haijathibitishwa kwenye ZIP hii. Fuata `PASIHAI_ANDROID_BUILD_GUIDE.md`.
- Production Supabase: tekeleza migrations baada ya kuthibitisha kwenye test project, na kwa idhini ya wazi.

## 9. Kuunganisha ZIP na GitHub bila kupoteza kazi

Kabla ya kuhamisha, kagua kazi iliyopo kwenye repo ya awali:

```bash
git status --short          # angalia mabadiliko yote yasiyo commit
git branch --show-current
```

Mapendekezo:
1. Usitumie `git add .` au `git add -A`. Ongeza faili kwa jina, kwa makundi yanayohusiana (mfano: `src/pages/Chat.jsx src/components/chat/Thread.jsx`).
2. Tengeneza branch mpya kwa kila kundi (mfano: `chat/direct-presence-archive`, `db/post-counts-guard`).
3. Migrations 015, 017, 018 na faili za creative/post studio ni kazi za awali zisizo commit. Zikague kabla ya kuziingiza.
4. Hakuna remote kwenye repo hii sasa. Ongeza `origin` kwa URL ya GitHub utakayotoa, kisha push branch husika.
5. Usifute, reset, rebase, merge au push bila idhini ya wazi.

## 10. Kile ambacho hakijathibitishwa

Tazama `docs/VERIFICATION-REPORT-2026-10-11.md` sehemu 1 na 7. Hasa: Supabase hosted, realtime, password update baada ya recovery,
live Chat, Spaces, Gundua, System, avatars, Android build.
