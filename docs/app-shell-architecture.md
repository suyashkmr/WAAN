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
- CI workflow: `.github/workflows/ci.yml`
  - Runs `npm ci`, `npm run verify`, `npm run check:circular`.
