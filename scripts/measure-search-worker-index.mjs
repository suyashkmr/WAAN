import { performance } from "node:perf_hooks";
import { createDatasetIndexCache, ensureIndexedDataset } from "../js/search/workerIndex.js";

function buildEntry(index) {
  const sender = `User ${index % 32}`;
  return {
    type: "message",
    timestamp: new Date(1_700_000_000_000 + index * 60000).toISOString(),
    sender,
    message: `launch plan update ${index} token-${index % 200}`,
    search_text: `launch plan update ${index} token-${index % 200}`,
    message_id: `m-${index}`,
  };
}

function buildDataset(size) {
  return Array.from({ length: size }, (_, index) => buildEntry(index));
}

function runFullScan(entries, { text = "", participant = "", startMs = null, endMs = null }) {
  const tokens = String(text || "")
    .toLowerCase()
    .split(/\s+/)
    .map(token => token.trim())
    .filter(Boolean);
  const participantLower = String(participant || "").toLowerCase();
  let matched = 0;
  for (const entry of entries) {
    if (!entry || entry.type !== "message") continue;
    if (participantLower && String(entry.sender || "").toLowerCase() !== participantLower) continue;
    const tsMs = Number(new Date(entry.timestamp).getTime());
    if (!tsMs || Number.isNaN(tsMs)) continue;
    if (startMs !== null && tsMs < startMs) continue;
    if (endMs !== null && tsMs > endMs) continue;
    const searchText = String(entry.search_text || entry.message || "").toLowerCase();
    if (tokens.length && !tokens.every(token => searchText.includes(token))) continue;
    matched += 1;
  }
  return matched;
}

function intersectSorted(left, right) {
  const result = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    const a = left[i];
    const b = right[j];
    if (a === b) {
      result.push(a);
      i += 1;
      j += 1;
      continue;
    }
    if (a < b) i += 1;
    else j += 1;
  }
  return result;
}

function runIndexedScan(cache, { text = "", participant = "", startMs = null, endMs = null }) {
  const tokens = String(text || "")
    .toLowerCase()
    .split(/\s+/)
    .map(token => token.trim())
    .filter(Boolean);
  const tokenLists = tokens
    .map(token => cache.tokenIndex.get(token) || [])
    .sort((a, b) => a.length - b.length);
  if (tokenLists.some(list => !list.length)) return 0;
  const participantLower = String(participant || "").toLowerCase();
  let candidates = null;
  if (tokenLists.length) {
    candidates = tokenLists[0];
    for (let i = 1; i < tokenLists.length; i += 1) {
      candidates = intersectSorted(candidates, tokenLists[i]);
      if (!candidates.length) return 0;
    }
  }
  if (participantLower) {
    const participantList = cache.participantIndex.get(participantLower) || [];
    if (!participantList.length) return 0;
    candidates = candidates ? intersectSorted(candidates, participantList) : participantList;
  }
  if (!candidates) {
    candidates = cache.messageRecords.map((_, index) => index);
  }

  let matched = 0;
  for (const candidate of candidates) {
    const record = cache.messageRecords[candidate];
    if (!record) continue;
    if (startMs !== null && record.tsMs < startMs) continue;
    if (endMs !== null && record.tsMs > endMs) continue;
    matched += 1;
  }
  return matched;
}

function benchmark(label, task) {
  const started = performance.now();
  const matched = task();
  const finished = performance.now();
  return {
    label,
    matched,
    durationMs: Number((finished - started).toFixed(2)),
  };
}

function main() {
  const entries = buildDataset(120_000);
  const datasetFingerprint = `${entries.length}:${entries[0].timestamp}:${entries[entries.length - 1].timestamp}`;
  const cache = createDatasetIndexCache();

  const indexBench = benchmark("index_build", () => {
    const result = ensureIndexedDataset(cache, { entries, datasetFingerprint });
    return result.indexedMessages;
  });

  const rangeStart = Number(new Date(entries[20_000].timestamp).getTime());
  const rangeEnd = Number(new Date(entries[60_000].timestamp).getTime());
  const queries = [
    { label: "keyword", query: { text: "launch token-42" } },
    { label: "participant+keyword", query: { text: "plan", participant: "User 7" } },
    { label: "keyword+date-range", query: { text: "update", startMs: rangeStart, endMs: rangeEnd } },
  ];

  const benches = [];
  for (const item of queries) {
    const full = benchmark(`${item.label}:full_scan`, () => runFullScan(entries, item.query));
    const indexed = benchmark(`${item.label}:indexed`, () => runIndexedScan(cache, item.query));
    benches.push({ ...item, full, indexed });
  }

  console.log("# Search worker indexed benchmark");
  console.log(`generatedAt=${new Date().toISOString()}`);
  console.log(`datasetMessages=${entries.length}`);
  console.log("");
  console.log("| Metric | Duration (ms) | Notes |");
  console.log("| --- | ---: | --- |");
  console.log(`| Index build | ${indexBench.durationMs} | Indexed messages: ${indexBench.matched} |`);
  benches.forEach(item => {
    const speedup = item.indexed.durationMs > 0
      ? Number((item.full.durationMs / item.indexed.durationMs).toFixed(2))
      : "n/a";
    console.log(`| ${item.label} (full scan) | ${item.full.durationMs} | matched=${item.full.matched} |`);
    console.log(`| ${item.label} (indexed) | ${item.indexed.durationMs} | matched=${item.indexed.matched}, speedup=${speedup}x |`);
  });
}

main();
