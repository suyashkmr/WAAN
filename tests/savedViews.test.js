import { describe, it, expect, vi, afterEach } from "vitest";
import { Fragment, h, render } from "vue";
import { createSavedViewsController } from "../js/savedViews.js";
import { clearVueBridgeRuntime, installSearchSavedVueBridge } from "./vueBridgeTestUtils.js";
import { WAAN_PAGE_CONTROL_DRAFT_EVENT } from "../js/vue/pageControlDraftSignal.js";

function buildElements() {
  const buildSelect = values => {
    const select = document.createElement("select");
    values.forEach(value => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
    return select;
  };
  const nameInput = document.createElement("input");
  nameInput.id = "saved-view-name";
  nameInput.placeholder = "Name this view";
  const saveButton = document.createElement("button");
  saveButton.id = "save-view";
  const listSelect = buildSelect([""]);
  listSelect.id = "saved-view-list";
  const applyButton = document.createElement("button");
  applyButton.id = "apply-saved-view";
  const deleteButton = document.createElement("button");
  deleteButton.id = "delete-saved-view";
  const gallery = document.createElement("div");
  gallery.id = "saved-view-gallery";
  const compareSelectA = buildSelect([""]);
  compareSelectA.id = "compare-view-a";
  const compareSelectB = buildSelect([""]);
  compareSelectB.id = "compare-view-b";
  const compareButton = document.createElement("button");
  compareButton.id = "compare-views";
  const compareSummaryEl = document.createElement("div");
  compareSummaryEl.id = "compare-summary";
  const rangeSelect = buildSelect(["all", "30", "90", "180", "365", "custom"]);
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
  let appShellSubscriber = null;

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
    subscribeAppShellUiState: vi.fn(subscriber => {
      appShellSubscriber = subscriber;
      return vi.fn();
    }),
    emitAppShellUiState: event => {
      appShellSubscriber?.(event);
    },
    readPageControlDraftState: vi.fn(() => null),
    globalScope: window,
    vueRuntime: { h, render, Fragment },
  };
}

function installSavedViewsBridge(elements) {
  /** @type {Record<string, Function>} */
  let panelActionHandlers = {};
  installSearchSavedVueBridge({
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
  });
}

