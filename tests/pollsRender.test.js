import { afterEach, describe, expect, it } from "vitest";
import { Fragment, h, render } from "vue";

import { renderPollsSection } from "../js/analytics/polls.js";

describe("polls renderer", () => {
  const originalVitestEnv = process.env.VITEST;

  afterEach(() => {
    if (typeof originalVitestEnv === "string") process.env.VITEST = originalVitestEnv;
    else delete process.env.VITEST;
    delete globalThis.Vue;
    document.body.innerHTML = "";
  });

  it("renders poll list via Vue runtime", () => {
    globalThis.Vue = { h, render, Fragment };
    const listEl = document.createElement("ul");
    const totalsEl = document.createElement("span");
    const creatorsEl = document.createElement("span");
    const noteEl = document.createElement("p");

    renderPollsSection({
      data: {
        total: 2,
        unique_creators: 1,
        entries: [
          {
            id: "p1",
            title: "Lunch?",
            sender: "Ana",
            timestamp: "2026-03-03T10:00:00.000Z",
            options: ["Yes", "No"],
          },
        ],
        top_creators: [{ sender: "Ana", count: 2 }],
      },
      elements: { listEl, totalsEl, creatorsEl, noteEl },
    });

    expect(listEl.querySelectorAll(".poll-item")).toHaveLength(1);
    expect(listEl.querySelectorAll(".poll-item-options span")).toHaveLength(2);
    expect(totalsEl.textContent).toBe("2");
    expect(creatorsEl.textContent).toBe("1");
    expect(noteEl.textContent).toContain("Most polls: Ana");
  });

  it("fails fast without Vue runtime outside Vitest fallback mode", () => {
    delete process.env.VITEST;
    const listEl = document.createElement("ul");

    expect(() =>
      renderPollsSection({
        data: { entries: [] },
        elements: { listEl },
      }))
      .toThrow("Vue runtime is required for polls rendering.");
  });
});
