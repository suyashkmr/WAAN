import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, render } from "vue";
import { renderWeeklySection } from "../js/analytics/activity/weekly.js";

const PrimeButton = defineComponent({
  name: "PrimeButtonStub",
  inheritAttrs: false,
  props: {
    label: { type: String, default: "" },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        "button",
        attrs,
        slots.default ? slots.default() : props.label,
      );
  },
});

describe("weekly renderer", () => {
  afterEach(() => {
    delete globalThis.PrimeVue;
    document.body.innerHTML = "";
  });

  it("renders weekly bars via PrimeVue button primitive and dispatches range selection", () => {
    globalThis.PrimeVue = { Button: PrimeButton };
    const container = document.createElement("div");
    const frame = document.createElement("div");
    frame.className = "analysis-evidence-frame";
    frame.appendChild(container);
    const cumulativeEl = document.createElement("span");
    const rollingEl = document.createElement("span");
    const averageEl = document.createElement("span");
    const onSelectRange = vi.fn();

    renderWeeklySection(
      [
        {
          week: "2026-W09",
          startDate: "2026-02-23",
          endDate: "2026-03-01",
          count: 12,
          delta: 2,
          deltaPercent: 0.2,
        },
      ],
      {
        cumulativeTotal: 12,
        latestRolling: 10.5,
        averagePerWeek: 12,
      },
      { container, cumulativeEl, rollingEl, averageEl, onSelectRange },
      { h, render },
    );

    const bar = container.querySelector(".weekly-bar");
    expect(bar).toBeTruthy();
    expect(container.classList.contains("weekly-chart")).toBe(true);
    expect(container.style.width).toBe("100%");
    expect(container.style.maxWidth).toBe("100%");
    expect(container.style.alignSelf).toBe("stretch");
    expect(bar?.getAttribute("data-ui-runtime")).toBe("primevue");
    expect(container.style.overflowX).toBe("auto");
    expect(frame.style.overflowX).toBe("auto");
    expect(frame.style.overflowY).toBe("hidden");
    expect(frame.style.alignItems).toBe("stretch");
    expect(frame.style.justifyContent).toBe("flex-start");
    const weeklyBarsTrack = container.querySelector(".weekly-bars");
    expect(weeklyBarsTrack?.getAttribute("style")).toContain("min-width");
    bar?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onSelectRange).toHaveBeenCalledTimes(1);
    expect(cumulativeEl.textContent).toBe("12");
    expect(rollingEl.textContent).toContain("msgs");
    expect(averageEl.textContent).toContain("msgs/week");
  });
});
