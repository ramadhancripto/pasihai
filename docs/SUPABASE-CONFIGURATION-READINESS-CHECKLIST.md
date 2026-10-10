# PASIHAI — Supabase Configuration Readiness Checklist

**Tarehe:** 2026-10-10  
**Lengo:** Kuthibitisha kuwa usanidi wa Supabase uko tayari kwa Home Feed integration  
**Hali ya sasa:** `VITE_SUPABASE_MODE=mock` (default, salama)

---

## ✅ VILIVYOTHIBITISHWA (Verified)

### 1. Environment Variables

- [x] **Variable names zimesanidiwa sahihi**
  - `VITE_SUPABASE_URL` — Project URL (kutoka Supabase Dashboard)
  - `VITE_SUPABASE_PUBLISHABLE_KEY` — Anon/publishable key (salama kwa browser)
  - `VITE_SUPABASE_MODE` — 'mock' au 'live' (default: 'mock')

- [x] **`.env.example` ipo na ina maelekezo**
  - Faili: `.env.example` (1,275 bytes)
  - Inaonyesha namna ya kunakili kuwa `.env.local`
  - Inaonyesha onyo kuhusu service_role key

- [x] **`.env.local` haifuatiliwi na Git**
  - `.gitignore` ina: `.env`, `.env.local`, `.env.*.local`
  - `.env.local` HAPO kwenye workspace (hakuna secrets zilizowekwa)

- [x] **Hakuna service_role au secret keys kwenye frontend code**
  - Grep search: Hakuna `service_role` au `SECRET_KEY` kwenye `src/`
  - Comment ya onyo tu: "USITUMIE service_role au secret key kwenye browser"

### 2. Supabase Client (`src/lib/supabaseClient.js`)

- [x] **Client inashughulikia vizuri kutokuwepo kwa env vars**
  - Ikiwa `VITE_SUPABASE_URL` au `VITE_SUPABASE_PUBLISHABLE_KEY` hazipo:
    - `isSupabaseConfigured = false`
    - `supabase = null` (hakuna client inayoundwa)
    - Hakuna crash, hakuna network calls
  - Build inafanikiwa na `VITE_SUPABASE_MODE=mock`

- [x] **Auth helpers zipo**
  - `getCurrentUser()` — inarudisha user au null
  - `getCurrentSession()` — inarudisha session au null
  - Zote zinatumia `supabase.auth.*` API

- [x] **Mode switch iko wazi**
  - `SUPABASE_MODE` inasomwa kutoka env
  - `isSupabaseLive = isSupabaseConfigured && SUPABASE_MODE === 'live'`
  - Default: 'mock' (salama)

### 3. Package Dependencies

- [x] **`@supabase/supabase-js` imewekwa**
  - Version: `^2.109.0`
  - Imeorodheshwa kwenye `package.json` dependencies

### 4. Migrations (Schema & RLS)

- [x] **Migration files zote zipo**
  - 10 files: `001_profiles.sql` → `008_blocks.sql` (+ 007b, 008b)
  - Jumla: 10 migrations zilizopangwa kwa utaratibu

- [x] **RLS imewezeshwa kwenye migrations**
  - 8 files zina `ENABLE ROW LEVEL SECURITY`
  - 8 files zina `CREATE POLICY` (angalau moja)

- [x] **Seed data ipo**
  - 3 files: `001_profiles.sql`, `002_follows.sql`, `003_posts.sql`
  - Zinaweza kutumika kwa test data

### 5. Repository Layer

- [x] **Supabase repositories zimeundwa**
  - `supabaseContentRepository.js` — posts, likes, bookmarks, hidden
  - `supabaseIdentityRepository.js` — profiles, follows
  - `supabaseFeedMapper.js` — Supabase rows → feed items

- [x] **Mode switch kwenye composition root**
  - `data/repositories/index.js` inachagua kati ya mock na Supabase
  - Mock ndio default (salama)

- [x] **Tests zimeandaliwa**
  - `scripts/test-supabase-repos.mjs` — 64 tests
  - Zote zimepita (64/64)

### 6. Build & Smoke Tests

- [x] **Build inafanikiwa na mock mode**
  - 162 modules transformed
  - Hakuna errors
  - Bundle: 842 KB JS, 190 KB CSS

