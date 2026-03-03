import { execFileSync } from "node:child_process";
import process from "node:process";

const BASE_BUDGETS = {
  search: {
    indexBuildMsMax: 700,
    keywordIndexedMsMax: 8,
    participantKeywordIndexedMsMax: 8,
    keywordDateRangeIndexedMsMax: 12,
  },
  render: {
    analytics120kMsMax: 1800,
  },
  sync: {
    upsertBatchedMsMax: 80,
    appendDefaultBatchedMsMax: 250,
    appendForcedImmediateMsMax: 300,
    upsertBatchedReductionPctMin: 99,
    appendDefaultReductionPctMin: 99,
  },
};

function resolveBudgets(profile) {
  if (profile === "release-ci") {
    return {
      ...BASE_BUDGETS,
      search: {
        ...BASE_BUDGETS.search,
        // Hosted macOS runners show small search-worker timing variance near threshold.
        keywordIndexedMsMax: 10,
      },
      sync: {
        ...BASE_BUDGETS.sync,
        // Hosted macOS runners can show higher I/O jitter; keep guardrails but avoid false negatives.
        appendDefaultBatchedMsMax: 300,
        appendForcedImmediateMsMax: 650,
        appendDefaultReductionPctMin: 98.5,
      },
    };
  }
  return BASE_BUDGETS;
}

