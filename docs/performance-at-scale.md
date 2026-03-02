# Performance At Scale

This runbook defines how to stress-test WAAN with large chat sizes and where bottlenecks typically appear.

## Quick Run

```bash
npm run perf:stress
```

Optional custom sizes:

```bash
npm run perf:stress -- --sizes=75000,150000,250000
```

Chat metadata write-amplification benchmark:

```bash
npm run perf:chatstore
```

Search worker index benchmark:

```bash
npm run perf:searchworker
```

## What It Measures

- Dataset fingerprint computation (`computeDatasetFingerprint`)
- Analytics computation (`computeAnalytics`)
- Linear search scan cost over normalized `search_text`
- Heap delta during the run

## Interpreting Results

- `Fingerprint` should stay very low and near-constant.
- `Analytics` is the dominant CPU path and scales roughly with message count.
- `Search scan` scales linearly with entry count.
- `Heap delta` should increase proportionally with generated message volume.

## Current Guardrails

- Participants panel already uses virtualization for long lists.
- Search result rendering now uses batched DOM append for large result sets.
- Poll highlights are intentionally capped to a small top subset.

## Known Bottlenecks

- Full analytics recomputation when loading very large chats.
- Search worker scan cost on broad filters over very large datasets.
- Any panel that renders many complex rows without virtualization.

## ChatStore Metadata Write Amplification (Measured)

Run captured on March 2, 2026 (`generatedAt=2026-03-02T13:03:59.012Z`):

| Scenario | Iterations | Before writes | After writes | Reduction | Duration (ms) |
| --- | ---: | ---: | ---: | ---: | ---: |
| `upsertChatMeta` (blocking persist) | 1000 | 1000 | 1000 | 0% | 760 |
| `upsertChatMeta` (batched persist) | 1000 | 1000 | 1 | 99.9% | 12 |
| `appendMessage` (default batched metadata path) | 400 | 400 | 1 | 99.75% | 93 |
| `appendMessage` (forced immediate metadata persist) | 400 | 400 | 400 | 0% | 132 |
| `upsertChatMeta` single-chat (batched incremental path) | 400 | 400 | 1 | 99.75% | 1 |

Interpretation:
- Blocking metadata persistence is the primary write amplification path and should be avoided in high-frequency loops.
- Default `appendMessage` now batches metadata writes and reduces metadata persistence events by ~99.75% versus immediate-per-message persistence.
- Entry-file writes (`saveEntries`) still dominate append-loop wall time, so metadata batching mainly protects write amplification and fs churn rather than total append latency.

## Search Worker Indexed Query Benchmark (Measured)

Run captured on March 2, 2026 (`generatedAt=2026-03-02T13:03:58.506Z`), dataset size `120000` messages:

| Metric | Duration (ms) | Notes |
| --- | ---: | --- |
| Index build | 337.44 | Indexed messages: 120000 |
| keyword (full scan) | 31.34 | matched=600 |
| keyword (indexed) | 2.45 | matched=600, speedup=12.79x |
| participant+keyword (full scan) | 7.97 | matched=3750 |
| participant+keyword (indexed) | 2.42 | matched=3750, speedup=3.29x |
| keyword+date-range (full scan) | 22.1 | matched=40001 |
| keyword+date-range (indexed) | 4.33 | matched=40001, speedup=5.1x |

Interpretation:
- Search now pays one index-build cost per dataset version, then queries run over indexed candidate sets instead of full message scans.
- Repeated keyword/participant/date-filter queries show material latency reductions with the indexed path.

## Release Perf Budgets (Enforced)

Run this gate on release candidates:

```bash
npm run check:perf-budgets
```

Current enforced thresholds (`scripts/check-perf-budgets.mjs`):

| Domain | Metric | Budget |
| --- | --- | --- |
| Search | Index build (120k dataset) | <= 700ms |
| Search | `keyword (indexed)` | <= 8ms |
| Search | `participant+keyword (indexed)` | <= 8ms |
| Search | `keyword+date-range (indexed)` | <= 12ms |
| Render proxy | `computeAnalytics` at 120k (`perf:stress`) | <= 1800ms |
| Sync/write proxy | `upsertChatMeta (batched persist)` duration | <= 80ms |
| Sync/write proxy | `appendMessage (default batched metadata path)` duration | <= 250ms |
| Sync/write proxy | `appendMessage (forced immediate metadata persist)` duration | <= 300ms |
| Sync/write proxy | Batched metadata write reduction | >= 99% |

If any threshold is exceeded, the gate fails and prints the offending metric(s).

## Next Improvements

- Owner: Engineering
- Baseline update cadence: per release and after any meaningful data-path change affecting chatstore persistence, indexing, filtering, or analytics.
- Add cached derived slices for frequently revisited ranges.
- Expand long-list virtualization to any future panel exceeding a few hundred rows.
- Keep tuning perf budgets and synthetic dataset sizes after each major data-path change.
