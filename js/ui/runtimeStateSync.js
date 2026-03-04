const defaultMutationObserver = typeof MutationObserver !== "undefined" ? MutationObserver : null;

export function applyUiRuntimeState({
  root = typeof document !== "undefined" ? document.documentElement : null,
  body = typeof document !== "undefined" ? document.body : null,
} = {}) {
  if (!root) return;
  const scheme = root.dataset.colorScheme === "light" ? "light" : "dark";
  root.classList.toggle("app-theme-light", scheme === "light");
  root.classList.toggle("app-theme-dark", scheme === "dark");
  root.dataset.uiContrast = body?.dataset?.contrast === "high" ? "high" : "standard";
  root.dataset.uiMotion = body?.dataset?.reduceMotion === "true" ? "reduced" : "standard";
}

export function initUiPrimitives({
  root = typeof document !== "undefined" ? document.documentElement : null,
  body = typeof document !== "undefined" ? document.body : null,
  MutationObserverImpl = defaultMutationObserver,
} = {}) {
  applyUiRuntimeState({ root, body });
  if (!root || !MutationObserverImpl) return () => {};

  const observer = new MutationObserverImpl(() => applyUiRuntimeState({ root, body }));
  observer.observe(root, { attributes: true, attributeFilter: ["data-color-scheme"] });
  if (body) observer.observe(body, { attributes: true, attributeFilter: ["data-contrast", "data-reduce-motion"] });
  return () => observer.disconnect();
}
