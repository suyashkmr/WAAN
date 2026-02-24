import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import fs from "fs-extra";

const require = createRequire(import.meta.url);
const { ChatStore } = require("../apps/server/src/store/chatStore.js");

const noopLogger = {
  info() {},
  warn() {},
};

async function withStore(run) {
  const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), "waan-chatstore-perf-"));
  const store = new ChatStore(storageDir, noopLogger);
  try {
    return await run(store);
  } finally {
    await fs.remove(storageDir);
  }
}

async function measureScenario(name, { iterations, task, expectedBeforeWrites }) {
  return withStore(async store => {
    let persistCalls = 0;
    const originalPersistMetadata = store.persistMetadata.bind(store);
    store.persistMetadata = async () => {
      persistCalls += 1;
      return originalPersistMetadata();
    };

    const startedAt = Date.now();
    for (let index = 0; index < iterations; index += 1) {
      await task(store, index);
    }
    await store.flushMetadata();
    const durationMs = Date.now() - startedAt;

    const beforeWrites = expectedBeforeWrites(iterations);
    const afterWrites = persistCalls;
    const reductionPct = beforeWrites > 0
      ? Math.max(0, ((beforeWrites - afterWrites) / beforeWrites) * 100)
      : 0;

    return {
      name,
      iterations,
      durationMs,
      beforeWrites,
      afterWrites,
      reductionPct: Number(reductionPct.toFixed(2)),
    };
  });
}

async function runBenchmark() {
  const scenarios = [
    {
      name: "upsertChatMeta (blocking persist)",
      iterations: 1000,
      task: (store, index) => store.upsertChatMeta(`chat-${index}@c.us`, { name: `Chat ${index}` }),
      expectedBeforeWrites: iterations => iterations,
    },
    {
      name: "upsertChatMeta (batched persist)",
      iterations: 1000,
      task: (store, index) =>
        store.upsertChatMeta(`chat-${index}@c.us`, { name: `Chat ${index}` }, { waitForPersist: false }),
      expectedBeforeWrites: iterations => iterations,
    },
    {
      name: "appendMessage (default blocking path)",
      iterations: 400,
      task: (store, index) =>
        store.appendMessage(
          "bench-chat@c.us",
          {
            id: `m-${index}`,
            timestamp: new Date(1_700_000_000_000 + index * 1000).toISOString(),
            sender: "Bench",
            message: `message ${index}`,
          },
          { name: "Bench Chat" },
        ),
      expectedBeforeWrites: iterations => iterations,
    },
    {
      name: "upsertChatMeta single-chat (batched incremental path)",
      iterations: 400,
      task: (store, index) =>
        store.upsertChatMeta(
          "bench-chat@c.us",
          {
            lastMessageAt: new Date(1_700_000_000_000 + index * 1000).toISOString(),
            messageCount: index + 1,
            name: "Bench Chat",
          },
          { waitForPersist: false },
        ),
      expectedBeforeWrites: iterations => iterations,
    },
  ];

  const results = [];
  for (const scenario of scenarios) {
    results.push(await measureScenario(scenario.name, scenario));
  }

  const generatedAt = new Date().toISOString();
  console.log(`# ChatStore metadata write amplification benchmark`);
  console.log(`generatedAt=${generatedAt}`);
  console.log(``);
  console.log(`| Scenario | Iterations | Before writes | After writes | Reduction | Duration (ms) |`);
  console.log(`| --- | ---: | ---: | ---: | ---: | ---: |`);
  results.forEach(result => {
    console.log(
      `| ${result.name} | ${result.iterations} | ${result.beforeWrites} | ${result.afterWrites} | ${result.reductionPct}% | ${result.durationMs} |`,
    );
  });
}

runBenchmark().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
