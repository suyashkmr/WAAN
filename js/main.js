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
  setSearchQuery,
  setSearchResults,
  resetSearchState,
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
const savedViewPlaceholder = savedViewNameInput?.getAttribute("placeholder") || "";
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
const pollsNote = document.getElementById("polls-note");
const pollsTotalEl = document.getElementById("polls-total");
const pollsCreatorsEl = document.getElementById("polls-creators");
const pollsListEl = document.getElementById("polls-list");
const dashboardRoot = document.querySelector("main");
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
const SEARCH_RESULT_LIMIT = 200;
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
  if (savedViewNameInput) {
    savedViewNameInput.placeholder = dataAvailable
      ? savedViewPlaceholder
      : "Load a chat to save a view";
    if (!dataAvailable) savedViewNameInput.value = "";
  }
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
  refreshSavedViewsUI();
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

function syncHeroPillsWithRange() {}

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
  applySearchStateToForm();
  renderSearchResults();
  const viewingSnapshot = tryLoadSnapshotFromHash();
  if (!viewingSnapshot) {
    refreshSavedViewsUI();
  }
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
      renderWeekdayChart();
    });
  }
  if (weekdayToggleWeekends) {
    weekdayToggleWeekends.addEventListener("change", () => {
      updateWeekdayState({ filters: { weekends: weekdayToggleWeekends.checked } });
      ensureWeekdayDayFilters();
      renderWeekdayChart();
    });
  }
  if (weekdayToggleWorking) {
    weekdayToggleWorking.addEventListener("change", () => {
      updateWeekdayState({ filters: { working: weekdayToggleWorking.checked } });
      ensureWeekdayHourFilters();
      renderWeekdayChart();
    });
  }
  if (weekdayToggleOffhours) {
    weekdayToggleOffhours.addEventListener("change", () => {
      updateWeekdayState({ filters: { offhours: weekdayToggleOffhours.checked } });
      ensureWeekdayHourFilters();
      renderWeekdayChart();
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
  if (searchForm) {
    searchForm.addEventListener("submit", handleSearchSubmit);
  }
  if (resetSearchButton) {
    resetSearchButton.addEventListener("click", handleSearchReset);
  }
  if (saveViewButton) {
    saveViewButton.addEventListener("click", handleSaveView);
  }
  if (applySavedViewButton) {
    applySavedViewButton.addEventListener("click", handleApplySavedView);
  }
  if (deleteSavedViewButton) {
    deleteSavedViewButton.addEventListener("click", handleDeleteSavedView);
  }
  if (savedViewGallery) {
    savedViewGallery.addEventListener("click", handleSavedViewGalleryClick);
    savedViewGallery.addEventListener("keydown", handleSavedViewGalleryKeydown);
  }
  if (compareViewsButton) {
    compareViewsButton.addEventListener("click", handleCompareViews);
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
      renderWeekdayChart();
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
  clearSavedViews();
  refreshSavedViewsUI();
  clearAnalyticsCache();
  resetSearchState();
  applySearchStateToForm();
  renderSearchResults();
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
  renderSummaryCards(analytics, label);
  renderParticipants(analytics);
  renderHourlyPanel(analytics);
  renderDailyPanel(analytics);
  scheduleDeferredRender(() => renderWeeklyPanel(analytics), currentToken);
  scheduleDeferredRender(() => renderSentiment(analytics.sentiment ?? null), currentToken);
  renderWeekdayPanel(analytics);
  scheduleDeferredRender(() => renderTimeOfDayPanel(analytics), currentToken);
  scheduleDeferredRender(() => renderMessageTypes(analytics.message_types ?? null), currentToken);
  scheduleDeferredRender(() => renderPolls(analytics.polls ?? null), currentToken);
  renderStatistics(analytics);
  scheduleDeferredRender(populateSearchParticipants, currentToken);
  scheduleDeferredRender(renderSearchResults, currentToken);
  scheduleDeferredRender(() => renderHighlights(analytics.highlights ?? []), currentToken);
  setDataAvailabilityState(Boolean(analytics));
  updateSectionNarratives(analytics);
}

function renderSummaryCards(analytics, label) {
  if (!summaryEl) return;
  const startTimestamp = analytics.first_timestamp || analytics.date_range.start;
  const endTimestamp = analytics.last_timestamp || analytics.date_range.end;
  const dateRangeValue = startTimestamp && endTimestamp
    ? formatDateRangeWithTime(startTimestamp, endTimestamp)
    : startTimestamp || endTimestamp
      ? formatDateRangeWithTime(startTimestamp, endTimestamp)
      : "—";
  const cards = [
    {
      title: "Total Messages",
      value: formatNumber(analytics.total_messages),
      hint: `${formatNumber(analytics.total_entries)} chat lines including system messages`,
    },
    {
      title: "Active Participants",
      value: formatNumber(analytics.unique_senders),
      hint: label,
    },
    {
      title: "System Events Logged",
      value: formatNumber(analytics.total_system),
      hint: "Joins, adds, leaves, removals, changes",
    },
    {
      title: "Date Range",
      value: dateRangeValue,
      hint: analytics.date_range.start && analytics.date_range.end
        ? `${formatNumber(analytics.weekly_summary.weekCount)} weeks of activity`
        : "",
    },
  ];

  summaryEl.innerHTML = cards.map(({ title, value, hint }) => `
    <div class="summary-card">
      <h3>${sanitizeText(title)}</h3>
      <p class="value">${sanitizeText(value)}</p>
      ${hint ? `<small>${sanitizeText(hint)}</small>` : ""}
    </div>
  `).join("");
}

function computeParticipantTimeframeStats(timeframe, analytics) {
  if (timeframe !== "week") return null;
  const entries = getDatasetEntries();
  if (!entries.length) {
    return { counts: new Map(), total: 0, label: "Last 7 days", rangeLabel: null };
  }
  let endDate = analytics?.date_range?.end ? new Date(analytics.date_range.end) : new Date();
  if (Number.isNaN(endDate.getTime())) endDate = new Date();
  endDate = new Date(endDate.getTime());
  const startDate = new Date(endDate);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);
  startDate.setDate(startDate.getDate() - 6);
  const cutoffMs = startDate.getTime();
  const counts = new Map();
  let total = 0;
  entries.forEach(entry => {
    if (entry.type && entry.type !== "message") return;
    const ts = getTimestamp(entry);
    if (!ts || ts.getTime() < cutoffMs) return;
    const sender = entry.sender || "Unknown";
    counts.set(sender, (counts.get(sender) || 0) + 1);
    total += 1;
  });
  const rangeLabel = `${formatDisplayDate(startDate.toISOString())} → ${formatDisplayDate(endDate.toISOString())}`;
  return {
    counts,
    total,
    label: "Last 7 days",
    rangeLabel,
  };
}

function buildParticipantLeaderboard(analytics) {
  const baseList = analytics.top_senders.map((entry, index) => ({
    ...entry,
    id: entry.id || `participant-${index}`,
  }));
  let scopeLabel = "All time";
  let scopeRange = null;
  let workingList = baseList.map(entry => ({ ...entry }));
  if (participantFilters.timeframe !== "all") {
    const stats = computeParticipantTimeframeStats(participantFilters.timeframe, analytics);
    scopeLabel = stats?.label || scopeLabel;
    scopeRange = stats?.rangeLabel || scopeRange;
    if (stats?.counts && stats.total > 0) {
      workingList = workingList
        .map(entry => {
          const overrideCount = stats.counts.get(entry.sender) || 0;
          if (!overrideCount) return null;
          return {
            ...entry,
            count: overrideCount,
            share: stats.total ? overrideCount / stats.total : 0,
          };
        })
        .filter(Boolean);
    } else {
      workingList = [];
    }
  }

  const comparator =
    participantFilters.sortMode === "quiet"
      ? (a, b) => {
          if (a.count === b.count) return a.sender.localeCompare(b.sender);
          return a.count - b.count;
        }
      : (a, b) => {
          if (b.count === a.count) return a.sender.localeCompare(b.sender);
          return b.count - a.count;
        };
  workingList.sort(comparator);
  return { list: workingList, scopeLabel, scopeRange };
}

function updateParticipantPresetStates() {
  if (!participantPresetButtons?.length) return;
  participantPresetButtons.forEach(button => {
    const preset = button.dataset.participantsPreset;
    let active = false;
    if (preset === "top-week") {
      active =
        participantFilters.timeframe === "week" &&
        participantFilters.sortMode === "most" &&
        participantFilters.topCount === 5;
    } else if (preset === "quiet") {
      active =
        participantFilters.timeframe === "all" &&
        participantFilters.sortMode === "quiet" &&
        participantFilters.topCount === 5;
    }
    button.setAttribute("aria-pressed", String(active));
  });
}

function renderParticipants(analytics) {
  if (!participantsBody) return;
  participantsBody.innerHTML = "";
  participantView = [];
  if (participantsNote) {
    participantsNote.textContent =
      "See who speaks the most, and filter to spotlight the quietest members or recent activity.";
  }

  if (!analytics || !analytics.top_senders.length) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = `
      <td colspan="5" class="empty-state">Run the relay and load a chat to see participant details.</td>
    `;
    participantsBody.appendChild(emptyRow);
    updateParticipantPresetStates();
    return;
  }

  const { list: workingList, scopeLabel, scopeRange } = buildParticipantLeaderboard(analytics);
  const limit = participantFilters.topCount;
  let visible = limit > 0 ? workingList.slice(0, limit) : workingList;

  if (!visible.length) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = `
      <td colspan="5" class="empty-state">No participants match the current filters.</td>
    `;
    participantsBody.appendChild(emptyRow);
    participantView = [];
    if (participantsNote) {
      participantsNote.textContent = "Adjust the filters to list participants for this view.";
    }
    updateParticipantPresetStates();
    return;
  }

  if (participantsNote) {
    const baseCount = workingList.length || analytics.top_senders.length;
    const showingCount = visible.length;
    const limitedView = participantFilters.topCount > 0 && baseCount > participantFilters.topCount;
    const baseText = limitedView
      ? `Showing top ${formatNumber(showingCount)} of ${formatNumber(baseCount)} participants`
      : `Showing all ${formatNumber(baseCount)} participants`;
    const descriptor = participantFilters.sortMode === "quiet" ? "Quietest participants" : "Most active participants";
    const scopeText = scopeLabel || (participantFilters.timeframe === "week" ? "Last 7 days" : "All time");
    const parts = [`${descriptor} · ${scopeText}`, baseText];
    if (scopeRange) parts.splice(1, 0, scopeRange);
    participantsNote.textContent = `${parts.join(" — ")}.`;
  }

  participantView = visible;
  updateParticipantPresetStates();

  visible.forEach((entry, index) => {
    const row = document.createElement("tr");
    row.className = "participant-row";
    const rowId = entry.id || `participant-${index}`;
    const detailId = `${rowId}-detail`;
    row.dataset.rowId = rowId;

    const nameHTML = sanitizeText(entry.sender || "Unknown");
    const messageCount = formatNumber(entry.count);
    const shareValue = Number.isFinite(entry.share) ? formatFloat(entry.share * 100, 1) : null;
    const shareWidth = Number.isFinite(entry.share) ? Math.min(Math.max(entry.share * 100, 0), 100) : 0;
    const avgWords = Number.isFinite(entry.avg_words) ? formatFloat(entry.avg_words, 1) : null;

    row.innerHTML = `
      <td data-label="Rank">${index + 1}</td>
      <td data-label="Participant">
        <button type="button" class="participant-toggle" aria-expanded="false" aria-controls="${detailId}">
          <span class="toggle-icon">▸</span>
          <span class="participant-name">${nameHTML}</span>
        </button>
      </td>
      <td data-label="Messages">${messageCount}</td>
      <td data-label="Share">
        <div class="participant-share">
          <div class="share-bar">
            <span class="share-fill" style="width: ${shareWidth}%"></span>
          </div>
          <span class="share-value">${shareValue !== null ? `${shareValue}%` : "—"}</span>
        </div>
      </td>
      <td data-label="Avg Words">${avgWords !== null ? avgWords : "—"}</td>
    `;
    participantsBody.appendChild(row);

    const detailRow = document.createElement("tr");
    detailRow.className = "participant-detail-row hidden";
    detailRow.id = detailId;
    detailRow.dataset.rowId = rowId;
    detailRow.innerHTML = `
      <td colspan="5">
        ${buildParticipantDetail(entry)}
      </td>
    `;
    participantsBody.appendChild(detailRow);
  });
}

