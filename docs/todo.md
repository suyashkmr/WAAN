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
- [ ] Execute the new UI overhaul plan in `docs/ui-overhaul-spec.md`.

## Next Wave: Community Catalyst UI Overhaul

- [x] Phase 1: Foundation (tokens, typography, shell baseline)
  - [x] Add/normalize typography and semantic tokens in `styles.base.css`.
  - [x] Map token roles and type scale in `tailwind.config.cjs`.
  - [x] Update `styles/components/app-shell.css` and `styles/components/navigation.css` for pulse/navigation baseline.
    - [x] Added runtime decoration for actions toolbar pulse styling (`js/ui/appShellPrimitives.js`).
    - [x] Verified automated checks with full `npm run ci:verify`.
  - [x] Verify light/dark + reduced-motion parity on shell/nav surfaces.
- [ ] Phase 2: Hero + Relay Story Lane
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
  - [ ] Manually verify relay states (`offline -> starting -> waiting -> running`) on desktop + mobile.
- [ ] Phase 3: Search + Saved Views Command Surface
  - [ ] Refine command-style controls and playbook-card patterns in `styles/components/search-saved.css`.
  - [ ] Validate Shoelace proxy parity for programmatic value/state updates.
  - [ ] Verify search/saved-view keyboard flow, focus order, and tooltip/label parity.
- [ ] Phase 4: Analytics Deep Dive Readability
  - [ ] Finalize hierarchy language in analytics cards/charts/tables.
  - [ ] Ensure dense data views remain readable at 1024/768/390 breakpoints.
  - [ ] Confirm truncation/sticky headers/hover-focus behavior remain consistent.
- [ ] Phase 5: Export + Final Validation
  - [ ] Ensure PDF export theme parity and readability for light/dark.
  - [ ] Capture updated screenshots for hero/nav/summary/relay/search-saved/analytics (desktop + mobile, light + dark).
  - [ ] Run full `npm run ci:verify` and targeted visual checks before closure.

## Process Guardrail

- [ ] If a trigger occurs, open a focused refactor task per `docs/engineering-guardrails.md`.
