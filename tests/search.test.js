import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Fragment, h, render } from "vue";
import { createSearchController } from "../js/search.js";
import {
  getSearchState,
  setDatasetEntries,
  resetSearchState,
  setStatusCallback,
  setSearchQuery,
} from "../js/state.js";
import { readPrimeSelectBridgeValue, syncPrimeSelectBridgeById } from "../js/vue/primeSelectBridge.js";
import { clearVueBridgeRuntime, installSearchSavedVueBridge } from "./vueBridgeTestUtils.js";

const testVueRuntime = { h, render, Fragment };

function buildElements() {
  const form = document.createElement("form");
  const keywordInput = document.createElement("input");
  const participantSelect = document.createElement("select");
  const startInput = document.createElement("input");
  const endInput = document.createElement("input");
  const resetButton = document.createElement("button");
  const searchActionsEl = document.createElement("div");
  searchActionsEl.className = "search-actions";
  const resultsSummaryEl = document.createElement("div");
  const resultsListEl = document.createElement("div");
  const insightsEl = document.createElement("div");
  const progressEl = document.createElement("div");
  const progressTrackEl = document.createElement("div");
  const progressBarEl = document.createElement("div");
  const progressLabelEl = document.createElement("div");

  form.append(keywordInput, participantSelect, startInput, endInput, searchActionsEl, resetButton);

  return {
    form,
    keywordInput,
    participantSelect,
    startInput,
    endInput,
    searchActionsEl,
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

function installSearchSavedBridge(elements, overrides = {}) {
  const bridge = {
    renderSearchPanelState(payload = {}) {
      elements.resultsListEl.innerHTML = "";
      const node = document.createElement("div");
      node.className = `panel-state panel-state--${payload.tone || "empty"}`;
      node.textContent = `${payload.title || ""} ${payload.message || ""}`.trim();
      elements.resultsListEl.appendChild(node);
      (payload.actions || []).forEach(action => {
        const actionButton = document.createElement("button");
        actionButton.dataset.panelAction = String(action?.id || "");
        elements.resultsListEl.appendChild(actionButton);
      });
      return true;
    },
    renderSearchResults(payload = {}) {
      elements.resultsListEl.innerHTML = "";
      const results = Array.isArray(payload.results) ? payload.results.filter(Boolean) : [];
      results.forEach(result => {
        const node = document.createElement("div");
        node.className = "search-result";
        node.textContent = String(result?.message || "");
        elements.resultsListEl.appendChild(node);
      });
      return true;
    },
    renderSearchInsights(payload = {}) {
      if (!payload.summary) {
        elements.insightsEl.classList.add("hidden");
        elements.insightsEl.textContent = "";
        return true;
      }
      elements.insightsEl.classList.remove("hidden");
      elements.insightsEl.textContent = "summary";
      return true;
    },
    setPanelActionHandlers: vi.fn(() => true),
    ...overrides,
  };
  installSearchSavedVueBridge(bridge);
  return bridge;
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
                messageSegments: [
                  { text: "hello ", highlighted: false },
                  { text: "world", highlighted: true },
                ],
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
    clearVueBridgeRuntime();
  });

  it("populates participant selector from dataset entries", () => {
    setDatasetEntries([
      { type: "message", sender: "Ben", message: "x" },
      { type: "message", sender: "Ana", message: "y" },
      { type: "message", sender: "Ben", message: "z" },
      { type: "system", sender: "System", message: "ignored" },
    ]);

    const elements = buildElements();
    const controller = createSearchController({ elements, options: { resultLimit: 10, vueRuntime: testVueRuntime } });

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
    installSearchSavedBridge(elements);
    const controller = createSearchController({ elements, options: { resultLimit: 10, vueRuntime: testVueRuntime } });
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
    const controller = createSearchController({ elements, options: { vueRuntime: testVueRuntime } });
    controller.init();

    elements.startInput.value = "2025-01-10";
    elements.endInput.value = "2025-01-01";
    elements.form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    expect(workerInstances.length).toBe(0);
  });

  it("renders recovery state when search runs without dataset", () => {
    const elements = buildElements();
    installSearchSavedBridge(elements);
    const controller = createSearchController({ elements, options: { vueRuntime: testVueRuntime } });
    controller.init();

    elements.keywordInput.value = "hello";
    elements.form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    expect(workerInstances.length).toBe(0);
    expect(elements.resultsListEl.querySelector(".panel-state--error")).toBeTruthy();
    expect(elements.resultsListEl.textContent).toContain("Load a chat first");
    expect(elements.resultsListEl.querySelector('[data-panel-action="retry-search"]')).toBeTruthy();
  });

  it("routes search actions through panel dispatcher when Vue search actions are mounted", async () => {
    setDatasetEntries([
      {
        type: "message",
        sender: "Ana",
        timestamp: "2025-01-02T10:00:00.000Z",
        message: "hello world",
      },
    ]);

    const elements = buildElements();
    elements.searchActionsEl.dataset.vuePrimitiveMounted = "true";
    /** @type {Record<string, Function>} */
    let panelActionHandlers = {};
    installSearchSavedBridge(elements, {
      setPanelActionHandlers: handlers => {
        panelActionHandlers = {
          ...panelActionHandlers,
          ...(handlers || {}),
        };
        return true;
      },
    });

    const controller = createSearchController({ elements, options: { resultLimit: 10, vueRuntime: testVueRuntime } });
    controller.init();

    elements.keywordInput.value = "world";
    await panelActionHandlers["search:run-search"]();
    await Promise.resolve();
    expect(workerInstances.length).toBe(1);
    expect(elements.resultsListEl.querySelectorAll(".search-result").length).toBe(1);

    elements.keywordInput.value = "reset me";
    panelActionHandlers["search:clear-search-filters"]();
    expect(elements.keywordInput.value).toBe("");
  });

  it("skips native form submit listener when bridge-owned search form submit is mounted", () => {
    const elements = buildElements();
    elements.form.dataset.vueSubmitManaged = "true";
    elements.searchActionsEl.dataset.vuePrimitiveMounted = "true";
    const bridge = installSearchSavedBridge(elements);
    const submitSpy = vi.spyOn(elements.form, "addEventListener");

    const controller = createSearchController({ elements, options: { vueRuntime: testVueRuntime } });
    controller.init();

    expect(bridge.setPanelActionHandlers).toHaveBeenCalled();
    expect(submitSpy).not.toHaveBeenCalledWith("submit", expect.any(Function));
  });

  it("keeps legacy reset button listener when bridge exists but Vue search actions are not mounted", () => {
    setDatasetEntries([
      {
        type: "message",
        sender: "Ana",
        timestamp: "2025-01-02T10:00:00.000Z",
        message: "hello world",
      },
    ]);

    const elements = buildElements();
    installSearchSavedBridge(elements, {
      setPanelActionHandlers: vi.fn(() => true),
    });
    const controller = createSearchController({ elements, options: { vueRuntime: testVueRuntime } });
    controller.init();

    elements.keywordInput.value = "reset me";
    elements.resetButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(elements.keywordInput.value).toBe("");
  });

  it("keeps legacy reset button listener when only submit is Vue-managed", () => {
    setDatasetEntries([
      {
        type: "message",
        sender: "Ana",
        timestamp: "2025-01-02T10:00:00.000Z",
        message: "hello world",
      },
    ]);

    const elements = buildElements();
    elements.form.dataset.vueSubmitManaged = "true";
    installSearchSavedBridge(elements, {
      setPanelActionHandlers: vi.fn(() => true),
    });
    const addEventListenerSpy = vi.spyOn(elements.resetButton, "addEventListener");

    const controller = createSearchController({ elements, options: { vueRuntime: testVueRuntime } });
    controller.init();

    expect(addEventListenerSpy).toHaveBeenCalledWith("click", expect.any(Function));
    elements.keywordInput.value = "reset me";
    elements.resetButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(elements.keywordInput.value).toBe("");
  });

  it("compacts sparse worker result arrays before rendering", async () => {
    class SparseWorker {
      constructor() {
        this.onmessage = null;
        this.onerror = null;
      }

      postMessage(payload) {
        if (payload?.type !== "search") return;
        const sparseResults = new Array(3);
        sparseResults[1] = {
          sender: "Ana",
          timestamp: "2025-01-02T10:00:00.000Z",
          message: "hello world",
          messageSegments: [{ text: "hello world", highlighted: false }],
        };
        this.onmessage?.({
          data: {
            id: payload.id,
            type: "result",
            results: sparseResults,
            total: 1,
            summary: {
              total: 1,
              truncated: false,
              hitsPerDay: [{ date: "2025-01-02", count: 1 }],
              topParticipants: [{ sender: "Ana", count: 1 }],
              filters: ["Filters: none (all messages)"],
            },
          },
        });
      }

      terminate() {}
    }

    globalThis.Worker = SparseWorker;
    setDatasetEntries([
      {
        type: "message",
        sender: "Ana",
        timestamp: "2025-01-02T10:00:00.000Z",
        message: "hello world",
      },
    ]);

    const elements = buildElements();
    installSearchSavedBridge(elements);
    const controller = createSearchController({ elements, options: { resultLimit: 10, vueRuntime: testVueRuntime } });
    controller.init();
    elements.form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await Promise.resolve();

    expect(elements.resultsListEl.querySelectorAll(".search-result")).toHaveLength(1);
  });

  it("syncs the bridged participant select after programmatic state updates and resets", () => {
    setDatasetEntries([
      { type: "message", sender: "Ana", message: "x" },
      { type: "message", sender: "Ben", message: "y" },
    ]);

    const elements = buildElements();
    installSearchSavedBridge(elements);
    elements.participantSelect.id = "search-participant";
    document.body.appendChild(elements.participantSelect);
    globalThis.PrimeVue = { Select: { name: "PrimeSelectStub" } };
    const bridgeStates = [];
    const bridgeVueRuntime = {
      h,
      reactive(value) {
        bridgeStates.push(value);
        return value;
      },
      createApp(root) {
        return {
          use() {
            return this;
          },
          mount(container) {
            const vnode = root.render();
            container.innerHTML = `<div class="p-select" data-runtime="${String(vnode?.props?.["data-ui-runtime"] || "")}"></div>`;
          },
        };
      },
      render,
      Fragment,
    };

    const controller = createSearchController({ elements, options: { vueRuntime: bridgeVueRuntime } });
    controller.init();
    controller.populateParticipants();

    setSearchQuery({ text: "", participant: "Ben", start: "", end: "" });
    controller.applyStateToForm();
    expect(elements.participantSelect.value).toBe("Ben");
    expect(readPrimeSelectBridgeValue(elements.participantSelect)).toBe("Ben");

    controller.resetState();
    expect(elements.participantSelect.value).toBe("");
    expect(readPrimeSelectBridgeValue(elements.participantSelect)).toBe("");
  });

  it("submits using bridged participant state even when the hidden native select is stale", async () => {
    setDatasetEntries([
      { type: "message", sender: "Ana", message: "alpha" },
      { type: "message", sender: "Ben", message: "beta" },
    ]);

    const elements = buildElements();
    installSearchSavedBridge(elements);
    elements.participantSelect.id = "search-participant";
    document.body.appendChild(elements.participantSelect);
    globalThis.PrimeVue = { Select: { name: "PrimeSelectStub" } };
    const bridgeVueRuntime = {
      h,
      reactive(value) {
        return value;
      },
      createApp(root) {
        return {
          use() {
            return this;
          },
          mount(container) {
            const vnode = root.render();
            container.innerHTML = `<div class="p-select" data-runtime="${String(vnode?.props?.["data-ui-runtime"] || "")}"></div>`;
          },
        };
      },
      render,
      Fragment,
    };

    const controller = createSearchController({ elements, options: { vueRuntime: bridgeVueRuntime } });
    controller.init();
    controller.populateParticipants();
    elements.participantSelect.value = "";
    syncPrimeSelectBridgeById({
      ownerDocument: document,
      bridgeId: "search-participant",
      value: "Ben",
    });

    elements.form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await Promise.resolve();

    expect(getSearchState().query.participant).toBe("Ben");
  });
});
