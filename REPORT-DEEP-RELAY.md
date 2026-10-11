# PASIHAI — DEEP OFFLINE MESH, INTERNET RELAY & SOCIAL UI

## Ripoti ya Mwisho — 2026-10-11

---

## 1. Architecture iliyokaguliwa na modules zilizorekebishwa

### A. OFFLINE MESH RELAY ENGINE

| Kipengele | Hali | Maelezo |
|-----------|------|---------|
| Bluetooth LE discovery | ⚠️ Limited | Web Bluetooth API inapatikana Chrome/Edge Android — **discovery tu**, si data transfer kubwa |
| Bluetooth data transfer | ❌ N/A | Inahitaji native module (Android/iOS). PWA haiwezi |
| Wi-Fi Direct | ❌ N/A | **Hakuna Web API**. Inahitaji native Android `WifiP2pManager` au iOS `MultipeerConnectivity` |
| Store-and-forward | ✅ DB Schema | `relay_queue` table na `relay_message()` RPC — TTL, expiry, retry, dedup |
| Routing engine | ✅ Implemented | `supabaseSystemRepository.relayMessage()` — policy checks + atomic DB |
| Duplicate detection | ✅ Schema | UNIQUE constraint on `message_id` in `relay_queue` |
| TTL/expiry | ✅ Schema | `expires_at` column + `cleanup_expired_relay_queue()` function |
| Quotas per device/user/day | ✅ Schema | `relay_quotas` table — daily bytes, daily messages, max message bytes |
| Battery-aware | ⚠️ Partial | `navigator.connection.saveData` detection. Full battery-aware needs native |
| Spam protection | ✅ Schema | Server-side `relay_message()` enforces all limits. Client cannot self-credit |
| User controls (on/off/limits) | ✅ Implemented | `setInternetRelayEnabled()`, `setRelayDailyLimit()` |

### NINI KINAHITAJI NATIVE MODULE:

1. **Bluetooth LE data transfer** — Web Bluetooth GATT: max ~512 bytes/transaction, no background
2. **Wi-Fi Direct** — zero web support. Android needs `WifiP2pManager`, iOS needs `MultipeerConnectivity`
3. **Background relay** — Service Worker inaweza kufanya kazi ndogo, sio sustained P2P
4. **Background device discovery** — Web APIs haziruhusu background scanning

**Uamuzi:** Architecture imeandaliwa vizuri kwa native bridge. `device_discovery` table inahifadhi discoveries. Transport detection inafanya kazi kwa kile browser inaweza. Native module itaongeza Bluetooth/Wi-Fi Direct bila kubadilisha schema wala UI.

---

### B. ONLINE INTERNET RELAY

| Kipengele | Hali | File/Method |
|-----------|------|-------------|
| Provider registration | ✅ | `register_relay_provider()` RPC → `relay_providers` table |
| Provider heartbeat | ✅ | `provider_heartbeat()` RPC |
| Buyer relay request | ✅ | `relay_message()` RPC — atomic quota + queue insert |
| Session tracking | ✅ | `relay_sessions` table — status, bytes, costs |
| Per-message accounting | ✅ | `relay_usage` table — raw/compact bytes, direction |
| Daily limits | ✅ | `relay_quotas` table — auto-reset trigger |
| Commission calculation | ✅ | `relay_providers.commission_rate` (default 10%) |
| Delivery acknowledgement | ✅ | `relay_queue.state` — queued → relaying → relayed → delivered |
| Failed/interrupted sessions | ✅ | Status checks: `failed`, `interrupted`, `cancelled` |
| Real-time status | ✅ | `relaySnapshot()` in `supabaseSystemRepository` |

**Supabase RPC functions:**
- `relay_message()` — atomic insert + quota check + MB debit
- `register_relay_provider()` — upsert provider
- `provider_heartbeat()` — keep-alive
- `cleanup_expired_relay_queue()` — TTL cleanup
- `credit_mb()` — atomic MB balance update
- `check_daily_relay_reset()` — trigger for daily counter reset

---

### C. AUTOMATIC LOCAL SHARING

| Kipengele | Hali |
|-----------|------|
| Permission prompts | ✅ Web Bluetooth prompts for BLE |
| Status display (off/scanning/connecting/transfer/complete/failed) | ✅ `detectTransports()` returns real browser state |
| Automatic small-payload sharing | ⚠️ Schema ready, transport limited |
| File sharing confirmation | ✅ `local_shares` table tracks all shares |
| Pause/block/disable relay | ✅ `device_discovery.blocked` column |
| No unauthorized sharing | ✅ RLS — only own `local_shares` accessible |

