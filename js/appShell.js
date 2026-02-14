import { getTimestamp } from "./analytics.js";
import {
  formatNumber,
  formatFloat,
  sanitizeText,
  toISODate,
  formatDisplayDate,
  formatTimestampDisplay,
} from "./utils.js";
import { WEEKDAY_SHORT } from "./constants.js";
import {
  SECTION_NAV_ITEMS,
  SEARCH_RESULT_LIMIT,
  ONBOARDING_STEPS,
} from "./appConstants.js";
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
  setDatasetFingerprint,
  getDatasetFingerprint,
  setDatasetParticipantDirectory,
  computeDatasetFingerprint,
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
  BRAND_NAME,
  RELAY_SERVICE_NAME,
  STATUS_AUTO_HIDE_DELAY_MS,
  STATUS_EXIT_DURATION_MS,
  motionPreferenceQuery,
  initialReduceMotionPreferred,
} from "./config.js";
import { EXPORT_THEME_STYLES } from "./theme.js";
import {
  createDomCache,
  createDatasetEmptyStateManager,
  createDeferredRenderScheduler,
  createCompactModeManager,
  createAccessibilityController,
} from "./ui.js";
import {
  createParticipantDirectory,
  serializeParticipantDirectory,
  deserializeParticipantDirectory,
  normalizeEntriesWithDirectory,
  buildParticipantRoster,
} from "./appShell/participantDirectory.js";
import { createOnboardingController } from "./appShell/onboarding.js";
import { createStatusUiController } from "./appShell/statusUi.js";
import { createThemeUiController } from "./appShell/themeUi.js";
import { createSectionNavController } from "./appShell/sectionNav.js";
import { createChatSelectionController } from "./appShell/chatSelection.js";
import { createExportPipeline } from "./appShell/exportPipeline.js";
import { createRangeFiltersController } from "./appShell/rangeFilters.js";
import { createAnalyticsPipeline } from "./appShell/analyticsPipeline.js";
import { createPdfPreviewController } from "./appShell/pdfPreview.js";