function renderMessageTypes(messageTypes) {
  if (!messageTypeSummaryEl) return;

  const summary = Array.isArray(messageTypes?.summary) ? messageTypes.summary : [];
  messageTypeSummaryEl.innerHTML = "";

  if (!summary.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No message categories for this range.";
    messageTypeSummaryEl.appendChild(empty);
    if (messageTypeNoteEl) messageTypeNoteEl.textContent = "";
    return;
  }

  const shareSnippets = summary
    .map(entry => `${entry.label}: ${formatFloat((entry.share || 0) * 100, 1)}%`)
    .join(" · ");

  const summaryText = document.createElement("p");
  summaryText.className = "message-type-share-summary";
  summaryText.textContent = `Share by type → ${shareSnippets}.`;
  messageTypeSummaryEl.appendChild(summaryText);

  if (messageTypeNoteEl) {
    messageTypeNoteEl.textContent = "";
  }
}

function renderHourlyPanel(analytics) {
  const hourlySummary = analytics.hourly_summary;
  const hourlyDetails = analytics.hourly_details;
  const hourlyDistribution = analytics.hourly_distribution;

  updateHourlyState({
    heatmap: analytics.hourly_heatmap,
    summary: hourlySummary,
    details: hourlyDetails,
    distribution: hourlyDistribution,
  });

  syncHourlyControlsWithState();
  renderHourlyHeatmap(analytics.hourly_heatmap, hourlySummary, hourlyDetails, hourlyDistribution);
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
  renderDailyCalendar(analytics.daily_counts);
}

function renderWeeklyPanel(analytics) {
  renderWeeklyTrend(analytics.weekly_counts, analytics.weekly_summary);
}

function renderSentiment(sentiment) {
  if (!sentimentSummaryEl) return;

  const totals = sentiment?.totals || {};
  const totalCount = (totals.positive || 0) + (totals.neutral || 0) + (totals.negative || 0);

  const summaryData = totalCount
    ? [
        {
          key: "positive",
          label: "Positive",
          value: totals.positive || 0,
          share: totalCount ? (totals.positive || 0) / totalCount : 0,
        },
        {
          key: "neutral",
          label: "Neutral",
          value: totals.neutral || 0,
          share: totalCount ? (totals.neutral || 0) / totalCount : 0,
        },
        {
          key: "negative",
          label: "Negative",
          value: totals.negative || 0,
          share: totalCount ? (totals.negative || 0) / totalCount : 0,
        },
        {
          key: "average",
          label: "Average",
          value: formatSentimentScore(sentiment?.average ?? 0, 2),
          hint: `${formatNumber(totalCount)} msgs`,
        },
      ]
    : [];

  if (!summaryData.length) {
    sentimentSummaryEl.innerHTML = `
      <p class="empty-state">No sentiment data for this range.</p>
    `;
  } else {
    sentimentSummaryEl.innerHTML = summaryData
      .map(item => {
        const shareValue = typeof item.share === "number"
          ? `${formatFloat((item.share || 0) * 100, 1)}%`
          : item.hint ?? "";
        return `
          <div class="sentiment-tile ${sanitizeText(item.key)}">
            <span class="sentiment-label">${sanitizeText(item.label)}</span>
            <span class="sentiment-value">${sanitizeText(
              typeof item.value === "string" ? item.value : formatNumber(item.value),
            )}</span>
            <span class="sentiment-share">${sanitizeText(shareValue)}</span>
          </div>
        `;
      })
      .join("");
  }

  const activeDays = (sentiment?.daily || []).filter(item => (item?.count || 0) > 0);
  if (sentimentTrendNote) {
    if (!activeDays.length) {
      sentimentTrendNote.textContent = "No scored messages for this range.";
    } else {
      const start = activeDays[0].date;
      const end = activeDays[activeDays.length - 1].date;
      const averageText = formatSentimentScore(sentiment?.average ?? 0, 2);
      sentimentTrendNote.textContent = `${formatDisplayDate(start)} → ${formatDisplayDate(end)} · Avg ${averageText} across ${formatNumber(totalCount)} messages`;
    }
  }

  renderSentimentTrend(activeDays);
  renderSentimentParticipants(sentiment?.participants || []);
}

function renderSentimentTrend(dailyData) {
  if (!sentimentDailyChart) return;
  sentimentDailyChart.innerHTML = "";
  sentimentDailyChart.className = "sentiment-calendar-container";

  if (!dailyData || !dailyData.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No scored messages to show.";
    sentimentDailyChart.appendChild(empty);
    return;
  }


  const dailyMap = new Map();
  dailyData.forEach(item => dailyMap.set(item.date, item));

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const firstDate = new Date(dailyData[0].date);
  firstDate.setHours(0, 0, 0, 0);
  const lastDate = new Date(dailyData[dailyData.length - 1].date);
  lastDate.setHours(0, 0, 0, 0);

  const startMonth = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
  const endMonth = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1);

  const calendar = document.createElement("div");
  calendar.className = "sentiment-calendar";

  const getMoodClass = value => {
    if (value >= 0.4) return "mood-strong-positive";
    if (value >= 0.15) return "mood-positive";
    if (value <= -0.4) return "mood-strong-negative";
    if (value <= -0.15) return "mood-negative";
    return "mood-neutral";
  };

  for (let cursor = new Date(startMonth); cursor <= endMonth; cursor.setMonth(cursor.getMonth() + 1)) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthCard = document.createElement("div");
    monthCard.className = "sentiment-calendar-month";

    const header = document.createElement("div");
    header.className = "sentiment-calendar-month-header";
    const label = document.createElement("span");
    label.textContent = `${monthNames[month]} ${year}`;
    const avgSpan = document.createElement("span");
    avgSpan.className = "sentiment-month-average";

    let weightedSum = 0;
    let totalMessages = 0;

    const weekdaysRow = document.createElement("div");
    weekdaysRow.className = "sentiment-calendar-weekdays";
    weekdayLabels.forEach(labelText => {
      const span = document.createElement("span");
      span.textContent = labelText;
      weekdaysRow.appendChild(span);
    });

    const grid = document.createElement("div");
    grid.className = "sentiment-calendar-days";

    const firstWeekday = new Date(year, month, 1).getDay();
    for (let i = 0; i < firstWeekday; i += 1) {
      const filler = document.createElement("div");
      filler.className = "sentiment-calendar-day filler";
      grid.appendChild(filler);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const entry = dailyMap.get(iso);
      const cell = document.createElement("div");
      cell.className = "sentiment-calendar-day";
      const numberEl = document.createElement("span");
      numberEl.className = "sentiment-day-number";
      numberEl.textContent = day;
      cell.appendChild(numberEl);

      if (entry && Number.isFinite(entry.average)) {
        const moodClass = getMoodClass(entry.average);
        cell.classList.add(moodClass);
        const tooltip = `${formatDisplayDate(iso)} · ${formatSentimentScore(entry.average, 2)} · ${formatNumber(entry.count)} msgs`;
        cell.title = tooltip;
        weightedSum += entry.average * (entry.count || 0);
        totalMessages += entry.count || 0;
      } else {
        cell.classList.add("sentiment-day-empty");
        cell.title = `${formatDisplayDate(iso)} · No scored messages`;
      }

      grid.appendChild(cell);
    }

    const remainder = grid.children.length % 7;
    if (remainder) {
      for (let i = remainder; i < 7; i += 1) {
        const filler = document.createElement("div");
        filler.className = "sentiment-calendar-day filler";
        grid.appendChild(filler);
      }
    }

    const monthAverage = totalMessages ? weightedSum / totalMessages : null;
    if (monthAverage !== null) {
      avgSpan.textContent = formatSentimentScore(monthAverage, 2);
      avgSpan.classList.add(getMoodClass(monthAverage));
    } else {
      avgSpan.textContent = "—";
    }

    header.append(label, avgSpan);
    monthCard.append(header, weekdaysRow, grid);
    calendar.appendChild(monthCard);
  }

  sentimentDailyChart.appendChild(calendar);

  const legend = document.createElement("div");
  legend.className = "sentiment-calendar-legend";
  legend.innerHTML = `
    <span><span class="legend-swatch legend-swatch-positive"></span>Positive (≥ +0.15)</span>
    <span><span class="legend-swatch legend-swatch-neutral"></span>Neutral (−0.15 to +0.15)</span>
    <span><span class="legend-swatch legend-swatch-negative"></span>Negative (≤ −0.15)</span>
    <span><span class="legend-swatch legend-swatch-empty"></span>No scored messages</span>
  `;
  sentimentDailyChart.appendChild(legend);

  const calendarNote = document.createElement("p");
  calendarNote.className = "sentiment-calendar-note";
  calendarNote.textContent = "Colour scale shows daily mood score (weighted by messages). Hatched tiles = no scored messages.";
  sentimentDailyChart.appendChild(calendarNote);
}

function renderSentimentParticipants(participants) {
  if (!sentimentPositiveList || !sentimentNegativeList) return;

  const valid = Array.isArray(participants)
    ? participants.filter(entry => Number.isFinite(entry.average) && entry.count >= 3)
    : [];

  const positives = valid
    .filter(entry => entry.average > 0)
    .sort((a, b) => b.average - a.average)
    .slice(0, 5);

  const negatives = valid
    .filter(entry => entry.average < 0)
    .sort((a, b) => a.average - b.average)
    .slice(0, 5);

  buildSentimentList(sentimentPositiveList, positives, "positive");
  buildSentimentList(sentimentNegativeList, negatives, "negative");
}

function captureCurrentView(name) {
  const entries = getDatasetEntries();
  if (!entries.length) return null;
  const range = getCurrentRange();
  const customRange = getCustomRange();
  const rangeData =
    range === "custom" && customRange
      ? { type: "custom", start: customRange.start, end: customRange.end }
      : range;
  const hourly = getHourlyState();
  const weekday = getWeekdayState();
  const analytics = getDatasetAnalytics();

  return {
    name,
    label: getDatasetLabel(),
    createdAt: new Date().toISOString(),
    range,
    rangeData,
    rangeLabel: describeRange(rangeData),
    hourlyFilters: { ...hourly.filters },
    hourlyBrush: { ...hourly.brush },
    weekdayFilters: { ...weekday.filters },
    weekdayBrush: { ...weekday.brush },
    snapshot: analytics ? buildViewSnapshot(analytics) : null,
  };
}

function buildViewSnapshot(analytics) {
  if (!analytics) return null;
  const topSender = Array.isArray(analytics.top_senders) ? analytics.top_senders[0] : null;
  const topHour = analytics.hourly_summary?.topHour || null;

  return {
    generatedAt: new Date().toISOString(),
    totalMessages: analytics.total_messages ?? 0,
    uniqueSenders: analytics.unique_senders ?? 0,
    systemEvents: analytics.system_summary?.count ?? 0,
    averageWords: analytics.averages?.words ?? 0,
    averageChars: analytics.averages?.characters ?? 0,
    weeklyAverage: analytics.weekly_summary?.averagePerWeek ?? 0,
    dailyAverage: analytics.hourly_summary?.averagePerDay ?? 0,
    dateRange: analytics.date_range ?? null,
    topSender: topSender
      ? {
          sender: topSender.sender,
          count: topSender.count,
          share: topSender.share ?? null,
        }
      : null,
    topHour: topHour
      ? {
          dayIndex: topHour.dayIndex,
          hour: topHour.hour,
          count: topHour.count,
        }
      : null,
  };
}

function getSavedViewById(id) {
  if (!id) return null;
  const views = getSavedViews();
  return views.find(view => view.id === id) || null;
}

function normalizeRangeValue(rangeValue) {
  if (!rangeValue) return "all";
  if (typeof rangeValue === "string") return rangeValue;
  const start = rangeValue.start;
  const end = rangeValue.end;
  return {
    type: "custom",
    start,
    end,
  };
}

