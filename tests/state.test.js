import { describe, it, expect } from "vitest";
import {
  computeDatasetFingerprint,
  setDatasetEntries,
  getDatasetEntries,
  resetWeekdayFilters,
  getWeekdayState,
} from "../js/state.js";

describe("state utilities", () => {
  it("computes dataset fingerprint from entries", () => {
    const entries = [
      { timestamp: "2025-01-01T00:00:00Z", message: "hello" },
      { timestamp: "2025-01-02T00:00:00Z", message: "world" },
    ];
    const fingerprint = computeDatasetFingerprint(entries);
    expect(fingerprint).toMatch(/2:/);
  });

  it("mutates dataset entries", () => {
    setDatasetEntries([{ message: "sample" }]);
    expect(getDatasetEntries().length).toBe(1);
  });

  it("resets weekday filters", () => {
    const state = getWeekdayState();
    state.filters.weekdays = false;
    resetWeekdayFilters();
    expect(getWeekdayState().filters.weekdays).toBe(true);
  });
});
