import { configurePrimeVueApp } from "./primevueApp.js";

export function mountConfiguredShellPrimitive({
  globalScope = globalThis,
  mountEl,
  mountedDatasetKey = "vuePrimitiveMounted",
  managedValue = "true",
  createRoot,
}) {
  const VueRuntime = globalScope?.Vue;
  if (!VueRuntime || !mountEl) return false;
  if (mountEl.dataset?.[mountedDatasetKey] === "true") return true;

  const { createApp, h } = VueRuntime;
  mountEl.dataset.vueManaged = managedValue;
  const root = createRoot(h);
  configurePrimeVueApp(createApp(root), globalScope).mount(mountEl);
  mountEl.dataset[mountedDatasetKey] = "true";
  return true;
}
