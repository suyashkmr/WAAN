function computeWeekdayFilteredData(state) {
  const distribution = state.distribution || [];
  const { filters, brush } = state;
  const includeWeekdays = filters.weekdays;
  const includeWeekends = filters.weekends;
  const includeWorking = filters.working;
  const includeOffhours = filters.offhours;
  const startHour = brush.start;
  const endHour = brush.end;

  const filteredEntries = distribution.map(entry => {
    const isWeekday = entry.dayIndex >= 1 && entry.dayIndex <= 5;
    if ((isWeekday && !includeWeekdays) || (!isWeekday && !includeWeekends)) {
      return {
        ...entry,
        filteredCount: 0,
        filteredShare: 0,
        filteredStdScore: 0,
        filteredDeltaPercent: 0,
        filteredHourly: Array(24).fill(0),
        filteredPeriods: [
          { label: "AM", count: 0 },
          { label: "PM", count: 0 },
        ],
      };
    }

    const filteredHourly = (entry.hourly || Array(24).fill(0)).map((value, hour) => {
      const inBrush = hour >= startHour && hour <= endHour;
      const isWorkingHour = hour >= 9 && hour <= 17;
      const hourAllowed = inBrush && ((isWorkingHour && includeWorking) || (!isWorkingHour && includeOffhours));
      return hourAllowed ? value : 0;
    });

    const filteredCount = filteredHourly.reduce((sum, value) => sum + value, 0);
    const filteredPeriods = [
      {
        label: "AM",
        count: filteredHourly.slice(0, 12).reduce((sum, value) => sum + value, 0),
      },
      {
        label: "PM",
        count: filteredHourly.slice(12).reduce((sum, value) => sum + value, 0),
      },
    ];

    return {
      ...entry,
      filteredCount,
      filteredHourly,
      filteredPeriods,
    };
  });

  const totalFiltered = filteredEntries.reduce((sum, entry) => sum + entry.filteredCount, 0);
  filteredEntries.forEach(entry => {
    entry.filteredShare = totalFiltered ? entry.filteredCount / totalFiltered : 0;
  });

  const counts = filteredEntries.map(entry => entry.filteredCount);
  const mean = counts.length ? counts.reduce((sum, value) => sum + value, 0) / counts.length : 0;
  const variance = counts.length
    ? counts.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / counts.length
    : 0;
  const std = Math.sqrt(variance);

  filteredEntries.forEach(entry => {
    entry.filteredStdScore = std ? (entry.filteredCount - mean) / std : 0;
    entry.filteredDeltaPercent = mean ? (entry.filteredCount - mean) / mean : 0;
  });

  return {
    entries: filteredEntries,
    total: totalFiltered,
    mean,
    std,
  };
}

function buildWeekdayFilterNote(state) {
  const { filters, brush } = state;
  const pieces = [];
  if (!filters.weekdays || !filters.weekends) {
    if (filters.weekdays && !filters.weekends) pieces.push("Weekdays only");
    else if (!filters.weekdays && filters.weekends) pieces.push("Weekends only");
  }
  if (!filters.working || !filters.offhours) {
    if (filters.working && !filters.offhours) pieces.push("Working hours");
    else if (!filters.working && filters.offhours) pieces.push("Off hours");
  }
  if (!(brush.start === 0 && brush.end === 23)) {
    pieces.push(`${String(brush.start).padStart(2, "0")}:00–${String(brush.end).padStart(2, "0")}:00`);
  }
  return pieces.length ? pieces.join(" · ") : "";
}

export { computeWeekdayFilteredData, buildWeekdayFilterNote };
