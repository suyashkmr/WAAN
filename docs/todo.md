# Active Todo

Completed tasks were removed for clarity (history remains in git).

## Completion Policy

- [ ] Do not mark a parent task complete after a single implementation pass.
- [ ] Mark a task complete only when all of the following are done:
  - [ ] Code changes are implemented.
  - [ ] Relevant tests/checks pass (automated where available, otherwise documented manual verification).
  - [ ] Behavior is verified end-to-end for the affected flow.
  - [ ] Follow-up risks or caveats are either resolved or captured as new TODO items.
- [ ] If validation is pending, keep the parent task unchecked and add explicit validation subtasks.
- [ ] Add detailed subtasks whenever work spans multiple files, phases, or verification steps.

## Current State

- [ ] Modularity, efficiency, and dead-code follow-ups are now tracked below.

## Active Work Items

### Efficiency Quick Wins

- [x] Guard `GET /chats/:chatId/messages` so sync/fetch runs only when needed (`apps/server/src/http/apiRouter.js`).
  - [x] Define refresh conditions (explicit `refresh`, missing cache, or stale threshold).
  - [x] Implement guarded sync path and preserve existing response contract.
  - [x] Add/adjust tests for guarded and forced-refresh cases.
  - [x] Verify chat load, reload, and multi-chat navigation behavior manually.
- [x] Pause relay status polling when the dashboard tab is hidden (`js/relayControls/actions.js`).
  - [x] Add visibility-aware polling guard.
  - [x] Ensure polling resumes reliably on tab focus/visibility restore.
  - [x] Verify no stale status regressions after resume.
- [ ] Reduce default remote message fetch limit and avoid full-fetch unless explicitly requested (`js/config.js`, `js/relayControls/actions.js`).
  - [ ] Set a lower default limit based on current UI needs.
  - [ ] Gate full-fetch behind an explicit user/system trigger.
  - [ ] Verify message rendering, pagination/load-more behavior, and sync timings.

### Modularity Refactors

- [ ] Split `createAppCompositionAssembly` into smaller orchestrators (`js/appShell/compositionAssembly.js`).
  - [ ] Define new module boundaries and dependency direction.
  - [ ] Extract orchestrators incrementally without behavior changes.
  - [ ] Add/adjust tests for assembly wiring contracts.
  - [ ] Verify startup, relay integration, and export lifecycle end-to-end.
- [ ] Move DOM prep and Electron-specific hooks out of controller wiring into dedicated adapters (`js/appShell/controllerWiring/dashboardDataStatusTheme.js`, `js/relayControls.js`).
  - [ ] Isolate DOM-only concerns into view adapters.
  - [ ] Isolate Electron/platform concerns into platform adapter layer.
  - [ ] Verify headless/test wiring still works with adapter split.
- [ ] Break up overloaded UI/relay modules into focused units (`js/ui.js`, `js/relayControls.js`).
  - [ ] Separate state coordination, rendering helpers, and persistence/preferences.
  - [ ] Minimize public APIs for each new module.
  - [ ] Add targeted tests for extracted modules and integration seams.

### Efficiency Deep Work

- [ ] Batch chat metadata persistence and avoid full per-chat rewrites on incremental updates (`apps/server/src/store/chatStore.js`).
  - [ ] Design write strategy (batch window or transactional queue).
  - [ ] Implement incremental writes with fallback/recovery path.
  - [ ] Measure write amplification before/after and capture results.
- [ ] Parallelize/cap metadata enrichment during sync and skip unchanged updates (`apps/server/src/relay/relaySync.js`, `apps/server/src/relay/relayData.js`).
  - [ ] Add bounded concurrency for participant/meta enrichment.
  - [ ] Skip or short-circuit unchanged records.
  - [ ] Verify sync correctness and error handling under degraded network.
- [ ] Add incremental/indexed search-worker strategy to avoid full data scans per query (`js/searchWorker.js`).
  - [ ] Define index shape and invalidation/update strategy.
  - [ ] Implement incremental index updates on dataset changes.
  - [ ] Benchmark query latency and worker CPU before/after.

### Dead Code Cleanup

- [ ] Remove likely orphaned `cloud-relay/` after final validation.
  - [ ] Confirm no runtime/build/docs dependency exists.
  - [ ] Remove directory and update docs if needed.
  - [ ] Run smoke checks after removal.
- [ ] Validate whether `mobile/android-app/` is still required; remove if unused.
  - [ ] Confirm ownership and current usage with team.
  - [ ] Remove project only after explicit confirmation.
  - [ ] Validate CI/build/docs are unaffected.
- [ ] Remove dead helper `scripts/build-macos-installer.sh`.
  - [ ] Confirm no scripted/manual dependency remains.
  - [ ] Remove script and any stale references.
- [ ] Validate manual usage of `scripts/resync-chats.js` before any deletion.
  - [ ] Confirm operator usage pattern.
  - [ ] If unused, remove and document replacement path.
- [ ] Clear generated artifacts when stale (`playwright-report/`, `test-results/`).
  - [ ] Remove stale artifacts during cleanup passes.
  - [ ] Keep `.gitignore` coverage intact.

### Local Chat Library Retirement (Remote-Only Product Flow)

- [ ] Remove user-facing local chat selector flow (`Your chats`) now that product flow is remote-only.
  - [ ] Confirm no required user journey depends on local chat library behavior.
  - [ ] Remove local branch handling from chat selection controller (`js/appShell/chatSelection.js`).
  - [ ] Keep forced reselect/reload behavior for remote chats intact.
  - [ ] Add/update tests for remote-only selector behavior.
- [ ] Deprecate in-memory local chat library state that is no longer referenced.
  - [ ] Remove or isolate `saveChatDataset`/`listChatDatasets` usage paths (`js/state/chatLibraryState.js`).
  - [ ] Remove dead wiring dependencies from composition/controller wiring layers.
  - [ ] Verify no regressions in dataset rendering, analytics, and export flows.
- [ ] Clean up related copy/docs/tests after remote-only cutover.
  - [ ] Remove stale UI copy that implies local chat library usage.
  - [ ] Update tests that assume mixed local+remote selector groups.
  - [ ] Run smoke + targeted tests and capture migration notes before marking complete.

## Process Guardrail

- [ ] If a trigger occurs, open a focused refactor task per `docs/engineering-guardrails.md`.
