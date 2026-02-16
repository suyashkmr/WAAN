## Feature Map

| Module | Purpose / Key Responsibilities | Current Usage & Notes |
| --- | --- | --- |
| `js/appShell.js` | Composition root for the dashboard app. Wires state, controllers, and boot sequence. | Active. Mostly orchestration now; behavior moved into `js/appShell/*` modules. |
| `js/appShell/index.js` | Barrel export for app-shell controllers/utilities. | Active. Reduces import churn and centralizes module boundaries. |
| `js/appShell/bootstrap.js` | App startup sequence (`DOMContentLoaded`): init controllers, nav, onboarding, card toggles. | Active; covered by boot smoke test (`tests/appShellBoot.test.js`). |
| `js/appShell/eventBindings.js` | DOM event registration for filters, exports, participants, and range controls. | Active; covered by controller tests. |
| `js/appShell/relayBootstrap.js` | Relay control wiring + clear-storage flow + polling/log stream startup. | Active; covered by controller tests. |
| `js/appShell/datasetLifecycle.js` | Dataset apply pipeline: normalize, fingerprint/cache reset, analytics compute, persist/select, render handoff. | Active; covered by controller + integration tests. |
| `js/appShell/dataStatus.js` | Dashboard loading/data-availability state + relay hero status messaging. | Active; covered by controller tests. |
| `js/appShell/keyboardShortcuts.js` | Global shortcut handling (`Cmd/Ctrl+R`, `Cmd/Ctrl+L`, `Cmd/Ctrl+M`, `Esc`). | Active. |
| `js/appShell/sharedRuntime.js` | Shared runtime helpers (`fetchJson`, global busy wrapper, relay account formatting). | Active. |
| `js/appShell/dashboardRender.js` + `js/appShell/dashboardRender/*` | Dashboard rendering orchestration split into `activityPanels`, `highlightsStats`, and `participantsPanel`. | Active. Large render domain now segmented. |
| `js/relayControls.js` | Relay lifecycle/status syncing, QR/session handling, log drawer runtime behavior. | Active. Consumed by app-shell composition. |
| `js/analytics.js` + `js/analytics/*` | Parse and compute analytics (summary, activity, sentiment, message types, highlights, system events). | Active; analytics behavior covered by existing analytics tests. |
| `js/search.js` + `js/searchWorker.js` | Search query execution and worker-based filtering/progress. | Active. |
| `js/exporters.js`, `js/exportShared.js`, `js/exportWorker.js` | CSV/text/slides/PDF exports and worker-backed report generation. | Active; exporter smoke tests exist. |
| `js/state.js` | Central in-memory state for dataset, library, range/filter, search, and saved views. | Active; unit-tested. |

## Quality Gates

- `npm run lint`
- `npm test`
- `npm run verify` (lint + test)

## Current Test Coverage Signals

- Controller-focused tests: `tests/appShellControllers.test.js`
- App boot smoke test: `tests/appShellBoot.test.js`
- Barrel export regression test: `tests/barrels.test.js`
- Cross-controller integration test: `tests/appShellIntegration.test.js`
