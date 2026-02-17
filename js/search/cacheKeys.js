function buildSummaryCacheKey(summary) {
  if (!summary) return "none";
  return JSON.stringify({
    total: Number(summary.total) || 0,
    truncated: Boolean(summary.truncated),
    hitsPerDay: Array.isArray(summary.hitsPerDay)
      ? summary.hitsPerDay.map(item => ({
          date: item?.date || "",
          count: Number(item?.count) || 0,
        }))
      : [],
    topParticipants: Array.isArray(summary.topParticipants)
      ? summary.topParticipants.map(item => ({
          sender: item?.sender || "",
          count: Number(item?.count) || 0,
          share: Number(item?.share) || 0,
        }))
      : [],
    filters: Array.isArray(summary.filters) ? summary.filters.map(value => String(value || "")) : [],
  });
}

function buildResultsCacheKey(results) {
  if (!Array.isArray(results) || !results.length) return "none";
  return JSON.stringify(
    results.map(item => ({
      sender: item?.sender || "",
      timestamp: item?.timestamp || "",
      message: item?.message || "",
      messageHtml: item?.messageHtml || "",
    })),
  );
}

export function buildParticipantOptionsCacheKey({
  datasetFingerprint,
  entriesLength,
  selectedStateValue,
  selectedUiValue,
}) {
  return `${datasetFingerprint}|${entriesLength}|${selectedStateValue}|${selectedUiValue}`;
}

export function buildSearchRenderCacheKey({
  datasetFingerprint,
  query,
  total,
  results,
  hasRunSearch,
  lastRunFiltered,
  lastRun,
  summary,
}) {
  return [
    datasetFingerprint,
    query?.text ?? "",
    query?.participant ?? "",
    query?.start ?? "",
    query?.end ?? "",
    String(total),
    String(Array.isArray(results) ? results.length : 0),
    String(Boolean(hasRunSearch)),
    String(Boolean(lastRunFiltered)),
    String(lastRun || ""),
    buildSummaryCacheKey(summary),
    buildResultsCacheKey(results),
  ].join("|");
}
