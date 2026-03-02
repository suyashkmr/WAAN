// @ts-check

/**
 * @typedef {{ isHidden: () => boolean, addChangeListener: (handler: (() => void) | null | undefined) => (() => void) }} RelayVisibilityAdapter
 */

/**
 * @param {{ documentRef?: Document | null }} [params]
 * @returns {RelayVisibilityAdapter}
 */
export function createRelayVisibilityAdapter({ documentRef = globalThis.document ?? null } = {}) {
  const hasVisibilityApi =
    Boolean(documentRef)
    && typeof documentRef?.addEventListener === "function"
    && typeof documentRef?.removeEventListener === "function";

  return {
    isHidden() {
      return Boolean(documentRef?.hidden || documentRef?.visibilityState === "hidden");
    },
    addChangeListener(handler) {
      if (!hasVisibilityApi || typeof handler !== "function") return () => {};
      documentRef?.addEventListener("visibilitychange", handler);
      return () => {
        documentRef?.removeEventListener("visibilitychange", handler);
      };
    },
  };
}

export function createRelayPlatformAdapter({
  electronAPI = null,
  windowRef = globalThis.window ?? null,
  visibilityAdapter = null,
} = {}) {
  return {
    electronAPI: electronAPI ?? /** @type {any} */ (windowRef)?.electronAPI ?? null,
    visibilityAdapter: visibilityAdapter ?? createRelayVisibilityAdapter(),
  };
}
