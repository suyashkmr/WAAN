import {
  computeAnalytics,
  getTimestamp,
} from "./analytics.js";
import {
  formatNumber,
  formatFloat,
  sanitizeText,
  toISODate,
  formatDisplayDate,
  formatDateRangeWithTime,
  formatTimestampDisplay,
  formatRelativeTime,
} from "./utils.js";
import {
  WEEKDAY_LONG,
  WEEKDAY_SHORT,
} from "./constants.js";
import {
  setStatusCallback,
  updateStatus,
  getDatasetEntries,
  setDatasetEntries,
  setDatasetAnalytics,
  getDatasetAnalytics,
  setDatasetLabel,
  getDatasetLabel,
  setCurrentRange,
  getCurrentRange,
  setCustomRange,
  getCustomRange,
  saveChatDataset,
  listChatDatasets,
  getChatDatasetById,
  setActiveChatId,
  getActiveChatId,
  addSavedView,
  getSavedViews,
  updateSavedView,
  removeSavedView,
  clearSavedViews,
  setCompareSelection,
  getCompareSelection,
  getSearchState,
  getHourlyState,
  updateHourlyState,
  resetHourlyFilters,
  getWeekdayState,
  updateWeekdayState,
  resetWeekdayFilters,
  getCachedAnalytics,
  setCachedAnalytics,
  clearAnalyticsCache,
} from "./state.js";
import { createExporters } from "./exporters.js";
import { createRelayController } from "./relayControls.js";
import {
  renderSummaryCards as renderSummarySection,
  renderParticipants as renderParticipantsSection,
} from "./analytics/summary.js";
import {
  renderTimeOfDayPanel,
  formatHourLabel,
  computeTimeOfDayDataset,
  renderHourlyHeatmapSection,
  renderDailySection,
  renderWeeklySection,
  renderWeekdaySection,
} from "./analytics/activity.js";
import { renderSentimentSection } from "./analytics/sentiment.js";
import { renderMessageTypesSection } from "./analytics/messageTypes.js";
import { renderPollsSection } from "./analytics/polls.js";
import { createSearchController } from "./search.js";
import { createSavedViewsController } from "./savedViews.js";
import {
  API_BASE,
  RELAY_BASE,
  BRAND_NAME,
  RELAY_SERVICE_NAME,
  RELAY_CLIENT_LABEL,
  RELAY_POLL_INTERVAL_MS,
  REMOTE_CHAT_REFRESH_INTERVAL_MS,
  REMOTE_MESSAGE_LIMIT,
  STATUS_AUTO_HIDE_DELAY_MS,
  STATUS_EXIT_DURATION_MS,
  motionPreferenceQuery,
  initialReduceMotionPreferred,
} from "./config.js";
import { EXPORT_THEME_STYLES } from "./theme.js";

let reduceMotionPreferred = initialReduceMotionPreferred;
let reduceMotionPreference = null; // "reduce" | "standard" | null (follow system)

if (motionPreferenceQuery) {
  const motionListener = event => {
    reduceMotionPreferred = event.matches;
    if (reduceMotionPreference === null) {
      syncReduceMotionState();
    } else {
      updateMotionToggleUI();
    }
  };
  if (typeof motionPreferenceQuery.addEventListener === "function") {
    motionPreferenceQuery.addEventListener("change", motionListener);
  } else if (typeof motionPreferenceQuery.addListener === "function") {
    motionPreferenceQuery.addListener(motionListener);
  }
}

function shouldReduceMotion() {
  if (reduceMotionPreference === "reduce") return true;
  if (reduceMotionPreference === "standard") return false;
  return reduceMotionPreferred;
}

function prefersReducedMotion() {
  return shouldReduceMotion();
}

function normalizeJid(value) {
  if (!value) return "";
  return String(value).trim().toLowerCase();
}

function stripJidSuffix(value) {
  return value.replace(/@[\w.]+$/, "");
}

function normalizeContactId(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (text.includes("@")) return normalizeJid(text);
  const digits = text.replace(/\D+/g, "");
  if (digits.length >= 5) return digits;
  return normalizeJid(text);
}

function shouldPreferLabel(next, current) {
  if (!current) return true;
  if (!next) return false;
  const currentIsNumber = /^\d+$/.test(current.replace(/\D+/g, ""));
  const nextIsNumber = /^\d+$/.test(next.replace(/\D+/g, ""));
  if (currentIsNumber && !nextIsNumber) return true;
  if (!currentIsNumber && nextIsNumber) return false;
  return next.length <= current.length;
}

function createParticipantDirectory(entries = [], participants = []) {
  const records = new Map();
  const aliasIndex = new Map();

  const ensureRecord = id => {
    const normalized = normalizeContactId(id);
    if (!normalized) return null;
    if (!records.has(normalized)) {
      records.set(normalized, { id: normalized, label: null, aliases: new Set() });
    }
    return records.get(normalized);
  };

  const register = (id, label) => {
    let record = ensureRecord(id);
    const cleanLabel = label ? String(label).trim() : "";
    if (!record && cleanLabel) {
      const aliasKey = cleanLabel.toLowerCase();
      record = aliasIndex.get(aliasKey);
      if (!record) {
        const aliasId = `alias:${aliasKey}`;
        record = { id: aliasId, label: null, aliases: new Set() };
        records.set(aliasId, record);
      }
    }
    if (!record) return null;
    if (cleanLabel) {
      if (!record.label || shouldPreferLabel(cleanLabel, record.label)) {
        record.label = cleanLabel;
      }
      record.aliases.add(cleanLabel);
      aliasIndex.set(cleanLabel.toLowerCase(), record);
    }
    return record;
  };

  participants.forEach(participant => {
    const label = participant.label || participant.name || participant.displayName || participant.pushname;
    const id = participant.id || participant.jid || participant.phone || participant.identifier;
    if (id || label) {
      register(id, label || (id ? stripJidSuffix(id) : ""));
    }
  });

  entries.forEach(entry => {
    register(entry.sender_jid || entry.sender_id || entry.sender, entry.sender);
  });

  return { records, aliasIndex };
}

function normalizeEntriesWithDirectory(entries = [], directory) {
  if (!directory) return entries;
  const { records, aliasIndex } = directory;

  const resolveRecord = entry => {
    const candidates = [entry.sender_jid, entry.sender_id, entry.sender];
    for (const candidate of candidates) {
      const normalized = normalizeContactId(candidate);
      if (normalized && records.has(normalized)) {
        return records.get(normalized);
      }
    }
    if (entry.sender) {
      const alias = aliasIndex.get(entry.sender.trim().toLowerCase());
      if (alias) return alias;
    }
    return null;
  };

  return entries.map(entry => {
    const record = resolveRecord(entry);
    const normalizedId =
      record?.id ||
      normalizeContactId(entry.sender_jid) ||
      normalizeContactId(entry.sender_id) ||
      normalizeContactId(entry.sender) ||
      entry.sender_id ||
      entry.sender;
    const displayName =
      record?.label ||
      (normalizedId && !normalizedId.startsWith("alias:") ? stripJidSuffix(normalizedId) : null) ||
      entry.sender ||
      "Unknown";
    return {
      ...entry,
      sender_id: normalizedId || entry.sender_id || entry.sender,
      sender: displayName,
    };
  });
}

function buildParticipantRoster(directory) {
  if (!directory) return [];
  const roster = [];
  directory.records.forEach(record => {
    const label = record.label || stripJidSuffix(record.id);
    if (label) {
      roster.push({ id: record.id, label });
    }
  });
  return roster;
}

const statusEl = document.getElementById("data-status");
const relayBannerEl = document.getElementById("relay-status-banner");
const relayBannerMessage = document.getElementById("relay-status-message");
const relayBannerMeta = document.getElementById("relay-status-meta");
const relayOnboardingSteps = document.querySelectorAll(".relay-step");
const summaryEl = document.getElementById("summary");
const participantsBody = document.querySelector("#top-senders tbody");
const participantsNote = document.getElementById("participants-note");
const participantsTopSelect = document.getElementById("participants-top-count");
const participantsSortSelect = document.getElementById("participants-sort");
const participantsTimeframeSelect = document.getElementById("participants-timeframe");
const participantPresetButtons = document.querySelectorAll("[data-participants-preset]");
const rangeSelect = document.getElementById("global-range");
const chatSelector = document.getElementById("chat-selector");
const relayStatusEl = document.getElementById("relay-connection-status");
const relayAccountEl = document.getElementById("relay-account-name");
const relayStartButton = document.getElementById("relay-start");
const relayStopButton = document.getElementById("relay-stop");
const relayLogoutButton = document.getElementById("relay-logout");
const relayReloadAllButton = document.getElementById("relay-reload-all");
const relayClearStorageButton = document.getElementById("relay-clear-storage");
const relayQrContainer = document.getElementById("relay-qr-container");
const relayQrImage = document.getElementById("relay-qr-image");
const relayHelpText = document.getElementById("relay-help-text");
const reduceMotionToggle = document.getElementById("reduce-motion-toggle");
const highContrastToggle = document.getElementById("high-contrast-toggle");
const customControls = document.getElementById("custom-range-controls");
const customStartInput = document.getElementById("custom-start");
const customEndInput = document.getElementById("custom-end");
const customApplyButton = document.getElementById("apply-custom-range");
const hourlyTopHourEl = document.getElementById("hourly-top-hour");
const brushSummaryEl = document.getElementById("hourly-brush-summary");
const filterNoteEl = document.getElementById("hourly-filter-note");
const hourlyChartEl = document.getElementById("hourly-chart");
const hourlyAnomaliesEl = document.getElementById("hourly-anomalies");
const dailyChartEl = document.getElementById("daily-chart");
const dailyAvgDayEl = document.getElementById("daily-avg-day");
const weeklyChartEl = document.getElementById("weekly-chart");
const weeklyCumulativeEl = document.getElementById("weekly-cumulative");
const weeklyRollingEl = document.getElementById("weekly-rolling");
const weeklyAverageEl = document.getElementById("weekly-average");
const weekdayChartEl = document.getElementById("weekday-chart");
const weekdayFilterNote = document.getElementById("weekday-filter-note");
const weekdayToggleWeekdays = document.getElementById("weekday-toggle-weekdays");
const weekdayToggleWeekends = document.getElementById("weekday-toggle-weekends");
const weekdayToggleWorking = document.getElementById("weekday-toggle-working");
const weekdayToggleOffhours = document.getElementById("weekday-toggle-offhours");
const weekdayHourStartInput = document.getElementById("weekday-hour-start");
const weekdayHourEndInput = document.getElementById("weekday-hour-end");
const messageTypeSummaryEl = document.getElementById("message-type-summary");
const messageTypeNoteEl = document.getElementById("message-types-note");
const downloadPdfButton = document.getElementById("download-pdf");
const downloadTimeOfDayButton = document.getElementById("download-timeofday");
const downloadParticipantsButton = document.getElementById("download-participants");
const downloadHourlyButton = document.getElementById("download-hourly");
const downloadDailyButton = document.getElementById("download-daily");
const downloadWeeklyButton = document.getElementById("download-weekly");
const downloadWeekdayButton = document.getElementById("download-weekday");
const downloadMessageTypesButton = document.getElementById("download-message-types");
const downloadSentimentButton = document.getElementById("download-sentiment");
const sentimentSummaryEl = document.getElementById("sentiment-summary");
const sentimentTrendNote = document.getElementById("sentiment-trend-note");
const sentimentDailyChart = document.getElementById("sentiment-daily-chart");
const sentimentPositiveList = document.getElementById("sentiment-top-positive");
const sentimentNegativeList = document.getElementById("sentiment-top-negative");
const savedViewNameInput = document.getElementById("saved-view-name");
const saveViewButton = document.getElementById("save-view");
const savedViewList = document.getElementById("saved-view-list");
const applySavedViewButton = document.getElementById("apply-saved-view");
const deleteSavedViewButton = document.getElementById("delete-saved-view");
const savedViewGallery = document.getElementById("saved-view-gallery");
const compareViewASelect = document.getElementById("compare-view-a");
const compareViewBSelect = document.getElementById("compare-view-b");
const compareViewsButton = document.getElementById("compare-views");
const compareSummaryEl = document.getElementById("compare-summary");
const searchForm = document.getElementById("advanced-search-form");
const searchKeywordInput = document.getElementById("search-keyword");
const searchParticipantSelect = document.getElementById("search-participant");
const searchStartInput = document.getElementById("search-start");
const searchEndInput = document.getElementById("search-end");
const resetSearchButton = document.getElementById("reset-search");
const downloadSearchButton = document.getElementById("download-search-results");
const searchResultsSummary = document.getElementById("search-results-summary");
const searchResultsList = document.getElementById("search-results-list");
const searchInsightsEl = document.getElementById("search-insights");
const highlightList = document.getElementById("highlight-list");
const downloadMarkdownButton = document.getElementById("download-markdown-report");
const downloadSlidesButton = document.getElementById("download-slides-report");
const logDrawerToggleButton = document.getElementById("log-drawer-toggle");
const logDrawerEl = document.getElementById("relay-log-drawer");
const logDrawerCloseButton = document.getElementById("relay-log-close");
const logDrawerClearButton = document.getElementById("relay-log-clear");
const logDrawerList = document.getElementById("relay-log-list");
const logDrawerConnectionLabel = document.getElementById("relay-log-connection");
const globalProgressEl = document.getElementById("global-progress");
const globalProgressLabel = document.getElementById("global-progress-label");
const toastContainer = document.getElementById("toast-container");
const compactToggleButton = document.getElementById("compact-toggle");
const onboardingOverlay = document.getElementById("onboarding-overlay");
const onboardingCopyEl = document.getElementById("onboarding-copy");
const onboardingStepLabel = document.getElementById("onboarding-step-label");
const onboardingSkipButton = document.getElementById("onboarding-skip");
const onboardingNextButton = document.getElementById("onboarding-next");
const heroStatusBadge = document.getElementById("hero-status-badge");
const heroStatusCopy = document.getElementById("hero-status-copy");
const hourlyNote = document.getElementById("hourly-note");
const dailyNote = document.getElementById("daily-note");
const weeklyNote = document.getElementById("weekly-note");
const weekdayNote = document.getElementById("weekday-note");
const timeOfDayNote = document.getElementById("timeofday-note");
const sentimentNote = document.getElementById("sentiment-note");
const searchNote = document.getElementById("search-note");
const datasetEmptyCallout = document.getElementById("dataset-empty-callout");
const datasetEmptyHeading = document.getElementById("dataset-empty-heading");
const datasetEmptyCopy = document.getElementById("dataset-empty-copy");
const TOASTS = [];
const MAX_TOASTS = 4;
const themeToggleInputs = Array.from(document.querySelectorAll('input[name="theme-option"]'));
const sectionNavInner = document.querySelector(".section-nav-inner");
const SECTION_NAV_ITEMS = [
  { id: "hero-panel", label: "Home" },
  { id: "relay-status-banner", label: "Relay Status" },
  { id: "actions-toolbar", label: "Actions" },
  { id: "summary", label: "Overview" },
  { id: "insight-highlights", label: "Highlights" },
  { id: "participants", label: "Participants" },
  { id: "hourly-activity", label: "Hourly Activity" },
  { id: "daily-activity", label: "Day by Day" },
  { id: "weekly-trend", label: "Week by Week" },
  { id: "weekday-trend", label: "Day of Week" },
  { id: "timeofday-trend", label: "Time of Day" },
  { id: "sentiment-overview", label: "Mood" },
  { id: "message-types", label: "Message Mix" },
  { id: "polls-card", label: "Polls" },
  { id: "saved-views-card", label: "Saved Views" },
  { id: "search-panel", label: "Search Messages" },
  { id: "faq-card", label: "FAQ" },
];
let sectionNavLinks = [];
let sectionNavItems = [];
const downloadChatJsonButton = document.getElementById("download-chat-json");
const timeOfDayWeekdayToggle = document.getElementById("timeofday-toggle-weekdays");
const timeOfDayWeekendToggle = document.getElementById("timeofday-toggle-weekends");
const timeOfDayHourStartInput = document.getElementById("timeofday-hour-start");
const timeOfDayHourEndInput = document.getElementById("timeofday-hour-end");
const timeOfDayHourStartLabel = document.getElementById("timeofday-hour-start-label");
const timeOfDayHourEndLabel = document.getElementById("timeofday-hour-end-label");
const timeOfDaySparklineEl = document.getElementById("timeofday-sparkline");
const timeOfDayBandsEl = document.getElementById("timeofday-bands");
const timeOfDayCalloutsEl = document.getElementById("timeofday-callouts");
const timeOfDayChartContainer = document.getElementById("timeofday-chart");
const pollsNote = document.getElementById("polls-note");
const pollsTotalEl = document.getElementById("polls-total");
const pollsCreatorsEl = document.getElementById("polls-creators");
const pollsListEl = document.getElementById("polls-list");
const dashboardRoot = document.querySelector("main");

