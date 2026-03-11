// @ts-check

import {
  applyParticipantPreset,
  applyParticipantSortChange,
  applyParticipantTimeframeChange,
  applyParticipantTopChange,
} from "./dashboardRender/participantsPanel.js";

/**
 * @param {{ start?: number|null|undefined, end?: number|null|undefined } | null | undefined} payload
 * @param {{ start: number, end: number }} fallbackBrush
 */
function normalizeBrushPayload(payload, fallbackBrush) {
  let start = Number(payload?.start ?? fallbackBrush.start);
  let end = Number(payload?.end ?? fallbackBrush.end);
  if (!Number.isFinite(start)) start = fallbackBrush.start;
  if (!Number.isFinite(end)) end = fallbackBrush.end;
  if (start > end) [start, end] = [end, start];
  return { start, end };
}

/**
 * @param {{
 *   dashboardPanelsBridge: any,
 *   participantFilters: Record<string, any>,
 *   rerenderParticipantsIfAvailable: () => void,
 *   getHourlyState: () => { filters: Record<string, boolean>, brush: { start: number, end: number } },
 *   updateHourlyState: (patch: any) => void,
 *   getWeekdayState: () => { filters: Record<string, boolean>, brush: { start: number, end: number } },
 *   updateWeekdayState: (patch: any) => void,
 *   ensureWeekdayDayFilters: () => void,
 *   ensureWeekdayHourFilters: () => void,
 *   syncWeekdayControlsWithState: () => void,
 *   rerenderWeekdayFromState: () => void,
 *   ensureDayFilters: () => void,
 *   ensureHourFilters: () => void,
 *   syncHourlyControlsWithState: () => void,
 *   rerenderHourlyFromState: () => void,
 * }} params
 */
export function registerDashboardPanelActionHandlers({
  dashboardPanelsBridge,
  participantFilters,
  rerenderParticipantsIfAvailable,
  getHourlyState,
  updateHourlyState,
  getWeekdayState,
  updateWeekdayState,
  ensureWeekdayDayFilters,
  ensureWeekdayHourFilters,
  syncWeekdayControlsWithState,
  rerenderWeekdayFromState,
  ensureDayFilters,
  ensureHourFilters,
  syncHourlyControlsWithState,
  rerenderHourlyFromState,
}) {
  if (typeof dashboardPanelsBridge?.setPanelActionHandlers !== "function") return;
  dashboardPanelsBridge.setPanelActionHandlers({
    "participants:set-top-count": (
      /** @type {string} */ _actionId,
      /** @type {{ value?: string } | null | undefined} */ payload,
    ) => {
      applyParticipantTopChange(participantFilters, payload?.value);
      dashboardPanelsBridge?.syncParticipantControls?.(participantFilters);
      rerenderParticipantsIfAvailable();
    },
    "participants:set-sort-mode": (
      /** @type {string} */ _actionId,
      /** @type {{ value?: string } | null | undefined} */ payload,
    ) => {
      applyParticipantSortChange(participantFilters, payload?.value);
      dashboardPanelsBridge?.syncParticipantControls?.(participantFilters);
      rerenderParticipantsIfAvailable();
    },
    "participants:set-timeframe": (
      /** @type {string} */ _actionId,
      /** @type {{ value?: string } | null | undefined} */ payload,
    ) => {
      applyParticipantTimeframeChange(participantFilters, payload?.value);
      dashboardPanelsBridge?.syncParticipantControls?.(participantFilters);
      rerenderParticipantsIfAvailable();
    },
    "participants:apply-preset": (
      /** @type {string} */ _actionId,
      /** @type {{ preset?: string } | null | undefined} */ payload,
    ) => {
      applyParticipantPreset(participantFilters, payload?.preset, {
        participantsTopSelect: null,
        participantsSortSelect: null,
        participantsTimeframeSelect: null,
        syncParticipantControls: nextState =>
          Boolean(dashboardPanelsBridge?.syncParticipantControls?.(nextState)),
      });
      rerenderParticipantsIfAvailable();
    },
    "hourly:set-day-filter": (
      /** @type {string} */ _actionId,
      /** @type {{ filterKey?: "weekdays"|"weekends", checked?: boolean } | null | undefined} */ payload,
    ) => {
      if (!payload?.filterKey) return;
      updateHourlyState({
        filters: {
          ...getHourlyState().filters,
          [payload.filterKey]: Boolean(payload.checked),
        },
      });
      ensureDayFilters();
      syncHourlyControlsWithState();
      rerenderHourlyFromState();
    },
    "hourly:set-hour-filter": (
      /** @type {string} */ _actionId,
      /** @type {{ filterKey?: "working"|"offhours", checked?: boolean } | null | undefined} */ payload,
    ) => {
      if (!payload?.filterKey) return;
      updateHourlyState({
        filters: {
          ...getHourlyState().filters,
          [payload.filterKey]: Boolean(payload.checked),
        },
      });
      ensureHourFilters();
      syncHourlyControlsWithState();
      rerenderHourlyFromState();
    },
    "hourly:set-brush": (
      /** @type {string} */ _actionId,
      /** @type {{ start?: number, end?: number } | null | undefined} */ payload,
    ) => {
      const brush = normalizeBrushPayload(payload, getHourlyState().brush);
      updateHourlyState({ brush });
      syncHourlyControlsWithState();
      rerenderHourlyFromState();
    },
    "weekday:set-day-filter": (
      /** @type {string} */ _actionId,
      /** @type {{ filterKey?: "weekdays"|"weekends", checked?: boolean } | null | undefined} */ payload,
    ) => {
      if (!payload?.filterKey) return;
      updateWeekdayState({ filters: { [payload.filterKey]: Boolean(payload.checked) } });
      ensureWeekdayDayFilters();
      syncWeekdayControlsWithState();
      rerenderWeekdayFromState();
    },
    "weekday:set-hour-filter": (
      /** @type {string} */ _actionId,
      /** @type {{ filterKey?: "working"|"offhours", checked?: boolean } | null | undefined} */ payload,
    ) => {
      if (!payload?.filterKey) return;
      updateWeekdayState({ filters: { [payload.filterKey]: Boolean(payload.checked) } });
      ensureWeekdayHourFilters();
      syncWeekdayControlsWithState();
      rerenderWeekdayFromState();
    },
    "weekday:set-brush": (
      /** @type {string} */ _actionId,
      /** @type {{ start?: number, end?: number } | null | undefined} */ payload,
    ) => {
      const brush = normalizeBrushPayload(payload, getWeekdayState().brush);
      updateWeekdayState({ brush });
      syncWeekdayControlsWithState();
      rerenderWeekdayFromState();
    },
    "timeofday:set-day-filter": (
      /** @type {string} */ _actionId,
      /** @type {{ filterKey?: "weekdays"|"weekends", checked?: boolean } | null | undefined} */ payload,
    ) => {
      if (!payload?.filterKey) return;
      updateHourlyState({
        filters: {
          ...getHourlyState().filters,
          [payload.filterKey]: Boolean(payload.checked),
        },
      });
      ensureDayFilters();
      syncHourlyControlsWithState();
      rerenderHourlyFromState();
    },
    "timeofday:set-brush": (
      /** @type {string} */ _actionId,
      /** @type {{ start?: number, end?: number } | null | undefined} */ payload,
    ) => {
      const brush = normalizeBrushPayload(payload, getHourlyState().brush);
      updateHourlyState({ brush });
      syncHourlyControlsWithState();
      rerenderHourlyFromState();
    },
  });
}
