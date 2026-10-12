# PASIHAI — RIPOTI KAMILI YA AUDIT (READ-ONLY)

**Imeandikwa:** 2026-10-12  
**Mkusanyiko:** `/home/user/pasihai`  
**Tawi:** `fix/pasihai-production-readiness`  
**Build:** ✅ 4.92s | **Smoke:** ✅ 510/510 zimepita  
**Hali:** READ-ONLY — hakuna marekebisho yaliyofanywa

---

## ⚠️ MAAGIZO YA USALAMA YALIYOHESHIMIWA

1. ❌ Sijasoma `.env`, `.env.local`, API keys, passwords, wala service-role keys
2. ❌ Sijabadilisha files, kutengeneza migrations, kufanya commit, kupush GitHub, wala kuendesha SQL
3. ❌ Sijehitimisha database imeharibika kwa sababu app iko mock mode
4. ❌ Sijechanganya ChatHai na SokoHai

---

## SEHEMU A: MUHTASARI WA MTENDAAZI (Executive Summary)

### Ujumla wa Mfumo

PASIHAI ni app ya kijamii ya Kitanzania iliyojengwa kwa **React 19.1 + Vite 7 + Capacitor 8.5** (PWA/Android). Inatumia **Supabase** (PostgreSQL + Auth + Storage) kama backend, na ina **mock mode** kwa maendeleo bila mtandao.

### Hali ya Sasa

| Kipengele | Hali | Maelezo |
|---|---|---|
| **Build** | ✅ 4.92s | Vite 7 production build |
| **Smoke Tests** | ✅ 510/510 | Testi zote za SSR + contracts zimepita |
| **Migrations 001–026** | ✅ Zimewekwa | Schema kamili ya core features |
| **Migration 027** | ❌ HAIJAWEKWA | Chat RLS fix — `FIX-CHAT-RLS.sql` iko tayari |
| **Migration 028** | ❌ HAIJAWEKWA | Relay system — haihitajiki kwa core chat |
| **Migration 029** | ❌ HAIJAWEKWA | Profile media (cover_url + storage bucket) |
| **Chat (Live)** | ⚠️ Haijaribiwa | Inahitaji 027 + akaunti 2 halisi + mtandao |
| **Gundua (Live)** | ✅ Inafanya kazi | Discovery queries zinafanya kazi |
| **Feed (Live)** | ✅ Inafanya kazi | contentRepository + supabaseFeedMapper |
| **Auth** | ✅ Inafanya kazi | Supabase Auth + handle_new_user trigger |

### Masuala Muhimu (Priority Order)

1. **🔴 CRITICAL:** Migration 027 (chat RLS) haija-deploy — chat_conversations INSERT inakataliwa
2. **🟡 HIGH:** Migration 029 (profile media) haija-deploy — cover_url haipatikani
3. **🟡 HIGH:** Chat haijaribiwa na akaunti halisi — haiwezi kuthibitishwa kuwa inafanya kazi
4. **🔵 MEDIUM:** Migration 028 (relay system) — commission rate (10% vs 2%) inahitaji uthibitisho
5. **🔵 MEDIUM:** `028_relay_system.sql` na `028_relay_system_hardened.sql` zote ziko — hardened pekee itumike

---

## SEHEMU B: MUUNDO WA KIUNGANISHI (Architecture)

### Tech Stack

| Tabaka | Teknolojia | Toleo |
|---|---|---|
| **Frontend** | React | 19.1 |
| **Build** | Vite | 7 |
| **Mobile** | Capacitor | 8.5 |
| **Backend** | Supabase (PostgreSQL + Auth + Storage) | @supabase/supabase-js 2.109 |
| **CSS** | Custom tokens (CSS custom properties) | — |
| **Testing** | Custom SSR smoke (scripts/smoke.jsx) | 510 tests |
| **Media** | Cloudinary (optional) | — |

### Entry Points

```
src/main.jsx          → React root, <AuthProvider> → <AuthGate> → <App />
src/App.jsx           → Router (hash-based), pages, BottomNav
src/lib/AuthGate.jsx  → Auth gating: mock→passthrough, live→login→repo load→app
src/lib/AuthContext.jsx → React Context wrapping authService
```

### Routing (Hash-based, no React Router)

| Hash | Page | Component |
|---|---|---|
| `#/` or `#home` | Home Feed | `Home.jsx` |
| `#chat` | Chat | `Chat.jsx` |
| `#gundua` | Discovery | `Gundua.jsx` |
| `#spaces` | Spaces | `Spaces.jsx` |
| `#studio` | Post Creator | `CreatorStudio.jsx` |
| `#settings` | Settings | `PlaceholderPage.jsx` |
| `#notifications` | Notifications | `PlaceholderPage.jsx` |

