const hourlyState = {
  heatmap: null,
  summary: null,
  details: null,
  distribution: null,
  filters: {
    weekdays: true,
    weekends: true,
    working: true,
    offhours: true,
  },
  brush: { start: 0, end: 23 },
};

const weekdayState = {
  distribution: null,
  stats: null,
  filters: {
    weekdays: true,
    weekends: true,
    working: true,
    offhours: true,
  },
  brush: { start: 0, end: 23 },
};

export function getHourlyState() {
  return hourlyState;
}

export function updateHourlyState(partial) {
  Object.assign(hourlyState, partial);
}

export function resetHourlyFilters() {
  hourlyState.filters = {
    weekdays: true,
    weekends: true,
    working: true,
    offhours: true,
  };
  hourlyState.brush = { start: 0, end: 23 };
}

export function getWeekdayState() {
  return weekdayState;
}

export function updateWeekdayState(partial) {
  if (!partial) return;
  if (partial.filters) {
    weekdayState.filters = { ...weekdayState.filters, ...partial.filters };
  }
  if (partial.brush) {
    weekdayState.brush = { ...weekdayState.brush, ...partial.brush };
  }
  const rest = { ...partial };
  delete rest.filters;
  delete rest.brush;
  Object.assign(weekdayState, rest);
}

export function resetWeekdayFilters() {
  weekdayState.filters = {
    weekdays: true,
    weekends: true,
    working: true,
    offhours: true,
  };
  weekdayState.brush = { start: 0, end: 23 };
}