function computeSnapshotForView(view) {
  const entries = getDatasetEntries();
  if (!entries.length) return null;
  const rangeValue = normalizeRangeValue(view.rangeData ?? view.range);
  const subset = filterEntriesByRange(entries, rangeValue);
  if (!subset.length) {
    return {
      generatedAt: new Date().toISOString(),
      totalMessages: 0,
      uniqueSenders: 0,
      systemEvents: 0,
      averageWords: 0,
      averageChars: 0,
      weeklyAverage: 0,
      dailyAverage: 0,
      dateRange:
        typeof rangeValue === "object"
          ? { start: rangeValue.start ?? null, end: rangeValue.end ?? null }
          : null,
      topSender: null,
      topHour: null,
    };
  }
  const analytics = computeAnalytics(subset);
  return buildViewSnapshot(analytics);
}

function ensureViewSnapshot(view) {
  if (!view) return null;
  if (view.snapshot) return view.snapshot;
  const snapshot = computeSnapshotForView(view);
  if (snapshot) {
    updateSavedView(view.id, { snapshot });
  }
  return snapshot;
}

function populateSavedSelect(select, views, selectedId, placeholder) {
  if (!select) return;
  const previous = selectedId ?? select.value;
  select.innerHTML = "";
  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = placeholder;
  select.appendChild(placeholderOption);
  views.forEach(view => {
    const option = document.createElement("option");
    option.value = view.id;
    option.textContent = `${view.name} · ${view.rangeLabel}`;
    if (view.id === previous) option.selected = true;
    select.appendChild(option);
  });
  if (select.value && !views.some(view => view.id === select.value)) {
    select.value = "";
  }
}

function refreshSavedViewsUI() {
  const views = getSavedViews();
  const compareSelection = getCompareSelection();

  populateSavedSelect(savedViewList, views, savedViewList?.value, "Choose a saved view…");
  populateSavedSelect(compareViewASelect, views, compareSelection.primary, "Select view A…");
  populateSavedSelect(compareViewBSelect, views, compareSelection.secondary, "Select view B…");

  const validPrimary = views.some(view => view.id === compareSelection.primary)
    ? compareSelection.primary
    : null;
  const validSecondary = views.some(view => view.id === compareSelection.secondary)
    ? compareSelection.secondary
    : null;
  let primary = validPrimary;
  let secondary = validSecondary;

  if (views.length >= 2) {
    if (!primary) primary = views[0].id;
    if (!secondary || secondary === primary) {
      const fallback = views.find(view => view.id !== primary);
      secondary = fallback ? fallback.id : null;
    }
  } else {
    primary = primary ?? null;
    secondary = secondary ?? null;
  }

  setCompareSelection(primary, secondary);
  if (compareViewASelect) compareViewASelect.value = primary ?? "";
  if (compareViewBSelect) compareViewBSelect.value = secondary ?? "";

  renderComparisonSummary();
  renderSavedViewGallery(views);

  const controlsDisabled = snapshotMode || !dataAvailable;
  if (savedViewNameInput) savedViewNameInput.disabled = controlsDisabled;
  if (savedViewList) savedViewList.disabled = controlsDisabled;
  if (applySavedViewButton) applySavedViewButton.disabled = controlsDisabled;
  if (deleteSavedViewButton) deleteSavedViewButton.disabled = controlsDisabled;
  if (compareViewASelect) compareViewASelect.disabled = controlsDisabled;
  if (compareViewBSelect) compareViewBSelect.disabled = controlsDisabled;
  if (compareViewsButton) compareViewsButton.disabled = controlsDisabled;
}

function renderSavedViewGallery(views) {
  if (!savedViewGallery) return;
  const list = Array.isArray(views) ? views : [];
  if (!list.length) {
    savedViewGallery.innerHTML =
      '<div class="empty-state small"><div class="empty-illustration small" aria-hidden="true"><span></span><span></span><span></span></div><p class="saved-view-gallery-empty">Save views to see quick previews here.</p></div>';
    savedViewGallery.dataset.interactive = "false";
    return;
  }
  const cards = list.map(view => buildSavedViewCard(view)).join("");
  savedViewGallery.innerHTML = cards;
  savedViewGallery.dataset.interactive = snapshotMode || !dataAvailable ? "false" : "true";
}

function buildSavedViewCard(view) {
  if (!view) return "";
  const snapshot = ensureViewSnapshot(view);
  const viewId = String(view?.id ?? "");
  const viewName = view?.name || "Untitled view";
  const rangeLabel = view.rangeLabel || formatViewRange(view);
  const createdAtLabel = view.createdAt ? formatTimestampDisplay(view.createdAt) : "";
  const totalMessages = snapshot ? formatNumber(snapshot.totalMessages ?? 0) : "—";
  const participants = snapshot ? formatNumber(snapshot.uniqueSenders ?? 0) : "—";
  const avgPerDay =
    snapshot && Number.isFinite(snapshot.dailyAverage)
      ? `${formatFloat(snapshot.dailyAverage, 1)} / day`
      : "Not enough data";
  const topSender = snapshot?.topSender || null;
  const sharePercent =
    topSender && typeof topSender.share === "number"
      ? Math.round(topSender.share * 100)
      : null;
  const topSenderShare =
    topSender && sharePercent !== null ? `${sharePercent}% of messages` : "Share updates soon";
  const peakHour = formatSavedViewTopHour(snapshot);
  const peakHourCount =
    snapshot?.topHour && Number.isFinite(snapshot.topHour.count)
      ? `${formatNumber(snapshot.topHour.count)} msgs`
      : "Waiting for hourly data";
  const barWidth =
    sharePercent !== null ? Math.min(100, Math.max(0, sharePercent)) : 8;
  const interactive = !snapshotMode;
  const accessibilityAttributes = interactive
    ? `role="button" tabindex="0" aria-label="Apply saved view ${escapeHtml(viewName)}"`
    : `role="button" aria-disabled="true" tabindex="-1"`;
  return `
    <article class="saved-view-card${interactive ? "" : " disabled"}" data-view-id="${escapeHtml(
      viewId,
    )}" ${accessibilityAttributes}>
      <header class="saved-view-card-header">
        <div>
          <p class="saved-view-card-title">${escapeHtml(viewName)}</p>
          <p class="saved-view-card-range">${escapeHtml(rangeLabel)}</p>
        </div>
        ${
          createdAtLabel
            ? `<span class="saved-view-card-created">${escapeHtml(createdAtLabel)}</span>`
            : ""
        }
      </header>
      <div class="saved-view-card-metrics">
        <div class="saved-view-stat">
          <span class="stat-label">Messages</span>
          <span class="stat-value">${totalMessages}</span>
        </div>
        <div class="saved-view-stat">
          <span class="stat-label">Participants</span>
          <span class="stat-value">${participants}</span>
        </div>
        <div class="saved-view-stat">
          <span class="stat-label">Avg pace</span>
          <span class="stat-value">${escapeHtml(avgPerDay)}</span>
        </div>
      </div>
      <div class="saved-view-card-foot">
        <div class="saved-view-detail">
          <span class="detail-label">Top voice</span>
          <span class="detail-value">${topSender ? escapeHtml(topSender.sender) : "—"}</span>
          <span class="detail-meta">${escapeHtml(topSenderShare)}</span>
        </div>
        <div class="saved-view-detail">
          <span class="detail-label">Peak hour</span>
          <span class="detail-value">${escapeHtml(peakHour)}</span>
          <span class="detail-meta">${escapeHtml(peakHourCount)}</span>
        </div>
      </div>
      <div class="saved-view-share-bar${sharePercent === null ? " is-empty" : ""}">
        <span style="width:${barWidth}%;"></span>
      </div>
    </article>
  `;
}

function formatSavedViewTopHour(snapshot) {
  if (!snapshot?.topHour) {
    return "No hourly data yet";
  }
  const weekday = WEEKDAY_SHORT?.[snapshot.topHour.dayIndex] ?? `Day ${snapshot.topHour.dayIndex + 1}`;
  return `${weekday} ${String(snapshot.topHour.hour).padStart(2, "0")}:00`;
}

async function handleSavedViewGalleryClick(event) {
  if (snapshotMode) return;
  const card = event.target.closest(".saved-view-card");
  if (!card) return;
  const viewId = card.dataset.viewId;
  await useSavedViewFromCard(viewId);
}

async function handleSavedViewGalleryKeydown(event) {
  if (snapshotMode) return;
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest(".saved-view-card");
  if (!card) return;
  event.preventDefault();
  await useSavedViewFromCard(card.dataset.viewId);
}

async function useSavedViewFromCard(viewId) {
  if (!viewId) return;
  if (!dataAvailable) {
    updateStatus("Load a chat before applying a saved view.", "warning");
    return;
  }
  const view = getSavedViewById(viewId);
  if (!view) {
    updateStatus("That saved view is missing.", "error");
    refreshSavedViewsUI();
    return;
  }
  await applySavedView(view);
  if (savedViewList) savedViewList.value = viewId;
}

function formatViewRange(view) {
  if (!view) return "—";
  if (typeof view.rangeData === "object" && view.rangeData) {
    const start = view.rangeData.start ? formatDisplayDate(view.rangeData.start) : "—";
    const end = view.rangeData.end ? formatDisplayDate(view.rangeData.end) : "—";
    return `${start} → ${end}`;
  }
  return describeRange(view.rangeData ?? view.range);
}

function renderComparisonSummary(primaryId, secondaryId) {
  if (!compareSummaryEl) return;
  const allViews = getSavedViews();
  if (allViews.length < 2) {
    compareSummaryEl.classList.add("empty");
    compareSummaryEl.textContent = allViews.length
      ? "Save one more view to enable comparisons."
      : "Save a view to start building comparisons.";
    return;
  }
  const selection = getCompareSelection();
  const primaryView = getSavedViewById(primaryId ?? selection.primary);
  const secondaryView = getSavedViewById(secondaryId ?? selection.secondary);

  if (!primaryView || !secondaryView) {
    compareSummaryEl.classList.add("empty");
    compareSummaryEl.innerHTML =
      "<p>Pick two saved views to compare their activity side-by-side.</p>";
    return;
  }

  const primarySnapshot = ensureViewSnapshot(primaryView);
  const secondarySnapshot = ensureViewSnapshot(secondaryView);

  if (!primarySnapshot || !secondarySnapshot) {
    compareSummaryEl.classList.add("empty");
    compareSummaryEl.innerHTML =
      "<p>Unable to compute comparison for these views. Try re-saving them.</p>";
    return;
  }

  compareSummaryEl.classList.remove("empty");
  const metrics = [
    {
      key: "range",
      label: "Date Range",
      get: (snapshot, view) => formatViewRange(view),
      diff: false,
    },
    {
      key: "totalMessages",
      label: "Messages",
      get: snapshot => snapshot.totalMessages,
      diff: true,
      digits: 0,
    },
    {
      key: "uniqueSenders",
      label: "Participants",
      get: snapshot => snapshot.uniqueSenders,
      diff: true,
      digits: 0,
    },
    {
      key: "averageWords",
      label: "Avg words per message",
      get: snapshot => snapshot.averageWords,
      diff: true,
      digits: 1,
    },
    {
      key: "averageChars",
      label: "Avg characters per message",
      get: snapshot => snapshot.averageChars,
      diff: true,
      digits: 1,
    },
    {
      key: "weeklyAverage",
      label: "Avg per week",
      get: snapshot => snapshot.weeklyAverage,
      diff: true,
      digits: 1,
    },
    {
      key: "topSender",
      label: "Top Sender",
      get: snapshot =>
        snapshot.topSender
          ? `${snapshot.topSender.sender} (${formatNumber(snapshot.topSender.count)} msgs)`
          : null,
      diff: false,
    },
    {
      key: "topHour",
      label: "Top Hour",
      get: snapshot => {
        if (!snapshot.topHour) return null;
        const weekday = WEEKDAY_SHORT[snapshot.topHour.dayIndex] ?? `Day ${snapshot.topHour.dayIndex + 1}`;
        return `${weekday} ${String(snapshot.topHour.hour).padStart(2, "0")}:00 (${formatNumber(
          snapshot.topHour.count,
        )} msgs)`;
      },
      diff: false,
    },
  ];

  const renderColumn = (heading, view, snapshot) => {
    const items = metrics
      .map(metric => {
        const value = metric.get(snapshot, view);
        const display =
          value === null || value === undefined
            ? "—"
            : typeof value === "number" && !Number.isNaN(value)
              ? metric.digits && metric.digits > 0
                ? formatFloat(value, metric.digits)
                : formatNumber(value)
              : sanitizeText(String(value));
        return `
          <li>
            <span class="compare-label">${sanitizeText(metric.label)}</span>
            <span class="compare-value">${display}</span>
          </li>
        `;
      })
      .join("");
    return `
      <div class="compare-column">
        <h3>${sanitizeText(heading)} · ${sanitizeText(view.name)}</h3>
        <ul class="compare-metrics">
          ${items}
        </ul>
      </div>
    `;
  };

  const renderDiffColumn = (metricList, snapshotA, snapshotB) => {
    const rows = metricList
      .filter(metric => metric.diff)
      .map(metric => {
        const valueA = metric.get(snapshotA);
        const valueB = metric.get(snapshotB);
        if (valueA === null || valueA === undefined || valueB === null || valueB === undefined) {
          return `
            <li>
              <span class="compare-label">${sanitizeText(metric.label)}</span>
              <span class="compare-value">—</span>
            </li>
          `;
        }
        const diff = valueB - valueA;
        const isPositive = diff > 0;
        const isNegative = diff < 0;
        const digits = metric.digits ?? 0;
        const formatted =
          Math.abs(diff) < 0.0001
            ? "0"
            : digits && digits > 0
              ? formatFloat(diff, digits)
              : formatNumber(diff);
        const prefix = diff > 0 && !formatted.startsWith("+") ? "+" : "";
        const className = isPositive ? "compare-value compare-diff positive" : isNegative ? "compare-value compare-diff negative" : "compare-value";
        return `
          <li>
            <span class="compare-label">${sanitizeText(metric.label)}</span>
            <span class="${className}">${sanitizeText(`${prefix}${formatted}`)}</span>
          </li>
        `;
      })
      .join("");
    return `
      <div class="compare-column">
        <h3>Difference (B - A)</h3>
        <ul class="compare-metrics">
          ${rows}
        </ul>
      </div>
    `;
  };

  compareSummaryEl.innerHTML = `
    <div class="compare-summary-grid">
      ${renderColumn("View A", primaryView, primarySnapshot)}
      ${renderColumn("View B", secondaryView, secondarySnapshot)}
      ${renderDiffColumn(metrics, primarySnapshot, secondarySnapshot)}
    </div>
  `;
}

