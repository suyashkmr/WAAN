// @ts-check
import { resolveVueBridge, VUE_BRIDGE_NAMES } from "../vue/bridgeRegistry.js";
import { mountShellPrimitivesIsland } from "../vue/shellPrimitivesIsland.js";

/**
 * @param {{
 *   statusEl?: HTMLElement | null | undefined,
 *   toastContainer?: HTMLElement | null | undefined,
 *   autoHideDelayMs?: number,
 *   exitDurationMs?: number,
 *   maxToasts?: number,
 * }} params
 */
export function createStatusUiController({
  statusEl,
  toastContainer,
  autoHideDelayMs = 5000,
  exitDurationMs = 300,
  maxToasts = 4,
}) {
  void statusEl;
  void toastContainer;
  /**
   * @typedef {{
   *   dismissToast?: (toast: HTMLElement) => void,
   *   showToast?: (message: string, tone: string, options: { duration: number, maxToasts: number }) => void,
   *   finalizeStatusExit?: () => void,
   *   beginStatusExit?: (exitDurationMs: number) => void,
   *   showStatusMessage?: (
   *     message: string,
   *     tone: string | null | undefined,
   *     options: { autoHideDelayMs: number, exitDurationMs: number }
   *   ) => void,
   * }} WaanVueShellBridge
   */
  /**
   * @returns {WaanVueShellBridge | null}
   */
  function resolveShellBridge() {
    /** @type {WaanVueShellBridge | null} */
    let bridge = resolveVueBridge(VUE_BRIDGE_NAMES.shell);
    if (bridge) return bridge;
    mountShellPrimitivesIsland();
    bridge = resolveVueBridge(VUE_BRIDGE_NAMES.shell);
    return bridge || null;
  }

  /**
   * @param {HTMLElement} toast
   */
  function dismissToast(toast) {
    const bridge = resolveShellBridge();
    bridge?.dismissToast?.(toast);
    if (!bridge?.dismissToast && toast?.isConnected) {
      toast.remove();
    }
  }

  /**
   * @param {string} message
   * @param {string} [tone]
   * @param {{ duration?: number }} [options]
   */
  function showToast(message, tone = "info", { duration = 5000 } = {}) {
    const bridge = resolveShellBridge();
    bridge?.showToast?.(message, tone, { duration, maxToasts });
  }

  function finalizeStatusExit() {
    const bridge = resolveShellBridge();
    bridge?.finalizeStatusExit?.();
  }

  function beginStatusExit() {
    const bridge = resolveShellBridge();
    bridge?.beginStatusExit?.(exitDurationMs);
  }

  /**
   * @param {string} message
   * @param {string | null | undefined} tone
   */
  function showStatusMessage(message, tone) {
    const bridge = resolveShellBridge();
    bridge?.showStatusMessage?.(message, tone, { autoHideDelayMs, exitDurationMs });
  }

  return {
    showToast,
    dismissToast,
    showStatusMessage,
    beginStatusExit,
    finalizeStatusExit,
  };
}
