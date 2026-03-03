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

function installSavedViewsBridge(elements) {
  /** @type {Record<string, Function>} */
  let panelActionHandlers = {};
  globalThis.__WAAN_VUE_SEARCH_SAVED_BRIDGE__ = {
    setPanelActionHandlers: vi.fn(handlers => {
      panelActionHandlers = {
        ...panelActionHandlers,
        ...(handlers || {}),
      };
      return true;
    }),
    renderSavedViewsPanelState: vi.fn(payload => {
      const { tone = "empty", title = "", message = "", actions = [] } = payload || {};
      elements.gallery.innerHTML = "";
      const panel = document.createElement("div");
      panel.className = `panel-state panel-state--${tone}`;
      panel.textContent = `${title} ${message}`.trim();
      elements.gallery.appendChild(panel);
      actions.forEach(action => {
        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute("data-panel-action", action.id || "");
        button.textContent = action.label || "Action";
        button.addEventListener("click", () => panelActionHandlers[`savedViews:${action.id}`]?.());
        elements.gallery.appendChild(button);
      });
      return true;
    }),
    renderSavedViewsGallery: vi.fn(payload => {
      const cards = Array.isArray(payload?.cards) ? payload.cards : [];
      elements.gallery.innerHTML = "";
      cards.forEach(card => {
        const article = document.createElement("article");
        article.className = "saved-view-card";
        if (card?.isActive) article.classList.add("is-active");
        if (card?.isDirty) article.classList.add("is-dirty");
        article.dataset.viewId = card?.viewId || "";
        article.textContent = [
          card?.viewName || "",
          card?.isActive ? "Active" : "",
          card?.isDirty ? "Unsaved changes" : "",
          card?.recencyHint || "",
        ].join(" ").trim();
        article.addEventListener("click", () => panelActionHandlers["savedViews:apply-view"]?.("savedViews:apply-view", { viewId: card?.viewId }));
        elements.gallery.appendChild(article);
      });
      elements.gallery.dataset.galleryActionsBound = "true";
      return true;
    }),
    renderSavedViewsComparison: vi.fn(() => true),
  };
}

