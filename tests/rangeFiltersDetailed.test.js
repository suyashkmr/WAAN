import { describe, it, expect, vi } from "vitest";
import { createRangeFiltersController } from "../js/appShell/rangeFilters.js";

function buildRangeController(overrides = {}) {
  const rangeSelect = document.createElement("select");
  ["", "all", "7", "custom"].forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    rangeSelect.appendChild(option);
  });

  const customControls = document.createElement("div");
  const customStartInput = document.createElement("input");
  const customEndInput = document.createElement("input");
  const customApplyButton = document.createElement("button");
  const searchStartInput = document.createElement("input");
  const searchEndInput = document.createElement("input");

  let entries = overrides.entries ?? [];
  let customRange = overrides.customRange ?? null;
  let currentRange = "all";
  let datasetAnalytics = null;
  let token = 0;
  const cache = new Map();

  const deps = {
    getDatasetEntries: () => entries,
    getDatasetLabel: () => "Demo",
    setCurrentRange: vi.fn(value => {
      currentRange = value;
    }),
    setCustomRange: vi.fn(value => {
      customRange = value;
    }),
    getCustomRange: () => customRange,
    getCachedAnalytics: key => cache.get(key) ?? null,
    setCachedAnalytics: (key, value) => cache.set(key, value),
    setDatasetAnalytics: vi.fn(value => {
      datasetAnalytics = value;
    }),
    renderDashboard: vi.fn(),
    computeAnalyticsWithWorker: vi.fn(async filtered => ({ total_messages: filtered.length })),
    updateStatus: vi.fn(),
    formatNumber: value => String(value),
    formatDisplayDate: value => String(value ?? ""),
    getTimestamp: entry => (entry?.timestamp ? new Date(entry.timestamp) : null),
    toISODate: date => new Date(date).toISOString().slice(0, 10),
    onRangeApplied: vi.fn(),
    nextAnalyticsRequestToken: () => {
      token += 1;
      return token;
    },
    isAnalyticsRequestCurrent: current => current === token,
    ...overrides.deps,
  };

  const controller = createRangeFiltersController({
    elements: {
      rangeSelect,
      customControls,
      customStartInput,
      customEndInput,
      customApplyButton,
      searchStartInput,
      searchEndInput,
      ...overrides.elements,
    },
    deps,
  });

  return {
    controller,
    deps,
    cache,
    rangeSelect,
    customControls,
    customStartInput,
    customEndInput,
    customApplyButton,
    searchStartInput,
    searchEndInput,
    getCurrentRange: () => currentRange,
    getCustomRange: () => customRange,
    getDatasetAnalytics: () => datasetAnalytics,
    setEntries: value => {
      entries = value;
    },
  };
}

describe("rangeFilters detailed", () => {
  it("covers normalize/build/describe helper branches", () => {
    const { controller } = buildRangeController();

    expect(controller.normalizeRangeValue(null)).toBe("all");
    expect(controller.normalizeRangeValue("7")).toBe("7");
    expect(controller.normalizeRangeValue({ type: "custom", start: "2025-01-01" })).toEqual({
      type: "custom",
      start: "2025-01-01",
      end: null,
    });

    const opaque = { x: 1 };
    expect(controller.normalizeRangeValue(opaque)).toBe(opaque);
    expect(controller.buildRangeKey("all")).toBe("all");
    expect(controller.buildRangeKey("7")).toBe("days:7");
    expect(controller.buildRangeKey({ type: "custom", start: "a", end: "b" })).toBe("custom:a|b");
    expect(controller.buildRangeKey({ x: 1 })).toBe('range:{"x":1}');

    expect(controller.describeRange("all")).toBe("entire history");
    expect(controller.describeRange({ type: "custom", start: "S", end: "E" })).toBe("S -> E");
    expect(controller.describeRange("7")).toBe("last 7 days");
    expect(controller.describeRange("oops")).toBe("oops");
  });

  it("handles updateCustomRangeBounds for no timestamps and preserved custom value", () => {
    const ctx = buildRangeController({
      entries: [{ timestamp: null }, { sender: "Ana" }],
    });

    ctx.controller.updateCustomRangeBounds();
    expect(ctx.customStartInput.disabled).toBe(true);
    expect(ctx.customEndInput.disabled).toBe(true);

    ctx.setEntries([
      { timestamp: "2025-01-01T02:00:00Z" },
      { timestamp: "2025-01-03T03:00:00Z" },
    ]);

    ctx.controller.updateCustomRangeBounds();
    expect(ctx.customStartInput.value).toBe("2025-01-01");
    expect(ctx.customEndInput.value).toBe("2025-01-03");

    ctx.deps.setCustomRange({ type: "custom", start: "2025-01-02", end: "2025-01-03" });
    ctx.customStartInput.value = "2025-01-02";
    ctx.customEndInput.value = "2025-01-03";
    ctx.controller.updateCustomRangeBounds();
    expect(ctx.customStartInput.value).toBe("2025-01-02");
    expect(ctx.customEndInput.value).toBe("2025-01-03");
  });

  it("covers empty entries, stale cached request, and compute error paths", async () => {
    const staleCtx = buildRangeController({ entries: [] });
    await staleCtx.controller.applyRangeAndRender("7");
    expect(staleCtx.deps.updateStatus).toHaveBeenCalledWith(
      "Load a chat file before picking a range.",
      "warning",
    );

    const ctx = buildRangeController({
      entries: [{ timestamp: "2025-01-01T00:00:00Z" }],
      deps: {
        isAnalyticsRequestCurrent: vi.fn(() => false),
      },
    });
    ctx.cache.set("days:7", { total_messages: 3 });
    await ctx.controller.applyRangeAndRender("7");
    expect(ctx.deps.setDatasetAnalytics).not.toHaveBeenCalled();

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const errorCtx = buildRangeController({
      entries: [{ timestamp: "2025-01-01T00:00:00Z" }],
      deps: {
        computeAnalyticsWithWorker: vi.fn(async () => {
          throw new Error("worker failed");
        }),
      },
    });
    await errorCtx.controller.applyRangeAndRender("7");
    expect(errorCtx.deps.updateStatus).toHaveBeenCalledWith(
      "We couldn't calculate stats for this range.",
      "error",
    );
    errorSpy.mockRestore();
  });

  it("covers range-change early return and applyCustomRange validation/success", async () => {
    const ctx = buildRangeController({ entries: [{ timestamp: "2025-01-01T00:00:00Z" }] });

    ctx.rangeSelect.value = "";
    await ctx.controller.handleRangeChange();
    expect(ctx.deps.setCurrentRange).not.toHaveBeenCalled();

    await ctx.controller.applyCustomRange("bad", "2025-01-02");
    expect(ctx.getCurrentRange()).toBe("custom");
    expect(ctx.getCustomRange()).toEqual({ type: "custom", start: "bad", end: "2025-01-02" });

    await ctx.controller.applyCustomRange("2025-01-01", "2025-01-02");
    expect(ctx.getCurrentRange()).toBe("custom");
    expect(ctx.getCustomRange()).toEqual({ type: "custom", start: "2025-01-01", end: "2025-01-02" });
    expect(ctx.rangeSelect.value).toBe("custom");
    expect(ctx.customControls.classList.contains("hidden")).toBe(false);
  });
});
