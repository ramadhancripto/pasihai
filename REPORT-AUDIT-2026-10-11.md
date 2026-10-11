# PASIHAI — FULL BACKEND, DATABASE & CLOUDINARY AUDIT

**Tarehe:** 2026-10-11  
**Branch:** `fix/pasihai-production-readiness`  
**Commit:** `25b6490` (Prepare Pasihai live backend integration)

---

## 1. MUHTASARI WA MATOKEO

| Kipengele | Hali | Maelezo |
|-----------|------|---------|
| Supabase Client Initialization | ✅ Nzuri | `supabaseConfig.js` ndiyo chanzo kimoja cha ukweli |
| Environment Variables | ⚠️ Inahitaji hatua | Majina sahihi yanajulikana; credentials hazipo kwenye repo |
| Authentication (signup/login/logout/session) | ✅ Nzuri | AuthContext + authService + AuthGate zinafanya kazi |
| Database Schema (22 migrations) | ✅ Nzuri | Tables, FK, constraints, indexes, RLS zipo |
| RLS Policies | ✅ Nzuri | FORCE RLS, hakuna anon access, ownership checks |
| Profiles & User Ownership | ✅ Nzuri | Auto-create trigger, locked fields, soft delete |
| Posts CRUD | ✅ Nzuri | INSERT/UPDATE/SELECT na RLS; soft delete |
| Comments | ✅ Nzuri | RLS, count triggers, soft delete |
| Reactions/Likes | ✅ Nzuri | PK constraint, count triggers, RLS |
| Bookmarks | ✅ Nzuri | UNIQUE constraint, RLS |
| Follows | ✅ Nzuri | PK, count triggers, RLS |
| Friendships | ✅ Nzuri | Status workflow, RLS, friends view |
| Blocks | ✅ Nzuri | PK, is_blocked_by function |
| Notifications | ✅ Nzuri | RLS, CRUD |
| Chat | ✅ Nzuri | Conversations, participants, messages, RLS |
| Spaces | ✅ Nzuri | Tables, members, RLS |
| Statuses/Stories | ✅ Nzuri | RLS, expiry, content check |
| Reports | ✅ Nzuri | RLS |
| Live Sessions | ✅ Nzuri | RLS |
| Cloudinary Integration | ✅ Nzuri | 81 tests, security checks, no secrets |
| Cloudinary + Supabase Storage coupling | 🔴 **IMEREMEDIWA** | Storage required even when Cloudinary active |
| Supabase Storage fallback code | ⚠️ Inategemea | Cloudinary ndiyo njia kuu; Storage ni fallback |
| Mock/Live mode switching | ✅ Nzuri | Composition root, lazy loading, proxies |

---

## 2. MATATIZO YALIYOREKEBISHWA

### 2.1 `supabaseContentRepository.js` — Storage Dependency Bug (CRITICAL)

**Tatizo:** `addPost()` na `addStatus()` zinakataa kufanya kazi kama `supabase.storage` haipo, hata kama Cloudinary imesanidiwa. Hii inazuia media uploads kwenye mazingira ambayo Supabase Storage bucket haijatengenezwa.

**Faili:** `src/data/repositories/supabaseContentRepository.js`  
**Mistari:** 684-686 (addPost), 1050-1052 (addStatus)

**Marekebisho:**
- `addPost()`: Badilisha ukaguzi wa lazima wa `supabase.storage` kuwa wa masharti — inahitajika tu pale ambapo Cloudinary HAIJASANIDIWA na kuna faili.
- `addStatus()`: Sawa — ukaguzi wa `supabase.storage` sasa ni wa masharti kulingana na hali ya Cloudinary.

**Athari:** Cloudinary uploads sasa zinafanya kazi bila kutegemea Supabase Storage bucket kuwepo. Supabase Storage fallback bado inafanya kazi pale Cloudinary haijapo.

---

## 3. RIPOTI YA DATABASE/BACKEND AUDIT

### 3.1 Schema (22 Migrations)

Migrations zote zilizopo zinafuata kanuni bora:

