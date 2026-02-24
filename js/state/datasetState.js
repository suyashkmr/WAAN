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

function hashString(value, seed) {
  let hash = seed >>> 0;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
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
  let digest = 2166136261;
  entries.forEach(entry => {
    digest = hashString(entry?.type || "", digest);
    digest = hashString(entry?.timestamp || entry?.timestamp_text || entry?.date || "", digest);
    digest = hashString(entry?.sender || "", digest);
    digest = hashString(entry?.message_id || "", digest);
    digest = hashString(entry?.search_text || entry?.message || "", digest);
  });
  const digestHex = (digest >>> 0).toString(16);
  return `${entries.length}:${resolveStamp(first)}:${resolveStamp(last)}:${digestHex}`;
}
