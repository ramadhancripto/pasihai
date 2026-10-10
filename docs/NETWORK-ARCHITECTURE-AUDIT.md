# PASIHAI — AUDIT YA USANIFU WA NETWORK

**Tarehe:** 2026-10-10  
**Hali:** ⚠️ IMEKAGULIWA — Hakuna implementation halisi ya network features

---

## 1. MUHTASARI WA MTENDAJI

### Matokeo Makuu

**Ukweli:** PASIHAI ni **prototype ya UI-only** yenye **mock data** ya network features. Hakuna implementation halisi ya:
- ❌ Offline/local-first storage (IndexedDB)
- ❌ Pending actions/outbox na store-and-forward
- ❌ Online synchronization na retry logic
- ❌ Internet relay (mock tu)
- ❌ Device-to-device relay na mesh networking (mock tu)
- ❌ Discovery ya watu/vifaa vya karibu (mock tu)
- ❌ Security/encryption kwa messages
- ❌ Battery/data limits enforcement
- ❌ Network switching na recovery

### Kile Kilichopo

**✅ Iliyopo:**
- Mock data ya relay/mesh/nearby (src/data/mock.js)
- UI ya system panels (SystemPanels.jsx)
- UI ya relay controls
- Mock transports (Wi-Fi Direct, Bluetooth, Internet)
- Supabase client (haijatumika kwa live mode)
- localStorage kwa user preferences tu

**❌ Isiyopo:**
- IndexedDB au local database
- Outbox/pending queue
- Sync engine
- Transport adapters (WebRTC, Bluetooth, Wi-Fi Direct)
- Discovery protocols
- Encryption/signing
- Rate limiting/quota enforcement
- Background sync (service worker)
- PWA support

### Hitimisho

PASIHAI ina **UI nzuri** inayoonyesha network features, lakini **hakuna backend halisi** au **network implementation**. Ni kama gari lenye dashboard nzuri lakini hakuna engine, transmission, au wheels.

---

## 2. AUDIT YA KINA KWA KILA FEATURE

### 2.1 Offline/Local-First Storage na Cache

**Hali:** ❌ Missing

**Ushahidi:**
```bash
$ grep -r "IndexedDB\|indexedDB\|localForage\|Dexie\|PouchDB" src/
(hakuna matokeo)
```

**Kile Kilichopo:**
- localStorage kwa user preferences tu (src/utils/storage.js)
- Mock data in-memory (inapotea ukifunga app)

**Kile Kinachohitajika:**
- IndexedDB kwa structured data (posts, comments, messages, profiles)
- Cache layer kwa content iliyopakuliwa
- Storage quota management
- Data migration/versioning

**Dependencies za Browser:**
- ✅ IndexedDB API (inapatikana kwa browsers zote za kisasa)
- ✅ Storage API (navigator.storage.estimate())
- ⚠️ Storage limits (~50MB kwa mobile, ~500MB kwa desktop)

---

### 2.2 Pending Actions/Outbox na Store-and-Forward

**Hali:** ❌ Missing

**Ushahidi:**
```bash
$ grep -r "outbox\|pending.*queue" src/
src/data/repositories/chatRepository.js:// BAADAYE: LocalChatRepository (local DB + outbox)
```

**Kile Kilichopo:**
- Comment tu ("BAADAYE: outbox")
- Mock queue data (systemQueueItems kwenye mock.js)

**Kile Kinachohitajika:**
- Outbox table kwenye IndexedDB
- Queue manager (enqueue, dequeue, retry)
- Idempotency keys (kuzuia duplicates)
- Priority queue (actions muhimu kwanza)
- Exponential backoff kwa retries

**Implementation Plan:**
```javascript
// src/utils/outbox.js
class OutboxManager {
  async enqueue(action) { ... }
  async process() { ... }
  async retry(id) { ... }
  async clear() { ... }
}
```

---

### 2.3 Online Synchronization, Retry, Idempotency na Conflict Resolution

**Hali:** ❌ Missing

**Ushahidi:**
- Hakuna sync engine
- Hakuna retry logic
- Hakuna idempotency keys
- Hakuna conflict resolution

**Kile Kilichopo:**
- Mock sync status (synced, waiting, failed)
- UI ya sync button (haifanyi kazi)