const SEARCH_RESULT_LIMIT = 200;

const searchController = createSearchController({
  elements: {
    form: searchForm,
    keywordInput: searchKeywordInput,
    participantSelect: searchParticipantSelect,
    startInput: searchStartInput,
    endInput: searchEndInput,
    resetButton: resetSearchButton,
    resultsSummaryEl: searchResultsSummary,
    resultsListEl: searchResultsList,
    insightsEl: searchInsightsEl,
  },
  options: { resultLimit: SEARCH_RESULT_LIMIT },
  getSnapshotMode: () => snapshotMode,
});

const savedViewsController = createSavedViewsController({
  elements: {
    nameInput: savedViewNameInput,
    saveButton: saveViewButton,
    listSelect: savedViewList,
    applyButton: applySavedViewButton,
    deleteButton: deleteSavedViewButton,
    gallery: savedViewGallery,
    compareSelectA: compareViewASelect,
    compareSelectB: compareViewBSelect,
    compareButton: compareViewsButton,
    compareSummaryEl,
    rangeSelect,
    customStartInput,
    customEndInput,
  },
  dependencies: {
    getDatasetEntries,
    getDatasetAnalytics,
    getDatasetLabel,
    getCurrentRange,
    getCustomRange,
    setCurrentRange,
    setCustomRange,
    showCustomControls,
    addSavedView,
    getSavedViews,
    updateSavedView,
    removeSavedView,
    clearSavedViews,
    getCompareSelection,
    setCompareSelection,
    getHourlyState,
    updateHourlyState,
    getWeekdayState,
    updateWeekdayState,
    applyRangeAndRender,
    ensureDayFilters,
    ensureHourFilters,
    syncHourlyControlsWithState,
    ensureWeekdayDayFilters,
    ensureWeekdayHourFilters,
    syncWeekdayControlsWithState,
    describeRange,
    updateStatus,
    filterEntriesByRange,
    normalizeRangeValue,
  },
});
setDashboardLoadingState(true);
document.querySelectorAll(".summary-value").forEach(element => {
  element.setAttribute("data-skeleton", "value");
});

let hourlyControlsInitialised = false;
const participantFilters = {
  topCount: Number(participantsTopSelect?.value ?? 25) || 0,
  sortMode: participantsSortSelect?.value ?? "most",
  timeframe: participantsTimeframeSelect?.value ?? "all",
};

function getExportFilterSummary() {
  const rangeValue = normalizeRangeValue(getCurrentRange());
  const rangeLabel = describeRange(rangeValue);
  const parts = [`Range: ${rangeLabel}`];
  parts.push(`Participants: ${participantFilters.sortMode === "quiet" ? "Quietest" : "Most active"}`);
  if (participantFilters.topCount > 0) {
    parts.push(`Limit: Top ${participantFilters.topCount}`);
  }
  parts.push(`Timeframe: ${participantFilters.timeframe === "week" ? "Last 7 days" : "All time"}`);
  return parts;
}
let participantView = [];
const TIME_OF_DAY_BANDS = [
  { id: "late-night", label: "Late Night", start: 0, end: 4 },
  { id: "early-morning", label: "Early Morning", start: 5, end: 7 },
  { id: "morning", label: "Morning", start: 8, end: 11 },
  { id: "afternoon", label: "Afternoon", start: 12, end: 16 },
  { id: "evening", label: "Evening", start: 17, end: 20 },
  { id: "late-evening", label: "Late Evening", start: 21, end: 23 },
];
const TIME_OF_DAY_SPAN_WINDOW = 3;
let snapshotMode = false;

const {
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
} = createExporters({
  getDatasetAnalytics,
  getDatasetEntries,
  getDatasetLabel,
  getCurrentRange,
  getParticipantView: () => participantView,
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
  snapshotModeGetter: () => snapshotMode,
  buildMarkdownReport,
  buildSlidesHtml,
  getExportThemeConfig,
});

let analyticsWorkerInstance = null;
let analyticsWorkerRequestId = 0;
const analyticsWorkerRequests = new Map();
let activeAnalyticsRequest = 0;
let sectionNavObserver = null;
let activeSectionId = null;
let renderTaskToken = 0;
const remoteChatState = {
  list: [],
  lastFetchedAt: 0,
};
const relayController = createRelayController({
  elements: {
    relayStartButton,
    relayStopButton,
    relayLogoutButton,
    relayReloadAllButton,
    relayStatusEl,
    relayAccountEl,
    relayQrContainer,
    relayQrImage,
    relayHelpText,
    relayBannerEl,
    relayBannerMessage,
    relayBannerMeta,
    relayOnboardingSteps,
    logDrawerToggleButton,
    logDrawerCloseButton,
    logDrawerClearButton,
    logDrawerEl,
    logDrawerList,
    logDrawerConnectionLabel,
    relayClearStorageButton,
  },
  helpers: {
    updateStatus,
    withGlobalBusy,
    fetchJson,
    setRemoteChatList,
    getRemoteChatList,
    getRemoteChatsLastFetchedAt,
    refreshChatSelector,
    setDashboardLoadingState,
    setDatasetEmptyMessage,
    setDataAvailabilityState,
    updateHeroRelayStatus,
    applyEntriesToApp,
    encodeChatSelectorValue,
  },
  electronAPI: window.electronAPI,
});

const {
  startRelaySession,
  handlePrimaryActionClick: handleRelayPrimaryActionClick,
  stopRelaySession,
  logoutRelaySession,
  handleReloadAllChats,
  syncRelayChats,
  refreshRemoteChats,
  loadRemoteChat,
  refreshRelayStatus,
  startStatusPolling,
  handleLogClear,
  openLogDrawer,
  closeLogDrawer,
  handleLogDrawerDocumentClick,
  handleLogDrawerKeydown,
  initLogStream,
  isLogDrawerOpen,
} = relayController;
let globalBusyCount = 0;
self.windowToasts = [];
let dataAvailable = false;
self.windowToasts = [];
self.windowToasts = [];
const themeState = {
  preference: "system",
  mediaQuery: window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null,
};
const COMPACT_STORAGE_KEY = "waan-compact-mode";
const ONBOARDING_STORAGE_KEY = "waan-onboarding-dismissed";
const REDUCE_MOTION_STORAGE_KEY = "waan-reduce-motion";
const HIGH_CONTRAST_STORAGE_KEY = "waan-high-contrast";
const onboardingSteps = [
  {
    copy: "Use the relay banner to connect and keep an eye on status messages.",
    target: "#relay-status-banner",
  },
  {
    copy: "Track connection details and sync activity with the relay log drawer.",
    target: "#log-drawer-toggle",
  },
  {
    copy: "Need extra breathing room? Toggle Compact mode right from the toolbar.",
    target: "#compact-toggle",
  },
  {
    copy: "Guided insights highlight notable trends for your dataset.",
    target: "#insight-highlights",
  },
];
let onboardingIndex = 0;
let onboardingHighlight = null;
let statusHideTimer = null;
let statusExitTimer = null;

const deferRenderTask =
  typeof window !== "undefined" && typeof window.requestIdleCallback === "function"
    ? callback =>
      window.requestIdleCallback(
        deadline => {
          if (deadline.timeRemaining() > 8) {
            callback();
          } else {
            setTimeout(callback, 0);
          }
        },
        { timeout: 500 },
      )
    : callback => setTimeout(callback, 0);

function scheduleDeferredRender(task, token) {
  deferRenderTask(() => {
    if (token !== renderTaskToken) return;
    task();
  });
}

function ensureAnalyticsWorker() {
  if (analyticsWorkerInstance) return analyticsWorkerInstance;
  analyticsWorkerInstance = new Worker(new URL("./analyticsWorker.js", import.meta.url), {
    type: "module",
  });
  analyticsWorkerInstance.onmessage = event => {
    const { id, analytics, error } = event.data || {};
    const callbacks = analyticsWorkerRequests.get(id);
    if (!callbacks) return;
    analyticsWorkerRequests.delete(id);
    if (error) {
      callbacks.reject(new Error(error));
    } else {
      callbacks.resolve(analytics);
    }
  };
  analyticsWorkerInstance.onerror = event => {
    console.error("Analytics worker error", event);
    analyticsWorkerRequests.forEach(({ reject }) => {
      reject(new Error("Analytics worker encountered an error."));
    });
    analyticsWorkerRequests.clear();
  };
  return analyticsWorkerInstance;
}

function terminateAnalyticsWorker() {
  if (analyticsWorkerInstance) {
    analyticsWorkerInstance.terminate();
    analyticsWorkerInstance = null;
    analyticsWorkerRequests.clear();
  }
}

function buildSectionNav() {
  if (!sectionNavInner) return;
  sectionNavInner.innerHTML = "";
  sectionNavLinks = [];
  sectionNavItems = [];
  SECTION_NAV_ITEMS.forEach(item => {
    const targetEl = document.getElementById(item.id);
    if (!targetEl) return;
    const link = document.createElement("a");
    link.href = `#${item.id}`;
    link.textContent = item.label;
    sectionNavInner.appendChild(link);
    sectionNavLinks.push(link);
    sectionNavItems.push({ link, target: targetEl, id: item.id });
  });
}

function setActiveSectionNav(targetId) {
  if (!targetId || activeSectionId === targetId) return;
  activeSectionId = targetId;
  sectionNavLinks.forEach(link => {
    const linkTarget = link.getAttribute("href")?.replace(/^#/, "");
    link.classList.toggle("active", linkTarget === targetId);
  });
}

function setupSectionNavTracking() {
  if (!sectionNavItems.length || typeof window === "undefined" || !("IntersectionObserver" in window)) {
    return;
  }

  const navItems = sectionNavItems.slice();

  navItems.forEach(({ link, id }) => {
    link.addEventListener("click", () => {
      setActiveSectionNav(id);
    });
    link.addEventListener("focus", () => {
      setActiveSectionNav(id);
    });
    link.addEventListener("keydown", event => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const index = navItems.findIndex(entry => entry.link === link);
      if (index === -1) return;
      const delta = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (index + delta + navItems.length) % navItems.length;
      const nextEntry = navItems[nextIndex];
      if (nextEntry?.link) nextEntry.link.focus();
    });
  });

  if (!navItems.length) return;

  if (sectionNavObserver) {
    sectionNavObserver.disconnect();
    sectionNavObserver = null;
  }

  sectionNavObserver = new IntersectionObserver(
    observerEntries => {
      const visible = observerEntries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible.length) {
        setActiveSectionNav(visible[0].target.id);
        return;
      }
      const nearest = navItems
        .map(item => ({
          id: item.id,
          distance: Math.abs(item.target.getBoundingClientRect().top),
        }))
        .sort((a, b) => a.distance - b.distance)[0];
      if (nearest) setActiveSectionNav(nearest.id);
    },
    {
      root: null,
      rootMargin: "-60% 0px -35% 0px",
      threshold: [0.1, 0.25, 0.5, 0.75],
    },
  );

  navItems.forEach(({ target }) => sectionNavObserver.observe(target));

  const initial =
    navItems
      .map(item => ({
        id: item.id,
        top: item.target.getBoundingClientRect().top,
      }))
      .filter(Boolean)
      .sort((a, b) => {
        if (a.top >= 0 && b.top >= 0) return a.top - b.top;
        if (a.top >= 0) return -1;
        if (b.top >= 0) return 1;
        return a.top - b.top;
      })[0] || navItems[0];
  if (initial) setActiveSectionNav(initial.id);
}

function computeAnalyticsWithWorker(entries) {
  const worker = ensureAnalyticsWorker();
  const id = ++analyticsWorkerRequestId;
  return new Promise((resolve, reject) => {
    analyticsWorkerRequests.set(id, { resolve, reject });
    try {
      worker.postMessage({ id, entries });
    } catch (error) {
      analyticsWorkerRequests.delete(id);
      reject(error);
    }
  });
}

function encodeSnapshotPayload(data) {
  const json = JSON.stringify(data);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(json);
  let binary = "";
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return encodeURIComponent(btoa(binary));
}

function decodeSnapshotPayload(encoded) {
  const decoded = atob(decodeURIComponent(encoded));
  const bytes = Uint8Array.from(decoded, char => char.charCodeAt(0));
  const decoder = new TextDecoder();
  const json = decoder.decode(bytes);
  return JSON.parse(json);
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const tempInput = document.createElement("textarea");
  tempInput.value = text;
  tempInput.setAttribute("readonly", "true");
  tempInput.style.position = "absolute";
  tempInput.style.left = "-9999px";
  document.body.appendChild(tempInput);
  const selection = document.getSelection();
  const selected = selection ? selection.rangeCount > 0 ? selection.getRangeAt(0) : null : null;
  tempInput.select();
  document.execCommand("copy");
  document.body.removeChild(tempInput);
  if (selected && selection) {
    selection.removeAllRanges();
    selection.addRange(selected);
  }
}

function encodeChatSelectorValue(source, id) {
  return `${source}:${id}`;
}

function decodeChatSelectorValue(value) {
  if (!value) return null;
  const [prefix, ...rest] = value.split(":");
  if (!prefix || !rest.length) return null;
  return { source: prefix, id: rest.join(":") };
}

function setDashboardLoadingState(isLoading) {
  if (!dashboardRoot) return;
  dashboardRoot.classList.toggle("is-loading", Boolean(isLoading));
}

function setDatasetEmptyMessage(headingText, copyText) {
  if (datasetEmptyHeading && headingText) {
    datasetEmptyHeading.textContent = headingText;
  }
  if (datasetEmptyCopy && copyText) {
    datasetEmptyCopy.textContent = copyText;
  }
}

