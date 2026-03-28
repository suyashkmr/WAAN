// @ts-check

import { computeAnalytics } from "../analytics.js";

const WAAN_TEST_RUNTIME_KEY = "__WAAN_TEST_RUNTIME__";

function isTestRuntimeEnabled(globalScope) {
  return Boolean(
    globalScope?.__WAAN_ENABLE_TEST_RUNTIME__ === true
    || globalScope?.navigator?.webdriver === true,
  );
}

/**
 * @typedef {Record<string, any>} AnyRecord
 */

/**
 * @param {{
 *   globalScope?: any,
 *   stateStore: AnyRecord,
 *   uiRuntime?: {
 *     renderDashboard?: (analytics: AnyRecord | null) => void,
 *     updateCustomRangeBounds?: () => void,
 *     populateSearchParticipants?: () => void,
 *     renderSearchResults?: () => void,
 *   },
 * }} params
 */
export function installAppTestRuntime({
  globalScope = globalThis,
  stateStore,
  uiRuntime = {},
}) {
  if (!globalScope || !stateStore) return null;
  if (!isTestRuntimeEnabled(globalScope)) return null;

  const runtime = {
    /**
     * @param {{
     *   entries?: any[],
     *   analytics?: AnyRecord | null,
     *   range?: string,
     *   datasetLabel?: string,
     *   selectionValue?: string | null,
     * }} [params]
     */
    seedDataset({
      entries = [],
      analytics = null,
      range = "all",
      datasetLabel = "sample chat",
      selectionValue = "test-runtime:seeded-dataset",
    } = {}) {
      const normalizedEntries = Array.isArray(entries) ? entries : [];
      const computedAnalytics = analytics || computeAnalytics(normalizedEntries);
      stateStore.setDatasetEntries(normalizedEntries);
      stateStore.setDatasetAnalytics(computedAnalytics);
      stateStore.setDatasetLabel(datasetLabel);
      stateStore.setCurrentRange(range);
      if (typeof stateStore.setActiveChatId === "function") {
        stateStore.setActiveChatId(selectionValue);
      }
      if (typeof stateStore.setDatasetFingerprint === "function" && typeof stateStore.computeDatasetFingerprint === "function") {
        stateStore.setDatasetFingerprint(stateStore.computeDatasetFingerprint(normalizedEntries));
      }
      uiRuntime.populateSearchParticipants?.();
      uiRuntime.renderDashboard?.(computedAnalytics);
      uiRuntime.updateCustomRangeBounds?.();
      uiRuntime.renderSearchResults?.();
      return computedAnalytics;
    },
  };

  globalScope[WAAN_TEST_RUNTIME_KEY] = runtime;
  return runtime;
}
