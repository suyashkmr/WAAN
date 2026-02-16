import { describe, it, expect, vi, afterEach } from "vitest";
import { createSavedViewsController } from "../js/savedViews.js";

function buildElements() {
  const nameInput = document.createElement("input");
  nameInput.placeholder = "Name this view";
  const saveButton = document.createElement("button");
  const listSelect = document.createElement("select");
  const applyButton = document.createElement("button");
  const deleteButton = document.createElement("button");
  const gallery = document.createElement("div");
  const compareSelectA = document.createElement("select");
  const compareSelectB = document.createElement("select");
  const compareButton = document.createElement("button");
  const compareSummaryEl = document.createElement("div");
  const rangeSelect = document.createElement("select");
  const customStartInput = document.createElement("input");
  const customEndInput = document.createElement("input");

  return {
    nameInput,
    saveButton,
    listSelect,
    applyButton,
    deleteButton,
    gallery,
    compareSelectA,
    compareSelectB,
    compareButton,
    compareSummaryEl,
    rangeSelect,
    customStartInput,
    customEndInput,
  };
}

function buildDependencies() {
  const views = [];
  let compareSelection = { primary: null, secondary: null };

  return {
    getDatasetEntries: vi.fn(() => [
      { type: "message", sender: "Ana", message: "hello", timestamp: "2025-01-01T10:00:00Z" },
    ]),
    getDatasetAnalytics: vi.fn(() => ({
      total_messages: 1,
      unique_senders: 1,
      system_summary: { count: 0 },
      averages: { words: 2, characters: 10 },
      weekly_summary: { averagePerWeek: 1 },
      hourly_summary: { averagePerDay: 1 },
      date_range: { start: "2025-01-01", end: "2025-01-01" },
      top_senders: [{ sender: "Ana", count: 1, share: 1 }],
    })),
    getDatasetLabel: vi.fn(() => "Demo"),
    getCurrentRange: vi.fn(() => "all"),
    getCustomRange: vi.fn(() => null),
    setCurrentRange: vi.fn(),
    setCustomRange: vi.fn(),
    showCustomControls: vi.fn(),
    addSavedView: vi.fn(view => {
      const record = { ...view, id: view.id || `view-${views.length + 1}` };
      views.push(record);
      return record;
    }),
    getSavedViews: vi.fn(() => views.slice()),
    updateSavedView: vi.fn((id, updates) => {
      const index = views.findIndex(view => view.id === id);
      if (index === -1) return null;
      views[index] = { ...views[index], ...(updates || {}) };
      return views[index];
    }),
    removeSavedView: vi.fn(id => {
      const index = views.findIndex(view => view.id === id);
      if (index === -1) return false;
      views.splice(index, 1);
      return true;
    }),
    clearSavedViews: vi.fn(() => {
      views.length = 0;
      compareSelection = { primary: null, secondary: null };
    }),
    getCompareSelection: vi.fn(() => ({ ...compareSelection })),
    setCompareSelection: vi.fn((primary, secondary) => {
      compareSelection = { primary: primary ?? null, secondary: secondary ?? null };
    }),
    getHourlyState: vi.fn(() => ({
      filters: { weekdays: true, weekends: true, working: true, offhours: true },
      brush: { start: 0, end: 23 },
    })),
    updateHourlyState: vi.fn(),
    getWeekdayState: vi.fn(() => ({
      filters: { weekdays: true, weekends: true, working: true, offhours: true },
      brush: { start: 0, end: 23 },
    })),
    updateWeekdayState: vi.fn(),
    applyRangeAndRender: vi.fn(async () => {}),
    ensureDayFilters: vi.fn(),
    ensureHourFilters: vi.fn(),
    syncHourlyControlsWithState: vi.fn(),
    ensureWeekdayDayFilters: vi.fn(),
    ensureWeekdayHourFilters: vi.fn(),
    syncWeekdayControlsWithState: vi.fn(),
    describeRange: vi.fn(() => "entire history"),
    updateStatus: vi.fn(),
    filterEntriesByRange: vi.fn(entries => entries),
    normalizeRangeValue: vi.fn(value => value),
  };
}

describe("savedViews controller", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("disables controls when no dataset is available", () => {
    const elements = buildElements();
    const dependencies = buildDependencies();
    const controller = createSavedViewsController({ elements, dependencies });

    controller.init();
    controller.setDataAvailability(false);

    expect(elements.nameInput.disabled).toBe(true);
    expect(elements.saveButton.disabled).toBe(true);
    expect(elements.nameInput.placeholder).toBe("Load a chat first");
  });

  it("saves, applies, and deletes a view via UI handlers", async () => {
    const elements = buildElements();
    const dependencies = buildDependencies();
    const controller = createSavedViewsController({ elements, dependencies });

    controller.init();
    controller.setDataAvailability(true);

    elements.nameInput.value = "Baseline";
    elements.saveButton.click();

    expect(dependencies.addSavedView).toHaveBeenCalledTimes(1);
    expect(elements.listSelect.options.length).toBeGreaterThan(1);
    expect(dependencies.updateStatus).toHaveBeenCalledWith('Saved view "Baseline".', "success");

    elements.listSelect.value = "view-1";
    await Promise.resolve(elements.applyButton.click());
    await Promise.resolve();

    expect(dependencies.applyRangeAndRender).toHaveBeenCalledWith("all");
    expect(dependencies.updateStatus).toHaveBeenCalledWith('Applied saved view "Baseline".', "success");

    elements.deleteButton.click();
    expect(dependencies.removeSavedView).toHaveBeenCalledWith("view-1");
    expect(dependencies.updateStatus).toHaveBeenCalledWith("Saved view removed.", "success");
  });

  it("resets saved views when dataset changes", () => {
    const elements = buildElements();
    const dependencies = buildDependencies();
    const controller = createSavedViewsController({ elements, dependencies });

    controller.init();
    controller.resetForNewDataset();

    expect(dependencies.clearSavedViews).toHaveBeenCalledTimes(1);
    expect(elements.gallery.textContent).toContain("Save views to see quick previews here.");
  });
});
