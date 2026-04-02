import { afterEach, describe, expect, it } from "vitest";
import { bindRuntimeMagneticTargets } from "../js/vue/runtimeMagneticBindings.js";

describe("runtime magnetic bindings", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("data-ui-motion");
    document.body.removeAttribute("data-reduce-motion");
    document.body.innerHTML = "";
  });

  it("rebinds relay-start after reduced-motion is turned off", () => {
    const button = document.createElement("button");
    button.id = "relay-start";
    button.dataset.magnetic = "true";
    document.body.appendChild(button);
    const pdfButton = document.createElement("button");
    pdfButton.id = "download-pdf";
    pdfButton.dataset.magnetic = "true";
    document.body.appendChild(pdfButton);

    const globalScope = {
      document,
      matchMedia: query => ({ matches: query === "(pointer: fine)" }),
      requestAnimationFrame: callback => {
        callback();
        return 1;
      },
      cancelAnimationFrame: () => {},
    };

    document.documentElement.dataset.uiMotion = "reduced";
    bindRuntimeMagneticTargets(globalScope);
    expect(button.dataset.runtimeMagneticBound).toBeUndefined();
    expect(button.dataset.magneticAttached).toBeUndefined();

    document.documentElement.removeAttribute("data-ui-motion");
    bindRuntimeMagneticTargets(globalScope);
    expect(button.dataset.runtimeMagneticBound).toBe("true");
    expect(button.dataset.magneticAttached).toBe("true");
    expect(pdfButton.dataset.runtimeMagneticBound).toBe("true");
    expect(pdfButton.dataset.magneticAttached).toBe("true");
  });
});
