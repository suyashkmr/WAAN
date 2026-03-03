import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../js/state.js", () => ({
  getHourlyState: vi.fn(),
  updateHourlyState: vi.fn(),
}));

import { getHourlyState } from "../js/state.js";
import { renderHourlyFromPayload } from "../js/vue/dashboardHourlyRoot.js";

describe("dashboardHourlyRoot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears cached anomaly badges when hourly data is empty", () => {
    getHourlyState.mockReturnValue({
      heatmap: [],
      summary: null,
      details: null,
      distribution: null,
      filters: { weekdays: true, weekends: true, working: true, offhours: true },
      brush: { start: 0, end: 23 },
    });

    const anomaliesEl = document.createElement("div");
    const stateRef = {
      model: null,
      anomalyBadges: ["09:00 (100 msgs)"],
    };

    const handled = renderHourlyFromPayload(
      {
        data: null,
        options: {
          chartEl: document.createElement("div"),
          anomaliesEl,
        },
      },
      stateRef,
    );

    expect(handled).toBe(true);
    expect(stateRef.model).toEqual({ mode: "empty", message: "No data available." });
    expect(stateRef.anomalyBadges).toEqual([]);
    expect(anomaliesEl.textContent).toBe("No hourly surprises detected.");
  });
});
