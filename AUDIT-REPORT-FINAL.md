# PASIHAI — FULL SYSTEM AUDIT REPORT
## Tarehe: 2026-10-12

---

## BASELINE
- Build: ✅ 5.98s
- Smoke: ✅ 510/510
- Migrations: 001–028 (028 hardened bado haijatekelezwa)
- Supabase project: `lbcpacijbiukqcpkfktp`

---

## 1. VIDEO SYSTEM

### Existing Infrastructure
- `useVideoAutoplay.js` — IntersectionObserver, one-video-at-a-time, mute-first policy ✅
- `VideoBody` — uses hook, renders media overlay ✅
- `ReelBody` — compact card with video ✅
- `MediaWithOverlay` — play button overlay ✅

### Issues Found
1. **No sound toggle UI** — `toggleMute` exists in hook but no button rendered in VideoBody/ReelBody
2. **No fullscreen mode** — no vertical scroll video feed (Reels-style)
3. **No buffering indicator** — no loading spinner for video
4. **No poster/thumbnail** — videos render without poster attribute
5. **No network error handling** — video play() catch is silent
6. **No lazy loading** — video src loaded immediately
7. **Horizontal scroll conflicts** — StatusRow uses horizontal scroll, potential gesture conflict with vertical video

### Plan
- Add mute/unmute button to VideoBody and ReelBody
- Add loading state and poster support
- Add fullscreen vertical video feed (new component: `VideoFeed`)
- Add buffering indicator CSS
- Ensure horizontal scrolling in StatusRow doesn't conflict

---

## 2. UI STABILITY (SHAKING/LAYOUT SHIFT)

### Potential Issues
1. **FeedItem images** — no reserved dimensions, images load and shift layout
2. **Skeleton loaders** — exist but may not match final content dimensions
3. **Realtime updates** — no duplicate detection in feed
4. **CSS transitions** — feed-modes.css has transitions on hover
5. **useAsyncData** — may cause re-renders on data change

### Plan
- Add `aspect-ratio` to media containers
- Ensure skeleton dimensions match content
- Add stable keys to feed items
- Audit React re-render patterns

---

## 3. NOTIFICATIONS

### Existing Infrastructure
- `notificationService.js` — list, countUnread, markRead, markAllRead ✅
- `supabaseActivityRepository.js` — full CRUD, RLS-safe ✅
- `013_notifications.sql` — table exists ✅
- UI: `SystemPanels.jsx` — notification panel exists

### Issues Found
1. **No realtime subscription** — notifications don't arrive without refresh
2. **No event triggers** — no code creates notifications on follow/like/comment
3. **No push notifications** — no service worker or push subscription
4. **Notification navigation** — clicking notification may not navigate to correct target

### Plan
- Add Supabase realtime subscription for notifications
- Add notification creation in social actions (follow, like, comment)
- Add notification click → navigation handler
- Document push notification requirements

---

## 4. PROFILE (AVATAR + COVER)

### Existing Infrastructure
- `updateProfile` in supabaseIdentityRepository — supports `avatarUrl` field ✅
- `accountService.updateMyProfile(patch)` ✅
- Profiles table has `avatar_url` column

### Issues Found
1. **No avatar upload** — no Supabase Storage upload function
2. **No cover/background** — no `cover_url` column in profiles
3. **No crop/resize** — no image processing
4. **No upload UI** — no file input in profile settings

### Plan
- Add `cover_url` column to profiles (migration 029)
- Add `uploadAvatar` and `uploadCover` functions using Supabase Storage
- Add profile edit UI with file picker, preview, and crop
- Add storage RLS policies

---

## 5. DISCOVER LAYOUT

### Existing Infrastructure
- `GunduaBits.jsx` — PersonCard, ChannelCard ✅
- `GunduaPanels.jsx` — search, filters ✅
- `gundua.css` — styling ✅

### Issues Found
1. **"Mchanganyiko" section** — may be redundant or taking space
2. **Cards may clip** — need to check overflow on mobile
3. **Filter chips** — may wrap awkwardly on small screens

