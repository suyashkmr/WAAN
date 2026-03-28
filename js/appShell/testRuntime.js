// @ts-check

import { computeAnalytics } from "../analytics.js";

const WAAN_TEST_RUNTIME_KEY = "__WAAN_TEST_RUNTIME__";

/**
 * @param {any} globalScope
 */
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
 * @param {unknown} value
 * @returns {value is Record<string, any>}
 */
function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Preserve the full production analytics contract while allowing tests to
 * override only the slices they care about.
 *
 * @param {AnyRecord} base
 * @param {AnyRecord | null} overrides
 * @returns {AnyRecord}
 */
function mergeAnalytics(base, overrides) {
  if (!isPlainObject(overrides)) {
    return base;
  }

  /** @type {AnyRecord} */
  const merged = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (isPlainObject(value) && isPlainObject(base[key])) {
      merged[key] = mergeAnalytics(base[key], value);
      continue;
    }
    merged[key] = value;
  }
  return merged;
}

/**
 * Accept the lightweight fixture shapes used by tests and promote them into the
 * minimal production entry contract expected by computeAnalytics().
 *
 * @param {any[]} entries
 * @returns {any[]}
 */
function normalizeSeedEntries(entries) {
  return entries.map((entry, index) => {
    if (!isPlainObject(entry)) {
      return entry;
    }
    const hasExplicitSystemMetadata =
      entry.system_subtype != null
      || entry.system_participant_count != null
      || (Array.isArray(entry.system_participants) && entry.system_participants.length > 0);
    const normalizedType =
      entry.type === "message" || entry.type === "system"
        ? entry.type
        : (hasExplicitSystemMetadata ? "system" : "message");
    return {
      ...entry,
      type: normalizedType,
      sender: entry.sender ?? (entry.from_me || entry.fromMe ? "You" : normalizedType === "system" ? "System" : "Unknown"),
      sender_id:
        normalizedType === "system"
          ? entry.sender_id ?? null
          : entry.sender_id ?? entry.sender ?? (entry.from_me || entry.fromMe ? "You" : "Unknown"),
      message: entry.message ?? "",
      timestamp: entry.timestamp ?? null,
      timestamp_text: entry.timestamp_text ?? "",
    };
  });
}

/**
 * Drop placeholder rows that the real UI cannot safely consume.
 *
 * @param {any[]} entries
 * @returns {AnyRecord[]}
 */
function filterRenderableSeedEntries(entries) {
  return entries.filter(isPlainObject);
}

/**
 * Keep only the normalized rows that are safe for computeAnalytics().
 *
 * @param {any[]} entries
 * @returns {AnyRecord[]}
 */
function filterAnalyticsSafeSeedEntries(entries) {
  return entries.filter(entry => {
    if (!isPlainObject(entry)) {
      return false;
    }
    if (entry.type === "message") {
      return typeof entry.message === "string";
    }
    if (entry.type === "system") {
      return typeof entry.message === "string";
    }
    return false;
  });
}

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
      const normalizedEntries = filterRenderableSeedEntries(
        normalizeSeedEntries(Array.isArray(entries) ? entries : []),
      );
      const analyticsOverrides = isPlainObject(analytics) ? analytics : null;
      const analyticsEntries = filterAnalyticsSafeSeedEntries(normalizedEntries);
      const analyticsBase = computeAnalytics(analyticsEntries);
      const computedAnalytics = mergeAnalytics(analyticsBase, analyticsOverrides);
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
