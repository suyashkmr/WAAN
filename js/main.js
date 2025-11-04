import {
  parseChatText,
  computeAnalytics,
  getTimestamp,
} from "./analytics.js";
import {
  formatNumber,
  formatFloat,
  sanitizeText,
  toISODate,
  formatDisplayDate,
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

const statusEl = document.getElementById("data-status");
const summaryEl = document.getElementById("summary");
const participantsBody = document.querySelector("#top-senders tbody");
const participantsNote = document.getElementById("participants-note");
const participantsTopSelect = document.getElementById("participants-top-count");
const rangeSelect = document.getElementById("global-range");
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
const messageTypeNoteEl = document.getElementById("message-type-note");
const downloadPdfButton = document.getElementById("download-pdf");
const downloadTimeOfDayButton = document.getElementById("download-timeofday");
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
const highlightList = document.getElementById("highlight-list");
const shareSnapshotButton = document.getElementById("share-snapshot");
const downloadMarkdownButton = document.getElementById("download-markdown-report");
const downloadSlidesButton = document.getElementById("download-slides-report");
const sectionNavLinks = Array.from(document.querySelectorAll(".section-nav a"));
const timeOfDayWeekdayToggle = document.getElementById("timeofday-toggle-weekdays");
const timeOfDayWeekendToggle = document.getElementById("timeofday-toggle-weekends");
const timeOfDayHourStartInput = document.getElementById("timeofday-hour-start");
const timeOfDayHourEndInput = document.getElementById("timeofday-hour-end");
const timeOfDayHourStartLabel = document.getElementById("timeofday-hour-start-label");
const timeOfDayHourEndLabel = document.getElementById("timeofday-hour-end-label");
const timeOfDaySparklineEl = document.getElementById("timeofday-sparkline");
const timeOfDayBandsEl = document.getElementById("timeofday-bands");
const timeOfDayCalloutsEl = document.getElementById("timeofday-callouts");

let hourlyControlsInitialised = false;
const participantFilters = {
  topCount: Number(participantsTopSelect?.value ?? 25) || 0,
};
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

let analyticsWorkerInstance = null;
let analyticsWorkerRequestId = 0;
const analyticsWorkerRequests = new Map();
let activeAnalyticsRequest = 0;
let snapshotMode = false;
let sectionNavObserver = null;
let activeSectionId = null;
let renderTaskToken = 0;

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

function setActiveSectionNav(targetId) {
  if (!targetId || activeSectionId === targetId) return;
  activeSectionId = targetId;
  sectionNavLinks.forEach(link => {
    const linkTarget = link.getAttribute("href")?.replace(/^#/, "");
    link.classList.toggle("active", linkTarget === targetId);
  });
}

function setupSectionNavTracking() {
  if (!sectionNavLinks.length || typeof window === "undefined" || !("IntersectionObserver" in window)) {
    return;
  }

  const navItems = [];

  sectionNavLinks.forEach(link => {
    const targetId = link.getAttribute("href")?.replace(/^#/, "");
    if (!targetId) return;
    const targetEl = document.getElementById(targetId);
    if (!targetEl) return;
    const item = { link, target: targetEl, id: targetId };
    navItems.push(item);

    link.addEventListener("click", () => {
      setActiveSectionNav(targetId);
    });
    link.addEventListener("focus", () => {
      setActiveSectionNav(targetId);
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
  statusEl.className = `status full-span ${tone}`;
  statusEl.textContent = message;
});

document.addEventListener("DOMContentLoaded", () => {
  attachEventHandlers();
  setupSectionNavTracking();
  Array.from(document.querySelectorAll(".card-toggle")).forEach(toggle => {
    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") === "true";
      const targetId = toggle.dataset.target;
      const content = targetId ? document.getElementById(targetId) : null;
      const card = toggle.closest(".card");
      toggle.setAttribute("aria-expanded", String(!expanded));
      if (content) content.style.display = expanded ? "none" : "";
      if (card) card.classList.toggle("collapsed", expanded);
    });
  });
  applySearchStateToForm();
  renderSearchResults();
  if (!tryLoadSnapshotFromHash()) {
    refreshSavedViewsUI();
    loadDefaultChat();
  }
});

function attachEventHandlers() {
  const fileInput = document.getElementById("chat-file");
  if (fileInput) {
    fileInput.addEventListener("change", handleFileUpload);
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

  const downloadParticipants = document.getElementById("download-participants");
  const downloadHourly = document.getElementById("download-hourly");
  const downloadDaily = document.getElementById("download-daily");
  const downloadWeekly = document.getElementById("download-weekly");
  const downloadWeekday = document.getElementById("download-weekday");
  const downloadMessageTypes = document.getElementById("download-message-types");
  const downloadSentiment = document.getElementById("download-sentiment");

  if (downloadParticipants) {
    downloadParticipants.addEventListener("click", exportParticipants);
  }
  if (downloadHourly) {
    downloadHourly.addEventListener("click", exportHourly);
  }
  if (downloadDaily) {
    downloadDaily.addEventListener("click", exportDaily);
  }
  if (downloadWeekly) {
    downloadWeekly.addEventListener("click", exportWeekly);
  }
  if (downloadWeekday) {
    downloadWeekday.addEventListener("click", exportWeekday);
  }
  if (downloadTimeOfDayButton) {
    downloadTimeOfDayButton.addEventListener("click", exportTimeOfDay);
  }
  if (downloadMessageTypes) {
    downloadMessageTypes.addEventListener("click", exportMessageTypes);
  }
  if (downloadSentiment) {
    downloadSentiment.addEventListener("click", exportSentiment);
  }
  if (downloadMarkdownButton) {
    downloadMarkdownButton.addEventListener("click", handleDownloadMarkdownReport);
  }
  if (downloadSlidesButton) {
    downloadSlidesButton.addEventListener("click", handleDownloadSlidesReport);
  }
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
    downloadPdfButton.addEventListener("click", () => {
      window.print();
    });
  }
  if (shareSnapshotButton) {
    shareSnapshotButton.disabled = true;
    shareSnapshotButton.addEventListener("click", handleShareSnapshot);
  }

  if (participantsTopSelect) {
    participantsTopSelect.addEventListener("change", handleParticipantsTopChange);
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

async function loadDefaultChat() {
  try {
    updateStatus("Loading the sample chat…", "info");
    const response = await fetch("chat.json");
    if (!response.ok) {
      updateStatus("We couldn't find the sample chat. Upload your chat file to begin.", "warning");
      return;
    }
    const text = await response.text();
    await processChatText(text, "sample chat");
  } catch (error) {
    console.error(error);
    updateStatus("We couldn't open the sample chat. Please upload your chat file.", "error");
  }
}

async function handleFileUpload(event) {
  if (snapshotMode) {
    updateStatus("Uploads are turned off while you're viewing a shared link.", "warning");
    return;
  }
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.name.toLowerCase().endsWith(".txt")) {
    updateStatus("That file type isn't supported. Please upload the WhatsApp .txt export.", "error");
    event.target.value = "";
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    updateStatus("This file is over 10MB. Please split the export and try again.", "warning");
    event.target.value = "";
    return;
  }

  updateStatus(`Reading ${file.name}…`, "info");
  try {
    const text = await file.text();
    await processChatText(text, file.name);
  } catch (error) {
    console.error(error);
    updateStatus("We couldn't read that file.", "error");
  } finally {
    event.target.value = "";
  }
}

async function processChatText(rawText, label) {
  try {
    const entries = parseChatText(rawText);
    if (!entries.length) {
      updateStatus("We couldn't find any messages in that file.", "warning");
      return;
    }

    setDatasetEntries(entries);
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
    const analytics = await computeAnalyticsWithWorker(entries);
    if (requestToken !== activeAnalyticsRequest) return;
    setCachedAnalytics("all", analytics);
    setDatasetAnalytics(analytics);
    renderDashboard(analytics);
    updateCustomRangeBounds();

    updateStatus(
      `Loaded ${formatNumber(entries.length)} chat lines from ${label}. Showing the full message history (${formatNumber(analytics.total_messages)} messages).`,
      "info",
    );
  } catch (error) {
    console.error(error);
    updateStatus("We couldn't process that chat file.", "error");
  }
}

function handleParticipantsTopChange() {
  const value = Number(participantsTopSelect?.value ?? 0);
  participantFilters.topCount = Number.isFinite(value) && value > 0 ? value : 0;
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
  renderStatistics(analytics);
  scheduleDeferredRender(populateSearchParticipants, currentToken);
  scheduleDeferredRender(renderSearchResults, currentToken);
  scheduleDeferredRender(() => renderHighlights(analytics.highlights ?? []), currentToken);
  if (shareSnapshotButton) {
    shareSnapshotButton.disabled = snapshotMode || !analytics;
  }
}

function renderSummaryCards(analytics, label) {
  if (!summaryEl) return;
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
      value: analytics.date_range.start && analytics.date_range.end
        ? `${formatDisplayDate(analytics.date_range.start)} → ${formatDisplayDate(analytics.date_range.end)}`
        : "—",
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

function renderParticipants(analytics) {
  if (!participantsBody) return;
  participantsBody.innerHTML = "";
  participantView = [];
  if (participantsNote) {
    participantsNote.textContent = "Everyone listed by how many messages they have sent.";
  }

  if (!analytics || !analytics.top_senders.length) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = `
      <td colspan="5" class="empty-state">Upload a chat file to see participant details.</td>
    `;
    participantsBody.appendChild(emptyRow);
    return;
  }

  const baseList = analytics.top_senders.map((entry, index) => ({
    ...entry,
    id: `participant-${index}`,
  }));

  const limit = participantFilters.topCount;
  let visible = limit > 0 ? baseList.slice(0, limit) : baseList;

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
    return;
  }

  if (participantsNote) {
    const baseCount = analytics.top_senders.length;
    const showingCount = visible.length;
    const limitedView = participantFilters.topCount > 0 && baseCount > participantFilters.topCount;
    const baseText = limitedView
      ? `Showing top ${formatNumber(showingCount)} of ${formatNumber(baseCount)} participants`
      : `Showing all ${formatNumber(baseCount)} participants`;
    participantsNote.textContent = `${baseText}.`;
  }

  participantView = visible;

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
  sentimentDailyChart.classList.add("sentiment-chart");

  if (!dailyData || !dailyData.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No scored messages to show.";
    sentimentDailyChart.appendChild(empty);
    return;
  }

  const values = dailyData.map(item => Number(item.average) || 0);
  let minVal = Math.min(-1, ...values);
  let maxVal = Math.max(1, ...values);
  if (maxVal - minVal < 0.1) {
    const offset = 0.5;
    minVal = Math.min(minVal, -offset);
    maxVal = Math.max(maxVal, offset);
  }
  const range = Math.max(maxVal - minVal, 0.01);
  const height = 120;
  const segments = Math.max(dailyData.length - 1, 1);
  const width = segments || 1;

  const points = dailyData.map((item, index) => {
    const x = segments ? (index / segments) * width : width / 2;
    const y = height - ((Number(item.average) || 0) - minVal) / range * height;
    return { x, y, item };
  });

  const chartHeader = document.createElement("div");
  chartHeader.className = "sentiment-chart-header";
  const yAxisLabel = document.createElement("span");
  yAxisLabel.textContent = "Mood score (avg per day)";
  const baselineLabel = document.createElement("span");
  baselineLabel.className = "sentiment-baseline-label";
  baselineLabel.textContent = "Baseline 0 = neutral";
  chartHeader.append(yAxisLabel, baselineLabel);
  sentimentDailyChart.appendChild(chartHeader);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("sentiment-sparkline");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("preserveAspectRatio", "none");

  const baselineY = height - ((0 - minVal) / range) * height;
  const baseline = document.createElementNS("http://www.w3.org/2000/svg", "line");
  baseline.setAttribute("x1", "0");
  baseline.setAttribute("y1", baselineY);
  baseline.setAttribute("x2", width);
  baseline.setAttribute("y2", baselineY);
  baseline.classList.add("sentiment-baseline");

  const areaPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const startX = points[0].x;
  const endX = points[points.length - 1].x;
  let areaD = `M ${startX} ${baselineY}`;
  points.forEach(pt => {
    areaD += ` L ${pt.x} ${pt.y}`;
  });
  areaD += ` L ${endX} ${baselineY} Z`;
  areaPath.setAttribute("d", areaD);
  areaPath.classList.add("sentiment-area");

  const linePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const lineD = points
    .map((pt, idx) => `${idx === 0 ? "M" : "L"} ${pt.x} ${pt.y}`)
    .join(" ");
  linePath.setAttribute("d", lineD);
  linePath.classList.add("sentiment-line");

  const nodes = document.createElementNS("http://www.w3.org/2000/svg", "g");
  nodes.classList.add("sentiment-nodes");
  points.forEach(pt => {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", pt.x);
    circle.setAttribute("cy", pt.y);
    circle.setAttribute("r", segments ? 0.8 : 1.2);
    circle.classList.add("sentiment-node");
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = `${formatDisplayDate(pt.item.date)} · ${formatSentimentScore(
      pt.item.average,
      2,
    )} · ${formatNumber(pt.item.count)} msgs`;
    circle.appendChild(title);
    nodes.appendChild(circle);
  });

  svg.append(areaPath, baseline, linePath, nodes);
  sentimentDailyChart.appendChild(svg);

  const axisRow = document.createElement("div");
  axisRow.className = "sentiment-axis";
  const axisStart = formatDisplayDate(dailyData[0].date);
  const axisEnd = formatDisplayDate(dailyData[dailyData.length - 1].date);
  axisRow.innerHTML = `<span>${axisStart}</span><span>Date</span><span>${axisEnd}</span>`;

  const legend = document.createElement("div");
  legend.className = "sentiment-legend";
  legend.innerHTML = `
    <span><span class="legend-swatch legend-swatch-line"></span>Average score</span>
    <span><span class="legend-swatch legend-swatch-area"></span>Area fill</span>
    <span><span class="legend-swatch legend-swatch-baseline"></span>Baseline 0</span>
  `;

  const chartFooter = document.createElement("div");
  chartFooter.className = "sentiment-chart-footer";
  chartFooter.append(axisRow, legend);
  sentimentDailyChart.appendChild(chartFooter);
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

  if (snapshotMode) {
    if (savedViewNameInput) savedViewNameInput.disabled = true;
    if (savedViewList) savedViewList.disabled = true;
    if (applySavedViewButton) applySavedViewButton.disabled = true;
    if (deleteSavedViewButton) deleteSavedViewButton.disabled = true;
    if (compareViewASelect) compareViewASelect.disabled = true;
    if (compareViewBSelect) compareViewBSelect.disabled = true;
    if (compareViewsButton) compareViewsButton.disabled = true;
  } else {
    if (savedViewNameInput) savedViewNameInput.disabled = false;
    if (savedViewList) savedViewList.disabled = false;
    if (applySavedViewButton) applySavedViewButton.disabled = false;
    if (deleteSavedViewButton) deleteSavedViewButton.disabled = false;
    if (compareViewASelect) compareViewASelect.disabled = false;
    if (compareViewBSelect) compareViewBSelect.disabled = false;
    if (compareViewsButton) compareViewsButton.disabled = false;
  }
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
      ${renderColumn("Setup A", primaryView, primarySnapshot)}
      ${renderColumn("Setup B", secondaryView, secondarySnapshot)}
      ${renderDiffColumn(metrics, primarySnapshot, secondarySnapshot)}
    </div>
  `;
}

function handleSaveView() {
  if (snapshotMode) {
    updateStatus("Saved setups aren't available in shared link view.", "warning");
    return;
  }
  const entries = getDatasetEntries();
  if (!entries.length) {
    updateStatus("Load a chat file before saving a setup.", "warning");
    return;
  }
  const rawName = savedViewNameInput?.value.trim();
  const fallbackName = `Setup ${getSavedViews().length + 1}`;
  const name = rawName || fallbackName;
  const view = captureCurrentView(name);
  if (!view) {
    updateStatus("Couldn't save the current setup. Try again after the data loads.", "error");
    return;
  }
  const record = addSavedView(view);
  refreshSavedViewsUI();
  if (savedViewList) savedViewList.value = record.id;
  if (savedViewNameInput) savedViewNameInput.value = "";
  updateStatus(`Saved setup "${name}".`, "success");
}

async function handleApplySavedView() {
  if (snapshotMode) {
    updateStatus("Saved setups aren't available in shared link view.", "warning");
    return;
  }
  const id = savedViewList?.value;
  if (!id) {
    updateStatus("Choose a saved setup to use.", "warning");
    return;
  }
  const view = getSavedViewById(id);
  if (!view) {
    updateStatus("That saved setup is missing.", "error");
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
  updateStatus(`Applied saved setup "${view.name}".`, "success");
}

function handleDeleteSavedView() {
  if (snapshotMode) {
    updateStatus("Saved setups aren't available in shared link view.", "warning");
    return;
  }
  const id = savedViewList?.value;
  if (!id) {
    updateStatus("Choose a saved setup to remove.", "warning");
    return;
  }
  const removed = removeSavedView(id);
  if (!removed) {
    updateStatus("Couldn't remove that saved setup.", "error");
    return;
  }
  refreshSavedViewsUI();
  renderComparisonSummary();
  if (savedViewList) savedViewList.value = "";
  updateStatus("Saved setup removed.", "success");
}

function handleCompareViews() {
  if (snapshotMode) {
    updateStatus("Comparisons aren't available in shared link view.", "warning");
    return;
  }
  const primaryId = compareViewASelect?.value;
  const secondaryId = compareViewBSelect?.value;
  if (!primaryId || !secondaryId) {
    updateStatus("Pick two saved setups to compare.", "warning");
    return;
  }
  if (primaryId === secondaryId) {
    updateStatus("Pick two different setups to compare.", "warning");
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

  if (!query.text && !query.participant && !query.start && !query.end) {
    updateStatus("Add at least one filter before you search.", "warning");
    return;
  }

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
    analytics,
  };

  try {
    const encoded = encodeSnapshotPayload(snapshot);
    const baseUrl = window.location.href.split("#")[0];
    const shareUrl = `${baseUrl}#snapshot=${encoded}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: snapshot.label || "Chat summary",
          text: "WhatsApp chat summary",
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
    if (results.length < SEARCH_RESULT_LIMIT) {
      results.push({
        sender,
        message,
        timestamp: timestamp ? timestamp.toISOString() : null,
      });
    }
  });

  setSearchResults(results, totalMatches);
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

  const hasFilters = Boolean(query.text || query.participant || query.start || query.end);

  if (!hasFilters) {
    searchResultsSummary.textContent = "Add filters to search messages.";
  } else if (!total) {
    searchResultsSummary.textContent = "No messages matched these filters. Try different options.";
  } else if (total > results.length) {
    searchResultsSummary.textContent = `Showing ${formatNumber(results.length)} of ${formatNumber(total)} matches (limit ${SEARCH_RESULT_LIMIT} shown).`;
  } else {
    searchResultsSummary.textContent = `Showing ${formatNumber(results.length)} matching message${results.length === 1 ? "" : "s"}.`;
  }

  searchResultsList.innerHTML = "";

  if (!total) {
    const empty = document.createElement("div");
    empty.className = "search-results-empty";
    empty.textContent = hasFilters
      ? "No matching messages. Try other names, words, or dates."
      : "Add filters above to search the chat history.";
    searchResultsList.appendChild(empty);
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

function formatTimestampDisplay(value) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${formatDisplayDate(date)} ${hours}:${minutes}`;
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

    highlightList.appendChild(card);
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildMarkdownReport(analytics) {
  const nowIso = new Date().toISOString();
  const title = getDatasetLabel() || "WhatsApp Chat";
  const range = analytics.date_range || {};
  const highlights = analytics.highlights || [];
  const topSenders = (analytics.top_senders || []).slice(0, 10);
  const messageTypeSummary = analytics.message_types?.summary || [];
  const systemSummary = analytics.system_summary || {};
  const weeklySummary = analytics.weekly_summary || {};

  const lines = [];
  lines.push(`# ${title} – Chat summary`);
  lines.push(`*Created ${nowIso}*`);
  lines.push("");
  lines.push("## Quick glance");
  lines.push(`- **Messages in total:** ${formatNumber(analytics.total_messages)}`);
  lines.push(`- **System notices:** ${formatNumber(systemSummary.count || 0)}`);
  lines.push(`- **People who spoke:** ${formatNumber(analytics.unique_senders)}`);
  if (range.start && range.end) {
    lines.push(`- **Covers:** ${formatDisplayDate(range.start)} → ${formatDisplayDate(range.end)}`);
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

function buildSlidesHtml(analytics) {
  const title = escapeHtml(getDatasetLabel() || "Chat summary");
  const generatedAt = escapeHtml(new Date().toLocaleString());
  const highlights = (analytics.highlights || []).slice(0, 6);
  const topSenders = (analytics.top_senders || []).slice(0, 6);
  const systemSummary = analytics.system_summary || {};
  const weeklySummary = analytics.weekly_summary || {};
  const dateRange = analytics.date_range || {};

  const highlightList = highlights.length
    ? highlights
        .map(item => `<li><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.value)}${item.descriptor ? ` — ${escapeHtml(item.descriptor)}` : ""}</li>`)
        .join("")
    : "<li>Highlights will show up once there's enough data.</li>";

  const participantList = topSenders.length
    ? topSenders
        .map(entry => `<li><strong>${escapeHtml(entry.sender)}</strong>: ${formatNumber(entry.count)} messages (${entry.share ? formatFloat(entry.share * 100, 1) + "%" : "—"})</li>`)
        .join("")
    : "<li>No participant activity recorded.</li>";

  const overviewItems = [
    `Messages in total: ${formatNumber(analytics.total_messages)}`,
    `People who spoke: ${formatNumber(analytics.unique_senders)}`,
    `System notices: ${formatNumber(systemSummary.count || 0)}`,
    dateRange.start && dateRange.end ? `Covers: ${escapeHtml(formatDisplayDate(dateRange.start))} → ${escapeHtml(formatDisplayDate(dateRange.end))}` : null,
  ]
    .filter(Boolean)
    .map(item => `<li>${item}</li>`)
    .join("");

  const paceItems = [
    `Average per day: ${formatFloat(analytics.hourly_summary?.averagePerDay ?? 0, 1)} messages`,
    `Average per week: ${formatFloat(weeklySummary.averagePerWeek ?? 0, 1)} messages`,
    `Busiest hour: ${
      analytics.hourly_summary?.topHour
        ? `${WEEKDAY_LONG[analytics.hourly_summary.topHour.dayIndex]} ${String(analytics.hourly_summary.topHour.hour).padStart(2, "0")}:00`
        : "—"
    }`,
  ]
    .map(item => `<li>${item}</li>`)
    .join("");

  const systemItems = [
    `People joined: ${formatNumber(systemSummary.joins || 0)}`,
    `Join requests: ${formatNumber(systemSummary.join_requests || 0)}`,
    `Added by admins: ${formatNumber(systemSummary.added || 0)}`,
    `Left on their own: ${formatNumber(systemSummary.left || 0)}`,
    `Removed by admins: ${formatNumber(systemSummary.removed || 0)}`,
    `Settings changes: ${formatNumber(systemSummary.changed || 0)}`,
  ]
    .map(item => `<li>${item}</li>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${title} – Slides</title>
  <style>
    body { margin:0; font-family: 'Segoe UI', Arial, sans-serif; background:#111827; color:#f9fafb; }
    .deck { display:flex; flex-direction:column; align-items:center; gap:3rem; padding:3rem 2rem; }
    .slide { background:#1f2937; border-radius:24px; box-shadow:0 30px 60px rgba(15,23,42,0.4); padding:2.5rem 3rem; width:960px; max-width:100%; }
    h1, h2 { margin-top:0; }
    h1 { font-size:2.4rem; margin-bottom:1rem; }
    h2 { font-size:1.8rem; margin-bottom:1.2rem; }
    ul { margin:0; padding-left:1.3rem; }
    li { margin-bottom:0.6rem; line-height:1.4; }
    .footer { font-size:0.85rem; opacity:0.7; margin-top:1.5rem; }
    .two-column { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:1.4rem; }
    .callout { background:rgba(148,163,184,0.16); padding:1rem; border-radius:16px; }
  </style>
</head>
<body>
  <div class="deck">
    <section class="slide">
      <h1>${title}</h1>
      <ul>${overviewItems}</ul>
      <div class="footer">Generated ${generatedAt}</div>
    </section>
    <section class="slide">
      <h2>Highlights</h2>
      <ul>${highlightList}</ul>
      <div class="two-column" style="margin-top:1.5rem;">
        <div class="callout">
          <h3>Chat pace</h3>
          <ul>${paceItems}</ul>
        </div>
        <div class="callout">
          <h3>Group activity</h3>
          <ul>${systemItems}</ul>
        </div>
      </div>
    </section>
    <section class="slide">
      <h2>Top voices</h2>
      <ul>${participantList}</ul>
      <div class="footer">Tip: copy this deck into PowerPoint or Google Slides to add charts or notes.</div>
    </section>
  </div>
</body>
</html>`;
}

function disableInteractiveControlsForSnapshot() {
  const fileInput = document.getElementById("chat-file");
  if (fileInput) fileInput.disabled = true;
  if (rangeSelect) rangeSelect.disabled = true;
  if (saveViewButton) saveViewButton.disabled = true;
  if (savedViewNameInput) savedViewNameInput.disabled = true;
  if (savedViewList) savedViewList.disabled = true;
  if (applySavedViewButton) applySavedViewButton.disabled = true;
  if (deleteSavedViewButton) deleteSavedViewButton.disabled = true;
  if (compareViewASelect) compareViewASelect.disabled = true;
  if (compareViewBSelect) compareViewBSelect.disabled = true;
  if (compareViewsButton) compareViewsButton.disabled = true;
  if (shareSnapshotButton) shareSnapshotButton.disabled = true;
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

function exportParticipants() {
  const analytics = getDatasetAnalytics();
  if (!analytics || !analytics.top_senders.length) {
    updateStatus("No participant data to export right now.", "warning");
    return;
  }
  if (!participantView.length) {
    updateStatus("No participants fit the current filters to export.", "warning");
    return;
  }
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
  downloadCSV(
    buildFilename("participants"),
    [
      "Rank",
      "Participant",
      "Messages",
      "Share (%)",
      "Avg Words",
      "Avg Characters",
      "Avg Sentiment",
      "Positive (%)",
      "Negative (%)",
    ],
    rows,
  );
}

function exportHourly() {
  const analytics = getDatasetAnalytics();
  if (!analytics || !analytics.hourly_distribution) {
    updateStatus("No hourly activity to export right now.", "warning");
    return;
  }
  const rows = analytics.hourly_distribution.map(entry => [
    `${String(entry.hour).padStart(2, "0")}:00`,
    entry.count,
  ]);
  downloadCSV(buildFilename("hourly"), ["Hour", "Messages"], rows);
}

function exportDaily() {
  const analytics = getDatasetAnalytics();
  if (!analytics || !analytics.daily_counts.length) {
    updateStatus("No daily activity to export right now.", "warning");
    return;
  }
  const rows = analytics.daily_counts.map(entry => [entry.date, entry.count]);
  downloadCSV(buildFilename("daily"), ["Date", "Messages"], rows);
}

function exportWeekly() {
  const analytics = getDatasetAnalytics();
  if (!analytics || !analytics.weekly_counts.length) {
    updateStatus("No weekly trends to export right now.", "warning");
    return;
  }
  const rows = analytics.weekly_counts.map(entry => [
    entry.week,
    entry.count,
    entry.cumulative,
  ]);
  downloadCSV(buildFilename("weekly"), ["Week", "Messages", "Cumulative"], rows);
}

function exportWeekday() {
  const analytics = getDatasetAnalytics();
  if (!analytics || !analytics.weekday_distribution.length) {
    updateStatus("No weekday data to export right now.", "warning");
    return;
  }
  const rows = analytics.weekday_distribution.map(entry => [
    entry.label,
    entry.count,
    entry.share ? formatFloat(entry.share * 100, 2) : "",
    entry.deviation ? formatFloat(entry.deviation, 2) : "",
  ]);
  downloadCSV(
    buildFilename("weekday"),
    ["Weekday", "Messages", "Share (%)", "Std Dev"],
    rows,
  );
}

function exportTimeOfDay() {
  const analytics = getDatasetAnalytics();
  const dataset = computeTimeOfDayDataset(analytics);
  if (!dataset || !dataset.points.length || !dataset.total) {
    updateStatus("No time-of-day data to export right now.", "warning");
    return;
  }
  const headers = ["Hour", "Messages", "Share (%)", "Weekday Messages", "Weekend Messages"];
  const rows = dataset.points.map(point => [
    formatHourLabel(point.hour),
    point.total,
    formatFloat(point.share * 100, 2),
    dataset.includeWeekdays ? point.weekday : "",
    dataset.includeWeekends ? point.weekend : "",
  ]);
  downloadCSV(buildFilename("time-of-day"), headers, rows);
}

function exportMessageTypes() {
  const analytics = getDatasetAnalytics();
  const data = analytics?.message_types;

  if (!data) {
    updateStatus("No message type data to export right now.", "warning");
    return;
  }

  const headers = ["Group", "Type", "Messages", "Share (%)"];
  const rows = [];

  (data.summary ?? []).forEach(entry => {
    rows.push([
      "Summary",
      entry.label,
      entry.count,
      formatFloat((entry.share || 0) * 100, 2),
    ]);
  });

  if (!rows.length) {
    updateStatus("No message type data to export right now.", "warning");
    return;
  }

  downloadCSV(buildFilename("message-types"), headers, rows);
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
  if (snapshotMode) {
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

function handleDownloadMarkdownReport() {
  const analytics = getDatasetAnalytics();
  if (!analytics) {
    updateStatus("Load the chat summary before exporting a report.", "warning");
    return;
  }
  const markdown = buildMarkdownReport(analytics);
  downloadTextFile(buildReportFilename("report", "md"), markdown, "text/markdown;charset=utf-8;");
  updateStatus("Saved the text report.", "success");
}

function handleDownloadSlidesReport() {
  const analytics = getDatasetAnalytics();
  if (!analytics) {
    updateStatus("Load the chat summary before exporting a report.", "warning");
    return;
  }
  const html = buildSlidesHtml(analytics);
  downloadTextFile(buildReportFilename("slides", "html"), html, "text/html;charset=utf-8;");
  updateStatus("Saved the slide deck.", "success");
}

function buildFilename(suffix) {
  const label = (getDatasetLabel() || "whatsapp-chat")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const range = describeRange(getCurrentRange());
  return `${label}_${range.replace(/[^a-z0-9]+/gi, "-")}_${suffix}.csv`;
}

function buildReportFilename(suffix, extension) {
  const label = (getDatasetLabel() || "whatsapp-chat")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const range = describeRange(getCurrentRange());
  const sanitizedRange = range.replace(/[^a-z0-9]+/gi, "-");
  return `${label}_${sanitizedRange}_${suffix}.${extension}`;
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