function setDataAvailabilityState(hasData) {
  dataAvailable = Boolean(hasData);
  const buttons = [
    downloadPdfButton,
    downloadMarkdownButton,
    downloadSlidesButton,
    downloadChatJsonButton,
    downloadParticipantsButton,
    downloadHourlyButton,
    downloadDailyButton,
    downloadWeeklyButton,
    downloadWeekdayButton,
    downloadTimeOfDayButton,
    downloadMessageTypesButton,
    downloadSentimentButton,
    downloadSearchButton,
  ];
  buttons.forEach(button => {
    if (!button) return;
    button.disabled = !dataAvailable;
    if (button.tagName === "BUTTON") {
      if (!dataAvailable) {
        button.setAttribute("title", "Load a chat to enable this action.");
      } else {
        button.removeAttribute("title");
      }
    }
  });
  if (datasetEmptyCallout) {
    datasetEmptyCallout.classList.toggle("hidden", dataAvailable);
  }
  if (!dataAvailable) {
    setDatasetEmptyMessage(
      "No chat is selected yet.",
      "Start the relay desktop app, press Connect, scan the QR code, then choose a mirrored chat from “Loaded chats”.",
    );
    updateSectionNarratives(null);
  }
  savedViewsController.setDataAvailability(Boolean(hasData));
  savedViewsController.refreshUI();
}

function setGlobalBusy(isBusy, message = "Working…") {
  if (!globalProgressEl || !globalProgressLabel) return;
  if (isBusy) {
    globalBusyCount += 1;
    globalProgressLabel.textContent = message;
    globalProgressEl.hidden = false;
  } else if (globalBusyCount > 0) {
    globalBusyCount -= 1;
    if (globalBusyCount === 0) {
      globalProgressEl.hidden = true;
    }
  }
}

async function withGlobalBusy(task, message = "Working…") {
  setGlobalBusy(true, message);
  try {
    return await task();
  } finally {
    setGlobalBusy(false);
  }
}

function showToast(message, tone = "info", { duration = 5000 } = {}) {
  if (!toastContainer) return;
  const toast = document.createElement("div");
  toast.className = `toast ${tone}`;
  const body = document.createElement("div");
  body.className = "toast-message";
  body.textContent = message;
  const close = document.createElement("button");
  close.type = "button";
  close.className = "toast-close";
  close.setAttribute("aria-label", "Dismiss");
  close.textContent = "×";
  close.addEventListener("click", () => dismissToast(toast));
  toast.appendChild(body);
  toast.appendChild(close);
  toastContainer.appendChild(toast);
  TOASTS.push(toast);
  while (TOASTS.length > MAX_TOASTS) {
    const expired = TOASTS.shift();
    expired?.remove();
  }
  setTimeout(() => dismissToast(toast), duration);
}

function dismissToast(toast) {
  if (!toast?.isConnected) return;
  toast.classList.add("toast-dismiss");
  setTimeout(() => {
    toast.remove();
    const index = TOASTS.indexOf(toast);
    if (index >= 0) TOASTS.splice(index, 1);
  }, 150);
}

function startOnboarding() {
  if (!onboardingOverlay || localStorage.getItem(ONBOARDING_STORAGE_KEY) === "done") return;
  onboardingIndex = 0;
  document.body.classList.add("onboarding-active");
  onboardingOverlay.setAttribute("aria-hidden", "false");
  showOnboardingStep(onboardingIndex);
}

function showOnboardingStep(index) {
  if (!onboardingOverlay || !onboardingCopyEl) return;
  const step = onboardingSteps[index];
  if (!step) {
    finishOnboarding();
    return;
  }
  onboardingCopyEl.textContent = step.copy;
  if (onboardingStepLabel) {
    onboardingStepLabel.textContent = `Step ${index + 1} of ${onboardingSteps.length}`;
  }
  highlightTarget(step.target);
  onboardingNextButton.textContent = index === onboardingSteps.length - 1 ? "Done" : "Next";
}

