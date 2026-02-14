import { WEEKDAY_SHORT } from "../constants.js";
import {
  renderSummaryCards as renderSummarySection,
  renderParticipants as renderParticipantsSection,
} from "../analytics/summary.js";
import {
  renderTimeOfDayPanel,
  formatHourLabel,
  renderHourlyHeatmapSection,
  renderDailySection,
  renderWeeklySection,
  renderWeekdaySection,
} from "../analytics/activity.js";
import { renderSentimentSection } from "../analytics/sentiment.js";
import { renderMessageTypesSection } from "../analytics/messageTypes.js";
import { renderPollsSection } from "../analytics/polls.js";
import { createDeferredRenderScheduler } from "../ui.js";

export function createDashboardRenderController({ elements, deps }) {
  const {
    summaryEl,
    participantsBody,
    participantsNote,
    participantPresetButtons,
    hourlyChartEl,
    filterNoteEl,
    brushSummaryEl,
    hourlyAnomaliesEl,
    hourlyTopHourEl,
    dailyChartEl,
    dailyAvgDayEl,
    weeklyChartEl,
    weeklyCumulativeEl,
    weeklyRollingEl,
    weeklyAverageEl,
    weekdayChartEl,
    weekdayFilterNote,
    weekdayToggleWeekdays,
    weekdayToggleWeekends,
    weekdayToggleWorking,
    weekdayToggleOffhours,
    weekdayHourStartInput,
    weekdayHourEndInput,
    timeOfDayWeekdayToggle,
    timeOfDayWeekendToggle,
    timeOfDayHourStartInput,
    timeOfDayHourEndInput,
    timeOfDayHourStartLabel,
    timeOfDayHourEndLabel,
    timeOfDayChartContainer,
    timeOfDaySparklineEl,
    timeOfDayBandsEl,
    timeOfDayCalloutsEl,
    sentimentSummaryEl,
    sentimentTrendNote,
    sentimentDailyChart,
    sentimentPositiveList,
    sentimentNegativeList,
    messageTypeSummaryEl,
    messageTypeNoteEl,
    pollsListEl,
    pollsTotalEl,
    pollsCreatorsEl,
    pollsNote,
    highlightList,
    rangeSelect,
  } = elements;

  const {
    getDatasetLabel,
    getDatasetEntries,
    getDatasetAnalytics,
    getCustomRange,
    getHourlyState,
    updateHourlyState,
    getWeekdayState,
    updateWeekdayState,
    participantFilters,
    setParticipantView,
    setDataAvailabilityState,
    searchPopulateParticipants,
    searchRenderResults,
    applyCustomRange,
    formatNumber,
    formatFloat,
    sanitizeText,
  } = deps;

  let renderTaskToken = 0;
  let hourlyControlsInitialised = false;
  const scheduleDeferredRender = createDeferredRenderScheduler({ getToken: () => renderTaskToken });

  function formatSentimentScore(value, digits = 2) {
    if (!Number.isFinite(value)) return "-";
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
    scheduleDeferredRender(() => searchPopulateParticipants(), currentToken);
    scheduleDeferredRender(() => searchRenderResults(), currentToken);
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
        setParticipantView(Array.isArray(next) ? next : []);
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
      hourlyTopHourEl.textContent = "-";
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
      value.textContent = highlight.value || "-";
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
          const itemLabel = document.createElement("span");
          itemLabel.className = "item-label";
          itemLabel.textContent = item.label || "";
          li.appendChild(itemLabel);
          if (item.value) {
            const itemValue = document.createElement("span");
            itemValue.className = "item-value";
            itemValue.textContent = item.value;
            li.appendChild(itemValue);
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

  return {
    renderDashboard,
    renderParticipants,
    ensureWeekdayDayFilters,
    ensureWeekdayHourFilters,
    syncWeekdayControlsWithState,
    rerenderHourlyFromState,
    rerenderWeekdayFromState,
    ensureDayFilters,
    ensureHourFilters,
    syncHourlyControlsWithState,
  };
}

export function applyParticipantTopChange(participantFilters, value) {
  const numeric = Number(value ?? 0);
  participantFilters.topCount = Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

export function applyParticipantSortChange(participantFilters, value) {
  participantFilters.sortMode = value || "most";
}

export function applyParticipantTimeframeChange(participantFilters, value) {
  participantFilters.timeframe = value || "all";
}

export function applyParticipantPreset(participantFilters, preset, controls) {
  const { participantsTopSelect, participantsSortSelect, participantsTimeframeSelect } = controls;
  if (!preset) return;

  if (preset === "top-week") {
    if (participantsTopSelect) participantsTopSelect.value = "5";
    if (participantsSortSelect) participantsSortSelect.value = "most";
    if (participantsTimeframeSelect) participantsTimeframeSelect.value = "week";
    participantFilters.topCount = 5;
    participantFilters.sortMode = "most";
    participantFilters.timeframe = "week";
    return;
  }

  if (preset === "quiet") {
    if (participantsTopSelect) participantsTopSelect.value = "5";
    if (participantsSortSelect) participantsSortSelect.value = "quiet";
    if (participantsTimeframeSelect) participantsTimeframeSelect.value = "all";
    participantFilters.topCount = 5;
    participantFilters.sortMode = "quiet";
    participantFilters.timeframe = "all";
  }
}

export function toggleParticipantRow(event, participantsBody) {
  const toggle = event.target.closest(".participant-toggle");
  if (!toggle) return;
  event.preventDefault();
  const row = toggle.closest("tr");
  if (!row) return;
  const rowId = row.dataset.rowId;
  if (!rowId || !participantsBody) return;
  const detailRow = participantsBody.querySelector(`tr.participant-detail-row[data-row-id="${rowId}"]`);
  const isExpanded = toggle.getAttribute("aria-expanded") === "true";
  toggle.setAttribute("aria-expanded", String(!isExpanded));
  const icon = toggle.querySelector(".toggle-icon");
  if (icon) icon.textContent = !isExpanded ? "▾" : "▸";
  row.classList.toggle("expanded", !isExpanded);
  if (detailRow) {
    detailRow.classList.toggle("hidden", isExpanded);
  }
}

export { formatHourLabel };
