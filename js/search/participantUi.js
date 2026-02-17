export function createSearchParticipantUiController({
  participantSelect,
  getEntries,
  getDatasetFingerprint,
  getSearchState,
  buildParticipantOptionsCacheKey,
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
    participantSelect.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "All participants";
    participantSelect.appendChild(placeholder);

    options.forEach(sender => {
      const option = document.createElement("option");
      option.value = sender;
      option.textContent = sender;
      participantSelect.appendChild(option);
    });

    if (selected && !options.includes(selected)) {
      const extraOption = document.createElement("option");
      extraOption.value = selected;
      extraOption.textContent = selected;
      participantSelect.appendChild(extraOption);
    }

    const targetValue = selected || previousValue || "";
    participantSelect.value = targetValue;
    if (participantSelect.value !== targetValue) {
      participantSelect.value = "";
    }
    participantSelect.disabled = options.length === 0;
    participantOptionsCacheKey = nextCacheKey;
  }

  function resetParticipantOptionsCache() {
    participantOptionsCacheKey = "";
  }

  return {
    populateParticipants,
    resetParticipantOptionsCache,
  };
}
