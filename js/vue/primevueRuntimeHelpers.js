export function resolvePrimeVueComponent(componentName, globalScope = globalThis) {
  const runtime = globalScope?.PrimeVue || globalScope?.primevue || null;
  if (!runtime) return null;
  const component = runtime?.[componentName];
  if (typeof component === "function" || (component && typeof component === "object")) return component;
  return null;
}

export function allowNativePrimitiveFallback(globalScope = globalThis) {
  if (globalScope?.__WAAN_DISABLE_NATIVE_PRIMITIVE_FALLBACKS__ === true) return false;
  if (globalScope?.__WAAN_ALLOW_NATIVE_PRIMITIVE_FALLBACKS__ === true) return true;
  return Boolean(globalScope?.process?.env?.VITEST || globalThis?.process?.env?.VITEST);
}

export function resolvePrimeVisibleInputId(id = "", preserveNativeElement = false) {
  return preserveNativeElement && id ? `${id}--primevue` : id;
}