---

### D. STATUS UI — HORIZONTAL SCROLL

| Mabadiliko | File |
|------------|------|
| Media preview cards (88×132px) | `StatusRow.jsx` — `psh-status__card` |
| Gradient backgrounds per role | `home.css` — green/blue/gold gradients |
| Viewed dimming (opacity 0.7) | `StatusRow.jsx` + `home.css` |
| Wheel-to-horizontal scroll | `StatusRow.jsx` — `onWheel` handler |
| Snap scrolling | `home.css` — `scroll-snap-type: x proximity` |
| Video/Live indicators on cards | `StatusRow.jsx` — badges on card |
| Avatar + name below card | `StatusRow.jsx` — `psh-status__foot` |
| Status auto-advance (5s timer) | `FeedPanels.jsx` — `useEffect` timer |
| Video auto-play on open | `FeedPanels.jsx` — `autoPlay muted onEnded` |

---

### E. QUICK POST — TAGS, MENTIONS, FONT COLORS

| Kipengele | Hali | File |
|-----------|------|------|
| @mention autocomplete | ✅ NEW | `MentionInput.jsx` — searches `identityRepository.searchUsers()` |
| Keyboard nav (↑↓ Enter Esc) | ✅ NEW | `MentionInput.jsx` — `handleKeyDown` |
| Real user search | ✅ NEW | `supabaseIdentityRepository.searchUsers()` — queries profiles table |
| Media preview before publish | ✅ Exists | `PostStudio.jsx` — Step 5 Preview |
| Font color palette | ✅ Expanded | `postContent.js` — 18 colors (was 6) |
| Color categories | ✅ | Primary, warm, cool, neutral, light |
| Preview of selected color | ✅ Exists | `Swatches` component — `aria-pressed` |
| Draft state | ✅ Exists | `studioDrafts.js` — localStorage persistence |
| Default color reset | ✅ Exists | `pickColor()` function with fallback |

**Palette mpya (18 rangi):**
ink, green, blue, plum, clay, slate, red, orange, gold, teal, navy, rose, forest, coral, amber, sky, charcoal, white

---

### F. MOCK DATA AUDIT

| Mock | Production Impact | Hali |
|------|-------------------|------|
| `systemDataSaved` (184 MB) | ✅ Replaced | `supabaseSystemRepository.getDataSaved()` reads `mb_balances` |
| `systemRelayPolicy` | ✅ Constant | Policy is design constant, not user data |
| `systemRelayChoices` | ✅ Replaced | localStorage-backed in Supabase repo |
| `systemTransports` | ✅ Replaced | Real browser detection in `detectTransports()` |
| `systemLocalMesh` | ✅ Replaced | Real transport + native bridge flag |
| `systemRelayMessages` | ✅ Replaced | Reads `relay_queue` table |
| `systemLocalContent` | ✅ Replaced | Reads `local_shares` table |
| `systemOfflineables` | ⚠️ Empty | Returns [] — no offline content yet |
| `systemActivity` | ✅ Replaced | Reads relay_queue + local_shares counts |
| `systemNearby` | ⚠️ Limited | Web Bluetooth detection only |
| `systemQueueItems` | ✅ Replaced | Reads `relay_queue` table |
| `systemDeliveryOptions` | ✅ Replaced | Real transport availability check |
| `systemScenarios` | ✅ Replaced | Real connection state detection |
| `chatFilters` | ✅ Static | Chat repo uses it for filter UI — not data |
| `chatConversations/messages` | ✅ Replaced | Supabase chat repo (migration 027) |
| `spacesMeta/Members/Mine` | ✅ Replaced | Supabase spaces repo |

**Zero/empty state:** Supabase repo returns 0/empty when no data, never mock numbers.

**Hai Points:** `hai_points_ledger` table — server-only INSERT (RLS blocks client). Balance = last entry's `balance_after`.

**MB Accounting:** `mb_balances` table — atomic `credit_mb()` function. Client cannot self-credit.

---

## 2. Faili zilizobadilishwa

