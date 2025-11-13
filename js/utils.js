export function formatNumber(value) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function formatFloat(value, digits = 1) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function sanitizeText(text) {
  return String(text ?? "")
    .replace(/[&<>"']/g, match => {
      switch (match) {
        case "&":
          return "&amp;";
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case '"':
          return "&quot;";
        case "'":
          return "&#39;";
        default:
          return match;
      }
    });
}

export function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(value) {
  if (!value) return "";

  if (value instanceof Date) {
    const day = String(value.getDate()).padStart(2, "0");
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const year = value.getFullYear();
    return `${day}-${month}-${year}`;
  }

  if (typeof value === "string") {
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return `${day}-${month}-${year}`;
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return formatDisplayDate(parsed);
    }
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }
  return formatDisplayDate(parsed);
}

export function formatTimestampDisplay(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${formatDisplayDate(date)} ${hours}:${minutes}`;
}

export function formatDateRangeWithTime(start, end) {
  if (!start && !end) return "";
  if (start && end) {
    return `${formatTimestampDisplay(start)} → ${formatTimestampDisplay(end)}`;
  }
  if (start) return formatTimestampDisplay(start);
  return formatTimestampDisplay(end);
}

export function isoWeekDateRange(isoWeekKey) {
  const [yearPart, weekPart] = isoWeekKey.split("-W");
  const year = Number(yearPart);
  const week = Number(weekPart);

  if (!Number.isFinite(year) || !Number.isFinite(week)) {
    return {
      startDate: null,
      endDate: null,
      startDateObj: null,
      endDateObj: null,
    };
  }

  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dayOfWeek = simple.getUTCDay();
  const isoWeekStart = new Date(simple);

  if (dayOfWeek <= 4 && dayOfWeek > 0) {
    isoWeekStart.setUTCDate(simple.getUTCDate() - (dayOfWeek - 1));
  } else {
    isoWeekStart.setUTCDate(simple.getUTCDate() + (8 - dayOfWeek));
  }

  const startDate = new Date(
    isoWeekStart.getUTCFullYear(),
    isoWeekStart.getUTCMonth(),
    isoWeekStart.getUTCDate(),
  );
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  return {
    startDate: toISODate(startDate),
    endDate: toISODate(endDate),
    startDateObj: startDate,
    endDateObj: endDate,
  };
}

export function debounce(fn, delay = 100) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
