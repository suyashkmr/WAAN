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
    expect(fingerprint).toMatch(/2:.*:.*:[0-9a-f]+/);
  });

  it("changes fingerprint when message text changes without changing length", () => {
    const baseEntries = [
      { timestamp: "2025-01-01T00:00:00Z", sender: "Ana", message: "hello there" },
      { timestamp: "2025-01-02T00:00:00Z", sender: "Ben", message: "world peace" },
    ];
    const editedEntries = [
      { timestamp: "2025-01-01T00:00:00Z", sender: "Ana", message: "hello where" },
      { timestamp: "2025-01-02T00:00:00Z", sender: "Ben", message: "world peace" },
    ];

    const baseFingerprint = computeDatasetFingerprint(baseEntries);
    const editedFingerprint = computeDatasetFingerprint(editedEntries);

    expect(editedFingerprint).not.toBe(baseFingerprint);
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
