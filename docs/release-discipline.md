# Release Discipline

This runbook defines the standard workflow for `commit and sync` requests and release-candidate pushes.

## Commit And Sync Workflow

Use this workflow whenever preparing a normal development push.

1. Inspect the intended batch.
   - Run `git status --short`.
   - Confirm every changed file belongs to the same behavioral batch.
2. Validate the touched surfaces first.
   - Run focused tests for the affected flow before broader verification.
   - If a change spans view/island code, controller wiring, state sync, and tests, keep it as one atomic validated batch unless intermediate commits are independently green.
   - If a batch touches dashboard rendering, export flows, visual harness hooks, or `js/appShell/testRuntime.js`, also run `npx playwright test tests/visual/dashboard.visual.spec.js` before push.
3. Run the full repo gate before push.
   - Run `npm run ci:verify`.
4. Re-check the worktree before push.
   - Run `git status --short` again and make sure no related files were left behind unintentionally.
5. Push and confirm the pushed SHA.
   - Push the branch.
   - Compare `git rev-parse HEAD origin/<branch>` (or equivalent) to confirm the remote ref actually advanced to the local commit.
   - Check GitHub Actions for the pushed SHA before treating the batch as fully done.

## UI And Token Change Addendum

Use these extra steps whenever a batch changes UI, layout, tokens, snapshots, or accessibility-relevant behavior.

1. Run `npm run test:visual`.
2. Run `npm run test:accessibility-smoke`.
3. If visual diffs are intentional:
   - Run `npm run test:visual:update`.
   - Review the updated snapshots.
   - Re-run `npm run test:visual`.
   - Re-run `npm run test:accessibility-smoke`.
4. Record a snapshot-review note in the tracker or release notes.

## Snapshot Review Note Format

Use this format when a batch intentionally updates visual baselines:

```md
- Snapshot review: intentional
- Surfaces: <affected sections/views>
- Reason: <layout/token/polish change>
- Verification: `npm run test:visual` + `npm run test:accessibility-smoke`
```

## Release Candidate Minimum Gates

For release candidates, treat all of the following as required:

1. `npm run test:visual`
2. `npm run test:accessibility-smoke`
3. `npm run check:perf-budgets`
4. `npm run check:release-reliability`
5. `npm run ci:verify`
6. Packaged-app smoke from `docs/release-smoke-checklist.md`

## Notes

- This runbook documents the current workflow; it does not add new automation or change app behavior.
- If the workflow changes in practice, update this document and the corresponding tracker notes in the same batch.
