function renderCheckboxControl(h, {
  id,
  label,
  checked,
  onChange,
}) {
  return h("label", { class: "segmented-option" }, [
    h("input", {
      type: "checkbox",
      id,
      checked: Boolean(checked),
      onChange,
    }),
    h("span", null, label),
  ]);
}

function renderBrushControl(h, {
  label,
  startId,
  endId,
  startValue,
  endValue,
  startLabel,
  endLabel,
  onStartInput,
  onEndInput,
}) {
  return h("div", { class: "brush-group" }, [
    h("label", { for: startId }, label),
    h("div", { class: "brush-inputs" }, [
      h("input", {
        type: "range",
        id: startId,
        min: "0",
        max: "23",
        value: String(startValue),
        onInput: onStartInput,
      }),
      h("input", {
        type: "range",
        id: endId,
        min: "0",
        max: "23",
        value: String(endValue),
        onInput: onEndInput,
      }),
    ]),
    h("div", { class: "brush-labels" }, [
      h("span", { id: `${startId}-label` }, startLabel),
      h("span", null, "–"),
      h("span", { id: `${endId}-label` }, endLabel),
    ]),
  ]);
}

export function createHourlyControlsRoot(h, controlsState, dispatchPanelAction) {
  return {
    name: "WaanHourlyControlsRoot",
    setup() {
      return () => [
        h("div", { class: "toggle-group" }, [
          h("span", { class: "toggle-label" }, "Days"),
          renderCheckboxControl(h, {
            id: "filter-weekdays",
            label: "Weekdays",
            checked: controlsState.filters.weekdays,
            onChange: event => {
              dispatchPanelAction("hourly:set-day-filter", {
                filterKey: "weekdays",
                checked: Boolean(event?.target?.checked),
              });
            },
          }),
          renderCheckboxControl(h, {
            id: "filter-weekends",
            label: "Weekends",
            checked: controlsState.filters.weekends,
            onChange: event => {
              dispatchPanelAction("hourly:set-day-filter", {
                filterKey: "weekends",
                checked: Boolean(event?.target?.checked),
              });
            },
          }),
        ]),
        h("div", { class: "toggle-group" }, [
          h("span", { class: "toggle-label" }, "Hours"),
          renderCheckboxControl(h, {
            id: "filter-working",
            label: "Working (09-17)",
            checked: controlsState.filters.working,
            onChange: event => {
              dispatchPanelAction("hourly:set-hour-filter", {
                filterKey: "working",
                checked: Boolean(event?.target?.checked),
              });
            },
          }),
          renderCheckboxControl(h, {
            id: "filter-offhours",
            label: "Off Hours",
            checked: controlsState.filters.offhours,
            onChange: event => {
              dispatchPanelAction("hourly:set-hour-filter", {
                filterKey: "offhours",
                checked: Boolean(event?.target?.checked),
              });
            },
          }),
        ]),
        renderBrushControl(h, {
          label: "Hour Range",
          startId: "hourly-brush-start",
          endId: "hourly-brush-end",
          startValue: controlsState.brush.start,
          endValue: controlsState.brush.end,
          startLabel: controlsState.labels.start,
          endLabel: controlsState.labels.end,
          onStartInput: event => {
            dispatchPanelAction("hourly:set-brush", {
              start: Number(event?.target?.value ?? controlsState.brush.start),
              end: controlsState.brush.end,
            });
          },
          onEndInput: event => {
            dispatchPanelAction("hourly:set-brush", {
              start: controlsState.brush.start,
              end: Number(event?.target?.value ?? controlsState.brush.end),
            });
          },
        }),
      ];
    },
  };
}

