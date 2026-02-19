# Engineering Guardrails

Use this document to decide when a modularity refactor is required versus when
to keep shipping feature work.

## PR Checklist

For every PR, answer these:

- Did this PR hit merge conflicts in the same file as the previous PR?
- Did this bug fix require edits across unrelated concerns in one module?
- Did implementation slow down because ownership/flow in one file is unclear?

If all are **No**, avoid broad modularity work in that PR.

## Trigger Rules

Open a focused refactor task only when one of these happens:

1. Repeated merge conflicts in the same file across two consecutive PRs.
2. A bug fix touches more than one unrelated concern in a single module.
3. Delivery slows due to unclear ownership/flow in one module.

## What To Do When Triggered

1. Add a task in `docs/todo.md` with the specific file and reason.
2. Keep scope narrow: split only the hotspot module/concern involved.
3. Add/adjust tests for the extracted behavior before merge.
4. Run `npm run ci:verify`.
5. If file size is a concern, run `npm run check:module-size`.

## Evidence To Record In PR

- File(s) impacted.
- Which trigger fired.
- What was extracted/moved.
- Verification run (`ci:verify`, targeted tests, or both).

## Current Status

As of now, there are no active modularity hotspot refactors pending.  
Continue with feature/reliability work unless a trigger above occurs.
