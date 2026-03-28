# App Shell Architecture

Authority note:
- This file is current architecture guidance for the app-shell/runtime composition.
- If it conflicts with historical phase docs or release notes, prefer this file plus the current code.

`js/appShell.js` is the top-level composition root for the dashboard UI. It does not own product behavior directly; it wires DOM refs, controller construction, runtime composition, and bootstrap config together, then hands execution to the app-shell runtime.

## Current Composition Shape

The current app-shell is organized around five layers:

1. DOM discovery and grouping
   - `js/appShell/domCache.js`
   - `js/appShell/domRefs.js`
   - `js/appShell/domRefGroups.js`
2. controller wiring and dependency/config assembly
   - `js/appShell/controllerWiring.js`
   - `js/appShell/controllerWiring/*`
   - `js/appShell/entryConfig.js`
   - `js/appShell/compositionConfig.js`
3. runtime composition / orchestration
   - `js/appShell/compositionAssembly.js`
   - `js/appShell/assemblyWiring.js`
   - `js/appShell/runtimeBootstrap.js`
   - `js/appShell/runtimeBootstrapConfig.js`
4. focused app-shell feature modules
   - range, chat selection, onboarding, theme, status, relay, dataset-empty, data-status, export, section-nav
5. Vue bridge / shell surface ownership
   - shell/search/saved/dashboard islands under `js/vue/*`

The important boundary is:

- `js/appShell.js` should stay orchestration-only
- `js/appShell/*` owns composition and runtime rules
- `js/vue/*` owns Vue-rendered shell/search/saved/dashboard surfaces

## Key Runtime Modules

- `js/appShell/domRefs.js`
  - Centralized DOM/query registry via `createAppDomRefs`.
- `js/appShell/domRefGroups.js`
  - Regroups raw DOM refs into runtime/relay/filter/dashboard/export/saved-view/search slices.
- `js/appShell/entryConfig.js`
  - Normalizes the arguments used to construct controller wiring and composition assembly.
- `js/appShell/compositionConfig.js`
  - Builds the higher-level config objects for controller and assembly creation.
- `js/appShell/controllerWiring.js`
  - Creates controller-side runtime wiring from grouped refs/config.
- `js/appShell/compositionAssembly.js`
  - Creates the assembled runtime that coordinates relay, dataset lifecycle, rendering, exports, and shell side effects.
- `js/appShell/assemblyWiring.js`
  - Shared wiring helpers used by the composition assembly and runtime bootstrap.
- `js/appShell/runtimeBootstrap.js`
  - Starts the shell runtime once refs, handlers, and dependencies are ready.
- `js/appShell/runtimeBootstrapConfig.js`
  - Shapes the config contract consumed by bootstrap.

## Focused Feature Modules

- `js/appShell/dataStatus.js`
  - Dashboard loading/data-availability state and hero status messaging.
- `js/appShell/datasetEmptyState.js`
  - Dataset-empty callout visibility/message state; also controls the workspace split behavior when the empty-state lane is present or absent.
- `js/appShell/chatSelection.js`
  - Chat selector and related active-chat flow.
- `js/appShell/rangeFilters.js`
  - Range/custom-range/filter coordination.
- `js/appShell/relayBootstrap.js`
  - Relay polling/log stream startup and runtime wiring.
- `js/appShell/relayRuntime.js`
  - Relay controller composition.
- `js/appShell/exportRuntime.js`
  - Export summary and export runtime composition.
- `js/appShell/compositionRuntime.js`
  - Dashboard runtime composition plus dataset lifecycle runtime helpers.
- `js/appShell/keyboardShortcuts.js`
  - Global shortcut handling.
- `js/appShell/onboarding.js`
  - Onboarding overlay controller and persistence.
- `js/appShell/themeUi.js`
  - Theme preference UI control logic.
- `js/appShell/statusUi.js`
  - Toast/status presentation.
- `js/appShell/sectionNav.js`
  - Sticky section-nav behavior and active-state updates.

## Vue-Owned Surface Boundaries

The shell runtime is now Vue-first for the major interactive surfaces:

- shell primitives: `js/vue/shellPrimitivesIsland.js`
- search/saved bridge: `js/vue/searchSavedIsland.js`
- saved-view gallery renderer: `js/vue/searchSavedRenderers.js`
- dashboard card-shell / section islands: `js/vue/dashboardPanelsIsland.js` and related renderers

Important current runtime note:

- the saved-view gallery does not use PrimeVue `DataView` in production
- gallery cards render directly into the Vue gallery root so the responsive CSS grid controls layout predictably

## Workspace-Specific Contract

After Phase 43, the workspace stage behaves as a compact instrument panel:

- relay status banner first
- core dataset/range/export controls second
- setup/diagnostics/display tools behind the utility disclosure
- empty-state support lane only claims desktop width when dataset-empty is actually visible

That behavior is implemented across:

- `index.html`
- `styles.components.css`
- `styles/components/relay.css`
- `js/appShell/datasetEmptyState.js`
- `js/vue/shellPrimitiveViews.js`
- `js/vue/shellPrimitivesIsland.js`

## Test Runtime Contract

`js/appShell/testRuntime.js` is a test-only runtime surface used by Playwright/webdriver flows.

Current contract:

- It should install only in test contexts.
- It may accept lightweight seeded entries and partial analytics overrides.
- It must normalize seeded payloads so the live dashboard, search, saved views, and export flows can consume them without crashing.
- It must preserve production-facing semantics where possible instead of inventing a separate dashboard contract just for tests.

## Data Policy

Runtime data is local-only and should not be committed:

- `chat.json`
- `analytics.json`

Committed fixtures are intentionally small:

- `chat.sample.json`
- `analytics.sample.json`

Generated/backup artifacts stay ignored, including examples such as:

- `*.tgz`
- `*.tar.gz`
- `apps_prev_*`
- `chat.json.gz`
- `coverage/`
- `__pycache__/`

## Guardrails

- Local verify:
  - `npm run ci:verify`
- Local smoke:
  - `npm run test:smoke`
- Visual/accessibility:
  - `npx playwright test tests/visual/dashboard.visual.spec.js`
  - `npm run test:accessibility-smoke`

`ci:verify` is the real release-grade gate. `verify` alone is only lint + unit tests.

## Maintainer Checklist

When adding or changing app-shell behavior:

1. Keep `js/appShell.js` orchestration-only.
2. Add DOM nodes to `js/appShell/domRefs.js`, then group them in `js/appShell/domRefGroups.js`.
3. Wire controller/runtime dependencies through:
   - `js/appShell/entryConfig.js`
   - `js/appShell/compositionConfig.js`
   - `js/appShell/controllerWiring.js`
   - `js/appShell/compositionAssembly.js`
4. If a surface is Vue-owned, update the matching bridge/island under `js/vue/*` instead of adding controller-owned DOM behavior.
5. If layout depends on UI state, prefer explicit state-driven classes/contracts over brittle CSS-only parent inference.
6. Add or update tests:
   - contract tests for new wiring surfaces
   - targeted unit/integration tests for the changed module
   - visual/a11y tests when shell layout or state presentation changes
7. Run guardrails before merging:
   - `npm run check:types`
   - `npm run test:accessibility-smoke`
   - `npx playwright test tests/visual/dashboard.visual.spec.js`
   - `npm run ci:verify`
