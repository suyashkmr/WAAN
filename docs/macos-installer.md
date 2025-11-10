# WAAN macOS Installer Guide

This document explains how to turn the WAAN workspace into a single macOS installer that deploys two separate apps:

| Component | Purpose | Default Port |
|-----------|---------|--------------|
| **WAAN Server.app** | Headless Node.js service that runs `whatsapp-web.js`, stores chats, and exposes the REST + relay control APIs used by the UI. | `3333` (REST) / `4545` (relay control) |
| **WAAN Client.app** | Electron desktop shell that embeds the analytics frontend and talks to the local server in the background. | — |

The resulting `.pkg` file installs both apps into `/Applications` and bundles all runtime dependencies (Node, npm packages, Electron, web assets).

---

## Prerequisites

- macOS 13+ with [Xcode Command Line Tools] installed (`pkgbuild`/`productbuild`).
- Node.js 18+ and npm available on `PATH`.
- Sufficient disk space (~2 GB) for Puppeteer/Chromium assets and installer staging.
- (Optional) Apple Developer ID certificate if you intend to sign/notarize the final installer.

Install workspace dependencies once before packaging:

```bash
cd /path/to/WAAN
npm install --workspaces
```

---

## Building the Installer

The helper script `scripts/build-macos-installer.sh` orchestrates everything:

```bash
# From the repository root
scripts/build-macos-installer.sh
```

What the script does:

1. Installs/upgrades workspace dependencies (server, client).
2. Copies the static web assets into `apps/client/resources/web`.
3. Runs `electron-builder --dir` to produce `WAAN Client.app`.
4. Stages a self-contained `WAAN Server.app`, including production node modules and the local `node` binary.
5. Wraps each app into its own component package via `pkgbuild`.
6. Uses `productbuild` with `docs/macos/distribution.xml` to emit `dist/macos/WAAN-Installer.pkg`.

Artifacts written to `dist/macos/`:

- `WAAN Client.app`
- `WAAN Server.app`
- `pkg/waan-client.pkg`
- `pkg/waan-server.pkg`
- `WAAN-Installer.pkg` ← deliver this to end‑users.

If you want to skip automatic `npm install` runs, set `SKIP_NPM_INSTALL=1` before executing the script and ensure dependencies are already available.

---

## Customising the Build

- **Node binary**: Set `NODE_BIN=/path/to/node` to override the runtime embedded into `WAAN Server.app`.
- **Electron targets**: Adjust `apps/client/package.json → build.mac.target` if you also want signed `.dmg` artifacts; the installer script only needs the unpacked `.app`.
- **Data directory**: The server persists chat data under `~/Library/Application Support/WAAN/data` by default. Pass `--data-dir` to `waan-server` or set `WAAN_DATA_DIR` and the path is remembered in `~/Library/Application Support/WAAN/waan.config.json`.
- **Network binding**: Override `WAAN_API_PORT`, `WAAN_RELAY_PORT`, or `WAAN_BIND_HOST` if you need custom ports.

---

## Verifying the Apps

After installing via `WAAN-Installer.pkg`:

1. Launch **WAAN Server.app** once to authenticate with WhatsApp. The first run prints a QR code to the console (view via Console.app or run the binary in Terminal). Scan the code using your WhatsApp mobile app.
2. Confirm the APIs are reachable:
   ```bash
   curl http://127.0.0.1:3333/api/health
   curl http://127.0.0.1:4545/relay/status
   ```
3. Open **WAAN Client.app**. The UI should reflect the local relay state automatically because the preload script injects `window.WAAN_API_BASE`/`window.RELAY_CTRL_BASE`.

---

## Distribution Notes

- **Code signing**: Use `codesign --deep --force --options runtime --sign "Developer ID Application: …"` on each `.app` before running `pkgbuild`. Sign the final `.pkg` with `productsign`.
- **Notarisation**: Submit the signed `.pkg` via `xcrun notarytool submit --wait WAAN-Installer.pkg`.
- **Auto-start**: To run the server as a Launch Agent, ship a `.plist` under `/Library/LaunchDaemons` that executes `/Applications/WAAN Server.app/Contents/MacOS/waan-server --auto-start`.
- **Upgrades**: Increment the `version` field in `apps/server/package.json` and `apps/client/package.json` before rebuilding so Software Update can detect changes.

---

## Troubleshooting

- **WhastApp session resets**: Remove `~/Library/Application Support/WAAN/sessions` and restart the server to force a fresh QR pairing.
- **Renderer cannot reach the server**: Ensure port 3333/4545 are allowed by local firewalls. Override `WAAN_API_BASE`/`WAAN_RELAY_CTRL_BASE` via environment variables if the server listens on a different host.
- **Installer build fails**: Confirm `pkgbuild`, `productbuild`, and `rsync` are present (they are provided by Xcode CLT). Check the log from `scripts/build-macos-installer.sh` for the last command that failed.

[Xcode Command Line Tools]: https://developer.apple.com/xcode/resources/
