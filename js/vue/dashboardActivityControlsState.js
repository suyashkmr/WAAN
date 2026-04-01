export function createHourlyControlsState(doc, VueRuntime) {
  return VueRuntime.reactive({
    filters: {
      weekdays: Boolean(doc.getElementById("filter-weekdays")?.getAttribute('aria-checked') === 'true'),
      weekends: Boolean(doc.getElementById("filter-weekends")?.getAttribute('aria-checked') === 'true'),
      working: Boolean(doc.getElementById("filter-working")?.getAttribute('aria-checked') === 'true'),
      offhours: Boolean(doc.getElementById("filter-offhours")?.getAttribute('aria-checked') === 'true'),
    },
    brush: {
      start: Number(doc.getElementById("hourly-brush-start")?.value ?? 0),
      end: Number(doc.getElementById("hourly-brush-end")?.value ?? 23),
    },
    labels: {
      start: String(doc.getElementById("hourly-brush-start-label")?.textContent || "00:00"),
      end: String(doc.getElementById("hourly-brush-end-label")?.textContent || "23:00"),
    },
  });
}

export function createWeekdayControlsState(doc, VueRuntime) {
  return VueRuntime.reactive({
    filters: {
      weekdays: Boolean(doc.getElementById("weekday-toggle-weekdays")?.getAttribute('aria-checked') === 'true'),
      weekends: Boolean(doc.getElementById("weekday-toggle-weekends")?.getAttribute('aria-checked') === 'true'),
      working: Boolean(doc.getElementById("weekday-toggle-working")?.getAttribute('aria-checked') === 'true'),
      offhours: Boolean(doc.getElementById("weekday-toggle-offhours")?.getAttribute('aria-checked') === 'true'),
    },
    brush: {
      start: Number(doc.getElementById("weekday-hour-start")?.value ?? 0),
      end: Number(doc.getElementById("weekday-hour-end")?.value ?? 23),
    },
    labels: {
      start: String(doc.getElementById("weekday-hour-start-label")?.textContent || "00:00"),
      end: String(doc.getElementById("weekday-hour-end-label")?.textContent || "23:00"),
    },
  });
}

export function createTimeOfDayControlsState(doc, VueRuntime) {
  return VueRuntime.reactive({
    filters: {
      weekdays: Boolean(doc.getElementById("timeofday-toggle-weekdays")?.getAttribute('aria-checked') === 'true'),
      weekends: Boolean(doc.getElementById("timeofday-toggle-weekends")?.getAttribute('aria-checked') === 'true'),
    },
    brush: {
      start: Number(doc.getElementById("timeofday-hour-start")?.value ?? 0),
      end: Number(doc.getElementById("timeofday-hour-end")?.value ?? 23),
    },
    labels: {
      start: String(doc.getElementById("timeofday-hour-start-label")?.textContent || "00:00"),
      end: String(doc.getElementById("timeofday-hour-end-label")?.textContent || "23:00"),
    },
  });
}

export function syncActivityControlsState(targetState, nextState) {
  targetState.filters = {
    ...targetState.filters,
    ...Object.fromEntries(
      Object.entries(nextState?.filters || {}).map(([key, value]) => [key, Boolean(value)]),
    ),
  };
  targetState.brush = {
    start: Number(nextState?.brush?.start ?? targetState.brush.start),
    end: Number(nextState?.brush?.end ?? targetState.brush.end),
  };
  targetState.labels = {
    start: String(nextState?.labels?.start ?? targetState.labels.start ?? ""),
    end: String(nextState?.labels?.end ?? targetState.labels.end ?? ""),
  };
  return true;
}
