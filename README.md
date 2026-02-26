# WAAN

WAAN is a WhatsApp analytics app.
It mirrors chats through a relay, then shows charts and summaries.

You can use WAAN as:

- A web app from this repo
- A macOS desktop app (`.dmg`)

## Naming Rules

- Product name in UI/docs: `WAAN`
- Relay service name in UI/docs: `WAAN Relay`

## Important Risk Notice

WAAN is not made by WhatsApp or Meta.
WAAN uses automation around WhatsApp Web.
That can violate WhatsApp rules and can cause account limits or bans.

Use WAAN at your own risk.
For first testing, connect a secondary WhatsApp account first.

Release files are on GitHub Releases (`.dmg` + `.zip` for Apple Silicon).

## What WAAN Does

- Connects to a WhatsApp account through WAAN Relay
- Mirrors chats and shows them in **Loaded chats**
- Builds analytics for time, people, message types, and mood
- Supports search, saved views, and exports

## Quick Start (Web)

### 1. Install once

```bash
npm install
```

### 2. Start WAAN

```bash
npm start
```

### 3. Open WAAN

Open:

- `http://127.0.0.1:4173`

## macOS App (DMG)

Before you start:

- Install Google Chrome or Chromium

Install steps:

1. Open the `.dmg`
2. Drag `WAAN.app` into `Applications`
3. Open `WAAN.app`
4. Use in-app buttons to connect relay and load chats

The desktop app starts the dashboard server and relay for you.

### macOS Gatekeeper Help

If macOS says the app is damaged or from an unidentified developer:

1. Open `WAAN.app` from Finder
2. Go to **System Settings -> Privacy & Security**
3. Click **Open Anyway**
4. If needed, Control-click `WAAN.app` and choose **Open**

If macOS asks to move the app to Bin/Trash and you do not see **Open Anyway**:

1. Make sure you launched from `/Applications/WAAN.app`
2. Run:
   ```bash
   xattr -dr com.apple.quarantine "/Applications/WAAN.app"
   ```
3. Open the app again

## Run Electron Locally (Dev)

```bash
npm install
cd electron
npm install
npm start
```

This runs desktop WAAN locally (Electron shell + dashboard + relay).

## Build macOS App Files

```bash
cd electron
npm run dist
```

This runs `electron-builder --mac`.
If signing/notary secrets are missing, it still builds locally but skips notarization.

## Signed + Notarized Releases (GitHub Actions)

Workflow:

- `.github/workflows/macos-release.yml`

Required repo secrets:

- `CSC_LINK` - base64 `.p12` cert (or supported file URL)
- `CSC_KEY_PASSWORD` - cert password
- `APPLE_ID` - Apple account email
- `APPLE_APP_SPECIFIC_PASSWORD` - app-specific password
- `APPLE_TEAM_ID` - Apple team ID

Release steps:

1. Add notes file: `docs/release-notes/vX.Y.Z.md`
2. Run:
   `npm run release:cut -- <version|patch|minor|major>`
3. Script bumps versions, commits, tags, and pushes
4. GitHub Actions builds and attaches signed/notarized `.dmg` + `.zip`

Important:

- Use exact semver tags like `v2.1.0`
- Do not use short tags like `v2.1`

## Optional: Run Live Relay In Another Terminal

```bash
npm start --workspace apps/server
```

Default endpoints:

- API: `http://127.0.0.1:3334`
- Relay control/status: `http://127.0.0.1:4546`

More relay docs:

- Setup: `docs/live-whatsapp.md`
- Troubleshooting: `docs/relay-troubleshooting.md`

## How To Use WAAN

First run flow:

1. Connect relay
2. Scan QR code
3. Choose a chat from **Loaded chats**

### 1. Connect WhatsApp

1. Click **Connect** in WAAN
2. On phone: WhatsApp -> *Linked devices* -> *Link a device*
3. Scan WAAN QR code
4. Wait for connected status
5. Safer first test: use a secondary account

### 2. Sync and pick a chat

1. Click **Resync chats** or **Reload All Chats**
2. Open **Loaded chats**
3. Pick a chat in *WAAN account*
4. WAAN loads data and charts

### 3. Explore

- Change **Time range**
- Use **Search** for words, people, and dates
- Open participant and activity panels

### 4. Save and export

- Save filter/search combos as **Saved views**
- Use export buttons for CSV/JSON/reports

### 5. Relay controls

- **Pause Relay**: pause relay work
- **Log Out & Unlink**: disconnect account
- **Clear Cached Chats**: remove mirrored chats from this machine

### 6. Logs and issue reports

- Open **View Relay Logs**
- Click **Export Diagnostics** to download JSON diagnostics
- Click **Report Issue** to open a prefilled GitHub issue

## Data Points (Plain Meaning)

### Core cards

| Data point | Plain meaning |
| --- | --- |
| `Total Messages` | Total user messages in the selected chat/range |
| `Active Participants` | Number of unique senders |
| `System Events Logged` | Number of system lines (joins/leaves/changes) |
| `Date Range` | First and last timestamp in selected data |

### Highlights

