import { syncPrimeSelectBridge, syncPrimeSelectBridgeValue } from "./primeSelectBridge.js";

const PARTICIPANT_SELECT_CONFIGS = [
  {
    id: "participants-top-count",
    options: [
      { value: "5", label: "5" },
      { value: "10", label: "10" },
      { value: "25", label: "25" },
      { value: "50", label: "50" },
      { value: "0", label: "All" },
    ],
    getValue: filters => String(filters?.topCount ?? "25"),
    setState: (filters, value) => {
      filters.topCount = value;
    },
    actionId: "participants:set-top-count",
  },
  {
    id: "participants-sort",
    options: [
      { value: "most", label: "Most active" },
      { value: "quiet", label: "Quietest" },
    ],
    getValue: filters => String(filters?.sortMode ?? "most"),
    setState: (filters, value) => {
      filters.sortMode = value;
    },
    actionId: "participants:set-sort-mode",
  },
  {
    id: "participants-timeframe",
    options: [
      { value: "all", label: "All time" },
      { value: "week", label: "Last 7 days" },
    ],
    getValue: filters => String(filters?.timeframe ?? "all"),
    setState: (filters, value) => {
      filters.timeframe = value;
    },
    actionId: "participants:set-timeframe",
  },
];

function ensureNativeOptions(selectEl, options) {
  if (!selectEl) return;
  const existingSignature = Array.from(selectEl.options).map(option => `${option.value}:${option.textContent || ""}`).join("|");
  const nextSignature = options.map(option => `${option.value}:${option.label}`).join("|");
  if (existingSignature === nextSignature) return;
  selectEl.textContent = "";
  options.forEach(option => {
    const optionEl = selectEl.ownerDocument.createElement("option");
    optionEl.value = option.value;
    optionEl.textContent = option.label;
    selectEl.appendChild(optionEl);
  });
}

export function createDashboardParticipantControlBridge({
  doc,
  participantsState,
  dispatchPanelAction,
  vueRuntime,
  globalScope = globalThis,
}) {
  const configs = PARTICIPANT_SELECT_CONFIGS.map(config => ({
    ...config,
    selectEl: /** @type {HTMLSelectElement | null} */ (doc.getElementById(config.id)),
  }));

  function bindFallbackListener(selectEl, actionId, setState) {
    if (!selectEl || selectEl.dataset.vueParticipantsBridgeBound === "true") return;
    selectEl.addEventListener("change", () => {
      const nextValue = String(selectEl.value || "");
      setState(participantsState.filters, nextValue);
      dispatchPanelAction(actionId, { value: nextValue });
    });
    selectEl.dataset.vueParticipantsBridgeBound = "true";
  }

  function sync(filters = participantsState.filters) {
    configs.forEach(({ selectEl, options, getValue, actionId, setState }) => {
      if (!selectEl) return;
      ensureNativeOptions(selectEl, options);
      const nextValue = getValue(filters);
      selectEl.value = nextValue;
      if (selectEl.value !== nextValue) {
        selectEl.value = options[0]?.value ?? "";
      }
      const bridged = syncPrimeSelectBridge({
        selectEl,
        options,
        value: selectEl.value,
        disabled: false,
        preserveNativeId: true,
        visibleInputId: `${selectEl.id}--primevue`,
        mirrorNativeEvents: false,
        onValueChange: value => {
          setState(participantsState.filters, value);
          dispatchPanelAction(actionId, { value });
        },
        vueRuntime,
        globalScope,
      });
      if (bridged) {
        syncPrimeSelectBridgeValue({
          selectEl,
          value: selectEl.value,
          disabled: false,
        });
        return;
      }
      bindFallbackListener(selectEl, actionId, setState);
    });
  }

  return {
    sync,
  };
}
