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
  - [x] Three-step quick-start chips
  - [x] Single contextual CTA (`Open Relay Controls`)

## Next Delight Steps

- [ ] Tighten card rhythm polish:
  - [ ] Normalize header/action alignment across all card types
  - [ ] Audit vertical spacing consistency in section bodies
- [ ] Empty-state visual polish:
  - [ ] Add small iconography per quick-start step
  - [ ] Improve mobile stacking/spacing for CTA and chips
- [ ] Contextual microcopy refinement:
  - [ ] Ensure all relay status lines follow one tone model
  - [ ] Shorten verbose status strings for faster scanability
- [ ] Accessibility polish:
  - [ ] Contrast-check chips/badges in both themes
  - [ ] Verify reduced-motion behavior for all new animations

## Code Health Follow-ups

- [x] Remove unused vendor parser (`js/vendor/whatsapp-chat-parser.js`).
- [ ] Split high-complexity modules:
  - [ ] `js/savedViews.js`
  - [ ] `js/exportShared.js`
  - [ ] `js/analytics.js`
  - [ ] `apps/server/src/relay/relayManager.js`
- [ ] Trim visual artifact footprint where practical:
  - [ ] Keep critical coverage, avoid redundant near-duplicate snapshots
  - [ ] Revisit baseline granularity if CI time grows
