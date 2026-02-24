# UI Phase 1 Baseline Capture

Use this sheet before Tailwind/shadcn migration work starts. Capture current behavior for regression comparison.

## Surfaces In Scope

- `#hero-panel`
- `.section-nav`
- `#summary` cards
- `#relay-status-banner` + primary relay controls

## Capture Matrix

Take screenshots for each row:

| Scheme | Width | Required screenshots |
| --- | --- | --- |
| Light | 1280 | hero, section-nav, summary, relay-status |
| Dark | 1280 | hero, section-nav, summary, relay-status |
| Light | 390 | hero, section-nav, summary, relay-status |
| Dark | 390 | hero, section-nav, summary, relay-status |

Optional (recommended) additional rows:

| Scheme | Width | Required screenshots |
| --- | --- | --- |
| Light | 1024 | hero, section-nav, summary, relay-status |
| Dark | 1024 | hero, section-nav, summary, relay-status |
| Light | 768 | hero, section-nav, summary, relay-status |
| Dark | 768 | hero, section-nav, summary, relay-status |

## Naming Convention

Store screenshots under `docs/ui-baseline/` using:

`phase1-<scheme>-<width>-<surface>.png`

Examples:

- `phase1-light-1280-hero.png`
- `phase1-dark-390-relay-status.png`

## Interaction Notes Template

Create/update `docs/ui-baseline/phase1-notes.md` with this template:

```md
# Phase 1 Baseline Notes

Date:
Runtime: (Browser / Electron packaged app)
Build/branch:

## Keyboard Traversal

- Scheme + width tested:
- Tab order summary:
- Focus visibility issues:
- Non-pointer operability notes:

## Relay Status Transition

- Scheme + width tested:
- Transition path exercised: (Not connected -> waiting_qr -> starting -> running)
- Copy/readability notes:
- Overflow/clipping notes:

## Accessibility Toggles

- Reduced motion check:
- High contrast check:

## Risks / Follow-ups

- Item 1
```

## Completion Rule

Do not mark baseline capture complete until:

- All required matrix screenshots exist.
- Notes file is filled with at least one keyboard traversal record and one relay transition record per scheme.