function handleSaveView() {
  if (snapshotMode) {
    updateStatus("Saved views aren't available in shared link view.", "warning");
    return;
  }
  const entries = getDatasetEntries();
  if (!entries.length) {
    updateStatus("Load a chat file before saving a view.", "warning");
    return;
  }
  const rawName = savedViewNameInput?.value.trim();
  const fallbackName = `View ${getSavedViews().length + 1}`;
  const name = rawName || fallbackName;
  const view = captureCurrentView(name);
  if (!view) {
    updateStatus("Couldn't save the current view. Try again after the data loads.", "error");
    return;
  }
  const record = addSavedView(view);
  refreshSavedViewsUI();
  if (savedViewList) savedViewList.value = record.id;
  if (savedViewNameInput) savedViewNameInput.value = "";
  updateStatus(`Saved view "${name}".`, "success");
}

async function handleApplySavedView() {
  if (snapshotMode) {
    updateStatus("Saved views aren't available in shared link view.", "warning");
    return;
  }
  const id = savedViewList?.value;
  if (!id) {
    updateStatus("Choose a saved view to use.", "warning");
    return;
  }
  const view = getSavedViewById(id);
  if (!view) {
    updateStatus("That saved view is missing.", "error");
    refreshSavedViewsUI();
    return;
  }
  await applySavedView(view);
}

async function applySavedView(view) {
  const rangeValue = normalizeRangeValue(view.rangeData ?? view.range);
  const isCustom = typeof rangeValue === "object";

  setCurrentRange(isCustom ? "custom" : rangeValue);
  setCustomRange(isCustom ? rangeValue : null);
  if (rangeSelect) rangeSelect.value = isCustom ? "custom" : String(rangeValue);
  showCustomControls(isCustom);
  if (isCustom) {
    if (customStartInput) customStartInput.value = rangeValue.start ?? "";
    if (customEndInput) customEndInput.value = rangeValue.end ?? "";
  }

  updateHourlyState({
    filters: { ...view.hourlyFilters },
    brush: { ...view.hourlyBrush },
  });
  ensureDayFilters();
  ensureHourFilters();
  syncHourlyControlsWithState();

  updateWeekdayState({
    filters: { ...view.weekdayFilters },
    brush: { ...view.weekdayBrush },
  });
  ensureWeekdayDayFilters();
  ensureWeekdayHourFilters();
  syncWeekdayControlsWithState();

  await applyRangeAndRender(rangeValue);
  updateStatus(`Applied saved view "${view.name}".`, "success");
}

function handleDeleteSavedView() {
  if (snapshotMode) {
    updateStatus("Saved views aren't available in shared link view.", "warning");
    return;
  }
  const id = savedViewList?.value;
  if (!id) {
    updateStatus("Choose a saved view to remove.", "warning");
    return;
  }
  const removed = removeSavedView(id);
  if (!removed) {
    updateStatus("Couldn't remove that saved view.", "error");
    return;
  }
  refreshSavedViewsUI();
  renderComparisonSummary();
  if (savedViewList) savedViewList.value = "";
  updateStatus("Saved view removed.", "success");
}

function handleCompareViews() {
  if (snapshotMode) {
    updateStatus("Comparisons aren't available in shared link view.", "warning");
    return;
  }
  const primaryId = compareViewASelect?.value;
  const secondaryId = compareViewBSelect?.value;
  if (!primaryId || !secondaryId) {
    updateStatus("Pick two saved views to compare.", "warning");
    return;
  }
  if (primaryId === secondaryId) {
    updateStatus("Pick two different views to compare.", "warning");
    return;
  }
  setCompareSelection(primaryId, secondaryId);
  renderComparisonSummary(primaryId, secondaryId);
  updateStatus("Comparison updated.", "info");
}

function buildSentimentList(listEl, entries, tone) {
  listEl.innerHTML = "";
  if (!entries.length) {
    const empty = document.createElement("li");
    empty.className = "empty-state inline";
    empty.textContent = tone === "positive"
      ? "No clearly positive members."
      : "No clearly negative members.";
    listEl.appendChild(empty);
    return;
  }

  entries.forEach(entry => {
    const li = document.createElement("li");
    const positiveShare = entry.count ? (entry.positive || 0) / entry.count : 0;
    const negativeShare = entry.count ? (entry.negative || 0) / entry.count : 0;
    const shareText = tone === "positive"
      ? `${formatFloat(positiveShare * 100, 0)}% positive`
      : `${formatFloat(negativeShare * 100, 0)}% negative`;
    const scoreText = formatSentimentScore(entry.average, 2);
    const volumeText = `${formatNumber(entry.count)} msgs · ${shareText}`;

    li.innerHTML = `
      <span class="sentiment-name">${sanitizeText(entry.sender)}</span>
      <span class="sentiment-score ${sanitizeText(tone)}">${sanitizeText(scoreText)}</span>
      <span class="sentiment-volume">${sanitizeText(volumeText)}</span>
    `;
    listEl.appendChild(li);
  });
}

function applySearchStateToForm() {
  const state = getSearchState();
  if (!state) return;
  if (searchKeywordInput) searchKeywordInput.value = state.query.text ?? "";
  if (searchParticipantSelect) searchParticipantSelect.value = state.query.participant ?? "";
  if (searchStartInput) searchStartInput.value = state.query.start ?? "";
  if (searchEndInput) searchEndInput.value = state.query.end ?? "";
}

function populateSearchParticipants() {
  if (!searchParticipantSelect) return;
  const entries = getDatasetEntries();
  const senders = new Set();
  entries.forEach(entry => {
    if (entry.type === "message" && entry.sender) {
      senders.add(entry.sender);
    }
  });

  const selected = getSearchState().query.participant ?? "";
  const options = Array.from(senders).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );

  const previousValue = searchParticipantSelect.value;
  searchParticipantSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "All participants";
  searchParticipantSelect.appendChild(placeholder);

  options.forEach(sender => {
    const option = document.createElement("option");
    option.value = sender;
    option.textContent = sender;
    searchParticipantSelect.appendChild(option);
  });

  if (selected && !options.includes(selected)) {
    const extraOption = document.createElement("option");
    extraOption.value = selected;
    extraOption.textContent = selected;
    searchParticipantSelect.appendChild(extraOption);
  }

  const targetValue = selected || previousValue || "";
  searchParticipantSelect.value = targetValue;
  if (searchParticipantSelect.value !== targetValue) {
    searchParticipantSelect.value = "";
  }
  searchParticipantSelect.disabled = snapshotMode || options.length === 0;
}

function handleSearchSubmit(event) {
  event.preventDefault();
  if (snapshotMode) {
    updateStatus("Search isn't available in shared link view.", "warning");
    return;
  }
  const query = {
    text: searchKeywordInput?.value.trim() ?? "",
    participant: searchParticipantSelect?.value ?? "",
    start: searchStartInput?.value ?? "",
    end: searchEndInput?.value ?? "",
  };

  // Allow running a search even when no keywords are supplied; we'll scan the entire dataset if needed.

  if (query.start && query.end && query.start > query.end) {
    updateStatus("The start date must come before the end date.", "error");
    return;
  }

  runAdvancedSearch(query);
}

