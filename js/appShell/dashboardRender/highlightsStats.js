// @ts-check
import { resolveVueBridge, VUE_BRIDGE_NAMES } from "../../vue/bridgeRegistry.js";
import { mountDashboardPanelsIsland } from "../../vue/dashboardPanelsIsland.js";

/**
 * @typedef {Object} HighlightItem
 * @property {string} [label]
 * @property {string} [value]
 */

/**
 * @typedef {Object} HighlightCard
 * @property {string} [type]
 * @property {string} [theme]
 * @property {string} [label]
 * @property {string} [tooltip]
 * @property {string} [headline]
 * @property {string} [value]
 * @property {string} [descriptor]
 * @property {HighlightItem[]} [items]
 * @property {string} [meta]
 */

/**
 * @typedef {Object} HighlightsStatsElements
 * @property {HTMLElement | null | undefined} highlightList
 */

/**
 * @typedef {Object} HighlightsStatsDeps
 * @property {(value?: number | null) => string} formatNumber
 * @property {(value?: number | null, digits?: number) => string} formatFloat
 */

/**
 * @typedef {Object} SystemSummary
 * @property {number} [join_requests]
 */

/**
 * @typedef {Object} Averages
 * @property {number} [characters]
 * @property {number} [words]
 */

/**
 * @typedef {Object} AnalyticsStats
 * @property {number} [media_count]
 * @property {number} [link_count]
 * @property {number} [poll_count]
 * @property {number} [join_events]
 * @property {number} [added_events]
 * @property {number} [left_events]
 * @property {number} [removed_events]
 * @property {number} [changed_events]
 * @property {number} [other_system_events]
 * @property {SystemSummary} [system_summary]
 * @property {Averages} [averages]
 */

/**
 * @param {{ elements: HighlightsStatsElements, deps: HighlightsStatsDeps }} params
 */
export function createHighlightsStatsController({ elements, deps }) {
  const { highlightList } = elements;
  const { formatNumber, formatFloat } = deps;

  /**
   * @param {number} value
   * @param {number} [digits]
   * @returns {string}
   */
  function formatSentimentScore(value, digits = 2) {
    if (!Number.isFinite(value)) return "-";
    const abs = Math.abs(value);
    const formatted = formatFloat(abs, digits);
    if (value > 0) return `+${formatted}`;
    if (value < 0) return `-${formatted}`;
    return formatFloat(0, digits);
  }

  /**
   * @param {HighlightCard[] | null | undefined} highlights
   */
  function renderHighlights(highlights) {
    if (!highlightList) return;
    mountDashboardPanelsIsland();
    /** @type {{ renderHighlights?: (highlights: unknown) => boolean } | null} */
    const dashboardPanelsBridge = resolveVueBridge(VUE_BRIDGE_NAMES.dashboardPanels);
    dashboardPanelsBridge?.renderHighlights?.(highlights);
  }

  /**
   * @param {AnalyticsStats} analytics
   */
  function renderStatistics(analytics) {
    /**
     * @param {string} id
     * @param {string} value
     */
    const setText = (id, value) => {
      const node = document.getElementById(id);
      if (node) node.textContent = value;
    };

    setText("media-count", formatNumber(analytics.media_count));
    setText("link-count", formatNumber(analytics.link_count));
    setText("poll-count", formatNumber(analytics.poll_count));
    setText("join-events", formatNumber(analytics.join_events));
    setText("added-events", formatNumber(analytics.added_events));
    setText("left-events", formatNumber(analytics.left_events));
    setText("removed-events", formatNumber(analytics.removed_events));
    setText("changed-events", formatNumber(analytics.changed_events));
    setText("other-system-events", formatNumber(analytics.other_system_events));
    if (analytics.system_summary) {
      setText("join-requests", formatNumber(analytics.system_summary.join_requests));
    }
    setText("avg-chars", formatFloat(analytics.averages?.characters, 1));
    setText("avg-words", formatFloat(analytics.averages?.words, 1));
  }

  return {
    formatSentimentScore,
    renderHighlights,
    renderStatistics,
  };
}
