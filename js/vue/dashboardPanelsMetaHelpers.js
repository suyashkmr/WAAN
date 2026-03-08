export function createDashboardMetaRenderHelpers({ VueRuntime, hourlyState }) {
  const hourlyMetaMountedEls = new WeakSet();
  const { h, render } = VueRuntime;

  function renderMetaText(container, text) {
    if (!container) return;
    if (!hourlyMetaMountedEls.has(container)) {
      container.textContent = "";
      hourlyMetaMountedEls.add(container);
    }
    render(text ? h("span", null, text) : null, container);
  }

  function renderHourlyAnomalies(container) {
    if (!container) return;
    if (!hourlyMetaMountedEls.has(container)) {
      container.textContent = "";
      hourlyMetaMountedEls.add(container);
    }
    if (hourlyState.anomalyBadges.length) {
      render(
        h(
          VueRuntime.Fragment || "div",
          null,
          hourlyState.anomalyBadges.map((text, index) =>
            h("span", { class: "badge", key: `${index}-${text}` }, text)),
        ),
        container,
      );
      return;
    }
    render(
      h("span", null, hourlyState.anomalyMessage || "No hourly surprises detected."),
      container,
    );
  }

  return { renderMetaText, renderHourlyAnomalies };
}
