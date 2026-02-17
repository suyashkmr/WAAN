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
- [x] Efficiency pass:
  - [x] Add lightweight timing logs around search, export generation, and relay sync hot paths.
  - [x] Profile dashboard render path on large datasets and cache repeated derived computations.
  - [x] Review polling intervals and debounce points to prevent redundant work during active sync.
- [x] Dead-code cleanup pass:
  - [x] Run `npm run check:unused-exports` after each refactor slice and remove stale helpers immediately.
  - [x] Audit runtime-only dormant branches (feature flags/fallbacks) and remove branches no longer used in current flow.
  - [x] Consolidate duplicate utility logic discovered during module splits.
- [x] Quality gates:
  - [x] Keep `npm run lint`, `npm run test:smoke`, and targeted suites green for every slice.
  - [x] Run `npm run test:visual` after UI-affecting changes; update baselines only for intentional diffs.

## Modularity Guardrail

- [ ] Defer additional broad modularity passes unless one of these triggers is met:
  - [ ] File exceeds ~350 lines and is actively changing.
  - [ ] Repeated merge conflicts occur in the same file across two consecutive PRs.
  - [ ] A bug fix requires touching more than one unrelated concern in the same module.
  - [ ] Change velocity slows due to unclear ownership/flow in a single file.

## Review + Release Readiness

- [x] Stabilization window:
  - [x] Keep feature churn paused while review comments are in progress.
  - [x] Land only review-driven fixes until sign-off.
- [x] Verification gates:
  - [x] Run `npm run ci:verify`.
  - [x] Run `npm run test:visual`.
  - [x] Execute `docs/release-smoke-checklist.md` end-to-end.
- [x] Release handoff:
  - [x] Prepare concise release notes (visual sprint, accessibility, modularity, visual baseline trim).
  - [x] Confirm merge checklist and branch sync status before release cut.

## Next Sprint: Trust + Adoption

- [ ] Onboarding + activation:
  - [x] Add a first-run guided setup flow for relay link + first chat load.
  - [x] Add in-app install/run help for macOS Gatekeeper/unsigned app warnings.
- [ ] Reliability hardening:
  - [x] Strengthen relay reconnect/backoff behavior and recovery UX.
  - [x] Reduce transient status flicker and add stricter relay transition tests.
- [ ] Performance at scale:
  - [x] Stress-test large chats and document limits/bottlenecks.
  - [x] Add caching/virtualization for heaviest long-list panels where needed.
- [ ] Release operations:
  - [x] Set up signed + notarized macOS build pipeline.
  - [x] Automate version/tag/release flow so artifact names always match release tags.
- [ ] Product confidence:
  - [x] Add diagnostics/log bundle export for issue triage.
  - [x] Add a report-issue flow with prefilled runtime diagnostics.

## Final Modularity Closure

- [ ] Close recurring hotspot files with one final pass:
  - [x] `js/savedViews.js` (target: split orchestration from rendering/state helpers; keep file < ~320 lines).
  - [x] `js/search.js` (target: isolate worker client/cache-key/progress concerns; keep file < ~320 lines).
    - [x] Phase 1 extraction complete (`cacheKeys`, `progressUi`, `workerClient`, `formState`).
    - [x] Phase 2 extraction complete (`participantUi`, `resultsUi`) and controller reduced under target.
  - [x] `js/appShell.js` (target: reduce composition/bootstrap density via module extraction; keep file < ~320 lines).
  - [x] `apps/server/src/relay/relayManager.js` (target: isolate sync/state transitions further; keep file < ~320 lines).
  - [x] `js/analytics.js` (target: move compute/render boundary helpers into focused modules; keep file < ~320 lines).
- [ ] Guardrail enforcement:
  - [ ] Add/adjust tests for each extraction slice before merge.
  - [ ] Run `npm run ci:verify` after each hotspot slice.
