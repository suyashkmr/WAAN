import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, Fragment, h, reactive, render } from "vue";

import { mountDashboardPanelsIsland } from "../js/vue/dashboardPanelsIsland.js";
import { resolveVueBridge, VUE_BRIDGE_NAMES } from "../js/vue/bridgeRegistry.js";
import { clearVueBridgeRuntime } from "./vueBridgeTestUtils.js";

function buildMatrix(initial = 0) {
  return Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => initial));
}

function buildDetailMatrix() {
  return Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => ({ count: 0, share: 0, topSenders: [] })));
}

describe("dashboard panels hourly anomaly rendering", () => {
  afterEach(() => {
    clearVueBridgeRuntime();
    delete globalThis.Vue;
    delete window.Vue;
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("renders anomaly badges via Vue and replaces static placeholder content", () => {
    document.body.innerHTML = `
      <div id="highlight-list"></div>
      <table id="top-senders"><tbody></tbody></table>
      <div id="timeofday-chart"></div>
      <div id="hourly-chart"></div>
      <div id="weekday-chart"></div>
      <div id="hourly-anomalies"><p class="relay-log-empty">No hourly surprises detected.</p></div>
      <div id="hourly-filter-note"></div>
      <div id="hourly-brush-summary"></div>
    `;

    const vueRuntime = { createApp, h, reactive, render, Fragment };
    globalThis.Vue = vueRuntime;
    window.Vue = vueRuntime;

    mountDashboardPanelsIsland({ globalScope: window });
    const bridge = resolveVueBridge(VUE_BRIDGE_NAMES.dashboardPanels, { globalScope: window });
    expect(bridge).toBeTruthy();

    const heatmap = buildMatrix(0);
    heatmap[1][9] = 12;
    const details = buildDetailMatrix();
    details[1][9] = { count: 12, share: 0.5, topSenders: [{ sender: "Ana", count: 7 }] };
    const summary = {
      totalMessages: 24,
      stats: { threshold: 5 },
      comparison: { perHour: Array.from({ length: 24 }, () => ({ previous: 0, diff: 0, diffPercent: null })) },
    };
    const distribution = [{ hour: 9, count: 12 }];

    const anomaliesEl = document.getElementById("hourly-anomalies");
    const chartEl = document.getElementById("hourly-chart");
    const filterNoteEl = document.getElementById("hourly-filter-note");
    const brushSummaryEl = document.getElementById("hourly-brush-summary");

    const handled = bridge?.renderHourlyHeatmap({
      data: {
        heatmap,
        summary,
        details,
        distribution,
      },
      options: {
        chartEl,
        anomaliesEl,
        filterNoteEl,
        brushSummaryEl,
        renderSummary: () => {},
      },
    });

    expect(handled).toBe(true);
    expect(anomaliesEl?.querySelectorAll(".badge").length).toBeGreaterThan(0);
    expect(anomaliesEl?.textContent).toContain("09:00 (12 msgs)");
    expect(anomaliesEl?.textContent).not.toContain("No hourly surprises detected.");
    expect(filterNoteEl?.textContent).toBe("");
    expect(brushSummaryEl?.textContent).toContain("00:00–23:00");
  });

  it("re-renders badges after non-empty to empty to non-empty transitions", () => {
    document.body.innerHTML = `
      <div id="highlight-list"></div>
      <table id="top-senders"><tbody></tbody></table>
      <div id="timeofday-chart"></div>
      <div id="hourly-chart"></div>
      <div id="weekday-chart"></div>
      <div id="hourly-anomalies"></div>
      <div id="hourly-filter-note"></div>
      <div id="hourly-brush-summary"></div>
    `;

    const vueRuntime = { createApp, h, reactive, render, Fragment };
    globalThis.Vue = vueRuntime;
    window.Vue = vueRuntime;

    mountDashboardPanelsIsland({ globalScope: window });
    const bridge = resolveVueBridge(VUE_BRIDGE_NAMES.dashboardPanels, { globalScope: window });
    expect(bridge).toBeTruthy();

    const anomaliesEl = document.getElementById("hourly-anomalies");
    const chartEl = document.getElementById("hourly-chart");
    const filterNoteEl = document.getElementById("hourly-filter-note");
    const brushSummaryEl = document.getElementById("hourly-brush-summary");

    const baseSummary = {
      totalMessages: 24,
      stats: { threshold: 5 },
      comparison: { perHour: Array.from({ length: 24 }, () => ({ previous: 0, diff: 0, diffPercent: null })) },
    };

    const populatedHeatmap = buildMatrix(0);
    populatedHeatmap[1][9] = 12;
    const populatedDetails = buildDetailMatrix();
    populatedDetails[1][9] = { count: 12, share: 0.5, topSenders: [{ sender: "Ana", count: 7 }] };

    bridge?.renderHourlyHeatmap({
      data: {
        heatmap: populatedHeatmap,
        summary: baseSummary,
        details: populatedDetails,
        distribution: [{ hour: 9, count: 12 }],
      },
      options: {
        chartEl,
        anomaliesEl,
        filterNoteEl,
        brushSummaryEl,
        renderSummary: () => {},
      },
    });

    expect(anomaliesEl?.querySelectorAll(".badge")).toHaveLength(1);
    expect(anomaliesEl?.textContent).toContain("09:00 (12 msgs)");

    bridge?.renderHourlyHeatmap({
      data: {
        heatmap: buildMatrix(0),
        summary: baseSummary,
        details: buildDetailMatrix(),
        distribution: [],
      },
      options: {
        chartEl,
        anomaliesEl,
        filterNoteEl,
        brushSummaryEl,
        renderSummary: () => {},
      },
    });

    expect(anomaliesEl?.querySelectorAll(".badge")).toHaveLength(0);
    expect(anomaliesEl?.textContent).toContain("No hourly surprises detected.");
    expect(brushSummaryEl?.textContent).toContain("00:00–23:00");
    expect(brushSummaryEl?.textContent).toContain("0 msgs");

    bridge?.renderHourlyHeatmap({
      data: {
        heatmap: populatedHeatmap,
        summary: baseSummary,
        details: populatedDetails,
        distribution: [{ hour: 9, count: 12 }],
      },
      options: {
        chartEl,
        anomaliesEl,
        filterNoteEl,
        brushSummaryEl,
        renderSummary: () => {},
      },
    });

    expect(anomaliesEl?.querySelectorAll(".badge")).toHaveLength(1);
    expect(anomaliesEl?.textContent).toContain("09:00 (12 msgs)");
  });
});
