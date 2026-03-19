# UI Overhaul Spec: Community Catalyst Direction

## Goal

Reframe WAAN from a utility dashboard into a conversation command center that feels social, alive, and action-oriented.

## Successor Direction: Guided Analysis Studio Overhaul

The next redesign wave is a guided analysis studio overhaul. WAAN should stop reading like a sequence of separate dashboard sections and start reading like one production-ready product flow with clear stages, one visual system, and one interaction model.

### Current Active Program: Guided Analysis Studio

The active program reframes the app around four stages:

- setup
- workspace
- guided findings
- deep-dive tools

Information architecture regrouping is now in scope. The top shell should behave like a compact product frame rather than one section among many, and the main user journey should move cleanly from setup, to active workspace, to guided findings, to secondary deep-dive tools.

Core goals:

- consistency and cohesion across the full app rather than per-section polish
- calm-premium visual direction with stronger continuity between shell, analysis surfaces, utilities, and support tools
- psychological delight through low-overwhelm pacing, clearer prioritization, and confident state transitions
- overall UX delight through progressive disclosure and a more obvious primary journey
- efficiency through compact control framing, faster scanning, and clearly secondary utility layers

Execution priorities:

- Phase 36 resets studio architecture and section grouping.
- Phase 37 rebuilds the shared product system across shell, cards, controls, utilities, and support surfaces.
- Phase 38 unifies setup and workspace states into one cohesive experience.
- Phase 39 turns overview, highlights, participants, and timing/pattern sections into the guided findings lane.
- Phase 40 integrates search, saved views, compare, message mix, polls, and lower analytics as polished secondary tools.
- Phase 41 closes with support/diagnostics integration, responsive parity, accessibility cleanup, and final production hardening.

Guardrails:

- preserve Vue/PrimeVue ownership
- preserve controller entrypoints
- preserve native page-control fallback behavior
- preserve shell bridge side effects
- preserve relay lifecycle, search, saved views, exports, analytics rendering, and section navigation behavior unless a specific migration is intentionally opened and completed in the same phase

The completed workspace-first, analytics-story, and lower deep-dive editorial waves remain the visual baseline for this next program, but they are no longer the active roadmap framing.

### Phase 36 IA Map

Phase 36 establishes the structural baseline for the guided studio:

- Setup stage:
  - `#setup-stage`
  - `#hero-panel`
  - `#relay-live-card`
- Active workspace stage:
  - `#workspace-stage`
  - `#relay-status-banner`
  - `#actions-toolbar`
  - page controls and dataset-empty fallback remain inside the workspace shell
- Guided findings stage:
  - `#guided-findings-stage`
  - `#workspace-overview`
  - `#insight-highlights`
  - `#participants`
  - `#hourly-activity`
  - `#daily-activity`
- Deep-dive tools stage:
  - `#deep-dive-stage`
  - `#search-panel`
  - `#saved-views-card`
  - `#weekly-trend`
  - `#weekday-trend`
  - `#timeofday-trend`
  - `#sentiment-overview`
  - `#message-types`
  - `#polls-card`
- Support stage:
  - `#faq-card`
  - relay logs remain outside the main reading lane as a support drawer

Section-nav behavior remains compatible, but the nav model now prioritizes stage anchors first and section anchors second. Existing IDs, `data-nav-target` values, controller entrypoints, native page-control fallback hooks, and bridge contracts remain intact.

### Phase 37 Visual Baseline

Phase 37 establishes the first studio-wide product system on top of the Phase 36 structure:

- shared tier tokens now define primary stage, supporting evidence, utility, and quiet support surfaces from one source of truth
- studio stages, generic cards, panel headers, toolbar chrome, page controls, and utility controls now derive from one geometry and elevation model
- analytics, search, saved views, relay, and navigation surfaces now use the same control language and calmer hierarchy instead of separate local treatments
- setup and workspace remain the visually strongest tiers, guided findings stay premium and legible, and deep-dive/support surfaces are intentionally quieter without feeling unrelated

Closeout status as of 2026-03-19:

