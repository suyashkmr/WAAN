import { resolveVueBridge, VUE_BRIDGE_NAMES } from "../vue/bridgeRegistry.js";
import { mountSearchSavedBridge } from "../vue/searchSavedIsland.js";
import { formatDisplayDate, formatNumber, formatTimestampDisplay } from "../utils.js";

export function createSearchResultsUiController({
  resultsSummaryEl,
  resultsListEl,
  insightsEl,
  resultLimit,
  getSearchState,
  getDatasetFingerprint,
  buildSearchRenderCacheKey,
  hasSearchFilters,
  buildResultsSummaryText,
  handleStateAction,
}) {
  let resultsRenderCacheKey = "";

  /**
   * @returns {{ renderSearchPanelState?: (payload: any) => boolean, renderSearchResults?: (payload: any) => boolean, renderSearchInsights?: (payload: any) => boolean } | null}
   */
  function getSearchSavedBridge() {
    mountSearchSavedBridge();
    /** @type {{
     *   renderSearchPanelState?: (payload: {
     *     tone?: string,
     *     title?: string,
     *     message?: string,
     *     actions?: Array<{ id?: string, label?: string, disabled?: boolean }>,
     *     onAction?: ((actionId: string) => void),
     *   }) => boolean,
     *   renderSearchResults?: (payload: {
     *     results?: unknown[],
     *     total?: number,
     *     lastRunFiltered?: boolean,
     *   }) => boolean,
     *   renderSearchInsights?: (payload: {
     *     summary?: unknown,
     *     resultLimit?: number,
     *   }) => boolean,
     *   setPanelActionHandlers?: (handlers: Record<string, (actionId: string, payload?: any) => void>) => boolean,
     * } | null} */
    return resolveVueBridge(VUE_BRIDGE_NAMES.searchSaved);
  }

  function registerPanelActionHandlers(searchSavedBridge) {
    if (!searchSavedBridge?.setPanelActionHandlers || typeof handleStateAction !== "function") return;
    searchSavedBridge.setPanelActionHandlers({
      "search:retry-search": () => handleStateAction("retry-search"),
      "search:clear-search-filters": () => handleStateAction("clear-search-filters"),
    });
  }

  function cancelPendingRender() {
    // No-op kept for interface parity with loading/error state transitions.
  }

  function renderLegacyResultsState({ tone = "empty", title = "", message = "", actions = [] } = {}) {
    if (!resultsListEl) return false;
    resultsListEl.innerHTML = "";
    const stateEl = document.createElement("div");
    stateEl.className = `panel-state app-empty-state panel-state--${String(tone || "empty")}`;
    stateEl.setAttribute("role", tone === "error" ? "alert" : "status");

    if (title) {
      const heading = document.createElement("h4");
      heading.className = "panel-state-title";
      heading.textContent = String(title);
      stateEl.appendChild(heading);
    }
    if (message) {
      const body = document.createElement("p");
      body.className = "panel-state-copy";
      body.textContent = String(message);
      stateEl.appendChild(body);
    }
    if (Array.isArray(actions) && actions.length) {
      const actionsEl = document.createElement("div");
      actionsEl.className = "app-toolbar-row panel-state-actions";
      actions
        .filter(Boolean)
        .forEach(action => {
          const actionId = String(action?.id || "");
          if (!actionId) return;
          const button = document.createElement("button");
          button.type = "button";
          button.className = "ghost-button small";
          button.dataset.panelAction = actionId;
          button.disabled = Boolean(action?.disabled);
          button.textContent = String(action?.label || "Action");
          button.addEventListener("click", () => handleStateAction?.(actionId));
          actionsEl.appendChild(button);
        });
      if (actionsEl.children.length) stateEl.appendChild(actionsEl);
    }
    resultsListEl.appendChild(stateEl);
    return true;
  }

  function renderLegacySearchInsights(summary) {
    if (!insightsEl) return true;
    insightsEl.innerHTML = "";
    if (!summary || !summary.total) {
      insightsEl.classList.add("hidden");
      return true;
    }
    insightsEl.classList.remove("hidden");
    const makeCard = title => {
      const card = document.createElement("div");
      card.className = "search-insight-card";
      const heading = document.createElement("h4");
      heading.textContent = title;
      card.appendChild(heading);
      return card;
    };
    const makeList = () => {
      const list = document.createElement("ul");
      list.className = "search-insight-list";
      return list;
    };
    const appendListItem = (list, label, value = "") => {
      const item = document.createElement("li");
      const left = document.createElement("span");
      left.className = "search-insight-label";
      left.textContent = String(label || "");
      item.appendChild(left);
      if (value !== "") {
        const right = document.createElement("span");
        right.textContent = String(value);
        item.appendChild(right);
      }
      list.appendChild(item);
    };

    const hitsCard = makeCard("Hits per day");
    const hitsList = makeList();
    const hits = Array.isArray(summary.hitsPerDay) ? summary.hitsPerDay : [];
    if (hits.length) {
      hits.forEach(item => {
        appendListItem(
          hitsList,
          item?.date ? formatDisplayDate(item.date) : "No daily data",
          formatNumber(item?.count || 0),
        );
      });
    } else {
      appendListItem(hitsList, "No daily data", "—");
    }
    hitsCard.appendChild(hitsList);

    const participantsCard = makeCard("Top participants");
    const participantsList = makeList();
    const topParticipants = Array.isArray(summary.topParticipants) ? summary.topParticipants : [];
    if (topParticipants.length) {
      topParticipants.forEach(item => {
        appendListItem(
          participantsList,
          item?.sender || "Unknown",
          formatNumber(item?.count || 0),
        );
      });
    } else {
      appendListItem(participantsList, "No matches yet", "—");
    }
    participantsCard.appendChild(participantsList);

    const filtersCard = makeCard("Search filters");
    const filtersList = makeList();
    const filters = Array.isArray(summary.filters) ? summary.filters : [];
    if (filters.length) {
      filters.forEach(filter => appendListItem(filtersList, filter));
    } else {
      appendListItem(filtersList, "No filters applied");
    }
    filtersCard.appendChild(filtersList);
    const note = document.createElement("p");
    note.className = "search-insight-note";
    note.textContent = summary.truncated
      ? `Showing first ${formatNumber(resultLimit)} of ${formatNumber(summary.total || 0)} matches.`
      : `Total matches: ${formatNumber(summary.total || 0)}.`;
    filtersCard.appendChild(note);

    insightsEl.append(hitsCard, participantsCard, filtersCard);
    return true;
  }

  function appendMessageSegment(target, segment) {
    const text = String(segment?.text || "");
    if (!text) return;
    const node = segment?.highlighted ? document.createElement("mark") : document.createElement("span");
    node.textContent = text;
    target.appendChild(node);
  }

  function renderLegacySearchResults({ results = [], total = 0, lastRunFiltered = false } = {}) {
    if (!resultsListEl) return false;
    const safeResults = Array.isArray(results) ? results.filter(Boolean) : [];
    resultsListEl.innerHTML = "";
    safeResults.forEach(result => {
      const card = document.createElement("div");
      card.className = "search-result";

      const header = document.createElement("div");
      header.className = "search-result-header";
      const sender = document.createElement("span");
      sender.className = "search-result-sender";
      sender.textContent = String(result?.sender || "[Unknown]");
      const timestamp = document.createElement("span");
      timestamp.textContent = formatTimestampDisplay(result?.timestamp || "");
      header.append(sender, timestamp);

      const message = document.createElement("div");
      message.className = "search-result-message";
      const segments = Array.isArray(result?.messageSegments) ? result.messageSegments : [];
      if (segments.length) {
        segments.forEach(segment => appendMessageSegment(message, segment));
      } else {
        message.textContent = String(result?.message || "");
      }

      card.append(header, message);
      resultsListEl.appendChild(card);
    });

    if (lastRunFiltered && Number(total || 0) > safeResults.length) {
      const note = document.createElement("div");
      note.className = "search-results-empty";
      note.textContent = "Narrow your filters to see more matches.";
      resultsListEl.appendChild(note);
    }
    return true;
  }

  /**
   * @returns {"bridge"|"fallback"|null}
   */
  function renderResultsState({ tone = "empty", title = "", message = "", actions = [] } = {}) {
    cancelPendingRender();
    const searchSavedBridge = getSearchSavedBridge();
    if (searchSavedBridge) registerPanelActionHandlers(searchSavedBridge);
    if (insightsEl) {
      searchSavedBridge?.renderSearchInsights?.({
        summary: null,
        resultLimit,
      });
      if (!searchSavedBridge?.renderSearchInsights) renderLegacySearchInsights(null);
    }
    if (searchSavedBridge?.renderSearchPanelState) {
      const handled = searchSavedBridge.renderSearchPanelState({
        tone,
        title,
        message,
        actions,
      });
      if (handled) return "bridge";
    }
    return renderLegacyResultsState({ tone, title, message, actions }) ? "fallback" : null;
  }

  function renderLoadingState(message = "Searching messages…") {
    renderResultsState({
      tone: "loading",
      title: "Searching messages",
      message,
    });
  }

  function renderErrorState(message = "Search could not complete.") {
    renderResultsState({
      tone: "error",
      title: "Search failed",
      message,
      actions: [{ id: "retry-search", label: "Try again" }],
    });
  }

  function clearStateOverride() {
    cancelPendingRender();
    resultsRenderCacheKey = "";
  }

  function renderResults() {
    if (!resultsSummaryEl || !resultsListEl) return;
    const state = getSearchState();
    const query = state?.query ?? {};
    const results = state?.results ?? [];
    const total = state?.total ?? 0;
    const summary = state?.summary ?? null;
    const hasRunSearch = Boolean(state?.lastRun);
    const lastRunFiltered = Boolean(state?.lastRunHasFilters);
    const datasetFingerprint = getDatasetFingerprint() || "";
    const nextRenderCacheKey = buildSearchRenderCacheKey({
      datasetFingerprint,
      query,
      total,
      results,
      hasRunSearch,
      lastRunFiltered,
      lastRun: state?.lastRun,
      summary,
    });
    if (nextRenderCacheKey === resultsRenderCacheKey) return;

    const hasFilters = hasSearchFilters(query);
    cancelPendingRender();
    const searchSavedBridge = getSearchSavedBridge();
    if (searchSavedBridge) registerPanelActionHandlers(searchSavedBridge);
    resultsSummaryEl.textContent = buildResultsSummaryText({
      hasRunSearch,
      total,
      lastRunFiltered,
      resultsLength: results.length,
      hasFilters,
      resultLimit,
    });

    resultsListEl.innerHTML = "";
    if (!total) {
      const renderedStateSource = renderResultsState({
        tone: hasRunSearch ? "empty" : "loading",
        title: hasRunSearch ? "No matching messages" : "Search this chat",
        message: hasFilters
          ? "Try different keywords, participants, or dates."
          : "Add keywords, participant, or date filters to find messages.",
        actions: hasFilters ? [{ id: "clear-search-filters", label: "Clear filters" }] : [],
      });
      if (renderedStateSource === "bridge") resultsRenderCacheKey = nextRenderCacheKey;
      return;
    }

    if (searchSavedBridge?.renderSearchResults) {
      let handledResults = false;
      try {
        handledResults = Boolean(searchSavedBridge.renderSearchResults({
          results,
          total,
          lastRunFiltered,
        }));
      } catch {
        handledResults = false;
      }
      if (handledResults) {
        const expectedRenderCount = Array.isArray(results) ? results.filter(Boolean).length : 0;
        if (expectedRenderCount > 0 && !resultsListEl.querySelector(".search-result")) {
          handledResults = false;
        }
      }
      if (handledResults) {
        const handledInsights = Boolean(
          searchSavedBridge?.renderSearchInsights?.({
            summary,
            resultLimit,
          }),
        );
        if (!handledInsights) {
          const fallbackInsightsHandled = renderLegacySearchInsights(summary);
          if (fallbackInsightsHandled) {
            resultsRenderCacheKey = nextRenderCacheKey;
          }
          return;
        }
        resultsRenderCacheKey = nextRenderCacheKey;
        return;
      }
    }

    const handledFallbackResults = renderLegacySearchResults({
      results,
      total,
      lastRunFiltered,
    });
    if (handledFallbackResults) renderLegacySearchInsights(summary);
  }

  function resetResultsRenderCache() {
    resultsRenderCacheKey = "";
  }

  return {
    renderResults,
    resetResultsRenderCache,
    renderLoadingState,
    renderErrorState,
    clearStateOverride,
  };
}
