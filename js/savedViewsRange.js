import { formatDisplayDate } from "./utils.js";

function coerceRangeValue(value) {
  if (value == null) return null;
  if (typeof value === "string") {
    if (value === "all" || value === "custom") return value;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
    const match = value.match(/(\d+)/);
    if (match) return Number(match[1]);
    return value;
  }
  return value;
}

function normalizeRangeCandidate(candidate, normalizeRangeValue) {
  if (candidate == null) return null;

  if (typeof candidate === "object") {
    if (candidate.type === "custom" || "start" in candidate || "end" in candidate) {
      const rangeObject = candidate.type === "custom"
        ? { type: "custom", start: candidate.start ?? null, end: candidate.end ?? null }
        : { type: "custom", start: candidate.start ?? null, end: candidate.end ?? null };
      return typeof normalizeRangeValue === "function"
        ? normalizeRangeValue(rangeObject)
        : rangeObject;
    }
    if ("value" in candidate) {
      return normalizeRangeCandidate(candidate.value, normalizeRangeValue);
    }
    return null;
  }

  const normalized = typeof normalizeRangeValue === "function"
    ? normalizeRangeValue(candidate)
    : candidate;

  if (
    typeof normalized === "string"
    && normalized !== "all"
    && normalized !== "custom"
    && !Number.isFinite(Number(normalized))
  ) {
    const digits = normalized.match(/(\d+)/);
    if (digits) {
      return Number(digits[1]);
    }
  }

  return coerceRangeValue(normalized);
}

export function getNormalizedRangeForView(view, normalizeRangeValue) {
  if (!view) return "all";
  const candidates = [view.rangeData, view.range, view.rangeLabel];
  for (const candidate of candidates) {
    if (candidate == null) continue;
    const normalized = normalizeRangeCandidate(candidate, normalizeRangeValue);
    if (!normalized) continue;
    if (normalized === "custom") {
      if (view.rangeData && typeof view.rangeData === "object") {
        const customNormalized = normalizeRangeCandidate(view.rangeData, normalizeRangeValue);
        if (customNormalized && customNormalized !== "custom") {
          return customNormalized;
        }
      }
      continue;
    }
    return normalized;
  }
  return "all";
}

export function formatViewRange(view, describeRange) {
  if (!view) return "—";
  if (typeof view.rangeData === "object" && view.rangeData) {
    const start = view.rangeData.start ? formatDisplayDate(view.rangeData.start) : "—";
    const end = view.rangeData.end ? formatDisplayDate(view.rangeData.end) : "—";
    return `${start} → ${end}`;
  }
  return describeRange(view.rangeData ?? view.range);
}
