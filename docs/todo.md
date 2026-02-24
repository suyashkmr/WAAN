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
- [x] Thin `createAppCompositionAssembly` to mapping-only orchestration.
  - [x] Extract relay element/dependency mapping into a dedicated relay composition adapter.
  - [x] Extract dataset lifecycle dependency mapping into a dedicated dataset composition adapter.
  - [x] Keep `createAppCompositionAssembly` focused on orchestrator composition + final API surface wiring.
  - [x] Enforce concrete size target for `js/appShell/compositionAssembly.js` (<= 350 lines excluding imports/exports).
  - [x] Verify no regressions via boundary tests + full `ci:verify`.
- [x] Move DOM prep and Electron-specific hooks out of controller wiring into dedicated adapters (`js/appShell/controllerWiring/dashboardDataStatusTheme.js`, `js/relayControls.js`).
  - [x] Isolate DOM-only concerns into view adapters.
  - [x] Isolate Electron/platform concerns into platform adapter layer.
  - [x] Verify headless/test wiring still works with adapter split.
- [x] Break up overloaded UI/relay modules into focused units (`js/ui.js`, `js/relayControls.js`).
  - [x] Separate state coordination, rendering helpers, and persistence/preferences.
  - [x] Minimize public APIs for each new module.
  - [x] Add targeted tests for extracted modules and integration seams.

### Efficiency Deep Work

- [x] Batch chat metadata persistence and avoid full per-chat rewrites on incremental updates (`apps/server/src/store/chatStore.js`).
  - [x] Design write strategy (batch window or transactional queue).
  - [x] Implement incremental writes with fallback/recovery path.
  - [x] Measure write amplification before/after and capture results.
- [x] Parallelize/cap metadata enrichment during sync and skip unchanged updates (`apps/server/src/relay/relaySync.js`, `apps/server/src/relay/relayData.js`).
  - [x] Add bounded concurrency for participant/meta enrichment.
  - [x] Skip or short-circuit unchanged records.
  - [x] Verify sync correctness and error handling under degraded network.
- [x] Add incremental/indexed search-worker strategy to avoid full data scans per query (`js/searchWorker.js`).
  - [x] Define index shape and invalidation/update strategy.
  - [x] Implement incremental index updates on dataset changes.
  - [x] Benchmark query latency and worker CPU before/after.

### Post-Current-List: UI Polish (Tailwind CSS + Shoelace primitives)

- [x] Define UI migration scope and acceptance criteria before implementation.
  - [x] Freeze target surfaces for phase 1.
    - [x] Include `#hero-panel` surface (hero headline, status badge/copy/meta, milestone strip).
    - [x] Include section navigation strip (`.section-nav`, active-state/highlight behavior).
    - [x] Include overview summary cards in `#summary` (count/stat card wrappers and shared card chrome).
    - [x] Include relay status/banner + primary relay controls surface (`#relay-status-banner`, relay action controls).
    - [x] Keep phase-1 out of scope: search panel, saved views, export controls, deep analytics panels.
  - [x] Define parity checklist: dark/light theme behavior, accessibility toggles, Electron layout, responsive breakpoints.
    - [x] Theme parity checklist (phase-1 surfaces):
      - [x] `theme=light`, `theme=dark`, and `theme=system` render correctly for `#hero-panel`, `.section-nav`, `#summary`, and `#relay-status-banner`.
      - [x] Active/inactive/hover/focus/disabled states remain visually distinct in both schemes.
      - [x] Hero relay states (`Not connected`, `waiting_qr`, `starting`, `running`) preserve readability and status emphasis in both schemes.
      - [x] Save-as-PDF/export theme selection remains aligned with active theme behavior.
    - [x] Accessibility parity checklist (phase-1 surfaces):
      - [x] Keyboard tab order is stable; all phase-1 interactive elements are focusable with visible focus indicators.
      - [x] `data-reduce-motion=\"true\"` disables non-essential transitions/animations for phase-1 elements.
      - [x] `data-contrast=\"high\"` preserves readable text, borders, and status chips across phase-1 elements.
      - [x] Nav + relay controls remain operable without pointer input.
    - [x] Electron/runtime parity checklist:
      - [x] Electron packaged app layout matches browser/dev baseline for phase-1 surfaces at default window size.
      - [x] Relay banner updates and hero status updates render without clipped/overflowing controls.
      - [x] No dependence on browser-only devtools workflow for parity verification.
    - [x] Responsive parity checklist:
      - [x] Verify at 1280px, 1024px, 768px, and 390px widths for phase-1 surfaces.
      - [x] Section nav remains usable (no overlap/truncation that blocks navigation).
      - [x] Hero and summary cards keep readable hierarchy (no collapsed/overlapping text).
      - [x] Relay status/banner actions remain visible and reachable without horizontal scroll.
    - [x] Verification evidence requirements:
      - [x] Capture before/after screenshots for each phase-1 surface in light + dark at desktop and mobile widths.
      - [x] Record one manual keyboard traversal note and one relay-status transition note per scheme.
      - [x] Keep parent task open until all above checks are executed post-implementation.
  - [x] Capture baseline screenshots and interaction notes for regression comparison.
    - [x] Execute baseline capture using `docs/ui-phase1-baseline-capture.md`.
    - [x] Save required screenshots under `docs/ui-baseline/` with the documented naming convention.
    - [x] Record baseline notes in `docs/ui-baseline/phase1-notes.md` (keyboard traversal + relay status transition).
    - [x] Confirm light + dark evidence exists before phase-1 migration starts.
- [x] Introduce Tailwind CSS pipeline and design-token mapping.
  - [x] Add Tailwind config, content globs, and build integration.
  - [x] Map existing design tokens/CSS vars to Tailwind theme extensions.
  - [x] Verify production build output size and purge behavior.
- [x] Introduce Shoelace foundation and shared primitives (shadcn/ui-compatible alternative for vanilla JS runtime).
  - [x] Install/generate core primitives (button, input, select, dialog, tooltip, tabs, card).
  - [x] Wire primitives to existing theme variables and motion/accessibility settings.
  - [x] Document component usage rules to avoid ad-hoc styling drift.
- [ ] Migrate one vertical slice first before broad rollout.
  - [ ] Replace one end-to-end surface (for example dashboard hero + section nav + summary cards).
  - [ ] Validate behavior parity with existing keyboard/mouse flows.
  - [ ] Keep rollback path until parity is confirmed.
- [ ] Expand migration to remaining app surfaces in controlled phases.
  - [ ] Relay controls and status/banner surfaces.
  - [ ] Search, filters, saved views, and export controls.
  - [ ] Remaining dashboard panels and utility views.
- [ ] Validate visual quality, accessibility, and runtime performance.
  - [ ] Run responsive checks (desktop + mobile viewport set) and Electron smoke checks.
  - [ ] Run accessibility checks (focus order, contrast, reduced motion, high contrast).
  - [ ] Track paint/render/perf regressions and fix before completion.
- [ ] Remove legacy styling paths only after parity is confirmed.
  - [ ] Remove dead CSS/selectors and obsolete style helpers.
  - [ ] Update docs/tests to reflect new UI stack.
  - [ ] Run full `ci:verify` + manual UI smoke before marking complete.

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
