# Relay Troubleshooting

This runbook covers common WAAN relay issues for the ChatScope live sync flow.

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
- `Synced <N> chats.`

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
Synced 0 chats.
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

## Escalation Data

When opening an issue, include:

1. App version and platform (macOS + architecture).
2. Exact failure timestamps and log block around sync.
3. `relay/status` response payload.
4. Whether fallback loaded chats and the final synced count.
5. Active env vars (`WAAN_RELAY_SYNC_MODE`, `WAAN_RELAY_HEADLESS`, ports).
