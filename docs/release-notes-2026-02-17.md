# WAAN Release Notes (2026-02-17)

## Highlights

- Delivered the visual sprint across hero, cards, spacing rhythm, and relay state storytelling.
- Improved accessibility and motion behavior, including reduced-motion handling and contrast fixes.
- Completed modularity and efficiency passes in core app/relay paths.
- Stabilized and refreshed visual regression baselines across desktop, laptop, tablet, and mobile snapshots.

## User-Facing Improvements

- Refined hero layout, typography, and relay milestones (`Connect`, `Sync`, `Ready`).
- Improved status clarity with better microcopy and confidence metadata.
- Simplified empty states to reduce noise and improve first-run guidance.
- Updated footer link treatment and README usage/data-point documentation.
- Added acknowledgment for `whatsapp-web.js` and its maintainer.

## Engineering Improvements

- Modularized high-complexity modules (search, exporters, saved views, relay manager-related slices).
- Added lightweight performance instrumentation for:
  - search execution
  - export generation
  - relay sync/status refresh paths
  - dashboard render sections
- Removed stale/dead wiring and consolidated duplicated perf helper logic.
- Improved relay status polling behavior to avoid redundant in-flight status requests.

## Quality + Verification

- `npm run ci:verify`: PASS
- `npm run test:visual`: PASS (after baseline update for intentional UI changes)
- `docs/release-smoke-checklist.md`: PASS (latest sign-off on 2026-02-17)

## Branch Context (Historical Snapshot)

This note captures repository state observed on **2026-02-17** only.
Branch divergence counts and ahead/behind values change over time and are not
maintained in this document.

- Working branch during this release pass: `livemac`
- Recommendation at that time: merge `livemac` -> `main` after final commit and PR review.

For current branch readiness, use live git status instead of this file:

```bash
git fetch origin --prune
git status -sb
git rev-list --left-right --count origin/main...HEAD
```