export function createWeekdayControlsRoot(h, controlsState, dispatchPanelAction) {
  return {
    name: "WaanWeekdayControlsRoot",
    setup() {
      return () => [
        h("div", { class: "toggle-group" }, [
          h("span", { class: "toggle-label" }, "Days"),
          renderCheckboxControl(h, {
            id: "weekday-toggle-weekdays",
            label: "Weekdays",
            checked: controlsState.filters.weekdays,
            onChange: event => {
              dispatchPanelAction("weekday:set-day-filter", {
                filterKey: "weekdays",
                checked: Boolean(event?.target?.checked),
              });
            },
          }),
          renderCheckboxControl(h, {
            id: "weekday-toggle-weekends",
            label: "Weekends",
            checked: controlsState.filters.weekends,
            onChange: event => {
              dispatchPanelAction("weekday:set-day-filter", {
                filterKey: "weekends",
                checked: Boolean(event?.target?.checked),
              });
            },
          }),
        ]),
        h("div", { class: "toggle-group" }, [
          h("span", { class: "toggle-label" }, "Hours"),
          renderCheckboxControl(h, {
            id: "weekday-toggle-working",
            label: "Work hours (09-17)",
            checked: controlsState.filters.working,
            onChange: event => {
              dispatchPanelAction("weekday:set-hour-filter", {
                filterKey: "working",
                checked: Boolean(event?.target?.checked),
              });
            },
          }),
          renderCheckboxControl(h, {
            id: "weekday-toggle-offhours",
            label: "Off hours",
            checked: controlsState.filters.offhours,
            onChange: event => {
              dispatchPanelAction("weekday:set-hour-filter", {
                filterKey: "offhours",
                checked: Boolean(event?.target?.checked),
              });
            },
          }),
        ]),
        renderBrushControl(h, {
          label: "Hour Range",
          startId: "weekday-hour-start",
          endId: "weekday-hour-end",
          startValue: controlsState.brush.start,
          endValue: controlsState.brush.end,
          startLabel: controlsState.labels.start,
          endLabel: controlsState.labels.end,
          onStartInput: event => {
            dispatchPanelAction("weekday:set-brush", {
              start: Number(event?.target?.value ?? controlsState.brush.start),
              end: controlsState.brush.end,
            });
          },
          onEndInput: event => {
            dispatchPanelAction("weekday:set-brush", {
              start: controlsState.brush.start,
              end: Number(event?.target?.value ?? controlsState.brush.end),
            });
          },
        }),
      ];
    },
  };
}

export function createTimeOfDayControlsRoot(h, controlsState, dispatchPanelAction) {
  return {
    name: "WaanTimeOfDayControlsRoot",
    setup() {
      return () => [
        h("div", { class: "toggle-group" }, [
          h("span", { class: "toggle-label" }, "Days to Include"),
          renderCheckboxControl(h, {
            id: "timeofday-toggle-weekdays",
            label: "Weekdays",
            checked: controlsState.filters.weekdays,
            onChange: event => {
              dispatchPanelAction("timeofday:set-day-filter", {
                filterKey: "weekdays",
                checked: Boolean(event?.target?.checked),
              });
            },
          }),
          renderCheckboxControl(h, {
            id: "timeofday-toggle-weekends",
            label: "Weekends",
            checked: controlsState.filters.weekends,
            onChange: event => {
              dispatchPanelAction("timeofday:set-day-filter", {
                filterKey: "weekends",
                checked: Boolean(event?.target?.checked),
              });
            },
          }),
        ]),
        renderBrushControl(h, {
          label: "Focus Hours",
          startId: "timeofday-hour-start",
          endId: "timeofday-hour-end",
          startValue: controlsState.brush.start,
          endValue: controlsState.brush.end,
          startLabel: controlsState.labels.start,
          endLabel: controlsState.labels.end,
          onStartInput: event => {
            dispatchPanelAction("timeofday:set-brush", {
              start: Number(event?.target?.value ?? controlsState.brush.start),
              end: controlsState.brush.end,
            });
          },
          onEndInput: event => {
            dispatchPanelAction("timeofday:set-brush", {
              start: controlsState.brush.start,
              end: Number(event?.target?.value ?? controlsState.brush.end),
            });
          },
        }),
      ];
    },
  };
}