describe("savedViews controller", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearVueBridgeRuntime();
    delete globalThis.PrimeVue;
    document.body.innerHTML = "";
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
    installSearchSavedVueBridge({
      renderSavedViewsPanelState: bridgeSpy,
    });
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
    installSearchSavedVueBridge({
      renderSavedViewsGallery: gallerySpy,
      renderSavedViewsComparison: comparisonSpy,
    });
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

  it("mounts PrimeVue-managed saved-view selects while keeping native refs for controllers", () => {
    globalThis.PrimeVue = { Select: { name: "PrimeSelectStub" } };
    const elements = buildElements();
    document.body.append(
      elements.nameInput,
      elements.saveButton,
      elements.listSelect,
      elements.applyButton,
      elements.deleteButton,
      elements.gallery,
      elements.compareSelectA,
      elements.compareSelectB,
      elements.compareButton,
      elements.compareSummaryEl,
    );
    const dependencies = buildDependencies();
    dependencies.vueRuntime = {
      h,
      reactive: value => value,
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
    };
    const controller = createSavedViewsController({ elements, dependencies });

    controller.init();
    controller.setDataAvailability(true);
    elements.nameInput.value = "Baseline";
    elements.saveButton.click();

    expect(elements.listSelect.id).toBe("saved-view-list");
    expect(elements.compareSelectA.id).toBe("compare-view-a");
    expect(elements.compareSelectB.id).toBe("compare-view-b");
    expect(elements.listSelect.isConnected).toBe(false);
    expect(elements.compareSelectA.isConnected).toBe(false);
    expect(elements.compareSelectB.isConnected).toBe(false);
    expect(elements.listSelect.__waanPrimeSelectBridge?.mountEl?.classList.contains("prime-select-bridge")).toBe(true);
    expect(elements.compareSelectA.__waanPrimeSelectBridge?.mountEl?.classList.contains("prime-select-bridge")).toBe(true);
    expect(elements.compareSelectB.__waanPrimeSelectBridge?.mountEl?.classList.contains("prime-select-bridge")).toBe(true);
    expect(elements.listSelect.__waanPrimeSelectBridge?.state?.value).toBe("view-1");
  });

  it("routes saved-view apply actions through Vue panel dispatcher when available", async () => {
    const elements = buildElements();
    const dependencies = buildDependencies();
    /** @type {Record<string, Function>} */
    let panelActionHandlers = {};
    installSearchSavedVueBridge({
      setPanelActionHandlers: vi.fn(handlers => {
        panelActionHandlers = handlers;
        return true;
      }),
      renderSavedViewsGallery: vi.fn(() => true),
      renderSavedViewsComparison: vi.fn(() => true),
      renderSavedViewsPanelState: vi.fn(() => true),
    });
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

  it("skips native saved-view action listeners when bridge-owned buttons are mounted", async () => {
    const elements = buildElements();
    document.body.append(
      elements.saveButton,
      elements.applyButton,
      elements.deleteButton,
      elements.compareButton,
    );
    globalThis.Vue = { h, render };
    const searchSavedIsland = await import("../js/vue/searchSavedIsland.js");
    searchSavedIsland.mountSearchSavedBridge();

    const dependencies = buildDependencies();
    const saveSpy = vi.spyOn(elements.saveButton, "addEventListener");
    const applySpy = vi.spyOn(elements.applyButton, "addEventListener");
    const deleteSpy = vi.spyOn(elements.deleteButton, "addEventListener");
    const compareSpy = vi.spyOn(elements.compareButton, "addEventListener");

    const controller = createSavedViewsController({ elements, dependencies });
    controller.init();

    expect(elements.saveButton.dataset.vueManaged).toBe("true");
    expect(elements.applyButton.dataset.vueManaged).toBe("true");
    expect(elements.deleteButton.dataset.vueManaged).toBe("true");
    expect(elements.compareButton.dataset.vueManaged).toBe("true");
    expect(saveSpy).not.toHaveBeenCalled();
    expect(applySpy).not.toHaveBeenCalled();
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(compareSpy).not.toHaveBeenCalled();
  });

  it("keeps native saved-view listeners when bridge handlers are not registered", async () => {
    const elements = buildElements();
    elements.saveButton.dataset.vueManaged = "true";
    elements.applyButton.dataset.vueManaged = "true";
    elements.deleteButton.dataset.vueManaged = "true";
    elements.compareButton.dataset.vueManaged = "true";
    installSearchSavedVueBridge({
      setPanelActionHandlers: vi.fn(() => true),
      hasPanelActionHandler: vi.fn(() => false),
    });

    const dependencies = buildDependencies();
    const saveSpy = vi.spyOn(elements.saveButton, "addEventListener");
    const applySpy = vi.spyOn(elements.applyButton, "addEventListener");
    const deleteSpy = vi.spyOn(elements.deleteButton, "addEventListener");
    const compareSpy = vi.spyOn(elements.compareButton, "addEventListener");

    const controller = createSavedViewsController({ elements, dependencies });
    controller.init();

    expect(saveSpy).toHaveBeenCalledWith("click", expect.any(Function));
    expect(applySpy).toHaveBeenCalledWith("click", expect.any(Function));
    expect(deleteSpy).toHaveBeenCalledWith("click", expect.any(Function));
    expect(compareSpy).toHaveBeenCalledWith("click", expect.any(Function));
  });

  it("syncs bridge-owned page controls when applying a saved view", async () => {
    const elements = buildElements();
    installSavedViewsBridge(elements);
    const dependencies = buildDependencies();
    dependencies.syncPageControls = vi.fn(() => true);
    dependencies.getCurrentRange = vi.fn(() => "custom");
    const controller = createSavedViewsController({ elements, dependencies });

    controller.init();
    controller.setDataAvailability(true);
    elements.rangeSelect.value = "all";
    elements.customStartInput.value = "stale-start";
    elements.customEndInput.value = "stale-end";

    elements.nameInput.value = "Bridge Applied";
    elements.saveButton.click();

    const savedView = dependencies.getSavedViews().at(0);
    dependencies.updateSavedView(savedView.id, {
      range: "custom",
      rangeData: { type: "custom", start: "2025-01-02", end: "2025-01-05" },
    });
    elements.listSelect.value = savedView.id;
    await Promise.resolve(elements.applyButton.click());
    await Promise.resolve();

    expect(dependencies.syncPageControls).toHaveBeenCalledWith({
      rangeValue: "custom",
      customVisible: true,
      customStart: "2025-01-02",
      customEnd: "2025-01-05",
    });
    expect(elements.rangeSelect.value).toBe("all");
    expect(elements.customStartInput.value).toBe("stale-start");
    expect(elements.customEndInput.value).toBe("stale-end");
  });

  it("does not attach legacy gallery interaction fallback when Vue gallery renderer is unavailable", async () => {
    const elements = buildElements();
    const dependencies = buildDependencies();
    elements.gallery.dataset.galleryActionsBound = "true";
    installSearchSavedVueBridge({
      setPanelActionHandlers: vi.fn(() => true),
      renderSavedViewsPanelState: vi.fn(() => true),
    });
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
    elements.rangeSelect.value = "custom";
    dependencies.emitAppShellUiState({ type: "filters.range.current" });
    const dirtyCard = elements.gallery.querySelector(".saved-view-card.is-dirty");
    expect(dirtyCard).toBeTruthy();
    expect(dirtyCard?.textContent).toContain("Unsaved changes");
  });

  it("marks the active saved view dirty while custom range edits are still in progress", async () => {
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
    dependencies.getCurrentRange = vi.fn(() => "all");
    dependencies.getCustomRange = vi.fn(() => null);

    const controller = createSavedViewsController({ elements, dependencies });
    controller.init();
    controller.setDataAvailability(true);

    elements.nameInput.value = "Custom draft";
    elements.saveButton.click();
    elements.listSelect.value = "view-1";
    await Promise.resolve(elements.applyButton.click());
    await Promise.resolve();

    expect(elements.gallery.querySelector(".saved-view-card.is-dirty")).toBeFalsy();

    elements.rangeSelect.value = "custom";
    elements.rangeSelect.dispatchEvent(new Event("change", { bubbles: true }));

    let dirtyCard = elements.gallery.querySelector(".saved-view-card.is-dirty");
    expect(dirtyCard).toBeTruthy();

    elements.customStartInput.value = "2025-01-02";
    elements.customStartInput.dispatchEvent(new Event("input", { bubbles: true }));

    dirtyCard = elements.gallery.querySelector(".saved-view-card.is-dirty");
    expect(dirtyCard).toBeTruthy();
    expect(dirtyCard?.textContent).toContain("Unsaved changes");
  });

  it("clears the dirty indicator when a custom draft is reverted to the saved range", async () => {
    const elements = buildElements();
    installSavedViewsBridge(elements);
    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All";
    const ninetyOption = document.createElement("option");
    ninetyOption.value = "90";
    ninetyOption.textContent = "Last 90 days";
    const customOption = document.createElement("option");
    customOption.value = "custom";
    customOption.textContent = "Custom";
    elements.rangeSelect.append(allOption, ninetyOption, customOption);

    const dependencies = buildDependencies();
    dependencies.getCurrentRange = vi.fn(() => "90");
    dependencies.getCustomRange = vi.fn(() => null);

    const controller = createSavedViewsController({ elements, dependencies });
    controller.init();
    controller.setDataAvailability(true);

    elements.nameInput.value = "Quarter";
    elements.saveButton.click();
    elements.listSelect.value = "view-1";
    await Promise.resolve(elements.applyButton.click());
    await Promise.resolve();

    expect(elements.gallery.querySelector(".saved-view-card.is-dirty")).toBeFalsy();

    elements.rangeSelect.value = "custom";
    elements.rangeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    elements.customStartInput.value = "2025-01-02";
    elements.customStartInput.dispatchEvent(new Event("input", { bubbles: true }));

    expect(elements.gallery.querySelector(".saved-view-card.is-dirty")).toBeTruthy();

    elements.rangeSelect.value = "90";
    elements.rangeSelect.dispatchEvent(new Event("change", { bubbles: true }));

    expect(elements.gallery.querySelector(".saved-view-card.is-dirty")).toBeFalsy();
  });

  it("marks the active saved view dirty from bridged page-control draft signals", async () => {
    const elements = buildElements();
    installSavedViewsBridge(elements);
    const dependencies = buildDependencies();
    let draftState = { rangeValue: "all", customStart: "", customEnd: "" };
    dependencies.getCurrentRange = vi.fn(() => "all");
    dependencies.readPageControlDraftState = vi.fn(() => draftState);
    const controller = createSavedViewsController({ elements, dependencies });

    controller.init();
    controller.setDataAvailability(true);

    elements.nameInput.value = "Draft bridge view";
    elements.saveButton.click();
    elements.listSelect.value = "view-1";
    await Promise.resolve(elements.applyButton.click());
    await Promise.resolve();

    expect(elements.gallery.querySelector(".saved-view-card.is-dirty")).toBeFalsy();

    draftState = { rangeValue: "custom", customStart: "2025-01-02", customEnd: "2025-01-05" };
    window.dispatchEvent(new CustomEvent(WAAN_PAGE_CONTROL_DRAFT_EVENT, { detail: draftState }));

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

  it("uses bridged saved-view select state even when the hidden native select is stale", async () => {
    const elements = buildElements();
    installSavedViewsBridge(elements);
    globalThis.PrimeVue = { Select: { name: "PrimeSelectStub" } };
    document.body.append(
      elements.nameInput,
      elements.saveButton,
      elements.listSelect,
      elements.applyButton,
      elements.deleteButton,
      elements.gallery,
      elements.compareSelectA,
      elements.compareSelectB,
      elements.compareButton,
      elements.compareSummaryEl,
    );
    const dependencies = buildDependencies();
    dependencies.vueRuntime = {
      h,
      reactive: value => value,
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
    };

    const controller = createSavedViewsController({ elements, dependencies });
    controller.init();
    controller.setDataAvailability(true);

    elements.nameInput.value = "View 1";
    elements.saveButton.click();
    elements.nameInput.value = "View 2";
    elements.saveButton.click();

    elements.listSelect.value = "";
    elements.listSelect.__waanPrimeSelectBridge.state.value = "view-2";
    await Promise.resolve(elements.applyButton.click());
    await Promise.resolve();

    expect(dependencies.updateSavedView).toHaveBeenCalledWith(
      "view-2",
      expect.objectContaining({ lastAppliedAt: expect.any(String) }),
    );
  });

  it("uses bridged compare select state even when the hidden native selects are stale", () => {
    const elements = buildElements();
    installSavedViewsBridge(elements);
    globalThis.PrimeVue = { Select: { name: "PrimeSelectStub" } };
    document.body.append(
      elements.nameInput,
      elements.saveButton,
      elements.listSelect,
      elements.applyButton,
      elements.deleteButton,
      elements.gallery,
      elements.compareSelectA,
      elements.compareSelectB,
      elements.compareButton,
      elements.compareSummaryEl,
    );
    const dependencies = buildDependencies();
    dependencies.vueRuntime = {
      h,
      reactive: value => value,
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
    };

    const controller = createSavedViewsController({ elements, dependencies });
    controller.init();
    controller.setDataAvailability(true);

    elements.nameInput.value = "View 1";
    elements.saveButton.click();
    elements.nameInput.value = "View 2";
    elements.saveButton.click();

    elements.compareSelectA.value = "";
    elements.compareSelectB.value = "";
    elements.compareSelectA.__waanPrimeSelectBridge.state.value = "view-1";
    elements.compareSelectB.__waanPrimeSelectBridge.state.value = "view-2";
    elements.compareButton.click();

    expect(dependencies.setCompareSelection).toHaveBeenLastCalledWith("view-1", "view-2");
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
