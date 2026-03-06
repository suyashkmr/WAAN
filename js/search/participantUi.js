export function createSearchParticipantUiController({
  participantSelect,
  getEntries,
  getDatasetFingerprint,
  getSearchState,
  buildParticipantOptionsCacheKey,
  vueRuntime = typeof globalThis !== "undefined" ? globalThis.Vue : null,
}) {
  let participantOptionsCacheKey = "";
  let vueMounted = false;

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
    const VueRuntime = /** @type {any} */ (vueRuntime);
    const canRenderWithVue = Boolean(
      VueRuntime &&
      typeof VueRuntime.h === "function" &&
      typeof VueRuntime.render === "function" &&
      VueRuntime.Fragment,
    );
    if (canRenderWithVue) {
      const { h, render, Fragment } = VueRuntime;
      if (!vueMounted) {
        participantSelect.textContent = "";
        vueMounted = true;
      }
      const optionNodes = [
        h("option", { value: "" }, "All participants"),
        ...options.map(sender => h("option", { value: sender, key: sender }, sender)),
      ];
      if (selected && !options.includes(selected)) {
        optionNodes.push(h("option", { value: selected, key: `selected:${selected}` }, selected));
      }
      render(h(Fragment, null, optionNodes), participantSelect);
    } else {
      throw new Error("Vue runtime is required for search participant rendering.");
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
