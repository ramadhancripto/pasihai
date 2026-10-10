# PASIHAI — Hali ya Sasa ya Mradi

Hii ni **repo yote** — kila faili iliyopo kwenye mradi (bila `node_modules` na `dist` pekee, ambazo ni za kutengenezwa).

## Kuanza (dakika 1)

```bash
npm install          # inaweka vite, react, playwright… (dependencies pekee)
npm run build        # inatarajiwa: CSS 192.73 kB · JS 849.15 kB
npm run smoke        # inatarajiwa: 461/461
npm run dev          # terminal ya kwanza (http://localhost:5173)
```

## Ramani ya Faili

| Eneo | Faili | Ni Nini |
|------|-------|---------|
| `src/App.jsx` | 1 | Shell: Header + kurasa 5 (Home, Chat, Gundua, Spaces, Login) + Business (placeholder) + panels |
| `src/pages/` | 7 | Home, Chat, Gundua, Spaces, **Login (mpya)**, PlaceholderPage, StyleGuide |
| `src/components/` | 29 | `spaces/`, `feed/`, `chat/`, `gundua/`, `home/`, `system/`, `ui.jsx`, `icons.jsx`, `panels.jsx` |
| `src/data/` | 15 | `mock.js` (2,268 lines) · `repositories/` (8 mock + **4 supabase**) · `mappers/` |
| `src/services/` | 11 | Application layer (home, feed, chat, gundua, spaces, **auth**, system, account, settings, notification, productInfo) |
| `src/lib/` | 3 | **AuthContext.jsx**, **AuthGate.jsx**, **supabaseClient.js** |
| `src/styles/` | 25 | tokens, base, shell, home, feed, panels, chat, gundua, spaces, system, guide, **login (mpya)** |
| `src/hooks/`, `src/utils/` | 4 | `useAsyncData`, `useChromeHide`, `format`, `time` |
| `scripts/` | 4 | `smoke.jsx` (461 assertions), `shots.mjs`, **`test-auth.mjs` (23 tests)**, **`test-supabase-repos.mjs` (64 tests)** |
| `public/` | 12 | Fonts za ndani (woff2) + favicon — app inafanya kazi bila internet |
| `supabase/` | 27 | **Migrations 17** (schema + RLS), seed data 3, tests 7 |
| `docs/` | 20+ | Ripoti za audit, batch reports, implementation reports |

## Hali Halisi ya Mradi

### Kile Kilichopo

✅ **UI/UX kamili** — Home, Chat, Gundua, Spaces, Login  
✅ **Design system** — tokens, typography, icons, components  
✅ **Mock data** — 2,268 lines ya sample data  
✅ **Auth infrastructure** — AuthContext, AuthGate, Login page (haijatumwa bado)  
✅ **Supabase schema** — Migrations 17 (profiles, posts, reactions, comments, chat, spaces, etc.)  
✅ **Supabase repositories** — content, identity, chat, activity (haijaunganishwa bado)  
✅ **Tests** — 548 tests zimepita (build + smoke + auth + repos)  

### Hali ya Sasa: Mock Mode

Mradi uko katika **mock mode** — data yote inatoka kwenye `src/data/mock.js`.

**Supabase integration** imeandaliwa lakini haijaunganishwa bado:
- Migrations 17 zimeandaliwa (hazijatumwa kwenye hosted Supabase)
- Supabase repositories zimeandaliwa (hazijaunganishwa na composition root)
- Auth system imeandaliwa (haijajaribiwa dhidi ya hosted Supabase)

### Kuwezesha Live Mode

Ili kubadilisha kutoka mock mode kwenda live mode:

1. **Tuma migrations** kwenye hosted Supabase:
   ```bash
   # Kwenye Supabase Dashboard → SQL Editor
   # Nakili na kuendesha migrations 001-015
   ```

