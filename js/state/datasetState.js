const datasetState = {
  entries: [],
  analytics: null,
  datasetLabel: "sample chat",
  currentRange: "all",
  customRange: null,
  fingerprint: null,
  participantDirectory: null,
};

export function setDatasetEntries(entries) {
  datasetState.entries = entries ?? [];
}

export function getDatasetEntries() {
  return datasetState.entries;
}

export function setDatasetAnalytics(analytics) {
  datasetState.analytics = analytics ?? null;
}

export function setDatasetLabel(label) {
  datasetState.datasetLabel = label ?? "sample chat";
}

export function setCurrentRange(range) {
  datasetState.currentRange = range ?? "all";
}

export function setCustomRange(range) {
  datasetState.customRange = range;
}

export function getDatasetAnalytics() {
  return datasetState.analytics;
}

export function getDatasetLabel() {
  return datasetState.datasetLabel;
}

export function getCurrentRange() {
  return datasetState.currentRange;
}

export function getCustomRange() {
  return datasetState.customRange;
}

export function setDatasetFingerprint(fingerprint) {
  datasetState.fingerprint = fingerprint ?? null;
}

export function getDatasetFingerprint() {
  return datasetState.fingerprint;
}

export function setDatasetParticipantDirectory(snapshot) {
  datasetState.participantDirectory = snapshot ?? null;
}

export function computeDatasetFingerprint(entries = []) {
  if (!Array.isArray(entries) || !entries.length) {
    return "0::";
  }
  const first = entries[0];
  const last = entries[entries.length - 1];
  const resolveStamp = entry =>
    entry?.timestamp ||
    entry?.timestamp_text ||
    entry?.date ||
    (typeof entry?.message === "string" ? `${entry.message.length}` : "");
  return `${entries.length}:${resolveStamp(first)}:${resolveStamp(last)}`;
}
