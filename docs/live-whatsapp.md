# WAAN Live Chat Integration

Authority note:
- This file is current operator-facing guidance for running WAAN against the live WhatsApp relay.
- For packaged release validation, also use `docs/release-smoke-checklist.md`.
- For incident recovery, use `docs/relay-troubleshooting.md`.

WAAN reads chats from WhatsApp Web using
[`whatsapp-web.js`](https://github.com/pedroslopez/whatsapp-web.js). Chat data
is mirrored through the relay and rendered directly in WAAN's active dataset.

## 1. Start the relay server

```bash
npm install --workspaces          # once
npm start --workspace apps/server
```

For the local helper path that brings up both the backend and dashboard together, use:

```bash
npm run start-backend
```

By default the server binds to:

- API (chat data): `http://127.0.0.1:3334`
- Relay control (QR/status): `http://127.0.0.1:4546`

Override the host/ports with `WAAN_API_PORT`, `WAAN_RELAY_PORT`, or CLI flags (`--api-port`, `--relay-port`, `--host`, `--allow-origin`).

The first run downloads a headless Chromium build for WhatsApp Web and stores the session under `~/Library/Application Support/WAAN/relay-session`.

## 2. Link WAAN

1. Open WAAN in the app shell (`npm run dev`, `npm run start-backend`, or packaged `WAAN.app`).
2. In the workspace setup/status strip:
   - start or reconnect the relay if it is offline
   - wait for the QR state if login is required
   - scan the QR from WhatsApp on your phone (`Linked devices` → `Link a device`)
3. Once connected, WAAN shows the running relay/account state and exposes mirrored chats through the workspace chat selector.

## 3. Load a chat

Select any chat from the *WAAN account* group. WAAN fetches recent
messages (default limit: `5000`) and renders analytics for that conversation.

- Use the relay/workspace controls to resync chats after new conversations arrive.
- Use the relay recovery/logout actions from the workspace/support surfaces when you need to reconnect or unlink.
- Use diagnostics export when troubleshooting startup, auth, or sync problems.

### Troubleshooting

- **Relay offline**: Ensure the backend is running on the configured bind host/ports. The UI polls the relay status endpoint and will surface reconnect/recovery actions when the relay is unavailable.
- **No QR shown**: Delete the session folder (`~/Library/Application Support/WAAN/relay-session`) and restart the relay to force a new login.
- **Chats missing messages**: Increase the fetch window via `WAAN_CHAT_FETCH_LIMIT` on the server or `remoteMessageLimit` in `window.WAAN_CONFIG`.
- **Advanced relay incident handling**: see `docs/relay-troubleshooting.md`.
- **Pre-release packaged-app smoke**: run `docs/release-smoke-checklist.md`.

> The relay stores parsed chats under `~/Library/Application Support/WAAN/storage/chats`. Remove this directory if you want a clean slate.

## Current Constraints

- The legacy in-memory local chat library and `Your chats` selector group were removed.
- Remote relay-backed chat selection is the current live-chat path.
- Local/imported datasets are still supported for offline analysis, but they are separate from the live relay-backed chat list.

## Configuring the UI endpoints

Override the default endpoints by defining `window.WAAN_CONFIG` before `js/main.js` in `index.html`:

```html
<script>
  window.WAAN_CONFIG = {
    apiBase: "http://localhost:4000/api",
    relayBase: "http://localhost:5050",
    remoteMessageLimit: 6000
  };
</script>
<script type="module" src="js/main.js"></script>
```
