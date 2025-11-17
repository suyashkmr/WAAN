# WAAN macOS App Guide

This branch contains an Electron wrapper under `electron/` so we can ship the analytics dashboard as a clickable macOS app. The desktop shell runs two local processes:

1. `apps/server` – optional relay that talks to WhatsApp via `whatsapp-web.js`
2. an embedded Express server (same logic as `serve.js`) that serves the static dashboard on `WAAN_CLIENT_PORT`

The Electron renderer simply points a `BrowserWindow` at `http://localhost:4173`, so every browser feature from the standalone dashboard keeps working.

---

## 1. Prerequisites

- Node.js 18+
- npm 9+
- Xcode command-line tools (needed for native dependencies on macOS)
- A Mac signing identity (only if you plan to notarize the app later)

Install the JS dependencies once:

```bash
npm install                         # root deps (serve.js)
npm install --workspaces            # installs apps/server
cd electron && npm install          # desktop shell dependencies
```

---

## 2. Run the desktop app in development

Electron now boots the entire stack for you:

```bash
cd electron
npm start
```

`main.js` spins up an internal Express server (same logic as `serve.js`) and forks the relay (`apps/server/src/index.js`) with `ELECTRON_RUN_AS_NODE=1`, so there’s nothing else to run. When both services report ready, the BrowserWindow loads `http://<host>:<port>` automatically.

Override the defaults via environment variables:

```bash
WAAN_CLIENT_PORT=9000 \
WAAN_CLIENT_HOST=127.0.0.1 \
WAAN_API_PORT=4000 \
WAAN_RELAY_PORT=5000 \
npm start
```

If you still want to run the backend manually (for debugging), start `node serve.js` and `npm start --workspace apps/server -- --auto-start` from the repo root, then launch Electron with `npx electron .` so it points at the already running ports.

> **Heads-up:** if you ever launch the packaged binary with `ELECTRON_RUN_AS_NODE=1`, remember to `unset ELECTRON_RUN_AS_NODE` before running the dev app. That variable forces Electron to behave like plain Node and the window will fail to open.

---

## 3. Configure desktop-specific behavior

Environment variables that the app looks for:

| Variable | Default | Purpose |
| --- | --- | --- |
| `WAAN_CLIENT_URL` | `http://localhost:4173` | URL loaded by the Electron window (handy if you want to point the shell at a remote build). |
| `WAAN_CLIENT_PORT` | `4173` | Port used by `serve.js`. |
| `WAAN_API_PORT` | `3334` | Port for the relay API (`apps/server`). |
| `WAAN_RELAY_PORT` | `4546` | Port for relay control endpoints. |

If you need custom Apple menu items, notifications, or file system dialogs, add them in `electron/main.js`. The renderer continues to run the same `js/main.js` bundle as the browser version, so UI changes stay shared.

---

## 4. Package a macOS build

1. Ensure the repo has no stray build artefacts (Electron Builder copies everything under `electron/`).
2. From `electron/`:

   ```bash
   npm run dist       # produces .app + .dmg under electron/dist/
   ```

3. The `build.extraResources` config copies the static dashboard (`index.html`, `js/`, `vendor/`) into `Contents/Resources/waan/web` and the relay workspace into `Contents/Resources/waan/apps/server`, so the final bundle runs entirely offline (no system Node/npm required).
4. On Apple Silicon, set `CSC_IDENTITY_AUTO_DISCOVERY=false` to skip signing. Provide Developer ID credentials (`CSC_IDENTITY_AUTO_DISCOVERY=true`, `APPLE_ID`, `APPLE_ID_PASSWORD`) when you’re ready to notarize.
5. To bundle a specific channel:

   ```bash
   npm run dist -- --mac dmg
   npm run dist -- --mac zip
   ```

The packaged app still runs the local Node processes. When distributing it to end users, let them know the app needs full disk access to read exported WhatsApp chats and network access to reach WhatsApp Web.

---

## 5. Testing checklist

- [ ] Launch the dev build via `cd electron && npm start` and confirm the dashboard loads data (chat uploads, live relay, etc.).
- [ ] Verify the relay QR flow works (Electron window should render the QR from `apps/server` when clicking “Connect to WhatsApp”).
- [ ] Build a DMG with `npm run dist` and open the resulting `.app` from `electron/dist/mac/WAAN.app`; confirm the backend processes start and stop with the window.
- [ ] Test logout/quit paths to ensure the spawned Node processes exit cleanly (no lingering `node` or `npm` processes).
- [ ] If you enable signing/notarization, run `spctl --assess --type execute /Applications/WAAN.app` to verify Gatekeeper acceptance.

---

## 6. Next steps

- Trim the staged resources (e.g., prune `apps/server/node_modules` or ship a zipped `waan-data-backup`) if bundle size becomes an issue.
- Wire up auto-updates (e.g., via `electron-updater`) if you plan to ship frequent builds to testers.
- Revisit `docs/macos-installer.md` once the Electron bundle replaces the old `.pkg` flow; we can remove the deprecated installer details once the DMG becomes the official distribution.

With this workflow, you can keep building the dashboard exactly as before, while the Electron shell gives Mac users a single app icon that spins up the relay and static server automatically.
