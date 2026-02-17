function formatSnapshotTimestamp(entry, formatter) {
  if (!entry) return "";
  if (entry.timestamp) {
    return formatter(entry.timestamp);
  }
  if (entry.timestamp_text) return entry.timestamp_text;
  return "";
}

function buildSystemExportConfig(entries = [], label, formatTimestampDisplay) {
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

export function buildMessageSubtypeConfig({ type, analytics, formatTimestampDisplay }) {
  const messageTypes = analytics?.message_types || {};
  const systemDetails = analytics?.system_summary?.details || {};
  return {
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
        : analytics?.polls?.entries) || [],
      headers: ["Timestamp", "Sender", "Title", "Options"],
      mapRow: entry => [
        formatSnapshotTimestamp(entry, formatTimestampDisplay),
        entry.sender || "",
        entry.title || "",
        Array.isArray(entry.options) ? entry.options.filter(Boolean).join(" | ") : "",
      ],
    },
    joins: buildSystemExportConfig(systemDetails.joins, "join events", formatTimestampDisplay),
    added: buildSystemExportConfig(systemDetails.added, "member additions", formatTimestampDisplay),
    left: buildSystemExportConfig(systemDetails.left, "members leaving", formatTimestampDisplay),
    removed: buildSystemExportConfig(systemDetails.removed, "member removals", formatTimestampDisplay),
    changed: buildSystemExportConfig(systemDetails.changed, "setting changes", formatTimestampDisplay),
    join_requests: buildSystemExportConfig(systemDetails.join_requests, "join requests", formatTimestampDisplay),
    other: buildSystemExportConfig(systemDetails.other, "other system events", formatTimestampDisplay),
  }[type];
}