| Migration | Table/Feature | RLS | Triggers | Notes |
|-----------|---------------|-----|----------|-------|
| 001 | profiles | ✅ SELECT/UPDATE | updated_at, auto-create on signup | No INSERT policy (trigger only) |
| 002 | follows | ✅ SELECT/INSERT/DELETE | count updates (SECURITY DEFINER) | PK = (follower_id, followee_id) |
| 003 | posts | ✅ SELECT/INSERT/UPDATE | updated_at, count protection | can_see_post(), is_blocked_by() |
| 004 | reactions | ✅ SELECT/INSERT/DELETE | count updates (SECURITY DEFINER) | PK = (user_id, post_id) |
| 005 | bookmarks | ✅ SELECT/INSERT/DELETE | — | UNIQUE(user_id, ref_type, ref_id) |
| 006 | hidden_items | ✅ SELECT/INSERT/DELETE | — | PK = (user_id, post_id) |
| 007 | friendships | ✅ SELECT/INSERT/UPDATE | friends view, count updates | Status workflow: pending→accepted/declined |
| 007b | can_see_post update | — | — | Adds friends check |
| 008 | blocks | ✅ SELECT/INSERT/DELETE | — | PK = (blocker_id, blocked_id) |
| 008b | is_blocked_by update | — | — | Uses blocks table |
| 009 | comments | ✅ SELECT/INSERT/UPDATE/DELETE | comment count, updated_at | Soft delete |
| 010 | polls | — | — | (Poll support) |
| 011 | shares | ✅ | count updates | — |
| 012 | chat | ✅ (3 tables) | conversation timestamp | Conversations, participants, messages |
| 013 | notifications | ✅ | — | CRUD, unread count function |
| 014 | spaces | ✅ (3 tables) | updated_at | spaces, space_members, space_posts |
| 015 | live_sessions, statuses, reports | ✅ (3 tables) | updated_at | — |
| 016 | idempotency_keys | — | — | Duplicate prevention |
| 017 | status media Storage | ✅ | — | Private bucket, content check |
| 018 | post media Storage | ✅ | — | Private bucket, media_path column |
| 019 | can_see_post update | — | — | — |
| 020 | is_blocked_by update | — | — | — |
| 022 | post counts guard fix | — | protect_post_counts fix | pg_trigger_depth() check |

### 3.2 RLS Security Audit

- ✅ FORCE RLS enabled on ALL tables
- ✅ Hakuna INSERT/SELECT policy kwa `anon` role
- ✅ `profiles` haina INSERT policy (trigger pekee — inazuia fake profiles)
- ✅ `posts` haina DELETE policy (soft delete pekee)
- ✅ Count protection trigger (`protect_post_counts`) si SECURITY DEFINER (inatumia `pg_trigger_depth()`)
- ✅ Count update triggers (reactions, follows, friends) ni SECURITY DEFINER
- ✅ `can_see_post()` ni SECURITY DEFINER STABLE
- ✅ `is_blocked_by()` ni SECURITY DEFINER STABLE

### 3.3 Data Integrity

- ✅ Foreign keys zote zina ON DELETE CASCADE
- ✅ CHECK constraints kwenye: entity_type, avatar_tone, visibility, kind, emoji, status
- ✅ UNIQUE constraints kuzuia duplicates
- ✅ Soft delete pattern (deleted_at columns)
- ✅ Denormalized counts zinasasishwa na triggers (si client)

---

## 4. RIPOTI YA CLOUDINARY INTEGRATION

### 4.1 Architecture

Cloudinary integration imefanywa kwa usahihi:

1. **Config:** `readCloudinaryConfig()` inasoma `VITE_CLOUDINARY_CLOUD_NAME` na `VITE_CLOUDINARY_UPLOAD_PRESET`
2. **Mode detection:** `on` / `off` / `broken` (moja tu imewekwa)
3. **Upload:** `uploadMediaToCloudinary()` — unsigned upload kwa Cloudinary API
4. **Validation:** MIME type, file size, resource type, URL ownership
5. **Security:** No secrets in frontend, URL validation, folder check
6. **Metadata:** `cloudinaryMediaMeta()` inahifadhi provider, publicId, format, bytes, dimensions