function highlightTarget(selector) {
  if (onboardingHighlight) {
    onboardingHighlight.classList.remove("onboarding-highlight");
    onboardingHighlight = null;
  }
  if (!selector) return;
  const target = document.querySelector(selector);
  if (target) {
    onboardingHighlight = target;
    target.classList.add("onboarding-highlight");
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function advanceOnboarding() {
  onboardingIndex += 1;
  if (onboardingIndex >= onboardingSteps.length) {
    finishOnboarding();
  } else {
    showOnboardingStep(onboardingIndex);
  }
}

function skipOnboarding() {
  finishOnboarding();
}

function finishOnboarding() {
  if (onboardingHighlight) {
    onboardingHighlight.classList.remove("onboarding-highlight");
    onboardingHighlight = null;
  }
  onboardingOverlay?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("onboarding-active");
  if (onboardingStepLabel) onboardingStepLabel.textContent = "";
  localStorage.setItem(ONBOARDING_STORAGE_KEY, "done");
}

function applyCompactMode(enabled) {
  document.body.dataset.compact = enabled ? "true" : "false";
  if (compactToggleButton) {
    compactToggleButton.setAttribute("aria-pressed", String(enabled));
    compactToggleButton.textContent = enabled ? "Comfort mode" : "Compact mode";
  }
  localStorage.setItem(COMPACT_STORAGE_KEY, enabled ? "true" : "false");
}

function initCompactMode() {
  const saved = localStorage.getItem(COMPACT_STORAGE_KEY);
  const enabled = saved === "true";
  applyCompactMode(enabled);
  compactToggleButton?.addEventListener("click", () => {
    applyCompactMode(!(document.body.dataset.compact === "true"));
    showToast(document.body.dataset.compact === "true" ? "Compact mode enabled." : "Comfort mode enabled.", "info", {
      duration: 3000,
    });
  });
}

function updateMotionToggleUI() {
  if (!reduceMotionToggle) return;
  const shouldReduce = shouldReduceMotion();
  let text = "Motion: Standard";
  let title = "Animations and depth effects are enabled.";
  let ariaPressed = "mixed";
  if (reduceMotionPreference === "reduce") {
    text = "Motion: Reduced";
    title = "Animations and blurs are minimized for accessibility.";
    ariaPressed = "true";
  } else if (reduceMotionPreference === "standard") {
    text = "Motion: Standard";
    title = "Animations and depth effects are enabled.";
    ariaPressed = "false";
  } else {
    text = shouldReduce ? "Motion: System (reduced)" : "Motion: System";
    title = shouldReduce
      ? "Following your OS preference to limit animations."
      : "Following your OS preference.";
    ariaPressed = "mixed";
  }
  reduceMotionToggle.setAttribute("aria-pressed", ariaPressed);
  reduceMotionToggle.textContent = text;
  reduceMotionToggle.title = title;
}

function syncReduceMotionState() {
  const shouldReduce = shouldReduceMotion();
  if (document.body) {
    if (shouldReduce) {
      document.body.dataset.reduceMotion = "true";
    } else {
      delete document.body.dataset.reduceMotion;
    }
  }
  updateMotionToggleUI();
}

function applyReduceMotionPreference(mode, { persist = true } = {}) {
  if (mode !== "reduce" && mode !== "standard") {
    reduceMotionPreference = null;
  } else {
    reduceMotionPreference = mode;
  }
  if (persist) {
    if (reduceMotionPreference) {
      localStorage.setItem(REDUCE_MOTION_STORAGE_KEY, reduceMotionPreference);
    } else {
      localStorage.removeItem(REDUCE_MOTION_STORAGE_KEY);
    }
  }
  syncReduceMotionState();
}

function applyHighContrastPreference(enabled, { persist = true } = {}) {
  if (document.body) {
    if (enabled) {
      document.body.dataset.contrast = "high";
    } else {
      delete document.body.dataset.contrast;
    }
  }
  if (highContrastToggle) {
    highContrastToggle.setAttribute("aria-pressed", String(enabled));
    highContrastToggle.textContent = enabled ? "Contrast: Boosted" : "Contrast: Standard";
    highContrastToggle.title = enabled
      ? "Colors switch to a higher-contrast palette for easier reading."
      : "Standard contrast restored.";
  }
  if (persist) {
    localStorage.setItem(HIGH_CONTRAST_STORAGE_KEY, enabled ? "true" : "false");
  }
}

function initAccessibilityControls() {
  const savedMotion = localStorage.getItem(REDUCE_MOTION_STORAGE_KEY);
  const initialMotion = savedMotion === "reduce" || savedMotion === "standard" ? savedMotion : null;
  applyReduceMotionPreference(initialMotion, { persist: false });
  reduceMotionToggle?.addEventListener("click", () => {
    let nextPreference;
    if (reduceMotionPreference === null) {
      nextPreference = "reduce";
    } else if (reduceMotionPreference === "reduce") {
      nextPreference = "standard";
    } else {
      nextPreference = null;
    }
    applyReduceMotionPreference(nextPreference);
    const toastMessage = nextPreference === "reduce"
      ? "Animations simplified."
      : nextPreference === "standard"
        ? "Full motion restored."
        : "Following your system preference for motion.";
    showToast(toastMessage, "info", { duration: 2500 });
  });

  const contrastSaved = localStorage.getItem(HIGH_CONTRAST_STORAGE_KEY) === "true";
  applyHighContrastPreference(contrastSaved, { persist: false });
  highContrastToggle?.addEventListener("click", () => {
    const next = !(document.body?.dataset.contrast === "high");
    applyHighContrastPreference(next);
    showToast(next ? "High-contrast mode on." : "Standard contrast mode.", next ? "success" : "info", {
      duration: 2500,
    });
  });
}

function syncHeroPillsWithRange() { }

function applyHeroRange(rangeValue) {
  if (!rangeSelect || !rangeValue) return;
  if (rangeSelect.value !== rangeValue) {
    rangeSelect.value = rangeValue;
  }
  handleRangeChange();
}

function applyTheme(preference) {
  const root = document.documentElement;
  if (!root) return;
  root.dataset.theme = preference;
  localStorage.setItem("waan-theme-preference", preference);
  if (preference === "system" && themeState.mediaQuery) {
    root.dataset.colorScheme = themeState.mediaQuery.matches ? "dark" : "light";
  } else if (preference === "dark") {
    root.dataset.colorScheme = "dark";
  } else {
    root.dataset.colorScheme = "light";
  }
}

function animateCardSection(content, expand) {
  if (!content) return;
  content.classList.add("collapsible");
  if (prefersReducedMotion()) {
    content.style.display = expand ? "" : "none";
    content.style.maxHeight = "";
    content.style.opacity = "";
    return;
  }
  if (expand) {
    content.style.display = "";
    const height = content.scrollHeight;
    content.style.maxHeight = "0px";
    content.style.opacity = "0";
    requestAnimationFrame(() => {
      content.style.maxHeight = `${height}px`;
      content.style.opacity = "1";
    });
    const onEnd = () => {
      content.style.maxHeight = "";
      content.style.opacity = "";
      content.removeEventListener("transitionend", onEnd);
    };
    content.addEventListener("transitionend", onEnd, { once: true });
  } else {
    const height = content.scrollHeight;
    content.style.maxHeight = `${height}px`;
    requestAnimationFrame(() => {
      content.style.maxHeight = "0px";
      content.style.opacity = "0";
    });
    const onEnd = () => {
      content.style.display = "none";
      content.style.maxHeight = "";
      content.style.opacity = "";
      content.removeEventListener("transitionend", onEnd);
    };
    content.addEventListener("transitionend", onEnd, { once: true });
  }
}

function showStatusMessage(message, tone) {
  if (!statusEl) return;
  statusEl.classList.remove("hidden", "is-exiting", "success", "warning", "error");
  if (tone) {
    statusEl.classList.add(tone);
  }
  statusEl.textContent = message;
  if (statusHideTimer) {
    clearTimeout(statusHideTimer);
    statusHideTimer = null;
  }
  if (statusExitTimer) {
    clearTimeout(statusExitTimer);
    statusExitTimer = null;
  }
  requestAnimationFrame(() => {
    statusEl.classList.add("is-active");
  });
  statusHideTimer = window.setTimeout(() => beginStatusExit(), STATUS_AUTO_HIDE_DELAY_MS);
}

function beginStatusExit() {
  if (!statusEl) return;
  statusEl.classList.add("is-exiting");
  if (statusExitTimer) {
    clearTimeout(statusExitTimer);
  }
  statusExitTimer = window.setTimeout(() => finalizeStatusExit(), STATUS_EXIT_DURATION_MS);
}

function finalizeStatusExit() {
  if (!statusEl) return;
  statusEl.classList.remove("is-active", "is-exiting", "success", "warning", "error");
  statusEl.classList.add("hidden");
}

function initThemeControls() {
  const saved = localStorage.getItem("waan-theme-preference");
  const initial = saved || "system";
  themeState.preference = initial;
  applyTheme(initial);
  themeToggleInputs.forEach(input => {
    input.checked = input.value === initial;
    input.addEventListener("change", () => {
      if (input.checked) {
        themeState.preference = input.value;
        applyTheme(input.value);
      }
    });
  });
  if (themeState.mediaQuery) {
    themeState.mediaQuery.addEventListener("change", () => {
      if (themeState.preference === "system") {
        applyTheme("system");
      }
    });
  }
}

function getInterfaceColorScheme() {
  const root = document.documentElement;
  const scheme = root?.dataset.colorScheme === "light" ? "light" : "dark";
  return scheme === "light" ? "light" : "dark";
}

function getExportThemeConfig() {
  const scheme = getInterfaceColorScheme();
  const theme = EXPORT_THEME_STYLES[scheme] || EXPORT_THEME_STYLES.dark;
  return {
    id: scheme,
    ...theme,
  };
}

function formatLocalChatLabel(chat) {
  const parts = [chat.label || "Untitled chat"];
  if (Number.isFinite(chat.messageCount)) {
    parts.push(`${formatNumber(chat.messageCount)} msgs`);
  }
  if (chat.dateRange?.start && chat.dateRange?.end) {
    parts.push(`${formatDisplayDate(chat.dateRange.start)} → ${formatDisplayDate(chat.dateRange.end)}`);
  }
  return parts.join(" · ");
}

function formatRemoteChatLabel(chat) {
  const parts = [chat.name || chat.id || `${BRAND_NAME} chat`];
  if (Number.isFinite(chat.messageCount)) {
    parts.push(`${formatNumber(chat.messageCount)} msgs`);
  }
  if (chat.lastMessageAt) {
    parts.push(`Active ${formatDisplayDate(chat.lastMessageAt)}`);
  }
  return parts.join(" · ");
}

function setRemoteChatList(list = []) {
  remoteChatState.list = Array.isArray(list) ? list : [];
  remoteChatState.lastFetchedAt = Date.now();
}

function getRemoteChatList() {
  return remoteChatState.list;
}

function getRemoteChatsLastFetchedAt() {
  return remoteChatState.lastFetchedAt;
}

function stripRelaySuffix(value) {
  if (!value) return "";
  return value.replace(/@(?:c|g)\.us$/gi, "");
}

function formatRelayAccount(account) {
  if (!account) return "";
  if (account.pushName) return account.pushName;
  if (account.wid) return stripRelaySuffix(account.wid);
  return "";
}

async function refreshChatSelector() {
  if (!chatSelector) {
    return;
  }

  const storedChats = listChatDatasets();
  const remoteChats = getRemoteChatList();
  if (!storedChats.length && !remoteChats.length) {
    chatSelector.innerHTML = '<option value="">No chats loaded yet</option>';
    chatSelector.value = "";
    chatSelector.disabled = true;
    return;
  }

  chatSelector.innerHTML = "";

  if (storedChats.length) {
    const storedGroup = document.createElement("optgroup");
    storedGroup.label = "Your chats";
    storedChats.forEach(chat => {
      const option = document.createElement("option");
      option.value = encodeChatSelectorValue("local", chat.id);
      option.textContent = formatLocalChatLabel(chat);
      storedGroup.appendChild(option);
    });
    chatSelector.appendChild(storedGroup);
  }

  if (remoteChats.length) {
    const remoteGroup = document.createElement("optgroup");
    remoteGroup.label = `${BRAND_NAME} account`;
    remoteChats.forEach(chat => {
      const option = document.createElement("option");
      option.value = encodeChatSelectorValue("remote", chat.id);
      option.textContent = formatRemoteChatLabel(chat);
      remoteGroup.appendChild(option);
    });
    chatSelector.appendChild(remoteGroup);
  }

  const activeValue = getActiveChatId();
  const availableValues = Array.from(chatSelector.options).map(option => option.value);
  const resolvedValue = activeValue && availableValues.includes(activeValue)
    ? activeValue
    : availableValues[0];
  if (resolvedValue) {
    chatSelector.value = resolvedValue;
    setActiveChatId(resolvedValue);
  }
  chatSelector.disabled = snapshotMode;
}

async function handleChatSelectionChange(event) {
  if (snapshotMode) return;
  const decoded = decodeChatSelectorValue(event.target.value);
  if (!decoded) return;
  if (event.target.value === getActiveChatId()) return;
  const { source, id } = decoded;
  try {
    event.target.disabled = true;
    if (source === "local") {
      const dataset = getChatDatasetById(id);
      if (!dataset) {
        updateStatus("We couldn't load that chat.", "error");
        await refreshChatSelector();
        return;
      }
      await applyEntriesToApp(dataset.entries, dataset.label, {
        datasetId: dataset.id,
        analyticsOverride: dataset.analytics ?? null,
        statusMessage: `Switched to ${dataset.label}.`,
        selectionValue: event.target.value,
        participants: dataset.meta?.participants || [],
      });
    } else if (source === "remote") {
      await loadRemoteChat(id);
    }
  } catch (error) {
    console.error(error);
    updateStatus("We couldn't switch chats.", "error");
  } finally {
    if (!snapshotMode) {
      event.target.disabled = false;
    }
  }
}

function buildParticipantDetail(entry) {
  const first = entry.first_message
    ? sanitizeText(formatDisplayDate(entry.first_message))
    : null;
  const last = entry.last_message
    ? sanitizeText(formatDisplayDate(entry.last_message))
    : null;
  let rangeText = "—";
  if (first && last) rangeText = `${first} → ${last}`;
  else if (first) rangeText = first;
  else if (last) rangeText = last;

  const shareText = Number.isFinite(entry.share) ? `${formatFloat(entry.share * 100, 1)}%` : "—";
  const avgWordsText = Number.isFinite(entry.avg_words) ? `${formatFloat(entry.avg_words, 1)} words` : "—";
  const avgCharsText = Number.isFinite(entry.avg_chars) ? `${formatFloat(entry.avg_chars, 1)} chars` : "—";
  const sentimentSummary = (() => {
    if (!entry.sentiment || !Number.isFinite(entry.sentiment.average)) return "—";
    const positiveShare = entry.count ? formatFloat((entry.sentiment.positive / entry.count) * 100, 0) : null;
    const negativeShare = entry.count ? formatFloat((entry.sentiment.negative / entry.count) * 100, 0) : null;
    const parts = [
      formatSentimentScore(entry.sentiment.average, 2),
      positiveShare !== null ? `${positiveShare}% positive` : null,
      negativeShare !== null ? `${negativeShare}% negative` : null,
    ].filter(Boolean);
    return parts.join(" · ");
  })();
  const rawTopHour = entry.top_hour
    ? `${String(entry.top_hour.hour).padStart(2, "0")}:00 (${formatNumber(entry.top_hour.count)} msgs)`
    : "No hourly data yet";
  const weekdayName = entry.top_weekday
    ? WEEKDAY_LONG[entry.top_weekday.dayIndex] ?? `Day ${entry.top_weekday.dayIndex + 1}`
    : null;
  const rawTopWeekday = weekdayName
    ? `${weekdayName} (${formatNumber(entry.top_weekday.count)} msgs)`
    : "No weekday data yet";
  const topHourText = sanitizeText(rawTopHour);
  const topWeekdayText = sanitizeText(rawTopWeekday);

  return `
    <div class="participant-detail">
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">Active range</span>
          <span class="detail-value">${rangeText}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Share of messages</span>
          <span class="detail-value">${shareText}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Average length</span>
          <span class="detail-value">${avgWordsText} · ${avgCharsText}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Sentiment</span>
          <span class="detail-value">${sanitizeText(sentimentSummary)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Top hour</span>
          <span class="detail-value">${topHourText}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Busiest weekday</span>
          <span class="detail-value">${topWeekdayText}</span>
        </div>
      </div>
    </div>
  `;
}

setStatusCallback((message, tone) => {
  if (!statusEl) return;
  showStatusMessage(message, tone);
  if (tone === "success" || tone === "warning" || tone === "error") {
    showToast(message, tone);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  attachEventHandlers();
  initRelayControls();
  initThemeControls();
  initCompactMode();
  initAccessibilityControls();
  setDataAvailabilityState(false);
  onboardingSkipButton?.addEventListener("click", skipOnboarding);
  onboardingNextButton?.addEventListener("click", advanceOnboarding);
  setTimeout(() => startOnboarding(), 500);
  if (window.electronAPI?.onRelayAction) {
    window.electronAPI.onRelayAction(action => {
      if (action === "connect") {
        startRelaySession();
      } else if (action === "disconnect") {
        stopRelaySession();
      }
    });
  }
  buildSectionNav();
  setupSectionNavTracking();
  Array.from(document.querySelectorAll(".card-toggle")).forEach(toggle => {
    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      const targetId = toggle.dataset.target;
      const content = targetId ? document.getElementById(targetId) : null;
      const card = toggle.closest(".card");
      const next = !expanded;
      toggle.setAttribute("aria-expanded", String(next));
      if (content) animateCardSection(content, next);
      if (card) card.classList.toggle("collapsed", !next);
    });
  });
  searchController.init();
  savedViewsController.init();
  savedViewsController.setDataAvailability(dataAvailable);
  savedViewsController.setSnapshotMode(snapshotMode);
  const viewingSnapshot = tryLoadSnapshotFromHash();
  refreshChatSelector();
  if (!viewingSnapshot) {
    updateStatus(`Start ${RELAY_SERVICE_NAME} to mirror chat app chats here.`, "info");
  }
});

function attachEventHandlers() {
  if (chatSelector) {
    chatSelector.addEventListener("change", handleChatSelectionChange);
  }
  if (rangeSelect) {
    rangeSelect.addEventListener("change", handleRangeChange);
  }

  if (customApplyButton) {
    customApplyButton.addEventListener("click", async () => {
      const start = customStartInput?.value;
      const end = customEndInput?.value;
      if (!start || !end) {
        updateStatus("Please pick both a start and end date.", "warning");
        return;
      }
      await applyCustomRange(start, end);
    });
  }

  if (downloadParticipantsButton) {
    downloadParticipantsButton.addEventListener("click", exportParticipants);
  }
  if (downloadHourlyButton) {
    downloadHourlyButton.addEventListener("click", exportHourly);
  }
  if (downloadDailyButton) {
    downloadDailyButton.addEventListener("click", exportDaily);
  }
  if (downloadWeeklyButton) {
    downloadWeeklyButton.addEventListener("click", exportWeekly);
  }
  if (downloadWeekdayButton) {
    downloadWeekdayButton.addEventListener("click", exportWeekday);
  }
  if (downloadTimeOfDayButton) {
    downloadTimeOfDayButton.addEventListener("click", exportTimeOfDay);
  }
  if (downloadMessageTypesButton) {
    downloadMessageTypesButton.addEventListener("click", exportMessageTypes);
  }
  if (downloadChatJsonButton) {
    downloadChatJsonButton.addEventListener("click", exportChatJson);
  }
  if (downloadSentimentButton) {
    downloadSentimentButton.addEventListener("click", exportSentiment);
  }
  document.querySelectorAll(".stat-download").forEach(button => {
    button.addEventListener("click", () => {
      const type = button.dataset.export;
      if (type) {
        exportMessageSubtype(type);
      }
    });
  });
  if (downloadMarkdownButton) {
    downloadMarkdownButton.addEventListener("click", handleDownloadMarkdownReport);
  }
  if (downloadSlidesButton) {
    downloadSlidesButton.addEventListener("click", handleDownloadSlidesReport);
  }
  if (downloadSearchButton) {
    downloadSearchButton.addEventListener("click", exportSearchResults);
  }
  if (downloadPdfButton) {
    downloadPdfButton.addEventListener("click", handleDownloadPdfReport);
  }

  if (participantsTopSelect) {
    participantsTopSelect.addEventListener("change", handleParticipantsTopChange);
  }
  if (participantsSortSelect) {
    participantsSortSelect.addEventListener("change", handleParticipantsSortChange);
  }
  if (participantsTimeframeSelect) {
    participantsTimeframeSelect.addEventListener("change", handleParticipantsTimeframeChange);
  }
  if (participantPresetButtons?.length) {
    participantPresetButtons.forEach(button => {
      button.addEventListener("click", handleParticipantPresetClick);
    });
  }
  if (participantsBody) {
    participantsBody.addEventListener("click", handleParticipantRowToggle);
  }
  if (weekdayToggleWeekdays) {
    weekdayToggleWeekdays.addEventListener("change", () => {
      updateWeekdayState({ filters: { weekdays: weekdayToggleWeekdays.checked } });
      ensureWeekdayDayFilters();
      rerenderWeekdayFromState();
    });
  }
  if (weekdayToggleWeekends) {
    weekdayToggleWeekends.addEventListener("change", () => {
      updateWeekdayState({ filters: { weekends: weekdayToggleWeekends.checked } });
      ensureWeekdayDayFilters();
      rerenderWeekdayFromState();
    });
  }
  if (weekdayToggleWorking) {
    weekdayToggleWorking.addEventListener("change", () => {
      updateWeekdayState({ filters: { working: weekdayToggleWorking.checked } });
      ensureWeekdayHourFilters();
      rerenderWeekdayFromState();
    });
  }
  if (weekdayToggleOffhours) {
    weekdayToggleOffhours.addEventListener("change", () => {
      updateWeekdayState({ filters: { offhours: weekdayToggleOffhours.checked } });
      ensureWeekdayHourFilters();
      rerenderWeekdayFromState();
    });
  }
  if (timeOfDayWeekdayToggle) {
    timeOfDayWeekdayToggle.addEventListener("change", () => {
      updateHourlyState({
        filters: {
          ...getHourlyState().filters,
          weekdays: timeOfDayWeekdayToggle.checked,
        },
      });
      ensureDayFilters();
      syncHourlyControlsWithState();
      rerenderHourlyFromState();
    });
  }
  if (timeOfDayWeekendToggle) {
    timeOfDayWeekendToggle.addEventListener("change", () => {
      updateHourlyState({
        filters: {
          ...getHourlyState().filters,
          weekends: timeOfDayWeekendToggle.checked,
        },
      });
      ensureDayFilters();
      syncHourlyControlsWithState();
      rerenderHourlyFromState();
    });
  }
  if (timeOfDayHourStartInput && timeOfDayHourEndInput) {
    const updateTimeOfDayBrush = () => {
      let start = Number(timeOfDayHourStartInput.value);
      let end = Number(timeOfDayHourEndInput.value);
      if (start > end) [start, end] = [end, start];
      updateHourlyState({ brush: { start, end } });
      syncHourlyControlsWithState();
      rerenderHourlyFromState();
    };
    timeOfDayHourStartInput.addEventListener("input", updateTimeOfDayBrush);
    timeOfDayHourEndInput.addEventListener("input", updateTimeOfDayBrush);
  }
  if (weekdayHourStartInput && weekdayHourEndInput) {
    const updateBrush = () => {
      let start = Number(weekdayHourStartInput.value);
      let end = Number(weekdayHourEndInput.value);
      if (start > end) [start, end] = [end, start];
      updateWeekdayState({ brush: { start, end } });
      weekdayHourStartInput.value = String(start);
      weekdayHourEndInput.value = String(end);
      const startLabel = document.getElementById("weekday-hour-start-label");
      const endLabel = document.getElementById("weekday-hour-end-label");
      if (startLabel) startLabel.textContent = `${String(start).padStart(2, "0")}:00`;
      if (endLabel) endLabel.textContent = `${String(end).padStart(2, "0")}:00`;
      rerenderWeekdayFromState();
    };
    weekdayHourStartInput.addEventListener("input", updateBrush);
    weekdayHourEndInput.addEventListener("input", updateBrush);
  }
}

function initRelayControls() {
  if (!relayStartButton || !relayStatusEl) {
    return;
  }
  relayStartButton.addEventListener("click", handleRelayPrimaryActionClick);
  relayStopButton?.addEventListener("click", stopRelaySession);
  relayLogoutButton?.addEventListener("click", logoutRelaySession);
  relayReloadAllButton?.addEventListener("click", handleReloadAllChats);
  relayClearStorageButton?.addEventListener("click", handleClearStorageClick);
  logDrawerToggleButton?.addEventListener("click", openLogDrawer);
  logDrawerCloseButton?.addEventListener("click", closeLogDrawer);
  logDrawerClearButton?.addEventListener("click", handleLogClear);
  document.addEventListener("click", handleLogDrawerDocumentClick);
  document.addEventListener("keydown", handleLogDrawerKeydown);
  refreshRelayStatus({ silent: true }).finally(() => {
    startStatusPolling();
  });
  initLogStream();
}

document.addEventListener("keydown", event => {
  const targetTag = event.target?.tagName;
  const isTypingTarget = targetTag === "INPUT" || targetTag === "TEXTAREA" || event.target?.isContentEditable;
  if (event.metaKey || event.ctrlKey) {
    if (isTypingTarget) return;
    if (event.key === "r" || event.key === "R") {
      event.preventDefault();
      syncRelayChats({ silent: false });
      return;
    }
    if ((event.key === "l" || event.key === "L") && !isTypingTarget) {
      event.preventDefault();
      if (isLogDrawerOpen()) {
        closeLogDrawer();
      } else {
        openLogDrawer();
      }
      return;
    }
    if (event.key.toLowerCase() === "m") {
      event.preventDefault();
      applyCompactMode(!(document.body.dataset.compact === "true"));
      showToast(
        document.body.dataset.compact === "true" ? "Compact mode enabled." : "Comfort mode enabled.",
        "info",
        { duration: 2500 }
      );
      return;
    }
  }
  if (event.key === "Escape" && isLogDrawerOpen()) {
    closeLogDrawer();
    return;
  }
  if (event.key === "Escape" && onboardingOverlay?.getAttribute("aria-hidden") === "false") {
    event.preventDefault();
    skipOnboarding();
    return;
  }
});

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed (${response.status})`);
  }
  return response.json();
}

async function clearStoredChatsOnServer() {
  return fetchJson(`${API_BASE}/chats/clear`, { method: "POST" });
}

async function handleClearStorageClick() {
  if (typeof window !== "undefined" && window.confirm) {
    const confirmed = window.confirm(
      "Clear all cached ChatScope chats on this machine? You'll need to refresh to download them again."
    );
    if (!confirmed) return;
  }
  if (relayClearStorageButton) relayClearStorageButton.disabled = true;
  try {
    await clearStoredChatsOnServer();
    setRemoteChatList([]);
    await refreshChatSelector();
    updateStatus('Cleared cached chats. Press "Reload all chats" to download them again.', "info");
  } catch (error) {
    console.error(error);
    updateStatus("We couldn't clear the cached chats.", "error");
  } finally {
    if (relayClearStorageButton) relayClearStorageButton.disabled = false;
  }
}

async function applyEntriesToApp(entries, label, options = {}) {
  const participantDirectory = createParticipantDirectory(entries, options.participants || []);
  const normalizedEntries = normalizeEntriesWithDirectory(entries, participantDirectory);
  setDatasetEntries(normalizedEntries);
  savedViewsController.resetForNewDataset();
  clearAnalyticsCache();
  searchController.resetState();
  searchController.populateParticipants();
  setDatasetLabel(label);
  setCurrentRange("all");
  setCustomRange(null);
  if (rangeSelect) rangeSelect.value = "all";
  resetHourlyFilters();
  resetWeekdayFilters();

  const requestToken = ++activeAnalyticsRequest;
  let analytics = options.analyticsOverride ?? null;
  if (!analytics) {
    analytics = await computeAnalyticsWithWorker(normalizedEntries);
    if (requestToken !== activeAnalyticsRequest) return null;
  }

  setCachedAnalytics("all", analytics);
  setDatasetAnalytics(analytics);
  renderDashboard(analytics);
  updateCustomRangeBounds();

  let savedRecord = null;
  const persistDataset = options.persist !== false;
  const participantRoster = buildParticipantRoster(participantDirectory);

  if (persistDataset) {
    savedRecord = saveChatDataset({
      id: options.datasetId ?? undefined,
      label,
      entries: normalizedEntries,
      analytics,
      meta: {
        messageCount: analytics.total_messages,
        dateRange: analytics.date_range,
        participants: participantRoster,
      },
    });
  }

  const selectionValue =
    options.selectionValue ??
    (persistDataset && savedRecord ? encodeChatSelectorValue("local", savedRecord.id) : null);
  if (selectionValue) {
    setActiveChatId(selectionValue);
  }
  await refreshChatSelector();

  const statusMessage =
    options.statusMessage ??
    `Loaded ${formatNumber(normalizedEntries.length)} chat lines from ${label}. Showing the full message history (${formatNumber(
      analytics.total_messages,
    )} messages).`;
  updateStatus(statusMessage, "info");
  setDashboardLoadingState(false);
  return { analytics, datasetId: savedRecord?.id ?? null };
}

function handleParticipantsTopChange() {
  const value = Number(participantsTopSelect?.value ?? 0);
  participantFilters.topCount = Number.isFinite(value) && value > 0 ? value : 0;
  const analytics = getDatasetAnalytics();
  if (analytics) renderParticipants(analytics);
}

function handleParticipantsSortChange() {
  participantFilters.sortMode = participantsSortSelect?.value || "most";
  const analytics = getDatasetAnalytics();
  if (analytics) renderParticipants(analytics);
}

function handleParticipantsTimeframeChange() {
  participantFilters.timeframe = participantsTimeframeSelect?.value || "all";
  const analytics = getDatasetAnalytics();
  if (analytics) renderParticipants(analytics);
}

function handleParticipantPresetClick(event) {
  const preset = event.currentTarget?.dataset?.participantsPreset;
  if (!preset) return;
  if (preset === "top-week") {
    if (participantsTopSelect) participantsTopSelect.value = "5";
    if (participantsSortSelect) participantsSortSelect.value = "most";
    if (participantsTimeframeSelect) participantsTimeframeSelect.value = "week";
    participantFilters.topCount = 5;
    participantFilters.sortMode = "most";
    participantFilters.timeframe = "week";
  } else if (preset === "quiet") {
    if (participantsTopSelect) participantsTopSelect.value = "5";
    if (participantsSortSelect) participantsSortSelect.value = "quiet";
    if (participantsTimeframeSelect) participantsTimeframeSelect.value = "all";
    participantFilters.topCount = 5;
    participantFilters.sortMode = "quiet";
    participantFilters.timeframe = "all";
  }
  const analytics = getDatasetAnalytics();
  if (analytics) renderParticipants(analytics);
}

function handleParticipantRowToggle(event) {
  const toggle = event.target.closest(".participant-toggle");
  if (!toggle) return;
  event.preventDefault();
  const row = toggle.closest("tr");
  if (!row) return;
  const rowId = row.dataset.rowId;
  if (!rowId || !participantsBody) return;
  const detailRow = participantsBody.querySelector(
    `tr.participant-detail-row[data-row-id="${rowId}"]`,
  );
  const isExpanded = toggle.getAttribute("aria-expanded") === "true";
  toggle.setAttribute("aria-expanded", String(!isExpanded));
  const icon = toggle.querySelector(".toggle-icon");
  if (icon) icon.textContent = !isExpanded ? "▾" : "▸";
  row.classList.toggle("expanded", !isExpanded);
  if (detailRow) {
    detailRow.classList.toggle("hidden", isExpanded);
  }
}

function formatSystemSummary(summary) {
  if (!summary) {
    return "Joins 0 · Added 0 · Left 0 · Removed 0 · Changed 0";
  }
  const parts = [
    `Joins ${formatNumber(summary.joins || 0)}`,
    `Added ${formatNumber(summary.added || 0)}`,
    `Left ${formatNumber(summary.left || 0)}`,
    `Removed ${formatNumber(summary.removed || 0)}`,
    `Changed ${formatNumber(summary.changed || 0)}`,
  ];
  if (summary.other) {
    parts.push(`Other ${formatNumber(summary.other)}`);
  }
  return parts.join(" · ");
}

function formatSentimentScore(value, digits = 2) {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const formatted = formatFloat(abs, digits);
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatFloat(0, digits);
}

function renderDashboard(analytics) {
  const label = getDatasetLabel();
  const currentToken = ++renderTaskToken;
  renderSummarySection({
    analytics,
    label,
    summaryEl,
  });
  renderParticipants(analytics);
  renderHourlyPanel(analytics);
  renderDailyPanel(analytics);
  scheduleDeferredRender(() => renderWeeklyPanel(analytics), currentToken);
  scheduleDeferredRender(
    () =>
      renderSentimentSection({
        sentiment: analytics.sentiment ?? null,
        elements: {
          summaryEl: sentimentSummaryEl,
          trendNoteEl: sentimentTrendNote,
          dailyChartEl: sentimentDailyChart,
          positiveListEl: sentimentPositiveList,
          negativeListEl: sentimentNegativeList,
        },
        helpers: { formatSentimentScore },
      }),
    currentToken,
  );
  renderWeekdayPanel(analytics);
  scheduleDeferredRender(
    () =>
      renderTimeOfDayPanel(analytics, {
        container: timeOfDayChartContainer,
        sparklineEl: timeOfDaySparklineEl,
        bandsEl: timeOfDayBandsEl,
        calloutsEl: timeOfDayCalloutsEl,
      }),
    currentToken,
  );
  scheduleDeferredRender(
    () =>
      renderMessageTypesSection({
        data: analytics.message_types ?? null,
        elements: {
          summaryEl: messageTypeSummaryEl,
          noteEl: messageTypeNoteEl,
        },
      }),
    currentToken,
  );
  scheduleDeferredRender(
    () =>
      renderPollsSection({
        data: analytics.polls ?? null,
        elements: {
          listEl: pollsListEl,
          totalsEl: pollsTotalEl,
          creatorsEl: pollsCreatorsEl,
          noteEl: pollsNote,
        },
      }),
    currentToken,
  );
  renderStatistics(analytics);
  scheduleDeferredRender(() => searchController.populateParticipants(), currentToken);
  scheduleDeferredRender(() => searchController.renderResults(), currentToken);
  scheduleDeferredRender(() => renderHighlights(analytics.highlights ?? []), currentToken);
  setDataAvailabilityState(Boolean(analytics));
  updateSectionNarratives(analytics);
}

function renderParticipants(analytics) {
  if (!participantsBody) return;
  renderParticipantsSection({
    analytics,
    entries: getDatasetEntries(),
    participantFilters,
    participantsBody,
    participantsNote,
    participantPresetButtons,
    setParticipantView: next => {
      participantView = Array.isArray(next) ? next : [];
    },
  });
}

function renderHourlyPanel(analytics) {
  renderHourlyHeatmapSection(
    {
      heatmap: analytics.hourly_heatmap,
      summary: analytics.hourly_summary,
      details: analytics.hourly_details,
      distribution: analytics.hourly_distribution,
    },
    {
      chartEl: hourlyChartEl,
      filterNoteEl,
      brushSummaryEl,
      anomaliesEl: hourlyAnomaliesEl,
      renderSummary: renderHourlySummary,
    },
  );
  if (!hourlyControlsInitialised) {
    initHourlyControls();
    hourlyControlsInitialised = true;
  }
  syncHourlyControlsWithState();
}

function renderHourlySummary(summary) {
  if (!hourlyTopHourEl) return;
  if (!summary || !summary.topHour) {
    hourlyTopHourEl.textContent = "—";
    return;
  }

  const { dayIndex, hour, count } = summary.topHour;
  const weekday = WEEKDAY_SHORT[dayIndex] ?? `Day ${dayIndex + 1}`;
  const timeLabel = `${weekday} ${String(hour).padStart(2, "0")}:00`;
  const share = summary.totalMessages ? (count / summary.totalMessages) * 100 : null;
  const shareText = share !== null ? ` (${formatFloat(share, 1)}%)` : "";

  hourlyTopHourEl.textContent = `${timeLabel} · ${formatNumber(count)} msgs${shareText}`;
}

function renderDailyPanel(analytics) {
  renderDailySection(analytics.daily_counts, {
    container: dailyChartEl,
    averageEl: dailyAvgDayEl,
  });
}

function renderWeeklyPanel(analytics) {
  const customRange = getCustomRange();
  renderWeeklySection(analytics.weekly_counts, analytics.weekly_summary, {
    container: weeklyChartEl,
    cumulativeEl: weeklyCumulativeEl,
    rollingEl: weeklyRollingEl,
    averageEl: weeklyAverageEl,
    selectedRange:
      customRange && customRange.type === "custom"
        ? { start: customRange.start, end: customRange.end }
        : null,
    onSelectRange: range => {
      if (!range?.start || !range?.end) return;
      applyCustomRange(range.start, range.end);
      if (rangeSelect) rangeSelect.value = "custom";
    },
  });
}

async function handleShareSnapshot() {
  if (snapshotMode) {
    updateStatus("You're already viewing a shared link. Share this page's address instead.", "info");
    return;
  }
  const analytics = getDatasetAnalytics();
  if (!analytics) {
    updateStatus("Load the chat summary before sharing a link.", "warning");
    return;
  }

  const snapshot = {
    version: 1,
    label: getDatasetLabel(),
    generatedAt: new Date().toISOString(),
    analytics: buildSnapshotAnalytics(analytics),
  };

  try {
    const encoded = encodeSnapshotPayload(snapshot);
    const baseUrl = window.location.href.split("#")[0];
    const shareUrl = `${baseUrl}#snapshot=${encoded}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: snapshot.label || "Chat summary",
          text: `${BRAND_NAME} chat summary`,
          url: shareUrl,
        });
        updateStatus("Shared the view using the device menu.", "success");
        return;
      } catch (error) {
        if (error.name !== "AbortError") {
          console.warn("Share dialog failed", error);
        } else {
          return;
        }
      }
    }

    await copyTextToClipboard(shareUrl);
    updateStatus("Copied the share link.", "success");
  } catch (error) {
    console.error(error);
    updateStatus("Couldn't make a share link.", "error");
  }
}