- dashboard shell, guided findings, deep-dive tools, and support surfaces now share one restrained-premium product family
- section navigation, workspace controls, search controls, saved-view controls, and secondary actions now use a unified interaction language
- runtime contracts, IDs, `data-nav-target` values, controller entrypoints, Vue/PrimeVue ownership, native page-control fallback, and shell bridge side effects remained unchanged
- acceptance revalidated with targeted `vitest`, `npm run check:types`, `npx playwright test tests/visual/dashboard.visual.spec.js --update-snapshots`, and `npx playwright test tests/visual/dashboard.visual.spec.js`

### Phase 38 Setup and Workspace Baseline

Phase 38 turns setup and workspace readiness into one continuous inline flow:

- the setup stage now owns the primary onboarding path, while hero and relay live card split cleanly into high-level signal and concrete setup actions
- the workspace stage now uses one command surface for status, exports, chat selection, and range controls instead of stacking separate banner, toolbar, and control cards
- dataset-empty now behaves as a compact workspace fallback state rather than a second onboarding module
- the onboarding overlay remains available as fallback help, but it is no longer part of the default first-run path

Closeout status as of 2026-03-19:

- shared setup/workspace copy now comes from one canonical state contract in `UI_COPY`
- offline, starting, waiting for phone link, loading chats, and ready/no-chat-selected states now hand off cleanly between setup and workspace surfaces
- Vue primitive and DOM fallback paths remain aligned with the same setup/workspace wording and control grouping
- acceptance revalidated with setup/workspace-focused `vitest`, `npm run check:types`, `npx playwright test tests/visual/dashboard.visual.spec.js --update-snapshots`, and `npx playwright test tests/visual/dashboard.visual.spec.js`

### Phase 39 Guided Findings Baseline

Phase 39 turns Stage 3 into one explicit reading lane instead of a stack of peer cards:

- `#workspace-overview` now acts as the entry point for what matters now
- `#insight-highlights` now reads as the first evidence scan, not one more equal card
- `#participants` now follows as the driver read for who is shaping the conversation
- `#hourly-activity` and `#daily-activity` now sit together as the timing entry subsection
- the findings stage now ends with a quiet handoff into Stage 4 deep-dive tools

Closeout status as of 2026-03-19:

- Stage 3 now reads in the intended order of overview, signal, drivers, timing, then deep-dive handoff without changing findings IDs, `data-nav-target` values, chart roots, or controller hooks
- findings-stage wrappers are structural only and do not alter Vue/PrimeVue ownership, native fallback behavior, or deep-link compatibility
- acceptance revalidated with targeted findings-lane `vitest`, `npm run check:types`, `npx playwright test tests/visual/dashboard.visual.spec.js --update-snapshots`, and `npx playwright test tests/visual/dashboard.visual.spec.js`

### Phase 40 Deep-Dive Baseline

Phase 40 turns Stage 4 into one explicit secondary tools layer instead of a flat utility stack:

- `#search-panel` and `#saved-views-card` now sit together as the integrated investigation cluster
- `#weekly-trend`, `#weekday-trend`, `#timeofday-trend`, and `#sentiment-overview` now read as the deeper pattern-evidence cluster
- `#message-types` and `#polls-card` now sit together as structured/export evidence
- the deep-dive stage now opens with a quiet handoff that frames this layer as inspect, compare, and export rather than another primary reading lane

Closeout status as of 2026-03-19:

- Stage 4 now reads in the intended order of tools, deeper pattern evidence, then structured/export evidence without changing Stage 4 IDs, `data-nav-target` values, form controls, chart roots, or controller hooks
- search and saved views remain fully visible and behaviorally unchanged, but now share one integrated cluster and explicit visual coverage in the dashboard visual suite
- acceptance revalidated with targeted deep-dive/runtime `vitest`, `npm run check:types`, `npx playwright test tests/visual/dashboard.visual.spec.js --update-snapshots`, and `npx playwright test tests/visual/dashboard.visual.spec.js`

### Phase 41 Final Production Baseline

Phase 41 closes the Guided Analysis Studio program with a support and hardening pass:

- the support stage now reads as exception handling only, with shorter recovery-oriented FAQ content and quieter support framing
- the relay log drawer now reads as diagnostics and recovery tooling rather than a developer console, while preserving existing actions and stream behavior
- support and diagnostics now have explicit visual coverage alongside the main dashboard baselines
- final responsive parity, accessibility cleanup, and production verification are complete across the full studio

