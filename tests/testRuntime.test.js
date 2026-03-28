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
      datasetLabel: "seeded demo",
      selectionValue: "remote:seeded-demo",
    });

    expect(analytics.total_messages).toBe(1);
    expect(analytics.date_range).toEqual({ start: "2026-03-01", end: "2026-03-01" });
    expect(analytics.weekly_summary).toBeTruthy();
    expect(analytics.message_types.summary).toEqual([]);
    expect(stateStore.setDatasetEntries).toHaveBeenCalledWith([
      {
        type: "message",
        sender: "Unknown",
        sender_id: "Unknown",
        message: "hello",
        timestamp: "2026-03-01T09:00:00.000Z",
        timestamp_text: "",
      },
    ]);
    expect(stateStore.setDatasetAnalytics).toHaveBeenCalledWith(analytics);
    expect(stateStore.setDatasetLabel).toHaveBeenCalledWith("seeded demo");
    expect(stateStore.setCurrentRange).toHaveBeenCalledWith("all");
    expect(stateStore.setActiveChatId).toHaveBeenCalledWith("remote:seeded-demo");
    expect(stateStore.setDatasetFingerprint).toHaveBeenCalledWith("fp-seeded");
    expect(uiRuntime.populateSearchParticipants).toHaveBeenCalledTimes(1);
    expect(uiRuntime.renderDashboard).toHaveBeenCalledWith(analytics);
    expect(uiRuntime.updateCustomRangeBounds).toHaveBeenCalledTimes(1);
    expect(uiRuntime.renderSearchResults).toHaveBeenCalledTimes(1);
    expect(analytics.unique_senders).toBe(1);
    expect(globalScope.__WAAN_TEST_RUNTIME__).toBe(runtime);
  });

  it("merges caller analytics overrides on top of the computed payload", () => {
    const stateStore = {
      setDatasetEntries: vi.fn(),
      setDatasetAnalytics: vi.fn(),
      setDatasetLabel: vi.fn(),
      setCurrentRange: vi.fn(),
      setActiveChatId: vi.fn(),
    };
    const uiRuntime = {
      renderDashboard: vi.fn(),
    };
    const globalScope = { navigator: { webdriver: true } };

    const runtime = installAppTestRuntime({
      globalScope,
      stateStore,
      uiRuntime,
    });

    const analytics = { total_messages: 99, weekly_summary: { weekCount: 7 } };
    const seededAnalytics = runtime.seedDataset({
      entries: [{ type: "message", sender: "Alice", timestamp: "2026-03-01T09:00:00.000Z" }],
      analytics,
    });

    expect(seededAnalytics).not.toBe(analytics);
    expect(seededAnalytics.total_messages).toBe(99);
    expect(seededAnalytics.weekly_summary).toEqual(expect.objectContaining({ weekCount: 7 }));
    expect(seededAnalytics.date_range).toEqual({ start: "2026-03-01", end: "2026-03-01" });
    expect(stateStore.setDatasetAnalytics).toHaveBeenCalledWith(seededAnalytics);
    expect(uiRuntime.renderDashboard).toHaveBeenCalledWith(seededAnalytics);
  });

  it("preserves computed required fields when the caller overrides only selected slices", () => {
    const stateStore = {
      setDatasetEntries: vi.fn(),
      setDatasetAnalytics: vi.fn(),
      setDatasetLabel: vi.fn(),
      setCurrentRange: vi.fn(),
    };
    const globalScope = { navigator: { webdriver: true } };

    const runtime = installAppTestRuntime({
      globalScope,
      stateStore,
    });

    const analytics = {
      daily_counts: [{ date: "2026-03-01", count: 7 }],
      weekly_counts: [{ week: "2026-W09", count: 7 }],
    };
    const seededAnalytics = runtime.seedDataset({
      entries: [{
        type: "message",
        sender: "Alice",
        message: "Complete seeded row",
        timestamp: "2026-03-01T09:00:00.000Z",
      }],
      analytics,
    });

    expect(seededAnalytics.daily_counts).toEqual([{ date: "2026-03-01", count: 7 }]);
    expect(seededAnalytics.weekly_counts).toEqual([{ week: "2026-W09", count: 7 }]);
    expect(seededAnalytics.total_messages).toBe(1);
    expect(seededAnalytics.date_range).toEqual({ start: "2026-03-01", end: "2026-03-01" });
    expect(seededAnalytics.weekly_summary).toBeTruthy();
    expect(stateStore.setDatasetAnalytics).toHaveBeenCalledWith(seededAnalytics);
  });

  it("drops non-object placeholder rows and merges overrides onto an empty analytics base", () => {
    const stateStore = {
      setDatasetEntries: vi.fn(),
      setDatasetAnalytics: vi.fn(),
      setDatasetLabel: vi.fn(),
      setCurrentRange: vi.fn(),
    };
    const uiRuntime = {
      renderDashboard: vi.fn(),
    };
    const globalScope = { navigator: { webdriver: true } };

    const runtime = installAppTestRuntime({
      globalScope,
      stateStore,
      uiRuntime,
    });

    const analytics = { total_messages: 5, weekly_summary: { weekCount: 2 } };
    const seededAnalytics = runtime.seedDataset({
      entries: [null, { message: {} }],
      analytics,
    });

    expect(seededAnalytics).not.toBe(analytics);
    expect(seededAnalytics.total_messages).toBe(5);
    expect(seededAnalytics.weekly_summary).toEqual(expect.objectContaining({ weekCount: 2 }));
    expect(seededAnalytics.date_range).toEqual({ start: null, end: null });
    expect(stateStore.setDatasetEntries).toHaveBeenCalledWith([
      {
        type: "message",
        sender: "Unknown",
        sender_id: "Unknown",
        message: {},
        timestamp: null,
        timestamp_text: "",
      },
    ]);
    expect(stateStore.setDatasetAnalytics).toHaveBeenCalledWith(seededAnalytics);
    expect(uiRuntime.renderDashboard).toHaveBeenCalledWith(seededAnalytics);
  });

  it("returns an empty analytics payload for incomplete object fixtures without overrides", () => {
    const stateStore = {
      setDatasetEntries: vi.fn(),
      setDatasetAnalytics: vi.fn(),
      setDatasetLabel: vi.fn(),
      setCurrentRange: vi.fn(),
    };
    const uiRuntime = {
      renderDashboard: vi.fn(),
    };
    const globalScope = { navigator: { webdriver: true } };

    const runtime = installAppTestRuntime({
      globalScope,
      stateStore,
      uiRuntime,
    });

    const seededAnalytics = runtime.seedDataset({
      entries: [{ message: {} }],
    });

    expect(seededAnalytics).toBeTruthy();
    expect(seededAnalytics.sentiment).toBeTruthy();
    expect(seededAnalytics.message_types).toBeTruthy();
    expect(seededAnalytics.date_range).toEqual({ start: null, end: null });
    expect(uiRuntime.renderDashboard).toHaveBeenCalledWith(seededAnalytics);
  });

  it("preserves analytics for valid rows in mixed fixtures with malformed objects", () => {
    const stateStore = {
      setDatasetEntries: vi.fn(),
      setDatasetAnalytics: vi.fn(),
      setDatasetLabel: vi.fn(),
      setCurrentRange: vi.fn(),
    };
    const uiRuntime = {
      renderDashboard: vi.fn(),
    };
    const globalScope = { navigator: { webdriver: true } };

    const runtime = installAppTestRuntime({
      globalScope,
      stateStore,
      uiRuntime,
    });

    const seededAnalytics = runtime.seedDataset({
      entries: [
        { message: "hello", timestamp: "2026-03-01T09:00:00.000Z" },
        { message: {} },
      ],
    });

    expect(seededAnalytics.total_messages).toBe(1);
    expect(seededAnalytics.unique_senders).toBe(1);
    expect(seededAnalytics.date_range).toEqual({ start: "2026-03-01", end: "2026-03-01" });
    expect(stateStore.setDatasetEntries).toHaveBeenCalledWith([
      {
        type: "message",
        sender: "Unknown",
        sender_id: "Unknown",
        message: "hello",
        timestamp: "2026-03-01T09:00:00.000Z",
        timestamp_text: "",
      },
      {
        type: "message",
        sender: "Unknown",
        sender_id: "Unknown",
        message: {},
        timestamp: null,
        timestamp_text: "",
      },
    ]);
    expect(uiRuntime.renderDashboard).toHaveBeenCalledWith(seededAnalytics);
  });

  it("fills fallback fields for untyped fixtures even when they explicitly contain undefined values", () => {
    const stateStore = {
      setDatasetEntries: vi.fn(),
      setDatasetAnalytics: vi.fn(),
      setDatasetLabel: vi.fn(),
      setCurrentRange: vi.fn(),
    };
    const globalScope = { navigator: { webdriver: true } };

    const runtime = installAppTestRuntime({
      globalScope,
      stateStore,
    });

    runtime.seedDataset({
      entries: [{ sender: undefined, message: undefined, timestamp: "2026-03-01T09:00:00.000Z" }],
    });

    expect(stateStore.setDatasetEntries).toHaveBeenCalledWith([
      {
        type: "message",
        sender: "Unknown",
        sender_id: "Unknown",
        message: "",
        timestamp: "2026-03-01T09:00:00.000Z",
        timestamp_text: "",
      },
    ]);
  });

  it("fills fallback fields for typed lightweight message fixtures too", () => {
    const stateStore = {
      setDatasetEntries: vi.fn(),
      setDatasetAnalytics: vi.fn(),
      setDatasetLabel: vi.fn(),
      setCurrentRange: vi.fn(),
    };
    const globalScope = { navigator: { webdriver: true } };

    const runtime = installAppTestRuntime({
      globalScope,
      stateStore,
    });

    const analytics = runtime.seedDataset({
      entries: [{ type: "message", sender: "Alice", timestamp: "2026-03-01T09:00:00.000Z" }],
    });

    expect(stateStore.setDatasetEntries).toHaveBeenCalledWith([
      {
        type: "message",
        sender: "Alice",
        sender_id: "Alice",
        message: "",
        timestamp: "2026-03-01T09:00:00.000Z",
        timestamp_text: "",
      },
    ]);
    expect(analytics.total_messages).toBe(1);
  });

  it("preserves lightweight untyped system rows as system events", () => {
    const stateStore = {
      setDatasetEntries: vi.fn(),
      setDatasetAnalytics: vi.fn(),
      setDatasetLabel: vi.fn(),
      setCurrentRange: vi.fn(),
    };
    const globalScope = { navigator: { webdriver: true } };

    const runtime = installAppTestRuntime({
      globalScope,
      stateStore,
    });

    const analytics = runtime.seedDataset({
      entries: [{
        sender: "System",
        message: "Bob joined",
        timestamp: "2026-03-01T09:00:00.000Z",
        system_subtype: "join",
      }],
    });

    expect(stateStore.setDatasetEntries).toHaveBeenCalledWith([
      {
        type: "system",
        sender: "System",
        sender_id: null,
        message: "Bob joined",
        timestamp: "2026-03-01T09:00:00.000Z",
        timestamp_text: "",
        system_subtype: "join",
      },
    ]);
    expect(analytics.total_system).toBe(1);
    expect(analytics.total_messages).toBe(0);
  });

  it("treats untyped rows with explicit system metadata as system events", () => {
    const stateStore = {
      setDatasetEntries: vi.fn(),
      setDatasetAnalytics: vi.fn(),
      setDatasetLabel: vi.fn(),
      setCurrentRange: vi.fn(),
    };
    const globalScope = { navigator: { webdriver: true } };

    const runtime = installAppTestRuntime({
      globalScope,
      stateStore,
    });

    const analytics = runtime.seedDataset({
      entries: [{
        message: "Bob joined",
        timestamp: "2026-03-01T09:00:00.000Z",
        system_subtype: "join",
      }],
    });

    expect(stateStore.setDatasetEntries).toHaveBeenCalledWith([
      {
        type: "system",
        sender: "System",
        sender_id: null,
        message: "Bob joined",
        timestamp: "2026-03-01T09:00:00.000Z",
        timestamp_text: "",
        system_subtype: "join",
      },
    ]);
    expect(analytics.total_system).toBe(1);
    expect(analytics.total_messages).toBe(0);
  });

  it("preserves explicit system sender ids for participant identity resolution", () => {
    const stateStore = {
      setDatasetEntries: vi.fn(),
      setDatasetAnalytics: vi.fn(),
      setDatasetLabel: vi.fn(),
      setCurrentRange: vi.fn(),
    };
    const globalScope = { navigator: { webdriver: true } };

    const runtime = installAppTestRuntime({
      globalScope,
      stateStore,
    });

    runtime.seedDataset({
      entries: [{
        type: "system",
        sender: "Alice",
        sender_id: "alice@c.us",
        message: "Alice joined",
        timestamp: "2026-03-01T09:00:00.000Z",
        system_subtype: "join",
      }],
    });

    expect(stateStore.setDatasetEntries).toHaveBeenCalledWith([
      {
        type: "system",
        sender: "Alice",
        sender_id: "alice@c.us",
        message: "Alice joined",
        timestamp: "2026-03-01T09:00:00.000Z",
        timestamp_text: "",
        system_subtype: "join",
      },
    ]);
  });

  it("keeps senderless lightweight rows as messages unless they carry explicit system metadata", () => {
    const stateStore = {
      setDatasetEntries: vi.fn(),
      setDatasetAnalytics: vi.fn(),
      setDatasetLabel: vi.fn(),
      setCurrentRange: vi.fn(),
    };
    const globalScope = { navigator: { webdriver: true } };

    const runtime = installAppTestRuntime({
      globalScope,
      stateStore,
    });

    const analytics = runtime.seedDataset({
      entries: [{
        message: "changed the plan",
        timestamp: "2026-03-01T09:00:00.000Z",
      }],
    });

    expect(stateStore.setDatasetEntries).toHaveBeenCalledWith([
      {
        type: "message",
        sender: "Unknown",
        sender_id: "Unknown",
        message: "changed the plan",
        timestamp: "2026-03-01T09:00:00.000Z",
        timestamp_text: "",
      },
    ]);
    expect(analytics.total_system).toBe(0);
    expect(analytics.total_messages).toBe(1);
    expect(analytics.unique_senders).toBe(1);
  });

  it("does not reclassify a participant literally named System without explicit system metadata", () => {
    const stateStore = {
      setDatasetEntries: vi.fn(),
      setDatasetAnalytics: vi.fn(),
      setDatasetLabel: vi.fn(),
      setCurrentRange: vi.fn(),
    };
    const globalScope = { navigator: { webdriver: true } };

    const runtime = installAppTestRuntime({
      globalScope,
      stateStore,
    });

    const analytics = runtime.seedDataset({
      entries: [{
        sender: "System",
        message: "I changed the plan",
        timestamp: "2026-03-01T09:00:00.000Z",
      }],
    });

    expect(stateStore.setDatasetEntries).toHaveBeenCalledWith([
      {
        type: "message",
        sender: "System",
        sender_id: "System",
        message: "I changed the plan",
        timestamp: "2026-03-01T09:00:00.000Z",
        timestamp_text: "",
      },
    ]);
    expect(analytics.total_system).toBe(0);
    expect(analytics.total_messages).toBe(1);
  });
});
