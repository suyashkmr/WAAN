export function renderSavedViewsComparisonWithVue({
  empty = false,
  message = "",
  columns = [],
  container,
  vueRuntime = globalThis.Vue,
}) {
  const VueRuntime = vueRuntime;
  if (!VueRuntime || !container) return false;
  const { h, render } = VueRuntime;
  if (typeof h !== "function" || typeof render !== "function") return false;
  const safeColumns = Array.isArray(columns)
    ? columns.filter(Boolean).map((column, index) => ({
      key: String(column?.key || column?.id || column?.viewId || `compare-column-${index}`),
      heading: String(column?.heading || ""),
      metrics: Array.isArray(column?.metrics)
        ? column.metrics.filter(Boolean).map(metric => ({
          label: String(metric?.label || ""),
          value: String(metric?.value || "—"),
          tone: String(metric?.tone || "neutral"),
        }))
        : [],
    }))
    : [];
  container.classList.toggle("empty", Boolean(empty));
  if (empty) {
    render(h("div", { class: "saved-views-compare-vue" }, [
      h("p", null, String(message || "Pick two saved views to compare their activity side-by-side.")),
    ]), container);
    return true;
  }
  const renderColumn = column =>
    h("div", { class: "compare-column" }, [
      h("h3", null, column.heading),
      h("ul", { class: "compare-metrics" }, column.metrics.map(metric =>
        h("li", null, [
          h("span", { class: "compare-label" }, metric.label),
          h(
            "span",
            {
              class: [
                "compare-value",
                metric.tone !== "neutral" ? "compare-diff" : "",
                metric.tone === "positive" ? "positive" : "",
                metric.tone === "negative" ? "negative" : "",
              ],
            },
            metric.value,
          ),
        ]),
      )),
    ]);
  render(h("div", { class: "saved-views-compare-vue" }, [
    h(
      "div",
      { class: "compare-summary-grid" },
      safeColumns.map(renderColumn),
    ),
  ]), container);
  return true;
}
