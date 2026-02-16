# Release Smoke Checklist

Use this quick runbook before shipping a packaged WAAN build.

## Scope

- Target artifact: `WAAN.app`
- Target flow: relay startup, auth, chat sync, and sync-path visibility
- Expected time: ~5-10 minutes

## Prerequisites

1. Build completed and app launches from:
   - `./WAAN.app/Contents/MacOS/WAAN`
2. Phone is available for QR link.
3. Network access is available for ChatScope Web login.

## Smoke Steps

1. Launch packaged app and verify baseline startup logs:
   - `API server listening on http://127.0.0.1:3334`
   - `Relay control server listening on http://127.0.0.1:4546`
2. Confirm relay status endpoint responds:
   - `curl -s http://127.0.0.1:4546/relay/status`
   - Expect JSON with `status`, `chatCount`, and `syncPath`.
3. Complete QR auth and wait for ready logs:
   - `Authenticated with ChatScope Web.`
   - `ChatScope relay is ready.`
4. Trigger chat sync (auto/manual), then verify:
   - `Synced <N> chats via primary.` or
   - `Synced <N> chats via fallback.`
   - `N` should be non-zero for an account with visible chats.
5. Open relay log drawer in UI and confirm sync-path visibility:
   - steady path: repeated `via primary` or `via fallback`
   - transition case: `Sync path transition detected: primary -> fallback.` (or reverse)

## Pass Criteria

1. App starts with both local servers healthy.
2. QR link succeeds and account reaches running state.
3. Chat sync completes and returns plausible non-zero count.
4. `syncPath` is present in status/UI metadata.
5. No unrecovered relay error loops.

## Failure Capture

If any step fails, capture:

1. Full app console log block around failure timestamp.
2. `GET /relay/status` payload.
3. Active env vars (`WAAN_RELAY_SYNC_MODE`, `WAAN_RELAY_HEADLESS`, ports).
4. Whether fallback loaded chats and final synced count.

Then follow `docs/relay-troubleshooting.md`.
