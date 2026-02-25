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

Run captured on February 25, 2026 (`generatedAt=2026-02-25T14:27:39.954Z`):

| Scenario | Iterations | Before writes | After writes | Reduction | Duration (ms) |
| --- | ---: | ---: | ---: | ---: | ---: |
| `upsertChatMeta` (blocking persist) | 1000 | 1000 | 1000 | 0% | 3329 |
| `upsertChatMeta` (batched persist) | 1000 | 1000 | 1 | 99.9% | 34 |
| `appendMessage` (default batched metadata path) | 400 | 400 | 14 | 96.5% | 523 |
| `appendMessage` (forced immediate metadata persist) | 400 | 400 | 400 | 0% | 746 |
| `upsertChatMeta` single-chat (batched incremental path) | 400 | 400 | 1 | 99.75% | 2 |

Interpretation:
- Blocking metadata persistence is the primary write amplification path and should be avoided in high-frequency loops.
- Default `appendMessage` now batches metadata writes and reduces metadata persistence events by ~96.5% versus immediate-per-message persistence.
- Entry-file writes (`saveEntries`) still dominate append-loop wall time, so metadata batching mainly protects write amplification and fs churn rather than total append latency.

## Search Worker Indexed Query Benchmark (Measured)

Run captured on February 24, 2026 (`generatedAt=2026-02-24T04:22:28.572Z`), dataset size `120000` messages:

| Metric | Duration (ms) | Notes |
| --- | ---: | --- |
| Index build | 263.78 | Indexed messages: 120000 |
| keyword (full scan) | 26.96 | matched=600 |
| keyword (indexed) | 1.55 | matched=600, speedup=17.39x |
| participant+keyword (full scan) | 8.00 | matched=3750 |
| participant+keyword (indexed) | 2.36 | matched=3750, speedup=3.39x |
| keyword+date-range (full scan) | 21.04 | matched=40001 |
| keyword+date-range (indexed) | 3.57 | matched=40001, speedup=5.89x |

Interpretation:
- Search now pays one index-build cost per dataset version, then queries run over indexed candidate sets instead of full message scans.
- Repeated keyword/participant/date-filter queries show material latency reductions with the indexed path.

## Next Improvements

- Add cached derived slices for frequently revisited ranges.
- Expand long-list virtualization to any future panel exceeding a few hundred rows.
- Add CI perf budget checks for regression detection on fixed-size synthetic datasets.