### 4.2 Upload Flow (Post)

```
User → File Select → validatePostMediaFile() → uploadMediaToCloudinary()
  → Cloudinary API (unsigned preset) → secure_url + public_id
  → posts INSERT (media_url, media_meta with provider/cloudinary)
  → Feed displays media via secure_url
```

### 4.3 Upload Flow (Status)

```
User → File Select → validateStatusDraft() → uploadMediaToCloudinary()
  → Cloudinary API → secure_url
  → statuses INSERT (media_url, media_path=NULL, media_type)
  → Status displays media via secure_url
```

### 4.4 Security Checks (81 tests zilizopita)

- ✅ Config validation (on/off/broken)
- ✅ URL ownership verification (cloud name, host, path)
- ✅ MIME type validation before network
- ✅ File size limits
- ✅ HTTP error handling (400, 429, 502)
- ✅ Timeout handling
- ✅ Foreign URL rejection
- ✅ Folder boundary enforcement
- ✅ Resource type mismatch detection
- ✅ Concurrent upload prevention
- ✅ No API secret in src/, scripts/, env files
- ✅ Cloudinary on/off mode switching
- ✅ Supabase Storage fallback when cloud=off

### 4.5 Database Storage

Cloudinary assets zinahifadhiwa kwenye `posts` table:
- `media_url`: Cloudinary `secure_url`
- `media_path`: NULL (hakuna Supabase Storage path)
- `media_meta`: JSONB with `{ provider: 'cloudinary', publicId, resourceType, format, bytes, width, height, duration }`

---

## 5. MAREKEBISHO YALIYOFANYWA

### Faili Zilizobadilishwa

| Faili | Sababu |
|-------|--------|
| `src/data/repositories/supabaseContentRepository.js` | Ondoa utegemezi wa lazima wa `supabase.storage` pale Cloudinary inapokuwa active |

### Maelezo ya Mabadiliko

**`supabaseContentRepository.js` — `addPost()` method (line ~684):**

Kabla:
```javascript
if (!supabase?.auth || !supabase?.storage) {
  throw new NetworkError('Supabase client/Storage haijasanidiwa...')
}
```

Baada:
```javascript
if (!supabase?.auth) {
  throw new NetworkError('Supabase client haijasanidiwa...')
}
const useCloudinaryForPost = file && cloudinaryConfig.mode !== 'off'
if (file && !useCloudinaryForPost && !supabase?.storage) {
  throw new NetworkError('Supabase Storage haijasanidiwa na Cloudinary haijawekwa...')
}
```

**`supabaseContentRepository.js` — `addStatus()` method (line ~1050):**

Kabla:
```javascript
if (st.file && !supabase?.storage) {
  throw new SchemaError('Supabase Storage client haijaandaliwa...')
}
```

Baada:
```javascript
const useCloudinary = Boolean(st.file) && cloudinaryConfig.mode !== 'off'
if (st.file && !useCloudinary && !supabase?.storage) {
  throw new SchemaError('Supabase Storage client haijaandaliwa na Cloudinary haijawekwa...')
}
```

---

## 6. MATOKEO YA BUILD NA TESTS

| Test Suite | Matokeo |
|-----------|---------|
| Supabase Config Tests | ✅ 16/16 passed |
| Cloudinary Tests | ✅ 81/81 passed |
| Supabase Repository Tests | ✅ 66/66 passed |
| Auth Tests | ✅ 23/23 passed |
| Supplemental Tests | ✅ 17/17 passed |
| Offline Tests | ✅ 41/41 passed |
| Network Failure Tests | ✅ 18/18 passed |
| Idempotency Tests | ✅ 41/41 passed |
| Outbox Safety Tests | ✅ 21/21 passed |
| Failure Scenarios | ✅ 24/24 passed |
| Smoke Tests (SSR) | ✅ 510/510 passed |
| Production Build | ✅ 229 modules, 4.14s |