function handleSearchReset() {
  if (snapshotMode) {
    updateStatus("Search isn't available in shared link view.", "warning");
    return;
  }
  resetSearchState();
  if (searchKeywordInput) searchKeywordInput.value = "";
  if (searchParticipantSelect) searchParticipantSelect.value = "";
  if (searchStartInput) searchStartInput.value = "";
  if (searchEndInput) searchEndInput.value = "";
  renderSearchResults();
  updateStatus("Search filters cleared.", "info");
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

function runAdvancedSearch(query) {
  const entries = getDatasetEntries();
  if (!entries.length) {
    updateStatus("Load a chat file before searching.", "warning");
    return;
  }

  const tokens = query.text
    ? query.text
        .toLowerCase()
        .split(/\s+/)
        .map(token => token.trim())
        .filter(Boolean)
    : [];
  const participant = query.participant || "";
  const participantLower = participant.toLowerCase();

  const startDate = parseDateInput(query.start, false);
  const endDate = parseDateInput(query.end, true);
  if (query.start && !startDate) {
    updateStatus("The search start date isn't valid.", "error");
    return;
  }
  if (query.end && !endDate) {
    updateStatus("The search end date isn't valid.", "error");
    return;
  }

  setSearchQuery(query);

  const results = [];
  let totalMatches = 0;
  const dayCounts = new Map();
  const participantCounts = new Map();

  entries.forEach(entry => {
    if (entry.type !== "message") return;
    const sender = entry.sender || "";
    if (participant && sender.toLowerCase() !== participantLower) return;

    const timestamp = getTimestamp(entry);
    if (startDate && (!timestamp || timestamp < startDate)) return;
    if (endDate && (!timestamp || timestamp > endDate)) return;

    const message = entry.message || "";
    if (tokens.length) {
      const messageLower = message.toLowerCase();
      const matchesTokens = tokens.every(token => messageLower.includes(token));
      if (!matchesTokens) return;
    }

    totalMatches += 1;
    const dayKey = timestamp ? toISODate(timestamp) : null;
    if (dayKey) {
      dayCounts.set(dayKey, (dayCounts.get(dayKey) || 0) + 1);
    }
    const senderKey = sender || "[Unknown]";
    participantCounts.set(senderKey, (participantCounts.get(senderKey) || 0) + 1);
    if (results.length < SEARCH_RESULT_LIMIT) {
      results.push({
        sender,
        message,
        timestamp: timestamp ? timestamp.toISOString() : null,
      });
    }
  });

  const summary = totalMatches
    ? buildSearchSummary({ query, dayCounts, participantCounts, total: totalMatches, truncated: totalMatches > results.length })
    : null;
  setSearchResults(results, totalMatches, summary);
  renderSearchResults();

  if (!totalMatches) {
    updateStatus("No messages matched those filters.", "info");
  } else if (totalMatches > SEARCH_RESULT_LIMIT) {
    updateStatus(
      `Showing the first ${SEARCH_RESULT_LIMIT} matches out of ${formatNumber(totalMatches)}. Narrow your filters for a closer look.`,
      "info",
    );
  } else {
    updateStatus(`Found ${formatNumber(totalMatches)} matching messages.`, "success");
  }
}

function renderSearchResults() {
  if (!searchResultsSummary || !searchResultsList) return;
  const state = getSearchState();
  const query = state?.query ?? {};
  const results = state?.results ?? [];
  const total = state?.total ?? 0;
  const summary = state?.summary ?? null;

  const hasFilters = Boolean(query.text || query.participant || query.start || query.end);

  if (!hasFilters) {
    searchResultsSummary.textContent = "Add keywords, choose a participant, or set dates to search this chat.";
  } else if (!total) {
    searchResultsSummary.textContent = "No messages matched these filters. Try another keyword, participant, or date range.";
  } else if (total > results.length) {
    searchResultsSummary.textContent = `Showing ${formatNumber(results.length)} of ${formatNumber(total)} matches (first ${SEARCH_RESULT_LIMIT} shown). Narrow further to see more.`;
  } else {
    searchResultsSummary.textContent = `Showing ${formatNumber(results.length)} match${results.length === 1 ? "" : "es"}.`;
  }

  searchResultsList.innerHTML = "";

  if (!total) {
    const empty = document.createElement("div");
    empty.className = "search-results-empty";
    empty.textContent = hasFilters
      ? "No matching messages. Try other names, words, or dates."
      : "Add filters above to search the chat history.";
    searchResultsList.appendChild(empty);
    renderSearchInsights(null, query);
    return;
  }

  const tokens = query.text
    ? query.text
        .toLowerCase()
        .split(/\s+/)
        .map(token => token.trim())
        .filter(Boolean)
    : [];

  const fragment = document.createDocumentFragment();
  results.forEach(result => {
    fragment.appendChild(buildSearchResultItem(result, tokens));
  });
  searchResultsList.appendChild(fragment);

  if (total > results.length) {
    const note = document.createElement("div");
    note.className = "search-results-empty";
    note.textContent = "Narrow your filters to see more matches.";
    searchResultsList.appendChild(note);
  }

  renderSearchInsights(summary, query);
}

function buildSearchResultItem(result, tokens) {
  const item = document.createElement("div");
  item.className = "search-result";

  const header = document.createElement("div");
  header.className = "search-result-header";

  const senderEl = document.createElement("span");
  senderEl.className = "search-result-sender";
  senderEl.textContent = result.sender || "[Unknown]";
  header.appendChild(senderEl);

  const timestampEl = document.createElement("span");
  timestampEl.textContent = formatTimestampDisplay(result.timestamp);
  header.appendChild(timestampEl);

  const messageEl = document.createElement("div");
  messageEl.className = "search-result-message";
  messageEl.innerHTML = highlightKeywords(result.message || "", tokens);

  item.append(header, messageEl);
  return item;
}

function highlightKeywords(text, tokens) {
  if (!text) return "";
  let output = sanitizeText(text);
  if (!tokens || !tokens.length) return output;
  tokens.forEach(token => {
    if (!token) return;
    const escaped = escapeRegExp(sanitizeText(token));
    const regex = new RegExp(`(${escaped})`, "gi");
    output = output.replace(regex, "<mark>$1</mark>");
  });
  return output;
}

function buildSearchSummary({ query, dayCounts, participantCounts, total, truncated }) {
  const hitsPerDay = Array.from(dayCounts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);
  const topParticipants = Array.from(participantCounts.entries())
    .map(([sender, count]) => ({ sender, count, share: total ? count / total : 0 }))
    .sort((a, b) => b.count - a.count || a.sender.localeCompare(b.sender))
    .slice(0, 5);
  return {
    total,
    truncated: Boolean(truncated),
    hitsPerDay,
    topParticipants,
    filters: describeSearchFilters(query),
  };
}

function describeSearchFilters(query) {
  const details = [];
  if (query?.text) details.push(`Keywords: "${query.text}"`);
  if (query?.participant) details.push(`Participant: ${query.participant}`);
  if (query?.start || query?.end) {
    const start = query.start ? formatDisplayDate(query.start) : "Any";
    const end = query.end ? formatDisplayDate(query.end) : "Any";
    details.push(`Dates: ${start} → ${end}`);
  }
  if (!details.length) details.push("Filters: none (all messages)");
  return details;
}

function renderSearchInsights(summary) {
  if (!searchInsightsEl) return;
  if (!summary || !summary.total) {
    searchInsightsEl.classList.add("hidden");
    searchInsightsEl.innerHTML = "";
    return;
  }
  const hitsList = summary.hitsPerDay.length
    ? summary.hitsPerDay
        .map(
          item => `
            <li>
              <span class="search-insight-label">${sanitizeText(formatDisplayDate(item.date))}</span>
              <span>${formatNumber(item.count)}</span>
            </li>
          `,
        )
        .join("")
    : "<li><span class=\"search-insight-label\">No daily data</span><span>—</span></li>";
  const participantList = summary.topParticipants.length
    ? summary.topParticipants
        .map(
          item => `
            <li>
              <span class="search-insight-label">${sanitizeText(item.sender)}</span>
              <span>${formatNumber(item.count)}</span>
            </li>
          `,
        )
        .join("")
    : "<li><span class=\"search-insight-label\">No matches yet</span><span>—</span></li>";
  const filtersList = summary.filters
    .map(filter => `<li><span class="search-insight-label">${sanitizeText(filter)}</span></li>`)
    .join("");
  const noteText = summary.truncated
    ? `Showing first ${SEARCH_RESULT_LIMIT} of ${formatNumber(summary.total)} matches.`
    : `Total matches: ${formatNumber(summary.total)}.`;
  searchInsightsEl.classList.remove("hidden");
  searchInsightsEl.innerHTML = `
    <div class="search-insight-card">
      <h4>Hits per day</h4>
      <ul class="search-insight-list">${hitsList}</ul>
    </div>
    <div class="search-insight-card">
      <h4>Top participants</h4>
      <ul class="search-insight-list">${participantList}</ul>
    </div>
    <div class="search-insight-card">
      <h4>Search filters</h4>
      <ul class="search-insight-list">${filtersList}</ul>
      <p class="search-insight-note">${noteText}</p>
    </div>
  `;
}

function parseDateInput(value, endOfDay = false) {
  if (!value) return null;
  const parts = value.split("-");
  if (parts.length !== 3) return null;
  const [yearStr, monthStr, dayStr] = parts;
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const date = new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
      ? `Busiest hour: ${
          WEEKDAY_LONG[analytics.hourly_summary.topHour.dayIndex] ??
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
  lines.push(`- **Busiest hour:** ${
    analytics.hourly_summary?.topHour
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
      lines.push(`| ${index + 1} | ${entry.sender} | ${formatNumber(entry.count)} | ${
        entry.share ? `${formatFloat(entry.share * 100, 1)}%` : "—"
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
            `<li><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.value)}${
              item.descriptor ? ` — ${escapeHtml(item.descriptor)}` : ""
            }</li>`,
        )
        .join("")
    : "<li>Highlights will show once there's enough data.</li>";
  const participantEntries = details.topSenders.slice(0, 6);
  const participantList = participantEntries.length
    ? participantEntries
        .map(
          entry =>
            `<li><strong>${escapeHtml(entry.sender)}</strong>: ${formatNumber(entry.count)} messages${
              entry.share ? ` (${formatFloat(entry.share * 100, 1)}%)` : ""
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
  clearSavedViews();
  refreshSavedViewsUI();
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
  applySearchStateToForm();
  renderSearchResults();
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
  renderWeekdayChart();
}

function formatHourLabel(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function computeTimeOfDayDataset(analytics) {
  const state = getHourlyState();
  const heatmap = state.heatmap;
  const includeWeekdays = state.filters.weekdays;
  const includeWeekends = state.filters.weekends;

  const totals = Array(24).fill(0);
  const weekdayTotals = Array(24).fill(0);
  const weekendTotals = Array(24).fill(0);

  if (Array.isArray(heatmap) && heatmap.length) {
    heatmap.forEach((hours, dayIdx) => {
      const isWeekend = dayIdx === 0 || dayIdx === 6;
      hours.forEach((count, hour) => {
        const value = Number(count) || 0;
        totals[hour] += value;
        if (isWeekend) weekendTotals[hour] += value;
        else weekdayTotals[hour] += value;
      });
    });
  } else if (Array.isArray(analytics?.hourly_distribution)) {
    analytics.hourly_distribution.forEach(entry => {
      const hour = Number(entry.hour);
      const value = Number(entry.count) || 0;
      if (!Number.isFinite(hour)) return;
      totals[hour] = value;
      if (includeWeekdays && !includeWeekends) {
        weekdayTotals[hour] = value;
      } else if (!includeWeekdays && includeWeekends) {
        weekendTotals[hour] = value;
      } else {
        weekdayTotals[hour] = value;
        weekendTotals[hour] = value;
      }
    });
  }

  const points = totals.map((total, hour) => {
    const weekday = weekdayTotals[hour] || 0;
    const weekend = weekendTotals[hour] || 0;
    let active = 0;
    if (includeWeekdays) active += weekday;
    if (includeWeekends) active += weekend;
    if (!includeWeekdays && !includeWeekends) active = total;
    return {
      hour,
      total: active,
      weekday,
      weekend,
    };
  });

  const totalWeekday = includeWeekdays
    ? weekdayTotals.reduce((sum, value) => sum + value, 0)
    : 0;
  const totalWeekend = includeWeekends
    ? weekendTotals.reduce((sum, value) => sum + value, 0)
    : 0;
  const grandTotal = points.reduce((sum, point) => sum + point.total, 0);
  const maxValue = points.reduce((max, point) => Math.max(max, point.total), 0);
  const average = points.length ? grandTotal / points.length : 0;

  points.forEach(point => {
    point.share = grandTotal ? point.total / grandTotal : 0;
    point.weekdayShare = totalWeekday ? point.weekday / totalWeekday : 0;
    point.weekendShare = totalWeekend ? point.weekend / totalWeekend : 0;
  });

  return {
    points,
    total: grandTotal,
    max: maxValue || 1,
    average,
    includeWeekdays,
    includeWeekends,
    brush: { ...state.brush },
    totals: {
      weekday: totalWeekday,
      weekend: totalWeekend,
    },
  };
}

function renderTimeOfDayPanel(analytics) {
  const dataset = computeTimeOfDayDataset(analytics);
  renderTimeOfDayChart(dataset);
}

function renderTimeOfDayChart(dataset) {
  const container = document.getElementById("timeofday-chart");
  if (!container || !timeOfDaySparklineEl || !timeOfDayBandsEl || !timeOfDayCalloutsEl) return;

  timeOfDaySparklineEl.innerHTML = "";
  timeOfDayBandsEl.innerHTML = "";
  timeOfDayCalloutsEl.innerHTML = "";

  if (!dataset || !dataset.points.length || !dataset.total) {
    container.classList.add("empty");
    const empty = document.createElement("div");
    empty.className = "timeofday-summary";
    empty.textContent = "No time-of-day data yet.";
    timeOfDaySparklineEl.appendChild(empty);
    return;
  }

  container.classList.remove("empty");

  const points = dataset.points;
  const maxValue = dataset.max || 1;
  const topPoint = points.reduce((top, current) => (current.total > (top?.total ?? -Infinity) ? current : top), null);
  const focusTotal = points
    .filter(point => point.hour >= dataset.brush.start && point.hour <= dataset.brush.end)
    .reduce((sum, point) => sum + point.total, 0);
  const focusShare = dataset.total ? (focusTotal / dataset.total) * 100 : 0;

  const summary = document.createElement("div");
  summary.className = "timeofday-summary";
  if (topPoint) {
    const shareText = topPoint.share ? ` (${formatFloat(topPoint.share * 100, 1)}% of messages)` : "";
    summary.innerHTML = `<strong>Peak hour:</strong> ${formatHourLabel(topPoint.hour)} · ${formatNumber(
      topPoint.total,
    )}${shareText}<br><span>Focus window ${formatHourLabel(dataset.brush.start)} – ${formatHourLabel(
      dataset.brush.end,
    )} covers ${formatFloat(focusShare, 1)}% of messages.</span>`;
  }
  timeOfDaySparklineEl.appendChild(summary);

  const width = timeOfDaySparklineEl.clientWidth || 480;
  const height = 160;
  const margin = { top: 26, right: 18, bottom: 26, left: 18 };
  const chartWidth = Math.max(width - margin.left - margin.right, 1);
  const chartHeight = Math.max(height - margin.top - margin.bottom, 1);
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("preserveAspectRatio", "none");

  const gradientId = `todGradient-${renderTaskToken}`;
  const defs = document.createElementNS(svgNS, "defs");
  const gradient = document.createElementNS(svgNS, "linearGradient");
  gradient.setAttribute("id", gradientId);
  gradient.setAttribute("x1", "0");
  gradient.setAttribute("y1", "0");
  gradient.setAttribute("x2", "0");
  gradient.setAttribute("y2", "1");
  const stopTop = document.createElementNS(svgNS, "stop");
  stopTop.setAttribute("offset", "0%");
  stopTop.setAttribute("stop-color", "rgba(34, 211, 238, 0.35)");
  const stopBottom = document.createElementNS(svgNS, "stop");
  stopBottom.setAttribute("offset", "100%");
  stopBottom.setAttribute("stop-color", "rgba(34, 211, 238, 0)");
  gradient.append(stopTop, stopBottom);
  defs.appendChild(gradient);
  svg.appendChild(defs);

  const toCoord = hourIndex =>
    margin.left + chartWidth * (hourIndex / Math.max(points.length - 1, 1));
  const coords = points.map((point, index) => {
    const x = toCoord(index);
    const ratio = point.total / maxValue;
    const y = margin.top + chartHeight * (1 - (Number.isFinite(ratio) ? ratio : 0));
    return { x, y, point };
  });

  const areaPath = [
    `M ${coords[0].x.toFixed(2)} ${(margin.top + chartHeight).toFixed(2)}`,
    ...coords.map(coord => `L ${coord.x.toFixed(2)} ${coord.y.toFixed(2)}`),
    `L ${coords[coords.length - 1].x.toFixed(2)} ${(margin.top + chartHeight).toFixed(2)}`,
    "Z",
  ].join(" ");

  const linePath = coords
    .map((coord, index) => `${index ? "L" : "M"} ${coord.x.toFixed(2)} ${coord.y.toFixed(2)}`)
    .join(" ");

  const weekendAvailable = dataset.includeWeekends && dataset.totals.weekend > 0;
  let weekendPath = "";
  if (weekendAvailable) {
    weekendPath = coords
      .map((coord, index) => {
        const weekendValue = points[index].weekend;
        const ratio = weekendValue / maxValue;
        const y = margin.top + chartHeight * (1 - (Number.isFinite(ratio) ? ratio : 0));
        return `${index ? "L" : "M"} ${coord.x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  }

  if (dataset.brush.start !== 0 || dataset.brush.end !== 23) {
    const focusStartRatio = dataset.brush.start / 23;
    const focusEndRatio = dataset.brush.end / 23;
    const focusX = margin.left + chartWidth * focusStartRatio;
    const focusWidth = chartWidth * Math.max(focusEndRatio - focusStartRatio, 0);
    const focusRect = document.createElementNS(svgNS, "rect");
    focusRect.setAttribute("class", "focus-band");
    focusRect.setAttribute("x", focusX.toFixed(2));
    focusRect.setAttribute("y", margin.top.toFixed(2));
    focusRect.setAttribute("width", Math.max(focusWidth, 0).toFixed(2));
    focusRect.setAttribute("height", chartHeight.toFixed(2));
    svg.appendChild(focusRect);
  }

  const area = document.createElementNS(svgNS, "path");
  area.setAttribute("class", "sparkline-fill");
  area.setAttribute("d", areaPath);
  area.setAttribute("fill", `url(#${gradientId})`);
  svg.appendChild(area);

  const line = document.createElementNS(svgNS, "path");
  line.setAttribute("class", "sparkline-line");
  line.setAttribute("d", linePath);
  svg.appendChild(line);

  if (weekendAvailable && weekendPath) {
    const weekendLine = document.createElementNS(svgNS, "path");
    weekendLine.setAttribute("class", "weekend-line");
    weekendLine.setAttribute("d", weekendPath);
    svg.appendChild(weekendLine);
  }

  if (dataset.average > 0) {
    const avgRatio = dataset.average / maxValue;
    const avgY = margin.top + chartHeight * (1 - (Number.isFinite(avgRatio) ? avgRatio : 0));
    const baseline = document.createElementNS(svgNS, "line");
    baseline.setAttribute("class", "baseline");
    baseline.setAttribute("x1", margin.left.toFixed(2));
    baseline.setAttribute("x2", (margin.left + chartWidth).toFixed(2));
    baseline.setAttribute("y1", avgY.toFixed(2));
    baseline.setAttribute("y2", avgY.toFixed(2));
    svg.appendChild(baseline);
  }

  const axisGroup = document.createElementNS(svgNS, "g");
  axisGroup.setAttribute("class", "axis");
  const axisY = margin.top + chartHeight;
  const axisLine = document.createElementNS(svgNS, "line");
  axisLine.setAttribute("class", "axis-line");
  axisLine.setAttribute("x1", margin.left.toFixed(2));
  axisLine.setAttribute("x2", (margin.left + chartWidth).toFixed(2));
  axisLine.setAttribute("y1", axisY.toFixed(2));
  axisLine.setAttribute("y2", axisY.toFixed(2));
  axisGroup.appendChild(axisLine);

  const axisTicks = [0, 6, 12, 18, 23];
  axisTicks.forEach(tick => {
    const x = margin.left + chartWidth * (tick / 23);
    const tickLine = document.createElementNS(svgNS, "line");
    tickLine.setAttribute("class", "axis-tick");
    tickLine.setAttribute("x1", x.toFixed(2));
    tickLine.setAttribute("x2", x.toFixed(2));
    tickLine.setAttribute("y1", axisY.toFixed(2));
    tickLine.setAttribute("y2", (axisY + 6).toFixed(2));
    axisGroup.appendChild(tickLine);

    const tickLabel = document.createElementNS(svgNS, "text");
    tickLabel.setAttribute("class", "axis-label");
    tickLabel.setAttribute("x", x.toFixed(2));
    tickLabel.setAttribute("y", (axisY + 16).toFixed(2));
    tickLabel.setAttribute("text-anchor", "middle");
    tickLabel.textContent = formatHourLabel(tick);
    axisGroup.appendChild(tickLabel);
  });

  svg.appendChild(axisGroup);

  const topHours = [...points]
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
    .map(point => point.hour);
  coords.forEach(coord => {
    if (!topHours.includes(coord.point.hour)) return;
    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("class", "sparkline-peak");
    circle.setAttribute("cx", coord.x.toFixed(2));
    circle.setAttribute("cy", coord.y.toFixed(2));
    circle.setAttribute("r", "3.5");
    svg.appendChild(circle);
  });

  timeOfDaySparklineEl.appendChild(svg);

  const legend = document.createElement("div");
  legend.className = "timeofday-legend";
  const makeLegendItem = (swatchClass, label) => {
    const item = document.createElement("span");
    item.className = "legend-item";
    const swatch = document.createElement("span");
    swatch.className = `legend-swatch ${swatchClass}`;
    const text = document.createElement("span");
    text.textContent = label;
    item.append(swatch, text);
    return item;
  };
  legend.appendChild(makeLegendItem("main", "All days"));
  if (weekendAvailable) {
    legend.appendChild(makeLegendItem("weekend", "Weekends"));
  }
  if (dataset.average > 0) {
    legend.appendChild(makeLegendItem("baseline", "Daily average"));
  }
  if (dataset.brush.start !== 0 || dataset.brush.end !== 23) {
    legend.appendChild(makeLegendItem("focus", "Focus range"));
  }
  timeOfDaySparklineEl.appendChild(legend);

  const bands = TIME_OF_DAY_BANDS.map(band => {
    const bandHours = points.filter(point => point.hour >= band.start && point.hour <= band.end);
    const count = bandHours.reduce((sum, point) => sum + point.total, 0);
    const share = dataset.total ? count / dataset.total : 0;
    const focusOverlap = dataset.brush.start <= band.end && dataset.brush.end >= band.start;
    return {
      ...band,
      count,
      share,
      focusOverlap,
    };
  });

  const topBand = bands.reduce((top, band) => (band.count > (top?.count ?? -Infinity) ? band : top), null);
  bands.forEach(band => {
    const bandItem = document.createElement("div");
    bandItem.className = "timeofday-band";
    if (topBand && band.id === topBand.id) bandItem.classList.add("top");
    const focusLabel = band.focusOverlap ? " · In focus" : "";
    bandItem.innerHTML = `
      <span class="band-label">${band.label}</span>
      <span class="band-count">${formatNumber(band.count)}</span>
      <span class="band-share">${formatFloat(band.share * 100, 1)}% of messages${focusLabel}</span>
    `;
    timeOfDayBandsEl.appendChild(bandItem);
  });

  const windowSize = Math.min(TIME_OF_DAY_SPAN_WINDOW, points.length);
  const spans = [];
  for (let i = 0; i <= points.length - windowSize; i += 1) {
    const windowPoints = points.slice(i, i + windowSize);
    const count = windowPoints.reduce((sum, point) => sum + point.total, 0);
    const weekendCount = windowPoints.reduce((sum, point) => sum + point.weekend, 0);
    const spanStartHour = windowPoints[0].hour;
    const spanEndHour = windowPoints[windowPoints.length - 1].hour;
    const inFocus = windowPoints.some(point => point.hour >= dataset.brush.start && point.hour <= dataset.brush.end);
    spans.push({
      startHour: spanStartHour,
      endHour: spanEndHour,
      count,
      weekendCount,
      inFocus,
    });
  }

  spans.sort((a, b) => b.count - a.count);
  const topSpans = spans.slice(0, 3);
  topSpans.forEach((span, index) => {
    const callout = document.createElement("div");
    callout.className = "timeofday-callout";
    if (span.inFocus) callout.classList.add("focus");
    const spanShare = dataset.total ? (span.count / dataset.total) * 100 : 0;
    const weekendShare = dataset.totals.weekend
      ? (span.weekendCount / dataset.totals.weekend) * 100
      : 0;
    const endLabel = span.endHour === 23 ? "00:00" : formatHourLabel(span.endHour + 1);
    callout.innerHTML = `
      <span class="badge">#${index + 1}</span>
      <strong>${formatHourLabel(span.startHour)} – ${endLabel}</strong>
      <span>${formatNumber(span.count)} messages (${formatFloat(spanShare, 1)}% of total)</span>
      ${dataset.includeWeekends ? `<span>Weekend share: ${formatFloat(weekendShare, 1)}%</span>` : ""}
      ${span.inFocus ? `<span>Overlaps focus window</span>` : ""}
    `;
    timeOfDayCalloutsEl.appendChild(callout);
  });
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

function renderPolls(polls) {
  if (!pollsListEl) return;

  const totalPolls = pollCount => (Number.isFinite(pollCount) && pollCount > 0 ? pollCount : 0);
  const uniqueCreators = count => (Number.isFinite(count) && count > 0 ? count : 0);
  const total = totalPolls(polls?.total);
  const creators = uniqueCreators(polls?.unique_creators);

  if (pollsTotalEl) pollsTotalEl.textContent = formatNumber(total);
  if (pollsCreatorsEl) pollsCreatorsEl.textContent = formatNumber(creators);

  const entries = Array.isArray(polls?.entries) ? polls.entries.slice(0, 5) : [];

  if (!entries.length) {
    pollsListEl.innerHTML = `<li class="empty-state">No polls captured yet.</li>`;
    if (pollsNote) {
      pollsNote.textContent = "Load a chat that includes poll messages to surface them here.";
    }
    return;
  }

  const formatTimestamp = entry => {
    if (entry.timestamp) return formatDisplayDate(entry.timestamp);
    if (entry.timestamp_text) return entry.timestamp_text;
    return "";
  };

  pollsListEl.innerHTML = entries
    .map(entry => {
      const title = sanitizeText(entry.title || "Poll");
      const sender = entry.sender || "Unknown";
      const timeLabel = formatTimestamp(entry);
      const metaParts = [sender ? `By ${sender}` : null, timeLabel || null].filter(Boolean);
      const options = Array.isArray(entry.options) ? entry.options.slice(0, 6) : [];
      const optionsMarkup = options.length
        ? `<div class="poll-item-options">${options
            .map(option => `<span>${sanitizeText(option)}</span>`)
            .join("")}</div>`
        : "";
      return `
        <li class="poll-item">
          <div class="poll-item-title">${title}</div>
          <div class="poll-item-meta">${metaParts.map(text => sanitizeText(text)).join(" · ")}</div>
          ${optionsMarkup}
        </li>
      `;
    })
    .join("");

  if (pollsNote) {
    const topCreator = Array.isArray(polls?.top_creators) ? polls.top_creators[0] : null;
    const noteParts = [`${formatNumber(total)} polls recorded`];
    if (topCreator) {
      noteParts.push(
        `Most polls: ${sanitizeText(topCreator.sender || "Unknown")} (${formatNumber(topCreator.count || 0)})`,
      );
    } else if (creators) {
      noteParts.push(`${formatNumber(creators)} people created polls`);
    }
    pollsNote.textContent = noteParts.join(" · ");
  }
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


function renderDailyCalendar(dailyCounts) {
  const container = document.getElementById("daily-chart");
  if (!container) return;
  container.classList.add("calendar-chart");
  container.innerHTML = "";

  if (!dailyCounts || !dailyCounts.length) {
    container.textContent = "No data yet.";
    return;
  }

  const avgDayEl = document.getElementById("daily-avg-day");
  if (avgDayEl) {
    const totalMessages = dailyCounts.reduce((sum, item) => sum + item.count, 0);
    const average = dailyCounts.length ? totalMessages / dailyCounts.length : 0;
    avgDayEl.textContent = average ? `${formatFloat(average, 1)} msgs` : "—";
  }

  const dataMap = new Map(dailyCounts.map(item => [item.date, item.count]));
  const maxCount = Math.max(...dailyCounts.map(item => item.count), 0);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const dayLabels = WEEKDAY_SHORT;

  const firstDate = new Date(dailyCounts[0].date);
  const lastDate = new Date(dailyCounts[dailyCounts.length - 1].date);
  firstDate.setHours(0, 0, 0, 0);
  lastDate.setHours(0, 0, 0, 0);

  const startMonth = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
  const endMonth = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1);

  const monthsFragment = document.createDocumentFragment();
  const monthCursor = new Date(startMonth);

  while (monthCursor <= endMonth) {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthContainer = document.createElement("div");
    monthContainer.className = "calendar-month";

    const header = document.createElement("div");
    header.className = "calendar-month-header";
    header.textContent = `${monthNames[month]} ${year}`;
    monthContainer.appendChild(header);

    const weekdaysRow = document.createElement("div");
    weekdaysRow.className = "calendar-weekdays";
    dayLabels.forEach(label => {
      const span = document.createElement("span");
      span.textContent = label;
      weekdaysRow.appendChild(span);
    });
    monthContainer.appendChild(weekdaysRow);

    const daysGrid = document.createElement("div");
    daysGrid.className = "calendar-days";

    const firstWeekday = new Date(year, month, 1).getDay();
    for (let fillerIdx = 0; fillerIdx < firstWeekday; fillerIdx += 1) {
      const filler = document.createElement("div");
      filler.className = "calendar-day filler";
      daysGrid.appendChild(filler);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const count = dataMap.has(iso) ? dataMap.get(iso) : null;

      const cell = document.createElement("div");
      cell.className = "calendar-day";

      const numberEl = document.createElement("div");
      numberEl.className = "day-number";
      numberEl.textContent = day;
      cell.appendChild(numberEl);

      const countEl = document.createElement("div");
      countEl.className = "day-count";

      const displayDate = formatDisplayDate(iso);

      if (count === null || count === undefined) {
        cell.classList.add("inactive");
        countEl.textContent = "—";
        cell.title = `${displayDate}: no data`;
      } else {
        const formatted = formatNumber(count);
        countEl.textContent = formatted;
        cell.dataset.date = iso;
        cell.dataset.count = count;
        cell.title = `${displayDate}: ${formatted} message${count === 1 ? "" : "s"}`;

        if (count === 0) {
          cell.classList.add("zero", "level-0");
        } else if (maxCount > 0) {
          const ratio = count / maxCount;
          let level = 1;
          if (ratio >= 0.75) level = 4;
          else if (ratio >= 0.5) level = 3;
          else if (ratio >= 0.25) level = 2;
          cell.classList.add(`level-${level}`);
        }
      }

      cell.appendChild(countEl);
      daysGrid.appendChild(cell);
    }

    const remainder = daysGrid.children.length % 7;
    if (remainder !== 0) {
      for (let fillerIdx = 0; fillerIdx < 7 - remainder; fillerIdx += 1) {
        const filler = document.createElement("div");
        filler.className = "calendar-day filler";
        daysGrid.appendChild(filler);
      }
    }

    monthContainer.appendChild(daysGrid);
    monthsFragment.appendChild(monthContainer);
    monthCursor.setMonth(monthCursor.getMonth() + 1);
  }

  container.appendChild(monthsFragment);

  const legend = document.createElement("div");
  legend.className = "calendar-legend";
  legend.innerHTML = `
    <span>Less</span>
    <div class="legend-cells">
      <span class="legend-cell level-0"></span>
      <span class="legend-cell level-1"></span>
      <span class="legend-cell level-2"></span>
      <span class="legend-cell level-3"></span>
      <span class="legend-cell level-4"></span>
    </div>
    <span>More</span>
  `;
  container.appendChild(legend);
}

function renderWeeklyTrend(weeklyData, summary) {
  const cumulativeEl = document.getElementById("weekly-cumulative");
  if (cumulativeEl) {
    cumulativeEl.textContent = summary && typeof summary.cumulativeTotal === "number"
      ? formatNumber(summary.cumulativeTotal)
      : "—";
  }

  const rollingEl = document.getElementById("weekly-rolling");
  if (rollingEl) {
    rollingEl.textContent = summary && typeof summary.latestRolling === "number"
      ? `${formatFloat(summary.latestRolling, 1)} msgs`
      : "—";
  }

  const averageEl = document.getElementById("weekly-average");
  if (averageEl) {
    averageEl.textContent = summary && typeof summary.averagePerWeek === "number"
      ? `${formatFloat(summary.averagePerWeek, 1)} msgs/week`
      : "—";
  }

  const chartContainer = document.getElementById("weekly-chart");
  if (!chartContainer) return;
  chartContainer.className = "weekly-chart";
  chartContainer.innerHTML = "";

  if (!weeklyData || !weeklyData.length) {
    chartContainer.textContent = "No data yet.";
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "weekly-chart-wrapper";
  const bars = document.createElement("div");
  bars.className = "weekly-bars";
  wrapper.appendChild(bars);

  chartContainer.appendChild(wrapper);
  const maxCount = Math.max(...weeklyData.map(item => item.count)) || 1;

  weeklyData.forEach((entry, index) => {
    const bar = document.createElement("button");
    bar.type = "button";
    bar.className = "weekly-bar";

    const customRange = getCustomRange();
    if (
      customRange &&
      customRange.start === entry.startDate &&
      customRange.end === entry.endDate
    ) {
      bar.classList.add("selected");
    }

    const valueEl = document.createElement("span");
    valueEl.className = "weekly-bar-value";
    valueEl.textContent = formatNumber(entry.count);
    bar.appendChild(valueEl);

    const fillWrap = document.createElement("div");
    fillWrap.className = "weekly-bar-fill-wrap";
    const fill = document.createElement("div");
    fill.className = "weekly-bar-fill";
    fill.style.height = `${(entry.count / maxCount) * 100}%`;
    fillWrap.appendChild(fill);
    bar.appendChild(fillWrap);

    const weekLabel = document.createElement("span");
    weekLabel.className = "weekly-bar-week";
    const [weekYear, weekNumber] = (entry.week || "").split("-");
    if (weekYear && weekNumber) {
      const yearEl = document.createElement("span");
      yearEl.className = "week-label-year";
      yearEl.textContent = weekYear;
      const numberEl = document.createElement("span");
      numberEl.className = "week-label-number";
      numberEl.textContent = weekNumber;
      weekLabel.append(yearEl, numberEl);
    } else {
      weekLabel.textContent = entry.week ?? "—";
    }
    bar.appendChild(weekLabel);

    const deltaEl = document.createElement("span");
    deltaEl.className = "weekly-bar-delta";
    const deltaDiff = document.createElement("span");
    deltaDiff.className = "delta-diff";
    const deltaPct = document.createElement("span");
    deltaPct.className = "delta-pct";

    if (entry.delta === null) {
      deltaEl.classList.add("flat");
      deltaDiff.textContent = "—";
      deltaPct.textContent = "";
    } else if (entry.delta > 0) {
      const pct = entry.deltaPercent ? formatFloat(entry.deltaPercent * 100, 1) : null;
      deltaEl.classList.add("up");
      deltaDiff.textContent = `▲ ${formatNumber(entry.delta)}`;
      deltaPct.textContent = pct !== null ? `(${pct}%)` : "";
    } else if (entry.delta < 0) {
      const pct = entry.deltaPercent ? formatFloat(Math.abs(entry.deltaPercent) * 100, 1) : null;
      deltaEl.classList.add("down");
      deltaDiff.textContent = `▼ ${formatNumber(Math.abs(entry.delta))}`;
      deltaPct.textContent = pct !== null ? `(${pct}%)` : "";
    } else {
      deltaEl.classList.add("flat");
      deltaDiff.textContent = "—";
      deltaPct.textContent = "";
    }

    deltaEl.append(deltaDiff, deltaPct);
    bar.appendChild(deltaEl);

    bar.addEventListener("click", () => {
      if (!entry.startDate || !entry.endDate) return;
      applyCustomRange(entry.startDate, entry.endDate);
      if (rangeSelect) rangeSelect.value = "custom";
    });

    bars.appendChild(bar);
  });
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

function updateWeekdayFilterNote(stateOverride) {
  if (!weekdayFilterNote) return;
  const state = stateOverride || getWeekdayState();
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
  weekdayFilterNote.textContent = pieces.length ? pieces.join(" · ") : "";
}

function computeWeekdayFilteredData() {
  const state = getWeekdayState();
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
    const defaultPeriods = entry.periods || [
      { label: "AM", count: 0 },
      { label: "PM", count: 0 },
    ];
    if ((isWeekday && !includeWeekdays) || (!isWeekday && !includeWeekends)) {
      return {
        ...entry,
        filteredCount: 0,
        filteredShare: 0,
        filteredStdScore: 0,
        filteredDeltaPercent: 0,
        filteredHourly: Array(24).fill(0),
        filteredPeriods: defaultPeriods.map(period => ({ ...period, count: 0 })),
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

function buildWeekdayHeatmapMobile(entries) {
  const heatmap = document.createElement("div");
  heatmap.className = "weekday-heatmap-mobile";
  if (!entries.length) return heatmap;

  const header = document.createElement("div");
  header.className = "weekday-heatmap-row header";
  header.innerHTML = `
    <span class="heatmap-cell corner"></span>
    <span class="heatmap-cell">AM</span>
    <span class="heatmap-cell">PM</span>
  `;
  heatmap.appendChild(header);

  const maxValue = Math.max(
    ...entries.flatMap(entry => entry.filteredPeriods.map(period => period.count)),
    0,
  ) || 1;

  entries.forEach(entry => {
    const row = document.createElement("div");
    row.className = "weekday-heatmap-row";

    const labelCell = document.createElement("span");
    labelCell.className = "heatmap-cell label";
    labelCell.textContent = entry.label;
    row.appendChild(labelCell);

    entry.filteredPeriods.forEach(period => {
      const cell = document.createElement("span");
      cell.className = "heatmap-cell heat";
      const ratio = period.count / maxValue;
      let level = 0;
      if (ratio >= 0.75) level = 4;
      else if (ratio >= 0.5) level = 3;
      else if (ratio >= 0.25) level = 2;
      else if (ratio > 0) level = 1;
      cell.classList.add(`level-${level}`);
      cell.textContent = period.count ? formatNumber(period.count) : "—";
      cell.title = `${entry.label} ${period.label}: ${formatNumber(period.count)} messages`;
      row.appendChild(cell);
    });

    heatmap.appendChild(row);
  });

  return heatmap;
}

function renderWeekdayChart() {
  const container = document.getElementById("weekday-chart");
  if (!container) return;
  container.innerHTML = "";

  const state = getWeekdayState();
  const distribution = state.distribution || [];
  if (!distribution.length) {
    container.textContent = "No data yet.";
    updateWeekdayFilterNote(state);
    return;
  }

  const { entries, total, std } = computeWeekdayFilteredData();

  if (!total) {
    container.textContent = "No data for these filters.";
    updateWeekdayFilterNote({ ...state, filters: state.filters, brush: state.brush });
    return;
  }

  const maxCount = Math.max(...entries.map(entry => entry.filteredCount), 1);

  const barGrid = document.createElement("div");
  barGrid.className = "weekday-bar-grid";

  entries.forEach(entry => {
    const item = document.createElement("div");
    item.className = "weekday-item";

    const barContainer = document.createElement("div");
    barContainer.className = "weekday-bar-container";

    const barFill = document.createElement("div");
    barFill.className = "weekday-bar-fill";
    if (std && entry.filteredStdScore >= 1) barFill.classList.add("above");
    else if (std && entry.filteredStdScore <= -1) barFill.classList.add("below");
    barFill.style.height = `${(entry.filteredCount / maxCount) * 100}%`;

    const diffPercent = entry.filteredDeltaPercent ? entry.filteredDeltaPercent * 100 : 0;
    const diffText = entry.filteredDeltaPercent
      ? `${diffPercent >= 0 ? "+" : ""}${formatFloat(diffPercent, 1)}% vs average`
      : "About average";
    const topSenderText = entry.topSenders.length
      ? entry.topSenders
          .map(sender => `${sender.sender} (${formatNumber(sender.count)} · ${formatFloat(sender.share * 100, 1)}%)`)
          .join(", ")
      : "No sender info";
    const tooltip = `${entry.label}\nMessages: ${formatNumber(entry.filteredCount)} (${formatFloat(entry.filteredShare * 100, 1)}% of filtered view)\n${diffText}\nTop senders: ${topSenderText}`;
    barFill.title = tooltip;

    barContainer.appendChild(barFill);

    const meta = document.createElement("div");
    meta.className = "weekday-meta";

    const label = document.createElement("span");
    label.className = "weekday-label";
    label.textContent = entry.label;

    const count = document.createElement("span");
    count.className = "weekday-count";
    count.textContent = formatNumber(entry.filteredCount);

    const share = document.createElement("span");
    share.className = "weekday-share";
    share.textContent = `${formatFloat(entry.filteredShare * 100, 1)}%`;

    meta.append(label, count, share);

    if (std && Math.abs(entry.filteredStdScore) >= 1) {
      const badge = document.createElement("span");
      badge.className = `weekday-badge ${entry.filteredStdScore >= 0 ? "positive" : "negative"}`;
      if (entry.filteredDeltaPercent) {
        const pct = Math.abs(entry.filteredDeltaPercent) * 100;
        badge.textContent = `${entry.filteredStdScore >= 0 ? "+" : "−"}${formatFloat(pct, 1)}% vs average`;
      } else {
        badge.textContent = entry.filteredStdScore >= 0 ? "Above average" : "Below average";
      }
      meta.appendChild(badge);
    }

    item.append(barContainer, meta);
    barGrid.appendChild(item);
  });

  const fragment = document.createDocumentFragment();
  fragment.appendChild(barGrid);
  fragment.appendChild(buildWeekdayHeatmapMobile(entries));
  container.appendChild(fragment);
  updateWeekdayFilterNote();
}

function renderHourlyHeatmap(heatmap, summary, details, distribution) {
  if (heatmap && summary && details && distribution) {
    updateHourlyState({
      heatmap,
      summary,
      details,
      distribution,
    });
  }

  const hourlyState = getHourlyState();
  const {
    heatmap: activeHeatmap,
    summary: activeSummary,
    details: activeDetails,
  } = hourlyState;
  renderHourlySummary(activeSummary);

  if (!hourlyControlsInitialised) {
    initHourlyControls();
    hourlyControlsInitialised = true;
  }

  const container = document.getElementById("hourly-chart");
  if (!container) return;
  container.className = "hourly-heatmap";
  container.innerHTML = "";

  if (!activeHeatmap || !activeHeatmap.length) {
    container.textContent = "No data available.";
    updateHourlyFilterNote();
    if (brushSummaryEl) brushSummaryEl.textContent = "No hourly data for this range.";
    updateHourlyAnomalies();
    return;
  }

  const filteredHeatmap = computeFilteredHeatmap(hourlyState);
  const stats = activeSummary?.stats;
  const threshold = stats?.threshold ?? Infinity;
  const maxCount = Math.max(...filteredHeatmap.flat(), 1);

  const grid = document.createElement("div");
  grid.className = "heatmap-grid";

  const corner = document.createElement("div");
  corner.className = "heatmap-cell header corner";
  grid.appendChild(corner);

  WEEKDAY_SHORT.forEach(label => {
    const cell = document.createElement("div");
    cell.className = "heatmap-cell header weekday";
    cell.textContent = label;
    grid.appendChild(cell);
  });

  for (let hour = 0; hour < 24; hour += 1) {
    const hourLabel = `${String(hour).padStart(2, "0")}:00`;
    const labelCell = document.createElement("div");
    labelCell.className = "heatmap-cell header hour-label";
    labelCell.textContent = hourLabel;
    grid.appendChild(labelCell);

    for (let day = 0; day < 7; day += 1) {
      const displayCount = filteredHeatmap[day]?.[hour] ?? 0;
      const originalDetail = activeDetails?.[day]?.[hour];
      const baseCount = originalDetail?.count ?? 0;

      const cell = document.createElement("div");
      cell.className = "heatmap-cell heat-cell";

      let level = 0;
      if (displayCount > 0 && maxCount > 0) {
        const ratio = displayCount / maxCount;
        if (ratio >= 0.75) level = 4;
        else if (ratio >= 0.5) level = 3;
        else if (ratio >= 0.25) level = 2;
        else level = 1;
      }
      cell.classList.add(`level-${level}`);
      if (baseCount > threshold) cell.classList.add("anomaly");
      if (displayCount === 0 && baseCount > 0) cell.classList.add("muted");

      cell.textContent = displayCount ? formatNumber(displayCount) : "—";

      const share = originalDetail?.share ?? 0;
      const topSenders = originalDetail?.topSenders ?? [];
      const comparison = activeSummary?.comparison?.perHour?.[hour];
      const diffText = comparison
        ? `\nChange vs prior: ${
            comparison.previous
              ? `${comparison.diff >= 0 ? "+" : ""}${formatNumber(comparison.diff)}${
                  comparison.diffPercent !== null
                    ? ` (${formatFloat(comparison.diffPercent * 100, 1)}%)`
                    : ""
                }`
              : "No prior data"
          }`
        : "";
      const topSenderText = topSenders.length
        ? `\nTop senders: ${topSenders
            .map(item => `${item.sender} (${formatNumber(item.count)})`)
            .join(", ")}`
        : "";
      const anomalyText = baseCount > threshold ? "\n⚠️ Anomaly: above expected range" : "";

      cell.title = `${WEEKDAY_LONG[day]} ${hourLabel}\nMessages: ${formatNumber(
        baseCount,
      )} (${formatFloat(share * 100, 1)}% of period)${diffText}${topSenderText}${anomalyText}`;

      grid.appendChild(cell);
    }
  }

  container.appendChild(grid);

  const legend = document.createElement("div");
  legend.className = "calendar-legend heatmap-legend";
  legend.innerHTML = `
    <span>Less</span>
    <div class="legend-cells">
      <span class="legend-cell level-0"></span>
      <span class="legend-cell level-1"></span>
      <span class="legend-cell level-2"></span>
      <span class="legend-cell level-3"></span>
      <span class="legend-cell level-4"></span>
    </div>
    <span>More</span>
  `;
  container.appendChild(legend);

  updateHourlyFilterNote();
  updateHourlyBrushSummary(filteredHeatmap);
  updateHourlyAnomalies();
}

function rerenderHourlyFromState() {
  const state = getHourlyState();
  renderHourlyHeatmap(state.heatmap, state.summary, state.details, state.distribution);
  const analytics = getDatasetAnalytics();
  if (analytics) {
    renderTimeOfDayPanel(analytics);
  }
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

function computeFilteredHeatmap(state) {
  const includeWeekdays = state.filters.weekdays;
  const includeWeekends = state.filters.weekends;
  const includeWorking = state.filters.working;
  const includeOffhours = state.filters.offhours;

  return state.heatmap.map((row, dayIdx) =>
    row.map((count, hour) => {
      const isWeekday = dayIdx >= 1 && dayIdx <= 5;
      const dayAllowed = (isWeekday && includeWeekdays) || (!isWeekday && includeWeekends);
      const isWorkingHour = hour >= 9 && hour <= 17;
      const hourAllowed = (isWorkingHour && includeWorking) || (!isWorkingHour && includeOffhours);
      return dayAllowed && hourAllowed ? count : 0;
    }),
  );
}

function updateHourlyFilterNote() {
  if (!filterNoteEl) return;
  const { weekdays, weekends, working, offhours } = getHourlyState().filters;
  const pieces = [];
  if (!weekdays || !weekends) {
    if (weekdays && !weekends) pieces.push("Weekdays only");
    else if (!weekdays && weekends) pieces.push("Weekends only");
  }
  if (!working || !offhours) {
    if (working && !offhours) pieces.push("Working hours");
    else if (!working && offhours) pieces.push("Off hours");
  }
  filterNoteEl.textContent = pieces.length ? pieces.join(" · ") : "";
}

function updateHourlyBrushSummary(filteredHeatmap) {
  if (!brushSummaryEl) return;
  const { start, end } = getHourlyState().brush;
  const totalMessages = getHourlyState().summary?.totalMessages ?? 0;
  let currentTotal = 0;
  filteredHeatmap.forEach(row => {
    for (let hour = start; hour <= end; hour += 1) {
      currentTotal += row[hour] ?? 0;
    }
  });

  const perHourComparison = getHourlyState().summary?.comparison?.perHour ?? [];
  let previousTotal = 0;
  for (let hour = start; hour <= end; hour += 1) {
    previousTotal += perHourComparison[hour]?.previous ?? 0;
  }
  const diff = previousTotal ? currentTotal - previousTotal : null;
  const diffPercent = previousTotal && diff !== null ? (diff / previousTotal) * 100 : null;
  const share = totalMessages ? (currentTotal / totalMessages) * 100 : null;

  let text = `${String(start).padStart(2, "0")}:00–${String(end).padStart(2, "0")}:00 → ${formatNumber(
    currentTotal,
  )} msgs`;
  if (share !== null) text += ` (${formatFloat(share, 1)}% of period)`;
  if (diff !== null) {
    const sign = diff > 0 ? "+" : "";
    const pctText = diffPercent !== null ? ` (${sign}${formatFloat(diffPercent, 1)}%)` : "";
    text += ` | vs prior: ${sign}${formatNumber(diff)}${pctText}`;
  }
  brushSummaryEl.textContent = text;
}

function updateHourlyAnomalies() {
  const anomaliesEl = document.getElementById("hourly-anomalies");
  if (!anomaliesEl) return;
  anomaliesEl.innerHTML = "";
  const stats = getHourlyState().summary?.stats;
  if (!stats) return;
  const threshold = stats.threshold ?? Infinity;
  const anomalies = (getHourlyState().distribution || [])
    .filter(item => item.count > threshold)
    .map(item => ({
      hour: item.hour,
      count: item.count,
    }));

  if (!anomalies.length) {
    anomaliesEl.textContent = "No hourly surprises detected.";
    return;
  }

  anomalies.forEach(item => {
    const badge = document.createElement("span");
    badge.className = "badge";
    const label = `${String(item.hour).padStart(2, "0")}:00`;
    badge.textContent = `${label} (${formatNumber(item.count)} msgs)`;
    anomaliesEl.appendChild(badge);
  });
}