function renderHighlights(highlights) {
  if (!highlightList) return;
  highlightList.innerHTML = "";

  if (!Array.isArray(highlights) || !highlights.length) {
    const empty = document.createElement("p");
    empty.className = "search-results-empty";
    empty.textContent = "Highlights will show up after the chat loads.";
    highlightList.appendChild(empty);
    return;
  }

  highlights.forEach(highlight => {
    const card = document.createElement("div");
    card.className = `highlight-card ${sanitizeText(highlight.type || "")}`;

    const label = document.createElement("span");
    label.className = "highlight-label";
    label.textContent = highlight.label || "Highlight";
    card.appendChild(label);

    const value = document.createElement("span");
    value.className = "highlight-value";
    value.textContent = highlight.value || "—";
    card.appendChild(value);

    if (highlight.descriptor) {
      const descriptor = document.createElement("span");
      descriptor.className = "highlight-descriptor";
      descriptor.textContent = highlight.descriptor;
      card.appendChild(descriptor);
    }

    if (Array.isArray(highlight.items) && highlight.items.length) {
      const list = document.createElement("ol");
      list.className = "highlight-items";
      highlight.items.forEach(item => {
        const li = document.createElement("li");
        const label = document.createElement("span");
        label.className = "item-label";
        label.textContent = item.label || "";
        li.appendChild(label);
        if (item.value) {
          const value = document.createElement("span");
          value.className = "item-value";
          value.textContent = item.value;
          li.appendChild(value);
        }
        list.appendChild(li);
      });
      card.appendChild(list);
    }

    if (highlight.theme || highlight.type) {
      card.dataset.accent = highlight.theme || highlight.type;
    }
    highlightList.appendChild(card);
  });
}


function updateHeroRelayStatus(status) {
  if (!heroStatusBadge || !heroStatusCopy) return;
  if (!status) {
    heroStatusBadge.textContent = "Not connected";
    heroStatusCopy.textContent = "Start the relay desktop app, then press Connect.";
    return;
  }
  if (status.status === "running") {
    heroStatusBadge.textContent = status.account
      ? `Connected • ${formatRelayAccount(status.account)}`
      : "Relay connected";
    heroStatusCopy.textContent = status.chatCount
      ? `${formatNumber(status.chatCount)} chats indexed.`
      : "Syncing chats now…";
  } else if (status.status === "waiting_qr") {
    heroStatusBadge.textContent = "Scan the QR code";
    if (status.lastQr) {
      heroStatusCopy.textContent = "On your phone: chat app → Linked Devices → Link a device → scan this code.";
    } else {
      heroStatusCopy.textContent = "Press Connect to reopen the relay browser and show a QR code.";
    }
  } else if (status.status === "starting") {
    heroStatusBadge.textContent = "Starting relay";
    heroStatusCopy.textContent = "Launching the relay browser…";
  } else {
    heroStatusBadge.textContent = "Not connected";
    heroStatusCopy.textContent = "Start the relay desktop app, then press Connect.";
  }
}

