# Pasihai — Local Offline Relay (Windows)

Branch `arena/honesty-cleanup`. This ZIP is a **full source tree** (no `node_modules`, no `.env`, no secrets).

**This is not a finished social network.** Mock product runtime is gone. Main app still needs live Supabase env except **Local Relay Lab**.

## What works in this package

| | |
|--|--|
| Local Relay Lab UI | `#/relay-lab` without login |
| Simulated peers SIM-A / SIM-B | **Labelled simulation**, real SHA-256 engine |
| Node lab | `npm run lab:relay` (optional, port 8765) |
| Two Android phones LAN/NSD | **Code present, not proven in this environment** |
| Internet Relay A→B→server | **Not implemented** |
| BLE / Wi-Fi Direct | **Not implemented** |
| Migrations 037/038 | **Files only, do not apply** — **not required** for this lab |

## Windows setup

```bat
cd pasihai
npm ci
npm run dev
```

Browser: open the Vite URL, then **`#/relay-lab`**.

If you see a Supabase config error, use the **Local Relay Lab** link on that page, or set the hash to `#/relay-lab`.

Optional Node API:

```bat
npm run lab:relay
```

`GET http://127.0.0.1:8765/health`

## Tests

```bat
npm run test:lab
npm run test:distribution
npm run test:mesh-protocol
npm run test:relay-queue
npm run test:honesty
npm run smoke
```

`npm run test:hosted-relay` exits **2 SKIPPED** without staging credentials.

## Integrate into an existing Git checkout (do not delete your work)

Do **not** unzip over `main` and do **not** `git reset --hard`.

```bat
cd your-existing-pasihai
git status
git checkout -b arena/honesty-cleanup-import
```

Copy files from the ZIP **except** `.env*`, `node_modules`, `dist`. Review `git diff`, then commit.

If you already have this branch from Arena, prefer `git fetch` / merge after you own the remote — this ZIP has **no `origin` remote**.

## Troubleshooting

- `npm ci` fails: use Node 20+, keep `package-lock.json`.
- Port 5173 busy: stop other Vite processes.
- Lab peers look “real”: they are **not**. Kind is `simulated`.
- Phones: follow `scripts/TWO_DEVICE_MESH.md`. Empty nearby list is honest.
