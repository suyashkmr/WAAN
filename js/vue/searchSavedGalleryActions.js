/**
 * @param {{
 *   container: HTMLElement | null,
 *   dispatchAction?: ((actionId: string, payload?: any) => void) | null,
 * }} params
 */
export function ensureSavedViewsGalleryActions({ container, dispatchAction = null }) {
  if (!container || typeof dispatchAction !== "function") return;
  if (container.dataset.galleryActionsBound === "true") return;
  container.addEventListener("click", event => {
    const target = /** @type {HTMLElement | null} */ (event?.target ?? null);
    const card = target?.closest?.(".saved-view-card");
    const viewId = card?.dataset?.viewId || "";
    if (!viewId) return;
    dispatchAction("apply-view", { viewId });
  });
  container.addEventListener("keydown", event => {
    const keyboardEvent = /** @type {KeyboardEvent} */ (event);
    if (keyboardEvent.key !== "Enter" && keyboardEvent.key !== " ") return;
    const target = /** @type {HTMLElement | null} */ (keyboardEvent?.target ?? null);
    const card = target?.closest?.(".saved-view-card");
    const viewId = card?.dataset?.viewId || "";
    if (!viewId) return;
    keyboardEvent.preventDefault();
    dispatchAction("apply-view", { viewId });
  });
  container.dataset.galleryActionsBound = "true";
}
