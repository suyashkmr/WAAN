import { afterEach, describe, expect, it, vi } from "vitest";
import { Fragment, h, render } from "vue";

import { createSavedViewsUiController } from "../js/savedViewsUi.js";
import { readPrimeSelectBridgeValue } from "../js/vue/primeSelectBridge.js";

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
    delete globalThis.__WAAN_ALLOW_NATIVE_BRIDGE_FALLBACKS__;
    delete globalThis.Vue;
    delete globalThis.PrimeVue;
    vi.restoreAllMocks();
    document.body.innerHTML = "";
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

  it("assigns default bridged compare select values without a follow-up native bridge-value sync", () => {
    globalThis.PrimeVue = { Select: { name: "PrimeSelectStub" } };
    const vueRuntime = {
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
    const views = [
      { id: "v1", name: "Baseline", rangeLabel: "all" },
      { id: "v2", name: "Recent", rangeLabel: "last 30" },
    ];
    const { controller, compareSelectA, compareSelectB } = buildController({ views, vueRuntime });
    document.body.append(compareSelectA, compareSelectB);

    controller.refreshUI();

    expect(compareSelectA.value).toBe("v1");
    expect(compareSelectB.value).toBe("v2");
    expect(readPrimeSelectBridgeValue(compareSelectA)).toBe("v1");
    expect(readPrimeSelectBridgeValue(compareSelectB)).toBe("v2");
  });

  it("keeps native saved-view select rendering when PrimeVue bridge is unavailable", () => {
    delete process.env.VITEST;
    globalThis.__WAAN_ALLOW_NATIVE_BRIDGE_FALLBACKS__ = true;
    const { controller, listSelect, compareSelectA, compareSelectB } = buildController({
      views: [{ id: "v1", name: "Baseline", rangeLabel: "all" }],
    });

    expect(() => controller.refreshUI()).not.toThrow();
    expect(Array.from(listSelect.options).map(option => option.value)).toEqual(["", "v1"]);
    expect(Array.from(compareSelectA.options).map(option => option.value)).toEqual(["", "v1"]);
    expect(Array.from(compareSelectB.options).map(option => option.value)).toEqual(["", "v1"]);
  });
});
