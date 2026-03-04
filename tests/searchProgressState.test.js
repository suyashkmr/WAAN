import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getSearchProgressState,
  resetSearchProgressState,
  setSearchProgressState,
  subscribeSearchProgressState,
} from "../js/state/searchProgressState.js";

describe("searchProgressState", () => {
  afterEach(() => {
    resetSearchProgressState();
    vi.restoreAllMocks();
  });

  it("tracks active progress snapshots with clamped values", () => {
    setSearchProgressState({ active: true, scanned: 120, total: 100 });
    const state = getSearchProgressState();
    expect(state.active).toBe(true);
    expect(state.scanned).toBe(100);
    expect(state.total).toBe(100);
    expect(Math.round(state.percent)).toBe(100);
  });

  it("notifies subscribers on updates and reset", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSearchProgressState(listener);

    setSearchProgressState({ active: true, scanned: 5, total: 10 });
    resetSearchProgressState();
    unsubscribe();
    setSearchProgressState({ active: true, scanned: 1, total: 2 });

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls[0][0]).toMatchObject({ active: true, scanned: 5, total: 10 });
    expect(listener.mock.calls[1][0]).toMatchObject({ active: false, scanned: 0, total: 0 });
  });
});
