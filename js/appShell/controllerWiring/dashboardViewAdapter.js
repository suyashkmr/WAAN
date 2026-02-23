export function createDashboardViewAdapter({
  documentRef = globalThis.document ?? null,
  windowRef = globalThis.window ?? null,
} = {}) {
  function applySummarySkeletonState() {
    if (!documentRef || typeof documentRef.querySelectorAll !== "function") return;
    documentRef.querySelectorAll(".summary-value").forEach(element => {
      element.setAttribute("data-skeleton", "value");
    });
  }

  function getThemeMediaQuery() {
    if (!windowRef || typeof windowRef.matchMedia !== "function") return null;
    return windowRef.matchMedia("(prefers-color-scheme: dark)");
  }

  return {
    applySummarySkeletonState,
    getThemeMediaQuery,
  };
}
