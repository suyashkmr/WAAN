# WAAN macOS Installer Guide

WAAN no longer bundles an Electron desktop shell. The analytics dashboard now
runs entirely as a static web application. Because of that, the old `.pkg`
installer has been retired and `scripts/build-macos-installer.sh` now simply
prints a deprecation message.

If you previously relied on the installer, distribute the project as a static
payload instead:

1. Copy the web assets from the repository root (`index.html`, `styles.base.css`,
   `styles.components.css`, the `js/` directory, and any sample data such as
   `analytics.json` and `chat.json`).
2. Deliver them as a `.zip` or host them on any HTTPS-capable static site host.
3. Ask end users to open `index.html` in a modern browser (Chrome, Edge, Safari,
   Firefox) to run the dashboard offline.

The legacy relay/server workspace is still present under `apps/server` for
historical purposes but is no longer required for the UI to operate.

---

## Optional: Serving the Web UI Locally

You can still serve the dashboard from `localhost` if you prefer not to open
files via the `file://` protocol:

```bash
npm install --global http-server
cd /path/to/WAAN
http-server -p 4173 .
```

Navigate to `http://localhost:4173` and use the dashboard as usual.

---

## Troubleshooting

- **Uploads fail**: Make sure ChatScope exports are generated "Without media" so
  the parser can match the expected timestamp format.
- **Browser blocks file access**: Some hardened corporate browsers forbid
  `file://` origins. Serve the folder over `http-server` or any static host
  instead of double-clicking `index.html`.

The previous notarisation, signing, and packaging steps are obsolete in the
web-only flow. If you need a native wrapper again in the future, reintroduce an
Electron (or Tauri, etc.) shell and update this document accordingly.