### Plan
- Audit Gundua page layout
- Fix overflow and responsive issues
- Clean up redundant sections

---

## 6. OFFLINE SYSTEM

### Existing Infrastructure (EXCELLENT)
- `localDatabase.js` — IndexedDB with posts, comments, messages, profiles, outbox, contentSharingIndex ✅
- `contentCache.js` — cache-first strategy, TTL, cleanup ✅
- `outboxManager.js` — priority queue, idempotency, retry with backoff ✅
- `syncEngine.js` — background sync, network monitoring, action handlers ✅
- `offlineActions.js` — optimistic updates for post/comment/like/save/follow ✅
- `transportInterfaces.js` — ContentProvider, LocalMessagingTransport, InternetRelayTransport interfaces ✅
- `contentSharingIndex.js` — content sharing metadata ✅

### Assessment
The offline system has **solid architecture**. The interfaces are well-defined but implementations are stubs (throw "Not implemented"). This is **correct behavior** — the interfaces define what native code would implement.

### What Works Now (Web)
- IndexedDB cache ✅
- Outbox queue with retry ✅
- Sync engine with network monitoring ✅
- Optimistic updates ✅

### What Requires Native Code
- Bluetooth/Wi-Fi Direct discovery
- Background peer-to-peer transfer
- Device-to-device content sharing

### Plan
- Wire offline cache into feed loading (cache-first)
- Ensure outbox processes on reconnect
- Add offline indicator to UI
- Document native requirements clearly

---

## 7. INTERNET RELAY

### Existing Infrastructure
- `028_relay_system.sql` — full schema (relay_sessions, relay_usage, relay_queue, mb_balance, hai_quota) ✅
- `028_relay_system_hardened.sql` — security-hardened version ✅
- `systemService.js` — relay status, connection state ✅
- `systemRepository.js` — relay RPC calls ✅

### Issues Found
1. **Schema not deployed** — 028 not on production Supabase
2. **relay_message RPC** — code calls with `p_sender_id` which was removed in hardened version
3. **No UI for relay management** — no provider/client controls
4. **No quota display** — no UI showing relay usage

### Plan
- Ensure code matches hardened schema
- Add relay status to system panels
- Add relay management UI (enable/disable, quota display)
- Document deployment requirements

---

## 8. CLICK INTERCEPTION

### Potential Issues
1. **Sheet component** — may have z-index issues with modals
2. **Feed panels** — overlays may block clicks
3. **Chat panels** — multiple stacked panels
4. **Navigation bars** — may cover content
5. **Dropdown menus** — may be behind cards

### Plan
- Audit z-index hierarchy
- Test all interactive elements
- Fix stacking context issues

---

## FILES TO MODIFY (Phase 1 — UI Stability + Clicks)

| # | File | Change |
|---|------|--------|
| 1 | `src/components/feed/bodies.jsx` | Add video controls, poster, loading |
| 2 | `src/hooks/useVideoAutoplay.js` | Add loading state, error handling |
| 3 | `src/styles/feed.css` | Video controls, buffering indicator |
| 4 | `src/components/feed/FeedItem.jsx` | Stable dimensions for media |
| 5 | `src/components/feed/FeedList.jsx` | Notification wiring |
| 6 | `src/services/notificationService.js` | Add createNotification helper |
| 7 | `src/data/repositories/supabaseIdentityRepository.js` | Add uploadAvatar, uploadCover |
| 8 | `src/pages/Gundua.jsx` | Layout fixes |
| 9 | `src/styles/gundua.css` | Responsive fixes |
| 10 | `src/components/panels.jsx` | z-index audit |
| 11 | `src/styles/panels.css` | Stacking context fixes |
| 12 | `supabase/migrations/029_profile_media.sql` | cover_url, storage policies |

---

## PRIORITY ORDER
1. UI stability + click fixes (immediate)
2. Video UX improvements
3. Profile avatar/cover upload
4. Notifications event wiring
5. Offline cache integration
6. Relay code alignment
7. Discover layout cleanup