import { formatDisplayDate, formatNumber, formatTimestampDisplay } from "../utils.js";

export function createLegacySearchFallbackRenderer({
  resultsListEl,
  insightsEl,
  resultLimit,
  handleStateAction,
}) {
  function renderState({ tone = "empty", title = "", message = "", actions = [] } = {}) {
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

  function renderInsights(summary) {
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

  function renderResults({ results = [], total = 0, lastRunFiltered = false } = {}) {
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

  return {
    renderState,
    renderInsights,
    renderResults,
  };
}
