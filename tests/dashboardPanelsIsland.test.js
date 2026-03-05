import { afterEach, describe, expect, it } from "vitest";
import { h } from "vue";
import { mountDashboardPanelsIsland } from "../js/vue/dashboardPanelsIsland.js";
import { resolveVueBridge, VUE_BRIDGE_NAMES, VUE_RUNTIME_REGISTRY_KEY } from "../js/vue/bridgeRegistry.js";

describe("dashboard panels island", () => {
  afterEach(() => {
    delete globalThis.Vue;
    delete globalThis.PrimeVue;
    delete globalThis.primevue;
    delete globalThis[VUE_RUNTIME_REGISTRY_KEY];
    document.body.innerHTML = "";
  });

  it("renders highlights via PrimeVue DataView when runtime component is available", async () => {
    document.body.innerHTML = '<div id="highlight-list" class="highlight-grid"></div>';
    let capturedDataKey = "";
    let capturedPt = null;
    const PrimeDataView = {
      name: "PrimeDataViewStub",
      props: ["value", "dataKey", "pt"],
      setup(props, context) {
        capturedDataKey = String(props?.dataKey || "");
        capturedPt = props?.pt ?? null;
        return () =>
          h(
            "div",
            {
              class: "highlights-dataview-prime",
              "data-ui-runtime": String(context?.attrs?.["data-ui-runtime"] || ""),
            },
            context?.slots?.list?.({ items: props.value || [] }) || [],
          );
      },
    };
    const fakeWindow = {
      document,
      console,
      PrimeVue: { DataView: PrimeDataView },
      Vue: await import("vue"),
    };
    fakeWindow.primevue = fakeWindow.PrimeVue;

    mountDashboardPanelsIsland({ globalScope: fakeWindow });
    const bridge = resolveVueBridge(VUE_BRIDGE_NAMES.dashboardPanels, { globalScope: fakeWindow });
    expect(bridge).toBeTruthy();

    bridge?.renderHighlights?.([
      {
        type: "activity",
        theme: "growth",
        label: "Busiest day",
        value: "42 messages",
        descriptor: "03-03-2026",
      },
    ]);
    await fakeWindow.Vue.nextTick();

    const dataViewRoot = document.querySelector("#highlight-list .highlights-dataview-prime");
    expect(dataViewRoot).toBeTruthy();
    expect(capturedDataKey).toBe("key");
    expect(capturedPt?.root?.style).toContain("display: contents");
    expect(document.querySelectorAll("#highlight-list .highlight-card")).toHaveLength(1);
  });
});
