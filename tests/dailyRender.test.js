import { afterEach, describe, expect, it } from "vitest";
import { Fragment, h, render } from "vue";
import { renderDailySection } from "../js/analytics/activity/daily.js";

describe("daily renderer", () => {
  afterEach(() => {
    delete globalThis.Vue;
    document.body.innerHTML = "";
  });

  it("renders calendar months and legend as direct children of calendar container", () => {
    const container = document.createElement("div");
    const averageEl = document.createElement("span");
    renderDailySection(
      [
        { date: "2026-02-28", count: 2 },
        { date: "2026-03-01", count: 3 },
      ],
      { container, averageEl },
      { h, render, Fragment },
    );

    const directChildren = Array.from(container.children);
    expect(directChildren.some(el => el.classList.contains("calendar-month"))).toBe(true);
    expect(directChildren.at(-1)?.classList.contains("calendar-legend")).toBe(true);
  });
});
