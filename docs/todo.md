# Active Todo

Completed work is archived in git history and was removed from this file for clarity.

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

- [x] All previously tracked implementation tasks are complete.
- [x] Execute the new UI overhaul plan in `docs/ui-overhaul-spec.md`.

## Next Wave: Dark Depth + Background Elegance

- [x] Phase 6: Dark Mode Depth Pass
  - [x] Increase dark-mode surface separation and elevation hierarchy.
    - [x] Tuned dark tokens for shell/card contrast and edge highlights (`styles.base.css`).
    - [x] Strengthened dark-only card/hero shadow stack and specular treatment (`styles.components.css`, `styles.base.css`).
  - [x] Improve tactile depth on interactive controls in dark mode.
    - [x] Tuned dark hover/pressed/focus layering for action buttons, segmented toggles, toolbar controls, and collapse toggles (`styles.components.css`).
  - [x] Verify parity at desktop + mobile widths in dark mode.
    - [x] Run `npm run ci:verify`.
    - [x] Ran `npm run test:visual:update` and `npm run test:visual` after intentional baseline shifts.
- [x] Phase 7: Background Elegance Pass
  - [x] Replace flat-feeling shell backdrop with a more elegant multi-layer atmospheric background.
    - [x] Added subtle directional depth layers (ridge + atmospheric pools + tertiary floor glow) (`styles.base.css`).
    - [x] Kept motion minimal and reduced-motion safe (ambient motion unchanged and reduced-motion guard retained).
  - [x] Validate readability and contrast against all major panel surfaces.
    - [x] Manual scan complete for hero, relay, saved views, search, and analytics sections.

## Next Wave: Community Catalyst UI Overhaul

- [x] Phase 1: Foundation (tokens, typography, shell baseline)
  - [x] Add/normalize typography and semantic tokens in `styles.base.css`.
  - [x] Map token roles and type scale in `tailwind.config.cjs`.
  - [x] Update `styles/components/app-shell.css` and `styles/components/navigation.css` for pulse/navigation baseline.
    - [x] Added runtime decoration for actions toolbar pulse styling (`js/ui/appShellPrimitives.js`).
    - [x] Verified automated checks with full `npm run ci:verify`.
  - [x] Verify light/dark + reduced-motion parity on shell/nav surfaces.
- [x] Phase 2: Hero + Relay Story Lane
  - [x] Implement story-lane structure and pulse bar wiring in `index.html` + runtime normalization.
    - [x] Added explicit story-lane/action-lane structural classes in hero + relay markup (`index.html`).
    - [x] Added runtime normalization hooks for new phase-2 classes (`js/ui/appShellPrimitives.js`).
    - [x] Applied shared phase-2 shell helpers (`styles/components/app-shell.css`) and story-lane visual affordances (`styles.components.css`).
    - [x] Verified automated checks with full `npm run ci:verify`.
  - [x] Apply new relay status/action visual language in `styles/components/relay.css`.
    - [x] Added consistency pass for shared shell/button/control chrome across hero/toolbar/control surfaces (`styles.components.css`, `styles/components/app-shell.css`).
    - [x] Restyled relay story modules (status banner, onboarding steps, step states) to match unified visual system (`styles/components/relay.css`).
    - [x] Verified automated checks with full `npm run ci:verify`.
    - [x] Added explicit visual state treatment for `starting`/`offline`/`unknown` relay banner states with reduced-motion parity (`styles/components/relay.css`).
    - [x] Added transition mapping tests for relay banner + onboarding status lifecycle (`tests/relayStatusView.test.js`).
    - [x] Verified automated checks with full `npm run ci:verify`.
  - [x] Ensure relay state transitions remain functionally accurate and visually distinct.
  - [x] Manually verify relay states (`offline -> starting -> waiting -> running`) on desktop + mobile.
