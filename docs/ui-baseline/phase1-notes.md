# Phase 1 Baseline Notes

Date: 2026-02-24  
Runtime: Browser (Playwright Chromium)  
Build/branch: `livemac` (`v1.2.0` baseline)

## Keyboard Traversal

- Scheme + width tested: `light` @ `1280`, `dark` @ `1280`
- Tab order summary (first 10 focus targets, same in both schemes):
  - `Home`
  - `Relay Status`
  - `Actions`
  - `Overview`
  - `Highlights`
  - `Participants`
  - `Hourly Activity`
  - `Day by Day`
  - `Week by Week`
  - `Day of Week`
- Focus visibility issues: none observed in automated run.
- Non-pointer operability notes: section-nav links and relay entry points are reachable via keyboard traversal.

## Relay Status Transition

- Scheme + width tested: `light` @ `1280`, `dark` @ `1280`
- Transition path exercised: `offline -> waiting_qr -> starting -> running`
- Copy/readability notes:
  - Hero badge/copy text updates correctly for each state.
  - Relay banner `data-status` updates for each state.
  - Running state shows connected messaging (`Connected • Alice`, `Relay connected.`).
- Overflow/clipping notes: none observed in captured baseline states.

## Accessibility Toggles

- Reduced motion check: baseline captures used `waan-reduce-motion=true` to remove animation variability.
- High contrast check: baseline captures used `waan-high-contrast=false` (standard contrast) for phase-1 baseline.

## Captured Artifacts

- Required matrix screenshots generated under `docs/ui-baseline/`:
  - `phase1-light-1280-{hero,section-nav,summary,relay-status}.png`
  - `phase1-dark-1280-{hero,section-nav,summary,relay-status}.png`
  - `phase1-light-390-{hero,section-nav,summary,relay-status}.png`
  - `phase1-dark-390-{hero,section-nav,summary,relay-status}.png`

## Risks / Follow-ups

- Add Electron-packaged baseline notes/screenshots when running the same matrix in packaged runtime.
