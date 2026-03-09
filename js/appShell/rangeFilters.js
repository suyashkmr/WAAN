// @ts-check

/** @typedef {Record<string, any>} AnyRecord */

/**
 * @param {{ elements: AnyRecord, deps: AnyRecord }} params
 */
export function createRangeFiltersController({
  elements,
  deps,
}) {
  const {
    rangeSelect,
    customControls,
    customStartInput,
    customEndInput,
    customApplyButton,
    searchStartInput,
    searchEndInput,
  } = elements;

  const {
    getDatasetEntries,
    getDatasetLabel,
    setCurrentRange,
    setCustomRange,
    getCustomRange,
    getCachedAnalytics,
    setCachedAnalytics,
    setDatasetAnalytics,
    renderDashboard,
    computeAnalyticsWithWorker,
    updateStatus,
    formatNumber,
    formatDisplayDate,
    getTimestamp,
    toISODate,
    onRangeApplied,
    nextAnalyticsRequestToken,
    isAnalyticsRequestCurrent,
    syncPageControls = null,
  } = deps;

  function syncPageControlsState(nextState = {}) {
    if (typeof syncPageControls !== "function") return false;
    return Boolean(syncPageControls(nextState));
  }
  /**
   * @param {any} range
   */
  function normalizeRangeValue(range) {
    if (!range || range === "all") return "all";
    if (typeof range === "string") return range;
    if (typeof range === "object" && range.type === "custom") {
      return { type: "custom", start: range.start ?? null, end: range.end ?? null };
    }
    return range;
  }
  /**
   * @param {any[]} entries
   * @param {any} range
   */
  function filterEntriesByRange(entries, range) {
    if (!range || range === "all") return entries;
    if (range.type === "custom") {
      const startDate = new Date(range.start);
      const endDate = new Date(range.end);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      return entries.filter(entry => {
        const ts = getTimestamp(entry);
        return ts && ts >= startDate && ts <= endDate;
      });
    }

    const days = Number(range);
    if (!Number.isFinite(days) || days <= 0) return entries;

    const timestamps = entries
      .map(/** @param {any} entry */ entry => getTimestamp(entry))
      .filter(Boolean)
      .sort((/** @type {any} */ a, /** @type {any} */ b) => Number(a) - Number(b));
    if (!timestamps.length) return entries;

    const end = new Date(timestamps[timestamps.length - 1]);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - (days - 1));
    start.setHours(0, 0, 0, 0);

    return entries.filter(entry => {
      const ts = getTimestamp(entry);
      return ts && ts >= start && ts <= end;
    });
  }
  /**
   * @param {any} range
   */
  function buildRangeKey(range) {
    if (!range || range === "all") return "all";
    if (typeof range === "string") return `days:${range}`;
    if (typeof range === "object" && range.type === "custom") {
      const start = range.start ?? "";
      const end = range.end ?? "";
      return `custom:${start}|${end}`;
    }
    return `range:${JSON.stringify(range)}`;
  }

  /**
   * @param {any} range
   */
  function describeRange(range) {
    if (!range || range === "all") return "entire history";
    if (typeof range === "object" && range.type === "custom") {
      return `${formatDisplayDate(range.start)} -> ${formatDisplayDate(range.end)}`;
    }
    const days = Number(range);
    return Number.isFinite(days) ? `last ${days} days` : String(range);
  }
  /**
   * @param {boolean} visible
   */
  function showCustomControls(visible) {
    if (syncPageControlsState({
      customVisible: Boolean(visible),
      customDisabled: !visible,
    })) {
      return;
    }
    if (!customControls) return;
    if (visible) {
      customControls.classList.remove("hidden");
    } else {
      customControls.classList.add("hidden");
    }
    if (customStartInput && customEndInput) {
      customStartInput.disabled = !visible;
      customEndInput.disabled = !visible;
    }
    if (customApplyButton) {
      customApplyButton.disabled = !visible;
    }
  }

  function updateCustomRangeBounds() {
    /** @type {Record<string, any>} */
    const nextPageControlState = {};
    const entries = getDatasetEntries();
    if (!entries.length) {
      nextPageControlState.customStart = "";
      nextPageControlState.customEnd = "";
      nextPageControlState.customDisabled = true;
      nextPageControlState.customMin = "";
      nextPageControlState.customMax = "";
      syncPageControlsState(nextPageControlState);
      if (!customStartInput || !customEndInput) return;
      customStartInput.value = "";
      customEndInput.value = "";
      customStartInput.disabled = true;
      customEndInput.disabled = true;
      if (customApplyButton) customApplyButton.disabled = true;
      if (searchStartInput) {
        searchStartInput.value = "";
        searchStartInput.disabled = true;
        searchStartInput.min = "";
        searchStartInput.max = "";
      }
      if (searchEndInput) {
        searchEndInput.value = "";
        searchEndInput.disabled = true;
        searchEndInput.min = "";
        searchEndInput.max = "";
      }
      return;
    }

    const timestamps = entries
      .map(/** @param {any} entry */ entry => getTimestamp(entry))
      .filter(Boolean)
      .sort((/** @type {any} */ a, /** @type {any} */ b) => Number(a) - Number(b));
    if (!timestamps.length) {
      nextPageControlState.customDisabled = true;
      syncPageControlsState(nextPageControlState);
      if (!customStartInput || !customEndInput) return;
      customStartInput.disabled = true;
      customEndInput.disabled = true;
      if (customApplyButton) customApplyButton.disabled = true;
      return;
    }

    const start = toISODate(timestamps[0]);
    const end = toISODate(timestamps[timestamps.length - 1]);
    nextPageControlState.customDisabled = false;
    nextPageControlState.customMin = start;
    nextPageControlState.customMax = end;
    const customRange = getCustomRange();
    if (!customRange || customRange.type !== "custom") {
      nextPageControlState.customStart = start;
      nextPageControlState.customEnd = end;
    } else {
      nextPageControlState.customStart = customRange.start ?? "";
      nextPageControlState.customEnd = customRange.end ?? "";
    }
    syncPageControlsState(nextPageControlState);
    if (!customStartInput || !customEndInput) return;

    customStartInput.min = start;
    customStartInput.max = end;
    customEndInput.min = start;
    customEndInput.max = end;
    customStartInput.disabled = false;
    customEndInput.disabled = false;
    if (customApplyButton) customApplyButton.disabled = false;

    if (searchStartInput) {
      searchStartInput.disabled = false;
      searchStartInput.min = start;
      searchStartInput.max = end;
    }
    if (searchEndInput) {
      searchEndInput.disabled = false;
      searchEndInput.min = start;
      searchEndInput.max = end;
    }
    if (!customRange || customRange.type !== "custom") {
      customStartInput.value = start;
      customEndInput.value = end;
    } else {
      customStartInput.value = customRange.start ?? "";
      customEndInput.value = customRange.end ?? "";
    }
  }
  /**
   * @param {any} range
   */
  async function applyRangeAndRender(range) {
    const entries = getDatasetEntries();
    if (!entries.length) {
      updateStatus("Load a chat file before picking a range.", "warning");
      return;
    }

    const requestToken = nextAnalyticsRequestToken();
    const normalizedRange = normalizeRangeValue(range);
    const rangeKey = buildRangeKey(normalizedRange);
    const cached = getCachedAnalytics(rangeKey);
    if (cached) {
      if (isAnalyticsRequestCurrent(requestToken)) {
        setDatasetAnalytics(cached);
        renderDashboard(cached);
        updateCustomRangeBounds();
        const labelCached = describeRange(normalizedRange);
        updateStatus(
          `Showing ${formatNumber(cached.total_messages)} messages from ${getDatasetLabel()} (${labelCached}).`,
          "info",
        );
      }
      return;
    }

    updateStatus("Calculating stats for the selected range...", "info");

    const subset = filterEntriesByRange(entries, normalizedRange);
    try {
      const analytics = await computeAnalyticsWithWorker(subset);
      if (!isAnalyticsRequestCurrent(requestToken)) return;

      setCachedAnalytics(rangeKey, analytics);
      setDatasetAnalytics(analytics);
      renderDashboard(analytics);
      updateCustomRangeBounds();
      onRangeApplied?.();

      const label = describeRange(normalizedRange);
      updateStatus(
        `Showing ${formatNumber(analytics.total_messages)} messages from ${getDatasetLabel()} (${label}).`,
        "info",
      );
    } catch (error) {
      console.error(error);
      if (isAnalyticsRequestCurrent(requestToken)) {
        updateStatus("We couldn't calculate stats for this range.", "error");
      }
    }
  }
  /**
   * @param {{ target?: { value?: string | null } } | null | undefined} [event]
   */
  async function handleRangeChange(event) {
    const value = event?.target?.value ?? rangeSelect?.value;
    if (!value) return;
    if (rangeSelect && rangeSelect.value !== value) {
      rangeSelect.value = value;
    }
    syncPageControlsState({ rangeValue: value });
    if (value === "custom") {
      showCustomControls(true);
      updateStatus("Choose your dates and click Apply.", "info");
      return;
    }

    showCustomControls(false);
    setCurrentRange(value);
    setCustomRange(null);
    await applyRangeAndRender(value);
    onRangeApplied?.();
  }
  /**
   * @param {string} start
   * @param {string} end
   */
  async function applyCustomRange(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate) || Number.isNaN(endDate)) {
      updateStatus("Those dates don't look right.", "error");
      return;
    }
    if (startDate > endDate) {
      updateStatus("Start date must be on or before the end date.", "error");
      return;
    }

    const range = { type: "custom", start, end };
    setCustomRange(range);
    setCurrentRange("custom");
    if (rangeSelect) rangeSelect.value = "custom";
    syncPageControlsState({
      rangeValue: "custom",
      customVisible: true,
      customDisabled: false,
      customStart: start,
      customEnd: end,
    });
    showCustomControls(true);
    await applyRangeAndRender(range);
  }
  return {
    normalizeRangeValue,
    filterEntriesByRange,
    buildRangeKey,
    describeRange,
    showCustomControls,
    updateCustomRangeBounds,
    applyRangeAndRender,
    handleRangeChange,
    applyCustomRange,
  };
}
