// @ts-check

const vueMountedTextContainers = new WeakSet();

/**
 * Clear a container once before first low-level Vue render so shipped
 * placeholder markup does not remain alongside the rendered vnode tree.
 *
 * @param {Element | null | undefined} container
 */
export function clearContainerForVueRenderOnce(container) {
  if (!container) return;
  if (vueMountedTextContainers.has(container)) return;
  if ("textContent" in container) {
    container.textContent = "";
  }
  vueMountedTextContainers.add(container);
}