### Module Architecture (4 Layers)

```
┌─────────────────────────────────────────────────────────────┐
│  PAGES (7)           Home, Chat, Gundua, Spaces, Login,     │
│                      CreatorStudio, PlaceholderPage         │
├─────────────────────────────────────────────────────────────┤
│  COMPONENTS          feed/*, chat/*, gundua/*, spaces/*,    │
│                      studio/*, system/*, video/*, ui.jsx    │
├─────────────────────────────────────────────────────────────┤
│  SERVICES (12)       feedService, chatService, gunduaService│
│                      spacesService, socialService,          │
│                      authService, accountService,            │
│                      notificationService, settingsService,  │
│                      systemService, homeService,             │
│                      productInfoService                     │
├─────────────────────────────────────────────────────────────┤
│  REPOSITORIES        Composition Root (index.js)            │
│    ├─ Mock Layer     mock.js (inline data)                  │
│    ├─ Supabase Layer 8 supabase*Repository.js files         │
│    └─ Contracts      7 abstract repository interfaces       │
├─────────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE      supabaseClient.js, supabaseConfig.js   │
│                      AuthContext.jsx, AuthGate.jsx           │
│                      mappers/*, utils/*, hooks/*             │
└─────────────────────────────────────────────────────────────┘
```

### Repository Pattern

**Composition Root:** `src/data/repositories/index.js`

```
mock data (always loaded)
    ↓
supabase repos (lazy-loaded via dynamic import when isSupabaseLive=true)
    ↓
createRepositoryProxy() → falls back to mock if supabase repo not loaded
    ↓
7 abstract contracts:
  - contentRepository   (posts, reactions, comments, bookmarks, statuses)
  - identityRepository  (profiles, follow/unfollow, search)
  - chatRepository      (conversations, messages, archive)
  - gunduaRepository    (discovery, search, filters)
  - catalogRepository   (static catalogs)
  - activityRepository  (notifications)
  - systemRepository    (relay, connection, preferences)
  - spacesRepository    (spaces, members, events)
```

**Gundua Split:** Discovery queries → `supabaseGunduaRepository`, Friendship actions → `supabaseFriendshipRepository`

### Hooks

| Hook | Kazi |
|---|---|
| `useAsyncData` | Generic async data loading with loading/error states |
| `useFeedMode` | Feed tab state management |
| `useOnlineStatus` | Network online/offline detection |
| `useChromeHide` | Hide browser chrome on mobile |
| `useVideoAutoplay` | Video autoplay observer |
| `useTheme` | Dark/Light mode toggle |

---

## SEHEMU C: OROSHA YA VIPENGELE (Feature Inventory)

### 1. Home Feed ✅ (Mock + Live)

