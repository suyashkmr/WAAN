# Documentation Guide

This directory contains a mix of current operational docs and preserved historical records. Do not assume every file here is an active source of truth.

## Current Authoritative Docs

Use these first when you need the current repo contract:

- [tasks.md](/Users/suyash/Antigravity/WAAN/docs/tasks.md)
  - Active backlog, completed audit truth, and current repair buckets.
- [feature-map.md](/Users/suyash/Antigravity/WAAN/docs/feature-map.md)
  - Current runtime/module map and the most relevant active test coverage.
- [release-discipline.md](/Users/suyash/Antigravity/WAAN/docs/release-discipline.md)
  - Required `commit and sync` workflow and verification steps.
- [release-smoke-checklist.md](/Users/suyash/Antigravity/WAAN/docs/release-smoke-checklist.md)
  - Current packaged-release smoke flow and required release gates.
- [app-shell-architecture.md](/Users/suyash/Antigravity/WAAN/docs/app-shell-architecture.md)
  - App-shell structure and composition notes.
- [relay-architecture.md](/Users/suyash/Antigravity/WAAN/docs/relay-architecture.md)
  - Relay/service architecture notes.
- [relay-troubleshooting.md](/Users/suyash/Antigravity/WAAN/docs/relay-troubleshooting.md)
  - Current relay recovery/troubleshooting runbook.

## Historical / Reference Docs

These files are useful context, but they are not the primary current source of truth for active work:

- [ui-overhaul-spec.md](/Users/suyash/Antigravity/WAAN/docs/ui-overhaul-spec.md)
  - Historical phase log and visual-program rationale.
- `docs/release-notes/**`
  - Versioned release history.
- `docs/ui-baseline/**`
  - Baseline captures and early visual notes.
- [ui-phase1-baseline-capture.md](/Users/suyash/Antigravity/WAAN/docs/ui-phase1-baseline-capture.md)
  - Early capture-era documentation.
- [release-notes-2026-02-17.md](/Users/suyash/Antigravity/WAAN/docs/release-notes-2026-02-17.md)
  - Historical point-in-time note.

## Rules

- If current behavior disagrees with a historical doc, trust code plus the current authoritative docs above.
- If a workflow changes in practice, update the authoritative doc in the same batch as the code.
- If a historical file is kept only for archive value, label it clearly instead of silently letting it look current.
