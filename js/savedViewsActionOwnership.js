import { resolveVueBridge, VUE_BRIDGE_NAMES } from "./vue/bridgeRegistry.js";

export function supportsBridgeOwnedSavedViewActions({
  saveButton,
  applyButton,
  deleteButton,
  compareButton,
} = {}) {
  const searchSavedBridge = resolveVueBridge(VUE_BRIDGE_NAMES.searchSaved);
  if (
    !searchSavedBridge ||
    typeof searchSavedBridge.setPanelActionHandlers !== "function" ||
    typeof searchSavedBridge.hasPanelActionHandler !== "function"
  ) {
    return false;
  }
  const buttonsMounted = [saveButton, applyButton, deleteButton, compareButton]
    .filter(Boolean)
    .every(button => button?.dataset?.vueManaged === "true");
  if (!buttonsMounted) return false;
  return [
    "savedViews:save-view",
    "savedViews:apply-selected-view",
    "savedViews:delete-selected-view",
    "savedViews:compare-views",
  ].every(actionKey => searchSavedBridge.hasPanelActionHandler(actionKey));
}
