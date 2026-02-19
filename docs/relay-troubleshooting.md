# Relay Troubleshooting

This runbook covers common WAAN relay issues for the ChatScope live sync flow.

Before release tagging, run: `docs/release-smoke-checklist.md`.
For relay module boundaries, see: `docs/relay-architecture.md`.

## Compatibility Baseline

- Known-good WAAN baseline: `whatsapp-web.js@1.34.6` (pinned in `apps/server/package.json`).
- If `client.getChats()` throws `t: t`, WAAN now degrades to Store fallback sync (`WAAN_RELAY_SYNC_MODE=auto`).
- Treat fallback sync as degraded mode, not full compatibility.

Upgrade policy:
1. Bump `whatsapp-web.js` on a branch.
2. Validate startup + chat sync in both modes:
   - `WAAN_RELAY_SYNC_MODE=primary`
   - `WAAN_RELAY_SYNC_MODE=auto`
3. Keep fallback-only mode for diagnostics, not as default.

## Quick Health Checks

1. Relay/API startup logs should include:
   - `API server listening on http://127.0.0.1:3334`
   - `Relay control server listening on http://127.0.0.1:4546`
2. Relay status endpoint should respond:
   - `GET http://127.0.0.1:4546/relay/status`
3. UI should show linked account and sync status after QR/auth.

## Common Log Patterns

## `client.getChats()` fails with `t: t`

Example:

```text
client.getChats() unavailable; using Store.Chat fallback sync.
```

Meaning:
- Upstream `whatsapp-web.js`/Puppeteer eval path failed.
- WAAN should automatically fail over to Store fallback sync.

Expected follow-up logs:
- `Fallback chat sync path loaded <N> chats.`
- `Synced <N> chats via fallback in <T>ms (meta persist <P>ms).`

Action:
1. If `<N> > 0`, treat as degraded-but-working.
2. If fallback then fails, follow the next section.

## Fallback sync unavailable

Example:

```text
Failed to sync chats: ... Fallback chat sync unavailable: window.Store.Chat.getModelsArray is unavailable
```

Meaning:
- Both primary and fallback chat-list paths failed.

Action:
1. Restart WAAN relay/app.
2. Re-link session if needed (logout + QR re-scan).
3. Retry manual chat sync from UI.
4. If still failing, collect logs and escalate (see Escalation Data).

## Sync reports success but zero chats

Example:

```text
Synced 0 chats via primary in 182ms (meta persist 0ms).
```

Action:
1. Verify account actually has visible chats in linked ChatScope Web.
2. Confirm auth succeeded (`ChatScope relay is ready.` and account shown in UI).
3. Trigger a manual resync.
4. If persistent, capture logs and escalate.

## Operator Actions

- Manual resync: use the UI relay action (`Resync chats`).
- Restart app: relaunch `WAAN.app`.
- Force mode for debugging:
  - `WAAN_RELAY_SYNC_MODE=auto ./WAAN.app/Contents/MacOS/WAAN`
  - `WAAN_RELAY_SYNC_MODE=primary ./WAAN.app/Contents/MacOS/WAAN`
  - `WAAN_RELAY_SYNC_MODE=fallback ./WAAN.app/Contents/MacOS/WAAN`

Mode semantics:
- `auto`: primary first, fallback on failure.
- `primary`: primary only (good for diagnosing fallback masking concerns).
- `fallback`: fallback only (good for diagnosing primary instability/noise).

## Browser Crash On Startup (Chrome for Testing)

If relay startup crashes inside `Google Chrome for Testing` (SIGTRAP/EXC_BREAKPOINT), force WAAN to use a stable browser binary:

```bash
WAAN_RELAY_BROWSER_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ./WAAN.app/Contents/MacOS/WAAN
```

Optional flags:
- `WAAN_RELAY_DISABLE_GPU=true` (default) to reduce GPU-driver related launch crashes.
- `WAAN_RELAY_DISABLE_GPU=false` only for debugging if GPU is required.

## Escalation Data

When opening an issue, include:

1. App version and platform (macOS + architecture).
2. Exact failure timestamps and log block around sync.
3. `relay/status` response payload.
4. Whether fallback loaded chats and the final synced count.
5. Active env vars (`WAAN_RELAY_SYNC_MODE`, `WAAN_RELAY_HEADLESS`, `WAAN_RELAY_BROWSER_PATH`, `WAAN_RELAY_DISABLE_GPU`, ports).
