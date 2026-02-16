# ChatScope Live Chat Integration

WAAN can now read chats directly from ChatScope using [`whatsapp-web.js`](https://github.com/pedroslopez/whatsapp-web.js). This flow lets you analyse any conversation without exporting `.txt` files.

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

1. Open `index.html` in a desktop browser (or serve the repo root with any static HTTP server).
2. Use the new **Connect to ChatScope** card:
   - Click **Connect**. The relay generates a QR code.
   - On your phone open ChatScope → *Linked devices* → *Link a device* and scan the QR.
3. Once connected, the UI shows your account name and lists all chats under the existing “Loaded chats” selector (grouped under *ChatScope account*).

## 3. Load a chat

Select any chat from the *ChatScope account* optgroup. WAAN fetches up to 4 000 recent messages (tweak via `window.WAAN_CONFIG.remoteMessageLimit`) and renders the analytics just like an uploaded `.txt`.

- Click **Refresh chats** after new conversations arrive.
- Use **Disconnect** to log out and clear the mirrored list.

### Troubleshooting

- **Relay offline**: Ensure `apps/server` is running. The UI polls `http://127.0.0.1:4546/relay/status`.
- **No QR shown**: Delete the session folder (`~/Library/Application Support/WAAN/relay-session`) and restart the relay to force a new login.
- **Chats missing messages**: Increase the fetch window via `WAAN_CHAT_FETCH_LIMIT` on the server or `remoteMessageLimit` in `window.WAAN_CONFIG`.
- **Advanced relay incident handling**: see `docs/relay-troubleshooting.md`.

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
