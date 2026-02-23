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
- [x] Reduce default remote message fetch limit and avoid full-fetch unless explicitly requested (`js/config.js`, `js/relayControls/actions.js`).
  - [x] Set a lower default limit based on current UI needs.
  - [x] Gate full-fetch behind an explicit user/system trigger.
  - [x] Verify message rendering, pagination/load-more behavior, and sync timings.

### Modularity Refactors

- [x] Split `createAppCompositionAssembly` into smaller orchestrators (`js/appShell/compositionAssembly.js`).
  - [x] Define new module boundaries and dependency direction.
  - [x] Extract orchestrators incrementally without behavior changes.
  - [x] Add/adjust tests for assembly wiring contracts.
  - [x] Verify startup, relay integration, and export lifecycle end-to-end.
- [ ] Thin `createAppCompositionAssembly` to mapping-only orchestration.
  - [ ] Extract relay element/dependency mapping into a dedicated relay composition adapter.
  - [ ] Extract dataset lifecycle dependency mapping into a dedicated dataset composition adapter.
  - [ ] Keep `createAppCompositionAssembly` focused on orchestrator composition + final API surface wiring.
  - [ ] Enforce concrete size target for `js/appShell/compositionAssembly.js` (<= 350 lines excluding imports/exports).
  - [ ] Verify no regressions via boundary tests + full `ci:verify`.
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

- [x] Remove likely orphaned `cloud-relay/` after final validation.
  - [x] Confirm no runtime/build/docs dependency exists.
  - [x] Remove directory and update docs if needed.
  - [x] Run smoke checks after removal.
- [x] Validate whether `mobile/android-app/` is still required; remove if unused.
  - [x] Confirm ownership/current usage via repo validation (no runtime/build/docs references found).
  - [x] Remove project once validated unused.
  - [x] Validate CI/build/docs are unaffected.
- [x] Remove dead helper `scripts/build-macos-installer.sh`.
  - [x] Confirm no scripted/manual dependency remains.
  - [x] Remove script and any stale references.
- [x] Validate manual usage of `scripts/resync-chats.js` before any deletion.
  - [x] Confirm operator usage pattern (no repo/docs invocations; UI `Resync chats` is the documented/operator path; script targets stale default API URL `http://localhost:3030`).
  - [x] If unused, remove and document replacement path.
- [x] Clear generated artifacts when stale (`playwright-report/`, `test-results/`).
  - [x] Remove stale artifacts during cleanup passes.
  - [x] Keep `.gitignore` coverage intact.

### Local Chat Library Retirement (Remote-Only Product Flow)

- [x] Remove user-facing local chat selector flow (`Your chats`) now that product flow is remote-only.
  - [x] Confirm no required user journey depends on local chat library behavior.
  - [x] Remove local branch handling from chat selection controller (`js/appShell/chatSelection.js`).
  - [x] Keep forced reselect/reload behavior for remote chats intact.
  - [x] Add/update tests for remote-only selector behavior.
- [x] Deprecate in-memory local chat library state that is no longer referenced.
  - [x] Remove or isolate `saveChatDataset`/`listChatDatasets` usage paths (`js/state/chatLibraryState.js`).
  - [x] Remove dead wiring dependencies from composition/controller wiring layers.
  - [x] Verify no regressions in dataset rendering, analytics, and export flows.
- [x] Clean up related copy/docs/tests after remote-only cutover.
  - [x] Remove stale UI copy that implies local chat library usage.
  - [x] Update tests that assume mixed local+remote selector groups.
  - [x] Run smoke + targeted tests and capture migration notes before marking complete.

## Process Guardrail

- [ ] If a trigger occurs, open a focused refactor task per `docs/engineering-guardrails.md`.
