# ChatScope Live Chat Integration

WAAN reads chats directly from ChatScope using
[`whatsapp-web.js`](https://github.com/pedroslopez/whatsapp-web.js). Chat data
is mirrored through the relay and then loaded into WAAN's local chat library.

## 1. Start the relay server

```bash
npm install --workspaces          # once
npm start --workspace apps/server
```

By default the server binds to:

- API (chat data): `http://127.0.0.1:3334`
- Relay control (QR/status): `http://127.0.0.1:4546`

Override the host/ports with `WAAN_API_PORT`, `WAAN_RELAY_PORT`, or CLI flags (`--api-port`, `--relay-port`, `--host`, `--allow-origin`).

The first run downloads a headless Chromium build for ChatScope Web and stores the session under `~/Library/Application Support/WAAN/relay-session`.

## 2. Link ChatScope

1. Open WAAN (either the browser dashboard or `WAAN.app`).
2. Use the **Connect to ChatScope** card:
   - Click **Connect**. The relay generates a QR code.
   - On your phone open ChatScope → *Linked devices* → *Link a device* and scan the QR.
3. Once connected, WAAN shows your account name and lists mirrored chats under
   the **Loaded chats** selector (grouped under *ChatScope account*).

## 3. Load a chat

Select any chat from the *ChatScope account* group. WAAN fetches recent
messages (default limit: `4000`) and renders analytics for that conversation.

- Click **Refresh chats** after new conversations arrive.
- Use **Disconnect** to log out.
- Use **Clear storage** to remove mirrored chats from local relay storage.

### Troubleshooting

- **Relay offline**: Ensure `apps/server` is running. The UI polls `http://127.0.0.1:4546/relay/status`.
- **No QR shown**: Delete the session folder (`~/Library/Application Support/WAAN/relay-session`) and restart the relay to force a new login.
- **Chats missing messages**: Increase the fetch window via `WAAN_CHAT_FETCH_LIMIT` on the server or `remoteMessageLimit` in `window.WAAN_CONFIG`.
- **Advanced relay incident handling**: see `docs/relay-troubleshooting.md`.
- **Pre-release packaged-app smoke**: run `docs/release-smoke-checklist.md`.

> The relay stores parsed chats under `~/Library/Application Support/WAAN/storage/chats`. Remove this directory if you want a clean slate.

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
