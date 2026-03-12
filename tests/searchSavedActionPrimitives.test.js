import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, createApp, h } from "vue";
import {
  mountSavedViewsActionPrimitives,
  mountSearchActionsPrimitive,
  mountSearchSavedSelectSeedPrimitives,
} from "../js/vue/searchSavedActionPrimitives.js";

describe("search saved action primitives", () => {
  afterEach(() => {
    delete globalThis.Vue;
    delete globalThis.PrimeVue;
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("mounts run/reset actions with PrimeVue button runtime attributes", () => {
    const PrimeButton = defineComponent({
      name: "PrimeButtonStub",
      inheritAttrs: false,
      props: {
        label: { type: String, default: "" },
      },
      setup(props, { attrs, slots }) {
        return () => h("button", attrs, slots.default ? slots.default() : props.label);
      },
    });
    globalThis.Vue = { createApp, h };
    globalThis.PrimeVue = { Button: PrimeButton };
    document.body.innerHTML = `
      <form id="advanced-search-form">
        <div class="search-actions"></div>
      </form>
    `;

    const dispatchPanelAction = vi.fn();
    mountSearchActionsPrimitive({ dispatchPanelAction });

    const actionsEl = document.querySelector("#advanced-search-form .search-actions");
    const runButton = document.getElementById("run-search");
    const resetButton = document.getElementById("reset-search");

    expect(actionsEl?.dataset.vuePrimitiveMounted).toBe("true");
    expect(actionsEl?.dataset.vueManaged).toBe("true");
    expect(runButton).toBeTruthy();
    expect(resetButton).toBeTruthy();
    expect(runButton?.getAttribute("type")).toBe("submit");
    expect(resetButton?.getAttribute("type")).toBe("button");
    expect(runButton?.getAttribute("data-ui-runtime")).toBe("primevue");
    expect(resetButton?.getAttribute("data-ui-runtime")).toBe("primevue");
  });

  it("dispatches search actions from mounted run/reset buttons", () => {
    const PrimeButton = defineComponent({
      name: "PrimeButtonStub",
      inheritAttrs: false,
      props: {
        label: { type: String, default: "" },
      },
      setup(props, { attrs, slots }) {
        return () => h("button", attrs, slots.default ? slots.default() : props.label);
      },
    });
    globalThis.Vue = { createApp, h };
    globalThis.PrimeVue = { Button: PrimeButton };
    document.body.innerHTML = `
      <form id="advanced-search-form">
        <div class="search-actions"></div>
      </form>
    `;

    const dispatchPanelAction = vi.fn();
    mountSearchActionsPrimitive({ dispatchPanelAction });

    document.getElementById("run-search")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    document.getElementById("reset-search")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(dispatchPanelAction).toHaveBeenNthCalledWith(1, "search:run-search");
    expect(dispatchPanelAction).toHaveBeenNthCalledWith(2, "search:clear-search-filters");
  });

  it("dispatches search run action from bridge-owned form submit", () => {
    document.body.innerHTML = `
      <form id="advanced-search-form">
        <div class="search-actions"></div>
      </form>
    `;

    const dispatchPanelAction = vi.fn();
    mountSearchActionsPrimitive({ dispatchPanelAction });

    const form = /** @type {HTMLFormElement | null} */ (document.getElementById("advanced-search-form"));
    expect(form?.dataset.vueSubmitManaged).toBe("true");
    form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

    expect(dispatchPanelAction).toHaveBeenCalledWith("search:run-search");
  });

  it("dispatches saved-view action buttons through the panel dispatcher", () => {
    document.body.innerHTML = `
      <button id="save-view" type="button"></button>
      <button id="apply-saved-view" type="button"></button>
      <button id="delete-saved-view" type="button"></button>
      <button id="compare-views" type="button"></button>
    `;

    const dispatchPanelAction = vi.fn();
    mountSavedViewsActionPrimitives({ dispatchPanelAction });

    document.getElementById("save-view")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    document.getElementById("apply-saved-view")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    document.getElementById("delete-saved-view")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    document.getElementById("compare-views")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(dispatchPanelAction).toHaveBeenNthCalledWith(1, "savedViews:save-view");
    expect(dispatchPanelAction).toHaveBeenNthCalledWith(2, "savedViews:apply-selected-view");
    expect(dispatchPanelAction).toHaveBeenNthCalledWith(3, "savedViews:delete-selected-view");
    expect(dispatchPanelAction).toHaveBeenNthCalledWith(4, "savedViews:compare-views");
  });

  it("seeds search and saved-view native selects from anchor placeholders", () => {
    document.body.innerHTML = `
      <div id="saved-view-list-anchor" data-native-select-seed="saved-view-list"></div>
      <div id="compare-view-a-anchor" data-native-select-seed="compare-view-a"></div>
      <div id="compare-view-b-anchor" data-native-select-seed="compare-view-b"></div>
      <div id="search-participant-anchor" data-native-select-seed="search-participant"></div>
    `;

    mountSearchSavedSelectSeedPrimitives();

    expect(document.getElementById("saved-view-list")?.tagName).toBe("SELECT");
    expect(document.getElementById("compare-view-a")?.tagName).toBe("SELECT");
    expect(document.getElementById("compare-view-b")?.tagName).toBe("SELECT");
    expect(document.getElementById("search-participant")?.tagName).toBe("SELECT");
    expect(document.getElementById("saved-view-list-anchor")).toBeNull();
    expect(document.getElementById("search-participant-anchor")).toBeNull();
  });
});
