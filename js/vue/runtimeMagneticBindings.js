import { attachMagnetic } from "../ui/magnetic.js";

const runtimeMagneticCleanups = new Map();

export function bindRuntimeMagneticTargets(globalScope = globalThis) {
  const documentRef = globalScope?.document;
  if (!documentRef) return;
  const targetIds = ["relay-start", "download-pdf"];

  targetIds.forEach(id => {
    const existing = runtimeMagneticCleanups.get(id);
    const element = documentRef.getElementById(id);

    if (!element || !(element instanceof HTMLElement) || element.dataset.magnetic !== "true") {
      if (typeof existing === "function") {
        existing();
        runtimeMagneticCleanups.delete(id);
      }
      return;
    }

    if (element.dataset.runtimeMagneticBound === "true") return;
    if (typeof existing === "function") {
      existing();
      runtimeMagneticCleanups.delete(id);
    }

    const cleanup = attachMagnetic(element, {}, globalScope);
    if (element.dataset.magneticAttached === "true") {
      element.dataset.runtimeMagneticBound = "true";
      runtimeMagneticCleanups.set(id, () => {
        cleanup?.();
        delete element.dataset.runtimeMagneticBound;
      });
      return;
    }
    cleanup?.();
    delete element.dataset.runtimeMagneticBound;
  });
}
