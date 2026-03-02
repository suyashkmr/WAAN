import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAppShellUiState,
  resetAppShellUiState,
  subscribeAppShellUiState,
  setActiveChatId,
  setCurrentRange,
  setCustomRange,
  updateHourlyState,
  updateWeekdayState,
  setAppShellRelayStatus,
} from "../js/state.js";

describe("app-shell canonical ui state", () => {
  beforeEach(() => {
    resetAppShellUiState();
  });

  it("tracks active chat transitions from chat selection state", () => {
    const listener = vi.fn();
    subscribeAppShellUiState(listener);

    setActiveChatId("remote:abc123");

    const state = getAppShellUiState();
    expect(state.selection.activeChatId).toBe("remote:abc123");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].type).toBe("selection.activeChatId");
    expect(listener.mock.calls[0][0].previousState.selection.activeChatId).toBeNull();
    expect(listener.mock.calls[0][0].nextState.selection.activeChatId).toBe("remote:abc123");
  });

  it("tracks range mode + custom range transitions", () => {
    const listener = vi.fn();
    subscribeAppShellUiState(listener);

    setCurrentRange("custom");
    setCustomRange({ type: "custom", start: "2026-01-01", end: "2026-01-31" });

    const state = getAppShellUiState();
    expect(state.filters.range.current).toBe("custom");
    expect(state.filters.range.custom).toEqual({
      type: "custom",
      start: "2026-01-01",
      end: "2026-01-31",
    });
    expect(listener.mock.calls.map(call => call[0].type)).toEqual([
      "filters.range.current",
      "filters.range.custom",
    ]);
  });

  it("tracks hourly + weekday filter transitions", () => {
    updateHourlyState({
      filters: { weekdays: false, weekends: true, working: false, offhours: true },
      brush: { start: 4, end: 17 },
    });
    updateWeekdayState({
      filters: { weekdays: true, weekends: false, working: true, offhours: false },
      brush: { start: 2, end: 20 },
    });

    const state = getAppShellUiState();
    expect(state.filters.hourly).toEqual({
      filters: { weekdays: false, weekends: true, working: false, offhours: true },
      brush: { start: 4, end: 17 },
    });
    expect(state.filters.weekday).toEqual({
      filters: { weekdays: true, weekends: false, working: true, offhours: false },
      brush: { start: 2, end: 20 },
    });
  });

  it("tracks relay status transitions for sync-path and running state", () => {
    const listener = vi.fn();
    subscribeAppShellUiState(listener);

    setAppShellRelayStatus({
      status: "starting",
      syncingChats: true,
      chatCount: 0,
    });
    setAppShellRelayStatus({
      status: "running",
      syncingChats: false,
      syncPath: "primary",
      chatCount: 42,
      account: "Suyash",
    });

    const state = getAppShellUiState();
    expect(state.relay.status).toBe("running");
    expect(state.relay.syncPath).toBe("primary");
    expect(state.relay.chatCount).toBe(42);
    expect(state.relay.accountLabel).toBe("Suyash");
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls[0][0].type).toBe("relay.status");
    expect(listener.mock.calls[1][0].previousState.relay.status).toBe("starting");
    expect(listener.mock.calls[1][0].nextState.relay.status).toBe("running");
  });
});
