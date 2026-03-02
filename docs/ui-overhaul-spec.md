# UI Overhaul Spec: Community Catalyst Direction

## Goal

Reframe WAAN from a utility dashboard into a conversation command center that feels social, alive, and action-oriented.

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
