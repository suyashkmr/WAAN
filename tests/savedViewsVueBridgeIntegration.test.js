import { afterEach, describe, expect, it, vi } from "vitest";
import { Fragment, h, render } from "vue";
import { createSavedViewsController } from "../js/savedViews.js";
import { mountSearchSavedBridge } from "../js/vue/searchSavedIsland.js";
import { clearVueBridgeRuntime } from "./vueBridgeTestUtils.js";

function buildElements() {
  const nameInput = document.createElement("input");
  nameInput.id = "saved-view-name";
  nameInput.placeholder = "Name this view";
  const saveButton = document.createElement("button");
  const listSelect = document.createElement("select");
  const applyButton = document.createElement("button");
  const deleteButton = document.createElement("button");
  const gallery = document.createElement("div");
  gallery.id = "saved-view-gallery";
  const compareSelectA = document.createElement("select");
  const compareSelectB = document.createElement("select");
  const compareButton = document.createElement("button");
  const compareSummaryEl = document.createElement("div");
  compareSummaryEl.id = "compare-summary";
  const rangeSelect = document.createElement("select");
  const customStartInput = document.createElement("input");
  const customEndInput = document.createElement("input");

  document.body.append(gallery, compareSummaryEl);

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
    vueRuntime: { h, render, Fragment },
  };
}

describe("savedViews Vue bridge integration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearVueBridgeRuntime();
    delete globalThis.Vue;
    document.body.innerHTML = "";
  });

  it("renders Vue empty-state actions and handles save via rendered panel action", () => {
    const elements = buildElements();
    const dependencies = buildDependencies();
    globalThis.Vue = { h, render, Fragment };
    mountSearchSavedBridge();

    const controller = createSavedViewsController({ elements, dependencies });
    controller.init();
    controller.setDataAvailability(true);

    const saveAction = elements.gallery.querySelector('[data-panel-action="save-view"]');
    expect(saveAction).toBeTruthy();
    saveAction?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(dependencies.addSavedView).toHaveBeenCalledTimes(1);
    expect(dependencies.updateStatus).toHaveBeenCalledWith(expect.stringContaining('Saved view "'), "success");
  });

  it("renders Vue gallery cards and applies views from card click dispatch", async () => {
    const elements = buildElements();
    const dependencies = buildDependencies();
    globalThis.Vue = { h, render, Fragment };
    mountSearchSavedBridge();

    const controller = createSavedViewsController({ elements, dependencies });
    controller.init();
    controller.setDataAvailability(true);

    elements.nameInput.value = "Vue Card View";
    elements.saveButton.click();

    const card = elements.gallery.querySelector(".saved-view-card");
    expect(card).toBeTruthy();
    card?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();

    expect(dependencies.applyRangeAndRender).toHaveBeenCalledWith("all");
    expect(dependencies.updateStatus).toHaveBeenCalledWith('Applied saved view "Vue Card View".', "success");
  });
});
