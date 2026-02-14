export function createHighlightsStatsController({ elements, deps }) {
  const { highlightList } = elements;
  const { sanitizeText, formatNumber, formatFloat } = deps;

  function formatSentimentScore(value, digits = 2) {
    if (!Number.isFinite(value)) return "-";
    const abs = Math.abs(value);
    const formatted = formatFloat(abs, digits);
    if (value > 0) return `+${formatted}`;
    if (value < 0) return `-${formatted}`;
    return formatFloat(0, digits);
  }

  function renderHighlights(highlights) {
    if (!highlightList) return;
    highlightList.innerHTML = "";

    if (!Array.isArray(highlights) || !highlights.length) {
      const empty = document.createElement("p");
      empty.className = "search-results-empty";
      empty.textContent = "Highlights will show up after the chat loads.";
      highlightList.appendChild(empty);
      return;
    }

    highlights.forEach(highlight => {
      const card = document.createElement("div");
      card.className = `highlight-card ${sanitizeText(highlight.type || "")}`;

      const labelRow = document.createElement("div");
      labelRow.className = "highlight-label-row";
      const label = document.createElement("span");
      label.className = "highlight-label";
      label.textContent = highlight.label || "Highlight";
      labelRow.appendChild(label);
      if (highlight.tooltip) {
        const tooltipButton = document.createElement("button");
        tooltipButton.type = "button";
        tooltipButton.className = "info-note-button info-note-inline";
        tooltipButton.setAttribute("aria-label", highlight.tooltip);
        tooltipButton.setAttribute("title", highlight.tooltip);
        tooltipButton.innerHTML =
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 17h2v-6h-2v6zm0-8h2V7h-2v2zm1-7C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>';
        labelRow.appendChild(tooltipButton);
      }
      card.appendChild(labelRow);

      if (highlight.headline) {
        const headline = document.createElement("p");
        headline.className = "highlight-headline";
        headline.textContent = highlight.headline;
        card.appendChild(headline);
      }

      const value = document.createElement("span");
      value.className = "highlight-value";
      value.textContent = highlight.value || "-";
      card.appendChild(value);

      if (highlight.descriptor) {
        const descriptor = document.createElement("span");
        descriptor.className = "highlight-descriptor";
        descriptor.textContent = highlight.descriptor;
        card.appendChild(descriptor);
      }

      if (Array.isArray(highlight.items) && highlight.items.length) {
        const list = document.createElement("ol");
        list.className = "highlight-items";
        highlight.items.forEach(item => {
          const li = document.createElement("li");
          const itemLabel = document.createElement("span");
          itemLabel.className = "item-label";
          itemLabel.textContent = item.label || "";
          li.appendChild(itemLabel);
          if (item.value) {
            const itemValue = document.createElement("span");
            itemValue.className = "item-value";
            itemValue.textContent = item.value;
            li.appendChild(itemValue);
          }
          list.appendChild(li);
        });
        card.appendChild(list);
      }

      if (highlight.theme || highlight.type) {
        card.dataset.accent = highlight.theme || highlight.type;
      }

      if (highlight.meta) {
        const meta = document.createElement("span");
        meta.className = "highlight-meta";
        meta.textContent = highlight.meta;
        card.appendChild(meta);
      }

      highlightList.appendChild(card);
    });
  }

  function renderStatistics(analytics) {
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
    setText("avg-chars", formatFloat(analytics.averages.characters, 1));
    setText("avg-words", formatFloat(analytics.averages.words, 1));
  }

  return {
    formatSentimentScore,
    renderHighlights,
    renderStatistics,
  };
}