function buildGuidedInsights(analytics) {
  const insights = [];
  const topSender = Array.isArray(analytics.top_senders) ? analytics.top_senders[0] : null;
  if (topSender && topSender.count) {
    const share = Number.isFinite(topSender.share) ? ` (${formatFloat(topSender.share * 100, 1)}% of messages)` : "";
    const senderLabel = topSender.sender || topSender.label || "Top participant";
    insights.push({
      text: `${senderLabel} leads the conversation with ${formatNumber(topSender.count)} messages${share}.`,
      ctaLabel: "View participants",
      ctaTarget: "#participants",
    });
  }
  const busiestDay = Array.isArray(analytics.daily_counts)
    ? analytics.daily_counts.reduce((max, entry) => (entry.count > (max?.count || 0) ? entry : max), null)
    : null;
  if (busiestDay && busiestDay.count) {
    insights.push({
      text: `${formatDisplayDate(busiestDay.date)} was the busiest day with ${formatNumber(busiestDay.count)} messages.`,
      ctaLabel: "Review daily trend",
      ctaTarget: "#daily-activity",
    });
  }
  const weekdayDetails = Array.isArray(analytics.weekday_distribution) ? analytics.weekday_distribution : [];
  const busiestWeekday = weekdayDetails.reduce(
    (max, entry) => (entry.count > (max?.count || 0) ? entry : max),
    null
  );
  if (busiestWeekday && busiestWeekday.count) {
    insights.push({
      text: `${busiestWeekday.label || "This weekday"} tends to spike with ${formatNumber(
        busiestWeekday.count
      )} messages per week.`,
      ctaLabel: "Inspect weekday pattern",
      ctaTarget: "#weekday-trend",
    });
  }
  const sentimentTotals = analytics.sentiment?.totals || null;
  if (sentimentTotals) {
    const totalSentiment =
      Number(sentimentTotals.positive || 0) +
      Number(sentimentTotals.neutral || 0) +
      Number(sentimentTotals.negative || 0);
    if (totalSentiment > 0) {
      const positiveShare = sentimentTotals.positive / totalSentiment;
      const negativeShare = sentimentTotals.negative / totalSentiment;
      const tone =
        positiveShare > negativeShare
          ? `${formatFloat(positiveShare * 100, 0)}% of messages feel upbeat`
          : `${formatFloat(negativeShare * 100, 0)}% of messages feel critical`;
      insights.push({
        text: `Overall tone: ${tone}.`,
        ctaLabel: "Open mood panel",
        ctaTarget: "#sentiment-overview",
      });
    }
  }
  const weeklySummary = analytics.weekly_summary || {};
  if (weeklySummary.latestDeltaPercent !== null && weeklySummary.latestDeltaPercent !== undefined) {
    const percent = formatFloat(Math.abs(weeklySummary.latestDeltaPercent) * 100, 1);
    const direction = weeklySummary.latestDeltaPercent > 0 ? "up" : "down";
    insights.push({
      text: `Weekly activity is ${direction} ${percent}% compared to the previous period.`,
      ctaLabel: "View week by week",
      ctaTarget: "#weekly-trend",
    });
  }
  const topHour = analytics.hourly_summary?.topHour;
  if (topHour && Number.isFinite(topHour.hour) && topHour.count) {
    insights.push({
      text: `Most messages arrive around ${String(topHour.hour).padStart(2, "0")}:00 (${formatNumber(topHour.count)} msgs).`,
      ctaLabel: "See hourly activity",
      ctaTarget: "#hourly-activity",
    });
  }
  return insights.slice(0, 4);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function collectExportSummary(analytics) {
  const highlights = (analytics.highlights || []).map(item => ({
    label: item.label || "Highlight",
    value: item.value || "",
    descriptor: item.descriptor || "",
  }));
  const topSenders = (analytics.top_senders || []).slice(0, 10);
  const systemSummary = analytics.system_summary || {};
  const weeklySummary = analytics.weekly_summary || {};
  const range = analytics.date_range || {};
  const rangeLabel =
    range.start && range.end ? `${formatDisplayDate(range.start)} → ${formatDisplayDate(range.end)}` : null;
  const overviewItems = [
    `Messages in total: ${formatNumber(analytics.total_messages ?? 0)}`,
    `People who spoke: ${formatNumber(analytics.unique_senders ?? 0)}`,
    `System notices: ${formatNumber(systemSummary.count || 0)}`,
    rangeLabel ? `Covers: ${rangeLabel}` : null,
  ].filter(Boolean);
  const paceItems = [
    `Average per day: ${formatFloat(analytics.hourly_summary?.averagePerDay ?? 0, 1)} messages`,
    `Average per week: ${formatFloat(weeklySummary.averagePerWeek ?? 0, 1)} messages`,
    analytics.hourly_summary?.topHour
      ? `Busiest hour: ${WEEKDAY_LONG[analytics.hourly_summary.topHour.dayIndex] ??
      `Day ${analytics.hourly_summary.topHour.dayIndex + 1}`
      } ${String(analytics.hourly_summary.topHour.hour).padStart(2, "0")}:00`
      : null,
  ].filter(Boolean);
  const systemItems = [
    `People joined: ${formatNumber(systemSummary.joins || 0)}`,
    `Join requests: ${formatNumber(systemSummary.join_requests || 0)}`,
    `Added by admins: ${formatNumber(systemSummary.added || 0)}`,
    `Left on their own: ${formatNumber(systemSummary.left || 0)}`,
    `Removed by admins: ${formatNumber(systemSummary.removed || 0)}`,
    `Settings changes: ${formatNumber(systemSummary.changed || 0)}`,
  ];
  const quickStats = [
    { label: "Messages", value: formatNumber(analytics.total_messages ?? 0) },
    { label: "Participants", value: formatNumber(analytics.unique_senders ?? 0) },
    { label: "Avg/day", value: formatFloat(analytics.hourly_summary?.averagePerDay ?? 0, 1) },
    {
      label: "Top sender",
      value: topSenders.length
        ? `${topSenders[0].sender} (${formatNumber(topSenders[0].count)} msgs)`
        : "Not enough data",
    },
  ];
  return {
    highlights,
    topSenders,
    systemSummary,
    weeklySummary,
    overviewItems,
    paceItems,
    systemItems,
    quickStats,
    rangeLabel,
  };
}

function buildMarkdownReport(analytics, theme = getExportThemeConfig()) {
  const nowIso = new Date().toISOString();
  const title = getDatasetLabel() || `${BRAND_NAME} Chat`;
  const details = collectExportSummary(analytics);
  const filterDetails = getExportFilterSummary();
  const highlights = details.highlights;
  const topSenders = details.topSenders;
  const messageTypeSummary = analytics.message_types?.summary || [];
  const systemSummary = details.systemSummary;
  const weeklySummary = details.weeklySummary;

  const lines = [];
  lines.push(`# ${title} – Conversation summary`);
  lines.push(`_${theme?.tagline || "Insights prepared by ChatScope."}_`);
  lines.push(`*Created ${nowIso} · Styled with the ${theme?.label || "Aurora"} theme*`);
  if (details.rangeLabel) {
    lines.push("");
    lines.push(`> **Date range:** ${details.rangeLabel}`);
  }
  if (filterDetails.length) {
    lines.push(`> **Filters:** ${filterDetails.join(" · ")}`);
  }
  lines.push(`> **Report style:** ${theme?.label || "Default"}`);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Quick glance");
  if (details.overviewItems.length) {
    details.overviewItems.forEach(item => lines.push(`- ${item}`));
  } else {
    lines.push("- Load a dataset to populate this section.");
  }
  lines.push("");

  lines.push("## Highlights");
  if (highlights.length) {
    highlights.forEach(item => {
      lines.push(`- **${item.label}:** ${item.value}${item.descriptor ? ` — ${item.descriptor}` : ""}`);
    });
  } else {
    lines.push("- Highlights will show up once there's enough data.");
  }
  lines.push("");

  lines.push("## Everyday numbers");
  lines.push(`- **Average per day:** ${formatFloat(analytics.hourly_summary?.averagePerDay ?? 0, 1)} messages`);
  lines.push(`- **Average per week:** ${formatFloat(weeklySummary.averagePerWeek ?? 0, 1)} messages`);
  lines.push(`- **Busiest hour:** ${analytics.hourly_summary?.topHour
    ? `${WEEKDAY_LONG[analytics.hourly_summary.topHour.dayIndex]} ${String(analytics.hourly_summary.topHour.hour).padStart(2, "0")}:00`
    : "—"
    }`);
  lines.push(`- **Join requests logged:** ${formatNumber(systemSummary.join_requests || 0)}`);
  lines.push("");

  lines.push("## Frequent voices");
  if (topSenders.length) {
    lines.push("| Rank | Participant | Messages | Share | Avg words | Avg chars |");
    lines.push("| --- | --- | ---: | ---: | ---: | ---: |");
    topSenders.forEach((entry, index) => {
      lines.push(`| ${index + 1} | ${entry.sender} | ${formatNumber(entry.count)} | ${entry.share ? `${formatFloat(entry.share * 100, 1)}%` : "—"
        } | ${entry.avg_words ? formatFloat(entry.avg_words, 1) : "—"} | ${entry.avg_chars ? formatFloat(entry.avg_chars, 1) : "—"} |`);
    });
  } else {
    lines.push("No participant activity recorded.");
  }
  lines.push("");

  lines.push("## Message types");
  if (messageTypeSummary.length) {
    messageTypeSummary.forEach(item => {
      lines.push(`- **${item.label}:** ${formatNumber(item.count)} messages (${formatFloat((item.share || 0) * 100, 1)}%)`);
    });
  } else {
    lines.push("No message type details for this range.");
  }
  lines.push("");

  lines.push("## Group activity");
  lines.push(`- People joined: ${formatNumber(systemSummary.joins || 0)}`);
  lines.push(`- Join requests: ${formatNumber(systemSummary.join_requests || 0)}`);
  lines.push(`- Added by admins: ${formatNumber(systemSummary.added || 0)}`);
  lines.push(`- Left on their own: ${formatNumber(systemSummary.left || 0)}`);
  lines.push(`- Removed by admins: ${formatNumber(systemSummary.removed || 0)}`);
  lines.push(`- Settings changes: ${formatNumber(systemSummary.changed || 0)}`);
  lines.push(`- Other system messages: ${formatNumber(systemSummary.other || 0)}`);
  lines.push("");

  lines.push("## Helpful next steps");
  lines.push("- Grab screenshots of charts you want to share.");
  lines.push("- Add notes or decisions alongside this summary for context.");

  return lines.join("\n");
}

function updateSectionNarratives(analytics) {
  const defaultCopy = {
    hourly: `Run the relay and load a chat to see the hourly rhythm.`,
    daily: "Once a chat is loaded you’ll see which days are busiest.",
    weekly: "Load a chat to reveal week-by-week trends.",
    weekday: "Load a chat to compare weekdays, weekends, and work hours.",
    timeOfDay: "Load a chat to show average messages for each hour of the day.",
    sentiment: "Sentiment appears after a chat is loaded and messages are scored.",
    messageTypes: "Load a chat to see the mix of media types and system events.",
    search: "Load a chat to search by keywords, participants, or dates.",
  };
  const setText = (node, text) => {
    if (node) node.textContent = text;
  };
  if (!analytics) {
    setText(hourlyNote, defaultCopy.hourly);
    setText(dailyNote, defaultCopy.daily);
    setText(weeklyNote, defaultCopy.weekly);
    setText(weekdayNote, defaultCopy.weekday);
    setText(timeOfDayNote, defaultCopy.timeOfDay);
    setText(sentimentNote, defaultCopy.sentiment);
    if (messageTypeNoteEl) messageTypeNoteEl.textContent = defaultCopy.messageTypes;
    setText(searchNote, defaultCopy.search);
    return;
  }
  const topHour = analytics.hourly_summary?.topHour;
  if (topHour && Number.isFinite(topHour.count)) {
    const weekday = WEEKDAY_LONG[topHour.dayIndex] ?? `Day ${topHour.dayIndex + 1}`;
    const hourLabel = `${weekday} ${String(topHour.hour).padStart(2, "0")}:00`;
    setText(
      hourlyNote,
      `${hourLabel} is the busiest window (${formatNumber(topHour.count)} msgs). Use the toggles to compare other days.`,
    );
  } else {
    setText(hourlyNote, defaultCopy.hourly);
  }
  const dailyCounts = Array.isArray(analytics.daily_counts) ? analytics.daily_counts : [];
  const busiestDay = dailyCounts.reduce(
    (max, entry) => (Number(entry?.count) > Number(max?.count || 0) ? entry : max),
    null,
  );
  if (busiestDay?.count) {
    setText(
      dailyNote,
      `${formatDisplayDate(busiestDay.date)} peaked with ${formatNumber(busiestDay.count)} messages.`,
    );
  } else {
    setText(dailyNote, defaultCopy.daily);
  }
  const weeklySummary = analytics.weekly_summary || {};
  if (Number.isFinite(weeklySummary.averagePerWeek)) {
    const delta = typeof weeklySummary.latestDeltaPercent === "number"
      ? `${weeklySummary.latestDeltaPercent >= 0 ? "+" : ""}${formatFloat(weeklySummary.latestDeltaPercent * 100, 1)}% vs. prior week`
      : null;
    setText(
      weeklyNote,
      `Averages ${formatFloat(weeklySummary.averagePerWeek, 1)} messages per week${delta ? ` (${delta})` : ""}.`,
    );
  } else {
    setText(weeklyNote, defaultCopy.weekly);
  }
  const weekdayDistribution = Array.isArray(analytics.weekday_distribution)
    ? analytics.weekday_distribution
    : [];
  const busiestWeekday = weekdayDistribution.reduce(
    (max, entry) => (Number(entry?.count) > Number(max?.count || 0) ? entry : max),
    null,
  );
  if (busiestWeekday?.count) {
    const label =
      busiestWeekday.label ||
      WEEKDAY_LONG[busiestWeekday.dayIndex] ||
      `Day ${Number(busiestWeekday.dayIndex) + 1}`;
    setText(
      weekdayNote,
      `${label} tends to lead with ${formatNumber(busiestWeekday.count)} messages.`,
    );
  } else {
    setText(weekdayNote, defaultCopy.weekday);
  }
  if (Number.isFinite(analytics.hourly_summary?.averagePerDay)) {
    setText(
      timeOfDayNote,
      `This chat averages ${formatFloat(analytics.hourly_summary.averagePerDay, 1)} messages per day — use the chart to spot quiet hours.`,
    );
  } else {
    setText(timeOfDayNote, defaultCopy.timeOfDay);
  }
  const sentimentTotals = analytics.sentiment?.totals;
  if (sentimentTotals) {
    const total =
      Number(sentimentTotals.positive || 0) +
      Number(sentimentTotals.neutral || 0) +
      Number(sentimentTotals.negative || 0);
    if (total > 0) {
      const positiveShare = (sentimentTotals.positive || 0) / total;
      const negativeShare = (sentimentTotals.negative || 0) / total;
      const tone =
        positiveShare >= negativeShare
          ? `${formatFloat(positiveShare * 100, 1)}% of messages feel upbeat`
          : `${formatFloat(negativeShare * 100, 1)}% sound critical`;
      setText(sentimentNote, `${tone}. Use the legend to see who drives the mood.`);
    } else {
      setText(sentimentNote, defaultCopy.sentiment);
    }
  } else {
    setText(sentimentNote, defaultCopy.sentiment);
  }
  const messageSummary = Array.isArray(analytics.message_types?.summary)
    ? analytics.message_types.summary
    : [];
  if (messageSummary.length && messageTypeNoteEl) {
    const topType = messageSummary.reduce(
      (max, entry) => (Number(entry?.count) > Number(max?.count || 0) ? entry : max),
      null,
    );
    if (topType) {
      messageTypeNoteEl.textContent = `${sanitizeText(
        topType.label || "Messages",
      )} lead the conversation (${formatNumber(topType.count)} messages).`;
    } else {
      messageTypeNoteEl.textContent = defaultCopy.messageTypes;
    }
  } else if (messageTypeNoteEl) {
    messageTypeNoteEl.textContent = defaultCopy.messageTypes;
  }
  if (searchNote) {
    searchNote.textContent = `Search across ${formatNumber(
      analytics.total_messages ?? 0,
    )} messages by keyword, participant, or date filter.`;
  }
}

function buildSlidesHtml(analytics, theme = getExportThemeConfig()) {
  const title = escapeHtml(getDatasetLabel() || "ChatScope conversation report");
  const generatedAt = new Date().toLocaleString();
  const styles = buildExportDeckCss(theme, { mode: "screen" });
  const deckMarkup = buildExportDeckMarkup(analytics, theme, { mode: "screen", generatedAt });
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title} – Slides</title>
  <style>${styles}</style>
</head>
<body>
${deckMarkup}
</body>
</html>`;
}

function buildExportDeckMarkup(analytics, theme, { mode = "screen", generatedAt } = {}) {
  const details = collectExportSummary(analytics);
  const generatedAtText = escapeHtml(generatedAt || new Date().toLocaleString());
  const rangeLabel = escapeHtml(details.rangeLabel || "Entire history");
  const themeLabel = escapeHtml(theme?.label || "Aurora");
  const title = escapeHtml(getDatasetLabel() || "ChatScope conversation insights");
  const highlightEntries = details.highlights.slice(0, 6);
  const highlightList = highlightEntries.length
    ? highlightEntries
      .map(
        item =>
          `<li><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.value)}${item.descriptor ? ` — ${escapeHtml(item.descriptor)}` : ""
          }</li>`,
      )
      .join("")
    : "<li>Highlights will show once there's enough data.</li>";
  const participantEntries = details.topSenders.slice(0, 6);
  const participantList = participantEntries.length
    ? participantEntries
      .map(
        entry =>
          `<li><strong>${escapeHtml(entry.sender)}</strong>: ${formatNumber(entry.count)} messages${entry.share ? ` (${formatFloat(entry.share * 100, 1)}%)` : ""
          }</li>`,
      )
      .join("")
    : "<li>No participant activity recorded.</li>";
  const overviewList = details.overviewItems.length
    ? `<ul>${details.overviewItems.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : `<p class="empty">${escapeHtml("Add a dataset to populate the overview.")}</p>`;
  const paceList = details.paceItems.length
    ? `<ul>${details.paceItems.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : `<p class="empty">${escapeHtml("Need more activity to estimate pace.")}</p>`;
  const systemList = details.systemItems.length
    ? `<ul>${details.systemItems.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : `<p class="empty">${escapeHtml("No system events recorded.")}</p>`;
  const metaEntries = [
    { label: "Date range", value: rangeLabel },
    { label: "Generated", value: generatedAtText },
    { label: "Theme", value: themeLabel },
    ...getExportFilterSummary().map(info => ({ label: "Filter", value: escapeHtml(info) })),
  ];
  const metaHtml = metaEntries
    .map(
      entry => `
        <div class="cover-meta-item">
          <span>${escapeHtml(entry.label)}</span>
          <strong>${entry.value}</strong>
        </div>
      `,
    )
    .join("");
  const quickCards = details.quickStats.slice(0, 4);
  const quickCardsHtml = quickCards
    .map(
      (stat, index) => `
        <div class="stat-card" data-stat-index="${index}">
          <span class="stat-label">${escapeHtml(stat.label)}</span>
          <span class="stat-value">${escapeHtml(String(stat.value ?? "—"))}</span>
        </div>
      `,
    )
    .join("");
  const coverClasses = ["slide", "cover-slide"];
  if (mode === "print") {
    coverClasses.push("print-page", "print-break");
  }
  const bodySlideClass = mode === "print" ? "slide print-page" : "slide";
  return `
  <div class="deck" data-mode="${mode}">
    <section class="${coverClasses.join(" ")}">
      <div class="cover-content">
        <p class="cover-tag">${escapeHtml(BRAND_NAME)} · ${themeLabel} theme</p>
        <h1>${title}</h1>
        <p class="cover-subtitle">${escapeHtml(theme?.tagline || "Insights prepared by ChatScope.")}</p>
        <div class="cover-meta">
          ${metaHtml}
        </div>
        <div class="cover-stats">
          ${quickCardsHtml}
        </div>
      </div>
    </section>
    <section class="${bodySlideClass}">
      <div class="slide-header">
        <p class="eyebrow">At a glance</p>
        <h2>Highlights</h2>
      </div>
      <div class="split-layout">
        <div class="panel">
          <h3>Guided highlights</h3>
          <ul class="bullet-list">
            ${highlightList}
          </ul>
        </div>
        <div class="panel stack">
          <div class="callout">
            <h3>Overview</h3>
            ${overviewList}
          </div>
          <div class="callout">
            <h3>Chat pace</h3>
            ${paceList}
          </div>
        </div>
      </div>
    </section>
    <section class="${bodySlideClass}">
      <div class="slide-header">
        <p class="eyebrow">Participation</p>
        <h2>Top voices & activity</h2>
      </div>
      <div class="split-layout">
        <div class="panel">
          <h3>Top voices</h3>
          <ul class="bullet-list">
            ${participantList}
          </ul>
        </div>
        <div class="panel stack">
          <div class="callout">
            <h3>Group activity</h3>
            ${systemList}
          </div>
          <div class="callout note">
            <h3>Next steps</h3>
            <p>Drop this deck into Slides, Keynote, or PowerPoint to add charts, context, and speaker notes.</p>
          </div>
        </div>
      </div>
    </section>
  </div>`;
}

function buildExportDeckCss(theme, { mode = "screen" } = {}) {
  const accent = theme?.accent || "#4c6ef5";
  const accentSoft = theme?.accentSoft || "rgba(76, 110, 245, 0.2)";
  const surface = theme?.surface || "#ffffff";
  const canvas = theme?.canvas || "#f5f7fb";
  const text = theme?.text || "#0f172a";
  const muted = theme?.muted || "#475569";
  const border = theme?.border || "rgba(15, 23, 42, 0.1)";
  const coverGradient = theme?.coverGradient || `linear-gradient(135deg, ${accent}, ${accent})`;
  const coverPattern = theme?.coverPattern || "none";
  const coverText = theme?.coverText || "#f8fafc";
  const badge = theme?.badge || accentSoft;
  const shadow = theme?.cardShadow || "0 25px 60px rgba(15, 23, 42, 0.25)";
  const deckPadding = mode === "print" ? "1in 0.75in" : "3rem 2rem";
  const slideWidth = mode === "screen" ? "960px" : "100%";
  const slidePadding = mode === "print" ? "1.75rem 2rem" : "2.75rem 3rem";
  const deckGap = mode === "print" ? "1.3rem" : "3rem";
  const fontSize = mode === "print" ? "14px" : "16px";
  const colorScheme = theme?.dark ? "dark" : "light";
  return `
    :root {
      color-scheme: ${colorScheme};
      --deck-bg: ${canvas};
      --deck-surface: ${surface};
      --deck-text: ${text};
      --deck-muted: ${muted};
      --deck-border: ${border};
      --deck-accent: ${accent};
      --deck-accent-soft: ${accentSoft};
      --deck-cover-gradient: ${coverGradient};
      --deck-cover-pattern: ${coverPattern};
      --deck-cover-text: ${coverText};
      --deck-badge: ${badge};
      --deck-shadow: ${shadow};
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--deck-bg);
      color: var(--deck-text);
      font-size: ${fontSize};
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    .deck {
      display: flex;
      flex-direction: column;
      gap: ${deckGap};
      padding: ${deckPadding};
      align-items: ${mode === "print" ? "stretch" : "center"};
    }
    .slide {
      width: ${slideWidth};
      max-width: 100%;
      background: var(--deck-surface);
      border-radius: 28px;
      border: 1px solid var(--deck-border);
      padding: ${slidePadding};
      box-shadow: ${mode === "print" ? "none" : "var(--deck-shadow)"};
      position: relative;
      overflow: hidden;
    }
    .cover-slide {
      background-image: var(--deck-cover-gradient);
      color: var(--deck-cover-text);
      border: none;
      box-shadow: ${mode === "print" ? "none" : "0 35px 80px rgba(0, 0, 0, 0.35)"};
    }
    .cover-slide::after {
      content: "";
      position: absolute;
      inset: 0;
      background-image: var(--deck-cover-pattern);
      opacity: 0.7;
      pointer-events: none;
    }
    .cover-content {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .cover-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.35rem 0.9rem;
      border-radius: 999px;
      background: var(--deck-badge);
      color: var(--deck-text);
      font-weight: 600;
      width: fit-content;
    }
    .cover-subtitle {
      font-size: 1.15rem;
      margin: 0;
      color: inherit;
    }
    .cover-meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
    }
    .cover-meta-item span {
      display: block;
      font-size: 0.85rem;
      opacity: 0.8;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .cover-meta-item strong {
      display: block;
      font-size: 1.05rem;
      margin-top: 0.3rem;
    }
    .cover-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 1rem;
    }
    .stat-card {
      padding: 1rem 1.2rem;
      border-radius: 16px;
      background: rgba(255, 255, 255, ${theme?.dark ? "0.08" : "0.15"});
      border: 1px solid rgba(255, 255, 255, 0.35);
      backdrop-filter: blur(4px);
    }
    .stat-label {
      display: block;
      font-size: 0.85rem;
      opacity: 0.85;
    }
    .stat-value {
      font-size: 1.6rem;
      font-weight: 600;
      margin-top: 0.2rem;
    }
    .slide-header {
      margin-bottom: 1.5rem;
    }
    .eyebrow {
      text-transform: uppercase;
      font-size: 0.85rem;
      letter-spacing: 0.08em;
      color: var(--deck-accent);
      margin: 0 0 0.25rem 0;
    }
    h1, h2, h3 {
      margin: 0;
      line-height: 1.2;
    }
    h1 {
      font-size: 2.8rem;
    }
    h2 {
      font-size: 2rem;
    }
    h3 {
      font-size: 1.2rem;
      margin-bottom: 0.6rem;
    }
    .split-layout {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
    }
    .panel {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .panel.stack .callout {
      flex: 1;
    }
    .bullet-list {
      margin: 0;
      padding-left: 1.2rem;
    }
    .bullet-list li {
      margin-bottom: 0.6rem;
      line-height: 1.4;
    }
    .callout {
      border-radius: 20px;
      border: 1px solid var(--deck-border);
      padding: 1rem 1.2rem;
      background: color-mix(in srgb, var(--deck-surface) 85%, var(--deck-accent-soft));
    }
    .callout.note {
      background: color-mix(in srgb, var(--deck-surface) 70%, var(--deck-accent-soft));
    }
    .callout p {
      margin: 0;
      color: var(--deck-muted);
    }
    .empty {
      margin: 0;
      color: var(--deck-muted);
      font-style: italic;
    }
    .print-page {
      page-break-inside: avoid;
      break-inside: avoid;
      margin-bottom: 1rem;
    }
    .print-break {
      page-break-after: always;
      break-after: page;
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
    ${mode === "print" ? `
    @page {
      size: A4;
      margin: 0.5in;
    }
    body {
      background: #fff;
    }` : ""}
  `;
}

function buildPdfDocumentHtml(analytics, theme = getExportThemeConfig()) {
  const title = escapeHtml(`${getDatasetLabel() || "ChatScope conversation"} – PDF`);
  const generatedAt = new Date().toLocaleString();
  const styles = buildExportDeckCss(theme, { mode: "print" });
  const deckMarkup = buildExportDeckMarkup(analytics, theme, { mode: "print", generatedAt });
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>${styles}</style>
</head>
<body>
${deckMarkup}
</body>
</html>`;
}

function handleDownloadPdfReport() {
  const analytics = getDatasetAnalytics();
  if (!analytics) {
    updateStatus("Load the chat summary before exporting a report.", "warning");
    return;
  }
  const theme = getExportThemeConfig();
  const html = buildPdfDocumentHtml(analytics, theme);
  const opened = launchPrintableDocument(html);
  if (opened) {
    updateStatus(`Opened the ${theme.label} PDF preview — use your print dialog to save it.`, "info");
  } else {
    updateStatus("Couldn't prepare the PDF preview.", "error");
  }
}

function launchPrintableDocument(html) {
  try {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    const cleanup = () => {
      URL.revokeObjectURL(url);
      iframe.remove();
    };
    iframe.addEventListener("load", () => {
      const win = iframe.contentWindow;
      if (!win) {
        cleanup();
        return;
      }
      const handleAfterPrint = () => {
        win.removeEventListener("afterprint", handleAfterPrint);
        if (cleanupTimer) {
          clearTimeout(cleanupTimer);
          cleanupTimer = null;
        }
        cleanup();
      };
      let cleanupTimer = window.setTimeout(() => {
        handleAfterPrint();
      }, 60000);
      win.addEventListener("afterprint", handleAfterPrint);
      setTimeout(() => {
        try {
          win.focus();
          win.print();
        } catch (error) {
          console.error(error);
          cleanup();
        }
      }, 150);
    });
    iframe.addEventListener("error", cleanup);
    iframe.src = url;
    document.body.appendChild(iframe);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

function disableInteractiveControlsForSnapshot() {
  if (rangeSelect) rangeSelect.disabled = true;
  if (chatSelector) chatSelector.disabled = true;
  if (saveViewButton) saveViewButton.disabled = true;
  if (savedViewNameInput) savedViewNameInput.disabled = true;
  if (savedViewList) savedViewList.disabled = true;
  if (applySavedViewButton) applySavedViewButton.disabled = true;
  if (deleteSavedViewButton) deleteSavedViewButton.disabled = true;
  if (compareViewASelect) compareViewASelect.disabled = true;
  if (compareViewBSelect) compareViewBSelect.disabled = true;
  if (compareViewsButton) compareViewsButton.disabled = true;
  if (customApplyButton) customApplyButton.disabled = true;
  if (customStartInput) customStartInput.disabled = true;
  if (customEndInput) customEndInput.disabled = true;
  if (searchKeywordInput) searchKeywordInput.disabled = true;
  if (searchParticipantSelect) searchParticipantSelect.disabled = true;
  if (searchStartInput) searchStartInput.disabled = true;
  if (searchEndInput) searchEndInput.disabled = true;
  if (resetSearchButton) resetSearchButton.disabled = true;
  if (downloadSearchButton) downloadSearchButton.disabled = true;
}

function formatSnapshotTimestamp(value) {
  if (!value) return "";
  return formatTimestampDisplay(value);
}

function enterSnapshotMode(snapshot) {
  snapshotMode = true;
  terminateAnalyticsWorker();
  savedViewsController.resetForNewDataset();
  savedViewsController.setSnapshotMode(true);
  clearAnalyticsCache();
  disableInteractiveControlsForSnapshot();
  setDatasetEntries([]);
  setDatasetAnalytics(snapshot.analytics);
  setDatasetLabel(snapshot.label || "Shared view");
  if (rangeSelect) {
    rangeSelect.value = "all";
  }
  showCustomControls(false);
  renderDashboard(snapshot.analytics);
  searchController.resetState();
  if (searchResultsSummary) {
    searchResultsSummary.textContent = "Search isn't available in shared link view.";
  }
  if (searchResultsList) {
    searchResultsList.innerHTML = "";
    const note = document.createElement("div");
    note.className = "search-results-empty";
    note.textContent = "Search isn't available while viewing a shared link.";
    searchResultsList.appendChild(note);
  }
  const timestampInfo = snapshot.generatedAt ? ` · Generated ${formatSnapshotTimestamp(snapshot.generatedAt)}` : "";
  updateStatus(`Viewing a shared link${timestampInfo}. Controls are read-only.`, "info");
}

function tryLoadSnapshotFromHash() {
  const hash = window.location.hash;
  if (!hash || !hash.includes("snapshot=")) return false;
  const match = hash.match(/snapshot=([^&]+)/);
  if (!match) return false;
  try {
    const snapshot = decodeSnapshotPayload(match[1]);
    if (!snapshot || !snapshot.analytics) throw new Error("Invalid snapshot payload");
    enterSnapshotMode(snapshot);
    return true;
  } catch (error) {
    console.error(error);
    updateStatus("Couldn't open the shared link.", "error");
    return false;
  }
}

function renderWeekdayPanel(analytics) {
  updateWeekdayState({
    distribution: analytics.weekday_distribution,
    stats: analytics.weekday_stats,
  });
  ensureWeekdayDayFilters();
  ensureWeekdayHourFilters();
  syncWeekdayControlsWithState();
  rerenderWeekdayFromState();
}

function renderStatistics(analytics) {
  const setText = (id, value) => {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
  };

  setText("media-count", formatNumber(analytics.media_count));
  setText("link-count", formatNumber(analytics.link_count));
  setText("poll-count", formatNumber(analytics.poll_count));
  setText("join-events", formatNumber(analytics.join_events));
  setText("added-events", formatNumber(analytics.added_events));
  setText("left-events", formatNumber(analytics.left_events));
  setText("removed-events", formatNumber(analytics.removed_events));
  setText("changed-events", formatNumber(analytics.changed_events));
  setText("other-system-events", formatNumber(analytics.other_system_events));
  if (analytics.system_summary) {
    setText("join-requests", formatNumber(analytics.system_summary.join_requests));
  }
  setText("avg-chars", formatFloat(analytics.averages.characters, 1));
  setText("avg-words", formatFloat(analytics.averages.words, 1));
}

async function handleRangeChange() {
  if (snapshotMode) {
    updateStatus("Range controls are disabled in shared link view.", "warning");
    return;
  }
  const value = rangeSelect?.value;
  if (!value) return;

  if (value === "custom") {
    showCustomControls(true);
    updateStatus("Choose your dates and click Apply.", "info");
    return;
  }

  showCustomControls(false);
  setCurrentRange(value);
  setCustomRange(null);
  await applyRangeAndRender(value);
  syncHeroPillsWithRange();
}

async function applyCustomRange(start, end) {
  if (snapshotMode) {
    updateStatus("Custom dates are disabled in shared link view.", "warning");
    return;
  }
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate) || Number.isNaN(endDate)) {
    updateStatus("Those dates don't look right.", "error");
    return;
  }
  if (startDate > endDate) {
    updateStatus("Start date must be on or before the end date.", "error");
    return;
  }

  const range = { type: "custom", start, end };
  setCustomRange(range);
  setCurrentRange("custom");
  if (rangeSelect) rangeSelect.value = "custom";
  showCustomControls(true);
  await applyRangeAndRender(range);
}

async function applyRangeAndRender(range) {
  if (snapshotMode) return;
  const entries = getDatasetEntries();
  if (!entries.length) {
    updateStatus("Load a chat file before picking a range.", "warning");
    return;
  }

  const requestToken = ++activeAnalyticsRequest;
  const normalizedRange = normalizeRangeValue(range);
  const rangeKey = buildRangeKey(normalizedRange);
  const cached = getCachedAnalytics(rangeKey);
  if (cached) {
    if (requestToken === activeAnalyticsRequest) {
      setDatasetAnalytics(cached);
      renderDashboard(cached);
      updateCustomRangeBounds();
      const labelCached = describeRange(normalizedRange);
      updateStatus(
        `Showing ${formatNumber(cached.total_messages)} messages from ${getDatasetLabel()} (${labelCached}).`,
        "info",
      );
    }
    return;
  }

  updateStatus("Calculating stats for the selected range…", "info");

  const subset = filterEntriesByRange(entries, normalizedRange);
  try {
    const analytics = await computeAnalyticsWithWorker(subset);
    if (requestToken !== activeAnalyticsRequest) return;

    setCachedAnalytics(rangeKey, analytics);
    setDatasetAnalytics(analytics);
    renderDashboard(analytics);
    updateCustomRangeBounds();

    const label = describeRange(normalizedRange);
    updateStatus(
      `Showing ${formatNumber(analytics.total_messages)} messages from ${getDatasetLabel()} (${label}).`,
      "info",
    );
  } catch (error) {
    console.error(error);
    if (requestToken === activeAnalyticsRequest) {
      updateStatus("We couldn't calculate stats for this range.", "error");
    }
  }
}

function normalizeRangeValue(range) {
  if (!range || range === "all") return "all";
  if (typeof range === "string") return range;
  if (typeof range === "object" && range.type === "custom") {
    return { type: "custom", start: range.start ?? null, end: range.end ?? null };
  }
  return range;
}

function filterEntriesByRange(entries, range) {
  if (!range || range === "all") return entries;
  if (range.type === "custom") {
    const startDate = new Date(range.start);
    const endDate = new Date(range.end);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    return entries.filter(entry => {
      const ts = getTimestamp(entry);
      return ts && ts >= startDate && ts <= endDate;
    });
  }

  const days = Number(range);
  if (!Number.isFinite(days) || days <= 0) return entries;

  const timestamps = entries
    .map(entry => getTimestamp(entry))
    .filter(Boolean)
    .sort((a, b) => a - b);
  if (!timestamps.length) return entries;

  const end = new Date(timestamps[timestamps.length - 1]);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  return entries.filter(entry => {
    const ts = getTimestamp(entry);
    return ts && ts >= start && ts <= end;
  });
}

function buildRangeKey(range) {
  if (!range || range === "all") return "all";
  if (typeof range === "string") return `days:${range}`;
  if (typeof range === "object" && range.type === "custom") {
    const start = range.start ?? "";
    const end = range.end ?? "";
    return `custom:${start}|${end}`;
  }
  return `range:${JSON.stringify(range)}`;
}

function describeRange(range) {
  if (!range || range === "all") return "entire history";
  if (typeof range === "object" && range.type === "custom") {
    return `${formatDisplayDate(range.start)} → ${formatDisplayDate(range.end)}`;
  }
  const days = Number(range);
  return Number.isFinite(days) ? `last ${days} days` : String(range);
}

function showCustomControls(visible) {
  if (!customControls) return;
  if (snapshotMode) {
    customControls.classList.add("hidden");
    if (customStartInput) customStartInput.disabled = true;
    if (customEndInput) customEndInput.disabled = true;
    if (customApplyButton) customApplyButton.disabled = true;
    return;
  }
  if (visible) {
    customControls.classList.remove("hidden");
  } else {
    customControls.classList.add("hidden");
  }
  if (customStartInput && customEndInput) {
    customStartInput.disabled = !visible;
    customEndInput.disabled = !visible;
  }
  if (customApplyButton) {
    customApplyButton.disabled = !visible;
  }
}


function updateCustomRangeBounds() {
  if (!customStartInput || !customEndInput) return;
  const entries = getDatasetEntries();
  if (!entries.length) {
    customStartInput.value = "";
    customEndInput.value = "";
    customStartInput.disabled = true;
    customEndInput.disabled = true;
    if (customApplyButton) customApplyButton.disabled = true;
    if (searchStartInput) {
      searchStartInput.value = "";
      searchStartInput.disabled = true;
      searchStartInput.min = "";
      searchStartInput.max = "";
    }
    if (searchEndInput) {
      searchEndInput.value = "";
      searchEndInput.disabled = true;
      searchEndInput.min = "";
      searchEndInput.max = "";
    }
    return;
  }

  const timestamps = entries
    .map(entry => getTimestamp(entry))
    .filter(Boolean)
    .sort((a, b) => a - b);
  if (!timestamps.length) {
    customStartInput.disabled = true;
    customEndInput.disabled = true;
    if (customApplyButton) customApplyButton.disabled = true;
    return;
  }

  const start = toISODate(timestamps[0]);
  const end = toISODate(timestamps[timestamps.length - 1]);

  customStartInput.min = start;
  customStartInput.max = end;
  customEndInput.min = start;
  customEndInput.max = end;
  customStartInput.disabled = false;
  customEndInput.disabled = false;
  if (customApplyButton) customApplyButton.disabled = false;

  if (searchStartInput) {
    searchStartInput.disabled = false;
    searchStartInput.min = start;
    searchStartInput.max = end;
  }
  if (searchEndInput) {
    searchEndInput.disabled = false;
    searchEndInput.min = start;
    searchEndInput.max = end;
  }

  const customRange = getCustomRange();
  if (!customRange || customRange.type !== "custom") {
    customStartInput.value = start;
    customEndInput.value = end;
  }
}




function ensureWeekdayDayFilters() {
  const state = getWeekdayState();
  const filters = { ...state.filters };
  if (!filters.weekdays && !filters.weekends) {
    filters.weekdays = true;
    filters.weekends = true;
    if (weekdayToggleWeekdays) weekdayToggleWeekdays.checked = true;
    if (weekdayToggleWeekends) weekdayToggleWeekends.checked = true;
  }
  updateWeekdayState({ filters });
}

function ensureWeekdayHourFilters() {
  const state = getWeekdayState();
  const filters = { ...state.filters };
  if (!filters.working && !filters.offhours) {
    filters.working = true;
    filters.offhours = true;
    if (weekdayToggleWorking) weekdayToggleWorking.checked = true;
    if (weekdayToggleOffhours) weekdayToggleOffhours.checked = true;
  }
  updateWeekdayState({ filters });
}

function syncWeekdayControlsWithState() {
  const state = getWeekdayState();
  const { filters, brush } = state;
  if (weekdayToggleWeekdays) weekdayToggleWeekdays.checked = filters.weekdays;
  if (weekdayToggleWeekends) weekdayToggleWeekends.checked = filters.weekends;
  if (weekdayToggleWorking) weekdayToggleWorking.checked = filters.working;
  if (weekdayToggleOffhours) weekdayToggleOffhours.checked = filters.offhours;
  if (weekdayHourStartInput) weekdayHourStartInput.value = String(brush.start);
  if (weekdayHourEndInput) weekdayHourEndInput.value = String(brush.end);
  const startLabel = document.getElementById("weekday-hour-start-label");
  const endLabel = document.getElementById("weekday-hour-end-label");
  if (startLabel) startLabel.textContent = `${String(brush.start).padStart(2, "0")}:00`;
  if (endLabel) endLabel.textContent = `${String(brush.end).padStart(2, "0")}:00`;
}





function rerenderHourlyFromState() {
  renderHourlyHeatmapSection(null, {
    chartEl: hourlyChartEl,
    filterNoteEl,
    brushSummaryEl,
    anomaliesEl: hourlyAnomaliesEl,
    renderSummary: renderHourlySummary,
  });
  const analytics = getDatasetAnalytics();
  if (analytics) {
    renderTimeOfDayPanel(analytics, {
      container: timeOfDayChartContainer,
      sparklineEl: timeOfDaySparklineEl,
      bandsEl: timeOfDayBandsEl,
      calloutsEl: timeOfDayCalloutsEl,
    });
  }
}

function rerenderWeekdayFromState() {
  renderWeekdaySection({
    container: weekdayChartEl,
    filterNoteEl: weekdayFilterNote,
  });
}

function initHourlyControls() {
  const weekdayToggle = document.getElementById("filter-weekdays");
  const weekendToggle = document.getElementById("filter-weekends");
  const workingToggle = document.getElementById("filter-working");
  const offToggle = document.getElementById("filter-offhours");
  const brushStart = document.getElementById("hourly-brush-start");
  const brushEnd = document.getElementById("hourly-brush-end");

  if (weekdayToggle) {
    weekdayToggle.addEventListener("change", () => {
      updateHourlyState({
        filters: {
          ...getHourlyState().filters,
          weekdays: weekdayToggle.checked,
        },
      });
      ensureDayFilters();
      rerenderHourlyFromState();
    });
  }

  if (weekendToggle) {
    weekendToggle.addEventListener("change", () => {
      updateHourlyState({
        filters: {
          ...getHourlyState().filters,
          weekends: weekendToggle.checked,
        },
      });
      ensureDayFilters();
      rerenderHourlyFromState();
    });
  }

  if (workingToggle) {
    workingToggle.addEventListener("change", () => {
      updateHourlyState({
        filters: {
          ...getHourlyState().filters,
          working: workingToggle.checked,
        },
      });
      ensureHourFilters();
      rerenderHourlyFromState();
    });
  }

  if (offToggle) {
    offToggle.addEventListener("change", () => {
      updateHourlyState({
        filters: {
          ...getHourlyState().filters,
          offhours: offToggle.checked,
        },
      });
      ensureHourFilters();
      rerenderHourlyFromState();
    });
  }

  if (brushStart && brushEnd) {
    const updateBrush = () => {
      let start = Number(brushStart.value);
      let end = Number(brushEnd.value);
      if (start > end) [start, end] = [end, start];
      updateHourlyState({
        brush: { start, end },
      });
      brushStart.value = String(start);
      brushEnd.value = String(end);
      const startLabel = document.getElementById("hourly-brush-start-label");
      const endLabel = document.getElementById("hourly-brush-end-label");
      if (startLabel) startLabel.textContent = `${String(start).padStart(2, "0")}:00`;
      if (endLabel) endLabel.textContent = `${String(end).padStart(2, "0")}:00`;
      rerenderHourlyFromState();
    };
    brushStart.addEventListener("input", updateBrush);
    brushEnd.addEventListener("input", updateBrush);
    brushStart.value = String(getHourlyState().brush.start);
    brushEnd.value = String(getHourlyState().brush.end);
  }
}

function ensureDayFilters() {
  const state = getHourlyState();
  const filters = state.filters;
  if (!filters.weekdays && !filters.weekends) {
    filters.weekdays = true;
    filters.weekends = true;
    const weekdayToggle = document.getElementById("filter-weekdays");
    const weekendToggle = document.getElementById("filter-weekends");
    if (weekdayToggle) weekdayToggle.checked = true;
    if (weekendToggle) weekendToggle.checked = true;
  }
  updateHourlyState({ filters });
}

function ensureHourFilters() {
  const state = getHourlyState();
  const filters = state.filters;
  if (!filters.working && !filters.offhours) {
    filters.working = true;
    filters.offhours = true;
    const workingToggle = document.getElementById("filter-working");
    const offToggle = document.getElementById("filter-offhours");
    if (workingToggle) workingToggle.checked = true;
    if (offToggle) offToggle.checked = true;
  }
  updateHourlyState({ filters });
}

function syncHourlyControlsWithState() {
  const state = getHourlyState();
  const weekdayToggle = document.getElementById("filter-weekdays");
  const weekendToggle = document.getElementById("filter-weekends");
  const workingToggle = document.getElementById("filter-working");
  const offToggle = document.getElementById("filter-offhours");
  const brushStart = document.getElementById("hourly-brush-start");
  const brushEnd = document.getElementById("hourly-brush-end");
  const startLabel = document.getElementById("hourly-brush-start-label");
  const endLabel = document.getElementById("hourly-brush-end-label");

  if (weekdayToggle) weekdayToggle.checked = state.filters.weekdays;
  if (weekendToggle) weekendToggle.checked = state.filters.weekends;
  if (workingToggle) workingToggle.checked = state.filters.working;
  if (offToggle) offToggle.checked = state.filters.offhours;
  if (brushStart) brushStart.value = String(state.brush.start);
  if (brushEnd) brushEnd.value = String(state.brush.end);
  if (startLabel) startLabel.textContent = `${String(state.brush.start).padStart(2, "0")}:00`;
  if (endLabel) endLabel.textContent = `${String(state.brush.end).padStart(2, "0")}:00`;
  if (timeOfDayWeekdayToggle) timeOfDayWeekdayToggle.checked = state.filters.weekdays;
  if (timeOfDayWeekendToggle) timeOfDayWeekendToggle.checked = state.filters.weekends;
  if (timeOfDayHourStartInput) timeOfDayHourStartInput.value = String(state.brush.start);
  if (timeOfDayHourEndInput) timeOfDayHourEndInput.value = String(state.brush.end);
  if (timeOfDayHourStartLabel) {
    timeOfDayHourStartLabel.textContent = `${String(state.brush.start).padStart(2, "0")}:00`;
  }
  if (timeOfDayHourEndLabel) {
    timeOfDayHourEndLabel.textContent = `${String(state.brush.end).padStart(2, "0")}:00`;
  }
}
