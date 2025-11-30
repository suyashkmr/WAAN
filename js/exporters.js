export function createExporters({
  getDatasetAnalytics,
  getDatasetEntries,
  getDatasetLabel,
  getCurrentRange,
  getParticipantView,
  getExportFilterSummary,
  getSearchState,
  updateStatus,
  formatNumber,
  formatFloat,
  formatTimestampDisplay,
  computeTimeOfDayDataset,
  formatHourLabel,
  describeRange,
  filterEntriesByRange,
  normalizeRangeValue,
  snapshotModeGetter,
  generateMarkdownReport,
  generateSlidesHtml,
  getExportThemeConfig,
  getDatasetFingerprint = () => null,
}) {
  const exportCache = new Map();
  let cacheFingerprint = null;
  let cacheRangeKey = null;

  function getFingerprintKey() {
    const fingerprint = typeof getDatasetFingerprint === "function" ? getDatasetFingerprint() : null;
    const rangeKey = typeof getCurrentRange === "function" ? JSON.stringify(normalizeRangeValue(getCurrentRange())) : null;
    if (fingerprint !== cacheFingerprint || rangeKey !== cacheRangeKey) {
      exportCache.clear();
      cacheFingerprint = fingerprint ?? null;
      cacheRangeKey = rangeKey ?? null;
    }
    if (cacheFingerprint == null || cacheRangeKey == null) return null;
    return `${cacheFingerprint}|${cacheRangeKey}`;
  }

  function cacheSection(section, extraKey = "", builder) {
    const fingerprintKey = getFingerprintKey();
    if (fingerprintKey == null) {
      return builder();
    }
    const key = `${section}|${fingerprintKey}|${extraKey || ""}`;
    if (exportCache.has(key)) {
      return exportCache.get(key);
    }
    const value = builder();
    if (typeof value !== "undefined") {
      exportCache.set(key, value);
    }
    return value;
  }
  function buildFilename(suffix) {
    const label = (getDatasetLabel() || "relay-chat")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const range = describeRange(getCurrentRange());
    return `${label}_${range.replace(/[^a-z0-9]+/gi, "-")}_${suffix}.csv`;
  }

  function buildReportFilename(suffix, extension) {
    const label = (getDatasetLabel() || "relay-chat")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const range = describeRange(getCurrentRange());
    const sanitizedRange = range.replace(/[^a-z0-9]+/gi, "-");
    return `${label}_${sanitizedRange}_${suffix}.${extension}`;
  }

  function downloadTextFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function downloadCSV(filename, headers, rows) {
    if (!rows.length) return;
    const escape = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csvLines = [
      headers.map(escape).join(","),
      ...rows.map(row => row.map(escape).join(",")),
    ];
    downloadTextFile(filename, csvLines.join("\r\n"), "text/csv;charset=utf-8;");
  }

  function exportParticipants() {
    const analytics = getDatasetAnalytics();
    const participantView = getParticipantView();
    if (!analytics || !analytics.top_senders.length) {
      updateStatus("No participant data to export right now.", "warning");
      return;
    }
    if (!participantView.length) {
      updateStatus("No participants fit the current filters to export.", "warning");
      return;
    }
    const header = [
      "Rank",
      "Participant",
      "Messages",
      "Share (%)",
      "Avg Words",
      "Avg Characters",
      "Avg Sentiment",
      "Positive (%)",
      "Negative (%)",
    ];
    const rows = participantView.map((entry, idx) => [
      idx + 1,
      entry.sender,
      entry.count,
      Number.isFinite(entry.share) ? formatFloat(entry.share * 100, 2) : "",
      Number.isFinite(entry.avg_words) ? formatFloat(entry.avg_words, 2) : "",
      Number.isFinite(entry.avg_chars) ? formatFloat(entry.avg_chars, 2) : "",
      entry.sentiment && Number.isFinite(entry.sentiment.average)
        ? formatFloat(entry.sentiment.average, 2)
        : "",
      entry.sentiment && entry.count
        ? formatFloat((entry.sentiment.positive / entry.count) * 100, 1)
        : "",
      entry.sentiment && entry.count
        ? formatFloat((entry.sentiment.negative / entry.count) * 100, 1)
        : "",
    ]);
    const filterDetails = getExportFilterSummary();
    const extraLines = filterDetails.map(info => {
      const padded = new Array(header.length).fill("");
      padded[0] = "Note";
      padded[1] = info;
      return padded;
    });
    downloadCSV(
      buildFilename("participants"),
      header,
      [...extraLines, ...rows],
    );
  }

  function exportHourly() {
    const analytics = getDatasetAnalytics();
    const rows = cacheSection("hourly", "", () => {
      if (!analytics || !analytics.hourly_distribution) return undefined;
      return analytics.hourly_distribution.map(entry => [
        `${String(entry.hour).padStart(2, "0")}:00`,
        entry.count,
      ]);
    });
    if (!rows || !rows.length) {
      updateStatus("No hourly activity to export right now.", "warning");
      return;
    }
    downloadCSV(buildFilename("hourly"), ["Hour", "Messages"], rows);
  }

  function exportDaily() {
    const analytics = getDatasetAnalytics();
    const rows = cacheSection("daily", "", () => {
      if (!analytics || !analytics.daily_counts?.length) return undefined;
      return analytics.daily_counts.map(entry => [entry.date, entry.count]);
    });
    if (!rows || !rows.length) {
      updateStatus("No daily activity to export right now.", "warning");
      return;
    }
    downloadCSV(buildFilename("daily"), ["Date", "Messages"], rows);
  }

  function exportWeekly() {
    const analytics = getDatasetAnalytics();
    const rows = cacheSection("weekly", "", () => {
      if (!analytics || !analytics.weekly_counts?.length) return undefined;
      return analytics.weekly_counts.map(entry => [
        entry.week,
        entry.count,
        entry.cumulative,
      ]);
    });
    if (!rows || !rows.length) {
      updateStatus("No weekly trends to export right now.", "warning");
      return;
    }
    downloadCSV(buildFilename("weekly"), ["Week", "Messages", "Cumulative"], rows);
  }

  function exportWeekday() {
    const analytics = getDatasetAnalytics();
    const rows = cacheSection("weekday", "", () => {
      if (!analytics || !analytics.weekday_distribution?.length) return undefined;
      return analytics.weekday_distribution.map(entry => [
        entry.label,
        entry.count,
        entry.share ? formatFloat(entry.share * 100, 2) : "",
        entry.deviation ? formatFloat(entry.deviation, 2) : "",
      ]);
    });
    if (!rows || !rows.length) {
      updateStatus("No weekday data to export right now.", "warning");
      return;
    }
    downloadCSV(
      buildFilename("weekday"),
      ["Weekday", "Messages", "Share (%)", "Std Dev"],
      rows,
    );
  }

  function exportTimeOfDay() {
    const analytics = getDatasetAnalytics();
    if (!analytics) {
      updateStatus("No time-of-day data to export right now.", "warning");
      return;
    }
    const data = computeTimeOfDayDataset(analytics);
    if (!data || !data.points.length || !data.total) {
      updateStatus("No time-of-day data to export right now.", "warning");
      return;
    }
    const headers = ["Hour", "Messages", "Share (%)", "Weekday Messages", "Weekend Messages"];
    const rows = data.points.map(point => [
      formatHourLabel(point.hour),
      point.total,
      formatFloat(point.share * 100, 2),
      data.includeWeekdays ? point.weekday : "",
      data.includeWeekends ? point.weekend : "",
    ]);
    downloadCSV(buildFilename("time-of-day"), headers, rows);
  }

  function exportMessageTypes() {
    const analytics = getDatasetAnalytics();
    const rows = cacheSection("message-types", "", () => {
      const data = analytics?.message_types;
      if (!data) return undefined;
      const summary = data.summary ?? [];
      if (!summary.length) return undefined;
      return summary.map(entry => [
        "Summary",
        entry.label,
        entry.count,
        formatFloat((entry.share || 0) * 100, 2),
      ]);
    });
    if (!rows || !rows.length) {
      updateStatus("No message type data to export right now.", "warning");
      return;
    }
    const headers = ["Group", "Type", "Messages", "Share (%)"];
    downloadCSV(buildFilename("message-types"), headers, rows);
  }

  function exportMessageSubtype(type) {
    const analytics = getDatasetAnalytics();
    if (!analytics) {
      updateStatus("Load a chat summary before exporting.", "warning");
      return;
    }
    const messageTypes = analytics.message_types || {};
    const systemDetails = analytics.system_summary?.details || {};
    const typeConfig = {
      media: {
        label: "media messages",
        entries: messageTypes.media?.entries || [],
        headers: ["Timestamp", "Sender", "Message"],
        mapRow: entry => [
          formatSnapshotTimestamp(entry, formatTimestampDisplay),
          entry.sender || "",
          entry.message || "",
        ],
      },
      links: {
        label: "link messages",
        entries: messageTypes.links?.entries || [],
        headers: ["Timestamp", "Sender", "Message"],
        mapRow: entry => [
          formatSnapshotTimestamp(entry, formatTimestampDisplay),
          entry.sender || "",
          entry.message || "",
        ],
      },
      polls: {
        label: "polls",
        entries: (messageTypes.polls?.entries && messageTypes.polls.entries.length
          ? messageTypes.polls.entries
          : analytics.polls?.entries) || [],
        headers: ["Timestamp", "Sender", "Title", "Options"],
        mapRow: entry => [
          formatSnapshotTimestamp(entry, formatTimestampDisplay),
          entry.sender || "",
          entry.title || "",
          Array.isArray(entry.options) ? entry.options.filter(Boolean).join(" | ") : "",
        ],
      },
      joins: buildSystemExportConfig(systemDetails.joins, "join events"),
      added: buildSystemExportConfig(systemDetails.added, "member additions"),
      left: buildSystemExportConfig(systemDetails.left, "members leaving"),
      removed: buildSystemExportConfig(systemDetails.removed, "member removals"),
      changed: buildSystemExportConfig(systemDetails.changed, "setting changes"),
      join_requests: buildSystemExportConfig(systemDetails.join_requests, "join requests"),
      other: buildSystemExportConfig(systemDetails.other, "other system events"),
    }[type];

    if (!typeConfig) {
      updateStatus("That export isn't available.", "warning");
      return;
    }

    const rows = cacheSection("message-subtype", type, () => {
      const mapped = typeConfig.entries?.map(typeConfig.mapRow).filter(Boolean) || [];
      return mapped.length ? mapped : undefined;
    });
    if (!rows || !rows.length) {
      updateStatus(`No ${typeConfig.label} to export right now.`, "warning");
      return;
    }
    downloadCSV(buildFilename(type), typeConfig.headers, rows);
  }

  function buildSystemExportConfig(entries = [], label) {
    return {
      label,
      entries: Array.isArray(entries) ? entries : [],
      headers: ["Timestamp", "Message", "Participants", "Subtype"],
      mapRow: entry => [
        formatSnapshotTimestamp(entry, formatTimestampDisplay),
        entry.message || "",
        Number.isFinite(entry.participant_count) ? entry.participant_count : "",
        entry.system_subtype || "",
      ],
    };
  }

  function exportChatJson() {
    const entries = getDatasetEntries();
    if (!entries.length) {
      updateStatus("Load a chat summary before downloading the JSON.", "warning");
      return;
    }
    const rangeValue = normalizeRangeValue(getCurrentRange());
    const subset = filterEntriesByRange(entries, rangeValue);
    const payload = subset.length ? subset : entries;
    const dataStr = JSON.stringify(payload, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = buildFilename("chat-summary").replace(/\.csv$/, ".json");
    link.click();

    URL.revokeObjectURL(url);
    const label = describeRange(rangeValue);
    updateStatus(
      `Saved ${formatNumber(payload.length)} entries from ${getDatasetLabel()} (${label}).`,
      "success",
    );
  }

  function exportSentiment() {
    const analytics = getDatasetAnalytics();
    const sentiment = analytics?.sentiment;
    if (!sentiment) {
      updateStatus("No sentiment data to export right now.", "warning");
      return;
    }
    const rows = (sentiment.daily || [])
      .filter(entry => (entry.count || 0) > 0)
      .map(entry => [
        entry.date,
        entry.count,
        entry.positive ?? 0,
        entry.neutral ?? 0,
        entry.negative ?? 0,
        formatFloat(entry.average ?? 0, 3),
      ]);
    if (!rows.length) {
      updateStatus("No sentiment data to export right now.", "warning");
      return;
    }
    downloadCSV(
      buildFilename("sentiment"),
      ["Date", "Messages", "Positive", "Neutral", "Negative", "Average Score"],
      rows,
    );
  }

  function exportSearchResults() {
    if (snapshotModeGetter()) {
      updateStatus("Can't export search results while viewing a shared link.", "warning");
      return;
    }
    const state = getSearchState();
    const results = state?.results ?? [];
    if (!results.length) {
      updateStatus("Run a search before exporting.", "warning");
      return;
    }
    const rows = results.map(result => [
      formatTimestampDisplay(result.timestamp),
      result.sender || "",
      (result.message || "").replace(/\r?\n/g, " "),
    ]);
    downloadCSV(
      buildFilename("search"),
      ["Timestamp", "Participant", "Message"],
      rows,
    );
  }

  async function handleDownloadMarkdownReport() {
    const analytics = getDatasetAnalytics();
    if (!analytics) {
      updateStatus("Load the chat summary before exporting a report.", "warning");
      return;
    }
    const theme = getExportThemeConfig();
    try {
      const { content } = await generateMarkdownReport(analytics, theme);
      downloadTextFile(
        buildReportFilename("report", "md"),
        content,
        "text/markdown;charset=utf-8;",
      );
      updateStatus(`Saved the ${theme.label} text report.`, "success");
    } catch (error) {
      console.error(error);
      updateStatus("Couldn't build the text report.", "error");
    }
  }

  async function handleDownloadSlidesReport() {
    const analytics = getDatasetAnalytics();
    if (!analytics) {
      updateStatus("Load the chat summary before exporting a report.", "warning");
      return;
    }
    const theme = getExportThemeConfig();
    try {
      const { content } = await generateSlidesHtml(analytics, theme);
      downloadTextFile(
        buildReportFilename("slides", "html"),
        content,
        "text/html;charset=utf-8;",
      );
      updateStatus(`Saved the ${theme.label} slide deck.`, "success");
    } catch (error) {
      console.error(error);
      updateStatus("Couldn't build the slide deck.", "error");
    }
  }

  return {
    exportParticipants,
    exportHourly,
    exportDaily,
    exportWeekly,
    exportWeekday,
    exportTimeOfDay,
    exportMessageTypes,
    exportChatJson,
    exportSentiment,
    exportSearchResults,
    handleDownloadMarkdownReport,
    handleDownloadSlidesReport,
    exportMessageSubtype,
  };
}

function formatSnapshotTimestamp(entry, formatter) {
  if (!entry) return "";
  if (entry.timestamp) {
    return formatter(entry.timestamp);
  }
  if (entry.timestamp_text) return entry.timestamp_text;
  return "";
}