const domCache = createDomCache();
const statusEl = domCache.getById("data-status");
const relayBannerEl = domCache.getById("relay-status-banner");
const relayBannerMessage = domCache.getById("relay-status-message");
const relayBannerMeta = domCache.getById("relay-status-meta");
const relayOnboardingSteps = document.querySelectorAll(".relay-step");
const summaryEl = domCache.getById("summary");
const participantsBody = document.querySelector("#top-senders tbody");
const participantsNote = domCache.getById("participants-note");
const participantsTopSelect = domCache.getById("participants-top-count");
const participantsSortSelect = domCache.getById("participants-sort");
const participantsTimeframeSelect = domCache.getById("participants-timeframe");
const participantPresetButtons = document.querySelectorAll("[data-participants-preset]");
const rangeSelect = domCache.getById("global-range");
const chatSelector = domCache.getById("chat-selector");
const relayStatusEl = domCache.getById("relay-connection-status");
const relayAccountEl = domCache.getById("relay-account-name");
const relayStartButton = domCache.getById("relay-start");
const relayStopButton = domCache.getById("relay-stop");
const relayLogoutButton = domCache.getById("relay-logout");
const relayReloadAllButton = domCache.getById("relay-reload-all");
const relayClearStorageButton = domCache.getById("relay-clear-storage");
const relayQrContainer = domCache.getById("relay-qr-container");
const relayQrImage = domCache.getById("relay-qr-image");
const relayHelpText = domCache.getById("relay-help-text");
const relaySyncProgressEl = domCache.getById("relay-sync-progress");
const relaySyncChatsMeta = domCache.getById("relay-sync-chats-meta");
const relaySyncMessagesMeta = domCache.getById("relay-sync-messages-meta");
const reduceMotionToggle = domCache.getById("reduce-motion-toggle");
const highContrastToggle = domCache.getById("high-contrast-toggle");
const customControls = domCache.getById("custom-range-controls");
const customStartInput = domCache.getById("custom-start");
const customEndInput = domCache.getById("custom-end");
const customApplyButton = domCache.getById("apply-custom-range");
const hourlyTopHourEl = domCache.getById("hourly-top-hour");
const brushSummaryEl = domCache.getById("hourly-brush-summary");
const filterNoteEl = domCache.getById("hourly-filter-note");
const hourlyChartEl = domCache.getById("hourly-chart");
const hourlyAnomaliesEl = domCache.getById("hourly-anomalies");
const dailyChartEl = domCache.getById("daily-chart");
const dailyAvgDayEl = domCache.getById("daily-avg-day");
const weeklyChartEl = domCache.getById("weekly-chart");
const weeklyCumulativeEl = domCache.getById("weekly-cumulative");
const weeklyRollingEl = domCache.getById("weekly-rolling");
const weeklyAverageEl = domCache.getById("weekly-average");
const weekdayChartEl = domCache.getById("weekday-chart");
const weekdayFilterNote = domCache.getById("weekday-filter-note");
const weekdayToggleWeekdays = domCache.getById("weekday-toggle-weekdays");
const weekdayToggleWeekends = domCache.getById("weekday-toggle-weekends");
const weekdayToggleWorking = domCache.getById("weekday-toggle-working");
const weekdayToggleOffhours = domCache.getById("weekday-toggle-offhours");
const weekdayHourStartInput = domCache.getById("weekday-hour-start");
const weekdayHourEndInput = domCache.getById("weekday-hour-end");
const messageTypeSummaryEl = domCache.getById("message-type-summary");
const messageTypeNoteEl = domCache.getById("message-types-note");
const downloadPdfButton = domCache.getById("download-pdf");
const downloadTimeOfDayButton = domCache.getById("download-timeofday");
const downloadParticipantsButton = domCache.getById("download-participants");
const downloadHourlyButton = domCache.getById("download-hourly");
const downloadDailyButton = domCache.getById("download-daily");
const downloadWeeklyButton = domCache.getById("download-weekly");
const downloadWeekdayButton = domCache.getById("download-weekday");
const downloadMessageTypesButton = domCache.getById("download-message-types");
const downloadSentimentButton = domCache.getById("download-sentiment");
const downloadChatJsonButton = domCache.getById("download-chat-json");
const sentimentSummaryEl = domCache.getById("sentiment-summary");
const sentimentTrendNote = domCache.getById("sentiment-trend-note");
const sentimentDailyChart = domCache.getById("sentiment-daily-chart");
const sentimentPositiveList = domCache.getById("sentiment-top-positive");
const sentimentNegativeList = domCache.getById("sentiment-top-negative");
const savedViewNameInput = domCache.getById("saved-view-name");
const saveViewButton = domCache.getById("save-view");
const savedViewList = domCache.getById("saved-view-list");
const applySavedViewButton = domCache.getById("apply-saved-view");
const deleteSavedViewButton = domCache.getById("delete-saved-view");
const savedViewGallery = domCache.getById("saved-view-gallery");
const compareViewASelect = domCache.getById("compare-view-a");
const compareViewBSelect = domCache.getById("compare-view-b");
const compareViewsButton = domCache.getById("compare-views");
const compareSummaryEl = domCache.getById("compare-summary");
const searchForm = domCache.getById("advanced-search-form");
const searchKeywordInput = domCache.getById("search-keyword");
const searchParticipantSelect = domCache.getById("search-participant");
const searchStartInput = domCache.getById("search-start");
const searchEndInput = domCache.getById("search-end");
const resetSearchButton = domCache.getById("reset-search");
const downloadSearchButton = domCache.getById("download-search-results");
const searchResultsSummary = domCache.getById("search-results-summary");
const searchResultsList = domCache.getById("search-results-list");
const searchInsightsEl = domCache.getById("search-insights");
const searchProgressEl = domCache.getById("search-progress");
const searchProgressTrack = domCache.getById("search-progress-track");
const searchProgressBar = domCache.getById("search-progress-bar");
const searchProgressLabel = domCache.getById("search-progress-label");
const highlightList = domCache.getById("highlight-list");
const downloadMarkdownButton = domCache.getById("download-markdown-report");
const downloadSlidesButton = domCache.getById("download-slides-report");
const logDrawerToggleButton = domCache.getById("log-drawer-toggle");
const logDrawerEl = domCache.getById("relay-log-drawer");
const logDrawerCloseButton = domCache.getById("relay-log-close");
const logDrawerClearButton = domCache.getById("relay-log-clear");
const logDrawerList = domCache.getById("relay-log-list");
const logDrawerConnectionLabel = domCache.getById("relay-log-connection");
const globalProgressEl = domCache.getById("global-progress");
const globalProgressLabel = domCache.getById("global-progress-label");
const toastContainer = domCache.getById("toast-container");
const compactToggleButton = domCache.getById("compact-toggle");
const onboardingOverlay = domCache.getById("onboarding-overlay");
const onboardingCopyEl = domCache.getById("onboarding-copy");
const onboardingStepLabel = domCache.getById("onboarding-step-label");
const onboardingSkipButton = domCache.getById("onboarding-skip");
const onboardingNextButton = domCache.getById("onboarding-next");
const heroStatusBadge = domCache.getById("hero-status-badge");
const heroStatusCopy = domCache.getById("hero-status-copy");
const datasetEmptyCallout = domCache.getById("dataset-empty-callout");
const datasetEmptyHeading = domCache.getById("dataset-empty-heading");
const datasetEmptyCopy = domCache.getById("dataset-empty-copy");

