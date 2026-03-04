import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addSavedView,
  clearSavedViews,
  getSavedViewsState,
  removeSavedView,
  setCompareSelection,
  subscribeSavedViewsState,
  updateSavedView,
} from "../js/state/savedViewsState.js";

describe("savedViewsState", () => {
  beforeEach(() => {
    clearSavedViews();
  });

  it("emits state snapshots for saved-view mutations", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSavedViewsState(listener);

    const first = addSavedView({ name: "Baseline" });
    updateSavedView(first.id, { name: "Baseline 2" });
    removeSavedView(first.id);

    expect(listener).toHaveBeenCalledTimes(3);
    const latest = listener.mock.calls.at(-1)?.[0];
    expect(latest?.views).toEqual([]);
    expect(latest?.compareSelection).toEqual({ primary: null, secondary: null });
    unsubscribe();
  });

  it("supports emitCurrent and no-op compare selection updates", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSavedViewsState(listener, { emitCurrent: true });
    expect(listener).toHaveBeenCalledTimes(1);

    setCompareSelection(null, null);
    expect(listener).toHaveBeenCalledTimes(1);

    setCompareSelection("view-1", "view-2");
    expect(listener).toHaveBeenCalledTimes(2);
    expect(getSavedViewsState().compareSelection).toEqual({ primary: "view-1", secondary: "view-2" });
    unsubscribe();
  });

  it("returns immutable snapshots for listeners and callers", () => {
    addSavedView({
      id: "view-1",
      name: "Original",
      hourlyFilters: { weekdays: true },
      snapshot: { topSender: { sender: "Ana" } },
    });

    const snapshot = getSavedViewsState();
    snapshot.views[0].name = "Mutated";
    snapshot.views[0].hourlyFilters.weekdays = false;
    snapshot.views[0].snapshot.topSender.sender = "Mutated Sender";
    snapshot.compareSelection.primary = "x";

    const fresh = getSavedViewsState();
    expect(fresh.views[0]?.name).toBe("Original");
    expect(fresh.views[0]?.hourlyFilters?.weekdays).toBe(true);
    expect(fresh.views[0]?.snapshot?.topSender?.sender).toBe("Ana");
    expect(fresh.compareSelection.primary).toBeNull();
  });

  it("swallows emitCurrent listener errors and keeps future emissions working", () => {
    const explodingListener = vi.fn(() => {
      throw new Error("emitCurrent failure");
    });
    const steadyListener = vi.fn();

    const unsubscribeExploding = subscribeSavedViewsState(explodingListener, { emitCurrent: true });
    const unsubscribeSteady = subscribeSavedViewsState(steadyListener, { emitCurrent: true });

    expect(explodingListener).toHaveBeenCalledTimes(1);
    expect(steadyListener).toHaveBeenCalledTimes(1);

    addSavedView({ id: "view-2", name: "Still works" });

    expect(explodingListener).toHaveBeenCalledTimes(2);
    expect(steadyListener).toHaveBeenCalledTimes(2);

    unsubscribeExploding();
    unsubscribeSteady();
  });

  it("emits independent snapshot objects per subscriber", () => {
    const firstListener = vi.fn(snapshot => {
      snapshot.views[0].name = "Mutated by first";
      snapshot.compareSelection.primary = "mutated";
    });
    const secondListener = vi.fn();
    const unsubscribeFirst = subscribeSavedViewsState(firstListener);
    const unsubscribeSecond = subscribeSavedViewsState(secondListener);

    addSavedView({ id: "view-1", name: "Original" });

    const secondSnapshot = secondListener.mock.calls.at(-1)?.[0];
    expect(secondSnapshot?.views[0]?.name).toBe("Original");
    expect(secondSnapshot?.compareSelection?.primary).toBeNull();

    unsubscribeFirst();
    unsubscribeSecond();
  });
});