Closeout status as of 2026-03-19:

- support remains clearly outside the main product journey while preserving `#faq-card`, `#faq-macos-gatekeeper`, `#relay-log-drawer`, and existing recovery action IDs
- keyboard focusability and visible titles now extend to support and diagnostics actions, with relay-log close behavior revalidated in unit coverage
- manual breakpoint review completed at 1440, 1024, 768, and 390 after the final support/diagnostics cleanup
- final acceptance revalidated with targeted `vitest`, `npm run check:types`, `npx playwright test tests/visual/dashboard.visual.spec.js --update-snapshots`, `npm run test:visual`, `npm run test:accessibility-smoke`, and full `npm run ci:verify`

### Completed Baseline: Workspace-First Editorial Refresh

This completed wave tightened the shell around the top-of-page experience and the primary workspace:

- hero identity and live-status framing now connect more directly to the workspace stage below
- section navigation reads as premium product chrome instead of a loose link strip
- relay banner, toolbar, page controls, dataset-empty state, and first insight lane share one stabilized editorial command-surface language
- the workspace shell frames the work more strongly than the analysis cards it contains

Closeout status as of 2026-03-19:

- manual breakpoint review completed at 1440, 1024, 768, and 390
- hero, sticky nav, workspace stage, relay/banner controls, and first-lane analysis cards now share one stabilized editorial shell language
- section-nav behavior guarantees remain intact, including modified-click preservation, keyboard focus behavior, deep-link active-pill reveal, and non-blocking mobile scroll
- acceptance revalidated with `npm run test:visual`, `npm run test:accessibility-smoke`, and full `npm run ci:verify`

### Completed Baseline: Analytics Story Lane Overhaul

This completed wave carried the editorial system into the deeper analysis lane:

- highlights, participants, timing, weekday, time-of-day, and sentiment panels now read as one connected story lane
- analytics sections distinguish story-summary, evidence, and supporting utility tiers without changing runtime ownership
- chart roots, section IDs, controller entrypoints, bridge hooks, and fallback behavior remained unchanged
- copy changes stayed minimal and served hierarchy clarity only

### Completed Baseline: Lower Deep-Dive Editorial Overhaul

This completed wave finished the editorial pass in the lower dashboard sections that previously leaned utility-first:

- message types and polls now read as part of the same story/evidence/supporting tier system as the analytics lane above
- lower deep-dive cards separate summary signals from raw lists, tables, and exports without changing runtime ownership
- existing section IDs, export triggers, chart/list roots, controller entrypoints, and bridge hooks remained unchanged
- visual coverage now explicitly includes lower-lane section baselines so future refreshes do not regress the new hierarchy

## Current Architecture Status (Post-Phase 11)

- Frontend rendering/runtime ownership is handled by Vue islands and bridge contracts.
- Search/saved/dashboard/status surfaces are Vue-owned and verified by integration tests.
- Legacy bridge-global wiring and lazy remount adapter glue are removed from active runtime paths.
- Some isolated compatibility helpers may remain in the repo for test/harness support, but they are outside active production render/event pipelines.
- PrimeVue adoption is intentionally partial today: buttons, radios, dialogs, and selected data-list surfaces are PrimeVue-backed, while `select` / `date` remain native until Phase 12+ token/theme work stabilizes the overlay/form-control skin.
- Phase 12 has started with a generated Prime-token bridge (`styles/prime-theme-bridge.css`) that now feeds the existing WAAN alias layer.
- Final release readiness is validated through `ci:verify`, visual regression, accessibility smoke, and perf budgets.

## Design Principles

- Build for momentum: every screen should answer "what happened" and "what should I do next".
- Story first: metrics are grouped into narrative blocks (signal -> context -> action).
- Strong identity: bold typography, clear semantic color roles, and consistent motion language.
- Progressive depth: high-level scan first, deep analysis one interaction away.

## Visual System

### Typography

- Display/headline: `Clash Display` (fallback: `Sora`, `Space Grotesk`).
- Body/UI: `Plus Jakarta Sans` (fallback: `Manrope`, `Public Sans`).
- Type ramp mapping:
  - Hero title: `clamp(2rem, 4vw, 3rem)`
  - Panel title: `1.125rem`
  - Body: `0.95rem`
  - Meta/labels: `0.75rem`