const datasetEmptyStateManager = createDatasetEmptyStateManager({
  calloutEl: datasetEmptyCallout,
  headingEl: datasetEmptyHeading,
  copyEl: datasetEmptyCopy,
  buttons: [
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
  ],
});
const setDatasetEmptyMessage = datasetEmptyStateManager.setMessage;
const chatSelectionController = createChatSelectionController({
  chatSelector,
  brandName: BRAND_NAME,
  formatNumber,
  formatDisplayDate,
  listChatDatasets,
  getActiveChatId,
  setActiveChatId,
});
const {
  encodeChatSelectorValue,
  setRemoteChatList,
  getRemoteChatList,
  getRemoteChatsLastFetchedAt,
  refreshChatSelector,
  handleChatSelectionChange: handleChatSelectionChangeCore,
} = chatSelectionController;
let activeAnalyticsRequest = 0;
let renderTaskToken = 0;
const scheduleDeferredRender = createDeferredRenderScheduler({ getToken: () => renderTaskToken });
const analyticsPipeline = createAnalyticsPipeline();
const { computeAnalyticsWithWorker } = analyticsPipeline;
const rangeFiltersController = createRangeFiltersController({
  elements: {
    rangeSelect,
    customControls,
    customStartInput,
    customEndInput,
    customApplyButton,
    searchStartInput,
    searchEndInput,
  },
  deps: {
    getDatasetEntries,
    getDatasetLabel,
    setCurrentRange,
    setCustomRange,
    getCustomRange,
    getCachedAnalytics,
    setCachedAnalytics,
    setDatasetAnalytics,
    renderDashboard,
    computeAnalyticsWithWorker,
    updateStatus,
    formatNumber,
    formatDisplayDate,
    getTimestamp,
    toISODate,
    onRangeApplied: syncHeroPillsWithRange,
    nextAnalyticsRequestToken: () => {
      activeAnalyticsRequest += 1;
      return activeAnalyticsRequest;
    },
    isAnalyticsRequestCurrent: token => token === activeAnalyticsRequest,
  },
});
const {
  normalizeRangeValue,
  filterEntriesByRange,
  describeRange,
  showCustomControls,
  updateCustomRangeBounds,
  applyRangeAndRender,
  handleRangeChange,
  applyCustomRange,
} = rangeFiltersController;

