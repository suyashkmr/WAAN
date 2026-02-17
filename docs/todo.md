# Visual + Psychological Delight Tasklist

Use this as the working backlog for the current visual sprint.

## Completed

- [x] Hero typography + spacing token pass on core hero/card surfaces.
- [x] Logo presentation refresh with fixed layout behavior (no slit collapse).
- [x] Footer cleanup: replace external link with project GitHub icon link.
- [x] Hero progress milestones (`Connect`, `Sync`, `Ready`) wired to relay state.
- [x] Relay confidence meta line (`syncing` pulse + `last updated` state).
- [x] One-shot ready celebration choreography (badge glow + milestone sweep).
- [x] Visual regression coverage expanded for relay states:
  - [x] `offline`
  - [x] `waiting_qr`
  - [x] `running_syncing`
  - [x] `running_ready`
- [x] Empty-state delight pass:
  - [x] Keep copy-led empty state with minimal visual noise
  - [x] Remove redundant quick-start chips and extra CTA
  - [x] Preserve mobile spacing polish after simplification

## Next Delight Steps

- [x] Tighten card rhythm polish:
  - [x] Normalize header/action alignment across all card types
  - [x] Audit vertical spacing consistency in section bodies
- [x] Empty-state visual polish:
  - [x] Simplify to a single clear instruction block
  - [x] Keep spacing and readability consistent on mobile
- [x] Contextual microcopy refinement:
  - [x] Ensure all relay status lines follow one tone model
  - [x] Shorten verbose status strings for faster scanability
- [x] Accessibility polish:
  - [x] Contrast-check chips/badges in both themes
  - [x] Verify reduced-motion behavior for all new animations

## Code Health Follow-ups

- [x] Remove unused vendor parser (`js/vendor/whatsapp-chat-parser.js`).
- [x] Split high-complexity modules:
  - [x] `js/savedViews.js`
  - [x] `js/exportShared.js`
  - [x] `js/analytics.js`
  - [x] `apps/server/src/relay/relayManager.js`
- [x] Trim visual artifact footprint where practical:
  - [x] Keep critical coverage, avoid redundant near-duplicate snapshots
  - [x] Revisit baseline granularity if CI time grows

## Next Engineering Steps

- [x] Modularity pass (priority order):
  - [x] Split `js/search.js` into query parsing, indexing, and result rendering modules.
  - [x] Split `js/exporters.js` into format-specific handlers and shared orchestration.
  - [x] Reduce `js/savedViews.js` further by moving compare rendering into a dedicated helper.
  - [x] Continue trimming `apps/server/src/relay/relayManager.js` by isolating contact refresh and lifecycle state transitions.
- [ ] Efficiency pass:
  - [ ] Add lightweight timing logs around search, export generation, and relay sync hot paths.
  - [ ] Profile dashboard render path on large datasets and cache repeated derived computations.
  - [ ] Review polling intervals and debounce points to prevent redundant work during active sync.
- [ ] Dead-code cleanup pass:
  - [ ] Run `npm run check:unused-exports` after each refactor slice and remove stale helpers immediately.
  - [ ] Audit runtime-only dormant branches (feature flags/fallbacks) and remove branches no longer used in current flow.
  - [ ] Consolidate duplicate utility logic discovered during module splits.
- [ ] Quality gates:
  - [ ] Keep `npm run lint`, `npm run test:smoke`, and targeted suites green for every slice.
  - [ ] Run `npm run test:visual` after UI-affecting changes; update baselines only for intentional diffs.

## Modularity Guardrail

- [ ] Defer additional broad modularity passes unless one of these triggers is met:
  - [ ] File exceeds ~350 lines and is actively changing.
  - [ ] Repeated merge conflicts occur in the same file across two consecutive PRs.
  - [ ] A bug fix requires touching more than one unrelated concern in the same module.
  - [ ] Change velocity slows due to unclear ownership/flow in a single file.

## Review + Release Readiness

- [ ] Stabilization window:
  - [ ] Keep feature churn paused while review comments are in progress.
  - [ ] Land only review-driven fixes until sign-off.
- [ ] Verification gates:
  - [x] Run `npm run ci:verify`.
  - [x] Run `npm run test:visual`.
  - [x] Execute `docs/release-smoke-checklist.md` end-to-end.
- [ ] Release handoff:
  - [ ] Prepare concise release notes (visual sprint, accessibility, modularity, visual baseline trim).
  - [ ] Confirm merge checklist and branch sync status before release cut.