function runNodeScript(args) {
  return execFileSync(process.execPath, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseMarkdownNumber(output, rowLabel) {
  const pattern = new RegExp(`\\|\\s*${escapeRegExp(rowLabel)}\\s*\\|\\s*([0-9]+(?:\\.[0-9]+)?)\\s*\\|`);
  const match = output.match(pattern);
  if (!match) return null;
  return Number.parseFloat(match[1]);
}

function parseChatstoreScenario(output, scenarioLabel) {
  const pattern = new RegExp(
    `\\|\\s*${escapeRegExp(scenarioLabel)}\\s*\\|\\s*([0-9]+)\\s*\\|\\s*([0-9]+)\\s*\\|\\s*([0-9]+)\\s*\\|\\s*([0-9]+(?:\\.[0-9]+)?)%\\s*\\|\\s*([0-9]+(?:\\.[0-9]+)?)\\s*\\|`,
  );
  const match = output.match(pattern);
  if (!match) return null;
  return {
    iterations: Number.parseInt(match[1], 10),
    beforeWrites: Number.parseInt(match[2], 10),
    afterWrites: Number.parseInt(match[3], 10),
    reductionPct: Number.parseFloat(match[4]),
    durationMs: Number.parseFloat(match[5]),
  };
}

function parseStressAnalytics120kMs(output) {
  const rowPattern = /\|\s*120,000\s*\|\s*[0-9.]+ms\s*\|\s*([0-9.]+)ms\s*\|\s*[0-9.]+ms\s*\|\s*[0-9.]+\s*MB\s*\|/;
  const match = output.match(rowPattern);
  if (!match) return null;
  return Number.parseFloat(match[1]);
}

function assertNumber(value, label, failures) {
  if (typeof value === "number" && Number.isFinite(value)) return;
  failures.push(`Unable to parse metric: ${label}`);
}

function compareMax(value, max, label, failures) {
  if (value > max) {
    failures.push(`${label} exceeded budget: ${value}ms > ${max}ms`);
  }
}

function compareMin(value, min, label, failures) {
  if (value < min) {
    failures.push(`${label} below budget: ${value}% < ${min}%`);
  }
}

function main() {
  const budgetProfile = String(process.env.WAAN_PERF_BUDGET_PROFILE || "strict");
  const BUDGETS = resolveBudgets(budgetProfile);
  const searchOutput = runNodeScript(["scripts/measure-search-worker-index.mjs"]);
  const chatstoreOutput = runNodeScript(["scripts/measure-chatstore-write-amplification.mjs"]);
  const stressOutput = runNodeScript(["--expose-gc", "scripts/stress-large-chat.mjs", "--sizes=120000"]);

  const metrics = {
    searchIndexBuildMs: parseMarkdownNumber(searchOutput, "Index build"),
    searchKeywordIndexedMs: parseMarkdownNumber(searchOutput, "keyword (indexed)"),
    searchParticipantKeywordIndexedMs: parseMarkdownNumber(searchOutput, "participant+keyword (indexed)"),
    searchKeywordDateRangeIndexedMs: parseMarkdownNumber(searchOutput, "keyword+date-range (indexed)"),
    renderAnalytics120kMs: parseStressAnalytics120kMs(stressOutput),
    syncUpsertBatched: parseChatstoreScenario(chatstoreOutput, "upsertChatMeta (batched persist)"),
    syncAppendDefault: parseChatstoreScenario(chatstoreOutput, "appendMessage (default batched metadata path)"),
    syncAppendImmediate: parseChatstoreScenario(chatstoreOutput, "appendMessage (forced immediate metadata persist)"),
  };

  const failures = [];

  assertNumber(metrics.searchIndexBuildMs, "Search index build duration", failures);
  assertNumber(metrics.searchKeywordIndexedMs, "Search keyword indexed duration", failures);
  assertNumber(metrics.searchParticipantKeywordIndexedMs, "Search participant+keyword indexed duration", failures);
  assertNumber(metrics.searchKeywordDateRangeIndexedMs, "Search keyword+date-range indexed duration", failures);
  assertNumber(metrics.renderAnalytics120kMs, "Render analytics duration at 120k", failures);

  if (!metrics.syncUpsertBatched) {
    failures.push("Unable to parse sync metric: upsertChatMeta (batched persist)");
  }
  if (!metrics.syncAppendDefault) {
    failures.push("Unable to parse sync metric: appendMessage (default batched metadata path)");
  }
  if (!metrics.syncAppendImmediate) {
    failures.push("Unable to parse sync metric: appendMessage (forced immediate metadata persist)");
  }

  if (!failures.length) {
    compareMax(metrics.searchIndexBuildMs, BUDGETS.search.indexBuildMsMax, "Search index build", failures);
    compareMax(metrics.searchKeywordIndexedMs, BUDGETS.search.keywordIndexedMsMax, "Search keyword indexed", failures);
    compareMax(
      metrics.searchParticipantKeywordIndexedMs,
      BUDGETS.search.participantKeywordIndexedMsMax,
      "Search participant+keyword indexed",
      failures,
    );
    compareMax(
      metrics.searchKeywordDateRangeIndexedMs,
      BUDGETS.search.keywordDateRangeIndexedMsMax,
      "Search keyword+date-range indexed",
      failures,
    );

    compareMax(metrics.renderAnalytics120kMs, BUDGETS.render.analytics120kMsMax, "Render analytics (120k)", failures);

    compareMax(metrics.syncUpsertBatched.durationMs, BUDGETS.sync.upsertBatchedMsMax, "Sync upsert batched duration", failures);
    compareMax(
      metrics.syncAppendDefault.durationMs,
      BUDGETS.sync.appendDefaultBatchedMsMax,
      "Sync append default batched duration",
      failures,
    );
    compareMax(
      metrics.syncAppendImmediate.durationMs,
      BUDGETS.sync.appendForcedImmediateMsMax,
      "Sync append immediate duration",
      failures,
    );
    compareMin(
      metrics.syncUpsertBatched.reductionPct,
      BUDGETS.sync.upsertBatchedReductionPctMin,
      "Sync upsert batched reduction",
      failures,
    );
    compareMin(
      metrics.syncAppendDefault.reductionPct,
      BUDGETS.sync.appendDefaultReductionPctMin,
      "Sync append default reduction",
      failures,
    );
  }

  const lines = [
    "# WAAN performance budget check",
    `profile=${budgetProfile}`,
    `search.indexBuild=${metrics.searchIndexBuildMs}ms (max ${BUDGETS.search.indexBuildMsMax}ms)`,
    `search.keywordIndexed=${metrics.searchKeywordIndexedMs}ms (max ${BUDGETS.search.keywordIndexedMsMax}ms)`,
    `search.participantKeywordIndexed=${metrics.searchParticipantKeywordIndexedMs}ms (max ${BUDGETS.search.participantKeywordIndexedMsMax}ms)`,
    `search.keywordDateRangeIndexed=${metrics.searchKeywordDateRangeIndexedMs}ms (max ${BUDGETS.search.keywordDateRangeIndexedMsMax}ms)`,
    `render.analytics120k=${metrics.renderAnalytics120kMs}ms (max ${BUDGETS.render.analytics120kMsMax}ms)`,
  ];

  if (metrics.syncUpsertBatched) {
    lines.push(
      `sync.upsertBatched=${metrics.syncUpsertBatched.durationMs}ms/${metrics.syncUpsertBatched.reductionPct}% (max ${BUDGETS.sync.upsertBatchedMsMax}ms, min ${BUDGETS.sync.upsertBatchedReductionPctMin}%)`,
    );
  }
  if (metrics.syncAppendDefault) {
    lines.push(
      `sync.appendDefault=${metrics.syncAppendDefault.durationMs}ms/${metrics.syncAppendDefault.reductionPct}% (max ${BUDGETS.sync.appendDefaultBatchedMsMax}ms, min ${BUDGETS.sync.appendDefaultReductionPctMin}%)`,
    );
  }
  if (metrics.syncAppendImmediate) {
    lines.push(
      `sync.appendImmediate=${metrics.syncAppendImmediate.durationMs}ms/${metrics.syncAppendImmediate.reductionPct}% (max ${BUDGETS.sync.appendForcedImmediateMsMax}ms)`,
    );
  }

  console.log(lines.join("\n"));

  if (failures.length) {
    console.error("\nPerformance budget check failed:");
    failures.forEach(item => console.error(`- ${item}`));
    process.exitCode = 1;
    return;
  }

  console.log("\nAll performance budgets passed.");
}

main();