| Data point | Plain meaning |
| --- | --- |
| `Recent top senders` | Most active senders in recent weeks |
| `Busiest day` | Day with highest message count |
| `Busiest weekday` | Weekday with highest message share |
| `Today/Tomorrow activity outlook` | Simple forecast from recent patterns |
| `Next Busy Day` | Next likely above-baseline weekday |

### Participants

| Data point | Plain meaning |
| --- | --- |
| `Messages` | Messages sent by that person |
| `Share` | That person's percent of total messages |
| `Avg Words` | Average words per message |
| `Active range` | First seen and last seen dates |
| `Average length` | Average words/chars per message |
| `Sentiment` | Average sentiment + pos/neg mix |
| `Peak hour` | Hour they post most |
| `Peak weekday` | Weekday they post most |

### Activity panels

| Data point | Plain meaning |
| --- | --- |
| `Top Hour` | Busiest weekday-hour cell |
| `Avg per day` | Total messages divided by days |
| `Avg per week` | Total messages divided by weeks |
| `Avg of last 3 weeks` | Rolling 3-week average at latest week |
| `Busiest Weekdays` bars | Count/share by weekday with filters |
| `Time of Day peak` | Busiest hour in selected time-of-day view |
| `Focus window share` | Percent inside selected hour window |

### Mood & sentiment

| Data point | Plain meaning |
| --- | --- |
| `Positive / Neutral / Negative` | Count in each sentiment bucket |
| `Average` | Mean sentiment score (`-1` to `+1`) |
| `Daily trend/calendar` | Day-by-day sentiment with volume context |
| `Top positive/negative members` | Ranked by average sentiment (min activity required) |

### Message mix and system metrics

| Data point | Plain meaning |
| --- | --- |
| `Messages with media` | Messages with media |
| `Messages with links` | Messages containing URLs |
| `Polls` | Number of poll messages |
| `Join events` | Member join events |
| `Members added` | Add/invite events |
| `Members left` | Leave events |
| `Members removed` | Removal events |
| `Settings changes` | System lines for settings changes |
| `Other system messages` | System lines not in tracked categories |
| `Join requests` | Join-request style events |
| `Average characters per message` | Mean chars per message |
| `Average words per message` | Mean words per message |

### Poll highlights

| Data point | Plain meaning |
| --- | --- |
| `Total polls` | Total polls found |
| `Unique poll creators` | Number of unique poll creators |
| `Poll list` | Recent polls with creator/time/options (when available) |

### Search

| Data point | Plain meaning |
| --- | --- |
| `Search results` | Messages matching your filters |
| `Search summary` | Count + scope of current results |

### Counting notes

- `chat lines` = user messages + system lines
- Most percentages use `Total Messages` as base
- Sentiment is lightweight and directional (not clinical)

## FAQ

### Do I need Chrome/Chromium for relay sync?

Yes.
WAAN Relay needs local Google Chrome or Chromium on macOS.

If relay fails on a fresh machine, install Chrome/Chromium and relaunch `WAAN.app`.

### Can WAAN get my WhatsApp account restricted?

Yes, it can.
WAAN uses WhatsApp Web automation and is not an official WhatsApp client.
WhatsApp/Meta decides enforcement.

Official policies:

- WhatsApp Terms: `https://www.whatsapp.com/legal/terms-of-service`
- WhatsApp Business Terms: `https://www.whatsapp.com/legal/business-terms`

Best practice: test with a secondary account first.

### What is the privacy model?

WAAN processes chat data locally on your device.
By default, WAAN does not upload chat content to WAAN-operated servers.

Data leaves your device only if you choose to export/share files or logs.

See full details in `PRIVACY.md`.

### How do I report issues fast?

Use **View Relay Logs** -> **Report Issue**.
For deeper debugging, attach the file from **Export Diagnostics**.

## Useful Scripts

- `npm run lint` - lint dashboard + server code
- `npm run check:module-size` - enforce module size guardrails
- `npm test` - run tests
- `npm run verify` - lint + tests
- `npm run ci:verify` - full local quality gate
- `npm run perf:stress` - synthetic large-chat stress run
- `npm run release:cut -- <version|patch|minor|major>` - bump versions, commit, tag, push

## Project Docs

- `docs/feature-map.md` - module ownership and responsibilities
- `docs/app-shell-architecture.md` - dashboard architecture
- `docs/release-smoke-checklist.md` - packaged smoke + relay checks
- `docs/performance-at-scale.md` - large-chat benchmark runbook
- `docs/engineering-guardrails.md` - PR guardrails for modularity
- `PRIVACY.md` - privacy notice and data handling

## Acknowledgments

WAAN relay features use
[`whatsapp-web.js`](https://github.com/pedroslopez/whatsapp-web.js),
created and maintained by
[PedroSLopez](https://github.com/pedroslopez).

## Trademark Notice

WhatsApp is a Meta Platforms, Inc. trademark.
WAAN is independent and not affiliated with or endorsed by Meta/WhatsApp.

## License

- Code: MIT (`LICENSE`)
- Extra terms + dependency notices: `NOTICE`