**Jumla: 858/858 tests zilizopita**

### Tests ambazo hazikuweza kufanywa (credentials/access)

| Test | Sababu |
|------|--------|
| Live Supabase connection | Inahitaji VITE_SUPABASE_PUBLISHABLE_KEY halisi |
| Live authentication (signup/login) | Inahitaji Supabase project na email confirmation |
| Live database CRUD | Inahitaji schema iliyotumika kwenye production Supabase |
| Live Cloudinary upload | Inahitaji VITE_CLOUDINARY_CLOUD_NAME na UPLOAD_PRESET halisi |
| Netlify deployment | Inahitaji Netlify dashboard access |
| Supabase migration execution | Inahitaji Supabase dashboard access |

---

## 7. `.ENV.EXAMPLE` (imesasishwa)

Tazama faili `.env.example` kwenye repository. Ina:

**Frontend (VITE_*):**
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon key (SI service_role)
- `VITE_SUPABASE_MODE` — `mock` au `live`
- `VITE_CLOUDINARY_CLOUD_NAME` — Cloudinary cloud name
- `VITE_CLOUDINARY_UPLOAD_PRESET` — Cloudinary unsigned upload preset

**Backend ONLY (sio VITE_*, si kwenye frontend):**
- `CLOUDINARY_URL` — Cloudinary API URL (signed uploads, bado haijatekelezwa)

---

## 8. DEPLOYMENT CHECKLIST

### 8.1 Supabase Dashboard

- [ ] **Thibitisha project** `lbcpacijbiukqcpkfktp` ni sahihi
- [ ] **Run migrations** (kwa mpango, moja baada ya nyingine):
  ```sql
  -- Endesha kwenye Supabase SQL Editor, kwa mpango:
  \i 001_profiles.sql
  \i 002_follows.sql
  \i 003_posts.sql
  \i 004_reactions.sql
  \i 005_bookmarks.sql
  \i 006_hidden_items.sql
  \i 007_friendships.sql
  \i 007b_update_can_see_post.sql
  \i 008_blocks.sql
  \i 008b_update_is_blocked_by.sql
  \i 009_comments.sql
  \i 010_polls.sql
  \i 011_shares.sql
  \i 012_chat.sql
  \i 013_notifications.sql
  \i 014_spaces.sql
  \i 015_live_statuses_reports.sql
  \i 016_idempotency_keys.sql
  \i 017_status_media_storage_rls.sql
  \i 018_post_media_storage_rls.sql
  \i 019_update_can_see_post.sql
  \i 020_update_is_blocked_by.sql
  \i 022_post_counts_guard_fix.sql
  ```
- [ ] **Verify schema**: Angalia tables, RLS policies, triggers
- [ ] **Pata API keys**: Settings → API → `anon` (publishable) key
- [ ] **Auth settings**: Hakikisha email confirmation imewashwa/imezimwa kulingana na mahitaji

### 8.2 Cloudinary Dashboard

- [ ] **Unda upload preset** (unsigned):
  - Jina: `pasihai_preset` (au jina lingine)
  - Signing mode: **Unsigned**
  - Folder: `pasihai`
  - Allowed formats: `jpg,png,webp,gif,mp4,webm,mov`
  - Max file size: 50MB
  - Resource type: Auto
- [ ] **Pata cloud name**: Settings → Account → Cloud name
- [ ] **Restrictions**: Weka restrictions za preset (folder, formats, size)

### 8.3 Netlify Dashboard

- [ ] **Site settings → Build & deploy → Environment variables**:
  ```
  VITE_SUPABASE_MODE=live
  VITE_SUPABASE_URL=https://lbcpacijbiukqcpkfktp.supabase.co
  VITE_SUPABASE_PUBLISHABLE_KEY=<pata kutoka Supabase Dashboard>
  VITE_CLOUDINARY_CLOUD_NAME=<pata kutoka Cloudinary Dashboard>
  VITE_CLOUDINARY_UPLOAD_PRESET=<jina la preset ulilotengeneza>
  ```
