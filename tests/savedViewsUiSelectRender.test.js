import { afterEach, describe, expect, it, vi } from "vitest";
import { Fragment, h, render } from "vue";

import { createSavedViewsUiController } from "../js/savedViewsUi.js";

function buildController({
  views = [],
  compareSelection = { primary: null, secondary: null },
  vueRuntime = null,
} = {}) {
  const listSelect = document.createElement("select");
  const compareSelectA = document.createElement("select");
  const compareSelectB = document.createElement("select");
  const gallery = document.createElement("div");
  const compareSummaryEl = document.createElement("div");

  const deps = {
    getSavedViews: () => views,
    getCompareSelection: () => compareSelection,
    setCompareSelection: vi.fn(),
    getSavedViewById: id => views.find(view => view.id === id) || null,
    ensureViewSnapshot: view => view,
    formatSavedViewRange: () => "range",
    dataAvailableGetter: () => true,
    onPanelAction: vi.fn(),
    vueRuntime,
  };

  const controller = createSavedViewsUiController({
    elements: {
      nameInput: document.createElement("input"),
      saveButton: document.createElement("button"),
      listSelect,
      applyButton: document.createElement("button"),
      deleteButton: document.createElement("button"),
      gallery,
      compareSelectA,
      compareSelectB,
      compareButton: document.createElement("button"),
      compareSummaryEl,
    },
    deps,
  });

  return { controller, deps, listSelect, compareSelectA, compareSelectB };
}

describe("saved views select rendering", () => {
  const originalVitestEnv = process.env.VITEST;

  afterEach(() => {
    if (typeof originalVitestEnv === "string") process.env.VITEST = originalVitestEnv;
    else delete process.env.VITEST;
    delete globalThis.Vue;
    vi.restoreAllMocks();
  });

  it("renders list/compare options via Vue and clears prefilled static options", () => {
    const vueRuntime = { h, render, Fragment };
    const views = [
      { id: "v1", name: "Baseline", rangeLabel: "all" },
      { id: "v2", name: "Recent", rangeLabel: "last 30" },
    ];
    const { controller, listSelect, compareSelectA, compareSelectB } = buildController({ views, vueRuntime });

    listSelect.innerHTML = '<option value="">No saved views yet</option>';
    compareSelectA.innerHTML = '<option value="">Select view A…</option>';
    compareSelectB.innerHTML = '<option value="">Select view B…</option>';

    controller.refreshUI();

    expect(listSelect.options.length).toBe(3);
    expect(listSelect.options[0].textContent).toBe("Choose a saved view…");
    expect(listSelect.options[1].value).toBe("v1");

    expect(compareSelectA.options.length).toBe(3);
    expect(compareSelectA.value).toBe("v1");

    expect(compareSelectB.options.length).toBe(3);
    expect(compareSelectB.value).toBe("v2");
  });

  it("fails fast without Vue runtime outside Vitest fallback mode", () => {
    delete process.env.VITEST;
    const { controller } = buildController({
      views: [{ id: "v1", name: "Baseline", rangeLabel: "all" }],
    });

    expect(() => controller.refreshUI()).toThrow("Vue runtime is required for saved view select rendering.");
  });
});