const sectionNavInner = document.querySelector(".section-nav-inner");
const timeOfDayWeekdayToggle = domCache.getById("timeofday-toggle-weekdays");
const timeOfDayWeekendToggle = domCache.getById("timeofday-toggle-weekends");
const timeOfDayHourStartInput = domCache.getById("timeofday-hour-start");
const timeOfDayHourEndInput = domCache.getById("timeofday-hour-end");
const timeOfDayHourStartLabel = domCache.getById("timeofday-hour-start-label");
const timeOfDayHourEndLabel = domCache.getById("timeofday-hour-end-label");
const timeOfDaySparklineEl = domCache.getById("timeofday-sparkline");
const timeOfDayBandsEl = domCache.getById("timeofday-bands");
const timeOfDayCalloutsEl = domCache.getById("timeofday-callouts");
const timeOfDayChartContainer = domCache.getById("timeofday-chart");
const pollsNote = domCache.getById("polls-note");
const pollsTotalEl = domCache.getById("polls-total");
const pollsCreatorsEl = domCache.getById("polls-creators");
const pollsListEl = domCache.getById("polls-list");
const dashboardRoot = document.querySelector("main");

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
    progressEl: searchProgressEl,
    progressTrackEl: searchProgressTrack,
    progressBarEl: searchProgressBar,
    progressLabelEl: searchProgressLabel,
  },
  options: { resultLimit: SEARCH_RESULT_LIMIT },
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
const {
  generateMarkdownReportAsync,
  generateSlidesHtmlAsync,
  generatePdfDocumentHtmlAsync,
} = createExportPipeline({
  getDatasetLabel,
  getExportFilterSummary,
  brandName: BRAND_NAME,
});
const themeUiController = createThemeUiController({
  themeToggleInputs: Array.from(document.querySelectorAll('input[name="theme-option"]')),
  mediaQuery: window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null,
  exportThemeStyles: EXPORT_THEME_STYLES,
});
const { initThemeControls, getExportThemeConfig } = themeUiController;

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
  generateMarkdownReport: generateMarkdownReportAsync,
  generateSlidesHtml: generateSlidesHtmlAsync,
  getExportThemeConfig,
  getDatasetFingerprint,
});
const pdfPreviewController = createPdfPreviewController({
  getDatasetAnalytics,
  getExportThemeConfig,
  generatePdfDocumentHtmlAsync,
  updateStatus,
});
const { handleDownloadPdfReport } = pdfPreviewController;

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
    logDrawerEl,
    logDrawerList,
    logDrawerConnectionLabel,
    relayClearStorageButton,
    relaySyncProgressEl,
    relaySyncChatsMeta,
    relaySyncMessagesMeta,
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
const COMPACT_STORAGE_KEY = "waan-compact-mode";
const REDUCE_MOTION_STORAGE_KEY = "waan-reduce-motion";
const HIGH_CONTRAST_STORAGE_KEY = "waan-high-contrast";
const statusUiController = createStatusUiController({
  statusEl,
  toastContainer,
  autoHideDelayMs: STATUS_AUTO_HIDE_DELAY_MS,
  exitDurationMs: STATUS_EXIT_DURATION_MS,
});
const {
  showToast,
  showStatusMessage,
} = statusUiController;
const sectionNavController = createSectionNavController({
  containerEl: sectionNavInner,
  navItemsConfig: SECTION_NAV_ITEMS,
});
const { buildSectionNav, setupSectionNavTracking } = sectionNavController;

const { apply: applyCompactMode, init: initCompactMode } = createCompactModeManager({
  toggle: compactToggleButton,
  storageKey: COMPACT_STORAGE_KEY,
  showToast,
});

