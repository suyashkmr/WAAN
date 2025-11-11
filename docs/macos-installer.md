# WAAN macOS Installer Guide

This document explains how to turn the WAAN workspace into a single macOS installer that deploys two separate apps:

| Component | Purpose | Default Port |
|-----------|---------|--------------|
| **WAAN Client.app** | Electron desktop shell that embeds the analytics frontend and lets you upload WhatsApp chat exports for offline analysis. | — |

> The legacy relay/server workspace still lives inside the repository for archival purposes, but it is no longer built or required by the installer.

The resulting `.pkg` file installs both apps into `/Applications` and bundles all runtime dependencies (Node, npm packages, Electron, web assets).

---

## Prerequisites

- macOS 13+ with [Xcode Command Line Tools] installed (`pkgbuild`/`productbuild`).
- Node.js 18+ and npm available on `PATH`.
- Sufficient disk space (~1 GB) for bundling the Electron app and staging the installer.
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

1. Installs/upgrades workspace dependencies (client app).
2. Copies the static web assets into `apps/client/resources/web`.
3. Runs `electron-builder --dir` to produce `WAAN Client.app`.
4. Wraps the app into `pkg/waan-client.pkg` via `pkgbuild`.
5. Uses `productbuild` with `docs/macos/distribution.xml` to emit `dist/macos/WAAN-Installer.pkg`.

Artifacts written to `dist/macos/`:

- `WAAN Client.app`
- `pkg/waan-client.pkg`
- `WAAN-Installer.pkg` ← deliver this to end users.

If you want to skip automatic `npm install` runs, set `SKIP_NPM_INSTALL=1` before executing the script and ensure dependencies are already available.

---

## Customising the Build

- **Electron targets**: Adjust `apps/client/package.json → build.mac.target` if you also want signed `.dmg` artifacts; the installer script only needs the unpacked `.app`.
- **Default assets**: Replace `chat.json`, `index.html`, or `styles.css` at the repo root before running the installer script if you want a different default dataset or branding baked into the client.

---

## Verifying the Apps

After installing via `WAAN-Installer.pkg`:

1. Open **WAAN Client.app**. The dashboard should load immediately because it no longer depends on any background relay.
2. Click **Upload WhatsApp chat** and select either the included `chat.json` sample (found in the repo root) or a `.txt` export from your phone. The charts should populate once parsing completes.
3. Try exporting a PDF/Markdown report to confirm filesystem permissions are correct.

---

## Distribution Notes

- **Code signing**: Use `codesign --deep --force --options runtime --sign "Developer ID Application: …"` on each `.app` before running `pkgbuild`. Sign the final `.pkg` with `productsign`.
- **Notarisation**: Submit the signed `.pkg` via `xcrun notarytool submit --wait WAAN-Installer.pkg`.
- **Upgrades**: Increment the `version` field in `apps/client/package.json` before rebuilding so Software Update can detect changes.

---

## Troubleshooting

- **Chat upload shows zero messages**: Confirm you exported the conversation as "Without media" from WhatsApp so the `.txt` file contains timestamps in the expected format (24-hour time + locale).
- **Installer build fails**: Confirm `pkgbuild`, `productbuild`, and `rsync` are present (they are provided by Xcode CLT). Check the log from `scripts/build-macos-installer.sh` for the last command that failed.

[Xcode Command Line Tools]: https://developer.apple.com/xcode/resources/
