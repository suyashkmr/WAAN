import { afterEach, describe, expect, it } from "vitest";
import { Fragment, h, render } from "vue";
import { renderSentimentSection } from "../js/analytics/sentiment.js";

function formatSentimentScore(value, precision = 2) {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
  const sign = amount > 0 ? "+" : "";
  return `${sign}${amount.toFixed(precision)}`;
}

function buildElements() {
  return {
    summaryEl: document.createElement("div"),
    trendNoteEl: document.createElement("p"),
    dailyChartEl: document.createElement("div"),
    positiveListEl: document.createElement("ul"),
    negativeListEl: document.createElement("ul"),
  };
}

describe("sentiment renderer", () => {
  afterEach(() => {
    delete globalThis.Vue;
    delete globalThis.PrimeVue;
    delete globalThis.primevue;
    document.body.innerHTML = "";
  });

  it("renders empty sentiment state", () => {
    const elements = buildElements();

    renderSentimentSection({
      sentiment: { totals: { positive: 0, neutral: 0, negative: 0 }, daily: [], participants: [] },
      elements,
      helpers: { formatSentimentScore, vueRuntime: { h, render, Fragment } },
    });

    expect(elements.summaryEl.textContent).toContain("No sentiment data for this range.");
    expect(elements.dailyChartEl.textContent).toContain("No scored messages to show.");
    expect(elements.trendNoteEl.textContent).toContain("No scored messages for this range.");
  });

  it("renders summary tiles, trend note, and participant lists", () => {
    const elements = buildElements();

    renderSentimentSection({
      sentiment: {
        average: 0.21,
        totals: { positive: 8, neutral: 4, negative: 2 },
        daily: [
          { date: "2026-03-01", count: 5, average: 0.3 },
          { date: "2026-03-02", count: 4, average: -0.1 },
        ],
        participants: [
          { sender: "Ana", count: 10, average: 0.4, positive: 7, negative: 1 },
          { sender: "Ben", count: 8, average: -0.3, positive: 1, negative: 5 },
        ],
      },
      elements,
      helpers: { formatSentimentScore, vueRuntime: { h, render, Fragment } },
    });

    expect(elements.summaryEl.querySelectorAll(".sentiment-tile")).toHaveLength(4);
    expect(elements.summaryEl.firstElementChild?.classList.contains("sentiment-tile")).toBe(true);
    expect(elements.trendNoteEl.textContent).toContain("Avg +0.21");
    expect(elements.dailyChartEl.querySelector(".sentiment-calendar")).toBeTruthy();
    expect(elements.positiveListEl.firstElementChild?.tagName).toBe("LI");
    expect(elements.negativeListEl.firstElementChild?.tagName).toBe("LI");
    expect(elements.positiveListEl.textContent).toContain("Ana");
    expect(elements.negativeListEl.textContent).toContain("Ben");
  });

  it("throws when Vue runtime is unavailable", () => {
    const elements = buildElements();
    expect(() =>
      renderSentimentSection({
        sentiment: { totals: { positive: 1, neutral: 0, negative: 0 }, daily: [], participants: [] },
        elements,
        helpers: { formatSentimentScore },
      }))
      .toThrow("Vue runtime is required for sentiment rendering.");
  });

  it("renders summary tiles via PrimeVue DataView when runtime component is available", () => {
    let capturedPt = null;
    const PrimeDataView = {
      name: "PrimeDataViewStub",
      props: ["value", "pt"],
      setup(props, context) {
        capturedPt = props?.pt ?? null;
        return () =>
          h(
            "div",
            {
              class: "prime-data-view",
              "data-ui-runtime": String(context?.attrs?.["data-ui-runtime"] || ""),
            },
            context?.slots?.list?.({ items: props.value || [] }) || [],
          );
      },
    };
    globalThis.PrimeVue = { DataView: PrimeDataView };
    globalThis.primevue = globalThis.PrimeVue;
    const elements = buildElements();

    renderSentimentSection({
      sentiment: {
        average: 0.21,
        totals: { positive: 8, neutral: 4, negative: 2 },
        daily: [
          { date: "2026-03-01", count: 5, average: 0.3 },
          { date: "2026-03-02", count: 4, average: -0.1 },
        ],
        participants: [],
      },
      elements,
      helpers: { formatSentimentScore, vueRuntime: { h, render, Fragment } },
    });

    const primeDataView = elements.summaryEl.querySelector(".prime-data-view");
    expect(primeDataView?.getAttribute("data-ui-runtime")).toBe("primevue");
    expect(capturedPt?.root?.class).toBe("sentiment-summary-dataview-root");
    expect(capturedPt?.content?.class).toBe("sentiment-summary-dataview-content");
    expect(capturedPt?.list?.class).toBe("sentiment-summary-dataview-list");
    expect(elements.summaryEl.querySelectorAll(".sentiment-tile")).toHaveLength(4);
  });

  it("uses lowercase primevue namespace when PrimeVue.DataView is unavailable", () => {
    const PrimeDataView = {
      name: "PrimeDataViewStub",
      props: ["value"],
      setup(props, context) {
        return () =>
          h(
            "div",
            {
              class: "prime-data-view-lowercase",
              "data-ui-runtime": String(context?.attrs?.["data-ui-runtime"] || ""),
            },
            context?.slots?.list?.({ items: props.value || [] }) || [],
          );
      },
    };
    globalThis.PrimeVue = {};
    globalThis.primevue = { DataView: PrimeDataView };
    const elements = buildElements();

    renderSentimentSection({
      sentiment: {
        average: 0.2,
        totals: { positive: 2, neutral: 1, negative: 1 },
        daily: [],
        participants: [],
      },
      elements,
      helpers: { formatSentimentScore, vueRuntime: { h, render, Fragment } },
    });

    expect(elements.summaryEl.querySelector(".prime-data-view-lowercase")).toBeTruthy();
    expect(elements.summaryEl.querySelectorAll(".sentiment-tile")).toHaveLength(4);
  });
});
