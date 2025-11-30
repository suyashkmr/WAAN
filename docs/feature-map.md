## Feature Map

| Module | Purpose / Key Responsibilities | Current Usage & Notes |
| --- | --- | --- |
| `js/appShell.js` | App entry point: loads datasets, wires DOM events, initializes analytics renderers, relay controller, exporters, search, saved views. | Active; snapshot sharing + duplicate participant detail removed. Remaining lint warnings now focused on real TODOs (hero pills, config hooks). Coverage 0% → consider integration tests. |
| `js/relayControls.js` | Manages relay start/stop/logout, status polling, log streaming, sync progress UI. | Active. Log drawer now renders directly (virtual list removed). Still need coverage for refresh/poll flows. |
| `js/analytics.js` | Parses chat entries (`parseChatText`), computes analytics (sentiment, message types, highlights). | Active, partially covered by tests. System-entry helper cleanup in progress; remaining warnings highlight legacy classifications. |
| `js/analytics/activity.js`, `summary.js`, `sentiment.js`, `messageTypes.js`, `polls.js` | Render analytics cards (hourly, daily, participants, sentiment, polls). | Active renderers invoked from `appShell`. No lint complaints, but currently lack test coverage. |
| `js/state.js` | Global store for dataset entries, analytics, search state, hourly/weekday filters, saved views. | Active; unit tests cover core helpers. |
| `js/search.js` + `js/searchWorker.js` | Advanced search UI and worker-based filtering/highlighting. | Active. Worker has 0% coverage; lint now limited to intentional TODOs (result limits). |
| `js/exporters.js`, `js/exportShared.js`, `js/exportWorker.js` | CSV/text/slides/PDF export logic and workers. | Active with shared helpers only; worker handles Markdown/Slides/PDF to keep UI responsive. |
| `js/config.js`, `js/theme.js`, `js/ui.js`, `js/utils.js`, `js/constants.js` | Config/env vars, theme toggles, UI utilities, general helpers/constants. | Active. `constants.js` covered; others have no automated tests yet. |
| `js/vendor/whatsapp-chat-parser.js` | Third-party WhatsApp text parser. | Used by `analytics.js`. Ignored via ESLint `ignores` block (treated as vendored). |
| `js/main.js` | Entry script for the web/Electron bundle. | Active but minimal. |
| `js/savedViews.js` | Saved views CRUD and comparison helpers. | Active (used by `appShell`), but lacks coverage/tests. |

**Next steps**
- Finish pruning analytics/appShell helpers flagged by lint, or add usage.
- Expand test coverage beyond analytics/state to cover UI/exports/relay modules.
