import { renderSummaryCards as renderSummarySection } from "../analytics/summary.js";
import { renderTimeOfDayPanel, formatHourLabel } from "../analytics/activity.js";
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

  const highlightsStatsController = createHighlightsStatsController({
    elements,
    deps: {
      sanitizeText,
      formatNumber,
      formatFloat,
    },
  });
  const { renderHighlights, renderStatistics, formatSentimentScore } = highlightsStatsController;

  let renderTaskToken = 0;
  const scheduleDeferredRender = createDeferredRenderScheduler({ getToken: () => renderTaskToken });

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
  formatHourLabel,
};
