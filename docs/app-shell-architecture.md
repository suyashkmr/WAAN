# App Shell Architecture

`js/appShell.js` is the top-level orchestrator for the dashboard UI. It composes modules, wires dependencies, and starts app bootstrap.

## Runtime Composition Modules

- `js/appShell/domRefs.js`
  - Centralized DOM/query registry (`createAppDomRefs`).
- `js/appShell/bootstrapApp.js`
  - Startup wiring for status callbacks, event bindings, keyboard shortcuts, and `DOMContentLoaded` bootstrap.
- `js/appShell/adapters.js`
  - Shared stateful adapters, currently analytics request token tracking.
- `js/appShell/exportRuntime.js`
  - Export summary + exporter + PDF runtime composition.
- `js/appShell/relayRuntime.js`
  - Relay controller + relay bootstrap runtime composition.
- `js/appShell/compositionRuntime.js`
  - Dashboard render composition and dataset lifecycle composition.
- `js/appShell/constants.js`
  - App-shell-only constants and tiny global initializers.

## Data Policy

Runtime data is local-only and should not be committed:

- `chat.json`
- `analytics.json`

Committed fixtures are intentionally small:

- `chat.sample.json`
- `analytics.sample.json`

Generated/backup artifacts stay ignored (examples: `*.tgz`, `*.tar.gz`, `apps_prev_*`, `chat.json.gz`, `coverage/`, `__pycache__/`).

## Guardrails

- Local verify: `npm run ci:verify`
  - Runs lint + tests + circular dependency check.
- Local smoke: `npm run test:smoke`
  - Runs fast boundary/bootstrap checks before full test suite.
- CI workflow: `.github/workflows/ci.yml`
  - Runs artifact + unused-export checks, smoke tests, full verify, then circular check.

## Maintainer Checklist

When adding a new app-shell controller/module:

1. Add the module under `js/appShell/` with a focused responsibility.
2. Wire it through the correct composition layer:
   - controller construction: `js/appShell/controllerWiring/*`
   - runtime assembly: `js/appShell/compositionAssembly.js`
   - startup/bootstrap: `js/appShell/runtimeBootstrap.js` or `js/appShell/runtimeConfig.js`
3. Keep `js/appShell.js` orchestration-only; avoid embedding long controller internals there.
4. If new DOM nodes are required, register them in `js/appShell/domRefs.js` and group them in `js/appShell/domRefGroups.js`.
5. Add/adjust tests:
   - boundary contract tests (`tests/*Contracts.test.js`) for new wiring surface
   - smoke coverage if startup behavior changes (`tests/appShellBoundaryIntegration.test.js` / `tests/appShellBoot.test.js`)
6. Run guardrails before merging:
   - `npm run check:artifacts`
   - `npm run check:unused-exports`
   - `npm run test:smoke`
   - `npm run verify`
   - `npm run check:circular`
