import { attachMagnetic } from "../../js/ui/magnetic.js";

function bindMagnetic(el, binding) {
  const maxOffset = Number(binding?.value?.maxOffset);
  const cleanup = attachMagnetic(el, {
    maxOffset: Number.isFinite(maxOffset) ? maxOffset : undefined,
  });
  el.__waanMagneticCleanup = cleanup;
}

export const vMagnetic = {
  mounted(el, binding) {
    bindMagnetic(el, binding);
  },
  updated(el, binding) {
    if (binding?.oldValue === binding?.value) return;
    if (typeof el.__waanMagneticCleanup === "function") {
      el.__waanMagneticCleanup();
    }
    bindMagnetic(el, binding);
  },
  unmounted(el) {
    if (typeof el.__waanMagneticCleanup === "function") {
      el.__waanMagneticCleanup();
    }
    delete el.__waanMagneticCleanup;
  },
};
