# Pasihai

**Pasihai** ni jukwaa la kijamii lenye mawasiliano kwanza (communication-first social platform).

---

## Hali ya Mradi

| Sehemu | Hali |
|--------|------|
| **Design System** | ✅ Imekamilika |
| **App Shell** (header, nav, pages) | ✅ Imekamilika |
| **Home Feed** (tabs, filters, cards) | ✅ Imekamilika (mock mode) |
| **Chat** (conversations, messages) | ✅ Imekamilika (mock mode) |
| **Gundua** (search, discover) | ✅ Imekamilika (mock mode) |
| **Spaces** (hubs, communities, channels) | ✅ Imekamilika (mock mode) |
| **Authentication** (login, signup, session) | ✅ Imeandaliwa (haijatumwa) |
| **Supabase Backend** (schema, RLS) | ✅ Imeandaliwa (haijatumwa) |

### Hali ya Sasa

Mradi uko katika **mock mode** — data yote inatoka kwenye `src/data/mock.js` (2,268 lines ya sample data).

**Supabase integration** imeandaliwa lakini haijaunganishwa bado:
- Migrations 17 (schema + RLS policies) zimeandaliwa kwenye `supabase/migrations/`
- Supabase repositories (content, identity, chat, activity) zimeandaliwa
- Auth system (AuthContext, AuthGate, Login) imeandaliwa

Ili kuwezesha **live mode** na data halisi:
1. Tuma migrations kwenye hosted Supabase
2. Weka credentials kwenye `.env.local`
3. Badilisha `VITE_SUPABASE_MODE=live`

---

## Kuendesha

```bash
cd pasihai
npm install
npm run dev        # http://localhost:5173
```

### Zana za Maendeleo

```bash
npm run build            # build ya production
npm run smoke            # render + architecture guard + contract checks (461 tests)
node scripts/test-auth.mjs           # auth tests (23 tests)
node scripts/test-supabase-repos.mjs # supabase repo tests (64 tests)
```

> Kidokezo: `http://localhost:5173/?guide=1` inafungua **Style Guide** (design tokens, typography, icons, components zote).

---

## Muundo wa App

### Navigation (5 destinations)

1. **Home** — Feed ya machapisho, reels, live sessions
2. **Chat** — Mazungumzo ya moja kwa moja na ya kikundi
3. **Gundua** — Tafuta na kugundua content mpya
4. **Spaces** — Hubs, Jumuiya, na Channels
5. **Business** — (Placeholder — bado haijatekelezwa)

### Home Feed

**Tabs 5:**
- Mchanganyiko (default) — posts zote
- Reels — video fupi
- Friends — content ya marafiki
- Channels — content ya channels unazofuata
- Live — vikao vya live

**Filters 9:**
- Zote, Video, Picha, Machapisho, Reels, Sauti, Kura, Live, Matangazo

**Actions:**
- Like/reaction, comment, share, bookmark, hide, report
- Create post (text, image, video, audio, poll, reel, live)

### Chat

- Direct messages (moja kwa moja)
- Group conversations (vikundi)
- Phone book integration
- Message history

### Gundua (Discover)

- Search (watu, content, spaces)
- Categories na trending
- Business profiles
- Public groups
- Offers na deals

### Spaces

**Aina 3:**
- **Hubs** — sehemu za jumuiya (k.m. Dar es Salaam Tech Hub)
- **Jumuiya** — makundi ya watu wenye maslahi sawa
- **Channels** — channels za kuchapisha content

**Features:**
- Join/leave spaces
- Space feed (posts za space)
- Events na matukio
- Resources na rasilimali
- Members na wanachama

---

## Architecture

```
UI (Pages + Components)
  ↓
Services (Application Logic)
  ↓
Repositories (Data Access)
  ↓
Data Source (Mock au Supabase)
```

### Mafaili Muhimu

| Eneo | Maelezo |
|------|---------|
| `src/App.jsx` | Shell: header + nav + pages + panels |
| `src/pages/` | Home, Chat, Gundua, Spaces, Login |
| `src/components/` | UI components (feed, chat, spaces, etc.) |
| `src/services/` | Application layer (feedService, chatService, etc.) |
| `src/data/repositories/` | Data access layer (mock + supabase) |
| `src/data/mock.js` | Sample data (2,268 lines) |
| `src/lib/` | Auth system (AuthContext, AuthGate, supabaseClient) |
| `supabase/migrations/` | Database schema + RLS policies (17 files) |