- [x] **Smoke tests zimepita**
  - 461/461 tests passed
  - Hakuna regressions

### 7. Storage & Realtime

- [x] **Hakuna matumizi ya Storage/Realtime kwenye Phase 1**
  - Grep search: Hakuna `storage` au `realtime` kwenye client/repositories
  - Hii ni sawa — Phase 1 ni read-only (posts, profiles, follows)

---

## ❌ KILICHOKOSEKANA (Missing / Not Configured)

### 1. `.env.local` File

- [ ] **`.env.local` haijawekwa**
  - Hali: Haipo kwenye workspace
  - Athari: Supabase client ni `null`, mode ni 'mock'
  - **Hatua inayohitajika:** Nakili `.env.example` kuwa `.env.local` na ujaze:
    ```bash
    cp .env.example .env.local
    # Kisha hariri .env.local na uweke:
    # VITE_SUPABASE_URL=https://lbcpacijbiukqcpkfktp.supabase.co
    # VITE_SUPABASE_PUBLISHABLE_KEY=eyJ... (anon key)
    # VITE_SUPABASE_MODE=live
    ```

### 2. Supabase Dashboard Configuration

- [ ] **Migrations hazijatumwa kwa hosted Supabase**
  - Hali: Migrations zipo kwenye `supabase/migrations/` lakini hazijatumwa
  - Athari: Tables na RLS policies hazipo kwenye hosted database
  - **Hatua inayohitajika:** 
    - Tumia Supabase CLI: `supabase db push --linked-project lbcpacijbiukqcpkfktp`
    - Au nakili SQL kutoka migration files kwenda Supabase SQL Editor

- [ ] **Auth haijasanidiwa**
  - Hali: Hakuna ushahidi wa Auth configuration kwenye Dashboard
  - Athari: `supabase.auth.getUser()` itarudisha `null` (hakuna user logged in)
  - **Hatua inayohitajika:**
    - Supabase Dashboard → Authentication → Providers
    - Wezesha Email/Password au Magic Link
    - Jaribu kuunda test user

- [ ] **RLS policies hazijajaribiwa kwenye hosted Supabase**
  - Hali: Policies zipo kwenye migrations lakini hazijajaribiwa kwa data halisi
  - Athari: Haijulikani kama RLS inafanya kazi kama ilivyotarajiwa
  - **Hatua inayohitajika:**
    - Baada ya kutuma migrations, jaribu queries kama mtumiaji wa kawaida
    - Thibitisha kwamba `can_see_post()` na `is_blocked_by()` zinafanya kazi

### 3. Test Data

- [ ] **Seed data haijatumwa**
  - Hali: Seed files zipo lakini hazijatumwa
  - Athari: Hakuna test data kwenye hosted database
  - **Hatua inayohitajika:**
    - Tumia Supabase CLI: `supabase db seed`
    - Au tekeleza seed SQL kwenye SQL Editor

---

## ⚠️ ONYO (Warnings / Considerations)

### 1. Bundle Size

- **Hali:** `@supabase/supabase-js` inaongeza ~212 KB kwa bundle (630 KB → 842 KB)
- **Athari:** Muda wa kupakia unaongezeka kidogo
- **Mapendekezo:** Kwa production, fikiria:
  - Kutumia `@supabase/postgrest-js` pekee (ndogo zaidi, ~50 KB)
  - Dynamic import ya Supabase client (code splitting)

### 2. Auth Flow

- **Hali:** Auth helpers zipo (`getCurrentUser`, `getCurrentSession`) lakini hakuna UI ya login/logout
- **Athari:** Mtumiaji hawezi kuingia au kutoka kwenye app
- **Mapendekezo:** Kwa Phase 1B, ongeza:
  - Login page (Email/Password au Magic Link)
  - Logout button
  - Session persistence (localStorage)

### 3. Write Operations

- **Hali:** Write operations (toggleLike, addComment, addPost) ni stubs (Phase 1B)
- **Athari:** Mtumiaji hawezi kufanya vitendo kama kupenda, kucomment, au kuchapisha
- **Mapendekezo:** Kwa Phase 1B, tekeleza:
  - `INSERT` kwa reactions, comments, posts
  - `UPDATE` kwa profiles
  - `DELETE` kwa bookmarks, hidden_items

