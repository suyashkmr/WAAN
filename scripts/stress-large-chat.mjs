#!/usr/bin/env node

import { performance } from "node:perf_hooks";
import { computeAnalytics } from "../js/analytics.js";
import { computeDatasetFingerprint } from "../js/state.js";

function parseSizes(args) {
  const value = args.find(arg => arg.startsWith("--sizes="));
  if (!value) return [50000, 100000, 200000];
  const raw = value.split("=")[1] || "";
  const sizes = raw
    .split(",")
    .map(part => Number.parseInt(part.trim(), 10))
    .filter(number => Number.isFinite(number) && number > 0);
  return sizes.length ? sizes : [50000, 100000, 200000];
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatMs(value) {
  return `${value.toFixed(1)}ms`;
}

function formatMB(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function generateEntries(count) {
  const senders = ["Ana", "Ben", "Cara", "Dev", "Eli", "Finn", "Gia", "Hiro"];
  const baseMs = Date.parse("2025-01-01T00:00:00Z");
  const entries = new Array(count);
  for (let index = 0; index < count; index += 1) {
    const sender = senders[index % senders.length];
    const message =
      index % 17 === 0
        ? `poll: planning question ${index}`
        : index % 13 === 0
          ? `https://example.com/item/${index}`
          : `Message ${index} from ${sender} about launch and retention`;
    const timestamp = new Date(baseMs + index * 45000).toISOString();
    entries[index] = {
      type: "message",
      sender,
      message,
      search_text: message.toLowerCase(),
      timestamp,
    };
  }
  return entries;
}

function runSearchScan(entries, token) {
  const lowered = token.toLowerCase();
  let matches = 0;
  for (const entry of entries) {
    if (entry.search_text.includes(lowered)) {
      matches += 1;
    }
  }
  return matches;
}

function benchmark(label, task) {
  const started = performance.now();
  const result = task();
  const finished = performance.now();
  return { label, durationMs: finished - started, result };
}

async function main() {
  const sizes = parseSizes(process.argv.slice(2));
  console.log(`# WAAN large-chat stress benchmark`);
  console.log(`Sizes: ${sizes.map(formatNumber).join(", ")}`);
  console.log("");
  console.log("| Messages | Fingerprint | Analytics | Search scan | Heap delta |");
  console.log("| ---: | ---: | ---: | ---: | ---: |");

  for (const size of sizes) {
    global.gc?.();
    const heapBefore = process.memoryUsage().heapUsed;
    const entries = generateEntries(size);

    const fingerprintBench = benchmark("fingerprint", () => computeDatasetFingerprint(entries));
    const analyticsBench = benchmark("analytics", () => computeAnalytics(entries));
    const searchBench = benchmark("search", () => runSearchScan(entries, "launch"));
    const heapAfter = process.memoryUsage().heapUsed;
    const heapDelta = heapAfter - heapBefore;

    console.log(
      `| ${formatNumber(size)} | ${formatMs(fingerprintBench.durationMs)} | ${formatMs(
        analyticsBench.durationMs,
      )} | ${formatMs(searchBench.durationMs)} | ${formatMB(heapDelta)} |`,
    );

    if (!analyticsBench.result?.total_messages || searchBench.result <= 0) {
      throw new Error("Benchmark validation failed.");
    }
  }

  console.log("");
  console.log("Done.");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
