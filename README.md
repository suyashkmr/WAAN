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

## How To Use WAAN

### 1. Connect your ChatScope account

1. In WAAN, click **Connect** in the relay card.
2. Scan the QR code from ChatScope on your phone:
   *Linked devices* -> *Link a device*.
3. Wait until the status shows connected.

### 2. Sync and select a chat

1. Click **Refresh chats** to mirror your latest chat list.
2. Open **Loaded chats** and choose a chat under *ChatScope account*.
3. WAAN fetches messages and renders analytics automatically.

### 3. Explore analytics

- Use range filters to focus on specific periods.
- Open search to filter messages by keyword, participant, and date.
- Use participant views and activity panels to inspect behavior by person/time.

### 4. Save and export results

- Save useful filter/search combinations as saved views.
- Export outputs from the export controls (CSV/JSON/report formats).

### 5. Manage relay session

- **Disconnect** logs out from the linked account.
- **Clear storage** removes locally mirrored relay chat data.

## Data Points Explained

### Core summary cards

| Data point | Meaning |
| --- | --- |
| `Total Messages` | Count of chat messages (`type = message`) in the selected chat/range. |
| `Active Participants` | Unique senders who posted messages in the selected data. |
| `System Events Logged` | Count of system lines (`type = system`) such as joins/leaves/changes. |
| `Date Range` | First and last detected timestamps in the selected data window. |

### Highlights

| Data point | Meaning |
| --- | --- |
| `Recent top senders` | Most active senders in the most recent weeks of data. |
| `Busiest day` | Single day with the highest message count. |
| `Busiest weekday` | Day-of-week with the highest message volume share. |
| `Today/Tomorrow activity outlook` | Forecast based on recent daily/weekday patterns. |
| `Next Busy Day` | Predicted next weekday likely to see above-baseline volume. |

### Participants

| Data point | Meaning |
| --- | --- |
| `Messages` | Number of messages sent by that participant. |
| `Share` | Participant message count as a percentage of total messages. |
| `Avg Words` | Average words per message for that participant. |
| `Active range` | First and last seen message date for that participant. |
| `Average length` | Average words and characters per message. |
| `Sentiment` | Average sentiment score plus positive/negative mix for that participant. |
| `Peak hour` | Hour where that participant posted most. |
| `Peak weekday` | Weekday where that participant posted most. |

### Activity panels

| Data point | Meaning |
| --- | --- |
| `Top Hour` | Busiest weekday+hour cell in the hourly heatmap. |
| `Avg per day` | Total messages divided by number of days in range. |
| `Avg per week` | Total messages divided by number of calendar weeks in range. |
| `Avg of last 3 weeks` | Rolling 3-week average ending at the latest week. |
| `Busiest Weekdays` bars | Message count/share by weekday (with day/hour filters applied). |
| `Time of Day peak` | Hour with highest volume in the selected time-of-day view. |
| `Focus window share` | Percent of total messages falling inside selected hour range. |

### Mood & sentiment

| Data point | Meaning |
| --- | --- |
| `Positive / Neutral / Negative` | Message counts grouped by sentiment class. |
| `Average` | Mean sentiment score over scored messages (`-1` to `+1`). |
| `Daily trend/calendar` | Day-level sentiment average and message volume context. |
| `Top positive/negative members` | Participants ranked by average sentiment score (with minimum activity threshold). |

### Message mix and system metrics

| Data point | Meaning |
| --- | --- |
| `Messages with media` | Messages classified as media-bearing. |
| `Messages with links` | Messages containing URLs. |
| `Polls` | Poll message count detected in chat history. |
| `Join events` | Members joining the chat (including multi-member join events). |
| `Members added` | Add/invite events counted from system messages. |
| `Members left` | Leave events from system messages. |
| `Members removed` | Removal events from system messages. |
| `Settings changes` | System events indicating chat setting changes. |
| `Other system messages` | System lines not matched to tracked categories. |
| `Join requests` | Join-request style system events. |
| `Average characters per message` | Mean message length in characters. |
| `Average words per message` | Mean message length in words. |

### Poll highlights

| Data point | Meaning |
| --- | --- |
| `Total polls` | Total poll messages detected. |
| `Unique poll creators` | Number of distinct participants who created polls. |
| `Poll list` | Recent detected polls with creator, timestamp, and options (when available). |

### Search

| Data point | Meaning |
| --- | --- |
| `Search results` | Messages matching keyword, participant, and optional date filters. |
| `Search summary` | Count and scope of currently matched results. |

### Counting notes

- `chat lines` includes both user messages and system entries.
- Most percentages are relative to `Total Messages` (not total chat lines).
- Sentiment is a lightweight lexicon-based score and should be treated as directional, not clinically precise.

## Scripts

- `npm run lint` - lint dashboard + server code
- `npm test` - run test suite
- `npm run verify` - lint + tests
- `npm run ci:verify` - full local quality gate

## Project Docs

- `docs/feature-map.md` - module ownership and responsibilities
- `docs/app-shell-architecture.md` - dashboard architecture notes
- `docs/release-smoke-checklist.md` - packaged smoke checklist / relay checks

## Acknowledgments

WAAN’s live relay capabilities are built on top of
[`whatsapp-web.js`](https://github.com/pedroslopez/whatsapp-web.js), an
excellent open-source project created and maintained by
[PedroSLopez](https://github.com/pedroslopez).

Huge thanks for the thoughtful engineering and sustained open-source work that
make projects like this possible.

## License

- Code is licensed under MIT: `LICENSE`
- Additional terms and dependency notices: `NOTICE`
