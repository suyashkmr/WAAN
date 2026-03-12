export const WAAN_PAGE_CONTROL_DRAFT_EVENT = "waan:page-control-draft";

/**
 * @param {any} globalScope
 * @param {Record<string, any>} [detail]
 */
export function emitPageControlDraftSignal(globalScope = globalThis, detail = {}) {
  const EventCtor = globalScope?.CustomEvent ?? globalThis.CustomEvent;
  if (typeof globalScope?.dispatchEvent !== "function" || typeof EventCtor !== "function") {
    return false;
  }
  globalScope.dispatchEvent(new EventCtor(WAAN_PAGE_CONTROL_DRAFT_EVENT, { detail }));
  return true;
}

