const DEFAULT_FILTER_FLAGS = {
  weekdays: true,
  weekends: true,
  working: true,
  offhours: true,
};

const DEFAULT_BRUSH = { start: 0, end: 23 };

function createDefaultAppShellState() {
  return {
    relay: {
      status: "offline",
      syncingChats: false,
      syncPath: null,
      chatCount: 0,
      accountLabel: "",
      lastError: "",
      lastUpdatedAt: 0,
    },
    selection: {
      activeChatId: null,
    },
    filters: {
      range: {
        current: "all",
        custom: null,
      },
      hourly: {
        filters: { ...DEFAULT_FILTER_FLAGS },
        brush: { ...DEFAULT_BRUSH },
      },
      weekday: {
        filters: { ...DEFAULT_FILTER_FLAGS },
        brush: { ...DEFAULT_BRUSH },
      },
    },
  };
}

let appShellUiState = createDefaultAppShellState();
const subscribers = new Set();

function cloneState() {
  return {
    relay: { ...appShellUiState.relay },
    selection: { ...appShellUiState.selection },
    filters: {
      range: { ...appShellUiState.filters.range },
      hourly: {
        filters: { ...appShellUiState.filters.hourly.filters },
        brush: { ...appShellUiState.filters.hourly.brush },
      },
      weekday: {
        filters: { ...appShellUiState.filters.weekday.filters },
        brush: { ...appShellUiState.filters.weekday.brush },
      },
    },
  };
}

function emitChange(type, previousState) {
  if (!subscribers.size) return;
  const nextState = cloneState();
  subscribers.forEach(subscriber => {
    subscriber({
      type,
      previousState,
      nextState,
    });
  });
}

function updateState(type, updater) {
  const previousState = cloneState();
  const didChange = updater();
  if (!didChange) return false;
  emitChange(type, previousState);
  return true;
}

export function subscribeAppShellUiState(subscriber) {
  if (typeof subscriber !== "function") {
    return () => {};
  }
  subscribers.add(subscriber);
  return () => {
    subscribers.delete(subscriber);
  };
}

export function getAppShellUiState() {
  return cloneState();
}

export function resetAppShellUiState() {
  appShellUiState = createDefaultAppShellState();
  subscribers.clear();
}

export function setAppShellActiveChatId(activeChatId) {
  return updateState("selection.activeChatId", () => {
    const normalized = activeChatId ?? null;
    if (appShellUiState.selection.activeChatId === normalized) return false;
    appShellUiState.selection.activeChatId = normalized;
    return true;
  });
}

export function setAppShellCurrentRange(currentRange) {
  return updateState("filters.range.current", () => {
    const normalized = currentRange ?? "all";
    if (appShellUiState.filters.range.current === normalized) return false;
    appShellUiState.filters.range.current = normalized;
    return true;
  });
}

export function setAppShellCustomRange(customRange) {
  return updateState("filters.range.custom", () => {
    const normalized =
      customRange && typeof customRange === "object"
        ? {
            type: customRange.type ?? "custom",
            start: customRange.start ?? null,
            end: customRange.end ?? null,
          }
        : null;

    const current = appShellUiState.filters.range.custom;
    const sameValue =
      current?.type === normalized?.type &&
      current?.start === normalized?.start &&
      current?.end === normalized?.end;
    if (sameValue) return false;
    appShellUiState.filters.range.custom = normalized;
    return true;
  });
}

function normalizeFilterFlags(filters = {}) {
  return {
    weekdays: Boolean(filters.weekdays),
    weekends: Boolean(filters.weekends),
    working: Boolean(filters.working),
    offhours: Boolean(filters.offhours),
  };
}

function normalizeBrush(brush = {}) {
  const start = Number.isFinite(brush.start) ? Number(brush.start) : DEFAULT_BRUSH.start;
  const end = Number.isFinite(brush.end) ? Number(brush.end) : DEFAULT_BRUSH.end;
  return { start, end };
}

function hasFilterStateChanged(current, next) {
  return (
    current.filters.weekdays !== next.filters.weekdays ||
    current.filters.weekends !== next.filters.weekends ||
    current.filters.working !== next.filters.working ||
    current.filters.offhours !== next.filters.offhours ||
    current.brush.start !== next.brush.start ||
    current.brush.end !== next.brush.end
  );
}

export function setAppShellHourlyFiltersState(partial = {}) {
  return updateState("filters.hourly", () => {
    const next = {
      filters: normalizeFilterFlags(partial.filters),
      brush: normalizeBrush(partial.brush),
    };
    const current = appShellUiState.filters.hourly;
    if (!hasFilterStateChanged(current, next)) return false;
    appShellUiState.filters.hourly = next;
    return true;
  });
}

export function setAppShellWeekdayFiltersState(partial = {}) {
  return updateState("filters.weekday", () => {
    const next = {
      filters: normalizeFilterFlags(partial.filters),
      brush: normalizeBrush(partial.brush),
    };
    const current = appShellUiState.filters.weekday;
    if (!hasFilterStateChanged(current, next)) return false;
    appShellUiState.filters.weekday = next;
    return true;
  });
}

function normalizeRelayStatus(status) {
  const state = status?.status || "offline";
  return {
    status: state,
    syncingChats: Boolean(status?.syncingChats),
    syncPath:
      status?.syncPath === "primary" || status?.syncPath === "fallback"
        ? status.syncPath
        : null,
    chatCount: Number.isFinite(status?.chatCount) ? Number(status.chatCount) : 0,
    accountLabel: status?.account ? String(status.account) : "",
    lastError: status?.lastError ? String(status.lastError) : "",
    lastUpdatedAt: Date.now(),
  };
}

function hasRelayStateChanged(current, next) {
  return (
    current.status !== next.status ||
    current.syncingChats !== next.syncingChats ||
    current.syncPath !== next.syncPath ||
    current.chatCount !== next.chatCount ||
    current.accountLabel !== next.accountLabel ||
    current.lastError !== next.lastError
  );
}

export function setAppShellRelayStatus(status) {
  return updateState("relay.status", () => {
    const next = normalizeRelayStatus(status);
    const current = appShellUiState.relay;
    if (!hasRelayStateChanged(current, next)) return false;
    appShellUiState.relay = next;
    return true;
  });
}