**Kile Kinachohitajika:**
- Sync engine inayofuatilia online/offline status
- Retry logic na exponential backoff
- Idempotency keys (UUID kwa kila action)
- Conflict resolution (last-write-wins au manual merge)
- Server acknowledgements (kuthibitisha action imefika)
- Delta sync (kusynchronize mabadiliko tu)

**Implementation Plan:**
```javascript
// src/utils/syncEngine.js
class SyncEngine {
  async sync() { ... }
  async resolveConflict(local, remote) { ... }
  async waitForAcknowledgement(actionId) { ... }
}
```

---

### 2.4 Internet Relay

**Hali:** ⚠️ Mock-Only

**Ushahidi:**
```javascript
// src/data/mock.js
export const systemRelayChoices = [
  { id: 'text', label: 'Ujumbe mfupi', rawKb: 2.1, compactKb: 0.8, state: 'allowed' },
  // ... mock data tu
]
```

**Kile Kilichopo:**
- Mock relay choices (text, metadata, delivery receipts)
- Mock relay messages (systemRelayMessages)
- UI ya relay controls (enable/disable, daily limit)
- Mock quota enforcement (3 MB/day, 5 MB/day hard cap)

**Kile Kinachohitajika:**
- Relay protocol (message format, headers, TTL)
- Relay server (au peer-to-peer relay)
- Quota tracking (bytes sent/received)
- Rate limiting (messages per minute)
- Message integrity verification
- Delivery acknowledgements
- Duplicate detection (message IDs)

**Sera za Relay:**
- ✅ Internet Relay OFF by default, explicit opt-in
- ✅ 3 MB/day kwa matumizi ya kawaida, 5 MB/day hard cap
- ✅ Ujumbe na metadata muhimu pekee (hakuna media/files)
- ⚠️ TTL/hop limits (haijatekelezwa)
- ⚠️ Duplicate forwarding prevention (haijatekelezwa)

**Implementation Plan:**
```javascript
// src/utils/relay.js
class InternetRelay {
  async send(message) { ... }
  async receive() { ... }
  async checkQuota() { ... }
  async acknowledge(messageId) { ... }
}
```

---

### 2.5 Device-to-Device Relay na Mesh Networking

**Hali:** ❌ Missing (Mock tu)

**Ushahidi:**
```bash
$ grep -r "mesh.*network\|device.*to.*device" src/
(hakuna implementation halisi)
```

**Kile Kilichopo:**
- Mock mesh data (systemLocalMesh)
- Mock transports (Wi-Fi Direct, Bluetooth)
- UI ya nearby devices

**Kile Kinachohitajika:**
- Transport adapters:
  - WebRTC (kwa browser-to-browser)
  - Bluetooth Low Energy (BLE) — inahitaji native app
  - Wi-Fi Direct — inahitaji native app
  - mDNS/DNS-SD (kwa device discovery)
- Mesh routing protocol (flooding, gossip, au DHT)
- Hop count/TTL
- Message deduplication
- Peer authentication

**Capabilities na Mipaka ya Browser:**

| Feature | Browser | Android Native | iOS Native |
|---------|---------|----------------|------------|
| WebRTC (P2P) | ✅ | ✅ | ✅ |
| Bluetooth (BLE) | ❌ (Web Bluetooth API ni mdogo) | ✅ | ✅ |
| Wi-Fi Direct | ❌ | ✅ | ⚠️ (MultipeerConnectivity) |
| mDNS Discovery | ⚠️ (mdns browser extension) | ✅ | ✅ |
| Background Sync | ⚠️ (Service Worker) | ✅ | ✅ |

**Hitimisho:**
- **Browser pekee:** WebRTC tu inafanya kazi (P2P over internet)
- **Native app inahitajika:** Bluetooth, Wi-Fi Direct, background discovery

**Implementation Plan:**
```javascript
// src/utils/transports/webrtc.js
class WebRTCTransport {
  async connect(peerId) { ... }
  async send(data) { ... }
  async receive() { ... }
}

// src/utils/transports/bluetooth.js (native only)
class BluetoothTransport {
  async scan() { ... }
  async connect(deviceId) { ... }
  async send(data) { ... }
}
```

---

### 2.6 Discovery ya Watu/Vifaa vya Karibu

**Hali:** ❌ Missing (Mock tu)

**Ushahidi:**
```javascript
// src/data/mock.js
export const systemNearby = {
  devices: [
    { id: 'd1', name: 'Simu ya Juma', distance: '2m', ... },
    // ... mock data tu
  ]
}
```