### 4. Error Handling

- **Hali:** Errors zinarudisha empty arrays (si crash)
- **Athari:** UI inaweza kuonyesha empty state badala ya error message
- **Mapendekezo:** Kwa Phase 1B, ongeza:
  - Toast notifications kwa network errors
  - Retry buttons kwa failed requests
  - Offline detection

---

## 📋 CHECKLIST YA HATUA ZINAZOHITAJIKA KUTOKA KWAKO

### Kabla ya Kuunganisha Home Feed na Supabase (Live Mode)

1. **Nakili `.env.example` kuwa `.env.local`:**
   ```bash
   cp .env.example .env.local
   ```

2. **Pata Supabase credentials kutoka Dashboard:**
   - Fungua: https://app.supabase.com/project/lbcpacijbiukqcpkfktp
   - Nenda: Settings → API
   - Nakili:
     - **Project URL** (mfano: `https://lbcpacijbiukqcpkfktp.supabase.co`)
     - **anon public key** (anza na `eyJ...`)

3. **Hariri `.env.local` na uweke credentials:**
   ```bash
   VITE_SUPABASE_URL=https://lbcpacijbiukqcpkfktp.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=eyJ... (anon key yako)
   VITE_SUPABASE_MODE=live
   ```

4. **Tuma migrations kwa hosted Supabase:**
   ```bash
   # Chaguo 1: Supabase CLI (ikiwa imewekwa)
   supabase link --project-ref lbcpacijbiukqcpkfktp
   supabase db push

   # Chaguo 2: Supabase SQL Editor (manual)
   # Fungua: Dashboard → SQL Editor
   # Nakili SQL kutoka kila migration file na utekeleze kwa utaratibu
   ```

5. **Sanidi Auth kwenye Dashboard:**
   - Fungua: Dashboard → Authentication → Providers
   - Wezesha: Email/Password (au Magic Link)
   - Unda test user (au jaribu signup)

6. **Tuma seed data (hiari):**
   ```bash
   # Chaguo 1: Supabase CLI
   supabase db seed

   # Chaguo 2: SQL Editor
   # Nakili SQL kutoka supabase/seed/*.sql na utekeleze
   ```

7. **Jaribu integration:**
   ```bash
   npm run dev
   ```
   - Fungua browser: http://localhost:5173
   - Thibitisha: Home Feed inapakia data kutoka Supabase
   - Thibitisha: Visibility inafanya kazi (public/followers/private)
   - Thibitisha: Blocks zinafanya kazi (blocked users hawaoni posts)

---

## 🎯 HITIMISHO

### Hali ya Sasa

- ✅ **Code iko tayari** — Supabase repositories, mapper, mode switch
- ✅ **Tests zimepita** — 64/64 repo tests, 461/461 smoke tests
- ✅ **Build inafanikiwa** — Hakuna errors, mock mode ni salama
- ✅ **Migrations zimeandaliwa** — 10 files, RLS policies zipo
- ❌ **`.env.local` haipo** — Inahitajika kwa live mode
- ❌ **Migrations hazijatumwa** — Inahitajika kwa hosted Supabase
- ❌ **Auth haijasanidiwa** — Inahitajika kwa user authentication

### Uko Tayari?

| Kipengele | Hali | Maelezo |
|-----------|------|---------|
| Frontend code | ✅ Tayari | Repositories, mapper, mode switch |
| Environment setup | ❌ Haijakamilika | `.env.local` inahitajika |
| Database schema | ❌ Haijakamilika | Migrations zinahitaji kutumwa |
| Auth configuration | ❌ Haijakamilika | Inahitajika kwa user login |
| Test data | ⚠️ Hiari | Seed data inahitajika kwa testing |

### Mapendekezo

1. **Kwa sasa:** Endelea na mock mode (salama, hakuna hatari)
2. **Wakati uko tayari:** Fuata hatua 7 hapo juu kuwezesha live mode
3. **Baada ya live mode:** Jaribu visibility, blocks, na edge cases

**Ukiwa na maswali au unahitaji msaada, niambie!**