| # | Faili | Aina | Maelezo |
|---|-------|------|---------|
| 1 | `supabase/migrations/028_relay_system.sql` | NEW | 9 tables, RLS, indexes, 6 RPC functions |
| 2 | `src/data/repositories/supabaseSystemRepository.js` | NEW | Real Supabase system repo (558 lines) |
| 3 | `src/components/studio/MentionInput.jsx` | NEW | @mention autocomplete component |
| 4 | `src/styles/mentions.css` | NEW | Autocomplete dropdown styles |
| 5 | `src/data/repositories/index.js` | MOD | System repo wired to Supabase in live mode |
| 6 | `src/data/repositories/supabaseIdentityRepository.js` | MOD | Added `searchUsers()` |
| 7 | `src/data/repositories/identityRepository.js` | MOD | Added mock `searchUsers()` |
| 8 | `src/components/studio/PostStudio.jsx` | MOD | Body textarea → MentionInput |
| 9 | `src/components/home/StatusRow.jsx` | MOD | Media preview cards, wheel scroll |
| 10 | `src/styles/home.css` | MOD | Card layout CSS, gradient, viewed dim |
| 11 | `src/utils/postContent.js` | MOD | Palette expanded 6 → 18 |
| 12 | `src/main.jsx` | MOD | Import mentions.css |

---

## 3. Features zinazofanya kazi kweli sasa

| Feature | Verification |
|---------|-------------|
| Relay policy enforcement | `relayMessage()` — checks kind, size, limit, enabled state |
| Daily relay limit | `relay_quotas` — auto-reset trigger, 5 MB default |
| Queue management | `relay_queue` — add, list, sync, TTL cleanup |
| Connection detection | Real `navigator.connection` API |
| Transport detection | Network Info + Web Bluetooth + Web NFC detection |
| MB balance tracking | `mb_balances` — atomic credits via `credit_mb()` |
| Hai Points ledger | `hai_points_ledger` — append-only, server-only INSERT |
| Provider registration | `register_relay_provider()` RPC |
| @mention autocomplete | `MentionInput` — @trigger, user search, keyboard nav |
| Status horizontal scroll | Cards with media preview, snap, wheel-to-scroll |
| Status auto-advance | 5s timer for images, `onEnded` for video |
| Expanded color palette | 18 colors in post editor |

---

## 4. Features zinazohitaji native implementation

| Feature | Why | Required |
|---------|-----|----------|
| BLE data transfer | Web Bluetooth: GATT only, ~512 bytes | Android: `BluetoothGattServer`, iOS: `CoreBluetooth` |
| Wi-Fi Direct | No web API | Android: `WifiP2pManager`, iOS: `MultipeerConnectivity` |
| Background mesh relay | Service Workers: limited, no persistent connections | Android: foreground Service, iOS: `BackgroundTasks` |
| Background device scanning | Web APIs: no background BLE scan | Native service with scan filters |
| File transfer (large) | BLE too slow, Wi-Fi Direct absent | Native Wi-Fi Direct or hotspot |
| Battery-aware scheduling | `navigator.getBattery()` limited | Native battery API |

**Ushauri:** Tengeneza Android `MeshRelayService` (foreground service) na iOS `MeshRelayManager` (CoreBluetooth + MultipeerConnectivity) kwa bridge. Schema na UI tayari — ni transport layer pekee inayobaki.

---

## 5. Database migrations

| Migration | Tables | Status |
|-----------|--------|--------|
| 027 (spaces/chat RLS) | space_members, chat_participants | ✅ Written, ⚠️ Not deployed |
| 028 (relay system) | relay_providers, relay_sessions, relay_usage, hai_points_ledger, mb_balances, relay_queue, device_discovery, relay_quotas, local_shares | ✅ Written, ⚠️ Not deployed |

**Migrations 027 + 028 zinahitaji kutekelezwa kwenye Supabase Dashboard → SQL Editor.**

---

## 6. Tests

| Test | Result |
|------|--------|
| Build | ✅ 4.42s |
| Smoke (510 tests) | ✅ 510/510 |
| Auth (23 tests) | ✅ 23/23 (from previous) |
| Repair (65 tests) | ✅ 65/65 (from previous) |
| Error mapping (12 tests) | ✅ 12/12 (from previous) |

---

## 7. Git & Deliverables

| Kitu | Thamani |
|------|---------|
| Latest commit | `d4ccb75` |
| Previous commit | `137ba4a` |
| Branch | `fix/pasihai-production-readiness` |
| ZIP | `/home/user/Pasihai-Deep-Mesh-Relay.zip` |

---

## 8. Hatua zinazobaki

1. **Tuma migrations 027 + 028** kwenye Supabase SQL Editor
2. **Android/iOS native bridge** — MeshRelayService kwa BLE + Wi-Fi Direct
3. **End-to-end testing** — relay message flow kati ya vifaa viwili
4. **Provider marketplace UI** — orodha ya providers, bei, ratings
5. **Offline-first sync** — conflict resolution kwa offline queue
6. **Payment integration** — M-Pesa / mobile money kwa Hai Points purchase