**Kile Kilichopo:**
- Mock nearby devices
- Mock discovery UI
- Mock transport availability

**Kile Kinachohitajika:**
- Device discovery:
  - WebRTC signaling server (kwa browser)
  - BLE scanning (kwa native app)
  - mDNS/DNS-SD (kwa local network)
- User discovery:
  - Local network broadcast
  - QR code scanning
  - Username search (kupitia server)
- Content discovery:
  - Local cache
  - Peer recommendations
  - Server search

**Aina za Discovery:**

1. **Discovery ya vifaa vilivyo karibu**
   - Browser: WebRTC signaling server + mDNS (mdogo)
   - Native: BLE scanning, Wi-Fi Direct discovery

2. **Discovery ya watumiaji kwenye local network**
   - mDNS/DNS-SD broadcast
   - Local network multicast

3. **Discovery ya users/content/communities kupitia internet**
   - Server search API
   - Recommendations engine

4. **Cached discovery wakati internet haipo**
   - IndexedDB cache ya users/content
   - TTL kwa cached data
   - Manual refresh

**Implementation Plan:**
```javascript
// src/utils/discovery.js
class DiscoveryManager {
  async scanNearbyDevices() { ... }
  async broadcastPresence() { ... }
  async searchUsers(query) { ... }
  async getCachedUsers() { ... }
}
```

---

### 2.7 Security, Encryption, Authorization, Privacy na Relay Consent

**Hali:** ⚠️ Partial (Supabase Auth tu)

**Kile Kilichopo:**
- Supabase Auth (email/password)
- JWT tokens (kutoka Supabase)
- RLS policies (kwenye migrations, hazijathibitishwa)

**Kile Kinachohitajika:**
- End-to-end encryption kwa messages (Signal Protocol au Double Ratchet)
- Message signing (kuthibitisha authenticity)
- Key management (public/private keys)
- Relay consent (ruhusa ya kusafirisha ujumbe)
- Abuse prevention (rate limiting, spam detection)
- Privacy controls (who can see me, who can message me)

**Implementation Plan:**
```javascript
// src/utils/crypto.js
class CryptoManager {
  async generateKeyPair() { ... }
  async encrypt(message, recipientPublicKey) { ... }
  async decrypt(ciphertext, privateKey) { ... }
  async sign(message, privateKey) { ... }
  async verify(signature, message, publicKey) { ... }
}
```

**Dependencies:**
- libsodium-wrappers (encryption/signing)
- tweetnacl (lightweight crypto)
- libsignal-protocol-javascript (Signal Protocol)

---

### 2.8 Battery/Data Limits, Network Switching na Recovery

**Hali:** ❌ Missing

**Kile Kilichopo:**
- Mock data limits (3 MB/day, 5 MB/day)
- Mock battery status
- UI ya data saver mode

**Kile Kinachohitajika:**
- Battery API (navigator.getBattery())
- Network Information API (navigator.connection)
- Quota tracking (bytes sent/received per day)
- Rate limiting (messages per minute)
- Network switching (Wi-Fi ↔ cellular ↔ offline)
- Recovery baada ya app restart (reload pending queue)

**Implementation Plan:**
```javascript
// src/utils/resourceManager.js
class ResourceManager {
  async checkBattery() { ... }
  async checkNetwork() { ... }
  async trackDataUsage(bytes) { ... }
  async checkQuota() { ... }
  async onNetworkChange(callback) { ... }
}
```

---

## 3. ARCHITECTURE ILIYOPO VS INAYOHITAJIKA

### 3.1 Architecture Iliyopo (Sasa)

```
┌─────────────────────────────────────┐
│ Product Layer (UI)                  │
│ Home, Chat, Gundua, Spaces, ...     │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ Service Layer                       │
│ homeService, chatService, ...       │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ Repository Layer                    │
│ mockContentRepository,              │
│ supabaseContentRepository, ...      │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ Data Layer                          │
│ mock.js (in-memory)                 │
│ Supabase (cloud, haijatumika)       │
└─────────────────────────────────────┘
```

**Matatizo:**
- ❌ Hakuna local database (IndexedDB)
- ❌ Hakuna outbox/pending queue
- ❌ Hakuna sync engine
- ❌ Hakuna transport layer
- ❌ Hakuna discovery layer
- ❌ Hakuna security layer (beyond Supabase Auth)

