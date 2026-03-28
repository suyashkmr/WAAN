import { describe, it, expect, vi, afterEach } from "vitest";
import { installAppTestRuntime } from "../js/appShell/testRuntime.js";

describe("appShell test runtime", () => {
  afterEach(() => {
    delete globalThis.__WAAN_TEST_RUNTIME__;
    vi.restoreAllMocks();
  });

  it("does not install the seeded dataset runtime outside test mode", () => {
    const stateStore = {};
    const globalScope = { navigator: { webdriver: false } };

    const runtime = installAppTestRuntime({
      globalScope,
      stateStore,
    });

    expect(runtime).toBeNull();
    expect(globalScope.__WAAN_TEST_RUNTIME__).toBeUndefined();
  });

  it("seedDataset mutates state and triggers the dashboard/search runtime hooks", () => {
    const stateStore = {
      setDatasetEntries: vi.fn(),
      setDatasetAnalytics: vi.fn(),
      setDatasetLabel: vi.fn(),
      setCurrentRange: vi.fn(),
      setActiveChatId: vi.fn(),
      setDatasetFingerprint: vi.fn(),
      computeDatasetFingerprint: vi.fn(() => "fp-seeded"),
    };
    const uiRuntime = {
      renderDashboard: vi.fn(),
      updateCustomRangeBounds: vi.fn(),
      populateSearchParticipants: vi.fn(),
      renderSearchResults: vi.fn(),
    };
    const globalScope = { navigator: { webdriver: true } };

    const runtime = installAppTestRuntime({
      globalScope,
      stateStore,
      uiRuntime,
    });

    const analytics = runtime.seedDataset({
      entries: [{ message: "hello", timestamp: "2026-03-01T09:00:00.000Z" }],
      analytics: { total_messages: 1 },
      datasetLabel: "seeded demo",
      selectionValue: "remote:seeded-demo",
    });

    expect(analytics).toEqual({ total_messages: 1 });
    expect(stateStore.setDatasetEntries).toHaveBeenCalledWith([
      { message: "hello", timestamp: "2026-03-01T09:00:00.000Z" },
    ]);
    expect(stateStore.setDatasetAnalytics).toHaveBeenCalledWith({ total_messages: 1 });
    expect(stateStore.setDatasetLabel).toHaveBeenCalledWith("seeded demo");
    expect(stateStore.setCurrentRange).toHaveBeenCalledWith("all");
    expect(stateStore.setActiveChatId).toHaveBeenCalledWith("remote:seeded-demo");
    expect(stateStore.setDatasetFingerprint).toHaveBeenCalledWith("fp-seeded");
    expect(uiRuntime.populateSearchParticipants).toHaveBeenCalledTimes(1);
    expect(uiRuntime.renderDashboard).toHaveBeenCalledWith({ total_messages: 1 });
    expect(uiRuntime.updateCustomRangeBounds).toHaveBeenCalledTimes(1);
    expect(uiRuntime.renderSearchResults).toHaveBeenCalledTimes(1);
    expect(globalScope.__WAAN_TEST_RUNTIME__).toBe(runtime);
  });
});
