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

- [ ] Tighten card rhythm polish:
  - [x] Normalize header/action alignment across all card types
  - [x] Audit vertical spacing consistency in section bodies
- [ ] Empty-state visual polish:
  - [x] Simplify to a single clear instruction block
  - [x] Keep spacing and readability consistent on mobile
- [ ] Contextual microcopy refinement:
  - [x] Ensure all relay status lines follow one tone model
  - [x] Shorten verbose status strings for faster scanability
- [ ] Accessibility polish:
  - [x] Contrast-check chips/badges in both themes
  - [x] Verify reduced-motion behavior for all new animations

## Code Health Follow-ups

- [x] Remove unused vendor parser (`js/vendor/whatsapp-chat-parser.js`).
- [ ] Split high-complexity modules:
  - [x] `js/savedViews.js`
  - [x] `js/exportShared.js`
  - [x] `js/analytics.js`
  - [x] `apps/server/src/relay/relayManager.js`
- [ ] Trim visual artifact footprint where practical:
  - [x] Keep critical coverage, avoid redundant near-duplicate snapshots
  - [x] Revisit baseline granularity if CI time grows