---

## Design System

### Rangi

| Jina | Thamani |
|------|---------|
| Primary green | `#18A982` |
| Secondary blue | `#3B82F6` |
| Light green | `#EAF8F3` |
| Primary text | `#17201D` |
| Secondary text | `#66736E` |
| Background | `#FFFFFF` |
| Gold accent | `#D4A72C` (kwa nadra) |

### Typography

- **Headings:** Inter Tight
- **UI text:** Inter
- **Wordmark:** ~20–22px, Semi Bold

### Spacing

4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 (px)

### Radius

8–14px (hakuna pills kila mahali)

---

## Supabase Schema

### Tables (17 migrations)

1. **profiles** — wasifu wa watumiaji
2. **follows** — ufuatiliaji
3. **posts** — machapisho (text, image, video, audio, poll, reel, etc.)
4. **reactions** — like/heart/clap/fire/laugh/sad
5. **bookmarks** — vitu vilivyohifadhiwa
6. **hidden_items** — posts zilizofichwa
7. **friendships** — urafiki (pending, accepted, declined)
8. **blocks** — watumiaji waliozuiliwa
9. **comments** — maoni kwenye posts
10. **poll_options** + **poll_votes** — kura za polls
11. **shares** — kushiriki posts
12. **chat_conversations** + **chat_participants** + **chat_messages** — chat
13. **notifications** — taarifa za watumiaji
14. **spaces** + **space_members** + **space_posts** — spaces
15. **live_sessions** + **statuses** + **reports** — live, stories, ripoti

### RLS Policies

Kila table ina Row Level Security (RLS) policies:
- **SELECT:** watumiaji wanaona data wanayostahili
- **INSERT:** watumiaji wanaunda data yao wenyewe
- **UPDATE:** watumiaji wanasasisha data yao wenyewe
- **DELETE:** watumiaji wanafuta data yao wenyewe

### Functions

- `handle_new_user()` — auto-create profile wakati wa signup
- `can_see_post()` — angalia kama mtumiaji anaweza kuona post
- `is_blocked_by()` — angalia kama mtumiaji amezuiliwa
- `set_updated_at()` — trigger ya updated_at timestamp

---

## Tests

### Matokeo ya Sasa

```
✅ npm run build          → 164 modules, 2.87s
✅ npm run smoke (SSR)    → 461/461 passed
✅ Auth tests             → 23/23 passed
✅ Supabase repos tests   → 64/64 passed
────────────────────────────────────────────
JUMLA: 548 tests — ZOTE ZIMEFANIKIWA
```

### Aina za Tests

1. **Smoke tests** (461) — render + architecture guard + contract checks
2. **Auth tests** (23) — authentication flow + security checks
3. **Supabase repo tests** (64) — repository contracts + mapper tests

**Kumbuka:** Tests zote zinafanya kazi kwa **mock mode pekee**. Hakuna testing dhidi ya hosted Supabase bado.

---

## Hatua Zinazofuata

### Batch 2: Home Feed + Actions (Inayofuata)

- Unganisha supabaseContentRepository na composition root
- Test feed loading (real data)
- Implement like/reaction (real)
- Implement comments (real)
- Add error/loading/empty states

### Batch 3: Chat + Notifications

- Unganisha supabaseChatRepository
- Test real-time messaging
- Unganisha supabaseActivityRepository
- Test real notifications

### Batch 4: Gundua + Spaces

- Unganisha supabaseGunduaRepository
- Unganisha supabaseSpacesRepository
- Test search/discover
- Test spaces functionality

### Batch 5: Media + Storage

- Set up Supabase Storage
- Implement image/video upload
- Implement avatar/cover upload
- Add media viewer enhancements

### Batch 6: Hardening

- Privacy settings
- Account deletion
- Blocking/reporting (real)
- Push notifications
- Performance optimization
- Security audit

---

## Leseni

Mradi huu ni wa **Pasihai** — jukwaa la kijamii lenye mawasiliano kwanza.

---

## Mawasiliano

Kwa maswali au maoni, wasiliana na timu ya Pasihai.
