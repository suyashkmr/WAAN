import { describe, expect, it } from "vitest";
import { h, render, nextTick } from "vue";
import { renderSavedViewsComparisonWithVue } from "../js/vue/searchSavedComparisonRenderer.js";

describe("search saved comparison renderer", () => {
  it("renders comparison columns directly into the grid container", async () => {
    const container = document.createElement("div");

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
    });
    await nextTick();

    expect(rendered).toBe(true);
    expect(container.querySelector(".compare-summary-grid")).toBeTruthy();
    expect(container.querySelectorAll(".compare-column")).toHaveLength(1);
  });
});
