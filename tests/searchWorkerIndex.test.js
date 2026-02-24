import { describe, it, expect } from "vitest";
import { createDatasetIndexCache, ensureIndexedDataset, resolveIndexedCandidates } from "../js/search/workerIndex.js";

function buildEntry(index) {
  return {
    type: "message",
    timestamp: new Date(1_700_000_000_000 + index * 1000).toISOString(),
    sender: `User ${index % 3}`,
    message: `token-${index} common`,
    search_text: `token-${index} common`,
    message_id: `m-${index}`,
  };
}

function createCache() {
  return createDatasetIndexCache();
}

describe("search worker index", () => {
  it("reuses index for same fingerprint and source length", () => {
    const cache = createCache();
    const entries = [buildEntry(0), buildEntry(1), buildEntry(2)];

    const first = ensureIndexedDataset(cache, { entries, datasetFingerprint: "fp-1" });
    const second = ensureIndexedDataset(cache, { entries, datasetFingerprint: "fp-1" });

    expect(first.mode).toBe("rebuild");
    expect(second.mode).toBe("reuse");
    expect(cache.messageRecords).toHaveLength(3);
  });

  it("reuses in O(1) when dataset reference is unchanged", () => {
    const cache = createCache();
    const entries = [buildEntry(0), buildEntry(1), buildEntry(2)];

    const first = ensureIndexedDataset(cache, { entries, datasetFingerprint: "fp-ref-1" });
    Object.defineProperty(entries[1], "message", {
      configurable: true,
      get() {
        throw new Error("reuse path should not re-read entry message");
      },
    });
    Object.defineProperty(entries[1], "search_text", {
      configurable: true,
      get() {
        throw new Error("reuse path should not re-read entry search_text");
      },
    });

    const second = ensureIndexedDataset(cache, { entries, datasetFingerprint: "fp-ref-1" });

    expect(first.mode).toBe("rebuild");
    expect(second.mode).toBe("reuse");
  });

  it("applies append-only incremental indexing when prefix is unchanged", () => {
    const cache = createCache();
    const baseEntries = [buildEntry(0), buildEntry(1), buildEntry(2)];
    const appendedEntries = [...baseEntries, buildEntry(3), buildEntry(4)];

    const first = ensureIndexedDataset(cache, { entries: baseEntries, datasetFingerprint: "fp-1" });
    const second = ensureIndexedDataset(cache, { entries: appendedEntries, datasetFingerprint: "fp-2" });

    expect(first.mode).toBe("rebuild");
    expect(second.mode).toBe("append");
    expect(cache.messageRecords).toHaveLength(5);
    expect(cache.tokenIndex.get("token-4")).toHaveLength(1);
  });

  it("preserves substring matching semantics for indexed candidates", () => {
    const cache = createCache();
    const entries = [
      {
        type: "message",
        timestamp: new Date(1_700_000_000_000).toISOString(),
        sender: "Ana",
        message: "Planning hello, team",
        search_text: "planning hello, team",
        message_id: "m-substring",
      },
    ];
    ensureIndexedDataset(cache, { entries, datasetFingerprint: "fp-substring" });

    const planningMatch = resolveIndexedCandidates(cache, { text: "plan" });
    const punctuatedMatch = resolveIndexedCandidates(cache, { text: "hello" });

    expect(planningMatch).toEqual([0]);
    expect(punctuatedMatch).toEqual([0]);
  });

  it("rebuilds index when fingerprint collides but checkpoint identity differs", () => {
    const cache = createCache();
    const baseEntries = [buildEntry(0), buildEntry(1), buildEntry(2)];
    const sameLengthEdited = "xxxxxxx xxxxxx";
    const collidedEntries = [
      baseEntries[0],
      {
        ...baseEntries[1],
        timestamp: baseEntries[1].timestamp,
        message: sameLengthEdited,
        search_text: sameLengthEdited,
      },
      baseEntries[2],
    ];

    const first = ensureIndexedDataset(cache, { entries: baseEntries, datasetFingerprint: "fp-collision" });
    const second = ensureIndexedDataset(cache, { entries: collidedEntries, datasetFingerprint: "fp-collision" });

    expect(first.mode).toBe("rebuild");
    expect(second.mode).toBe("rebuild");
  });

  it("does not use append mode for same-length dataset changes", () => {
    const cache = createCache();
    const baseEntries = [buildEntry(0), buildEntry(1), buildEntry(2), buildEntry(3)];
    const editedEntries = [...baseEntries];
    editedEntries[1] = {
      ...editedEntries[1],
      message: "reworded text",
      search_text: "reworded text",
    };

    const first = ensureIndexedDataset(cache, { entries: baseEntries, datasetFingerprint: "fp-1" });
    const second = ensureIndexedDataset(cache, { entries: editedEntries, datasetFingerprint: "fp-2" });

    expect(first.mode).toBe("rebuild");
    expect(second.mode).toBe("rebuild");
  });

  it("rebuilds and serves matches when dataset fingerprint is missing", () => {
    const cache = createCache();
    const entries = [buildEntry(0), buildEntry(1), buildEntry(2)];

    const result = ensureIndexedDataset(cache, { entries, datasetFingerprint: "" });
    const candidates = resolveIndexedCandidates(cache, { text: "token-1" });

    expect(result.mode).toBe("rebuild");
    expect(result.indexedMessages).toBe(3);
    expect(candidates).toEqual([1]);
  });

  it("rebuilds when type of a checkpointed row changes during append update", () => {
    const cache = createCache();
    const baseEntries = [buildEntry(0), buildEntry(1), buildEntry(2)];
    const changedAndAppended = [
      baseEntries[0],
      { ...baseEntries[1], type: "system" },
      baseEntries[2],
      buildEntry(3),
    ];

    const first = ensureIndexedDataset(cache, { entries: baseEntries, datasetFingerprint: "fp-type-a" });
    const second = ensureIndexedDataset(cache, {
      entries: changedAndAppended,
      datasetFingerprint: "fp-type-b",
    });

    expect(first.mode).toBe("rebuild");
    expect(second.mode).toBe("rebuild");
  });

  it("rebuilds when timestamp_text/date identity changes during append update", () => {
    const cache = createCache();
    const baseEntries = [
      {
        type: "message",
        sender: "Ana",
        timestamp: "",
        timestamp_text: "01/01/2025, 10:00",
        date: "2025-01-01",
        message: "hello",
        search_text: "hello",
        message_id: "m-0",
      },
      {
        type: "message",
        sender: "Ben",
        timestamp: "",
        timestamp_text: "01/01/2025, 10:01",
        date: "2025-01-01",
        message: "world",
        search_text: "world",
        message_id: "m-1",
      },
      {
        type: "message",
        sender: "Cara",
        timestamp: "",
        timestamp_text: "01/01/2025, 10:02",
        date: "2025-01-01",
        message: "test",
        search_text: "test",
        message_id: "m-2",
      },
    ];
    const changedAndAppended = [
      baseEntries[0],
      { ...baseEntries[1], timestamp_text: "01/01/2025, 11:01", date: "2025-01-02" },
      baseEntries[2],
      {
        type: "message",
        sender: "Dan",
        timestamp: "",
        timestamp_text: "01/01/2025, 10:03",
        date: "2025-01-01",
        message: "append",
        search_text: "append",
        message_id: "m-3",
      },
    ];

    const first = ensureIndexedDataset(cache, { entries: baseEntries, datasetFingerprint: "fp-time-a" });
    const second = ensureIndexedDataset(cache, {
      entries: changedAndAppended,
      datasetFingerprint: "fp-time-b",
    });

    expect(first.mode).toBe("rebuild");
    expect(second.mode).toBe("rebuild");
  });

  it("rebuilds when a non-checkpoint row is edited before append", () => {
    const cache = createCache();
    const baseEntries = Array.from({ length: 1001 }, (_, index) => buildEntry(index));
    const changedAndAppended = [...baseEntries];
    changedAndAppended[10] = {
      ...changedAndAppended[10],
      message: "edited row content",
      search_text: "edited row content",
    };
    changedAndAppended.push(buildEntry(1001));

    const first = ensureIndexedDataset(cache, { entries: baseEntries, datasetFingerprint: "fp-large-a" });
    const second = ensureIndexedDataset(cache, {
      entries: changedAndAppended,
      datasetFingerprint: "fp-large-b",
    });

    expect(first.mode).toBe("rebuild");
    expect(second.mode).toBe("rebuild");
  });
});
