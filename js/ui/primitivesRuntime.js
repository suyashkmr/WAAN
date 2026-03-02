import { initUiPrimitives } from "./primitives.js";
import { createVuePrimitiveComposables } from "./primitivesVueComposables.js";

export const WAAN_UI_RUNTIME_KEY = "__WAAN_UI_RUNTIME__";

/**
 * @param {Window | null | undefined} windowRef
 */
function resolvePrimeVueRuntime(windowRef) {
  return windowRef?.PrimeVue || windowRef?.primevue || null;
}

/**
 * @param {{ windowRef?: Window | null }} [params]
 */
export function getUiRuntimeState({ windowRef = globalThis.window ?? null } = {}) {
  const primeVueRuntime = resolvePrimeVueRuntime(windowRef);
  return {
    vue: {
      available: Boolean(windowRef?.Vue),
    },
    primevue: {
      available: Boolean(primeVueRuntime),
      configAvailable: Boolean(primeVueRuntime?.Config),
      cardAvailable: Boolean(primeVueRuntime?.Card),
    },
  };
}

/**
 * @param {{ windowRef?: Window | null, documentRef?: Document | null }} [params]
 */
export function initUiRuntime({
  windowRef = globalThis.window ?? null,
  documentRef = globalThis.document ?? null,
} = {}) {
  const cleanupPrimitives = initUiPrimitives({
    root: documentRef?.documentElement ?? null,
    body: documentRef?.body ?? null,
    MutationObserverImpl: windowRef?.MutationObserver ?? globalThis.MutationObserver ?? null,
  });
  const runtime = getUiRuntimeState({ windowRef });
  const vuePrimitiveComposables = createVuePrimitiveComposables({ windowRef });
  if (windowRef) {
    windowRef[WAAN_UI_RUNTIME_KEY] = runtime;
  }
  if (documentRef?.documentElement) {
    documentRef.documentElement.dataset.vueRuntime = runtime.vue.available ? "ready" : "missing";
    documentRef.documentElement.dataset.primevueRuntime = runtime.primevue.available ? "ready" : "missing";
  }
  return {
    runtime,
    vuePrimitiveComposables,
    cleanup: cleanupPrimitives,
  };
}

if (typeof document !== "undefined" && typeof window !== "undefined") {
  initUiRuntime({
    windowRef: window,
    documentRef: document,
  });
}
