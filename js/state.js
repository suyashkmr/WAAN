import { debounce } from "./utils.js";

const datasetState = {
  entries: [],
  analytics: null,
  datasetLabel: "sample chat",
  currentRange: "all",
  customRange: null,
  fingerprint: null,
  participantDirectory: null,
};

const chatLibrary = new Map();
const chatOrder = [];
let activeChatId = null;

const savedViews = [];
let compareSelection = {
  primary: null,
  secondary: null,
};

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

let statusCallback = null;

export function setStatusCallback(callback) {
  statusCallback = debounce(callback, 50);
}

export function updateStatus(message, tone = "info") {
  if (statusCallback) {
    statusCallback(message, tone);
  }
}

export function getDatasetState() {
  return datasetState;
}

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

export function getDatasetParticipantDirectory() {
  return datasetState.participantDirectory;
}

function generateChatId() {
  return `chat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function saveChatDataset(record = {}) {
  const id = (record.id || record.datasetId || generateChatId()).toString();
  const existing = chatLibrary.get(id);
  const timestamp = new Date().toISOString();
  const next = {
    id,
    label: record.label ?? existing?.label ?? `Chat ${chatOrder.length + 1}`,
    entries: record.entries ?? existing?.entries ?? [],
    analytics: record.analytics ?? existing?.analytics ?? null,
    fingerprint: record.fingerprint ?? existing?.fingerprint ?? null,
    participantDirectory: record.participantDirectory ?? existing?.participantDirectory ?? null,
    meta: {
      ...(existing?.meta ?? {}),
      ...(record.meta ?? {}),
    },
    addedAt: existing?.addedAt ?? timestamp,
    updatedAt: timestamp,
  };
  chatLibrary.set(id, next);
  if (!existing) {
    chatOrder.push(id);
  }
  return next;
}

export function listChatDatasets() {
  return chatOrder
    .map(id => chatLibrary.get(id))
    .filter(Boolean)
    .map(entry => {
      const metaCount = Number(entry.meta?.messageCount);
      return {
        id: entry.id,
        label: entry.label,
        messageCount: Number.isFinite(entry.analytics?.total_messages)
          ? entry.analytics.total_messages
          : Number.isFinite(metaCount)
            ? metaCount
            : null,
        dateRange: entry.analytics?.date_range ?? entry.meta?.dateRange ?? null,
        updatedAt: entry.updatedAt,
      };
    });
}

export function getChatDatasetById(id) {
  if (!id) return null;
  return chatLibrary.get(id) ?? null;
}

export function setActiveChatId(id) {
  activeChatId = id ?? null;
}

export function getActiveChatId() {
  return activeChatId;
}

function generateViewId() {
  return `view-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function addSavedView(view) {
  const record = { ...view };
  if (!record.id) {
    record.id = generateViewId();
  }
  savedViews.push(record);
  return record;
}

export function getSavedViews() {
  return savedViews.slice();
}

export function updateSavedView(id, updates) {
  const target = savedViews.find(view => view.id === id);
  if (!target) return null;
  if (typeof updates === "function") {
    updates(target);
  } else if (updates && typeof updates === "object") {
    Object.assign(target, updates);
  }
  return target;
}

export function removeSavedView(id) {
  const index = savedViews.findIndex(view => view.id === id);
  if (index === -1) return false;
  savedViews.splice(index, 1);
  if (compareSelection.primary === id) compareSelection.primary = null;
  if (compareSelection.secondary === id) compareSelection.secondary = null;
  return true;
}

export function clearSavedViews() {
  savedViews.length = 0;
  compareSelection = { primary: null, secondary: null };
}

export function setCompareSelection(primary, secondary) {
  compareSelection = { primary: primary ?? null, secondary: secondary ?? null };
}

export function getCompareSelection() {
  return { ...compareSelection };
}

const defaultSearchQuery = {
  text: "",
  participant: "",
  start: "",
  end: "",
};

const searchState = {
  query: { ...defaultSearchQuery },
  results: [],
  total: 0,
  lastRun: null,
  summary: null,
  lastRunHasFilters: false,
};

export function getSearchState() {
  return searchState;
}

export function setSearchQuery(query) {
  searchState.query = { ...defaultSearchQuery, ...(query || {}) };
}

export function setSearchResults(results, total, summary, meta = {}) {
  searchState.results = Array.isArray(results) ? results : [];
  searchState.total = Number.isFinite(total) ? total : 0;
  searchState.lastRun = new Date().toISOString();
  searchState.summary = summary ?? null;
  searchState.lastRunHasFilters = Boolean(meta.hasFilters);
}

export function resetSearchState() {
  searchState.query = { ...defaultSearchQuery };
  searchState.results = [];
  searchState.total = 0;
  searchState.lastRun = null;
  searchState.summary = null;
  searchState.lastRunHasFilters = false;
}

const analyticsCache = new Map();

export function getCachedAnalytics(key) {
  return analyticsCache.get(key) ?? null;
}

export function setCachedAnalytics(key, analytics) {
  if (!key) return;
  analyticsCache.set(key, analytics);
}

export function clearAnalyticsCache() {
  analyticsCache.clear();
}

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
