export function applySearchStateToInputs({
  state,
  keywordInput,
  participantSelect,
  startInput,
  endInput,
}) {
  if (!state) return;
  if (keywordInput) keywordInput.value = state.query.text ?? "";
  if (participantSelect) participantSelect.value = state.query.participant ?? "";
  if (startInput) startInput.value = state.query.start ?? "";
  if (endInput) endInput.value = state.query.end ?? "";
}

export function readSearchQueryFromInputs({
  keywordInput,
  participantSelect,
  startInput,
  endInput,
}) {
  return {
    text: keywordInput?.value.trim() ?? "",
    participant: participantSelect?.value ?? "",
    start: startInput?.value ?? "",
    end: endInput?.value ?? "",
  };
}

export function resetSearchInputs({
  keywordInput,
  participantSelect,
  startInput,
  endInput,
}) {
  if (keywordInput) keywordInput.value = "";
  if (participantSelect) participantSelect.value = "";
  if (startInput) startInput.value = "";
  if (endInput) endInput.value = "";
}
