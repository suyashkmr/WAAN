import { createRangeSearchSavedViewsWiring } from "./controllerWiring/rangeSearchSavedViews.js";
import { createDashboardDataStatusThemeWiring } from "./controllerWiring/dashboardDataStatusTheme.js";
import { createDashboardViewAdapter } from "./controllerWiring/dashboardViewAdapter.js";

export function createAppControllerWiring({
  dom,
  state,
  utils,
  constants,
  callbacks,
  dataStatus,
  documentRef = globalThis.document ?? null,
  windowRef = globalThis.window ?? null,
}) {
  let dashboardRenderController = null;
  const dashboardControllerApi = {
    setController(controller) {
      dashboardRenderController = controller;
    },
    renderDashboard(analytics) {
      dashboardRenderController?.renderDashboard(analytics);
    },
    renderParticipants(analytics) {
      dashboardRenderController?.renderParticipants(analytics);
    },
    ensureWeekdayDayFilters() {
      dashboardRenderController?.ensureWeekdayDayFilters();
    },
    ensureWeekdayHourFilters() {
      dashboardRenderController?.ensureWeekdayHourFilters();
    },
    syncWeekdayControlsWithState() {
      dashboardRenderController?.syncWeekdayControlsWithState();
    },
    rerenderHourlyFromState() {
      dashboardRenderController?.rerenderHourlyFromState();
    },
    rerenderWeekdayFromState() {
      dashboardRenderController?.rerenderWeekdayFromState();
    },
    ensureDayFilters() {
      dashboardRenderController?.ensureDayFilters();
    },
    ensureHourFilters() {
      dashboardRenderController?.ensureHourFilters();
    },
    syncHourlyControlsWithState() {
      dashboardRenderController?.syncHourlyControlsWithState();
    },
  };

  const rangeSearchSavedViewsWiring = createRangeSearchSavedViewsWiring({
    dom,
    state,
    utils,
    constants,
    callbacks,
    dashboardControllerApi,
  });

  const dashboardDataStatusThemeWiring = createDashboardDataStatusThemeWiring({
    dom,
    state,
    utils,
    dataStatus,
    searchController: rangeSearchSavedViewsWiring.searchController,
    savedViewsController: rangeSearchSavedViewsWiring.savedViewsController,
    rangeApi: {
      normalizeRangeValue: rangeSearchSavedViewsWiring.normalizeRangeValue,
      describeRange: rangeSearchSavedViewsWiring.describeRange,
      applyCustomRange: rangeSearchSavedViewsWiring.applyCustomRange,
    },
    dashboardControllerApi,
    viewAdapter: createDashboardViewAdapter({ documentRef, windowRef }),
  });

  return {
    ...rangeSearchSavedViewsWiring,
    ...dashboardDataStatusThemeWiring,
    renderDashboard: dashboardControllerApi.renderDashboard,
    ensureWeekdayDayFilters: dashboardControllerApi.ensureWeekdayDayFilters,
    ensureWeekdayHourFilters: dashboardControllerApi.ensureWeekdayHourFilters,
    rerenderHourlyFromState: dashboardControllerApi.rerenderHourlyFromState,
    rerenderWeekdayFromState: dashboardControllerApi.rerenderWeekdayFromState,
    ensureDayFilters: dashboardControllerApi.ensureDayFilters,
    syncHourlyControlsWithState: dashboardControllerApi.syncHourlyControlsWithState,
  };
}
