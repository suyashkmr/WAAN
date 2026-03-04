import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, createApp, h } from "vue";
import { mountSearchActionsPrimitive } from "../js/vue/searchSavedActionPrimitives.js";

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
});