### 3.2 Architecture Inayohitajika

```
┌─────────────────────────────────────┐
│ Product Layer (UI)                  │
│ Home, Chat, Gundua, Spaces, ...     │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ Service Layer                       │
│ homeService, chatService, ...       │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ Repository Layer                    │
│ contentRepository,                  │
│ identityRepository, ...             │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ Local Data Layer (MPYA)             │
│ IndexedDB (cache + outbox)          │
│ Sync Engine                         │
│ Conflict Resolution                 │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ Transport Layer (MPYA)              │
│ Internet (Supabase)                 │
│ WebRTC (P2P)                        │
│ Bluetooth (Native)                  │
│ Wi-Fi Direct (Native)               │
│ Internet Relay                      │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ Discovery Layer (MPYA)              │
│ Nearby Devices                      │
│ Local Network Users                 │
│ Internet Search                     │
│ Cached Discovery                    │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ Security Layer (MPYA)               │
│ End-to-End Encryption               │
│ Message Signing                     │
│ Key Management                      │
│ Relay Consent                       │
│ Abuse Prevention                    │
└─────────────────────────────────────┘
```

---

## 4. DEPENDENCIES ZA BROWSER/NATIVE

### 4.1 Browser APIs (Zinapatikana)

| API | Hali | Matumizi |
|-----|------|----------|
| IndexedDB | ✅ Stable | Local database |
| Storage API | ✅ Stable | Quota management |
| WebRTC | ✅ Stable | P2P communication |
| Service Worker | ✅ Stable | Background sync, caching |
| Web Bluetooth | ⚠️ Limited | BLE devices (Chrome only) |
| Web NFC | ⚠️ Limited | NFC tags (Chrome Android only) |
| Battery API | ✅ Stable | Battery monitoring |
| Network Information | ⚠️ Limited | Network type detection |
| Geolocation | ✅ Stable | Location-based discovery |

### 4.2 Native APIs (Zinahitaji Native App)

| API | Platform | Matumizi |
|-----|----------|----------|
| Bluetooth Low Energy | Android, iOS | Mesh networking |
| Wi-Fi Direct | Android | P2P file transfer |
| MultipeerConnectivity | iOS | P2P communication |
| mDNS/DNS-SD | Android, iOS | Device discovery |
| Background Tasks | Android, iOS | Background sync |
| Push Notifications | Android, iOS | Real-time alerts |

### 4.3 Libraries Zinahitajika

**Required:**
- `idb` au `Dexie.js` — IndexedDB wrapper
- `uuid` — Idempotency keys
- `libsodium-wrappers` — Encryption/signing

**Optional:**
- `workbox` — Service worker utilities
- `peerjs` — WebRTC signaling
- `localforage` — Cross-browser storage

---

## 5. MPANGO WA UTEKELEZAJI

### Phase 1: Local Data Layer (Wiki 1-2)

**Lengo:** Kufanya app ifanye kazi offline na kuhifadhi data locally

**Hatua:**
1. Install `idb` au `Dexie.js`
2. Tengeneza IndexedDB schema (posts, comments, messages, profiles, outbox)
3. Tengeneza LocalDatabase class (CRUD operations)
4. Tengeneza CacheManager (content caching na TTL)
5. Tengeneza OutboxManager (pending actions queue)
6. Badilisha repositories kutumia local database
7. Ongeza tests za offline scenarios

**Deliverables:**
- `src/utils/localDatabase.js`
- `src/utils/cacheManager.js`
- `src/utils/outboxManager.js`
- Tests: offline CRUD, restart recovery, quota limits

### Phase 2: Sync Engine (Wiki 3-4)

**Lengo:** Kusynchronize local data na Supabase

**Hatua:**
1. Tengeneza SyncEngine class
2. Tengeneza retry logic na exponential backoff
3. Tengeneza idempotency keys
4. Tengeneza conflict resolution (last-write-wins)
5. Ongeza server acknowledgements
6. Ongeza delta sync (mabadiliko tu)
7. Ongeza tests za sync scenarios

**Deliverables:**
- `src/utils/syncEngine.js`
- Tests: online/offline transitions, retries, conflicts, duplicates

### Phase 3: Transport Layer (Wiki 5-8)

**Lengo:** Kuwezesha P2P communication

