import { renderActionButton } from "./primevueRenderPrimitives.js";

/**
 * @param {any} h
 * @param {{ rows: any[], emptyMessage: string, expandedByRowId: Record<string, boolean> }} participantsState
 */
export function createParticipantsRoot(h, participantsState) {
  return {
    name: "WaanParticipantsIsland",
    setup() {
      /**
       * @param {string} rowId
       */
      const toggleRow = rowId => {
        const key = String(rowId || "");
        if (!key) return;
        participantsState.expandedByRowId[key] = !participantsState.expandedByRowId[key];
      };

      return () => {
        if (participantsState.emptyMessage) {
          return [
            h("tr", {}, [
              h(
                "td",
                {
                  colspan: "5",
                  class: "empty-state",
                },
                participantsState.emptyMessage,
              ),
            ]),
          ];
        }
        const nodes = [];
        participantsState.rows.forEach(row => {
          const rowKey = String(row.rowId || "");
          const isExpanded = Boolean(participantsState.expandedByRowId[rowKey]);
          nodes.push(
            h(
              "tr",
              {
                class: ["participant-row", isExpanded ? "expanded" : ""].filter(Boolean).join(" "),
                "data-row-id": row.rowId,
              },
              [
                h("td", { "data-label": "Rank" }, String(row.rank)),
                h("td", { "data-label": "Participant" }, [
                  renderActionButton(h, {
                    type: "button",
                    className: "participant-toggle",
                    attrs: {
                      "aria-expanded": String(isExpanded),
                      "aria-controls": row.detailId,
                      "aria-label": `${isExpanded ? "Hide" : "Show"} details for ${row.senderLabel}`,
                    },
                    onClick: () => toggleRow(rowKey),
                    children: [
                      h("span", { class: "toggle-icon" }, isExpanded ? "▾" : "▸"),
                      h(
                        "span",
                        {
                          class: "participant-name",
                          title: row.senderLabel,
                        },
                        row.senderLabel,
                      ),
                    ],
                  }),
                ]),
                h("td", { "data-label": "Messages" }, row.messageCount),
                h(
                  "td",
                  {
                    "data-label": "Share",
                    title: row.shareTitle,
                  },
                  [
                    h("div", { class: "participant-share" }, [
                      h("div", { class: "share-bar" }, [
                        h("span", { class: "share-fill", style: { width: `${row.shareWidth}%` } }),
                      ]),
                      h("span", { class: "share-value" }, row.shareValue),
                    ]),
                  ],
                ),
                h(
                  "td",
                  {
                    "data-label": "Avg Words",
                    title: row.avgWordsTitle,
                  },
                  row.avgWordsDisplay,
                ),
              ],
            ),
          );
          nodes.push(
            h(
              "tr",
              {
                class: ["participant-detail-row", isExpanded ? "" : "hidden"].filter(Boolean).join(" "),
                id: row.detailId,
                "data-row-id": row.rowId,
              },
              [
                h("td", { colspan: "5" }, [
                  h("div", { class: "participant-detail" }, [
                    h(
                      "div",
                      { class: "detail-grid" },
                      Array.isArray(row.detailItems) && row.detailItems.length
                        ? row.detailItems.map(item =>
                          h("div", { class: "detail-item" }, [
                            h("span", { class: "detail-label" }, String(item?.label || "")),
                            h("span", { class: "detail-value" }, String(item?.value || "—")),
                          ]))
                        : [],
                    ),
                  ]),
                ]),
              ],
            ),
          );
        });
        return nodes;
      };
    },
  };
}