### Color Roles

Define/normalize semantic roles (light + dark + high-contrast):

- Surfaces: `bg-canvas`, `bg-room`, `bg-raised`, `bg-glass`
- Text: `text-primary`, `text-secondary`, `text-muted`, `text-strong`
- Borders: `border-subtle`, `border-strong`
- Status: `signal-positive`, `signal-warning`, `signal-danger`, `signal-quiet`, `signal-hot`

### Motion

- Ambient: subtle shell/background drift.
- State: relay/status transitions and sync indicators.
- Focus: section/interaction reveal transitions.
- Reduced motion mode must disable non-essential movement.

## Information Architecture

- Left rail: Rooms + Saved Views (persistent navigation).
- Top pulse bar: relay status, sync freshness, active filters.
- Main area split:
  - Story Lane: highlights, priority insights, recommended actions.
  - Deep Dive: charts, tables, search results.

## Component Inventory

Vue 3 + PrimeVue-backed islands provide behavior primitives; app provides visual wrappers.

- `RoomCard`
- `SignalChip`
- `InsightTile`
- `ActionDock`
- `TimelineRow`
- `PanelShell` / `PanelHeader` (existing primitives extended)

## Tailwind + Vue/PrimeVue Contract

- Tailwind: layout, spacing, responsive utilities, tokenized classes.
- Vue/PrimeVue: interactive controls and app-shell component composition.
- App CSS modules: brand visuals, gradients, shell chrome, motion signatures.
- Runtime assets: vendored Vue/PrimeVue bundles under `vendor/` are the production source of truth (no runtime dependency on `node_modules`).
- Shoelace status: app-shell migration paths no longer rely on Shoelace proxy custom elements.
- Final decision: Tailwind remains in Phase 6 and post-parity runtime to avoid churn in tokenized utility coverage.
- CI guardrails that enforce this contract: `check:tailwind-adoption`, `tailwind:build`, and `check:tailwind-size` inside `npm run ci:verify`.

## File-Level Implementation Plan

### Phase 1: Foundation (low risk)

- `styles.base.css`: typography + semantic token additions.
- `tailwind.config.cjs`: map new token roles + type scale.
- `styles/components/app-shell.css`: shell primitives + pulse bar baseline.
- `styles/components/navigation.css`: new navigation styling and focus treatment.

### Phase 2: Hero + Relay Story Lane

- `index.html`: shell structure for pulse bar / story lane wrappers.
- `js/ui/appShellPrimitives.js`: runtime class normalization for new wrappers.
- `styles/components/relay.css`: status chips, action dock polish.
- `styles/components/analytics.css`: insight tile hierarchy.

### Phase 3: Search + Saved Views as Command Surface

- `styles/components/search-saved.css`: command-bar behavior, playbook cards.
- `js/ui/primitives.js`: verify semantic primitive parity for new control patterns.
- `js/search/resultsUi.js`: narrative grouping and state consistency.

### Phase 4: Analytics Deep Dive

- `styles/components/analytics-charts.css`: chart card hierarchy and density polish.
- `styles.components.css`: participant/message tables dense/readable defaults.
- `js/analytics/*`: ensure labels/tooltips map to new hierarchy language.

### Phase 5: Final Parity + Hardening

- Export parity: `js/exportDeck/css.js`, `tests/exportDeckCss.test.js`.
- UI verification: keyboard/focus/tooltip parity, responsive and print.
- Full regression: `npm run ci:verify` + targeted visual checks.

## Acceptance Criteria

- Visual identity is consistent across hero, relay, search/saved views, analytics panels.
- Keyboard-only traversal is clean and visibly focused across migrated controls.
- Reduced-motion and high-contrast modes preserve clarity and usability.
- Save-as-PDF matches active theme intent (light/dark) with readable contrast.
- No regressions in existing relay/search/saved/analytics behavior.

## Validation Checklist

- Desktop: 1440 and 1024 widths (light/dark).
- Tablet/mobile: 768 and 390 widths (light/dark).
- Relay state transitions: offline -> starting -> waiting -> running.
- Search and saved-view flows: apply/reset/selection parity.
- Export checks: PDF preview in both themes.
- Automation: full `npm run ci:verify` passes.