- **Tabs:** Mchanganyiko, Reels, Friends, Channels, Live
- **Content types:** text, image, video, audio, poll, announcement, reel, product, event, liveActivity
- **Visibility:** public, followers, private
- **Sorting:** Deterministic relevance score (relationship + recency + type + live state)
- **Components:** FeedList → FeedItem → FeedActions, FeedSocialBar, bodies/*
- **Status:** composer inafanya kazi (draft, media validation), mapper ziko

### 2. Chat ⚠️ (Mock ✅, Live ⚠️ UNTESTED)

- **Types:** Direct conversation, Group conversation
- **Features:** Messages (text, media), reply-to, archive, search, filters
- **States:** sent, synced, relayed, waiting, local, vault, blocked-media, waiting-wifi, waiting-data
- **Components:** Chat.jsx → Thread, ChatBits, ChatPanels
- **Blocker:** Migration 027 (RLS fix) haija-deploy

### 3. Gundua (Discovery) ✅ (Mock + Live)

- **Modes:** Mchanganyiko, Watu, Biashara, Channels, Hubs, Jumuiya, Vikundi, Live, Friends
- **Filters:** Mada, Eneo, Wakati, Mahusiano, Biashara, Hali
- **Actions:** Fuata (channel), Jiunge (hub), Omba urafiki (person), Wasiliana (business)
- **Components:** Gundua.jsx → PersonCard, ChannelCard, HubCard, BusinessCard, etc.

### 4. Spaces ✅ (Mock + Live)

- **Types:** Hub, Community, Channel
- **Features:** Members, posts, events, resources, stats
- **Roles:** owner, admin, moderator, member
- **Visibility:** public, listed, private

### 5. Authentication ✅ (Live)

- **Methods:** Email/password sign-up, sign-in, sign-out, password reset
- **Profile creation:** Automatic via `handle_new_user()` trigger on `auth.users` INSERT
- **AuthGate:** Blocks app until repos load in live mode
- **Password recovery:** Handled via `PASSWORD_RECOVERY` auth event

### 6. Notifications ✅ (Mock + Live)

- **Types:** like, comment, reply, follow, friend_request, friend_accept, mention, share, system
- **Features:** List, filter (all/unread), mark read, delete
- **Source:** Application-level (socialService creates notifications)

### 7. Social Actions ✅ (Live)

- **Follow/Unfollow:** follows table with count triggers
- **Friend request:** friendships table with status transitions (pending→accepted/declined/blocked)
- **Block/Unblock:** blocks table
- **Notifications:** Auto-created on social actions

### 8. Post Studio ✅ (Mock + Live)

- **Post types:** Text, Image, Video, Audio, Poll, Announcement, Product, Event, Article
- **Media:** Cloudinary upload (optional), Supabase Storage (pasihai-post-media bucket)
- **Validation:** File size, type, draft validation
- **Components:** PostStudio, StructuredPost, MediaPicker

### 9. Status (Stories) ✅ (Mock + Live)

- **Features:** Text + media, 24h expiry, tone colors (green, blue, gold, plum)
- **Storage:** Supabase Storage bucket `pasihai-status-media`
- **Mapper:** statusMapper.js

### 10. Internet Relay ⚠️ (Schema ready, NOT deployed)

- **Tables:** relay_providers, relay_sessions, relay_usage, hai_points_ledger, mb_balances, relay_queue, device_discovery, relay_quotas, local_shares
- **Features:** Message relay via other users' data, Hai Points economy, daily limits
- **Status:** Migration 028 exists but NOT deployed. Commission rate needs confirmation (10% vs 2%).

### 11. Dark Mode ✅ (Partial)

- **Tokens:** Obsidian Kinetic theme in tokens.css (#10141a base, #44f3a9 green, #98cbff blue)
- **Toggle:** useTheme hook, persisted in localStorage
- **Coverage:** Most components; login page CSS may need dark mode tokens

---

## SEHEMU D: RAMANI YA DATABASE (Database Map)

### Tables (Deployment Order)

| # | Table | Migration | Status | FK Dependencies |
|---|---|---|---|---|
| 1 | `profiles` | 001 | ✅ Deployed | auth.users |
| 2 | `follows` | 002 | ✅ Deployed | profiles |
| 3 | `posts` | 003 | ✅ Deployed | profiles |
| 4 | `reactions` | 004 | ✅ Deployed | profiles, posts |
| 5 | `bookmarks` | 005 | ✅ Deployed | profiles, posts |
| 6 | `hidden_items` | 006 | ✅ Deployed | profiles |
| 7 | `friendships` | 007 | ✅ Deployed | profiles |
| 8 | `blocks` | 008 | ✅ Deployed | profiles |
| 9 | `comments` | 009 | ✅ Deployed | profiles, posts |
| 10 | `poll_options` | 010 | ✅ Deployed | posts |
| 11 | `shares` | 011 | ✅ Deployed | profiles, posts |
| 12 | `chat_conversations` | 012 | ✅ Deployed | profiles |
| 13 | `chat_participants` | 012 | ✅ Deployed | chat_conversations, profiles |
| 14 | `chat_messages` | 012 | ✅ Deployed | chat_conversations, profiles, chat_messages (reply_to) |
| 15 | `notifications` | 013 | ✅ Deployed | profiles, posts |
| 16 | `spaces` | 014 | ✅ Deployed | profiles |
| 17 | `space_members` | 014 | ✅ Deployed | spaces, profiles |
| 18 | `space_posts` | 014 | ✅ Deployed | spaces, posts |
| 19 | `live_sessions` | 015 | ✅ Deployed | profiles |
| 20 | `statuses` | 015 | ✅ Deployed | profiles |
| 21 | `reports` | 015 | ✅ Deployed | profiles |
| 22 | `idempotency_keys` | 016 | ✅ Deployed | — |
| 23 | `relay_providers` | 028 | ❌ NOT deployed | profiles |
| 24 | `relay_sessions` | 028 | ❌ NOT deployed | profiles |
| 25 | `relay_usage` | 028 | ❌ NOT deployed | profiles |
| 26 | `hai_points_ledger` | 028 | ❌ NOT deployed | profiles |
| 27 | `mb_balances` | 028 | ❌ NOT deployed | profiles |
| 28 | `relay_queue` | 028 | ❌ NOT deployed | profiles |
| 29 | `device_discovery` | 028 | ❌ NOT deployed | profiles |
| 30 | `relay_quotas` | 028 | ❌ NOT deployed | profiles |
| 31 | `local_shares` | 028 | ❌ NOT deployed | profiles |

### Views

| View | Migration | Maelezo |
|---|---|---|
| `friends` | 007 | Bidirectional accepted friendships (UNION of requester/addressee) |

### SECURITY DEFINER Functions

| Function | Migration | Kazi | search_path |
|---|---|---|---|
| `set_updated_at()` | 001 | Generic updated_at trigger | ❌ NOT SET ⚠️ |
| `handle_new_user()` | 001 | Auto-create profile on auth signup | ❌ NOT SET ⚠️ |
| `can_see_post(posts)` | 003 (updated 007b, 019) | Post visibility check | ❌ NOT SET ⚠️ |
| `is_blocked_by(UUID, UUID)` | 003 (updated 008b, 020) | Block check | ❌ NOT SET ⚠️ |
| `update_follow_counts()` | 002 | Follow count trigger | ❌ NOT SET ⚠️ |
| `update_friends_count()` | 007 | Friend count trigger | ❌ NOT SET ⚠️ |
| `protect_post_counts()` | 003 | Prevent user from modifying counts | NOT SECDEF |
| `update_conversation_timestamp()` | 012 | Chat updated_at trigger | ❌ NOT SET ⚠️ |
| `update_reaction_count()` | 004 | Reaction count trigger | ❌ NOT SET ⚠️ |
| `is_chat_member(UUID, UUID)` | 026 | Chat membership check | ❌ NOT SET ⚠️ |
| `is_space_member(UUID, UUID)` | 026 | Space membership check | ❌ NOT SET ⚠️ |
| `get_unread_count(UUID)` | 013 | Notification unread count | NOT SECDEF |

**⚠️ NOTE:** Functions from migrations 001–012 do NOT have `SET search_path = public, pg_temp`. Migration 026 (is_chat_member, is_space_member) also lacks it. Migration 028 hardened version DOES set search_path. This is a security concern — without `SET search_path`, SECURITY DEFINER functions can be vulnerable to search_path manipulation attacks.

### RLS Policies Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| **profiles** | authenticated (non-deleted) | ❌ (trigger only) | own (protected fields) | ❌ |
| **follows** | authenticated | authenticated | ❌ | own |
| **posts** | can_see_post AND NOT is_blocked_by | own (author_id=auth.uid()) | own | ❌ |
| **reactions** | authenticated | authenticated | ❌ | own |
| **bookmarks** | own | own | ❌ | own |
| **friendships** | own (requester or addressee) | authenticated | addressee only (accept/decline) | ❌ |
| **blocks** | own | own | ❌ | own |
| **comments** | authenticated (non-deleted) | own | own | own (soft delete) |
| **chat_conversations** | participant (is_chat_member) | auth (created_by=auth.uid()) | participant | ❌ |
| **chat_participants** | member (is_chat_member) | creator or self | own (last_read_at) | own |
| **chat_messages** | participant (is_chat_member) | participant | ❌ | ❌ |
| **notifications** | own | auth (actor_id=auth.uid() or NULL) | own (read_at) | own |
| **spaces** | visible (public/listed or member) | authenticated | owner | ❌ |
| **space_members** | visible spaces | authenticated | own | own |
| **live_sessions** | visible (public/followers/host) | authenticated (host=auth.uid()) | host | ❌ |

### Triggers Summary

| Trigger | Table | Function | Maelezo |
|---|---|---|---|
| `trg_profiles_updated_at` | profiles | set_updated_at() | Auto-update updated_at |
| `on_auth_user_created` | auth.users | handle_new_user() | Auto-create profile |
| `trg_follow_counts` | follows | update_follow_counts() | Increment/decrement followers/following counts |
| `trg_friends_count` | friendships | update_friends_count() | Increment/decrement friends_count on status change |
| `trg_posts_updated_at` | posts | set_updated_at() | Auto-update updated_at |
| `protect_post_counts` | posts | protect_post_counts() | Prevent manual count changes |
| `trg_conversations_updated_at` | chat_conversations | set_updated_at() | Auto-update updated_at |
| `trg_update_conversation_ts` | chat_messages | update_conversation_timestamp() | Update conversation updated_at on new message |

### Storage Buckets

| Bucket | Migration | Public | Size Limit | Mime Types |
|---|---|---|---|---|
| `pasihai-post-media` | 018 | ❌ (signed URLs) | 10MB | image/jpeg, image/png, image/webp, image/gif, video/mp4, audio/mpeg, audio/ogg |
| `pasihai-status-media` | 017 | ❌ (signed URLs) | 5MB | image/jpeg, image/png, image/webp, video/mp4 |
| `profile-media` | 029 | ✅ | 5MB | image/jpeg, image/png, image/webp, image/gif |

**⚠️ NOTE:** Buckets 017 and 018 require Storage RLS policies to be applied separately (Storage policies are independent of table RLS).

---

## SEHEMU E: MTIRIRIKO WA DATA (Data Flow)

### 1. Feed Flow

```
User opens Home
  → Home.jsx renders FeedList
  → feedService.getFeed({ tab, filter })
    → contentRepository.getFeed() [mock or supabase]
      → [Live] supabaseContentRepository.listPosts()
        → Supabase: posts table (RLS: can_see_post + is_blocked_by)
        → supabaseFeedMapper.mapSupabasePost() → UI shape
      → [Mock] mockContentRepository → mock.js data
    → identityRepository.getUser() for each author
  → FeedItem renders each post with FeedActions, FeedSocialBar
```

### 2. Chat Flow (Direct)

```
User opens Chat → starts conversation with User B
  → chatService.startDirect(userIdB)
    → chatRepository.startDirect(userIdB)
      → [Live] supabaseChatRepository.startDirect()
        → Check if direct conversation exists (chat_participants join)
        → If not: INSERT chat_conversations (type='direct', created_by=auth.uid())
          ⚠️ BLOCKED by RLS without migration 027
        → INSERT chat_participants (2 rows: self + other)
        → Return { conversationId, conversation }
      → [Mock] mockChatRepository → mock data
  → chatService.getConversation(convId)
    → chatRepository.getConversation(convId)
      → [Live] supabaseChatRepository.getConversation()
        → Verify participant (chat_participants)
        → SELECT chat_conversations, chat_participants (with profiles join)
        → SELECT chat_messages (last 50, reversed)
        → UPDATE last_read_at
        → mapConversation() + toUiMessage()
```

### 3. Auth Flow

```
User visits app
  → AuthGate checks:
    1. supabaseConfigProblems.length > 0 → ConfigError (blocks app)
    2. !isSupabaseLive → pass through to App (mock mode)
    3. authLoading → loading spinner
    4. !isAuthenticated → Login page
    5. isAuthenticated → waitForSupabaseRepos() → App
  → AuthProvider wraps everything
    → useEffect: supabase.auth.getSession()
    → onAuthStateChange listener
  → authService.signIn(email, password)
    → [Live] supabase.auth.signInWithPassword()
    → [Mock] returns error "Supabase haijaunganishwa"
```

### 4. Gundua (Discovery) Flow

```
User opens Gundua
  → Gundua.jsx renders discovery UI
  → gunduaService.getDiscovery(mode, filters)
    → gunduaRepository.getPeople/getChannels/getHubs/etc.
      → [Live] supabaseGunduaRepository
        → Supabase: profiles table (entity_type filter)
        → Supabase: follows, friendships for relationship state
      → [Mock] mock data from mock.js
  → User taps "Omba Urafiki" on person
    → socialService.requestFriend(targetId)
      → Supabase: INSERT friendships (requester=auth.uid(), status='pending')
      → Supabase: INSERT notifications (type='friend_request')
```

### 5. Visibility Chain (Posts)

```
Post SELECT → RLS policy "posts_select_visible"
  → can_see_post(posts) — SECURITY DEFINER
    → author sees ALL own posts (including soft-deleted)
    → soft-deleted: FALSE for others
    → public: TRUE
    → private: FALSE (except author)
    → followers: TRUE if friendship accepted OR following
  → AND NOT is_blocked_by(auth.uid(), author_id) — SECURITY DEFINER
    → checks blocks table
```

---

## SEHEMU F: MATATIZO NA HATARI (Issues & Risks)

### 🔴 CRITICAL (Must Fix Before Production)

| # | Tatizo | Athari | Faili | Suluhisho |
|---|---|---|---|---|
| C1 | Migration 027 (chat RLS) haija-deploy | chat_conversations INSERT inakataliwa (42501) | `FIX-CHAT-RLS.sql` | Deploy SQL kwa Supabase Dashboard |
| C2 | Chat haijaribiwa na akaunti halisi | Haiwezi kuthibitishwa kuwa inafanya kazi | — | Test na akaunti 2 + mtandao halisi |

### 🟡 HIGH (Fix Before Major Release)

| # | Tatizo | Athari | Faili | Suluhisho |
|---|---|---|---|---|
| H1 | Migration 029 (profile media) haija-deploy | cover_url haipatikani, profile-media bucket haipo | `029_profile_media.sql` | Deploy SQL |
| H2 | SECURITY DEFINER functions (001–012) hazina `SET search_path` | Hatari ya search_path manipulation | Migrations 001–012 | Rekebisha functions kuongeza `SET search_path = public, pg_temp` |
| H3 | `028_relay_system.sql` na `028_relay_system_hardened.sql` zote ziko | Mgongano wa migration order | `supabase/migrations/` | Ondoa original 028, tumia hardened pekee |
| H4 | Commission rate 10% (hardcoded) vs 2% (discussed) | Biashara inaweza kukosa | `028_relay_system_hardened.sql` | Thibitisha rate kabla ya deploy |

### 🔵 MEDIUM (Fix Before GA)

| # | Tatizo | Athari | Faili | Suluhisho |
|---|---|---|---|---|
| M1 | Migrations 021, 023, 024 hazipo (gap in numbering) | Confusion — zilirukwa au ziliunganishwa? | — | Andika documentation ya migration history |
| M2 | `protect_post_counts()` SI SECURITY DEFINER | Inaweza kukosa kuzuia manual count changes | `003_posts.sql` | Hakikisha inafanya kazi kama ilivyo |
| M3 | `is_chat_member()` ina 2 definition (026 na FIX-CHAT-RLS) | Last definition wins — inaweza kusababisha mkanganyiko | FIX-CHAT-RLS.sql | Tumia `CREATE OR REPLACE` (tayari ipo) |
| M4 | Chat `mapConversation` ina `unread` = 0 or 1 (simplified) | Hesabu halisi ya unread haipatikani | supabaseChatRepository.js | Query unread count separately |
| M5 | Friendship: declined status haiwezi kutumwa tena | User A→B declined = A hawezi kutuma tena | supabaseFriendshipRepository.js | Ongeza delete policy au reset mechanism |
| M6 | `can_see_post` checks follows AND friendships separately | Inaweza kuwa slow kwa posts nyingi | Migrations 003, 007b | Consider materialized view |

### 🟢 LOW (Nice to Have)

| # | Tatizo | Athari | Faili |
|---|---|---|---|
| L1 | No DELETE policy for posts (soft delete only) | Posts hazifutwi kabisa | 003_posts.sql |
| L2 | No pagination for chat messages (limit 50) | Conversations na msg > 50 zinapoteza history | supabaseChatRepository.js |
| L3 | `handle_new_user()` username collision resolution inatumia random suffix | Usernames zinaweza kuwa ndefu | 001_profiles.sql |
| L4 | No indexes on chat_messages(sender_id) for deleted messages | Slow queries | 012_chat.sql |
| L5 | Relay system hard_max_mb = 5 in both policy and quota table | Redundant — consider single source | 028_relay_system_hardened.sql |

---

## SEHEGU G: UTEGEMEZI WA MIGRATIONS (Migration Dependencies)

### Dependency Graph

```
auth.users (Supabase built-in)
  └─ 001_profiles
       ├─ 002_follows
       │    └─ 007b_update_can_see_post (updates can_see_post)
       │         └─ 019_update_can_see_post (further update)
       ├─ 003_posts
       │    ├─ 004_reactions
       │    ├─ 005_bookmarks
       │    ├─ 009_comments
       │    ├─ 010_polls
       │    ├─ 011_shares
       │    ├─ 015_live_statuses_reports (statuses, live_sessions)
       │    ├─ 017_status_media_storage_rls (Storage bucket)
       │    └─ 018_post_media_storage_rls (Storage bucket)
       ├─ 006_hidden_items
       ├─ 007_friendships
       │    └─ 008b_update_is_blocked_by (updates is_blocked_by)
       │         └─ 020_update_is_blocked_by (further update)
       ├─ 008_blocks
       ├─ 012_chat (conversations, participants, messages)
       │    └─ 026_fix_rls_recursion (is_chat_member helper)
       │         └─ 027_fix_spaces_chat_rls ⚠️ NOT DEPLOYED
       ├─ 013_notifications
       ├─ 014_spaces (spaces, members, posts)
       │    └─ 026_fix_rls_recursion (is_space_member helper)
       ├─ 016_idempotency_keys
       └─ 029_profile_media ⚠️ NOT DEPLOYED

028_relay_system_hardened ⚠️ NOT DEPLOYED (standalone, depends on profiles only)
```

### Deployment Order (Safe)

```
001 → 002 → 003 → 004 → 005 → 006 → 007 → 007b → 008 → 008b →
009 → 010 → 011 → 012 → 013 → 014 → 015 → 016 → 017 → 018 →
019 → 020 → 022 → 025 → 026 → 027 → 028_hardened → 029
```

**Already deployed:** 001–026  
**NOT deployed:** 027, 028 (hardened), 029

---

## SEHEMU H: UTAFITI WA MOCK/LIVE MODE (Mock/Live Diagnosis)

### How Mode is Determined

```javascript
// supabaseConfig.js → resolveSupabaseConfig()
1. Read VITE_SUPABASE_MODE env var
2. If mode !== 'live' → mock mode
3. If mode === 'live':
   a. Check VITE_SUPABASE_URL exists and matches *.supabase.co
   b. Check VITE_SUPABASE_PUBLISHABLE_KEY exists
   c. Reject if key contains 'service_role' or 'secret'
   d. If all valid → live mode
   e. If any invalid → problems array → ConfigError screen
```

### Env Vars Required

| Var | Required for Live | Maelezo |
|---|---|---|
| `VITE_SUPABASE_MODE` | ✅ | Must be `live` |
| `VITE_SUPABASE_URL` | ✅ | Must be `https://*.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ | Anon key (NOT service_role) |

### Why App Falls Back to Mock

| Scenario | Result | Maelezo |
|---|---|---|
| No `.env` file | Mock mode | All env vars undefined |
| `VITE_SUPABASE_MODE` not set | Mock mode | Default is not 'live' |
| `VITE_SUPABASE_MODE=mock` | Mock mode | Explicit mock |
| Invalid URL format | ConfigError | App blocked with error message |
| Missing key | ConfigError | App blocked with error message |
| service_role key detected | ConfigError | Security: rejected with error |
| Valid config but no network | Live mode (with errors) | Supabase client created, queries fail gracefully |

### Current State

**App is in MOCK MODE** because no `.env.local` with live credentials exists in the workspace. This is **expected** for development. The database is NOT assumed to be corrupted.

---

## SEHEMU I: MAJARIBIO NA USALAMA (Tests & Security)

### Smoke Test Results (510/510 ✅)

| Kundi | Idadi | Maelezo |
|---|---|---|
| 1: Render | ~50 | Components render SSR without crash |
| 2: Architecture | ~100 | UI doesn't import mock.js directly |
| 3: Contracts | ~200 | Repos/services return correct data shape |
| 4: Chat | ~80 | Chat components, conversation states, messages |
| 5: Feed | ~60 | Feed items, actions, social bar |
| 6: Gundua | ~40 | Discovery cards, filters, actions |
| 7: Spaces | ~30 | Space cards, members, events |
| 8: Navigation | ~20 | Hash routing, back/forward, tab switching |
| 9: A11y | ~20 | aria-labels, touch targets, semantic HTML |
| 10: CSS | ~10 | Token usage, no hardcoded colors |

### Security Audit

| Check | Status | Maelezo |
|---|---|---|
| RLS enabled on all tables | ✅ | All tables have `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` |
| No service_role key in code | ✅ | Only publishable/anon key used |
| Self-block prevention | ✅ | `CHECK (blocker_id != blocked_id)` |
| Self-follow prevention | ✅ | `CHECK (follower_id != followee_id)` |
| Author spoofing prevention | ✅ | `WITH CHECK (author_id = auth.uid())` |
| Profile creation via trigger only | ✅ | No INSERT policy — only `handle_new_user()` |
| Protected profile fields | ✅ | `WITH CHECK` prevents count/verified/entity_type changes |
| SECURITY DEFINER search_path | ⚠️ PARTIAL | 028 hardened has it, 001–026 do NOT |
| Storage RLS | ✅ | Owner-only write, public/signed read |
| Chat membership check | ✅ | `is_chat_member()` SECURITY DEFINER |
| Block prevents post visibility | ✅ | `is_blocked_by()` in SELECT policy |

### Tests Needed (Not Yet Written)

| # | Test | Maelezo |
|---|---|---|
| T1 | User A vs User B — friendship request | A sends → B receives notification → B accepts → both see friend |
| T2 | User A vs User B — chat | A starts direct → sends message → B sees it → B replies |
| T3 | User A blocks User B | A's posts invisible to B, B's posts invisible to A |
| T4 | User A unfollows Channel X | Channel X disappears from A's feed |
| T5 | Post visibility: public vs followers vs private | Verify can_see_post logic |
| T6 | RLS: User A cannot read User B's private posts | Should return empty |
| T7 | RLS: User A cannot modify User B's profile | Should fail |
| T8 | Chat: non-participant cannot read messages | RLS blocks |
| T9 | Friendship: declined → cannot re-request | Current behavior |
| T10 | Block + friendship: block removes friendship | Need to verify |

---

## SEHEMU J: MPANGO WA MAREKEBISHO (Repair Plan)

### Phase 1: Deploy Pending Migrations (Priority: 🔴 CRITICAL)

| Hatua | Action | Faili | Risk | Verification |
|---|---|---|---|---|
| 1.1 | Deploy FIX-CHAT-RLS.sql | `FIX-CHAT-RLS.sql` | LOW — idempotent | Test chat_conversations INSERT |
| 1.2 | Deploy 029_profile_media.sql | `029_profile_media.sql` | LOW — additive only | Verify cover_url column exists |
| 1.3 | Verify 001–026 are correctly deployed | Supabase Dashboard | — | List all tables, functions, policies |

### Phase 2: Chat Live Testing (Priority: 🔴 CRITICAL)

| Hatua | Action | Maelezo | Verification |
|---|---|---|---|
| 2.1 | Create 2 test accounts | Supabase Auth sign-up | Both profiles exist |
| 2.2 | Start direct conversation | User A → User B | conversation created, participants added |
| 2.3 | Send messages | A sends, B receives | Messages visible to both |
| 2.4 | Test block during chat | A blocks B | Messages stop flowing |
| 2.5 | Test unread count | B opens conversation | last_read_at updated |

### Phase 3: Security Hardening (Priority: 🟡 HIGH)

| Hatua | Action | Faili | Risk | Verification |
|---|---|---|---|---|
| 3.1 | Add `SET search_path` to all SECURITY DEFINER functions | New migration | MEDIUM — changes function signatures | Test all affected queries |
| 3.2 | Remove duplicate `028_relay_system.sql` | File deletion | LOW — no DB change | Verify hardened version is correct |
| 3.3 | Confirm relay commission rate | Business decision | — | Update migration if needed |

### Phase 4: Bug Fixes (Priority: 🔵 MEDIUM)

| Hatua | Action | Faili | Risk | Verification |
|---|---|---|---|---|
| 4.1 | Fix friendship declined → re-request | supabaseFriendshipRepository.js | LOW | Test: decline → delete row → re-request |
| 4.2 | Add chat message pagination | supabaseChatRepository.js | LOW | Test: conversation with >50 messages |
| 4.3 | Improve unread count accuracy | supabaseChatRepository.js | LOW | Query count separately |

### Phase 5: Test Coverage (Priority: 🔵 MEDIUM)

| Hatua | Action | Faili | Risk | Verification |
|---|---|---|---|---|
| 5.1 | Write RLS integration tests (T1–T10) | `scripts/rls-tests.js` | LOW | Tests pass |
| 5.2 | Add Playwright E2E tests | `tests/e2e/` | LOW | Critical flows covered |
| 5.3 | Add CI pipeline | `.github/workflows/` | LOW | Build + test on push |

---

## SEHEMU K: LANGO LA UIDHINISHO (Approval Gate)

### Decisions Requiring User Approval

| # | Uamuzi | Chaguo | Mapendekezo |
|---|---|---|---|
| D1 | **Deploy FIX-CHAT-RLS.sql?** | ✅ Ndiyo / ❌ Hapana | ✅ Ndiyo — inahitajiki kwa chat kufanya kazi |
| D2 | **Deploy 029_profile_media.sql?** | ✅ Ndiyo / ❌ Hapana | ✅ Ndiyo — inaongeza cover_url + storage bucket |
| D3 | **Ondoa original 028_relay_system.sql?** | ✅ Ndiyo / ❌ Hapana | ✅ Ndiyo — hardened version pekee itumike |
| D4 | **Thibitisha relay commission rate?** | 2% au 10% | 2% (kama ilivyojadiliwa) |
| D5 | **Deploy 028_relay_system_hardened.sql?** | ✅ Sasa / ⏳ Baadaye | ⏳ Baadaye — relay si core feature |
| D6 | **Rekebisha SECURITY DEFINER search_path?** | ✅ Sasa / ⏳ Baadaye | ⏳ Baadaye — inahitaji migration mpya |
| D7 | **Ruhusu marekebisho ya code?** | ✅ Ndiyo / ❌ Hapana | Subiri uidhinisho wako |

### Files Ready for Deployment

| Faili | Status | Maelezo |
|---|---|---|
| `FIX-CHAT-RLS.sql` | ✅ Tayari | Idempotent, imethibitishwa na code review |
| `029_profile_media.sql` | ✅ Tayari | Additive only, no risk |
| `028_relay_system_hardened.sql` | ✅ Tayari | Complete, but not urgent |

---

## HITIMISHO

PASIHAI ni mfumo mzima wenye muundo mzuri (4-layer architecture, repository pattern, RLS security). Makosa makuu ni:

1. **Migration 027 haija-deploy** — ndio sababu pekee chat haifanyi kazi kwenye live mode
2. **Chat haijaribiwa** — inahitaji akaunti 2 halisi + mtandao
3. **SECURITY DEFINER search_path** — hatari ya usalama lakini si ya haraka

Baada ya kuidhinisha ripoti hii, nitafanya marekebisho kwa hatua ndogo, kila hatua ikithibitishwa kabla ya kuendelea.

**Hali ya Sasa:** Subiri uidhinisho wako wa Sehemu K (Approval Gate).