2. **Weka credentials** kwenye `.env.local`:
   ```bash
   VITE_SUPABASE_MODE=live
   VITE_SUPABASE_URL=https://lbcpacijbiukqcpkfktp.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

3. **Unganisha Supabase repos** na composition root (`src/data/repositories/index.js`)

4. **Jaribu** dhidi ya hosted Supabase

## Nav: Destinations 5

1. **Home** — Feed ya machapisho, reels, live sessions
2. **Chat** — Mazungumzo ya moja kwa moja na ya kikundi
3. **Gundua** — Tafuta na kugundua content mpya
4. **Spaces** — Hubs, Jumuiya, na Channels
5. **Business** — (Placeholder — bado haijatekelezwa)

## Spaces = Hubs & Jumuiya + Channels

- **Hubs** — sehemu za jumuiya (k.m. Dar es Salaam Tech Hub)
- **Jumuiya** — makundi ya watu wenye maslahi sawa
- **Channels** — channels za kuchapisha content
- **Vikundi** = Chat (si Spaces)

## Ufikivu ni Hali

- **Wazi** (public) — wote wanaona
- **Binafsi-Iliyoorodheshwa** (listed) — wanaona lakini wanahitaji kuomba kujiunga
- **Binafsi-Fichwa** (private) — wanachama pekee wanaona

Hakuna "Private Space" kama object — ufikivu ni hali ya space.

## Hakuna Engine ya Pili

- Mkondo (feed) — moja
- Maoni (comments) — moja
- Reactions — moja
- Hifadhi (bookmarks) — moja
- Matukio (events) — moja (content)
- Rasilimali (resources) — moja (Save Offline)
- Chat — moja
- Discovery — moja

## Takwimu = Halisi Pekee

- Machapisho (posts)
- Reactions (like, heart, clap, fire, laugh, sad)
- Maoni (comments)
- Kushiriki (shares)
- Wafuatiliaji (followers)

Hakuna namba za kubuni (views, revenue, earnings, etc.).

## Nyaraka Muhimu

- `README.md` — maelezo ya jumla ya mradi
- `docs/BATCH-1-AUTH-REPORT.md` — ripoti ya Batch 1 (Auth)
- `docs/FULL-SYSTEM-AUDIT-v2.md` — audit ya mfumo mzima
- `docs/IMPLEMENTATION-PROGRESS-REPORT.md` — maendeleo ya sasa
- `supabase/migrations/` — schema ya database (17 files)

## Tests

```bash
npm run build            # build ya production
npm run smoke            # 461 tests (render + architecture guard)
node scripts/test-auth.mjs           # 23 tests (auth flow)
node scripts/test-supabase-repos.mjs # 64 tests (repo contracts)
```

**Matokeo ya sasa:** 548/548 zimepita (mock mode pekee).

## Awamu Zilizokamilika

1. **System Definition** (ADW)
2. **Phase 1/2A** — design tokens + primitives
3. **STITCH** — app shell + navigation
4. **UI-POLISH 1-2** — responsive + visual polish
5. **TOP SYSTEM** — system panels (data saved, relay, nearby, sync)
6. **RELAY POLICY** — internet relay policy
7. **CHAT §1-32** — chat system (conversations, messages, phone book)
8. **GUNDUA** — discover/search system
9. **M** — system hardening
10. **SPACES (N)** — spaces system (hubs, communities, channels)
11. **BATCH 1** — auth infrastructure (AuthContext, AuthGate, Login, Supabase schema)

## Awamu Zinazofuata

1. **BATCH 2** — Home Feed + Actions (unganisha Supabase repos, implement real actions)
2. **BATCH 3** — Chat + Notifications (real-time messaging, real notifications)
3. **BATCH 4** — Gundua + Spaces (real search, real spaces)
4. **BATCH 5** — Media + Storage (image/video upload, avatar/cover upload)
5. **BATCH 6** — Hardening (privacy, account deletion, blocking, push notifications)
