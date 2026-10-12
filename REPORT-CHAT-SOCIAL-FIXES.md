# PASIHAI — Chat System + Social Buttons Fix Report

## Tarehe: 2026-10-12

---

## 1. Chat Data Shape Fix (CRITICAL)

### Tatizo
`mapConversation()` katika `supabaseChatRepository.js` ilikuwa ikirudisha `lastMessage` lakini UI (`Chat.jsx`) inatumia `c.last?.text` na `c.last?.at`.

### Marekebisho
- `mapConversation` sasa inarudisha `c.last` (pamoja na `lastMessage` kwa backward compat)
- `c.tone` imeongezwa — inatoka kwa profile ya mtu mwingine (direct) au row ya group
- `c.updatedAt` sasa ni formatted time string, si raw ISO

### Faili
- `src/data/repositories/supabaseChatRepository.js` — `mapConversation()` function

---

## 2. Social Buttons kwenye Feed Posts

### Tatizo
Feed posts hazikuonyeshi vitendo vya uhusiano (Omba Urafiki, Kufuata, Unganika, Ujumbe) kwa watu ambao si marafiki.

### Marekebisho
- **FeedSocialBar.jsx** — component mpya inayoonyesha 4 buttons: Omba Urafiki, Kufuata, Unganika, Ujumbe
- **FeedItem.jsx** — imeongeza FeedSocialBar kwa posts kutoka kwa watu wasio marafiki
- **FeedList.jsx** — imeongeza handlers: `handleFollow`, `handleFriendRequest`, `handleConnect`, `handleMessage`
- **socialService.js** — service mpya yenye: `sendFriendRequest`, `followUser`, `unfollowUser`, `connectUser`
- **feed.css** — CSS mpya kwa `.psh-feed-social` na buttons zake

### Vitendo vya Buttons
| Button | Action | Table |
|--------|--------|-------|
| Omba Urafiki | `sendFriendRequest(targetUserId)` | `friendships` |
| Kufuata | `followUser(targetUserId)` | `follows` |
| Unganika | `connectUser(targetUserId)` | `friendships` |
| Ujumbe | `chatService.startDirect(targetUserId)` | `chat_*` |

---

## 3. Social Buttons kwenye Discover/Gundua

### Marekebisho
- **PersonCard** (GunduaBits.jsx) — imeongeza buttons: Kufuata, Unganika, Ujumbe kwa `not_friend` state
- Kwa `sent` state: ona "Kufuata" button pia

---

## 4. Icons Mpya

### Marekebisho
- **icons.jsx** — imeongeza:
  - `IconFollow` — mtu na arrow
  - `IconConnect` — chain/link icon

---

## 5. CSS ya Social Bar

### Faili: `src/styles/feed.css`
- `.psh-feed-social` — flex container
- `.psh-feed-social__btn` — pill-shaped buttons
- `.psh-feed-social__btn--friend` — green (primary)
- `.psh-feed-social__btn--follow` — blue
- `.psh-feed-social__btn--connect` — neutral
- `.psh-feed-social__btn--msg` — ghost green

---

## 6. Build Results

```
✓ Build: 5.22s
✓ Smoke: 510/510 zimepita
✓ SocialService: 1.35 kB (gzipped 0.60 kB)
```

---

## 7. APK Build

### Hali
Android SDK haipatikani kwenye sandbox hii. Faili la maelekezo limeandikwa: `APK-BUILD-INSTRUCTIONS.md`

### Hatua za Kujenga APK
1. `npm install && npx vite build`
2. `npx cap sync android`
3. `cd android && ./gradlew assembleDebug`
4. APK: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 8. Maswali Bado Hayajajibiwa

### Chat Start Direct
- `startDirect()` inarudisha `null` pale `isSupabaseLive` ni `false`
- Mock mode inafanya kazi — tatizo ni pale Supabase haijaunganishwa
- **Hitaji**: Angalia `.env.local` — `VITE_SUPABASE_MODE=live` na credentials sahihi

### Commission Rate (Migration 028)
- SQL ina 10%, user alizungumza 2%
- **Bado inahitaji uamuzi wa wazi**

---

## Faili Zilizobadilishwa

| Faili | Aina ya Mabadiliko |
|-------|-------------------|
| `src/data/repositories/supabaseChatRepository.js` | Fix: `mapConversation` data shape |
| `src/components/feed/FeedItem.jsx` | Add: social bar props |
| `src/components/feed/FeedList.jsx` | Add: social action handlers |
| `src/components/feed/FeedSocialBar.jsx` | **NEW**: social buttons component |
| `src/components/gundua/GunduaBits.jsx` | Add: follow/connect/message buttons |
| `src/components/icons.jsx` | Add: IconFollow, IconConnect |
| `src/services/socialService.js` | **NEW**: follow/friend/connect service |
| `src/styles/feed.css` | Add: social bar CSS |
| `APK-BUILD-INSTRUCTIONS.md` | **NEW**: APK build guide |
| `REPORT-CHAT-SOCIAL-FIXES.md` | **NEW**: this report |