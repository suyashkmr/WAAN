import { renderActionButton } from "./primevueRenderPrimitives.js";
import { UI_COPY } from "../uiCopy.js";

export function normalizeHighlightEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const type = String(entry.type || "");
  const label = String(entry.label || "Highlight");
  const value = String(entry.value || "-");
  const descriptor = String(entry.descriptor || "");
  const key = String(entry.id || entry.key || [type, label, value, descriptor].join("|"));
  return {
    key,
    type,
    theme: String(entry.theme || ""),
    label,
    tooltip: String(entry.tooltip || ""),
    headline: String(entry.headline || ""),
    value,
    descriptor,
    meta: String(entry.meta || ""),
    items: Array.isArray(entry.items)
      ? entry.items.map(item => ({
        label: String(item?.label || ""),
        value: String(item?.value || ""),
      }))
      : [],
  };
}

export function createHighlightsRoot({
  h,
  state,
  PrimeDataView,
  usePrimeDataView,
  globalScope = globalThis,
}) {
  const iconPath =
    "M11 17h2v-6h-2v6zm0-8h2V7h-2v2zm1-7C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z";

  return {
    name: "WaanHighlightsIsland",
    setup() {
      const renderHighlightCard = (highlight, index) =>
        h(
          "div",
          {
            class: ["highlight-card", highlight.type].filter(Boolean).join(" "),
            "data-accent": highlight.theme || highlight.type || undefined,
          },
          [
            h("div", { class: "highlight-label-row" }, [
              h("span", { class: "highlight-label" }, highlight.label),
              highlight.tooltip
                ? renderActionButton(h, {
                  type: "button",
                  className: "info-note-button info-note-inline",
                  attrs: {
                    "aria-label": highlight.tooltip,
                    "aria-describedby": `highlight-note-${index}`,
                    title: highlight.tooltip,
                  },
                  children: [
                    h(
                      "svg",
                      {
                        viewBox: "0 0 24 24",
                        "aria-hidden": "true",
                      },
                      [h("path", { d: iconPath })],
                    ),
                    h(
                      "span",
                      {
                        class: "info-tooltip",
                        id: `highlight-note-${index}`,
                        role: "tooltip",
                      },
                      highlight.tooltip,
                    ),
                  ],
                }, globalScope)
                : null,
            ]),
            highlight.headline ? h("p", { class: "highlight-headline" }, highlight.headline) : null,
            h("span", { class: "highlight-value" }, highlight.value),
            highlight.descriptor ? h("span", { class: "highlight-descriptor" }, highlight.descriptor) : null,
            highlight.items.length
              ? h(
                "ol",
                { class: "highlight-items" },
                highlight.items.map(item =>
                  h("li", {}, [
                    h("span", { class: "item-label" }, item.label),
                    item.value ? h("span", { class: "item-value" }, item.value) : null,
                  ]),
                ),
              )
              : null,
            highlight.meta ? h("span", { class: "highlight-meta" }, highlight.meta) : null,
          ],
        );

      return () => {
        if (!state.highlights.length) {
          return h("p", { class: "search-results-empty" }, UI_COPY.analytics.noHighlights);
        }
        return usePrimeDataView
          ? h(PrimeDataView, {
            value: state.highlights,
            dataKey: "key",
            unstyled: true,
            "data-ui-runtime": "primevue",
            pt: {
              root: { class: "highlight-grid-dataview-root" },
              content: { class: "highlight-grid-dataview-content" },
              list: { class: "highlight-grid-dataview-list" },
            },
          }, {
            list: slotProps => {
              const items = Array.isArray(slotProps?.items) ? slotProps.items : state.highlights;
              return items.map((highlight, index) => renderHighlightCard(highlight, index));
            },
          })
          : state.highlights.map((highlight, index) => renderHighlightCard(highlight, index));
      };
    },
  };
}
