import { initShoelacePrimitives } from "./primitives.js";

function containsShoelaceElement(root) {
  if (!root) return false;
  if (root.tagName && String(root.tagName).toLowerCase().startsWith("sl-")) return true;
  if (typeof root.querySelectorAll !== "function") return false;
  const elements = root.querySelectorAll("*");
  for (let index = 0; index < elements.length; index += 1) {
    if (String(elements[index].tagName || "").toLowerCase().startsWith("sl-")) return true;
  }
  return false;
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
  initShoelacePrimitives();

  let runtimeRequested = false;
  const loadRuntime = async () => {
    if (runtimeRequested) return;
    runtimeRequested = true;
    try {
      await import("../../vendor/shoelace/shoelace-autoloader.js");
    } catch (error) {
      runtimeRequested = false;
      console.warn("Shoelace runtime unavailable; continuing without custom element runtime.", error);
    }
  };

  if (containsShoelaceElement(document.documentElement)) {
    void loadRuntime();
  } else if (typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (containsShoelaceElement(node)) {
            observer.disconnect();
            void loadRuntime();
            return;
          }
        }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
}
