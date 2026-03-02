// @ts-check

import { renderSummaryCards as renderSummarySection } from "../analytics/summary.js";
import { renderTimeOfDayPanel } from "../analytics/activity.js";
import { renderSentimentSection } from "../analytics/sentiment.js";
import { renderMessageTypesSection } from "../analytics/messageTypes.js";
import { renderPollsSection } from "../analytics/polls.js";
import { createDeferredRenderScheduler } from "../ui.js";
import { createActivityPanelsController } from "./dashboardRender/activityPanels.js";
import {
  createParticipantsPanelController,
  applyParticipantTopChange,
  applyParticipantSortChange,
  applyParticipantTimeframeChange,
  applyParticipantPreset,
  toggleParticipantRow,
} from "./dashboardRender/participantsPanel.js";
import { createHighlightsStatsController } from "./dashboardRender/highlightsStats.js";
import { logPerfDuration, measurePerfSync } from "../perf.js";

/**
 * @typedef {Record<string, any>} AnyRecord
 */

/**
 * @param {{ elements: AnyRecord, deps: AnyRecord }} params
 */
export function createDashboardRenderController({ elements, deps }) {
  const {
    summaryEl,
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
    timeOfDayChartContainer,
    timeOfDaySparklineEl,
    timeOfDayBandsEl,
    timeOfDayCalloutsEl,
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
    subscribeAppShellUiState,
    formatNumber,
    formatFloat,
    sanitizeText,
  } = deps;

  const participantsPanelController = createParticipantsPanelController({
    elements,
    deps: {
      getDatasetEntries,
      participantFilters,
      setParticipantView,
    },
  });
  const { renderParticipants } = participantsPanelController;

  const activityPanelsController = createActivityPanelsController({
    elements,
    deps: {
      getCustomRange,
      getDatasetAnalytics,
      getHourlyState,
      updateHourlyState,
      getWeekdayState,
      updateWeekdayState,
      applyCustomRange,
      subscribeAppShellUiState,
      formatNumber,
      formatFloat,
    },
  });
  const {
    renderHourlyPanel,
    renderDailyPanel,
    renderWeeklyPanel,
    renderWeekdayPanel,
    ensureWeekdayDayFilters,
    ensureWeekdayHourFilters,
    syncWeekdayControlsWithState,
    rerenderHourlyFromState,
    rerenderWeekdayFromState,
    ensureDayFilters,
    ensureHourFilters,
    syncHourlyControlsWithState,
  } = activityPanelsController;

  const highlightsStatsController = createHighlightsStatsController(
    /** @type {any} */ ({
      elements,
      deps: {
        sanitizeText,
        formatNumber,
        formatFloat,
      },
    }),
  );
  const { renderHighlights, renderStatistics, formatSentimentScore } = highlightsStatsController;

  let renderTaskToken = 0;
  const scheduleDeferredRender = createDeferredRenderScheduler({ getToken: () => renderTaskToken });

  /**
   * @param {string} label
   * @param {() => void} task
   * @param {AnyRecord | null} [details]
   */
  function measureRenderStep(label, task, details = null) {
    measurePerfSync(`dashboard.${label}`, task, /** @type {any} */ (details));
  }

  /**
   * @param {string} label
   * @param {() => void} task
   * @param {number} token
   * @param {AnyRecord | null} [details]
   */
  function scheduleMeasuredDeferred(label, task, token, details = null) {
    scheduleDeferredRender(() => {
      measureRenderStep(label, task, details);
    }, token);
  }

  /**
   * @param {AnyRecord} analytics
   */
  function renderTimeOfDayPanelWithBridge(analytics) {
    /** @type {(typeof globalThis) & { __WAAN_VUE_DASHBOARD_PANELS_BRIDGE__?: { renderTimeOfDay?: (analytics: unknown) => boolean } }} */
    const globalScope = globalThis;
    const dashboardPanelsBridge = globalScope.__WAAN_VUE_DASHBOARD_PANELS_BRIDGE__ ?? null;
    if (dashboardPanelsBridge?.renderTimeOfDay) {
      const handledByVue = dashboardPanelsBridge.renderTimeOfDay(analytics);
      if (handledByVue) return;
    }
    renderTimeOfDayPanel(analytics, {
      container: timeOfDayChartContainer,
      sparklineEl: timeOfDaySparklineEl,
      bandsEl: timeOfDayBandsEl,
      calloutsEl: timeOfDayCalloutsEl,
    });
  }

  /**
   * @param {AnyRecord} analytics
   */
  function renderDashboard(analytics) {
    const label = getDatasetLabel();
    const currentToken = ++renderTaskToken;
    const renderStartedAt = globalThis.performance?.now?.() ?? Date.now();
    const totalMessages = Number(analytics?.total_messages) || 0;

    measureRenderStep("summary", () => {
      renderSummarySection({
        analytics,
        label,
        summaryEl,
      });
    }, { totalMessages });
    measureRenderStep("participants", () => renderParticipants(analytics), { totalMessages });
    measureRenderStep("hourly", () => renderHourlyPanel(analytics), { totalMessages });
    measureRenderStep("daily", () => renderDailyPanel(analytics), { totalMessages });
    scheduleMeasuredDeferred("weekly", () => renderWeeklyPanel(analytics), currentToken, { totalMessages });

    scheduleMeasuredDeferred(
      "sentiment",
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
      { totalMessages },
    );

    measureRenderStep("weekday", () => renderWeekdayPanel(analytics), { totalMessages });
    scheduleMeasuredDeferred(
      "time_of_day",
      () => renderTimeOfDayPanelWithBridge(analytics),
      currentToken,
      { totalMessages },
    );

    scheduleMeasuredDeferred(
      "message_types",
      () =>
        renderMessageTypesSection(/** @type {any} */ ({
          data: analytics.message_types ?? null,
          elements: {
            summaryEl: messageTypeSummaryEl,
            noteEl: messageTypeNoteEl,
          },
        })),
      currentToken,
      { totalMessages },
    );

    scheduleMeasuredDeferred(
      "polls",
      () =>
        renderPollsSection(/** @type {any} */ ({
          data: analytics.polls ?? null,
          elements: {
            listEl: pollsListEl,
            totalsEl: pollsTotalEl,
            creatorsEl: pollsCreatorsEl,
            noteEl: pollsNote,
          },
        })),
      currentToken,
      { totalMessages },
    );

    measureRenderStep("statistics", () => renderStatistics(analytics), { totalMessages });
    scheduleMeasuredDeferred("search_participants", () => searchPopulateParticipants(), currentToken, { totalMessages });
    scheduleMeasuredDeferred("search_results", () => searchRenderResults(), currentToken, { totalMessages });
    scheduleMeasuredDeferred("highlights", () => renderHighlights(analytics.highlights ?? []), currentToken, {
      totalMessages,
      highlightCount: Array.isArray(analytics?.highlights) ? analytics.highlights.length : 0,
    });
    setDataAvailabilityState(Boolean(analytics));
    const renderFinishedAt = globalThis.performance?.now?.() ?? Date.now();
    logPerfDuration("dashboard.total_render", renderFinishedAt - renderStartedAt, /** @type {any} */ ({ totalMessages }));
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

export {
  applyParticipantTopChange,
  applyParticipantSortChange,
  applyParticipantTimeframeChange,
  applyParticipantPreset,
  toggleParticipantRow,
};
