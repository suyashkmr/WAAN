import { afterEach, describe, expect, it } from "vitest";
import { h, render } from "vue";
import { renderMessageTypesSection } from "../js/analytics/messageTypes.js";

describe("message types renderer", () => {
  afterEach(() => {
    delete globalThis.Vue;
    document.body.innerHTML = "";
  });

  it("renders empty state when summary is missing", () => {
    const summaryEl = document.createElement("div");
    const noteEl = document.createElement("p");
    noteEl.textContent = "stale";
    renderMessageTypesSection({
      data: { summary: [] },
      elements: { summaryEl, noteEl },
      vueRuntime: { h, render },
    });
    expect(summaryEl.textContent).toContain("No message types in this range.");
    expect(noteEl.textContent).toBe("");
  });

  it("renders share summary via Vue runtime", () => {
    const summaryEl = document.createElement("div");
    const noteEl = document.createElement("p");
    renderMessageTypesSection({
      data: {
        summary: [
          { label: "Text", share: 0.5 },
          { label: "Media", share: 0.25 },
        ],
      },
      elements: { summaryEl, noteEl },
      vueRuntime: { h, render },
    });
    expect(summaryEl.querySelector(".message-type-share-summary")?.textContent).toContain("Text: 50.0%");
    expect(summaryEl.querySelector(".message-type-share-summary")?.textContent).toContain("Media: 25.0%");
    expect(noteEl.textContent).toBe("");
  });

  it("throws when Vue runtime is unavailable", () => {
    const summaryEl = document.createElement("div");
    expect(() =>
      renderMessageTypesSection({
        data: { summary: [{ label: "Text", share: 1 }] },
        elements: { summaryEl },
      }))
      .toThrow("Vue runtime is required for message-types rendering.");
  });
});
