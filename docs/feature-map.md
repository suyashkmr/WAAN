## Feature Map

| Module | Purpose / Key Responsibilities | Current Usage & Notes |
| --- | --- | --- |
| `js/appShell.js` | Composition root for the dashboard app. Wires state, controllers, and boot sequence. | Active. Mostly orchestration now; behavior moved into `js/appShell/*` modules. |
| `js/appShell/index.js` | Barrel export for app-shell controllers/utilities used by the main composition root. | Active. Centralizes current runtime-facing app-shell constructors/helpers. |
| `js/appShell/bootstrap.js` | App startup sequence (`DOMContentLoaded`): init controllers, nav, onboarding, card toggles. | Active; covered by boot smoke test (`tests/appShellBoot.test.js`). |
| `js/appShell/entryConfig.js` + `js/appShell/compositionConfig.js` | Build normalized controller/runtime config objects from grouped refs and shared dependencies. | Active. Current app-shell composition relies on these config layers. |
| `js/appShell/controllerWiring.js` + `js/appShell/controllerWiring/*` | Creates controller-side runtime wiring and contracts from grouped refs/config. | Active; covered by contract tests. |
| `js/appShell/compositionAssembly.js` + `js/appShell/assemblyWiring.js` | Runtime assembly for relay, dataset lifecycle, dashboard rendering, exports, and shell side effects. | Active. Core composition layer. |
| `js/appShell/runtimeBootstrap.js` + `js/appShell/runtimeBootstrapConfig.js` | Starts the shell runtime from the assembled handlers/dependencies/config. | Active. Main bootstrap handoff after composition. |
| `js/appShell/eventBindings.js` | Remaining browser/event glue for exports and fallback-only wiring; primary page/dashboard interactions are now bridge-owned. | Active; covered by controller tests. |
| `js/appShell/relayBootstrap.js` + `js/appShell/relayRuntime.js` | Relay control wiring, polling/log stream startup, and relay runtime composition. | Active; covered by controller tests. |
| `js/appShell/datasetLifecycle.js` | Dataset apply pipeline: normalize, fingerprint/cache reset, analytics compute, persist/select, render handoff. | Active; covered by controller + integration tests. |
| `js/appShell/datasetEmptyState.js` | Dataset-empty callout visibility/message state plus workspace split-lane visibility contract. | Active. Important Phase 43 workspace-state module. |
| `js/appShell/dataStatus.js` | Dashboard loading/data-availability state + relay hero status messaging. | Active; covered by controller tests. |
| `js/appShell/keyboardShortcuts.js` | Global shortcut handling (`Cmd/Ctrl+R`, `Cmd/Ctrl+L`, `Cmd/Ctrl+M`, `Esc`). | Active. |
| `js/appShell/sharedRuntime.js` | Shared runtime helpers (`fetchJson`, global busy wrapper, relay account formatting). | Active. |
| `js/appShell/dashboardRender.js` + `js/appShell/dashboardRender/*` | Dashboard rendering orchestration split into `activityPanels`, `highlightsStats`, and `participantsPanel`. | Active. Large render domain now segmented. |
| `js/vue/shellPrimitivesIsland.js` + `js/vue/shellPrimitiveViews.js` | Vue-owned shell primitive rendering for workspace/shell controls and static utility-action bridging. | Active. Owns primary shell surface rendering, not legacy controller DOM writes. |
| `js/vue/searchSavedIsland.js` + `js/vue/searchSavedRenderers.js` | Vue bridge + renderers for search and saved views, including gallery/comparison output. | Active. Saved-view gallery now renders direct Vue cards into the gallery root instead of PrimeVue `DataView`. |
| `js/relayControls.js` | Relay lifecycle/status syncing, QR/session handling, log drawer runtime behavior. | Active. Consumed by app-shell composition. |
| `js/analytics.js` + `js/analytics/*` | Parse and compute analytics (summary, activity, sentiment, message types, highlights, system events). | Active; legacy activity DOM renderer implementations were removed in Phase 8, leaving shared helper/view-model code for Vue-owned panels. |
| `js/search.js` + `js/searchWorker.js` | Search query execution and worker-based filtering/progress. | Active. |
| `js/savedViews.js` + `js/savedViewsUi.js` | Saved-view state/control orchestration, select wiring, gallery payloads, and compare-summary preparation. | Active. Runtime rendering hands off to the Vue search/saved bridge when available. |
| `js/exporters.js`, `js/exportShared.js`, `js/exportWorker.js` | CSV/text/slides/PDF exports and worker-backed report generation. | Active; exporter smoke tests exist. |
| `js/state.js` | Central in-memory state for dataset, library, range/filter, search, and saved views. | Active; unit-tested. |

## Removed During Vue Cutover

- `js/appShell/vueFrontendAdapterLayer.js` (and `tests/vueFrontendAdapterLayer.test.js`) removed in Phase 8.
- Legacy dashboard activity fallback renderers were removed from the primary runtime render path, but the broader runtime still retains scoped compatibility and non-render fallback branches that later cleanup phases continue to audit.

## Quality Gates

- `npm run lint`
- `npm test`
- `npm run verify` (lint + test)
- `npm run ci:verify` (full release-grade gate)
- `npx playwright test tests/visual/dashboard.visual.spec.js`
- `npm run test:accessibility-smoke`

## Current Test Coverage Signals

- Controller-focused tests: `tests/appShellControllers.test.js`
- App boot smoke test: `tests/appShellBoot.test.js`
- Barrel export regression test: `tests/barrels.test.js`
- Cross-controller integration test: `tests/appShellIntegration.test.js`
- Search/saved Vue bridge coverage: `tests/searchSavedIsland.test.js`, `tests/savedViewsVueBridgeIntegration.test.js`
