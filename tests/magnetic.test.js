import { afterEach, describe, expect, it } from "vitest";
import { attachMagnetic, prefersReducedMotion } from "../js/ui/magnetic.js";

function createPointerMoveEvent(clientX, clientY) {
  const event = new Event("pointermove", { bubbles: true });
  Object.defineProperty(event, "clientX", { configurable: true, value: clientX });
  Object.defineProperty(event, "clientY", { configurable: true, value: clientY });
  Object.defineProperty(event, "pointerType", { configurable: true, value: "mouse" });
  return event;
}

function parseTransformOffset(transformText) {
  const match = /translate3d\(([-0-9.]+)px,\s*([-0-9.]+)px,\s*0\)/.exec(transformText || "");
  if (!match) return { x: 0, y: 0 };
  return { x: Number(match[1]), y: Number(match[2]) };
}

describe("magnetic interactions", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("data-ui-motion");
    document.body.removeAttribute("data-reduce-motion");
    document.body.innerHTML = "";
  });

  it("applies bounded magnetic transform and resets on leave", () => {
    const button = document.createElement("button");
    document.body.appendChild(button);
    button.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 100,
      height: 40,
      right: 100,
      bottom: 40,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    const globalScope = {
      document,
      matchMedia: query => ({ matches: query === "(pointer: fine)" }),
      requestAnimationFrame: callback => {
        callback();
        return 1;
      },
      cancelAnimationFrame: () => {},
    };

    const cleanup = attachMagnetic(button, { maxOffset: 8 }, globalScope);
    button.dispatchEvent(createPointerMoveEvent(200, 200));
    const offset = parseTransformOffset(button.style.transform);

    expect(Math.abs(offset.x)).toBeLessThanOrEqual(8);
    expect(Math.abs(offset.y)).toBeLessThanOrEqual(8);
    expect(button.dataset.magneticAttached).toBe("true");

    button.dispatchEvent(new Event("pointerleave"));
    expect(button.style.transform).toBe("");

    cleanup();
    expect(button.dataset.magneticAttached).toBeUndefined();
  });

  it("no-ops magnetic effect when reduced motion is active", () => {
    const button = document.createElement("button");
    document.body.appendChild(button);
    document.documentElement.dataset.uiMotion = "reduced";
    const globalScope = {
      document,
      matchMedia: query => ({ matches: query === "(pointer: fine)" }),
      requestAnimationFrame: callback => {
        callback();
        return 1;
      },
      cancelAnimationFrame: () => {},
    };

    const cleanup = attachMagnetic(button, {}, globalScope);
    button.dispatchEvent(createPointerMoveEvent(100, 20));

    expect(button.style.transform).toBe("");
    expect(prefersReducedMotion(globalScope)).toBe(true);
    cleanup();
  });
});
