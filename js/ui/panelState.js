import { createEmptyState, createToolbarRow } from "./appShellPrimitives.js";

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
  const wrapper = createEmptyState({ documentRef: document, tone, title, message });
  if (!wrapper) return null;

  if (safeActions.length) {
    const actionsRow = createToolbarRow({
      documentRef: document,
      className: "panel-state-actions",
    });
    if (!actionsRow) return null;
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
