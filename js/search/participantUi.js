import { syncPrimeSelectBridge } from "../vue/primeSelectBridge.js";

export function createSearchParticipantUiController({
  participantSelect,
  getEntries,
  getDatasetFingerprint,
  getSearchState,
  buildParticipantOptionsCacheKey,
  vueRuntime = null,
}) {
  let participantOptionsCacheKey = "";
  function populateParticipants() {
    if (!participantSelect) return;
    const entries = getEntries();
    const datasetFingerprint = getDatasetFingerprint() || "";
    const selectedStateValue = getSearchState()?.query.participant ?? "";
    const selectedUiValue = participantSelect.value || "";
    const nextCacheKey = buildParticipantOptionsCacheKey({
      datasetFingerprint,
      entriesLength: entries.length,
      selectedStateValue,
      selectedUiValue,
    });
    if (nextCacheKey === participantOptionsCacheKey) return;
    const senders = new Set();
    entries.forEach(entry => {
      if (entry.type === "message" && entry.sender) {
        senders.add(entry.sender);
      }
    });

    const selected = getSearchState()?.query.participant ?? "";
    const options = Array.from(senders).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    const previousValue = participantSelect.value;
    const optionModels = [
      { value: "", label: "All participants" },
      ...options.map(sender => ({ value: sender, label: sender })),
    ];
    if (selected && !options.includes(selected)) {
      optionModels.push({ value: selected, label: selected });
    }
    participantSelect.textContent = "";
    optionModels.forEach(option => {
      const optionEl = participantSelect.ownerDocument.createElement("option");
      optionEl.value = option.value;
      optionEl.textContent = option.label;
      participantSelect.appendChild(optionEl);
    });
    const targetValue = selected || previousValue || "";
    participantSelect.value = targetValue;
    if (participantSelect.value !== targetValue) {
      participantSelect.value = "";
    }
    const datasetEmpty = options.length === 0;
    participantSelect.disabled = datasetEmpty;
    syncPrimeSelectBridge({
      selectEl: participantSelect,
      options: optionModels,
      value: participantSelect.value,
      disabled: datasetEmpty,
      vueRuntime,
    });
    participantOptionsCacheKey = nextCacheKey;
  }

  function syncParticipantBridgeState() {
    if (!participantSelect) return false;
    return syncPrimeSelectBridge({
      selectEl: participantSelect,
      options: Array.from(participantSelect.options).map(option => ({
        value: option.value,
        label: option.textContent ?? option.value,
      })),
      value: participantSelect.value,
      disabled: participantSelect.disabled,
      vueRuntime,
    });
  }

  function resetParticipantOptionsCache() {
    participantOptionsCacheKey = "";
  }

  return {
    populateParticipants,
    resetParticipantOptionsCache,
    syncParticipantBridgeState,
  };
}
