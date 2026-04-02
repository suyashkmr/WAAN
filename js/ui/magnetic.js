const DEFAULT_MAX_OFFSET = 10;

/**
 * @param {any} globalScope
 */
export function prefersReducedMotion(globalScope = globalThis) {
  const documentRef = globalScope?.document ?? null;
  const root = documentRef?.documentElement ?? null;
  const body = documentRef?.body ?? null;
  if (root?.dataset?.uiMotion === "reduced") return true;
  if (body?.dataset?.reduceMotion === "true") return true;
  try {
    return Boolean(globalScope?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
  } catch {
    return false;
  }
}

/**
 * @param {any} globalScope
 */
function supportsFinePointer(globalScope = globalThis) {
  try {
    return Boolean(globalScope?.matchMedia?.("(pointer: fine)")?.matches);
  } catch {
    return true;
  }
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * @param {HTMLElement | null | undefined} element
 * @param {{ maxOffset?: number }} [options]
 * @param {any} [globalScope]
 */
export function attachMagnetic(element, options = {}, globalScope = globalThis) {
  if (!(element instanceof HTMLElement)) return () => {};
  if (!supportsFinePointer(globalScope)) return () => {};
  if (prefersReducedMotion(globalScope)) return () => {};

  const maxOffset = Number.isFinite(options.maxOffset) ? Number(options.maxOffset) : DEFAULT_MAX_OFFSET;
  const requestFrame = globalScope?.requestAnimationFrame?.bind(globalScope) ?? (cb => setTimeout(cb, 16));
  const cancelFrame = globalScope?.cancelAnimationFrame?.bind(globalScope) ?? clearTimeout;
  let frameId = null;
  let nextX = 0;
  let nextY = 0;

  const applyTransform = () => {
    frameId = null;
    if (!element.isConnected) return;
    element.style.transform = `translate3d(${nextX}px, ${nextY}px, 0)`;
  };

  const queueTransform = () => {
    if (frameId != null) return;
    frameId = requestFrame(applyTransform);
  };

  /**
   * @param {number} x
   * @param {number} y
   */
  const setOffset = (x, y) => {
    nextX = clamp(x, -maxOffset, maxOffset);
    nextY = clamp(y, -maxOffset, maxOffset);
    queueTransform();
  };

  /**
   * @param {PointerEvent} event
   */
  const handlePointerMove = event => {
    if (event.pointerType && event.pointerType !== "mouse") return;
    if (prefersReducedMotion(globalScope)) return;
    const rect = element.getBoundingClientRect();
    const halfWidth = Math.max(rect.width / 2, 1);
    const halfHeight = Math.max(rect.height / 2, 1);
    const centerX = rect.left + halfWidth;
    const centerY = rect.top + halfHeight;
    const xDelta = (event.clientX - centerX) / halfWidth;
    const yDelta = (event.clientY - centerY) / halfHeight;
    setOffset(xDelta * maxOffset, yDelta * maxOffset);
  };

  const resetOffset = () => {
    if (frameId != null) {
      cancelFrame(frameId);
      frameId = null;
    }
    nextX = 0;
    nextY = 0;
    element.style.transform = "";
  };

  element.dataset.magneticAttached = "true";
  element.addEventListener("pointermove", handlePointerMove);
  element.addEventListener("pointerleave", resetOffset);
  element.addEventListener("pointercancel", resetOffset);
  element.addEventListener("blur", resetOffset);

  return () => {
    element.removeEventListener("pointermove", handlePointerMove);
    element.removeEventListener("pointerleave", resetOffset);
    element.removeEventListener("pointercancel", resetOffset);
    element.removeEventListener("blur", resetOffset);
    delete element.dataset.magneticAttached;
    resetOffset();
  };
}
