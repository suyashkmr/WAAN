import { renderActionButton, renderSelectInput } from "./primevueRenderPrimitives.js";

export function createParticipantControlsRoot(h, participantsState, dispatchPanelAction, globalScope = globalThis) {
  const topOptions = [
    { value: "5", label: "5" },
    { value: "10", label: "10" },
    { value: "25", label: "25" },
    { value: "50", label: "50" },
    { value: "0", label: "All" },
  ];
  const sortOptions = [
    { value: "most", label: "Most active" },
    { value: "quiet", label: "Quietest" },
  ];
  const timeframeOptions = [
    { value: "all", label: "All time" },
    { value: "week", label: "Last 7 days" },
  ];

  return {
    name: "WaanParticipantControlsRoot",
    setup() {
      return () => [
        h("label", { class: "control-group", for: "participants-top-count" }, [
          h("span", null, "Show Top"),
          renderSelectInput(h, {
            id: "participants-top-count",
            forceNative: true,
            value: participantsState.filters.topCount,
            options: topOptions,
            onChange: event => {
              const nextValue = String(event?.target?.value || "25");
              participantsState.filters.topCount = nextValue;
              dispatchPanelAction("participants:set-top-count", { value: nextValue });
            },
          }, globalScope),
        ]),
        h("label", { class: "control-group", for: "participants-sort" }, [
          h("span", null, "Sort"),
          renderSelectInput(h, {
            id: "participants-sort",
            forceNative: true,
            value: participantsState.filters.sortMode,
            options: sortOptions,
            onChange: event => {
              const nextValue = String(event?.target?.value || "most");
              participantsState.filters.sortMode = nextValue;
              dispatchPanelAction("participants:set-sort-mode", { value: nextValue });
            },
          }, globalScope),
        ]),
        h("label", { class: "control-group", for: "participants-timeframe" }, [
          h("span", null, "Timeframe"),
          renderSelectInput(h, {
            id: "participants-timeframe",
            forceNative: true,
            value: participantsState.filters.timeframe,
            options: timeframeOptions,
            onChange: event => {
              const nextValue = String(event?.target?.value || "all");
              participantsState.filters.timeframe = nextValue;
              dispatchPanelAction("participants:set-timeframe", { value: nextValue });
            },
          }, globalScope),
        ]),
      ];
    },
  };
}

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
