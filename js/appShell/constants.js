export const COMPACT_STORAGE_KEY = "waan-compact-mode";
export const REDUCE_MOTION_STORAGE_KEY = "waan-reduce-motion";
export const HIGH_CONTRAST_STORAGE_KEY = "waan-high-contrast";

export function initWindowToasts() {
  if (!globalThis.window) return;
  if (!Array.isArray(globalThis.window.windowToasts)) {
    globalThis.window.windowToasts = [];
  }
}