- [x] Phase 3: Search + Saved Views Command Surface
  - [x] Refine command-style controls and playbook-card patterns in `styles/components/search-saved.css`.
    - [x] Normalized saved-view and search panels to a shared command-surface control geometry (input/select/button height + radius).
    - [x] Reworked desktop action grids for saved-view save/manage and compare controls to keep consistent alignment.
    - [x] Reworked search control grid/action row rhythm for cleaner cross-panel spacing and hierarchy.
    - [x] Verified automated checks with full `npm run ci:verify`.
  - [x] Validate Shoelace proxy parity for programmatic value/state updates.
    - [x] Confirmed proxy sync for programmatic input/select value updates and option list updates.
    - [x] Added parity coverage for programmatic `disabled/title/aria` updates and `selectedIndex`-driven changes (`tests/uiFieldsShoelaceMigration.test.js`).
    - [x] Verified automated checks with full `npm run ci:verify`.
  - [x] Verify search/saved-view keyboard flow, focus order, and tooltip/label parity.
    - [x] Added regression coverage for Shoelace control proxy action order and ARIA/title/disabled mirroring (`tests/uiControlsShoelaceMigration.test.js`).
    - [x] Added regression coverage for Shoelace field proxy parity on programmatic updates (`tests/uiFieldsShoelaceMigration.test.js`).
    - [x] Fixed highlight info tooltip rendering for dynamic cards and added DOM assertion coverage (`js/appShell/dashboardRender/highlightsStats.js`, `tests/dashboardRenderModules.test.js`).
    - [x] Verified automated checks with full `npm run ci:verify`.
    - [x] Manual keyboard walkthrough complete: tab order, Enter/Space activation, focus-visible treatment, and tooltip visibility in Search + Saved Views flows.
  - [x] End-of-phase cross-section consistency sweep (shared with Search + Saved Views):
    - [x] Normalize residual control-system drift (native vs Shoelace-proxy focus/disabled/height states).
    - [x] Standardize section header composition rhythm (`title + subtitle + info + actions`) where still divergent.
    - [x] Harmonize empty-state/callout spacing + type hierarchy across command panels.
    - [x] Tune accent/gradient intensity parity between neighboring cards.
    - [x] Verified automated checks with full `npm run ci:verify`.
- [x] Phase 4: Analytics Deep Dive Readability
  - [x] Finalize hierarchy language in analytics cards/charts/tables.
    - [x] Standardized analytics summary label/value hierarchy for hourly/daily/weekly cards.
    - [x] Tightened participants/message-types table heading/body hierarchy for readability.
    - [x] Harmonized analytics helper-note hierarchy (`brush-summary`, `hourly-filter-note`, `weekday-filter-note`).
    - [x] Verified automated checks with full `npm run ci:verify`.
  - [x] Ensure dense data views remain readable at 1024/768/390 breakpoints.
    - [x] Tuned analytics chart/table responsive behavior for 1024/768/390 widths (`styles/components/analytics.css`, `styles/components/analytics-charts.css`, `styles.components.css`).
    - [x] Adjusted scroll heights and card/table density for mid-width readability while keeping mobile stack behavior intact.
    - [x] Verified automated checks with full `npm run ci:verify`.
  - [x] Confirm truncation/sticky headers/hover-focus behavior remain consistent.
    - [x] Added consistent truncation safeguards for dense analytics table headings/cells (`styles.components.css`).
    - [x] Aligned sticky-header layering/blur treatment for analytics table + heatmap header surfaces (`styles.components.css`, `styles/components/analytics-charts.css`).
    - [x] Added focus-visible parity for interactive calendar/heatmap cells to match hover behavior (`styles/components/analytics-charts.css`).
    - [x] Verified automated checks with full `npm run ci:verify`.
- [x] Phase 5: Export + Final Validation
  - [x] Ensure PDF export theme parity and readability for light/dark.
    - [x] Hardened PDF theme scheme resolution to respect export theme identity (`theme.id`) in addition to legacy dark flag (`js/exportDeck/css.js`, `js/exportShared.js`).
    - [x] Added PDF HTML metadata for explicit print theme context (`data-export-theme`, `meta[name=\"color-scheme\"]`) to reduce renderer ambiguity (`js/exportShared.js`).
    - [x] Added regression coverage for dark/light PDF theme stamping and print color-scheme behavior (`tests/exportShared.test.js`, `tests/exportDeckCss.test.js`).
    - [x] Verified automated checks with full `npm run ci:verify`.
    - [x] Manual verification complete: exported PDF from both light and dark UI themes and confirmed parity/readability in print preview + saved PDF.
  - [x] Capture updated screenshots for hero/nav/summary/relay/search-saved/analytics (desktop + mobile, light + dark).
    - [x] Added repeatable capture script for Phase 5 matrix (`scripts/capture-ui-phase5-overhaul.mjs`).
    - [x] Captured 28 screenshots across light/dark at 1280 + 390 for hero/nav/summary/relay/saved-views/search/analytics.
    - [x] Stored artifacts in `docs/ui-overhaul-captures/phase5/`.
  - [x] Run full `npm run ci:verify` and targeted visual checks before closure.
    - [x] Full `npm run ci:verify` passes.
    - [x] Ran targeted visual suite via `npm run test:visual`.
    - [x] Resolved visual baseline mismatches by updating snapshots and re-running visual suite (`npm run test:visual:update`, `npm run test:visual`).

## Process Guardrail

- [ ] If a trigger occurs, open a focused refactor task per `docs/engineering-guardrails.md`.
