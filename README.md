# Pasihai

**Pasihai** ni jukwaa la kijamii lenye mawasiliano kwanza (communication-first social platform).

> **Hali ya sasa (2026-10-11):** Supabase backend integration imekamilika. Migrations, RLS policies, na repositories zote zimetengenezwa. App inaweza kuendeshwa kwenye `mock` mode (data ya ndani) au `live` mode (Supabase).

---

## Hali ya Mradi

| Sehemu | Hali |
|--------|------|
| **Design System** | ✅ Imekamilika |
| **App Shell** (header, nav, pages) | ✅ Imekamilika |
| **Home Feed** (tabs, filters, cards) | ✅ Imekamilika (mock + live) |
| **Chat** (conversations, messages) | ✅ Imekamilika (mock + live) |
| **Gundua** (search, discover) | ✅ Imekamilika (mock + live) |
| **Spaces** (hubs, communities, channels) | ✅ Imekamilika (mock + live) |
| **Authentication** (login, signup, session, recovery) | ✅ Imekamilika |
| **Supabase Backend** (schema, RLS) | ✅ Imekamilika |
| **Statuses/Stories** (text, media, 24h expiry) | ✅ Imekamilika |
| **Media Uploads** (Cloudinary + Supabase Storage) | ✅ Imekamilika |
| **Offline Support** (outbox, sync engine) | ✅ Imekamilika |

---

## Architecture

```
src/
├── main.jsx                    # Entry point
├── App.jsx                     # Shell: routes, panels, navigation
├── lib/
│   ├── supabaseConfig.js       # VITE_* env resolution
│   ├── supabaseClient.js       # Supabase client (lazy init)
│   ├── AuthContext.jsx          # Auth state provider
│   └── AuthGate.jsx             # Auth guard + repo loading
├── services/                   # Application layer
│   ├── authService.js          # Supabase Auth wrapper
│   ├── feedService.js          # Feed logic
│   ├── chatService.js          # Chat logic
│   ├── gunduaService.js        # Discovery logic
│   ├── spacesService.js        # Spaces logic
│   └── ...
├── data/
│   ├── mock.js                 # Mock data (mock mode)
│   ├── repositories/
│   │   ├── index.js            # Composition root (mock ↔ Supabase swap)
│   │   ├── supabase*.js        # Live Supabase implementations
│   │   └── *.js                # Mock implementations
│   └── mappers/                # DB row → UI object mappers
├── pages/                      # Route pages (Home, Chat, Gundua, Spaces)
├── components/                 # UI components
├── hooks/                      # React hooks
├── utils/                      # Utilities (errors, media, offline, etc.)
├── creative/                   # Creative tools (canvas, filters)
├── studio/                     # Post Studio
└── styles/                     # CSS (tokens + components)
```

---

## Kuendesha

```bash
cd pasihai
npm install
npm run dev        # http://localhost:5173
```

### Mock Mode (default)

Hakuna credentials inahitajika. Data yote inatoka `src/data/mock.js`.

### Live Mode (Supabase)

1. Nakili `.env.example` kuwa `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Jaza credentials:
   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
   VITE_SUPABASE_MODE=live
   ```

3. (Opcionali) Cloudinary:
   ```
   VITE_CLOUDINARY_CLOUD_NAME=your-cloud
   VITE_CLOUDINARY_UPLOAD_PRESET=your-preset
   ```

4. Endesha:
   ```bash
   npm run dev
   ```

---

## Database Setup

### Production Supabase

1. Fungua Supabase Dashboard → SQL Editor
2. Endesha `supabase/verify/PRODUCTION_SCHEMA_CHECK.sql` (READ-ONLY — hakikisha tables zipi zipo)
3. Endesha `supabase/migrations/PASIHAI_FULL_MIGRATION.sql` (unda tables 22, RLS policies 80, triggers 16, functions 16)
4. Endesha schema check tena kuthibitisha

### Migrations

Migrations ziko `supabase/migrations/`:
- `001_profiles.sql` → `022_post_counts_guard_fix.sql` (incremental, 22 files)
- `PASIHAI_FULL_MIGRATION.sql` (consolidated — yote kwenye faili moja)

Storage buckets:
- `pasihai-status-media` (private, 25 MiB max)
- `pasihai-post-media` (private, 50 MiB max)

---

## Testing

```bash
# Smoke tests (UI structure, navigation, accessibility)
npm run smoke

# Unit/integration tests
node scripts/test-supabase-config.mjs    # Config validation
node scripts/test-auth.mjs               # Auth service
node scripts/test-cloudinary.mjs         # Media upload
node scripts/test-offline.mjs            # Offline actions
node scripts/test-network-failure.mjs    # Network resilience
node scripts/test-idempotency.mjs        # Duplicate prevention
node scripts/test-outbox-safety.mjs      # Outbox queue
node scripts/test-failure-scenarios.mjs  # Error handling
node scripts/test-supplemental.mjs       # Supplemental features
node scripts/test-repair-verification.mjs # Repair verification
```

---

## Deployment

### Netlify

App inajijenga kwa `npm run build` → `dist/`.

Environment variables kwenye Netlify:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_MODE=live`
- (Opcionali) `VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET`

### Supabase Dashboard Settings

- **Site URL:** `https://YOUR-DOMAIN.netlify.app`
- **Redirect URLs:** `https://YOUR-DOMAIN.netlify.app` + `http://localhost:5173`

---

## Security

- RLS (Row Level Security) imewashwa kwenye tables zote 22
- Anon key pekee inatumika kwenye browser (hakuna service_role key)
- `isSecretKey()` inazuia service_role key kwenye VITE_*
- `.env.local` haijafuatiliwi na Git
- Storage buckets ni binafsi (private) — media inapatikana kupitia signed URLs

---

## Muundo wa Tables (22)

| # | Table | Kazi |
|---|-------|------|
| 1 | profiles | Wasifu wa mtumiaji |
| 2 | follows | Ufuatiliaji |
| 3 | posts | Machapisho |
| 4 | reactions | Likes/emoji |
| 5 | bookmarks | Zilizohifadhiwa |
| 6 | hidden_items | Zilizofichwa |
| 7 | friendships | Maombi ya urafiki |
| 8 | blocks | Kuzuia |
| 9 | comments | Maoni |
| 10 | poll_options | Chaguo za poll |
| 11 | poll_votes | Kura za poll |
| 12 | shares | Kushiriki |
| 13 | chat_conversations | Mazungumzo |
| 14 | chat_participants | Washiriki |
| 15 | chat_messages | Ujumbe |
| 16 | notifications | Taarifa |
| 17 | spaces | Hubs, communities, channels |
| 18 | space_members | Wanachama |
| 19 | space_posts | Posts za space |
| 20 | live_sessions | Vikao vya moja kwa moja |
| 21 | statuses | Status/stories (24h) |
| 22 | reports | Ripoti |

---

## Leseni

Proprietary — Pasihai © 2026