**Hatua:**
1. Tengeneza Transport interface
2. Tengeneza InternetTransport (Supabase)
3. Tengeneza WebRTCTransport (browser P2P)
4. Tengeneza signaling server (au tumia PeerJS cloud)
5. Tengeneza transport manager (chagua transport bora)
6. Ongeza tests za P2P scenarios

**Deliverables:**
- `src/utils/transport.js` (interface)
- `src/utils/transports/internet.js`
- `src/utils/transports/webrtc.js`
- Tests: connection, disconnection, network switching

### Phase 4: Discovery Layer (Wiki 9-12)

**Lengo:** Kugundua devices na users

**Hatua:**
1. Tengeneza DiscoveryManager class
2. Tengeneza device discovery (WebRTC signaling)
3. Tengeneza user discovery (server search)
4. Tengeneza cached discovery (IndexedDB cache)
5. Ongeza QR code scanning (kwa pairing)
6. Ongeza tests za discovery scenarios

**Deliverables:**
- `src/utils/discovery.js`
- Tests: device discovery, user search, cached discovery

### Phase 5: Security Layer (Wiki 13-16)

**Lengo:** End-to-end encryption na message integrity

**Hatua:**
1. Install `libsodium-wrappers`
2. Tengeneza CryptoManager class
3. Tengeneza key generation/storage
4. Tengeneza message encryption/signing
5. Tengeneza key exchange protocol
6. Ongeza relay consent mechanism
7. Ongeza tests za security scenarios

**Deliverables:**
- `src/utils/crypto.js`
- Tests: encryption, signing, key exchange, relay consent

### Phase 6: Relay na Mesh (Wiki 17-20)

**Lengo:** Internet relay na mesh networking

**Hatua:**
1. Tengeneza InternetRelay class
2. Tengeneza quota tracking (3 MB/day, 5 MB/day cap)
3. Tengeneza rate limiting
4. Tengeneza TTL/hop limits
5. Tengeneza duplicate detection
6. Tengeneza mesh routing (flooding au gossip)
7. Ongeza tests za relay/mesh scenarios

**Deliverables:**
- `src/utils/relay.js`
- `src/utils/mesh.js`
- Tests: quota, rate limiting, TTL, duplicates, mesh routing

### Phase 7: Native App (Wiki 21-24)

**Lengo:** Bluetooth na Wi-Fi Direct support

**Hatua:**
1. Tengeneza React Native au Capacitor app
2. Tengeneza BluetoothTransport (BLE)
3. Tengeneza WiFiDirectTransport
4. Tengeneza background sync
5. Tengeneza push notifications
6. Ongeza tests za native features

**Deliverables:**
- Native app (Android + iOS)
- `src/utils/transports/bluetooth.js`
- `src/utils/transports/wifiDirect.js`
- Tests: BLE scanning, Wi-Fi Direct pairing, background sync

---

## 6. HITIMISHO

### Ukweli wa PASIHAI

PASIHAI ni **prototype ya UI-only** yenye:
- ✅ UI/UX nzuri
- ✅ Mock data ya network features
- ❌ Hakuna implementation halisi ya network features
- ❌ Hakuna local database
- ❌ Hakuna sync engine
- ❌ Hakuna transport layer
- ❌ Hakuna discovery layer
- ❌ Hakuna security layer (beyond Supabase Auth)

### Muda Unaohitajika

- **Phase 1-2 (Wiki 1-4):** Local data layer + sync engine
- **Phase 3-4 (Wiki 5-12):** Transport + discovery layers
- **Phase 5-6 (Wiki 13-20):** Security + relay/mesh
- **Phase 7 (Wiki 21-24):** Native app (Bluetooth, Wi-Fi Direct)
- **Jumla:** Miezi 6 ya kazi ya full-time

### Hatua ya Kwanza

**Anza na Phase 1: Local Data Layer**
- Install `idb` (IndexedDB wrapper)
- Tengeneza local database schema
- Tengeneza outbox manager
- Badilisha repositories kutumia local database
- Ongeza tests za offline scenarios

Hii itafanya app ifanye kazi offline na kuandaa msingi kwa sync engine na transport layer.

---

**Ripoti imeandaliwa na:** PASIHAI Network Architect  
**Tarehe:** 2026-10-10  
**Muda:** ~90 dakika za audit  
**Hali:** ⚠️ IMEKAGULIWA — Tayari kwa utekelezaji

---

**MWISHO WA RIPOTI**