- [ ] **Trigger rebuild** baada ya kuweka env vars (VITE_* zinaingizwa wakati wa build)
- [ ] **Verify build logs** — hakuna errors
- [ ] **Test production** — login, create post, upload media, refresh

### 8.4 Post-Deployment Verification

- [ ] **Login/Signup** inafanya kazi
- [ ] **Session persistence** — refresh haipotezi session
- [ ] **Create text post** — inaonekana kwenye feed
- [ ] **Create image post** — picha inapakiwa Cloudinary, inaonekana kwenye feed
- [ ] **Create video post** — video inapakiwa Cloudinary
- [ ] **Refresh** — posts na media zinabaki
- [ ] **Login tena** — data haipotei
- [ ] **Error handling** — upload failure inaonyesha kosa sahihi
- [ ] **Status creation** — text na media status zinafanya kazi
- [ ] **Comments, likes, bookmarks** — zinafanya kazi

---

## 9. MAMBO YANAYOHITAJI CREDENTIALS AU HATUA YAKO

1. **Supabase anon key** — Pata kutoka Supabase Dashboard → Settings → API. Weka kwenye Netlify env vars.

2. **Cloudinary cloud name na upload preset** — Tengeneza Cloudinary account, unda unsigned upload preset, weka kwenye Netlify env vars.

3. **Run database migrations** — Endesha SQL migrations kwenye Supabase SQL Editor (angalia checklist hapo juu).

4. **Netlify rebuild** — Baada ya kuweka env vars, trigger rebuild kwenye Netlify dashboard.

5. **Email confirmation settings** — Amua kama unataka email confirmation kwenye Supabase Auth settings.

6. **Cloudinary preset restrictions** — Weka vizuri ili kuzuia abuse (folder, formats, size limits).

---

## 10. MAPUNGUFU YANAYOJULIKANA (si za kuzuia production)

| Kipengele | Hali | Maelezo |
|-----------|------|---------|
| Spaces CRUD | Mock | Tables zipo, code ya live bado |
| Live Sessions | Mock | Table ipo, code ya live bado |
| Polls | Mock | Table ipo, code ya live bado |
| Discovery/Gundua | Partial | Friendships live, discovery mock |
| Signed uploads (backend) | Haitumika | Cloudinary unsigned preset inatumika |
| Offline sync | Local only | Outbox + IndexedDB, si server sync |
| Post deletion (hard) | Soft delete | `deleted_at` pattern, hakuna hard DELETE |
| Admin role | Haipo | RLS ni user pekee, hakuna admin panel |
| WebSocket/Realtime | Haitumika | Supabase Realtime bado haijaunganishwa |

---

## 11. ARCHITECTURE SUMMARY

```
┌─────────────────────────────────────────────────────────────┐
│  main.jsx → AuthProvider → AuthGate → App                   │
├─────────────────────────────────────────────────────────────┤
│  UI (pages/components)                                      │
│    ↓                                                        │
│  Services (feedService, authService, chatService, ...)      │
│    ↓                                                        │
│  Repository Index (composition root — mode switch)          │
│    ├── mock repositories (local state)                      │
│    └── supabase repositories (lazy loaded)                  │
│         ├── supabaseContentRepository (posts, statuses)     │
│         ├── supabaseIdentityRepository (profiles, follows)  │
│         ├── supabaseActivityRepository (notifications)      │
│         ├── supabaseChatRepository (conversations, messages)│
│         └── supabaseFriendshipRepository (friendships)      │
├─────────────────────────────────────────────────────────────┤
│  Cloudinary (media uploads) ← cloudinary.js                 │
│  Supabase Auth (login/session) ← supabaseClient.js          │
│  Supabase DB (data) ← @supabase/supabase-js                 │
│  IndexedDB (offline cache) ← contentCache.js                │
└─────────────────────────────────────────────────────────────┘
```

---

*Ripoti hii imetengenezwa baada ya ukaguzi wa kina wa source code yote, migrations, tests, na integration flows.*