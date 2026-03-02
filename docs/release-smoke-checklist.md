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
3. Network access is available for WhatsApp Web login.

## Smoke Steps

1. Launch packaged app and verify baseline startup logs:
   - `API server listening on http://127.0.0.1:3334`
   - `Relay control server listening on http://127.0.0.1:4546`
2. Confirm relay status endpoint responds:
   - `curl -s http://127.0.0.1:4546/relay/status`
   - Expect JSON with `status`, `chatCount`, and `syncPath`.
3. Complete QR auth and wait for ready logs:
   - `Authenticated with WhatsApp Web.`
   - `WAAN relay is ready.`
4. Trigger chat sync (auto/manual), then verify:
   - `Synced <N> chats via primary in <T>ms (meta persist <P>ms).` or
   - `Synced <N> chats via fallback in <T>ms (meta persist <P>ms).`
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

## Excellence Gates

Run these gates in addition to relay smoke.

1. Performance budgets (per release)
   - `npm run perf:searchworker`
   - `npm run perf:chatstore`
   - Compare results against latest recorded table in `docs/performance-at-scale.md`.
   - Flag release if any core path regresses materially (index build, indexed search latency, metadata write amplification).
2. Accessibility smoke (per release)
   - `npm run test:accessibility-smoke`
   - Must pass across desktop/laptop/tablet/mobile projects.
3. Visual regression status (per release)
   - `npm run test:visual`
   - If expected intentional diffs exist, run `npm run test:visual:update`, review, and re-run `npm run test:visual`.
4. Naming and copy consistency (per release)
   - `rg -n "ChatScope" index.html README.md docs --glob '!docs/release-smoke-checklist.md'`
   - Expected result: no user-facing brand-name drift unless explicitly documented in release notes.

## Gate Ownership

1. Performance budgets
   - Owner: Engineering
   - Frequency: Per release
2. Accessibility smoke
   - Owner: Engineering
   - Frequency: Per release
3. Visual regression status
   - Owner: Engineering + Design review
   - Frequency: Per release
4. Naming and copy consistency
   - Owner: Product + Engineering
   - Frequency: Per release

## Failure Capture

If any step fails, capture:

1. Full app console log block around failure timestamp.
2. `GET /relay/status` payload.
3. Active env vars (`WAAN_RELAY_SYNC_MODE`, `WAAN_RELAY_HEADLESS`, ports).
4. Whether fallback loaded chats and final synced count.

Then follow `docs/relay-troubleshooting.md`.

## Latest Sign-off

- Date: 2026-02-25
- Status: PASS
- Verified by: automated release gates pass (`test:visual`, accessibility smoke, perf benchmarks, naming scan); packaged-app manual relay smoke pending final artifact run
