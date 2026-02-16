# WAAN

WAAN is a ChatScope/WhatsApp analytics dashboard. It analyzes mirrored chat
history and renders insights such as activity trends, participant behavior,
highlights, message types, sentiment, and system events.

WAAN is available as:

- A web dashboard served from this repo
- A macOS Electron desktop app (distributed as `.dmg`)

## What It Does

- Loads mirrored chats from a connected ChatScope account via the relay.
- Persists loaded chats in the local in-app library for quick switching.
- Computes analytics across time, participants, and message categories.
- Supports search, saved views, and multiple export formats.
- Syncs from a live linked account through `apps/server`.

## Quick Start (Web Dashboard)

### 1. Install dependencies

```bash
npm install
```

### 2. Start the local dashboard server

```bash
npm start
```

This serves the app from the repo root at:

- `http://127.0.0.1:4173` (or your machine IP on port `4173`)

### 3. Open the app

Open the URL in your browser and load chat data from the UI.

## macOS Desktop App (DMG)

If you installed WAAN from a released `.dmg`:

1. Open the `.dmg` and drag `WAAN.app` to `Applications`.
2. Launch `WAAN.app`.
3. On first launch, use the app menu and in-app controls to connect relay sync
   (optional) and load chats.

The desktop app starts the local dashboard and relay services automatically.

## Run Electron Locally (Developer)

```bash
npm install
cd electron
npm install
npm start
```

This starts the Electron shell, local static dashboard server, and relay
backend together.

## Build macOS Desktop Artifact

```bash
cd electron
npm run dist
```

This uses `electron-builder --mac` to create macOS distributables.

## Optional: Run Live Relay Sync

If you want live chat sync support, run the relay workspace in a second terminal:

```bash
npm start --workspace apps/server
```

Default relay endpoints:

- API: `http://127.0.0.1:3334`
- Relay status/control: `http://127.0.0.1:4546`

Relay setup details: `docs/live-whatsapp.md`  
Relay troubleshooting: `docs/relay-troubleshooting.md`

## Scripts

- `npm run lint` - lint dashboard + server code
- `npm test` - run test suite
- `npm run verify` - lint + tests
- `npm run ci:verify` - full local quality gate

## Project Docs

- `docs/feature-map.md` - module ownership and responsibilities
- `docs/app-shell-architecture.md` - dashboard architecture notes
- `docs/release-smoke-checklist.md` - packaged smoke checklist / relay checks

## License

- Code is licensed under MIT: `LICENSE`
- Additional terms and dependency notices: `NOTICE`
