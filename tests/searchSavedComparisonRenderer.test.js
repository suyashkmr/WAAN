import { describe, expect, it } from "vitest";
import { h, render, nextTick } from "vue";
import { renderSavedViewsComparisonWithVue } from "../js/vue/searchSavedComparisonRenderer.js";

describe("search saved comparison renderer", () => {
  it("renders comparison columns via PrimeVue DataView when available", async () => {
    const container = document.createElement("div");
    let capturedDataKey = "";
    const PrimeDataView = {
      name: "PrimeDataViewStub",
      props: ["value", "dataKey"],
      setup(props, context) {
        capturedDataKey = String(props?.dataKey || "");
        return () =>
          h(
            "div",
            {
              class: "compare-dataview-prime",
              "data-ui-runtime": String(context?.attrs?.["data-ui-runtime"] || ""),
            },
            context?.slots?.list?.({ items: props.value || [] }) || [],
          );
      },
    };

    const rendered = renderSavedViewsComparisonWithVue({
      empty: false,
      columns: [
        {
          heading: "View A",
          metrics: [{ label: "Messages", value: "100", tone: "neutral" }],
        },
      ],
      container,
      vueRuntime: { h, render },
      globalScope: { PrimeVue: { DataView: PrimeDataView }, primevue: { DataView: PrimeDataView } },
    });
    await nextTick();

    expect(rendered).toBe(true);
    expect(capturedDataKey).toBe("key");
    expect(container.querySelector(".compare-dataview-prime")).toBeTruthy();
    expect(container.querySelectorAll(".compare-column")).toHaveLength(1);
  });
});