const accessibilityController = createAccessibilityController({
  reduceMotionToggle,
  highContrastToggle,
  motionPreferenceQuery,
  initialReduceMotionPreferred,
  showToast,
  reduceMotionStorageKey: REDUCE_MOTION_STORAGE_KEY,
  highContrastStorageKey: HIGH_CONTRAST_STORAGE_KEY,
});
const { initAccessibilityControls, prefersReducedMotion } = accessibilityController;

const onboardingController = createOnboardingController({
  overlayEl: onboardingOverlay,
  copyEl: onboardingCopyEl,
  stepLabelEl: onboardingStepLabel,
  nextButtonEl: onboardingNextButton,
  steps: ONBOARDING_STEPS,
});

function setDashboardLoadingState(isLoading) {
  if (!dashboardRoot) return;
  dashboardRoot.classList.toggle("is-loading", Boolean(isLoading));
}

function setDataAvailabilityState(hasData) {
  dataAvailable = Boolean(hasData);
  datasetEmptyStateManager.setAvailability(dataAvailable);
  if (!dataAvailable) {
    setDatasetEmptyMessage(
      "No chat is selected yet.",
      "Start the relay desktop app, press Connect, scan the QR code, then choose a mirrored chat from “Loaded chats”.",
    );
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

function syncHeroPillsWithRange() { }

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

async function handleChatSelectionChange(event) {
  return handleChatSelectionChangeCore(event, {
    getChatDatasetById,
    applyEntriesToApp,
    loadRemoteChat,
    updateStatus,
  });
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
  onboardingSkipButton?.addEventListener("click", onboardingController.skip);
  onboardingNextButton?.addEventListener("click", onboardingController.advance);
  setTimeout(() => onboardingController.start(), 500);
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
  refreshChatSelector();
  updateStatus(`Start ${RELAY_SERVICE_NAME} to mirror chat app chats here.`, "info");
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
  if (event.key === "Escape" && onboardingController.isOpen()) {
    event.preventDefault();
    onboardingController.skip();
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
  let participantDirectory = null;
  if (options.participantDirectoryData) {
    participantDirectory = deserializeParticipantDirectory(options.participantDirectoryData);
  }
  if (!participantDirectory) {
    participantDirectory = createParticipantDirectory(entries, options.participants || []);
  }
  const directorySnapshot = serializeParticipantDirectory(participantDirectory);
  const shouldNormalize = !options.entriesNormalized;
  const normalizedEntries = shouldNormalize
    ? normalizeEntriesWithDirectory(entries, participantDirectory)
    : entries.map(entry => ({
        ...entry,
        search_text:
          entry.search_text ?? (typeof entry.message === "string" ? entry.message.toLowerCase() : ""),
      }));
  const fingerprint = computeDatasetFingerprint(normalizedEntries);
  setDatasetEntries(normalizedEntries);
  setDatasetFingerprint(fingerprint);
  setDatasetParticipantDirectory(directorySnapshot);
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
      fingerprint,
      participantDirectory: directorySnapshot,
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

    const labelRow = document.createElement("div");
    labelRow.className = "highlight-label-row";
    const label = document.createElement("span");
    label.className = "highlight-label";
    label.textContent = highlight.label || "Highlight";
    labelRow.appendChild(label);
    if (highlight.tooltip) {
      const tooltipButton = document.createElement("button");
      tooltipButton.type = "button";
      tooltipButton.className = "info-note-button info-note-inline";
      tooltipButton.setAttribute("aria-label", highlight.tooltip);
      tooltipButton.setAttribute("title", highlight.tooltip);
      tooltipButton.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 17h2v-6h-2v6zm0-8h2V7h-2v2zm1-7C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>';
      labelRow.appendChild(tooltipButton);
    }
    card.appendChild(labelRow);

    if (highlight.headline) {
      const headline = document.createElement("p");
      headline.className = "highlight-headline";
      headline.textContent = highlight.headline;
      card.appendChild(headline);
    }

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

    if (highlight.meta) {
      const meta = document.createElement("span");
      meta.className = "highlight-meta";
      meta.textContent = highlight.meta;
      card.appendChild(meta);
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
