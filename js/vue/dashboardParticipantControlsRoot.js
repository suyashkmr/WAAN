import { renderActionButton } from "./primevueRenderPrimitives.js";

function isParticipantPresetActive(filters, preset) {
  if (preset === "top-week") {
    return filters.timeframe === "week" && filters.sortMode === "most" && filters.topCount === "5";
  }
  if (preset === "quiet") {
    return filters.timeframe === "all" && filters.sortMode === "quiet" && filters.topCount === "5";
  }
  return false;
}

export function createParticipantQuickFiltersRoot(h, participantsState, dispatchPanelAction, globalScope = globalThis) {
  return {
    name: "WaanParticipantQuickFiltersRoot",
    setup() {
      return () => [
        h("span", null, "Quick filters:"),
        renderActionButton(h, {
          type: "button",
          className: "ghost-button tiny",
          attrs: {
            "data-participants-preset": "top-week",
            "aria-pressed": String(isParticipantPresetActive(participantsState.filters, "top-week")),
          },
          onClick: () => dispatchPanelAction("participants:apply-preset", { preset: "top-week" }),
          text: "Top 5 this week",
        }, globalScope),
        renderActionButton(h, {
          type: "button",
          className: "ghost-button tiny",
          attrs: {
            "data-participants-preset": "quiet",
            "aria-pressed": String(isParticipantPresetActive(participantsState.filters, "quiet")),
          },
          onClick: () => dispatchPanelAction("participants:apply-preset", { preset: "quiet" }),
          text: "Quietest 5",
        }, globalScope),
      ];
    },
  };
}
