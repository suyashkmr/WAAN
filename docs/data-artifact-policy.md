# Data Artifact Policy

## Goal
- Keep source control clean and reproducible.
- Avoid committing runtime chat data, analytics dumps, and backup bundles.

## Allowed In Git
- Small sample fixtures only:
  - `chat.sample.json`
  - `analytics.sample.json`

## Not Allowed In Git
- Runtime datasets and exports, including:
  - `chat.json`
  - `analytics.json`
  - compressed variants like `chat.json.gz` / `analytics.json.gz`
  - backup archives like `waan-data-backup-*.tgz`
  - archive payloads under `_IGNORE_waan/archive/`

## Storage Guidance
- Keep runtime or backup data in ignored paths only (`_IGNORE_waan/` or external storage).
- Do not move real datasets into tracked project paths.

## Enforcement
- CI runs `npm run check:artifacts`.
- The check fails if forbidden runtime artifacts are tracked.
