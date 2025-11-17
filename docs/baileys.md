# WAAN + Baileys Relay

This branch replaces the manual `.txt` upload flow with a live relay powered by the [Baileys](https://github.com/WhiskeySockets/Baileys) library. Baileys controls a full WhatsApp Web session (via QR) and streams every message into the WAAN analytics API.

---

## 1. Prerequisites

- Node.js 18+
- A WhatsApp account you can pair via QR (use a dedicated account if possible; WhatsApp may block automation).
- `npm` workspaces enabled (already configured in this repo).

---

## 2. Install dependencies

```bash
npm install --workspaces
npm install --workspace baileys-relay
```

The second command pulls `@adiwajshing/baileys`, `express`, and the relay helpers.

---

## 3. Run the Baileys relay

```bash
cd baileys-relay
npm start
```

What happens:

- On first run the relay prints a QR code in your terminal (`qrcode-terminal`). Scan it with WhatsApp → *Linked devices* → *Link a device*. Because `syncFullHistory` is enabled, WhatsApp may spend a few minutes syncing past messages the first time.
- Session data is stored under `baileys-relay/auth/`. Delete that folder to log out or relink.
- Every incoming message (and any historical messages WhatsApp syncs) is normalised and appended to `baileys-relay/storage/chats.json`.
- The relay exposes:
  - `GET /relay/status` – QR + connection state.
  - `GET /api/chats` – list of chats seen so far.
  - `GET /api/chats/:id` – entries for a specific chat.

To change ports or logging:

```bash
BAILEYS_PORT=6060 BAILEYS_LOG_LEVEL=debug npm start --workspace baileys-relay
```

---

## 4. Connect the WAAN dashboard

Serve the web UI however you prefer:

```bash
npx http-server -p 4173 .
# or: python3 -m http.server 4173
```

Before `js/main.js` loads, inject the relay endpoint:

```html
<script>
  window.WAAN_CONFIG = {
    apiBase: "http://localhost:5050/api",
    relayBase: "http://localhost:5050/relay"
  };
</script>
<script type="module" src="js/main.js"></script>
```

When the page loads, “Loaded chats” is populated directly from the Baileys relay. Choose any chat to render the analytics. You can keep the relay terminal open to monitor connection state (`connected`, `qr`, `disconnected`).

---

## 5. Tips

- The relay stores data in plain JSON (`baileys-relay/storage/chats.json`). Back it up or feed it into WAAN’s existing tooling (`build_analytics.py`) if you want to precompute aggregates.
- If WhatsApp logs you out, delete the `auth/` directory and restart `npm start` to generate a fresh QR.
- For production deploys, host the relay on a server with persistent disk and protect the `api/` routes behind authentication (not included in this scaffold).

With this setup, the WAAN dashboard now streams live WhatsApp data via Baileys instead of manual uploads or the whatsapp-web.js relay.
