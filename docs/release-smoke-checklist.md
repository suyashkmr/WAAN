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
6. Validate guided recovery actions in relay banner:
   - Offline recovery:
     - Stop relay (`Pause Relay`) or terminate relay process, then wait for offline/error banner state.
     - Confirm recovery actions appear: `Reconnect`, `Resync`, `Export diagnostics`.
     - Click `Reconnect` and confirm relay returns to `starting` or `waiting_qr` flow.
   - Fallback/sync degradation recovery:
     - Relaunch app with fallback mode enabled:
       - `WAAN_RELAY_SYNC_MODE=fallback ./WAAN.app/Contents/MacOS/WAAN`
     - Trigger sync and confirm banner metadata includes `Sync path: fallback` and `Fallback reason: ...`.
     - Click `Resync` and verify sync progress runs again and chat list refreshes.
   - Diagnostics recovery:
     - Click `Export diagnostics`.
     - Confirm diagnostics JSON download succeeds and filename includes `diagnostics`.

## Pass Criteria

1. App starts with both local servers healthy.
2. QR link succeeds and account reaches running state.
3. Chat sync completes and returns plausible non-zero count.
4. `syncPath` is present in status/UI metadata.
5. No unrecovered relay error loops.
6. Recovery actions are visible in degraded states and each action performs its intended flow.

## Excellence Gates

Run these gates in addition to relay smoke.

1. Relay/export reliability gate (per release)
   - `npm run check:release-reliability`
   - Must pass relay transition edge tests (`offline -> starting -> waiting -> running`, sync-path shift handling) and export integrity tests (CSV/JSON sanity + PDF metadata stamping).
2. Performance budgets (per release)
   - `npm run check:perf-budgets`
   - Gate runs fixed-size perf probes for render/search/sync proxies and fails on materially regressed latency/write-amplification metrics.
   - If gate fails, compare output with latest baseline table in `docs/performance-at-scale.md` and either fix regression or explicitly revise budgets with rationale.
3. Accessibility smoke (per release)
   - `npm run test:accessibility-smoke`
   - Must pass across desktop/laptop/tablet/mobile projects.
4. Visual regression status (per release)
   - `npm run test:visual`
   - If expected intentional diffs exist, run `npm run test:visual:update`, review, and re-run `npm run test:visual`.
5. Naming and copy consistency (per release)
   - `rg -n "ChatScope" index.html README.md docs --glob '!docs/release-smoke-checklist.md'`
   - Expected result: no user-facing brand-name drift unless explicitly documented in release notes.

## Gate Ownership

1. Relay/export reliability gate
   - Owner: Engineering
   - Frequency: Per release
2. Performance budgets
   - Owner: Engineering
   - Frequency: Per release
3. Accessibility smoke
   - Owner: Engineering
   - Frequency: Per release
4. Visual regression status
   - Owner: Engineering + Design review
   - Frequency: Per release
5. Naming and copy consistency
   - Owner: Product + Engineering
   - Frequency: Per release

## Failure Capture

If any step fails, capture:

1. Full app console log block around failure timestamp.
2. `GET /relay/status` payload.
3. Active env vars (`WAAN_RELAY_SYNC_MODE`, `WAAN_RELAY_HEADLESS`, ports).
4. Whether fallback loaded chats and final synced count.

Then follow `docs/relay-troubleshooting.md`.

## Rollback Notes: First Full-Vue Frontend Release

Use this only for the first release where frontend runtime ownership is fully Vue-native.

1. Trigger conditions
   - Critical search/saved/dashboard UI regression in production.
   - Visual/accessibility/perf gate escape that impacts core flows.
2. Rollback action
   - Re-point distribution to previous stable tag/release artifact.
   - Publish a follow-up patch tag only after gate repro + fix on the release branch.
3. Validation before re-cut
   - Re-run `npm run ci:verify`.
   - Re-run `npm run test:visual`.
   - Re-run `npm run test:accessibility-smoke`.
   - Re-run `npm run check:perf-budgets`.
4. Communication
   - Note rollback reason in release notes.
   - Include impacted surfaces and recovery status in sign-off notes.

## Latest Sign-off

- Date: 2026-03-04
- Status: PRE-RELEASE GATES PASS
- Verified by: automated release gates pass (`ci:verify`, `test:visual`, accessibility smoke, `check:perf-budgets` with `WAAN_PERF_BUDGET_PROFILE=release-ci`, release-notes validation)
- Recovery checks:
  - Packaged `WAAN.app` manual relay + recovery smoke: PENDING (run against `v2.4.7` artifact once release workflow publishes assets)
- Notes: Release notes for `v2.4.7` are present and validator-compliant; tagged-release prerequisite gates are green.

- Date: 2026-03-02
- Status: PASS
- Verified by: automated release gates pass (`test:visual`, accessibility smoke, perf benchmarks, naming scan) and packaged `WAAN.app` manual relay + recovery smoke
- Recovery checks:
  - Offline -> `Reconnect`: PASS
  - Fallback -> `Resync`: PASS
  - `Export diagnostics`: PASS
- Notes: Recovery-action flows function as expected in degraded states; sync-path diagnostics remain visible and actionable.

Use this template after running packaged-app recovery smoke:

```md
- Date: YYYY-MM-DD
- Status: PASS | FAIL
- Verified by: packaged WAAN.app manual relay + recovery smoke
- Recovery checks:
  - Offline -> `Reconnect`: PASS | FAIL (notes)
  - Fallback -> `Resync`: PASS | FAIL (notes)
  - `Export diagnostics`: PASS | FAIL (notes)
- Notes: <fallback reason observed, sync-path behavior, any blockers>
```
