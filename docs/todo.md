# Active Todo

Completed tasks were removed for clarity (history remains in git).

## Immediate Next Tasks

- [ ] Split `js/exporters/createExporters.js` below the module-size guardrail and remove it from the temporary allowlist.
- [ ] Split `js/analytics/summary.js` below the module-size guardrail and remove it from the temporary allowlist.

## Modularity Guardrail Triggers (Process)

- [ ] Repeated merge conflicts occur in the same file across two consecutive PRs.
- [ ] A bug fix requires touching more than one unrelated concern in the same module.
- [ ] Change velocity slows due to unclear ownership/flow in a single file.

## Guardrail Follow-up

- [ ] Remove temporary module-size allowlist entries by splitting:
  - [ ] `js/exporters/createExporters.js`
  - [ ] `js/analytics/summary.js`
