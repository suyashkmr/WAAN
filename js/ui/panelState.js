export function renderPanelState({
  container,
  tone = "empty",
  title = "",
  message = "",
  actions = [],
  onAction,
} = {}) {
  if (!container) return null;
  const safeActions = Array.isArray(actions) ? actions.filter(Boolean) : [];
  const wrapper = document.createElement("div");
  wrapper.className = `panel-state panel-state--${tone}`;
  wrapper.setAttribute("role", tone === "error" ? "alert" : "status");

  if (title) {
    const heading = document.createElement("h4");
    heading.className = "panel-state-title";
    heading.textContent = title;
    wrapper.appendChild(heading);
  }

  if (message) {
    const body = document.createElement("p");
    body.className = "panel-state-copy";
    body.textContent = message;
    wrapper.appendChild(body);
  }

  if (safeActions.length) {
    const actionsRow = document.createElement("div");
    actionsRow.className = "panel-state-actions";
    safeActions.forEach(action => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ghost-button small";
      button.dataset.panelAction = action.id || "";
      button.textContent = action.label || "Action";
      if (action.disabled) button.disabled = true;
      actionsRow.appendChild(button);
    });
    wrapper.appendChild(actionsRow);
  }

  container.innerHTML = "";
  container.appendChild(wrapper);

  if (typeof onAction === "function" && safeActions.length) {
    wrapper.addEventListener("click", event => {
      const button = event.target.closest("[data-panel-action]");
      if (!button) return;
      onAction(button.dataset.panelAction || "");
    });
  }

  return wrapper;
}
