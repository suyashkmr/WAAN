import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createSearchController } from "../js/search.js";
import {
  setDatasetEntries,
  resetSearchState,
  setStatusCallback,
  setSearchQuery,
} from "../js/state.js";

function buildElements() {
  const form = document.createElement("form");
  const keywordInput = document.createElement("input");
  const participantSelect = document.createElement("select");
  const startInput = document.createElement("input");
  const endInput = document.createElement("input");
  const resetButton = document.createElement("button");
  const resultsSummaryEl = document.createElement("div");
  const resultsListEl = document.createElement("div");
  const insightsEl = document.createElement("div");
  const progressEl = document.createElement("div");
  const progressTrackEl = document.createElement("div");
  const progressBarEl = document.createElement("div");
  const progressLabelEl = document.createElement("div");

  form.append(keywordInput, participantSelect, startInput, endInput, resetButton);

  return {
    form,
    keywordInput,
    participantSelect,
    startInput,
    endInput,
    resetButton,
    resultsSummaryEl,
    resultsListEl,
    insightsEl,
    progressEl,
    progressTrackEl,
    progressBarEl,
    progressLabelEl,
  };
}

describe("search controller", () => {
  let OriginalWorker;
  let workerInstances;
  let statusEvents;

  beforeEach(() => {
    workerInstances = [];
    statusEvents = [];
    resetSearchState();
    setDatasetEntries([]);
    setSearchQuery({ text: "", participant: "", start: "", end: "" });
    setStatusCallback((message, tone) => {
      statusEvents.push({ message, tone });
    });

    class MockWorker {
      constructor() {
        this.onmessage = null;
        this.onerror = null;
        workerInstances.push(this);
      }

      postMessage(payload) {
        if (payload?.type === "cancel") return;
        if (payload?.type !== "search") return;
        this.onmessage?.({
          data: {
            id: payload.id,
            type: "progress",
            scanned: 1,
            total: payload.payload.entries.length,
          },
        });
        this.onmessage?.({
          data: {
            id: payload.id,
            type: "result",
            results: [
              {
                sender: "Ana",
                timestamp: "2025-01-02T10:00:00.000Z",
                message: "hello world",
                messageHtml: "hello <mark>world</mark>",
              },
            ],
            total: 1,
            summary: {
              total: 1,
              truncated: false,
              hitsPerDay: [{ date: "2025-01-02", count: 1 }],
              topParticipants: [{ sender: "Ana", count: 1 }],
              filters: ["keyword: world"],
            },
          },
        });
      }

      terminate() {}
    }

    OriginalWorker = globalThis.Worker;
    globalThis.Worker = MockWorker;
  });

  afterEach(() => {
    globalThis.Worker = OriginalWorker;
    vi.restoreAllMocks();
  });

  it("populates participant selector from dataset entries", () => {
    setDatasetEntries([
      { type: "message", sender: "Ben", message: "x" },
      { type: "message", sender: "Ana", message: "y" },
      { type: "message", sender: "Ben", message: "z" },
      { type: "system", sender: "System", message: "ignored" },
    ]);

    const elements = buildElements();
    const controller = createSearchController({ elements, options: { resultLimit: 10 } });

    controller.populateParticipants();

    expect(elements.participantSelect.options.length).toBe(3);
    expect(elements.participantSelect.options[0].textContent).toBe("All participants");
    expect(elements.participantSelect.options[1].value).toBe("Ana");
    expect(elements.participantSelect.options[2].value).toBe("Ben");
    expect(elements.participantSelect.disabled).toBe(false);
  });

  it("runs worker-backed search via submit and renders results", async () => {
    setDatasetEntries([
      {
        type: "message",
        sender: "Ana",
        timestamp: "2025-01-02T10:00:00.000Z",
        message: "hello world",
      },
    ]);

    const elements = buildElements();
    const controller = createSearchController({ elements, options: { resultLimit: 10 } });
    controller.init();

    elements.keywordInput.value = "world";
    elements.form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await Promise.resolve();

    expect(workerInstances.length).toBe(1);
    expect(elements.resultsListEl.querySelectorAll(".search-result").length).toBe(1);
    expect(elements.resultsSummaryEl.textContent).toContain("Showing 1 match");
    expect(elements.insightsEl.classList.contains("hidden")).toBe(false);
  });

  it("rejects invalid date ranges before creating worker", () => {
    setDatasetEntries([
      {
        type: "message",
        sender: "Ana",
        timestamp: "2025-01-02T10:00:00.000Z",
        message: "hello world",
      },
    ]);

    const elements = buildElements();
    const controller = createSearchController({ elements });
    controller.init();

    elements.startInput.value = "2025-01-10";
    elements.endInput.value = "2025-01-01";
    elements.form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    expect(workerInstances.length).toBe(0);
  });
});