describe("savedViews controller", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete globalThis.__WAAN_VUE_SEARCH_SAVED_BRIDGE__;
  });

  it("disables controls when no dataset is available", () => {
    const elements = buildElements();
    installSavedViewsBridge(elements);
    const dependencies = buildDependencies();
    const controller = createSavedViewsController({ elements, dependencies });

    controller.init();
    controller.setDataAvailability(false);

    expect(elements.nameInput.disabled).toBe(true);
    expect(elements.saveButton.disabled).toBe(true);
    expect(elements.nameInput.placeholder).toBe("Load a chat first");
    expect(elements.gallery.querySelector(".panel-state--loading")).toBeTruthy();
  });

  it("saves, applies, and deletes a view via UI handlers", async () => {
    const elements = buildElements();
    installSavedViewsBridge(elements);
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
    installSavedViewsBridge(elements);
    const dependencies = buildDependencies();
    const controller = createSavedViewsController({ elements, dependencies });

    controller.init();
    controller.setDataAvailability(false);
    controller.resetForNewDataset();

    expect(dependencies.clearSavedViews).toHaveBeenCalledTimes(1);
    expect(elements.gallery.textContent).toContain("Load a chat to use saved views");
  });

  it("shows empty gallery recovery actions when data is available", () => {
    const elements = buildElements();
    installSavedViewsBridge(elements);
    const dependencies = buildDependencies();
    const controller = createSavedViewsController({ elements, dependencies });

    controller.init();
    controller.setDataAvailability(true);

    const action = elements.gallery.querySelector('[data-panel-action="save-view"]');
    expect(action).toBeTruthy();
    action?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(dependencies.addSavedView).toHaveBeenCalledTimes(1);
  });

  it("delegates empty saved-view gallery state rendering to Vue search/saved bridge when available", () => {
    const elements = buildElements();
    elements.gallery.id = "saved-view-gallery";
    document.body.appendChild(elements.gallery);
    const dependencies = buildDependencies();
    const bridgeSpy = vi.fn(() => true);
    globalThis.__WAAN_VUE_SEARCH_SAVED_BRIDGE__ = {
      renderSavedViewsPanelState: bridgeSpy,
    };
    const controller = createSavedViewsController({ elements, dependencies });

    controller.init();
    controller.setDataAvailability(false);

    expect(bridgeSpy).toHaveBeenCalled();
    const payload = bridgeSpy.mock.calls.at(-1)?.[0];
    expect(payload?.title).toContain("Load a chat");
    expect(elements.gallery.querySelector(".panel-state")).toBeNull();
  });

  it("delegates populated gallery and comparison rendering to Vue search/saved bridge when available", () => {
    const elements = buildElements();
    const dependencies = buildDependencies();
    const gallerySpy = vi.fn(() => true);
    const comparisonSpy = vi.fn(() => true);
    globalThis.__WAAN_VUE_SEARCH_SAVED_BRIDGE__ = {
      renderSavedViewsGallery: gallerySpy,
      renderSavedViewsComparison: comparisonSpy,
    };
    const controller = createSavedViewsController({ elements, dependencies });

    controller.init();
    controller.setDataAvailability(true);
    elements.nameInput.value = "A";
    elements.saveButton.click();
    elements.nameInput.value = "B";
    elements.saveButton.click();

    expect(gallerySpy).toHaveBeenCalled();
    expect(comparisonSpy).toHaveBeenCalled();
    expect(elements.gallery.querySelector(".saved-view-card")).toBeNull();
    expect(elements.compareSummaryEl.textContent).toBe("");
  });

  it("routes saved-view apply actions through Vue panel dispatcher when available", async () => {
    const elements = buildElements();
    const dependencies = buildDependencies();
    /** @type {Record<string, Function>} */
    let panelActionHandlers = {};
    globalThis.__WAAN_VUE_SEARCH_SAVED_BRIDGE__ = {
      setPanelActionHandlers: vi.fn(handlers => {
        panelActionHandlers = handlers;
        return true;
      }),
      renderSavedViewsGallery: vi.fn(() => true),
      renderSavedViewsComparison: vi.fn(() => true),
      renderSavedViewsPanelState: vi.fn(() => true),
    };
    const controller = createSavedViewsController({ elements, dependencies });

    controller.init();
    controller.setDataAvailability(true);
    elements.nameInput.value = "Dispatcher View";
    elements.saveButton.click();

    expect(typeof panelActionHandlers["savedViews:apply-view"]).toBe("function");

    await panelActionHandlers["savedViews:apply-view"]("savedViews:apply-view", { viewId: "view-1" });
    await Promise.resolve();

    expect(dependencies.applyRangeAndRender).toHaveBeenCalledWith("all");
    expect(dependencies.updateStatus).toHaveBeenCalledWith('Applied saved view "Dispatcher View".', "success");
  });

  it("does not attach legacy gallery interaction fallback when Vue gallery renderer is unavailable", async () => {
    const elements = buildElements();
    const dependencies = buildDependencies();
    elements.gallery.dataset.galleryActionsBound = "true";
    globalThis.__WAAN_VUE_SEARCH_SAVED_BRIDGE__ = {
      setPanelActionHandlers: vi.fn(() => true),
      renderSavedViewsPanelState: vi.fn(() => true),
    };
    const controller = createSavedViewsController({ elements, dependencies });

    controller.init();
    controller.setDataAvailability(true);
    elements.nameInput.value = "Fallback View";
    elements.saveButton.click();

    const card = elements.gallery.querySelector(".saved-view-card");
    expect(card).toBeNull();
    card?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();

    expect(dependencies.applyRangeAndRender).not.toHaveBeenCalled();
  });

  it("shows active, dirty, and recency affordances for applied saved views", async () => {
    const elements = buildElements();
    installSavedViewsBridge(elements);
    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All";
    const customOption = document.createElement("option");
    customOption.value = "custom";
    customOption.textContent = "Custom";
    elements.rangeSelect.append(allOption, customOption);

    const dependencies = buildDependencies();
    let currentRange = "all";
    dependencies.getCurrentRange = vi.fn(() => currentRange);
    dependencies.getCustomRange = vi.fn(() => null);

    const controller = createSavedViewsController({ elements, dependencies });
    controller.init();
    controller.setDataAvailability(true);

    elements.nameInput.value = "Morning pulse";
    elements.saveButton.click();
    elements.listSelect.value = "view-1";
    await Promise.resolve(elements.applyButton.click());
    await Promise.resolve();

    const activeCard = elements.gallery.querySelector(".saved-view-card.is-active");
    expect(activeCard).toBeTruthy();
    expect(elements.gallery.querySelector(".saved-view-card.is-dirty")).toBeFalsy();
    expect(activeCard?.textContent).toContain("Active");
    expect(activeCard?.textContent).toContain("Used");
    expect(dependencies.updateSavedView).toHaveBeenCalledWith(
      "view-1",
      expect.objectContaining({ lastAppliedAt: expect.any(String) }),
    );

    currentRange = "custom";
    elements.rangeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    const dirtyCard = elements.gallery.querySelector(".saved-view-card.is-dirty");
    expect(dirtyCard).toBeTruthy();
    expect(dirtyCard?.textContent).toContain("Unsaved changes");
  });

  it("hydrates missing saved-view snapshots through analytics worker path", async () => {
    const elements = buildElements();
    installSavedViewsBridge(elements);
    const dependencies = buildDependencies();
    dependencies.getDatasetAnalytics = vi.fn(() => null);
    dependencies.computeAnalyticsWithWorker = vi.fn(async () => ({
      total_messages: 1,
      unique_senders: 1,
      system_summary: { count: 0 },
      averages: { words: 2, characters: 10 },
      weekly_summary: { averagePerWeek: 1 },
      hourly_summary: { averagePerDay: 1, topHour: { dayIndex: 3, hour: 10, count: 1 } },
      date_range: { start: "2025-01-01", end: "2025-01-01" },
      top_senders: [{ sender: "Ana", count: 1, share: 1 }],
    }));

    const controller = createSavedViewsController({ elements, dependencies });
    controller.init();
    controller.setDataAvailability(true);

    elements.nameInput.value = "Worker snapshot";
    elements.saveButton.click();

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(dependencies.computeAnalyticsWithWorker).toHaveBeenCalledTimes(1);
    expect(dependencies.updateSavedView).toHaveBeenCalledWith(
      "view-1",
      expect.objectContaining({
        snapshot: expect.objectContaining({
          totalMessages: 1,
          uniqueSenders: 1,
          topSender: expect.objectContaining({ sender: "Ana", count: 1 }),
        }),
      }),
    );
  });

  it("falls back to sync snapshot hydration when analytics worker fails", async () => {
    const elements = buildElements();
    installSavedViewsBridge(elements);
    const dependencies = buildDependencies();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    dependencies.getDatasetAnalytics = vi.fn(() => null);
    dependencies.computeAnalyticsWithWorker = vi.fn(async () => {
      throw new Error("worker failed");
    });

    const controller = createSavedViewsController({ elements, dependencies });
    controller.init();
    controller.setDataAvailability(true);

    elements.nameInput.value = "Worker fallback snapshot";
    elements.saveButton.click();

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(dependencies.computeAnalyticsWithWorker).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalled();
    expect(dependencies.updateSavedView).toHaveBeenCalledWith(
      "view-1",
      expect.objectContaining({
        snapshot: expect.objectContaining({
          totalMessages: 1,
          uniqueSenders: 1,
          topSender: expect.objectContaining({ sender: "Ana", count: 1 }),
        }),
      }),
    );
  });
});
