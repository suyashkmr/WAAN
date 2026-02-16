# WAAN macOS Desktop Guide

WAAN is distributed as an Electron desktop app for macOS (`WAAN.app` via `.dmg`)
and can also be built locally from this repository.

## Install from Released DMG

1. Open the released `.dmg`.
2. Drag `WAAN.app` to `Applications`.
3. Launch `WAAN.app`.

At startup, the app brings up:

- Local dashboard UI (default `http://127.0.0.1:4173`)
- API server (default `http://127.0.0.1:3334`)
- Relay control server (default `http://127.0.0.1:4546`)

## Run Desktop App Locally (Developer)

From the repository root:

```bash
npm install
cd electron
npm install
npm start
```

## Build macOS Artifact Locally

```bash
cd electron
npm run dist
```

This runs `electron-builder --mac` and produces macOS distributables.

## Environment Overrides

You can override local host/ports when launching:

- `WAAN_CLIENT_HOST`, `WAAN_CLIENT_PORT`
- `WAAN_API_PORT`
- `WAAN_RELAY_PORT`

## Troubleshooting

- **App opens but relay is disconnected**: use **Connect** in the app and scan
  the QR code from ChatScope linked devices.
- **No QR shown**: remove `~/Library/Application Support/WAAN/relay-session`
  and relaunch WAAN.
- **Port already in use**: set custom `WAAN_CLIENT_PORT`, `WAAN_API_PORT`, and
  `WAAN_RELAY_PORT` before launching.
- **Need packaged smoke validation**: follow `docs/release-smoke-checklist.md`.
