# Two-device LAN mesh — acceptance

**Not executed in Arena.** Fill Pass? only on hardware.

## Environment

- Two Android phones, **same Wi-Fi** (not guest isolation; mDNS/NSD allowed).
- Debug APK of this branch (`PasihaiMeshPlugin`, `com.pasihai.app`).
- Permissions: nearby Wi-Fi / location as the OS version requires for NSD.
- Internet **off** on both during transfer (prove LAN).
- Do **not** treat Node `test:mesh-protocol` as this checklist.

## Build (developer machine)

```bash
cd pasihai
npm ci
npm run build
npx cap sync android
# Android Studio / gradle assembleDebug — not run in this sandbox
```

## Runtime (on each phone)

App foreground. `distributionService.autoStart` runs if plugin + discoverable.

| Phone | Role |
|-------|------|
| A | Ingest public content (`createDistributionEngine.ingestBytes` / future UI) |
| B | `nearbyPeers()` then `pullFromLanPeer(peer, contentId)` |

## Checklist (run in order)

| # | Check | Pass? | Notes |
|---|--------|-------|-------|
| 1 | Both start mesh, bind 17432–17436 | | `startMesh`; fail = bind/permission |
| 2 | B lists A via NSD | | Peer has **host + port**, `transport: lan-nsd`, lastSeen within 15s. Empty list is valid if scan finds nothing — not a fake pass. |
| 3 | Discoverability off on A | | B must **not** keep seeing A after TTL; HTTP 403 if not allowlisted |
| 4 | ECDH session + request MAC | | Unauthorized GET manifest → 401 |
| 5 | Transfer public file A→B | | `getBytes` SHA-256 **equals** A |
| 6 | Interrupt / resume | | Kill mid-chunk; pull again; incomplete not playable until hash OK |
| 7 | Duplicate pull | | Second pull complete, no extra copy error |
| 8 | Private content | | HTTP 403; B must not ingest |
| 9 | Replay nonce | | Second session same nonce → 409 |
| 10 | Permission denied | | Empty peers + explicit reason, no invented devices |
| 11 | App backgrounded | | Discovery may stop; `backgroundGuaranteed: false` |

**Sandbox 2026-10-16:** all rows **NOT RUN**.

BLE / Wi-Fi Direct / multi-hop / A→B→server Internet Relay: **out of this checklist**.

## After LAN pass (next phase — do not start here)

Required Internet Relay (not implemented):

1. A offline queues outbox `internet_relay`.
2. A transfers **payload + recipientId + idempotencyKey** to authorized B over LAN.
3. B (online) calls existing `relay_message` RPC as **carrier**, without claiming B is the sender if 028 uses `auth.uid()` — **schema gap**: 028 sender = authenticated B, not A. Plan must add a **carry** RPC or signed blob; do not fake sender.
4. Recipient fetch/ack (037, unapplied).
5. `delivered` only after recipient ack.

Reuse: `relayQueue.js`, `meshProtocol.js`, `relay_message` — no second outbox.
