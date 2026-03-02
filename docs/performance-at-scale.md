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

Run captured on February 27, 2026 (`generatedAt=2026-02-27T08:55:58.200Z`):

| Scenario | Iterations | Before writes | After writes | Reduction | Duration (ms) |
| --- | ---: | ---: | ---: | ---: | ---: |
| `upsertChatMeta` (blocking persist) | 1000 | 1000 | 1000 | 0% | 837 |
| `upsertChatMeta` (batched persist) | 1000 | 1000 | 1 | 99.9% | 12 |
| `appendMessage` (default batched metadata path) | 400 | 400 | 1 | 99.75% | 102 |
| `appendMessage` (forced immediate metadata persist) | 400 | 400 | 400 | 0% | 132 |
| `upsertChatMeta` single-chat (batched incremental path) | 400 | 400 | 1 | 99.75% | 2 |

Interpretation:
- Blocking metadata persistence is the primary write amplification path and should be avoided in high-frequency loops.
- Default `appendMessage` now batches metadata writes and reduces metadata persistence events by ~99.75% versus immediate-per-message persistence.
- Entry-file writes (`saveEntries`) still dominate append-loop wall time, so metadata batching mainly protects write amplification and fs churn rather than total append latency.

## Search Worker Indexed Query Benchmark (Measured)

Run captured on February 27, 2026 (`generatedAt=2026-02-27T08:55:57.734Z`), dataset size `120000` messages:

| Metric | Duration (ms) | Notes |
| --- | ---: | --- |
| Index build | 348.23 | Indexed messages: 120000 |
| keyword (full scan) | 127.81 | matched=600 |
| keyword (indexed) | 2.47 | matched=600, speedup=51.74x |
| participant+keyword (full scan) | 8.37 | matched=3750 |
| participant+keyword (indexed) | 2.79 | matched=3750, speedup=3x |
| keyword+date-range (full scan) | 22.75 | matched=40001 |
| keyword+date-range (indexed) | 4.49 | matched=40001, speedup=5.07x |

Interpretation:
- Search now pays one index-build cost per dataset version, then queries run over indexed candidate sets instead of full message scans.
- Repeated keyword/participant/date-filter queries show material latency reductions with the indexed path.

## Next Improvements

- Owner: Engineering
- Baseline update cadence: per release and after any meaningful data-path change affecting chatstore persistence, indexing, filtering, or analytics.
- Add cached derived slices for frequently revisited ranges.
- Expand long-list virtualization to any future panel exceeding a few hundred rows.
- Add CI perf budget checks for regression detection on fixed-size synthetic datasets.
